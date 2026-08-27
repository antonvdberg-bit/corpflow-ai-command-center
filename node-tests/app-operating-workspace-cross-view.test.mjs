import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppActionQueue,
  handleAppClientDetail,
  handleAppClients,
  handleAppCommercial,
  handleAppDelivery,
  handleAppOverview,
  handleAppShell,
} from '../lib/app/handlers.js';
import { matchProspectsToClient } from '../lib/app/clients-workspace.js';
import { matchClientForProspect } from '../lib/app/delivery-workspace.js';
import {
  OVERVIEW_LIST_ERROR_BODY,
  STAFF_LIST_ERROR_BODIES,
  operatingOverviewPanelKind,
  overviewErrorCopyImpliesFalseClear,
  staffWorkspaceListPanelKind,
} from '../lib/app/staff-workspace-load-state.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import {
  ACTION_QUEUE_PATH,
  CLIENTS_PATH,
  COMMERCIAL_SUMMARY_PATH,
  DELIVERY_PATH,
  OPERATING_OVERVIEW_PATH,
  PROSPECT_OPERATIONS_PATH,
} from '../lib/app/workspace-context.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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

const STAFF_ONLY_PATHS = [
  { name: 'overview', handle: handleAppOverview, url: '/api/app/overview?env=core' },
  { name: 'queue', handle: handleAppActionQueue, url: '/api/app/queue?env=core' },
  { name: 'clients', handle: handleAppClients, url: '/api/app/clients?env=core' },
  { name: 'commercial', handle: handleAppCommercial, url: '/api/app/commercial?env=core' },
  { name: 'delivery', handle: handleAppDelivery, url: '/api/app/delivery?env=core' },
];

