/**
 * Change Console workflow derivation for /change — single source of truth.
 * cmp_tickets.status/stage Closed must yield a terminal client_view workflow (not stale in_review, etc.).
 */

import { emitTelemetry } from './telemetry.js';

/** @typedef {'intake'|'refining'|'ready_for_estimate'|'estimated'|'approved_for_build'|'building'|'preview_ready'|'in_review'|'changes_requested'|'client_approved'|'publishing'|'published'|'closed'} ChangeWorkflowState */

/**
 * @param {string} status
 * @param {string} stage
 * @returns {boolean}
 */
export function isApprovedBuildPath(status, stage) {
  return String(status || '').trim().toLowerCase() === 'approved' && String(stage || '').trim().toLowerCase() === 'build';
}

/**
 * @param {unknown} s
 * @returns {ChangeWorkflowState | null}
 */
export function normalizeWorkflowState(s) {
  const v = String(s || '').trim().toLowerCase();
  if (
    v === 'intake' ||
    v === 'refining' ||
    v === 'ready_for_estimate' ||
    v === 'estimated' ||
    v === 'approved_for_build' ||
    v === 'building' ||
    v === 'preview_ready' ||
    v === 'in_review' ||
    v === 'changes_requested' ||
    v === 'client_approved' ||
    v === 'publishing' ||
    v === 'published' ||
    v === 'closed'
  ) {
    return /** @type {ChangeWorkflowState} */ (v);
  }
  return null;
}

/**
 * Derive workflow from ticket row + console_json.
 * Closed tickets: align UI to terminal delivery state even when client_view.workflow_state was never updated after merge.
 *
 * @param {{
 *   status: string,
 *   stage: string,
 *   consoleJson: Record<string, unknown>,
 * }} args
 * @returns {ChangeWorkflowState}
 */
export function deriveWorkflowState(args) {
  const cj = args.consoleJson && typeof args.consoleJson === 'object' ? args.consoleJson : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const prom = cj.promotion && typeof cj.promotion === 'object' ? cj.promotion : {};
  const closure = cv.closure && typeof cv.closure === 'object' ? cv.closure : {};

  const st = String(args.status || '').trim().toLowerCase();
  const sg = String(args.stage || '').trim().toLowerCase();

  // Terminal DB row: do not show in-flight workflow when the ticket is already Closed in Postgres.
  if (st === 'closed' || sg === 'closed') {
    if (closure.kind === 'hard_close') return 'closed';
    if (normalizeWorkflowState(cv.workflow_state) === 'closed') return 'closed';
    if (prom.merged === true) return 'published';
    if (closure.kind === 'reconciled_merged') return 'published';
    return 'published';
  }

  const explicit = normalizeWorkflowState(cv.workflow_state);
  if (explicit) return explicit;

  if (prom.merged === true) return 'published';
  const lastReview = cv.preview_review && typeof cv.preview_review === 'object' ? cv.preview_review : null;
  const decision = lastReview && typeof lastReview.decision === 'string' ? String(lastReview.decision) : '';
  if (decision === 'approve') return 'client_approved';
  if (decision === 'request_changes') return 'changes_requested';

  const auto = cv.automation && typeof cv.automation === 'object' ? cv.automation : {};
  const previewUrl = typeof auto.preview_url === 'string' ? auto.preview_url.trim() : '';
  const prNum =
    prom.pr_number != null && Number.isFinite(Number(prom.pr_number)) && Number(prom.pr_number) > 0
      ? Number(prom.pr_number)
      : null;
  if (previewUrl && prNum) return 'in_review';
  if (previewUrl) return 'preview_ready';

  const approvedBuild = isApprovedBuildPath(args.status, args.stage);
  if (approvedBuild) {
    if (auto.dispatch_ok === true || auto.updated_at != null) return 'building';
    return 'approved_for_build';
  }

  if (cv.last_estimate_at != null && String(cv.last_estimate_at).trim()) return 'estimated';

  const brief = cj.brief && typeof cj.brief === 'object' ? cj.brief : {};
  const summary = typeof brief.summary === 'string' ? brief.summary.trim() : '';
  const requestedChange = typeof brief.requested_change === 'string' ? brief.requested_change.trim() : '';
  const ac = Array.isArray(brief.acceptance_criteria) ? brief.acceptance_criteria : [];
  const acOk = ac.some((x) => (typeof x === 'string' ? x.trim() : String(x || '').trim()));
  if (summary || acOk || requestedChange) return 'ready_for_estimate';

  const msgs = Array.isArray(cj.messages) ? cj.messages : [];
  if (msgs.length >= 2) return 'refining';

  return 'intake';
}

