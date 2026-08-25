import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppClientDetail,
  handleAppLifecycle,
  handleAppProspectDetail,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import {
  LIFECYCLE_VERDICT_PASS,
  SYNTHETIC_LIFECYCLE_CLIENT_ID,
  SYNTHETIC_LIFECYCLE_PROSPECT_ID,
  evaluateLifecycleContinuity,
  matchClientForProspect,
  renderLifecycleContinuityHtml,
} from '../lib/app/lifecycle-continuity.js';
import { fixtureClientRows, projectClientSummaries } from '../lib/app/clients-workspace.js';
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

afterEach(() => {
  resetProspectFixtureStore();
});

test('matchClientForProspect returns one Company Master identity and does not guess duplicates', () => {
  const clients = projectClientSummaries(fixtureClientRows(), [
    { id: 'syn-772-lr-ada', organisation_name: 'Ada Spa', shared_detail_path: '/app/prospects/syn-772-lr-ada' },
  ]);
  const matched = matchClientForProspect(
    { id: 'syn-772-lr-ada', organisation_name: 'Ada Spa' },
    clients,
  );
  assert.equal(matched?.company_id, SYNTHETIC_LIFECYCLE_CLIENT_ID);
  const none = matchClientForProspect({ id: 'unknown', organisation_name: 'No Such Co' }, clients);
  assert.equal(none, null);
});

