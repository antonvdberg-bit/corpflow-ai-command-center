/**
 * Cursor Control Tower v0 — machine-readable activation status packets.
 *
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */

import {
  extractCursorGitDetails,
  parsePrNumberFromUrl,
} from './cursor-cloud-agent-client.js';

export { extractCursorGitDetails, parsePrNumberFromUrl };

export const CURSOR_OPS_STATUS_SCHEMA = 'corpflow.cursor_ops_status.v1';

/** Workflow artifact that contains cursor-ops-status.json */
export const DISPATCHER_ACTIVATION_RESULT_ARTIFACT_NAME = 'dispatcher-activation-result';

/** @deprecated alias — use DISPATCHER_ACTIVATION_RESULT_ARTIFACT_NAME */
export const CURSOR_OPS_STATUS_ARTIFACT_NAME = DISPATCHER_ACTIVATION_RESULT_ARTIFACT_NAME;

export const CURSOR_OPS_STATUS_FILENAME = 'cursor-ops-status.json';

export const OPERATOR_BRIDGE_ISSUE_NUMBER = 249;

/** Minutes after a successful start with no PR before consumers treat activation as stale. */
export const CURSOR_OPS_STALE_AFTER_MINUTES = 10;

/** @typedef {'started' | 'started_preflight' | 'skipped' | 'blocked' | 'failed' | 'pr_opened' | 'complete' | 'unknown' | 'stale_pending_review' | 'stale_needs_check' | 'observability_failed'} CursorActivationStatus */

/**
 * @typedef {{
 *   started_comment_posted: boolean,
 *   finished_comment_posted: boolean,
 *   comment_issue: string | null,
 *   observability_failed: boolean,
 *   observability_error: string | null,
 * }} CursorOpsObservability
 */

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgho_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]+\b/gi,
];

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function emptyToNull(value) {
  const s = value == null ? '' : String(value).trim();
  return s || null;
}

/**
 * @param {unknown} text
 */
export function redactSecretsFromText(text) {
  let s = String(text ?? '');
  for (const pattern of SECRET_PATTERNS) {
    s = s.replace(pattern, '[REDACTED]');
  }
  return s;
}

/**
 * @param {Record<string, unknown>} status
 */
export function sanitizeCursorOpsStatus(status) {
  const copy = { ...status };
  for (const key of Object.keys(copy)) {
    const value = copy[key];
    if (typeof value === 'string') {
      copy[key] = redactSecretsFromText(value);
    }
  }
  if (copy.observability && typeof copy.observability === 'object') {
    const obs = /** @type {Record<string, unknown>} */ ({ ...copy.observability });
    if (typeof obs.observability_error === 'string') {
      obs.observability_error = redactSecretsFromText(obs.observability_error);
    }
    copy.observability = obs;
  }
  return copy;
}

/**
 * @param {string | null | undefined} commentIssue
 * @returns {CursorOpsObservability}
 */
export function createEmptyObservability(commentIssue = null) {
  return {
    started_comment_posted: false,
    finished_comment_posted: false,
    comment_issue: emptyToNull(commentIssue),
    observability_failed: false,
    observability_error: null,
  };
}

/**
 * Manual workflow_dispatch + target_issue requires STARTED/FINISHED issue comments.
 *
 * @param {{ eventName?: string | null, targetIssue?: string | number | null }} ctx
 */
export function requiresStrictTargetIssueObservability(ctx = {}) {
  const eventName = String(ctx.eventName || '').trim().toLowerCase();
  const targetIssue = String(ctx.targetIssue ?? '').trim();
  return eventName === 'workflow_dispatch' && targetIssue.length > 0;
}

/**
 * @param {{ runId?: string | null, serverUrl?: string | null, repository?: string | null }} [workflow]
 */
export function resolveWorkflowRunUrl(workflow = {}) {
  const runId = emptyToNull(workflow.runId || process.env.GITHUB_RUN_ID);
  const server = String(workflow.serverUrl || process.env.GITHUB_SERVER_URL || 'https://github.com')
    .trim()
    .replace(/\/+$/, '');
  const repo = String(
    workflow.repository || process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || '',
  ).trim();
  if (!runId || !repo.includes('/')) return null;
  return `${server}/${repo}/actions/runs/${runId}`;
}

