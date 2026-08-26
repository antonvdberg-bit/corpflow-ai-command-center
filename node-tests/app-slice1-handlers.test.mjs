import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import {
  handleAppComponentExpose,
  handleAppComponentReview,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  SECOND_REQUEST_ID,
  SYNTHETIC_REQUEST_ID,
} from '../lib/app/constants.js';
import { resetRequestStore } from '../lib/app/request-store.js';

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

test('handler: Core proof shell is Core-only with full Core nav', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppShell(
      { method: 'GET', url: '/api/app/shell?proof=1&env=core', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.environment, 'core');
    assert.equal(res.state.body.actor.can_core, true);
    assert.deepEqual(res.state.body.actor.can_tenant_ids, []);
    assert.equal(res.state.body.available_scopes.length, 1);
    assert.equal(res.state.body.available_scopes[0].scope, 'core');
    const menuIds = res.state.body.menus.map((m) => m.id);
    assert.ok(menuIds.includes('requests'));
    assert.ok(menuIds.includes('my_work'));
    assert.ok(menuIds.includes('tenants'));
    assert.ok(menuIds.includes('delivery'));
    assert.ok(menuIds.includes('approvals'));
    assert.ok(menuIds.includes('releases'));
    assert.ok(menuIds.includes('operations'));
    assert.equal(res.state.body.canonical_request_id, CANONICAL_REQUEST_ID);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant proof shell is Tenant-only with Tenant nav', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const res = mockRes();
    await handleAppShell(
      {
        method: 'GET',
        url: '/api/app/shell?proof=1&env=tenant&tenant_id=corpflowai',
        headers: {},
      },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.environment, 'tenant');
    assert.equal(res.state.body.actor.can_core, false);
    assert.deepEqual(res.state.body.actor.can_tenant_ids, [REFERENCE_TENANT_ID]);
    assert.equal(res.state.body.workspace.show_switch, false);
    assert.equal(res.state.body.workspace.switch_href, '');
    const menuIds = res.state.body.menus.map((m) => m.id);
    assert.ok(menuIds.includes('requests_progress'));
    assert.ok(menuIds.includes('service_change'));
    assert.equal(menuIds.includes('home'), false);
    assert.equal(menuIds.includes('documents'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: Core session cannot access /app/tenant (shell)', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const coreActor = actorFromSessionPayload({
      typ: 'admin',
      username: 'core-admin',
      user_id: 'u1',
    });
    const res = mockRes();
    await handleAppShell(
      {
        method: 'GET',
        url: '/api/app/shell?env=tenant&tenant_id=corpflowai',
        headers: {},
        __testAppActor: coreActor,
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.error, 'tenant_access_denied');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: Tenant session cannot access /app/core (shell)', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    const res = mockRes();
    await handleAppShell(
      {
        method: 'GET',
        url: '/api/app/shell?env=core',
        headers: {},
        __testAppActor: tenantActor,
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.error, 'core_access_denied');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: Core actor cannot call component-review (Tenant-only)', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: {},
        __testAppActor: buildProofCoreActor(),
        body: {
          request_id: SYNTHETIC_REQUEST_ID,
          component_key: 'landing_copy',
          decision: 'approve',
          tenant_id: REFERENCE_TENANT_ID,
        },
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.error, 'tenant_access_denied');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: Tenant actor cannot call component-expose (Core-only)', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppComponentExpose(
      {
        method: 'POST',
        url: '/api/app/component-expose',
        headers: {},
        __testAppActor: buildProofTenantActor(),
        body: {
          request_id: SYNTHETIC_REQUEST_ID,
          component_key: 'landing_copy',
          exposed: true,
        },
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.error, 'core_access_denied');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: tenant proof cannot load other-tenant request', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const res = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?proof=1&env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${OTHER_TENANT_REQUEST_ID}`,
        headers: {},
      },
      res,
    );
    assert.equal(res.state.statusCode, 404);
    assert.equal(res.state.body.error, 'request_not_found');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: non-exposed review rejected; exposed approve succeeds; no external send', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const denied = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: { 'x-corpflow-app-proof': '1' },
        body: {
          request_id: SYNTHETIC_REQUEST_ID,
          component_key: 'internal_wiring',
          decision: 'approve',
          tenant_id: REFERENCE_TENANT_ID,
          env: 'tenant',
        },
      },
      denied,
    );
    assert.equal(denied.state.statusCode, 403);
    assert.equal(denied.state.body.error, 'component_not_exposed');

    const ok = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: { 'x-corpflow-app-proof': '1' },
        body: {
          request_id: SYNTHETIC_REQUEST_ID,
          component_key: 'landing_copy',
          decision: 'approve',
          comment: 'ok',
          tenant_id: REFERENCE_TENANT_ID,
          env: 'tenant',
        },
      },
      ok,
    );
    assert.equal(ok.state.statusCode, 200);
    assert.equal(ok.state.body.ok, true);
    assert.equal(ok.state.body.external_send, false);
    assert.equal(ok.state.body.email_sent, false);
    assert.equal(ok.state.body.whatsapp_sent, false);
    assert.equal(ok.state.body.sms_sent, false);
    assert.equal(ok.state.body.payment_processed, false);
    assert.equal(
      ok.state.body.request.components.find((c) => c.key === 'landing_copy').milestone,
      'approved',
    );
    const blob = JSON.stringify(ok.state.body.request);
    assert.equal(blob.includes('internal_note'), false);
    assert.equal(blob.includes('github'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: Core list tenant filter + global queue', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const global = mockRes();
    await handleAppRequestsList(
      { method: 'GET', url: '/api/app/requests?proof=1&env=core&view=global', headers: {} },
      global,
    );
    assert.equal(global.state.statusCode, 200);
    assert.equal(global.state.body.requests.length, 3);
    assert.equal(global.state.body.data_source, 'fixture');

    const filtered = mockRes();
    await handleAppRequestsList(
      {
        method: 'GET',
        url: `/api/app/requests?proof=1&env=core&tenant_id=${REFERENCE_TENANT_ID}&status=Draft`,
        headers: {},
      },
      filtered,
    );
    assert.equal(filtered.state.statusCode, 200);
    assert.equal(filtered.state.body.requests.length, 1);
    assert.equal(filtered.state.body.requests[0].request_id, SECOND_REQUEST_ID);

    const other = mockRes();
    await handleAppRequestsList(
      {
        method: 'GET',
        url: `/api/app/requests?proof=1&env=core&tenant_id=${OTHER_TENANT_ID}`,
        headers: {},
      },
      other,
    );
    assert.equal(other.state.body.requests.length, 1);
    assert.equal(other.state.body.requests[0].request_id, OTHER_TENANT_REQUEST_ID);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: unauthenticated shell is 401', async () => {
  const res = mockRes();
  await handleAppShell({ method: 'GET', url: '/api/app/shell?env=core', headers: {} }, res);
  assert.equal(res.state.statusCode, 401);
  assert.equal(res.state.body.error, 'authentication_required');
});

test('isolation constant foil tenant id differs from corpflowai', () => {
  assert.notEqual(OTHER_TENANT_ID, REFERENCE_TENANT_ID);
});
