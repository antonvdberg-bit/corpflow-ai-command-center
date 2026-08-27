/**
 * Durable pre-API Cursor activation claims (GitHub state only — no DB).
 *
 * Guarantees at most one live Cursor activation per source issue generation:
 * claim labels + claim marker are established BEFORE createCursorCloudAgent.
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md
 */

import { randomUUID } from 'node:crypto';

import { resolveCursorOriginMetadata } from './cursor-origin-metadata.js';
import {
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_IN_PROGRESS,
  DISPATCH_LABEL_OPERATOR_REVIEW,
  DISPATCH_LABEL_READY,
  addIssueLabelsApi,
  ensureDispatchLifecycleLabels,
  normalizeIssueLabels,
  removeIssueLabelApi,
  rollbackPrematureIssueClaim,
} from './cursor-issue-dispatch-lifecycle.js';
import { isTrustedOperatorIdentity } from './operator-gate-authorization.js';

export const CURSOR_ACTIVATION_CLAIM_SCHEMA = 'corpflow.cursor_activation_claim.v1';
export const CURSOR_ACTIVATION_CLAIM_MARKER = 'corpflow.cursor_activation_claim.v1';
export const CURSOR_REQUEUE_MARKER = 'corpflow.cursor_requeue.v1';

export const SKIP_ALREADY_CLAIMED = 'SKIP_ALREADY_CLAIMED';
export const CLAIM_ACQUIRED = 'CLAIM_ACQUIRED';
export const CLAIM_RELEASED = 'CLAIM_RELEASED';

/**
 * @typedef {{
 *   schema: string,
 *   sourceIssue: number,
 *   generation: number,
 *   claimToken: string,
 *   status: 'pending' | 'activated' | 'released' | 'completed',
 *   agentRunId: string | null,
 *   claimedAt: string,
 *   workflowRunId: string | null,
 * }} CursorActivationClaim
 */

/**
 * @typedef {{
 *   schema: string,
 *   sourceIssue: number,
 *   generation: number,
 *   reason: string | null,
 *   requeuedAt: string,
 *   instructionFingerprint?: string | null,
 *   prose?: boolean,
 * }} CursorRequeueMarker
 */

/**
 * @param {Partial<CursorActivationClaim> & { sourceIssue: number, claimToken: string }} input
 * @returns {CursorActivationClaim}
 */
export function buildCursorActivationClaim(input) {
  const generation = Math.max(1, Math.floor(Number(input.generation) || 1));
  const status = normalizeClaimStatus(input.status);
  return {
    schema: CURSOR_ACTIVATION_CLAIM_SCHEMA,
    sourceIssue: toPositiveInt(input.sourceIssue) || 0,
    generation,
    claimToken: String(input.claimToken || '').trim(),
    status,
    agentRunId: emptyToNull(input.agentRunId),
    claimedAt: emptyToNull(input.claimedAt) || new Date().toISOString(),
    workflowRunId: emptyToNull(input.workflowRunId),
  };
}

/**
 * @param {CursorActivationClaim} claim
 */
export function formatCursorActivationClaimComment(claim) {
  const c = buildCursorActivationClaim(claim);
  const json = JSON.stringify(c);
  return `CURSOR ACTIVATION CLAIM

Issue: #${c.sourceIssue}
Generation: ${c.generation}
Claim token: ${c.claimToken}
Status: ${c.status}
Agent/run ID: ${c.agentRunId || 'pending'}
Workflow run: ${c.workflowRunId || 'n/a'}
Claimed at: ${c.claimedAt}

<!-- ${CURSOR_ACTIVATION_CLAIM_MARKER} ${json} -->
`;
}

/**
 * @param {string} body
 * @returns {CursorActivationClaim | null}
 */
