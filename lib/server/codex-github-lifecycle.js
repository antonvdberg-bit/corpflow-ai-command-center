/**
 * Codex GitHub-native lifecycle (#661 Option A).
 *
 * Evidence = GitHub PR comments / reactions / reviews only.
 * No OpenAI Platform API keys, no undocumented Cloud APIs, no Codex CLI.
 *
 * Lifecycle identity (when Codex does not expose a run id):
 *   sourceIssue + pr + attempt + triggerCommentId
 *
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md
 * @see https://developers.openai.com/codex/integrations/github
 */

export const CODEX_LIFECYCLE_SCHEMA = 'corpflow.codex_github_lifecycle.v1';
export const CODEX_LIFECYCLE_STATE_MARKER = 'corpflow.codex_lifecycle_state.v1';
export const CODEX_COMPLETION_EVENT_SCHEMA = 'corpflow.codex_completion_event.v1';
export const CODEX_COMPLETION_EVENT_MARKER = 'corpflow.codex_completion_event.v1';
export const CODEX_TRIGGER_MARKER = 'corpflow.codex_github_trigger.v1';

export const CODEX_CONNECTOR_LOGIN = 'chatgpt-codex-connector[bot]';
export const CODEX_GITHUB_ACTIONS_LOGIN = 'github-actions[bot]';

/** @typedef {'PENDING'|'RUNNING'|'COMPLETED'|'FAILED'|'STALE'} LifecyclePhase */

export const LIFECYCLE_PHASES = Object.freeze([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'STALE',
]);

export const DEFAULT_STALE_AFTER_MINUTES = 30;

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
 * Extract Codex cloud task URL when GitHub exposes one in connector comments.
 * @param {string} body
 * @returns {string | null}
 */
export function extractCodexTaskUrl(body) {
  const text = String(body || '');
  const m =
    text.match(/https:\/\/chatgpt\.com\/s\/cd_[A-Za-z0-9]+/i) ||
    text.match(/https:\/\/chatgpt\.com\/codex\/tasks\/[A-Za-z0-9_-]+/i) ||
    text.match(/\[View task[^\]]*\]\((https:\/\/chatgpt\.com\/[^)\s]+)\)/i);
  if (!m) return null;
  return emptyToNull(m[1] || m[0]);
}

/**
 * Extract a durable task id fragment from a Codex task URL when present.
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function extractCodexTaskId(url) {
  const u = emptyToNull(url);
  if (!u) return null;
  const m = u.match(/\/(?:s\/|tasks\/)(cd_[A-Za-z0-9]+|[A-Za-z0-9_-]+)/i);
  return emptyToNull(m?.[1]) || null;
}

/**
 * @param {string} body
 * @returns {boolean}
 */
export function isCodexTriggerComment(body) {
  const text = String(body || '');
  return /(?:^|\s)@codex(?:\s|$)/i.test(text);
}

/**
 * @param {string} body
 * @returns {boolean}
 */
export function isOfficialCodexReviewComment(body) {
  const text = String(body || '');
  return /^Codex Review:/im.test(text) || /\bCodex Review:\s*/i.test(text);
}

/**
 * @param {string} body
 * @returns {boolean}
 */
export function isCodexConnectPrompt(body) {
  const text = String(body || '').trim();
  // Exact connector setup nudge only — not longer analysis that quotes it.
  if (text.length > 280) return false;
  return /create a Codex account and connect to github/i.test(text);
}

/**
 * @param {string} body
 * @returns {boolean}
 */
export function isCodexFailureComment(body) {
  const text = String(body || '');
  return (
    /Codex (?:failed|error|could not|unable to)/i.test(text) ||
    /failed to (?:start|run|complete) Codex/i.test(text)
  );
}

/**
 * @param {string} body
 * @returns {boolean}
 */
export function isSubstantialCodexResultComment(body) {
  const text = String(body || '');
  if (isOfficialCodexReviewComment(text)) return true;
  if (isCodexConnectPrompt(text)) return false;
  if (/CODEX_PACKET_V1/i.test(text)) return true;
  if (extractCodexTaskUrl(text) && text.length > 200) return true;
  return false;
}

/**
 * Build lifecycle identity without fabricating a Codex run id.
 *
 * @param {{
 *   sourceIssue?: number | null,
 *   prNumber?: number | null,
 *   attempt?: number | null,
 *   triggerCommentId?: number | null,
 * }} input
 */
