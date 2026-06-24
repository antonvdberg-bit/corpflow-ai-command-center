/**
 * MPGS REST client — INITIATE_CHECKOUT (payment link) + Retrieve Order.
 * Never logs credentials or full card numbers.
 */

import {
  buildMpgsCancelUrl,
  buildMpgsReturnUrl,
  buildPaymentLinkExpiryDateTime,
  getMpgsApiPassword,
  getMpgsApiUsername,
  getMpgsApiVersion,
  getMpgsGatewayBaseUrl,
  getMpgsMerchantId,
  getPaymentLinkAllowedAttempts,
  isMpgsMockMode,
} from './mpgs-config.js';

/**
 * @param {string} amountDecimal e.g. "150.00"
 * @param {string} currency e.g. USD
 */
export function formatMpgsAmount(amountDecimal, currency) {
  const n = Number(amountDecimal);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('invalid_amount');
  }
  return { amount: n.toFixed(2), currency: String(currency || 'USD').toUpperCase() };
}

function basicAuthHeader(username, password) {
  const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

function apiRoot(merchantId) {
  const base = getMpgsGatewayBaseUrl();
  const version = getMpgsApiVersion();
  return `${base}/api/rest/version/${version}/merchant/${encodeURIComponent(merchantId)}`;
}

/**
 * Build INITIATE_CHECKOUT body for MPGS Payment Link (exported for tests).
 *
 * @param {object} params
 * @param {string} params.attemptReference — maps to order.id
 * @param {string} params.amountDecimal
 * @param {string} params.currency
 * @param {string} params.returnUrl
 * @param {string} params.cancelUrl
 * @param {string} [params.description]
 * @param {string} [params.expiryDateTime] — ISO-8601
 * @param {number} [params.numberOfAllowedAttempts]
 */
export function buildPaymentLinkRequestBody(params) {
  const { amount, currency } = formatMpgsAmount(params.amountDecimal, params.currency);
  return {
    apiOperation: 'INITIATE_CHECKOUT',
    checkoutMode: 'PAYMENT_LINK',
    interaction: {
      operation: 'PURCHASE',
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      merchant: { name: 'CorpFlowAI Ltd' },
    },
    order: {
      id: params.attemptReference,
      amount,
      currency,
      description: params.description || 'CorpFlowAI service payment',
    },
    paymentLink: {
      expiryDateTime: params.expiryDateTime || buildPaymentLinkExpiryDateTime(),
      numberOfAllowedAttempts: params.numberOfAllowedAttempts ?? getPaymentLinkAllowedAttempts(),
    },
  };
}

/**
 * @param {object} params
 * @param {string} params.attemptReference
 * @param {string} params.amountDecimal
 * @param {string} params.currency
 * @param {string} [params.description]
 */
export async function initiateMpgsCheckoutSession(params) {
  const attemptReference = String(params.attemptReference || '').trim();
  if (!attemptReference) throw new Error('missing_attempt_reference');

  const merchantId = getMpgsMerchantId();
  formatMpgsAmount(params.amountDecimal, params.currency);

  if (isMpgsMockMode()) {
    const successIndicator = `mock_si_${attemptReference.slice(0, 12)}`;
    const sessionId = `mock_sess_${attemptReference}`;
    return {
      mock: true,
      orderId: attemptReference,
      sessionId,
      successIndicator,
      paymentLinkUrl: `${getMpgsGatewayBaseUrl()}/mock/payment-link/${sessionId}`,
      raw: {
        result: 'SUCCESS',
        session: { id: sessionId },
        successIndicator,
        paymentLink: { url: `${getMpgsGatewayBaseUrl()}/mock/payment-link/${sessionId}` },
      },
    };
  }

  const url = `${apiRoot(merchantId)}/session`;
  const returnUrl = buildMpgsReturnUrl(attemptReference);
  const cancelUrl = params.cancelUrl || buildMpgsCancelUrl(attemptReference);

  const body = buildPaymentLinkRequestBody({
    attemptReference,
    amountDecimal: params.amountDecimal,
    currency: params.currency,
    returnUrl,
    cancelUrl,
    description: params.description,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(getMpgsApiUsername(merchantId), getMpgsApiPassword()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error('mpgs_initiate_failed');
    err.status = res.status;
    err.gateway = sanitizeMpgsResponseForLog(raw);
    try {
      console.error('mpgs_initiate_failed', { http_status: res.status, gateway: err.gateway });
    } catch (_) {}
    throw err;
  }

  const sessionId = raw?.session?.id;
  const successIndicator = raw?.successIndicator;
  const paymentLinkUrl = raw?.paymentLink?.url || null;
  if (!sessionId || !successIndicator || !paymentLinkUrl) {
    const err = new Error('mpgs_initiate_incomplete');
    err.gateway = sanitizeMpgsResponseForLog(raw);
    throw err;
  }

  return {
    mock: false,
    orderId: attemptReference,
    sessionId,
    successIndicator,
    paymentLinkUrl,
    raw: sanitizeMpgsResponseForLog(raw),
  };
}

/**
 * Retrieve Order — authoritative payment status (server-side only).
 *
 * @param {string} attemptReference
 */
export async function retrieveMpgsOrder(attemptReference) {
  const orderId = String(attemptReference || '').trim();
  if (!orderId) throw new Error('missing_attempt_reference');

  const merchantId = getMpgsMerchantId();

  if (isMpgsMockMode()) {
    return {
      mock: true,
      orderId,
      status: 'CAPTURED',
      amountDecimal: '150.00',
      currency: 'USD',
      authorizationCode: 'MOCKAUTH',
      cardLastFour: '0000',
      raw: { result: 'SUCCESS', status: 'CAPTURED', amount: '150.00', currency: 'USD' },
    };
  }

  const url = `${apiRoot(merchantId)}/order/${encodeURIComponent(orderId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: basicAuthHeader(getMpgsApiUsername(merchantId), getMpgsApiPassword()),
      'Content-Type': 'application/json',
    },
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error('mpgs_retrieve_failed');
    err.status = res.status;
    err.gateway = sanitizeMpgsResponseForLog(raw);
    throw err;
  }

  const status = String(raw?.status || raw?.order?.status || '').toUpperCase();
  const amountDecimal = raw?.amount ?? raw?.order?.amount ?? null;
  const currency = raw?.currency ?? raw?.order?.currency ?? null;
  const authorizationCode =
    raw?.authorizationCode ||
    raw?.transaction?.[0]?.authorizationCode ||
    raw?.authentication?.transactionId ||
    null;
  const cardLastFour =
    raw?.sourceOfFunds?.provided?.card?.number ||
    raw?.sourceOfFunds?.provided?.card?.suffix ||
    raw?.card?.number ||
    null;

  return {
    mock: false,
    orderId,
    status,
    amountDecimal,
    currency: currency ? String(currency).toUpperCase() : null,
    authorizationCode: authorizationCode ? String(authorizationCode) : null,
    cardLastFour: maskCardLastFour(cardLastFour),
    raw: sanitizeMpgsResponseForLog(raw),
  };
}

/**
 * Gateway order status indicates paid/captured (Retrieve Order only).
 *
 * @param {{ status?: string }} retrieved
 */
export function isMpgsOrderVerifiedPaid(retrieved) {
  const status = String(retrieved?.status || '').toUpperCase();
  return status === 'CAPTURED' || status === 'PARTIALLY_CAPTURED' || status === 'PAID';
}

/**
 * @param {unknown} value
 */
export function maskCardLastFour(value) {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

const SENSITIVE_KEYS = /^(?:card|pan|cvv|cvc|password|secret|apiPassword|sourceOfFunds)$/i;

/**
 * Strip sensitive fields before persistence / logs.
 *
 * @param {unknown} input
 * @returns {Record<string, unknown>}
 */
export function sanitizeMpgsResponseForLog(input) {
  if (!input || typeof input !== 'object') return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, val] of Object.entries(input)) {
    if (SENSITIVE_KEYS.test(key)) continue;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = sanitizeMpgsResponseForLog(val);
    } else if (Array.isArray(val)) {
      out[key] = val.map((item) => (item && typeof item === 'object' ? sanitizeMpgsResponseForLog(item) : item));
    } else {
      out[key] = val;
    }
  }
  return out;
}
