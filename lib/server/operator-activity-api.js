/**
 * IM-7.1 — factory-master operator-activity read API (Core-only).
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §7.5, §10 IM-7.1.
 *
 * GET /api/factory/operator-activity — list allowlisted operator audit rows from
 * automation_events by actor_user_id. Stricter than GET /api/automation/events:
 * DB-backed factory_master session only; projected payload; no raw payload_json.
 */
import { PrismaClient } from '@prisma/client';

import { getSessionFromRequest } from './session.js';
import { requireCoreHost } from './host-policy.js';

const defaultPrisma = new PrismaClient();

/** @type {readonly string[]} */
export const ALLOWED_OPERATOR_EVENT_TYPES = Object.freeze([
  'cmp.operator.switched_tenant',
  'cmp.operator.left_tenant',
  'cmp.membership.granted',
  'cmp.membership.revoked',
  'cmp.membership.enabled_toggled',
  'cmp.auth_user.factory_master_set',
]);

/** @type {readonly string[]} */
export const ALLOWED_QUERY_PARAMS = Object.freeze([
  'actor_user_id',
  'since',
  'until',
  'event_type',
  'limit',
  'cursor',
]);

/** Vercel rewrite may leave __path on req.query; ignore for tampering checks. */
const INTERNAL_QUERY_IGNORE = new Set(['__path']);

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const DEFAULT_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_PROJECTED_STRING_LEN = 256;

/** @type {Record<string, readonly string[]>} */
export const PAYLOAD_PROJECTION_KEYS_BY_EVENT_TYPE = Object.freeze({
  'cmp.operator.switched_tenant': [
    'from_tenant_id',
    'to_tenant_id',
    'source_host',
    'timestamp',
    'session_version',
  ],
  'cmp.operator.left_tenant': [
    'from_tenant_id',
    'to_tenant_id',
    'source_host',
    'timestamp',
    'session_version',
  ],
  'cmp.membership.granted': [
    'target_user_id',
    'tenant_id',
    'role',
    'capability',
    'source_host',
    'timestamp',
  ],
  'cmp.membership.revoked': ['target_user_id', 'tenant_id', 'source_host', 'timestamp'],
  'cmp.membership.enabled_toggled': [
    'target_user_id',
    'tenant_id',
    'enabled',
    'source_host',
    'timestamp',
  ],
  'cmp.auth_user.factory_master_set': [
    'target_user_id',
    'factory_master',
    'source_host',
    'timestamp',
  ],
});

const FORBIDDEN_PAYLOAD_KEYS = new Set(['ip', 'ua']);

function deny(res, status, error, extra = {}) {
  return res.status(status).json({ ok: false, error, ...extra });
}

function pickFirst(query, key) {
  const v = query?.[key];
  if (Array.isArray(v)) return v[0] != null ? String(v[0]) : null;
  if (v == null) return null;
  return String(v);
}

/**
 * @param {Record<string, unknown>} query
 * @returns {string | null}
 */
export function findUnexpectedQueryParam(query) {
  if (!query || typeof query !== 'object') return null;
  for (const key of Object.keys(query)) {
    if (INTERNAL_QUERY_IGNORE.has(key)) continue;
    if (!ALLOWED_QUERY_PARAMS.includes(key)) return key;
  }
  return null;
}

/**
 * @param {string} eventType
 * @param {unknown} rawPayload
 * @returns {Record<string, unknown>}
 */
export function projectOperatorActivityPayload(eventType, rawPayload) {
  const allowed = PAYLOAD_PROJECTION_KEYS_BY_EVENT_TYPE[eventType];
  if (!allowed || !rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {};
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of allowed) {
    if (FORBIDDEN_PAYLOAD_KEYS.has(key)) continue;
    if (!(key in rawPayload)) continue;
    const val = rawPayload[key];
    if (val == null) {
      out[key] = null;
      continue;
    }
    if (typeof val === 'string') {
      out[key] = val.slice(0, MAX_PROJECTED_STRING_LEN);
      continue;
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      out[key] = val;
    }
  }
  return out;
}

