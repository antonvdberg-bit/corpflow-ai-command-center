/**
 * IM-7.1 — operator-activity read API tests.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-7.1.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_OPERATOR_EVENT_TYPES,
  decodeOperatorActivityCursor,
  encodeOperatorActivityCursor,
  findUnexpectedQueryParam,
  handleOperatorActivityList,
  parseOperatorActivityQuery,
  projectOperatorActivityPayload,
  projectOperatorActivityRow,
} from '../lib/server/operator-activity-api.js';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

const CORE_HOST = 'core.corpflowai.com';
const TENANT_HOST = 'lux.corpflowai.com';
const ACTOR_ID = 'cmqhtirgb0000xf0ktu03alm6';
const CALLER_FM_ID = 'caller-fm-admin';

function fakeReq({
  method = 'GET',
  host = CORE_HOST,
  query = {},
  headers = {},
  cookies = '',
} = {}) {
  return {
    method,
    headers: { host, cookie: cookies, ...headers },
    query,
  };
}

function fakeRes() {
  const captured = { statusCode: null, body: null, headers: {} };
  return {
    captured,
    status(n) {
      captured.statusCode = n;
      return this;
    },
    json(body) {
      captured.body = body;
      return this;
    },
    setHeader(k, v) {
      captured.headers[k] = v;
    },
  };
}

function withCoreHostEnv(fn) {
  return async (...args) => {
    process.env.CORPFLOW_CORE_HOSTS = CORE_HOST;
    process.env.CORPFLOW_ROOT_DOMAIN = 'corpflowai.com';
    try {
      return await fn(...args);
    } finally {
      resetEnv();
    }
  };
}

function fakePrismaForOperatorActivity({ authUsers = [], events = [] } = {}) {
  return {
    authUser: {
      async findUnique({ where }) {
        return authUsers.find((u) => u.id === where.id) ?? null;
      },
    },
    automationEvent: {
      async findMany({ where, orderBy, take, select }) {
        let rows = events.slice();
        if (where.actorUserId) {
          rows = rows.filter((r) => r.actorUserId === where.actorUserId);
        }
        if (where.eventType) {
          if (typeof where.eventType === 'string') {
            rows = rows.filter((r) => r.eventType === where.eventType);
          } else if (where.eventType.in) {
            const set = new Set(where.eventType.in);
            rows = rows.filter((r) => set.has(r.eventType));
          }
        }
        if (where.occurredAt?.gte || where.occurredAt?.lte) {
          rows = rows.filter((r) => {
            const t = r.occurredAt.getTime();
            if (where.occurredAt.gte && t < where.occurredAt.gte.getTime()) return false;
            if (where.occurredAt.lte && t > where.occurredAt.lte.getTime()) return false;
            return true;
          });
        }
        if (where.AND?.length) {
          for (const clause of where.AND) {
            if (clause.OR) {
              rows = rows.filter((r) => {
                const t = r.occurredAt.getTime();
                const id = r.id;
                return clause.OR.some((part) => {
                  if (part.occurredAt?.lt) {
                    return t < part.occurredAt.lt.getTime();
                  }
                  if (part.occurredAt && part.id?.lt) {
                    const cursorAt = part.occurredAt;
                    return (
                      t === cursorAt.getTime() && id < part.id.lt
                    );
                  }
                  return false;
                });
              });
            }
          }
        }
        rows.sort((a, b) => {
          const at = b.occurredAt.getTime() - a.occurredAt.getTime();
          if (at !== 0) return at;
          return b.id.localeCompare(a.id);
        });
        const limited = take != null ? rows.slice(0, take) : rows;
        return limited.map((r) => {
          const out = {};
          for (const k of Object.keys(select || {})) {
            if (select[k]) out[k] = r[k];
          }
          return out;
        });
      },
    },
  };
}

async function signedAdminCookie(payload) {
  process.env.SOVEREIGN_SESSION_SECRET =
    process.env.SOVEREIGN_SESSION_SECRET || 'im-7-1-test-secret-' + 'x'.repeat(40);
  const { signSession } = await import('../lib/server/session.js');
  const signed = signSession(payload, { ttlSec: 3600 });
  assert.ok(signed.ok);
  return `corpflow_session=${signed.token}`;
}

// -------------------------------------------------------------
// Pure projection + query parsing
// -------------------------------------------------------------

test('projectOperatorActivityPayload — strips ip/ua and unknown keys', () => {
  const projected = projectOperatorActivityPayload('cmp.operator.switched_tenant', {
    from_tenant_id: null,
    to_tenant_id: 'luxe-maurice',
    source_host: 'core.corpflowai.com',
    timestamp: '2026-06-18T23:39:05.447Z',
    session_version: 2,
    ip: '203.0.113.1',
    ua: 'Mozilla/5.0',
    secret_token: 'must-not-leak',
  });
  assert.equal(projected.to_tenant_id, 'luxe-maurice');
  assert.equal(projected.source_host, 'core.corpflowai.com');
  assert.equal(projected.session_version, 2);
  assert.equal('ip' in projected, false);
  assert.equal('ua' in projected, false);
  assert.equal('secret_token' in projected, false);
});

test('parseOperatorActivityQuery — exact event_type allowlist only', () => {
  const now = new Date('2026-06-18T12:00:00.000Z');
  const bad = parseOperatorActivityQuery(
    { actor_user_id: ACTOR_ID, event_type: 'cmp.operator.%' },
    now,
  );
  assert.equal(bad.ok, false);
  assert.equal(bad.error, 'EVENT_TYPE_NOT_ALLOWED');

  const good = parseOperatorActivityQuery(
    { actor_user_id: ACTOR_ID, event_type: 'cmp.operator.switched_tenant' },
    now,
  );
  assert.equal(good.ok, true);
  assert.deepEqual(good.value.eventTypes, ['cmp.operator.switched_tenant']);
});

test('parseOperatorActivityQuery — LIMIT_TOO_HIGH hard rejection', () => {
  const now = new Date('2026-06-18T12:00:00.000Z');
  const parsed = parseOperatorActivityQuery({ actor_user_id: ACTOR_ID, limit: '500' }, now);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error, 'LIMIT_TOO_HIGH');
});

test('parseOperatorActivityQuery — LOOKBACK_TOO_OLD', () => {
  const now = new Date('2026-06-18T12:00:00.000Z');
  const parsed = parseOperatorActivityQuery(
    { actor_user_id: ACTOR_ID, since: '2025-01-01T00:00:00.000Z' },
    now,
  );
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error, 'LOOKBACK_TOO_OLD');
});

test('cursor encode/decode round-trip', () => {
  const at = new Date('2026-06-18T23:39:05.447Z');
  const id = 'cmqk55unb000ai904t5c6mw2l';
  const cursor = encodeOperatorActivityCursor(at, id);
  const decoded = decodeOperatorActivityCursor(cursor);
  assert.ok(decoded);
  assert.equal(decoded.id, id);
  assert.equal(decoded.occurredAt.toISOString(), at.toISOString());
});

test('findUnexpectedQueryParam — rejects user_id', () => {
  assert.equal(findUnexpectedQueryParam({ actor_user_id: ACTOR_ID, user_id: 'evil' }), 'user_id');
  assert.equal(findUnexpectedQueryParam({ actor_user_id: ACTOR_ID, __path: 'factory/operator-activity' }), null);
});

// -------------------------------------------------------------
// Handler gates (T1–T10)
// -------------------------------------------------------------

test(
  '[T1] POST → 405 METHOD_NOT_ALLOWED',
  withCoreHostEnv(async () => {
    const req = fakeReq({ method: 'POST', query: { actor_user_id: ACTOR_ID } });
    const res = fakeRes();
    await handleOperatorActivityList(req, res);
    assert.equal(res.captured.statusCode, 405);
    assert.equal(res.captured.body.error, 'METHOD_NOT_ALLOWED');
  }),
);

test(
  '[T2] Tenant host → 403 SWITCH_NOT_ALLOWED_FROM_HOST',
  withCoreHostEnv(async () => {
    const req = fakeReq({ host: TENANT_HOST, query: { actor_user_id: ACTOR_ID } });
    const res = fakeRes();
    await handleOperatorActivityList(req, res);
    assert.equal(res.captured.statusCode, 403);
    assert.equal(res.captured.body.error, 'SWITCH_NOT_ALLOWED_FROM_HOST');
  }),
);

test(
  '[T3] No session → 401 UNAUTHENTICATED',
  withCoreHostEnv(async () => {
    const req = fakeReq({ query: { actor_user_id: ACTOR_ID } });
    const res = fakeRes();
    await handleOperatorActivityList(req, res);
    assert.equal(res.captured.statusCode, 401);
    assert.equal(res.captured.body.error, 'UNAUTHENTICATED');
  }),
);

test(
  '[T4] Tenant session → 403 ADMIN_REQUIRED',
  withCoreHostEnv(async () => {
    const cookie = await signedAdminCookie({
      typ: 'tenant',
      user_id: 'tenant-user-1',
      tenant_id: 'luxe-maurice',
    });
    const req = fakeReq({ cookies: cookie, query: { actor_user_id: ACTOR_ID } });
    const res = fakeRes();
    await handleOperatorActivityList(req, res);
    assert.equal(res.captured.statusCode, 403);
    assert.equal(res.captured.body.error, 'ADMIN_REQUIRED');
  }),
);

test(
  '[T5] Legacy env-master admin without user_id → 400 NO_USER_ID_IN_SESSION',
  withCoreHostEnv(async () => {
    const cookie = await signedAdminCookie({ typ: 'admin', username: 'env-admin' });
    const req = fakeReq({ cookies: cookie, query: { actor_user_id: ACTOR_ID } });
    const res = fakeRes();
    await handleOperatorActivityList(req, res);
    assert.equal(res.captured.statusCode, 400);
    assert.equal(res.captured.body.error, 'NO_USER_ID_IN_SESSION');
  }),
);

test(
  '[T6] DB-backed admin without factory_master → 403 FACTORY_MASTER_REQUIRED',
  withCoreHostEnv(async () => {
    const cookie = await signedAdminCookie({ typ: 'admin', user_id: 'admin-no-fm' });
    const prisma = fakePrismaForOperatorActivity({
      authUsers: [
        { id: 'admin-no-fm', level: 'admin', enabled: true, factoryMaster: false },
      ],
    });
    const req = fakeReq({ cookies: cookie, query: { actor_user_id: ACTOR_ID } });
    const res = fakeRes();
    await handleOperatorActivityList(req, res, { prismaClient: prisma });
    assert.equal(res.captured.statusCode, 403);
    assert.equal(res.captured.body.error, 'FACTORY_MASTER_REQUIRED');
  }),
);

test(
  '[T7] Unexpected user_id query param → 400 UNEXPECTED_QUERY_PARAM',
  withCoreHostEnv(async () => {
    const cookie = await signedAdminCookie({ typ: 'admin', user_id: CALLER_FM_ID });
    const prisma = fakePrismaForOperatorActivity({
      authUsers: [
        { id: CALLER_FM_ID, level: 'admin', enabled: true, factoryMaster: true },
      ],
    });
    const req = fakeReq({
      cookies: cookie,
      query: { actor_user_id: ACTOR_ID, user_id: ACTOR_ID },
    });
    const res = fakeRes();
    await handleOperatorActivityList(req, res, { prismaClient: prisma });
    assert.equal(res.captured.statusCode, 400);
    assert.equal(res.captured.body.error, 'UNEXPECTED_QUERY_PARAM');
  }),
);

test(
  '[T8] Unknown event_type → 400 EVENT_TYPE_NOT_ALLOWED',
  withCoreHostEnv(async () => {
    const cookie = await signedAdminCookie({ typ: 'admin', user_id: CALLER_FM_ID });
    const prisma = fakePrismaForOperatorActivity({
      authUsers: [
        { id: CALLER_FM_ID, level: 'admin', enabled: true, factoryMaster: true },
      ],
    });
    const req = fakeReq({
      cookies: cookie,
      query: { actor_user_id: ACTOR_ID, event_type: 'cmp.ingest.foo' },
    });
    const res = fakeRes();
    await handleOperatorActivityList(req, res, { prismaClient: prisma });
    assert.equal(res.captured.statusCode, 400);
    assert.equal(res.captured.body.error, 'EVENT_TYPE_NOT_ALLOWED');
  }),
);

test(
  '[T9] limit=500 → 400 LIMIT_TOO_HIGH',
  withCoreHostEnv(async () => {
    const cookie = await signedAdminCookie({ typ: 'admin', user_id: CALLER_FM_ID });
    const prisma = fakePrismaForOperatorActivity({
      authUsers: [
        { id: CALLER_FM_ID, level: 'admin', enabled: true, factoryMaster: true },
      ],
    });
    const req = fakeReq({
      cookies: cookie,
      query: { actor_user_id: ACTOR_ID, limit: '500' },
    });
    const res = fakeRes();
    await handleOperatorActivityList(req, res, { prismaClient: prisma });
    assert.equal(res.captured.statusCode, 400);
    assert.equal(res.captured.body.error, 'LIMIT_TOO_HIGH');
  }),
);

test(
  '[T10] since older than 90 days → 400 LOOKBACK_TOO_OLD',
  withCoreHostEnv(async () => {
    const cookie = await signedAdminCookie({ typ: 'admin', user_id: CALLER_FM_ID });
    const prisma = fakePrismaForOperatorActivity({
      authUsers: [
        { id: CALLER_FM_ID, level: 'admin', enabled: true, factoryMaster: true },
      ],
    });
    const req = fakeReq({
      cookies: cookie,
      query: { actor_user_id: ACTOR_ID, since: '2025-01-01T00:00:00.000Z' },
    });
    const res = fakeRes();
    await handleOperatorActivityList(req, res, { prismaClient: prisma });
    assert.equal(res.captured.statusCode, 400);
    assert.equal(res.captured.body.error, 'LOOKBACK_TOO_OLD');
  }),
);

test(
  '[T11] MASTER_ADMIN_KEY alone without session → 401',
  withCoreHostEnv(async () => {
    process.env.MASTER_ADMIN_KEY = 'test-master-key-only';
    const req = fakeReq({
      query: { actor_user_id: ACTOR_ID },
      headers: { authorization: 'Bearer test-master-key-only' },
    });
    const res = fakeRes();
    await handleOperatorActivityList(req, res);
    assert.equal(res.captured.statusCode, 401);
    assert.equal(res.captured.body.error, 'UNAUTHENTICATED');
  }),
);

test(
  '[T12] Factory master + valid actor_user_id → 200 with projected rows and cursor',
  withCoreHostEnv(async () => {
    const now = new Date('2026-06-18T23:39:05.447Z');
    const older = new Date('2026-06-17T12:00:00.000Z');
    const prisma = fakePrismaForOperatorActivity({
      authUsers: [
        { id: CALLER_FM_ID, level: 'admin', enabled: true, factoryMaster: true },
      ],
      events: [
        {
          id: 'evt_newer',
          occurredAt: now,
          tenantId: null,
          tenantScope: 'global',
          source: 'membership/switch-leave',
          eventType: 'cmp.operator.switched_tenant',
          correlationId: null,
          riskTier: 'low',
          status: 'accepted',
          actorUserId: ACTOR_ID,
          payload: {
            from_tenant_id: null,
            to_tenant_id: 'luxe-maurice',
            source_host: 'core.corpflowai.com',
            timestamp: now.toISOString(),
            session_version: 2,
            ip: '203.0.113.1',
            ua: 'secret-ua',
          },
        },
        {
          id: 'evt_older',
          occurredAt: older,
          tenantId: null,
          tenantScope: 'global',
          source: 'membership/switch-leave',
          eventType: 'cmp.operator.left_tenant',
          correlationId: null,
          riskTier: 'low',
          status: 'accepted',
          actorUserId: ACTOR_ID,
          payload: {
            from_tenant_id: 'luxe-maurice',
            to_tenant_id: null,
            source_host: 'core.corpflowai.com',
            timestamp: older.toISOString(),
            session_version: 3,
          },
        },
      ],
    });
    const cookie = await signedAdminCookie({ typ: 'admin', user_id: CALLER_FM_ID });
    const req = fakeReq({
      cookies: cookie,
      query: { actor_user_id: ACTOR_ID, limit: '1' },
    });
    const res = fakeRes();
    await handleOperatorActivityList(req, res, { prismaClient: prisma });
    assert.equal(res.captured.statusCode, 200);
    assert.equal(res.captured.body.ok, true);
    assert.equal(res.captured.body.count, 1);
    assert.equal(res.captured.body.has_more, true);
    assert.ok(res.captured.body.next_cursor);

    const row = res.captured.body.events[0];
    assert.equal(row.event_type, 'cmp.operator.switched_tenant');
    assert.equal(row.payload.to_tenant_id, 'luxe-maurice');
    assert.equal(row.payload.source_host, 'core.corpflowai.com');
    assert.equal('ip' in row.payload, false);
    assert.equal('ua' in row.payload, false);
    assert.equal('idempotency_key' in row, false);

    const req2 = fakeReq({
      cookies: cookie,
      query: {
        actor_user_id: ACTOR_ID,
        limit: '1',
        cursor: res.captured.body.next_cursor,
      },
    });
    const res2 = fakeRes();
    await handleOperatorActivityList(req2, res2, { prismaClient: prisma });
    assert.equal(res2.captured.statusCode, 200);
    assert.equal(res2.captured.body.events[0].event_type, 'cmp.operator.left_tenant');
  }),
);

test('default event filter includes all six IM-7.1 event types', () => {
  const now = new Date('2026-06-18T12:00:00.000Z');
  const parsed = parseOperatorActivityQuery({ actor_user_id: ACTOR_ID }, now);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value.eventTypes, [...ALLOWED_OPERATOR_EVENT_TYPES]);
});

test('projectOperatorActivityRow — serializes occurred_at and omits forbidden payload keys', () => {
  const at = new Date('2026-06-18T23:39:05.447Z');
  const row = projectOperatorActivityRow({
    id: 'evt_1',
    occurredAt: at,
    tenantId: null,
    tenantScope: 'global',
    source: 'membership/switch-leave',
    eventType: 'cmp.operator.switched_tenant',
    correlationId: 'corr-1',
    riskTier: 'low',
    status: 'accepted',
    actorUserId: ACTOR_ID,
    payload: {
      to_tenant_id: 'luxe-maurice',
      source_host: 'core.corpflowai.com',
      ip: '10.0.0.1',
      ua: 'nope',
    },
  });
  assert.equal(row.occurred_at, at.toISOString());
  assert.equal(row.correlation_id, 'corr-1');
  assert.equal('ip' in row.payload, false);
  assert.equal('ua' in row.payload, false);
});