export function parseCursorActivationClaimFromText(body) {
  const text = String(body || '');
  const marker = text.match(
    new RegExp(`<!--\\s*${CURSOR_ACTIVATION_CLAIM_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!marker) return null;
  try {
    const parsed = JSON.parse(marker[1]);
    const claim = buildCursorActivationClaim({
      sourceIssue: parsed.sourceIssue,
      generation: parsed.generation,
      claimToken: parsed.claimToken,
      status: parsed.status,
      agentRunId: parsed.agentRunId,
      claimedAt: parsed.claimedAt,
      workflowRunId: parsed.workflowRunId,
    });
    if (!claim.sourceIssue || !claim.claimToken) return null;
    return claim;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
export function isTerminalClaimStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  return s === 'released' || s === 'completed';
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
export function isActiveClaimStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  return s === 'pending' || s === 'activated';
}

/**
 * @param {unknown} status
 * @returns {number}
 */
function claimStatusRank(status) {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'completed') return 4;
  if (s === 'released') return 3;
  if (s === 'activated') return 2;
  if (s === 'pending') return 1;
  return 0;
}

/**
 * @param {{ created_at?: string | null } | null | undefined} comment
 * @param {CursorActivationClaim} claim
 * @param {number} index
 * @returns {number}
 */
function claimCommentOrder(comment, claim, index) {
  const commentAt = Date.parse(comment?.created_at || '');
  if (Number.isFinite(commentAt)) return commentAt;
  const claimedAt = Date.parse(claim?.claimedAt || '');
  if (Number.isFinite(claimedAt)) return claimedAt;
  return index;
}

/**
 * Collapse append-only claim comments for the same
 * `(sourceIssue, generation, claimToken)` to the latest status.
 * `released` / `completed` supersede earlier `pending` / `activated`.
 * Distinct claim tokens in the same generation are preserved for race detection.
 *
 * @param {Array<{ body?: string | null, created_at?: string | null }>} comments
 * @returns {CursorActivationClaim[]}
 */
export function parseCursorActivationClaimsFromComments(comments) {
  const list = Array.isArray(comments) ? comments : [];
  /** @type {Map<string, { claim: CursorActivationClaim, order: number, index: number, statusRank: number }>} */
  const collapsed = new Map();

  for (let i = 0; i < list.length; i += 1) {
    const comment = list[i];
    const parsed = parseCursorActivationClaimFromText(comment?.body || '');
    if (!parsed) continue;
    const key = `${parsed.sourceIssue}:${parsed.generation}:${parsed.claimToken}`;
    const order = claimCommentOrder(comment, parsed, i);
    const statusRank = claimStatusRank(parsed.status);
    const prev = collapsed.get(key);
    if (!prev) {
      collapsed.set(key, { claim: parsed, order, index: i, statusRank });
      continue;
    }
    const prevTerminal = isTerminalClaimStatus(prev.claim.status);
    const nextTerminal = isTerminalClaimStatus(parsed.status);
    const takeNext =
      nextTerminal && !prevTerminal
        ? true
        : prevTerminal && !nextTerminal
          ? false
          : order > prev.order
            ? true
            : order === prev.order && (statusRank > prev.statusRank || i > prev.index);
    if (takeNext) {
      collapsed.set(key, { claim: parsed, order, index: i, statusRank });
    }
  }

  return [...collapsed.values()]
    .map((entry) => entry.claim)
    .sort((a, b) => {
      if (b.generation !== a.generation) return b.generation - a.generation;
      return String(a.claimToken).localeCompare(String(b.claimToken));
    });
}

/**
 * Latest `CURSOR REQUEUE` is a generation boundary: comments at or before that
 * marker belong to the retired generation.
 *
 * @param {Array<{ body?: string | null }>} comments
 * @returns {{
 *   comments: Array<{ body?: string | null, created_at?: string | null }>,
 *   hasRequeueBoundary: boolean,
 *   latestRequeueIndex: number,
 * }}
 */
export function sliceCommentsAfterLatestCursorRequeue(comments) {
  const list = Array.isArray(comments) ? comments : [];
  let latestRequeueIndex = -1;
  for (let i = 0; i < list.length; i += 1) {
    if (parseCursorRequeueFromText(list[i]?.body || '', commentRequeueMeta(list[i]))) {
      latestRequeueIndex = i;
    }
  }
  return {
    comments: latestRequeueIndex >= 0 ? list.slice(latestRequeueIndex + 1) : list,
    hasRequeueBoundary: latestRequeueIndex >= 0,
    latestRequeueIndex,
  };
}

/**
 * @param {Partial<CursorRequeueMarker> & { sourceIssue: number, generation: number }} input
 * @returns {CursorRequeueMarker}
 */
export function buildCursorRequeueMarker(input) {
  /** @type {CursorRequeueMarker} */
  const marker = {
    schema: 'corpflow.cursor_requeue.v1',
    sourceIssue: toPositiveInt(input.sourceIssue) || 0,
    generation: Math.max(1, Math.floor(Number(input.generation) || 1)),
    reason: emptyToNull(input.reason),
    requeuedAt: emptyToNull(input.requeuedAt) || new Date().toISOString(),
  };
  const fingerprint = emptyToNull(input.instructionFingerprint);
  if (fingerprint) marker.instructionFingerprint = fingerprint;
  return marker;
}

/**
 * @param {CursorRequeueMarker} marker
 */
export function formatCursorRequeueComment(marker) {
  const m = buildCursorRequeueMarker(marker);
  const json = JSON.stringify(m);
  return `CURSOR REQUEUE

Issue: #${m.sourceIssue}
Generation: ${m.generation}
Reason: ${m.reason || 'explicit operator requeue'}
Requeued at: ${m.requeuedAt}

Explicit new attempt authorized. Prior activation must not resume.

<!-- ${CURSOR_REQUEUE_MARKER} ${json} -->
`;
}

/**
 * True when a comment is an explicit CURSOR REQUEUE instruction or durable marker.
 * Mentions inside factory/lifecycle prose do not count.
 *
 * @param {unknown} body
 */
export function looksLikeExplicitCursorRequeueInstruction(body) {
  const text = String(body || '').replace(/^\uFEFF/, '');
  if (!text.trim()) return false;
  if (new RegExp(`<!--\\s*${CURSOR_REQUEUE_MARKER}\\s+\\{`, 'i').test(text)) return true;
  const stripped = text.replace(/^\s*(?:#{1,6}\s+)?/, '');
  return /^CURSOR REQUEUE\b/i.test(stripped);
}

/**
 * Authorised operator/controller for a prose CURSOR REQUEUE instruction.
 * Durable HTML markers are self-authorizing and do not use this gate.
 *
 * @param {{ author?: string | null, actorLogin?: string | null, authorAssociation?: string | null, commentAuthorAssociation?: string | null }} [meta]
 */
export function isAuthorizedCursorRequeueActor(meta = {}) {
  const author = String(meta.author || meta.actorLogin || '').trim();
  if (!author) return true;
  if (isTrustedOperatorIdentity(author, null)) return true;
  const assoc = String(meta.authorAssociation || meta.commentAuthorAssociation || '')
    .trim()
    .toUpperCase();
  return ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(assoc);
}

/**
 * @param {string} body
 * @param {{ author?: string | null, actorLogin?: string | null, authorAssociation?: string | null, commentAuthorAssociation?: string | null, created_at?: string | null }} [meta]
 * @returns {(CursorRequeueMarker & { prose?: boolean }) | null}
 */
export function parseCursorRequeueFromText(body, meta = {}) {
  const text = String(body || '');
  const marker = text.match(
    new RegExp(`<!--\\s*${CURSOR_REQUEUE_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (marker) {
    try {
      const parsed = JSON.parse(marker[1]);
      const m = buildCursorRequeueMarker({
        sourceIssue: parsed.sourceIssue,
        generation: parsed.generation,
        reason: parsed.reason,
        requeuedAt: parsed.requeuedAt,
        instructionFingerprint: parsed.instructionFingerprint,
      });
      if (!m.sourceIssue || !m.generation) return null;
      return m;
    } catch {
      return null;
    }
  }

  if (!looksLikeExplicitCursorRequeueInstruction(text)) return null;
  if (!isAuthorizedCursorRequeueActor(meta)) return null;

  const sourceMatch = text.match(/Issue:\s*#(\d+)/i);
  const generationMatch = text.match(/Generation:\s*(\d+)/i);
  const reasonMatch = text.match(/Reason:\s*(.+)/i);
  const generation = generationMatch ? toPositiveInt(generationMatch[1]) || 0 : 0;
  const sourceIssue = sourceMatch ? toPositiveInt(sourceMatch[1]) || 0 : 0;
  const heading = text
    .replace(/^\uFEFF/, '')
    .replace(/^\s*(?:#{1,6}\s+)?/, '')
    .split(/\n/)[0]
    .replace(/^CURSOR REQUEUE\s*[—–:-]?\s*/i, '')
    .trim();
  return {
    schema: 'corpflow.cursor_requeue.v1',
    sourceIssue,
    generation,
    reason: emptyToNull(reasonMatch?.[1]) || emptyToNull(heading) || 'explicit operator requeue',
    requeuedAt: emptyToNull(meta.created_at) || new Date().toISOString(),
    instructionFingerprint: cursorRequeueInstructionFingerprint(text, meta.created_at),
    prose: generation < 1,
  };
}

/**
 * @param {Array<{ body?: string | null, author?: string | null, user?: { login?: string | null }, created_at?: string | null, createdAt?: string | null, author_association?: string | null, authorAssociation?: string | null }>} comments
 * @returns {CursorRequeueMarker[]}
 */
export function parseCursorRequeuesFromComments(comments) {
  const list = Array.isArray(comments) ? comments : [];
  /** @type {CursorRequeueMarker[]} */
  const resolved = [];
  let latestClaimGen = 0;
  let completedMax = 0;
  let latestAssigned = 0;

  for (const comment of list) {
    const body = comment?.body || '';
    const claim = parseCursorActivationClaimFromText(body);
    if (claim) {
      latestClaimGen = Math.max(latestClaimGen, Number(claim.generation) || 0);
      if (isTerminalClaimStatus(claim.status)) {
        completedMax = Math.max(completedMax, Number(claim.generation) || 0);
      }
    }
    if (commentShowsRetiredGeneration(body)) {
      completedMax = Math.max(completedMax, latestAssigned, latestClaimGen, 1);
    }

    const parsed = parseCursorRequeueFromText(body, commentRequeueMeta(comment));
    if (!parsed) continue;

    let generation = Number(parsed.generation) || 0;
    if (generation < 1) {
      if (latestAssigned > completedMax) {
        generation = latestAssigned;
      } else {
        const baseline = Math.max(completedMax, latestClaimGen, latestAssigned, 0);
        generation = baseline >= 1 ? baseline + 1 : 1;
      }
    }
    latestAssigned = Math.max(latestAssigned, generation);
    resolved.push({
      ...parsed,
      sourceIssue: parsed.sourceIssue || 0,
      generation,
      prose: Boolean(parsed.prose && !(Number(parsed.generation) >= 1)),
    });
  }

  return resolved.sort((a, b) => b.generation - a.generation);
}

/**
 * Idempotent durable marker for an authorised prose CURSOR REQUEUE.
 * Creates at most one marker per next generation.
 *
 * @param {{
 *   issueNumber: number,
 *   comments?: Array<{ body?: string | null, author?: string | null, created_at?: string | null }>,
 *   nowIso?: string | null,
 * }} input
 */
export function planCursorRequeueMaterialization(input) {
  const issueNumber = toPositiveInt(input.issueNumber);
  if (!issueNumber) {
    return { post: false, reason: 'invalid_issue', generation: null, body: null };
  }
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const resolved = parseCursorRequeuesFromComments(comments);
  const latest = resolved[0] || null;
  if (!latest) {
    return { post: false, reason: 'no_requeue_instruction', generation: null, body: null };
  }
  const durablePresent = resolved.some(
    (marker) => !marker.prose && Number(marker.generation) === Number(latest.generation),
  );
  if (durablePresent) {
    return {
      post: false,
      reason: 'durable_marker_present',
      generation: latest.generation,
      body: null,
    };
  }

  const marker = buildCursorRequeueMarker({
    sourceIssue: issueNumber,
    generation: latest.generation,
    reason: latest.reason || 'explicit operator requeue',
    requeuedAt: input.nowIso || latest.requeuedAt,
    instructionFingerprint: latest.instructionFingerprint,
  });
  return {
    post: true,
    reason: 'materialize_next_generation',
    generation: marker.generation,
    marker,
    body: formatCursorRequeueComment(marker),
  };
}

/**
 * Pure gate: whether a Cursor live activation may proceed for this issue.
 *
 * @param {{
 *   issueNumber: number,
 *   labels?: unknown,
 *   issueBody?: string | null,
 *   comments?: Array<{ body?: string | null }>,
 *   allowExplicitRequeue?: boolean,
 * }} input
 */
export function evaluateCursorIssueActivationClaim(input) {
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

  const labels = normalizeIssueLabels(input.labels).map((l) => l.toLowerCase());
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const claims = parseCursorActivationClaimsFromComments(comments);
  const requeues = parseCursorRequeuesFromComments(comments);
  const origin = resolveCursorOriginMetadata({
    issueBody: input.issueBody,
    comments,
  });

  const latestRequeue = requeues[0] || null;
  const requeueGeneration = latestRequeue?.generation || 0;
  const currentGenerationClaims =
    requeueGeneration > 0
      ? claims.filter((c) => Number(c.generation) >= requeueGeneration)
      : claims;
  const activeClaims = currentGenerationClaims.filter((c) => isActiveClaimStatus(c.status));
  const latestActive = activeClaims[0] || null;
  const latestAny = claims[0] || null;
  const maxGeneration = Math.max(
    latestAny?.generation || 0,
    latestRequeue?.generation || 0,
    latestActive?.generation || 0,
  );

  const hasClaimedLabel = labels.includes(DISPATCH_LABEL_CLAIMED.toLowerCase());
  const hasOperatorReview = labels.includes(DISPATCH_LABEL_OPERATOR_REVIEW.toLowerCase());
  const hasReadyLabel = labels.includes(DISPATCH_LABEL_READY.toLowerCase());
  const hasCompletedAgent = Boolean(origin.cursorAgentId || origin.cursorRunId);

  const activeGeneration = latestActive?.generation || 0;
  const explicitRequeueOpen =
    Boolean(input.allowExplicitRequeue) ||
    (requeueGeneration > 0 &&
      requeueGeneration > activeGeneration &&
      hasReadyLabel &&
      !hasClaimedLabel &&
      !hasOperatorReview);

  if (explicitRequeueOpen) {
    const nextGeneration = Math.max(requeueGeneration, maxGeneration, 1);
    return {
      decision: 'ACQUIRE',
      reason: 'explicit_requeue',
      generation: nextGeneration,
      nextGeneration,
      activeClaim: null,
      origin,
    };
  }

  if (hasOperatorReview || hasCompletedAgent) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: hasOperatorReview ? 'operator_review' : 'completed_agent_present',
      generation: activeGeneration || maxGeneration || null,
      nextGeneration: null,
      activeClaim: latestActive,
      origin,
    };
  }

  if (hasClaimedLabel || latestActive) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: hasClaimedLabel ? 'claimed_label' : 'active_claim_marker',
      generation: activeGeneration || maxGeneration || null,
      nextGeneration: null,
      activeClaim: latestActive,
      origin,
    };
  }

  if (latestRequeue) {
    const nextGeneration = Math.max(requeueGeneration, maxGeneration, 1);
    return {
      decision: 'ACQUIRE',
      reason: 'explicit_requeue',
      generation: nextGeneration,
      nextGeneration,
      activeClaim: null,
      origin,
    };
  }

  return {
    decision: 'ACQUIRE',
    reason: 'first_activation',
    generation: Math.max(1, maxGeneration + 1),
    nextGeneration: Math.max(1, maxGeneration + 1),
    activeClaim: null,
    origin,
  };
}

/**
 * @param {{
 *   token: string,
 *   repo: string,
 *   issueNumber: number,
 *   labels?: unknown,
 *   issueBody?: string | null,
 *   comments?: Array<{ body?: string | null, created_at?: string | null }>,
 *   allowExplicitRequeue?: boolean,
 *   workflowRunId?: string | null,
 *   claimToken?: string | null,
 *   postComment?: (issueNumber: number, body: string) => Promise<unknown>,
 *   listComments?: (issueNumber: number) => Promise<Array<{ body?: string | null, created_at?: string | null }>>,
 *   fetch?: typeof fetch,
 *   nowIso?: string,
 *   markInProgress?: boolean,
 * }} opts
 */
export async function acquireCursorIssueActivationClaim(opts) {
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

  const gate = evaluateCursorIssueActivationClaim({
    issueNumber,
    labels: opts.labels,
    issueBody: opts.issueBody,
    comments,
    allowExplicitRequeue: opts.allowExplicitRequeue,
  });

  if (gate.decision === SKIP_ALREADY_CLAIMED) {
    return {
      ok: false,
      decision: SKIP_ALREADY_CLAIMED,
      reason: gate.reason,
      generation: gate.generation,
      claim: gate.activeClaim,
      origin: gate.origin,
    };
  }

  const claimToken = String(opts.claimToken || randomUUID()).trim();
  const claim = buildCursorActivationClaim({
    sourceIssue: issueNumber,
    generation: gate.nextGeneration || gate.generation || 1,
    claimToken,
    status: 'pending',
    agentRunId: null,
    claimedAt: opts.nowIso || new Date().toISOString(),
    workflowRunId: opts.workflowRunId,
  });

  await ensureDispatchLifecycleLabels(opts.token, opts.repo, opts.fetch);
  await addIssueLabelsApi(
    opts.token,
    opts.repo,
    issueNumber,
    opts.markInProgress === false
      ? [DISPATCH_LABEL_CLAIMED]
      : [DISPATCH_LABEL_CLAIMED, DISPATCH_LABEL_IN_PROGRESS],
    opts.fetch,
  );
  await removeIssueLabelApi(opts.token, opts.repo, issueNumber, DISPATCH_LABEL_READY, opts.fetch);

  if (opts.postComment) {
    await opts.postComment(issueNumber, formatCursorActivationClaimComment(claim));
  }

  // Race resolution: earliest claimToken for this generation wins.
  let refreshed = comments;
  if (opts.listComments) {
    refreshed = await opts.listComments(issueNumber);
  }
  const sameGen = parseCursorActivationClaimsFromComments(refreshed).filter(
    (c) =>
      c.generation === claim.generation &&
      isActiveClaimStatus(c.status) &&
      c.sourceIssue === issueNumber,
  );
  const winner = [...sameGen].sort((a, b) => a.claimToken.localeCompare(b.claimToken))[0];
  if (winner && winner.claimToken !== claim.claimToken) {
    return {
      ok: false,
      decision: SKIP_ALREADY_CLAIMED,
      reason: 'lost_claim_race',
      generation: claim.generation,
      claim,
      winnerClaimToken: winner.claimToken,
    };
  }

  const originAfter = resolveCursorOriginMetadata({
    issueBody: opts.issueBody,
    comments: refreshed,
  });
  if (originAfter.cursorAgentId || originAfter.cursorRunId) {
    return {
      ok: false,
      decision: SKIP_ALREADY_CLAIMED,
      reason: 'completed_agent_present',
      generation: claim.generation,
      claim,
      origin: originAfter,
    };
  }

  return {
    ok: true,
    decision: CLAIM_ACQUIRED,
    reason: gate.reason,
    generation: claim.generation,
    claim,
  };
}

/**
 * Release a pre-API claim after failed Cursor activation.
 *
 * @param {{
 *   token: string,
 *   repo: string,
 *   issueNumber: number,
 *   claim?: CursorActivationClaim | null,
 *   postComment?: (issueNumber: number, body: string) => Promise<unknown>,
 *   fetch?: typeof fetch,
 * }} opts
 */
export async function releaseCursorIssueActivationClaim(opts) {
  const issueNumber = toPositiveInt(opts.issueNumber);
  if (!issueNumber) {
    return { ok: false, decision: CLAIM_RELEASED, reason: 'invalid_issue' };
  }

  await rollbackPrematureIssueClaim({
    token: opts.token,
    repo: opts.repo,
    issueNumber,
    fetch: opts.fetch,
  });

  if (opts.claim && opts.postComment) {
    const released = buildCursorActivationClaim({
      ...opts.claim,
      status: 'released',
    });
    await opts.postComment(issueNumber, formatCursorActivationClaimComment(released));
  }

  return {
    ok: true,
    decision: CLAIM_RELEASED,
    reason: 'activation_failed_claim_released',
    issueNumber,
  };
}

/**
 * @param {{
 *   token: string,
 *   repo: string,
 *   issueNumber: number,
 *   fetch?: typeof fetch,
 *   timeoutMs?: number,
 * }} opts
 */
export async function listGitHubIssueComments(opts) {
  const fetchFn = opts.fetch || globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? 30000;
  const url = `https://api.github.com/repos/${opts.repo}/issues/${opts.issueNumber}/comments?per_page=100`;
  const res = await fetchFn(url, {
    headers: {
      Authorization: `Bearer ${opts.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub list comments HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text);
  return Array.isArray(json) ? json : [];
}

/**
 * @param {unknown} value
 * @returns {'pending' | 'activated' | 'released' | 'completed'}
 */
function normalizeClaimStatus(value) {
  const s = String(value || 'pending')
    .trim()
    .toLowerCase();
  if (s === 'activated' || s === 'released' || s === 'completed' || s === 'pending') return s;
  return 'pending';
}

function commentRequeueMeta(comment) {
  return {
    author: comment?.author || comment?.user?.login || null,
    authorAssociation: comment?.author_association || comment?.authorAssociation || null,
    created_at: comment?.created_at || comment?.createdAt || null,
  };
}

/**
 * @param {unknown} body
 * @param {unknown} createdAt
 */
function cursorRequeueInstructionFingerprint(body, createdAt) {
  const first = String(body || '')
    .split(/\n/)[0]
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, 240);
  const at = String(createdAt || '').trim();
  return `${first}|${at}`;
}

/**
 * Prior generation reached a terminal/review state. Used to increment the
 * next explicit CURSOR REQUEUE generation.
 *
 * @param {unknown} body
 */
function commentShowsRetiredGeneration(body) {
  const text = String(body || '');
  if (/CURSOR IMPLEMENTATION COMPLETE/i.test(text)) return true;
  if (/READY FOR MERGE REVIEW/i.test(text)) return true;
  const completion = text.match(
    /<!--\s*corpflow\.cursor_completion_event\.v1\s+(\{[\s\S]*?\})\s*-->/i,
  );
  if (completion) {
    try {
      const status = String(JSON.parse(completion[1])?.status || '').toUpperCase();
      return ['COMPLETED', 'FAILED', 'STALE'].includes(status);
    } catch {
      return false;
    }
  }
  if (
    /CURSOR COMPLETION EVENT/i.test(text) &&
    /Status:\s*(COMPLETED|FAILED|STALE)/i.test(text)
  ) {
    return true;
  }
  if (
    /CURSOR LIFECYCLE STATE/i.test(text) &&
    /Phase:\s*(COMPLETED|FAILED|STALE)/i.test(text)
  ) {
    return true;
  }
  return false;
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
 * @param {unknown} value
 * @returns {number | null}
 */
function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
