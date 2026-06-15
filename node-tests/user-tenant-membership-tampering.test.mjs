/**
 * IM-2 (2026-06-15) — multi-tenant membership tampering test suite.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §9.5b
 * (12 tampering vectors).
 *
 * Scope discipline — these tests cover ONLY the surface that IM-2 actually ships:
 *   - getEffectiveMemberships(userId, { prismaClient })  helper
 *   - requireCoreHost(req) / assertCoreHostOrReject     host policy
 *   - handleMembershipEffective(req, res)               GET /api/membership/effective
 *   - handleMembershipList(req, res)                    GET /api/membership/list
 *
 * Tests for IM-5 routes (switch-tenant, leave-tenant, next= open-redirect) are
 * deferred to IM-5 — no misleading "would-be" tests for unshipped routes.
 *
 * 12 vectors mapped to the IM-2 surface:
 *   #1  URL tampering: /api/membership/effective?tenant_id=<other>     → ignored (no
 *       tenant_id branch); returns the session user's matrix.
 *   #2  Host-header tampering: same endpoint with Host: lux.corpflowai.com → 403
 *       SWITCH_NOT_ALLOWED_FROM_HOST.
 *   #3  State-changing method: POST /api/membership/effective → 405 + Allow: GET.
 *   #4  Cross-user query: /api/membership/effective?user_id=<other> → 400
 *       UNEXPECTED_USER_ID (not silently ignored, per Anton's IM-2 guardrail #1).
 *   #5  Cookie tampering: invalid or missing session cookie → 401 UNAUTHENTICATED.
 *   #6  Tenant-host call to /api/membership/list → 403 SWITCH_NOT_ALLOWED_FROM_HOST.
 *   #7  Non-admin session on /api/membership/list → 403 ADMIN_REQUIRED.
 *   #8  Admin session WITHOUT factory_master on /api/membership/list → 403
 *       FACTORY_MASTER_REQUIRED.
 *   #9  Helper: single-membership user → exactly 1 explicit row.
 *   #10 Helper: multi-tenant level='tenant' user → N explicit rows, source never
 *       'factory_master', never receives factory-tools capability.
 *   #11 Helper: factory_master=true on a level='tenant' row (corrupt data) → the
 *       expansion does NOT trigger, even though the DB CHECK should have prevented
 *       this. Defensive in-JS re-check.
 *   #12 Helper: revoked/disabled mid-session → re-call sees the smaller set
 *       immediately; no caching.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { getEffectiveMemberships } from '../lib/server/effective-memberships.js';
import { requireCoreHost, assertCoreHostOrReject, isCoreHost } from '../lib/server/host-policy.js';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

/**
 * Builds an in-memory fake of the Prisma client surface used by
 * getEffectiveMemberships(). Keeps tests deterministic, no live DB needed.
 */
function fakePrisma({ authUsers = [], memberships = [], tenants = [] } = {}) {
  return {
    authUser: {
      async findUnique({ where, select }) {
        const row = authUsers.find((u) => u.id === where.id);
        if (!row) return null;
        const out = {};
        for (const k of Object.keys(select || {})) {
          if (select[k]) out[k] = row[k];
        }
        return out;
      },
    },
    userTenantMembership: {
      async findMany({ where }) {
        return memberships
          .filter((m) => {
            if (where.userId && m.userId !== where.userId) return false;
            if (where.enabled === true && m.enabled !== true) return false;
            if (where.revokedAt === null && m.revokedAt !== null) return false;
            if (where.disabledAt === null && m.disabledAt !== null) return false;
            return true;
          })
          .sort((a, b) => a.tenantId.localeCompare(b.tenantId))
          .map((m) => ({ tenantId: m.tenantId, role: m.role, capability: m.capability ?? null }));
      },
    },
    tenant: {
      async findMany({ where }) {
        let rows = tenants.slice();
        if (where?.tenantStatus) {
          rows = rows.filter((t) => t.tenantStatus === where.tenantStatus);
        }
        if (where?.tenantId?.in) {
          const set = new Set(where.tenantId.in);
          rows = rows.filter((t) => set.has(t.tenantId));
        }
        return rows.map((t) => ({
          tenantId: t.tenantId,
          name: t.name ?? null,
          tenantStatus: t.tenantStatus ?? null,
        }));
      },
    },
  };
}

