/**
 * ERPNext onboarding E — Projects / Support operational proof (#1097).
 *
 * Reuses #920 synthetic Project / Task / Timesheet / Issue.
 * Operator/factory invoked. No cron. No schema. No send. No timesheet submit.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { rowMatchesFrappeFilter } from './customer-bridge.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-projects-support-ops.v1.json';

export const CANONICAL_VERDICT = 'ERPNext PROJECTS / SUPPORT OPERATIONAL PROOF READY';
export const POINTER_SCHEMA = 'corpflow.delivery.erpnext.v1';
export const BRIDGE_IDS = ['project_task_timesheet', 'issue_support'];

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadProjectsSupportOpsConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetProjectsSupportOpsConfigCache() {
  cachedConfig = null;
}

function asString(v) {
  return v == null ? '' : String(v).trim();
}

function asNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function includesSentinel(text, sentinel) {
  return asString(text).includes(asString(sentinel));
}

export function timesheetVerdict(repoRoot = REPO_ROOT) {
  return asString(loadProjectsSupportOpsConfig(repoRoot).timesheet?.verdict) || 'DEFER';
}

export function slaDecision(repoRoot = REPO_ROOT) {
  return asString(loadProjectsSupportOpsConfig(repoRoot).sla_assignment_rule?.decision) || 'DEFERRED';
}

export function operatingConventions(repoRoot = REPO_ROOT) {
  return { ...(loadProjectsSupportOpsConfig(repoRoot).operating_conventions || {}) };
}

export function isForbiddenLiveCustomerName(customerName, repoRoot = REPO_ROOT) {
  const forbidden = loadProjectsSupportOpsConfig(repoRoot).forbidden_customer_names || [];
  const want = asString(customerName).toLowerCase();
  return forbidden.some((name) => asString(name).toLowerCase() === want);
}

export function buildProjectIdempotencyKey(customerName, projectName, repoRoot = REPO_ROOT) {
  const prefix = asString(loadProjectsSupportOpsConfig(repoRoot).idempotency_prefix) || 'corpflow.projects_support.v1';
  return `${prefix}:project=${asString(customerName)}|${asString(projectName)}`;
}

export function buildIssueIdempotencyKey(subject, repoRoot = REPO_ROOT) {
  const prefix = asString(loadProjectsSupportOpsConfig(repoRoot).idempotency_prefix) || 'corpflow.projects_support.v1';
  return `${prefix}:issue=${asString(subject)}`;
}

/**
 * @param {{ projects?: Array<Record<string, unknown>> }} existing
 * @param {{ project_name: string, customer: string, known_name?: string }} candidate
 */
export function searchBeforeCreateProject(existing, candidate) {
  const wantName = asString(candidate.project_name).toLowerCase();
  const wantCustomer = asString(candidate.customer).toLowerCase();
  const wantKnown = asString(candidate.known_name).toLowerCase();
  const projects = Array.isArray(existing.projects) ? existing.projects : [];
  const hits = projects.filter((row) => {
    const name = asString(row.project_name || row.name).toLowerCase();
    const id = asString(row.name).toLowerCase();
    const customer = asString(row.customer).toLowerCase();
    const known = wantKnown && (id === wantKnown || name === wantKnown);
    const sameName = wantName && name === wantName;
    const sameCustomer = !wantCustomer || !customer || customer === wantCustomer;
    return (known || sameName) && sameCustomer;
  });
  if (hits.length) {
    return {
      action: 'REUSE',
      doctype: 'Project',
      name: asString(hits[0].name || hits[0].project_name),
      duplicate_count: hits.length,
    };
  }
  return { action: 'CREATE', doctype: 'Project', name: null, duplicate_count: 0 };
}

/**
 * @param {{ issues?: Array<Record<string, unknown>> }} existing
 * @param {{ subject: string, known_name?: string, cmp_ticket_id?: string }} candidate
 */
