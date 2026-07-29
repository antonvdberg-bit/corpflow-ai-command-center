/**
 * Active-agent control loop — status persistence, stale detection, recovery.
 *
 * File-backed state (no second DB). Consumes cursor-ops-status, dispatch scan,
 * and issue metadata; emits one follow-up / requeue / blocker per stale run.
 *
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md
 */

export const ACTIVE_AGENT_CONTROL_LOOP_SCHEMA = 'corpflow.active_agent_control_loop.v1';

export const ACTIVE_AGENT_STATE_VERSION = 1;

/** Default artifact-relative state directory (GHA cache or local). */
export const DEFAULT_STATE_DIR = '.active-agent-state';

export const ACTIVE_AGENT_STATE_FILENAME = 'runs.json';

export const ACTIVE_AGENT_REPORT_FILENAME = 'control-loop-report.json';

/** @typedef {'cursor' | 'codex'} AgentProvider */

/** @typedef {'pending' | 'running' | 'awaiting_review' | 'complete' | 'stale' | 'blocked' | 'false_claim'} AgentRunPhase */

/**
 * @typedef {{
 *   provider: AgentProvider,
 *   runId: string | null,
 *   issueNumber: number | null,
 *   branch: string | null,
 *   prNumber: number | null,
 *   prUrl: string | null,
 *   startedAt: string,
 *   lastMovementAt: string,
 *   phase: AgentRunPhase,
 *   workflowRunId: string | null,
 *   workflowRunUrl: string | null,
 *   followUpSentAt: string | null,
 *   claimedButNoRunId: boolean,
 *   disconnectedPr: boolean,
 *   notes: string | null,
 * }} AgentRunRecord
 */

/**
 * @typedef {{
 *   cursorMinutesNoMovement: number,
 *   codexMinutesNoMovement: number,
 *   readyNeverActivatedMinutes: number,
 * }} StaleThresholds
 */

export const DEFAULT_STALE_THRESHOLDS = Object.freeze({
  cursorMinutesNoMovement: 12 * 60,
  codexMinutesNoMovement: 24 * 60,
  readyNeverActivatedMinutes: 60,
});

/**
 * @typedef {{
 *   schema: string,
 *   version: number,
 *   updatedAt: string,
 *   runs: AgentRunRecord[],
 * }} ActiveAgentState
 */

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function emptyToNull(value) {
  const s = value == null ? '' : String(value).trim();
  return s || null;
}

/**
 * @param {unknown} raw
 * @returns {ActiveAgentState}
 */
export function normalizeActiveAgentState(raw) {
  const base = {
    schema: ACTIVE_AGENT_CONTROL_LOOP_SCHEMA,
    version: ACTIVE_AGENT_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    runs: [],
  };
  if (!raw || typeof raw !== 'object') return base;
  const obj = /** @type {Record<string, unknown>} */ (raw);
  const runs = Array.isArray(obj.runs)
    ? obj.runs.map((r) => normalizeRunRecord(r)).filter(Boolean)
    : [];
  return {
    schema: ACTIVE_AGENT_CONTROL_LOOP_SCHEMA,
    version: ACTIVE_AGENT_STATE_VERSION,
    updatedAt: emptyToNull(obj.updatedAt) || base.updatedAt,
    runs,
  };
}

/**
 * @param {unknown} raw
 * @returns {AgentRunRecord | null}
 */