/**
 * @returns {{
 *   runId: string | null,
 *   jobId: string | null,
 *   repository: string | null,
 *   serverUrl: string | null,
 *   sha: string | null,
 *   workflowRunUrl: string | null,
 * }}
 */
export function resolveGithubWorkflowContextFromEnv() {
  const runId = emptyToNull(process.env.GITHUB_RUN_ID);
  const jobId = emptyToNull(process.env.GITHUB_JOB);
  const repository = emptyToNull(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO);
  const serverUrl = emptyToNull(process.env.GITHUB_SERVER_URL) || 'https://github.com';
  const sha = emptyToNull(process.env.GITHUB_SHA);
  return {
    runId,
    jobId,
    repository,
    serverUrl,
    sha,
    workflowRunUrl: resolveWorkflowRunUrl({ runId, serverUrl, repository }),
  };
}

/**
 * @param {Date | string | null | undefined} startedAt
 * @param {Date | string} [now]
 */
export function isCursorActivationStale(startedAt, now = new Date()) {
  if (!startedAt) return false;
  const startMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startMs)) return false;
  const nowMs = new Date(now).getTime();
  return nowMs - startMs >= CURSOR_OPS_STALE_AFTER_MINUTES * 60 * 1000;
}

/**
 * @param {{
 *   activation_status?: CursorActivationStatus,
 *   workflow_run_id?: string | null,
 *   workflow_run_url?: string | null,
 *   job_id?: string | null,
 *   activation_mode?: string | null,
 *   target_issue?: string | null,
 *   cursor_agent_url?: string | null,
 *   branch?: string | null,
 *   pr_number?: string | null,
 *   pr_url?: string | null,
 *   started_at?: string | null,
 *   last_seen_at?: string | null,
 *   blocked_reason?: string | null,
 *   need_anton?: boolean,
 *   next_check_after_minutes?: number,
 *   notes?: string | null,
 *   observability?: CursorOpsObservability,
 * }} [fields]
 */
export function buildCursorOpsStatus(fields = {}) {
  const nowIso = new Date().toISOString();
  const workflow = resolveGithubWorkflowContextFromEnv();
  return sanitizeCursorOpsStatus({
    schema: CURSOR_OPS_STATUS_SCHEMA,
    version: 1,
    activation_status: fields.activation_status || 'unknown',
    workflow_run_id: emptyToNull(fields.workflow_run_id) || workflow.runId,
    workflow_run_url:
      emptyToNull(fields.workflow_run_url) ||
      resolveWorkflowRunUrl({
        runId: fields.workflow_run_id || workflow.runId,
        serverUrl: workflow.serverUrl,
        repository: workflow.repository,
      }),
    job_id: emptyToNull(fields.job_id) || workflow.jobId,
    activation_mode: emptyToNull(fields.activation_mode) || 'dry_run',
    target_issue: emptyToNull(fields.target_issue),
    cursor_agent_url: emptyToNull(fields.cursor_agent_url),
    branch: emptyToNull(fields.branch),
    pr_number: emptyToNull(fields.pr_number),
    pr_url: emptyToNull(fields.pr_url),
    artifact_name: DISPATCHER_ACTIVATION_RESULT_ARTIFACT_NAME,
    started_at: emptyToNull(fields.started_at) || nowIso,
    last_seen_at: emptyToNull(fields.last_seen_at) || nowIso,
    blocked_reason: emptyToNull(fields.blocked_reason),
    need_anton: Boolean(fields.need_anton),
    next_check_after_minutes:
      typeof fields.next_check_after_minutes === 'number'
        ? fields.next_check_after_minutes
        : CURSOR_OPS_STALE_AFTER_MINUTES,
    notes: emptyToNull(fields.notes),
    observability: fields.observability || createEmptyObservability(fields.target_issue),
  });
}

/**
 * @param {Record<string, unknown>} baseStatus
 * @param {string | Error} error
 * @param {CursorOpsObservability} observability
 */
export function buildObservabilityFailedStatus(baseStatus, error, observability) {
  const message = redactSecretsFromText(
    error instanceof Error ? error.message : String(error),
  );
  return buildCursorOpsStatus({
    ...baseStatus,
    activation_status: 'observability_failed',
    blocked_reason: message,
    need_anton: true,
    notes: 'Manual target_issue run failed observability contract — issue comments missing.',
    observability: {
      ...observability,
      observability_failed: true,
      observability_error: message,
    },
  });
}

