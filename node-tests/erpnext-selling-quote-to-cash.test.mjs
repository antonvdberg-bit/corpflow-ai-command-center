/**
 * #1056 / #1166 ERPNext selling / quote-to-cash.
 * In-memory Frappe stand-in. Does not print secrets. Live apply is a separate script.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { canMarkFinanciallyApproved } from '../lib/revenue/commercial-approval.js';
import {
  erpnextQuotationPointerFromLead,
  projectCommercialRowsFromLeads,
} from '../lib/app/commercial-summary.js';
import { fixtureProspectLeadRows } from '../lib/app/prospect-operations-workspace.js';
import {
  BRIDGE_ID,
  CANONICAL_VERDICT,
  POINTER_SCHEMA,
  SELLING_QUOTATION_SUB_VERDICT,
  acceptedCommercialRecordMechanism,
  buildDraftQuotationPayload,
  buildSellingIdempotencyKey,
  classifyAccountingFoundation,
  createMemoryReferenceStore,
  evaluateProceedApprovedFromSellingPath,
  evaluateQuoteToCashReadiness,
  extractSellingLeadIdFromText,
  invoiceDoesNotGrantProceedApproved,
  loadSellingQuoteToCashConfig,
  mapPaymentEvidenceWithoutPaymentEntry,
  proveSellingQuotationIdempotency,
  quotationTitleFor,
  reconcileDraftQuotation,
  resetSellingQuoteToCashConfigCache,
  rowMatchesFrappeFilter,
  salesInvoicePostingAllowed,
  usdReuseProof,
} from '../lib/erpnext/selling-quote-to-cash.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(REPO_ROOT, 'scripts', 'erpnext', 'apply-selling-quote-to-cash.mjs');
const SECRETISH = /sk_live|POSTGRES_URL\s*[:=]\s*\S+|ERPNEXT_API_SECRET\s*[:=]\s*\S+|eyJhbGci/;

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

function asString(v) {
  return v == null ? '' : String(v).trim();
}

function createMemoryFrappeClient(seed = {}) {
  /** @type {Map<string, Map<string, Record<string, unknown>>>} */
  const docs = new Map();
  const httpLog = [];
  let failNext = null;
  let qtnSeq = 0;

  function bucket(doctype) {
    if (!docs.has(doctype)) docs.set(doctype, new Map());
    return docs.get(doctype);
  }

  for (const [doctype, rows] of Object.entries(seed)) {
    for (const row of rows) {
      const name = asString(row.name);
      bucket(doctype).set(name, { ...row, name });
    }
  }

  function listRows(doctype, filters) {
    const rows = [...bucket(doctype).values()];
    if (!Array.isArray(filters) || !filters.length) return rows;
    return rows.filter((row) => filters.every((filter) => rowMatchesFrappeFilter(row, filter)));
  }

  return {
    kind: 'memory',
    httpLog,
    failOnce(error) {
      failNext = error;
    },
    snapshot(doctype) {
      return [...bucket(doctype).values()].map((row) => ({ ...row }));
    },
    async list(doctype, options = {}) {
      if (failNext && failNext.op === 'list' && (!failNext.doctype || failNext.doctype === doctype)) {
        const err = failNext;
        failNext = null;
        httpLog.push({ op: 'list', doctype, http: err.http || 500 });
        return { ok: false, http: err.http || 500, rows: [], error: err.error || 'SEARCH_FAILED' };
      }
      httpLog.push({ op: 'list', doctype, http: 200 });
      return { ok: true, http: 200, rows: listRows(doctype, options.filters).map((row) => ({ ...row })), error: null };
    },
    async get(doctype, name) {
      const row = bucket(doctype).get(asString(name));
      if (!row) return { ok: false, http: 404, row: null, error: 'NOT_FOUND' };
      httpLog.push({ op: 'get', doctype, http: 200, name });
      return { ok: true, http: 200, row: { ...row }, error: null };
    },
    async create(doctype, payload) {
      if (failNext && failNext.op === 'create' && (!failNext.doctype || failNext.doctype === doctype)) {
        const err = failNext;
        failNext = null;
        httpLog.push({ op: 'create', doctype, http: err.http || 500 });
        return { ok: false, http: err.http || 500, row: null, error: err.error || 'CREATE_FAILED' };
      }
      const store = bucket(doctype);
      qtnSeq += 1;
      const name = asString(payload.name) || `SAL-QTN-2026-${String(qtnSeq).padStart(5, '0')}`;
      const items = (payload.items || []).map((item) => ({
        ...item,
        rate: item.rate ?? 45000,
        amount: (item.qty || 1) * (item.rate ?? 45000),
      }));
      const row = {
        ...payload,
        name,
        docstatus: payload.docstatus ?? 0,
        status: payload.status || 'Draft',
        party_name: payload.party_name,
        customer_name: payload.party_name,
        grand_total: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        items,
        taxes_and_charges: payload.taxes_and_charges || '',
      };
      store.set(row.name, row);
      httpLog.push({ op: 'create', doctype, http: 200, name: row.name });
      return { ok: true, http: 200, row: { ...row }, error: null };
    },
    async update(doctype, name, payload) {
      const store = bucket(doctype);
      const current = store.get(asString(name));
      if (!current) return { ok: false, http: 404, row: null, error: 'NOT_FOUND' };
      const row = { ...current, ...payload, name: current.name, items: current.items };
      store.set(current.name, row);
      httpLog.push({ op: 'update', doctype, http: 200, name: current.name });
      return { ok: true, http: 200, row: { ...row }, error: null };
    },
  };
}

