/**
 * #1156 — Delivery Workspace ↔ ERPNext Project/Issue continuity.
 *
 * Read-only projection of an *existing* corpflow.delivery.erpnext.v1 pointer
 * into Operating Workspace Delivery. Reuses #918 / #1097 / #1144 records.
 * Does not invent a join, copy task/support history into Postgres, mutate
 * ERPNext, or add schema.
 *
 * Config load uses process.cwd() (no import.meta) so this module stays legal
 * on the CJS-wrapped factory_router graph (#1015).
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createFrappeRestClient } from './frappe-rest-client.js';

const REPO_ROOT = process.cwd();
const CONFIG_REL = 'config/erpnext-projects-support-ops.v1.json';
const FIXTURE_REL = 'fixtures/erpnext-projects-support-ops/synthetic-delivery.json';
const APPLY_LOG_REL = 'artifacts/erpnext/projects-support-ops-1097/apply-log.json';
const LIVE_GET_TIMEOUT_MS = 8000;

export const POINTER_SCHEMA = 'corpflow.delivery.erpnext.v1';

export const CONTINUITY_VERDICT = 'DELIVERY -> ERPNEXT PROJECT/SUPPORT CONTINUITY USABLE';
export const BLOCKER_PREFIX = 'NOT READY —';

function asString(value) {
  return value == null ? '' : String(value).trim();
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : null;
}

function loadOpsConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

/**
 * Existing synthetic delivery ↔ ERPNext Project/Issue contract.
 * Composes the #1097 fixture with the reused #920/#1144 identifiers.
 * Does not invent names.
 *
 * Config load uses process.cwd() so this module stays legal on the
 * CJS-wrapped factory_router graph (#1015).
 *
 * @param {string} [repoRoot]
 */
export function loadExistingDeliveryErpnextContract(repoRoot = REPO_ROOT) {
  const cfg = loadOpsConfig(repoRoot);
  const fixturePath = path.join(repoRoot, FIXTURE_REL);
  const fixture = existsSync(fixturePath)
    ? JSON.parse(readFileSync(fixturePath, 'utf8'))
    : {};
  const deliveryRef = asString(fixture.delivery_ref) || asString(cfg.synthetic?.delivery_ref);
  const cmpTicketId = asString(fixture.cmp_ticket_id) || asString(cfg.synthetic?.cmp_ticket_id);
  const customer = asString(fixture.customer_name) || asString(cfg.reuse?.customer);
  const opportunity = asString(fixture.opportunity) || asString(cfg.reuse?.opportunity);
  const projectName = asString(fixture.project_name) || asString(cfg.reuse?.project_name);
  const project = asString(fixture.project) || asString(cfg.reuse?.project);
  const issueName = asString(fixture.issue_name) || asString(cfg.reuse?.issue);
  return {
    schema: POINTER_SCHEMA,
    issue: cfg.issue,
    bridges: ['project_task_timesheet', 'issue_support'],
    delivery_ref: deliveryRef,
    cmp_ticket_id: cmpTicketId,
    customer,
    opportunity,
    project_name: projectName,
    project,
    issue_name: issueName,
    timesheet: asString(cfg.reuse?.timesheet),
    postgres_persist: 'not_written',
    source_contract: POINTER_SCHEMA,
  };
}

/**
 * @param {Record<string, unknown> | null} raw
 */
export function normalizeExistingDeliveryPointer(raw) {
  const row = asRecord(raw);
  if (!row) return null;
  const project = asString(row.project);
  const issueName = asString(row.issue_name || (typeof row.issue === 'string' ? row.issue : ''));
  const deliveryRef = asString(row.delivery_ref);
  const cmpTicketId = asString(row.cmp_ticket_id);
  const customer = asString(row.customer || row.customer_name);
  const projectName = asString(row.project_name);
  if (!project && !issueName && !deliveryRef && !cmpTicketId && !(customer && projectName)) {
    return null;
  }
  if (asString(row.schema) && asString(row.schema) !== POINTER_SCHEMA) {
    return null;
  }
  return {
    schema: POINTER_SCHEMA,
    delivery_ref: deliveryRef,
    cmp_ticket_id: cmpTicketId,
    customer,
    opportunity: asString(row.opportunity),
    project_name: projectName,
    project,
    issue_name: issueName,
    timesheet: asString(row.timesheet),
    postgres_persist: asString(row.postgres_persist) || 'not_written',
  };
}

/**
 * Read an already-recorded pointer. Does not invent Project/Issue names.
 *
 * @param {unknown} record
 */