export function normalizeRunRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const r = /** @type {Record<string, unknown>} */ (raw);
  const provider = r.provider === 'codex' ? 'codex' : 'cursor';
  const phaseRaw = String(r.phase || 'running');
  /** @type {AgentRunPhase} */
  const phase =
    phaseRaw === 'pending' ||
    phaseRaw === 'running' ||
    phaseRaw === 'awaiting_review' ||
    phaseRaw === 'complete' ||
    phaseRaw === 'stale' ||
    phaseRaw === 'blocked' ||
    phaseRaw === 'false_claim'
      ? phaseRaw
      : 'running';
  const issueNumber =
    r.issueNumber != null && Number.isFinite(Number(r.issueNumber))
      ? Number(r.issueNumber)
      : null;
  const prNumber =
    r.prNumber != null && Number.isFinite(Number(r.prNumber)) ? Number(r.prNumber) : null;
  const startedAt = emptyToNull(r.startedAt) || new Date().toISOString();
  return {
    provider,
    runId: emptyToNull(r.runId),
    issueNumber,
    branch: emptyToNull(r.branch),
    prNumber,
    prUrl: emptyToNull(r.prUrl),
    startedAt,
    lastMovementAt: emptyToNull(r.lastMovementAt) || startedAt,
    phase,
    workflowRunId: emptyToNull(r.workflowRunId),
    workflowRunUrl: emptyToNull(r.workflowRunUrl),
    followUpSentAt: emptyToNull(r.followUpSentAt),
    claimedButNoRunId: Boolean(r.claimedButNoRunId),
    disconnectedPr: Boolean(r.disconnectedPr),
    notes: emptyToNull(r.notes),
  };
}

/**
 * Stable key for deduplicating runs in state.
 *
 * @param {AgentRunRecord} run
 */
export function runRecordKey(run) {
  if (run.runId) return `${run.provider}:run:${run.runId}`;
  if (run.issueNumber != null) return `${run.provider}:issue:${run.issueNumber}`;
  return `${run.provider}:branch:${run.branch || 'unknown'}`;
}

/**
 * @param {ActiveAgentState} state
 * @param {AgentRunRecord} record
 * @returns {ActiveAgentState}
 */
export function upsertRunRecord(state, record) {
  const key = runRecordKey(record);
  const runs = [...state.runs];
  const idx = runs.findIndex((r) => runRecordKey(r) === key);
  if (idx >= 0) {
    const prev = runs[idx];
    runs[idx] = {
      ...prev,
      ...record,
      followUpSentAt: record.followUpSentAt ?? prev.followUpSentAt,
      startedAt: prev.startedAt || record.startedAt,
    };
  } else {
    runs.push(record);
  }
  return {
    ...state,
    updatedAt: new Date().toISOString(),
    runs,
  };
}

/**
 * Map cursor-ops-status artifact into a run record.
 *
 * @param {Record<string, unknown>} status
 * @returns {AgentRunRecord | null}
 */
export function runRecordFromCursorOpsStatus(status) {
  if (!status || typeof status !== 'object') return null;
  const targetIssue = status.target_issue;
  const issueNumber =
    targetIssue != null && Number.isFinite(Number(targetIssue)) ? Number(targetIssue) : null;
  const activationStatus = String(status.activation_status || 'unknown');
  /** @type {AgentRunPhase} */
  let phase = 'running';
  if (activationStatus === 'complete' || activationStatus === 'pr_opened') {
    phase = activationStatus === 'complete' ? 'complete' : 'awaiting_review';
  } else if (
    activationStatus === 'stale_pending_review' ||
    activationStatus === 'stale_needs_check'
  ) {
    phase = 'stale';
  } else if (activationStatus === 'blocked' || activationStatus === 'failed') {
    phase = 'blocked';
  } else if (activationStatus === 'skipped') {
    phase = 'pending';
  }

  const runId = emptyToNull(status.cursor_agent_url)?.split('/').pop() || null;
  const prNumberRaw = status.pr_number;
  const prNumber =
    prNumberRaw != null && Number.isFinite(Number(prNumberRaw)) ? Number(prNumberRaw) : null;

  return normalizeRunRecord({
    provider: 'cursor',
    runId,
    issueNumber,
    branch: status.branch,
    prNumber,
    prUrl: status.pr_url,
    startedAt: status.started_at,
    lastMovementAt: status.last_seen_at || status.started_at,
    phase,
    workflowRunId: status.workflow_run_id,
    workflowRunUrl: status.workflow_run_url,
    claimedButNoRunId: issueNumber != null && !runId && activationStatus === 'started',
    notes: status.notes,
  });
}

/**
 * @param {{
 *   number: number,
 *   labels?: unknown,
 *   updatedAt?: string | null,
 * }} issue
 * @param {{ agentRunId?: string | null, branch?: string | null }} [claim]
 */
