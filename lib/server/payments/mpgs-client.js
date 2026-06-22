/**
 * MPGS REST client — INITIATE_CHECKOUT (payment link) + Retrieve Order.
 * Never logs credentials or full card numbers.
 */

import {
  buildMpgsReturnUrl,
  getMpgsApiPassword,
  getMpgsApiUsername,
  getMpgsApiVersion,
  getMpgsGatewayBaseUrl,
  getMpgsMerchantId,
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
 * @param {object} params
 * @param {string} params.orderReference
 * @param {string} params.amountDecimal
 * @param {string} params.currency
 * @param {string} [params.description]
 * @param {string} [params.cancelUrl]
 */
export async function initiateMpgsCheckoutSession(params) {
  const orderReference = String(params.orderReference || '').trim();
  if (!orderReference) throw new Error('missing_order_reference');

  const merchantId = getMpgsMerchantId();
  const { amount, currency } = formatMpgsAmount(params.amountDecimal, params.currency);

  if (isMpgsMockMode()) {
    const successIndicator = `mock_si_${orderReference.slice(0, 12)}`;
    const sessionId = `mock_sess_${orderReference}`;
    return {
      mock: true,
      orderId: orderReference,
      sessionId,
      successIndicator,
      paymentLinkUrl: `${getMpgsGatewayBaseUrl()}/checkout/pay/${sessionId}?mock=1`,
      raw: { result: 'SUCCESS', session: { id: sessionId }, successIndicator },
    };
  }

  const url = `${apiRoot(merchantId)}/session`;
  const returnUrl = buildMpgsReturnUrl(orderReference);
  const cancelUrl = params.cancelUrl || returnUrl;

  const body = {
    apiOperation: 'INITIATE_CHECKOUT',
    interaction: {
      operation: 'PURCHASE',
      returnUrl,
      cancelUrl,
      merchant: { name: 'CorpFlowAI Ltd' },
    },
    order: {
      id: orderReference,
      amount,
      currency,
      description: params.description || 'CorpFlowAI service payment',
    },
  };

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
    throw err;
  }

  const sessionId = raw?.session?.id;
  const successIndicator = raw?.successIndicator;
  if (!sessionId || !successIndicator) {
    const err = new Error('mpgs_initiate_incomplete');
    err.gateway = sanitizeMpgsResponseForLog(raw);
    throw err;
  }

  const paymentLinkUrl = `${getMpgsGatewayBaseUrl()}/checkout/pay/${encodeURIComponent(sessionId)}`;

  return {
    mock: false,
    orderId: orderReference,
    sessionId,
    successIndicator,
    paymentLinkUrl,
    raw: sanitizeMpgsResponseForLog(raw),
  };
}

/**
 * Retrieve Order — authoritative payment status (server-side only).
 *
 * @param {string} orderReference
 */
export async function retrieveMpgsOrder(orderReference) {
  const orderId = String(orderReference || '').trim();
  if (!orderId) throw new Error('missing_order_reference');

  const merchantId = getMpgsMerchantId();

  if (isMpgsMockMode()) {
    return {
      mock: true,
      orderId,
      status: 'CAPTURED',
      authorizationCode: 'MOCKAUTH',
      cardLastFour: '0000',
      raw: { result: 'SUCCESS', status: 'CAPTURED' },
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
    orderId: orderId,
    status,
    authorizationCode: authorizationCode ? String(authorizationCode) : null,
    cardLastFour: maskCardLastFour(cardLastFour),
    raw: sanitizeMpgsResponseForLog(raw),
  };
}

/**
 * Paid only when gateway order status is terminal-captured.
 * Browser resultIndicator is intentionally NOT an input here.
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

const SENSITIVE_KEYS = /card|pan|cvv|cvc|password|secret|apiPassword|sourceOfFunds/i;

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
