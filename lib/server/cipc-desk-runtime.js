/**
 * CIPC Desk standing internal test-tenant runtime helpers.
 *
 * Tenant id stays `cipc-desk`. Workflow is allowed on:
 * - standing hosts on the Production spine (`cipc.corpflowai.com`, `cipc-desk.corpflowai.com`)
 * - any request already resolved to tenant `cipc-desk` (DB host map)
 * - legacy Vercel Preview env (existing branch allowlist), without requiring preview ceremony for Production
 *
 * Live email / WhatsApp / SMS / payments remain disabled elsewhere.
 */

export const CIPCDESK_TENANT_ID = 'cipc-desk';

/** Short alias preferred for operators; policy-aligned host matches tenant_id. */
export const CIPC_DESK_STANDING_HOSTS = Object.freeze([
  'cipc.corpflowai.com',
  'cipc-desk.corpflowai.com',
]);

/**
 * @param {string | null | undefined} host
 * @returns {string}
 */
export function normalizeHostname(host) {
  return String(host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

/**
 * @param {string | null | undefined} host
 * @returns {boolean}
 */
export function isCipcDeskStandingTestHost(host) {
  const h = normalizeHostname(host);
  if (!h) return false;
  if (CIPC_DESK_STANDING_HOSTS.includes(h)) return true;
  if (h.startsWith('www.') && CIPC_DESK_STANDING_HOSTS.includes(h.slice(4))) return true;
  return false;
}

/**
 * @param {string | null | undefined} host
 * @returns {string | null} tenant id when host is a known CIPC Desk standing host
 */
export function resolveCipcDeskTenantIdFromHost(host) {
  return isCipcDeskStandingTestHost(host) ? CIPCDESK_TENANT_ID : null;
}

/**
 * Fail-closed: only tenant `cipc-desk` (or standing hosts / preview) may run CIPC Desk workflow APIs/seed.
 *
 * @param {{
 *   vercelEnv?: string | null,
 *   tenantId?: string | null,
 *   host?: string | null,
 * }} args
 * @returns {{ allowed: boolean, reason: string }}
 */
export function resolveCipcDeskWorkflowAccess(args = {}) {
  const vercelEnv = String(args.vercelEnv ?? process.env.VERCEL_ENV ?? '')
    .trim()
    .toLowerCase();
  const tenantId = String(args.tenantId || '').trim();
  const host = normalizeHostname(args.host);

  if (tenantId && tenantId !== CIPCDESK_TENANT_ID) {
    return { allowed: false, reason: 'TENANT_SCOPE_MISMATCH' };
  }

  if (isCipcDeskStandingTestHost(host)) {
    return { allowed: true, reason: 'standing_test_host' };
  }

  if (tenantId === CIPCDESK_TENANT_ID) {
    return { allowed: true, reason: 'tenant_context_cipc_desk' };
  }

  // Keep Preview env usable for branch deploys; Production standing path does not depend on it.
  if (vercelEnv === 'preview') {
    return { allowed: true, reason: 'vercel_preview_env' };
  }

  return { allowed: false, reason: 'CIPC_DESK_STANDING_OR_PREVIEW_REQUIRED' };
}

/**
 * @param {{
 *   vercelEnv?: string | null,
 *   tenantId?: string | null,
 *   host?: string | null,
 * }} args
 * @returns {boolean}
 */
export function isCipcDeskWorkflowAllowed(args = {}) {
  return resolveCipcDeskWorkflowAccess(args).allowed === true;
}
