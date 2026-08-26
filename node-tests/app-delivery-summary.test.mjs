import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  CLIENTS_SUMMARY_PATH,
  COMMERCIAL_EXISTING_PATH,
  COMMERCIAL_SUMMARY_ISSUE,
  DELIVERY_EXCEPTION_FILTERS,
  DELIVERY_PATH,
  buildDeliveryPayload,
  computeDeliveryExceptions,
  deliveryKindForProspectProduct,
  filterDeliveryItems,
  matchClientForProspect,
  normalizeDeliveryFilter,
  primaryDeliveryException,
  projectProspectToDeliveryItem,
  projectRequestToDeliveryItem,
} from '../lib/app/delivery-workspace.js';
import { handleAppDelivery, handleAppShell, tryHandleAppApi } from '../lib/app/handlers.js';
import { CANONICAL_REQUEST_ID } from '../lib/app/constants.js';
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

test('projector: Lead Rescue and Website Rescue become delivery items; general prospects do not', () => {
  const now = new Date('2026-08-23T12:00:00.000Z');
  const clients = [
    {
      company_id: 'cmp_ada_spa_synthetic',
      trading_name: 'Ada Spa',
      legal_name: 'Ada Spa Ltd',
      summary_path: '/app/clients/cmp_ada_spa_synthetic',
      related_prospects: [{ id: 'syn-772-lr-ada' }],
    },
  ];
  const lr = projectProspectToDeliveryItem(
    {
      id: 'syn-772-lr-ada',
      product: AI_LEAD_RESCUE_PRODUCT,
      organisation_name: 'Ada Spa',
      person_name: 'Ada Prospect',
      owner: 'anton',
      canonical_stage: 'qualifying',
      native_status: 'QUALIFYING',
      native_status_label: 'Qualifying',
      next_action: 'Book discovery',
      next_action_due: '2026-08-01T00:00:00.000Z',
      waiting_on: null,
      qualification_complete: true,
      tenant_id: 'corpflowai',
      shared_detail_path: '/app/prospects/syn-772-lr-ada',
    },
    now,
    clients,
  );
  const wr = projectProspectToDeliveryItem(
    {
      id: 'syn-772-rd-bea',
      product: RAPID_DELIVERY_PRODUCT,
      organisation_name: 'Bea Boutique',
      owner: '',
      canonical_stage: 'new',
      native_status: 'new_intake',
      native_status_label: 'New intake',
      next_action: '',
      qualification_complete: false,
      tenant_id: 'corpflowai',
      shared_detail_path: '/app/prospects/syn-772-rd-bea',
    },
    now,
  );
  const general = projectProspectToDeliveryItem(
    {
      id: 'syn-996-gen-dee',
      product: 'unknown',
      organisation_name: 'Dee Advisory',
    },
    now,
  );

  assert.equal(deliveryKindForProspectProduct(AI_LEAD_RESCUE_PRODUCT), 'lead_rescue');
  assert.equal(deliveryKindForProspectProduct(RAPID_DELIVERY_PRODUCT), 'website_rescue');
  assert.equal(lr?.record_kind, 'lead_rescue');
  assert.equal(lr?.client_business, 'Ada Spa');
  assert.equal(lr?.owner, 'anton');
  assert.equal(lr?.primary_exception, 'overdue_next_action');
  assert.equal(lr?.fabricated, false);
  assert.equal(lr?.links.prospect, '/app/prospects/syn-772-lr-ada');
  assert.equal(lr?.links.clients, '/app/clients/cmp_ada_spa_synthetic');
  assert.equal(lr?.links.commercial, COMMERCIAL_EXISTING_PATH);
  assert.equal(wr?.record_kind, 'website_rescue');
  assert.ok(wr?.exception_signals.includes('inputs_pending'));
  assert.equal(wr?.current_blocker, 'None recorded');
  assert.equal(general, null);
  assert.equal(matchClientForProspect({ id: 'syn-772-lr-ada' }, clients)?.company_id, 'cmp_ada_spa_synthetic');
});

