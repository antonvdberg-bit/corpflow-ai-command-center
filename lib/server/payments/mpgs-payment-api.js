/**
 * MPGS payment-by-link orchestration + factory API handlers (PAY-SBM-4).
 */

import { recordTrustedAutomationEvent } from '../../automation/internal.js';
import { verifyFactoryMasterAuth } from '../factory-master-auth.js';
import { getMpgsMode, isHostedCheckoutEnabled, isMpgsOperational, mpgsConfigDiagnostics } from './mpgs-config.js';
import { initiateMpgsCheckoutSession } from './mpgs-client.js';
import {
  PAYMENT_RECORD_STATUSES,
  createPaymentStore,
  processMpgsBrowserCancel,
  processMpgsBrowserReturn,
} from './payment-store.js';

function readJsonBody(req) {
  const body = req.body;
  if (body && typeof body === 'object') return body;
  return {};
}

function amountMinorToDecimal(amountMinor) {
  const n = Number(amountMinor);
  if (!Number.isFinite(n) || n <= 0) throw new Error('invalid_amount_minor');
  return (n / 100).toFixed(2);
}

function requireTestModeOnly() {
  if (getMpgsMode() === 'production') {
    const err = new Error('production_mpgs_not_authorized');
    err.httpStatus = 403;
    throw err;
  }
}

function requireOperational() {
  if (!isMpgsOperational()) {
    const err = new Error('mpgs_not_configured');
    err.httpStatus = 503;
    err.details = mpgsConfigDiagnostics();
    throw err;
  }
}

/**
 * POST factory/payments/records/create — approved payment record (no gateway call).
 */
export async function handlePaymentRecordCreate(req, res, prisma) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const body = readJsonBody(req);
  const purchaserName = String(body.purchaser_name || body.purchaserName || '').trim();
  const purchaserEmail = String(body.purchaser_email || body.purchaserEmail || '').trim();
  const currency = String(body.currency || 'USD').trim().toUpperCase();
  const amountMinor = Math.round(Number(body.amount_minor ?? body.amountMinor ?? 15000));
  const description = String(body.description || 'AI Lead Rescue launch pilot').trim();
  const sourceId = body.lead_id || body.leadId || body.source_id || body.sourceId || null;

  if (!purchaserName || !purchaserEmail) {
    return res.status(400).json({ ok: false, error: 'missing_purchaser' });
  }
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    return res.status(400).json({ ok: false, error: 'invalid_amount_minor' });
  }

  try {
    const store = createPaymentStore(prisma);
    const record = await store.createRecord({
      purchaserName,
      purchaserEmail,
      amountMinor,
      currency,
      description,
      source: String(body.source || 'manual'),
      sourceId: sourceId ? String(sourceId) : null,
      approvedBy: 'factory_master',
    });

    return res.status(200).json({
      ok: true,
      payment_record_id: record.id,
      record_reference: record.recordReference,
      status: record.status,
      amount_minor: record.amountMinor,
      currency: record.currency,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : 'create_record_failed' });
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} body
 */
async function createPaymentLinkInternal(prisma, body) {
  requireTestModeOnly();
  requireOperational();

  const paymentRecordId = String(body.payment_record_id || body.paymentRecordId || '').trim();
  if (!paymentRecordId) {
    const err = new Error('missing_payment_record_id');
    err.httpStatus = 400;
    throw err;
  }

  const store = createPaymentStore(prisma);
  const record = await store.getRecordById(paymentRecordId);
  if (!record) {
    const err = new Error('payment_record_not_found');
    err.httpStatus = 404;
    throw err;
  }
  if (record.status === PAYMENT_RECORD_STATUSES.PAID) {
    const err = new Error('payment_record_already_paid');
    err.httpStatus = 409;
    throw err;
  }
  if (record.status === PAYMENT_RECORD_STATUSES.CANCELLED) {
    const err = new Error('payment_record_cancelled');
    err.httpStatus = 409;
    throw err;
  }

  const attempt = await store.createAttempt(record.id, {
    gatewayMode: getMpgsMode(),
    flowType: 'payment_link',
  });

  const session = await initiateMpgsCheckoutSession({
    attemptReference: attempt.attemptReference,
    amountDecimal: amountMinorToDecimal(record.amountMinor),
    currency: record.currency,
    description: record.description || 'CorpFlowAI service payment',
  });

  const updated = await store.attachLinkSession(attempt.attemptReference, session);

  await recordTrustedAutomationEvent(prisma, {
    tenantId: 'corpflowai',
    eventType: 'payments.mpgs.link_created',
    idempotencyKey: `mpgs:link:${attempt.attemptReference}`,
    source: 'mpgs-payment-api',
    payload: {
      attempt_reference: attempt.attemptReference,
      record_reference: record.recordReference,
      payment_record_id: record.id,
      amount_minor: record.amountMinor,
      currency: record.currency,
      gateway_mode: updated.gatewayMode,
      flow_type: 'payment_link',
      mock: Boolean(session.mock),
    },
  });

  return {
    ok: true,
    payment_record_id: record.id,
    record_reference: record.recordReference,
    attempt_reference: updated.attemptReference,
    payment_link_url: updated.paymentLinkUrl,
    attempt_status: updated.status,
    record_status: PAYMENT_RECORD_STATUSES.LINK_ISSUED,
    gateway_mode: updated.gatewayMode,
    success_indicator_stored: Boolean(updated.successIndicator),
  };
}

