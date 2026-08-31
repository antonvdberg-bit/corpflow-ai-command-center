#!/usr/bin/env node
/**
 * #1206 GET/read-only Customer / Contact master acceptance.
 *
 * Direct Frappe token auth from Cursor Cloud–injected secrets (names only):
 *   ERPNEXT_BASE_URL
 *   ERPNEXT_API_KEY
 *   ERPNEXT_API_SECRET
 *
 * Never writes Customer / Contact / Address. Never prints secret values.
 *
 * Usage:
 *   node scripts/erpnext/accept-customer-master.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_VERDICT,
  acceptCustomerMasterReadOnly,
  loadCustomerMasterAcceptanceConfig,
} from '../../lib/erpnext/customer-master-acceptance.js';
import { frappeClientFromEnv, redactText } from '../../lib/erpnext/frappe-rest-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'erpnext', 'customer-master-acceptance-1206');

function log(msg) {
  console.log(String(msg));
}

function presence(name) {
  const value = process.env[name];
  return value && String(value).trim() ? 'present' : 'absent';
}

function listInjectedSecretNames() {
  const wanted = [
    'ERPNEXT_BASE_URL',
    'ERPNEXT_API_KEY',
    'ERPNEXT_API_SECRET',
    'MASTER_ADMIN_KEY',
    'ADMIN_PIN',
  ];
  const present = wanted.filter((name) => process.env[name] && String(process.env[name]).trim());
  return present.length ? present.join(',') : 'none';
}

async function getSupporting(client, row) {
  const [customer, contact, address] = await Promise.all([
    client.get('Customer', row.customer),
    client.get('Contact', row.contact),
    client.get('Address', row.address),
  ]);
  return {
    source: row.source,
    customer: row.customer,
    contact: row.contact,
    address: row.address,
    customer_http: customer.http || 0,
    contact_http: contact.http || 0,
    address_http: address.http || 0,
    customer_ok: Boolean(customer.ok && customer.row),
    contact_ok: Boolean(contact.ok && contact.row),
    address_ok: Boolean(address.ok && address.row),
    disabled: Boolean(customer.row?.disabled),
    error: customer.ok ? null : redactText(customer.error),
  };
}

log('ERPNext Customer / Contact master acceptance (#1206)');
log('access_path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)');
log('expected_identity: integrations@corpflowai.com (CorpFlowAI Integration)');
log(`ERPNEXT_BASE_URL: ${presence('ERPNEXT_BASE_URL')}`);
log(`ERPNEXT_API_KEY: ${presence('ERPNEXT_API_KEY')}`);
log(`ERPNEXT_API_SECRET: ${presence('ERPNEXT_API_SECRET')}`);
log(`MASTER_ADMIN_KEY: ${presence('MASTER_ADMIN_KEY')} (must be absent for ordinary Cursor Cloud execution)`);
log(`POSTGRES_URL: ${presence('POSTGRES_URL')} (must not be written by this packet)`);
log(`injected_secret_names_checked: ${listInjectedSecretNames()}`);
log('mutation: forbidden (GET-only)');
log('ERPNEXT_BASE_URL_value: not_printed');

if (presence('ERPNEXT_BASE_URL') !== 'present' || presence('ERPNEXT_API_KEY') !== 'present' || presence('ERPNEXT_API_SECRET') !== 'present') {
  log('verdict: NOT READY — Cursor Cloud run missing injected secrets: ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET');
  process.exit(1);
}

const CURRENT_MAIN_SHA = 'eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751';
const cfg = loadCustomerMasterAcceptanceConfig(ROOT);
const client = frappeClientFromEnv();
const evidence = await acceptCustomerMasterReadOnly({
  client,
  repoRoot: ROOT,
  currentMainSha: CURRENT_MAIN_SHA,
});
const supporting = [];
for (const row of cfg.supporting_identities || []) {
  supporting.push(await getSupporting(client, row));
}

const artifact = {
  schema: 'corpflow.erpnext.customer_master_acceptance_apply.v1',
  issue: 1206,
  generated_at_utc: new Date().toISOString(),
  current_main_sha: CURRENT_MAIN_SHA,
  secrets_printed: false,
  postgres_written: false,
  erpnext_mutated: false,
  ...evidence,
  supporting,
};

mkdirSync(ARTIFACT_DIR, { recursive: true });
writeFileSync(path.join(ARTIFACT_DIR, 'accept-log.json'), `${JSON.stringify(artifact, null, 2)}\n`);

log(`authenticated_user: ${evidence.identity || 'n/a'}`);
log(`customer: ${evidence.identifiers?.customer || 'none'}`);
log(`contact: ${evidence.identifiers?.contact || 'none'}`);
log(`address: ${evidence.identifiers?.address || 'none'}`);
log(`quotation: ${evidence.identifiers?.quotation || 'none'}`);
log(`enabled_duplicate_count: ${evidence.search_before_create?.enabled_duplicate_count ?? 'n/a'}`);
log(`quotation_suitability_ok: ${evidence.quotation_suitability?.ok === true ? 'yes' : 'no'}`);
log(`erpnext_mutated: false`);
log(`exact_blocker: ${evidence.exact_blocker || 'NONE'}`);
log(`verdict: ${evidence.verdict || CANONICAL_VERDICT}`);
log(`artifact: artifacts/erpnext/customer-master-acceptance-1206/accept-log.json`);

process.exit(evidence.ok ? 0 : 1);
