/**
 * Durable evidence packets for Factory dispatcher activate runs.
 * Posted to the control issue (#661 by default) so silent/missing runs are detectable.
 *
 * Never includes secret values.
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 */

export const DISPATCHER_RUN_EVIDENCE_SCHEMA = 'corpflow.dispatcher_run_evidence.v1';

/** Canonical control-loop issue for #661 evidence. */
export const DEFAULT_DISPATCHER_CONTROL_ISSUE = 661;

/**
 * @param {Record<string, unknown>} input
 */
export function buildDispatcherRunStartedEvidence(input = {}) {
  const runId = emptyToNull(input.runId) || emptyToNull(input.workflowRunId);
  const mode = String(input.mode || input.activationMode || 'unknown').trim() || 'unknown';
  const eventName = String(input.eventName || 'unknown').trim() || 'unknown';
  const headSha = emptyToNull(input.headSha) || emptyToNull(input.commitSha);
  const targetIssue = emptyToNull(input.targetIssue);
  const liveEnabledConfigured = Boolean(input.liveEnabledConfigured);
  const liveEnabledTruthy = Boolean(input.liveEnabledTruthy);
  const runUrl = emptyToNull(input.runUrl) || emptyToNull(input.workflowRunUrl);

  return {
    schema: DISPATCHER_RUN_EVIDENCE_SCHEMA,
    phase: 'started',
    generated_at: new Date().toISOString(),
    workflow_run_id: runId,
    workflow_run_url: runUrl,
    event_name: eventName,
    activation_mode: mode,
    head_sha: headSha,
    target_issue_input: targetIssue,
    cursor_live_enabled_configured: liveEnabledConfigured,
    cursor_live_enabled_truthy: liveEnabledTruthy,
    markdown: formatStartedMarkdown({
      runId,
      runUrl,
      eventName,
      mode,
      headSha,
      targetIssue,
      liveEnabledConfigured,
      liveEnabledTruthy,
    }),
  };
}

/**
 * @param {Record<string, unknown>} input
 */
export function buildDispatcherRunFinishedEvidence(input = {}) {
  const runId = emptyToNull(input.runId) || emptyToNull(input.workflowRunId);
  const mode = String(input.mode || input.activationMode || 'unknown').trim() || 'unknown';
  const eventName = String(input.eventName || 'unknown').trim() || 'unknown';
  const activationStatus = String(input.activationStatus || 'unknown').trim() || 'unknown';
  const selectedIssue = emptyToNull(input.selectedIssue) || emptyToNull(input.activationTargetIssue);
  const cursorRunId = emptyToNull(input.cursorRunId) || emptyToNull(input.cursorAgentId);
  const cursorApiAttempted = Boolean(input.cursorApiAttempted);
  const eligibleIssues = Array.isArray(input.eligibleIssues)
    ? input.eligibleIssues.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const readyIssues = Array.isArray(input.readyIssues)
    ? input.readyIssues.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const blocker = emptyToNull(input.blocker) || emptyToNull(input.blockedReason);
  const runUrl = emptyToNull(input.runUrl) || emptyToNull(input.workflowRunUrl);
  const headSha = emptyToNull(input.headSha) || emptyToNull(input.commitSha);

  return {
    schema: DISPATCHER_RUN_EVIDENCE_SCHEMA,
    phase: 'finished',
    generated_at: new Date().toISOString(),
    workflow_run_id: runId,
    workflow_run_url: runUrl,
    event_name: eventName,
    activation_mode: mode,
    head_sha: headSha,
    activation_status: activationStatus,
    selected_issue: selectedIssue,
    cursor_run_id: cursorRunId,
    cursor_api_attempted: cursorApiAttempted,
    ready_issues: readyIssues,
    eligible_issues: eligibleIssues,
    blocker,
    markdown: formatFinishedMarkdown({
      runId,
      runUrl,
      eventName,
      mode,
      headSha,
      activationStatus,
      selectedIssue,
      cursorRunId,
      cursorApiAttempted,
      readyIssues,
      eligibleIssues,
      blocker,
    }),
  };
}

