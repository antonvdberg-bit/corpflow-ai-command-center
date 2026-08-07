/**
 * Normalize production-shaped cmp_tickets rows (and fixtures) into the
 * AppRequest contract used by Core/Tenant projectors.
 *
 * No schema change. console_json.client_view.components may be present in
 * JSON (optional); when absent, delivery components are derived from
 * existing workflow / preview_review / promotion fields.
 */

import {
  MILESTONE_META,
  REFERENCE_TENANT_ID,
} from './constants.js';
import { normalizeMilestone } from './progress-rollup.js';
import {
  buildTicketProgress,
  deriveWorkflowState,
  nextActionForWorkflowState,
} from '../cmp/_lib/change-workflow-state.js';

/**
 * @typedef {{
 *   key: string,
 *   title: string,
 *   milestone: string,
 *   exposed_for_client_review: boolean,
 *   client_safe_summary: string,
 *   client_safe_status: string,
 *   attention_required: boolean,
 *   internal_task_ref: string | null,
 *   internal_evidence_refs: string[],
 *   internal_note: string | null,
 *   github: { pr_number: number, commit_sha: string, ci: string } | null,
 *   reviews: Array<{
 *     decision: string,
 *     comment: string,
 *     decided_at: string,
 *     by_role: string,
 *   }>,
 * }} AppComponent
 *
 * @typedef {{
 *   id: string,
 *   tenant_id: string,
 *   title: string,
 *   outcome: string,
 *   status: string,
 *   stage: string,
 *   owner: string | null,
 *   waiting_party: 'client'|'corpflow'|'none',
 *   updated_at: string | null,
 *   client_safe_blocker: string | null,
 *   internal_blocker: string | null,
 *   attention_required: boolean,
 *   console_json: {
 *     client_view: {
 *       workflow_state: string,
 *       workflow_next_action?: string,
 *       progress_message: string,
 *       latest_client_safe_update?: string | null,
 *       components: AppComponent[],
 *       preview_review?: Record<string, unknown> | null,
 *     },
 *     promotion?: { pr_number?: number, merged?: boolean } | null,
 *     technical_lead?: { summary?: string } | null,
 *     [k: string]: unknown,
 *   },
 *   source: 'fixture' | 'cmp_ticket',
 * }} AppRequest
 */

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {};
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function rowId(row) {
  const r = asObject(row);
  return String(r.id || r.ticket_id || '').trim();
}

/**
 * @param {unknown} row
 * @returns {string}
 */
function rowTenantId(row) {
  const r = asObject(row);
  return String(r.tenant_id || r.tenantId || '').trim();
}

/**
 * Map Change Console workflow → component milestone.
 * @param {string} workflow
 */
export function workflowToMilestone(workflow) {
  const w = String(workflow || '').trim().toLowerCase();
  switch (w) {
    case 'intake':
      return 'not_started';
    case 'refining':
    case 'ready_for_estimate':
    case 'estimated':
      return 'defined';
    case 'approved_for_build':
    case 'awaiting_client_programme_decisions':
    case 'building':
    case 'changes_requested':
      return 'in_progress';
    case 'preview_ready':
      return 'preview_ready';
    case 'in_review':
      return 'client_review';
    case 'client_approved':
    case 'publishing':
      return 'approved';
    case 'published':
    case 'closed':
      return 'live_verified';
    default:
      return 'not_started';
  }
}

/**
 * @param {string} workflow
 * @param {{ attention?: boolean, exposed?: boolean }} [opts]
 * @returns {'client'|'corpflow'|'none'}
 */
export function waitingPartyForWorkflow(workflow, opts = {}) {
  const w = String(workflow || '').trim().toLowerCase();
  if (opts.exposed === true || opts.attention === true) return 'client';
  if (
    w === 'in_review' ||
    w === 'preview_ready' ||
    w === 'awaiting_client_programme_decisions'
  ) {
    return 'client';
  }
  if (w === 'published' || w === 'closed' || w === 'client_approved') return 'none';
  return 'corpflow';
}

/**
 * @param {unknown} raw
 * @returns {AppComponent | null}
 */