export function searchBeforeCreateIssue(existing, candidate) {
  const wantSubject = asString(candidate.subject).toLowerCase();
  const wantKnown = asString(candidate.known_name).toLowerCase();
  const ticket = asString(candidate.cmp_ticket_id).toLowerCase();
  const issues = Array.isArray(existing.issues) ? existing.issues : [];
  const hits = issues.filter((row) => {
    const name = asString(row.name).toLowerCase();
    const subject = asString(row.subject).toLowerCase();
    if (wantKnown && name === wantKnown) return true;
    if (wantSubject && subject === wantSubject) return true;
    if (ticket && subject.includes(ticket)) return true;
    return false;
  });
  if (hits.length) {
    return {
      action: 'REUSE',
      doctype: 'Issue',
      name: asString(hits[0].name),
      duplicate_count: hits.length,
    };
  }
  return { action: 'CREATE', doctype: 'Issue', name: null, duplicate_count: 0 };
}

/**
 * Next action is the first incomplete Task by expected start, without a custom field.
 * @param {Array<Record<string, unknown>>} tasks
 */
export function nextActionFromTasks(tasks) {
  const rows = Array.isArray(tasks) ? tasks : [];
  const incomplete = rows.filter((row) => {
    const status = asString(row.status).toLowerCase();
    return status && status !== 'completed' && status !== 'cancelled' && status !== 'template';
  });
  const rank = { working: 0, overdue: 1, open: 2, 'pending review': 3 };
  incomplete.sort((a, b) => {
    const ra = rank[asString(a.status).toLowerCase()] ?? 8;
    const rb = rank[asString(b.status).toLowerCase()] ?? 8;
    if (ra !== rb) return ra - rb;
    return asString(a.exp_start_date).localeCompare(asString(b.exp_start_date));
  });
  const next = incomplete[0] || null;
  return next
    ? {
        task: asString(next.name),
        subject: asString(next.subject),
        status: asString(next.status),
        owner: asString(next.owner || next.completed_by),
        exp_start_date: asString(next.exp_start_date),
      }
    : null;
}

export function classifyTimesheet(doc, repoRoot = REPO_ROOT) {
  const cfg = loadProjectsSupportOpsConfig(repoRoot);
  const docstatus = asNumber(doc?.docstatus, 0);
  const billable = asNumber((doc?.time_logs && doc.time_logs[0]?.is_billable) || doc?.is_billable, 0);
  if (docstatus !== 0) {
    return { verdict: 'BLOCKED BY ACCOUNTING FOUNDATION', reason: 'TIMESHEET_SUBMITTED', ok: false };
  }
  if (billable) {
    return { verdict: 'BLOCKED BY ACCOUNTING FOUNDATION', reason: 'TIMESHEET_BILLABLE', ok: false };
  }
  return {
    verdict: asString(cfg.timesheet?.verdict) || 'DEFER',
    reason: asString(cfg.timesheet?.reason),
    ok: true,
  };
}

export function buildDeliveryPointer(args, repoRoot = REPO_ROOT) {
  const cfg = loadProjectsSupportOpsConfig(repoRoot);
  return {
    schema: POINTER_SCHEMA,
    issue: cfg.issue,
    bridges: BRIDGE_IDS,
    delivery_ref: asString(args.delivery_ref),
    cmp_ticket_id: asString(args.cmp_ticket_id || ''),
    customer: asString(args.customer),
    opportunity: asString(args.opportunity || ''),
    project: asString(args.project),
    issue_name: asString(args.issue_name || args.issue || ''),
    timesheet: asString(args.timesheet || ''),
    idempotency_key: asString(args.idempotency_key),
    last_action: asString(args.last_action),
    updated_at: asString(args.updated_at),
    postgres_persist: 'not_written',
  };
}

/**
 * Pointer lives on qualification_json.erpnext.delivery. Does not add a column.
 * @param {unknown} qualificationJson
 * @param {Record<string, unknown>} pointer
 */
