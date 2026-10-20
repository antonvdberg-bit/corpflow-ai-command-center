import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';
import { PrismaClient } from '@prisma/client';

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
    const result = await processPaddleSandboxEvent(deps.prisma || prisma, event, config.accountId);
    return json(res, 200, {
      ok: true,
      accepted: result.accepted,
      deduped: Boolean(result.deduped),
      stale: Boolean(result.stale),
      event_id: result.eventId,
      resource_id: result.resourceId || null,
    });
  } catch (error) {
    console.error('[paddle-sandbox-webhook] rejected', {
      reason: error?.message || 'verification_or_processing_failed',
    });
    return json(res, 500, { ok: false, error: 'webhook_rejected' });
  }
}
