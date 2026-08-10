/**
 * Event-driven Cursor dispatch helpers (Phase A).
 *
 * Pure predicates for `issues:labeled` → existing factory activator path.
 * Does not activate Cursor by itself — workflows must still run
 * classification / WIP / protected-gate / claim-before-API.
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 * @see .github/workflows/factory-dispatcher-activate.yml
 */

import { DISPATCH_LABEL_READY } from './cursor-issue-dispatch-lifecycle.js';

export const CURSOR_READY_EVENT_DISPATCH_SCHEMA = 'corpflow.cursor_ready_event_dispatch.v1';

/** Exact label that may wake the activator (Phase A). */
export const CURSOR_READY_WAKE_LABEL = DISPATCH_LABEL_READY;

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
  'needs:anton',
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
 * Resolve activation mode + targeting for factory-dispatcher-activate.
 *
 * Event-driven ready path:
 * - mode = cursor_live
 * - does NOT force manual target_issue (WIP/protected gates stay authoritative)
 * - prefers the exact event issue in the existing scan
 *
 * @param {{
 *   eventName?: string | null,
 *   action?: string | null,
 *   labelName?: string | null,
 *   issueState?: string | null,
 *   issueNumber?: string | number | null,
 *   activationModeInput?: string | null,
 *   smokeInternalInput?: boolean | string | null,
 *   targetIssueInput?: string | number | null,
 *   cursorLiveEnabled?: boolean | string | null,
 * }} opts
 */
export function resolveFactoryDispatcherRunPlan(opts = {}) {
  const eventName = String(opts.eventName || '').trim().toLowerCase();
  const cursorLiveEnabled = normalizeTruthy(opts.cursorLiveEnabled);

  if (eventName === 'schedule') {
    return {
      schema: CURSOR_READY_EVENT_DISPATCH_SCHEMA,
      eventName,
      shouldRun: true,
      mode: cursorLiveEnabled ? 'cursor_live' : 'dry_run',
      smokeInternal: false,
      manualTargetIssue: '',
      eventIssueNumber: null,
      preferIssueNumbers: [],
      bypassEligibilityGates: false,
      concurrencyKey: 'scan',
      path: 'schedule_fallback',
    };
  }

  if (eventName === 'issues') {
    const resolved = resolveEventDrivenTargetIssue(opts);
    if (!resolved.ok) {
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
        path: 'event_label_ignored',
        ignoreReason: resolved.reason,
      };
    }
    return {
      schema: CURSOR_READY_EVENT_DISPATCH_SCHEMA,
      eventName,
      shouldRun: true,
      mode: 'cursor_live',
      smokeInternal: false,
      // Keep blank so scan eligibility (WIP / protected gate) remains authoritative.
      manualTargetIssue: '',
      eventIssueNumber: resolved.issueNumber,
      preferIssueNumbers: [resolved.issueNumber],
      bypassEligibilityGates: false,
      concurrencyKey: String(resolved.issueNumber),
      path: 'event_label_ready',
    };
  }

  // workflow_dispatch (manual) and unknown events: preserve prior behaviour.
  const manualTarget = String(opts.targetIssueInput || '').trim();
  const modeRaw = String(opts.activationModeInput || 'dry_run').trim().toLowerCase();
  const mode = modeRaw === 'cursor_live' ? 'cursor_live' : 'dry_run';
  const smokeInternal = normalizeTruthy(opts.smokeInternalInput);
  return {
    schema: CURSOR_READY_EVENT_DISPATCH_SCHEMA,
    eventName: eventName || 'workflow_dispatch',
    shouldRun: true,
    mode,
    smokeInternal,
    manualTargetIssue: manualTarget,
    eventIssueNumber: null,
    preferIssueNumbers: [],
    bypassEligibilityGates: Boolean(manualTarget),
    concurrencyKey: manualTarget || 'scan',
    path: 'manual_dispatch',
  };
}

/**
 * After scan, pick the effective activation target.
 *
 * Event-label path activates only when the scan selects the exact event issue.
 * Manual target_issue still wins (backward compatible).
 *
 * @param {{
 *   manualTargetIssue?: string | number | null,
 *   eventIssueNumber?: string | number | null,
 *   scannedActivationTargetIssue?: string | number | null,
 * }} opts
 * @returns {{
 *   targetIssue: string,
 *   targetSource: 'manual' | 'event_label' | 'issue_scan' | 'dispatcher' | 'event_label_held',
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

  if (eventIssue != null) {
    if (scanned === eventIssue) {
      return {
        targetIssue: String(eventIssue),
        targetSource: 'event_label',
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
          : `event issue #${eventIssue} held; scan selected #${scanned} instead — event path activates only the labeled issue`,
    };
  }

  if (scanned != null) {
    return {
      targetIssue: String(scanned),
      targetSource: 'issue_scan',
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