export function runRecordFromClaimedIssue(issue, claim = {}) {
  const issueNumber = Number(issue?.number);
  if (!Number.isFinite(issueNumber)) return null;
  const runId = emptyToNull(claim.agentRunId);
  const labels = Array.isArray(issue.labels)
    ? issue.labels.map((l) => (typeof l === 'string' ? l : String(l?.name || '')))
    : [];
  const claimed = labels.some((l) => l.toLowerCase() === 'dispatch:cursor-claimed');
  if (!claimed) return null;

  return normalizeRunRecord({
    provider: 'cursor',
    runId,
    issueNumber,
    branch: claim.branch,
    startedAt: issue.updatedAt || new Date().toISOString(),
    lastMovementAt: issue.updatedAt || new Date().toISOString(),
    phase: runId ? 'running' : 'false_claim',
    claimedButNoRunId: !runId,
    notes: runId ? null : 'Issue claimed but no Cursor run ID recorded',
  });
}

/**
 * @param {AgentRunRecord} run
 * @param {string | Date} [now]
 * @param {StaleThresholds} [thresholds]
 */
export function minutesSinceMovement(run, now = new Date(), thresholds = DEFAULT_STALE_THRESHOLDS) {
  const last = Date.parse(run.lastMovementAt);
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(last) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.round((nowMs - last) / 60000));
}

/**
 * @param {AgentRunRecord} run
 * @param {string | Date} [now]
 * @param {StaleThresholds} [thresholds]
 */
export function isRunStale(run, now = new Date(), thresholds = DEFAULT_STALE_THRESHOLDS) {
  if (run.phase === 'complete' || run.phase === 'blocked') return false;
  const mins = minutesSinceMovement(run, now, thresholds);
  const limit =
    run.provider === 'codex'
      ? thresholds.codexMinutesNoMovement
      : thresholds.cursorMinutesNoMovement;
  return mins >= limit;
}

/**
 * @param {AgentRunRecord} run
 */
export function isFalseClaimedState(run) {
  return run.claimedButNoRunId === true || run.phase === 'false_claim';
}

/**
 * Detect PR disconnected from issue (claimed issue but PR references different issue).
 *
 * @param {AgentRunRecord} run
 * @param {{ issueNumber?: number | null }[]} [openPrs]
 */
export function isDisconnectedPr(run, openPrs = []) {
  if (run.issueNumber == null || !run.prNumber) return false;
  const pr = openPrs.find((p) => p.issueNumber === run.prNumber);
  if (!pr) return run.disconnectedPr;
  return pr.issueNumber != null && pr.issueNumber !== run.issueNumber;
}

/**
 * Ready-labelled issues that were never activated.
 *
 * @param {Array<{ number: number, labels?: unknown, createdAt?: string | null, updatedAt?: string | null }>} readyIssues
 * @param {AgentRunRecord[]} runs
 * @param {string | Date} [now]
 * @param {StaleThresholds} [thresholds]
 */
export function detectReadyNeverActivated(readyIssues, runs, now = new Date(), thresholds = DEFAULT_STALE_THRESHOLDS) {
  const activeIssueNumbers = new Set(
    runs
      .filter((r) => r.provider === 'cursor' && r.issueNumber != null && r.phase !== 'complete')
      .map((r) => r.issueNumber),
  );
  const nowMs = new Date(now).getTime();
  const limitMs = thresholds.readyNeverActivatedMinutes * 60 * 1000;
  /** @type {Array<{ issueNumber: number, minutesWaiting: number, reason: string }>} */
  const findings = [];

  for (const issue of readyIssues || []) {
    const num = Number(issue.number);
    if (!Number.isFinite(num)) continue;
    if (activeIssueNumbers.has(num)) continue;
    const labels = Array.isArray(issue.labels)
      ? issue.labels.map((l) => (typeof l === 'string' ? l : String(l?.name || '')).toLowerCase())
      : [];
    if (!labels.includes('dispatch:cursor-ready')) continue;
    if (labels.includes('dispatch:cursor-claimed')) continue;
    const anchor = issue.updatedAt || issue.createdAt;
    const anchorMs = anchor ? Date.parse(String(anchor)) : NaN;
    if (!Number.isFinite(anchorMs)) continue;
    const waiting = nowMs - anchorMs;
    if (waiting < limitMs) continue;
    findings.push({
      issueNumber: num,
      minutesWaiting: Math.round(waiting / 60000),
      reason: 'dispatch:cursor-ready without activation or claim beyond threshold',
    });
  }
  return findings;
}

