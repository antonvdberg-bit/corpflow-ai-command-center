import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';
import { PrismaClient } from '@prisma/client';

import { processBadPurchaseWithRecovery, publicBadBridgeResult } from './bad-order-bridge.js';
import { createPrismaBadPurchaseOutbox } from './bad-purchase-outbox.js';
import { resolveDurableBadBuyerOwnershipStore } from './bad-buyer-ownership-durable.js';
import { assertPaddleSandboxConfig } from './config.js';
import { processPaddleSandboxEvent } from './state.js';

const prisma = new PrismaClient();

function rawRequestBody(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  return '';
}

function json(res, status, body) {
  return res.status(status).json(body);
}

export function paddleTransactionIdFromVerifiedEvent(event) {
  return String(event?.data?.transactionId || event?.data?.transaction_id || event?.data?.id || '').trim();
}

export async function issueBoundBadConfirmationFromBridge(ownership, event, badPurchase) {
  if (!ownership) return { ok: false, code: 'NO_OWNERSHIP' };
  if (badPurchase?.outcome !== 'completed' && badPurchase?.outcome !== 'idempotent_reuse') {
    return { ok: false, code: 'NOT_COMPLETED' };
  }
  if (!(badPurchase.order_name || badPurchase.confirmation?.name)) {
    return { ok: false, code: 'NO_ORDER' };
  }
  const paddleTransactionId = paddleTransactionIdFromVerifiedEvent(event);
  if (!paddleTransactionId) return { ok: false, code: 'PADDLE_REFERENCE_REQUIRED' };
  const confirmationName = String(badPurchase.confirmation?.name || badPurchase.order_name || '').trim();
  try {
    return await ownership.issueOrderConfirmationForBoundPurchase({
      paddle_transaction_id: paddleTransactionId,
      erpnext_order_ref: badPurchase.order_name || null,
      confirmation: {
        name: confirmationName,
        html: '<p>bound-order-confirmation</p>',
      },
    });
  } catch {
    return { ok: false, code: 'ISSUANCE_FAILED' };
  }
}

export async function applyVerifiedBadPurchaseSideEffects(event, deps = {}) {
  const ownership = Object.prototype.hasOwnProperty.call(deps, 'badBuyerOwnership')
    ? deps.badBuyerOwnership
    : resolveDurableBadBuyerOwnershipStore(deps.prisma, deps.env || process.env);
  if (ownership) {
    try {
      await ownership.applyVerifiedWebhook(event);
    } catch (ownershipError) {
      if (ownershipError?.code !== 'WEBHOOK_TRANSACTION_REQUIRED') throw ownershipError;
    }
  }
  let badPurchase = { outcome: 'skipped' };
  try {
    badPurchase = await processBadPurchaseWithRecovery(event, {
      adapter: deps.badAdapter,
      catalog: deps.catalog,
      env: deps.env,
      outbox: deps.outbox,
      receiptDeduped: Boolean(deps.receiptDeduped),
    });
  } catch (bridgeError) {
    if (bridgeError?.retryable) throw bridgeError;
    badPurchase = { outcome: 'rejected', error: bridgeError?.code || 'bad_bridge_failed' };
  }
  const issued = await issueBoundBadConfirmationFromBridge(ownership, event, badPurchase);
  return { ownership, badPurchase, issued };
}

export default async function paddleSandboxWebhookHandler(req, res, deps = {}) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });

  try {
    const config = assertPaddleSandboxConfig();
    const signature = String(req.headers?.['paddle-signature'] || req.headers?.['Paddle-Signature'] || '').trim();
    const rawBody = rawRequestBody(req);
    if (!signature || !rawBody) {
      return json(res, 400, { ok: false, error: 'raw_body_and_signature_required' });
    }
    const paddle = new Paddle(config.apiKey, {
      environment: Environment.sandbox,
      logLevel: LogLevel.error,
    });
    const event = await paddle.webhooks.unmarshal(rawBody, config.webhookSecret, signature);
    const prismaClient = deps.prisma || prisma;
    const result = await processPaddleSandboxEvent(prismaClient, event, config.accountId);
    const outbox = deps.badOutbox || createPrismaBadPurchaseOutbox(prismaClient, config.accountId);
    const sideEffectDeps = {
      prisma: prismaClient,
      env: deps.env,
      badAdapter: deps.badAdapter,
      catalog: deps.catalog,
      outbox,
      receiptDeduped: Boolean(result.deduped),
    };
    if (Object.prototype.hasOwnProperty.call(deps, 'badBuyerOwnership')) {
      sideEffectDeps.badBuyerOwnership = deps.badBuyerOwnership;
    }
    const { badPurchase } = await applyVerifiedBadPurchaseSideEffects(event, sideEffectDeps);
    return json(res, 200, {
      ok: true,
      accepted: result.accepted,
      deduped: Boolean(result.deduped),
      recovered: Boolean(badPurchase.recovered),
      stale: Boolean(result.stale),
      event_id: result.eventId,
      resource_id: result.resourceId || null,
      bad_purchase: publicBadBridgeResult(badPurchase),
    });
  } catch (error) {
    console.error('[paddle-sandbox-webhook] rejected', {
      reason: error?.message || 'verification_or_processing_failed',
    });
    return json(res, 500, { ok: false, error: 'webhook_rejected' });
  }
}