/**
 * POST factory/payments/mpgs/create-link
 */
export async function handleMpgsCreatePaymentLink(req, res, prisma) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const result = await createPaymentLinkInternal(prisma, readJsonBody(req));
    return res.status(200).json(result);
  } catch (e) {
    const code = e instanceof Error ? e.message : 'create_link_failed';
    const status = e.httpStatus || 500;
    return res.status(status).json({
      ok: false,
      error: code,
      diagnostics: code === 'mpgs_not_configured' ? e.details : undefined,
    });
  }
}

/**
 * POST factory/payments/mpgs/verify
 */
export async function handleMpgsVerifyOrder(req, res, prisma) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const body = readJsonBody(req);
  const attemptRef = String(
    body.attempt_reference || body.attemptReference || body.order_reference || body.orderReference || '',
  ).trim();
  if (!attemptRef) {
    return res.status(400).json({ ok: false, error: 'missing_attempt_reference' });
  }

  try {
    const store = createPaymentStore(prisma);
    const verification = await store.verifyAndMaybeMarkPaid(attemptRef);
    if (!verification.ok) {
      return res.status(404).json({ ok: false, error: verification.error });
    }

    if (verification.verified) {
      await recordTrustedAutomationEvent(prisma, {
        tenantId: 'corpflowai',
        eventType: 'payments.mpgs.verified_paid',
        idempotencyKey: `mpgs:verified:${attemptRef}`,
        source: 'mpgs-payment-api',
        payload: {
          attempt_reference: attemptRef,
          record_reference: verification.record?.recordReference,
          gateway_status: verification.retrieved?.status || verification.attempt?.gatewayStatus,
          verify_reason: verification.verifyReason || null,
          fulfilment_status: verification.record?.fulfilmentStatus,
        },
      });
    }

    return res.status(200).json({
      ok: true,
      attempt_reference: attemptRef,
      record_reference: verification.record?.recordReference || null,
      verified_paid: Boolean(verification.verified || verification.alreadyPaid),
      attempt_status: verification.attempt?.status,
      record_status: verification.record?.status,
      gateway_status: verification.attempt?.gatewayStatus,
      verify_reason: verification.verifyReason || null,
      fulfilment_status: verification.record?.fulfilmentStatus,
      paid_from_redirect_only: false,
      operator_review_required: Boolean(verification.verified || verification.alreadyPaid),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : 'verify_failed' });
  }
}

/**
 * GET factory/payments/mpgs/status?attempt_ref=
 */
export async function handleMpgsPaymentStatus(req, res, prisma) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const attemptRef = String(
    req.query?.attempt_ref || req.query?.attempt_reference || req.query?.order_ref || '',
  ).trim();
  if (!attemptRef) {
    return res.status(400).json({ ok: false, error: 'missing_attempt_reference' });
  }

  const store = createPaymentStore(prisma);
  const row = await store.getAttemptByReference(attemptRef);
  if (!row) {
    return res.status(404).json({ ok: false, error: 'attempt_not_found' });
  }

  return res.status(200).json({
    ok: true,
    attempt_reference: row.attemptReference,
    record_reference: row.paymentRecord?.recordReference || null,
    attempt_status: row.status,
    record_status: row.paymentRecord?.status || null,
    gateway_status: row.gatewayStatus,
    amount_minor: row.paymentRecord?.amountMinor ?? null,
    currency: row.paymentRecord?.currency ?? null,
    verified_paid_at: row.verifiedPaidAt,
    redirect_seen_at: row.redirectSeenAt,
    fulfilment_status: row.paymentRecord?.fulfilmentStatus ?? null,
    authorization_code_present: Boolean(row.authorizationCode),
    card_last_four: row.cardLastFour,
    paid_from_redirect_only: false,
    operator_review_required: row.status === 'verified_paid',
  });
}

/**
 * GET factory/payments/mpgs/diagnostics
 */
export async function handleMpgsDiagnostics(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  return res.status(200).json({ ok: true, mpgs: mpgsConfigDiagnostics() });
}

/**
 * POST factory/payments/mpgs/hosted-checkout/create — secondary path, disabled by default.
 */
export async function handleMpgsHostedCheckoutCreate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  if (!isHostedCheckoutEnabled()) {
    return res.status(501).json({
      ok: false,
      error: 'hosted_checkout_disabled',
      message: 'Hosted Checkout is secondary. Use payment_link via create-link for PAY-SBM-4 v1 TEST.',
    });
  }
  return res.status(501).json({ ok: false, error: 'hosted_checkout_not_implemented' });
}

/**
 * GET payments/mpgs/return — gateway redirect target (API variant).
 */
export async function handleMpgsReturnApi(req, res, prisma) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const attemptRef = String(req.query?.order_ref || req.query?.attempt_ref || req.query?.orderId || '').trim();
  const resultIndicator = req.query?.resultIndicator || req.query?.result_indicator || null;

  const outcome = await processMpgsBrowserReturn(prisma, { attemptRef, resultIndicator });
  if (!outcome.ok) {
    return res.status(404).json({ ok: false, error: outcome.error });
  }

  return res.status(200).json({
    ok: true,
    ...outcome,
    message: outcome.verifiedPaid
      ? 'Payment verified with the gateway. Awaiting operator review before fulfilment.'
      : 'Return recorded. Payment is not verified yet — awaiting gateway confirmation.',
  });
}

export { processMpgsBrowserReturn, processMpgsBrowserCancel };
