/**
 * Slice 1 access — separately authenticated Core and Tenant environments.
 *
 * AUTHORITATIVE:
 * - Core session (typ=admin) never enters Tenant environment.
 * - Tenant session (typ=tenant) never enters Core environment.
 * - CorpFlowAI tenant uses normal tenant auth (no admin privilege bypass).
 * - One production app, one Postgres — no second identity system.
 */

import { REFERENCE_TENANT_ID } from './constants.js';

/**
 * @typedef {'core'|'tenant'} AppEnvironment
 *
 * @typedef {{
 *   typ: 'admin' | 'tenant' | 'proof_core' | 'proof_tenant',
 *   username: string | null,
 *   user_id: string | null,
 *   tenant_id: string | null,
 *   acting_tenant_id: string | null,
 *   role: string,
 *   can_core: boolean,
 *   can_tenant_ids: string[],
 *   environment: AppEnvironment,
 *   source: 'session' | 'proof',
 * }} AppActor
 */

/**
 * Map an existing CorpFlow session payload to a Slice 1 actor.
 * Admin → Core only. Tenant → Tenant only (bound tenant ids).
 *
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
    // Core credentials/session — never grant Tenant environment access.
    return {
      typ: 'admin',
      username: p.username != null ? String(p.username) : null,
      user_id: p.user_id != null ? String(p.user_id) : null,
      tenant_id: null,
      acting_tenant_id:
        p.acting_tenant_id != null && String(p.acting_tenant_id).trim()
          ? String(p.acting_tenant_id).trim()
          : null,
      role: 'core_operator',
      can_core: true,
      can_tenant_ids: [],
      environment: 'core',
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
      environment: 'tenant',
      source: 'session',
    };
  }

  return null;
}

/**
 * Preview / local proof actor for Core only (never Tenant).
 * @returns {AppActor}
 */
export function buildProofCoreActor() {
  return {
    typ: 'proof_core',
    username: 'slice1-proof-core',
    user_id: 'syn_user_slice1_proof_core',
    tenant_id: null,
    acting_tenant_id: null,
    role: 'core_operator',
    can_core: true,
    can_tenant_ids: [],
    environment: 'core',
    source: 'proof',
  };
}

/**
 * Preview / local proof actor for Tenant — CorpFlowAI only (never Core).
 * Uses normal tenant shape; not admin privilege.
 * @returns {AppActor}
 */
export function buildProofTenantActor() {
  return {
    typ: 'proof_tenant',
    username: 'slice1-proof-tenant',
    user_id: 'syn_user_slice1_proof_tenant',
    tenant_id: REFERENCE_TENANT_ID,
    acting_tenant_id: REFERENCE_TENANT_ID,
    role: 'tenant_member',
    can_core: false,
    can_tenant_ids: [REFERENCE_TENANT_ID],
    environment: 'tenant',
    source: 'proof',
  };
}

/**
 * @deprecated Dual-scope proof removed. Use buildProofCoreActor / buildProofTenantActor.
 * @returns {AppActor}
 */
export function buildProofActor() {
  return buildProofTenantActor();
}

/**
 * @param {AppActor | null | undefined} actor
 * @returns {boolean}
 */
export function canAccessCore(actor) {
  return !!(actor && actor.can_core === true && actor.environment === 'core');
}

/**
 * @param {AppActor | null | undefined} actor
 * @param {string} tenantId
 * @returns {boolean}
 */
export function canAccessTenant(actor, tenantId) {
  if (!actor) return false;
  if (actor.environment !== 'tenant' || actor.can_core === true) return false;
  const tid = String(tenantId || '').trim();
  if (!tid) return false;
  return actor.can_tenant_ids.includes(tid);
}

/**
 * Assert access to a fixed environment (not a switchable scope).
 * @param {AppActor | null | undefined} actor
 * @param {AppEnvironment} environment
 * @param {string} [tenantId]
 * @returns {{ ok: true } | { ok: false, error: string, http_status: number }}
 */
export function assertEnvironmentAccess(actor, environment, tenantId) {
  if (!actor) {
    return { ok: false, error: 'authentication_required', http_status: 401 };
  }
  if (environment === 'core') {
    if (!canAccessCore(actor)) {
      return { ok: false, error: 'core_access_denied', http_status: 403 };
    }
    return { ok: true };
  }
  if (environment === 'tenant') {
    const tid = String(tenantId || REFERENCE_TENANT_ID).trim();
    if (!canAccessTenant(actor, tid)) {
      return { ok: false, error: 'tenant_access_denied', http_status: 403 };
    }
    return { ok: true };
  }
  return { ok: false, error: 'invalid_environment', http_status: 400 };
}

/**
 * @deprecated Use assertEnvironmentAccess — scopes are not switchable.
 */
export function assertScopeAccess(actor, scope, tenantId) {
  return assertEnvironmentAccess(actor, scope, tenantId);
}

/**
 * Fixed environment descriptor for chrome (no switcher list).
 * @param {AppActor} actor
 * @returns {{ environment: AppEnvironment, label: string, tenant_id: string | null }}
 */
export function environmentDescriptorForActor(actor) {
  if (canAccessCore(actor)) {
    return { environment: 'core', label: 'Core', tenant_id: null };
  }
  const tid = actor.tenant_id || actor.can_tenant_ids[0] || REFERENCE_TENANT_ID;
  return {
    environment: 'tenant',
    label: tid === REFERENCE_TENANT_ID ? 'Tenant — CorpFlowAI' : `Tenant — ${tid}`,
    tenant_id: tid,
  };
}

/**
 * @deprecated Shared ScopeSwitcher removed — each session has one environment.
 * @param {AppActor} actor
 */
export function availableScopesForActor(actor) {
  const d = environmentDescriptorForActor(actor);
  return [
    {
      scope: d.environment,
      label: d.label,
      tenant_id: d.tenant_id,
    },
  ];
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
