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
  HOSTED_CHECKOUT_ENABLED: 'CORPFLOW_MPGS_HOSTED_CHECKOUT_ENABLED',
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
 * This spike never enables live payments by default.
 */
export function isMpgsOperational() {
  if (!isMpgsEnabled()) return false;
  if (getMpgsMode() === 'production') {
    // Production path exists for future operator authorisation; still requires all credentials.
    return hasMpgsCredentials();
  }
  return hasMpgsCredentials() || isMpgsMockMode();
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
  const v = String(cfg(MPGS_ENV_KEYS.API_VERSION, '100')).trim();
  return v || '100';
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

export function getPublicBaseUrl() {
  const base = String(cfg('CORPFLOW_PUBLIC_BASE_URL', '') || cfg('CORPFLOW_APEX_BASE_URL', '')).trim();
  if (base) return base.replace(/\/+$/, '');
  return 'https://corpflowai.com';
}

export function buildMpgsReturnUrl(orderReference) {
  const base = getPublicBaseUrl();
  const path = getMpgsReturnPath();
  const ref = encodeURIComponent(String(orderReference || '').trim());
  return `${base}${path}?order_ref=${ref}`;
}

export function getMpgsApiUsername(merchantId = getMpgsMerchantId()) {
  return `merchant.${merchantId}`;
}

/**
 * Non-sensitive diagnostics for factory health / operator checks.
 */
export function mpgsConfigDiagnostics() {
  return {
    enabled: isMpgsEnabled(),
    mode: getMpgsMode(),
    mock: isMpgsMockMode(),
    credentials_configured: hasMpgsCredentials(),
    operational: isMpgsOperational(),
    hosted_checkout_enabled: isHostedCheckoutEnabled(),
    gateway_base_url: getMpgsGatewayBaseUrl(),
    api_version: getMpgsApiVersion(),
    return_path: getMpgsReturnPath(),
    merchant_id_present: Boolean(getMpgsMerchantId()),
  };
}