export function extractExistingDeliveryPointer(record) {
  const row = asRecord(record);
  if (!row) return null;
  const qj = asRecord(row.qualificationJson) || asRecord(row.qualification_json) || {};
  const consoleJson = asRecord(row.console_json) || asRecord(row.consoleJson) || {};
  const nestedErpnext = asRecord(row.erpnext);
  const candidates = [
    row.erpnext_delivery,
    nestedErpnext && nestedErpnext.delivery,
    asRecord(qj.erpnext)?.delivery,
    asRecord(consoleJson.erpnext)?.delivery,
  ];
  for (const candidate of candidates) {
    const pointer = normalizeExistingDeliveryPointer(asRecord(candidate));
    if (pointer) return pointer;
  }
  return null;
}

/**
 * Match only on the existing #918 / #1097 contract keys.
 * Organisation-name guesses are rejected.
 *
 * @param {ReturnType<typeof normalizeExistingDeliveryPointer>} pointer
 * @param {ReturnType<typeof loadExistingDeliveryErpnextContract>} contract
 */
export function pointerMatchesExistingContract(pointer, contract) {
  if (!pointer || !contract) return false;
  if (pointer.project && pointer.project === contract.project) return true;
  if (pointer.issue_name && pointer.issue_name === contract.issue_name) return true;
  if (pointer.delivery_ref && pointer.delivery_ref === contract.delivery_ref) return true;
  if (pointer.cmp_ticket_id && pointer.cmp_ticket_id === contract.cmp_ticket_id) return true;
  if (
    pointer.customer &&
    pointer.project_name &&
    pointer.customer === contract.customer &&
    pointer.project_name === contract.project_name
  ) {
    return true;
  }
  return false;
}

/**
 * @param {string} sourceId
 * @param {ReturnType<typeof loadExistingDeliveryErpnextContract>} contract
 */
export function sourceIdMatchesExistingContract(sourceId, contract) {
  const id = asString(sourceId);
  if (!id || !contract) return false;
  return id === contract.delivery_ref || id === contract.cmp_ticket_id;
}

/**
 * GET-only client wrapper. Create/update throw.
 *
 * @param {{ get: Function, list?: Function, create?: Function, update?: Function }} client
 */
export function asReadOnlyFrappeClient(client) {
  if (!client || typeof client.get !== 'function') {
    throw new Error('FRAPPE_READONLY_MISSING_GET');
  }
  return {
    kind: 'frappe-rest-readonly',
    async get(doctype, name) {
      return client.get(doctype, name);
    },
    async list(...args) {
      if (typeof client.list !== 'function') {
        throw new Error('FRAPPE_READONLY_MISSING_LIST');
      }
      return client.list(...args);
    },
    async create() {
      throw new Error('ERPNEXT_WRITE_FORBIDDEN');
    },
    async update() {
      throw new Error('ERPNEXT_WRITE_FORBIDDEN');
    },
  };
}

function boundedProject(row) {
  const rec = asRecord(row);
  if (!rec) return null;
  const name = asString(rec.name);
  if (!name) return null;
  return {
    name,
    project_name: asString(rec.project_name),
    status: asString(rec.status) || null,
    customer: asString(rec.customer) || null,
    doctype: 'Project',
  };
}

function boundedIssue(row) {
  const rec = asRecord(row);
  if (!rec) return null;
  const name = asString(rec.name);
  if (!name) return null;
  return {
    name,
    status: asString(rec.status) || null,
    customer: asString(rec.customer) || null,
    project: asString(rec.project) || null,
    doctype: 'Issue',
  };
}

/**
 * Live GET of Project/Issue status only. No Task list, no description copy.
 *
 * @param {{ get: Function }} client
 * @param {{ project?: string, issue_name?: string }} pointer
 */
export async function fetchBoundedErpnextStatus(client, pointer) {
  const readonly = asReadOnlyFrappeClient(client);
  const http = {};
  let project = null;
  let issue = null;
  const projectName = asString(pointer?.project);
  const issueName = asString(pointer?.issue_name);
  if (projectName) {
    const got = await readonly.get('Project', projectName);
    http.project_get = Number(got?.http) || 0;
    if (got?.ok && got.row) project = boundedProject(got.row);
  }
  if (issueName) {
    const got = await readonly.get('Issue', issueName);
    http.issue_get = Number(got?.http) || 0;
    if (got?.ok && got.row) issue = boundedIssue(got.row);
  }
  return {
    mutated: false,
    status_source: project || issue ? 'erpnext_get' : 'unread',
    project,
    issue,
    http,
  };
}

/**
 * Last proven hosted-test read-back (apply-log). Identifiers + status only.
 * Not a live GET and not a Postgres copy.
 *
 * @param {string} [repoRoot]
 */
export function recordedBoundedStatusFromApplyLog(repoRoot = REPO_ROOT) {
  const file = path.join(repoRoot, APPLY_LOG_REL);
  if (!existsSync(file)) return null;
  const log = JSON.parse(readFileSync(file, 'utf8'));
  const project = boundedProject(log.project);
  const issue = boundedIssue(log.issue);
  if (!project && !issue) return null;
  return {
    mutated: false,
    status_source: 'recorded_1097_readback',
    project,
    issue,
    http: {},
  };
}

