/**
 * IM-6 — CMP membership + acting_tenant_id enforcement helpers.
 *
 * Pure/sync decision helpers (unit-tested) plus a single async entry point
 * used by `lib/cmp/router.js` after the host boundary check.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-6.
 */

/**
 * @param {{ ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined} sess
 * @returns {string}
 */
export function readSessionUserId(sess) {
  if (!(sess?.ok === true) || sess.payload?.user_id == null) return '';
  return String(sess.payload.user_id).trim();
}

/**
 * @param {{ ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined} sess
 * @returns {string}
 */
export function readActingTenantId(sess) {
  if (!(sess?.ok === true) || sess.payload?.acting_tenant_id == null) return '';
  return String(sess.payload.acting_tenant_id).trim();
}

/**
 * IM-6 host alignment for DB-backed sessions on tenant hosts.
 *
 * @param {{
 *   hostSurface: string,
 *   hostTenantId: string | null,
 *   sess: { ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined,
 * }} args
 * @returns {{ error: string, extra: Record<string, unknown> } | null}
 */
export function evaluateDbBackedHostActingMismatch({ hostSurface, hostTenantId, sess }) {
  const userId = readSessionUserId(sess);
  if (!userId) return null;
  if (hostSurface !== 'tenant' || !hostTenantId) return null;

  const actingTid = readActingTenantId(sess);
  if (!actingTid || actingTid !== hostTenantId) {
    return {
      error: 'TENANT_HOST_SESSION_MISMATCH',
      extra: {
        host_tenant_id: hostTenantId,
        session_tenant_id: actingTid || null,
      },
    };
  }
  return null;
}

/**
 * @param {{
 *   sess: { ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined,
 *   actingTenantId: string,
 *   eff: { factory_master?: boolean, memberships?: Array<{ tenant_id?: string }> } | null | undefined,
 * }} args
 * @returns {{ error: string, extra: Record<string, unknown> } | null}
 */
export function evaluateActingTenantMembership({ sess, actingTenantId, eff }) {
  const userId = readSessionUserId(sess);
  if (!userId) return null;
  if (!actingTenantId) return null;

  const memberIds = new Set(
    (eff?.memberships || [])
      .map((m) => (m?.tenant_id != null ? String(m.tenant_id).trim() : ''))
      .filter(Boolean),
  );
  if (!memberIds.has(actingTenantId)) {
    return {
      error: 'ACTING_TENANT_NOT_IN_EFFECTIVE_MEMBERSHIPS',
      extra: { acting_tenant_id: actingTenantId },
    };
  }
  return null;
}

/**
 * @param {{
 *   sess: { ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined,
 *   actingTenantId: string,
 *   eff: { factory_master?: boolean } | null | undefined,
 *   action: string,
 * }} args
 * @returns {{ error: string, extra: Record<string, unknown> } | null}
 */
export function evaluateFactoryMasterPickerContext({ sess, actingTenantId, eff, action }) {
  const userId = readSessionUserId(sess);
  if (!userId) return null;
  if (sess?.payload?.typ !== 'admin') return null;

  if (actingTenantId) {
    return {
      error: 'FACTORY_MASTER_REQUIRES_PICKER_CONTEXT',
      extra: {
        action,
        hint: 'Leave tenant context to use factory tools.',
      },
    };
  }
  if (eff?.factory_master !== true) {
    return {
      error: 'FACTORY_MASTER_REQUIRES_PICKER_CONTEXT',
      extra: {
        action,
        hint: 'Leave tenant context to use factory tools.',
      },
    };
  }
  return null;
}

/**
 * @param {{
 *   sess: { ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined,
 *   eff: { factory_master?: boolean } | null | undefined,
 *   isLegacyEnvMaster: boolean,
 *   isFactoryMasterToken: boolean,
 * }} args
 * @returns
 *   | { kind: 'core' }
 *   | { kind: 'tenant', tenantId: string }
 *   | { kind: 'factory_master' }
 *   | { kind: 'invalid_tenant_session' }
 *   | { kind: 'unknown' }
 */
export function resolveAdminTicketListScope({ sess, eff, isLegacyEnvMaster, isFactoryMasterToken }) {
  if (isFactoryMasterToken) return { kind: 'factory_master' };
  if (!(sess?.ok === true) || sess.payload?.typ !== 'admin') return { kind: 'unknown' };
  if (isLegacyEnvMaster) return { kind: 'core' };

  const actingTid = readActingTenantId(sess);
  if (actingTid) return { kind: 'tenant', tenantId: actingTid };
  if (eff?.factory_master === true) return { kind: 'core' };
  return { kind: 'invalid_tenant_session' };
}

/**
 * @param {{
 *   sess: { ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined,
 *   eff: { factory_master?: boolean } | null | undefined,
 *   isLegacyEnvMaster: boolean,
 *   isFactoryMasterToken: boolean,
 * }} args
 * @returns {string | null}
 */
export function resolveAdminScopedTicketReadTenantId({
  sess,
  eff,
  isLegacyEnvMaster,
  isFactoryMasterToken,
}) {
  if (isFactoryMasterToken) return null;
  if (!(sess?.ok === true) || sess.payload?.typ !== 'admin') return null;
  if (isLegacyEnvMaster) return null;

  const actingTid = readActingTenantId(sess);
  if (actingTid) return actingTid;
  if (eff?.factory_master === true) return null;
  return null;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} action
 * @param {{
 *   getEffectiveMembershipsFn: (userId: string) => Promise<{ enabled?: boolean, factory_master?: boolean, memberships?: Array<{ tenant_id?: string }> }>,
 *   factoryOnlyActions: Set<string>,
 *   deny: (res: import('http').ServerResponse, status: number, error: string, extra?: Record<string, unknown>) => import('http').ServerResponse,
 * }} deps
 * @returns {Promise<true | import('http').ServerResponse>}
 */
export async function assertMembershipEnforcement(req, res, action, deps) {
  const { getSessionFromRequest } = await import('../../server/session.js');
  const sess = getSessionFromRequest(req);
  const userId = readSessionUserId(sess);
  if (!userId) return true;

  const a = String(action || '').trim().toLowerCase();
  let eff;
  try {
    eff = await deps.getEffectiveMembershipsFn(userId);
  } catch {
    return deps.deny(res, 503, 'MEMBERSHIP_RECHECK_UNAVAILABLE', { action: a });
  }

  req.corpflowEffectiveMemberships = eff;

  if (eff.enabled === false) {
    return deps.deny(res, 403, 'ACTING_TENANT_NOT_IN_EFFECTIVE_MEMBERSHIPS', { action: a });
  }

  const actingTid = readActingTenantId(sess);

  if (deps.factoryOnlyActions.has(a)) {
    const factoryDeny = evaluateFactoryMasterPickerContext({
      sess,
      actingTenantId: actingTid,
      eff,
      action: a,
    });
    if (factoryDeny) return deps.deny(res, 403, factoryDeny.error, factoryDeny.extra);
    return true;
  }

  const membershipDeny = evaluateActingTenantMembership({ sess, actingTenantId: actingTid, eff });
  if (membershipDeny) {
    return deps.deny(res, 403, membershipDeny.error, { action: a, ...membershipDeny.extra });
  }

  return true;
}