/**
 * @param {import('./dispatcher-agent-activation.js').DispatcherActivationMode | string} mode
 * @param {ReturnType<typeof import('./dispatcher-agent-activation.js').runDispatcherActivation> extends Promise<infer R> ? R : never | null} [result]
 * @param {{ error?: Error | string | null, targetIssue?: string | null, workflow?: { runId?: string | null, jobId?: string | null, workflowRunUrl?: string | null }, startedAt?: string | null, observability?: CursorOpsObservability }} [ctx]
 */
export function buildCursorOpsStatusFromActivation(mode, result, ctx = {}) {
  const activationMode = String(mode || 'dry_run');
  const targetIssue = emptyToNull(ctx.targetIssue);
  const workflowRunId = emptyToNull(ctx.workflow?.runId);
  const jobId = emptyToNull(ctx.workflow?.jobId);
  const workflowRunUrl = emptyToNull(ctx.workflow?.workflowRunUrl);
  const startedAt = emptyToNull(ctx.startedAt) || new Date().toISOString();
  const observability = ctx.observability || createEmptyObservability(targetIssue);
  const base = {
    workflow_run_id: workflowRunId,
    workflow_run_url: workflowRunUrl,
    job_id: jobId,
    activation_mode: activationMode,
    target_issue: targetIssue,
    started_at: startedAt,
    last_seen_at: new Date().toISOString(),
    observability,
  };

  if (ctx.error) {
    const message = redactSecretsFromText(
      ctx.error instanceof Error ? ctx.error.message : String(ctx.error),
    );
    const blocked =
      /CURSOR_API_KEY missing|CURSOR_LIVE_ENABLED|target_issue invalid|not allowed on scheduled|throughput packet/i.test(
        message,
      );
    return buildCursorOpsStatus({
      ...base,
      activation_status: blocked ? 'blocked' : 'failed',
      blocked_reason: message,
      need_anton: blocked,
      notes: blocked
        ? 'Activation did not start — resolve blocked_reason and re-run workflow_dispatch.'
        : 'Activation failed — inspect workflow logs and activation-plan.json.',
    });
  }

  if (activationMode === 'dry_run') {
    return buildCursorOpsStatus({
      ...base,
      activation_status: 'skipped',
      blocked_reason: null,
      need_anton: false,
      notes: 'dry_run — no live Cursor API call. Re-run with activation_mode=cursor_live to activate.',
    });
  }

  const cursorLive = result?.live?.cursor;
  const decisions = Array.isArray(result?.decisions) ? result.decisions : [];
  const activateDecision = decisions.find((d) => d.action === 'ACTIVATE_CURSOR');
  const skipDecision = decisions.find((d) =>
    ['SKIP_DEDUPE', 'SKIP_CURSOR_CAP', 'SKIP_GATED', 'SKIP_NO_ACTION'].includes(d.action),
  );

  if (!cursorLive && !activateDecision) {
    const blockedDecision = decisions.find((d) =>
      ['SKIP_GATED', 'SKIP_OPERATOR_GATE', 'SKIP_THROUGHPUT_PACKET'].includes(d.action),
    );
    const reason = skipDecision
      ? `${skipDecision.action} for ${skipDecision.objectRef || 'routing'}`
      : blockedDecision
        ? `${blockedDecision.action} for ${blockedDecision.objectRef || 'routing'}`
        : 'No eligible cursor activation in dispatcher plan';
    return buildCursorOpsStatus({
      ...base,
      activation_status: blockedDecision ? 'blocked' : 'skipped',
      blocked_reason: reason,
      need_anton: Boolean(blockedDecision),
      notes: 'No Cursor agent was started for this run.',
    });
  }

  if (!cursorLive) {
    return buildCursorOpsStatus({
      ...base,
      activation_status: 'unknown',
      blocked_reason: 'cursor_live completed without live.cursor details',
      need_anton: true,
      notes: 'Inspect activation-plan.json and workflow logs.',
    });
  }

  const prUrl = emptyToNull(cursorLive.prUrl);
  const prNumber = emptyToNull(cursorLive.prNumber);
  const hasPr = Boolean(prUrl || prNumber);
  let activationStatus = /** @type {CursorActivationStatus} */ ('started');
  let notes = 'Cursor agent started. PR not visible yet — re-check artifact after 10 minutes.';

  if (hasPr) {
    activationStatus = 'pr_opened';
    notes = 'Cursor agent started and a PR URL/number is visible.';
  } else if (isCursorActivationStale(startedAt)) {
    activationStatus = 'stale_pending_review';
    notes = `No PR visible within ${CURSOR_OPS_STALE_AFTER_MINUTES} minutes after start — treat as stale_pending_review.`;
  }

  return buildCursorOpsStatus({
    ...base,
    activation_status: activationStatus,
    cursor_agent_url: emptyToNull(cursorLive.agentUrl),
    branch: emptyToNull(cursorLive.branch),
    pr_number: prNumber,
    pr_url: prUrl,
    blocked_reason: null,
    need_anton: activationStatus === 'stale_pending_review',
    next_check_after_minutes: hasPr ? 0 : CURSOR_OPS_STALE_AFTER_MINUTES,
    notes,
  });
}

