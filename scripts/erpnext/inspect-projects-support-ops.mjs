#!/usr/bin/env node
/**
 * GET/read-only ERPNext Projects / Support operational acceptance (#1202).
 *
 * Direct Frappe token auth from Cursor Cloud–injected secrets (names only):
 *   ERPNEXT_BASE_URL
 *   ERPNEXT_API_KEY
 *   ERPNEXT_API_SECRET
 *
 * Reuses #920/#1097 synthetic Project / Task / Timesheet / Issue.
 * Does not create, update, submit, or send. Does not write Postgres.
 *
 * Usage:
 *   node scripts/erpnext/inspect-projects-support-ops.mjs --dry-run
 *   node scripts/erpnext/inspect-projects-support-ops.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { frappeClientFromEnv } from '../../lib/erpnext/frappe-rest-client.js';
import {
  ACCEPTANCE_VERDICT,
  inspectProjectsSupportOps,
  loadProjectsSupportOpsConfig,
  operatingConventions,
  slaDecision,
  timesheetVerdict,
} from '../../lib/erpnext/projects-support-ops.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'erpnext', 'projects-support-ops-1202');
const FIXTURE_REL = 'fixtures/erpnext-projects-support-ops/synthetic-delivery.json';

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
  const cfg = loadProjectsSupportOpsConfig(ROOT);
  log('ERPNext Projects/Support operational acceptance inspect (#1202)');
  log('mode: GET/read-only (no ERPNext write)');
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
  log(`reuse_project: ${cfg.reuse.project}`);
  log(`reuse_issue: ${cfg.reuse.issue}`);
  log(`reuse_timesheet: ${cfg.reuse.timesheet}`);
  log(`timesheet_verdict: ${timesheetVerdict(ROOT)}`);
  log(`sla_decision: ${slaDecision(ROOT)}`);
  log('forbidden_live_client: Prestige Procurement');
  log('postgres_persist: not_written');
  log('create_second_project: forbidden');
  log('timesheet_submit: forbidden');
  log('external_send: forbidden');
  log('erpnext_write: forbidden');
}

const dryRun = process.argv.includes('--dry-run');
printHeader(dryRun);

if (dryRun) {
  const fixture = JSON.parse(readFileSync(path.join(ROOT, FIXTURE_REL), 'utf8'));
  const cfg = loadProjectsSupportOpsConfig(ROOT);
  log('mode: dry-run (no ERPNext call)');
  log(`planned_reuse_project: ${cfg.reuse.project} (${cfg.reuse.project_name})`);
  log(`planned_reuse_issue: ${cfg.reuse.issue} (${cfg.reuse.issue_subject})`);
  log(`planned_delivery_ref: ${fixture.delivery_ref}`);
  log('planned_replay: search-before-create must REUSE; duplicate counts 1/1');
  log('planned_timesheet: GET draft only; do not submit');
  log('planned_issue_lifecycle: contract from #1097 apply-log; do not close/reopen');
  log(`ERPNext Projects/Support acceptance: DRY-RUN (${ACCEPTANCE_VERDICT} pending live GET)`);
  process.exit(0);
}

const missing = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].filter(
  (name) => !process.env[name] || !String(process.env[name]).trim(),
);
if (missing.length) {
  log(`ERPNext Projects/Support acceptance NOT READY — missing injected secrets: ${missing.join(' ')}`);
  log('Do not use MASTER_ADMIN_KEY as a substitute.');
  process.exit(1);
}

mkdirSync(ARTIFACT_DIR, { recursive: true });

let client;
try {
  client = frappeClientFromEnv(process.env);
} catch {
  log('ERPNext Projects/Support acceptance NOT READY — Frappe client could not be constructed from named secrets');
  process.exit(1);
}

const auth = await client.getLoggedUser();
log(`authenticated_user: ${auth.user || 'unread'}`);
log(`http_auth_status: ${auth.http}`);
if (!auth.ok || auth.user !== 'integrations@corpflowai.com') {
  log('ERPNext Projects/Support acceptance NOT READY — authentication failed');
  writeFileSync(
    path.join(ARTIFACT_DIR, 'inspect-log.json'),
    `${JSON.stringify({ ok: false, error: 'AUTH_FAILED', http: auth.http, identity: auth.user || null, secrets_printed: false, write_attempted: false }, null, 2)}\n`,
  );
  process.exit(1);
}

const proof = await inspectProjectsSupportOps(client, { repoRoot: ROOT });
const evidence = {
  schema: 'corpflow.erpnext.projects_support_ops_inspect.v1',
  github_issue: 1202,
  current_main_sha: 'b731411734edb01b7dbb8d7e20247c5a7805983a',
  generated_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  identity: auth.user,
  secrets_printed: false,
  postgres_written: false,
  send_attempted: false,
  timesheet_submitted: false,
  write_attempted: proof.write_attempted === true,
  reused_920: {
    project: proof.project?.name || null,
    issue: proof.issue?.name || null,
    timesheet: proof.timesheet?.name || null,
    task_count: Array.isArray(proof.tasks) ? proof.tasks.length : 0,
  },
  http: proof.http || {},
  gaps: proof.gaps || [],
  project: proof.project || null,
  next_action: proof.next_action || null,
  tasks: (proof.tasks || []).map((row) => ({
    name: row.name,
    subject: row.subject,
    status: row.status,
    progress: row.progress,
    owner: row.owner,
    is_milestone: row.is_milestone,
    depends_on_tasks: row.depends_on_tasks,
  })),
  timesheet: proof.timesheet || null,
  issue: proof.issue || null,
  issue_lifecycle: proof.issue_lifecycle || null,
  issue_trail: proof.issue_trail || null,
  issue_history: proof.issue_history || null,
  sla: proof.sla || null,
  idempotency: proof.idempotency || null,
  pointer: proof.pointer || null,
  opportunity: proof.opportunity || null,
  opportunity_link_on_project: proof.opportunity_link_on_project || null,
  operating_conventions: operatingConventions(ROOT),
  verdict: proof.verdict || 'NOT READY — inspect failed',
  blockers: proof.blockers || [],
};

writeFileSync(path.join(ARTIFACT_DIR, 'inspect-log.json'), `${JSON.stringify(evidence, null, 2)}\n`);

log(`project: ${evidence.project?.name || 'none'} status=${evidence.project?.status || 'unread'} owner=${evidence.project?.owner || 'none'} customer=${evidence.project?.customer || 'none'}`);
log(`task_count: ${evidence.tasks.length}`);
log(`next_action: ${evidence.next_action?.task || 'none'} ${evidence.next_action?.status || ''}`.trim());
log(`timesheet: ${evidence.timesheet?.name || 'none'} verdict=${evidence.timesheet?.verdict || 'unread'} docstatus=${evidence.timesheet?.docstatus ?? 'unread'} billable=${evidence.timesheet?.is_billable ?? 'unread'}`);
log(`issue: ${evidence.issue?.name || 'none'} status=${evidence.issue?.status || 'unread'} contact=${evidence.issue?.contact || 'none'} trail=${evidence.issue_trail || 'none'}`);
log(`issue_lifecycle: current=${evidence.issue_lifecycle?.current_status || 'unread'} close_reopen=${evidence.issue_lifecycle?.close_reopen_this_run || 'unread'} contract_proven=${evidence.issue_lifecycle?.contract_proven === true}`);
log(`idempotency: project=${evidence.idempotency?.project_action || 'none'} issue=${evidence.idempotency?.issue_action || 'none'} project_dup=${evidence.idempotency?.project_duplicate_count ?? 'unread'} issue_dup=${evidence.idempotency?.issue_duplicate_count ?? 'unread'}`);
log(`pointer_postgres_persist: ${evidence.pointer?.postgres_persist || 'unread'}`);
log(`write_attempted: ${evidence.write_attempted}`);
log(`postgres_written: false`);
log(`gaps: ${evidence.gaps.length ? evidence.gaps.join(',') : 'none'}`);
log(`verdict: ${evidence.verdict}`);

if (!proof.ok) {
  log(`ERPNext Projects/Support acceptance NOT READY — ${proof.blockers?.[0] || proof.error || 'inspect failed'}`);
  process.exit(1);
}

log(ACCEPTANCE_VERDICT);
process.exit(0);
