/**
 * #1206 ERPNext Customer / Contact master GET-only acceptance.
 * In-memory Frappe stand-in. Does not print secrets. Live GET is a separate script.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { rowMatchesFrappeFilter } from '../lib/erpnext/customer-bridge.js';
import {
  CANONICAL_VERDICT,
  acceptCustomerMasterReadOnly,
  erpnextCustomerPointerFromQualification,
  loadCustomerMasterAcceptanceConfig,
  resetCustomerMasterAcceptanceConfigCache,
} from '../lib/erpnext/customer-master-acceptance.js';
import { fixtureProspectLeadRows } from '../lib/app/prospect-operations-workspace.js';
import {
  erpnextCustomerPointerFromLead,
  fixtureCommercialRecords,
  projectCommercialRow,
} from '../lib/app/commercial-summary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'erpnext', 'accept-customer-master.mjs');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function asString(v) {
  return v == null ? '' : String(v).trim();
}

function createMemoryFrappeClient(seed = {}) {
  /** @type {Map<string, Map<string, Record<string, unknown>>>} */
  const docs = new Map();
  const httpLog = [];

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
    async getLoggedUser() {
      return { ok: true, http: 200, user: 'integrations@corpflowai.com' };
    },
    async list(doctype, options = {}) {
      httpLog.push({ op: 'list', doctype, http: 200 });
      return { ok: true, http: 200, rows: listRows(doctype, options.filters).map((row) => ({ ...row })), error: null };
    },
    async get(doctype, name) {
      const row = bucket(doctype).get(asString(name));
      httpLog.push({ op: 'get', doctype, http: row ? 200 : 404, name });
      if (!row) return { ok: false, http: 404, row: null, error: 'NOT_FOUND' };
      return { ok: true, http: 200, row: { ...row }, error: null };
    },
    async create() {
      throw new Error('WRITE_FORBIDDEN');
    },
    async update() {
      throw new Error('WRITE_FORBIDDEN');
    },
  };
}

function seedPrimary() {
  return {
    Customer: [
      {
        name: 'CF1018 Synthetic Sales Lifecycle Ltd',
        customer_name: 'CF1018 Synthetic Sales Lifecycle Ltd',
        customer_type: 'Company',
        customer_group: 'Commercial',
        territory: 'Mauritius',
        default_currency: 'MUR',
        default_price_list: 'Standard Selling',
        website: 'https://cf1018-synthetic.example.invalid',
        email_id: 'cf1018.synthetic@example.invalid',
        disabled: 0,
        customer_primary_contact: 'Lee Synthetic',
        customer_primary_address: 'CF1018 Synthetic Sales Lifecycle Ltd-Billing',
        customer_details: 'idempotency_key=corpflow.sales_lifecycle.v1:lead=cf1018-synthetic-sales-lifecycle',
      },
    ],
    Contact: [
      {
        name: 'Lee Synthetic',
        first_name: 'Lee',
        last_name: 'Synthetic',
        email_id: 'cf1018.synthetic@example.invalid',
        company_name: 'CF1018 Synthetic Sales Lifecycle Ltd',
      },
    ],
    Address: [
      {
        name: 'CF1018 Synthetic Sales Lifecycle Ltd-Billing',
        address_title: 'CF1018 Synthetic Sales Lifecycle Ltd',
        address_type: 'Billing',
        address_line1: '1018 Synthetic Lifecycle Lane',
        city: 'Port Louis',
        country: 'Mauritius',
      },
    ],
    Quotation: [
      {
        name: 'SAL-QTN-2026-00005',
        party_name: 'CF1018 Synthetic Sales Lifecycle Ltd',
        customer_name: 'CF1018 Synthetic Sales Lifecycle Ltd',
        contact_person: 'Lee Synthetic',
        customer_address: 'CF1018 Synthetic Sales Lifecycle Ltd-Billing',
        docstatus: 0,
      },
    ],
  };
}

