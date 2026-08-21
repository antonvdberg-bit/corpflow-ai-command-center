/**
 * Deterministic #1019 WP6 identity / roles / 2FA / least-privilege closure invariants.
 * Does not call live ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DOC_REL = 'docs/operations/ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md';
const RUNBOOK_REL = 'docs/runbooks/ERPNEXT_JOINER_MOVER_LEAVER_V1.md';
const PROBE = path.join(REPO_ROOT, 'scripts', 'erpnext', 'wp6-access-control-probe.sh');
const ARTIFACT = 'artifacts/erpnext/wp6-access-1019/probe-log.txt';

const CONTROLS = [
  'Authenticated integration identity + non-secret role/permission summary',
  'Least-privilege vs approved bridge work',
  'Administrator / System Manager account inventory and ownership',
  '2FA state for privileged users',
  'Password / login-attempt / session controls',
  'MASTER_ADMIN_KEY` absent on this fresh worker',
  'Joiner / mover / leaver owner + runbook',
  'Control / evidence registers updated where state changed',
];

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('#1019 WP6 closure file exists with sentinel and review verdict', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, DOC_REL)), true);
  const doc = read(DOC_REL);
  assert.ok(doc.includes('<!-- ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1 -->'));
  assert.ok(doc.includes('#1019'));
  assert.ok(doc.includes('#956'));
  assert.ok(doc.includes('#899'));
  assert.ok(doc.includes('#953'));
  assert.ok(doc.includes('NO IMPLEMENTATION AUTHORIZED'));
  assert.ok(doc.includes('WP6 ACCESS CONTROL CLOSURE READY FOR REVIEW'));
  assert.ok(doc.includes('integrations@corpflowai.com'));
  assert.ok(doc.includes('Accounts Manager'));
  assert.ok(doc.includes('Sales Manager'));
  assert.ok(doc.includes('own_holds_system_manager: no'));
  assert.ok(doc.includes('vendor_hosted_frappe_family'));
  assert.ok(doc.includes('None of those are `client_production`'));
  assert.ok(doc.includes('corpflow_test'));
  assert.ok(doc.includes('ERPNEXT_JOINER_MOVER_LEAVER_V1.md'));
  assert.doesNotMatch(doc, /Environment: client_production/);
});

test('#1019 WP6 closure classifies each required control as PROVEN or REQUIRES PROTECTED ACTION', () => {
  const doc = read(DOC_REL);
  assert.ok(doc.includes('**PROVEN**'));
  assert.ok(doc.includes('REQUIRES PROTECTED ACTION'));
  for (const control of CONTROLS) {
    assert.ok(doc.includes(control), `missing control ${control}`);
  }
  assert.ok(doc.includes('Users and Permissions → User'));
  assert.ok(doc.includes('System Settings → Security'));
  assert.ok(doc.includes('Two Factor Auth'));
  assert.ok(doc.includes('Stock Manager'));
  assert.ok(doc.includes('Purchase Manager'));
  assert.ok(doc.includes('#899 not reopened'));
});

test('#1019 WP6 joiner/mover/leaver runbook exists and stays non-mutating', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, RUNBOOK_REL)), true);
  const runbook = read(RUNBOOK_REL);
  assert.ok(runbook.includes('<!-- ERPNEXT_JOINER_MOVER_LEAVER_V1 -->'));
  assert.ok(runbook.includes('Owner:** Anton') || runbook.includes('**Owner:** Anton'));
  assert.ok(runbook.includes('Joiner'));
  assert.ok(runbook.includes('Mover'));
  assert.ok(runbook.includes('Leaver'));
  assert.ok(runbook.includes('Disable'));
  assert.ok(runbook.includes('NO IMPLEMENTATION AUTHORIZED'));
  assert.ok(runbook.includes('integrations@corpflowai.com'));
  assert.ok(runbook.includes('Not an SSO'));
  assert.ok(runbook.includes('custom DocType'));
});

test('#1019 WP6 closure, runbook, and artifact do not leak secrets or vendor hostnames', () => {
  const doc = read(DOC_REL);
  const runbook = read(RUNBOOK_REL);
  const artifact = read(ARTIFACT);
  const probe = readFileSync(PROBE, 'utf8');
  for (const text of [doc, runbook, artifact]) {
    assert.doesNotMatch(text, /ERPNEXT_API_SECRET\s*[:=]\s*(?!present\b|absent\b)\S+/i);
    assert.doesNotMatch(text, /ERPNEXT_BASE_URL\s*[:=]\s*https?:\/\//i);
    assert.doesNotMatch(text, /sk_live|resticpassword|AKIA[0-9A-Z]{16}/i);
    assert.doesNotMatch(text, /[a-z0-9-]+\.frappe\.cloud/i);
    assert.doesNotMatch(text, /[a-z0-9-]+\.erpnext\.com/i);
  }
  assert.match(probe, /mutation: forbidden \(GET-only\)/);
  assert.match(probe, /role_or_permission_mutation: forbidden/);
  assert.doesNotMatch(probe, /\bssh\s+-[A-Za-z]/);
  assert.doesNotMatch(probe, /[a-z0-9-]+\.frappe\.cloud/i);
  assert.doesNotMatch(probe, /[a-z0-9-]+\.erpnext\.com/i);
});

test('#1019 WP6 probe script refuses to print secret values, other usernames, or mutate', () => {
  const src = readFileSync(PROBE, 'utf8');
  assert.match(src, /ERPNEXT_BASE_URL_value: not_printed/);
  assert.match(src, /auth_uses_master_admin_key: no/);
  assert.match(src, /other_usernames_printed: no/);
  assert.match(src, /role_mutation_attempted: no/);
  assert.match(src, /user_list_other_usernames: not_printed/);
  assert.doesNotMatch(src, /Authorization:.*MASTER_ADMIN_KEY/);
  assert.doesNotMatch(src, /curl[^\n]*-X\s*POST/i);
});

test('#1019 journal, shared-todo, control register, and evidence index pointer exist', () => {
  const journal = read('docs/decisions/JOURNAL.md');
  assert.ok(journal.includes('JE-2026-08-20-2'));
  assert.ok(journal.includes('#1019'));
  assert.ok(journal.includes('ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md'));
  const todo = read('docs/CORPFLOW_SHARED_TODO.md');
  assert.ok(todo.includes('ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md'));
  assert.ok(todo.includes('#1019'));
  const control = read('docs/governance/erpnext/CONTROL_REGISTER.md');
  assert.ok(control.includes('#1019'));
  assert.ok(control.includes('ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md'));
  const index = read('docs/governance/erpnext/IMPLEMENTATION_EVIDENCE_INDEX.md');
  assert.ok(index.includes('#1019'));
  assert.ok(index.includes('ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md'));
});
