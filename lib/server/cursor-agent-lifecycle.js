/**
 * Cursor agent lifecycle status runner — poll → normalize → complete/fail/stale.
 *
 * Fills the post-activation gap for issue #661: activate already exists;
 * this module polls `getCursorCloudAgent`, normalizes PENDING|RUNNING|COMPLETED|
 * FAILED|STALE, emits a durable completion packet once, and optionally sends
 * one bounded follow-up on STALE.
 *
 * Durable state = GitHub issue comments (same pattern as cursor origin metadata).
 * No second DB. OpenHands is NOT used on this hot path.
 *
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md (when present)
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */

import {
  createCursorAgentFollowUpRun,
  extractCursorGitDetails,
  getCursorCloudAgent,
} from './cursor-cloud-agent-client.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
  parseCursorOriginMetadataFromText,
  resolveCursorOriginMetadata,
} from './cursor-origin-metadata.js';
import {
  buildOperatorDecisionPacket,
  detectCompletionSignals,
  formatOperatorDecisionPacketMarkdown,
} from './operator-review-handoff.js';

export const CURSOR_LIFECYCLE_SCHEMA = 'corpflow.cursor_agent_lifecycle.v1';
export const CURSOR_LIFECYCLE_STATE_MARKER = 'corpflow.cursor_lifecycle_state.v1';
export const CURSOR_COMPLETION_EVENT_SCHEMA = 'corpflow.cursor_completion_event.v1';
export const CURSOR_COMPLETION_EVENT_MARKER = 'corpflow.cursor_completion_event.v1';

/** Normalized lifecycle phases (operator contract). */
export const LIFECYCLE_PHASES = Object.freeze([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'STALE',
]);

/** Default minutes without PR / without progress before STALE. */
export const DEFAULT_STALE_AFTER_MINUTES = 10;

/** Max automatic stale follow-ups per agent (bounded). */
export const MAX_STALE_FOLLOWUPS = 1;

/**
 * @typedef {'PENDING'|'RUNNING'|'COMPLETED'|'FAILED'|'STALE'} LifecyclePhase
 */

/**
 * @typedef {{
 *   schema: string,
 *   cursorAgentId: string,
 *   cursorRunId: string | null,
 *   sourceIssue: number | null,
 *   phase: LifecyclePhase,
 *   branch: string | null,
 *   prNumber: number | null,
 *   prUrl: string | null,
 *   headSha: string | null,
 *   lastPolledAt: string | null,
 *   startedAt: string | null,
 *   completedAt: string | null,
 *   completionFingerprint: string | null,
 *   completionEventEmitted: boolean,
 *   staleFollowUpSent: boolean,
 *   lastError: string | null,
 *   rawStatus: string | null,
 * }} CursorLifecycleState
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
 * Map Cursor Cloud API agent/run status → normalized lifecycle phase.
 *
 * @param {Record<string, unknown> | null | undefined} apiResult
 * @param {{
 *   startedAt?: string | null,
 *   now?: Date,
 *   staleAfterMinutes?: number,
 *   hasPr?: boolean,
 * }} [opts]
 * @returns {{ phase: LifecyclePhase, rawStatus: string | null, recoverable: boolean | null }}
 */