function syntheticEvent(overrides = {}) {
  const fixture = readJson('fixtures/erpnext-selling-quote-to-cash/synthetic-engagement.json');
  return {
    lead_id: fixture.lead_id,
    synthetic: true,
    product: fixture.product,
    customer: fixture.customer,
    legal_name: fixture.legal_name,
    erpnext_lead: fixture.erpnext_lead,
    erpnext_opportunity: fixture.erpnext_opportunity,
    contact: fixture.contact,
    address: fixture.address,
    intake: { ...fixture },
    qualification_json: fixture.qualification_json,
    ...overrides,
  };
}

function completeApprovalRecord(overrides = {}) {
  return {
    product: 'website-rescue',
    proposal: {
      status: 'provided_to_client',
      version: 'SAL-QTN-2026-00099',
      scope_summary: 'Synthetic Website Rescue landing-page rescue.',
      currency: 'MUR',
      setup_price: 45000,
      payment_terms: '50% deposit by manual bank transfer.',
    },
    acceptance: {
      status: 'accepted',
      accepted_by: 'Lee Synthetic',
      acceptance_timestamp: '2026-08-26T04:00:00Z',
    },
    payment_evidence: {
      status: 'recorded',
      evidence_type: 'bank_transfer_reference',
      evidence_ref: 'SYN-1056-POP-REF',
      amount_evidenced: 22500,
      currency: 'MUR',
    },
    approved_by: 'Anton van den Berg',
    approval_timestamp: '2026-08-26T04:05:00Z',
    ...overrides,
  };
}

test('#1056 config, fixture, docs, and apply script exist without secret values', () => {
  resetSellingQuoteToCashConfigCache();
  const cfg = loadSellingQuoteToCashConfig();
  assert.equal(cfg.schema, 'corpflow.erpnext.selling_quote_to_cash.v1');
  assert.equal(cfg.issue, 1056);
  assert.equal(cfg.continuation_issue, 1166);
  assert.equal(cfg.bridge_id, BRIDGE_ID);
  assert.equal(cfg.verdict, CANONICAL_VERDICT);
  assert.equal(cfg.selling_quotation_sub_verdict, SELLING_QUOTATION_SUB_VERDICT);
  assert.equal(cfg.no_second_crm, true);
  assert.equal(cfg.no_sales_invoice_posting, true);
  assert.equal(cfg.no_payment_entry, true);
  assert.equal(cfg.quotation.apply_taxes, false);
  assert.equal(cfg.primary_currency, 'MUR');
  assert.ok(cfg.forbidden_customer_names.includes('Prestige Procurement'));

  const files = [
    'docs/erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md',
    'docs/decisions/20260826-erpnext-selling-quote-to-cash.md',
    'config/erpnext-selling-quote-to-cash.v1.json',
    'fixtures/erpnext-selling-quote-to-cash/synthetic-engagement.json',
  ];
  for (const rel of files) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    assert.doesNotMatch(read(rel), SECRETISH);
  }
  for (const rel of ['lib/erpnext/selling-quote-to-cash.js', 'scripts/erpnext/apply-selling-quote-to-cash.mjs']) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    assert.doesNotMatch(read(rel), /sk_live/);
  }
  const src = read('scripts/erpnext/apply-selling-quote-to-cash.mjs');
  assert.match(src, /ERPNEXT_BASE_URL/);
  assert.match(src, /Do NOT require MASTER_ADMIN_KEY/);
  assert.doesNotMatch(src, /Authorization:.*MASTER_ADMIN_KEY/);
  assert.match(src, /postgres_persist: not_written/);
  assert.match(src, /Sales Invoice posting/);
});

