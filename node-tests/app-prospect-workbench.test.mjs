import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  actorFromSessionPayload,
  buildProofTenantActor,
} from '../lib/app/access.js';
import {
  handleAppProspectDetail,
  handleAppShell,
  handleAppWorkbench,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import { OPERATING_WORKSPACE_LABEL, PROSPECT_WORKBENCH_PATH } from '../lib/app/workspace-context.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { AI_LEAD_RESCUE_PRODUCT } from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../lib/cmp/_lib/rapid-delivery-operator.js';

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

test('handler: Core proof Workbench includes LR, WR and general prospects', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const res = mockRes();
    await handleAppWorkbench(
      { method: 'GET', url: '/api/app/workbench?proof=1&env=core&filter=all', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.workspace, 'operating');
    assert.equal(res.state.body.path, PROSPECT_WORKBENCH_PATH);
    assert.equal(res.state.body.view, 'workbench');
    assert.equal(res.state.body.filter, 'all');
    assert.equal(res.state.body.data_source, 'fixture');
    assert.equal(res.state.body.external_send, false);
    assert.equal(res.state.body.canonical_operator_surface, '/app/workbench');
    assert.equal(res.state.body.shared_detail_surface, '/app/prospects/[id]');
    assert.equal(res.state.body.product_specific_surface_replaced, '/admin/lead-rescue');
    const ids = res.state.body.prospects.map((row) => row.id);
    assert.ok(ids.includes('syn-772-lr-ada'));
    assert.ok(ids.includes('syn-772-rd-bea'));
    assert.ok(ids.includes('syn-996-gen-dee'));
    const ada = res.state.body.prospects.find((row) => row.id === 'syn-772-lr-ada');
    assert.equal(ada.product, AI_LEAD_RESCUE_PRODUCT);
    assert.equal(ada.shared_detail_path, '/app/prospects/syn-772-lr-ada');
    assert.equal(ada.source_surfaces.workbench, '/app/workbench');
    assert.ok(Array.isArray(ada.exception_signals));
    const bea = res.state.body.prospects.find((row) => row.id === 'syn-772-rd-bea');
    assert.equal(bea.product, RAPID_DELIVERY_PRODUCT);
    const dee = res.state.body.prospects.find((row) => row.id === 'syn-996-gen-dee');
    assert.equal(dee.product, 'unknown');
    assert.equal(dee.organisation_name, 'Dee Advisory');
    assert.equal(dee.shared_detail_path, '/app/prospects/syn-996-gen-dee');
    const blob = JSON.stringify(res.state.body);
    assert.equal(blob.includes('qualificationJson'), false);
    assert.equal(blob.includes('AI Lead Rescue pipeline'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Workbench product and exception filters isolate rows', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    async function idsFor(filter) {
      const res = mockRes();
      await handleAppWorkbench(
        { method: 'GET', url: `/api/app/workbench?proof=1&env=core&filter=${filter}`, headers: {} },
        res,
      );
      assert.equal(res.state.statusCode, 200);
      return res.state.body.prospects.map((row) => row.id);
    }
    const lr = await idsFor('lead_rescue');
    assert.ok(lr.includes('syn-772-lr-ada'));
    assert.equal(lr.includes('syn-772-rd-bea'), false);
    assert.equal(lr.includes('syn-996-gen-dee'), false);
    const wr = await idsFor('website_rescue');
    assert.ok(wr.includes('syn-772-rd-bea'));
    const general = await idsFor('general');
    assert.ok(general.includes('syn-996-gen-dee'));
    assert.ok(general.includes('syn-995-gen-gil'));
    const overdue = await idsFor('overdue');
    assert.ok(overdue.includes('syn-772-lr-ada'));
    const noNext = await idsFor('no_next_action');
    assert.ok(noNext.includes('syn-996-gen-dee') || noNext.includes('syn-772-rd-bea'));
    const missing = await idsFor('missing_qualification');
    assert.ok(missing.length >= 1);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Workbench sort by prospect name is deterministic', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const res = mockRes();
    await handleAppWorkbench(
      { method: 'GET', url: '/api/app/workbench?proof=1&env=core&filter=all&sort=prospect&dir=asc', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    const names = res.state.body.prospects.map((row) =>
      String(row.organisation_name || row.person_name || ''),
    );
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    assert.deepEqual(names, sorted);
    assert.equal(res.state.body.sort, 'prospect');
    assert.equal(res.state.body.dir, 'asc');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Workbench text search finds general prospect', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const res = mockRes();
    await handleAppWorkbench(
      { method: 'GET', url: '/api/app/workbench?proof=1&env=core&filter=all&q=Dee', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    const ids = res.state.body.prospects.map((row) => row.id);
    assert.ok(ids.includes('syn-996-gen-dee'));
    assert.equal(ids.includes('syn-995-gen-gil'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant actor cannot load Workbench', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppWorkbench(
      {
        method: 'GET',
        url: '/api/app/workbench?env=tenant',
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

test('handler: Tenant session actor is denied Workbench even if env=core is requested', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    const res = mockRes();
    await handleAppWorkbench(
      {
        method: 'GET',
        url: '/api/app/workbench?env=core',
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

test('handler: Core shell advertises Workbench at /app/workbench', async () => {
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
    assert.equal(res.state.body.workspace.workspace_label, OPERATING_WORKSPACE_LABEL);
    const workbench = res.state.body.menus.find((m) => m.id === 'workbench');
    assert.equal(workbench.href, '/app/workbench');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant shell does not advertise Workbench', async () => {
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
    const menuIds = res.state.body.menus.map((m) => m.id);
    assert.equal(menuIds.includes('workbench'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: Workbench inline edit persists via existing prospect PATCH', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const patch = mockRes();
    await handleAppProspectDetail(
      {
        method: 'PATCH',
        url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada',
        headers: {},
        body: {
          owner: 'workbench-ops',
          next_action: 'Call from workbench',
          next_action_due: '2026-08-25T09:00:00.000Z',
          urgency: 'high',
        },
      },
      patch,
    );
    assert.equal(patch.state.statusCode, 200);
    assert.equal(patch.state.body.ok, true);
    assert.equal(patch.state.body.prospect.owner, 'workbench-ops');
    assert.equal(patch.state.body.prospect.next_action, 'Call from workbench');

    const list = mockRes();
    await handleAppWorkbench(
      { method: 'GET', url: '/api/app/workbench?proof=1&env=core&filter=lead_rescue', headers: {} },
      list,
    );
    const ada = list.state.body.prospects.find((row) => row.id === 'syn-772-lr-ada');
    assert.equal(ada.owner, 'workbench-ops');
    assert.equal(ada.next_action, 'Call from workbench');
    assert.equal(ada.urgency, 'high');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: general Workbench row opens shared detail without PATCH write path', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const get = mockRes();
    await handleAppProspectDetail(
      { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=syn-996-gen-dee', headers: {} },
      get,
    );
    assert.equal(get.state.statusCode, 200);
    assert.equal(get.state.body.prospect.shared_detail_path, '/app/prospects/syn-996-gen-dee');
    assert.equal(get.state.body.external_send, false);

    const patch = mockRes();
    await handleAppProspectDetail(
      {
        method: 'PATCH',
        url: '/api/app/prospect?proof=1&env=core&id=syn-996-gen-dee',
        headers: {},
        body: { owner: 'should-not-write' },
      },
      patch,
    );
    assert.equal(patch.state.statusCode, 404);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('tryHandleAppApi routes app/workbench', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  resetProspectFixtureStore();
  try {
    const res = mockRes();
    const handled = await tryHandleAppApi(
      {
        method: 'GET',
        url: '/api/app/workbench?proof=1&env=core',
        headers: {},
      },
      res,
      'app/workbench',
    );
    assert.equal(handled, true);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.view, 'workbench');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('workbench UI is not Lead Rescue branded and links shared detail', () => {
  const src = readFileSync(
    fileURLToPath(new URL('../components/app/ProspectWorkbench.js', import.meta.url)),
    'utf8',
  );
  assert.match(src, /Prospect Workbench/);
  assert.match(src, /prospect-workbench-shared-detail/);
  assert.match(src, /shared_detail_path/);
  assert.doesNotMatch(src, /AI Lead Rescue pipeline/);
  assert.doesNotMatch(src, /\/api\/factory\/lead-rescue\/list/);
  const page = readFileSync(fileURLToPath(new URL('../pages/app/workbench.js', import.meta.url)), 'utf8');
  assert.match(page, /\/api\/app\/workbench/);
  assert.match(page, /\/api\/app\/prospect/);
});
