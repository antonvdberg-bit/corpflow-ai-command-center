/**
 * MPGS / SBM e-Commerce configuration (TEST-first; production gated).
 *
 * Env keys are listed in `.env.template` § MPGS. Values may also live in
 * `CORPFLOW_RUNTIME_CONFIG_JSON` via cfg().
 */

import { cfg } from '../runtime-config.js';

export const MPGS_ENV_KEYS = Object.freeze({
  ENABLED: 'CORPFLOW_MPGS_ENABLED',
  MODE: 'CORPFLOW_MPGS_MODE',
  MOCK: 'CORPFLOW_MPGS_MOCK',
  GATEWAY_BASE_URL: 'CORPFLOW_MPGS_GATEWAY_BASE_URL',
  API_VERSION: 'CORPFLOW_MPGS_API_VERSION',
  MERCHANT_ID: 'CORPFLOW_MPGS_MERCHANT_ID',
  API_PASSWORD: 'CORPFLOW_MPGS_API_PASSWORD',
  RETURN_PATH: 'CORPFLOW_MPGS_RETURN_PATH',
  CANCEL_PATH: 'CORPFLOW_MPGS_CANCEL_PATH',
  HOSTED_CHECKOUT_ENABLED: 'CORPFLOW_MPGS_HOSTED_CHECKOUT_ENABLED',
  LINK_EXPIRY_HOURS: 'CORPFLOW_MPGS_PAYMENT_LINK_EXPIRY_HOURS',
  LINK_ALLOWED_ATTEMPTS: 'CORPFLOW_MPGS_PAYMENT_LINK_ALLOWED_ATTEMPTS',
  PUBLIC_BASE_URL: 'CORPFLOW_MPGS_PUBLIC_BASE_URL',
});

