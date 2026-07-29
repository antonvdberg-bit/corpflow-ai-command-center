/**
 * Enforceable protected-action gates — prompts are advisory; these helpers
 * are authoritative for workflows and runtime checks.
 *
 * @see docs/operations/ANTON_DECISION_INBOX_V1.md
 * @see lib/server/anton-decision-inbox.js
 */

import {
  evaluateProtectedApproval,
  LABEL_NEEDS_ANTON,
  normalizeLabels,
  PROTECTED_ACTIONS,
} from './anton-decision-inbox.js';

/** Branch prefixes that identify agent-authored work (never auto-merge). */
export const AGENT_BRANCH_PREFIXES = Object.freeze([
  'cursor/',
  'codex/',
  'internal-agent/',
]);

/** CMP product automation branch namespace (separate from agent PRs). */
export const CMP_BRANCH_PREFIX = 'cmp/';

/**
 * @param {string | null | undefined} branch
 * @returns {boolean}
 */
export function isAgentBranch(branch) {
  const b = String(branch || '').trim().toLowerCase();
  if (!b) return false;
  return AGENT_BRANCH_PREFIXES.some((p) => b.startsWith(p));
}

/**
 * Whether GHA product auto-merge may consider this PR.
 * Agent branches are always forbidden. CMP branches remain subject to
 * CMP_AUTO_MERGE + client-approved + CI (existing workflow); this helper
 * never treats labels alone as protected approval for production/deploy.
 *
 * @param {{
 *   headBranch?: string | null,
 *   labels?: unknown,
 *   cmpAutoMergeEnabled?: boolean,
 *   workflowConclusion?: string | null,
 * }} input
 * @returns {{ allowed: boolean, reason: string }}
 */
export function evaluateAgentAutoMergeGate(input = {}) {
  const headBranch = String(input.headBranch || '').trim();
  if (isAgentBranch(headBranch)) {
    return {
      allowed: false,
      reason: `Agent branch "${headBranch}" cannot auto-merge`,
    };
  }
  if (!headBranch.startsWith(CMP_BRANCH_PREFIX)) {
    return {
      allowed: false,
      reason: `Auto-merge only considers ${CMP_BRANCH_PREFIX}* product branches (got "${headBranch || '(empty)'}")`,
    };
  }
  if (input.cmpAutoMergeEnabled !== true) {
    return {
      allowed: false,
      reason: 'CMP_AUTO_MERGE is not enabled',
    };
  }
  if (String(input.workflowConclusion || '') !== 'success') {
    return {
      allowed: false,
      reason: 'Agent CI must conclude success before CMP auto-merge',
    };
  }
  const labels = normalizeLabels(input.labels).map((l) => l.toLowerCase());
  if (labels.includes(LABEL_NEEDS_ANTON.toLowerCase())) {
    return {
      allowed: false,
      reason: 'needs:anton present — blocked until durable Anton approval clears the inbox item',
    };
  }
  if (!labels.includes('client-approved')) {
    return {
      allowed: false,
      reason: 'Missing client-approved label',
    };
  }
  return {
    allowed: true,
    reason: 'CMP product auto-merge preconditions met (still not a protected production/deploy approval)',
  };
}

/**
 * Untrusted PR contexts must not receive production secrets.
 * Fork PRs and agent PRs from external contributors are untrusted.
 *
 * @param {{
 *   eventName?: string | null,
 *   pullRequest?: { head?: { repo?: { full_name?: string | null } | null } | null, base?: { repo?: { full_name?: string | null } | null } | null } | null,
 *   repository?: string | null,
 *   headBranch?: string | null,
 * }} input
 * @returns {{ trusted: boolean, reason: string, mayReceiveProductionSecrets: boolean }}
 */