export function normalizeCursorAgentLifecycleStatus(apiResult, opts = {}) {
  const result = apiResult && typeof apiResult === 'object' ? apiResult : {};
  const agent = result.agent && typeof result.agent === 'object' ? result.agent : result;
  const run = result.run && typeof result.run === 'object' ? result.run : {};
  const raw =
    emptyToNull(run.status) ||
    emptyToNull(agent.status) ||
    emptyToNull(result.status) ||
    emptyToNull(agent.latestRunStatus) ||
    null;
  const upper = String(raw || '').toUpperCase();

  const git = extractCursorGitDetails(result);
  const hasPr = opts.hasPr === true || Boolean(git.prUrl || git.prNumber);

  // Terminal failure shapes
  if (
    /^(ERROR|FAILED|FAILURE|CANCELLED|CANCELED|EXPIRED)$/.test(upper) ||
    /FAIL|ERROR|CANCEL|EXPIRED/.test(upper)
  ) {
    const recoverable = /RATE.?LIMIT|TIMEOUT|NETWORK|TEMPORARY|RETRY|429|503/.test(upper);
    return { phase: 'FAILED', rawStatus: raw, recoverable };
  }

  // Explicit finished / completed
  if (/^(FINISHED|COMPLETED|COMPLETE|DONE|SUCCEEDED|SUCCESS)$/.test(upper) || /COMPLETE|FINISHED|SUCCESS/.test(upper)) {
    return { phase: 'COMPLETED', rawStatus: raw, recoverable: null };
  }

  // Creating / queued
  if (/^(CREATING|QUEUED|PENDING|STARTING|INITIALIZING|WAITING)$/.test(upper) || /CREAT|QUEUE|PEND|START|WAIT|INIT/.test(upper)) {
    return maybeStale('PENDING', raw, opts, hasPr);
  }

  // Active work
  if (/^(RUNNING|WORKING|IN_PROGRESS|ACTIVE|THINKING|EXECUTING)$/.test(upper) || /RUN|WORK|ACTIVE|PROGRESS|THINK|EXEC/.test(upper)) {
    return maybeStale('RUNNING', raw, opts, hasPr);
  }

  // Unknown raw — if PR exists treat as COMPLETED; else RUNNING until stale
  if (hasPr) {
    return { phase: 'COMPLETED', rawStatus: raw || 'unknown_with_pr', recoverable: null };
  }
  if (!raw) {
    return maybeStale('PENDING', raw, opts, hasPr);
  }
  return maybeStale('RUNNING', raw, opts, hasPr);
}

/**
 * @param {LifecyclePhase} base
 * @param {string | null} raw
 * @param {{ startedAt?: string | null, now?: Date, staleAfterMinutes?: number }} opts
 * @param {boolean} hasPr
 */
function maybeStale(base, raw, opts, hasPr) {
  if (hasPr) return { phase: /** @type {LifecyclePhase} */ (base === 'PENDING' ? 'RUNNING' : base), rawStatus: raw, recoverable: null };
  const startedAt = opts.startedAt;
  const now = opts.now || new Date();
  const mins = opts.staleAfterMinutes ?? DEFAULT_STALE_AFTER_MINUTES;
  if (startedAt) {
    const startMs = new Date(startedAt).getTime();
    if (Number.isFinite(startMs) && now.getTime() - startMs >= mins * 60 * 1000) {
      return { phase: 'STALE', rawStatus: raw, recoverable: true };
    }
  }
  return { phase: base, rawStatus: raw, recoverable: null };
}

/**
 * @param {Partial<CursorLifecycleState>} input
 * @returns {CursorLifecycleState}
 */
export function buildCursorLifecycleState(input = {}) {
  const agentId = emptyToNull(input.cursorAgentId);
  if (!agentId) {
    throw new Error('buildCursorLifecycleState requires cursorAgentId');
  }
  return {
    schema: CURSOR_LIFECYCLE_SCHEMA,
    cursorAgentId: agentId,
    cursorRunId: emptyToNull(input.cursorRunId),
    sourceIssue: toPositiveInt(input.sourceIssue),
    phase: /** @type {LifecyclePhase} */ (LIFECYCLE_PHASES.includes(/** @type {any} */ (input.phase)) ? input.phase : 'PENDING'),
    branch: emptyToNull(input.branch),
    prNumber: toPositiveInt(input.prNumber),
    prUrl: emptyToNull(input.prUrl),
    headSha: emptyToNull(input.headSha),
    lastPolledAt: emptyToNull(input.lastPolledAt),
    startedAt: emptyToNull(input.startedAt),
    completedAt: emptyToNull(input.completedAt),
    completionFingerprint: emptyToNull(input.completionFingerprint),
    completionEventEmitted: Boolean(input.completionEventEmitted),
    staleFollowUpSent: Boolean(input.staleFollowUpSent),
    lastError: emptyToNull(input.lastError),
    rawStatus: emptyToNull(input.rawStatus),
  };
}

/**
 * @param {CursorLifecycleState} state
 */
