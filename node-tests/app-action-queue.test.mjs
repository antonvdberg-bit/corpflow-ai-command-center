import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import {
  handleAppActionQueue,
  handleAppProspectDetail,
  handleAppShell,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import { ACTION_QUEUE_PATH, OPERATING_WORKSPACE_LABEL } from '../lib/app/workspace-context.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

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

test('handler: Core proof Action Queue includes LR, WR and general prospects', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const res = mockRes();
    await handleAppActionQueue(
      { method: 'GET', url: '/api/app/queue?proof=1&env=core&filter=all', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.workspace, 'operating');
    assert.equal(res.state.body.path, ACTION_QUEUE_PATH);
    assert.equal(res.state.body.view, 'action_queue');
    assert.equal(res.state.body.filter, 'all');
    assert.equal(res.state.body.data_source, 'fixture');
    assert.equal(res.state.body.external_send, false);
    assert.equal(res.state.body.canonical_operator_surface, '/app/queue');
    assert.equal(res.state.body.shared_detail_surface, '/app/prospects/[id]');
    const ids = res.state.body.prospects.map((row) => row.id);
    assert.ok(ids.includes('syn-772-lr-ada'));
    assert.ok(ids.includes('syn-772-rd-bea'));
    assert.ok(ids.includes('syn-995-gen-gil'));
    const ada = res.state.body.prospects.find((row) => row.id === 'syn-772-lr-ada');
    assert.equal(ada.shared_detail_path, '/app/prospects/syn-772-lr-ada');
    assert.equal(ada.source_surfaces.action_queue, '/app/queue');
    assert.ok(ada.owner !== undefined);
    assert.ok(ada.next_action !== undefined);
    assert.ok(Array.isArray(ada.exception_signals));
    const blob = JSON.stringify(res.state.body);
    assert.equal(blob.includes('qualificationJson'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Action Queue default filter prioritises overdue before scheduled waiting', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const res = mockRes();
    await handleAppActionQueue(
      { method: 'GET', url: '/api/app/queue?proof=1&env=core', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.filter, 'needs_action');
    const ids = res.state.body.prospects.map((row) => row.id);
    assert.equal(ids[0], 'syn-772-lr-ada');
    assert.equal(ids.includes('syn-772-lr-cal'), false);
    assert.ok(res.state.body.filter_counts.overdue >= 1);
    assert.ok(res.state.body.filter_counts.awaiting_prospect >= 1);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Action Queue named filters isolate overdue, due today, and awaiting states', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    async function idsFor(filter) {
      const res = mockRes();
      await handleAppActionQueue(
        { method: 'GET', url: `/api/app/queue?proof=1&env=core&filter=${filter}`, headers: {} },
        res,
      );
      assert.equal(res.state.statusCode, 200);
      return res.state.body.prospects.map((row) => row.id);
    }
    const overdue = await idsFor('overdue');
    assert.ok(overdue.includes('syn-772-lr-ada'));
    const dueToday = await idsFor('due_today');
    assert.ok(dueToday.includes('syn-995-lr-due'));
    const noNext = await idsFor('no_next_action');
    assert.ok(noNext.includes('syn-995-gen-gil'));
    const awaitingProspect = await idsFor('awaiting_prospect');
    assert.ok(awaitingProspect.includes('syn-772-lr-cal'));
    const awaitingOperator = await idsFor('awaiting_operator');
    assert.ok(awaitingOperator.includes('syn-995-lr-op'));
    const awaitingProtected = await idsFor('awaiting_protected_approval');
    assert.ok(awaitingProtected.includes('syn-995-lr-prot'));
    const neu = await idsFor('new');
    assert.ok(neu.includes('syn-772-rd-bea') || neu.includes('syn-995-gen-gil'));
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant actor cannot load Action Queue', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppActionQueue(
      {
        method: 'GET',
        url: '/api/app/queue?env=tenant',
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

test('handler: Tenant session actor is denied Action Queue even if env=core is requested', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    const res = mockRes();
    await handleAppActionQueue(
      {
        method: 'GET',
        url: '/api/app/queue?env=core',
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

test('handler: Core shell advertises Action Queue at /app/queue', async () => {
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
    const queue = res.state.body.menus.find((m) => m.id === 'queue');
    assert.equal(queue.href, '/app/queue');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant shell does not advertise Action Queue', async () => {
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
    assert.equal(menuIds.includes('queue'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('tryHandleAppApi routes app/queue', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    const handled = await tryHandleAppApi(
      {
        method: 'GET',
        url: '/api/app/queue',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      res,
      'app/queue',
    );
    assert.equal(handled, true);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.path, '/app/queue');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: Action Queue safe PATCH persists and is visible after refresh', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const save = mockRes();
    await handleAppProspectDetail(
      {
        method: 'PATCH',
        url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada',
        headers: {},
        body: {
          owner: 'queue-ops',
          next_action: 'Call from Action Queue',
          urgency: 'high',
          note_append: 'Updated from #995 queue',
        },
      },
      save,
    );
    assert.equal(save.state.statusCode, 200);
    assert.equal(save.state.body.ok, true);
    assert.equal(save.state.body.prospect.owner, 'queue-ops');
    assert.equal(save.state.body.prospect.next_action, 'Call from Action Queue');

    const refresh = mockRes();
    await handleAppActionQueue(
      { method: 'GET', url: '/api/app/queue?proof=1&env=core&filter=all', headers: {} },
      refresh,
    );
    assert.equal(refresh.state.statusCode, 200);
    const ada = refresh.state.body.prospects.find((row) => row.id === 'syn-772-lr-ada');
    assert.ok(ada);
    assert.equal(ada.owner, 'queue-ops');
    assert.equal(ada.next_action, 'Call from Action Queue');
    assert.equal(ada.shared_detail_path, '/app/prospects/syn-772-lr-ada');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
    resetProspectFixtureStore();
  }
});

test('handler: Action Queue page points Open at shared detail, not a duplicate surface', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const page = readFileSync(join(root, 'pages/app/queue.js'), 'utf8');
  const ui = readFileSync(join(root, 'components/app/ProspectActionQueue.js'), 'utf8');
  const list = readFileSync(join(root, 'components/app/ProspectOperationsList.js'), 'utf8');
  assert.ok(page.includes('/api/app/queue'));
  assert.ok(page.includes('/api/app/prospect'));
  assert.ok(ui.includes('action-queue-shared-detail-'));
  assert.ok(ui.includes('/app/prospects/'));
  assert.ok(!ui.includes('pages/admin/lead-rescue'));
  assert.ok(list.includes('prospect-ops-shared-detail-'));
  assert.ok(list.includes('data-market-enquiry-fields'));
});
