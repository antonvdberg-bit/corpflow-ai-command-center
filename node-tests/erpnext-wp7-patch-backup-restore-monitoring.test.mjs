/**
 * Deterministic #1010 WP7 patch / backup / restore / monitoring closure invariants.
 * Does not call live ERPNext, Neon, R2, or SSH. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DOC_REL = 'docs/operations/ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md';
const PROBE = path.join(REPO_ROOT, 'scripts', 'erpnext', 'wp7-readiness-probe.sh');
const ARTIFACT = 'artifacts/erpnext/wp7-closure-1010/probe-log.txt';

const CONTROLS = [
  'Current deployed ERPNext / Frappe versions',
  'Whether an update is required now',
  'Vendor ERPNext backup coverage',
  'Restore readiness',
  'Neon / CorpFlowAI Postgres PITR window',
  'Monitoring / health',
  'Numbered RPO / RTO',
];

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('#1010 WP7 closure file exists with sentinel and review verdict', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, DOC_REL)), true);
  const doc = read(DOC_REL);
  assert.ok(doc.includes('<!-- ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1 -->'));
  assert.ok(doc.includes('#1010'));
  assert.ok(doc.includes('#956'));
  assert.ok(doc.includes('#953'));
  assert.ok(doc.includes('NO IMPLEMENTATION AUTHORIZED'));
  assert.ok(doc.includes('WP7 SECURITY/PATCH/RECOVERY CLOSURE READY FOR REVIEW'));
  assert.ok(doc.includes('frappe=16.25.0'));
  assert.ok(doc.includes('erpnext=16.26.2'));
  assert.ok(doc.includes('16.29.0'));
  assert.ok(doc.includes('16.32.3'));
  assert.ok(doc.includes('GHSA-qq49-v74j-hjh7'));
  assert.ok(doc.includes('Monitor #14'));
  assert.ok(doc.includes('vendor_hosted_frappe_family'));
  assert.ok(doc.includes('None of those are `client_production`'));
  assert.ok(doc.includes('corpflow_test'));
  assert.doesNotMatch(doc, /Environment: client_production/);
});

test('#1010 WP7 closure classifies each required control as PROVEN or REQUIRES PROTECTED ACTION', () => {
  const doc = read(DOC_REL);
  assert.ok(doc.includes('**PROVEN**'));
  assert.ok(doc.includes('REQUIRES PROTECTED ACTION'));
  for (const control of CONTROLS) {
    assert.ok(doc.includes(control), `missing control ${control}`);
  }
  assert.ok(doc.includes('Anton opens the Frappe Cloud site Backups tab'));
  assert.ok(doc.includes('disposable Frappe Cloud site'));
  assert.ok(doc.includes('Settings → Instant restore'));
  assert.ok(doc.includes('two missing numbers'));
});

test('#1010 WP7 closure and artifact do not leak secrets or vendor hostnames', () => {
  const doc = read(DOC_REL);
  const artifact = read(ARTIFACT);
  const probe = readFileSync(PROBE, 'utf8');
  for (const text of [doc, artifact]) {
    assert.doesNotMatch(text, /ERPNEXT_API_SECRET\s*[:=]\s*(?!present\b|absent\b)\S+/i);
    assert.doesNotMatch(text, /ERPNEXT_BASE_URL\s*[:=]\s*https?:\/\//i);
    assert.doesNotMatch(text, /POSTGRES_URL\s*[:=]\s*(?!present\b|absent\b|not_printed\b)\S+/);
    assert.doesNotMatch(text, /sk_live|resticpassword|AKIA[0-9A-Z]{16}/i);
    assert.doesNotMatch(text, /[a-z0-9-]+\.frappe\.cloud/i);
    assert.doesNotMatch(text, /[a-z0-9-]+\.erpnext\.com/i);
  }
  assert.match(probe, /mutation: forbidden \(GET-only\)/);
  assert.doesNotMatch(probe, /\bssh\s+-[A-Za-z]/);
  assert.doesNotMatch(probe, /bench restore|frappe cloud upgrade/i);
  assert.doesNotMatch(probe, /[a-z0-9-]+\.frappe\.cloud/i);
  assert.doesNotMatch(probe, /[a-z0-9-]+\.erpnext\.com/i);
});

test('#1010 WP7 probe script refuses to print secret values or mutate', () => {
  const src = readFileSync(PROBE, 'utf8');
  assert.match(src, /ERPNEXT_BASE_URL_value: not_printed/);
  assert.match(src, /POSTGRES_URL_value: not_printed/);
  assert.match(src, /restore_attempted: no/);
  assert.match(src, /package_upgrade_attempted: no/);
  assert.match(src, /auth_uses_master_admin_key: no/);
  assert.doesNotMatch(src, /Authorization:.*MASTER_ADMIN_KEY/);
});

test('#1010 journal, shared-todo, control register, and Postgres provider pointer exist', () => {
  const journal = read('docs/decisions/JOURNAL.md');
  assert.ok(journal.includes('JE-2026-08-20-1'));
  assert.ok(journal.includes('#1010'));
  assert.ok(journal.includes('ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md'));
  const todo = read('docs/CORPFLOW_SHARED_TODO.md');
  assert.ok(todo.includes('ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md'));
  assert.ok(todo.includes('#1010'));
  const control = read('docs/governance/erpnext/CONTROL_REGISTER.md');
  assert.ok(control.includes('#1010'));
  assert.ok(control.includes('ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md'));
  const postgres = read('docs/operations/POSTGRES_PROVIDER.md');
  assert.ok(postgres.includes('Instant restore'));
  assert.ok(postgres.includes('history window'));
  assert.ok(postgres.includes('NOT PROVEN'));
  assert.doesNotMatch(postgres, /POSTGRES_URL\s*=\s*postgres/);
});