export function evaluateUntrustedPrSecretsIsolation(input = {}) {
  const eventName = String(input.eventName || '').toLowerCase();
  const repo = String(input.repository || '').toLowerCase();
  const headFull = String(input.pullRequest?.head?.repo?.full_name || '').toLowerCase();
  const baseFull = String(input.pullRequest?.base?.repo?.full_name || repo).toLowerCase();

  if (eventName === 'pull_request_target') {
    return {
      trusted: false,
      reason: 'pull_request_target must not receive production secrets in untrusted checkout contexts',
      mayReceiveProductionSecrets: false,
    };
  }

  if (headFull && baseFull && headFull !== baseFull) {
    return {
      trusted: false,
      reason: `Fork PR (${headFull} → ${baseFull}) must not receive production secrets`,
      mayReceiveProductionSecrets: false,
    };
  }

  return {
    trusted: true,
    reason: 'Same-repo PR context — production secrets still require environment protection + durable approval for protected actions',
    mayReceiveProductionSecrets: true,
  };
}

/**
 * Gate a protected action. Labels never bypass.
 *
 * @param {{
 *   action: string,
 *   labels?: unknown,
 *   comments?: Array<{ body?: string | null }> | string[],
 *   issueNumber?: number | null,
 *   prNumber?: number | null,
 *   targetSha?: string | null,
 *   environment?: string | null,
 *   now?: Date | string | number,
 *   workflowEnabled?: boolean,
 * }} input
 * @returns {{
 *   allowed: boolean,
 *   blocked: boolean,
 *   reason: string,
 *   audit: Record<string, unknown>,
 * }}
 */
export function gateProtectedAction(input) {
  const action = String(input.action || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');

  if (!PROTECTED_ACTIONS.includes(/** @type {*} */ (action))) {
    return {
      allowed: false,
      blocked: true,
      reason: `Unknown protected action "${action}"`,
      audit: { action, result: 'blocked', reason: 'unknown_action' },
    };
  }

  // External-send / payment / paid-tool / public-launch default disabled unless
  // the calling workflow explicitly sets workflowEnabled=true AND durable approval exists.
  const defaultDisabled = new Set(['external-send', 'payment', 'paid-tool', 'public-launch', 'db-schema']);
  if (defaultDisabled.has(action) && input.workflowEnabled !== true) {
    return {
      allowed: false,
      blocked: true,
      reason: `Protected action "${action}" workflow is default-disabled without explicit approved invocation`,
      audit: {
        action,
        result: 'blocked',
        reason: 'workflow_default_disabled',
        timestamp: new Date().toISOString(),
      },
    };
  }

  const evaluation = evaluateProtectedApproval({
    action,
    labels: input.labels,
    comments: input.comments,
    issueNumber: input.issueNumber,
    prNumber: input.prNumber,
    targetSha: input.targetSha,
    environment: input.environment,
    now: input.now,
  });

  const audit = {
    ...evaluation.audit,
    result: evaluation.allowed ? 'allowed' : 'blocked',
    reason: evaluation.reason,
    approver: evaluation.matched?.approver ?? null,
    recordedAt: evaluation.matched?.recordedAt ?? null,
    targetSha: evaluation.matched?.targetSha ?? input.targetSha ?? null,
    environment: evaluation.matched?.environment ?? input.environment ?? null,
    timestamp: new Date().toISOString(),
  };

  return {
    allowed: evaluation.allowed,
    blocked: !evaluation.allowed,
    reason: evaluation.reason,
    audit,
  };
}

/**
 * Format a visible block reason for GitHub Actions logs.
 * @param {{ action: string, reason: string, audit?: Record<string, unknown> }} input
 */
export function formatGateBlockMessage(input) {
  const action = String(input.action || 'unknown');
  const reason = String(input.reason || 'blocked');
  const audit = input.audit && typeof input.audit === 'object' ? input.audit : {};
  return [
    `PROTECTED ACTION BLOCKED: ${action}`,
    `Reason: ${reason}`,
    `Audit: ${JSON.stringify(audit)}`,
    'Labels alone are not approval. Record a durable corpflow.protected_approval.v1 marker first.',
  ].join('\n');
}