/**
 * @typedef {{
 *   run: AgentRunRecord,
 *   kind: 'stale' | 'false_claim' | 'disconnected_pr' | 'ready_never_activated',
 *   minutesStale?: number,
 *   reason: string,
 * }} ControlLoopFinding
 */

/**
 * @typedef {{
 *   action: 'follow_up' | 'requeue' | 'blocker' | 'none',
 *   target: string,
 *   reason: string,
 *   message: string,
 *   skipBecauseFollowUpAlreadySent: boolean,
 * }} RecoveryAction
 */

/**
 * One recovery action per finding — no nagging if followUpSentAt is set and movement unchanged.
 *
 * @param {ControlLoopFinding} finding
 * @param {AgentRunRecord} [run]
 */
export function buildRecoveryAction(finding, run) {
  const r = run || ('run' in finding ? finding.run : null);
  if (finding.kind === 'ready_never_activated') {
    const issueNum = r?.issueNumber ?? null;
    return {
      action: 'requeue',
      target: `issue:${issueNum}`,
      reason: finding.reason,
      message: `Issue #${issueNum} is dispatch:cursor-ready but was never activated. Re-run dispatcher scan/activate or mark dispatch:blocked with reason.`,
      skipBecauseFollowUpAlreadySent: false,
    };
  }

  if (!r) {
    return {
      action: 'none',
      target: 'unknown',
      reason: 'missing run record',
      message: '',
      skipBecauseFollowUpAlreadySent: false,
    };
  }

  if (r.followUpSentAt && finding.kind === 'stale') {
    const followMs = Date.parse(r.followUpSentAt);
    const moveMs = Date.parse(r.lastMovementAt);
    if (Number.isFinite(followMs) && Number.isFinite(moveMs) && followMs >= moveMs) {
      return {
        action: 'none',
        target: runRecordKey(r),
        reason: 'follow-up already sent; no new movement',
        message: '',
        skipBecauseFollowUpAlreadySent: true,
      };
    }
  }

  if (finding.kind === 'false_claim') {
    return {
      action: 'blocker',
      target: runRecordKey(r),
      reason: 'claimed without run ID — false claimed state',
      message: `Issue #${r.issueNumber ?? '?'} has dispatch:cursor-claimed but no Cursor run ID. Unclaim or post CURSOR DISPATCH ACTIVATED with run ID via finalize step.`,
      skipBecauseFollowUpAlreadySent: false,
    };
  }

  if (finding.kind === 'disconnected_pr') {
    return {
      action: 'blocker',
      target: runRecordKey(r),
      reason: 'PR not linked to claimed issue',
      message: `Issue #${r.issueNumber ?? '?'} PR #${r.prNumber ?? '?'} appears disconnected. Link PR to issue or close orphan PR.`,
      skipBecauseFollowUpAlreadySent: false,
    };
  }

  if (finding.kind === 'stale') {
    return {
      action: 'follow_up',
      target: runRecordKey(r),
      reason: finding.reason,
      message: `Stale ${r.provider} run on issue #${r.issueNumber ?? '?'} (${finding.minutesStale ?? '?'} min without movement). Post CURSOR STALE WORK STATUS REQUEST or requeue.`,
      skipBecauseFollowUpAlreadySent: false,
    };
  }

  return {
    action: 'none',
    target: runRecordKey(r),
    reason: 'unclassified finding',
    message: '',
    skipBecauseFollowUpAlreadySent: false,
  };
}

