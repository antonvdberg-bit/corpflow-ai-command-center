/**
 * Codex human-triggered specialist lifecycle (#661 Option A).
 *
 * Codex is NOT auto-activated (bot @codex does not start review).
 * Flow: claim executor=codex → AWAITING_HUMAN_TRIGGER (one CODEX TRIGGER
 * REQUIRED packet) → human @codex on PR → RUNNING (connector 👀) →
 * COMPLETED from GitHub evidence → corpflow.codex_completion_event.v1 once.
 *
 * Durable state = GitHub issue comments. No second DB. No Cloud APIs.
 *
 * @see docs/operations/CODEX_SPECIALIST_LIFECYCLE_V1.md
 * @see lib/server/cursor-activation-claim.js (cross-executor SKIP_ALREADY_CLAIMED)
 */

import {
  SKIP_ALREADY_CLAIMED,
  parseCursorActivationClaimsFromComments,
} from './cursor-activation-claim.js';
import {
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_IN_PROGRESS,
  DISPATCH_LABEL_OPERATOR_REVIEW,
  normalizeIssueLabels,
} from './cursor-issue-dispatch-lifecycle.js';

export { SKIP_ALREADY_CLAIMED };

export const CODEX_CLAIM_SCHEMA = 'corpflow.codex_claim.v1';
export const CODEX_CLAIM_MARKER = 'corpflow.codex_claim.v1';
export const CODEX_LIFECYCLE_STATE_MARKER = 'corpflow.codex_lifecycle_state.v1';
export const CODEX_COMPLETION_EVENT_SCHEMA = 'corpflow.codex_completion_event.v1';
export const CODEX_COMPLETION_EVENT_MARKER = 'corpflow.codex_completion_event.v1';
export const CODEX_TRIGGER_REQUIRED_MARKER = 'corpflow.codex_trigger_required.v1';

export const CODEX_CONNECTOR_BOT = 'chatgpt-codex-connector[bot]';

/** @typedef {'AWAITING_HUMAN_TRIGGER'|'RUNNING'|'COMPLETED'|'FAILED'|'STALE'} CodexLifecyclePhase */

export const CODEX_LIFECYCLE_PHASES = Object.freeze([
  'AWAITING_HUMAN_TRIGGER',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'STALE',
]);

/** Minutes waiting for human @codex before STALE. */
export const DEFAULT_AWAIT_TRIGGER_MINUTES = 60;

/** Minutes after RUNNING without completion before STALE. */
export const DEFAULT_RUNNING_STALE_MINUTES = 45;

const BOT_TRIGGER_LOGINS = new Set([
  'github-actions[bot]',
  'chatgpt-codex-connector[bot]',
  'vercel[bot]',
  'dependabot[bot]',
  'codecov[bot]',
]);

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
 * @param {string | null | undefined} iso
 * @param {Date} now
 * @param {number} minutes
 */
function isOlderThanMinutes(iso, now, minutes) {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t > minutes * 60 * 1000;
}

/**
 * @param {Partial<{
 *   sourceIssue: number,
 *   executor: string,
 *   prNumber: number,
 *   attempt: number,
 *   generation: number,
 *   status: string,
 *   recommendedComment: string,
 *   purpose: string | null,
 *   claimedAt: string,
 *   claimToken: string | null,
 * }>} input
 */
export function buildCodexClaim(input = {}) {
  const attempt = Math.max(1, Math.floor(Number(input.attempt) || Number(input.generation) || 1));
  return {
    schema: CODEX_CLAIM_SCHEMA,
    source_issue: toPositiveInt(input.sourceIssue) || 0,
    executor: emptyToNull(input.executor) || 'codex',
    pr: toPositiveInt(input.prNumber),
    attempt,
    generation: attempt,
    status: emptyToNull(input.status) || 'AWAITING_HUMAN_TRIGGER',
    recommended_comment: emptyToNull(input.recommendedComment),
    purpose: emptyToNull(input.purpose),
    claimed_at: emptyToNull(input.claimedAt) || new Date().toISOString(),
    claim_token: emptyToNull(input.claimToken),
  };
}

/**
 * @param {ReturnType<typeof buildCodexClaim>} claim
 */
export function formatCodexClaimComment(claim) {
  const c = buildCodexClaim({
    sourceIssue: claim.source_issue,
    executor: claim.executor,
    prNumber: claim.pr,
    attempt: claim.attempt,
    status: claim.status,
    recommendedComment: claim.recommended_comment,
    purpose: claim.purpose,
    claimedAt: claim.claimed_at,
    claimToken: claim.claim_token,
  });
  const json = JSON.stringify(c);
  return `CODEX SPECIALIST CLAIM

Source issue: #${c.source_issue}
Executor: ${c.executor}
PR: ${c.pr != null ? `#${c.pr}` : 'n/a'}
Attempt: ${c.attempt}
Status: ${c.status}
Purpose: ${c.purpose || 'n/a'}
Claimed at: ${c.claimed_at}

Recommended @codex comment:
\`\`\`
${c.recommended_comment || '@codex review'}
\`\`\`

<!-- ${CODEX_CLAIM_MARKER} ${json} -->
`;
}

/**
 * @param {string} body
 */
