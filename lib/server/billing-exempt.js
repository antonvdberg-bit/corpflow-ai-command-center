/**
 * Optional **env override** (OR’d with DB `tenant_personas.billing_exempt`).
 *
 * Primary source of truth for billing exemption is **`tenant_personas.billing_exempt`** (one indexed row per
 * tenant — O(1) lookup, scales to many tenants). This env list is for break-glass / legacy ops without a DB
 * write: same effect — skip token pre-check and debit on approve-build; estimates show $0 client line.
 *
 * Comma-separated tenant ids, case-insensitive. Also readable from CORPFLOW_RUNTIME_CONFIG_JSON same key.
 *
 * **`CORPFLOW_BILLING_EXEMPT_ALL`** (see `isBillingExemptAllTenantsEnv`) ORs **every** tenant for the same
 * effect — **staging / dev only**; do not enable on production billing surfaces.
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
 * Env-only override (sync, no I/O). Prefer `getTenantWalletSnapshot` from `lib/factory/costing.js` for
 * authoritative **DB + env** resolution in request paths.
 *
 * @param {unknown} tenantId
 * @returns {boolean}
 */
export function isBillingExemptEnvOverride(tenantId) {
  const tid = tenantId != null ? String(tenantId).trim().toLowerCase() : '';
  if (!tid) return false;
  return billingExemptSet().has(tid);
}

/**
 * When `true` / `1` / `yes`: every tenant is treated as billing-exempt for wallet snapshot (approve-build
 * gate + debit skip, costing UI). **Not** for production with real clients.
 *
 * @returns {boolean}
 */
export function isBillingExemptAllTenantsEnv() {
  const v = String(cfg('CORPFLOW_BILLING_EXEMPT_ALL', '')).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** @deprecated Use `isBillingExemptEnvOverride` or `getTenantWalletSnapshot` */
export const isBillingExemptTenant = isBillingExemptEnvOverride;