export function mergeDeliveryPointerIntoQualificationJson(qualificationJson, pointer) {
  const base =
    qualificationJson && typeof qualificationJson === 'object' && !Array.isArray(qualificationJson)
      ? { ...qualificationJson }
      : {};
  const previous =
    base.erpnext && typeof base.erpnext === 'object' && !Array.isArray(base.erpnext) ? { ...base.erpnext } : {};
  return {
    ...base,
    erpnext: {
      ...previous,
      delivery: {
        ...(previous.delivery && typeof previous.delivery === 'object' ? previous.delivery : {}),
        ...pointer,
      },
    },
  };
}

/**
 * Live or memory evidence. Repo-only config is never READY.
 *
 * @param {Record<string, unknown>} evidence
 */
export function evaluateOpsReadiness(evidence = {}, repoRoot = REPO_ROOT) {
  const cfg = loadProjectsSupportOpsConfig(repoRoot);
  const blockers = [];
  if (evidence.postgres_written === true) blockers.push('POSTGRES_WRITTEN');
  if (evidence.send_attempted === true) blockers.push('EXTERNAL_SEND_ATTEMPTED');
  if (evidence.timesheet_submitted === true) blockers.push('TIMESHEET_SUBMITTED');
  if (evidence.custom_doctype === true) blockers.push('CUSTOM_DOCTYPE');
  if (asString(evidence.project) !== asString(cfg.reuse.project)) blockers.push('PROJECT_NOT_REUSED');
  if (asString(evidence.issue) !== asString(cfg.reuse.issue)) blockers.push('ISSUE_NOT_REUSED');
  if (asNumber(evidence.project_duplicate_count, 0) !== 1) blockers.push('PROJECT_NOT_IDEMPOTENT');
  if (asNumber(evidence.issue_duplicate_count, 0) !== 1) blockers.push('ISSUE_NOT_IDEMPOTENT');
  if (evidence.project_readback !== true) blockers.push('PROJECT_READBACK_MISSING');
  if (evidence.project_owner_proven !== true) blockers.push('PROJECT_OWNER_UNPROVEN');
  if (evidence.task_readback !== true) blockers.push('TASK_READBACK_MISSING');
  if (evidence.issue_lifecycle_proven !== true) blockers.push('ISSUE_LIFECYCLE_UNPROVEN');
  if (evidence.issue_trail_proven !== true) blockers.push('ISSUE_TRAIL_UNPROVEN');
  if (asString(evidence.timesheet_verdict) !== 'DEFER') blockers.push('TIMESHEET_VERDICT_NOT_DEFER');
  if (asString(evidence.sla_decision) !== 'DEFERRED') blockers.push('SLA_NOT_DEFERRED');
  if (asString(evidence.created_on_replay) === 'true' || evidence.created_on_replay === true) {
    blockers.push('CREATED_ON_REPLAY');
  }
  return {
    ok: blockers.length === 0,
    verdict: blockers.length === 0 ? CANONICAL_VERDICT : `NOT READY — ${blockers[0]}`,
    blockers,
  };
}

async function listSafe(client, doctype, options) {
  const result = await client.list(doctype, options);
  return {
    ok: result?.ok === true,
    http: asNumber(result?.http, 0),
    rows: Array.isArray(result?.rows) ? result.rows : [],
    error: result?.error || null,
  };
}

function summarizeProject(row) {
  if (!row) return null;
  return {
    name: asString(row.name),
    project_name: asString(row.project_name),
    status: asString(row.status),
    customer: asString(row.customer),
    owner: asString(row.owner),
    project_manager: asString(row.project_manager),
    expected_start_date: asString(row.expected_start_date),
    expected_end_date: asString(row.expected_end_date),
    percent_complete_method: asString(row.percent_complete_method),
    percent_complete: asNumber(row.percent_complete, 0),
    project_template: asString(row.project_template),
    company: asString(row.company),
  };
}

