/**
 * Codex activation claim — GitHub state only, executor=codex.
 * Cross-executor: active Cursor claim / operator-review / claimed label → SKIP_ALREADY_CLAIMED.
 *
 * @see lib/server/cursor-activation-claim.js
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md
 */

import { randomUUID } from 'node:crypto';

import {
  SKIP_ALREADY_CLAIMED,
  CLAIM_ACQUIRED,
  parseCursorActivationClaimsFromComments,
  evaluateCursorIssueActivationClaim,
} from './cursor-activation-claim.js';
import {
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_IN_PROGRESS,
  DISPATCH_LABEL_OPERATOR_REVIEW,
  DISPATCH_LABEL_READY,
  addIssueLabelsApi,
  ensureDispatchLifecycleLabels,
  normalizeIssueLabels,
  removeIssueLabelApi,
} from './cursor-issue-dispatch-lifecycle.js';

export { SKIP_ALREADY_CLAIMED, CLAIM_ACQUIRED };

export const CODEX_ACTIVATION_CLAIM_SCHEMA = 'corpflow.codex_activation_claim.v1';
export const CODEX_ACTIVATION_CLAIM_MARKER = 'corpflow.codex_activation_claim.v1';

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
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
 * @param {Partial<{
 *   sourceIssue: number,
 *   generation: number,
 *   claimToken: string,
 *   status: string,
 *   prNumber: number | null,
 *   triggerCommentId: number | null,
 *   claimedAt: string,
 *   workflowRunId: string | null,
 * }> & { sourceIssue: number, claimToken: string }} input
 */
export function buildCodexActivationClaim(input) {
  const statusRaw = String(input.status || 'pending').toLowerCase();
  const status =
    statusRaw === 'activated' || statusRaw === 'released' || statusRaw === 'completed'
      ? statusRaw
      : 'pending';
  return {
    schema: CODEX_ACTIVATION_CLAIM_SCHEMA,
    executor: 'codex',
    sourceIssue: toPositiveInt(input.sourceIssue) || 0,
    generation: Math.max(1, Math.floor(Number(input.generation) || 1)),
    claimToken: String(input.claimToken || '').trim(),
    status,
    prNumber: toPositiveInt(input.prNumber),
    triggerCommentId: toPositiveInt(input.triggerCommentId),
    claimedAt: emptyToNull(input.claimedAt) || new Date().toISOString(),
    workflowRunId: emptyToNull(input.workflowRunId),
  };
}

/**
 * @param {ReturnType<typeof buildCodexActivationClaim>} claim
 */
export function formatCodexActivationClaimComment(claim) {
  const c = buildCodexActivationClaim(claim);
  const json = JSON.stringify(c);
  return `CODEX ACTIVATION CLAIM

Executor: codex
Issue: #${c.sourceIssue}
Generation: ${c.generation}
Claim token: ${c.claimToken}
Status: ${c.status}
PR: ${c.prNumber != null ? `#${c.prNumber}` : 'pending'}
Trigger comment: ${c.triggerCommentId || 'pending'}
Workflow run: ${c.workflowRunId || 'n/a'}
Claimed at: ${c.claimedAt}

<!-- ${CODEX_ACTIVATION_CLAIM_MARKER} ${json} -->
`;
}

/**
 * @param {string} body
 */
export function parseCodexActivationClaimFromText(body) {
  const text = String(body || '');
  const marker = text.match(
    new RegExp(`<!--\\s*${CODEX_ACTIVATION_CLAIM_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!marker) return null;
  try {
    const parsed = JSON.parse(marker[1]);
    if (!parsed?.claimToken || !parsed?.sourceIssue) return null;
    return buildCodexActivationClaim(parsed);
  } catch {
    return null;
  }
}

/**
 * @param {Array<{ body?: string | null }>} comments
 */
export function parseCodexActivationClaimsFromComments(comments) {
  const out = [];
  for (const c of Array.isArray(comments) ? comments : []) {
    const parsed = parseCodexActivationClaimFromText(c?.body || '');
    if (parsed) out.push(parsed);
  }
  return out.sort((a, b) => b.generation - a.generation);
}

/**
 * Pure gate for Codex claim. Honours Cursor claims (cross-executor).
 *
 * @param {{
 *   issueNumber: number,
 *   labels?: unknown,
 *   issueBody?: string | null,
 *   comments?: Array<{ body?: string | null }>,
 * }} input
 */
