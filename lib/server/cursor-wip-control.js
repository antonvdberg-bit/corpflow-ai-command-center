/**
 * Cursor WIP Control v1 — verified active-run capacity (not label counting).
 *
 * Global Cursor execution WIP is one implementation lane. The historical
 * Temporal pilot cannot add capacity: tier/spend control supersedes its
 * former 3+2 allowance.
 *
 * A slot is occupied only when current-generation activation metadata proves
 * a live Cursor implementation run. Lifecycle labels are display state;
 * stale/orphaned labels never consume capacity.
 *
 * Execution WIP vs review/decision inventory (#976):
 * - Execution WIP: genuine active Cursor implementation still running.
 * - Review/decision inventory: merge-ready PRs, operator-review, protected
 *   approval waits, external waits. These consume ZERO forward-production
 *   slots unless a real continuation run is active after CURSOR REQUEUE.
 * Open / merge-ready PR count is not execution WIP.
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 * @see GitHub issue #862
 * @see GitHub issue #976
 * @see GitHub issue #1145
 */

import {
  isActiveClaimStatus,
  isTerminalClaimStatus,
  parseCursorActivationClaimsFromComments,
  parseCursorRequeuesFromComments,
  sliceCommentsAfterLatestCursorRequeue,
} from './cursor-activation-claim.js';
import {
  extractCursorAgentIdFromText,
  extractCursorRunIdFromText,
} from './cursor-cloud-agent-client.js';
import { resolveCursorOriginMetadata } from './cursor-origin-metadata.js';

export const CURSOR_WIP_CONTROL_SCHEMA = 'corpflow.cursor_wip_control.v1';
/** Default / outside-pilot Cursor execution ceiling. Do not raise this constant. */
export const CURSOR_WIP_MAX_SLOTS = 1;
/** Ordinary PRODUCT / CLIENT / REVENUE / ERP reserve. Equals the default ceiling. */
export const CURSOR_WIP_PRODUCTION_RESERVE_SLOTS = CURSOR_WIP_MAX_SLOTS;
/** Incremental Temporal-supervised lanes authorized only while the pilot is active. */
export const CURSOR_WIP_TEMPORAL_EXTRA_SLOTS = 0;
/** Effective ceiling while `CORPFLOW_TEMPORAL_PILOT=active` (equals the one-lane default). */
export const CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS =
  CURSOR_WIP_PRODUCTION_RESERVE_SLOTS + CURSOR_WIP_TEMPORAL_EXTRA_SLOTS;
export const CURSOR_WIP_LANE_ORDINARY = 'ordinary';
export const CURSOR_WIP_LANE_TEMPORAL = 'temporal';
export const CURSOR_WIP_TEMPORAL_SUPERVISORY_WAKE_REASON = 'temporal_supervisory';
export const CURSOR_WIP_TEMPORAL_PILOT_VARIABLE = 'CORPFLOW_TEMPORAL_PILOT';
export const CURSOR_WIP_TEMPORAL_PILOT_ACTIVE_ENV = 'CORPFLOW_TEMPORAL_PILOT_ACTIVE';
export const CURSOR_WIP_TEMPORAL_PILOT_ACTIVE_VALUE = 'active';

/** Keep label literals local to avoid circular imports with the lifecycle module. */
const LABEL_CLAIMED = 'dispatch:cursor-claimed';
const LABEL_IN_PROGRESS = 'status:in-progress';
const LABEL_OPERATOR_REVIEW = 'dispatch:operator-review';
const LABEL_READY = 'dispatch:cursor-ready';

/** Display/lifecycle labels that must never alone prove a live run. */
export const ACTIVE_EXECUTION_LABELS = Object.freeze([LABEL_CLAIMED, LABEL_IN_PROGRESS]);

/** Ready work carrying this label is excluded from new activation. */
export const DISPATCH_LABEL_PAUSED = 'execution:paused';

export const CURSOR_COMPLETION_EVENT_MARKER = 'corpflow.cursor_completion_event.v1';

/**
 * @param {unknown} labels
 * @returns {string[]}
 */
function normalizeIssueLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && 'name' in entry) {
        return String(/** @type {{ name?: unknown }} */ (entry).name || '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

/**
 * @typedef {{
 *   number: number,
 *   title?: string,
 *   body?: string | null,
 *   labels?: unknown,
 *   state?: string | null,
 *   updatedAt?: string | null,
 *   createdAt?: string | null,
 *   comments?: Array<{ body?: string | null, created_at?: string | null }>,
 *   linkedPrs?: Array<{
 *     number?: number | null,
 *     state?: string | null,
 *     draft?: boolean,
 *     mergeReady?: boolean,
 *     implementationComplete?: boolean,
 *     checksPassing?: boolean | null,
 *     title?: string | null,
 *     body?: string | null,
 *     url?: string | null,
 *   }>,
 * }} WipTrackedIssue
 */

/**
 * @typedef {{
 *   issueNumber: number,
 *   state: string,
 *   runId: string,
 *   paused: boolean,
 *   generation: number | null,
 *   lane: 'ordinary' | 'temporal',
 * }} VerifiedWipSlot
 */

/**
 * @typedef {{
 *   issueNumber: number,
 *   reason: string,
 *   removeLabels: string[],
 *   preserveHistory: true,
 * }} WipReconcileAction
 */

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function emptyToNull(value) {
  const s = value == null ? '' : String(value).trim();
  return s || null;
}

/**
 * True when the existing Temporal pilot activation contract is live.
 * Reuses `CORPFLOW_TEMPORAL_PILOT=active` (and the `CORPFLOW_TEMPORAL_PILOT_ACTIVE`
 * alias). Does not create a new secret, database, or dispatcher.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | null | undefined} [env]
 */
export function isTemporalPilotCapacityActive(env = process.env) {
  const raw = env && typeof env === 'object' ? env : {};
  const value = String(
    raw[CURSOR_WIP_TEMPORAL_PILOT_ACTIVE_ENV] || raw[CURSOR_WIP_TEMPORAL_PILOT_VARIABLE] || '',
  )
    .trim()
    .toLowerCase();
  return value === CURSOR_WIP_TEMPORAL_PILOT_ACTIVE_VALUE;
}

/**
 * @param {{
 *   pilotActive?: boolean,
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined> | null,
 * }} [input]
 */
export function resolveTemporalPilotCapacityState(input = {}) {
  const env = input.env && typeof input.env === 'object' ? input.env : process.env;
  const pilotActive =
    typeof input.pilotActive === 'boolean' ? input.pilotActive : isTemporalPilotCapacityActive(env);
  const productionReserveSlots = CURSOR_WIP_PRODUCTION_RESERVE_SLOTS;
  const temporalExtraSlots = pilotActive ? CURSOR_WIP_TEMPORAL_EXTRA_SLOTS : 0;
  return {
    schema: 'corpflow.cursor_wip_temporal_pilot_capacity.v1',
    pilotActive,
    productionReserveSlots,
    temporalExtraSlots,
    maxSlots: productionReserveSlots + temporalExtraSlots,
  };
}

/**
 * Effective Cursor execution ceiling: 1. Temporal cannot add a second lane.
 *
 * @param {{
 *   pilotActive?: boolean,
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined> | null,
 * }} [input]
 */
export function resolveEffectiveCursorWipMaxSlots(input = {}) {
  return resolveTemporalPilotCapacityState(input).maxSlots;
}

/**
 * New activations inherit a lane from the current wake. Temporal extras are
 * only consumed by `temporal_supervisory` (or an explicit `temporal` lane).
 *
 * @param {unknown} value
 * @returns {'ordinary' | 'temporal'}
 */
export function resolveCursorWipActivationLane(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === CURSOR_WIP_LANE_TEMPORAL || raw === CURSOR_WIP_TEMPORAL_SUPERVISORY_WAKE_REASON) {
    return CURSOR_WIP_LANE_TEMPORAL;
  }
  return CURSOR_WIP_LANE_ORDINARY;
}

/**
 * Current-generation Handoff comments with `Wake reason: temporal_supervisory`
 * occupy a Temporal extra lane. Ordinary PRODUCT / CLIENT / REVENUE / ERP
 * wakes occupy the production reserve.
 *
 * @param {unknown} comments
 */
export function commentsIndicateTemporalSupervisedLane(comments) {
  const list = Array.isArray(comments) ? comments : [];
  for (const entry of list) {
    const body = typeof entry === 'string' ? entry : String(entry?.body || '');
    if (!body) continue;
    if (
      /CORPFLOW FACTORY HANDOFF/i.test(body) &&
      /Wake reason:\s*temporal_supervisory/i.test(body)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Accept Cursor run ids (`run-…`) or agent ids (`bc-…`) as verified identifiers.
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeVerifiedCursorRunId(value) {
  const raw = emptyToNull(value);
  if (!raw) return null;
  if (/^(run|bc)-[0-9a-f-]{8,}$/i.test(raw)) return raw;
  const fromRun = extractCursorRunIdFromText(raw);
  if (fromRun) return fromRun;
  const fromAgent = extractCursorAgentIdFromText(raw);
  return fromAgent || null;
}

/**
 * @param {string} body
 * @returns {{ status?: string, agent_run_id?: string | null, cursor_run_id?: string | null, cursor_agent_id?: string | null } | null}
 */
export function parseCursorCompletionEventFromText(body) {
  const text = String(body || '');
  const marker = text.match(
    new RegExp(`<!--\\s*${CURSOR_COMPLETION_EVENT_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!marker) return null;
  try {
    const parsed = JSON.parse(marker[1]);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {Array<{ body?: string | null }>} comments
 */
export function parseCursorCompletionEventsFromComments(comments) {
  /** @type {Array<ReturnType<typeof parseCursorCompletionEventFromText>>} */
  const out = [];
  for (const c of Array.isArray(comments) ? comments : []) {
    const parsed = parseCursorCompletionEventFromText(c?.body || '');
    if (parsed) out.push(parsed);
  }
  return out;
}

/**
 * Current-generation `CURSOR DISPATCH ACTIVATED` run id only.
 * Historical activated comments before the latest `CURSOR REQUEUE` cannot
 * establish live occupancy.
 *
 * @param {Array<{ body?: string | null }>} comments
 * @returns {string | null}
 */
export function extractDispatchActivatedRunId(comments) {
  const scoped = sliceCommentsAfterLatestCursorRequeue(comments).comments;
  for (const c of [...scoped].reverse()) {
    const body = String(c?.body || '');
    if (!/CURSOR DISPATCH ACTIVATED/i.test(body)) continue;
    if (/CORPFLOW FACTORY HANDOFF/i.test(body)) continue;
    const m =
      body.match(/Cursor run identifier:\s*(\S+)/i) ||
      body.match(/Agent\/run identifier:\s*(\S+)/i);
    const id = normalizeVerifiedCursorRunId(m?.[1]);
    if (id) return id;
  }
  return null;
}

/**
 * @param {WipTrackedIssue} issue
 * @returns {string[]}
 */
function labelSet(issue) {
  return normalizeIssueLabels(issue?.labels).map((l) => l.toLowerCase());
}

/**
 * @param {string[]} labels
 */
export function hasActiveExecutionLabels(labels) {
  const set = new Set((labels || []).map((l) => String(l).toLowerCase()));
  return ACTIVE_EXECUTION_LABELS.some((l) => set.has(l.toLowerCase()));
}

/**
 * @param {string[]} labels
 */
export function isExecutionPaused(labels) {
  return (labels || []).map((l) => String(l).toLowerCase()).includes(DISPATCH_LABEL_PAUSED.toLowerCase());
}

/**
 * Priority rank: P0 < P1 < P2 < unprioritized (lower = higher priority).
 * @param {WipTrackedIssue | { labels?: unknown }} issue
 * @returns {number}
 */
export function cursorReadyPriorityRank(issue) {
  const labels = normalizeIssueLabels(issue?.labels).map((l) => l.toLowerCase());
  if (labels.includes('priority:p0') || labels.includes('p0')) return 0;
  if (labels.includes('priority:p1') || labels.includes('p1')) return 1;
  if (labels.includes('priority:p2') || labels.includes('p2')) return 2;
  return 3;
}

/**
 * Source issue bound to an open PR (title `#N` or `Source issue` / `Source item`).
 *
 * @param {{ title?: string | null, body?: string | null }} pr
 * @returns {number | null}
 */
export function extractSourceIssueFromPullRequest(pr) {
  const title = String(pr?.title || '');
  const body = String(pr?.body || '');
  const named = `${title}\n${body}`.match(/Source(?:\s+item|\s+issue):\s*#(\d+)/i);
  if (named) return toPositiveInt(named[1]);
  const titleIssue = title.match(/#(\d+)/);
  return titleIssue ? toPositiveInt(titleIssue[1]) : null;
}

/**
 * Attach open PRs onto tracked issues so merge-ready inventory can release slots
 * before `dispatch:operator-review` is labelled.
 *
 * @param {WipTrackedIssue[]} issues
 * @param {Array<{ number?: number, state?: string, draft?: boolean, mergeReady?: boolean, title?: string, body?: string, url?: string, html_url?: string, implementationComplete?: boolean, checksPassing?: boolean | null }>} pullRequests
 */
export function attachLinkedPullRequestsToIssues(issues, pullRequests) {
  const byIssue = new Map();
  for (const pr of Array.isArray(pullRequests) ? pullRequests : []) {
    const issueNumber = extractSourceIssueFromPullRequest(pr);
    if (!issueNumber) continue;
    const state = String(pr.state || 'open').toLowerCase();
    const draft = Boolean(pr.draft);
    const entry = {
      number: toPositiveInt(pr.number),
      state,
      draft,
      mergeReady:
        pr.mergeReady === true ||
        (pr.mergeReady !== false && state === 'open' && !draft),
      implementationComplete: pr.implementationComplete === true,
      checksPassing: pr.checksPassing === true ? true : pr.checksPassing === false ? false : null,
      title: pr.title || '',
      url: pr.url || pr.html_url || null,
    };
    if (!byIssue.has(issueNumber)) byIssue.set(issueNumber, []);
    byIssue.get(issueNumber).push(entry);
  }
  for (const issue of Array.isArray(issues) ? issues : []) {
    const n = toPositiveInt(issue?.number);
    if (!n) continue;
    const linked = byIssue.get(n);
    if (linked?.length) {
      issue.linkedPrs = linked;
    }
  }
  return issues;
}

/**
 * @param {Array<{ body?: string | null }>} comments
 */
export function commentsShowImplementationComplete(comments) {
  return (Array.isArray(comments) ? comments : []).some((c) => {
    const body = String(c?.body || '');
    return (
      /CURSOR IMPLEMENTATION COMPLETE/i.test(body) ||
      /READY FOR MERGE REVIEW/i.test(body)
    );
  });
}

/**
 * @param {Array<{ body?: string | null }>} comments
 */
export function commentsShowPrOpened(comments) {
  return (Array.isArray(comments) ? comments : []).some((c) =>
    /CURSOR PR OPENED/i.test(String(c?.body || '')),
  );
}

/**
 * PR numbers recorded in comment text (completion events, origin, PR opened).
 *
 * @param {Array<{ body?: string | null }> | null | undefined} comments
 * @returns {Set<number>}
 */
export function extractPrNumbersFromComments(comments) {
  const nums = new Set();
  for (const comment of Array.isArray(comments) ? comments : []) {
    const text = String(comment?.body || '');
    for (const match of text.matchAll(/\bPR:\s*#?(\d+)/gi)) {
      const n = toPositiveInt(match[1]);
      if (n) nums.add(n);
    }
    for (const match of text.matchAll(/"pr"\s*:\s*(\d+)/g)) {
      const n = toPositiveInt(match[1]);
      if (n) nums.add(n);
    }
    for (const match of text.matchAll(/"prNumber"\s*:\s*(\d+)/g)) {
      const n = toPositiveInt(match[1]);
      if (n) nums.add(n);
    }
    for (const match of text.matchAll(/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)/gi)) {
      const n = toPositiveInt(match[1]);
      if (n) nums.add(n);
    }
  }
  return nums;
}

/**
 * Linked PRs that belong to the current generation. Historical Generation N
 * PRs recorded before a CURSOR REQUEUE boundary must not suppress N+1.
 *
 * @param {WipTrackedIssue} issue
 * @param {Set<number>} historicalPrNumbers
 * @param {Set<number>} currentGenerationPrNumbers
 */
export function currentGenerationLinkedPrs(issue, historicalPrNumbers, currentGenerationPrNumbers) {
  const prs = Array.isArray(issue?.linkedPrs) ? issue.linkedPrs : [];
  if (!historicalPrNumbers || historicalPrNumbers.size === 0) return prs;
  return prs.filter((pr) => {
    const n = toPositiveInt(pr?.number);
    if (!n) return true;
    if (currentGenerationPrNumbers?.has(n)) return true;
    return !historicalPrNumbers.has(n);
  });
}

/**
 * Open non-draft linked PR that is merge-ready review inventory (#976).
 * Explicit `mergeReady: false` keeps the slot (implementation still running).
 *
 * @param {WipTrackedIssue} issue
 */
export function issueHasMergeReadyLinkedPr(issue) {
  const prs = Array.isArray(issue?.linkedPrs) ? issue.linkedPrs : [];
  return prs.some((pr) => {
    const state = String(pr?.state || '').toLowerCase();
    if (state !== 'open') return false;
    if (pr?.draft === true) return false;
    if (pr?.mergeReady === false) return false;
    return (
      pr?.mergeReady === true ||
      pr?.implementationComplete === true ||
      pr?.checksPassing === true ||
      pr?.mergeReady == null
    );
  });
}

/**
 * Merge-ready / implementation-complete signals that are review inventory,
 * not execution WIP. Does not by itself decide continuation occupancy.
 *
 * @param {WipTrackedIssue} issue
 * @param {Array<{ body?: string | null }>} comments
 */
export function detectMergeReadyReviewSignals(issue, comments) {
  if (commentsShowImplementationComplete(comments)) return true;
  if (commentsShowPrOpened(comments) && commentsShowImplementationComplete(comments)) {
    return true;
  }
  return issueHasMergeReadyLinkedPr(issue);
}

export async function fetchOpenPullRequestsForWip(token, repo, fetchFn = globalThis.fetch) {
  const auth = String(token || '').trim();
  const repoName = String(repo || '').trim();
  if (!auth || !repoName || typeof fetchFn !== 'function') return [];
  const url = `https://api.github.com/repos/${repoName}/pulls?state=open&per_page=50`;
  const res = await fetchFn(url, {
    headers: {
      Authorization: `Bearer ${auth}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (Array.isArray(json) ? json : []).map((pr) => ({
    number: pr?.number,
    state: pr?.state,
    draft: Boolean(pr?.draft),
    title: pr?.title,
    body: pr?.body,
    url: pr?.html_url,
    mergeReady: !pr?.draft,
  }));
}

/**
 * Stable oldest-ready tie-break: createdAt → updatedAt → issue number.
 * @param {WipTrackedIssue} a
 * @param {WipTrackedIssue} b
 */
export function compareOldestReady(a, b) {
  const aCreated = a?.createdAt ? Date.parse(a.createdAt) : NaN;
  const bCreated = b?.createdAt ? Date.parse(b.createdAt) : NaN;
  if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
    return aCreated - bCreated;
  }
  const aUpdated = a?.updatedAt ? Date.parse(a.updatedAt) : NaN;
  const bUpdated = b?.updatedAt ? Date.parse(b.updatedAt) : NaN;
  if (Number.isFinite(aUpdated) && Number.isFinite(bUpdated) && aUpdated !== bUpdated) {
    return aUpdated - bUpdated;
  }
  return Number(a?.number || 0) - Number(b?.number || 0);
}

/**
 * Inspect one issue for verified live occupancy and safe reconcile actions.
 *
 * @param {WipTrackedIssue} issue
 */
export function inspectIssueWipState(issue) {
  const issueNumber = toPositiveInt(issue?.number) || 0;
  const labels = labelSet(issue);
  const stateRaw = String(issue?.state || 'open').trim().toLowerCase();
  const isClosed = stateRaw === 'closed';
  const comments = Array.isArray(issue?.comments) ? issue.comments : [];
  const currentGeneration = sliceCommentsAfterLatestCursorRequeue(comments);
  const allClaims = parseCursorActivationClaimsFromComments(comments);
  const requeues = parseCursorRequeuesFromComments(comments);
  const completions = parseCursorCompletionEventsFromComments(currentGeneration.comments);
  const origin = resolveCursorOriginMetadata({
    issueBody: issue?.body,
    comments,
  });
  const activatedRunId = extractDispatchActivatedRunId(comments);

  const latestRequeue = requeues[0] || null;
  const requeueGeneration = latestRequeue?.generation || 0;
  const claims =
    requeueGeneration > 0
      ? allClaims.filter((c) => Number(c.generation) >= requeueGeneration)
      : allClaims;
  const latestClaim = claims[0] || null;
  const latestUnfilteredClaim = allClaims[0] || null;
  const latestCompletion = completions[completions.length - 1] || null;

  const claimStatus = latestClaim ? String(latestClaim.status || '').toLowerCase() : '';
  const claimActive = isActiveClaimStatus(claimStatus);
  const claimTerminal = isTerminalClaimStatus(claimStatus);

  const requeueSupersedes =
    Boolean(latestRequeue) &&
    Boolean(latestUnfilteredClaim) &&
    Number(latestRequeue.generation) > Number(latestUnfilteredClaim.generation);

  const completionStatus = String(latestCompletion?.status || '').toUpperCase();
  const completionTerminal = ['FAILED', 'COMPLETED', 'STALE'].includes(completionStatus);

  const hasOperatorReview = labels.includes(LABEL_OPERATOR_REVIEW.toLowerCase());
  const hasActiveLabels = hasActiveExecutionLabels(labels);
  const paused = isExecutionPaused(labels);
  const historicalPrNumbers =
    currentGeneration.latestRequeueIndex >= 0
      ? extractPrNumbersFromComments(comments.slice(0, currentGeneration.latestRequeueIndex + 1))
      : new Set();
  const currentGenerationPrNumbers = extractPrNumbersFromComments(currentGeneration.comments);
  const currentLinkedPrs = currentGenerationLinkedPrs(
    issue,
    historicalPrNumbers,
    currentGenerationPrNumbers,
  );
  const mergeReadySignals = detectMergeReadyReviewSignals(
    { ...issue, linkedPrs: currentLinkedPrs },
    currentGeneration.comments,
  );

  const runId =
    normalizeVerifiedCursorRunId(latestClaim?.agentRunId) ||
    normalizeVerifiedCursorRunId(activatedRunId) ||
    normalizeVerifiedCursorRunId(origin.cursorRunId) ||
    normalizeVerifiedCursorRunId(origin.cursorAgentId);

  /** Current-generation implementation after CURSOR REQUEUE — occupies a slot. */
  const isContinuation =
    requeueGeneration > 0 &&
    claimActive &&
    Number(latestClaim?.generation) >= requeueGeneration &&
    Boolean(normalizeVerifiedCursorRunId(latestClaim?.agentRunId));

  const reviewInventory =
    !isContinuation &&
    (hasOperatorReview || mergeReadySignals || (completionTerminal && !requeueSupersedes));

  /** @type {WipReconcileAction[]} */
  const reconcile = [];

  const terminalNonExecution =
    isClosed ||
    reviewInventory ||
    claimTerminal ||
    (completionTerminal && !requeueSupersedes);

  if (terminalNonExecution && hasActiveLabels) {
    let reason = 'orphaned_active_labels';
    if (isClosed) reason = 'closed_with_active_execution_labels';
    else if (hasOperatorReview) reason = 'operator_review_with_active_execution_labels';
    else if (mergeReadySignals) reason = 'merge_ready_review_inventory';
    else if (claimTerminal) reason = 'terminal_claim_with_active_execution_labels';
    else if (completionTerminal) reason = 'terminal_failed_activation_with_active_execution_labels';
    reconcile.push({
      issueNumber,
      reason,
      removeLabels: [...ACTIVE_EXECUTION_LABELS],
      preserveHistory: true,
    });
  } else if (hasActiveLabels && !runId && !claimActive) {
    reconcile.push({
      issueNumber,
      reason: 'orphaned_active_labels_no_valid_activation_metadata',
      removeLabels: [...ACTIVE_EXECUTION_LABELS],
      preserveHistory: true,
    });
  } else if (hasActiveLabels && !runId && claimActive && claimStatus === 'pending') {
    // Mid claim-before-API: labels exist, claim pending, no run yet — do not
    // occupy a verified slot and do not reconcile (activation still in flight).
  } else if (hasActiveLabels && runId && (claimTerminal || completionTerminal || requeueSupersedes)) {
    reconcile.push({
      issueNumber,
      reason: 'stale_execution_labels_after_terminal_metadata',
      removeLabels: [...ACTIVE_EXECUTION_LABELS],
      preserveHistory: true,
    });
  }

  const verifiedLive =
    Boolean(runId) &&
    !isClosed &&
    !reviewInventory &&
    !claimTerminal &&
    !(completionTerminal && !requeueSupersedes) &&
    !requeueSupersedes &&
    (claimActive || Boolean(activatedRunId) || Boolean(origin.cursorRunId) || Boolean(origin.cursorAgentId));

  /** @type {VerifiedWipSlot | null} */
  let slot = null;
  if (verifiedLive && runId) {
    slot = {
      issueNumber,
      state: paused ? 'running-paused' : 'running',
      runId,
      paused,
      generation: latestClaim?.generation ?? null,
      lane: commentsIndicateTemporalSupervisedLane(currentGeneration.comments)
        ? CURSOR_WIP_LANE_TEMPORAL
        : CURSOR_WIP_LANE_ORDINARY,
    };
  }

  return {
    issueNumber,
    labels,
    isClosed,
    hasOperatorReview,
    mergeReadySignals,
    reviewInventory,
    isContinuation,
    hasActiveLabels,
    paused,
    runId,
    claim: latestClaim,
    verifiedLive: Boolean(slot),
    slot,
    reconcile,
  };
}

/**
 * Format the operator capacity packet required by WIP Control v1.
 *
 * @param {{
 *   used: number,
 *   max?: number,
 *   slots: Array<VerifiedWipSlot | null>,
 *   nextEligible: number | null,
 *   pausedIssueNumbers: number[],
 *   reconciledCount: number,
 *   reviewDecisionInventoryIssueNumbers?: number[],
 *   pilotActive?: boolean,
 *   ordinaryUsed?: number,
 *   temporalUsed?: number,
 *   productionReserveSlots?: number,
 *   temporalExtraSlots?: number,
 * }} input
 */
export function formatCursorCapacityPacket(input) {
  const max = Math.max(1, Math.floor(Number(input.max) || CURSOR_WIP_MAX_SLOTS));
  const used = Math.max(0, Math.floor(Number(input.used) || 0));
  const slots = Array.isArray(input.slots) ? input.slots : [];
  const lines = [`CURSOR CAPACITY: ${used}/${max} active`];
  for (let i = 0; i < max; i += 1) {
    const slot = slots[i] || null;
    if (slot && slot.runId && slot.issueNumber) {
      const lane =
        slot.lane === CURSOR_WIP_LANE_TEMPORAL ? ' — temporal' : '';
      lines.push(`Slot ${i + 1}: #${slot.issueNumber} — ${slot.state} — ${slot.runId}${lane}`);
    } else {
      lines.push(`Slot ${i + 1}: FREE`);
    }
  }
  if (input.pilotActive) {
    const ordinaryUsed = Math.max(0, Math.floor(Number(input.ordinaryUsed) || 0));
    const temporalUsed = Math.max(0, Math.floor(Number(input.temporalUsed) || 0));
    const productionReserve = Math.max(
      1,
      Math.floor(Number(input.productionReserveSlots) || CURSOR_WIP_PRODUCTION_RESERVE_SLOTS),
    );
    const temporalExtra = Math.max(
      0,
      Math.floor(Number(input.temporalExtraSlots) || CURSOR_WIP_TEMPORAL_EXTRA_SLOTS),
    );
    lines.push(`Production reserve: ${ordinaryUsed}/${productionReserve}`);
    lines.push(`Temporal extra: ${temporalUsed}/${temporalExtra}`);
  }
  lines.push(
    `Next eligible: ${input.nextEligible != null ? `#${input.nextEligible}` : 'NONE'}`,
  );
  const paused = Array.isArray(input.pausedIssueNumbers) ? input.pausedIssueNumbers.filter(Boolean) : [];
  lines.push(
    `Paused: ${paused.length ? paused.map((n) => `#${n}`).join(', ') : 'NONE'}`,
  );
  lines.push(`Reconciled stale states: ${Math.max(0, Math.floor(Number(input.reconciledCount) || 0))}`);
  const reviewInventory = [
    ...new Set(
      (Array.isArray(input.reviewDecisionInventoryIssueNumbers)
        ? input.reviewDecisionInventoryIssueNumbers
        : []
      )
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ].sort((a, b) => a - b);
  lines.push(
    `Review/decision inventory: ${
      reviewInventory.length ? reviewInventory.map((n) => `#${n}`).join(', ') : 'NONE'
    }`,
  );
  return `${lines.join('\n')}\n`;
}

/**
 * Evaluate verified Cursor WIP capacity + reconciliation plan.
 *
 * Open PR count is accepted for API compatibility but never affects capacity.
 * When the Temporal pilot is active, `availableSlots` stays lane-aware, but
 * extras are zero: ordinary and Temporal-supervised wakes share the single
 * implementation lane. Unsetting the pilot variable still returns max=1.
 *
 * @param {{
 *   trackedIssues?: WipTrackedIssue[],
 *   readyIssues?: WipTrackedIssue[],
 *   maxSlots?: number,
 *   openPrCount?: number,
 *   preferIssueNumbers?: number[],
 *   pilotActive?: boolean,
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined> | null,
 *   activationLane?: string | null,
 *   wakeReason?: string | null,
 * }} input
 */
export function evaluateCursorWipCapacity(input = {}) {
  const capacityState = resolveTemporalPilotCapacityState({
    pilotActive: input.pilotActive,
    env: input.env,
  });
  const maxSlots =
    input.maxSlots != null && Number.isFinite(Number(input.maxSlots)) && Number(input.maxSlots) > 0
      ? Math.min(CURSOR_WIP_MAX_SLOTS, Math.max(1, Math.floor(Number(input.maxSlots))))
      : capacityState.maxSlots;
  const pilotActive = capacityState.pilotActive && maxSlots >= CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS;
  const productionReserveSlots = CURSOR_WIP_PRODUCTION_RESERVE_SLOTS;
  const temporalExtraSlots = pilotActive ? CURSOR_WIP_TEMPORAL_EXTRA_SLOTS : 0;
  const activationLane = resolveCursorWipActivationLane(
    input.activationLane || input.wakeReason,
  );
  // Explicitly ignored — open PRs must not consume Cursor WIP.
  void input.openPrCount;

  const tracked = Array.isArray(input.trackedIssues) ? input.trackedIssues : [];
  const ready = Array.isArray(input.readyIssues) ? input.readyIssues : [];

  /** @type {WipReconcileAction[]} */
  const reconcileActions = [];
  /** @type {VerifiedWipSlot[]} */
  const verified = [];
  /** @type {number[]} */
  const pausedIssueNumbers = [];
  /** @type {number[]} */
  const reviewDecisionInventoryIssueNumbers = [];

  const seen = new Set();
  for (const issue of [...tracked, ...ready]) {
    const n = toPositiveInt(issue?.number);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    const inspected = inspectIssueWipState(issue);
    if (inspected.paused) pausedIssueNumbers.push(n);
    if (inspected.reviewInventory) reviewDecisionInventoryIssueNumbers.push(n);
    for (const action of inspected.reconcile) reconcileActions.push(action);
    if (inspected.slot) verified.push(inspected.slot);
  }

  // Deterministic slot order: lowest issue number first (stable).
  verified.sort((a, b) => a.issueNumber - b.issueNumber);
  const seenRunIds = new Set();
  const uniqueVerified = [];
  for (const slot of verified) {
    const id = normalizeVerifiedCursorRunId(slot.runId);
    const key = id ? id.toLowerCase() : '';
    if (key && seenRunIds.has(key)) continue;
    if (key) seenRunIds.add(key);
    uniqueVerified.push(slot);
  }
  const used = uniqueVerified.length;
  const occupied = uniqueVerified.slice(0, Math.max(maxSlots, used));

  let ordinaryUsed = 0;
  let temporalUsed = 0;
  for (const slot of uniqueVerified) {
    if (slot.lane === CURSOR_WIP_LANE_TEMPORAL) temporalUsed += 1;
    else ordinaryUsed += 1;
  }

  const ordinaryAvailable = pilotActive
    ? Math.max(0, Math.min(productionReserveSlots - ordinaryUsed, maxSlots - used))
    : Math.max(0, maxSlots - used);
  const temporalAvailable = pilotActive
    ? Math.max(0, Math.min(temporalExtraSlots - temporalUsed, maxSlots - used))
    : 0;
  const availableSlots = !pilotActive
    ? Math.max(0, maxSlots - used)
    : activationLane === CURSOR_WIP_LANE_TEMPORAL
      ? temporalAvailable
      : ordinaryAvailable;

  const prefer = new Set((input.preferIssueNumbers || []).map((n) => Number(n)));
  const occupiedNumbers = new Set(uniqueVerified.map((s) => s.issueNumber));

  const eligibleReady = [...ready]
    .filter((issue) => {
      const labels = labelSet(issue);
      if (!labels.includes(LABEL_READY.toLowerCase())) return false;
      if (isExecutionPaused(labels)) return false;
      if (labels.includes(LABEL_OPERATOR_REVIEW.toLowerCase())) return false;
      if (String(issue?.state || 'open').toLowerCase() === 'closed') return false;
      if (occupiedNumbers.has(Number(issue.number))) return false;
      return true;
    })
    .sort((a, b) => {
      const preferA = prefer.has(Number(a.number)) ? 0 : 1;
      const preferB = prefer.has(Number(b.number)) ? 0 : 1;
      if (preferA !== preferB) return preferA - preferB;
      const rankDiff = cursorReadyPriorityRank(a) - cursorReadyPriorityRank(b);
      if (rankDiff !== 0) return rankDiff;
      return compareOldestReady(a, b);
    });

  const nextEligible = eligibleReady.length ? Number(eligibleReady[0].number) : null;

  /** @type {Array<VerifiedWipSlot | null>} */
  const slots = [];
  for (let i = 0; i < maxSlots; i += 1) {
    slots.push(occupied[i] || null);
  }

  const globalCapacityFull = used >= maxSlots;
  const capacityFull = availableSlots <= 0;
  if (globalCapacityFull) {
    const named = uniqueVerified.filter((s) => normalizeVerifiedCursorRunId(s.runId));
    if (named.length < maxSlots) {
      throw new Error(
        'WIP capacity-full conclusion invalid: occupied slots must name verified active run IDs',
      );
    }
  }

  const reviewInventoryNumbers = [...new Set(reviewDecisionInventoryIssueNumbers)].sort(
    (a, b) => a - b,
  );

  const packet = formatCursorCapacityPacket({
    used,
    max: maxSlots,
    slots,
    nextEligible,
    pausedIssueNumbers: [...new Set(pausedIssueNumbers)].sort((a, b) => a - b),
    reconciledCount: reconcileActions.length,
    reviewDecisionInventoryIssueNumbers: reviewInventoryNumbers,
    pilotActive,
    ordinaryUsed,
    temporalUsed,
    productionReserveSlots,
    temporalExtraSlots,
  });

  return {
    schema: CURSOR_WIP_CONTROL_SCHEMA,
    maxSlots,
    used,
    availableSlots,
    capacityFull,
    globalCapacityFull,
    pilotActive,
    activationLane,
    productionReserveSlots,
    temporalExtraSlots,
    ordinaryUsed,
    temporalUsed,
    ordinaryAvailable,
    temporalAvailable,
    slots: occupied.slice(0, maxSlots),
    slotBoard: slots,
    verifiedActiveIssueNumbers: uniqueVerified.map((s) => s.issueNumber),
    nextEligible,
    pausedIssueNumbers: [...new Set(pausedIssueNumbers)].sort((a, b) => a - b),
    reviewDecisionInventoryIssueNumbers: reviewInventoryNumbers,
    reconcileActions,
    reconciledCount: reconcileActions.length,
    capacityPacket: packet,
    openPrCountIgnored: true,
  };
}

/**
 * Labels to strip when releasing a Cursor execution slot (terminal transition).
 */
export function activeExecutionLabelsToRelease() {
  return [...ACTIVE_EXECUTION_LABELS];
}
