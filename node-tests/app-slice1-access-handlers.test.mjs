/**
 * #778 Slice 1 — Core/Tenant access isolation + thin API handlers (no external send).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canAccessCoreScope,
  canAccessTenantScope,
  buildAppChrome,
} from '../lib/app/access.js';
import {
  handleAppContext,
  handleAppRequestGet,
  handleAppExpose,
  handleAppReview,
  handleAppRequestsList,
} from '../lib/app/handlers.js';
import {
  resetSyntheticStore,
  SYNTHETIC_REQUEST_ID,
  REFERENCE_TENANT_ID,
} from '../lib/app/synthetic-store.js';
import { findTenantLeakPaths } from '../lib/app/projection.js';

function makeRes() {
  const captured = {};
  return {
    captured,
    status(code) {
      captured.status = code;
      return this;
    },
    json(body) {
      captured.body = body;
      return this;
    },
    setHeader() {
      return this;
    },
  };
}

function adminSess({ acting = REFERENCE_TENANT_ID, fm = true } = {}) {
  return {
    ok: true,
    payload: {
      typ: 'admin',
      user_id: 'u-admin',
      factory_master: fm,
      acting_tenant_id: acting,
      session_version: 1,
    },
  };
}

function tenantSess({ tenantId = REFERENCE_TENANT_ID } = {}) {
  return {
    ok: true,
    payload: {
      typ: 'tenant',
      user_id: 'u-tenant',
      tenant_id: tenantId,
      acting_tenant_id: tenantId,
      session_version: 1,
    },
  };
}

/** @param {{ ok?: boolean, payload?: Record<string, unknown> | null }} sess */
function depsFor(sess) {
  return {
    getSessionFromRequestFn: () => sess,
    getEffectiveMembershipsFn: async () => ({
      enabled: true,
      factory_master: sess?.payload?.factory_master === true,
      memberships:
        sess?.payload?.typ === 'tenant'
          ? [{ tenant_id: String(sess.payload.tenant_id) }]
          : [{ tenant_id: REFERENCE_TENANT_ID }],
    }),
  };
}

test('Core-only access denied to tenant-only users', () => {
  assert.equal(canAccessCoreScope(tenantSess()), false);
  assert.equal(canAccessCoreScope(adminSess()), true);
  const chrome = buildAppChrome({
    sess: tenantSess(),
    selectedScope: 'core',
    selectedTenantId: REFERENCE_TENANT_ID,
    memberships: [{ tenant_id: REFERENCE_TENANT_ID }],
  });
  assert.equal(chrome.can_access_core, false);
  assert.equal(chrome.selected_allowed, false);
});

test('CorpFlowAI tenant cannot see another tenant', () => {
  assert.equal(
    canAccessTenantScope({
      sess: tenantSess({ tenantId: REFERENCE_TENANT_ID }),
      tenantId: 'luxe-maurice',
      memberships: [{ tenant_id: REFERENCE_TENANT_ID }],
    }),
    false,
  );
  assert.equal(
    canAccessTenantScope({
      sess: tenantSess({ tenantId: REFERENCE_TENANT_ID }),
      tenantId: REFERENCE_TENANT_ID,
      memberships: [{ tenant_id: REFERENCE_TENANT_ID }],
    }),
    true,
  );
});

test('handler: tenant-only denied Core request get', async () => {
  resetSyntheticStore();
  const res = makeRes();
  await handleAppRequestGet(
    { method: 'GET', query: { id: SYNTHETIC_REQUEST_ID, scope: 'core' } },
    res,
    depsFor(tenantSess()),
  );
  assert.equal(res.captured.status, 403);
});

test('handler: tenant cannot load another tenant id probe', async () => {
  resetSyntheticStore();
  const res = makeRes();
  await handleAppRequestGet(
    {
      method: 'GET',
      query: { id: SYNTHETIC_REQUEST_ID, scope: 'tenant', tenant_id: 'luxe-maurice' },
    },
    res,
    depsFor(tenantSess()),
  );
  assert.equal(res.captured.status, 404);
});

test('handler: tenant get has no internal leak fields', async () => {
  resetSyntheticStore();
  const res = makeRes();
  await handleAppRequestGet(
    { method: 'GET', query: { id: SYNTHETIC_REQUEST_ID, scope: 'tenant' } },
    res,
    depsFor(tenantSess()),
  );
  assert.equal(res.captured.status, 200);
  const reqBody = res.captured.body.request;
  assert.deepEqual(findTenantLeakPaths(reqBody), []);
  assert.equal(reqBody.components.find((c) => c.key === 'landing_copy').review_allowed, true);
  assert.equal(reqBody.components.find((c) => c.key === 'internal_wiring').view_only, true);
});

test('handler: exposed review succeeds; non-exposed rejected; external_send false', async () => {
  resetSyntheticStore();
  const bad = makeRes();
  await handleAppReview(
    {
      method: 'POST',
      body: {
        request_id: SYNTHETIC_REQUEST_ID,
        component_key: 'internal_wiring',
        decision: 'approve',
        comment: 'nope',
      },
    },
    bad,
    depsFor(tenantSess()),
  );
  assert.equal(bad.captured.status, 403);

  const good = makeRes();
  await handleAppReview(
    {
      method: 'POST',
      body: {
        request_id: SYNTHETIC_REQUEST_ID,
        component_key: 'landing_copy',
        decision: 'approve',
        comment: 'Ship it',
      },
    },
    good,
    depsFor(tenantSess()),
  );
  assert.equal(good.captured.status, 200);
  assert.equal(good.captured.body.external_send, false);
  assert.equal(
    good.captured.body.request.components.find((c) => c.key === 'landing_copy').milestone,
    'approved',
  );
});

test('handler: tenant cannot expose; Core can expose', async () => {
  resetSyntheticStore();
  const denied = makeRes();
  await handleAppExpose(
    {
      method: 'POST',
      body: { request_id: SYNTHETIC_REQUEST_ID, component_key: 'internal_wiring', exposed: true },
    },
    denied,
    depsFor(tenantSess()),
  );
  assert.equal(denied.captured.status, 403);

  const ok = makeRes();
  await handleAppExpose(
    {
      method: 'POST',
      body: { request_id: SYNTHETIC_REQUEST_ID, component_key: 'internal_wiring', exposed: true },
    },
    ok,
    depsFor(adminSess()),
  );
  assert.equal(ok.captured.status, 200);
  assert.equal(ok.captured.body.external_send, false);
  assert.equal(
    ok.captured.body.client_projection_preview.components.find((c) => c.key === 'internal_wiring')
      .exposed_for_client_review,
    true,
  );
});

test('handler: context requires auth; lists identity-consistent requests', async () => {
  resetSyntheticStore();
  const unauth = makeRes();
  await handleAppContext(
    { method: 'GET', query: { scope: 'core' } },
    unauth,
    depsFor({ ok: false, payload: null }),
  );
  assert.equal(unauth.captured.status, 401);

  const list = makeRes();
  await handleAppRequestsList(
    { method: 'GET', query: { scope: 'core', tenant_id: REFERENCE_TENANT_ID } },
    list,
    depsFor(adminSess()),
  );
  assert.equal(list.captured.status, 200);
  assert.equal(list.captured.body.requests[0].id, SYNTHETIC_REQUEST_ID);
  assert.equal(list.captured.body.requests[0].client_projection_preview.id, SYNTHETIC_REQUEST_ID);
});