function normalizeComponent(raw) {
  const c = asObject(raw);
  const key = String(c.key || '').trim();
  if (!key) return null;
  const ms = normalizeMilestone(c.milestone) || 'not_started';
  const reviews = Array.isArray(c.reviews)
    ? c.reviews.map((r) => {
        const rr = asObject(r);
        return {
          decision: String(rr.decision || ''),
          comment: String(rr.comment || ''),
          decided_at: String(rr.decided_at || ''),
          by_role: String(rr.by_role || 'tenant_member'),
        };
      })
    : [];
  const gh = asObject(c.github);
  const hasGh = Object.keys(gh).length > 0;
  return {
    key,
    title: String(c.title || key),
    milestone: ms,
    exposed_for_client_review: c.exposed_for_client_review === true,
    client_safe_summary: String(c.client_safe_summary || ''),
    client_safe_status:
      String(c.client_safe_status || '') ||
      (MILESTONE_META[ms] ? MILESTONE_META[ms].label : ms),
    attention_required: c.attention_required === true,
    internal_task_ref: c.internal_task_ref != null ? String(c.internal_task_ref) : null,
    internal_evidence_refs: Array.isArray(c.internal_evidence_refs)
      ? c.internal_evidence_refs.map((x) => String(x))
      : [],
    internal_note: c.internal_note != null ? String(c.internal_note) : null,
    github: hasGh
      ? {
          pr_number: Number(gh.pr_number) || 0,
          commit_sha: String(gh.commit_sha || ''),
          ci: String(gh.ci || ''),
        }
      : null,
    reviews,
  };
}

/**
 * Derive delivery/work components when console_json has no components[].
 * Uses existing workflow + preview_review + promotion — no schema.
 *
 * @param {{
 *   workflow: string,
 *   consoleJson: Record<string, unknown>,
 *   title: string,
 * }} args
 * @returns {AppComponent[]}
 */
export function deriveComponentsFromTicket(args) {
  const cv = asObject(args.consoleJson.client_view);
  const prom = asObject(args.consoleJson.promotion);
  const preview = asObject(cv.preview_review);
  const workflow = String(args.workflow || 'intake');
  const ms = workflowToMilestone(workflow);
  const decision = String(preview.decision || '');
  const exposed =
    workflow === 'in_review' ||
    workflow === 'preview_ready' ||
    decision === 'approve' ||
    decision === 'request_changes';

  /** @type {AppComponent[]} */
  const components = [
    {
      key: 'delivery_outcome',
      title: 'Delivery outcome',
      milestone: ms,
      exposed_for_client_review: exposed && ms === 'client_review',
      client_safe_summary: String(cv.progress_message || args.title || 'Request progress'),
      client_safe_status: MILESTONE_META[ms]?.label || ms,
      attention_required: exposed && ms === 'client_review',
      internal_task_ref: null,
      internal_evidence_refs: [],
      internal_note: null,
      github:
        prom.pr_number != null && Number(prom.pr_number) > 0
          ? {
              pr_number: Number(prom.pr_number),
              commit_sha: String(prom.head_sha || prom.commit_sha || ''),
              ci: prom.merged === true ? 'merged' : 'open',
            }
          : null,
      reviews:
        decision === 'approve' || decision === 'request_changes'
          ? [
              {
                decision: decision === 'approve' ? 'approve' : 'amend',
                comment: String(preview.message || ''),
                decided_at: String(preview.decided_at || ''),
                by_role: String(preview.by || 'tenant_member'),
              },
            ]
          : [],
    },
  ];

  // Second component: internal build work when promotion/automation exists
  const auto = asObject(cv.automation);
  if (prom.pr_number || auto.preview_url || auto.dispatch_ok) {
    components.push({
      key: 'internal_build',
      title: 'Internal build',
      milestone:
        prom.merged === true
          ? 'live_verified'
          : auto.preview_url
            ? 'preview_ready'
            : 'in_progress',
      exposed_for_client_review: false,
      client_safe_summary: 'Background delivery work CorpFlowAI is completing for you.',
      client_safe_status:
        prom.merged === true ? 'Live verified' : auto.preview_url ? 'Preview ready' : 'In progress',
      attention_required: false,
      internal_task_ref: prom.pr_number != null ? `pr_${prom.pr_number}` : 'build_task',
      internal_evidence_refs: auto.preview_url ? ['preview_url_ref'] : [],
      internal_note: 'Internal build — never expose GitHub/CI to Tenant.',
      github:
        prom.pr_number != null && Number(prom.pr_number) > 0
          ? {
              pr_number: Number(prom.pr_number),
              commit_sha: String(prom.head_sha || prom.commit_sha || ''),
              ci: String(auto.last_error || (prom.merged ? 'merged' : 'pending')),
            }
          : null,
      reviews: [],
    });
  }

  return components;
}

