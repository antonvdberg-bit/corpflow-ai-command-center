/**
 * Slice 1 access / scope resolution.
 * Reuses session shapes from lib/server/session + auth (admin | tenant).
 */

import { REFERENCE_TENANT_ID } from './constants.js';

/**
 * @typedef {{
 *   typ: 'admin' | 'tenant' | 'proof',
 *   username: string | null,
 *   user_id: string | null,
 *   tenant_id: string | null,
 *   acting_tenant_id: string | null,
 *   role: string,
 *   can_core: boolean,
 *   can_tenant_ids: string[],
 *   source: 'session' | 'proof',
 * }} AppActor
 */

/**
 * @param {unknown} payload session payload
 * @param {{ membershipTenantIds?: string[] }} [opts]
 * @returns {AppActor | null}
 */
export function actorFromSessionPayload(payload, opts = {}) {
  if (!payload || typeof payload !== 'object') return null;
  const p = /** @type {Record<string, unknown>} */ (payload);
  const typ = String(p.typ || '').trim();
  const memberships = Array.isArray(opts.membershipTenantIds)
    ? opts.membershipTenantIds.map((x) => String(x || '').trim()).filter(Boolean)
    : [];

  if (typ === 'admin') {
    const canTenant = new Set([REFERENCE_TENANT_ID, ...memberships]);
    const acting =
      p.acting_tenant_id != null && String(p.acting_tenant_id).trim()
        ? String(p.acting_tenant_id).trim()
        : null;
    if (acting) canTenant.add(acting);
    return {
      typ: 'admin',
      username: p.username != null ? String(p.username) : null,
      user_id: p.user_id != null ? String(p.user_id) : null,
      tenant_id: null,
      acting_tenant_id: acting,
      role: 'core_operator',
      can_core: true,
      can_tenant_ids: [...canTenant],
      source: 'session',
    };
  }

  if (typ === 'tenant') {
    const tenantId =
      p.acting_tenant_id != null && String(p.acting_tenant_id).trim()
        ? String(p.acting_tenant_id).trim()
        : p.tenant_id != null
          ? String(p.tenant_id).trim()
          : '';
    if (!tenantId) return null;
    const canTenant = new Set([tenantId, ...memberships]);
    return {
      typ: 'tenant',
      username: p.username != null ? String(p.username) : null,
      user_id: p.user_id != null ? String(p.user_id) : null,
      tenant_id: tenantId,
      acting_tenant_id: tenantId,
      role: 'tenant_member',
      can_core: false,
      can_tenant_ids: [...canTenant],
      source: 'session',
    };
  }

  return null;
}

/**
 * Preview / local proof actor (synthetic dual-capable user).
 * Never used for production delivery claims; only for Slice 1 visual evidence.
 * @returns {AppActor}
 */
export function buildProofActor() {
  return {
    typ: 'proof',
    username: 'slice1-proof',
    user_id: 'syn_user_slice1_proof',
    tenant_id: null,
    acting_tenant_id: REFERENCE_TENANT_ID,
    role: 'proof_dual_scope',
    can_core: true,
    can_tenant_ids: [REFERENCE_TENANT_ID],
    source: 'proof',
  };
}

/**
 * @param {AppActor | null | undefined} actor
 * @returns {boolean}
 */
export function canAccessCore(actor) {
  return !!(actor && actor.can_core === true);
}

/**
 * @param {AppActor | null | undefined} actor
 * @param {string} tenantId
 * @returns {boolean}
 */
export function canAccessTenant(actor, tenantId) {
  if (!actor) return false;
  const tid = String(tenantId || '').trim();
  if (!tid) return false;
  return actor.can_tenant_ids.includes(tid);
}

/**
 * @param {AppActor | null | undefined} actor
 * @param {'core'|'tenant'} scope
 * @param {string} [tenantId]
 * @returns {{ ok: true } | { ok: false, error: string, http_status: number }}
 */
export function assertScopeAccess(actor, scope, tenantId) {
  if (!actor) {
    return { ok: false, error: 'authentication_required', http_status: 401 };
  }
  if (scope === 'core') {
    if (!canAccessCore(actor)) {
      return { ok: false, error: 'core_access_denied', http_status: 403 };
    }
    return { ok: true };
  }
  if (scope === 'tenant') {
    const tid = String(tenantId || REFERENCE_TENANT_ID).trim();
    if (!canAccessTenant(actor, tid)) {
      return { ok: false, error: 'tenant_access_denied', http_status: 403 };
    }
    return { ok: true };
  }
  return { ok: false, error: 'invalid_scope', http_status: 400 };
}

/**
 * @param {AppActor} actor
 * @returns {Array<{ scope: 'core'|'tenant', label: string, tenant_id: string | null }>}
 */
export function availableScopesForActor(actor) {
  /** @type {Array<{ scope: 'core'|'tenant', label: string, tenant_id: string | null }>} */
  const out = [];
  if (canAccessCore(actor)) {
    out.push({ scope: 'core', label: 'Core', tenant_id: null });
  }
  if (canAccessTenant(actor, REFERENCE_TENANT_ID)) {
    out.push({
      scope: 'tenant',
      label: 'Tenant — CorpFlowAI',
      tenant_id: REFERENCE_TENANT_ID,
    });
  }
  return out;
}

/**
 * Whether proof mode may be used (local / Vercel Preview only — never Production).
 * @param {{ nodeEnv?: string, vercelEnv?: string } | undefined} env
 */
export function isProofModeAllowed(env) {
  const nodeEnv = String(env?.nodeEnv ?? process.env.NODE_ENV ?? '').trim();
  const vercelEnv = String(env?.vercelEnv ?? process.env.VERCEL_ENV ?? '').trim();
  if (vercelEnv === 'production') return false;
  if (vercelEnv === 'preview' || vercelEnv === 'development') return true;
  return nodeEnv !== 'production';
}
