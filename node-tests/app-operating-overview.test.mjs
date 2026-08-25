import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildProofCoreActor, buildProofTenantActor } from '../lib/app/access.js';
import {
  handleAppOverview,
  handleAppShell,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import {
  OPERATING_OVERVIEW_PATH,
  OPERATING_WORKSPACE_LABEL,
} from '../lib/app/workspace-context.js';
import {
  buildOperatingOverviewPayload,
  clientCommercialBlockerReasons,
  classifyDeliveryRequests,
  takeOverviewExceptions,
} from '../lib/app/operating-overview.js';
import { fixtureClientRows, projectClientSummaries } from '../lib/app/clients-workspace.js';
import {
  fixtureProspectLeadRows,
  projectProspectWorkbenchRows,
} from '../lib/app/prospect-operations-workspace.js';
import { projectCoreRequestList } from '../lib/app/project.js';
import { listAppRequests, resetRequestStore } from '../lib/app/request-store.js';

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

test('clientCommercialBlockerReasons uses recorded Company Master states only', () => {
  const reasons = clientCommercialBlockerReasons({
    lifecycle_status: 'EVIDENCE_INCOMPLETE',
    verification_status: 'CONFLICTING',
    approval_status: 'PENDING',
    missing_fields: ['erpnext_customer_pointer'],
  });
  const codes = reasons.map((row) => row.code).sort();
  assert.deepEqual(codes, ['approval_pending', 'evidence_incomplete', 'verification_conflicting']);
  assert.equal(clientCommercialBlockerReasons({ approval_status: 'APPROVED' }).length, 0);
});

test('classifyDeliveryRequests splits blocked vs awaiting review without inventing KPIs', () => {
  const classified = classifyDeliveryRequests([
    {
      request_id: 'rev-1',
      title: 'Review me',
      waiting_party: 'client',
      attention_required: true,
      internal_blocker: 'Waiting for client review',
      milestone: 'in_review',
    },
    {
      request_id: 'blk-1',
      title: 'Blocked delivery',
      waiting_party: 'corpflow',
      attention_required: false,
      internal_blocker: 'Protected merge gate',
      milestone: 'build',
    },
    {
      request_id: 'ok-1',
      title: 'Quiet',
      waiting_party: 'none',
      attention_required: false,
      internal_blocker: null,
    },
  ]);
  assert.deepEqual(
    classified.awaiting_review.map((row) => row.request_id),
    ['rev-1'],
  );
  assert.deepEqual(
    classified.blocked.map((row) => row.request_id),
    ['blk-1'],
  );
});

test('overview payload summarises fixture records and links canonical routes', () => {
  resetRequestStore();
  const prospects = projectProspectWorkbenchRows(fixtureProspectLeadRows());
  const clients = projectClientSummaries(fixtureClientRows(), prospects);
  const requests = projectCoreRequestList(listAppRequests());
  const payload = buildOperatingOverviewPayload({
    prospects,
    clients,
    requests,
    data_sources: { prospects: 'fixture', clients: 'fixture', requests: 'fixture' },
    proof_mode: true,
  });
  assert.equal(payload.ok, true);
  assert.equal(payload.path, OPERATING_OVERVIEW_PATH);
  assert.equal(payload.view, 'overview');
  assert.equal(payload.fabricated_kpis, false);
  assert.equal(payload.external_send, false);
  assert.ok(payload.counts.needs_action_now > 0);
  assert.ok(payload.counts.overdue_prospects > 0);
  assert.ok(payload.counts.client_commercial_blockers >= 1);
  assert.ok(payload.counts.deliveries_awaiting_review >= 1);
  assert.ok(payload.counts.deliveries_awaiting_protected_approval >= 1);
  const commercialIds = payload.sections.client_commercial_blockers.items.map((row) => row.id);
  assert.ok(commercialIds.includes('cmp_pilot_client_synthetic'));
  const protectedIds = payload.sections.deliveries_awaiting_protected_approval.items.map(
    (row) => row.id,
  );
  assert.ok(protectedIds.includes('syn-995-lr-prot'));
  assert.equal(
    payload.sections.deliveries_awaiting_protected_approval.href,
    '/app/queue?filter=awaiting_protected_approval',
  );
  assert.ok(payload.sections.needs_action.items.every((row) => String(row.href).startsWith('/app/prospects/')));
  assert.ok(payload.sections.client_commercial_blockers.items.every((row) => String(row.href).startsWith('/app/clients/')));
  assert.ok(payload.sections.deliveries_awaiting_review.items.every((row) => row.href === '/change'));
  assert.ok(payload.open_next);
  assert.ok(String(payload.open_next.href).startsWith('/app/'));
  assert.ok(payload.reduces_fragmented_overview.includes('/app/today'));
  assert.ok(payload.reduces_fragmented_overview.includes('/app/queue'));
  assert.ok(payload.reduces_fragmented_overview.includes('/app/clients'));
  const blob = JSON.stringify(payload);
  assert.equal(blob.includes('qualificationJson'), false);
  assert.equal(payload.later_slices.commercial_summary, '#1004');
  assert.equal(payload.later_slices.delivery_summary, '#1005');
});

test('empty overview stays usable and does not invent counts', () => {
  const payload = buildOperatingOverviewPayload({
    prospects: [],
    clients: [],
    requests: [],
    data_sources: { prospects: 'fixture', clients: 'fixture', requests: 'fixture' },
  });
  assert.equal(payload.counts.needs_action_now, 0);
  assert.equal(payload.counts.client_commercial_blockers, 0);
  assert.equal(payload.open_next, null);
  assert.equal(payload.sections.needs_action.items.length, 0);
  assert.equal(takeOverviewExceptions([1, 2, 3, 4, 5, 6], 5).length, 5);
});

test('handler: Core proof can load the Operating Workspace overview', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppOverview(
      { method: 'GET', url: '/api/app/overview?proof=1&env=core', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.workspace, 'operating');
    assert.equal(res.state.body.path, OPERATING_OVERVIEW_PATH);
    assert.equal(res.state.body.view, 'overview');
    assert.equal(res.state.body.data_source, 'fixture');
    assert.equal(res.state.body.external_send, false);
    assert.equal(res.state.body.schema_change, false);
    assert.ok(res.state.body.counts.needs_action_now >= 1);
    assert.ok(res.state.body.sections.needs_action.items.length >= 1);
    const blob = JSON.stringify(res.state.body);
    assert.equal(blob.includes('qualificationJson'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant actor cannot load the Operating Workspace overview', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppOverview(
      {
        method: 'GET',
        url: '/api/app/overview?env=tenant',
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

test('handler: unauthenticated overview fails closed', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  process.env.VERCEL_ENV = 'production';
  try {
    const res = mockRes();
    await handleAppOverview(
      { method: 'GET', url: '/api/app/overview?env=core', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 401);
    assert.equal(res.state.body.error, 'authentication_required');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Core shell advertises Overview as the Operating Workspace landing', async () => {
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
    const overview = res.state.body.menus.find((m) => m.id === 'overview');
    assert.equal(overview.href, '/app/core');
    const menuIds = res.state.body.menus.map((m) => m.id);
    assert.equal(menuIds[0], 'overview');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant shell does not advertise the Operating Workspace overview', async () => {
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
    assert.equal(menuIds.includes('overview'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('tryHandleAppApi routes app/overview', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    const handled = await tryHandleAppApi(
      {
        method: 'GET',
        url: '/api/app/overview',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      res,
      'app/overview',
    );
    assert.equal(handled, true);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.view, 'overview');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});