export function parseCodexClaimFromText(body) {
  const text = String(body || '');
  const marker = text.match(
    new RegExp(`<!--\\s*${CODEX_CLAIM_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!marker) return null;
  try {
    const parsed = JSON.parse(marker[1]);
    const claim = buildCodexClaim({
      sourceIssue: parsed.source_issue ?? parsed.sourceIssue,
      executor: parsed.executor,
      prNumber: parsed.pr ?? parsed.prNumber,
      attempt: parsed.attempt ?? parsed.generation,
      status: parsed.status,
      recommendedComment: parsed.recommended_comment ?? parsed.recommendedComment,
      purpose: parsed.purpose,
      claimedAt: parsed.claimed_at ?? parsed.claimedAt,
      claimToken: parsed.claim_token ?? parsed.claimToken,
    });
    if (!claim.source_issue || claim.executor !== 'codex') return null;
    return claim;
  } catch {
    return null;
  }
}

/**
 * @param {Array<{ body?: string | null }>} comments
 */
export function parseCodexClaimsFromComments(comments) {
  const out = [];
  for (const c of Array.isArray(comments) ? comments : []) {
    const parsed = parseCodexClaimFromText(c?.body || '');
    if (parsed) out.push(parsed);
  }
  return out.sort((a, b) => b.attempt - a.attempt);
}

/**
 * Cross-executor gate: Cursor/OpenHands ownership → SKIP_ALREADY_CLAIMED.
 *
 * @param {{
 *   issueNumber: number,
 *   labels?: unknown,
 *   comments?: Array<{ body?: string | null }>,
 * }} input
 */
export function evaluateCodexClaimGate(input) {
  const issueNumber = toPositiveInt(input.issueNumber);
  if (!issueNumber) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: 'invalid_issue',
      activeCodexClaim: null,
      nextAttempt: null,
    };
  }

  const labels = normalizeIssueLabels(input.labels).map((l) => l.toLowerCase());
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const cursorClaims = parseCursorActivationClaimsFromComments(comments);
  const activeCursor = cursorClaims.find((c) => c.status === 'pending' || c.status === 'activated');
  const hasCursorClaimedLabel = labels.includes(DISPATCH_LABEL_CLAIMED.toLowerCase());
  const hasCursorInProgress = labels.includes(DISPATCH_LABEL_IN_PROGRESS.toLowerCase());

  if (activeCursor || hasCursorClaimedLabel) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: activeCursor ? 'cursor_active_claim' : 'cursor_claimed_label',
      activeCodexClaim: null,
      nextAttempt: null,
      blockingExecutor: 'cursor',
    };
  }

  // In-progress without cursor claim can still mean another worker owns the issue.
  if (hasCursorInProgress && !labels.includes('dispatch:codex-awaiting-trigger')) {
    const openhands = comments.some((c) =>
      /corpflow\.openhands_|OPENHANDS (CLAIM|ACTIVATION)/i.test(String(c?.body || '')),
    );
    if (openhands) {
      return {
        decision: SKIP_ALREADY_CLAIMED,
        reason: 'openhands_active',
        activeCodexClaim: null,
        nextAttempt: null,
        blockingExecutor: 'openhands',
      };
    }
  }

  const codexClaims = parseCodexClaimsFromComments(comments);
  const activeCodex = codexClaims.find((c) =>
    ['AWAITING_HUMAN_TRIGGER', 'RUNNING', 'pending', 'activated'].includes(String(c.status)),
  );
  const terminalCodex = codexClaims.find((c) =>
    ['COMPLETED', 'FAILED', 'STALE', 'released', 'completed'].includes(String(c.status)),
  );
  const maxAttempt = Math.max(0, ...codexClaims.map((c) => c.attempt || 0));

  if (activeCodex) {
    return {
      decision: SKIP_ALREADY_CLAIMED,
      reason: 'codex_active_claim',
      activeCodexClaim: activeCodex,
      nextAttempt: null,
      blockingExecutor: 'codex',
    };
  }

  // Operator-review on Cursor path should not block a separate Codex specialist
  // unless Cursor still owns the claim — already handled above.
  if (labels.includes(DISPATCH_LABEL_OPERATOR_REVIEW.toLowerCase()) && terminalCodex) {
    // Allow a new attempt only via explicit higher attempt from caller; default skip quiet.
  }

  return {
    decision: 'ACQUIRE',
    reason: maxAttempt > 0 ? 'next_codex_attempt' : 'first_codex_claim',
    activeCodexClaim: null,
    nextAttempt: maxAttempt + 1,
    blockingExecutor: null,
  };
}

/**
 * @param {string} instruction  e.g. "review" or "add a marker file …"
 */
export function buildRecommendedCodexComment(instruction) {
  const raw = String(instruction || '').trim();
  if (!raw) return '@codex review';
  if (/^@codex\b/i.test(raw)) return raw;
  if (/^review\b/i.test(raw) && raw.length < 40) return `@codex ${raw}`;
  return `@codex ${raw}`;
}

/**
 * @param {{
 *   sourceIssue: number,
 *   prNumber: number,
 *   purpose?: string | null,
 *   recommendedComment: string,
 *   attempt?: number,
 *   prUrl?: string | null,
 * }} input
 */
export function buildCodexTriggerRequiredPacket(input) {
  const sourceIssue = toPositiveInt(input.sourceIssue);
  const prNumber = toPositiveInt(input.prNumber);
  const attempt = Math.max(1, Math.floor(Number(input.attempt) || 1));
  const recommendedComment = buildRecommendedCodexComment(input.recommendedComment);
  const payload = {
    schema: CODEX_TRIGGER_REQUIRED_MARKER,
    source_issue: sourceIssue,
    executor: 'codex',
    pr: prNumber,
    attempt,
    recommended_comment: recommendedComment,
    purpose: emptyToNull(input.purpose),
    anton_required: true,
    status: 'AWAITING_HUMAN_TRIGGER',
  };
  return {
    ...payload,
    markdown: formatCodexTriggerRequiredComment({
      ...payload,
      prUrl: emptyToNull(input.prUrl),
    }),
  };
}

/**
 * @param {{
 *   source_issue?: number | null,
 *   pr?: number | null,
 *   prUrl?: string | null,
 *   purpose?: string | null,
 *   recommended_comment?: string | null,
 *   attempt?: number,
 * }} p
 */
export function formatCodexTriggerRequiredComment(p) {
  const comment = p.recommended_comment || '@codex review';
  const json = JSON.stringify({
    schema: CODEX_TRIGGER_REQUIRED_MARKER,
    source_issue: p.source_issue ?? null,
    executor: 'codex',
    pr: p.pr ?? null,
    attempt: p.attempt || 1,
    recommended_comment: comment,
    purpose: p.purpose || null,
    anton_required: true,
    status: 'AWAITING_HUMAN_TRIGGER',
  });
  return `CODEX TRIGGER REQUIRED

PR: ${p.pr != null ? `#${p.pr}` : 'n/a'}${p.prUrl ? ` ${p.prUrl}` : ''}
Source issue: ${p.source_issue != null ? `#${p.source_issue}` : 'n/a'}
Purpose: ${p.purpose || 'Codex specialist work'}
Attempt: ${p.attempt || 1}

Post exactly this comment on the PR (human GitHub account — not a bot):

\`\`\`
${comment}
\`\`\`

No additional technical steps. After you post, the lifecycle watcher takes over.

<!-- ${CODEX_TRIGGER_REQUIRED_MARKER} ${json} -->
`;
}

/**
 * @param {string} body
 */
export function parseCodexTriggerRequiredFromText(body) {
  const text = String(body || '');
  const marker = text.match(
    new RegExp(`<!--\\s*${CODEX_TRIGGER_REQUIRED_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!marker) return null;
  try {
    const parsed = JSON.parse(marker[1]);
    if (!parsed || parsed.schema !== CODEX_TRIGGER_REQUIRED_MARKER) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} input  camelCase and/or snake_case fields
 */
export function buildCodexLifecycleState(input = {}) {
  const phase =
    emptyToNull(input.phase) || 'AWAITING_HUMAN_TRIGGER';
  return {
    schema: 'corpflow.codex_lifecycle_state.v1',
    source_issue: toPositiveInt(input.sourceIssue ?? input.source_issue),
    executor: emptyToNull(input.executor) || 'codex',
    pr: toPositiveInt(input.prNumber ?? input.pr),
    attempt: Math.max(1, Math.floor(Number(input.attempt) || 1)),
    phase,
    recommended_comment: emptyToNull(input.recommendedComment ?? input.recommended_comment),
    purpose: emptyToNull(input.purpose),
    human_trigger_comment_id: toPositiveInt(
      input.humanTriggerCommentId ?? input.human_trigger_comment_id,
    ),
    codex_task_url: emptyToNull(input.codexTaskUrl ?? input.codex_task_url),
    head_sha: emptyToNull(input.headSha ?? input.head_sha),
    check_state: emptyToNull(input.checkState ?? input.check_state),
    blocker: emptyToNull(input.blocker),
    next_action: emptyToNull(input.nextAction ?? input.next_action),
    started_at: emptyToNull(input.startedAt ?? input.started_at),
    awaiting_since: emptyToNull(input.awaitingSince ?? input.awaiting_since),
    running_since: emptyToNull(input.runningSince ?? input.running_since),
    completed_at: emptyToNull(input.completedAt ?? input.completed_at),
    last_polled_at: emptyToNull(input.lastPolledAt ?? input.last_polled_at),
    completion_fingerprint: emptyToNull(
      input.completionFingerprint ?? input.completion_fingerprint,
    ),
    completion_event_emitted: Boolean(
      input.completionEventEmitted ?? input.completion_event_emitted,
    ),
    trigger_notification_emitted: Boolean(
      input.triggerNotificationEmitted ?? input.trigger_notification_emitted,
    ),
  };
}

/**
 * @param {ReturnType<typeof buildCodexLifecycleState>} state
 * @param {Record<string, unknown>} [overrides]
 */
function mergeCodexState(state, overrides = {}) {
  return buildCodexLifecycleState({ ...state, ...overrides });
}

/**
 * @param {ReturnType<typeof buildCodexLifecycleState>} state
 */
export function formatCodexLifecycleStateComment(state) {
  const s = buildCodexLifecycleState({
    sourceIssue: state.source_issue,
    executor: state.executor,
    prNumber: state.pr,
    attempt: state.attempt,
    phase: state.phase,
    recommendedComment: state.recommended_comment,
    purpose: state.purpose,
    humanTriggerCommentId: state.human_trigger_comment_id,
    codexTaskUrl: state.codex_task_url,
    headSha: state.head_sha,
    checkState: state.check_state,
    blocker: state.blocker,
    nextAction: state.next_action,
    startedAt: state.started_at,
    awaitingSince: state.awaiting_since,
    runningSince: state.running_since,
    completedAt: state.completed_at,
    lastPolledAt: state.last_polled_at,
    completionFingerprint: state.completion_fingerprint,
    completionEventEmitted: state.completion_event_emitted,
    triggerNotificationEmitted: state.trigger_notification_emitted,
  });
  const json = JSON.stringify(s);
  return `CODEX LIFECYCLE STATE

Source issue: ${s.source_issue != null ? `#${s.source_issue}` : 'n/a'}
Executor: ${s.executor}
PR: ${s.pr != null ? `#${s.pr}` : 'n/a'}
Attempt: ${s.attempt}
Phase: ${s.phase}
Human trigger comment: ${s.human_trigger_comment_id || 'n/a'}
SHA: ${s.head_sha || 'n/a'}
Checks: ${s.check_state || 'n/a'}
Blocker: ${s.blocker || 'none'}
Next: ${s.next_action || 'n/a'}

<!-- ${CODEX_LIFECYCLE_STATE_MARKER} ${json} -->
`;
}

/**
 * @param {string} body
 */
export function parseCodexLifecycleStateFromText(body) {
  const text = String(body || '');
  const marker = text.match(
    new RegExp(`<!--\\s*${CODEX_LIFECYCLE_STATE_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!marker) return null;
  try {
    const parsed = JSON.parse(marker[1]);
    return buildCodexLifecycleState({
      sourceIssue: parsed.source_issue ?? parsed.sourceIssue,
      executor: parsed.executor,
      prNumber: parsed.pr ?? parsed.prNumber,
      attempt: parsed.attempt,
      phase: parsed.phase,
      recommendedComment: parsed.recommended_comment ?? parsed.recommendedComment,
      purpose: parsed.purpose,
      humanTriggerCommentId: parsed.human_trigger_comment_id ?? parsed.humanTriggerCommentId,
      codexTaskUrl: parsed.codex_task_url ?? parsed.codexTaskUrl,
      headSha: parsed.head_sha ?? parsed.headSha,
      checkState: parsed.check_state ?? parsed.checkState,
      blocker: parsed.blocker,
      nextAction: parsed.next_action ?? parsed.nextAction,
      startedAt: parsed.started_at ?? parsed.startedAt,
      awaitingSince: parsed.awaiting_since ?? parsed.awaitingSince,
      runningSince: parsed.running_since ?? parsed.runningSince,
      completedAt: parsed.completed_at ?? parsed.completedAt,
      lastPolledAt: parsed.last_polled_at ?? parsed.lastPolledAt,
      completionFingerprint: parsed.completion_fingerprint ?? parsed.completionFingerprint,
      completionEventEmitted: parsed.completion_event_emitted ?? parsed.completionEventEmitted,
      triggerNotificationEmitted:
        parsed.trigger_notification_emitted ?? parsed.triggerNotificationEmitted,
    });
  } catch {
    return null;
  }
}

/**
 * @param {Array<{ body?: string | null }>} comments
 * @param {{ sourceIssue?: number | null, attempt?: number | null }} [opts]
 */
export function findLatestCodexLifecycleState(comments, opts = {}) {
  const list = Array.isArray(comments) ? [...comments].reverse() : [];
  for (const c of list) {
    const parsed = parseCodexLifecycleStateFromText(c?.body || '');
    if (!parsed) continue;
    if (opts.sourceIssue && parsed.source_issue !== opts.sourceIssue) continue;
    if (opts.attempt && parsed.attempt !== opts.attempt) continue;
    return parsed;
  }
  return null;
}

/**
 * @param {{
 *   sourceIssue?: number | null,
 *   executor?: string | null,
 *   prNumber?: number | null,
 *   attempt?: number | null,
 *   humanTriggerCommentId?: number | null,
 *   status?: string | null,
 *   headSha?: string | null,
 *   checkState?: string | null,
 * }} input
 */
export function buildCodexEventFingerprint(input = {}) {
  return [
    'codex_lifecycle',
    emptyToNull(input.executor) || 'codex',
    toPositiveInt(input.sourceIssue) || 'no-issue',
    toPositiveInt(input.prNumber) || 'no-pr',
    toPositiveInt(input.attempt) || 'no-attempt',
    toPositiveInt(input.humanTriggerCommentId) || 'no-trigger',
    emptyToNull(input.status) || 'no-status',
    emptyToNull(input.headSha) || 'no-sha',
    emptyToNull(input.checkState) || 'no-checks',
  ].join('|');
}

/**
 * @param {{
 *   sourceIssue?: number | null,
 *   executor?: string,
 *   prNumber?: number | null,
 *   attempt?: number | null,
 *   humanTriggerCommentId?: number | null,
 *   codexTaskUrl?: string | null,
 *   status?: string,
 *   headSha?: string | null,
 *   checkState?: string | null,
 *   blocker?: string | null,
 *   nextAction?: string | null,
 *   antonRequired?: boolean,
 *   whatMoved?: string | null,
 * }} input
 */
export function buildCodexCompletionEvent(input = {}) {
  const status = emptyToNull(input.status) || 'UNKNOWN';
  const antonRequired = Boolean(input.antonRequired);
  const notify =
    antonRequired ||
    status === 'FAILED' ||
    status === 'STALE' ||
    status === 'AWAITING_HUMAN_TRIGGER';
  return {
    schema: CODEX_COMPLETION_EVENT_SCHEMA,
    version: 1,
    source_issue: toPositiveInt(input.sourceIssue),
    executor: emptyToNull(input.executor) || 'codex',
    pr: toPositiveInt(input.prNumber),
    attempt: Math.max(1, Math.floor(Number(input.attempt) || 1)),
    human_trigger_comment_id: toPositiveInt(input.humanTriggerCommentId),
    codex_task_url: emptyToNull(input.codexTaskUrl),
    status,
    sha: emptyToNull(input.headSha),
    ci_check_result: emptyToNull(input.checkState) || 'unknown',
    blocker: emptyToNull(input.blocker),
    next_action: emptyToNull(input.nextAction),
    what_moved: emptyToNull(input.whatMoved),
    anton_required: antonRequired || status === 'AWAITING_HUMAN_TRIGGER',
    notify,
    fingerprint: buildCodexEventFingerprint({
      sourceIssue: input.sourceIssue,
      executor: input.executor,
      prNumber: input.prNumber,
      attempt: input.attempt,
      humanTriggerCommentId: input.humanTriggerCommentId,
      status,
      headSha: input.headSha,
      checkState: input.checkState,
    }),
  };
}

/**
 * @param {ReturnType<typeof buildCodexCompletionEvent>} event
 */
export function formatCodexCompletionEventComment(event) {
  const e = event;
  const json = JSON.stringify(e);
  return `CODEX COMPLETION EVENT

Source issue: ${e.source_issue != null ? `#${e.source_issue}` : 'n/a'}
Executor: ${e.executor}
PR: ${e.pr != null ? `#${e.pr}` : 'n/a'}
Attempt: ${e.attempt}
Human trigger comment: ${e.human_trigger_comment_id || 'n/a'}
Codex task URL: ${e.codex_task_url || 'n/a'}
Status: ${e.status}
SHA: ${e.sha || 'n/a'}
Checks: ${e.ci_check_result}
Blocker: ${e.blocker || 'none'}
Next action: ${e.next_action || 'n/a'}
Anton required: ${e.anton_required ? 'YES' : 'NO'}

<!-- ${CODEX_COMPLETION_EVENT_MARKER} ${json} -->
`;
}

/**
 * @param {string} body
 */
export function parseCodexCompletionEventFromText(body) {
  const text = String(body || '');
  const m = text.match(
    new RegExp(`<!--\\s*${CODEX_COMPLETION_EVENT_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!m) return null;
  try {
    const e = JSON.parse(m[1]);
    if (!e || e.schema !== CODEX_COMPLETION_EVENT_SCHEMA) return null;
    return e;
  } catch {
    return null;
  }
}

/**
 * n8n exception gate for corpflow.codex_completion_event.v1
 *
 * @param {ReturnType<typeof buildCodexCompletionEvent> | null | undefined} event
 * @param {{ previousFingerprint?: string | null, alreadyNotified?: boolean }} [opts]
 */
export function shouldNotifyCodexCompletionEvent(event, opts = {}) {
  if (!event || typeof event !== 'object') return false;
  const status = String(event.status || '').toUpperCase();
  if (status === 'RUNNING') return false;
  if (!event.notify && status !== 'AWAITING_HUMAN_TRIGGER') return false;
  if (status === 'COMPLETED' && !event.anton_required) return false;
  if (status === 'AWAITING_HUMAN_TRIGGER' && event.anton_required) {
    // notify once
  } else if (status === 'COMPLETED' && event.anton_required) {
    // notify once
  } else if (status === 'FAILED' || status === 'STALE') {
    if (!(event.anton_required || event.notify)) return false;
  } else if (status !== 'AWAITING_HUMAN_TRIGGER') {
    return false;
  }
  const fp = String(event.fingerprint || '').trim();
  if (!fp) return false;
  if (opts.alreadyNotified && opts.previousFingerprint === fp) return false;
  return true;
}

/**
 * @param {string | null | undefined} previousFingerprint
 * @param {string} nextFingerprint
 * @param {boolean} alreadyEmitted
 */
export function shouldEmitCodexCompletionEvent(previousFingerprint, nextFingerprint, alreadyEmitted) {
  if (!nextFingerprint) return false;
  if (alreadyEmitted && previousFingerprint === nextFingerprint) return false;
  if (alreadyEmitted) return false;
  return true;
}

/**
 * Find human-authored @codex PR comment (not bot).
 *
 * @param {Array<{
 *   id?: number,
 *   user?: { login?: string, type?: string } | null,
 *   body?: string | null,
 *   created_at?: string | null,
 * }>} comments
 * @param {{ afterIso?: string | null, requireSubstring?: string | null }} [opts]
 */
export function detectHumanCodexTriggerComment(comments, opts = {}) {
  const afterMs = opts.afterIso ? Date.parse(opts.afterIso) : 0;
  const require = emptyToNull(opts.requireSubstring);
  const list = Array.isArray(comments) ? comments : [];
  /** @type {typeof list} */
  const matches = [];
  for (const c of list) {
    const login = String(c?.user?.login || '').toLowerCase();
    const type = String(c?.user?.type || '');
    if (BOT_TRIGGER_LOGINS.has(String(c?.user?.login || '')) || type === 'Bot') continue;
    if (login.endsWith('[bot]')) continue;
    const body = String(c?.body || '');
    if (!/@codex\b/i.test(body)) continue;
    if (require && !body.includes(require) && !body.toLowerCase().includes(require.toLowerCase())) {
      continue;
    }
    const created = c?.created_at ? Date.parse(c.created_at) : 0;
    if (afterMs && created && created < afterMs) continue;
    matches.push(c);
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0));
  const first = matches[0];
  return {
    id: toPositiveInt(first.id),
    login: first.user?.login || null,
    created_at: first.created_at || null,
    body: first.body || '',
  };
}

/**
 * RUNNING acknowledgement: connector 👀 on trigger, or non-setup connector reply.
 *
 * @param {{
 *   triggerCommentId?: number | null,
 *   reactions?: Array<{ user?: { login?: string }, content?: string }>,
 *   prComments?: Array<{
 *     id?: number,
 *     user?: { login?: string },
 *     body?: string | null,
 *     created_at?: string | null,
 *   }>,
 *   triggerCreatedAt?: string | null,
 * }} input
 */
export function detectCodexAcknowledgement(input = {}) {
  const reactions = Array.isArray(input.reactions) ? input.reactions : [];
  for (const r of reactions) {
    const login = String(r?.user?.login || '');
    const content = String(r?.content || '').toLowerCase();
    if (login === CODEX_CONNECTOR_BOT && (content === 'eyes' || content === '+1' || content === 'rocket')) {
      return {
        acknowledged: true,
        kind: 'reaction',
        content,
        actor: login,
      };
    }
  }

  const afterMs = input.triggerCreatedAt ? Date.parse(input.triggerCreatedAt) : 0;
  const triggerId = toPositiveInt(input.triggerCommentId);
  for (const c of Array.isArray(input.prComments) ? input.prComments : []) {
    if (String(c?.user?.login || '') !== CODEX_CONNECTOR_BOT) continue;
    if (triggerId && toPositiveInt(c.id) === triggerId) continue;
    const created = c?.created_at ? Date.parse(c.created_at) : 0;
    if (afterMs && created && created < afterMs) continue;
    const body = String(c?.body || '');
    if (/create a Codex account and connect/i.test(body)) {
      return {
        acknowledged: false,
        kind: 'setup_prompt',
        actor: CODEX_CONNECTOR_BOT,
        body: body.slice(0, 200),
      };
    }
    if (
      /Codex Review:/i.test(body) ||
      /CODEX_PACKET_V1/i.test(body) ||
      /View task/i.test(body) ||
      /Working on it/i.test(body)
    ) {
      return {
        acknowledged: true,
        kind: 'connector_comment',
        actor: CODEX_CONNECTOR_BOT,
        commentId: toPositiveInt(c.id),
      };
    }
  }

  return { acknowledged: false, kind: 'none' };
}

/**
 * Extract Codex task URL from connector comment if present (do not invent).
 *
 * @param {string} body
 */
export function extractCodexTaskUrlFromText(body) {
  const text = String(body || '');
  const m =
    text.match(/https:\/\/chatgpt\.com\/(?:codex\/cloud\/tasks\/|s\/)[A-Za-z0-9_-]+/i) ||
    text.match(/\((https:\/\/chatgpt\.com\/[^)\s]+)\)/i);
  return m ? m[1] || m[0] : null;
}

/**
 * @param {{
 *   mode?: 'review' | 'change',
 *   prComments?: Array<{
 *     id?: number,
 *     user?: { login?: string },
 *     body?: string | null,
 *     created_at?: string | null,
 *   }>,
 *   triggerCreatedAt?: string | null,
 *   triggerCommentId?: number | null,
 *   headSha?: string | null,
 *   commitsAfterTrigger?: Array<{ sha?: string, authorLogin?: string }>,
 * }} input
 */
export function detectCodexCompletion(input = {}) {
  const mode = input.mode === 'change' ? 'change' : 'review';
  const afterMs = input.triggerCreatedAt ? Date.parse(input.triggerCreatedAt) : 0;
  const triggerId = toPositiveInt(input.triggerCommentId);

  /** @type {{ completed: boolean, kind: string, commentId?: number | null, headSha?: string | null, taskUrl?: string | null, summary?: string | null }} */
  let best = { completed: false, kind: 'none' };

  for (const c of Array.isArray(input.prComments) ? input.prComments : []) {
    if (String(c?.user?.login || '') !== CODEX_CONNECTOR_BOT) continue;
    if (triggerId && toPositiveInt(c.id) === triggerId) continue;
    const created = c?.created_at ? Date.parse(c.created_at) : 0;
    if (afterMs && created && created < afterMs) continue;
    const body = String(c?.body || '');
    if (/create a Codex account and connect/i.test(body)) continue;

    const taskUrl = extractCodexTaskUrlFromText(body);
    const shaMatch = body.match(/Reviewed commit:\*{0,2}\s*`?([a-f0-9]{7,40})`?/i);
    const sha = shaMatch ? shaMatch[1] : emptyToNull(input.headSha);

    if (/Codex Review:/i.test(body)) {
      best = {
        completed: true,
        kind: 'codex_review_comment',
        commentId: toPositiveInt(c.id),
        headSha: sha,
        taskUrl,
        summary: body.split('\n')[0].slice(0, 200),
      };
      break;
    }
    if (/CODEX_PACKET_V1/i.test(body) && /Stop condition:/i.test(body)) {
      best = {
        completed: true,
        kind: 'codex_packet_comment',
        commentId: toPositiveInt(c.id),
        headSha: sha,
        taskUrl,
        summary: 'CODEX_PACKET_V1 posted',
      };
      // prefer later Codex Review if present; keep scanning
    }
  }

  if (!best.completed && mode === 'change') {
    const commits = Array.isArray(input.commitsAfterTrigger) ? input.commitsAfterTrigger : [];
    const codexCommit = commits.find((c) => {
      const login = String(c.authorLogin || '');
      return login === CODEX_CONNECTOR_BOT || /codex/i.test(login);
    });
    if (codexCommit?.sha) {
      best = {
        completed: true,
        kind: 'codex_commit',
        headSha: codexCommit.sha,
        summary: 'Codex pushed commit',
      };
    }
  }

  return best;
}

/**
 * Prepare claim + AWAITING packet (pure). Caller posts comments.
 *
 * @param {{
 *   issueNumber: number,
 *   prNumber: number,
 *   instruction: string,
 *   purpose?: string | null,
 *   prUrl?: string | null,
 *   labels?: unknown,
 *   comments?: Array<{ body?: string | null }>,
 *   claimToken?: string | null,
 *   nowIso?: string,
 * }} input
 */
export function prepareCodexSpecialistPacket(input) {
  const gate = evaluateCodexClaimGate({
    issueNumber: input.issueNumber,
    labels: input.labels,
    comments: input.comments,
  });
  if (gate.decision === SKIP_ALREADY_CLAIMED) {
    return {
      ok: false,
      decision: SKIP_ALREADY_CLAIMED,
      reason: gate.reason,
      blockingExecutor: gate.blockingExecutor,
      claim: gate.activeCodexClaim,
    };
  }

  const attempt = gate.nextAttempt || 1;
  const nowIso = input.nowIso || new Date().toISOString();
  const recommendedComment = buildRecommendedCodexComment(input.instruction);
  const claim = buildCodexClaim({
    sourceIssue: input.issueNumber,
    executor: 'codex',
    prNumber: input.prNumber,
    attempt,
    status: 'AWAITING_HUMAN_TRIGGER',
    recommendedComment,
    purpose: input.purpose,
    claimedAt: nowIso,
    claimToken: input.claimToken || `codex-${input.issueNumber}-${attempt}`,
  });
  const state = buildCodexLifecycleState({
    sourceIssue: input.issueNumber,
    executor: 'codex',
    prNumber: input.prNumber,
    attempt,
    phase: 'AWAITING_HUMAN_TRIGGER',
    recommendedComment,
    purpose: input.purpose,
    startedAt: nowIso,
    awaitingSince: nowIso,
    lastPolledAt: nowIso,
    nextAction: 'Anton posts the exact @codex comment on the PR',
    triggerNotificationEmitted: true,
  });
  const trigger = buildCodexTriggerRequiredPacket({
    sourceIssue: input.issueNumber,
    prNumber: input.prNumber,
    purpose: input.purpose,
    recommendedComment,
    attempt,
    prUrl: input.prUrl,
  });
  const awaitEvent = buildCodexCompletionEvent({
    sourceIssue: input.issueNumber,
    executor: 'codex',
    prNumber: input.prNumber,
    attempt,
    status: 'AWAITING_HUMAN_TRIGGER',
    antonRequired: true,
    blocker: 'Human @codex comment required on PR',
    nextAction: `Post exactly: ${recommendedComment}`,
    whatMoved: 'Codex specialist packet prepared — awaiting human trigger',
    checkState: 'n/a',
  });

  return {
    ok: true,
    decision: 'ACQUIRE',
    reason: gate.reason,
    attempt,
    claim,
    state,
    trigger,
    awaitEvent,
    comments: {
      claim: formatCodexClaimComment(claim),
      trigger: trigger.markdown,
      state: formatCodexLifecycleStateComment(state),
      awaitEvent: formatCodexCompletionEventComment(awaitEvent),
    },
  };
}

/**
 * One watcher tick after prepare (or resume from prior state).
 *
 * @param {{
 *   priorState: ReturnType<typeof buildCodexLifecycleState>,
 *   prComments: Array<{
 *     id?: number,
 *     user?: { login?: string, type?: string },
 *     body?: string | null,
 *     created_at?: string | null,
 *   }>,
 *   triggerReactions?: Array<{ user?: { login?: string }, content?: string }>,
 *   headSha?: string | null,
 *   checkState?: string | null,
 *   mode?: 'review' | 'change',
 *   awaitTriggerMinutes?: number,
 *   runningStaleMinutes?: number,
 *   now?: Date,
 *   commitsAfterTrigger?: Array<{ sha?: string, authorLogin?: string }>,
 * }} input
 */
export function runCodexSpecialistLifecycleTick(input) {
  const now = input.now || new Date();
  const nowIso = now.toISOString();
  const prior = input.priorState;
  const awaitMins = Number(input.awaitTriggerMinutes) || DEFAULT_AWAIT_TRIGGER_MINUTES;
  const staleMins = Number(input.runningStaleMinutes) || DEFAULT_RUNNING_STALE_MINUTES;
  const mode = input.mode === 'change' ? 'change' : 'review';

  /** @type {ReturnType<typeof buildCodexLifecycleState>} */
  let state = mergeCodexState(prior, {
    headSha: input.headSha ?? prior.head_sha,
    checkState: input.checkState ?? prior.check_state,
    lastPolledAt: nowIso,
  });

  if (state.phase === 'COMPLETED' || state.phase === 'FAILED') {
    const event = buildCodexCompletionEvent({
      sourceIssue: state.source_issue,
      executor: 'codex',
      prNumber: state.pr,
      attempt: state.attempt,
      humanTriggerCommentId: state.human_trigger_comment_id,
      codexTaskUrl: state.codex_task_url,
      status: state.phase,
      headSha: state.head_sha,
      checkState: state.check_state,
      antonRequired: state.phase === 'FAILED',
      blocker: state.blocker,
      nextAction: state.next_action,
    });
    const emit = shouldEmitCodexCompletionEvent(
      prior.completion_fingerprint,
      event.fingerprint,
      prior.completion_event_emitted,
    );
    return {
      phase: state.phase,
      state,
      silent: true,
      emittedCompletion: false,
      deduped: !emit && prior.completion_event_emitted,
      event: emit ? event : null,
      acknowledgement: null,
      humanTrigger: null,
      completion: null,
    };
  }

  // Resolve human trigger
  let humanTrigger = null;
  if (state.human_trigger_comment_id) {
    const existing = (input.prComments || []).find(
      (c) => toPositiveInt(c.id) === state.human_trigger_comment_id,
    );
    if (existing) {
      humanTrigger = {
        id: state.human_trigger_comment_id,
        login: existing.user?.login || null,
        created_at: existing.created_at || null,
        body: existing.body || '',
      };
    }
  }
  if (!humanTrigger) {
    humanTrigger = detectHumanCodexTriggerComment(input.prComments, {
      afterIso: state.awaiting_since || state.started_at,
    });
  }

  if (!humanTrigger?.id) {
    if (isOlderThanMinutes(state.awaiting_since || state.started_at, now, awaitMins)) {
      state = mergeCodexState(state, {
        phase: 'STALE',
        blocker: 'No human @codex comment within await timeout',
        nextAction: 'Anton: post the exact @codex comment on the PR, or cancel the Codex claim',
        completedAt: nowIso,
      });
      const event = buildCodexCompletionEvent({
        sourceIssue: state.source_issue,
        executor: 'codex',
        prNumber: state.pr,
        attempt: state.attempt,
        status: 'STALE',
        antonRequired: true,
        blocker: state.blocker,
        nextAction: state.next_action,
        checkState: state.check_state,
        whatMoved: 'Awaiting human trigger timed out',
      });
      const emit = shouldEmitCodexCompletionEvent(
        prior.completion_fingerprint,
        event.fingerprint,
        prior.completion_event_emitted,
      );
      if (emit) {
        state = mergeCodexState(state, {
          completionFingerprint: event.fingerprint,
          completionEventEmitted: true,
        });
      }
      return {
        phase: 'STALE',
        state,
        silent: !emit,
        emittedCompletion: emit,
        deduped: !emit && prior.completion_event_emitted,
        event: emit ? event : null,
        acknowledgement: null,
        humanTrigger: null,
        completion: null,
      };
    }

    state = mergeCodexState(state, {
      phase: 'AWAITING_HUMAN_TRIGGER',
      nextAction: 'Anton posts the exact @codex comment on the PR',
    });
    return {
      phase: 'AWAITING_HUMAN_TRIGGER',
      state,
      silent: true,
      emittedCompletion: false,
      deduped: false,
      event: null,
      acknowledgement: null,
      humanTrigger: null,
      completion: null,
    };
  }

  state = mergeCodexState(state, {
    humanTriggerCommentId: humanTrigger.id,
  });

  const acknowledgement = detectCodexAcknowledgement({
    triggerCommentId: humanTrigger.id,
    reactions: input.triggerReactions,
    prComments: input.prComments,
    triggerCreatedAt: humanTrigger.created_at,
  });

  // Sticky RUNNING: do not regress if eyes reaction was cleared after ack.
  const alreadyRunning =
    prior.phase === 'RUNNING' ||
    Boolean(prior.running_since) ||
    (prior.phase === 'COMPLETED' && prior.human_trigger_comment_id);

  if (!acknowledgement.acknowledged && !alreadyRunning) {
    if (acknowledgement.kind === 'setup_prompt') {
      state = mergeCodexState(state, {
        phase: 'FAILED',
        blocker: 'Codex connector returned setup prompt (integration not accepting this trigger)',
        nextAction: 'Anton: verify Codex↔GitHub connector; re-post @codex as human if needed',
        completedAt: nowIso,
      });
      const event = buildCodexCompletionEvent({
        sourceIssue: state.source_issue,
        executor: 'codex',
        prNumber: state.pr,
        attempt: state.attempt,
        humanTriggerCommentId: humanTrigger.id,
        status: 'FAILED',
        antonRequired: true,
        blocker: state.blocker,
        nextAction: state.next_action,
        checkState: state.check_state,
        whatMoved: 'Human trigger present but Codex did not start normally',
      });
      const emit = shouldEmitCodexCompletionEvent(
        prior.completion_fingerprint,
        event.fingerprint,
        prior.completion_event_emitted,
      );
      if (emit) {
        state = mergeCodexState(state, {
          completionFingerprint: event.fingerprint,
          completionEventEmitted: true,
        });
      }
      return {
        phase: 'FAILED',
        state,
        silent: !emit,
        emittedCompletion: emit,
        deduped: !emit && prior.completion_event_emitted,
        event: emit ? event : null,
        acknowledgement,
        humanTrigger,
        completion: null,
      };
    }

    // Human posted; waiting for 👀 / connector activity
    if (
      isOlderThanMinutes(humanTrigger.created_at || state.awaiting_since, now, staleMins)
    ) {
      state = mergeCodexState(state, {
        phase: 'STALE',
        blocker: 'Human @codex posted but no Codex acknowledgement within timeout',
        nextAction: 'Anton: confirm Codex GitHub integration; re-post @codex if needed',
        completedAt: nowIso,
      });
      const event = buildCodexCompletionEvent({
        sourceIssue: state.source_issue,
        executor: 'codex',
        prNumber: state.pr,
        attempt: state.attempt,
        humanTriggerCommentId: humanTrigger.id,
        status: 'STALE',
        antonRequired: true,
        blocker: state.blocker,
        nextAction: state.next_action,
        checkState: state.check_state,
        whatMoved: 'No Codex acknowledgement after human trigger',
      });
      const emit = shouldEmitCodexCompletionEvent(
        prior.completion_fingerprint,
        event.fingerprint,
        prior.completion_event_emitted,
      );
      if (emit) {
        state = mergeCodexState(state, {
          completionFingerprint: event.fingerprint,
          completionEventEmitted: true,
        });
      }
      return {
        phase: 'STALE',
        state,
        silent: !emit,
        emittedCompletion: emit,
        deduped: !emit && prior.completion_event_emitted,
        event: emit ? event : null,
        acknowledgement,
        humanTrigger,
        completion: null,
      };
    }

    // Still pending acknowledgement — do not mark RUNNING yet
    state = mergeCodexState(state, {
      phase: 'AWAITING_HUMAN_TRIGGER',
      nextAction: 'Waiting for Codex acknowledgement (👀) on the human trigger comment',
    });
    return {
      phase: 'AWAITING_HUMAN_TRIGGER',
      state,
      silent: true,
      emittedCompletion: false,
      deduped: false,
      event: null,
      acknowledgement,
      humanTrigger,
      completion: null,
    };
  }

  // Acknowledged → RUNNING (or COMPLETED if result already present)
  const completion = detectCodexCompletion({
    mode,
    prComments: input.prComments,
    triggerCreatedAt: humanTrigger.created_at,
    triggerCommentId: humanTrigger.id,
    headSha: input.headSha,
    commitsAfterTrigger: input.commitsAfterTrigger,
  });

  if (completion.completed) {
    const event = buildCodexCompletionEvent({
      sourceIssue: state.source_issue,
      executor: 'codex',
      prNumber: state.pr,
      attempt: state.attempt,
      humanTriggerCommentId: humanTrigger.id,
      codexTaskUrl: completion.taskUrl || state.codex_task_url,
      status: 'COMPLETED',
      headSha: completion.headSha || input.headSha,
      checkState: input.checkState || state.check_state || 'unknown',
      antonRequired: false,
      blocker: null,
      nextAction: 'No action — review result recorded; no auto-merge',
      whatMoved: completion.summary || completion.kind,
    });
    const emit = shouldEmitCodexCompletionEvent(
      prior.completion_fingerprint,
      event.fingerprint,
      prior.completion_event_emitted,
    );
    state = mergeCodexState(state, {
      phase: 'COMPLETED',
      humanTriggerCommentId: humanTrigger.id,
      codexTaskUrl: completion.taskUrl || state.codex_task_url,
      headSha: completion.headSha || input.headSha,
      checkState: input.checkState || state.check_state,
      runningSince: state.running_since || nowIso,
      completedAt: nowIso,
      nextAction: event.next_action,
      blocker: null,
      completionFingerprint: emit ? event.fingerprint : prior.completion_fingerprint,
      completionEventEmitted: emit ? true : prior.completion_event_emitted,
    });
    return {
      phase: 'COMPLETED',
      state,
      silent: true,
      emittedCompletion: emit,
      deduped: !emit && prior.completion_event_emitted,
      event: emit ? event : null,
      acknowledgement,
      humanTrigger,
      completion,
    };
  }

  // RUNNING without completion yet
  if (isOlderThanMinutes(state.running_since || humanTrigger.created_at, now, staleMins)) {
    state = mergeCodexState(state, {
      phase: 'STALE',
      humanTriggerCommentId: humanTrigger.id,
      runningSince: state.running_since || humanTrigger.created_at,
      blocker: 'Codex acknowledged but no completion evidence within timeout',
      nextAction: 'Anton: check PR for Codex result or re-trigger',
      completedAt: nowIso,
    });
    const event = buildCodexCompletionEvent({
      sourceIssue: state.source_issue,
      executor: 'codex',
      prNumber: state.pr,
      attempt: state.attempt,
      humanTriggerCommentId: humanTrigger.id,
      status: 'STALE',
      antonRequired: true,
      blocker: state.blocker,
      nextAction: state.next_action,
      checkState: state.check_state,
      headSha: input.headSha,
      whatMoved: 'Running without completion',
    });
    const emit = shouldEmitCodexCompletionEvent(
      prior.completion_fingerprint,
      event.fingerprint,
      prior.completion_event_emitted,
    );
    if (emit) {
      state = mergeCodexState(state, {
        completionFingerprint: event.fingerprint,
        completionEventEmitted: true,
      });
    }
    return {
      phase: 'STALE',
      state,
      silent: !emit,
      emittedCompletion: emit,
      deduped: !emit && prior.completion_event_emitted,
      event: emit ? event : null,
      acknowledgement,
      humanTrigger,
      completion,
    };
  }

  state = mergeCodexState(state, {
    phase: 'RUNNING',
    humanTriggerCommentId: humanTrigger.id,
    runningSince: state.running_since || nowIso,
    nextAction: 'Watcher monitoring Codex GitHub activity (silent)',
    blocker: null,
  });
  return {
    phase: 'RUNNING',
    state,
    silent: true,
    emittedCompletion: false,
    deduped: false,
    event: null,
    acknowledgement,
    humanTrigger,
    completion,
  };
}