export function formatCursorLifecycleStateComment(state) {
  const s = buildCursorLifecycleState(state);
  const json = JSON.stringify(s);
  return `CURSOR LIFECYCLE STATE

Agent: ${s.cursorAgentId}
Phase: ${s.phase}
Source issue: ${s.sourceIssue != null ? `#${s.sourceIssue}` : 'n/a'}
Run: ${s.cursorRunId || 'n/a'}
Branch: ${s.branch || 'n/a'}
PR: ${s.prNumber != null ? `#${s.prNumber}` : 'n/a'}
Completion emitted: ${s.completionEventEmitted ? 'yes' : 'no'}
Fingerprint: ${s.completionFingerprint || 'n/a'}
Stale follow-up sent: ${s.staleFollowUpSent ? 'yes' : 'no'}

<!-- ${CURSOR_LIFECYCLE_STATE_MARKER} ${json} -->
`;
}

/**
 * @param {string} body
 * @returns {CursorLifecycleState | null}
 */
export function parseCursorLifecycleStateFromText(body) {
  const text = String(body || '');
  const marker = text.match(
    new RegExp(`<!--\\s*${CURSOR_LIFECYCLE_STATE_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!marker) return null;
  try {
    return buildCursorLifecycleState(JSON.parse(marker[1]));
  } catch {
    return null;
  }
}

/**
 * Latest lifecycle state from issue comments (newest first).
 *
 * @param {Array<{ body?: string | null }>} comments
 * @param {string} [agentId]
 */
export function findLatestLifecycleState(comments, agentId) {
  const list = Array.isArray(comments) ? [...comments].reverse() : [];
  for (const c of list) {
    const parsed = parseCursorLifecycleStateFromText(c?.body || '');
    if (!parsed) continue;
    if (agentId && parsed.cursorAgentId !== agentId) continue;
    return parsed;
  }
  return null;
}

/**
 * Completion fingerprint for dedupe (second unchanged poll must not re-emit).
 *
 * @param {{
 *   cursorAgentId?: string | null,
 *   sourceIssue?: number | null,
 *   phase?: string | null,
 *   prNumber?: number | null,
 *   headSha?: string | null,
 *   branch?: string | null,
 * }} input
 */
export function buildCompletionFingerprint(input = {}) {
  return [
    'cursor_lifecycle',
    emptyToNull(input.cursorAgentId) || 'no-agent',
    toPositiveInt(input.sourceIssue) || 'no-issue',
    emptyToNull(input.phase) || 'no-phase',
    toPositiveInt(input.prNumber) || 'no-pr',
    emptyToNull(input.headSha) || 'no-sha',
    emptyToNull(input.branch) || 'no-branch',
  ].join('|');
}

/**
 * @param {string | null | undefined} previousFingerprint
 * @param {string} nextFingerprint
 * @param {boolean} alreadyEmitted
 */
export function shouldEmitCompletionEvent(previousFingerprint, nextFingerprint, alreadyEmitted) {
  if (!nextFingerprint) return false;
  if (alreadyEmitted && previousFingerprint === nextFingerprint) return false;
  if (alreadyEmitted && previousFingerprint && previousFingerprint === nextFingerprint) return false;
  if (alreadyEmitted) return false;
  return true;
}

/**
 * Canonical completion / exception event for GitHub durable state → n8n reuse.
 *
 * @param {{
 *   sourceIssue?: number | null,
 *   executor?: string,
 *   cursorAgentId?: string | null,
 *   cursorRunId?: string | null,
 *   status?: LifecyclePhase | string,
 *   branch?: string | null,
 *   prNumber?: number | null,
 *   prUrl?: string | null,
 *   headSha?: string | null,
 *   ciResult?: string | null,
 *   whatMoved?: string | null,
 *   blocker?: string | null,
 *   nextAction?: string | null,
 *   antonRequired?: boolean,
 * }} input
 */
