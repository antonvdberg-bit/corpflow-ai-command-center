/**
 * Event-driven Cursor dispatch helpers (Phase A + eligibility wake #891).
 *
 * Pure predicates for CorpFlowAI Cursor Factory Handoff wake sources:
 * - issues:labeled dispatch:cursor-ready (Phase A)
 * - issue_comment with durable operator authorization
 * - issues:unlabeled execution:paused
 * - issues:labeled priority:* on an already-ready issue
 * - workflow_call capacity backfill after lifecycle terminal release
 * - workflow_call / inherited schedule scheduled whole-queue reconciliation (#1023 / #1041)
 * - workflow_call / inherited schedule Temporal pilot supervisory wake (#1130)
 * - manual workflow_dispatch
 *
 * Production consumer is factory-cursor-handoff.yml (#913 / #930).
 * factory-dispatcher-activate.yml is LEGACY / DIAGNOSTIC / workflow_dispatch only
 * and must not auto-wake from these events.
 *
 * Does not activate Cursor by itself — workflows must still run
 * classification / WIP / protected-gate / claim-before-API.
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 * @see .github/workflows/factory-cursor-handoff.yml
 * @see .github/workflows/factory-dispatcher-activate.yml
 */

import { DURABLE_APPROVAL_MARKER } from './anton-decision-inbox.js';
import { DISPATCH_LABEL_READY } from './cursor-issue-dispatch-lifecycle.js';
import {
  isAuthorizedCursorRequeueActor,
  looksLikeExplicitCursorRequeueInstruction,
} from './cursor-activation-claim.js';
import {
  OPERATOR_GATE_AUTHORIZATION_MARKER,
  isTrustedOperatorIdentity,
  parseDurableApprovalAsGateAuthorization,
  parseExplicitOperatorAuthorizationText,
  parseOperatorGateAuthorizationRecords,
} from './operator-gate-authorization.js';

export const CURSOR_READY_EVENT_DISPATCH_SCHEMA = 'corpflow.cursor_ready_event_dispatch.v1';

/** Exact label that may wake the activator on ready (Phase A). */
export const CURSOR_READY_WAKE_LABEL = DISPATCH_LABEL_READY;

/** Queue-control label whose removal restores eligibility (#862 / #891). */
export const EXECUTION_PAUSED_LABEL = 'execution:paused';

/** Priority labels that may wake when the issue is already ready. */
export const PRIORITY_WAKE_LABELS = Object.freeze(['priority:P0', 'priority:P1', 'priority:P2']);

/**
 * Internal SLA: eligibility-changing events should normally begin activation
 * within this many minutes (event-driven path). Scheduled fallback may be slower.
 */
export const ELIGIBILITY_WAKE_SLA_MINUTES = 5;

/**
 * Lifecycle labels applied by the control plane. Adding these must never
 * re-enter the ready→activate path (bot-loop prevention).
 */
export const CURSOR_LIFECYCLE_NON_WAKE_LABELS = Object.freeze([
  'dispatch:cursor-claimed',
  'status:in-progress',
  'dispatch:blocked',
  'dispatch:operator-review',
  'dispatch:ci-repair',
  'execution:paused',
  'needs:anton',
]);

/** Actors whose comments/labels must never wake the activator (storm prevention). */
export const DISPATCHER_WAKE_IGNORED_ACTORS = Object.freeze([
  'github-actions[bot]',
  'github-actions',
  'cursor[bot]',
  'dependabot[bot]',
  'renovate[bot]',
  'codecov[bot]',
]);

