import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppOverview,
  handleAppShell,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import {
  OPERATING_OVERVIEW_API_PATH,
  OPERATING_OVERVIEW_PATH,
  buildOperatingOverviewPayload,
  chooseNextDestination,
  clientHasRecordedException,
  filterExceptionClients,
  filterOverdueProspects,
  filterStalledProspects,
} from '../lib/app/operating-overview.js';
import { fixtureClientRows, projectClientSummaries } from '../lib/app/clients-workspace.js';
import { fixtureCommercialRecords, filterCommercialRows } from '../lib/app/commercial-summary.js';
import {
  fixtureProspectLeadRows,
  projectProspectLeadRows,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import {
  ACTION_QUEUE_PATH,
  CLIENTS_PATH,
  COMMERCIAL_SUMMARY_PATH,
  DELIVERY_PATH,
  isOperatingOverviewPath,
  operatingNavIncludesOverview,
  tenantNavOmitsOverview,
} from '../lib/app/workspace-context.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date('2026-08-27T12:00:00.000Z');

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

function fixtureOverviewArgs() {
  const prospects = projectProspectLeadRows(fixtureProspectLeadRows(NOW), NOW);
  const commercialRows = fixtureCommercialRecords(NOW);
  const clients = projectClientSummaries(fixtureClientRows(), prospects);
  return {
    prospects,
    commercialRows,
    clients,
    deliveryItems: [],
    data_source: 'fixture',
    proof_mode: true,
    now: NOW,
  };
}

describe('Operating Workspace action overview #1159', { concurrency: false }, () => {
  test('nav lands Overview on /app/core and omits it from Tenant', () => {
    assert.equal(OPERATING_OVERVIEW_PATH, '/app/core');
    assert.equal(OPERATING_OVERVIEW_API_PATH, '/api/app/overview');
    assert.equal(isOperatingOverviewPath('/app/core'), true);
    assert.equal(isOperatingOverviewPath('/api/app/overview'), true);
    assert.equal(operatingNavIncludesOverview(), true);
    assert.equal(tenantNavOmitsOverview(), true);
  });

  test('synthetic fixtures produce Prospect, Client, Commercial exceptions from existing records', () => {
    const prospects = projectProspectLeadRows(fixtureProspectLeadRows(NOW), NOW);
    const overdue = filterOverdueProspects(prospects, NOW);
    const stalled = filterStalledProspects(prospects, NOW);
    const commercial = filterCommercialRows(fixtureCommercialRecords(NOW), 'needs_attention');
    const clients = filterExceptionClients(projectClientSummaries(fixtureClientRows(), prospects));

    assert.ok(overdue.length + stalled.length >= 1, 'expected overdue or stalled prospect');
    assert.ok(commercial.length >= 1, 'expected commercial blocker');
    assert.ok(clients.length >= 1, 'expected client exception');
    assert.ok(clients.some((row) => row.company_id === 'cmp_pilot_client_synthetic'));
    assert.equal(clientHasRecordedException(clients[0]), true);
  });

  test('payload counts match existing filtered lists and every item has a canonical href', () => {
    const args = fixtureOverviewArgs();
    args.deliveryItems = [
      {
        id: 'ticket:syn_slice1_req_corpflowai_001',
        source_id: 'syn_slice1_req_corpflowai_001',
        record_kind: 'general_delivery',
        client_business: 'corpflowai',
        current_blocker: 'Blocked on client review',
        primary_exception: 'blocked',
        exception_signals: ['blocked', 'client_review_pending'],
        protected_gate: false,
        links: { change: '/change', prospect: null },
      },
      {
        id: 'lead:syn-protected',
        source_id: 'syn-protected',
        record_kind: 'lead_rescue',
        client_business: 'Protected Co',
        current_blocker: 'Waiting on protected approval',
        primary_exception: 'protected_deploy_approval_required',
        exception_signals: ['protected_deploy_approval_required'],
        protected_gate: true,
        links: { prospect: '/app/prospects/syn-protected', change: '/change' },
      },
    ];
    const payload = buildOperatingOverviewPayload(args);
    assert.equal(payload.ok, true);
    assert.equal(payload.path, '/app/core');
    assert.equal(payload.view, 'overview');
    assert.equal(payload.fabricated, false);
    assert.equal(payload.kpi_store, false);
    assert.equal(payload.schema_change, false);
    assert.equal(payload.external_send, false);
    assert.equal(payload.counts.commercial_blockers, filterCommercialRows(args.commercialRows, 'needs_attention').length);
    assert.equal(payload.counts.clients_exceptions, filterExceptionClients(args.clients).length);
    assert.equal(payload.counts.prospects_overdue, filterOverdueProspects(args.prospects, NOW).length);
    assert.equal(payload.counts.prospects_stalled, filterStalledProspects(args.prospects, NOW).length);
    assert.equal(payload.counts.delivery_blocked, 1);
    assert.equal(payload.counts.delivery_protected, 1);
    assert.equal(payload.counts.delivery_review, 1);
    assert.equal(payload.next_destination.href, `${DELIVERY_PATH}?filter=protected_deploy_approval_required`);

    const items = Object.values(payload.sections).flatMap((section) =>
      Array.isArray(section.items) ? section.items : [],
    );
    assert.ok(items.length >= 3);
    for (const item of items) {
      assert.ok(String(item.href || '').startsWith('/'), item.id);
      assert.equal(String(item.href).includes('://'), false, item.id);
      const allowed =
        item.href.startsWith('/app/prospects/') ||
        item.href.startsWith('/app/clients/') ||
        item.href.startsWith('/app/commercial') ||
        item.href.startsWith('/app/delivery') ||
        item.href.startsWith('/app/queue') ||
        item.href.startsWith('/app/workbench') ||
        item.href.startsWith('/app/today') ||
        item.href === '/change' ||
        item.href.startsWith('/change?');
      assert.equal(allowed, true, `unexpected href ${item.href}`);
    }

    const dumped = JSON.stringify(payload);
    assert.equal(dumped.includes('qualificationJson'), false);
    assert.equal(dumped.includes('"kpi"'), false);
  });

  test('next destination falls back to Today when nothing needs attention', () => {
    const next = chooseNextDestination({
      delivery_protected: 0,
      delivery_blocked: 0,
      prospects_overdue: 0,
      commercial_blockers: 0,
      prospects_stalled: 0,
      delivery_review: 0,
      clients_exceptions: 0,
    });
    assert.equal(next.href, '/app/today');
    assert.equal(next.count, 0);
  });

  test('core page and overview component keep identity links and loading/empty states', () => {
    const coreSrc = readFileSync(join(root, 'pages/app/core.js'), 'utf8');
    const uiSrc = readFileSync(join(root, 'components/app/OperatingOverview.js'), 'utf8');
    assert.equal(coreSrc.includes('/api/app/overview'), true);
    assert.equal(coreSrc.includes('OperatingOverview'), true);
    assert.equal(coreSrc.includes("menuFromQuery"), true);
    assert.equal(uiSrc.includes('operating-overview-empty'), true);
    assert.equal(uiSrc.includes('overview-next-link'), true);
    assert.equal(coreSrc.includes('app-core-overview-error'), true);
    assert.equal(coreSrc.includes('Could not load what needs attention'), true);
    assert.match(coreSrc, /menu === 'overview' && !error/);
    assert.equal(uiSrc.includes(ACTION_QUEUE_PATH), true);
    assert.equal(uiSrc.includes(CLIENTS_PATH), true);
    assert.equal(uiSrc.includes(COMMERCIAL_SUMMARY_PATH), true);
    assert.equal(uiSrc.includes(DELIVERY_PATH), true);
    assert.equal(uiSrc.includes('lib/app/operating-overview.js'), false);
  });
});

test('handler: Core proof overview returns existing-record exceptions', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const res = mockRes();
    await handleAppOverview(
      { method: 'GET', url: '/api/app/overview?proof=1&env=core', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.workspace, 'operating');
    assert.equal(res.state.body.path, '/app/core');
    assert.equal(res.state.body.data_source, 'fixture');
    assert.equal(res.state.body.fabricated, false);
    assert.ok(res.state.body.counts.commercial_blockers >= 1);
    assert.ok(res.state.body.counts.clients_exceptions >= 1);
    const commercialItems = res.state.body.sections.commercial.items;
    assert.ok(Array.isArray(commercialItems));
    assert.ok(commercialItems.every((item) => String(item.href || '').startsWith('/app/')));
    const nextHref = String(res.state.body.next_destination.href || '');
    assert.ok(nextHref.startsWith('/app/'));
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant session cannot read the overview', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppOverview(
      {
        method: 'GET',
        url: '/api/app/overview?env=core',
        headers: {},
        __testAppActor: actorFromSessionPayload({
          typ: 'tenant',
          tenant_id: REFERENCE_TENANT_ID,
          username: 'tenant-user',
        }),
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.error, 'core_access_denied');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: unauthenticated overview is 401', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppOverview({ method: 'GET', url: '/api/app/overview?env=core', headers: {} }, res);
    assert.equal(res.state.statusCode, 401);
    assert.equal(res.state.body.error, 'authentication_required');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: Tenant proof cannot enter Core overview', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppOverview(
      {
        method: 'GET',
        url: '/api/app/overview?proof=1&env=core',
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

test('tryHandleAppApi routes overview and Core proof actor can load shell', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const routed = mockRes();
    const handled = await tryHandleAppApi(
      { method: 'GET', url: '/api/app/overview?proof=1&env=core', headers: {} },
      routed,
      'app/overview',
    );
    assert.equal(handled, true);
    assert.equal(routed.state.statusCode, 200);

    const shell = mockRes();
    await handleAppShell({ method: 'GET', url: '/api/app/shell?proof=1&env=core', headers: {} }, shell);
    assert.equal(shell.state.statusCode, 200);
    assert.ok(shell.state.body.menus.some((item) => item.id === 'overview' && item.href === '/app/core'));
    assert.equal(buildProofCoreActor().can_core, true);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});