function summarizeTask(row) {
  if (!row) return null;
  return {
    name: asString(row.name),
    subject: asString(row.subject),
    status: asString(row.status),
    progress: asNumber(row.progress, 0),
    owner: asString(row.owner),
    exp_start_date: asString(row.exp_start_date),
    exp_end_date: asString(row.exp_end_date),
    is_milestone: Boolean(row.is_milestone),
    depends_on_tasks: asString(row.depends_on_tasks),
    parent_task: asString(row.parent_task),
  };
}

function summarizeIssue(row) {
  if (!row) return null;
  return {
    name: asString(row.name),
    subject: asString(row.subject),
    status: asString(row.status),
    priority: asString(row.priority),
    issue_type: asString(row.issue_type),
    customer: asString(row.customer),
    contact: asString(row.contact),
    project: asString(row.project),
    owner: asString(row.owner),
    via_customer_portal: asNumber(row.via_customer_portal, 0),
    description: asString(row.description).slice(0, 240),
  };
}

/**
 * @param {object} client
 * @param {{ repoRoot?: string, nowIso?: string }} [opts]
 */
export async function proveProjectsSupportOps(client, opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const cfg = loadProjectsSupportOpsConfig(repoRoot);
  const nowIso = asString(opts.nowIso) || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const http = {};
  const gaps = [];

  const projectSearch = await listSafe(client, 'Project', {
    fields: ['name', 'project_name', 'customer', 'status'],
    filters: [['project_name', '=', cfg.reuse.project_name]],
    limit: 10,
  });
  http.project_search = projectSearch.http;
  const projectDecision = searchBeforeCreateProject(
    { projects: projectSearch.rows },
    {
      project_name: cfg.reuse.project_name,
      customer: cfg.reuse.customer,
      known_name: cfg.reuse.project,
    },
  );
  if (projectDecision.action !== 'REUSE' || asString(projectDecision.name) !== cfg.reuse.project) {
    return {
      ok: false,
      error: 'PROJECT_NOT_REUSED',
      http,
      created_on_replay: false,
    };
  }

  const projectGet = await client.get('Project', cfg.reuse.project);
  http.project_get = asNumber(projectGet?.http, 0);
  let projectRow = projectGet?.row || null;
  if (!projectRow) {
    return { ok: false, error: 'PROJECT_READBACK_MISSING', http, created_on_replay: false };
  }

  const hasProjectManagerField = Boolean(projectRow) && Object.prototype.hasOwnProperty.call(projectRow, 'project_manager');
  if (hasProjectManagerField && !asString(projectRow.project_manager) && cfg.synthetic.project_manager_user) {
    const updated = await client.update('Project', cfg.reuse.project, {
      project_manager: cfg.synthetic.project_manager_user,
    });
    http.project_manager_put = asNumber(updated?.http, 0);
    if (updated?.ok) {
      const refreshed = await client.get('Project', cfg.reuse.project);
      http.project_get = asNumber(refreshed?.http, http.project_get);
      if (refreshed?.row) projectRow = refreshed.row;
    } else {
      gaps.push('PROJECT_MANAGER_WRITE_FAILED');
    }
  } else if (!hasProjectManagerField) {
    gaps.push('PROJECT_MANAGER_FIELD_ABSENT');
  }

  const taskList = await listSafe(client, 'Task', {
    fields: [
      'name',
      'subject',
      'status',
      'progress',
      'owner',
      'exp_start_date',
      'exp_end_date',
      'is_milestone',
      'depends_on_tasks',
      'parent_task',
      'project',
    ],
    filters: [['project', '=', cfg.reuse.project]],
    limit: 50,
  });
  http.task_list = taskList.http;
  let tasks = taskList.rows.map(summarizeTask).filter(Boolean);
  const firstTaskName = asString(cfg.reuse.tasks[0]);
  const firstTask = tasks.find((row) => row.name === firstTaskName) || tasks[0] || null;
  if (firstTask && asString(firstTask.status).toLowerCase() !== 'working' && asString(firstTask.status).toLowerCase() !== 'completed') {
    const updatedTask = await client.update('Task', firstTask.name, {
      status: 'Working',
      progress: Math.max(asNumber(firstTask.progress, 0), 10),
    });
    http.task_status_put = asNumber(updatedTask?.http, 0);
    if (updatedTask?.ok) {
      const refreshedTasks = await listSafe(client, 'Task', {
        fields: [
          'name',
          'subject',
          'status',
          'progress',
          'owner',
          'exp_start_date',
          'exp_end_date',
          'is_milestone',
          'depends_on_tasks',
          'parent_task',
          'project',
        ],
        filters: [['project', '=', cfg.reuse.project]],
        limit: 50,
      });
      http.task_list = refreshedTasks.http;
      if (refreshedTasks.ok) tasks = refreshedTasks.rows.map(summarizeTask).filter(Boolean);
    } else {
      gaps.push('TASK_STATUS_WRITE_FAILED');
    }
  }

  const taskTodos = await listSafe(client, 'ToDo', {
    fields: ['name', 'status', 'allocated_to', 'reference_type', 'reference_name', 'description'],
    filters: [
      ['reference_type', '=', 'Task'],
      ['reference_name', '=', firstTaskName],
    ],
    limit: 10,
  });
  http.task_todo_list = taskTodos.http;
  if (taskTodos.ok && taskTodos.rows.length === 0 && firstTaskName) {
    const createdTodo = await client.create('ToDo', {
      doctype: 'ToDo',
      allocated_to: cfg.synthetic.assignee_user,
      reference_type: 'Task',
      reference_name: firstTaskName,
      description: `${cfg.synthetic.sentinel} next action on ${firstTaskName}. TEST-ONLY. Do not email.`,
      status: 'Open',
      priority: 'Medium',
    });
    http.task_todo_create = asNumber(createdTodo?.http, 0);
    if (!createdTodo?.ok) gaps.push('TASK_TODO_WRITE_FAILED');
  }

  const timesheetGet = await client.get('Timesheet', cfg.reuse.timesheet);
  http.timesheet_get = asNumber(timesheetGet?.http, 0);
  const timesheetClass = classifyTimesheet(timesheetGet?.row || {}, repoRoot);

  const issueSearch = await listSafe(client, 'Issue', {
    fields: ['name', 'subject', 'status', 'customer', 'project'],
    filters: [['subject', '=', cfg.reuse.issue_subject]],
    limit: 10,
  });
  http.issue_search = issueSearch.http;
  const issueDecision = searchBeforeCreateIssue(
    { issues: issueSearch.rows },
    {
      subject: cfg.reuse.issue_subject,
      known_name: cfg.reuse.issue,
      cmp_ticket_id: cfg.synthetic.cmp_ticket_id,
    },
  );
  if (issueDecision.action !== 'REUSE' || asString(issueDecision.name) !== cfg.reuse.issue) {
    return { ok: false, error: 'ISSUE_NOT_REUSED', http, created_on_replay: false };
  }

  const issueGet = await client.get('Issue', cfg.reuse.issue);
  http.issue_get = asNumber(issueGet?.http, 0);
  let issueRow = issueGet?.row || null;
  if (!issueRow) {
    return { ok: false, error: 'ISSUE_READBACK_MISSING', http, created_on_replay: false };
  }

  if (!asString(issueRow.contact) && cfg.reuse.contact) {
    const linked = await client.update('Issue', cfg.reuse.issue, { contact: cfg.reuse.contact });
    http.issue_contact_put = asNumber(linked?.http, 0);
    if (linked?.ok && linked.row) issueRow = linked.row;
    else gaps.push('ISSUE_CONTACT_WRITE_FAILED');
  }

  const commList = await listSafe(client, 'Communication', {
    fields: ['name', 'subject', 'communication_medium', 'sent_or_received', 'reference_doctype', 'reference_name'],
    filters: [
      ['reference_doctype', '=', 'Issue'],
      ['reference_name', '=', cfg.reuse.issue],
    ],
    limit: 20,
  });
  http.communication_list = commList.http;
  let trailKind = null;
  const existingComm = commList.rows.find((row) => includesSentinel(row.subject || row.content, cfg.synthetic.sentinel));
  if (existingComm) {
    trailKind = 'communication_reused';
  } else if (includesSentinel(issueRow.description, cfg.synthetic.sentinel)) {
    trailKind = 'issue_description';
  } else if (commList.ok) {
    const createdComm = await client.create('Communication', {
      doctype: 'Communication',
      communication_type: 'Communication',
      communication_medium: 'Other',
      sent_or_received: 'Received',
      subject: cfg.synthetic.communication_subject,
      content: `${cfg.synthetic.sentinel} synthetic internal trail. TEST-ONLY. Do not send to a client.`,
      reference_doctype: 'Issue',
      reference_name: cfg.reuse.issue,
    });
    http.communication_create = asNumber(createdComm?.http, 0);
    if (createdComm?.ok) trailKind = 'communication_created';
  }

  if (!trailKind) {
    const stamp = `${asString(issueRow.description)}\n\n${cfg.synthetic.sentinel} synthetic internal trail. TEST-ONLY. Do not send.`;
    const described = await client.update('Issue', cfg.reuse.issue, { description: stamp });
    http.issue_description_put = asNumber(described?.http, 0);
    if (described?.ok && described.row) {
      issueRow = described.row;
      trailKind = 'issue_description';
    } else {
      gaps.push('ISSUE_TRAIL_WRITE_FAILED');
    }
  }

  const issueTodos = await listSafe(client, 'ToDo', {
    fields: ['name', 'status', 'allocated_to', 'reference_type', 'reference_name', 'description'],
    filters: [
      ['reference_type', '=', 'Issue'],
      ['reference_name', '=', cfg.reuse.issue],
    ],
    limit: 10,
  });
  http.issue_todo_list = issueTodos.http;
  if (issueTodos.ok && issueTodos.rows.length === 0) {
    const createdIssueTodo = await client.create('ToDo', {
      doctype: 'ToDo',
      allocated_to: cfg.synthetic.assignee_user,
      reference_type: 'Issue',
      reference_name: cfg.reuse.issue,
      description: `${cfg.synthetic.sentinel} next action on ${cfg.reuse.issue}. TEST-ONLY. Do not email.`,
      status: 'Open',
      priority: 'Medium',
    });
    http.issue_todo_create = asNumber(createdIssueTodo?.http, 0);
    if (!createdIssueTodo?.ok) gaps.push('ISSUE_TODO_WRITE_FAILED');
  }

  const closed = await client.update('Issue', cfg.reuse.issue, {
    status: 'Closed',
    resolution_details: `${cfg.synthetic.sentinel} synthetic close proof. TEST-ONLY.`,
  });
  http.issue_close = asNumber(closed?.http, 0);
  const closedStatus = asString(closed?.row?.status);
  const reopened = await client.update('Issue', cfg.reuse.issue, { status: 'Open' });
  http.issue_reopen = asNumber(reopened?.http, 0);
  if (reopened?.ok) {
    const refreshedIssue = await client.get('Issue', cfg.reuse.issue);
    http.issue_get = asNumber(refreshedIssue?.http, http.issue_get);
    if (refreshedIssue?.row) issueRow = refreshedIssue.row;
  }
  const lifecycleProven = closed?.ok === true && closedStatus === 'Closed' && asString(issueRow?.status) === 'Open';
  if (!lifecycleProven) gaps.push('ISSUE_LIFECYCLE_WRITE_FAILED');

  const slaList = await listSafe(client, 'SLA', { fields: ['name'], limit: 1 });
  const assignmentRuleList = await listSafe(client, 'Assignment Rule', { fields: ['name'], limit: 1 });
  http.sla = slaList.http;
  http.assignment_rule = assignmentRuleList.http;

  const projectReplay = await listSafe(client, 'Project', {
    fields: ['name', 'project_name', 'customer', 'status'],
    filters: [['project_name', '=', cfg.reuse.project_name]],
    limit: 10,
  });
  const issueReplay = await listSafe(client, 'Issue', {
    fields: ['name', 'subject', 'status'],
    filters: [['subject', '=', cfg.reuse.issue_subject]],
    limit: 10,
  });
  const replayProject = searchBeforeCreateProject(
    { projects: projectReplay.rows },
    { project_name: cfg.reuse.project_name, customer: cfg.reuse.customer, known_name: cfg.reuse.project },
  );
  const replayIssue = searchBeforeCreateIssue(
    { issues: issueReplay.rows },
    { subject: cfg.reuse.issue_subject, known_name: cfg.reuse.issue },
  );

  const pointer = buildDeliveryPointer(
    {
      delivery_ref: cfg.synthetic.delivery_ref,
      cmp_ticket_id: cfg.synthetic.cmp_ticket_id,
      customer: cfg.reuse.customer,
      opportunity: cfg.reuse.opportunity,
      project: cfg.reuse.project,
      issue: cfg.reuse.issue,
      timesheet: cfg.reuse.timesheet,
      idempotency_key: buildProjectIdempotencyKey(cfg.reuse.customer, cfg.reuse.project_name, repoRoot),
      last_action: 'REUSE',
      updated_at: nowIso,
    },
    repoRoot,
  );

  const evidence = {
    postgres_written: false,
    send_attempted: false,
    timesheet_submitted: asNumber(timesheetGet?.row?.docstatus, 0) !== 0,
    custom_doctype: false,
    project: cfg.reuse.project,
    issue: cfg.reuse.issue,
    project_duplicate_count: replayProject.duplicate_count,
    issue_duplicate_count: replayIssue.duplicate_count,
    project_readback: Boolean(projectRow),
    project_owner_proven: Boolean(asString(projectRow?.owner)),
    task_readback: tasks.length >= 12,
    issue_lifecycle_proven: lifecycleProven,
    issue_trail_proven: Boolean(trailKind),
    timesheet_verdict: timesheetClass.verdict,
    sla_decision: slaDecision(repoRoot),
    created_on_replay: replayProject.action !== 'REUSE' || replayIssue.action !== 'REUSE',
  };
  const readiness = evaluateOpsReadiness(evidence, repoRoot);

  return {
    ok: readiness.ok,
    verdict: readiness.verdict,
    blockers: readiness.blockers,
    gaps,
    http,
    created_on_replay: false,
    project: summarizeProject(projectRow),
    tasks,
    next_action: nextActionFromTasks(tasks),
    timesheet: {
      name: asString(timesheetGet?.row?.name || cfg.reuse.timesheet),
      docstatus: asNumber(timesheetGet?.row?.docstatus, 0),
      status: asString(timesheetGet?.row?.status),
      parent_project: asString(timesheetGet?.row?.parent_project),
      employee: asString(timesheetGet?.row?.employee),
      is_billable: asNumber(timesheetGet?.row?.time_logs?.[0]?.is_billable, 0),
      ...timesheetClass,
    },
    issue: summarizeIssue(issueRow),
    issue_lifecycle: {
      closed_status: closedStatus,
      reopened_status: asString(reopened?.row?.status),
      proven: lifecycleProven,
    },
    issue_trail: trailKind,
    sla: {
      decision: slaDecision(repoRoot),
      sla_http: slaList.http,
      assignment_rule_http: assignmentRuleList.http,
    },
    idempotency: {
      project_action: replayProject.action,
      issue_action: replayIssue.action,
      project_duplicate_count: replayProject.duplicate_count,
      issue_duplicate_count: replayIssue.duplicate_count,
    },
    pointer,
    opportunity: cfg.reuse.opportunity,
    opportunity_link_on_project: 'not_a_standard_project_field',
    doctypes: cfg.standard_doctypes,
    statuses: cfg.standard_statuses,
  };
}

export { rowMatchesFrappeFilter };
