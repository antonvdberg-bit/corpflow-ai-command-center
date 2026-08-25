import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import { handleAppProspectDetail, handleAppProspects, tryHandleAppApi } from '../lib/app/handlers.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  fixtureProspectLeadRows,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import {
  applySharedProspectOperatorPatch,
  assertProspectPatchNotProtected,
} from '../lib/app/prospect-operations-detail.js';
import {
  leadRowToProspectDetailViewModel,
  mapCanonicalStageToNativeStatus,
  sharedProspectDetailPath,
} from '../lib/cmp/_lib/prospect-operations-view-model.js';
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

afterEach(() => {
  resetProspectFixtureStore();
});

describe('shared Prospect detail #994', { concurrency: false }, () => {

test('shared detail path is inside Operating Workspace prospects', () => {
  assert.equal(sharedProspectDetailPath('syn-772-lr-ada'), '/app/prospects/syn-772-lr-ada');
  assert.equal(mapCanonicalStageToNativeStatus(AI_LEAD_RESCUE_PRODUCT, 'qualifying'), 'QUALIFYING');
  assert.equal(mapCanonicalStageToNativeStatus(RAPID_DELIVERY_PRODUCT, 'proposal_ready'), 'quote_ready');
});

test('list UI keeps shared-detail links without merging the table into enquiry handoff', () => {
  const src = readFileSync(
    fileURLToPath(new URL('../components/app/ProspectOperationsList.js', import.meta.url)),
    'utf8',
  );
  assert.match(src, /prospect-ops-shared-detail/);
  assert.match(src, /shared_detail_path/);
  assert.match(src, /data-market-enquiry-fields/);
  assert.match(src, /Copy response draft/);
  assert.doesNotMatch(src, /copy-ready draft\.',\s*\}\)\s*<\/p>\s*\) : null\}/);
});

test('detail view-model includes identity, history, and no qualificationJson', () => {
  const rows = fixtureProspectLeadRows();
  const ada = leadRowToProspectDetailViewModel(rows.find((row) => row.id === 'syn-772-lr-ada'));
  const bea = leadRowToProspectDetailViewModel(rows.find((row) => row.id === 'syn-772-rd-bea'));
  assert.equal(ada.product, AI_LEAD_RESCUE_PRODUCT);
  assert.equal(ada.organisation_name, 'Ada Spa');
  assert.equal(ada.email, 'ada@example.com');
  assert.equal(ada.shared_detail_path, '/app/prospects/syn-772-lr-ada');
  assert.ok(Array.isArray(ada.history));
  assert.ok(ada.history.length >= 1);
  assert.equal(ada.external_send, false);
  assert.equal(Object.prototype.hasOwnProperty.call(ada, 'qualificationJson'), false);

  assert.equal(bea.product, RAPID_DELIVERY_PRODUCT);
  assert.equal(bea.organisation_name, 'Bea Boutique');
  assert.equal(bea.shared_detail_path, '/app/prospects/syn-772-rd-bea');
  assert.ok(bea.recommended_next_action);
});

test('protected send flags are rejected before any write', () => {
  const blocked = assertProspectPatchNotProtected({ id: 'x', external_send: true });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, 'PROTECTED_ACTION_BLOCKED');
  const ok = assertProspectPatchNotProtected({ id: 'x', owner: 'anton' });
  assert.equal(ok.ok, true);
});

test('JSON patch persists owner, next action, due date, and note on Lead Rescue fixture', () => {
  const row = fixtureProspectLeadRows().find((item) => item.id === 'syn-772-lr-ada');
  const applied = applySharedProspectOperatorPatch(
    row,
    {
      owner: 'ops-desk',
      next_action: 'Call Ada tomorrow',
      next_action_due: '2026-08-20T09:00:00.000Z',
      urgency: 'high',
      note_append: 'Operator follow-up recorded',
    },
    { actorLabel: 'slice1-proof-core', nowIso: '2026-08-19T08:40:00.000Z' },
  );
  assert.equal(applied.ok, true);
  const detail = leadRowToProspectDetailViewModel(applied.row);
  assert.equal(detail.owner, 'ops-desk');
  assert.equal(detail.next_action, 'Call Ada tomorrow');
  assert.equal(detail.next_action_due, '2026-08-20T09:00:00.000Z');
  assert.equal(detail.urgency, 'high');
  const blob = JSON.stringify(detail.history);
  assert.equal(blob.includes('Operator follow-up recorded'), true);
  assert.equal(blob.includes('slice1-proof-core'), true);
});

test('JSON patch persists Rapid Delivery / Website Rescue operator fields', () => {
  const row = fixtureProspectLeadRows().find((item) => item.id === 'syn-772-rd-bea');
  const applied = applySharedProspectOperatorPatch(
    row,
    {
      owner: 'website-rescue-ops',
      status: 'reviewing',
      next_action: 'Qualify website rescue scope',
      next_action_due: '2026-08-21T10:00:00.000Z',
      note_append: 'Opened shared detail',
    },
    { actorLabel: 'anton', nowIso: '2026-08-19T08:41:00.000Z' },
  );
  assert.equal(applied.ok, true);
  const detail = leadRowToProspectDetailViewModel(applied.row);
  assert.equal(detail.owner, 'website-rescue-ops');
  assert.equal(detail.native_status, 'reviewing');
  assert.equal(detail.next_action, 'Qualify website rescue scope');
  assert.equal(JSON.stringify(detail.history).includes('Opened shared detail'), true);
});

test('handler: Core proof can open Lead Rescue and Website Rescue shared detail', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    for (const id of ['syn-772-lr-ada', 'syn-772-rd-bea']) {
      const res = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: `/api/app/prospect?proof=1&env=core&id=${id}`, headers: {} },
        res,
      );
      assert.equal(res.state.statusCode, 200);
      assert.equal(res.state.body.ok, true);
      assert.equal(res.state.body.view, 'shared_detail');
      assert.equal(res.state.body.external_send, false);
      assert.equal(res.state.body.prospect.id, id);
      assert.equal(res.state.body.prospect.shared_detail_path, `/app/prospects/${id}`);
      assert.equal(JSON.stringify(res.state.body).includes('qualificationJson'), false);
    }
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Core proof patch persists and is visible after GET refresh', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const patchRes = mockRes();
    await handleAppProspectDetail(
      {
        method: 'PATCH',
        url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada',
        headers: {},
        body: {
          id: 'syn-772-lr-ada',
          owner: 'refreshed-owner',
          next_action: 'Keep after refresh',
          note_append: 'Persisted note',
        },
      },
      patchRes,
    );
    assert.equal(patchRes.state.statusCode, 200);
    assert.equal(patchRes.state.body.prospect.owner, 'refreshed-owner');

    const getRes = mockRes();
    await handleAppProspectDetail(
      { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada', headers: {} },
      getRes,
    );
    assert.equal(getRes.state.statusCode, 200);
    assert.equal(getRes.state.body.prospect.owner, 'refreshed-owner');
    assert.equal(getRes.state.body.prospect.next_action, 'Keep after refresh');
    assert.equal(JSON.stringify(getRes.state.body.prospect.history).includes('Persisted note'), true);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: Tenant actor cannot open or patch shared detail', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const getRes = mockRes();
    await handleAppProspectDetail(
      {
        method: 'GET',
        url: '/api/app/prospect?env=tenant&id=syn-772-lr-ada',
        headers: {},
        __testAppActor: buildProofTenantActor(),
      },
      getRes,
    );
    assert.equal(getRes.state.statusCode, 403);
    assert.equal(getRes.state.body.error, 'core_access_denied');

    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    const patchRes = mockRes();
    await handleAppProspectDetail(
      {
        method: 'PATCH',
        url: '/api/app/prospect?env=core&id=syn-772-lr-ada',
        headers: {},
        __testAppActor: tenantActor,
        body: { owner: 'should-not-write' },
      },
      patchRes,
    );
    assert.equal(patchRes.state.statusCode, 403);
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: unknown id and missing id fail closed', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const missing = mockRes();
    await handleAppProspectDetail(
      { method: 'GET', url: '/api/app/prospect?proof=1&env=core', headers: {} },
      missing,
    );
    assert.equal(missing.state.statusCode, 400);
    assert.equal(missing.state.body.error, 'id_required');

    const unknown = mockRes();
    await handleAppProspectDetail(
      { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=does-not-exist', headers: {} },
      unknown,
    );
    assert.equal(unknown.state.statusCode, 404);
    assert.equal(unknown.state.body.error, 'prospect_not_found');
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('handler: send flags are not an added send path', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppProspectDetail(
      {
        method: 'PATCH',
        url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada',
        headers: {},
        body: { id: 'syn-772-lr-ada', owner: 'x', external_send: true },
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.error, 'PROTECTED_ACTION_BLOCKED');
    assert.equal(res.state.body.external_send, false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('list payload advertises shared_detail_path for both products', async () => {
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
    const ada = res.state.body.prospects.find((row) => row.id === 'syn-772-lr-ada');
    const bea = res.state.body.prospects.find((row) => row.id === 'syn-772-rd-bea');
    assert.equal(ada.shared_detail_path, '/app/prospects/syn-772-lr-ada');
    assert.equal(bea.shared_detail_path, '/app/prospects/syn-772-rd-bea');
    // Staff list includes contact for #699 enquiry handoff; still omits raw qualificationJson.
    assert.equal(ada.email, 'ada@example.com');
    assert.equal(bea.email, 'bea@example.com');
    assert.equal(Object.prototype.hasOwnProperty.call(ada, 'qualificationJson'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(bea, 'qualificationJson'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('tryHandleAppApi routes app/prospect', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    const handled = await tryHandleAppApi(
      {
        method: 'GET',
        url: '/api/app/prospect?id=syn-772-lr-ada',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      res,
      'app/prospect',
    );
    assert.equal(handled, true);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.prospect.id, 'syn-772-lr-ada');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('#1074 extracted contracts: activity, checklist, and proposal stay on shared detail', () => {
  const adaRow = fixtureProspectLeadRows().find((item) => item.id === 'syn-772-lr-ada');
  const activity = applySharedProspectOperatorPatch(
    adaRow,
    {
      activity_append: {
        channel: 'email',
        type: 'outbound_followup',
        note: 'Manual follow-up recorded on shared detail',
        next_action: 'Wait for reply',
      },
    },
    { actorLabel: 'ops-desk', nowIso: '2026-08-25T12:00:00.000Z' },
  );
  assert.equal(activity.ok, true);
  const adaDetail = leadRowToProspectDetailViewModel(activity.row);
  assert.equal(JSON.stringify(adaDetail.history).includes('Manual follow-up recorded on shared detail'), true);

  const checklist = applySharedProspectOperatorPatch(
    activity.row,
    {
      setup_checklist_item: {
        key: 'intake_reviewed',
        state: 'done',
        note: 'Intake read on shared detail',
      },
    },
    { actorLabel: 'ops-desk', nowIso: '2026-08-25T12:01:00.000Z' },
  );
  assert.equal(checklist.ok, true);
  const qj = checklist.row.qualificationJson;
  const stored =
    qj.ai_lead_rescue_operator && qj.ai_lead_rescue_operator.setup_checklist
      ? qj.ai_lead_rescue_operator.setup_checklist.items.intake_reviewed
      : null;
  assert.equal(stored?.state, 'done');
  assert.equal(stored?.note, 'Intake read on shared detail');

  const bea = fixtureProspectLeadRows().find((item) => item.id === 'syn-772-rd-bea');
  const rdBlocked = applySharedProspectOperatorPatch(
    bea,
    { setup_checklist_item: { key: 'intake_reviewed', state: 'done' } },
    { actorLabel: 'ops-desk' },
  );
  assert.equal(rdBlocked.ok, false);
  assert.equal(rdBlocked.error, 'setup_checklist_not_applicable');
});

test('handler: Core GET includes extracted Lead Rescue and Rapid Delivery contracts without qualificationJson', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const lr = mockRes();
    await handleAppProspectDetail(
      { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada', headers: {} },
      lr,
    );
    assert.equal(lr.state.statusCode, 200);
    assert.equal(lr.state.body.prospect.lead_rescue_activity.applicable, true);
    assert.equal(lr.state.body.prospect.setup_checklist.eligible, false);
    assert.ok(Array.isArray(lr.state.body.prospect.setup_checklist.items));
    assert.equal(JSON.stringify(lr.state.body).includes('qualificationJson'), false);

    const wr = mockRes();
    await handleAppProspectDetail(
      { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=syn-772-rd-bea', headers: {} },
      wr,
    );
    assert.equal(wr.state.statusCode, 200);
    assert.equal(wr.state.body.prospect.rapid_delivery_proposal.applicable, true);
    assert.match(String(wr.state.body.prospect.rapid_delivery_proposal.markdown || ''), /proposal-ready summary/i);
    assert.equal(wr.state.body.prospect.rapid_delivery_proposal.external_send, false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});
});
