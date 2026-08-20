/**
 * WP2 ERPNext sales lifecycle bridge (#1018).
 * Uses an in-memory Frappe stand-in. Does not print secrets.
 * Live apply is a separate script.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { POINTER_SCHEMA as CUSTOMER_POINTER_SCHEMA } from '../lib/erpnext/customer-bridge.js';
import {
  BRIDGE_ID,
  CANONICAL_VERDICT,
  POINTER_SCHEMA,
  buildSalesLifecycleIdempotencyKey,
  classifyLifecycleStage,
  createMemoryReferenceStore,
  extractCorpflowLeadIdFromText,
  lifecyclePlan,
  loadSalesLifecycleBridgeConfig,
  opportunityTitleFor,
  proveSalesLifecycleIdempotency,
  reconcileSalesLifecycle,
  resetSalesLifecycleBridgeConfigCache,
  rowMatchesFrappeFilter,
} from '../lib/erpnext/sales-lifecycle-bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(REPO_ROOT, 'scripts', 'erpnext', 'apply-sales-lifecycle-bridge.mjs');
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

function nextSuffixName(existing, base) {
  if (!existing.has(base)) return base;
  let n = 1;
  while (existing.has(`${base} - ${n}`)) n += 1;
  return `${base} - ${n}`;
}

function createMemoryFrappeClient(seed = {}) {
  /** @type {Map<string, Map<string, Record<string, unknown>>>} */
  const docs = new Map();
  const httpLog = [];
  let failNext = null;
  let leadSeq = 0;
  let oppSeq = 0;

  function bucket(doctype) {
    if (!docs.has(doctype)) docs.set(doctype, new Map());
    return docs.get(doctype);
  }

  for (const [doctype, rows] of Object.entries(seed)) {
    for (const row of rows) {
      const name = asString(row.name || row.customer_name);
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
      let name;
      if (doctype === 'Lead') {
        leadSeq += 1;
        name = asString(payload.name) || `CRM-LEAD-2026-${String(leadSeq).padStart(5, '0')}`;
      } else if (doctype === 'Opportunity') {
        oppSeq += 1;
        name = asString(payload.name) || `CRM-OPP-2026-${String(oppSeq).padStart(5, '0')}`;
      } else if (doctype === 'Customer') {
        name = nextSuffixName(store, asString(payload.name || payload.customer_name));
      } else if (doctype === 'Contact' && payload.first_name) {
        name =
          payload.name ||
          `${payload.first_name}${payload.last_name ? ` ${payload.last_name}` : ''}-${payload.company_name || 'Customer'}`;
      } else if (doctype === 'Address') {
        name = payload.name || `${payload.address_title}-${payload.address_type || 'Billing'}`;
      } else {
        name = asString(payload.name) || `${doctype}-${store.size + 1}`;
      }
      const row = { ...payload, name, disabled: payload.disabled || 0 };
      store.set(row.name, row);
      httpLog.push({ op: 'create', doctype, http: 200, name: row.name });
      return { ok: true, http: 200, row: { ...row }, error: null };
    },
    async update(doctype, name, payload) {
      const store = bucket(doctype);
      const current = store.get(asString(name));
      if (!current) return { ok: false, http: 404, row: null, error: 'NOT_FOUND' };
      const row = { ...current, ...payload, name: current.name };
      store.set(current.name, row);
      httpLog.push({ op: 'update', doctype, http: 200, name: current.name });
      return { ok: true, http: 200, row: { ...row }, error: null };
    },
  };
}

function syntheticEvent(overrides = {}) {
  const fixture = readJson('fixtures/erpnext-sales-lifecycle-bridge/synthetic-prospect.json');
  return {
    lead_id: fixture.lead_id,
    stage: fixture.stage,
    synthetic: true,
    product: fixture.product,
    intake: { ...fixture },
    qualification_json: fixture.qualification_json,
    ...overrides,
  };
}