/**
 * Evaluate full control loop from state + inputs.
 *
 * @param {ActiveAgentState} state
 * @param {{
 *   cursorOpsStatuses?: Array<Record<string, unknown>>,
 *   claimedIssues?: Array<{ number: number, labels?: unknown, updatedAt?: string | null }>,
 *   readyIssues?: Array<{ number: number, labels?: unknown, createdAt?: string | null, updatedAt?: string | null }>,
 *   openPrs?: Array<{ issueNumber?: number | null, prNumber?: number | null }>,
 *   now?: string | Date,
 *   thresholds?: StaleThresholds,
 * }} inputs
 */
export function evaluateActiveAgentControlLoop(state, inputs = {}) {
  const thresholds = inputs.thresholds || DEFAULT_STALE_THRESHOLDS;
  const now = inputs.now || new Date();
  let nextState = normalizeActiveAgentState(state);

  for (const status of inputs.cursorOpsStatuses || []) {
    const rec = runRecordFromCursorOpsStatus(status);
    if (rec) nextState = upsertRunRecord(nextState, rec);
  }

  for (const issue of inputs.claimedIssues || []) {
    const rec = runRecordFromClaimedIssue(issue, {});
    if (rec) nextState = upsertRunRecord(nextState, rec);
  }

  /** @type {ControlLoopFinding[]} */
  const findings = [];

  for (const run of nextState.runs) {
    if (isFalseClaimedState(run)) {
      findings.push({
        run,
        kind: 'false_claim',
        reason: run.notes || 'claimed without run ID',
      });
    }
    if (isRunStale(run, now, thresholds)) {
      findings.push({
        run: { ...run, phase: 'stale' },
        kind: 'stale',
        minutesStale: minutesSinceMovement(run, now, thresholds),
        reason: `no movement within ${run.provider === 'codex' ? thresholds.codexMinutesNoMovement : thresholds.cursorMinutesNoMovement} minutes`,
      });
    }
    if (isDisconnectedPr(run, inputs.openPrs)) {
      findings.push({
        run: { ...run, disconnectedPr: true },
        kind: 'disconnected_pr',
        reason: 'PR issue linkage mismatch',
      });
    }
  }

  const readyNever = detectReadyNeverActivated(
    inputs.readyIssues || [],
    nextState.runs,
    now,
    thresholds,
  );
  for (const item of readyNever) {
    findings.push({
      run: normalizeRunRecord({
        provider: 'cursor',
        issueNumber: item.issueNumber,
        phase: 'pending',
        startedAt: new Date().toISOString(),
        lastMovementAt: new Date().toISOString(),
      }),
      kind: 'ready_never_activated',
      reason: item.reason,
      minutesStale: item.minutesWaiting,
    });
  }

  const recoveries = findings.map((f) => buildRecoveryAction(f, 'run' in f ? f.run : undefined));

  const actionableRecoveries = recoveries.filter(
    (r) => r.action !== 'none' && !r.skipBecauseFollowUpAlreadySent,
  );

  return {
    schema: ACTIVE_AGENT_CONTROL_LOOP_SCHEMA,
    version: ACTIVE_AGENT_STATE_VERSION,
    evaluatedAt: new Date(now).toISOString(),
    state: nextState,
    summary: {
      totalRuns: nextState.runs.length,
      findings: findings.length,
      actionableRecoveries: actionableRecoveries.length,
      stale: findings.filter((f) => f.kind === 'stale').length,
      falseClaims: findings.filter((f) => f.kind === 'false_claim').length,
      readyNeverActivated: readyNever.length,
    },
    findings,
    recoveries: actionableRecoveries,
  };
}

/**
 * Mark follow-up sent on a run (prevents repeat nag until movement).
 *
 * @param {ActiveAgentState} state
 * @param {string} targetKey
 * @param {string} [sentAt]
 */
export function markFollowUpSent(state, targetKey, sentAt = new Date().toISOString()) {
  const runs = state.runs.map((r) =>
    runRecordKey(r) === targetKey ? { ...r, followUpSentAt: sentAt } : r,
  );
  return { ...state, runs, updatedAt: new Date().toISOString() };
}