test('idempotency key is stable and title carries the TEST-ONLY sentinel', () => {
  const key = buildSellingIdempotencyKey('cf1018-synthetic-sales-lifecycle');
  assert.equal(key, 'corpflow.selling_q2c.v1:lead=cf1018-synthetic-sales-lifecycle');
  assert.equal(extractSellingLeadIdFromText(`x | ${key} | y`), 'cf1018-synthetic-sales-lifecycle');
  const title = quotationTitleFor('Website Rescue', 'cf1018-synthetic-sales-lifecycle');
  assert.match(title, /TEST-ONLY DO NOT SEND/);
  assert.match(title, /cf1018-synthetic-sales-lifecycle/);
  const payload = buildDraftQuotationPayload(syntheticEvent(), { now: '2026-08-26T04:00:00Z' });
  assert.equal(payload.currency, 'MUR');
  assert.equal(payload.conversion_rate, 1);
  assert.equal(payload.items[0].item_code, 'CF-RD-LANDING-RESCUE');
  assert.equal(payload.quotation_to, 'Customer');
  assert.equal(POINTER_SCHEMA, 'corpflow.qualification.erpnext.v1');
});

test('first run creates one draft MUR quotation; replay updates and does not duplicate', async () => {
  const client = createMemoryFrappeClient();
  const event = syntheticEvent();
  const store = createMemoryReferenceStore([
    { id: event.lead_id, qualification_json: event.qualification_json },
  ]);
  const proof = await proveSellingQuotationIdempotency(event, {
    client,
    referenceStore: store,
    now: '2026-08-26T04:00:00Z',
  });

  assert.equal(proof.first.ok, true, proof.first.error);
  assert.equal(proof.first.action, 'CREATE');
  assert.equal(proof.second.ok, true, proof.second.error);
  assert.equal(proof.second.action, 'UPDATE');
  assert.equal(proof.created_on_replay, false);
  assert.equal(proof.second.duplicate_quotation_count, 1);
  assert.equal(client.snapshot('Quotation').length, 1);
  assert.equal(client.snapshot('Sales Invoice').length, 0);
  assert.equal(client.snapshot('Payment Entry').length, 0);
  assert.equal(proof.second.sales_invoice_created, false);
  assert.equal(proof.second.payment_entry_created, false);
  assert.equal(proof.second.taxes_applied, false);
  assert.equal(proof.second.readback.docstatus, 0);
  assert.equal(proof.second.readback.currency, 'MUR');
  assert.equal(proof.second.readback.grand_total, 45000);
  assert.equal(proof.second.readback.item_code, 'CF-RD-LANDING-RESCUE');
  assert.equal(proof.second.postgres_persist, 'not_written');

  const stored = store.getLead(event.lead_id);
  assert.equal(stored.qualification_json.erpnext.schema, POINTER_SCHEMA);
  assert.equal(stored.qualification_json.erpnext.bridge, 'lead_opportunity_promotion');
  assert.equal(stored.qualification_json.erpnext.quotation_bridge, BRIDGE_ID);
  assert.equal(stored.qualification_json.erpnext.customer, 'CF1018 Synthetic Sales Lifecycle Ltd');
  assert.equal(stored.qualification_json.erpnext.erpnext_quotation, proof.second.erpnext_quotation);
});