test('#1219 cross-view: Core proof overview links to canonical Prospect/Client/Commercial/Delivery routes', async () => {
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
    assert.equal(res.state.body.path, OPERATING_OVERVIEW_PATH);
    assert.equal(res.state.body.canonical_routes.overview, '/app/core');
    assert.equal(res.state.body.canonical_routes.queue, ACTION_QUEUE_PATH);
    assert.equal(res.state.body.canonical_routes.clients, CLIENTS_PATH);
    assert.equal(res.state.body.canonical_routes.commercial, COMMERCIAL_SUMMARY_PATH);
    assert.equal(res.state.body.canonical_routes.delivery, DELIVERY_PATH);

    const items = Object.values(res.state.body.sections).flatMap((section) =>
      Array.isArray(section.items) ? section.items : [],
    );
    assert.ok(items.length >= 1);
    for (const item of items) {
      if (item.kind === 'prospect') {
        assert.equal(String(item.href).startsWith(PROSPECT_OPERATIONS_PATH + '/'), true, item.id);
        assert.ok(item.identity.prospect_id);
      }
      if (item.kind === 'client') {
        assert.equal(String(item.href).startsWith(CLIENTS_PATH + '/'), true, item.id);
        assert.ok(item.identity.company_id);
      }
      if (item.kind === 'commercial') {
        assert.equal(String(item.href).startsWith(COMMERCIAL_SUMMARY_PATH), true, item.id);
        assert.equal(String(item.href).startsWith('/admin/'), false, item.id);
      }
      if (item.kind === 'delivery') {
        assert.equal(String(item.href).startsWith(DELIVERY_PATH), true, item.id);
        assert.equal(String(item.href).startsWith('/change'), false, item.id);
        assert.equal(String(item.href).startsWith('/admin/'), false, item.id);
      }
    }
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('#1219 cross-view: Ada Spa recorded ids stay stable from overview to Client, Commercial and Delivery', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const overview = mockRes();
    await handleAppOverview(
      { method: 'GET', url: '/api/app/overview?proof=1&env=core', headers: {} },
      overview,
    );
    const client = mockRes();
    await handleAppClientDetail(
      { method: 'GET', url: '/api/app/client?proof=1&env=core&id=cmp_ada_spa_synthetic', headers: {} },
      client,
    );
    const commercial = mockRes();
    await handleAppCommercial(
      { method: 'GET', url: '/api/app/commercial?proof=1&env=core&filter=all', headers: {} },
      commercial,
    );
    const delivery = mockRes();
    await handleAppDelivery(
      { method: 'GET', url: '/api/app/delivery?proof=1&env=core&filter=all', headers: {} },
      delivery,
    );
    const queue = mockRes();
    await handleAppActionQueue(
      { method: 'GET', url: '/api/app/queue?proof=1&env=core&filter=all', headers: {} },
      queue,
    );

    assert.equal(client.state.body.client.company_id, 'cmp_ada_spa_synthetic');
    const adaProspect = client.state.body.client.related_prospects.find((row) => row.id === 'syn-772-lr-ada');
    assert.ok(adaProspect);
    assert.equal(adaProspect.shared_detail_path, '/app/prospects/syn-772-lr-ada');
    assert.equal(client.state.body.client.commercial_references.path, '/app/commercial');
    assert.equal(client.state.body.client.delivery_references.existing_delivery_path, '/app/delivery');

    const adaCommercial = (commercial.state.body.rows || []).find(
      (row) => row.prospect_id === 'syn-772-lr-ada' || row.id === 'syn-772-lr-ada',
    );
    assert.ok(adaCommercial);
    assert.equal(adaCommercial.company_master_id, 'cmp_ada_spa_synthetic');
    assert.equal(adaCommercial.shared_detail_path, '/app/prospects/syn-772-lr-ada');
    assert.ok(String(adaCommercial.owner || '').length > 0);
    assert.ok(String(adaCommercial.next_action || '').length > 0);

    const adaDelivery = (delivery.state.body.items || []).find((row) => row.source_id === 'syn-772-lr-ada');
    assert.ok(adaDelivery);
    assert.equal(adaDelivery.client_id, 'cmp_ada_spa_synthetic');
    assert.equal(adaDelivery.links.prospect, '/app/prospects/syn-772-lr-ada');
    assert.equal(adaDelivery.links.clients, '/app/clients/cmp_ada_spa_synthetic');
    assert.equal(adaDelivery.links.commercial, '/app/commercial');
    assert.equal(String(adaDelivery.links.product_desk || '').startsWith('/app/'), false);
    assert.ok(String(adaDelivery.owner || '').length > 0);
    assert.ok(String(adaDelivery.next_action || '').length > 0);

    const adaQueue = (queue.state.body.prospects || []).find((row) => row.id === 'syn-772-lr-ada');
    assert.ok(adaQueue);
    assert.equal(adaQueue.shared_detail_path, '/app/prospects/syn-772-lr-ada');
    assert.ok(String(adaQueue.owner || '').length > 0);
    assert.ok(String(adaQueue.next_action || '').length > 0);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('#1219 cross-view: Tenant sessions fail closed for all staff-only surfaces', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const tenant = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    for (const surface of STAFF_ONLY_PATHS) {
      const res = mockRes();
      await surface.handle(
        { method: 'GET', url: surface.url, headers: {}, __testAppActor: tenant },
        res,
      );
      assert.equal(res.state.statusCode, 403, surface.name);
      assert.equal(res.state.body.error, 'core_access_denied', surface.name);
    }

    const proofTenant = mockRes();
    await handleAppOverview(
      {
        method: 'GET',
        url: '/api/app/overview?proof=1&env=core',
        headers: {},
        __testAppActor: buildProofTenantActor(),
      },
      proofTenant,
    );
    assert.equal(proofTenant.state.statusCode, 403);

    const shell = mockRes();
    await handleAppShell(
      {
        method: 'GET',
        url: '/api/app/shell?env=core',
        headers: {},
        __testAppActor: tenant,
      },
      shell,
    );
    assert.equal(shell.state.statusCode, 403);
    assert.equal(buildProofCoreActor().can_core, true);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('#1219 cross-view: do not join Client/Prospect by display name when an identifier is absent', () => {
  assert.equal(
    matchClientForProspect({ organisation_name: 'Ada Spa' }, [
      {
        company_id: 'cmp_ada_spa_synthetic',
        trading_name: 'Ada Spa',
        legal_name: 'Ada Spa Ltd',
        related_prospects: [{ id: 'syn-772-lr-ada' }],
      },
    ]),
    null,
  );
  const matched = matchProspectsToClient(
    { trading_name: 'Ada Spa', legal_name: 'Ada Spa Ltd', linked_prospect_ids: [] },
    [{ id: 'syn-772-lr-ada', organisation_name: 'Ada Spa' }],
  );
  assert.deepEqual(matched, []);
});

test('#1219 cross-view: failed staff loads never masquerade as empty or complete', () => {
  assert.equal(staffWorkspaceListPanelKind({ busy: false, error: 'clients_503', count: 0 }), 'error');
  assert.equal(staffWorkspaceListPanelKind({ busy: false, error: '', count: 0 }), 'empty');
  assert.equal(operatingOverviewPanelKind({ error: 'overview_503', exceptionCount: 0, overviewOk: false }), 'error');
  assert.equal(overviewErrorCopyImpliesFalseClear(OVERVIEW_LIST_ERROR_BODY), false);
  assert.equal(overviewErrorCopyImpliesFalseClear(STAFF_LIST_ERROR_BODIES.delivery), false);
  assert.equal(overviewErrorCopyImpliesFalseClear('Nothing needs attention right now'), true);

  const coreSrc = readFileSync(join(root, 'pages/app/core.js'), 'utf8');
  const clientsSrc = readFileSync(join(root, 'pages/app/clients.js'), 'utf8');
  const commercialSrc = readFileSync(join(root, 'pages/app/commercial.js'), 'utf8');
  const deliverySrc = readFileSync(join(root, 'pages/app/delivery.js'), 'utf8');
  const queueSrc = readFileSync(join(root, 'pages/app/queue.js'), 'utf8');
  assert.equal(coreSrc.includes('app-core-overview-error'), true);
  assert.equal(clientsSrc.includes('app-clients-list-error'), true);
  assert.equal(commercialSrc.includes('app-commercial-list-error'), true);
  assert.equal(deliverySrc.includes('app-delivery-list-error'), true);
  assert.equal(queueSrc.includes('app-queue-list-error'), true);
  assert.equal(coreSrc.includes('operating-overview-empty'), false);
});
