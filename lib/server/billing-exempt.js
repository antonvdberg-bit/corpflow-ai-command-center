/**
 * Tenants listed in CORPFLOW_BILLING_EXEMPT_TENANT_IDS skip token-credit gates and debits on approve-build,
 * and see $0 client-facing amounts on estimates (audit full_market_value_usd unchanged).
 *
 * Comma-separated tenant ids, case-insensitive. Also readable from CORPFLOW_RUNTIME_CONFIG_JSON same key.
 */

import { cfg } from './runtime-config.js';

/** @type {string | null} */
let cachedRaw = null;
/** @type {Set<string> | null} */
let cachedSet = null;

/**
 * @returns {Set<string>}
 */
function billingExemptSet() {
  const raw = String(cfg('CORPFLOW_BILLING_EXEMPT_TENANT_IDS', '')).trim();
  if (cachedRaw === raw && cachedSet) return cachedSet;
  cachedRaw = raw;
  cachedSet = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return cachedSet;
}

/**
 * @param {unknown} tenantId
 * @returns {boolean}
 */
export function isBillingExemptTenant(tenantId) {
  const tid = tenantId != null ? String(tenantId).trim().toLowerCase() : '';
  if (!tid) return false;
  return billingExemptSet().has(tid);
}
