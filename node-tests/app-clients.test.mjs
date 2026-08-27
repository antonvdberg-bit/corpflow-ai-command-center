import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppClientDetail,
  handleAppClients,
  handleAppShell,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import {
  fixtureClientRows,
  matchProspectsToClient,
  projectClientSummary,
} from '../lib/app/clients-workspace.js';
import { CLIENTS_PATH, OPERATING_WORKSPACE_LABEL } from '../lib/app/workspace-context.js';

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

test('fixture: at least three synthetic clients project without fabricated ERPNext identity', () => {
  const rows = fixtureClientRows();
  assert.ok(rows.length >= 3);
  const ids = rows.map((row) => row.company_id);
  assert.ok(ids.includes('cmp_corpflowai_synthetic'));
  assert.ok(ids.includes('cmp_pilot_client_synthetic'));
  assert.ok(ids.includes('cmp_ada_spa_synthetic'));
  for (const row of rows) {
    assert.equal(row.erpnext_customer, null);
  }
});

test('matchProspectsToClient uses explicit ids and exact organisation names only', () => {
  const company = {
    legal_name: 'Ada Spa Ltd',
    trading_name: 'Ada Spa',
    linked_prospect_ids: ['syn-772-rd-bea'],
  };
  const matched = matchProspectsToClient(company, [
    { id: 'syn-772-rd-bea', organisation_name: 'Bea Boutique' },
    { id: 'syn-772-lr-ada', organisation_name: 'Ada Spa' },
    { id: 'other', organisation_name: 'Unrelated Co' },
    { id: 'tenant-dump', organisation_name: 'CorpFlowAI market lead' },
  ]);
  const ids = matched.map((row) => row.id).sort();
  assert.deepEqual(ids, ['syn-772-lr-ada', 'syn-772-rd-bea']);
});

test('projectClientSummary does not invent a named contact or ERPNext customer', () => {
  const summary = projectClientSummary(
    {
      company_id: 'cmp_pilot_client_synthetic',
      legal_name: 'Pilot Client Synthetic Ltd',
      public_email: 'pilot-client@example.invalid',
      record_owner: 'role:company-master-operator',
      lifecycle_status: 'EVIDENCE_INCOMPLETE',
      erpnext_customer: null,
    },
    [],
  );
  assert.equal(summary.primary_contact.email, 'pilot-client@example.invalid');
  assert.equal(summary.primary_contact.name, null);
  assert.equal(summary.erpnext_customer, null);
  assert.ok(summary.missing_fields.includes('named_primary_contact'));
  assert.ok(summary.missing_fields.includes('erpnext_customer_pointer'));
  assert.equal(summary.workspace_context, 'operating');
});

test('handler: Core proof can load at least three Clients without Tenant leakage', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppClients(
      { method: 'GET', url: '/api/app/clients?proof=1&env=core', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.workspace, 'operating');
    assert.equal(res.state.body.path, CLIENTS_PATH);
    assert.equal(res.state.body.data_source, 'fixture');
    assert.equal(res.state.body.external_send, false);
    assert.equal(res.state.body.schema_change, false);
    assert.equal(res.state.body.erpnext_write, false);
    assert.ok(res.state.body.count >= 3);
    const ids = res.state.body.clients.map((row) => row.company_id);
    assert.ok(ids.includes('cmp_corpflowai_synthetic'));
    assert.ok(ids.includes('cmp_pilot_client_synthetic'));
    assert.ok(ids.includes('cmp_ada_spa_synthetic'));
    const ada = res.state.body.clients.find((row) => row.company_id === 'cmp_ada_spa_synthetic');
    assert.ok(ada);
    assert.equal(ada.primary_contact.name, 'Ada Prospect');
    assert.equal(ada.record_owner, 'anton');
    assert.ok(ada.related_prospects.some((row) => row.id === 'syn-772-lr-ada'));
    assert.ok(String(ada.next_action || '').length > 0);
    assert.equal(ada.workspace_context, 'operating');
    const blob = JSON.stringify(res.state.body);
    assert.equal(blob.includes('qualificationJson'), false);
    assert.equal(res.state.body.reduces_fragmented_surfaces.includes('/admin/company-master'), true);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Core proof can open one client summary', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppClientDetail(
      { method: 'GET', url: '/api/app/client?proof=1&env=core&id=cmp_ada_spa_synthetic', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.view, 'client_summary');
    assert.equal(res.state.body.client.company_id, 'cmp_ada_spa_synthetic');
    assert.equal(res.state.body.client.related_prospects[0].shared_detail_path, '/app/prospects/syn-772-lr-ada');
    assert.equal(res.state.body.client.commercial_references.existing_identity_path, '/admin/company-master');
    assert.equal(res.state.body.client.commercial_references.path, '/app/commercial');
    assert.equal(res.state.body.client.delivery_references.existing_delivery_path, '/app/delivery');
    assert.equal(res.state.body.client.delivery_references.tenant_change_path, '/change');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant actor cannot load Clients', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppClients(
      {
        method: 'GET',
        url: '/api/app/clients?env=tenant',
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

test('handler: Tenant session actor is denied Clients even if env=core is requested', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    const res = mockRes();
    await handleAppClients(
      {
        method: 'GET',
        url: '/api/app/clients?env=core',
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

test('handler: Tenant actor cannot load a client summary', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppClientDetail(
      {
        method: 'GET',
        url: '/api/app/client?env=tenant&id=cmp_ada_spa_synthetic',
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

test('handler: Core shell advertises Clients at /app/clients', async () => {
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
    const clients = res.state.body.menus.find((m) => m.id === 'clients');
    assert.equal(clients.href, '/app/clients');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant shell does not expose Clients', async () => {
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
    const clients = (res.state.body.menus || []).find((m) => m.id === 'clients' || m.href === '/app/clients');
    assert.equal(clients, undefined);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('tryHandleAppApi routes app/clients and app/client', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const listRes = mockRes();
    const listHandled = await tryHandleAppApi(
      {
        method: 'GET',
        url: '/api/app/clients',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      listRes,
      'app/clients',
    );
    assert.equal(listHandled, true);
    assert.equal(listRes.state.statusCode, 200);
    assert.equal(listRes.state.body.path, '/app/clients');

    const detailRes = mockRes();
    const detailHandled = await tryHandleAppApi(
      {
        method: 'GET',
        url: '/api/app/client?id=cmp_pilot_client_synthetic',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      detailRes,
      'app/client',
    );
    assert.equal(detailHandled, true);
    assert.equal(detailRes.state.statusCode, 200);
    assert.equal(detailRes.state.body.client.company_id, 'cmp_pilot_client_synthetic');
    assert.equal(detailRes.state.body.client.next_action.includes('evidence'), true);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: missing client id is 400 and unknown id is 404', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const missing = mockRes();
    await handleAppClientDetail(
      {
        method: 'GET',
        url: '/api/app/client',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      missing,
    );
    assert.equal(missing.state.statusCode, 400);
    assert.equal(missing.state.body.error, 'id_required');

    const unknown = mockRes();
    await handleAppClientDetail(
      {
        method: 'GET',
        url: '/api/app/client?id=does-not-exist',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      unknown,
    );
    assert.equal(unknown.state.statusCode, 404);
    assert.equal(unknown.state.body.error, 'client_not_found');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});