test('#1018 config, fixture, docs, and apply script exist without secret values', () => {
  resetSalesLifecycleBridgeConfigCache();
  const cfg = loadSalesLifecycleBridgeConfig();
  assert.equal(cfg.schema, 'corpflow.erpnext.sales_lifecycle_bridge.v1');
  assert.equal(cfg.issue, 1018);
  assert.equal(cfg.bridge_id, BRIDGE_ID);
  assert.equal(cfg.verdict, CANONICAL_VERDICT);
  assert.equal(cfg.no_postgres_schema, true);
  assert.equal(cfg.no_quotation, true);
  assert.equal(cfg.persistence.approved_pointer_location, 'leads.qualification_json.erpnext');
  assert.deepEqual(cfg.create_opportunity_classes, ['qualified', 'proposal_ready', 'won']);
  assert.deepEqual(cfg.create_customer_classes, ['proposal_ready', 'won']);
  assert.ok(cfg.forbidden_customer_names.includes('Prestige Procurement'));

  const files = [
    'docs/erpnext/ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md',
    'docs/decisions/20260820-erpnext-sales-lifecycle-bridge.md',
    'config/erpnext-sales-lifecycle-bridge.v1.json',
    'fixtures/erpnext-sales-lifecycle-bridge/synthetic-prospect.json',
  ];
  for (const rel of files) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    assert.doesNotMatch(read(rel), SECRETISH);
  }
  for (const rel of ['lib/erpnext/sales-lifecycle-bridge.js', 'scripts/erpnext/apply-sales-lifecycle-bridge.mjs']) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    assert.doesNotMatch(read(rel), /sk_live/);
  }
  const src = read('scripts/erpnext/apply-sales-lifecycle-bridge.mjs');
  assert.match(src, /ERPNEXT_BASE_URL/);
  assert.match(src, /Do NOT require MASTER_ADMIN_KEY/);
  assert.doesNotMatch(src, /Authorization:.*MASTER_ADMIN_KEY/);
  assert.match(src, /postgres_persist: not_written/);
});

test('lifecycle transition rules are deterministic', () => {
  assert.equal(classifyLifecycleStage('new'), 'not_qualified');
  assert.equal(classifyLifecycleStage('qualified'), 'qualified');
  assert.equal(classifyLifecycleStage('proposal_ready'), 'proposal_ready');
  assert.equal(classifyLifecycleStage('won'), 'won');
  assert.equal(classifyLifecycleStage('lost'), 'lost');
  assert.equal(classifyLifecycleStage('mystery'), 'unknown');

  const notQualified = lifecyclePlan('new');
  assert.equal(notQualified.create_lead, true);
  assert.equal(notQualified.create_opportunity, false);
  assert.equal(notQualified.create_customer, false);

  const qualified = lifecyclePlan('qualified');
  assert.equal(qualified.create_opportunity, true);
  assert.equal(qualified.create_customer, false);

  const proposal = lifecyclePlan('proposal_ready');
  assert.equal(proposal.create_opportunity, true);
  assert.equal(proposal.create_customer, true);

  const won = lifecyclePlan('won');
  assert.equal(won.lead_status, 'Converted');
  assert.equal(won.opportunity_status, 'Converted');
  assert.equal(won.create_customer, true);

  const lost = lifecyclePlan('lost');
  assert.equal(lost.create_opportunity, false);
  assert.equal(lost.create_customer, false);
  assert.equal(lost.update_opportunity_if_exists, true);
});

test('idempotency key is stable and pointer schema matches WP1', () => {
  const key = buildSalesLifecycleIdempotencyKey('cf1018-synthetic-sales-lifecycle');
  assert.equal(key, 'corpflow.sales_lifecycle.v1:lead=cf1018-synthetic-sales-lifecycle');
  assert.equal(POINTER_SCHEMA, CUSTOMER_POINTER_SCHEMA);
  assert.equal(extractCorpflowLeadIdFromText(`x | ${key} | y`), 'cf1018-synthetic-sales-lifecycle');
  assert.match(opportunityTitleFor('CF1018 Synthetic Sales Lifecycle Ltd', 'cf1018-synthetic-sales-lifecycle'), /cf1018-synthetic-sales-lifecycle/);
});

test('unqualified stage creates only a Lead; replay updates and does not create Opportunity or Customer', async () => {
  const client = createMemoryFrappeClient();
  const event = syntheticEvent({ stage: 'new' });
  const store = createMemoryReferenceStore([{ id: event.lead_id, stage: 'new' }]);
  const proof = await proveSalesLifecycleIdempotency(event, { client, referenceStore: store });
  assert.equal(proof.first.ok, true, proof.first.error);
  assert.equal(proof.first.lead_action, 'CREATE');
  assert.equal(proof.first.opportunity_action, 'NONE');
  assert.equal(proof.first.customer_action, 'NONE');
  assert.equal(proof.second.lead_action, 'UPDATE');
  assert.equal(proof.created_on_replay, false);
  assert.equal(client.snapshot('Lead').length, 1);
  assert.equal(client.snapshot('Opportunity').length, 0);
  assert.equal(client.snapshot('Customer').length, 0);
  assert.equal(store.getLead(event.lead_id).qualification_json.erpnext.bridge, BRIDGE_ID);
});