test('Ada Spa synthetic trace is LIFECYCLE CONTINUITY PASS without a second ledger', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppLifecycle(
      {
        method: 'GET',
        url: `/api/app/lifecycle?proof=1&env=core&prospect_id=${SYNTHETIC_LIFECYCLE_PROSPECT_ID}`,
        headers: {},
      },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.verdict, LIFECYCLE_VERDICT_PASS);
    assert.equal(res.state.body.tenant_accessible, false);
    assert.equal(res.state.body.second_ledger, false);
    assert.equal(res.state.body.schema_change, false);
    assert.equal(res.state.body.erpnext_write, false);
    assert.equal(res.state.body.external_send, false);
    const life = res.state.body.lifecycle;
    assert.equal(life.prospect_id, SYNTHETIC_LIFECYCLE_PROSPECT_ID);
    assert.equal(life.company_id, SYNTHETIC_LIFECYCLE_CLIENT_ID);
    assert.equal(life.no_duplicate_records, true);
    assert.equal(life.commercial_uses_same_lead_row, true);
    assert.equal(life.delivery_uses_same_lead_row, true);
    assert.equal(life.stages.prospect.canonical_stage, 'qualifying');
    assert.equal(life.stages.prospect.owner, 'anton');
    assert.ok(String(life.stages.prospect.next_action || '').length > 0);
    assert.equal(life.stages.client.record_id, SYNTHETIC_LIFECYCLE_CLIENT_ID);
    assert.equal(life.stages.commercial.erpnext_quotation, 'SAL-QTN-2026-00001');
    assert.equal(life.stages.commercial.financially_approved, false);
    assert.equal(life.stages.commercial.financial_approval_ref, null);
    assert.equal(life.stages.commercial.second_ledger, false);
    assert.match(String(life.stages.commercial.href), /#commercial-clearance$/);
    assert.equal(life.stages.delivery.commercially_cleared, false);
    assert.match(String(life.stages.delivery.href), /#delivery-state$/);
    assert.match(String(life.stages.delivery.blocker), /NOT CLEARED/);
    assert.equal(life.sources_of_truth.prospect.includes('leads'), true);
    assert.equal(life.sources_of_truth.client.includes('Company Master'), true);
    assert.equal(life.sources_of_truth.commercial.includes('#714'), true);
    assert.equal(life.sources_of_truth.delivery.includes('Lead Rescue'), true);
    const blob = JSON.stringify(res.state.body);
    assert.equal(blob.includes('qualificationJson'), false);
    const evaluated = evaluateLifecycleContinuity(life);
    assert.equal(evaluated.verdict, LIFECYCLE_VERDICT_PASS);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('shared Prospect detail links to the matched client and exposes the rail both ways', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const prospectRes = mockRes();
    await handleAppProspectDetail(
      {
        method: 'GET',
        url: `/api/app/prospect?proof=1&env=core&id=${SYNTHETIC_LIFECYCLE_PROSPECT_ID}`,
        headers: {},
      },
      prospectRes,
    );
    assert.equal(prospectRes.state.statusCode, 200);
    assert.equal(prospectRes.state.body.prospect.linked_client.company_id, SYNTHETIC_LIFECYCLE_CLIENT_ID);
    assert.equal(
      prospectRes.state.body.prospect.linked_client.summary_path,
      `/app/clients/${SYNTHETIC_LIFECYCLE_CLIENT_ID}`,
    );
    assert.equal(
      prospectRes.state.body.prospect.lifecycle.stages.client.href.includes(SYNTHETIC_LIFECYCLE_CLIENT_ID),
      true,
    );

    const clientRes = mockRes();
    await handleAppClientDetail(
      {
        method: 'GET',
        url: `/api/app/client?proof=1&env=core&id=${SYNTHETIC_LIFECYCLE_CLIENT_ID}`,
        headers: {},
      },
      clientRes,
    );
    assert.equal(clientRes.state.statusCode, 200);
    assert.equal(clientRes.state.body.client.erpnext_customer, null);
    assert.equal(clientRes.state.body.client.commercial_references.status, 'existing_commercial_rail');
    assert.equal(
      clientRes.state.body.client.commercial_references.prospect_commercial_path,
      `/app/prospects/${SYNTHETIC_LIFECYCLE_PROSPECT_ID}#commercial-clearance`,
    );
    assert.equal(
      clientRes.state.body.client.lifecycle.stages.prospect.href.includes(SYNTHETIC_LIFECYCLE_PROSPECT_ID),
      true,
    );
    assert.equal(
      clientRes.state.body.client.lifecycle.stages.commercial.erpnext_customer_pointer,
      'CF880 Synthetic Lead Rescue Ltd',
    );
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('Tenant cannot traverse the internal lifecycle API or read Ada Spa continuity', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppLifecycle(
      {
        method: 'GET',
        url: `/api/app/lifecycle?env=tenant&prospect_id=${SYNTHETIC_LIFECYCLE_PROSPECT_ID}`,
        headers: {},
        __testAppActor: buildProofTenantActor(),
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.error, 'core_access_denied');

    const spoof = mockRes();
    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    await handleAppLifecycle(
      {
        method: 'GET',
        url: `/api/app/lifecycle?env=core&prospect_id=${SYNTHETIC_LIFECYCLE_PROSPECT_ID}`,
        headers: {},
        __testAppActor: tenantActor,
      },
      spoof,
    );
    assert.equal(spoof.state.statusCode, 403);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('tryHandleAppApi routes app/lifecycle', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    const handled = await tryHandleAppApi(
      {
        method: 'GET',
        url: `/api/app/lifecycle?id=${SYNTHETIC_LIFECYCLE_PROSPECT_ID}`,
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      res,
      'app/lifecycle',
    );
    assert.equal(handled, true);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.verdict, LIFECYCLE_VERDICT_PASS);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('lifecycle HTML evidence includes the four-stage rail and tenant exclusion copy', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppLifecycle(
      { method: 'GET', url: '/api/app/lifecycle?proof=1&env=core', headers: {} },
      res,
    );
    const html = renderLifecycleContinuityHtml(res.state.body);
    assert.match(html, /data-testid="lifecycle-rail"/);
    assert.match(html, /lifecycle-stage-prospect/);
    assert.match(html, /lifecycle-stage-client/);
    assert.match(html, /lifecycle-stage-commercial/);
    assert.match(html, /lifecycle-stage-delivery/);
    assert.match(html, /Tenant Workspace cannot traverse/);
    assert.match(html, /@media \(max-width: 640px\)/);
    assert.match(html, /LIFECYCLE CONTINUITY PASS/);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('UI files wire bidirectional lifecycle navigation', () => {
  const prospectUi = readFileSync(
    fileURLToPath(new URL('../components/app/ProspectDetailPanel.js', import.meta.url)),
    'utf8',
  );
  const clientUi = readFileSync(
    fileURLToPath(new URL('../components/app/ClientsSummary.js', import.meta.url)),
    'utf8',
  );
  const commercialUi = readFileSync(
    fileURLToPath(new URL('../components/app/CommercialClearancePanel.js', import.meta.url)),
    'utf8',
  );
  const deliveryUi = readFileSync(
    fileURLToPath(new URL('../components/app/DeliveryStatePanel.js', import.meta.url)),
    'utf8',
  );
  assert.match(prospectUi, /LifecycleContinuityRail/);
  assert.match(prospectUi, /prospect-linked-client/);
  assert.match(prospectUi, /DeliveryStatePanel/);
  assert.match(clientUi, /LifecycleContinuityRail/);
  assert.match(clientUi, /clients-open-commercial/);
  assert.match(clientUi, /clients-open-delivery/);
  assert.match(commercialUi, /id="commercial-clearance"/);
  assert.match(commercialUi, /commercial-open-client/);
  assert.match(deliveryUi, /id="delivery-state"/);
});