export function buildCodexLifecycleIdentity(input = {}) {
  const sourceIssue = toPositiveInt(input.sourceIssue);
  const prNumber = toPositiveInt(input.prNumber);
  const attempt = Math.max(1, toPositiveInt(input.attempt) || 1);
  const triggerCommentId = toPositiveInt(input.triggerCommentId);
  return {
    source_issue: sourceIssue,
    pr: prNumber,
    attempt,
    trigger_comment_id: triggerCommentId,
    identity: [
      'codex_github',
      sourceIssue || 'no-issue',
      prNumber || 'no-pr',
      attempt,
      triggerCommentId || 'no-trigger',
    ].join('|'),
  };
}

/**
 * End of the evidence window for one trigger: the next later @codex trigger on the PR
 * (so a human follow-up review is not attributed to an earlier bot trigger).
 *
 * @param {Array<{ id?: number|string, body?: string, created_at?: string }>} comments
 * @param {{ id?: number|string, created_at?: string } | null} trigger
 * @returns {number | null} epoch ms exclusive upper bound, or null if open-ended
 */
export function resolveCodexEvidenceWindowEnd(comments, trigger) {
  const triggerId = toPositiveInt(trigger?.id);
  const triggerAt = trigger?.created_at ? new Date(trigger.created_at).getTime() : null;
  if (!triggerAt) return null;
  let end = null;
  for (const c of Array.isArray(comments) ? comments : []) {
    const id = toPositiveInt(c?.id);
    if (id && triggerId && id === triggerId) continue;
    if (!isCodexTriggerComment(c?.body || '')) continue;
    const t = c?.created_at ? new Date(c.created_at).getTime() : NaN;
    if (!Number.isFinite(t) || t <= triggerAt) continue;
    if (end == null || t < end) end = t;
  }
  return end;
}

/**
 * Inspect GitHub PR evidence after a trigger comment.
 *
 * @param {{
 *   triggerComment: { id?: number|string, user?: { login?: string }, body?: string, created_at?: string } | null,
 *   comments?: Array<{ id?: number|string, user?: { login?: string }, body?: string, created_at?: string }>,
 *   reactions?: Array<{ user?: { login?: string }, content?: string, created_at?: string }>,
 *   reviews?: Array<{ user?: { login?: string }, state?: string, body?: string, submitted_at?: string }>,
 *   headSha?: string | null,
 *   now?: Date,
 *   staleAfterMinutes?: number,
 * }} input
 */
