/**
 * IM-6.1 — SSR gate for `/change` on tenant hosts.
 *
 * Spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §4.2 — DB-backed
 * admin on a tenant host without host-aligned `acting_tenant_id` goes to Core
 * picker, not the tenant login loop.
 */

/**
 * @param {string | null | undefined} coreHostsEnv
 * @returns {string}
 */
export function firstCoreHostname(coreHostsEnv) {
  const raw = String(coreHostsEnv || 'core.corpflowai.com').trim();
  return (
    raw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)[0] || 'core.corpflowai.com'
  );
}

/**
 * @param {string | null | undefined} coreHostsEnv
 * @returns {string}
 */
export function coreChangePickerUrl(coreHostsEnv) {
  return `https://${firstCoreHostname(coreHostsEnv)}/change?mode=switch`;
}

/**
 * @param {{
 *   userId: string | null | undefined,
 *   sessionTyp: string | null | undefined,
 *   surface: string | null | undefined,
 *   hostTenantId: string | null | undefined,
 *   actingTenantId: string | null | undefined,
 *   nextPath?: string,
 *   coreHostsEnv?: string | null,
 * }} args
 * @returns {{ kind: 'ok' } | { kind: 'redirect', destination: string, reason: 'core_picker' | 'tenant_mismatch_login' }}
 */
export function resolveChangeConsoleSsrGate({
  userId,
  sessionTyp,
  surface,
  hostTenantId,
  actingTenantId,
  nextPath = '/change',
  coreHostsEnv,
}) {
  if (!userId) return { kind: 'ok' };
  if (surface !== 'tenant' || !hostTenantId) return { kind: 'ok' };

  const acting = actingTenantId != null ? String(actingTenantId).trim() : '';
  if (acting && acting === hostTenantId) return { kind: 'ok' };

  const typ = String(sessionTyp || '').toLowerCase();
  const safeNext =
    typeof nextPath === 'string' && nextPath.startsWith('/') ? nextPath : '/change';

  if (typ === 'admin') {
    return {
      kind: 'redirect',
      destination: coreChangePickerUrl(coreHostsEnv),
      reason: 'core_picker',
    };
  }

  return {
    kind: 'redirect',
    destination: `/login?tenant_mismatch=1&next=${encodeURIComponent(safeNext)}`,
    reason: 'tenant_mismatch_login',
  };
}