test('qualified stage creates Lead + Opportunity but not Customer', async () => {
  const client = createMemoryFrappeClient();
  const result = await reconcileSalesLifecycle(syntheticEvent({ stage: 'qualified' }), {
    client,
    referenceStore: createMemoryReferenceStore(),
  });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.lead_action, 'CREATE');
  assert.equal(result.opportunity_action, 'CREATE');
  assert.equal(result.customer_action, 'NONE');
  assert.equal(client.snapshot('Customer').length, 0);
  assert.equal(result.duplicate_lead_count, 1);
  assert.equal(result.duplicate_opportunity_count, 1);
});

test('proposal_ready first run creates Lead, Opportunity and Customer; replay updates all three', async () => {
  const client = createMemoryFrappeClient();
  const event = syntheticEvent();
  const store = createMemoryReferenceStore([{ id: event.lead_id, stage: event.stage, qualification_json: event.qualification_json }]);
  const proof = await proveSalesLifecycleIdempotency(event, { client, referenceStore: store, now: '2026-08-20T02:00:00Z' });

  assert.equal(proof.first.ok, true, proof.first.error);
  assert.equal(proof.first.lead_action, 'CREATE');
  assert.equal(proof.first.opportunity_action, 'CREATE');
  assert.equal(proof.first.customer_action, 'CREATE');
  assert.equal(proof.second.ok, true, proof.second.error);
  assert.equal(proof.second.lead_action, 'UPDATE');
  assert.equal(proof.second.opportunity_action, 'UPDATE');
  assert.equal(proof.second.customer_action, 'UPDATE');
  assert.equal(proof.created_on_replay, false);
  assert.equal(proof.second.duplicate_lead_count, 1);
  assert.equal(proof.second.duplicate_opportunity_count, 1);
  assert.equal(proof.second.duplicate_customer_count, 1);
  assert.equal(client.snapshot('Lead').length, 1);
  assert.equal(client.snapshot('Opportunity').length, 1);
  assert.equal(client.snapshot('Customer').filter((row) => !row.disabled).length, 1);
  assert.equal(proof.second.customer, 'CF1018 Synthetic Sales Lifecycle Ltd');
  assert.equal(client.snapshot('Customer')[0].lead_name, proof.second.erpnext_lead);
  assert.equal(asString(client.snapshot('Lead')[0].utm_content), 'corpflow.sales_lifecycle.v1:lead=cf1018-synthetic-sales-lifecycle');

  const stored = store.getLead(event.lead_id);
  assert.equal(stored.qualification_json.erpnext.schema, POINTER_SCHEMA);
  assert.equal(stored.qualification_json.erpnext.bridge, BRIDGE_ID);
  assert.equal(stored.qualification_json.erpnext.customer, 'CF1018 Synthetic Sales Lifecycle Ltd');
  assert.equal(stored.qualification_json.erpnext.erpnext_lead, proof.second.erpnext_lead);
  assert.equal(stored.qualification_json.erpnext.erpnext_opportunity, proof.second.erpnext_opportunity);
  assert.equal(proof.second.postgres_persist, 'not_written');
});

test('existing WP1 Customer with the same legal name is reused rather than duplicated', async () => {
  const client = createMemoryFrappeClient({
    Customer: [
      {
        name: 'CF1018 Synthetic Sales Lifecycle Ltd',
        customer_name: 'CF1018 Synthetic Sales Lifecycle Ltd',
        customer_group: 'Commercial',
        territory: 'Mauritius',
        default_currency: 'MUR',
        customer_details: 'idempotency_key=corpflow.customer_bridge.v1:lead=cf1018-synthetic-sales-lifecycle',
        disabled: 0,
      },
    ],
    Contact: [
      {
        name: 'Lee Synthetic-CF1018 Synthetic Sales Lifecycle Ltd',
        email_id: 'cf1018.synthetic@example.invalid',
        company_name: 'CF1018 Synthetic Sales Lifecycle Ltd',
      },
    ],
    Address: [
      {
        name: 'CF1018 Synthetic Sales Lifecycle Ltd-Billing',
        address_title: 'CF1018 Synthetic Sales Lifecycle Ltd',
        address_type: 'Billing',
        address_line1: 'old',
        city: 'Port Louis',
        country: 'Mauritius',
      },
    ],
  });
  const result = await reconcileSalesLifecycle(syntheticEvent(), { client, referenceStore: createMemoryReferenceStore() });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.customer_action, 'UPDATE');
  assert.equal(client.snapshot('Customer').length, 1);
  assert.equal(result.duplicate_customer_count, 1);
});