export function inspectCodexGithubEvidence(input = {}) {
  const trigger = input.triggerComment || null;
  const triggerId = toPositiveInt(trigger?.id);
  const triggerAt = trigger?.created_at ? new Date(trigger.created_at).getTime() : null;
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const reactions = Array.isArray(input.reactions) ? input.reactions : [];
  const reviews = Array.isArray(input.reviews) ? input.reviews : [];
  const now = input.now || new Date();
  const staleMins = input.staleAfterMinutes ?? DEFAULT_STALE_AFTER_MINUTES;
  const windowEnd = resolveCodexEvidenceWindowEnd(comments, trigger);

  const inWindow = (created) => {
    if (!triggerAt || !created) return true;
    const t = new Date(created).getTime();
    if (!Number.isFinite(t) || t < triggerAt) return false;
    if (windowEnd != null && t >= windowEnd) return false;
    return true;
  };

  const eyes = reactions.find(
    (r) =>
      String(r?.user?.login || '') === CODEX_CONNECTOR_LOGIN &&
      String(r?.content || '') === 'eyes' &&
      inWindow(r?.created_at),
  );

  const connectorComments = comments.filter(
    (c) =>
      String(c?.user?.login || '') === CODEX_CONNECTOR_LOGIN &&
      inWindow(c?.created_at) &&
      toPositiveInt(c?.id) !== triggerId,
  );

  const connectPrompt = connectorComments.find((c) => isCodexConnectPrompt(c?.body || ''));
  const failureComment = connectorComments.find((c) => isCodexFailureComment(c?.body || ''));
  const resultComment =
    connectorComments.find((c) => isOfficialCodexReviewComment(c?.body || '')) ||
    connectorComments.find((c) => isSubstantialCodexResultComment(c?.body || ''));

  const review =
    reviews.find(
      (r) =>
        String(r?.user?.login || '') === CODEX_CONNECTOR_LOGIN && inWindow(r?.submitted_at),
    ) || null;

  let taskUrl = extractCodexTaskUrl(resultComment?.body || '');
  if (!taskUrl) {
    for (const c of connectorComments) {
      taskUrl = extractCodexTaskUrl(c?.body || '');
      if (taskUrl) break;
    }
  }
  const taskId = extractCodexTaskId(taskUrl);

  /** @type {LifecyclePhase} */
  let phase = 'PENDING';
  let blocker = null;
  let antonRequired = false;
  let nextAction = 'wait_for_codex_github_activity';

  if (failureComment) {
    phase = 'FAILED';
    blocker = 'codex_connector_reported_failure';
    antonRequired = true;
    nextAction = 'inspect_codex_connector_failure_on_pr';
  } else if (resultComment || review) {
    phase = 'COMPLETED';
    nextAction = 'inspect_result_then_operator_or_silent';
    // Official review with no P0/P1 → anton not required by default
    const body = String(resultComment?.body || review?.body || '');
    if (/P0|P1|major issues?/i.test(body) && !/Didn't find any major issues/i.test(body)) {
      antonRequired = true;
      nextAction = 'operator_review_codex_findings';
    } else {
      antonRequired = false;
      nextAction = 'no_action_silent';
    }
  } else if (eyes || connectPrompt || connectorComments.length > 0) {
    phase = 'RUNNING';
    nextAction = 'poll_for_codex_result';
    if (connectPrompt && !eyes && !resultComment) {
      // Connector heard the mention but did not enter the normal review path.
      // Still RUNNING until timeout; may complete via cloud-task comment.
      nextAction = 'poll_for_codex_cloud_or_review_result';
    }
  } else if (triggerAt && now.getTime() - triggerAt >= staleMins * 60 * 1000) {
    phase = 'STALE';
    blocker = 'no_codex_github_response_within_timeout';
    antonRequired = true;
    nextAction = 'human_post_at_codex_on_pr_or_check_codex_settings';
  }

  return {
    phase,
    triggerCommentId: triggerId,
    triggerAuthor: emptyToNull(trigger?.user?.login),
    eyesReaction: Boolean(eyes),
    connectPrompt: Boolean(connectPrompt),
    connectorCommentCount: connectorComments.length,
    resultCommentId: toPositiveInt(resultComment?.id),
    reviewState: emptyToNull(review?.state),
    codexTaskUrl: taskUrl,
    codexTaskId: taskId,
    headSha: emptyToNull(input.headSha),
    blocker,
    antonRequired,
    nextAction,
    raw: {
      resultPreview: emptyToNull(String(resultComment?.body || '').slice(0, 240)),
      connectPreview: emptyToNull(String(connectPrompt?.body || '').slice(0, 240)),
    },
  };
}

/**
 * @param {Partial<{
 *   schema: string,
 *   sourceIssue: number | null,
 *   prNumber: number | null,
 *   attempt: number,
 *   triggerCommentId: number | null,
 *   phase: LifecyclePhase,
 *   codexTaskUrl: string | null,
 *   codexTaskId: string | null,
 *   headSha: string | null,
 *   lastPolledAt: string | null,
 *   startedAt: string | null,
 *   completedAt: string | null,
 *   completionFingerprint: string | null,
 *   completionEventEmitted: boolean,
 *   blocker: string | null,
 * }>} input
 */
export function buildCodexLifecycleState(input = {}) {
  const identity = buildCodexLifecycleIdentity({
    sourceIssue: input.sourceIssue,
    prNumber: input.prNumber,
    attempt: input.attempt,
    triggerCommentId: input.triggerCommentId,
  });
  const phase = LIFECYCLE_PHASES.includes(/** @type {any} */ (input.phase))
    ? /** @type {LifecyclePhase} */ (input.phase)
    : 'PENDING';
  return {
    schema: CODEX_LIFECYCLE_SCHEMA,
    sourceIssue: identity.source_issue,
    prNumber: identity.pr,
    attempt: identity.attempt,
    triggerCommentId: identity.trigger_comment_id,
    identity: identity.identity,
    phase,
    codexTaskUrl: emptyToNull(input.codexTaskUrl),
    codexTaskId: emptyToNull(input.codexTaskId),
    headSha: emptyToNull(input.headSha),
    lastPolledAt: emptyToNull(input.lastPolledAt),
    startedAt: emptyToNull(input.startedAt),
    completedAt: emptyToNull(input.completedAt),
    completionFingerprint: emptyToNull(input.completionFingerprint),
    completionEventEmitted: Boolean(input.completionEventEmitted),
    blocker: emptyToNull(input.blocker),
  };
}