/**
 * @param {Date} occurredAt
 * @param {string} id
 * @returns {string}
 */
export function encodeOperatorActivityCursor(occurredAt, id) {
  const payload = {
    occurred_at: occurredAt.toISOString(),
    id: String(id),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/**
 * @param {string} cursor
 * @returns {{ occurredAt: Date, id: string } | null}
 */
export function decodeOperatorActivityCursor(cursor) {
  try {
    const raw = Buffer.from(String(cursor), 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    const occurredAt = new Date(parsed?.occurred_at);
    const id = parsed?.id != null ? String(parsed.id).trim() : '';
    if (!id || Number.isNaN(occurredAt.getTime())) return null;
    return { occurredAt, id };
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} query
 * @param {Date} now
 * @returns {{ ok: true, value: {
 *   actorUserId: string,
 *   since: Date,
 *   until: Date,
 *   eventTypes: string[],
 *   limit: number,
 *   cursor: { occurredAt: Date, id: string } | null,
 * } } | { ok: false, status: number, error: string, message?: string }}
 */
export function parseOperatorActivityQuery(query, now = new Date()) {
  const actorUserId = String(pickFirst(query, 'actor_user_id') || '').trim();
  if (!actorUserId) {
    return {
      ok: false,
      status: 400,
      error: 'ACTOR_USER_ID_REQUIRED',
      message: 'GET /api/factory/operator-activity requires ?actor_user_id=<auth_users.id>.',
    };
  }

  const eventTypeRaw = pickFirst(query, 'event_type');
  let eventTypes = [...ALLOWED_OPERATOR_EVENT_TYPES];
  if (eventTypeRaw != null && String(eventTypeRaw).trim() !== '') {
    const exact = String(eventTypeRaw).trim();
    if (!ALLOWED_OPERATOR_EVENT_TYPES.includes(exact)) {
      return {
        ok: false,
        status: 400,
        error: 'EVENT_TYPE_NOT_ALLOWED',
        message: `event_type must be one of the IM-7.1 allowlisted values (exact match only).`,
      };
    }
    eventTypes = [exact];
  }

  const untilRaw = pickFirst(query, 'until');
  let until = now;
  if (untilRaw != null && String(untilRaw).trim() !== '') {
    until = new Date(String(untilRaw).trim());
    if (Number.isNaN(until.getTime())) {
      return { ok: false, status: 400, error: 'BAD_DATE', message: 'until must be a valid ISO 8601 timestamp.' };
    }
  }

  const sinceRaw = pickFirst(query, 'since');
  let since = new Date(now.getTime() - DEFAULT_LOOKBACK_MS);
  if (sinceRaw != null && String(sinceRaw).trim() !== '') {
    since = new Date(String(sinceRaw).trim());
    if (Number.isNaN(since.getTime())) {
      return { ok: false, status: 400, error: 'BAD_DATE', message: 'since must be a valid ISO 8601 timestamp.' };
    }
  }

  const oldestAllowed = new Date(now.getTime() - MAX_LOOKBACK_MS);
  if (since.getTime() < oldestAllowed.getTime()) {
    return {
      ok: false,
      status: 400,
      error: 'LOOKBACK_TOO_OLD',
      message: 'since must be within the last 90 days.',
    };
  }

  if (since.getTime() > until.getTime()) {
    return {
      ok: false,
      status: 400,
      error: 'BAD_TIME_RANGE',
      message: 'since must be earlier than or equal to until.',
    };
  }

  const limitRaw = pickFirst(query, 'limit');
  let limit = DEFAULT_LIMIT;
  if (limitRaw != null && String(limitRaw).trim() !== '') {
    const parsed = parseInt(String(limitRaw).trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return { ok: false, status: 400, error: 'BAD_LIMIT', message: 'limit must be a positive integer.' };
    }
    if (parsed > MAX_LIMIT) {
      return {
        ok: false,
        status: 400,
        error: 'LIMIT_TOO_HIGH',
        message: `limit must not exceed ${MAX_LIMIT}.`,
      };
    }
    limit = parsed;
  }

  const cursorRaw = pickFirst(query, 'cursor');
  let cursor = null;
  if (cursorRaw != null && String(cursorRaw).trim() !== '') {
    cursor = decodeOperatorActivityCursor(String(cursorRaw).trim());
    if (!cursor) {
      return { ok: false, status: 400, error: 'BAD_CURSOR', message: 'cursor is invalid or malformed.' };
    }
  }

  return {
    ok: true,
    value: { actorUserId, since, until, eventTypes, limit, cursor },
  };
}

/**
 * @param {import('@prisma/client').AutomationEvent} row
 * @returns {Record<string, unknown>}
 */
export function projectOperatorActivityRow(row) {
  const payload =
    row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
      ? row.payload
      : {};
  const projected = projectOperatorActivityPayload(row.eventType, payload);
  /** @type {Record<string, unknown>} */
  const out = {
    id: row.id,
    occurred_at: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : row.occurredAt,
    event_type: row.eventType,
    source: row.source ?? null,
    tenant_id: row.tenantId ?? null,
    tenant_scope: row.tenantScope,
    actor_user_id: row.actorUserId ?? null,
    risk_tier: row.riskTier,
    status: row.status,
    payload: projected,
  };
  if (row.correlationId) {
    out.correlation_id = row.correlationId;
  }
  return out;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse & { status: (n: number) => any, json: (b: any) => any }} res
 * @param {{ prismaClient?: import('@prisma/client').PrismaClient }} [opts]
 */
export async function handleOperatorActivityList(req, res, opts = {}) {
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
      message: 'GET /api/factory/operator-activity requires an admin-level session.',
    });
  }

  const callerUserId = String(sess.payload?.user_id || '').trim();
  if (!callerUserId) {
    return deny(res, 400, 'NO_USER_ID_IN_SESSION', {
      message:
        'This admin session does not carry a user_id (legacy env-master). factory_master cannot be verified from the DB; sign in with a DB-backed admin row and retry.',
    });
  }

  const prisma = opts.prismaClient || defaultPrisma;
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
        "GET /api/factory/operator-activity requires factory_master=true on the caller's auth_users row.",
    });
  }

  const query = req.query || {};
  const unexpected = findUnexpectedQueryParam(query);
  if (unexpected) {
    return deny(res, 400, 'UNEXPECTED_QUERY_PARAM', {
      message: `Unexpected query parameter "${unexpected}". Use actor_user_id, since, until, event_type, limit, or cursor only.`,
      param: unexpected,
    });
  }

  const parsed = parseOperatorActivityQuery(query);
  if (!parsed.ok) {
    return deny(res, parsed.status, parsed.error, parsed.message ? { message: parsed.message } : {});
  }

  const { actorUserId, since, until, eventTypes, limit, cursor } = parsed.value;

  /** @type {import('@prisma/client').Prisma.AutomationEventWhereInput} */
  const where = {
    actorUserId,
    occurredAt: { gte: since, lte: until },
    eventType: eventTypes.length === 1 ? eventTypes[0] : { in: [...eventTypes] },
  };

  if (cursor) {
    where.AND = [
      {
        OR: [
          { occurredAt: { lt: cursor.occurredAt } },
          { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
        ],
      },
    ];
  }

  try {
    const rows = await prisma.automationEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        occurredAt: true,
        tenantId: true,
        tenantScope: true,
        source: true,
        eventType: true,
        correlationId: true,
        riskTier: true,
        status: true,
        actorUserId: true,
        payload: true,
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const events = page.map(projectOperatorActivityRow);
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last ? encodeOperatorActivityCursor(last.occurredAt, last.id) : null;

    return res.status(200).json({
      ok: true,
      actor_user_id: actorUserId,
      count: events.length,
      limit,
      has_more: hasMore,
      next_cursor: nextCursor,
      events,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: 'OPERATOR_ACTIVITY_QUERY_FAILED', detail: msg });
  }
}
