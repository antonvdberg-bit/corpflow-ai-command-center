/**
 * Slice 2 (#877) — authenticated session path (no ?proof=1) + membership binding.
 */
import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

import {
  actorFromSessionPayload,
  resolveAuthorisedTenantId,
} from '../lib/app/access.js';
import {
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import {
  APP_SLICE2_VERSION,
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  TENANT_FORBIDDEN_FIELD_KEYS,
} from '../lib/app/constants.js';
import { createFixtureRequestRepository } from '../lib/app/request-repository-fixture.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import { payloadContainsForbiddenTenantKeys } from '../lib/app/project.js';

beforeEach(() => {
  resetRequestStore();
});

function mockRes() {
  /** @type {{ statusCode: number, body: any }} */
  const state = { statusCode: 0, body: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
  };
}

test('resolveAuthorisedTenantId binds session tenant and fails closed cross-tenant', () => {
  const actor = actorFromSessionPayload({
    typ: 'tenant',
    tenant_id: REFERENCE_TENANT_ID,
    user_id: 'u-tenant',
  });
  const ok = resolveAuthorisedTenantId(actor, REFERENCE_TENANT_ID);
  assert.equal(ok.ok, true);
  assert.equal(ok.tenant_id, REFERENCE_TENANT_ID);
  const denied = resolveAuthorisedTenantId(actor, OTHER_TENANT_ID);
  assert.equal(denied.ok, false);
  assert.equal(denied.error, 'tenant_access_denied');
  const primary = resolveAuthorisedTenantId(actor, '');
  assert.equal(primary.ok, true);
  assert.equal(primary.tenant_id, REFERENCE_TENANT_ID);
});

test('membership tenant ids widen Tenant actor can_tenant_ids', () => {
  const actor = actorFromSessionPayload(
    { typ: 'tenant', tenant_id: REFERENCE_TENANT_ID, user_id: 'u-multi' },
    { membershipTenantIds: [REFERENCE_TENANT_ID, 'lux'] },
  );
  assert.ok(actor.can_tenant_ids.includes(REFERENCE_TENANT_ID));
  assert.ok(actor.can_tenant_ids.includes('lux'));
  assert.equal(resolveAuthorisedTenantId(actor, 'lux').ok, true);
  assert.equal(resolveAuthorisedTenantId(actor, OTHER_TENANT_ID).ok, false);
});

test('authenticated Core session shell works without proof', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppShell(
      {
        method: 'GET',
        url: '/api/app/shell?env=core',
        headers: {},
        __testSessionPayload: {
          typ: 'admin',
          username: 'core-operator',
          user_id: 'u-core-1',
        },
        __testMembershipTenantIds: [],
      },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.slice, APP_SLICE2_VERSION);
    assert.equal(res.state.body.proof_mode, false);
    assert.equal(res.state.body.auth_mode, 'session');
    assert.equal(res.state.body.environment, 'core');
    assert.equal(res.state.body.actor.can_core, true);
    assert.equal(res.state.body.actor.source, 'session');
    assert.equal(res.state.body.data_source, 'fixture');
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('authenticated CorpFlowAI tenant session shell works without proof', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppShell(
      {
        method: 'GET',
        url: `/api/app/shell?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
        headers: {},
        __testSessionPayload: {
          typ: 'tenant',
          username: 'corpflowai-member',
          user_id: 'u-tenant-1',
          tenant_id: REFERENCE_TENANT_ID,
        },
        __testMembershipTenantIds: [REFERENCE_TENANT_ID],
      },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.proof_mode, false);
    assert.equal(res.state.body.auth_mode, 'session');
    assert.equal(res.state.body.environment, 'tenant');
    assert.equal(res.state.body.selected.tenant_id, REFERENCE_TENANT_ID);
    assert.equal(res.state.body.selected.tenant_label, 'CorpFlowAI');
    assert.equal(res.state.body.actor.can_core, false);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('authenticated Core session lists requests via repository contract', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppRequestsList(
      {
        method: 'GET',
        url: '/api/app/requests?env=core&view=global',
        headers: {},
        __testSessionPayload: {
          typ: 'admin',
          username: 'core-operator',
          user_id: 'u-core-1',
        },
        __testAppRepository: createFixtureRequestRepository(),
      },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.auth_mode, 'session');
    assert.ok(res.state.body.requests.length >= 1);
    assert.equal(res.state.body.data_source, 'fixture');
    const row = res.state.body.requests[0];
    assert.ok(row.request_id);
    assert.ok('internal_blocker' in row);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('authenticated Tenant session lists client-safe projection only', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppRequestsList(
      {
        method: 'GET',
        url: `/api/app/requests?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
        headers: {},
        __testSessionPayload: {
          typ: 'tenant',
          tenant_id: REFERENCE_TENANT_ID,
          user_id: 'u-tenant-1',
        },
        __testMembershipTenantIds: [REFERENCE_TENANT_ID],
        __testAppRepository: createFixtureRequestRepository(),
      },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.auth_mode, 'session');
    assert.ok(res.state.body.requests.length >= 1);
    assert.equal(
      res.state.body.requests.every((r) => r.tenant_id === REFERENCE_TENANT_ID),
      true,
    );
    const blob = JSON.stringify(res.state.body.requests);
    for (const key of ['internal_blocker', 'internal_note', 'github', 'commit_sha']) {
      assert.equal(blob.includes(`"${key}"`), false, `tenant list leaked ${key}`);
    }
    assert.equal(payloadContainsForbiddenTenantKeys(res.state.body.requests), false);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('authenticated Tenant detail omits internal engineering evidence fields', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${CANONICAL_REQUEST_ID}`,
        headers: {},
        __testSessionPayload: {
          typ: 'tenant',
          tenant_id: REFERENCE_TENANT_ID,
          user_id: 'u-tenant-1',
        },
        __testMembershipTenantIds: [REFERENCE_TENANT_ID],
        __testAppRepository: createFixtureRequestRepository(),
      },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.request.request_id, CANONICAL_REQUEST_ID);
    const blob = JSON.stringify(res.state.body.request);
    for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
      assert.equal(blob.includes(`"${key}"`), false, `detail leaked ${key}`);
    }
    assert.ok(res.state.body.request.progress);
    assert.ok('client_safe_blocker' in res.state.body.request);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('authenticated Tenant cannot read other-tenant request (fail closed)', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const cross = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${OTHER_TENANT_REQUEST_ID}`,
        headers: {},
        __testSessionPayload: {
          typ: 'tenant',
          tenant_id: REFERENCE_TENANT_ID,
          user_id: 'u-tenant-1',
        },
        __testMembershipTenantIds: [REFERENCE_TENANT_ID],
        __testAppRepository: createFixtureRequestRepository(),
      },
      cross,
    );
    assert.equal(cross.state.statusCode, 404);
    assert.equal(cross.state.body.error, 'request_not_found');

    const spoof = mockRes();
    await handleAppRequestsList(
      {
        method: 'GET',
        url: `/api/app/requests?env=tenant&tenant_id=${OTHER_TENANT_ID}`,
        headers: {},
        __testSessionPayload: {
          typ: 'tenant',
          tenant_id: REFERENCE_TENANT_ID,
          user_id: 'u-tenant-1',
        },
        __testMembershipTenantIds: [REFERENCE_TENANT_ID],
      },
      spoof,
    );
    assert.equal(spoof.state.statusCode, 403);
    assert.equal(spoof.state.body.error, 'tenant_access_denied');
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('Core session still cannot enter Tenant without proof', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppShell(
      {
        method: 'GET',
        url: `/api/app/shell?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
        headers: {},
        __testSessionPayload: {
          typ: 'admin',
          username: 'core-operator',
          user_id: 'u-core-1',
        },
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.error, 'tenant_access_denied');
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('proof harness still works for deterministic tests', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const core = mockRes();
    await handleAppShell(
      { method: 'GET', url: '/api/app/shell?proof=1&env=core', headers: {} },
      core,
    );
    assert.equal(core.state.statusCode, 200);
    assert.equal(core.state.body.proof_mode, true);
    assert.equal(core.state.body.auth_mode, 'proof_harness');

    const tenant = mockRes();
    await handleAppShell(
      {
        method: 'GET',
        url: `/api/app/shell?proof=1&env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
        headers: {},
      },
      tenant,
    );
    assert.equal(tenant.state.statusCode, 200);
    assert.equal(tenant.state.body.proof_mode, true);
    assert.equal(tenant.state.body.auth_mode, 'proof_harness');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('repository_unavailable surfaces as 503 for operators', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const broken = {
      dataSource: 'cmp_tickets_read',
      supportsMutations: false,
      async listForCore() {
        throw new Error('P1001: Cannot reach database server');
      },
      async listForTenant() {
        throw new Error('P1001: Cannot reach database server');
      },
      async getForCore() {
        throw new Error('P1001: Cannot reach database server');
      },
      async getForTenant() {
        throw new Error('P1001: Cannot reach database server');
      },
    };
    const res = mockRes();
    await handleAppRequestsList(
      {
        method: 'GET',
        url: '/api/app/requests?env=core&view=global',
        headers: {},
        __testSessionPayload: {
          typ: 'admin',
          username: 'core-operator',
          user_id: 'u-core-1',
        },
        __testAppRepository: broken,
      },
      res,
    );
    assert.equal(res.state.statusCode, 503);
    assert.equal(res.state.body.error, 'repository_unavailable');
  } finally {
    process.env.NODE_ENV = prev;
  }
});