function boolCfg(key, fallback = false) {
  const raw = String(cfg(key, fallback ? 'true' : 'false')).trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/**
 * @returns {'test' | 'production'}
 */
export function getMpgsMode() {
  const mode = String(cfg(MPGS_ENV_KEYS.MODE, 'test')).trim().toLowerCase();
  return mode === 'production' ? 'production' : 'test';
}

export function isMpgsMockMode() {
  return boolCfg(MPGS_ENV_KEYS.MOCK, false);
}

export function isMpgsEnabled() {
  return boolCfg(MPGS_ENV_KEYS.ENABLED, false);
}

export function isHostedCheckoutEnabled() {
  return boolCfg(MPGS_ENV_KEYS.HOSTED_CHECKOUT_ENABLED, false);
}

/**
 * Production MPGS requires explicit mode=production AND enabled=true.
 * PAY-SBM-4 blocks production link creation until separately authorized.
 */
export function isMpgsOperational() {
  if (!isMpgsEnabled()) return false;
  if (isMpgsMockMode()) return true;
  if (!hasMpgsCredentials()) return false;
  if (!hasMpgsPublicBaseUrl()) return false;
  return validateMpgsPublicBaseUrl().ok;
}

export function hasMpgsCredentials() {
  return Boolean(String(cfg(MPGS_ENV_KEYS.MERCHANT_ID, '')).trim() && String(cfg(MPGS_ENV_KEYS.API_PASSWORD, '')).trim());
}

export function getMpgsGatewayBaseUrl() {
  const configured = String(cfg(MPGS_ENV_KEYS.GATEWAY_BASE_URL, '')).trim();
  if (configured) return configured.replace(/\/+$/, '');
  return 'https://test-gateway.mastercard.com';
}

export function getMpgsApiVersion() {
  const v = String(cfg(MPGS_ENV_KEYS.API_VERSION, '66')).trim();
  return v || '66';
}

export function getMpgsMerchantId() {
  return String(cfg(MPGS_ENV_KEYS.MERCHANT_ID, '')).trim();
}

export function getMpgsApiPassword() {
  return String(cfg(MPGS_ENV_KEYS.API_PASSWORD, '')).trim();
}

export function getMpgsReturnPath() {
  const path = String(cfg(MPGS_ENV_KEYS.RETURN_PATH, '/pay/return')).trim();
  return path.startsWith('/') ? path : `/${path}`;
}

export function getMpgsCancelPath() {
  const path = String(cfg(MPGS_ENV_KEYS.CANCEL_PATH, '/pay/cancel')).trim();
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * MPGS-only public origin for return/cancel URLs (not CORPFLOW_PUBLIC_BASE_URL).
 * @returns {string} Normalized HTTPS origin, or empty when unset.
 */
export function getMpgsPublicBaseUrl() {
  const base = String(cfg(MPGS_ENV_KEYS.PUBLIC_BASE_URL, '')).trim();
  if (!base) return '';
  return base.replace(/\/+$/, '');
}

export function hasMpgsPublicBaseUrl() {
  return Boolean(getMpgsPublicBaseUrl());
}

/**
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateMpgsPublicBaseUrl() {
  const raw = String(cfg(MPGS_ENV_KEYS.PUBLIC_BASE_URL, '')).trim();
  const base = getMpgsPublicBaseUrl();
  if (!base) return { ok: false, reason: 'missing' };
  if (raw.endsWith('/')) return { ok: false, reason: 'trailing_slash' };
  if (!/^https:\/\//i.test(base)) return { ok: false, reason: 'must_be_https' };
  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (parsed.pathname && parsed.pathname !== '/') {
    return { ok: false, reason: 'must_be_origin_only' };
  }
  if (parsed.search || parsed.hash) {
    return { ok: false, reason: 'must_be_origin_only' };
  }
  if (getMpgsMode() === 'test') {
    const host = parsed.hostname.toLowerCase();
    if (host === 'corpflowai.com' || host.endsWith('.corpflowai.com')) {
      return { ok: false, reason: 'test_must_use_preview_host' };
    }
  }
  return { ok: true };
}

export function buildMpgsReturnUrl(attemptReference) {
  const base = getMpgsPublicBaseUrl();
  const path = getMpgsReturnPath();
  const ref = encodeURIComponent(String(attemptReference || '').trim());
  return `${base}${path}?order_ref=${ref}`;
}

export function buildMpgsCancelUrl(attemptReference) {
  const base = getMpgsPublicBaseUrl();
  const path = getMpgsCancelPath();
  const ref = encodeURIComponent(String(attemptReference || '').trim());
  return `${base}${path}?order_ref=${ref}`;
}

export function getMpgsApiUsername(merchantId = getMpgsMerchantId()) {
  return `merchant.${merchantId}`;
}

/** Default link TTL for TEST (hours). Operator may override via env. */
export function getPaymentLinkExpiryHours() {
  const n = Number(cfg(MPGS_ENV_KEYS.LINK_EXPIRY_HOURS, '72'));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 24 * 14) : 72;
}

export function getPaymentLinkAllowedAttempts() {
  const n = Number(cfg(MPGS_ENV_KEYS.LINK_ALLOWED_ATTEMPTS, '3'));
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 10) : 3;
}

/**
 * ISO-8601 expiry for MPGS paymentLink.expiryDateTime.
 * @param {Date} [from]
 */
export function buildPaymentLinkExpiryDateTime(from = new Date()) {
  const hours = getPaymentLinkExpiryHours();
  const expiry = new Date(from.getTime() + hours * 60 * 60 * 1000);
  return expiry.toISOString();
}

/**
 * Non-sensitive diagnostics for factory health / operator checks.
 */
export function mpgsConfigDiagnostics() {
  const publicBaseValidation = validateMpgsPublicBaseUrl();
  return {
    enabled: isMpgsEnabled(),
    mode: getMpgsMode(),
    mock: isMpgsMockMode(),
    credentials_configured: hasMpgsCredentials(),
    mpgs_public_base_url_present: hasMpgsPublicBaseUrl(),
    mpgs_public_base_url_valid: publicBaseValidation.ok,
    mpgs_public_base_url_issue: publicBaseValidation.ok ? null : publicBaseValidation.reason,
    operational: isMpgsOperational(),
    hosted_checkout_enabled: isHostedCheckoutEnabled(),
    gateway_base_url: getMpgsGatewayBaseUrl(),
    api_version: getMpgsApiVersion(),
    return_path: getMpgsReturnPath(),
    cancel_path: getMpgsCancelPath(),
    merchant_id_present: Boolean(getMpgsMerchantId()),
    payment_link_expiry_hours: getPaymentLinkExpiryHours(),
    payment_link_allowed_attempts: getPaymentLinkAllowedAttempts(),
  };
}