function emptyStatus() {
  return {
    mutated: false,
    status_source: 'unread',
    project: null,
    issue: null,
    http: {},
  };
}

/**
 * @param {{
 *   pointer: ReturnType<typeof loadExistingDeliveryErpnextContract>,
 *   status?: { project?: unknown, issue?: unknown, status_source?: string, mutated?: boolean },
 * }} args
 */
export function projectBoundedErpnextBlock(args) {
  const pointer = args.pointer;
  const status = args.status || emptyStatus();
  const project =
    boundedProject(status.project) ||
    (pointer?.project
      ? {
          name: pointer.project,
          project_name: asString(pointer.project_name),
          status: null,
          customer: asString(pointer.customer) || null,
          doctype: 'Project',
        }
      : null);
  const issue =
    boundedIssue(status.issue) ||
    (pointer?.issue_name
      ? {
          name: pointer.issue_name,
          status: null,
          customer: asString(pointer.customer) || null,
          project: pointer.project || null,
          doctype: 'Issue',
        }
      : null);
  const linked = Boolean(project?.name || issue?.name);
  if (project && status.project && asRecord(status.project)?.status) {
    project.status = asString(asRecord(status.project)?.status);
  }
  if (issue && status.issue && asRecord(status.issue)?.status) {
    issue.status = asString(asRecord(status.issue)?.status);
  }
  return {
    schema: POINTER_SCHEMA,
    linked,
    authoritative: linked,
    mutated: false,
    postgres_persist: 'not_written',
    task_history_copied: false,
    delivery_ref: asString(pointer?.delivery_ref) || null,
    cmp_ticket_id: asString(pointer?.cmp_ticket_id) || null,
    customer: asString(pointer?.customer) || null,
    opportunity: asString(pointer?.opportunity) || null,
    project,
    issue,
    status_source: asString(status.status_source) || (linked ? 'unread' : 'unlinked'),
    drilldown_kind: 'operator_reference',
  };
}

export function unlinkedErpnextBlock() {
  return {
    schema: POINTER_SCHEMA,
    linked: false,
    authoritative: false,
    mutated: false,
    postgres_persist: 'not_written',
    task_history_copied: false,
    delivery_ref: null,
    cmp_ticket_id: null,
    customer: null,
    opportunity: null,
    project: null,
    issue: null,
    status_source: 'unlinked',
    drilldown_kind: 'operator_reference',
  };
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function tryCreateReadOnlyFrappeClient(env = process.env) {
  const baseUrl = asString(env.ERPNEXT_BASE_URL);
  const apiKey = asString(env.ERPNEXT_API_KEY);
  const apiSecret = asString(env.ERPNEXT_API_SECRET);
  if (!baseUrl || !apiKey || !apiSecret) return null;
  return asReadOnlyFrappeClient(
    createFrappeRestClient({
      baseUrl,
      apiKey,
      apiSecret,
      timeoutMs: LIVE_GET_TIMEOUT_MS,
    }),
  );
}

/**
 * @param {{
 *   pointer: ReturnType<typeof loadExistingDeliveryErpnextContract>,
 *   allowLiveGet?: boolean,
 *   allowRecordedReadback?: boolean,
 *   client?: { get: Function } | null,
 *   repoRoot?: string,
 * }} opts
 */
export async function resolveBoundedErpnextStatus(opts) {
  const pointer = opts.pointer;
  if (opts.client) {
    try {
      return await fetchBoundedErpnextStatus(opts.client, pointer);
    } catch {
      return emptyStatus();
    }
  }
  if (opts.allowLiveGet) {
    const client = tryCreateReadOnlyFrappeClient();
    if (client) {
      try {
        const live = await fetchBoundedErpnextStatus(client, pointer);
        if (live.project || live.issue) return live;
      } catch {
        /* fail-soft */
      }
    }
  }
  if (opts.allowRecordedReadback) {
    return recordedBoundedStatusFromApplyLog(opts.repoRoot) || emptyStatus();
  }
  return emptyStatus();
}

/**
 * Exact blocker when the existing synthetic Project/Issue names are missing.
 *
 * @param {ReturnType<typeof loadExistingDeliveryErpnextContract>} contract
 */
export function existingReferenceBlocker(contract) {
  if (!contract?.project) {
    return `${BLOCKER_PREFIX} missing existing ERPNext Project name on corpflow.delivery.erpnext.v1`;
  }
  if (!contract?.issue_name) {
    return `${BLOCKER_PREFIX} missing existing ERPNext Issue name on corpflow.delivery.erpnext.v1`;
  }
  if (!contract?.delivery_ref && !contract?.cmp_ticket_id) {
    return `${BLOCKER_PREFIX} missing existing delivery_ref / cmp_ticket_id on corpflow.delivery.erpnext.v1`;
  }
  return null;
}
