/**
 * Host policy helpers — single source of truth for "this endpoint is Core-host only".
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §4.0, §4.4,
 * §9.5b (vector "switch-from-tenant-host rejection").
 *
 * IM-2 (2026-06-15) — introduced for the new /api/membership/* endpoints. By design,
 * this module does NOT re-implement hostname resolution. It wraps the existing
 * `buildCorpflowHostContext` from `lib/server/host-tenant-context.js`, which is the
 * one place the repo decides "is this request hitting a Core host or a tenant host?"
 * (using CORPFLOW_CORE_HOSTS, CORPFLOW_TENANT_HOST_MAP, CORPFLOW_ROOT_DOMAIN, etc.).
 *
 * Future IM-3 / IM-5 / IM-6 endpoints that switch tenants, mint switch-tenant
 * sessions, or expose membership write APIs MUST reuse `requireCoreHost(req)` —
 * never roll their own host check. If a new env var or hostname class is introduced,
 * the change lands in `host-tenant-context.js` and propagates here automatically.
 */
import { buildCorpflowHostContext } from './host-tenant-context.js';

/**
 * @typedef {{
 *   ok: boolean,
 *   host: string | null,
 *   surface: 'core' | 'tenant' | null,
 *   status?: 403,
 *   code?: 'SWITCH_NOT_ALLOWED_FROM_HOST',
 * }} CoreHostCheck
 */

/**
 * Check whether the request is hitting a Core host. Returns a structured result so
 * handlers can either short-circuit with a uniform 403 SWITCH_NOT_ALLOWED_FROM_HOST
 * or branch their logic without throwing.
 *
 * @param {import('http').IncomingMessage & { corpflowContext?: any }} req
 * @returns {CoreHostCheck}
 */
export function requireCoreHost(req) {
  const ctx = req?.corpflowContext || buildCorpflowHostContext(req);
  const host = ctx?.host || null;
  const surface = ctx?.surface || null;

  if (surface === 'core') {
    return { ok: true, host, surface };
  }

  return {
    ok: false,
    host,
    surface,
    status: 403,
    code: 'SWITCH_NOT_ALLOWED_FROM_HOST',
  };
}

/**
 * Convenience boolean form for tests + non-Express callers.
 *
 * @param {import('http').IncomingMessage & { corpflowContext?: any }} req
 * @returns {boolean}
 */
export function isCoreHost(req) {
  return requireCoreHost(req).ok === true;
}

/**
 * Express/Connect-style guard: if the request is not on a Core host, send 403 and
 * return false. Otherwise return true. Caller uses:
 *
 *   if (!assertCoreHostOrReject(req, res)) return;
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {boolean}
 */
export function assertCoreHostOrReject(req, res) {
  const check = requireCoreHost(req);
  if (check.ok) return true;
  res.status(check.status || 403).json({
    ok: false,
    error: check.code || 'SWITCH_NOT_ALLOWED_FROM_HOST',
    message:
      'This endpoint is only available on a Core host. Switch to the Core host (e.g. core.corpflowai.com) and retry.',
    host: check.host,
  });
  return false;
}
