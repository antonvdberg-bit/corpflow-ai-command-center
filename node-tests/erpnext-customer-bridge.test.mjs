/**
 * WP1 ERPNext Customer bridge (#1009).
 * Uses an in-memory Frappe stand-in. Does not print secrets.
 * Live apply is a separate script and is optional for this file.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BRIDGE_ID,
  CANONICAL_VERDICT,
  POINTER_SCHEMA,
  buildIdempotencyKey,
  createMemoryReferenceStore,
  isForbiddenLiveCustomerName,
  loadCustomerBridgeConfig,
  mergeErpnextPointerIntoQualificationJson,
  proveCustomerBridgeIdempotency,
  reconcileQualifiedCustomer,
  resetCustomerBridgeConfigCache,
  rowMatchesFrappeFilter,
  searchExistingCustomerIdentity,
} from '../lib/erpnext/customer-bridge.js';
import { createFrappeRestClient, redactText } from '../lib/erpnext/frappe-rest-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(REPO_ROOT, 'scripts', 'erpnext', 'apply-customer-bridge.mjs');
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
      if (failNext && failNext.op === 'list') {
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
      if (failNext && failNext.op === 'create') {
        const err = failNext;
        failNext = null;
        httpLog.push({ op: 'create', doctype, http: err.http || 500 });
        return { ok: false, http: err.http || 500, row: null, error: err.error || 'CREATE_FAILED' };
      }
      const store = bucket(doctype);
      const base = asString(payload.name || payload.customer_name || payload.first_name || `${doctype}-${store.size + 1}`);
      const name = doctype === 'Customer' ? nextSuffixName(store, base) : asString(payload.name) || `${base}-${doctype}-${store.size + 1}`;
      const row = { ...payload, name, disabled: payload.disabled || 0 };
      if (doctype === 'Contact' && payload.first_name) {
        row.name = payload.name || `${payload.first_name}${payload.last_name ? ` ${payload.last_name}` : ''}-${payload.company_name || 'Customer'}`;
      }
      if (doctype === 'Address') {
        row.name = payload.name || `${payload.address_title}-${payload.address_type || 'Billing'}`;
      }
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
  const fixture = readJson('fixtures/erpnext-customer-bridge/synthetic-lead.json');
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

test('#1009 config, fixture, docs, and apply script exist without secret values', () => {
  resetCustomerBridgeConfigCache();
  const cfg = loadCustomerBridgeConfig();
  assert.equal(cfg.schema, 'corpflow.erpnext.customer_bridge.v1');
  assert.equal(cfg.issue, 1009);
  assert.equal(cfg.bridge_id, BRIDGE_ID);
  assert.equal(cfg.verdict, CANONICAL_VERDICT);
  assert.equal(cfg.no_postgres_schema, true);
  assert.equal(cfg.persistence.approved_pointer_location, 'leads.qualification_json.erpnext');
  assert.equal(cfg.persistence.production_postgres_write, 'not_authorized_by_this_packet');
  assert.deepEqual(cfg.qualified_stages, ['proposal_ready', 'won']);
  assert.ok(cfg.forbidden_customer_names.includes('Prestige Procurement'));

  const files = [
    'docs/erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md',
    'docs/decisions/20260819-erpnext-customer-bridge.md',
    'config/erpnext-customer-bridge.v1.json',
    'fixtures/erpnext-customer-bridge/synthetic-lead.json',
  ];
  for (const rel of files) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    assert.doesNotMatch(read(rel), SECRETISH);
  }
  for (const rel of ['lib/erpnext/customer-bridge.js', 'scripts/erpnext/apply-customer-bridge.mjs']) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    assert.doesNotMatch(read(rel), /sk_live/);
  }
  assert.equal(existsSync(path.join(REPO_ROOT, 'lib/erpnext/frappe-rest-client.js')), true);

  const src = read('scripts/erpnext/apply-customer-bridge.mjs');
  assert.match(src, /ERPNEXT_BASE_URL/);
  assert.match(src, /ERPNEXT_API_KEY/);
  assert.match(src, /ERPNEXT_API_SECRET/);
  assert.match(src, /Do NOT require MASTER_ADMIN_KEY/);
  assert.doesNotMatch(src, /Authorization:.*MASTER_ADMIN_KEY/);
  assert.doesNotMatch(src, /\binfisical\s+(run|export|get)\b/i);
  assert.match(src, /postgres_persist: not_written/);
});

test('idempotency key is stable per leads.id and pointer merges into qualification_json.erpnext', () => {
  const key = buildIdempotencyKey('cf1009-synthetic-qualified-customer');
  assert.equal(key, 'corpflow.customer_bridge.v1:lead=cf1009-synthetic-qualified-customer');
  assert.equal(buildIdempotencyKey('cf1009-synthetic-qualified-customer'), key);
  const merged = mergeErpnextPointerIntoQualificationJson(
    { intake_meta: { product: 'website-rescue' } },
    { schema: POINTER_SCHEMA, customer: 'CF1009 Synthetic Customer Bridge Ltd' },
  );
  assert.equal(merged.intake_meta.product, 'website-rescue');
  assert.equal(merged.erpnext.schema, POINTER_SCHEMA);
  assert.equal(merged.erpnext.customer, 'CF1009 Synthetic Customer Bridge Ltd');
});

test('forbidden live names include Prestige Procurement and CorpFlowAI LTD', () => {
  assert.equal(isForbiddenLiveCustomerName('Prestige Procurement'), true);
  assert.equal(isForbiddenLiveCustomerName('CorpFlowAI LTD'), true);
  assert.equal(isForbiddenLiveCustomerName('CF1009 Synthetic Customer Bridge Ltd'), false);
});

test('unqualified stage, real customer, secrets, and Prestige names fail closed', async () => {
  const client = createMemoryFrappeClient();
  const store = createMemoryReferenceStore();

  const unqualified = await reconcileQualifiedCustomer(syntheticEvent({ stage: 'new' }), { client, referenceStore: store });
  assert.equal(unqualified.ok, false);
  assert.equal(unqualified.reason, 'NOT_COMMERCIALLY_QUALIFIED');
  assert.equal(client.snapshot('Customer').length, 0);

  const realForced = await reconcileQualifiedCustomer(
    { ...syntheticEvent(), synthetic: false, intake: { ...syntheticEvent().intake, synthetic: false } },
    { client, referenceStore: store },
  );
  assert.equal(realForced.ok, false);
  assert.equal(realForced.reason, 'REAL_CUSTOMER_REQUIRES_ANTON');

  const secret = await reconcileQualifiedCustomer(
    syntheticEvent({
      intake: { ...syntheticEvent().intake, hosting_password: 'should-never-be-sent' },
    }),
    { client, referenceStore: store },
  );
  assert.equal(secret.ok, false);
  assert.equal(secret.reason, 'SECRET_FIELDS_FORBIDDEN');
  assert.ok(secret.secret_field_names.includes('hosting_password'));
  assert.equal(JSON.stringify(secret.audit).includes('should-never-be-sent'), false);

  const prestige = await reconcileQualifiedCustomer(
    syntheticEvent({
      intake: { ...syntheticEvent().intake, legal_name: 'Prestige Procurement', business_display_name: 'Prestige Procurement' },
    }),
    { client, referenceStore: store },
  );
  assert.equal(prestige.ok, false);
  assert.equal(prestige.reason, 'FORBIDDEN_CUSTOMER_NAME');
  assert.equal(client.snapshot('Customer').length, 0);
});

test('first run creates exactly one Customer; replay updates and does not duplicate', async () => {
  const client = createMemoryFrappeClient();
  const event = syntheticEvent();
  const store = createMemoryReferenceStore([{ id: event.lead_id, stage: event.stage, qualification_json: event.qualification_json }]);
  const proof = await proveCustomerBridgeIdempotency(event, { client, referenceStore: store, now: '2026-08-19T23:59:00Z' });

  assert.equal(proof.first.ok, true, proof.first.error);
  assert.equal(proof.first.action, 'CREATE');
  assert.equal(proof.first.duplicate_count, 1);
  assert.equal(proof.second.ok, true, proof.second.error);
  assert.equal(proof.second.action, 'UPDATE');
  assert.equal(proof.created_on_replay, false);
  assert.equal(proof.second.duplicate_count, 1);
  assert.equal(client.snapshot('Customer').filter((row) => !row.disabled).length, 1);
  assert.equal(proof.second.customer, 'CF1009 Synthetic Customer Bridge Ltd');
  assert.equal(proof.second.readback.email_id, 'cf1009.synthetic@example.invalid');
  assert.equal(proof.second.readback.address_line1, '1009 Synthetic Bridge Lane');
  assert.equal(proof.second.readback.default_currency, 'MUR');
  assert.match(String(client.snapshot('Customer')[0].customer_details), /idempotency_key=corpflow\.customer_bridge\.v1:lead=cf1009-synthetic-qualified-customer/);

  const stored = store.getLead(event.lead_id);
  assert.equal(stored.qualification_json.erpnext.schema, POINTER_SCHEMA);
  assert.equal(stored.qualification_json.erpnext.customer, 'CF1009 Synthetic Customer Bridge Ltd');
  assert.equal(stored.qualification_json.intake_meta.product, 'website-rescue');
  assert.equal(proof.second.postgres_persist, 'not_written');
});

test('search-before-create updates website on the existing Customer instead of creating another', async () => {
  const existingDetails = 'corpflow.customer_bridge.v1:lead=cf1009-synthetic-qualified-customer | idempotency_key=corpflow.customer_bridge.v1:lead=cf1009-synthetic-qualified-customer';
  const client = createMemoryFrappeClient({
    Customer: [
      {
        name: 'CF1009 Synthetic Customer Bridge Ltd',
        customer_name: 'CF1009 Synthetic Customer Bridge Ltd',
        customer_group: 'Commercial',
        territory: 'Mauritius',
        default_currency: 'USD',
        website: 'https://old.example.invalid',
        customer_details: existingDetails,
        disabled: 0,
      },
    ],
    Contact: [
      {
        name: 'Sam Synthetic-CF1009 Synthetic Customer Bridge Ltd',
        email_id: 'cf1009.synthetic@example.invalid',
        company_name: 'CF1009 Synthetic Customer Bridge Ltd',
      },
    ],
    Address: [
      {
        name: 'CF1009 Synthetic Customer Bridge Ltd-Billing',
        address_title: 'CF1009 Synthetic Customer Bridge Ltd',
        address_type: 'Billing',
        address_line1: 'old',
        city: 'Port Louis',
        country: 'Mauritius',
      },
    ],
  });
  const result = await reconcileQualifiedCustomer(syntheticEvent(), { client, referenceStore: createMemoryReferenceStore() });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.action, 'UPDATE');
  assert.equal(client.snapshot('Customer').length, 1);
  assert.equal(result.readback.website, 'https://cf1009-synthetic.example.invalid');
  assert.equal(result.readback.default_currency, 'MUR');
});

test('retry after create failure leaves the reference pointer unchanged and later succeeds once', async () => {
  const client = createMemoryFrappeClient();
  const event = syntheticEvent();
  const store = createMemoryReferenceStore([{ id: event.lead_id, qualification_json: { keep: true } }]);
  client.failOnce({ op: 'create', http: 502, error: 'UPSTREAM' });
  const failed = await reconcileQualifiedCustomer(event, { client, referenceStore: store });
  assert.equal(failed.ok, false);
  assert.equal(failed.reason, 'CUSTOMER_CREATE_FAILED');
  assert.equal(failed.pointer, null);
  assert.equal(store.getLead(event.lead_id).qualification_json.erpnext, undefined);
  assert.equal(store.getLead(event.lead_id).qualification_json.keep, true);
  assert.equal(client.snapshot('Customer').length, 0);

  const recovered = await reconcileQualifiedCustomer(event, { client, referenceStore: store });
  assert.equal(recovered.ok, true, recovered.error);
  assert.equal(recovered.action, 'CREATE');
  assert.equal(client.snapshot('Customer').length, 1);
  assert.equal(store.getLead(event.lead_id).qualification_json.erpnext.customer, recovered.customer);
});

test('search failure does not create a Customer', async () => {
  const client = createMemoryFrappeClient();
  client.failOnce({ op: 'list', http: 503, error: 'SEARCH_FAILED' });
  const result = await reconcileQualifiedCustomer(syntheticEvent(), { client, referenceStore: createMemoryReferenceStore() });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'SEARCH_FAILED');
  assert.equal(client.snapshot('Customer').length, 0);
});

test('email owned by another Customer is a conflict', async () => {
  const client = createMemoryFrappeClient({
    Contact: [
      {
        name: 'Other Contact',
        email_id: 'cf1009.synthetic@example.invalid',
        company_name: 'Someone Else Ltd',
      },
    ],
    Customer: [
      {
        name: 'Someone Else Ltd',
        customer_name: 'Someone Else Ltd',
        disabled: 0,
      },
    ],
  });
  const result = await reconcileQualifiedCustomer(syntheticEvent(), { client });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'EMAIL_OWNED_BY_OTHER_CUSTOMER');
  assert.equal(
    client.snapshot('Customer').filter((row) => row.customer_name === 'CF1009 Synthetic Customer Bridge Ltd').length,
    0,
  );
});

test('enabled suffix duplicate is disabled and the canonical Customer is reused', async () => {
  const client = createMemoryFrappeClient({
    Customer: [
      {
        name: 'CF1009 Synthetic Customer Bridge Ltd',
        customer_name: 'CF1009 Synthetic Customer Bridge Ltd',
        customer_details: 'idempotency_key=corpflow.customer_bridge.v1:lead=cf1009-synthetic-qualified-customer',
        disabled: 0,
        customer_group: 'Commercial',
        territory: 'Mauritius',
        default_currency: 'MUR',
      },
      {
        name: 'CF1009 Synthetic Customer Bridge Ltd - 1',
        customer_name: 'CF1009 Synthetic Customer Bridge Ltd - 1',
        disabled: 0,
        customer_group: 'Commercial',
        territory: 'Mauritius',
        default_currency: 'MUR',
      },
    ],
  });
  const result = await reconcileQualifiedCustomer(syntheticEvent(), { client, referenceStore: createMemoryReferenceStore() });
  assert.equal(result.ok, true, result.error);
  assert.equal(result.action, 'UPDATE');
  const suffix = client.snapshot('Customer').find((row) => row.name.endsWith(' - 1'));
  assert.equal(Boolean(suffix.disabled), true);
  assert.match(String(suffix.customer_details), /DUPLICATE_OF=CF1009 Synthetic Customer Bridge Ltd/);
  assert.equal(result.duplicate_count, 1);
});

test('redaction strips secret-like strings from Frappe client errors', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ hasAuth: Boolean(init?.headers?.Authorization), url: String(url) });
    return {
      status: 401,
      async text() {
        return JSON.stringify({
          exception: 'token abcdefghijklmnopqrstuvwxyz012345 and https://secret.example/path',
        });
      },
    };
  };
  const client = createFrappeRestClient({
    baseUrl: 'https://example.invalid',
    apiKey: 'key-name-only',
    apiSecret: 'secret-name-only',
    fetchImpl,
  });
  const result = await client.getLoggedUser();
  assert.equal(result.ok, false);
  assert.equal(result.http, 401);
  assert.equal(calls[0].hasAuth, true);
  assert.doesNotMatch(result.error, /abcdefghijklmnopqrstuvwxyz012345/);
  assert.doesNotMatch(result.error, /https:\/\/secret/);
  assert.match(redactText('token supersecretvalue0000000000'), /\[redacted\]/);
});

test('searchExistingCustomerIdentity uses name, suffix-like name, and idempotency key', async () => {
  const client = createMemoryFrappeClient({
    Customer: [
      {
        name: 'CF1009 Synthetic Customer Bridge Ltd',
        customer_name: 'CF1009 Synthetic Customer Bridge Ltd',
        customer_details: 'idempotency_key=corpflow.customer_bridge.v1:lead=cf1009-synthetic-qualified-customer',
        disabled: 0,
      },
    ],
  });
  const found = await searchExistingCustomerIdentity(client, {
    customer_name: 'CF1009 Synthetic Customer Bridge Ltd',
    email: 'cf1009.synthetic@example.invalid',
    idempotency_key: 'corpflow.customer_bridge.v1:lead=cf1009-synthetic-qualified-customer',
  });
  assert.equal(found.ok, true);
  assert.equal(found.customers.length, 1);
});

test('live apply-log captures synthetic IDs, replay UPDATE, and no secret values', () => {
  const rel = 'artifacts/erpnext/customer-bridge-1009/apply-log.json';
  assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
  const log = JSON.parse(read(rel));
  const cfg = loadCustomerBridgeConfig();
  assert.equal(log.issue, 1009);
  assert.equal(log.secrets_printed, false);
  assert.equal(log.postgres_written, false);
  assert.equal(log.identity, 'integrations@corpflowai.com');
  assert.equal(log.first.action, 'CREATE');
  assert.equal(log.second.action, 'UPDATE');
  assert.equal(log.created_on_replay, false);
  assert.equal(log.duplicate_count, 1);
  assert.equal(log.first.customer, cfg.live_proof.customer);
  assert.equal(log.second.customer, cfg.live_proof.customer);
  assert.equal(log.pointer.contact, cfg.live_proof.contact);
  assert.equal(log.pointer.address, cfg.live_proof.address);
  const blob = JSON.stringify(log);
  assert.doesNotMatch(blob, /sk_live|eyJhbGci|postgres:\/\//i);
  assert.doesNotMatch(blob, /ERPNEXT_API_SECRET":\s*"[^"]+"/);
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
  assert.match(out, /CF1009 Synthetic Customer Bridge Ltd/);
  assert.match(out, /auth_fallback_master_admin_key: forbidden/);
  assert.doesNotMatch(out, /must-not-appear-in-output-1234567890/);
});