test('lost stage creates Lead only and does not create Opportunity or Customer', async () => {
  const client = createMemoryFrappeClient();
  const result = await reconcileSalesLifecycle(syntheticEvent({ stage: 'lost' }), {
    client,
    referenceStore: createMemoryReferenceStore(),
  });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.lead_action, 'CREATE');
  assert.equal(result.opportunity_action, 'NONE');
  assert.equal(result.customer_action, 'NONE');
  assert.equal(result.readback.lead_status, 'Do Not Contact');
  assert.equal(client.snapshot('Opportunity').length, 0);
});

test('lost stage updates an existing Opportunity to Lost without creating a Customer', async () => {
  const notes = 'idempotency_key=corpflow.sales_lifecycle.v1:lead=cf1018-synthetic-sales-lifecycle';
  const client = createMemoryFrappeClient({
    Lead: [
      {
        name: 'CRM-LEAD-2026-00099',
        company_name: 'CF1018 Synthetic Sales Lifecycle Ltd',
        email_id: 'cf1018.synthetic@example.invalid',
        notes,
        status: 'Open',
      },
    ],
    Opportunity: [
      {
        name: 'CRM-OPP-2026-00099',
        title: opportunityTitleFor('CF1018 Synthetic Sales Lifecycle Ltd', 'cf1018-synthetic-sales-lifecycle'),
        party_name: 'CRM-LEAD-2026-00099',
        opportunity_from: 'Lead',
        notes,
        status: 'Open',
      },
    ],
  });
  const result = await reconcileSalesLifecycle(syntheticEvent({ stage: 'lost' }), {
    client,
    referenceStore: createMemoryReferenceStore(),
  });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.lead_action, 'UPDATE');
  assert.equal(result.opportunity_action, 'UPDATE');
  assert.equal(result.customer_action, 'NONE');
  assert.equal(client.snapshot('Opportunity')[0].status, 'Lost');
  assert.equal(client.snapshot('Customer').length, 0);
});

test('real prospect, secrets, unknown stage, and Prestige names fail closed', async () => {
  const client = createMemoryFrappeClient();
  const store = createMemoryReferenceStore();

  const unknown = await reconcileSalesLifecycle(syntheticEvent({ stage: 'mystery' }), { client, referenceStore: store });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, 'STAGE_UNKNOWN');

  const realForced = await reconcileSalesLifecycle(
    { ...syntheticEvent(), synthetic: false, intake: { ...syntheticEvent().intake, synthetic: false } },
    { client, referenceStore: store },
  );
  assert.equal(realForced.ok, false);
  assert.equal(realForced.reason, 'REAL_PROSPECT_REQUIRES_ANTON');

  const secret = await reconcileSalesLifecycle(
    syntheticEvent({ intake: { ...syntheticEvent().intake, hosting_password: 'should-never-be-sent' } }),
    { client, referenceStore: store },
  );
  assert.equal(secret.ok, false);
  assert.equal(secret.reason, 'SECRET_FIELDS_FORBIDDEN');
  assert.equal(JSON.stringify(secret.audit).includes('should-never-be-sent'), false);

  const prestige = await reconcileSalesLifecycle(
    syntheticEvent({
      intake: { ...syntheticEvent().intake, legal_name: 'Prestige Procurement', business_display_name: 'Prestige Procurement' },
    }),
    { client, referenceStore: store },
  );
  assert.equal(prestige.ok, false);
  assert.equal(prestige.reason, 'FORBIDDEN_CUSTOMER_NAME');
  assert.equal(client.snapshot('Lead').length, 0);
});

test('email owned by another CorpFlowAI Lead is a conflict', async () => {
  const client = createMemoryFrappeClient({
    Lead: [
      {
        name: 'CRM-LEAD-OTHER',
        email_id: 'cf1018.synthetic@example.invalid',
        company_name: 'Someone Else Ltd',
        notes: 'idempotency_key=corpflow.sales_lifecycle.v1:lead=other-lead',
      },
    ],
  });
  const result = await reconcileSalesLifecycle(syntheticEvent(), { client });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'LEAD_EMAIL_OWNED_BY_OTHER_CORPFLOW_REF');
  assert.equal(client.snapshot('Lead').length, 1);
});

