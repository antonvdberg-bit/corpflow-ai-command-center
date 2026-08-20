#!/usr/bin/env node
/**
 * Apply / prove the WP1 ERPNext Customer bridge (#1009).
 *
 * Direct Frappe token auth from Cursor Cloud–injected secrets (names only):
 *   ERPNEXT_BASE_URL
 *   ERPNEXT_API_KEY
 *   ERPNEXT_API_SECRET
 *
 * Do NOT require MASTER_ADMIN_KEY, SSH, Infisical, or POSTGRES writes.
 * Synthetic Customer only. Runs the same event twice to prove idempotency.
 *
 * Usage:
 *   node scripts/erpnext/apply-customer-bridge.mjs --dry-run
 *   node scripts/erpnext/apply-customer-bridge.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_VERDICT,
  createMemoryReferenceStore,
  loadCustomerBridgeConfig,
  proveCustomerBridgeIdempotency,
} from '../../lib/erpnext/customer-bridge.js';
import { frappeClientFromEnv } from '../../lib/erpnext/frappe-rest-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'erpnext', 'customer-bridge-1009');
const FIXTURE_REL = 'fixtures/erpnext-customer-bridge/synthetic-lead.json';

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

function printHeader(dryRun) {
  const cfg = loadCustomerBridgeConfig(ROOT);
  log('ERPNext WP1 Customer bridge apply (#1009)');
  log('access_path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)');
  log('expected_identity: integrations@corpflowai.com (CorpFlowAI Integration)');
  log(`ERPNEXT_BASE_URL: ${presence('ERPNEXT_BASE_URL')}`);
  log(`ERPNEXT_API_KEY: ${presence('ERPNEXT_API_KEY')}`);
  log(`ERPNEXT_API_SECRET: ${presence('ERPNEXT_API_SECRET')}`);
  log(`MASTER_ADMIN_KEY: ${presence('MASTER_ADMIN_KEY')} (must not be used as ERPNext auth)`);
  log(`POSTGRES_URL: ${presence('POSTGRES_URL')} (must not be written by this packet)`);
  log(`injected_secret_names_checked: ${listInjectedSecretNames()}`);
  log('auth_fallback_master_admin_key: forbidden');
  log('runtime_bridge_ssh: no');
  log('runtime_bridge_infisical: no');
  log('ERPNEXT_BASE_URL_value: not_printed');
  log(`dry_run: ${dryRun ? 1 : 0}`);
  log(`synthetic_customer: ${cfg.synthetic.legal_name}`);
  log(`synthetic_lead_id: ${cfg.synthetic.lead_id}`);
  log('forbidden_live_client: Prestige Procurement');
  log('postgres_persist: not_written');
}

function loadFixture() {
  return JSON.parse(readFileSync(path.join(ROOT, FIXTURE_REL), 'utf8'));
}

function toEvent(fixture) {
  return {
    id: fixture.lead_id || fixture.id,
    lead_id: fixture.lead_id || fixture.id,
    stage: fixture.stage,
    synthetic: true,
    product: fixture.product,
    intake: fixture,
    qualification_json: fixture.qualification_json || {},
  };
}

function summarizeResult(label, result) {
  return {
    label,
    ok: result.ok === true,
    action: result.action || null,
    reason: result.reason || null,
    customer: result.customer || null,
    contact: result.contact || null,
    address: result.address || null,
    duplicate_count: result.duplicate_count ?? null,
    mismatches: result.mismatches || [],
    pointer_persisted: result.pointer_persisted === true,
    postgres_persist: result.postgres_persist || 'not_written',
    readback: result.readback || null,
    error: result.error || null,
  };
}

const dryRun = process.argv.includes('--dry-run');
printHeader(dryRun);

if (dryRun) {
  const fixture = loadFixture();
  log('mode: dry-run (no ERPNext call)');
  log(`planned_event: ${fixture.lead_id} → Customer/Contact/Address search-before-create`);
  log('planned_replay: same event a second time; expected action=UPDATE duplicate_count=1');
  log(`ERPNext WP1 Customer bridge: DRY-RUN (${CANONICAL_VERDICT} pending live run)`);
  process.exit(0);
}

const missing = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].filter(
  (name) => !process.env[name] || !String(process.env[name]).trim(),
);
if (missing.length) {
  log(`ERPNext WP1 Customer bridge NOT READY — missing injected secrets: ${missing.join(' ')}`);
  log('Do not use MASTER_ADMIN_KEY as a substitute.');
  process.exit(1);
}

mkdirSync(ARTIFACT_DIR, { recursive: true });

const fixture = loadFixture();
const event = toEvent(fixture);
const referenceStore = createMemoryReferenceStore([
  {
    id: event.lead_id,
    stage: event.stage,
    synthetic: true,
    qualification_json: event.qualification_json,
  },
]);

let client;
try {
  client = frappeClientFromEnv(process.env);
} catch {
  log('ERPNext WP1 Customer bridge NOT READY — Frappe client could not be constructed from named secrets');
  process.exit(1);
}

const auth = await client.getLoggedUser();
log(`authenticated_user: ${auth.user || 'unread'}`);
log(`http_auth_status: ${auth.http}`);
if (!auth.ok || auth.user !== 'integrations@corpflowai.com') {
  log('ERPNext WP1 Customer bridge NOT READY — authentication failed');
  writeFileSync(
    path.join(ARTIFACT_DIR, 'apply-log.json'),
    `${JSON.stringify({ ok: false, error: 'AUTH_FAILED', http: auth.http, identity: auth.user || null, secrets_printed: false }, null, 2)}\n`,
  );
  process.exit(1);
}

const proof = await proveCustomerBridgeIdempotency(event, {
  client,
  referenceStore,
  repoRoot: ROOT,
});
const stored = referenceStore.getLead(event.lead_id);
const evidence = {
  schema: 'corpflow.erpnext.customer_bridge_apply.v1',
  issue: 1009,
  generated_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  identity: auth.user,
  secrets_printed: false,
  postgres_written: false,
  synthetic_lead_id: event.lead_id,
  synthetic_customer_name: fixture.legal_name,
  first: summarizeResult('first', proof.first),
  second: summarizeResult('second', proof.second),
  created_on_replay: proof.created_on_replay === true,
  duplicate_count: proof.second?.duplicate_count ?? proof.first?.duplicate_count ?? null,
  pointer: stored?.qualification_json?.erpnext || proof.second?.pointer || null,
  pointer_location: 'qualification_json.erpnext (in-memory reference; Postgres not written)',
  verdict: proof.ok ? CANONICAL_VERDICT : 'NOT READY — idempotency or read-back failed',
};

writeFileSync(path.join(ARTIFACT_DIR, 'apply-log.json'), `${JSON.stringify(evidence, null, 2)}\n`);

log(`first_run: action=${evidence.first.action} customer=${evidence.first.customer} ok=${evidence.first.ok}`);
log(`second_run: action=${evidence.second.action} customer=${evidence.second.customer} ok=${evidence.second.ok}`);
log(`created_on_replay: ${evidence.created_on_replay}`);
log(`duplicate_count: ${evidence.duplicate_count}`);
log(`erpnext_customer: ${evidence.second.customer || evidence.first.customer || 'none'}`);
log(`erpnext_contact: ${evidence.second.contact || 'none'}`);
log(`erpnext_address: ${evidence.second.address || 'none'}`);
log(`pointer_location: ${evidence.pointer_location}`);
log(`postgres_written: false`);
log(`verdict: ${evidence.verdict}`);

if (!proof.ok) {
  log(`ERPNext WP1 Customer bridge NOT READY — ${proof.second?.error || proof.first?.error || 'idempotency proof failed'}`);
  process.exit(1);
}

log(CANONICAL_VERDICT);
process.exit(0);
