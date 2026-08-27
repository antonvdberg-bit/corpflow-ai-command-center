/**
 * #1097 ERPNext Projects / Support operational proof.
 * Uses an in-memory Frappe stand-in. Does not print secrets.
 * Live apply is a separate script.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { rowMatchesFrappeFilter } from '../lib/erpnext/customer-bridge.js';
import {
  ACCEPTANCE_VERDICT,
  BRIDGE_IDS,
  CANONICAL_VERDICT,
  POINTER_SCHEMA,
  asReadOnlyFrappeClient,
  buildDeliveryPointer,
  buildIssueIdempotencyKey,
  buildProjectIdempotencyKey,
  classifyTimesheet,
  evaluateOpsAcceptance,
  evaluateOpsReadiness,
  inspectProjectsSupportOps,
  isForbiddenLiveCustomerName,
  loadCloseReopenContract,
  loadProjectsSupportOpsConfig,
  mergeDeliveryPointerIntoQualificationJson,
  nextActionFromTasks,
  operatingConventions,
  proveProjectsSupportOps,
  resetProjectsSupportOpsConfigCache,
  searchBeforeCreateIssue,
  searchBeforeCreateProject,
  slaDecision,
  timesheetVerdict,
} from '../lib/erpnext/projects-support-ops.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(REPO_ROOT, 'scripts', 'erpnext', 'apply-projects-support-ops.mjs');
const INSPECT = path.join(REPO_ROOT, 'scripts', 'erpnext', 'inspect-projects-support-ops.mjs');
const SECRETISH = /sk_live|POSTGRES_URL\s*[:=]\s*\S+|ERPNEXT_API_SECRET\s*[:=]\s*\S+|eyJhbGci/;

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
  let seq = 1;

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
    async list(doctype, options = {}) {
      if (doctype === 'SLA' || doctype === 'Assignment Rule' || doctype === 'Comment') {
        httpLog.push({ method: 'GET', doctype, http: 403 });
        return { ok: false, http: 403, rows: [], error: 'PermissionError' };
      }
      const rows = listRows(doctype, options.filters);
      httpLog.push({ method: 'GET', doctype, http: 200 });
      return { ok: true, http: 200, rows, error: null };
    },
    async get(doctype, name) {
      const row = bucket(doctype).get(asString(name)) || null;
      const http = row ? 200 : 404;
      httpLog.push({ method: 'GET', doctype, name, http });
      return { ok: Boolean(row), http, row, error: row ? null : 'NOT_FOUND' };
    },
    async create(doctype, payload) {
      const name = asString(payload.name) || `${doctype.toUpperCase()}-${seq++}`;
      const row = { ...payload, name };
      bucket(doctype).set(name, row);
      httpLog.push({ method: 'POST', doctype, http: 200 });
      return { ok: true, http: 200, row, error: null };
    },
    async update(doctype, name, payload) {
      const current = bucket(doctype).get(asString(name));
      if (!current) {
        httpLog.push({ method: 'PUT', doctype, name, http: 404 });
        return { ok: false, http: 404, row: null, error: 'NOT_FOUND' };
      }
      const row = { ...current, ...payload, name: current.name };
      bucket(doctype).set(current.name, row);
      httpLog.push({ method: 'PUT', doctype, name, http: 200 });
      return { ok: true, http: 200, row, error: null };
    },
  };
}

function seedRecords() {
  const cfg = loadProjectsSupportOpsConfig(REPO_ROOT);
  const tasks = cfg.reuse.tasks.map((name, idx) => ({
    name,
    subject: `CF920 task ${idx + 1}`,
    status: idx === 0 ? 'Overdue' : 'Open',
    progress: 0,
    owner: 'integrations@corpflowai.com',
    exp_start_date: `2026-08-${String(14 + idx).padStart(2, '0')} 00:00:00`,
    exp_end_date: `2026-08-${String(19 + idx).padStart(2, '0')} 00:00:00`,
    is_milestone: idx === 2 || idx === 5 || idx === 8 || idx === 11 ? 1 : 0,
    depends_on_tasks: idx === 0 ? '' : `${cfg.reuse.tasks[idx - 1]},`,
    parent_task: null,
    project: cfg.reuse.project,
  }));
  return {
    Project: [
      {
        name: cfg.reuse.project,
        project_name: cfg.reuse.project_name,
        status: 'Open',
        customer: cfg.reuse.customer,
        owner: 'integrations@corpflowai.com',
        project_manager: null,
        expected_start_date: '2026-08-14',
        expected_end_date: '2026-10-13',
        percent_complete_method: 'Task Completion',
        percent_complete: 0,
        project_template: cfg.reuse.project_template,
        company: 'CorpFlowAI LTD',
      },
    ],
    Task: tasks,
    Timesheet: [
      {
        name: cfg.reuse.timesheet,
        docstatus: 0,
        status: 'Draft',
        parent_project: cfg.reuse.project,
        employee: null,
        time_logs: [{ activity_type: 'Execution', hours: 1, project: cfg.reuse.project, task: cfg.reuse.tasks[0], is_billable: 0 }],
      },
    ],
    Issue: [
      {
        name: cfg.reuse.issue,
        subject: cfg.reuse.issue_subject,
        status: 'Open',
        priority: 'Medium',
        issue_type: cfg.reuse.issue_type,
        customer: cfg.reuse.customer,
        contact: null,
        project: cfg.reuse.project,
        owner: 'integrations@corpflowai.com',
        via_customer_portal: 0,
        description: 'GitHub #920 synthetic support Issue.',
      },
    ],
    ToDo: [],
    Communication: [],
  };
}

test('#1097 config reuses #920 records and forbids a second live client', () => {
  resetProjectsSupportOpsConfigCache();
  const cfg = loadProjectsSupportOpsConfig(REPO_ROOT);
  assert.equal(cfg.issue, 1097);
  assert.equal(cfg.acceptance_issue, 1202);
  assert.equal(cfg.acceptance_verdict, ACCEPTANCE_VERDICT);
  assert.equal(cfg.reuse.project, 'PROJ-0001');
  assert.equal(cfg.reuse.issue, 'ISS-2026-00001');
  assert.equal(cfg.reuse.timesheet, 'TS-2026-00001');
  assert.equal(cfg.reuse.tasks.length, 12);
  assert.equal(cfg.timesheet.verdict, 'DEFER');
  assert.equal(cfg.timesheet.do_not_submit, true);
  assert.equal(cfg.sla_assignment_rule.decision, 'DEFERRED');
  assert.equal(cfg.no_custom_doctypes, true);
  assert.equal(cfg.no_second_helpdesk_app, true);
  assert.equal(isForbiddenLiveCustomerName('Prestige Procurement'), true);
  assert.equal(isForbiddenLiveCustomerName('CF920 Synthetic Website Project Ltd'), false);
  assert.equal(timesheetVerdict(), 'DEFER');
  assert.equal(slaDecision(), 'DEFERRED');
  assert.ok(BRIDGE_IDS.includes('project_task_timesheet'));
  assert.ok(BRIDGE_IDS.includes('issue_support'));
  const files = [
    'docs/erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md',
    'docs/erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_ACCEPTANCE_V1.md',
    'docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md',
    'docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md',
    'docs/decisions/20260826-erpnext-projects-support-ops.md',
    'docs/decisions/20260827-erpnext-projects-support-ops-acceptance.md',
  ];
  for (const rel of files) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
  }
});

test('search-before-create reuses one Project and one Issue', () => {
  const projectReuse = searchBeforeCreateProject(
    {
      projects: [
        { name: 'PROJ-0001', project_name: 'CF920 Synthetic independent website', customer: 'CF920 Synthetic Website Project Ltd' },
      ],
    },
    { project_name: 'CF920 Synthetic independent website', customer: 'CF920 Synthetic Website Project Ltd', known_name: 'PROJ-0001' },
  );
  assert.equal(projectReuse.action, 'REUSE');
  assert.equal(projectReuse.name, 'PROJ-0001');
  assert.equal(projectReuse.duplicate_count, 1);
  const issueReuse = searchBeforeCreateIssue(
    { issues: [{ name: 'ISS-2026-00001', subject: 'CF920 synthetic support intake' }] },
    { subject: 'CF920 synthetic support intake', known_name: 'ISS-2026-00001' },
  );
  assert.equal(issueReuse.action, 'REUSE');
  assert.equal(issueReuse.duplicate_count, 1);
  const create = searchBeforeCreateProject({ projects: [] }, { project_name: 'New', customer: 'X' });
  assert.equal(create.action, 'CREATE');
});

test('next-action uses standard Task status without a custom field', () => {
  const next = nextActionFromTasks([
    { name: 'TASK-2', status: 'Open', exp_start_date: '2026-08-19', subject: 'later' },
    { name: 'TASK-1', status: 'Working', exp_start_date: '2026-08-14', subject: 'now' },
    { name: 'TASK-0', status: 'Completed', exp_start_date: '2026-08-01', subject: 'done' },
  ]);
  assert.equal(next.task, 'TASK-1');
  assert.equal(next.status, 'Working');
});

test('timesheet draft stays DEFER; submitted or billable is blocked', () => {
  assert.equal(classifyTimesheet({ docstatus: 0, time_logs: [{ is_billable: 0 }] }).verdict, 'DEFER');
  assert.equal(classifyTimesheet({ docstatus: 1, time_logs: [{ is_billable: 0 }] }).verdict, 'BLOCKED BY ACCOUNTING FOUNDATION');
  assert.equal(classifyTimesheet({ docstatus: 0, time_logs: [{ is_billable: 1 }] }).verdict, 'BLOCKED BY ACCOUNTING FOUNDATION');
});

test('delivery pointer merges into qualification_json without a new table', () => {
  const pointer = buildDeliveryPointer({
    delivery_ref: 'cf1097-synthetic-delivery',
    cmp_ticket_id: 'cf1097-synthetic-support',
    customer: 'CF920 Synthetic Website Project Ltd',
    opportunity: 'CRM-OPP-2026-00001',
    project: 'PROJ-0001',
    issue: 'ISS-2026-00001',
    timesheet: 'TS-2026-00001',
    idempotency_key: buildProjectIdempotencyKey('CF920 Synthetic Website Project Ltd', 'CF920 Synthetic independent website'),
    last_action: 'REUSE',
    updated_at: '2026-08-26T00:00:00Z',
  });
  assert.equal(pointer.schema, POINTER_SCHEMA);
  assert.equal(pointer.postgres_persist, 'not_written');
  assert.ok(pointer.idempotency_key.includes('corpflow.projects_support.v1:project='));
  assert.ok(buildIssueIdempotencyKey('CF920 synthetic support intake').includes(':issue='));
  const merged = mergeDeliveryPointerIntoQualificationJson({ erpnext: { customer: 'CF920 Synthetic Website Project Ltd' } }, pointer);
  assert.equal(merged.erpnext.customer, 'CF920 Synthetic Website Project Ltd');
  assert.equal(merged.erpnext.delivery.project, 'PROJ-0001');
});

test('readiness is READY only with reused live-shaped evidence', () => {
  const ready = evaluateOpsReadiness({
    postgres_written: false,
    send_attempted: false,
    timesheet_submitted: false,
    custom_doctype: false,
    project: 'PROJ-0001',
    issue: 'ISS-2026-00001',
    project_duplicate_count: 1,
    issue_duplicate_count: 1,
    project_readback: true,
    project_owner_proven: true,
    task_readback: true,
    issue_lifecycle_proven: true,
    issue_trail_proven: true,
    timesheet_verdict: 'DEFER',
    sla_decision: 'DEFERRED',
    created_on_replay: false,
  });
  assert.equal(ready.ok, true);
  assert.equal(ready.verdict, CANONICAL_VERDICT);
  const blocked = evaluateOpsReadiness({
    project: 'PROJ-NEW',
    issue: 'ISS-2026-00001',
    project_duplicate_count: 1,
    issue_duplicate_count: 1,
    project_readback: true,
    task_readback: true,
    issue_lifecycle_proven: true,
    issue_trail_proven: true,
    timesheet_verdict: 'DEFER',
    sla_decision: 'DEFERRED',
  });
  assert.equal(blocked.ok, false);
  assert.match(blocked.verdict, /NOT READY — PROJECT_NOT_REUSED/);
});

test('memory prove reuses #920 records, assigns owner, and close/reopens Issue', async () => {
  const client = createMemoryFrappeClient(seedRecords());
  const proof = await proveProjectsSupportOps(client, {
    repoRoot: REPO_ROOT,
    nowIso: '2026-08-26T04:00:00Z',
  });
  assert.equal(proof.ok, true);
  assert.equal(proof.verdict, CANONICAL_VERDICT);
  assert.equal(proof.project.name, 'PROJ-0001');
  assert.equal(proof.project.owner, 'integrations@corpflowai.com');
  assert.equal(proof.project.project_manager, 'integrations@corpflowai.com');
  assert.equal(proof.project.status, 'Open');
  assert.equal(proof.tasks.length, 12);
  assert.equal(proof.tasks[0].status, 'Working');
  assert.equal(proof.next_action.task, 'TASK-2026-00013');
  assert.equal(proof.timesheet.verdict, 'DEFER');
  assert.equal(proof.timesheet.docstatus, 0);
  assert.equal(proof.issue.name, 'ISS-2026-00001');
  assert.equal(proof.issue.status, 'Open');
  assert.equal(proof.issue.contact, 'Alex Synthetic');
  assert.equal(proof.issue_lifecycle.closed_status, 'Closed');
  assert.equal(proof.issue_lifecycle.reopened_status, 'Open');
  assert.equal(proof.issue_trail, 'communication_created');
  assert.equal(proof.idempotency.project_action, 'REUSE');
  assert.equal(proof.idempotency.issue_action, 'REUSE');
  assert.equal(proof.idempotency.project_duplicate_count, 1);
  assert.equal(proof.idempotency.issue_duplicate_count, 1);
  assert.equal(proof.created_on_replay, false);
  assert.equal(proof.sla.decision, 'DEFERRED');
  assert.equal(proof.sla.sla_http, 403);
  const replay = await proveProjectsSupportOps(client, { repoRoot: REPO_ROOT });
  assert.equal(replay.ok, true);
  assert.equal(replay.idempotency.project_duplicate_count, 1);
  assert.equal(replay.issue_trail, 'communication_reused');
  const conventions = operatingConventions();
  assert.ok(conventions.project_next_action.includes('Working'));
  assert.ok(conventions.issue_trail.includes('Other'));
});

test('canonical docs name reused #920 evidence and no secrets', () => {
  const doc = read('docs/erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md');
  assert.ok(doc.includes('<!-- ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1 -->'));
  assert.ok(doc.includes('PROJ-0001'));
  assert.ok(doc.includes('ISS-2026-00001'));
  assert.ok(doc.includes('TS-2026-00001'));
  assert.ok(doc.includes(CANONICAL_VERDICT));
  assert.ok(doc.includes('ERPNext PROJECTS / SUPPORT CURRENT-MAIN READY FOR REVIEW'));
  assert.ok(doc.includes('#1134'));
  assert.ok(doc.includes('Timesheet verdict: DEFER'));
  assert.ok(doc.includes('SLA'));
  assert.ok(doc.includes('DEFERRED'));
  assert.doesNotMatch(doc, SECRETISH);
});

test('apply script dry-run does not call ERPNext and mentions reuse', () => {
  const result = spawnSync(process.execPath, [APPLY, '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      ERPNEXT_API_SECRET: 'must-not-appear-in-output-1234567890',
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const out = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.match(out, /dry_run: 1/);
  assert.match(out, /PROJ-0001/);
  assert.match(out, /ISS-2026-00001/);
  assert.doesNotMatch(out, /must-not-appear-in-output-1234567890/);
  assert.doesNotMatch(out, /ERPNEXT_BASE_URL_value: https?:/);
});

test('live apply-log captures reused #920 IDs and no secret values', () => {
  resetProjectsSupportOpsConfigCache();
  const rel = 'artifacts/erpnext/projects-support-ops-1097/apply-log.json';
  assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
  const log = JSON.parse(read(rel));
  assert.equal(log.github_issue, 1097);
  assert.equal(log.secrets_printed, false);
  assert.equal(log.postgres_written, false);
  assert.equal(log.send_attempted, false);
  assert.equal(log.timesheet_submitted, false);
  assert.equal(log.reused_920.project, 'PROJ-0001');
  assert.equal(log.reused_920.issue, 'ISS-2026-00001');
  assert.equal(log.reused_920.timesheet, 'TS-2026-00001');
  assert.equal(log.issue.name, 'ISS-2026-00001');
  assert.equal(log.issue.status, 'Open');
  assert.equal(log.timesheet.verdict, 'DEFER');
  assert.equal(log.idempotency.project_action, 'REUSE');
  assert.equal(log.idempotency.issue_duplicate_count, 1);
  assert.match(String(log.verdict), /ERPNext PROJECTS \/ SUPPORT OPERATIONAL PROOF READY/);
  assert.doesNotMatch(read(rel), SECRETISH);
  assert.doesNotMatch(read(rel), /"ERPNEXT_API_SECRET"\s*:\s*"[^"]+"/);
});

function seedAcceptanceRecords() {
  const seed = seedRecords();
  seed.Issue[0].contact = 'Alex Synthetic';
  seed.Issue[0].description =
    'GitHub #920 synthetic support Issue. TEST-ONLY. Not a live client ticket.\n\nCF1097-OPS synthetic internal trail. TEST-ONLY. Do not send.';
  seed.Task[0].status = 'Working';
  seed.Task[0].progress = 10;
  seed.ToDo = [
    {
      name: 'todo-task-1',
      status: 'Open',
      allocated_to: 'integrations@corpflowai.com',
      reference_type: 'Task',
      reference_name: 'TASK-2026-00013',
      description: 'CF1097-OPS next action on TASK-2026-00013. TEST-ONLY. Do not email.',
    },
    {
      name: 'todo-issue-1',
      status: 'Open',
      allocated_to: 'integrations@corpflowai.com',
      reference_type: 'Issue',
      reference_name: 'ISS-2026-00001',
      description: 'CF1097-OPS next action on ISS-2026-00001. TEST-ONLY. Do not email.',
    },
  ];
  return seed;
}

test('#1202 GET-only acceptance reuses contract and forbids writes', async () => {
  const client = createMemoryFrappeClient(seedAcceptanceRecords());
  const wrapped = asReadOnlyFrappeClient(client);
  const created = await wrapped.create('Project', { project_name: 'must-not-create' });
  assert.equal(created.ok, false);
  assert.equal(created.error, 'ERPNEXT_WRITE_FORBIDDEN');
  assert.equal(wrapped.writes.length, 1);
  const contract = loadCloseReopenContract(REPO_ROOT);
  assert.equal(contract.proven, true);
  assert.equal(contract.closed_status, 'Closed');
  assert.equal(contract.reopened_status, 'Open');
});

test('#1202 inspect is GET-only and returns OPERATIONALLY USABLE', async () => {
  const client = createMemoryFrappeClient(seedAcceptanceRecords());
  const proof = await inspectProjectsSupportOps(client, {
    repoRoot: REPO_ROOT,
    nowIso: '2026-08-27T20:00:00Z',
  });
  assert.equal(proof.ok, true);
  assert.equal(proof.verdict, ACCEPTANCE_VERDICT);
  assert.equal(proof.write_attempted, false);
  assert.equal(proof.writes.length, 0);
  assert.equal(client.httpLog.some((row) => row.method === 'POST' || row.method === 'PUT'), false);
  assert.equal(proof.project.name, 'PROJ-0001');
  assert.equal(proof.project.customer, 'CF920 Synthetic Website Project Ltd');
  assert.equal(proof.project.status, 'Open');
  assert.equal(proof.project.owner, 'integrations@corpflowai.com');
  assert.equal(proof.tasks.length, 12);
  assert.equal(proof.next_action.task, 'TASK-2026-00013');
  assert.equal(proof.timesheet.verdict, 'DEFER');
  assert.equal(proof.timesheet.docstatus, 0);
  assert.equal(proof.timesheet.is_billable, 0);
  assert.equal(proof.issue.name, 'ISS-2026-00001');
  assert.equal(proof.issue.contact, 'Alex Synthetic');
  assert.equal(proof.issue.status, 'Open');
  assert.equal(proof.issue_trail, 'issue_description');
  assert.equal(proof.issue_lifecycle.close_reopen_this_run, 'not_attempted');
  assert.equal(proof.issue_lifecycle.contract_proven, true);
  assert.equal(proof.idempotency.project_action, 'REUSE');
  assert.equal(proof.idempotency.issue_action, 'REUSE');
  assert.equal(proof.idempotency.project_duplicate_count, 1);
  assert.equal(proof.idempotency.issue_duplicate_count, 1);
  assert.equal(proof.pointer.postgres_persist, 'not_written');
  assert.equal(proof.pointer.project, 'PROJ-0001');
  assert.equal(proof.created_on_replay, false);
});

test('#1202 acceptance is NOT READY when Timesheet is submitted', () => {
  const blocked = evaluateOpsAcceptance({
    write_attempted: false,
    postgres_written: false,
    send_attempted: false,
    timesheet_submitted: true,
    project: 'PROJ-0001',
    issue: 'ISS-2026-00001',
    project_duplicate_count: 1,
    issue_duplicate_count: 1,
    project_readback: true,
    project_owner_proven: true,
    task_readback: true,
    next_action_proven: true,
    timesheet_readback: true,
    issue_readback: true,
    issue_owner_proven: true,
    issue_trail_proven: true,
    issue_lifecycle_contract_proven: true,
    timesheet_verdict: 'BLOCKED BY ACCOUNTING FOUNDATION',
    pointer_postgres_persist: 'not_written',
    created_on_replay: false,
  });
  assert.equal(blocked.ok, false);
  assert.match(blocked.verdict, /NOT READY — TIMESHEET_SUBMITTED/);
});

test('#1202 inspect script dry-run does not call ERPNext', () => {
  const result = spawnSync(process.execPath, [INSPECT, '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      ERPNEXT_API_SECRET: 'must-not-appear-in-output-1234567890',
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const out = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.match(out, /dry_run: 1/);
  assert.match(out, /GET\/read-only/);
  assert.match(out, /PROJ-0001/);
  assert.match(out, /ISS-2026-00001/);
  assert.match(out, /erpnext_write: forbidden/);
  assert.doesNotMatch(out, /must-not-appear-in-output-1234567890/);
  assert.doesNotMatch(out, /ERPNEXT_BASE_URL_value: https?:/);
});

test('#1202 canonical acceptance doc names live IDs and no secrets', () => {
  const doc = read('docs/erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_ACCEPTANCE_V1.md');
  assert.ok(doc.includes('<!-- ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_ACCEPTANCE_V1 -->'));
  assert.ok(doc.includes('PROJ-0001'));
  assert.ok(doc.includes('ISS-2026-00001'));
  assert.ok(doc.includes('TS-2026-00001'));
  assert.ok(doc.includes(ACCEPTANCE_VERDICT));
  assert.ok(doc.includes('#1202'));
  assert.ok(doc.includes('b731411734edb01b7dbb8d7e20247c5a7805983a'));
  assert.ok(doc.includes('inspectProjectsSupportOps'));
  assert.doesNotMatch(doc, SECRETISH);
});

test('#1202 live inspect-log captures reused IDs and no secret values', () => {
  resetProjectsSupportOpsConfigCache();
  const rel = 'artifacts/erpnext/projects-support-ops-1202/inspect-log.json';
  assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
  const log = JSON.parse(read(rel));
  assert.equal(log.github_issue, 1202);
  assert.equal(log.current_main_sha, 'b731411734edb01b7dbb8d7e20247c5a7805983a');
  assert.equal(log.secrets_printed, false);
  assert.equal(log.postgres_written, false);
  assert.equal(log.send_attempted, false);
  assert.equal(log.timesheet_submitted, false);
  assert.equal(log.write_attempted, false);
  assert.equal(log.reused_920.project, 'PROJ-0001');
  assert.equal(log.reused_920.issue, 'ISS-2026-00001');
  assert.equal(log.reused_920.timesheet, 'TS-2026-00001');
  assert.equal(log.issue.name, 'ISS-2026-00001');
  assert.equal(log.issue.status, 'Open');
  assert.equal(log.timesheet.verdict, 'DEFER');
  assert.equal(log.timesheet.docstatus, 0);
  assert.equal(log.idempotency.project_action, 'REUSE');
  assert.equal(log.idempotency.project_duplicate_count, 1);
  assert.equal(log.idempotency.issue_duplicate_count, 1);
  assert.equal(log.pointer.postgres_persist, 'not_written');
  assert.equal(log.issue_lifecycle.close_reopen_this_run, 'not_attempted');
  assert.equal(log.verdict, ACCEPTANCE_VERDICT);
  assert.doesNotMatch(read(rel), SECRETISH);
  assert.doesNotMatch(read(rel), /"ERPNEXT_API_SECRET"\s*:\s*"[^"]+"/);
});