test('existing unmatched draft for the same customer is a conflict, not a second quote', async () => {
  const client = createMemoryFrappeClient({
    Quotation: [
      {
        name: 'SAL-QTN-2026-00999',
        party_name: 'CF1018 Synthetic Sales Lifecycle Ltd',
        currency: 'MUR',
        docstatus: 0,
        title: 'unrelated draft',
      },
    ],
  });
  const result = await reconcileDraftQuotation(syntheticEvent(), {
    client,
    referenceStore: createMemoryReferenceStore(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'EXISTING_DRAFT_WITHOUT_KEY');
  assert.equal(client.snapshot('Quotation').length, 1);
});

test('real prospect, secrets, Prestige names, and missing upstream fail closed', async () => {
  const client = createMemoryFrappeClient();
  const store = createMemoryReferenceStore();

  const realForced = await reconcileDraftQuotation(
    { ...syntheticEvent(), synthetic: false, intake: { ...syntheticEvent().intake, synthetic: false } },
    { client, referenceStore: store },
  );
  assert.equal(realForced.ok, false);
  assert.equal(realForced.reason, 'REAL_PROSPECT_REQUIRES_ANTON');

  const prestige = await reconcileDraftQuotation(
    { ...syntheticEvent(), customer: 'Prestige Procurement', legal_name: 'Prestige Procurement' },
    { client, referenceStore: store },
  );
  assert.equal(prestige.ok, false);
  assert.equal(prestige.reason, 'FORBIDDEN_CUSTOMER_NAME');

  const noOpp = await reconcileDraftQuotation(
    { ...syntheticEvent(), erpnext_opportunity: '', intake: { ...syntheticEvent().intake, erpnext_opportunity: '' } },
    { client, referenceStore: store },
  );
  assert.equal(noOpp.ok, false);
  assert.equal(noOpp.reason, 'UPSTREAM_OPPORTUNITY_REQUIRED');

  const secreted = await reconcileDraftQuotation(
    { ...syntheticEvent(), intake: { ...syntheticEvent().intake, api_key: 'nope' } },
    { client, referenceStore: store },
  );
  assert.equal(secreted.ok, false);
  assert.equal(secreted.reason, 'SECRET_FIELDS_FORBIDDEN');
  assert.equal(client.snapshot('Quotation').length, 0);
});

test('search failure leaves the pointer unchanged and does not create a quotation', async () => {
  const client = createMemoryFrappeClient();
  client.failOnce({ op: 'list', doctype: 'Quotation', http: 500, error: 'SEARCH_FAILED' });
  const store = createMemoryReferenceStore([
    { id: 'cf1018-synthetic-sales-lifecycle', qualification_json: { erpnext: { customer: 'CF1018 Synthetic Sales Lifecycle Ltd' } } },
  ]);
  const result = await reconcileDraftQuotation(syntheticEvent(), { client, referenceStore: store });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'QUOTATION_SEARCH_FAILED');
  assert.equal(result.pointer_persisted, false);
  assert.equal(client.snapshot('Quotation').length, 0);
  assert.equal(store.getLead('cf1018-synthetic-sales-lifecycle').qualification_json.erpnext.erpnext_quotation, undefined);
});

test('accepted commercial record uses standard ERPNext, not a custom engine', () => {
  const mechanism = acceptedCommercialRecordMechanism();
  assert.equal(mechanism.custom_acceptance_engine, false);
  assert.equal(mechanism.sales_order_required, false);
  assert.equal(mechanism.primary_erpnext_doctype, 'Quotation');
  assert.equal(mechanism.this_packet_submits_quotation, false);
  assert.match(mechanism.erpnext_acceptance, /Comment/);
});

test('Sales Invoice posting is blocked until accountant foundation is approved', () => {
  const blocked = classifyAccountingFoundation();
  assert.equal(blocked.ok, false);
  assert.equal(blocked.classification, 'BLOCKED BY ACCOUNTANT FOUNDATION');
  assert.ok(blocked.blockers.includes('COA_NOT_ACCOUNTANT_APPROVED'));
  assert.equal(salesInvoicePostingAllowed().allowed, false);
  assert.equal(salesInvoicePostingAllowed({ accountant_coa_approved: true, accountant_tax_approved: true, accountant_defaults_approved: true }).allowed, true);
});

test('creating or reading a Sales Invoice does not grant Proceed Approved', () => {
  const proof = invoiceDoesNotGrantProceedApproved({
    doctype: 'Sales Invoice',
    name: 'ACC-SINV-2026-00001',
    currency: 'MUR',
    grand_total: 45000,
    tc_name: 'CF882 CorpFlowAI Commercial Terms',
    docstatus: 0,
  });
  assert.equal(proof.ok, true);
  assert.equal(proof.financially_approved, false);
  assert.equal(proof.gate_ok, false);
  assert.ok(proof.blockers.includes('MISSING_ACCEPTANCE'));
  assert.ok(proof.blockers.includes('MISSING_PAYMENT_EVIDENCE'));
  assert.ok(proof.blockers.includes('MISSING_FINANCIAL_APPROVER'));
});

test('manual payment evidence is recorded on the #714 rail without a Payment Entry', () => {
  const mapped = mapPaymentEvidenceWithoutPaymentEntry({
    quotation: 'SAL-QTN-2026-00099',
    invoice: 'ACC-SINV-2026-00001',
    amount: 22500,
    currency: 'MUR',
  });
  assert.equal(mapped.payment_entry_created, false);
  assert.equal(mapped.payment_entry_forbidden, true);
  assert.equal(mapped.erpnext_payment_entry, null);
  assert.equal(mapped.rail, 714);
  assert.equal(mapped.payment_evidence.status, 'recorded');
});

test('Proceed Approved remains fail-closed until proposal, acceptance, payment evidence, and named approver exist', () => {
  const incomplete = evaluateProceedApprovedFromSellingPath({
    product: 'website-rescue',
    proposal: {
      status: 'draft',
      version: 'SAL-QTN-2026-00099',
      scope_summary: 'Synthetic Website Rescue landing-page rescue.',
      currency: 'MUR',
      setup_price: 45000,
      payment_terms: '50% deposit',
    },
  });
  assert.equal(incomplete.financially_approved, false);
  assert.ok(incomplete.blockers.includes('MISSING_ACCEPTANCE'));

  const complete = evaluateProceedApprovedFromSellingPath(completeApprovalRecord());
  assert.equal(complete.financially_approved, true);
  assert.equal(canMarkFinanciallyApproved(completeApprovalRecord()).ok, true);
});

test('readiness verdict stays blocked by accountant foundation even when the quotation path is proven', () => {
  const invoiceGate = invoiceDoesNotGrantProceedApproved({
    name: 'ACC-SINV-2026-00001',
    currency: 'MUR',
    grand_total: 45000,
    tc_name: 'CF882 CorpFlowAI Commercial Terms',
    docstatus: 0,
  });
  const readiness = evaluateQuoteToCashReadiness({
    upstream: {
      erpnext_lead: 'CRM-LEAD-2026-00009',
      erpnext_opportunity: 'CRM-OPP-2026-00003',
      customer: 'CF1018 Synthetic Sales Lifecycle Ltd',
    },
    quotation: { name: 'SAL-QTN-2026-00099', docstatus: 0 },
    proceed_approved_gate: { ok: true },
    invoice_does_not_approve: invoiceGate,
    sales_invoice_posted: false,
    payment_entry_created: false,
  });
  assert.equal(readiness.selling_quotation_ready, true);
  assert.equal(readiness.selling_quotation_sub_verdict, SELLING_QUOTATION_SUB_VERDICT);
  assert.equal(readiness.verdict, CANONICAL_VERDICT);
  assert.equal(readiness.exact_blocker, 'BLOCKED BY ACCOUNTANT FOUNDATION');
  assert.equal(usdReuseProof().quotation, 'SAL-QTN-2026-00001');
  assert.equal(usdReuseProof().created_this_packet, false);
});

test('apply script dry-run does not call ERPNext and does not print secrets', () => {
  const result = spawnSync(process.execPath, [APPLY, '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      ERPNEXT_API_SECRET: 'must-not-appear-in-output-1234567890',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const out = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.match(out, /dry_run: 1/);
  assert.match(out, /CF1018 Synthetic Sales Lifecycle Ltd/);
  assert.match(out, /auth_fallback_master_admin_key: forbidden/);
  assert.match(out, /Sales Invoice posting/);
  assert.doesNotMatch(out, /must-not-appear-in-output-1234567890/);
});

test('live apply-log captures synthetic IDs, replay UPDATE, PDF, and no secret values', () => {
  resetSellingQuoteToCashConfigCache();
  const rel = 'artifacts/erpnext/selling-quote-to-cash-1056/apply-log.json';
  assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
  const log = JSON.parse(read(rel));
  const cfg = loadSellingQuoteToCashConfig();
  assert.equal(log.issue, 1056);
  assert.equal(log.secrets_printed, false);
  assert.equal(log.postgres_written, false);
  assert.equal(log.identity, 'integrations@corpflowai.com');
  assert.equal(log.first.action, 'CREATE');
  assert.equal(log.second.action, 'UPDATE');
  assert.equal(log.created_on_replay, false);
  assert.equal(log.duplicate_quotation_count, 1);
  assert.equal(log.second.erpnext_quotation, cfg.live_proof.erpnext_quotation);
  assert.equal(log.second.readback.currency, 'MUR');
  assert.equal(log.second.readback.grand_total, 45000);
  assert.equal(log.second.readback.docstatus, 0);
  assert.equal(log.second.sales_invoice_created, false);
  assert.equal(log.second.payment_entry_created, false);
  assert.equal(log.pdf.ok, true);
  assert.equal(log.verdict, CANONICAL_VERDICT);
  assert.equal(existsSync(path.join(REPO_ROOT, log.pdf.outfile)), true);
  const blob = JSON.stringify(log);
  assert.doesNotMatch(blob, /sk_live|eyJhbGci|postgres:\/\//i);
  assert.doesNotMatch(blob, /ERPNEXT_API_SECRET":\s*"[^"]+"/);
});

test('Commercial Workspace can reference the selling quotation without a second ledger', () => {
  resetSellingQuoteToCashConfigCache();
  const cfg = loadSellingQuoteToCashConfig();
  const pointer = erpnextQuotationPointerFromLead({
    id: 'cf1018-synthetic-sales-lifecycle',
    qualification_json: {
      erpnext: {
        schema: POINTER_SCHEMA,
        quotation_bridge: BRIDGE_ID,
        erpnext_quotation: cfg.live_proof.erpnext_quotation,
        customer: cfg.live_proof.customer,
      },
    },
  });
  assert.equal(pointer, 'SAL-QTN-2026-00005');
  const rows = projectCommercialRowsFromLeads([
    {
      id: 'cf1018-synthetic-sales-lifecycle',
      organisation_name: cfg.live_proof.customer,
      product: 'website-rescue',
      qualification_json: {
        erpnext: {
          erpnext_quotation: cfg.live_proof.erpnext_quotation,
          customer: cfg.live_proof.customer,
        },
      },
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].erpnext.quotation, 'SAL-QTN-2026-00005');
  assert.equal(rows[0].erpnext.authoritative, true);
  assert.equal(rows[0].erpnext.mutated, false);
  assert.equal(rows[0].quotation_evidence_path, '/app/commercial/cf1018-synthetic-sales-lifecycle');
  const fixtureRows = projectCommercialRowsFromLeads(fixtureProspectLeadRows());
  const cf1018 = fixtureRows.find((row) => row.id === 'cf1018-synthetic-sales-lifecycle');
  assert.equal(cf1018.erpnext.quotation, 'SAL-QTN-2026-00005');
  assert.equal(cf1018.financially_approved, false);
  const doc = read('docs/erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md');
  assert.match(doc, /#1166/);
  assert.match(doc, /SAL-QTN-2026-00005/);
  assert.match(doc, /BLOCKED BY ACCOUNTANT FOUNDATION/);
});