/**
 * Normalize a cmp_tickets-shaped row (Prisma camelCase or snake_case fixture) to AppRequest.
 * @param {unknown} row
 * @param {{ source?: 'fixture'|'cmp_ticket' }} [opts]
 * @returns {AppRequest | null}
 */
export function normalizeCmpTicketRow(row, opts = {}) {
  if (!row || typeof row !== 'object') return null;
  const r = /** @type {Record<string, unknown>} */ (row);
  const id = rowId(r);
  const tenantId = rowTenantId(r) || REFERENCE_TENANT_ID;
  if (!id) return null;

  const status = String(r.status || '').trim() || 'Draft';
  const stage = String(r.stage || '').trim() || 'Intake';
  const description = String(r.description || r.title || '').trim();
  const consoleJson = asObject(r.console_json || r.consoleJson);
  const progress = buildTicketProgress(consoleJson, status, stage, {
    ticketId: id,
    tenantId,
  });
  const workflow = String(progress.client_view.workflow_state || 'intake');
  const workflowNext =
    String(progress.client_view.workflow_next_action || '') ||
    nextActionForWorkflowState(/** @type {any} */ (workflow));

  const cvIn = asObject(consoleJson.client_view);
  const explicitComponents = Array.isArray(cvIn.components) ? cvIn.components : null;
  const components = explicitComponents
    ? explicitComponents.map(normalizeComponent).filter(Boolean)
    : deriveComponentsFromTicket({
        workflow,
        consoleJson,
        title: description,
      });

  const attention =
    components.some((c) => c && c.attention_required === true) ||
    String(cvIn.attention_required || '') === 'true' ||
    r.attention_required === true;

  const owner =
    r.owner != null
      ? String(r.owner)
      : consoleJson.owner != null
        ? String(consoleJson.owner)
        : cvIn.owner != null
          ? String(cvIn.owner)
          : null;

  const updatedAt =
    r.updated_at != null
      ? String(r.updated_at)
      : r.updatedAt != null
        ? String(r.updatedAt)
        : null;

  const outcome =
    String(cvIn.desired_outcome || cvIn.outcome || '').trim() ||
    String(asObject(consoleJson.brief).requested_change || '').trim() ||
    description;

  const clientSafeBlocker =
    cvIn.client_safe_blocker != null
      ? String(cvIn.client_safe_blocker)
      : r.client_safe_blocker != null
        ? String(r.client_safe_blocker)
        : null;

  const internalBlocker =
    cvIn.internal_blocker != null
      ? String(cvIn.internal_blocker)
      : r.internal_blocker != null
        ? String(r.internal_blocker)
        : null;

  const latestUpdate =
    cvIn.latest_client_safe_update != null
      ? String(cvIn.latest_client_safe_update)
      : cvIn.progress_message != null
        ? String(cvIn.progress_message)
        : workflowNext;

  const waiting = waitingPartyForWorkflow(workflow, {
    attention,
    exposed: components.some((c) => c && c.exposed_for_client_review === true),
  });

  /** @type {AppRequest} */
  const request = {
    id,
    tenant_id: tenantId,
    title: description || `Request ${id}`,
    outcome,
    status,
    stage,
    owner,
    waiting_party: waiting,
    updated_at: updatedAt,
    client_safe_blocker: clientSafeBlocker,
    internal_blocker: internalBlocker,
    attention_required: attention === true,
    console_json: {
      ...consoleJson,
      client_view: {
        ...cvIn,
        workflow_state: workflow,
        workflow_next_action: workflowNext,
        progress_message: String(cvIn.progress_message || workflowNext),
        latest_client_safe_update: latestUpdate,
        components: /** @type {AppComponent[]} */ (components),
      },
      promotion: asObject(consoleJson.promotion),
      technical_lead: asObject(consoleJson.technical_lead),
    },
    source: opts.source || (r.source === 'cmp_ticket' ? 'cmp_ticket' : 'fixture'),
  };
  return request;
}

/**
 * Re-export deriveWorkflowState for adapters/tests.
 */
export { deriveWorkflowState, nextActionForWorkflowState, buildTicketProgress };