test('projector: protected waiting_on is visually a protected gate, not a safe next step', () => {
  const item = projectProspectToDeliveryItem({
    id: 'syn-995-lr-prot',
    product: AI_LEAD_RESCUE_PRODUCT,
    organisation_name: 'Pat Partners',
    owner: 'anton',
    canonical_stage: 'proposal',
    native_status: 'QUOTE_SENT',
    native_status_label: 'Quote sent',
    next_action: 'Hold for Anton commercial approval',
    next_action_due: '2027-02-02T00:00:00.000Z',
    waiting_on: 'protected',
    qualification_complete: true,
    tenant_id: 'corpflowai',
    shared_detail_path: '/app/prospects/syn-995-lr-prot',
  });
  assert.equal(item?.protected_gate, true);
  assert.equal(item?.primary_exception, 'protected_deploy_approval_required');
  assert.match(String(item?.protected_action_label), /Protected/);
  assert.equal(item?.current_blocker, 'Waiting on protected approval');
});

test('projector: Change tickets become general delivery without fabricating fields', () => {
  const item = projectRequestToDeliveryItem({
    id: CANONICAL_REQUEST_ID,
    tenant_id: REFERENCE_TENANT_ID,
    title: 'Central app shell — Requests & Progress foundation',
    outcome: 'Authorised users can see client-safe progress',
    status: 'Approved',
    stage: 'Build',
    owner: 'core_operator',
    waiting_party: 'client',
    updated_at: '2026-08-06T18:00:00.000Z',
    client_safe_blocker: 'Waiting for your review of Landing copy.',
    internal_blocker: 'Blocked on client review of landing_copy before wiring merge.',
    attention_required: true,
    console_json: {
      client_view: {
        workflow_state: 'in_review',
        workflow_next_action: 'Use Preview review: Request changes or Approve.',
        progress_message: 'One component is ready for your review.',
        components: [],
      },
      promotion: { pr_number: 778, merged: false },
    },
    source: 'fixture',
  });
  assert.equal(item?.record_kind, 'general_delivery');
  assert.equal(item?.client_business, REFERENCE_TENANT_ID);
  assert.equal(item?.owner, 'core_operator');
  assert.equal(item?.delivery_stage, 'in_review');
  assert.ok(item?.exception_signals.includes('client_review_pending'));
  assert.ok(item?.exception_signals.includes('blocked'));
  assert.equal(item?.protected_gate, false);
  assert.equal(item?.links.change, '/change');
  assert.equal(item?.fabricated, false);
  assert.equal(item?.current_blocker, 'Blocked on client review of landing_copy before wiring merge.');
});

test('exceptions: preview_ready and protected deploy are distinct from safe internal work', () => {
  const preview = computeDeliveryExceptions({
    workflow_state: 'preview_ready',
    milestone: 'preview_ready',
    next_action: 'Open the preview link and review it.',
    qualification_complete: true,
  });
  const deploy = computeDeliveryExceptions({
    workflow_state: 'client_approved',
    next_action: 'Operator will publish after checks (promotion merge).',
    qualification_complete: true,
    promotion_merged: false,
  });
  assert.ok(preview.includes('preview_ready'));
  assert.equal(primaryDeliveryException(deploy), 'protected_deploy_approval_required');
  assert.equal(normalizeDeliveryFilter('nope'), 'all');
  assert.deepEqual(
    [...DELIVERY_EXCEPTION_FILTERS],
    [
      'all',
      'inputs_pending',
      'preview_ready',
      'client_review_pending',
      'protected_deploy_approval_required',
      'blocked',
      'overdue_next_action',
    ],
  );
});

test('filter: named exceptions keep non-matching rows out', () => {
  const items = [
    { id: 'a', primary_exception: 'blocked', exception_signals: ['blocked'] },
    { id: 'b', primary_exception: 'inputs_pending', exception_signals: ['inputs_pending'] },
  ];
  assert.equal(filterDeliveryItems(items, 'blocked').length, 1);
  assert.equal(filterDeliveryItems(items, 'all').length, 2);
});

