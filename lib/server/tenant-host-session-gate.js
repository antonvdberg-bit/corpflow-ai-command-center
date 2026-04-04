/**
 * Prevent cross-tenant "contamination" when a browser still holds a tenant session cookie
 * from another workspace but the hostname authoritatively maps to a different tenant
 * (apex, env host map, or Postgres tenant_hostnames).
 *
 * Subdomain slug mismatches (e.g. lux vs luxe-maurice) intentionally do NOT trigger this —
 * session remains canonical there after reconcile.
 */

import { getSessionFromRequest } from './session.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function isAuthoritativeHostBinding(req) {
  const src = req.corpflowTenantIdSource;
  return src === 'apex' || src === 'postgres' || src === 'env_map';
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ host_tenant_id: string, session_tenant_id: string } | null}
 */
export function getTenantHostSessionConflict(req) {
  try {
    const ctx = req.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return null;
    if (!isAuthoritativeHostBinding(req)) return null;

    const hostTid =
      req.corpflowHostTenantIdBeforeSession != null
        ? String(req.corpflowHostTenantIdBeforeSession).trim()
        : '';
    if (!hostTid) return null;

    const sess = getSessionFromRequest(req);
    if (!(sess?.ok === true && sess.payload?.typ === 'tenant' && sess.payload?.tenant_id != null)) {
      return null;
    }
    const sessTid = String(sess.payload.tenant_id).trim();
    if (!sessTid || sessTid === hostTid) return null;

    return { host_tenant_id: hostTid, session_tenant_id: sessTid };
  } catch {
    return null;
  }
}
