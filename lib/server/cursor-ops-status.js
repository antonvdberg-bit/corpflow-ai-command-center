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

export const CURSOR_OPS_STATUS_ARTIFACT_NAME = 'cursor-ops-status';

export const CURSOR_OPS_STATUS_FILENAME = 'cursor-ops-status.json';

export const OPERATOR_BRIDGE_ISSUE_NUMBER = 249;

/** Minutes after a successful start with no PR before consumers treat activation as stale. */
export const CURSOR_OPS_STALE_AFTER_MINUTES = 10;

/** @typedef {'started' | 'skipped' | 'blocked' | 'failed' | 'pr_opened' | 'complete' | 'unknown' | 'stale_pending_review' | 'stale_needs_check'} CursorActivationStatus */

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
  return copy;
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
 * }} [fields]
 */
export function buildCursorOpsStatus(fields = {}) {
  const nowIso = new Date().toISOString();
  return sanitizeCursorOpsStatus({
    schema: CURSOR_OPS_STATUS_SCHEMA,
    version: 1,
    activation_status: fields.activation_status || 'unknown',
    workflow_run_id: emptyToNull(fields.workflow_run_id),
    job_id: emptyToNull(fields.job_id),
    activation_mode: emptyToNull(fields.activation_mode) || 'dry_run',
    target_issue: emptyToNull(fields.target_issue),
    cursor_agent_url: emptyToNull(fields.cursor_agent_url),
    branch: emptyToNull(fields.branch),
    pr_number: emptyToNull(fields.pr_number),
    pr_url: emptyToNull(fields.pr_url),
    artifact_name: CURSOR_OPS_STATUS_ARTIFACT_NAME,
    started_at: emptyToNull(fields.started_at) || nowIso,
    last_seen_at: emptyToNull(fields.last_seen_at) || nowIso,
    blocked_reason: emptyToNull(fields.blocked_reason),
    need_anton: Boolean(fields.need_anton),
    next_check_after_minutes:
      typeof fields.next_check_after_minutes === 'number'
        ? fields.next_check_after_minutes
        : CURSOR_OPS_STALE_AFTER_MINUTES,
    notes: emptyToNull(fields.notes),
  });
}

/**
 * @param {import('./dispatcher-agent-activation.js').DispatcherActivationMode | string} mode
 * @param {ReturnType<typeof import('./dispatcher-agent-activation.js').runDispatcherActivation> extends Promise<infer R> ? R : never | null} [result]
 * @param {{ error?: Error | string | null, targetIssue?: string | null, workflow?: { runId?: string | null, jobId?: string | null }, startedAt?: string | null }} [ctx]
 */
export function buildCursorOpsStatusFromActivation(mode, result, ctx = {}) {
  const activationMode = String(mode || 'dry_run');
  const targetIssue = emptyToNull(ctx.targetIssue);
  const workflowRunId = emptyToNull(ctx.workflow?.runId);
  const jobId = emptyToNull(ctx.workflow?.jobId);
  const startedAt = emptyToNull(ctx.startedAt) || new Date().toISOString();
  const base = {
    workflow_run_id: workflowRunId,
    job_id: jobId,
    activation_mode: activationMode,
    target_issue: targetIssue,
    started_at: startedAt,
    last_seen_at: new Date().toISOString(),
  };

  if (ctx.error) {
    const message = redactSecretsFromText(
      ctx.error instanceof Error ? ctx.error.message : String(ctx.error),
    );
    const blocked = /CURSOR_API_KEY missing|target_issue invalid|not allowed on scheduled/i.test(
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
      ['SKIP_GATED', 'SKIP_OPERATOR_GATE'].includes(d.action),
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
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 */
export function formatCursorOpsStatusLogBlock(status) {
  const workflowUrl =
    status.workflow_run_id && process.env.GITHUB_REPOSITORY
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${status.workflow_run_id}`
      : status.workflow_run_id
        ? `(run ${status.workflow_run_id})`
        : 'n/a';

  return [
    '========== CURSOR OPS STATUS ==========',
    `activation_status: ${status.activation_status}`,
    `activation_mode: ${status.activation_mode}`,
    `target_issue: ${status.target_issue || '(none)'}`,
    `workflow_run: ${workflowUrl}`,
    `job_id: ${status.job_id || 'n/a'}`,
    `cursor_agent_url: ${status.cursor_agent_url || 'n/a'}`,
    `branch: ${status.branch || 'n/a'}`,
    `pr_number: ${status.pr_number || 'n/a'}`,
    `pr_url: ${status.pr_url || 'n/a'}`,
    `blocked_reason: ${status.blocked_reason || 'n/a'}`,
    `need_anton: ${status.need_anton ? 'true' : 'false'}`,
    `next_check_after_minutes: ${status.next_check_after_minutes}`,
    `artifact_name: ${status.artifact_name}`,
    `notes: ${status.notes || 'n/a'}`,
    '=======================================',
  ].join('\n');
}

/**
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 */
export function formatCursorOpsStatusComment(status) {
  const workflowUrl =
    status.workflow_run_id && process.env.GITHUB_REPOSITORY
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${status.workflow_run_id}`
      : 'n/a';

  return [
    '**Cursor activation status** (Control Tower v0)',
    '',
    `- **Status:** ${status.activation_status}`,
    `- **Workflow run:** ${workflowUrl}`,
    `- **Target issue:** ${status.target_issue || '(dispatcher path)'}`,
    `- **Cursor agent:** ${status.cursor_agent_url || 'n/a'}`,
    `- **PR:** ${status.pr_url || status.pr_number || 'n/a'}`,
    `- **Blocked reason:** ${status.blocked_reason || 'n/a'}`,
    `- **Need Anton:** ${status.need_anton ? 'yes' : 'no'}`,
    '',
    `Artifact: \`${status.artifact_name}\` / \`${CURSOR_OPS_STATUS_FILENAME}\``,
    status.notes ? `\n_${status.notes}_` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {number} issueNumber
 * @param {string} body
 * @param {{ token?: string, repoFullName?: string, fetch?: typeof fetch, timeoutMs?: number }} [opts]
 */
export async function postGitHubIssueComment(issueNumber, body, opts = {}) {
  const token = String(opts.token || '').trim();
  if (!token) {
    throw new Error('GITHUB_TOKEN missing — cannot post Cursor ops status comment');
  }

  const repo = String(opts.repoFullName || process.env.GITHUB_REPO || '').trim();
  if (!repo.includes('/')) {
    throw new Error('GITHUB_REPO missing — cannot post Cursor ops status comment');
  }

  const fetchFn = opts.fetch || globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? 30000;
  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`;

  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub comment HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 * @param {{ token?: string, repoFullName?: string, fetch?: typeof fetch }} [opts]
 */
export async function postCursorOpsStatusComment(status, opts = {}) {
  const issueNumber = status.target_issue
    ? Number(status.target_issue)
    : OPERATOR_BRIDGE_ISSUE_NUMBER;
  if (!Number.isInteger(issueNumber) || issueNumber < 1) {
    throw new Error('Invalid issue number for Cursor ops status comment');
  }

  const body = formatCursorOpsStatusComment(status);
  return postGitHubIssueComment(issueNumber, body, opts);
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
  });
}