/**
 * @param {ChangeWorkflowState} st
 * @returns {string}
 */
export function nextActionForWorkflowState(st) {
  switch (st) {
    case 'intake':
      return 'Describe the change, then click Create ticket.';
    case 'refining':
      return 'Answer the follow-up question(s) until the brief is accurate.';
    case 'ready_for_estimate':
      return 'Run Estimate.';
    case 'estimated':
      return 'Approve build when you accept the estimate.';
    case 'approved_for_build':
      return 'Waiting for build to start (GitHub sandbox automation).';
    case 'building':
      return 'Waiting for preview link.';
    case 'preview_ready':
      return 'Open the preview link and review it.';
    case 'in_review':
      return 'Use Preview review: Request changes or Approve.';
    case 'changes_requested':
      return 'Waiting for updated preview after changes.';
    case 'client_approved':
      return 'Operator will publish after checks (promotion merge).';
    case 'publishing':
      return 'Publishing in progress.';
    case 'published':
      return 'Published.';
    case 'closed':
      return 'No further action — ticket closed.';
    default:
      return '';
  }
}

/**
 * @param {unknown} consoleJson
 * @param {string} status
 * @param {string} stage
 * @param {{ ticketId?: string, tenantId?: string | null } | undefined} auditOpts
 * @returns {{ status: string, stage: string, client_view: Record<string, unknown> }}
 */
export function buildTicketProgress(consoleJson, status, stage, auditOpts) {
  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const wf = deriveWorkflowState({ status: status || '', stage: stage || '', consoleJson: cj });

  if (auditOpts?.ticketId) {
    const coerced = detectClosedRowWorkflowCoercion(consoleJson, status, stage, wf);
    if (coerced) {
      emitTelemetry({
        event_type: 'cmp.delivery.change_console_workflow_coerced',
        cmp: { ticket_id: String(auditOpts.ticketId), action: 'ticket-get' },
        payload: {
          kind: 'closed_row_terminal_alignment',
          from_client_view_workflow: coerced.from,
          resolved_workflow: coerced.to,
          tenant_id: auditOpts.tenantId != null ? String(auditOpts.tenantId) : null,
        },
      });
    }
  }

  return {
    status: status || '',
    stage: stage || '',
    client_view: { ...cv, workflow_state: wf, workflow_next_action: nextActionForWorkflowState(wf) },
  };
}

/**
 * @param {unknown} consoleJson
 * @param {string} status
 * @param {string} stage
 * @param {ChangeWorkflowState} resolvedWf
 * @returns {{ from: string, to: string } | null}
 */
function detectClosedRowWorkflowCoercion(consoleJson, status, stage, resolvedWf) {
  const st = String(status || '').trim().toLowerCase();
  const sg = String(stage || '').trim().toLowerCase();
  if (st !== 'closed' && sg !== 'closed') return null;

  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const closure = cv.closure && typeof cv.closure === 'object' ? cv.closure : {};
  if (closure.kind === 'hard_close') return null;

  const rawStr = String(cv.workflow_state != null ? cv.workflow_state : '').trim().toLowerCase();
  if (!rawStr) return null;

  if (resolvedWf === 'published' && rawStr !== 'published') {
    return { from: rawStr, to: 'published' };
  }
  if (resolvedWf === 'closed' && rawStr !== 'closed') {
    return { from: rawStr, to: 'closed' };
  }
  return null;
}
