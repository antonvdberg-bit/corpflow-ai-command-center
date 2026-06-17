/**
 * IM-7 — resolve audit identity from a signed session (server-side only).
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §7.1.
 */

import { getSessionFromRequest } from './session.js';

/**
 * @param {{ ok?: boolean, payload?: Record<string, unknown> | null } | null | undefined} sess
 * @returns {{ actorUserId: string | null, actingTenantId: string | null, lane: 'db_backed' | 'legacy' | 'anonymous' }}
 */
export function resolveAuditActorContext(sess) {
  if (!(sess?.ok === true) || !sess.payload || typeof sess.payload !== 'object') {
    return { actorUserId: null, actingTenantId: null, lane: 'anonymous' };
  }

  const userId =
    sess.payload.user_id != null ? String(sess.payload.user_id).trim() : '';
  const actingTenantId =
    sess.payload.acting_tenant_id != null
      ? String(sess.payload.acting_tenant_id).trim() || null
      : sess.payload.tenant_id != null
        ? String(sess.payload.tenant_id).trim() || null
        : null;

  if (!userId) {
    return { actorUserId: null, actingTenantId, lane: 'legacy' };
  }

  return { actorUserId: userId, actingTenantId, lane: 'db_backed' };
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ actorUserId: string | null, actingTenantId: string | null, lane: 'db_backed' | 'legacy' | 'anonymous' }}
 */
export function resolveAuditActorContextFromRequest(req) {
  return resolveAuditActorContext(getSessionFromRequest(req));
}

/**
 * Merge IM-7 audit columns onto a trusted automation write opts object.
 * Never reads actor identity from the request body or query.
 *
 * @param {import('http').IncomingMessage} req
 * @param {Record<string, unknown>} opts
 * @returns {Record<string, unknown>}
 */
export function withAuditActorFromRequest(req, opts) {
  const ctx = resolveAuditActorContextFromRequest(req);
  const merged = { ...opts };
  if (ctx.actorUserId) {
    merged.actorUserId = ctx.actorUserId;
  }
  if (
    ctx.actorUserId &&
    ctx.actingTenantId &&
    opts.tenantId != null &&
    String(opts.tenantId).trim() !== ''
  ) {
    merged.tenantId = ctx.actingTenantId;
  }
  return merged;
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
export function normalizeAuditSourceHost(req) {
  const raw = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '')
    .toString()
    .split(',')[0]
    .trim()
    .toLowerCase();
  return raw.replace(/:\d+$/, '');
}

/**
 * Best-effort operator switch / leave audit row (IM-7 §7.3 five-tuple in payload).
 * Failures are logged and swallowed — the primary switch/leave response still succeeds.
 *
 * @param {{
 *   prisma: import('@prisma/client').PrismaClient;
 *   eventType: 'cmp.operator.switched_tenant' | 'cmp.operator.left_tenant';
 *   actorUserId: string;
 *   fromTenantId: string | null;
 *   toTenantId: string | null;
 *   sourceHost: string;
 *   sessionVersion: number;
 *   req?: import('http').IncomingMessage;
 * }} args
 */
export async function recordOperatorSwitchLeaveAudit(args) {
  const {
    prisma,
    eventType,
    actorUserId,
    fromTenantId,
    toTenantId,
    sourceHost,
    sessionVersion,
    req,
  } = args;

  const { recordTrustedAutomationEvent } = await import('../automation/internal.js');
  const timestamp = new Date().toISOString();
  /** @type {Record<string, unknown>} */
  const payload = {
    from_tenant_id: fromTenantId,
    to_tenant_id: toTenantId,
    timestamp,
    source_host: sourceHost,
    session_version: sessionVersion,
  };

  if (req) {
    const fwd = req.headers?.['x-forwarded-for'];
    if (fwd) {
      const ip = String(fwd).split(',')[0].trim();
      if (ip) payload.ip = ip.slice(0, 120);
    }
    const ua = req.headers?.['user-agent'];
    if (ua) payload.ua = String(ua).slice(0, 320);
  }

  await recordTrustedAutomationEvent(prisma, {
    tenantId: null,
    eventType,
    actorUserId,
    source: 'membership/switch-leave',
    payload,
  });
}