test('#1206 config, docs, and GET-only script exist without secret values', () => {
  resetCustomerMasterAcceptanceConfigCache();
  const cfg = loadCustomerMasterAcceptanceConfig();
  assert.equal(cfg.schema, 'corpflow.erpnext.customer_master_acceptance.v1');
  assert.equal(cfg.issue, 1206);
  assert.equal(cfg.verdict, CANONICAL_VERDICT);
  assert.equal(cfg.erpnext_write, false);
  assert.equal(cfg.no_second_crm, true);
  assert.equal(cfg.primary_identity.customer, 'CF1018 Synthetic Sales Lifecycle Ltd');
  assert.equal(cfg.primary_identity.contact, 'Lee Synthetic');
  assert.equal(cfg.primary_identity.address, 'CF1018 Synthetic Sales Lifecycle Ltd-Billing');
  assert.ok(existsSync(path.join(REPO_ROOT, 'docs/erpnext/ERPNEXT_CUSTOMER_MASTER_QUOTATION_DELIVERY_ACCEPTANCE_V1.md')));
  assert.ok(existsSync(SCRIPT));
  const script = read('scripts/erpnext/accept-customer-master.mjs');
  assert.ok(script.includes('GET-only') || script.includes('GET/read-only'));
  assert.doesNotMatch(script, /\bclient\.create\s*\(/);
  assert.doesNotMatch(script, /\bclient\.update\s*\(/);
  assert.doesNotMatch(script, /sk_live|eyJhbGci/);
  assert.doesNotMatch(JSON.stringify(cfg), /sk_live|eyJhbGci/);
});

test('#1206 GET-only acceptance proves identity, linkage, search-before-create, and quotation party', async () => {
  const client = createMemoryFrappeClient(seedPrimary());
  const evidence = await acceptCustomerMasterReadOnly({
    client,
    repoRoot: REPO_ROOT,
    currentMainSha: 'eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751',
  });
  assert.equal(evidence.ok, true);
  assert.equal(evidence.verdict, CANONICAL_VERDICT);
  assert.equal(evidence.exact_blocker, null);
  assert.equal(evidence.erpnext_mutated, false);
  assert.equal(evidence.identifiers.customer, 'CF1018 Synthetic Sales Lifecycle Ltd');
  assert.equal(evidence.identifiers.contact, 'Lee Synthetic');
  assert.equal(evidence.identifiers.address, 'CF1018 Synthetic Sales Lifecycle Ltd-Billing');
  assert.equal(evidence.search_before_create.enabled_duplicate_count, 1);
  assert.equal(evidence.search_before_create.created_on_replay, false);
  assert.equal(evidence.quotation_suitability.ok, true);
  assert.equal(evidence.quotation.party_name, 'CF1018 Synthetic Sales Lifecycle Ltd');
  assert.equal(evidence.corpflow_reference.copies_customer_ledger, false);
  assert.equal(evidence.current_main_sha, 'eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751');
  assert.equal(client.httpLog.some((row) => row.op === 'create' || row.op === 'update'), false);
});

test('#1206 refuses a missing recorded Customer instead of inventing a name join', async () => {
  const client = createMemoryFrappeClient({ Customer: [], Contact: [], Address: [] });
  const evidence = await acceptCustomerMasterReadOnly({ client, repoRoot: REPO_ROOT });
  assert.equal(evidence.ok, false);
  assert.match(String(evidence.verdict), /NOT READY/);
  assert.equal(evidence.erpnext_mutated, false);
});

test('#1206 Commercial Workspace reads recorded Prospect ERPNext customer pointer only', () => {
  const now = new Date('2026-08-19T12:00:00.000Z');
  const adaLead = fixtureProspectLeadRows(now).find((row) => row.id === 'syn-772-lr-ada');
  const beaLead = fixtureProspectLeadRows(now).find((row) => row.id === 'syn-772-rd-bea');
  assert.equal(erpnextCustomerPointerFromQualification(adaLead), 'CF880 Synthetic Lead Rescue Ltd');
  assert.equal(erpnextCustomerPointerFromLead(adaLead), 'CF880 Synthetic Lead Rescue Ltd');
  assert.equal(erpnextCustomerPointerFromLead(beaLead), '');
  const rows = fixtureCommercialRecords(now);
  const ada = rows.find((row) => row.id === 'syn-772-lr-ada');
  const bea = rows.find((row) => row.id === 'syn-772-rd-bea');
  const wren = rows.find((row) => row.id === 'syn-716-wr-cleared');
  assert.equal(ada.erpnext.customer, 'CF880 Synthetic Lead Rescue Ltd');
  assert.equal(ada.related_refs.customer, 'CF880 Synthetic Lead Rescue Ltd');
  assert.equal(wren.erpnext.customer, 'CF880 Synthetic Website Rescue Ltd');
  assert.equal(bea.erpnext.customer, null);
  const invented = projectCommercialRow({
    id: 'no-pointer',
    product: 'lead-rescue',
    client_label: 'Ada Spa',
  });
  assert.equal(invented.erpnext.customer, null);
});

test('#1206 live accept-log captures CF1018 identifiers, GET-only, and no secret values', () => {
  const rel = 'artifacts/erpnext/customer-master-acceptance-1206/accept-log.json';
  assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
  const log = JSON.parse(read(rel));
  assert.equal(log.issue, 1206);
  assert.equal(log.secrets_printed, false);
  assert.equal(log.postgres_written, false);
  assert.equal(log.erpnext_mutated, false);
  assert.equal(log.identity, 'integrations@corpflowai.com');
  assert.equal(log.verdict, CANONICAL_VERDICT);
  assert.equal(log.identifiers.customer, 'CF1018 Synthetic Sales Lifecycle Ltd');
  assert.equal(log.identifiers.contact, 'Lee Synthetic');
  assert.equal(log.identifiers.address, 'CF1018 Synthetic Sales Lifecycle Ltd-Billing');
  assert.equal(log.search_before_create.enabled_duplicate_count, 1);
  assert.equal(log.quotation_suitability.ok, true);
  assert.equal(log.current_main_sha, 'eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751');
  const blob = JSON.stringify(log);
  assert.doesNotMatch(blob, /sk_live|eyJhbGci|postgres:\/\//i);
  assert.doesNotMatch(blob, /ERPNEXT_API_SECRET":\s*"[^"]+"/);
});

test('#1206 apply script is GET-only and does not print secrets', () => {
  const result = spawnSync(process.execPath, ['--check', SCRIPT], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