export function evaluateCodexIssueActivationClaim(input) {
  const issueNumber = toPositiveInt(input.issueNumber);
  if (!issueNumber) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: 'invalid_issue',
      generation: null,
      nextGeneration: null,
      activeClaim: null,
    };
  }

  const comments = Array.isArray(input.comments) ? input.comments : [];
  const labels = normalizeIssueLabels(input.labels).map((l) => l.toLowerCase());

  // Cross-executor: reuse Cursor gate semantics for claimed / operator-review / active cursor claim.
  const cursorGate = evaluateCursorIssueActivationClaim({
    issueNumber,
    labels: input.labels,
    issueBody: input.issueBody,
    comments,
  });
  if (cursorGate.decision === SKIP_ALREADY_CLAIMED) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: `cross_executor_cursor:${cursorGate.reason}`,
      generation: cursorGate.generation,
      nextGeneration: null,
      activeClaim: cursorGate.activeClaim,
      claimedBy: 'cursor',
    };
  }

  const claims = parseCodexActivationClaimsFromComments(comments);
  const activeClaims = claims.filter((c) => c.status === 'pending' || c.status === 'activated');
  const latestActive = activeClaims[0] || null;
  const latestAny = claims[0] || null;
  const maxGeneration = Math.max(latestAny?.generation || 0, latestActive?.generation || 0);
  const hasOperatorReview = labels.includes(DISPATCH_LABEL_OPERATOR_REVIEW.toLowerCase());
  const hasClaimedLabel = labels.includes(DISPATCH_LABEL_CLAIMED.toLowerCase());

  if (hasOperatorReview) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: 'operator_review',
      generation: maxGeneration || null,
      nextGeneration: null,
      activeClaim: latestActive,
      claimedBy: 'operator',
    };
  }

  if (hasClaimedLabel || latestActive) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: hasClaimedLabel ? 'claimed_label' : 'active_codex_claim',
      generation: latestActive?.generation || maxGeneration || null,
      nextGeneration: null,
      activeClaim: latestActive,
      claimedBy: latestActive ? 'codex' : 'label',
    };
  }

  // Also block if Cursor claim markers exist even without labels (parse already covered by cursor gate).
  const cursorClaims = parseCursorActivationClaimsFromComments(comments).filter(
    (c) => c.status === 'pending' || c.status === 'activated',
  );
  if (cursorClaims.length) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: 'cross_executor_cursor:active_claim_marker',
      generation: cursorClaims[0].generation,
      nextGeneration: null,
      activeClaim: cursorClaims[0],
      claimedBy: 'cursor',
    };
  }

  return {
    decision: 'ACQUIRE',
    reason: 'first_codex_activation',
    generation: Math.max(1, maxGeneration + 1),
    nextGeneration: Math.max(1, maxGeneration + 1),
    activeClaim: null,
    claimedBy: null,
  };
}

/**
 * @param {{
 *   token: string,
 *   repo: string,
 *   issueNumber: number,
 *   labels?: unknown,
 *   issueBody?: string | null,
 *   comments?: Array<{ body?: string | null }>,
 *   prNumber?: number | null,
 *   workflowRunId?: string | null,
 *   claimToken?: string | null,
 *   postComment?: (issueNumber: number, body: string) => Promise<unknown>,
 *   listComments?: (issueNumber: number) => Promise<Array<{ body?: string | null }>>,
 *   fetch?: typeof fetch,
 *   nowIso?: string,
 * }} opts
 */
export async function acquireCodexIssueActivationClaim(opts) {
  const issueNumber = toPositiveInt(opts.issueNumber);
  if (!issueNumber) {
    return {
      ok: false,
      decision: SKIP_ALREADY_CLAIMED,
      reason: 'invalid_issue',
      claim: null,
    };
  }

  let comments = Array.isArray(opts.comments) ? opts.comments : null;
  if (!comments && opts.listComments) {
    comments = await opts.listComments(issueNumber);
  }
  if (!comments) comments = [];

  const gate = evaluateCodexIssueActivationClaim({
    issueNumber,
    labels: opts.labels,
    issueBody: opts.issueBody,
    comments,
  });

  if (gate.decision === SKIP_ALREADY_CLAIMED) {
    return {
      ok: false,
      decision: SKIP_ALREADY_CLAIMED,
      reason: gate.reason,
      generation: gate.generation,
      claim: gate.activeClaim,
      claimedBy: gate.claimedBy,
    };
  }

  const claimToken = String(opts.claimToken || randomUUID()).trim();
  const claim = buildCodexActivationClaim({
    sourceIssue: issueNumber,
    generation: gate.nextGeneration || gate.generation || 1,
    claimToken,
    status: 'pending',
    prNumber: opts.prNumber,
    claimedAt: opts.nowIso || new Date().toISOString(),
    workflowRunId: opts.workflowRunId,
  });

  await ensureDispatchLifecycleLabels(opts.token, opts.repo, opts.fetch);
  await addIssueLabelsApi(
    opts.token,
    opts.repo,
    issueNumber,
    [DISPATCH_LABEL_CLAIMED, DISPATCH_LABEL_IN_PROGRESS],
    opts.fetch,
  );
  await removeIssueLabelApi(opts.token, opts.repo, issueNumber, DISPATCH_LABEL_READY, opts.fetch);

  if (opts.postComment) {
    await opts.postComment(issueNumber, formatCodexActivationClaimComment(claim));
  }

  return {
    ok: true,
    decision: CLAIM_ACQUIRED,
    reason: gate.reason,
    claim,
    claimedBy: 'codex',
  };
}