/**
 * Classify “operator said they ran it but no Actions run exists”.
 *
 * @param {{
 *   claimedManualTriggerAt?: string | null,
 *   latestDispatcherRunCreatedAt?: string | null,
 *   mergeCommitAt?: string | null,
 *   nowIso?: string,
 * }} input
 */
export function classifyMissingDispatcherRunEvidence(input = {}) {
  const claimed = input.claimedManualTriggerAt ? Date.parse(input.claimedManualTriggerAt) : NaN;
  const latest = input.latestDispatcherRunCreatedAt
    ? Date.parse(input.latestDispatcherRunCreatedAt)
    : NaN;
  const merged = input.mergeCommitAt ? Date.parse(input.mergeCommitAt) : NaN;
  const now = Date.parse(input.nowIso || new Date().toISOString());

  if (!Number.isFinite(latest)) {
    return {
      category: 'no_dispatcher_runs_found',
      anton_action_required: true,
      message:
        'No Factory dispatcher activate runs found via GitHub API. Paste the Actions run URL or re-open Actions → Factory dispatcher activate and confirm a run ID appears.',
    };
  }

  if (Number.isFinite(merged) && latest < merged) {
    return {
      category: 'no_run_after_merge',
      anton_action_required: true,
      message:
        'Latest dispatcher run predates the repair merge. No post-merge schedule or workflow_dispatch run exists. Confirm the Actions run was created (branch main, workflow Factory dispatcher activate) and paste the run URL.',
      latest_run_at: new Date(latest).toISOString(),
      merge_at: new Date(merged).toISOString(),
    };
  }

  if (Number.isFinite(claimed) && Number.isFinite(latest) && latest < claimed) {
    return {
      category: 'manual_trigger_left_no_run',
      anton_action_required: true,
      message:
        'Operator reported a manual trigger, but no newer Actions run exists after that claim. Likely the Run workflow form did not submit, the wrong workflow was used, or the run is not visible. Paste the run URL from the Actions tab if one exists.',
      claimed_at: new Date(claimed).toISOString(),
      latest_run_at: new Date(latest).toISOString(),
      age_minutes_since_latest: Math.round((now - latest) / 60000),
    };
  }

  return {
    category: 'run_exists',
    anton_action_required: false,
    message: 'A dispatcher run exists for inspection.',
    latest_run_at: new Date(latest).toISOString(),
  };
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
 * @param {Record<string, unknown>} p
 */
function formatStartedMarkdown(p) {
  return `DISPATCHER RUN STARTED

Actions run ID: ${p.runId || 'unknown'}
Run URL: ${p.runUrl || 'n/a'}
Event: ${p.eventName}
Activation mode: ${p.mode}
Head SHA: ${p.headSha || 'unknown'}
target_issue input: ${p.targetIssue || '(blank)'}
CURSOR_LIVE_ENABLED configured: ${p.liveEnabledConfigured ? 'yes' : 'no'}
CURSOR_LIVE_ENABLED truthy: ${p.liveEnabledTruthy ? 'yes' : 'no'}

This comment proves the workflow job started. Absence of this comment after a claimed manual trigger means no Actions run was created or comment posting failed.
`;
}

/**
 * @param {Record<string, unknown>} p
 */
function formatFinishedMarkdown(p) {
  const ready = Array.isArray(p.readyIssues) && p.readyIssues.length ? p.readyIssues.join(', ') : 'none';
  const eligible =
    Array.isArray(p.eligibleIssues) && p.eligibleIssues.length ? p.eligibleIssues.join(', ') : 'none';

  return `DISPATCHER RUN FINISHED

Actions run ID: ${p.runId || 'unknown'}
Run URL: ${p.runUrl || 'n/a'}
Event: ${p.eventName}
Activation mode: ${p.mode}
Head SHA: ${p.headSha || 'unknown'}
Activation status: ${p.activationStatus}
Ready issues discovered: ${ready}
Eligible issues: ${eligible}
Selected source issue: ${p.selectedIssue || 'none'}
Cursor API attempted: ${p.cursorApiAttempted ? 'yes' : 'no'}
Cursor run ID: ${p.cursorRunId || 'none'}
Blocker: ${p.blocker || 'none'}

Claim labels must only exist when Cursor run ID is non-empty.
`;
}