export function buildCursorCompletionEvent(input = {}) {
  const status = emptyToNull(input.status) || 'UNKNOWN';
  const antonRequired = Boolean(input.antonRequired);
  return {
    schema: CURSOR_COMPLETION_EVENT_SCHEMA,
    version: 1,
    source_issue: toPositiveInt(input.sourceIssue),
    executor: emptyToNull(input.executor) || 'cursor',
    agent_run_id: emptyToNull(input.cursorAgentId) || emptyToNull(input.cursorRunId),
    cursor_agent_id: emptyToNull(input.cursorAgentId),
    cursor_run_id: emptyToNull(input.cursorRunId),
    status,
    branch: emptyToNull(input.branch),
    pr: toPositiveInt(input.prNumber),
    pr_url: emptyToNull(input.prUrl),
    sha: emptyToNull(input.headSha),
    ci_check_result: emptyToNull(input.ciResult) || 'unknown',
    what_moved: emptyToNull(input.whatMoved),
    blocker: emptyToNull(input.blocker),
    next_action: emptyToNull(input.nextAction),
    anton_required: antonRequired,
    notify: antonRequired || status === 'FAILED' || status === 'STALE',
    fingerprint: buildCompletionFingerprint({
      cursorAgentId: input.cursorAgentId,
      sourceIssue: input.sourceIssue,
      phase: status,
      prNumber: input.prNumber,
      headSha: input.headSha,
      branch: input.branch,
    }),
  };
}

/**
 * @param {ReturnType<typeof buildCursorCompletionEvent>} event
 */
