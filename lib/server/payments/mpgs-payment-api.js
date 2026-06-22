/**
 * MPGS payment-by-link orchestration + factory API handlers.
 */

import { recordTrustedAutomationEvent } from '../../automation/internal.js';
import { verifyFactoryMasterAuth } from '../factory-master-auth.js';
import { getMpgsMode, isHostedCheckoutEnabled, isMpgsOperational, mpgsConfigDiagnostics } from './mpgs-config.js';
import { initiateMpgsCheckoutSession } from './mpgs-client.js';
import { createPaymentOrderStore, generateOrderReference, processMpgsBrowserReturn } from './payment-order-store.js';

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

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} body
 */
async function createPaymentLinkInternal(prisma, body) {
  if (getMpgsMode() === 'production') {
    const err = new Error('production_mpgs_not_authorized');
    err.httpStatus = 403;
    throw err;
  }
  if (!isMpgsOperational()) {
    const err = new Error('mpgs_not_configured');
    err.httpStatus = 503;
    err.details = mpgsConfigDiagnostics();
    throw err;
  }

  const purchaserName = String(body.purchaser_name || body.purchaserName || '').trim();
  const purchaserEmail = String(body.purchaser_email || body.purchaserEmail || '').trim();
  const currency = String(body.currency || 'USD').trim().toUpperCase();
  const amountMinor = Number(body.amount_minor ?? body.amountMinor ?? 15000);
  const leadId = body.lead_id || body.leadId || null;
  const description = String(body.description || 'AI Lead Rescue launch pilot').trim();
  const orderReference = String(body.order_reference || body.orderReference || '').trim() || generateOrderReference();

  if (!purchaserName || !purchaserEmail) {
    const err = new Error('missing_purchaser');
    err.httpStatus = 400;
    throw err;
  }

  const store = createPaymentOrderStore(prisma);
  const order = await store.createOrder({
    orderReference,
    leadId: leadId ? String(leadId) : null,
    purchaserName,
    purchaserEmail,
    amountMinor: Math.round(amountMinor),
    currency,
    gatewayMode: getMpgsMode(),
    flowType: 'payment_link',
    description,
  });

  const session = await initiateMpgsCheckoutSession({
    orderReference: order.orderReference,
    amountDecimal: amountMinorToDecimal(order.amountMinor),
    currency: order.currency,
    description,
  });

  const updated = await store.attachLinkSession(order.orderReference, session);

  await recordTrustedAutomationEvent(prisma, {
    tenantId: 'corpflowai',
    eventType: 'payments.mpgs.link_created',
    idempotencyKey: `mpgs:link:${order.orderReference}`,
    source: 'mpgs-payment-api',
    payload: {
      order_reference: order.orderReference,
      lead_id: order.leadId,
      amount_minor: order.amountMinor,
      currency: order.currency,
      gateway_mode: order.gatewayMode,
      flow_type: 'payment_link',
      mock: Boolean(session.mock),
    },
  });

  return {
    ok: true,
    order_reference: updated.orderReference,
    payment_link_url: updated.paymentLinkUrl,
    status: updated.status,
    gateway_mode: updated.gatewayMode,
    flow_type: updated.flowType,
    // successIndicator is returned to operator tooling only — never expose on public marketing pages.
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
  const orderRef = String(body.order_reference || body.orderReference || req.query?.order_ref || '').trim();
  if (!orderRef) {
    return res.status(400).json({ ok: false, error: 'missing_order_reference' });
  }

  try {
    const store = createPaymentOrderStore(prisma);
    const verification = await store.verifyAndMaybeMarkPaid(orderRef);
    if (!verification.ok) {
      return res.status(404).json({ ok: false, error: verification.error });
    }

    if (verification.verified) {
      await recordTrustedAutomationEvent(prisma, {
        tenantId: 'corpflowai',
        eventType: 'payments.mpgs.verified_paid',
        idempotencyKey: `mpgs:verified:${orderRef}`,
        source: 'mpgs-payment-api',
        payload: {
          order_reference: orderRef,
          gateway_status: verification.retrieved?.status || verification.order?.gatewayStatus,
          authorization_code_present: Boolean(verification.order?.authorizationCode),
          card_last_four_present: Boolean(verification.order?.cardLastFour),
        },
      });
    }

    return res.status(200).json({
      ok: true,
      order_reference: orderRef,
      verified_paid: Boolean(verification.verified || verification.alreadyPaid),
      status: verification.order?.status,
      gateway_status: verification.order?.gatewayStatus,
      paid_from_redirect_only: false,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : 'verify_failed' });
  }
}

/**
 * GET factory/payments/mpgs/status?order_ref=
 */
export async function handleMpgsPaymentStatus(req, res, prisma) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const orderRef = String(req.query?.order_ref || req.query?.order_reference || '').trim();
  if (!orderRef) {
    return res.status(400).json({ ok: false, error: 'missing_order_reference' });
  }

  const store = createPaymentOrderStore(prisma);
  const order = await store.getByReference(orderRef);
  if (!order) {
    return res.status(404).json({ ok: false, error: 'order_not_found' });
  }

  return res.status(200).json({
    ok: true,
    order_reference: order.orderReference,
    status: order.status,
    gateway_status: order.gatewayStatus,
    amount_minor: order.amountMinor,
    currency: order.currency,
    verified_paid_at: order.verifiedPaidAt,
    redirect_seen_at: order.redirectSeenAt,
    authorization_code_present: Boolean(order.authorizationCode),
    card_last_four: order.cardLastFour,
    paid_from_redirect_only: false,
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
      message: 'Hosted Checkout is a secondary path. Use payment_link via create-link for v1 TEST.',
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

  const orderRef = String(req.query?.order_ref || req.query?.orderId || '').trim();
  const resultIndicator = req.query?.resultIndicator || req.query?.result_indicator || null;

  const outcome = await processMpgsBrowserReturn(prisma, { orderRef, resultIndicator });
  if (!outcome.ok) {
    return res.status(404).json({ ok: false, error: outcome.error });
  }

  return res.status(200).json({
    ok: true,
    ...outcome,
    message: outcome.verifiedPaid
      ? 'Payment verified with the gateway. Fulfilment may proceed after operator review.'
      : 'Return received. Payment is not verified yet — awaiting gateway confirmation.',
  });
}

export { processMpgsBrowserReturn };