/**
 * @param {ReturnType<typeof buildCodexLifecycleState>} state
 */
export function formatCodexLifecycleStateComment(state) {
  const s = buildCodexLifecycleState(state);
  const json = JSON.stringify(s);
  return `CODEX GITHUB LIFECYCLE STATE

Identity: ${s.identity}
Phase: ${s.phase}
Source issue: ${s.sourceIssue != null ? `#${s.sourceIssue}` : 'n/a'}
PR: ${s.prNumber != null ? `#${s.prNumber}` : 'n/a'}
Attempt: ${s.attempt}
Trigger comment: ${s.triggerCommentId || 'n/a'}
Codex task: ${s.codexTaskUrl || s.codexTaskId || 'n/a'}
Completion emitted: ${s.completionEventEmitted ? 'yes' : 'no'}
Fingerprint: ${s.completionFingerprint || 'n/a'}

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
    return buildCodexLifecycleState(JSON.parse(marker[1]));
  } catch {
    return null;
  }
}

/**
 * @param {Array<{ body?: string | null }>} comments
 * @param {string | null} [identity]
 */
export function findLatestCodexLifecycleState(comments, identity = null) {
  const list = Array.isArray(comments) ? [...comments].reverse() : [];
  for (const c of list) {
    const parsed = parseCodexLifecycleStateFromText(c?.body || '');
    if (!parsed) continue;
    if (identity && parsed.identity !== identity) continue;
    return parsed;
  }
  return null;
}

/**
 * @param {{
 *   sourceIssue?: number | null,
 *   prNumber?: number | null,
 *   attempt?: number | null,
 *   triggerCommentId?: number | null,
 *   status?: string | null,
 *   headSha?: string | null,
 *   ciResult?: string | null,
 *   codexTaskId?: string | null,
 * }} input
 */
export function buildCodexCompletionFingerprint(input = {}) {
  const id = buildCodexLifecycleIdentity(input);
  return [
    'codex_github_lifecycle',
    'codex',
    id.identity,
    emptyToNull(input.status) || 'no-phase',
    emptyToNull(input.headSha) || 'no-sha',
    emptyToNull(input.ciResult) || 'no-ci',
    emptyToNull(input.codexTaskId) || 'no-task',
  ].join('|');
}

/**
 * n8n exception notifier gate — same silence rules as Cursor completion events.
 *
 * @param {ReturnType<typeof buildCodexCompletionEvent> | null | undefined} event
 * @param {{ previousFingerprint?: string | null, alreadyNotified?: boolean }} [opts]
 */
export function shouldNotifyCodexCompletionEvent(event, opts = {}) {
  if (!event || typeof event !== 'object') return false;
  const status = String(event.status || '').toUpperCase();
  if (status === 'RUNNING' || status === 'PENDING' || status === 'WORKING') return false;
  if (!event.notify) return false;
  if (status === 'COMPLETED' && !event.anton_required) return false;
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
  if (alreadyEmitted) return false;
  if (previousFingerprint && previousFingerprint === nextFingerprint) return false;
  return true;
}

/**
 * @param {{
 *   sourceIssue?: number | null,
 *   prNumber?: number | null,
 *   prUrl?: string | null,
 *   attempt?: number | null,
 *   triggerCommentId?: number | null,
 *   codexTaskUrl?: string | null,
 *   codexTaskId?: string | null,
 *   status?: string | null,
 *   headSha?: string | null,
 *   ciResult?: string | null,
 *   blocker?: string | null,
 *   nextAction?: string | null,
 *   antonRequired?: boolean,
 *   whatMoved?: string | null,
 *   branch?: string | null,
 * }} input
 */