export function formatCursorCompletionEventComment(event) {
  const e = event;
  const json = JSON.stringify(e);
  return `CURSOR COMPLETION EVENT

Source issue: ${e.source_issue != null ? `#${e.source_issue}` : 'n/a'}
Executor: ${e.executor}
Agent/run ID: ${e.agent_run_id || 'n/a'}
Status: ${e.status}
Branch: ${e.branch || 'n/a'}
PR: ${e.pr != null ? `#${e.pr}` : 'n/a'} ${e.pr_url || ''}
SHA: ${e.sha || 'n/a'}
CI/check result: ${e.ci_check_result}
What moved: ${e.what_moved || 'n/a'}
Blocker: ${e.blocker || 'none'}
Next action: ${e.next_action || 'n/a'}
Anton required: ${e.anton_required ? 'YES' : 'NO'}

<!-- ${CURSOR_COMPLETION_EVENT_MARKER} ${json} -->
`;
}

/**
 * Classify FAILED for requeue vs genuine blocker.
 *
 * @param {{ rawStatus?: string | null, errorMessage?: string | null, recoverable?: boolean | null }} input
 */
export function classifyCursorFailure(input = {}) {
  const blob = `${input.rawStatus || ''} ${input.errorMessage || ''}`.toUpperCase();
  if (input.recoverable === true) {
    return { kind: 'recoverable', requeue: true, antonRequired: false, reason: 'Transient Cursor/API failure' };
  }
  if (/RATE.?LIMIT|429|TIMEOUT|NETWORK|TEMPORARY|ECONNRESET|503|502/.test(blob)) {
    return { kind: 'recoverable', requeue: true, antonRequired: false, reason: 'Transient rate/network failure' };
  }
  if (/AUTH|401|403|FORBIDDEN|INVALID.?KEY|PAYMENT|QUOTA/.test(blob)) {
    return { kind: 'blocker', requeue: false, antonRequired: true, reason: 'Auth/quota blocker — Anton required' };
  }
  return { kind: 'blocker', requeue: false, antonRequired: true, reason: 'Cursor agent failed — operator review' };
}

/**
 * Deterministic stale follow-up (no LLM).
 *
 * @param {{ sourceIssue?: number | null, branch?: string | null }} ctx
 */
export function buildDeterministicStaleFollowUpPrompt(ctx = {}) {
  const issue = toPositiveInt(ctx.sourceIssue);
  return [
    'You appear stalled. Continue the approved synthetic/internal work packet only.',
    issue != null ? `Source issue: #${issue}.` : null,
    'If the change is done: ensure a PR exists (autoCreatePR), link the issue, and stop.',
    'Do not expand scope. Do not merge. Do not change secrets or production.',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * @param {{
 *   apiKey: string,
 *   agentId: string,
 *   sourceIssue?: number | null,
 *   priorState?: CursorLifecycleState | null,
 *   startedAt?: string | null,
 *   staleAfterMinutes?: number,
 *   now?: Date,
 *   fetch?: typeof fetch,
 *   github?: {
 *     listIssueComments?: (issue: number) => Promise<Array<{ body?: string }>>,
 *     createIssueComment?: (issue: number, body: string) => Promise<unknown>,
 *     findPrForBranch?: (branch: string) => Promise<{ number: number, url: string, headSha?: string | null, branch?: string | null } | null>,
 *     findPrForIssue?: (issue: number) => Promise<{ number: number, url: string, headSha?: string | null, branch?: string | null } | null>,
 *     getPrChecks?: (prNumber: number) => Promise<{ conclusion: string | null, summary: string }>,
 *     addIssueLabels?: (issue: number, labels: string[]) => Promise<unknown>,
 *   },
 *   allowStaleFollowUp?: boolean,
 * }} input
 */
export async function runCursorAgentLifecycleTick(input) {
  const agentId = emptyToNull(input.agentId);
  if (!agentId) throw new Error('runCursorAgentLifecycleTick requires agentId');
  const now = input.now || new Date();
  const nowIso = now.toISOString();
  const prior =
    input.priorState ||
    buildCursorLifecycleState({
      cursorAgentId: agentId,
      sourceIssue: input.sourceIssue,
      phase: 'PENDING',
      startedAt: input.startedAt || nowIso,
    });

  /** @type {Record<string, unknown>} */
  let apiResult;
  try {
    apiResult = /** @type {Record<string, unknown>} */ (
      await getCursorCloudAgent(input.apiKey, agentId, { fetch: input.fetch })
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const classification = classifyCursorFailure({ errorMessage: msg });
    const next = buildCursorLifecycleState({
      ...prior,
      phase: 'FAILED',
      lastPolledAt: nowIso,
      lastError: msg.slice(0, 500),
      rawStatus: 'API_ERROR',
    });
    return {
      phase: /** @type {LifecyclePhase} */ ('FAILED'),
      state: next,
      emittedCompletion: false,
      silent: false,
      followUpSent: false,
      classification,
      event: null,
      reviewPacket: null,
      actions: [`poll_failed:${classification.kind}`],
    };
  }

  const git = extractCursorGitDetails(apiResult);
  const startedAt = prior.startedAt || input.startedAt || nowIso;
  /** @type {string[]} */
  const actions = [];
  let prNumber = toPositiveInt(git.prNumber) || prior.prNumber;
  let prUrl = emptyToNull(git.prUrl) || prior.prUrl;
  let branch = emptyToNull(git.branch) || prior.branch;
  let headSha = prior.headSha;

  // Cursor may stay ACTIVE after autoCreatePR — discover PR from GitHub early.
  const sourceIssueEarly = toPositiveInt(input.sourceIssue) || prior.sourceIssue;
  if (!prNumber && sourceIssueEarly && input.github?.findPrForIssue) {
    const foundByIssue = await input.github.findPrForIssue(sourceIssueEarly);
    if (foundByIssue) {
      prNumber = foundByIssue.number;
      prUrl = foundByIssue.url;
      headSha = emptyToNull(foundByIssue.headSha) || headSha;
      branch = emptyToNull(foundByIssue.branch) || branch;
      actions.push(`pr_discovered_by_issue:#${prNumber}`);
    }
  }
  if (!prNumber && branch && input.github?.findPrForBranch) {
    const found = await input.github.findPrForBranch(branch);
    if (found) {
      prNumber = found.number;
      prUrl = found.url;
      headSha = emptyToNull(found.headSha) || headSha;
      actions.push(`pr_discovered:#${prNumber}`);
    }
  }

  const normalized = normalizeCursorAgentLifecycleStatus(apiResult, {
    startedAt,
    now,
    staleAfterMinutes: input.staleAfterMinutes ?? DEFAULT_STALE_AFTER_MINUTES,
    hasPr: Boolean(prUrl || prNumber),
  });

  let phase = normalized.phase;
  // If a PR already exists for this work packet, treat as COMPLETED even while agent is ACTIVE.
  if ((phase === 'RUNNING' || phase === 'PENDING' || phase === 'STALE') && (prNumber || prUrl)) {
    phase = 'COMPLETED';
    actions.push('completed_via_pr_presence');
  }
  /** @type {string | null} */
  let ciResult = null;
  actions.push(`normalized:${phase}`);

  // RUNNING → silent
  if (phase === 'RUNNING' || phase === 'PENDING') {
    const next = buildCursorLifecycleState({
      ...prior,
      cursorRunId: git.runId || prior.cursorRunId,
      sourceIssue: toPositiveInt(input.sourceIssue) || prior.sourceIssue,
      phase,
      branch,
      prNumber,
      prUrl,
      lastPolledAt: nowIso,
      startedAt,
      rawStatus: normalized.rawStatus,
      lastError: null,
    });
    return {
      phase,
      state: next,
      emittedCompletion: false,
      silent: true,
      followUpSent: false,
      classification: null,
      event: null,
      reviewPacket: null,
      actions,
    };
  }

  // STALE → one bounded follow-up
  if (phase === 'STALE') {
    let followUpSent = false;
    if (input.allowStaleFollowUp !== false && !prior.staleFollowUpSent) {
      try {
        await createCursorAgentFollowUpRun(
          input.apiKey,
          agentId,
          {
            text: buildDeterministicStaleFollowUpPrompt({
              sourceIssue: toPositiveInt(input.sourceIssue) || prior.sourceIssue,
              branch,
            }),
            mode: 'agent',
          },
          { fetch: input.fetch },
        );
        followUpSent = true;
        actions.push('stale_followup_sent');
      } catch (err) {
        actions.push(`stale_followup_failed:${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      actions.push('stale_followup_skipped');
    }
    const next = buildCursorLifecycleState({
      ...prior,
      phase: 'STALE',
      cursorRunId: git.runId || prior.cursorRunId,
      branch,
      prNumber,
      prUrl,
      lastPolledAt: nowIso,
      startedAt,
      staleFollowUpSent: prior.staleFollowUpSent || followUpSent,
      rawStatus: normalized.rawStatus,
    });
    const event = buildCursorCompletionEvent({
      sourceIssue: next.sourceIssue,
      cursorAgentId: agentId,
      cursorRunId: next.cursorRunId,
      status: 'STALE',
      branch,
      prNumber,
      prUrl,
      whatMoved: 'none — agent stale',
      blocker: followUpSent
        ? 'Stale — automatic follow-up sent; await next poll'
        : 'Stale — follow-up already used or disabled',
      nextAction: followUpSent ? 'Poll again after follow-up' : 'Anton: inspect Cursor agent',
      antonRequired: !followUpSent,
      ciResult: 'n/a',
    });
    const emit = shouldEmitCompletionEvent(
      prior.completionFingerprint,
      event.fingerprint,
      prior.completionEventEmitted && prior.phase === 'STALE',
    );
    if (emit && next.sourceIssue && input.github?.createIssueComment) {
      await input.github.createIssueComment(next.sourceIssue, formatCursorCompletionEventComment(event));
      actions.push('completion_event_posted');
    } else if (!emit) {
      actions.push('completion_event_deduped');
    }
    return {
      phase: 'STALE',
      state: buildCursorLifecycleState({
        ...next,
        completionFingerprint: event.fingerprint,
        completionEventEmitted: prior.completionEventEmitted || emit,
      }),
      emittedCompletion: emit,
      silent: !emit && !followUpSent,
      followUpSent,
      classification: { kind: 'stale', requeue: false, antonRequired: !followUpSent },
      event: emit ? event : null,
      reviewPacket: null,
      actions,
    };
  }

  // FAILED
  if (phase === 'FAILED') {
    const classification = classifyCursorFailure({
      rawStatus: normalized.rawStatus,
      recoverable: normalized.recoverable,
    });
    const next = buildCursorLifecycleState({
      ...prior,
      phase: 'FAILED',
      cursorRunId: git.runId || prior.cursorRunId,
      branch,
      prNumber,
      prUrl,
      lastPolledAt: nowIso,
      startedAt,
      completedAt: nowIso,
      rawStatus: normalized.rawStatus,
      lastError: classification.reason,
    });
    const event = buildCursorCompletionEvent({
      sourceIssue: next.sourceIssue,
      cursorAgentId: agentId,
      cursorRunId: next.cursorRunId,
      status: 'FAILED',
      branch,
      prNumber,
      prUrl,
      whatMoved: 'agent failed',
      blocker: classification.reason,
      nextAction: classification.requeue
        ? 'Safe requeue: restore dispatch:cursor-ready after evidence preserved'
        : 'Operator review required',
      antonRequired: classification.antonRequired,
      ciResult: 'n/a',
    });
    const emit = shouldEmitCompletionEvent(
      prior.completionFingerprint,
      event.fingerprint,
      prior.completionEventEmitted && prior.phase === 'FAILED',
    );
    if (emit && next.sourceIssue && input.github?.createIssueComment) {
      await input.github.createIssueComment(next.sourceIssue, formatCursorCompletionEventComment(event));
      actions.push('completion_event_posted');
    } else if (!emit) {
      actions.push('completion_event_deduped');
    }
    return {
      phase: 'FAILED',
      state: buildCursorLifecycleState({
        ...next,
        completionFingerprint: event.fingerprint,
        completionEventEmitted: prior.completionEventEmitted || emit,
      }),
      emittedCompletion: emit,
      silent: !emit,
      followUpSent: false,
      classification,
      event: emit ? event : null,
      reviewPacket: null,
      actions,
    };
  }

  // COMPLETED — checks + review packet once
  if (prNumber && input.github?.getPrChecks) {
    const checks = await input.github.getPrChecks(prNumber);
    ciResult = emptyToNull(checks.conclusion) || emptyToNull(checks.summary) || 'unknown';
    actions.push(`checks:${ciResult}`);
  }

  const signals = detectCompletionSignals({
    run: {
      issueNumber: toPositiveInt(input.sourceIssue) || prior.sourceIssue,
      prNumber,
      prUrl,
      branch,
      phase: 'complete',
      notes: 'cursor lifecycle COMPLETED',
    },
    pr: {
      number: prNumber,
      url: prUrl,
      checksPassing: ciResult === 'success' ? true : ciResult === 'failure' ? false : null,
    },
    issue: { number: toPositiveInt(input.sourceIssue) || prior.sourceIssue || undefined },
  });
  const reviewPacket = buildOperatorDecisionPacket(signals, {
    title: `Cursor agent ${agentId} completed`,
    businessOutcome: 'Synthetic/internal Cursor lifecycle proof — operator disposition',
  });

  const event = buildCursorCompletionEvent({
    sourceIssue: toPositiveInt(input.sourceIssue) || prior.sourceIssue,
    cursorAgentId: agentId,
    cursorRunId: git.runId || prior.cursorRunId,
    status: 'COMPLETED',
    branch,
    prNumber,
    prUrl,
    headSha,
    ciResult: ciResult || 'unknown',
    whatMoved: prNumber != null ? `PR #${prNumber} available for review` : 'Agent completed; PR not yet visible',
    blocker: null,
    nextAction: reviewPacket.antonRequired
      ? 'Anton: protected review'
      : 'Operator: review PR — do not auto-merge',
    antonRequired: reviewPacket.antonRequired,
  });

  const emit = shouldEmitCompletionEvent(
    prior.completionFingerprint,
    event.fingerprint,
    prior.completionEventEmitted && prior.phase === 'COMPLETED',
  );

  const sourceIssue = toPositiveInt(input.sourceIssue) || prior.sourceIssue;
  if (emit && sourceIssue && input.github?.createIssueComment) {
    await input.github.createIssueComment(sourceIssue, formatCursorCompletionEventComment(event));
    await input.github.createIssueComment(
      sourceIssue,
      formatOperatorDecisionPacketMarkdown(reviewPacket),
    );
    actions.push('completion_event_posted', 'review_packet_posted');
    if (input.github.addIssueLabels) {
      await input.github.addIssueLabels(sourceIssue, ['dispatch:operator-review']);
      actions.push('label:dispatch:operator-review');
    }
  } else if (!emit) {
    actions.push('completion_event_deduped');
  }

  const next = buildCursorLifecycleState({
    ...prior,
    phase: 'COMPLETED',
    cursorRunId: git.runId || prior.cursorRunId,
    sourceIssue,
    branch,
    prNumber,
    prUrl,
    headSha,
    lastPolledAt: nowIso,
    startedAt,
    completedAt: prior.completedAt || nowIso,
    completionFingerprint: event.fingerprint,
    completionEventEmitted: prior.completionEventEmitted || emit,
    rawStatus: normalized.rawStatus,
    lastError: null,
  });

  return {
    phase: 'COMPLETED',
    state: next,
    emittedCompletion: emit,
    silent: !emit,
    followUpSent: false,
    classification: null,
    event: emit ? event : null,
    reviewPacket: emit ? reviewPacket : null,
    actions,
  };
}

export {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
  parseCursorOriginMetadataFromText,
  resolveCursorOriginMetadata,
};
