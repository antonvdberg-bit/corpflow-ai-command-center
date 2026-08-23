import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import {
  buildCommercialSummaryPayload,
  classifyCommercialState,
  commercialNextAction,
  filterCommercialRows,
  fixtureCommercialRecords,
  projectCommercialRow,
  projectCommercialRows,
} from '../lib/app/commercial-summary.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import { handleAppCommercial, handleAppShell, tryHandleAppApi } from '../lib/app/handlers.js';
import { fixtureProspectLeadRows, projectProspectWorkbenchRows, resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import {
  CLIENTS_SUMMARY_PATH,
  COMMERCIAL_SUMMARY_PATH,
  COMPANY_MASTER_PATH,
  isCommercialSummaryPath,
  operatingNavIncludesCommercialSummary,
  tenantNavOmitsCommercialSummary,
} from '../lib/app/workspace-context.js';
import { canMarkFinanciallyApproved } from '../lib/revenue/commercial-approval.js';

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

describe('Commercial summary #1004', { concurrency: false }, () => {
  test('fixtures cover at least three commercial states without inventing values', () => {
    const records = fixtureCommercialRecords();
    const rows = projectCommercialRows(records);
    const states = new Set(rows.map((row) => row.commercial_state));
    assert.ok(states.has('quote_not_prepared'));
    assert.ok(states.has('awaiting_acceptance'));
    assert.ok(states.has('payment_evidence_pending'));
    assert.ok(states.has('financially_approved'));
    assert.ok(states.size >= 3);

    const approved = rows.find((row) => row.id === 'synthetic-ca-lr-approved');
    const rail = canMarkFinanciallyApproved(records.find((row) => row.id === 'synthetic-ca-lr-approved'));
    assert.equal(rail.ok, true);
    assert.equal(approved.financially_approved, true);
    assert.equal(approved.prospect_id, 'syn-772-lr-ada');
    assert.equal(approved.company_master_id, 'cmp_corpflowai_synthetic');
    assert.equal(approved.erpnext.quotation, 'QTN-SYN-LR-001');
    assert.equal(approved.erpnext.mutated, false);
    assert.equal(approved.shared_detail_path, '/app/prospects/syn-772-lr-ada');
    assert.equal(approved.clients_path, CLIENTS_SUMMARY_PATH);
    assert.equal(approved.company_master_path, COMPANY_MASTER_PATH);
    assert.equal(approved.payment_processed, false);
    assert.equal(approved.external_send, false);

    const quote = rows.find((row) => row.id === 'synthetic-ca-wr-incomplete-proposal');
    assert.equal(quote.commercial_state, 'quote_not_prepared');
    assert.equal(quote.prospect_id, 'syn-772-rd-bea');
    assert.ok(quote.blockers.includes('MISSING_PRICE') || quote.blockers.includes('MISSING_SCOPE'));

    const pending = rows.find((row) => row.id === 'synthetic-ca-lr-payment-pending');
    assert.equal(pending.commercial_state, 'payment_evidence_pending');
    assert.ok(pending.blockers.includes('MISSING_PAYMENT_EVIDENCE'));
    assert.equal(pending.financial_gate_blocking, true);
  });

  test('classifies rail blockers into operator-facing states', () => {
    assert.equal(classifyCommercialState([], true), 'financially_approved');
    assert.equal(classifyCommercialState(['MISSING_PROPOSAL'], false), 'quote_not_prepared');
    assert.equal(classifyCommercialState(['MISSING_ACCEPTANCE', 'MISSING_PAYMENT_EVIDENCE'], false), 'awaiting_acceptance');
    assert.equal(classifyCommercialState(['MISSING_PAYMENT_EVIDENCE'], false), 'payment_evidence_pending');
    assert.equal(classifyCommercialState(['MISSING_FINANCIAL_APPROVER'], false), 'awaiting_approval');
    assert.equal(classifyCommercialState(['PROPOSAL_REJECTED'], false), 'financial_gate_blocking');
    assert.match(commercialNextAction('quote_not_prepared', ['MISSING_PROPOSAL']), /Prepare quotation/);
  });

  test('payload is staff Commercial surface linked to existing identity contracts', () => {
    const now = new Date('2026-08-19T12:00:00.000Z');
    const prospects = projectProspectWorkbenchRows(fixtureProspectLeadRows(now), now);
    const payload = buildCommercialSummaryPayload({
      records: fixtureCommercialRecords(),
      prospects,
      data_source: 'fixture',
      proof_mode: true,
      filter: 'all',
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.path, COMMERCIAL_SUMMARY_PATH);
    assert.equal(payload.view, 'commercial');
    assert.equal(payload.canonical, true);
    assert.equal(payload.clients_surface, '/app/clients');
    assert.equal(payload.clients_identity_source, '/admin/company-master');
    assert.equal(payload.shared_detail_surface, '/app/prospects/[id]');
    assert.equal(payload.external_send, false);
    assert.equal(payload.payment_processed, false);
    assert.equal(payload.erpnext_mutated, false);
    assert.equal(payload.schema_changed, false);
    assert.ok(payload.reduces_fragmented_surfaces.some((item) => String(item).includes('Company Master')));
    const ada = payload.rows.find((row) => row.prospect_id === 'syn-772-lr-ada');
    assert.equal(ada.prospect_label, 'Ada Spa');
    assert.equal(ada.owner, 'anton');
    assert.equal(JSON.stringify(payload).includes('qualificationJson'), false);
  });

  test('needs_attention filter hides financially approved rows', () => {
    const rows = projectCommercialRows(fixtureCommercialRecords());
    const attention = filterCommercialRows(rows, 'needs_attention');
    assert.ok(attention.every((row) => row.financially_approved !== true));
    assert.ok(attention.some((row) => row.commercial_state === 'quote_not_prepared'));
    const approved = filterCommercialRows(rows, 'financially_approved');
    assert.ok(approved.every((row) => row.commercial_state === 'financially_approved'));
  });

  test('projectCommercialRow does not fabricate ERPNext names', () => {
    const row = projectCommercialRow({
      id: 'x',
      product: 'lead-rescue',
      prospect_id: 'syn-772-lr-ada',
      proposal: null,
    });
    assert.equal(row.erpnext.quotation, null);
    assert.equal(row.erpnext.authoritative, false);
    assert.equal(row.related_refs.quotation, null);
  });
});

test('handler: Core proof Commercial returns rail-backed rows', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  resetProspectFixtureStore();
  try {
    const res = mockRes();
    await handleAppCommercial(
      { method: 'GET', url: '/api/app/commercial?proof=1&env=core&filter=all', headers: {} },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.ok, true);
    assert.equal(res.state.body.workspace, 'operating');
    assert.equal(res.state.body.path, COMMERCIAL_SUMMARY_PATH);
    assert.equal(res.state.body.data_source, 'fixture');
    assert.equal(res.state.body.payment_processed, false);
    const states = new Set(res.state.body.rows.map((row) => row.commercial_state));
    assert.ok(states.size >= 3);
    const blob = JSON.stringify(res.state.body);
    assert.equal(blob.includes('qualificationJson'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
    resetProspectFixtureStore();
  }
});

test('handler: Tenant session is denied Commercial', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppCommercial(
      {
        method: 'GET',
        url: '/api/app/commercial?env=tenant',
        headers: {},
        __testAppActor: buildProofTenantActor(),
      },
      res,
    );
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body.ok, false);
    assert.equal(res.state.body.error, 'core_access_denied');
  } finally {
    process.env.NODE_ENV = prevNode;
  }
});