export function buildCodexCompletionEvent(input = {}) {
  const status = emptyToNull(input.status) || 'UNKNOWN';
  const antonRequired = Boolean(input.antonRequired);
  const identity = buildCodexLifecycleIdentity({
    sourceIssue: input.sourceIssue,
    prNumber: input.prNumber,
    attempt: input.attempt,
    triggerCommentId: input.triggerCommentId,
  });
  const fingerprint = buildCodexCompletionFingerprint({
    sourceIssue: input.sourceIssue,
    prNumber: input.prNumber,
    attempt: input.attempt,
    triggerCommentId: input.triggerCommentId,
    status,
    headSha: input.headSha,
    ciResult: input.ciResult,
    codexTaskId: input.codexTaskId,
  });
  return {
    schema: CODEX_COMPLETION_EVENT_SCHEMA,
    version: 1,
    source_issue: identity.source_issue,
    executor: 'codex',
    pr: identity.pr,
    pr_url: emptyToNull(input.prUrl),
    attempt: identity.attempt,
    trigger_comment_id: identity.trigger_comment_id,
    lifecycle_identity: identity.identity,
    codex_task_url: emptyToNull(input.codexTaskUrl),
    codex_task_id: emptyToNull(input.codexTaskId),
    agent_run_id: emptyToNull(input.codexTaskId) || identity.identity,
    status,
    branch: emptyToNull(input.branch),
    sha: emptyToNull(input.headSha),
    ci_check_result: emptyToNull(input.ciResult) || 'unknown',
    what_moved: emptyToNull(input.whatMoved),
    blocker: emptyToNull(input.blocker),
    next_action: emptyToNull(input.nextAction),
    anton_required: antonRequired,
    notify: antonRequired || status === 'FAILED' || status === 'STALE',
    fingerprint,
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
PR: ${e.pr != null ? `#${e.pr}` : 'n/a'} ${e.pr_url || ''}
Attempt: ${e.attempt}
Trigger comment: ${e.trigger_comment_id || 'n/a'}
Lifecycle identity: ${e.lifecycle_identity}
Codex task: ${e.codex_task_url || e.codex_task_id || 'n/a'}
Status: ${e.status}
SHA: ${e.sha || 'n/a'}
CI/check result: ${e.ci_check_result}
What moved: ${e.what_moved || 'n/a'}
Blocker: ${e.blocker || 'n/a'}
Next action: ${e.next_action || 'n/a'}
Anton required: ${e.anton_required ? 'yes' : 'no'}
Notify: ${e.notify ? 'yes' : 'no'}
Fingerprint: ${e.fingerprint}

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
 * Format the GitHub-native @codex instruction for bot dispatch.
 *
 * @param {{
 *   mode?: 'review' | 'task',
 *   task?: string | null,
 *   sourceIssue?: number | null,
 *   attempt?: number | null,
 * }} input
 */
export function formatCodexTriggerComment(input = {}) {
  const mode = input.mode === 'task' ? 'task' : 'review';
  const sourceIssue = toPositiveInt(input.sourceIssue);
  const attempt = Math.max(1, toPositiveInt(input.attempt) || 1);
  const meta = {
    source_issue: sourceIssue,
    attempt,
    identity: CODEX_GITHUB_ACTIONS_LOGIN,
    mode,
  };
  const marker = `<!-- ${CODEX_TRIGGER_MARKER} ${JSON.stringify(meta)} -->`;
  if (mode === 'review') {
    return `@codex review

CorpFlow #661 GitHub-native Codex dispatch (executor=codex).
Source issue: ${sourceIssue != null ? `#${sourceIssue}` : 'n/a'}
Attempt: ${attempt}
Identity: ${CODEX_GITHUB_ACTIONS_LOGIN}
Do not merge. Do not touch production.

${marker}
`;
  }
  const task = emptyToNull(input.task) || 'Inspect the bounded PR context and report findings only.';
  return `@codex ${task}

CorpFlow #661 GitHub-native Codex dispatch (executor=codex).
Source issue: ${sourceIssue != null ? `#${sourceIssue}` : 'n/a'}
Attempt: ${attempt}
Identity: ${CODEX_GITHUB_ACTIONS_LOGIN}
Do not merge. Do not touch production.

${marker}
`;
}

/**
 * @param {string} body
 */
export function parseCodexTriggerMarkerFromText(body) {
  const text = String(body || '');
  const m = text.match(
    new RegExp(`<!--\\s*${CODEX_TRIGGER_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}
