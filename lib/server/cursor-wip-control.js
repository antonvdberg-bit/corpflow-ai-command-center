/**
 * Cursor WIP Control v1 — verified active-run capacity (not label counting).
 *
 * Global Cursor WIP = 2 slots. A slot is occupied only when current activation
 * metadata proves a live Cursor run/generation. Lifecycle labels are display
 * state; stale/orphaned labels never consume capacity.
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 * @see GitHub issue #862
 */

import {
  parseCursorActivationClaimsFromComments,
  parseCursorRequeuesFromComments,
} from './cursor-activation-claim.js';
import {
  extractCursorAgentIdFromText,
  extractCursorRunIdFromText,
} from './cursor-cloud-agent-client.js';
import { resolveCursorOriginMetadata } from './cursor-origin-metadata.js';

export const CURSOR_WIP_CONTROL_SCHEMA = 'corpflow.cursor_wip_control.v1';
export const CURSOR_WIP_MAX_SLOTS = 2;

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
 * }} WipTrackedIssue
 */

/**
 * @typedef {{
 *   issueNumber: number,
 *   state: string,
 *   runId: string,
 *   paused: boolean,
 *   generation: number | null,
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
 * @param {Array<{ body?: string | null }>} comments
 * @returns {string | null}
 */
export function extractDispatchActivatedRunId(comments) {
  for (const c of [...(Array.isArray(comments) ? comments : [])].reverse()) {
    const body = String(c?.body || '');
    if (!/CURSOR DISPATCH ACTIVATED/i.test(body)) continue;
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
  const claims = parseCursorActivationClaimsFromComments(comments);
  const requeues = parseCursorRequeuesFromComments(comments);
  const completions = parseCursorCompletionEventsFromComments(comments);
  const origin = resolveCursorOriginMetadata({
    issueBody: issue?.body,
    comments,
  });
  const activatedRunId = extractDispatchActivatedRunId(comments);

  const latestClaim = claims[0] || null;
  const latestRequeue = requeues[0] || null;
  const latestCompletion = completions[completions.length - 1] || null;

  const claimStatus = latestClaim ? String(latestClaim.status || '').toLowerCase() : '';
  const claimActive = claimStatus === 'pending' || claimStatus === 'activated';
  const claimTerminal = claimStatus === 'released' || claimStatus === 'completed';

  const requeueSupersedes =
    Boolean(latestRequeue) &&
    Boolean(latestClaim) &&
    Number(latestRequeue.generation) > Number(latestClaim.generation);

  const completionStatus = String(latestCompletion?.status || '').toUpperCase();
  const completionTerminal = ['FAILED', 'COMPLETED', 'STALE'].includes(completionStatus);

  const hasOperatorReview = labels.includes(LABEL_OPERATOR_REVIEW.toLowerCase());
  const hasActiveLabels = hasActiveExecutionLabels(labels);
  const paused = isExecutionPaused(labels);

  const runId =
    normalizeVerifiedCursorRunId(latestClaim?.agentRunId) ||
    normalizeVerifiedCursorRunId(activatedRunId) ||
    normalizeVerifiedCursorRunId(origin.cursorRunId) ||
    normalizeVerifiedCursorRunId(origin.cursorAgentId);

  /** @type {WipReconcileAction[]} */
  const reconcile = [];

  const terminalNonExecution =
    isClosed || hasOperatorReview || claimTerminal || (completionTerminal && !requeueSupersedes);

  if (terminalNonExecution && hasActiveLabels) {
    let reason = 'orphaned_active_labels';
    if (isClosed) reason = 'closed_with_active_execution_labels';
    else if (hasOperatorReview) reason = 'operator_review_with_active_execution_labels';
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
    !hasOperatorReview &&
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
    };
  }

  return {
    issueNumber,
    labels,
    isClosed,
    hasOperatorReview,
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
      lines.push(`Slot ${i + 1}: #${slot.issueNumber} — ${slot.state} — ${slot.runId}`);
    } else {
      lines.push(`Slot ${i + 1}: FREE`);
    }
  }
  lines.push(
    `Next eligible: ${input.nextEligible != null ? `#${input.nextEligible}` : 'NONE'}`,
  );
  const paused = Array.isArray(input.pausedIssueNumbers) ? input.pausedIssueNumbers.filter(Boolean) : [];
  lines.push(
    `Paused: ${paused.length ? paused.map((n) => `#${n}`).join(', ') : 'NONE'}`,
  );
  lines.push(`Reconciled stale states: ${Math.max(0, Math.floor(Number(input.reconciledCount) || 0))}`);
  return `${lines.join('\n')}\n`;
}

/**
 * Evaluate verified Cursor WIP capacity + reconciliation plan.
 *
 * Open PR count is accepted for API compatibility but never affects capacity.
 *
 * @param {{
 *   trackedIssues?: WipTrackedIssue[],
 *   readyIssues?: WipTrackedIssue[],
 *   maxSlots?: number,
 *   openPrCount?: number,
 *   preferIssueNumbers?: number[],
 * }} input
 */
export function evaluateCursorWipCapacity(input = {}) {
  const maxSlots = Math.max(1, Math.floor(Number(input.maxSlots) || CURSOR_WIP_MAX_SLOTS));
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

  const seen = new Set();
  for (const issue of [...tracked, ...ready]) {
    const n = toPositiveInt(issue?.number);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    const inspected = inspectIssueWipState(issue);
    if (inspected.paused) pausedIssueNumbers.push(n);
    for (const action of inspected.reconcile) reconcileActions.push(action);
    if (inspected.slot) verified.push(inspected.slot);
  }

  // Deterministic slot order: lowest issue number first (stable).
  verified.sort((a, b) => a.issueNumber - b.issueNumber);
  const occupied = verified.slice(0, maxSlots);
  const used = occupied.length;

  const prefer = new Set((input.preferIssueNumbers || []).map((n) => Number(n)));
  const occupiedNumbers = new Set(occupied.map((s) => s.issueNumber));

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

  const capacityFull = used >= maxSlots;
  if (capacityFull) {
    const named = occupied.filter((s) => normalizeVerifiedCursorRunId(s.runId));
    if (named.length < maxSlots) {
      throw new Error(
        'WIP capacity-full conclusion invalid: occupied slots must name verified active run IDs',
      );
    }
  }

  const packet = formatCursorCapacityPacket({
    used,
    max: maxSlots,
    slots,
    nextEligible,
    pausedIssueNumbers: [...new Set(pausedIssueNumbers)].sort((a, b) => a - b),
    reconciledCount: reconcileActions.length,
  });

  return {
    schema: CURSOR_WIP_CONTROL_SCHEMA,
    maxSlots,
    used,
    availableSlots: Math.max(0, maxSlots - used),
    capacityFull,
    slots: occupied,
    slotBoard: slots,
    verifiedActiveIssueNumbers: occupied.map((s) => s.issueNumber),
    nextEligible,
    pausedIssueNumbers: [...new Set(pausedIssueNumbers)].sort((a, b) => a - b),
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