/**
 * @param {{
 *   targetIssue: string | number,
 *   activationMode: string,
 *   workflowRunId?: string | null,
 *   workflowRunUrl?: string | null,
 *   commitSha?: string | null,
 * }} ctx
 */
export function formatCursorActivationStartedComment(ctx) {
  return [
    '## Cursor activation started',
    '',
    `- **activation_status:** started_preflight`,
    `- **workflow_run_id:** ${emptyToNull(ctx.workflowRunId) || 'n/a'}`,
    `- **workflow_run_url:** ${emptyToNull(ctx.workflowRunUrl) || 'n/a'}`,
    `- **activation_mode:** ${ctx.activationMode || 'n/a'}`,
    `- **target_issue:** ${ctx.targetIssue}`,
    `- **commit SHA:** ${emptyToNull(ctx.commitSha) || 'n/a'}`,
    `- **artifact name expected:** ${DISPATCHER_ACTIVATION_RESULT_ARTIFACT_NAME}`,
    `- **need_anton:** no`,
    '',
    '_Cursor has not necessarily started yet. A **Cursor activation finished** comment will follow this run._',
  ].join('\n');
}

/**
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 */
export function formatCursorActivationFinishedComment(status) {
  return [
    '## Cursor activation finished',
    '',
    `- **activation_status:** ${status.activation_status}`,
    `- **workflow_run_id:** ${status.workflow_run_id || 'n/a'}`,
    `- **workflow_run_url:** ${status.workflow_run_url || 'n/a'}`,
    `- **job:** ${status.job_id || 'n/a'}`,
    `- **activation_mode:** ${status.activation_mode || 'n/a'}`,
    `- **target_issue:** ${status.target_issue || 'n/a'}`,
    `- **cursor_agent_url:** ${status.cursor_agent_url || 'n/a'}`,
    `- **pr_number:** ${status.pr_number || 'n/a'}`,
    `- **pr_url:** ${status.pr_url || 'n/a'}`,
    `- **blocked_reason:** ${status.blocked_reason || 'n/a'}`,
    `- **artifact name:** ${status.artifact_name || DISPATCHER_ACTIVATION_RESULT_ARTIFACT_NAME}`,
    `- **need_anton:** ${status.need_anton ? 'yes' : 'no'}`,
    `- **next_check_after_minutes:** ${status.next_check_after_minutes ?? CURSOR_OPS_STALE_AFTER_MINUTES}`,
    status.notes ? `- **notes:** ${status.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 */
export function formatCursorOpsStatusLogBlock(status) {
  return [
    '========== CURSOR OPS STATUS ==========',
    `activation_status: ${status.activation_status}`,
    `activation_mode: ${status.activation_mode}`,
    `target_issue: ${status.target_issue || '(none)'}`,
    `workflow_run_id: ${status.workflow_run_id || 'n/a'}`,
    `workflow_run_url: ${status.workflow_run_url || 'n/a'}`,
    `job_id: ${status.job_id || 'n/a'}`,
    `cursor_agent_url: ${status.cursor_agent_url || 'n/a'}`,
    `branch: ${status.branch || 'n/a'}`,
    `pr_number: ${status.pr_number || 'n/a'}`,
    `pr_url: ${status.pr_url || 'n/a'}`,
    `blocked_reason: ${status.blocked_reason || 'n/a'}`,
    `need_anton: ${status.need_anton ? 'true' : 'false'}`,
    `next_check_after_minutes: ${status.next_check_after_minutes}`,
    `artifact_name: ${status.artifact_name}`,
    `observability.started_comment_posted: ${status.observability?.started_comment_posted ? 'true' : 'false'}`,
    `observability.finished_comment_posted: ${status.observability?.finished_comment_posted ? 'true' : 'false'}`,
    `notes: ${status.notes || 'n/a'}`,
    '=======================================',
  ].join('\n');
}

/**
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 */
export function formatCursorOpsStatusComment(status) {
  return formatCursorActivationFinishedComment(status);
}

/**
 * @param {string | number} issueNumber
 * @param {string} body
 * @param {{ token?: string, repoFullName?: string, fetch?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<{ ok: true, issueNumber: number, commentId: string | null, commentUrl: string | null }>}
 */
export async function postGitHubIssueComment(issueNumber, body, opts = {}) {
  const token = String(opts.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  if (!token) {
    throw new Error('GITHUB_TOKEN missing — cannot post GitHub issue comment');
  }

  const repo = String(
    opts.repoFullName || process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || '',
  ).trim();
  if (!repo.includes('/')) {
    throw new Error('GITHUB_REPOSITORY missing — cannot post GitHub issue comment');
  }

  const issue = Number(issueNumber);
  if (!Number.isInteger(issue) || issue < 1) {
    throw new Error(`Invalid GitHub issue number: ${issueNumber}`);
  }

  const fetchFn = opts.fetch || globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? 30000;
  const url = `https://api.github.com/repos/${repo}/issues/${issue}/comments`;

  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: redactSecretsFromText(body) }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub comment HTTP ${res.status}: ${redactSecretsFromText(text.slice(0, 300))}`);
  }

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    ok: true,
    issueNumber: issue,
    commentId: json && typeof json === 'object' && json.id != null ? String(json.id) : null,
    commentUrl: json && typeof json === 'object' && json.html_url ? String(json.html_url) : null,
  };
}

/**
 * @param {{
 *   targetIssue: string | number,
 *   activationMode: string,
 *   workflowRunId?: string | null,
 *   workflowRunUrl?: string | null,
 *   commitSha?: string | null,
 * }} ctx
 * @param {{ token?: string, repoFullName?: string, fetch?: typeof fetch }} [opts]
 */
export async function postCursorActivationStartedComment(ctx, opts = {}) {
  const body = formatCursorActivationStartedComment(ctx);
  return postGitHubIssueComment(ctx.targetIssue, body, opts);
}

/**
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 * @param {{ token?: string, repoFullName?: string, fetch?: typeof fetch }} [opts]
 */
export async function postCursorActivationFinishedComment(status, opts = {}) {
  const issueNumber = status.target_issue
    ? Number(status.target_issue)
    : OPERATOR_BRIDGE_ISSUE_NUMBER;
  const body = formatCursorActivationFinishedComment(status);
  return postGitHubIssueComment(issueNumber, body, opts);
}

/**
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 * @param {{ token?: string, repoFullName?: string, fetch?: typeof fetch }} [opts]
 */
export async function postCursorOpsStatusComment(status, opts = {}) {
  return postCursorActivationFinishedComment(status, opts);
}

/**
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 * @param {Date | string} [now]
 */
export function applyStaleRuleToStatus(status, now = new Date()) {
  if (!status || typeof status !== 'object') return status;
  if (status.pr_url || status.pr_number) return status;
  if (status.activation_status !== 'started') return status;

  if (!isCursorActivationStale(status.started_at, now)) {
    return status;
  }

  return buildCursorOpsStatus({
    ...status,
    activation_status: 'stale_pending_review',
    need_anton: true,
    next_check_after_minutes: 0,
    notes: `No PR visible within ${CURSOR_OPS_STALE_AFTER_MINUTES} minutes after start — stale_pending_review.`,
    last_seen_at: new Date(now).toISOString(),
    observability: status.observability || createEmptyObservability(status.target_issue),
  });
}

/**
 * @param {{
 *   eventName?: string | null,
 *   targetIssue?: string | number | null,
 *   githubToken?: string | null,
 * }} ctx
 */
export function assertStrictTargetIssueObservabilityPrerequisites(ctx = {}) {
  if (!requiresStrictTargetIssueObservability(ctx)) {
    return;
  }
  const token = String(ctx.githubToken || '').trim();
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN missing — manual target_issue run requires STARTED/FINISHED issue comments (fail closed)',
    );
  }
}