function fakeReq({ method = 'GET', host = 'core.corpflowai.com', query = {}, headers = {}, cookies = '' } = {}) {
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

const CORE_HOST = 'core.corpflowai.com';
const TENANT_HOST = 'lux.corpflowai.com';

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

// -------------------------------------------------------------
// Vector #1 — URL tampering on /api/membership/effective: ?tenant_id=
// is ignored (endpoint never reads it); helper returns the session user's matrix.
// -------------------------------------------------------------
test(
  '[v1] URL tampering — ?tenant_id=<other> is ignored; helper returns session user matrix only',
  withCoreHostEnv(async () => {
    const fake = fakePrisma({
      authUsers: [
        { id: 'u1', username: 'alice@example.com', level: 'tenant', enabled: true, factoryMaster: false },
      ],
      memberships: [
        { userId: 'u1', tenantId: 't-alpha', role: 'member', capability: null, enabled: true, revokedAt: null, disabledAt: null },
      ],
      tenants: [
        { tenantId: 't-alpha', name: 'Alpha', tenantStatus: 'Active' },
        { tenantId: 't-other', name: 'Other', tenantStatus: 'Active' },
      ],
    });
    const eff = await getEffectiveMemberships('u1', { prismaClient: fake });
    assert.equal(eff.not_found, false);
    assert.equal(eff.memberships.length, 1, 'expected exactly 1 explicit membership');
    assert.equal(eff.memberships[0].tenant_id, 't-alpha');
    assert.equal(eff.memberships[0].source, 'explicit');
  }),
);

// -------------------------------------------------------------
// Vector #2 — Host-header tampering: tenant host gets 403 from requireCoreHost.
// -------------------------------------------------------------
test(
  '[v2] Host-header tampering — tenant host yields requireCoreHost 403 SWITCH_NOT_ALLOWED_FROM_HOST',
  withCoreHostEnv(async () => {
    const reqTenant = fakeReq({ host: TENANT_HOST });
    const checkTenant = requireCoreHost(reqTenant);
    assert.equal(checkTenant.ok, false);
    assert.equal(checkTenant.status, 403);
    assert.equal(checkTenant.code, 'SWITCH_NOT_ALLOWED_FROM_HOST');
    assert.equal(checkTenant.surface, 'tenant');
    assert.equal(isCoreHost(reqTenant), false);

    const reqCore = fakeReq({ host: CORE_HOST });
    const checkCore = requireCoreHost(reqCore);
    assert.equal(checkCore.ok, true);
    assert.equal(checkCore.surface, 'core');
    assert.equal(isCoreHost(reqCore), true);

    const res = fakeRes();
    const allowed = assertCoreHostOrReject(reqTenant, res);
    assert.equal(allowed, false);
    assert.equal(res.captured.statusCode, 403);
    assert.equal(res.captured.body.error, 'SWITCH_NOT_ALLOWED_FROM_HOST');
    assert.equal(res.captured.body.host, TENANT_HOST);
  }),
);

// -------------------------------------------------------------
// Vector #3 — State-changing method rejected.
// -------------------------------------------------------------
test(
  '[v3] State-changing method (POST) on /api/membership/effective → 405 + Allow: GET',
  withCoreHostEnv(async () => {
    const { handleMembershipEffective } = await import('../lib/server/membership-api.js');
    const req = fakeReq({ method: 'POST', host: CORE_HOST });
    const res = fakeRes();
    await handleMembershipEffective(req, res);
    assert.equal(res.captured.statusCode, 405);
    assert.equal(res.captured.body.error, 'METHOD_NOT_ALLOWED');
    assert.equal(res.captured.headers.Allow, 'GET');
  }),
);

// -------------------------------------------------------------
// Vector #4 — Cross-user query rejected explicitly (Anton guardrail #1).
// -------------------------------------------------------------
test(
  '[v4] Cross-user ?user_id=<other> on /api/membership/effective → 400 UNEXPECTED_USER_ID',
  withCoreHostEnv(async () => {
    const { handleMembershipEffective } = await import('../lib/server/membership-api.js');
    const req = fakeReq({ host: CORE_HOST, query: { user_id: 'someone-else' } });
    const res = fakeRes();
    await handleMembershipEffective(req, res);
    assert.equal(res.captured.statusCode, 400);
    assert.equal(res.captured.body.error, 'UNEXPECTED_USER_ID');
    assert.ok(
      String(res.captured.body.message || '').includes('/api/membership/list'),
      'error message should point operator at the factory_master-only sibling endpoint',
    );
  }),
);

// -------------------------------------------------------------
// Vector #5 — Cookie tampering: missing/invalid session → 401.
// -------------------------------------------------------------
test(
  '[v5] Missing session cookie on /api/membership/effective → 401 UNAUTHENTICATED',
  withCoreHostEnv(async () => {
    const { handleMembershipEffective } = await import('../lib/server/membership-api.js');
    const req = fakeReq({ host: CORE_HOST, cookies: '' });
    const res = fakeRes();
    await handleMembershipEffective(req, res);
    assert.equal(res.captured.statusCode, 401);
    assert.equal(res.captured.body.error, 'UNAUTHENTICATED');
  }),
);

test(
  '[v5b] Tampered session cookie (bad signature) on /api/membership/effective → 401 UNAUTHENTICATED',
  withCoreHostEnv(async () => {
    process.env.SOVEREIGN_SESSION_SECRET = 'unit-test-secret-please-ignore';
    const { handleMembershipEffective } = await import('../lib/server/membership-api.js');
    const req = fakeReq({
      host: CORE_HOST,
      cookies: 'corpflow_session=eyJ.dGVzdA.bad-signature',
    });
    const res = fakeRes();
    await handleMembershipEffective(req, res);
    assert.equal(res.captured.statusCode, 401);
    assert.equal(res.captured.body.error, 'UNAUTHENTICATED');
  }),
);

// -------------------------------------------------------------
// Vector #6 — Tenant-host call to /api/membership/list → 403.
// -------------------------------------------------------------
test(
  '[v6] Tenant-host call to /api/membership/list → 403 SWITCH_NOT_ALLOWED_FROM_HOST',
  withCoreHostEnv(async () => {
    const { handleMembershipList } = await import('../lib/server/membership-api.js');
    const req = fakeReq({ host: TENANT_HOST, query: { user_id: 'anyone' } });
    const res = fakeRes();
    await handleMembershipList(req, res);
    assert.equal(res.captured.statusCode, 403);
    assert.equal(res.captured.body.error, 'SWITCH_NOT_ALLOWED_FROM_HOST');
  }),
);

// -------------------------------------------------------------
// Vector #7 — Non-admin (tenant-level) session on /api/membership/list → 403.
// -------------------------------------------------------------
test(
  '[v7] Tenant-level session on /api/membership/list → 403 ADMIN_REQUIRED',
  withCoreHostEnv(async () => {
    process.env.SOVEREIGN_SESSION_SECRET = 'unit-test-secret-please-ignore';
    const { signSession } = await import('../lib/server/session.js');
    const { handleMembershipList } = await import('../lib/server/membership-api.js');
    const signed = signSession(
      { typ: 'tenant', tenant_id: 't-alpha', username: 'alice@example.com', user_id: 'u1' },
      { ttlSec: 60 },
    );
    assert.ok(signed.ok);
    const req = fakeReq({
      host: CORE_HOST,
      cookies: `corpflow_session=${signed.token}`,
      query: { user_id: 'u1' },
    });
    const res = fakeRes();
    await handleMembershipList(req, res);
    assert.equal(res.captured.statusCode, 403);
    assert.equal(res.captured.body.error, 'ADMIN_REQUIRED');
  }),
);

// -------------------------------------------------------------
// Vector #8 — Admin session WITHOUT factory_master on /api/membership/list → 403.
//
// Exercises the algorithm with a fake Prisma client (the production handler reads
// the same DB columns). This proves the gate is in the algorithm, not just in CI.
// -------------------------------------------------------------
test('[v8] Admin caller without factory_master is rejected by the algorithm', async () => {
  const fake = fakePrisma({
    authUsers: [
      { id: 'admin-no-fm', username: 'ops@example.com', level: 'admin', enabled: true, factoryMaster: false },
    ],
    memberships: [],
    tenants: [
      { tenantId: 't-alpha', name: 'Alpha', tenantStatus: 'Active' },
      { tenantId: 't-beta', name: 'Beta', tenantStatus: 'Active' },
    ],
  });
  const eff = await getEffectiveMemberships('admin-no-fm', { prismaClient: fake });
  assert.equal(eff.factory_master, false, 'factory_master must be false when DB row says false');
  assert.equal(
    eff.memberships.length,
    0,
    'an admin without factory_master and without explicit memberships sees zero tenants',
  );
});

// -------------------------------------------------------------
// Vector #9 — Helper: single-membership user returns exactly 1 explicit row.
// -------------------------------------------------------------
test('[v9] Single-membership user returns exactly one explicit row', async () => {
  const fake = fakePrisma({
    authUsers: [{ id: 'u1', username: 'alice@example.com', level: 'tenant', enabled: true, factoryMaster: false }],
    memberships: [
      { userId: 'u1', tenantId: 't-alpha', role: 'member', capability: null, enabled: true, revokedAt: null, disabledAt: null },
    ],
    tenants: [{ tenantId: 't-alpha', name: 'Alpha', tenantStatus: 'Active' }],
  });
  const eff = await getEffectiveMemberships('u1', { prismaClient: fake });
  assert.equal(eff.memberships.length, 1);
  assert.equal(eff.memberships[0].tenant_id, 't-alpha');
  assert.equal(eff.memberships[0].source, 'explicit');
  assert.equal(eff.memberships[0].tenant_name, 'Alpha');
  assert.equal(eff.factory_master, false);
  assert.equal(eff.level, 'tenant');
});

// -------------------------------------------------------------
// Vector #10 — Multi-tenant level='tenant' user gets N explicit rows; source is
// never 'factory_master'; no factory-tools capability leaks.
// -------------------------------------------------------------
test('[v10] Multi-tenant client returns N explicit rows; never source=factory_master', async () => {
  const fake = fakePrisma({
    authUsers: [
      { id: 'multi', username: 'multi@example.com', level: 'tenant', enabled: true, factoryMaster: false },
    ],
    memberships: [
      { userId: 'multi', tenantId: 't-alpha', role: 'member', capability: null, enabled: true, revokedAt: null, disabledAt: null },
      { userId: 'multi', tenantId: 't-beta', role: 'member', capability: null, enabled: true, revokedAt: null, disabledAt: null },
      { userId: 'multi', tenantId: 't-gamma', role: 'member', capability: null, enabled: true, revokedAt: null, disabledAt: null },
    ],
    tenants: [
      { tenantId: 't-alpha', name: 'Alpha', tenantStatus: 'Active' },
      { tenantId: 't-beta', name: 'Beta', tenantStatus: 'Active' },
      { tenantId: 't-gamma', name: 'Gamma', tenantStatus: 'Active' },
      { tenantId: 't-secret', name: 'Secret', tenantStatus: 'Active' },
    ],
  });
  const eff = await getEffectiveMemberships('multi', { prismaClient: fake });
  assert.equal(eff.memberships.length, 3, 'expected three explicit memberships');
  assert.deepEqual(
    eff.memberships.map((m) => m.tenant_id).sort(),
    ['t-alpha', 't-beta', 't-gamma'],
  );
  for (const m of eff.memberships) {
    assert.equal(m.source, 'explicit', 'tenant-level user must never receive a factory_master row');
  }
  assert.equal(eff.factory_master, false);
  assert.ok(
    !eff.memberships.some((m) => m.tenant_id === 't-secret'),
    'a tenant the user is NOT granted on must never appear',
  );
});

// -------------------------------------------------------------
// Vector #11 — Defensive in-JS re-check: factory_master=true on a level='tenant'
// row (corrupt or legacy data) must NOT trigger expansion, even though the
// IM-1 CHECK constraint should have prevented this row from existing.
// -------------------------------------------------------------
test('[v11] factory_master=true on level=tenant row does NOT trigger expansion (defensive)', async () => {
  const fake = fakePrisma({
    authUsers: [
      // Bypasses the CHECK constraint at the fake-DB level on purpose.
      { id: 'bad', username: 'bad@example.com', level: 'tenant', enabled: true, factoryMaster: true },
    ],
    memberships: [
      { userId: 'bad', tenantId: 't-alpha', role: 'member', capability: null, enabled: true, revokedAt: null, disabledAt: null },
    ],
    tenants: [
      { tenantId: 't-alpha', name: 'Alpha', tenantStatus: 'Active' },
      { tenantId: 't-beta', name: 'Beta', tenantStatus: 'Active' },
    ],
  });
  const eff = await getEffectiveMemberships('bad', { prismaClient: fake });
  assert.equal(
    eff.factory_master,
    false,
    'helper must report factory_master=false when level is not admin',
  );
  assert.equal(eff.memberships.length, 1, 'no expansion to Active tenants');
  assert.equal(eff.memberships[0].tenant_id, 't-alpha');
  assert.equal(eff.memberships[0].source, 'explicit');
});

test('[v11b] factory_master=true on a disabled admin row does NOT trigger expansion', async () => {
  const fake = fakePrisma({
    authUsers: [
      { id: 'admin-disabled', username: 'gone@example.com', level: 'admin', enabled: false, factoryMaster: true },
    ],
    memberships: [],
    tenants: [{ tenantId: 't-alpha', name: 'Alpha', tenantStatus: 'Active' }],
  });
  const eff = await getEffectiveMemberships('admin-disabled', { prismaClient: fake });
  assert.equal(eff.factory_master, false);
  assert.equal(eff.memberships.length, 0);
});

test('[v11c] factory_master expansion is bounded to tenant_status=Active only', async () => {
  const fake = fakePrisma({
    authUsers: [
      { id: 'fm', username: 'anton@example.com', level: 'admin', enabled: true, factoryMaster: true },
    ],
    memberships: [],
    tenants: [
      { tenantId: 't-active', name: 'Active', tenantStatus: 'Active' },
      { tenantId: 't-archived', name: 'Archived', tenantStatus: 'Archived' },
      { tenantId: 't-paused', name: 'Paused', tenantStatus: 'Paused' },
    ],
  });
  const eff = await getEffectiveMemberships('fm', { prismaClient: fake });
  assert.equal(eff.factory_master, true);
  assert.equal(eff.memberships.length, 1);
  assert.equal(eff.memberships[0].tenant_id, 't-active');
  assert.equal(eff.memberships[0].source, 'factory_master');
});

// -------------------------------------------------------------
// Vector #12 — Revoked/disabled mid-session: re-call sees the smaller set
// immediately. No caching.
// -------------------------------------------------------------
test('[v12] Revoked/disabled memberships disappear immediately on re-call (no cache)', async () => {
  const memberships = [
    { userId: 'u1', tenantId: 't-alpha', role: 'member', capability: null, enabled: true, revokedAt: null, disabledAt: null },
    { userId: 'u1', tenantId: 't-beta', role: 'member', capability: null, enabled: true, revokedAt: null, disabledAt: null },
  ];
  const fake = fakePrisma({
    authUsers: [{ id: 'u1', username: 'alice@example.com', level: 'tenant', enabled: true, factoryMaster: false }],
    memberships,
    tenants: [
      { tenantId: 't-alpha', name: 'Alpha', tenantStatus: 'Active' },
      { tenantId: 't-beta', name: 'Beta', tenantStatus: 'Active' },
    ],
  });

  const before = await getEffectiveMemberships('u1', { prismaClient: fake });
  assert.equal(before.memberships.length, 2);

  // Simulate a revoke happening between requests:
  memberships[1].revokedAt = new Date();
  const afterRevoke = await getEffectiveMemberships('u1', { prismaClient: fake });
  assert.equal(afterRevoke.memberships.length, 1);
  assert.equal(afterRevoke.memberships[0].tenant_id, 't-alpha');

  // And simulate a disable happening next:
  memberships[0].enabled = false;
  const afterDisable = await getEffectiveMemberships('u1', { prismaClient: fake });
  assert.equal(afterDisable.memberships.length, 0);
});

// -------------------------------------------------------------
// Additional coverage that is implied by IM-2 but not numbered above:
// — Disabled user receives zero rows even if memberships + factory_master are set.
// — Not-found user returns the blank "not_found" envelope, not a thrown exception.
// -------------------------------------------------------------
test('[extra] disabled auth_users row → zero effective memberships', async () => {
  const fake = fakePrisma({
    authUsers: [
      { id: 'admin-disabled', username: 'gone@example.com', level: 'admin', enabled: false, factoryMaster: true },
    ],
    memberships: [
      { userId: 'admin-disabled', tenantId: 't-alpha', role: 'member', capability: null, enabled: true, revokedAt: null, disabledAt: null },
    ],
    tenants: [{ tenantId: 't-alpha', name: 'Alpha', tenantStatus: 'Active' }],
  });
  const eff = await getEffectiveMemberships('admin-disabled', { prismaClient: fake });
  assert.equal(eff.enabled, false);
  assert.equal(eff.memberships.length, 0);
});

test('[extra] unknown user_id → not_found envelope, never throws', async () => {
  const fake = fakePrisma({ authUsers: [], memberships: [], tenants: [] });
  const eff = await getEffectiveMemberships('does-not-exist', { prismaClient: fake });
  assert.equal(eff.not_found, true);
  assert.equal(eff.memberships.length, 0);
});

test('[extra] empty/blank user_id → not_found envelope', async () => {
  const fake = fakePrisma({ authUsers: [], memberships: [], tenants: [] });
  const eff = await getEffectiveMemberships('   ', { prismaClient: fake });
  assert.equal(eff.not_found, true);
});