/** Lifecycle actions that mean verified WIP capacity was released. */
export const CAPACITY_RELEASE_LIFECYCLE_ACTIONS = Object.freeze([
  'release_execution_slot_labels',
  'completion_event_posted',
  'label:dispatch:operator-review',
]);

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeLabelName(value) {
  return String(value || '').trim();
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toPositiveIssueNumber(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/**
 * @param {unknown} value
 */
function normalizeTruthy(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
}

/**
 * @param {unknown} login
 * @returns {boolean}
 */
export function isIgnoredDispatcherWakeActor(login) {
  const normalized = String(login || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (DISPATCHER_WAKE_IGNORED_ACTORS.some((a) => a.toLowerCase() === normalized)) return true;
  // Any GitHub App bot login ends with [bot]
  if (normalized.endsWith('[bot]')) return true;
  return false;
}

/**
 * True when a comment body is durable operator authorization evidence that can
 * change protected-gate eligibility. Wrong-gate records still wake; scan holds.
 *
 * @param {string | null | undefined} body
 * @param {{ author?: string | null }} [meta]
 */
export function commentBodyLooksLikeEligibilityAuthorization(body, meta = {}) {
  const text = String(body || '');
  if (!text.trim()) return false;

  if (text.includes(OPERATOR_GATE_AUTHORIZATION_MARKER)) {
    return parseOperatorGateAuthorizationRecords(text).length > 0;
  }
  if (text.includes(DURABLE_APPROVAL_MARKER)) {
    return parseDurableApprovalAsGateAuthorization(text, meta).length > 0;
  }
  if (
    /ANTON EXPLICIT OPERATOR AUTHORIZATION/i.test(text) ||
    /##\s*Explicit Anton authorization/i.test(text)
  ) {
    return parseExplicitOperatorAuthorizationText(text, {
      author: meta.author,
      allowIssueBody: false,
    }).length > 0;
  }
  return false;
}

/**
 * Stable fingerprint for eligibility-wake dedupe (repeated unchanged events).
 *
 * @param {{
 *   wakeReason?: string | null,
 *   issueNumber?: string | number | null,
 *   labelName?: string | null,
 *   commentBody?: string | null,
 *   actorLogin?: string | null,
 * }} input
 */
export function buildEligibilityWakeDedupeKey(input = {}) {
  const reason = String(input.wakeReason || '')
    .trim()
    .toLowerCase() || 'unknown';
  const issue = toPositiveIssueNumber(input.issueNumber);
  const label = normalizeLabelName(input.labelName).toLowerCase();
  const actor = String(input.actorLogin || '')
    .trim()
    .toLowerCase();
  const body = String(input.commentBody || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
    .toLowerCase();
  return `eligibility-wake:${reason}:issue=${issue || 0}:label=${label}:actor=${actor}:body=${body}`;
}

/**
 * Build the wake request artifact written by lifecycle when capacity frees.
 *
 * @param {{
 *   issueNumber?: string | number | null,
 *   actions?: string[] | null,
 *   phase?: string | null,
 *   releasedAt?: string | null,
 * }} input
 */
export function buildCapacityReleaseWakeRequest(input = {}) {
  const actions = Array.isArray(input.actions) ? input.actions.map((a) => String(a)) : [];
  const released = actions.some((a) =>
    CAPACITY_RELEASE_LIFECYCLE_ACTIONS.includes(a),
  );
  const phase = String(input.phase || '')
    .trim()
    .toUpperCase();
  const terminalPhase = ['COMPLETED', 'FAILED', 'STALE'].includes(phase);
  const shouldWake = released || (terminalPhase && actions.includes('completion_event_posted'));
  return {
    schema: 'corpflow.dispatcher_eligibility_wake.v1',
    shouldWake: Boolean(shouldWake),
    wakeReason: shouldWake ? 'capacity_released' : 'none',
    issueNumber: toPositiveIssueNumber(input.issueNumber),
    phase: phase || null,
    actions,
    releasedAt: input.releasedAt || new Date().toISOString(),
    slaMinutes: ELIGIBILITY_WAKE_SLA_MINUTES,
  };
}

/**
 * Strict predicate: only the exact ready label on an open issue wakes activation.
 *
 * @param {{
 *   eventName?: string | null,
 *   action?: string | null,
 *   labelName?: string | null,
 *   issueState?: string | null,
 *   issueNumber?: string | number | null,
 * }} event
 * @returns {boolean}
 */
export function shouldActivateOnIssueLabeledEvent(event = {}) {
  const eventName = String(event.eventName || '').trim().toLowerCase();
  if (eventName !== 'issues') return false;

  const action = String(event.action || '').trim().toLowerCase();
  if (action && action !== 'labeled') return false;

  const issueState = String(event.issueState || '').trim().toLowerCase();
  if (issueState && issueState !== 'open') return false;

  const labelName = normalizeLabelName(event.labelName);
  if (labelName !== CURSOR_READY_WAKE_LABEL) return false;

  return toPositiveIssueNumber(event.issueNumber) != null;
}

/**
 * Priority label added while issue already carries dispatch:cursor-ready.
 *
 * @param {{
 *   eventName?: string | null,
 *   action?: string | null,
 *   labelName?: string | null,
 *   issueState?: string | null,
 *   issueNumber?: string | number | null,
 *   issueLabelNames?: string[] | null,
 * }} event
 */
export function shouldWakeOnPriorityLabeledEvent(event = {}) {
  const eventName = String(event.eventName || '').trim().toLowerCase();
  if (eventName !== 'issues') return false;
  const action = String(event.action || '').trim().toLowerCase();
  if (action !== 'labeled') return false;
  const issueState = String(event.issueState || '').trim().toLowerCase();
  if (issueState && issueState !== 'open') return false;
  const labelName = normalizeLabelName(event.labelName);
  if (!PRIORITY_WAKE_LABELS.some((p) => p.toLowerCase() === labelName.toLowerCase())) {
    return false;
  }
  const labels = Array.isArray(event.issueLabelNames)
    ? event.issueLabelNames.map((l) => normalizeLabelName(l).toLowerCase())
    : [];
  // github.event.issue.labels includes the newly added label
  if (!labels.includes(CURSOR_READY_WAKE_LABEL.toLowerCase()) &&
      labelName.toLowerCase() !== CURSOR_READY_WAKE_LABEL.toLowerCase()) {
    return false;
  }
  return toPositiveIssueNumber(event.issueNumber) != null;
}

/**
 * execution:paused removed → eligibility may restore.
 *
 * @param {{
 *   eventName?: string | null,
 *   action?: string | null,
 *   labelName?: string | null,
 *   issueState?: string | null,
 *   issueNumber?: string | number | null,
 * }} event
 */
export function shouldWakeOnExecutionUnpausedEvent(event = {}) {
  const eventName = String(event.eventName || '').trim().toLowerCase();
  if (eventName !== 'issues') return false;
  const action = String(event.action || '').trim().toLowerCase();
  if (action !== 'unlabeled') return false;
  const issueState = String(event.issueState || '').trim().toLowerCase();
  if (issueState && issueState !== 'open') return false;
  const labelName = normalizeLabelName(event.labelName);
  if (labelName.toLowerCase() !== EXECUTION_PAUSED_LABEL.toLowerCase()) return false;
  return toPositiveIssueNumber(event.issueNumber) != null;
}

/**
 * Operator authorization comment that can clear a protected-gate hold.
 *
 * @param {{
 *   eventName?: string | null,
 *   action?: string | null,
 *   issueState?: string | null,
 *   issueNumber?: string | number | null,
 *   commentBody?: string | null,
 *   actorLogin?: string | null,
 *   commentAuthorAssociation?: string | null,
 * }} event
 */
export function shouldWakeOnOperatorAuthorizationComment(event = {}) {
  const eventName = String(event.eventName || '').trim().toLowerCase();
  if (eventName !== 'issue_comment') return false;
  const action = String(event.action || '').trim().toLowerCase();
  if (action && action !== 'created') return false;
  const issueState = String(event.issueState || '').trim().toLowerCase();
  if (issueState && issueState !== 'open') return false;
  if (isIgnoredDispatcherWakeActor(event.actorLogin)) return false;
  if (toPositiveIssueNumber(event.issueNumber) == null) return false;

  const author = String(event.actorLogin || '').trim();
  // Prefer trusted operator identity; still accept structured markers from owners.
  const looksLike = commentBodyLooksLikeEligibilityAuthorization(event.commentBody, {
    author,
  });
  if (!looksLike) return false;
  if (isTrustedOperatorIdentity(author, null)) return true;
  // Structured markers from repo owners/members (not bots) may wake; scan validates.
  const assoc = String(event.commentAuthorAssociation || '')
    .trim()
    .toUpperCase();
  return ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(assoc);
}

/**
 * Explicit authorised CURSOR REQUEUE instruction that must create a new
 * executable generation (#1116).
 *
 * @param {{
 *   eventName?: string | null,
 *   action?: string | null,
 *   issueState?: string | null,
 *   issueNumber?: string | number | null,
 *   commentBody?: string | null,
 *   actorLogin?: string | null,
 *   commentAuthorAssociation?: string | null,
 * }} event
 */
export function shouldWakeOnCursorRequeueComment(event = {}) {
  const eventName = String(event.eventName || '').trim().toLowerCase();
  if (eventName !== 'issue_comment') return false;
  const action = String(event.action || '').trim().toLowerCase();
  if (action && action !== 'created') return false;
  const issueState = String(event.issueState || '').trim().toLowerCase();
  if (issueState && issueState !== 'open') return false;
  if (isIgnoredDispatcherWakeActor(event.actorLogin)) return false;
  if (toPositiveIssueNumber(event.issueNumber) == null) return false;
  if (!looksLikeExplicitCursorRequeueInstruction(event.commentBody)) return false;
  return isAuthorizedCursorRequeueActor({
    author: event.actorLogin,
    actorLogin: event.actorLogin,
    authorAssociation: event.commentAuthorAssociation,
    commentAuthorAssociation: event.commentAuthorAssociation,
  });
}

/**
 * True when the labeled event is a non-wake lifecycle label (must not activate).
 *
 * @param {string | null | undefined} labelName
 */
export function isNonWakeLifecycleLabel(labelName) {
  const normalized = normalizeLabelName(labelName).toLowerCase();
  return CURSOR_LIFECYCLE_NON_WAKE_LABELS.some((name) => name.toLowerCase() === normalized);
}

/**
 * Resolve the exact source issue for an event-driven ready label.
 *
 * @param {{
 *   eventName?: string | null,
 *   action?: string | null,
 *   labelName?: string | null,
 *   issueState?: string | null,
 *   issueNumber?: string | number | null,
 * }} event
 * @returns {{ ok: true, issueNumber: number } | { ok: false, reason: string }}
 */
export function resolveEventDrivenTargetIssue(event = {}) {
  if (!shouldActivateOnIssueLabeledEvent(event)) {
    if (isNonWakeLifecycleLabel(event.labelName)) {
      return { ok: false, reason: 'lifecycle_label_non_wake' };
    }
    const labelName = normalizeLabelName(event.labelName);
    if (labelName && labelName !== CURSOR_READY_WAKE_LABEL) {
      return { ok: false, reason: 'label_mismatch' };
    }
    return { ok: false, reason: 'predicate_failed' };
  }
  return { ok: true, issueNumber: toPositiveIssueNumber(event.issueNumber) };
}

/**
 * @returns {{
 *   schema: string,
 *   eventName: string,
 *   shouldRun: boolean,
 *   mode: 'dry_run' | 'cursor_live',
 *   smokeInternal: boolean,
 *   manualTargetIssue: string,
 *   eventIssueNumber: number | null,
 *   preferIssueNumbers: number[],
 *   bypassEligibilityGates: boolean,
 *   concurrencyKey: string,
 *   path: string,
 *   wakeReason: string | null,
 *   requireExactEventIssue: boolean,
 *   ignoreReason?: string,
 *   dedupeKey?: string | null,
 * }}
 */
function basePlan(eventName) {
  return {
    schema: CURSOR_READY_EVENT_DISPATCH_SCHEMA,
    eventName,
    shouldRun: false,
    mode: 'dry_run',
    smokeInternal: false,
    manualTargetIssue: '',
    eventIssueNumber: null,
    preferIssueNumbers: [],
    bypassEligibilityGates: false,
    concurrencyKey: 'scan',
    path: 'ignored',
    wakeReason: null,
    requireExactEventIssue: false,
    dedupeKey: null,
  };
}

/**
 * Resolve activation mode + targeting for factory-dispatcher-activate.
 *
 * Event-driven ready / eligibility-wake path:
 * - mode = cursor_live
 * - does NOT force manual target_issue (WIP/protected gates stay authoritative)
 * - prefers the exact event issue when the wake is issue-scoped
 * - capacity backfill runs a canonical queue scan (highest eligible priority)
 *
 * @param {{
 *   eventName?: string | null,
 *   action?: string | null,
 *   labelName?: string | null,
 *   issueState?: string | null,
 *   issueNumber?: string | number | null,
 *   issueLabelNames?: string[] | null,
 *   commentBody?: string | null,
 *   actorLogin?: string | null,
 *   commentAuthorAssociation?: string | null,
 *   activationModeInput?: string | null,
 *   smokeInternalInput?: boolean | string | null,
 *   targetIssueInput?: string | number | null,
 *   cursorLiveEnabled?: boolean | string | null,
 *   wakeReasonInput?: string | null,
 *   capacityWakeRequested?: boolean | string | null,
 * }} opts
 */
/**
 * GitHub reusable workflows inherit the caller workflow's github.event_name.
 * CorpFlowAI Factory Queue Reconcile is triggered by `schedule` (or manual
 * `workflow_dispatch`), so the callee Handoff job sees those names rather
 * than `workflow_call`. Detect the scheduled-reconcile wake from the
 * explicit input, then accept the inherited caller event names.
 *
 * @param {string} wakeReason
 * @param {string} eventName
 */
export function isInheritedScheduledReconcileWake(wakeReason, eventName) {
  const reason = String(wakeReason || '')
    .trim()
    .toLowerCase();
  const event = String(eventName || '')
    .trim()
    .toLowerCase();
  const scheduledReason =
    reason === 'scheduled_reconciliation' || reason === 'schedule_fallback';
  return (
    scheduledReason &&
    (event === 'workflow_call' || event === 'schedule' || event === 'workflow_dispatch')
  );
}

/**
 * GitHub reusable workflows inherit the caller workflow's github.event_name.
 * CorpFlowAI Factory Temporal Pilot is triggered by gated `schedule` (or
 * manual `workflow_dispatch`), so the callee Handoff job sees those names
 * rather than `workflow_call`. Detect the Temporal supervisory wake from the
 * explicit input, then accept the inherited caller event names.
 *
 * @param {string} wakeReason
 * @param {string} eventName
 */
export function isInheritedTemporalPilotWake(wakeReason, eventName) {
  const reason = String(wakeReason || '')
    .trim()
    .toLowerCase();
  const event = String(eventName || '')
    .trim()
    .toLowerCase();
  return (
    reason === 'temporal_supervisory' &&
    (event === 'workflow_call' || event === 'schedule' || event === 'workflow_dispatch')
  );
}

export function resolveFactoryDispatcherRunPlan(opts = {}) {
  const eventName = String(opts.eventName || '').trim().toLowerCase();
  const cursorLiveEnabled = normalizeTruthy(opts.cursorLiveEnabled);
  const wakeReason = String(opts.wakeReasonInput || '')
    .trim()
    .toLowerCase();

  if (isInheritedScheduledReconcileWake(wakeReason, eventName)) {
    const target = toPositiveIssueNumber(opts.targetIssueInput);
    return {
      ...basePlan(eventName),
      shouldRun: true,
      mode: 'cursor_live',
      eventIssueNumber: null,
      preferIssueNumbers: target != null ? [target] : [],
      concurrencyKey: 'scan',
      path: 'schedule_fallback',
      wakeReason: 'scheduled_reconciliation',
      requireExactEventIssue: false,
    };
  }

  if (isInheritedTemporalPilotWake(wakeReason, eventName)) {
    const target = toPositiveIssueNumber(opts.targetIssueInput);
    return {
      ...basePlan(eventName),
      shouldRun: true,
      mode: 'cursor_live',
      eventIssueNumber: null,
      preferIssueNumbers: target != null ? [target] : [],
      concurrencyKey: 'scan',
      path: 'temporal_supervisory',
      wakeReason: 'temporal_supervisory',
      requireExactEventIssue: false,
    };
  }

  if (eventName === 'schedule') {
    return {
      ...basePlan(eventName),
      shouldRun: true,
      mode: cursorLiveEnabled ? 'cursor_live' : 'dry_run',
      path: 'schedule_fallback',
      wakeReason: 'schedule_fallback',
    };
  }

  // Reusable workflow call from lifecycle capacity release or explicit continuation.
  if (eventName === 'workflow_call') {
    const capacityWake =
      wakeReason === 'capacity_released' || normalizeTruthy(opts.capacityWakeRequested);
    if (!capacityWake && wakeReason !== 'claim_released_continuation') {
      return {
        ...basePlan(eventName),
        path: 'workflow_call_ignored',
        ignoreReason: 'wake_not_requested',
        wakeReason: wakeReason || null,
      };
    }
    const isContinuation = wakeReason === 'claim_released_continuation';
    return {
      ...basePlan(eventName),
      shouldRun: true,
      mode: 'cursor_live',
      // Capacity backfill always scans the full ready queue by priority.
      eventIssueNumber: null,
      preferIssueNumbers: [],
      concurrencyKey: 'scan',
      path: isContinuation ? 'claim_release_continuation' : 'capacity_backfill_scan',
      wakeReason: isContinuation ? 'claim_released_continuation' : 'capacity_released',
      requireExactEventIssue: false,
    };
  }

  if (eventName === 'issue_comment') {
    const requeueWake = shouldWakeOnCursorRequeueComment(opts);
    if (!shouldWakeOnOperatorAuthorizationComment(opts) && !requeueWake) {
      const ignored = isIgnoredDispatcherWakeActor(opts.actorLogin);
      return {
        ...basePlan(eventName),
        path: 'event_comment_ignored',
        ignoreReason: ignored ? 'bot_actor' : 'not_authorization_comment',
      };
    }
    const issueNumber = toPositiveIssueNumber(opts.issueNumber);
    const wakeReason = requeueWake ? 'cursor_requeue' : 'operator_authorization';
    return {
      ...basePlan(eventName),
      shouldRun: true,
      mode: 'cursor_live',
      eventIssueNumber: issueNumber,
      preferIssueNumbers: issueNumber != null ? [issueNumber] : [],
      concurrencyKey: issueNumber != null ? String(issueNumber) : 'scan',
      path: requeueWake ? 'event_cursor_requeue' : 'event_operator_authorization',
      wakeReason,
      requireExactEventIssue: true,
      dedupeKey: buildEligibilityWakeDedupeKey({
        wakeReason,
        issueNumber,
        commentBody: opts.commentBody,
        actorLogin: opts.actorLogin,
      }),
    };
  }

  if (eventName === 'issues') {
    const action = String(opts.action || '')
      .trim()
      .toLowerCase();

    if (action === 'unlabeled' && shouldWakeOnExecutionUnpausedEvent(opts)) {
      const issueNumber = toPositiveIssueNumber(opts.issueNumber);
      return {
        ...basePlan(eventName),
        shouldRun: true,
        mode: 'cursor_live',
        eventIssueNumber: issueNumber,
        preferIssueNumbers: issueNumber != null ? [issueNumber] : [],
        concurrencyKey: issueNumber != null ? String(issueNumber) : 'scan',
        path: 'event_execution_unpaused',
        wakeReason: 'execution_unpaused',
        requireExactEventIssue: true,
        dedupeKey: buildEligibilityWakeDedupeKey({
          wakeReason: 'execution_unpaused',
          issueNumber,
          labelName: EXECUTION_PAUSED_LABEL,
        }),
      };
    }

    if (action === 'labeled' && shouldWakeOnPriorityLabeledEvent(opts)) {
      const issueNumber = toPositiveIssueNumber(opts.issueNumber);
      return {
        ...basePlan(eventName),
        shouldRun: true,
        mode: 'cursor_live',
        eventIssueNumber: issueNumber,
        preferIssueNumbers: issueNumber != null ? [issueNumber] : [],
        concurrencyKey: issueNumber != null ? String(issueNumber) : 'scan',
        path: 'event_priority_ready',
        wakeReason: 'priority_changed',
        requireExactEventIssue: true,
        dedupeKey: buildEligibilityWakeDedupeKey({
          wakeReason: 'priority_changed',
          issueNumber,
          labelName: opts.labelName,
        }),
      };
    }

    const resolved = resolveEventDrivenTargetIssue(opts);
    if (!resolved.ok) {
      return {
        ...basePlan(eventName),
        path: 'event_label_ignored',
        ignoreReason: resolved.reason,
      };
    }
    return {
      ...basePlan(eventName),
      shouldRun: true,
      mode: 'cursor_live',
      // Keep blank so scan eligibility (WIP / protected gate) remains authoritative.
      manualTargetIssue: '',
      eventIssueNumber: resolved.issueNumber,
      preferIssueNumbers: [resolved.issueNumber],
      concurrencyKey: String(resolved.issueNumber),
      path: 'event_label_ready',
      wakeReason: 'ready_labeled',
      requireExactEventIssue: true,
    };
  }

  // workflow_dispatch (manual) and unknown events: preserve prior behaviour.
  const manualTarget = String(opts.targetIssueInput || '').trim();
  const modeRaw = String(opts.activationModeInput || 'dry_run').trim().toLowerCase();
  const mode = modeRaw === 'cursor_live' ? 'cursor_live' : 'dry_run';
  const smokeInternal = normalizeTruthy(opts.smokeInternalInput);
  return {
    ...basePlan(eventName || 'workflow_dispatch'),
    shouldRun: true,
    mode,
    smokeInternal,
    manualTargetIssue: manualTarget,
    bypassEligibilityGates: Boolean(manualTarget),
    concurrencyKey: manualTarget || 'scan',
    path: 'manual_dispatch',
    wakeReason: 'manual_dispatch',
  };
}

/**
 * After scan, pick the effective activation target.
 *
 * Prefer-exact event paths activate only when the scan selects the exact event issue.
 * Capacity backfill / schedule / manual blank target use scan selection.
 * Manual target_issue still wins (backward compatible).
 *
 * @param {{
 *   manualTargetIssue?: string | number | null,
 *   eventIssueNumber?: string | number | null,
 *   scannedActivationTargetIssue?: string | number | null,
 *   requireExactEventIssue?: boolean | string | null,
 *   wakePath?: string | null,
 * }} opts
 * @returns {{
 *   targetIssue: string,
 *   targetSource: string,
 *   activate: boolean,
 *   holdReason: string | null,
 * }}
 */
export function resolveEffectiveActivationTarget(opts = {}) {
  const manual = String(opts.manualTargetIssue || '').trim();
  if (manual) {
    return {
      targetIssue: manual,
      targetSource: 'manual',
      activate: true,
      holdReason: null,
    };
  }

  const eventIssue = toPositiveIssueNumber(opts.eventIssueNumber);
  const scanned = toPositiveIssueNumber(opts.scannedActivationTargetIssue);
  const requireExact =
    opts.requireExactEventIssue == null
      ? eventIssue != null
      : normalizeTruthy(opts.requireExactEventIssue);
  const wakePath = String(opts.wakePath || '').trim();

  if (eventIssue != null && requireExact) {
    if (scanned === eventIssue) {
      return {
        targetIssue: String(eventIssue),
        targetSource: wakePath.startsWith('event_') ? wakePath : 'event_label',
        activate: true,
        holdReason: null,
      };
    }
    return {
      targetIssue: '',
      targetSource: 'event_label_held',
      activate: false,
      holdReason:
        scanned == null
          ? `event issue #${eventIssue} not selected by eligibility scan (WIP, protected gate, claimed, or blocked)`
          : `event issue #${eventIssue} held; scan selected #${scanned} instead — event path activates only the preferred issue`,
    };
  }

  if (scanned != null) {
    return {
      targetIssue: String(scanned),
      targetSource: wakePath === 'capacity_backfill_scan' ? 'capacity_backfill' : 'issue_scan',
      activate: true,
      holdReason: null,
    };
  }

  return {
    targetIssue: '',
    targetSource: 'dispatcher',
    activate: false,
    holdReason: null,
  };
}

/**
 * Build workflow_dispatch inputs historically used by the thin wake-up wrapper.
 * Kept for tests / migration compatibility — canonical path is direct `issues` trigger.
 *
 * @param {number} issueNumber
 */
export function buildCursorReadyWakeDispatchInputs(issueNumber) {
  const n = toPositiveIssueNumber(issueNumber);
  if (n == null) {
    throw new Error('issueNumber must be a positive integer');
  }
  return {
    ref: 'main',
    inputs: {
      activation_mode: 'cursor_live',
      smoke_internal: 'false',
      target_issue: String(n),
    },
  };
}