test('pre-existing ERPNext Lead with the same email and no CorpFlowAI reference is a conflict', async () => {
  const client = createMemoryFrappeClient({
    Lead: [
      {
        name: 'CRM-LEAD-PREEXISTING',
        email_id: 'cf1018.synthetic@example.invalid',
        company_name: 'Preexisting Ltd',
        notes: 'manual desk lead',
      },
    ],
  });
  const result = await reconcileSalesLifecycle(syntheticEvent(), { client });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'LEAD_EMAIL_PREEXISTING_WITHOUT_CORPFLOW_REF');
  assert.equal(client.snapshot('Opportunity').length, 0);
});

test('retry after Lead create failure leaves the pointer unchanged and later succeeds once', async () => {
  const client = createMemoryFrappeClient();
  const event = syntheticEvent();
  const store = createMemoryReferenceStore([{ id: event.lead_id, qualification_json: { keep: true } }]);
  client.failOnce({ op: 'create', doctype: 'Lead', http: 502, error: 'UPSTREAM' });
  const failed = await reconcileSalesLifecycle(event, { client, referenceStore: store });
  assert.equal(failed.ok, false);
  assert.equal(failed.reason, 'LEAD_CREATE_FAILED');
  assert.equal(failed.pointer, null);
  assert.equal(store.getLead(event.lead_id).qualification_json.erpnext, undefined);
  assert.equal(client.snapshot('Lead').length, 0);

  const recovered = await reconcileSalesLifecycle(event, { client, referenceStore: store });
  assert.equal(recovered.ok, true, recovered.error);
  assert.equal(recovered.lead_action, 'CREATE');
  assert.equal(client.snapshot('Lead').length, 1);
  assert.equal(store.getLead(event.lead_id).qualification_json.erpnext.erpnext_lead, recovered.erpnext_lead);
});

test('Lead search failure does not create a Lead or Opportunity', async () => {
  const client = createMemoryFrappeClient();
  client.failOnce({ op: 'list', doctype: 'Lead', http: 503, error: 'SEARCH_FAILED' });
  const result = await reconcileSalesLifecycle(syntheticEvent(), { client, referenceStore: createMemoryReferenceStore() });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'LEAD_SEARCH_FAILED');
  assert.equal(client.snapshot('Lead').length, 0);
  assert.equal(client.snapshot('Opportunity').length, 0);
});

test('apply script dry-run exits 0 without calling ERPNext and without printing secret values', () => {
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
  assert.doesNotMatch(out, /must-not-appear-in-output-1234567890/);
});

test('live apply-log captures synthetic IDs, replay UPDATE, and no secret values', () => {
  resetSalesLifecycleBridgeConfigCache();
  const rel = 'artifacts/erpnext/sales-lifecycle-bridge-1018/apply-log.json';
  assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
  const log = JSON.parse(read(rel));
  const cfg = loadSalesLifecycleBridgeConfig();
  assert.equal(log.issue, 1018);
  assert.equal(log.secrets_printed, false);
  assert.equal(log.postgres_written, false);
  assert.equal(log.identity, 'integrations@corpflowai.com');
  assert.equal(log.first.lead_action, 'CREATE');
  assert.equal(log.second.lead_action, 'UPDATE');
  assert.equal(log.first.opportunity_action, 'CREATE');
  assert.equal(log.second.opportunity_action, 'UPDATE');
  assert.equal(log.first.customer_action, 'CREATE');
  assert.equal(log.second.customer_action, 'UPDATE');
  assert.equal(log.created_on_replay, false);
  assert.equal(log.duplicate_lead_count, 1);
  assert.equal(log.duplicate_opportunity_count, 1);
  assert.equal(log.duplicate_customer_count, 1);
  assert.equal(log.first.erpnext_lead, cfg.live_proof.erpnext_lead);
  assert.equal(log.second.erpnext_opportunity, cfg.live_proof.erpnext_opportunity);
  assert.equal(log.pointer.customer, cfg.live_proof.customer);
  assert.equal(log.pointer.contact, cfg.live_proof.contact);
  assert.equal(log.pointer.address, cfg.live_proof.address);
  const blob = JSON.stringify(log);
  assert.doesNotMatch(blob, /sk_live|eyJhbGci|postgres:\/\//i);
  assert.doesNotMatch(blob, /ERPNEXT_API_SECRET":\s*"[^"]+"/);
});