test('handler: unauthenticated Commercial requires sign-in', async () => {
  const res = mockRes();
  await handleAppCommercial(
    {
      method: 'GET',
      url: '/api/app/commercial?env=core',
      headers: {},
      __testSessionPayload: null,
    },
    res,
  );
  assert.equal(res.state.statusCode, 401);
});

test('handler: Tenant session actor is denied Commercial even if env=core is requested', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    const res = mockRes();
    await handleAppCommercial(
      {
        method: 'GET',
        url: '/api/app/commercial?env=core',
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

test('tryHandleAppApi routes app/commercial', async () => {
  const prevNode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  resetProspectFixtureStore();
  try {
    const res = mockRes();
    const handled = await tryHandleAppApi(
      {
        method: 'GET',
        url: '/api/app/commercial?proof=1&env=core&filter=all',
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      res,
      'app/commercial',
    );
    assert.equal(handled, true);
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.path, COMMERCIAL_SUMMARY_PATH);
  } finally {
    process.env.NODE_ENV = prevNode;
    resetProspectFixtureStore();
  }
});

test('shell Core menu includes Commercial and Tenant menu does not', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const core = mockRes();
    await handleAppShell({ method: 'GET', url: '/api/app/shell?proof=1&env=core', headers: {} }, core);
    assert.equal(core.state.statusCode, 200);
    assert.ok(core.state.body.menus.some((item) => item.id === 'commercial' && item.href === '/app/commercial'));
    assert.equal(operatingNavIncludesCommercialSummary(), true);
    assert.equal(tenantNavOmitsCommercialSummary(), true);
    assert.equal(isCommercialSummaryPath('/app/commercial'), true);
    assert.equal(isCommercialSummaryPath('/api/app/commercial'), true);
    assert.equal(isCommercialSummaryPath('/app/pipeline'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('Commercial page is read-only and links to shared detail plus Clients identity', () => {
  const page = readFileSync(join(root, 'pages/app/commercial.js'), 'utf8');
  const ui = readFileSync(join(root, 'components/app/CommercialSummary.js'), 'utf8');
  assert.ok(page.includes('/api/app/commercial'));
  assert.ok(!page.includes('method: \'PATCH\''));
  assert.ok(!page.includes('method: \'POST\''));
  assert.ok(ui.includes('commercial-shared-detail-'));
  assert.ok(ui.includes('/app/prospects/'));
  assert.ok(ui.includes('/app/clients'));
  assert.ok(ui.includes('/admin/company-master'));
  assert.ok(ui.includes('This does not take payment'));
});