test('payload: does not claim send/deploy/schema and keeps related surfaces', () => {
  const payload = buildDeliveryPayload({
    items: [
      {
        id: 'lead:syn-772-lr-ada',
        record_kind: 'lead_rescue',
        primary_exception: 'overdue_next_action',
        exception_signals: ['overdue_next_action'],
      },
    ],
    data_source: 'fixture',
    proof_mode: true,
    filter: 'overdue_next_action',
  });
  assert.equal(payload.ok, true);
  assert.equal(payload.path, DELIVERY_PATH);
  assert.equal(payload.external_send, false);
  assert.equal(payload.schema_change, false);
  assert.equal(payload.protected_actions.client_production_deploy, false);
  assert.equal(payload.protected_actions.live_send, false);
  assert.equal(payload.protected_actions.schema, false);
  assert.equal(payload.related_surfaces.clients, CLIENTS_SUMMARY_PATH);
  assert.equal(payload.related_surfaces.commercial_existing, COMMERCIAL_EXISTING_PATH);
  assert.equal(payload.related_surfaces.commercial_summary_issue, COMMERCIAL_SUMMARY_ISSUE);
  assert.equal(payload.filter_counts.overdue_next_action, 1);
});

test('handler: Core proof loads Lead Rescue, Website Rescue, and general delivery together', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppDelivery(
      { method: 'GET', url: '/api/app/delivery?proof=1&env=core', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.workspace, 'operating');
    assert.equal(res.state.body.path, DELIVERY_PATH);
    assert.equal(res.state.body.data_source, 'fixture');
    assert.equal(res.state.body.external_send, false);
    const kinds = new Set(res.state.body.items.map((row) => row.record_kind));
    assert.ok(kinds.has('lead_rescue'));
    assert.ok(kinds.has('website_rescue'));
    assert.ok(kinds.has('general_delivery'));
    const ids = res.state.body.items.map((row) => row.id);
    assert.ok(ids.includes('lead:syn-772-lr-ada'));
    assert.ok(ids.includes('lead:syn-772-rd-bea'));
    assert.ok(ids.includes(`ticket:${CANONICAL_REQUEST_ID}`));
    const prot = res.state.body.items.find((row) => row.source_id === 'syn-995-lr-prot');
    assert.equal(prot?.protected_gate, true);
    const ada = res.state.body.items.find((row) => row.source_id === 'syn-772-lr-ada');
    assert.equal(ada?.links.clients, '/app/clients/cmp_ada_spa_synthetic');
    const blob = JSON.stringify(res.state.body);
    assert.equal(blob.includes('qualificationJson'), false);
    assert.equal(blob.includes('POSTGRES_URL'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant actor cannot load Delivery', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppDelivery(
      {
        method: 'GET',
        url: '/api/app/delivery?env=tenant',
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

test('handler: Tenant session is denied Delivery even if env=core is requested', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    const res = mockRes();
    await handleAppDelivery(
      {
        method: 'GET',
        url: '/api/app/delivery?env=core',
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

test('handler: Core shell advertises Delivery at /app/delivery', async () => {
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
    const delivery = res.state.body.menus.find((m) => m.id === 'delivery');
    assert.equal(delivery.href, DELIVERY_PATH);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant shell does not expose /app/delivery', async () => {
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
    const hrefs = (res.state.body.menus || []).map((m) => m.href);
    assert.equal(hrefs.includes(DELIVERY_PATH), false);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('router: tryHandleAppApi owns GET /api/app/delivery', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    const handled = await tryHandleAppApi(
      {
        method: 'GET',
        url: '/api/app/delivery',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      res,
      'app/delivery',
    );
    assert.equal(handled, true);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.path, DELIVERY_PATH);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});
