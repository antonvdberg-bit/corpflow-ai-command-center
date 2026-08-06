import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

import {
  handleAppComponentReview,
  handleAppRequestDetail,
  handleAppShell,
} from '../lib/app/handlers.js';
import {
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  SYNTHETIC_REQUEST_ID,
} from '../lib/app/constants.js';
import { resetSyntheticStore } from '../lib/app/synthetic-store.js';

beforeEach(() => {
  resetSyntheticStore();
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

test('handler: proof shell returns Core + Tenant scopes', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppShell(
      { method: 'GET', url: '/api/app/shell?proof=1&scope=tenant&tenant_id=corpflowai', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.proof_mode, true);
    assert.deepEqual(
      res.state.body.available_scopes.map((s) => s.scope),
      ['core', 'tenant'],
    );
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
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
        url: `/api/app/request?proof=1&scope=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${OTHER_TENANT_REQUEST_ID}`,
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

test('handler: non-exposed review rejected; exposed approve succeeds; external_send false', async () => {
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
        },
      },
      ok,
    );
    assert.equal(ok.state.statusCode, 200);
    assert.equal(ok.state.body.ok, true);
    assert.equal(ok.state.body.external_send, false);
    assert.equal(ok.state.body.request.components.find((c) => c.key === 'landing_copy').milestone, 'approved');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: unauthenticated shell is 401', async () => {
  const res = mockRes();
  await handleAppShell({ method: 'GET', url: '/api/app/shell?scope=core', headers: {} }, res);
  assert.equal(res.state.statusCode, 401);
  assert.equal(res.state.body.error, 'authentication_required');
});

test('isolation constant foil tenant id differs from corpflowai', () => {
  assert.notEqual(OTHER_TENANT_ID, REFERENCE_TENANT_ID);
});
