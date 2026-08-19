import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import { handleAppProspects, handleAppShell, tryHandleAppApi } from '../lib/app/handlers.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import { OPERATING_WORKSPACE_LABEL } from '../lib/app/workspace-context.js';

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

test('handler: Core proof can load Prospect Operations list', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppProspects(
      { method: 'GET', url: '/api/app/prospects?proof=1&env=core', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.workspace, 'operating');
    assert.equal(res.state.body.data_source, 'fixture');
    assert.equal(res.state.body.external_send, false);
    assert.ok(res.state.body.count >= 2);
    const ids = res.state.body.prospects.map((row) => row.id);
    assert.ok(ids.includes('syn-772-lr-ada'));
    assert.ok(ids.includes('syn-772-rd-bea'));
    assert.ok(ids.includes('syn-772-lr-cal'));
    const bea = res.state.body.prospects.find((row) => row.id === 'syn-772-rd-bea');
    assert.ok(bea);
    assert.equal(bea.email, 'bea@example.com');
    assert.ok(bea.response_draft);
    assert.equal(bea.source_surfaces.operating_workspace, '/app/prospects');
    assert.equal(res.state.body.canonical_operator_surface, '/app/prospects');
    const blob = JSON.stringify(res.state.body);
    assert.equal(blob.includes('qualificationJson'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant actor cannot load Prospect Operations', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppProspects(
      {
        method: 'GET',
        url: '/api/app/prospects?env=tenant',
        headers: {},
        __testAppActor: buildProofTenantActor(),
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.error, 'core_access_denied');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: Tenant session actor is denied even if env=core is requested', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    const res = mockRes();
    await handleAppProspects(
      {
        method: 'GET',
        url: '/api/app/prospects?env=core',
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

test('handler: Core shell advertises Operating Workspace + Prospects nav', async () => {
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
    assert.equal(res.state.body.workspace.workspace_id, 'operating');
    assert.equal(res.state.body.workspace.workspace_label, OPERATING_WORKSPACE_LABEL);
    assert.equal(res.state.body.selected.workspace_id, 'operating');
    const menuIds = res.state.body.menus.map((m) => m.id);
    assert.ok(menuIds.includes('prospects'));
    const prospects = res.state.body.menus.find((m) => m.id === 'prospects');
    assert.equal(prospects.href, '/app/prospects');
    const pipeline = res.state.body.menus.find((m) => m.id === 'pipeline');
    assert.equal(pipeline.href, '/app/pipeline');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant shell does not advertise Prospect Operations', async () => {
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
    assert.equal(res.state.body.workspace.workspace_id, 'tenant');
    const menuIds = res.state.body.menus.map((m) => m.id);
    assert.equal(menuIds.includes('prospects'), false);
    assert.equal(menuIds.includes('pipeline'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('tryHandleAppApi routes app/prospects', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    const handled = await tryHandleAppApi(
      {
        method: 'GET',
        url: '/api/app/prospects',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      res,
      'app/prospects',
    );
    assert.equal(handled, true);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});
