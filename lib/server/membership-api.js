/**
 * Multi-tenant membership read endpoints — IM-2 (2026-06-15).
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 (IM-2),
 * §4.0, §9.5b. Stream-boundary discipline: this module only ships read APIs and the
 * `getEffectiveMemberships(userId)` helper consumption. It does not change session
 * shape (IM-5), does not change CMP enforcement (IM-6), does not render the picker
 * UI (IM-3), and does not write to user_tenant_memberships.
 *
 * Two endpoints:
 *
 *   GET /api/membership/effective
 *     - Core host only (403 SWITCH_NOT_ALLOWED_FROM_HOST otherwise).
 *     - Session required (401 UNAUTHENTICATED otherwise).
 *     - Returns the *session user's own* effective matrix only — never another
 *       user's. Any `?user_id=` query parameter triggers an explicit
 *       400 UNEXPECTED_USER_ID rejection so tampering is visible in logs.
 *
 *   GET /api/membership/list?user_id=<id>
 *     - Core host only.
 *     - Session required, level='admin', factory_master=true.
 *     - Returns getEffectiveMemberships() for any auth_users row chosen by the
 *       caller; used by future admin UX (IM-3 / IM-7).
 *
 * No write endpoint exists in IM-2; grant / revoke / enable-toggle / factory_master
 * promotion all live in IM-7 / IM-8 with their own approvals.
 */
import { PrismaClient } from '@prisma/client';

import { getSessionFromRequest } from './session.js';
import { requireCoreHost } from './host-policy.js';
import { getEffectiveMemberships } from './effective-memberships.js';

const prisma = new PrismaClient();

function deny(res, status, error, extra = {}) {
  return res.status(status).json({ ok: false, error, ...extra });
}

/**
 * GET /api/membership/effective — returns the session user's effective matrix only.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse & { status: (n: number) => any, json: (b: any) => any }} res
 */
export async function handleMembershipEffective(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const hostCheck = requireCoreHost(req);
  if (!hostCheck.ok) {
    return res.status(hostCheck.status || 403).json({
      ok: false,
      error: hostCheck.code || 'SWITCH_NOT_ALLOWED_FROM_HOST',
      message:
        'This endpoint is only available on a Core host. Switch to the Core host (e.g. core.corpflowai.com) and retry.',
      host: hostCheck.host,
    });
  }

  const query = req.query || {};
  const userIdParam = pickFirst(query, 'user_id');
  if (userIdParam != null && String(userIdParam).trim() !== '') {
    return deny(res, 400, 'UNEXPECTED_USER_ID', {
      message:
        'GET /api/membership/effective returns the session user\'s own matrix only. To query another user, use GET /api/membership/list?user_id=<id> (requires factory_master).',
    });
  }

  const sess = getSessionFromRequest(req);
  if (!sess?.ok) {
    return deny(res, 401, 'UNAUTHENTICATED', { reason: sess?.error || 'missing' });
  }

  const sessionUserId = String(sess.payload?.user_id || '').trim();
  if (!sessionUserId) {
    return deny(res, 400, 'NO_USER_ID_IN_SESSION', {
      message:
        'This session does not carry a user_id (legacy env-master or PIN session). Membership lookups require a DB-backed auth_users row; sign in with a DB-backed credential and retry.',
    });
  }

  const eff = await getEffectiveMemberships(sessionUserId);
  if (eff.not_found) {
    return deny(res, 401, 'SESSION_USER_NOT_FOUND', {
      message: 'The session points to an auth_users row that no longer exists.',
    });
  }

  return res.status(200).json({ ok: true, ...eff });
}

/**
 * GET /api/membership/list?user_id=<id> — factory_master-only inspection of another
 * user's effective matrix.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse & { status: (n: number) => any, json: (b: any) => any }} res
 */
export async function handleMembershipList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const hostCheck = requireCoreHost(req);
  if (!hostCheck.ok) {
    return res.status(hostCheck.status || 403).json({
      ok: false,
      error: hostCheck.code || 'SWITCH_NOT_ALLOWED_FROM_HOST',
      message:
        'This endpoint is only available on a Core host. Switch to the Core host (e.g. core.corpflowai.com) and retry.',
      host: hostCheck.host,
    });
  }

  const sess = getSessionFromRequest(req);
  if (!sess?.ok) {
    return deny(res, 401, 'UNAUTHENTICATED', { reason: sess?.error || 'missing' });
  }

  if (String(sess.payload?.typ || '').toLowerCase() !== 'admin') {
    return deny(res, 403, 'ADMIN_REQUIRED', {
      message: 'GET /api/membership/list requires an admin-level session.',
    });
  }

  const callerUserId = String(sess.payload?.user_id || '').trim();
  if (!callerUserId) {
    return deny(res, 400, 'NO_USER_ID_IN_SESSION', {
      message:
        'This admin session does not carry a user_id (legacy env-master). factory_master cannot be verified from the DB; sign in with a DB-backed admin row and retry.',
    });
  }

  const caller = await prisma.authUser.findUnique({
    where: { id: callerUserId },
    select: { id: true, level: true, enabled: true, factoryMaster: true },
  });
  if (!caller || caller.enabled !== true) {
    return deny(res, 401, 'SESSION_USER_NOT_FOUND', {
      message: 'The session points to an auth_users row that is missing or disabled.',
    });
  }
  if (caller.level !== 'admin') {
    return deny(res, 403, 'ADMIN_REQUIRED', {
      message:
        'Session-payload admin claim does not match the DB row level; factory tools require a DB admin row.',
    });
  }
  if (caller.factoryMaster !== true) {
    return deny(res, 403, 'FACTORY_MASTER_REQUIRED', {
      message:
        'GET /api/membership/list requires factory_master=true on the caller\'s auth_users row.',
    });
  }

  const query = req.query || {};
  const targetUserId = String(pickFirst(query, 'user_id') || '').trim();
  if (!targetUserId) {
    return deny(res, 400, 'BAD_USER_ID', {
      message: 'GET /api/membership/list requires ?user_id=<auth_users.id>.',
    });
  }

  const eff = await getEffectiveMemberships(targetUserId);
  return res.status(200).json({ ok: true, ...eff });
}

function pickFirst(query, key) {
  const v = query?.[key];
  if (Array.isArray(v)) return v[0] != null ? String(v[0]) : null;
  if (v == null) return null;
  return String(v);
}
