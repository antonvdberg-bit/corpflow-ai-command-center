/**
 * CorpFlowAI Factory whole-queue reconciliation (#1023).
 *
 * Thin scheduled fallback: scan GitHub delivery state with the existing
 * eligibility / WIP / pause / operator-review / duplicate-handoff rules, then
 * workflow_call CorpFlowAI Cursor Factory Handoff only when a real eligible
 * issue exists and verified WIP permits. This is not a second dispatcher,
 * executor, queue, or wake path.
 *
 * @see .github/workflows/factory-queue-reconcile.yml
 * @see .github/workflows/factory-cursor-handoff.yml
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 */

import { isClaimStale } from './cursor-issue-dispatch-lifecycle.js';
import { FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME } from './factory-cursor-handoff.js';

export const FACTORY_QUEUE_RECONCILE_SCHEMA = 'corpflow.factory_queue_reconcile.v1';

/** Exact displayed GitHub Actions workflow name (must not equal Handoff). */
export const FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME = 'CorpFlowAI Factory Queue Reconcile';

/** Missed-event / orphan reconciliation cadence. Event-driven Handoff stays primary. */
export const FACTORY_QUEUE_RECONCILE_CRON = '*/10 * * * *';

export const FACTORY_QUEUE_RECONCILE_WAKE_REASON = 'scheduled_reconciliation';

export const FACTORY_QUEUE_RECONCILE_WAKE_PATH = 'schedule_fallback';

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
 * @returns {string | null}
 */
function emptyToNull(value) {
  const s = value == null ? '' : String(value).trim();
  return s || null;
}

/**
 * @param {unknown} reason
 * @param {RegExp} pattern
 */
function reasonMatches(reason, pattern) {
  return pattern.test(String(reason || ''));
}

/**
 * Classify why a scheduled scan must not wake Handoff, or whether it should.
 *
 * @param {{
 *   plan?: {
 *     activationTargetIssue?: number | null,
 *     availableSlots?: number | null,
 *     verifiedActiveCount?: number | null,
 *     eligibleIssueNumbers?: number[],
 *     claimIssueNumbers?: number[],
 *     decisions?: Array<{ reason?: string | null, eligibleToClaim?: boolean, decision?: string | null }>,
 *   } | null,
 *   claimedIssues?: unknown[],
 *   recentHandoff?: boolean,
 *   nowIso?: string | null,
 *   repo?: string | null,
 *   generatedAt?: string | null,
 * }} input
 */
export function resolveFactoryQueueReconcileDecision(input = {}) {
  const plan = input.plan && typeof input.plan === 'object' ? input.plan : {};
  const decisions = Array.isArray(plan.decisions) ? plan.decisions : [];
  const claimedIssues = Array.isArray(input.claimedIssues) ? input.claimedIssues : [];
  const nowIso = emptyToNull(input.nowIso) || undefined;
  const availableSlots =
    plan.availableSlots == null || !Number.isFinite(Number(plan.availableSlots))
      ? null
      : Number(plan.availableSlots);
  const verifiedActiveCount =
    plan.verifiedActiveCount == null || !Number.isFinite(Number(plan.verifiedActiveCount))
      ? null
      : Number(plan.verifiedActiveCount);
  const eligibleIssueNumbers = Array.isArray(plan.eligibleIssueNumbers)
    ? plan.eligibleIssueNumbers.map((n) => toPositiveIssueNumber(n)).filter(Boolean)
    : [];
  const claimIssueNumbers = Array.isArray(plan.claimIssueNumbers)
    ? plan.claimIssueNumbers.map((n) => toPositiveIssueNumber(n)).filter(Boolean)
    : [];
  const targetIssue = toPositiveIssueNumber(plan.activationTargetIssue);
  const pausedCount = decisions.filter((d) =>
    reasonMatches(d?.reason, /execution:paused/i),
  ).length;
  const operatorReviewCount = decisions.filter((d) =>
    reasonMatches(d?.reason, /operator-review/i),
  ).length;
  const gatedCount = decisions.filter((d) =>
    reasonMatches(d?.reason, /protected gate/i),
  ).length;
  const staleClaimedCount = claimedIssues.filter((issue) => isClaimStale(issue, nowIso)).length;
  const wipFull = availableSlots != null && availableSlots <= 0;
  const canClaim = targetIssue != null && claimIssueNumbers.includes(targetIssue);

  /** @type {string} */
  let reason;
  let shouldWakeHandoff = false;

  if (canClaim && !wipFull && !input.recentHandoff) {
    shouldWakeHandoff = true;
    reason = 'eligible_ready_work';
  } else if (wipFull) {
    reason = 'wip_cap_reached';
  } else if (input.recentHandoff && canClaim) {
    reason = 'duplicate_handoff_suppressed';
  } else if (pausedCount > 0 && eligibleIssueNumbers.length === 0 && operatorReviewCount === 0 && gatedCount === 0) {
    reason = 'execution_paused';
  } else if (
    (operatorReviewCount > 0 || gatedCount > 0) &&
    eligibleIssueNumbers.length === 0
  ) {
    reason = 'operator_review_gated';
  } else if (staleClaimedCount > 0 && eligibleIssueNumbers.length === 0) {
    reason = 'stale_claimed_deferred_to_lifecycle';
  } else {
    reason = 'no_ready_work';
  }

  return {
    schema: FACTORY_QUEUE_RECONCILE_SCHEMA,
    workflowName: FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME,
    handoffWorkflowName: FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
    generatedAt: emptyToNull(input.generatedAt) || new Date().toISOString(),
    repo: emptyToNull(input.repo),
    shouldWakeHandoff,
    should_wake_handoff: shouldWakeHandoff ? 1 : 0,
    source_issue: shouldWakeHandoff ? targetIssue : null,
    reason,
    wakeReason: FACTORY_QUEUE_RECONCILE_WAKE_REASON,
    wakePath: FACTORY_QUEUE_RECONCILE_WAKE_PATH,
    availableSlots,
    verifiedActiveCount,
    eligibleIssueNumbers,
    claimIssueNumbers,
    pausedCount,
    operatorReviewCount,
    gatedCount,
    staleClaimedCount,
    recentHandoff: Boolean(input.recentHandoff),
  };
}
