/**
 * #778 Slice 1 — Core / Tenant scope access checks (pure; session + memberships injected).
 * CorpFlowAI is a normal reference tenant — no bypass architecture.
 */

import { REFERENCE_TENANT_ID } from './synthetic-store.js';

/**
 * @param {{ ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined} sess
 * @returns {Record<string, unknown> | null}
 */
export function readSessionPayload(sess) {
  if (!(sess?.ok === true) || !sess.payload || typeof sess.payload !== 'object') return null;
  return sess.payload;
}

/**
 * @param {Record<string, unknown> | null} payload
 * @returns {string}
 */
export function sessionRoleLabel(payload) {
  if (!payload) return 'anonymous';
  const typ = String(payload.typ || '').toLowerCase();
  if (typ === 'admin') {
    if (payload.factory_master === true) return 'factory_master';
    return 'admin';
  }
  if (typ === 'tenant') return 'tenant';
  return typ || 'unknown';
}

/**
 * Core scope: admin (including factory_master) only.
 * Tenant-only users must be denied.
 *
 * @param {{ ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined} sess
 * @returns {boolean}
 */
export function canAccessCoreScope(sess) {
  const p = readSessionPayload(sess);
  if (!p) return false;
  return String(p.typ || '').toLowerCase() === 'admin';
}

/**
 * Tenant scope for a specific tenant_id.
 * - tenant session must match tenant_id
 * - admin may access when acting_tenant_id matches, or factory_master with explicit membership
 * - membership list (when provided) must include the tenant for DB-backed users
 *
 * @param {{
 *   sess: { ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined,
 *   tenantId: string,
 *   memberships?: Array<{ tenant_id?: string }> | null,
 *   factoryMaster?: boolean,
 * }} args
 * @returns {boolean}
 */
export function canAccessTenantScope(args) {
  const tenantId = String(args.tenantId || '').trim();
  if (!tenantId) return false;
  const p = readSessionPayload(args.sess);
  if (!p) return false;
  const typ = String(p.typ || '').toLowerCase();

  if (typ === 'tenant') {
    const sessionTenant =
      p.acting_tenant_id != null && String(p.acting_tenant_id).trim()
        ? String(p.acting_tenant_id).trim()
        : p.tenant_id != null
          ? String(p.tenant_id).trim()
          : '';
    if (sessionTenant !== tenantId) return false;
    // Optional membership check when provided.
    if (Array.isArray(args.memberships)) {
      const ids = new Set(
        args.memberships
          .map((m) => (m?.tenant_id != null ? String(m.tenant_id).trim() : ''))
          .filter(Boolean),
      );
      if (ids.size > 0 && !ids.has(tenantId)) return false;
    }
    return true;
  }

  if (typ === 'admin') {
    const acting =
      p.acting_tenant_id != null && String(p.acting_tenant_id).trim()
        ? String(p.acting_tenant_id).trim()
        : '';
    const isFm = args.factoryMaster === true || p.factory_master === true;
    if (acting && acting === tenantId) {
      if (Array.isArray(args.memberships)) {
        const ids = new Set(
          args.memberships
            .map((m) => (m?.tenant_id != null ? String(m.tenant_id).trim() : ''))
            .filter(Boolean),
        );
        // factory_master may act without explicit membership rows when memberships empty
        if (ids.size > 0 && !ids.has(tenantId) && !isFm) return false;
      }
      return true;
    }
    // Dual-authorised Core operator entering Tenant — CorpFlowAI via membership (or FM).
    if (Array.isArray(args.memberships)) {
      const ids = new Set(
        args.memberships
          .map((m) => (m?.tenant_id != null ? String(m.tenant_id).trim() : ''))
          .filter(Boolean),
      );
      if (ids.has(tenantId)) return true;
    }
    if (isFm && tenantId === REFERENCE_TENANT_ID) return true;
    return false;
  }

  return false;
}

/**
 * Build persistent chrome model for the shell.
 *
 * @param {{
 *   sess: { ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined,
 *   selectedScope: 'core' | 'tenant',
 *   selectedTenantId?: string | null,
 *   memberships?: Array<{ tenant_id?: string, tenant_name?: string }> | null,
 *   factoryMaster?: boolean,
 * }} args
 * @returns {Record<string, unknown>}
 */
export function buildAppChrome(args) {
  const p = readSessionPayload(args.sess);
  const role = sessionRoleLabel(p);
  const canCore = canAccessCoreScope(args.sess);
  const tenantId = String(args.selectedTenantId || REFERENCE_TENANT_ID).trim() || REFERENCE_TENANT_ID;
  const canTenant = canAccessTenantScope({
    sess: args.sess,
    tenantId,
    memberships: args.memberships,
    factoryMaster: args.factoryMaster,
  });

  /** @type {Array<{ scope: string, tenant_id: string | null, label: string, allowed: boolean }>} */
  const options = [
    { scope: 'core', tenant_id: null, label: 'Core', allowed: canCore },
    {
      scope: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      label: `Tenant — ${REFERENCE_TENANT_ID === 'corpflowai' ? 'CorpFlowAI' : REFERENCE_TENANT_ID}`,
      allowed: canAccessTenantScope({
        sess: args.sess,
        tenantId: REFERENCE_TENANT_ID,
        memberships: args.memberships,
        factoryMaster: args.factoryMaster,
      }),
    },
  ];

  const selectedScope = args.selectedScope === 'tenant' ? 'tenant' : 'core';
  const allowed =
    selectedScope === 'core'
      ? canCore
      : canAccessTenantScope({
          sess: args.sess,
          tenantId,
          memberships: args.memberships,
          factoryMaster: args.factoryMaster,
        });

  return {
    logged_in: Boolean(p),
    role,
    user_id: p?.user_id != null ? String(p.user_id) : null,
    selected_scope: selectedScope,
    selected_tenant_id: selectedScope === 'tenant' ? tenantId : null,
    selected_tenant_label: selectedScope === 'tenant' ? 'CorpFlowAI' : null,
    selected_allowed: allowed,
    scope_options: options,
    can_access_core: canCore,
    can_access_tenant_corpflowai: canTenant && tenantId === REFERENCE_TENANT_ID,
    visual_context: selectedScope === 'core' ? 'core' : 'tenant',
  };
}
