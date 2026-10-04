/**
 * Cursor agent lifecycle status runner — poll → normalize → complete/fail/stale.
 *
 * Fills the post-activation gap for issue #661: activate already exists;
 * this module polls `getCursorCloudAgent`, normalizes PENDING|RUNNING|COMPLETED|
 * FAILED|STALE, emits a durable completion packet once, and optionally sends
 * one bounded follow-up on STALE.
 *
 * Durable state = GitHub issue comments (same pattern as cursor origin metadata).
 * No second DB. Retired executors are not used on this hot path.
 *
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md (when present)
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */

import {
  createCursorAgentFollowUpRun,
  extractCursorGitDetails,
  getCursorCloudAgent,
  getCursorCloudAgentRun,
  getCursorCloudAgentUsage,
} from './cursor-cloud-agent-client.js';
import { emitProductionCursorTrace } from './langfuse-production-observability.js';
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
import { ACTIVE_EXECUTION_LABELS } from './cursor-wip-control.js';

export const CURSOR_LIFECYCLE_SCHEMA = 'corpflow.cursor_agent_lifecycle.v1';
export const CURSOR_LIFECYCLE_STATE_MARKER = 'corpflow.cursor_lifecycle_state.v1';
export const CURSOR_COMPLETION_EVENT_SCHEMA = 'corpflow.cursor_completion_event.v1';
export const CURSOR_COMPLETION_EVENT_MARKER = 'corpflow.cursor_completion_event.v1';
export const CURSOR_HEARTBEAT_SCHEMA = 'corpflow.cursor_heartbeat.v1';
export const CURSOR_HEARTBEAT_MARKER = 'corpflow.cursor_heartbeat.v1';
export const ERPNext_ACTION_RESULT_SCHEMA = 'corpflow.erpnext_action_result.v1';
export const ERPNext_ACTION_RESULT_MARKER = 'corpflow.erpnext_action_result.v1';
const DISPATCH_LABEL_READY = 'dispatch:cursor-ready';
const TERMINAL_VERDICTS = Object.freeze(['PASS', 'COMPLETED_UNVERIFIED']);

/**
 * Mirror provider-reported terminal usage to Langfuse. Every failure is
 * deliberately swallowed: observability must never block Cursor completion.
 */
async function recordCursorEconomicEvidence(input, context) {
  const runId = emptyToNull(context.runId);
  if (!runId || !input.apiKey) return { attempted: false, reason: 'RUN_ID_OR_API_KEY_MISSING' };
  try {
    const usage = await getCursorCloudAgentUsage(input.apiKey, context.agentId, runId, {
      fetch: input.fetch,
    });
    return await emitProductionCursorTrace({
      agentId: context.agentId,
      runId,
      sourceIssue: context.sourceIssue,
      modelSelection: input.modelSelection,
      usage,
      status: context.status,
      outcomeRef: context.outcomeRef,
      occurredAt: context.occurredAt,
      productionContext: true,
      env: input.env,
      fetchImpl: input.langfuseFetch,
    });
  } catch {
    return { attempted: true, ok: false, reason: 'CURSOR_USAGE_OR_LANGFUSE_FAILED', content_redacted: true };
  }
}

/**
 * Terminal / non-execution transition: release Cursor WIP slot labels and
 * remove the current generation's activation input. A rework attempt must use
 * the explicit CURSOR REQUEUE generation boundary before restoring ready.
 * Preserves audit comments; does not invent an external kill.
 *
 * @param {{
 *   issueNumber: number | null,
 *   github?: {
 *     removeIssueLabels?: (issue: number, labels: string[]) => Promise<unknown>,
 *     removeIssueLabel?: (issue: number, label: string) => Promise<unknown>,
 *   },
 *   actions: string[],
 * }} opts
 */
async function releaseExecutionSlotOnTerminal(opts) {
  const issueNumber = toPositiveInt(opts.issueNumber);
  if (!issueNumber || !opts.github) return;
  const labels = [...ACTIVE_EXECUTION_LABELS, DISPATCH_LABEL_READY];
  if (typeof opts.github.removeIssueLabels === 'function') {
    await opts.github.removeIssueLabels(issueNumber, labels);
    opts.actions.push('release_execution_slot_labels', 'remove_dispatch_ready_label');
    return;
  }
  if (typeof opts.github.removeIssueLabel === 'function') {
    for (const label of labels) {
      await opts.github.removeIssueLabel(issueNumber, label);
    }
    opts.actions.push('release_execution_slot_labels', 'remove_dispatch_ready_label');
  }
}

/** Normalized lifecycle phases (operator contract). */
export const LIFECYCLE_PHASES = Object.freeze([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'STALE',
]);

/** Default minutes without PR / without progress before STALE. */
export const DEFAULT_STALE_AFTER_MINUTES = 20;

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
 *   progressFingerprint: string | null,
 *   lastProgressAt: string | null,
 *   completionEventEmitted: boolean,
 *   staleFollowUpSent: boolean,
 *   lastError: string | null,
 *   rawStatus: string | null,
 *   finalResult: string | null,
 *   finalVerdict: 'PASS'|'COMPLETED_UNVERIFIED'|null,
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
    progressFingerprint: emptyToNull(input.progressFingerprint),
    lastProgressAt: emptyToNull(input.lastProgressAt),
    completionEventEmitted: Boolean(input.completionEventEmitted),
    staleFollowUpSent: Boolean(input.staleFollowUpSent),
    lastError: emptyToNull(input.lastError),
    rawStatus: emptyToNull(input.rawStatus),
    finalResult: emptyToNull(input.finalResult),
    finalVerdict: TERMINAL_VERDICTS.includes(input.finalVerdict)
      ? /** @type {'PASS'|'COMPLETED_UNVERIFIED'} */ (input.finalVerdict)
      : null,
  };
}

/**
 * A terminal provider status is not proof of a successful packet.
 * Code-changing work requires the GitHub artifact chain; diagnostic work
 * requires a bounded provider result containing both a verdict and evidence.
 *
 * @param {{
 *   prNumber?: number | null,
 *   prUrl?: string | null,
 *   headSha?: string | null,
 *   ciResult?: string | null,
 *   finalResult?: string | null,
 *   workType?: string | null,
 * }} input
 * @returns {{ verdict: 'PASS'|'COMPLETED_UNVERIFIED', reason: string }}
 */
export function classifyCursorTerminalOutcome(input = {}) {
  const businessAction = isBusinessActionWorkType(input.workType) || Boolean(input.businessResult);
  const businessResult = validateErpNextActionResult(input.businessResult, {
    sourceIssue: input.sourceIssue,
    cursorAgentId: input.cursorAgentId,
    cursorRunId: input.cursorRunId,
  });
  if (businessAction) {
    return businessResult.valid
      ? { verdict: 'PASS', reason: 'validated_erpnext_action_result' }
      : { verdict: 'COMPLETED_UNVERIFIED', reason: businessResult.reason };
  }
  const hasCodeArtifact = Boolean(
    toPositiveInt(input.prNumber) &&
      emptyToNull(input.prUrl) &&
      emptyToNull(input.headSha),
  );
  const ci = String(input.ciResult || '').trim().toLowerCase();
  if (hasCodeArtifact && ['success', 'neutral', 'skipped'].includes(ci)) {
    return { verdict: 'PASS', reason: 'verified_pr_sha_and_checks' };
  }

  const diagnostic = /diagnostic|no[-_ ]?code|read[-_ ]only/i.test(String(input.workType || ''));
  const result = String(input.finalResult || '').trim();
  if (
    diagnostic &&
    /\b(?:pass|verified|not applicable)\b/i.test(result) &&
    /\b(?:evidence|verification|observed|reason)\b/i.test(result)
  ) {
    return { verdict: 'PASS', reason: 'verified_bounded_diagnostic_result' };
  }

  return {
    verdict: 'COMPLETED_UNVERIFIED',
    reason: hasCodeArtifact
      ? 'missing_successful_check_evidence'
        : 'missing_required_completion_artifacts',
  };
}

/**
 * Business actions are intentionally opt-in. A provider result cannot turn an
 * ordinary code task into an ERPNext completion contract by accident.
 */
export function isBusinessActionWorkType(workType) {
  return /erpnext|business[-_ ]?action|external[-_ ]?system|no[-_ ]?code|mutation[-_ ]?capable/i.test(
    String(workType || ''),
  );
}

function hasOwn(value, key) {
  return Boolean(value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key));
}

function boundedText(value, max = 800) {
  const text = String(value == null ? '' : value).trim();
  return text ? text.slice(0, max) : null;
}

function boundedList(value, max = 40) {
  if (!Array.isArray(value)) return null;
  return value.slice(0, max).map((item) => {
    if (item == null || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      return typeof item === 'string' ? item.slice(0, 240) : item;
    }
    if (typeof item === 'object' && !Array.isArray(item)) {
      return Object.fromEntries(
        Object.entries(item)
          .filter(([key]) => !/secret|token|password|authorization|credential|private/i.test(key))
          .slice(0, 20)
          .map(([key, itemValue]) => [key.slice(0, 80), boundedText(itemValue, 240) || itemValue]),
      );
    }
    return null;
  });
}

/**
 * Validate and retain only the bounded ERPNext evidence contract. This is
 * deliberately stricter than a provider "COMPLETED" status and never stores a
 * transcript or hidden reasoning.
 */
export function validateErpNextActionResult(value, context = {}) {
  const result = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (!result) return { valid: false, reason: 'missing_business_evidence', result: null };
  if (String(result.schema || '') !== ERPNext_ACTION_RESULT_SCHEMA) {
    return { valid: false, reason: 'invalid_business_evidence_schema', result: null };
  }
  const sourceIssue = toPositiveInt(result.source_issue);
  if (!sourceIssue || (context.sourceIssue && sourceIssue !== toPositiveInt(context.sourceIssue))) {
    return { valid: false, reason: 'business_evidence_source_issue_mismatch', result: null };
  }
  if (
    !boundedText(result.cursor_agent_id) ||
    !boundedText(result.cursor_run_id) ||
    (context.cursorAgentId && boundedText(result.cursor_agent_id) !== boundedText(context.cursorAgentId)) ||
    (context.cursorRunId && boundedText(result.cursor_run_id) !== boundedText(context.cursorRunId))
  ) {
    return { valid: false, reason: 'business_evidence_run_correlation_missing', result: null };
  }
  const requiredText = ['action_class', 'before_after_summary', 'final_verdict'];
  if (requiredText.some((key) => !boundedText(result[key]))) {
    return { valid: false, reason: 'business_evidence_required_field_missing', result: null };
  }
  for (const key of ['target_doctypes', 'records_read', 'records_created', 'records_updated', 'protected_actions_not_taken']) {
    if (!boundedList(result[key])) {
      return { valid: false, reason: `business_evidence_${key}_missing`, result: null };
    }
  }
  if (result.read_back_verified !== true || String(result.final_verdict).toUpperCase() !== 'PASS') {
    return { valid: false, reason: 'business_evidence_read_back_not_verified', result: null };
  }
  const safe = {
    schema: ERPNext_ACTION_RESULT_SCHEMA,
    source_issue: sourceIssue,
    cursor_agent_id: boundedText(result.cursor_agent_id, 160),
    cursor_run_id: boundedText(result.cursor_run_id, 160),
    action_class: boundedText(result.action_class, 160),
    target_doctypes: boundedList(result.target_doctypes),
    records_read: boundedList(result.records_read),
    records_created: boundedList(result.records_created),
    records_updated: boundedList(result.records_updated),
    before_after_summary: boundedText(result.before_after_summary, 1200),
    read_back_verified: true,
    protected_actions_not_taken: boundedList(result.protected_actions_not_taken),
    blocker: boundedText(result.blocker, 500),
    final_verdict: 'PASS',
  };
  for (const key of ['docstatus_or_draft_state', 'quotation_or_supplier_identifiers']) {
    if (hasOwn(result, key)) safe[key] = boundedList(result[key]) || boundedText(result[key], 800);
  }
  return { valid: true, reason: 'validated', result: safe };
}

/**
 * Extract a structured result from the provider's bounded final output. JSON
 * fences and the schema marker are accepted; arbitrary transcript fields are
 * not traversed.
 */
export function extractErpNextActionResult(apiResult) {
  const result = apiResult && typeof apiResult === 'object' ? apiResult : {};
  const run = result.run && typeof result.run === 'object' ? result.run : {};
  const candidates = [result.businessResult, result.erpnextActionResult, run.businessResult, run.erpnextActionResult, result.result, result.finalResult, result.output, run.result, run.finalResult, run.output];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const found = candidate.schema === ERPNext_ACTION_RESULT_SCHEMA ? candidate : candidate.result;
      if (found?.schema === ERPNext_ACTION_RESULT_SCHEMA) return found;
    }
    if (typeof candidate === 'string' && candidate.includes(ERPNext_ACTION_RESULT_SCHEMA)) {
      const match = candidate.match(/\{[\s\S]*"schema"\s*:\s*"corpflow\.erpnext_action_result\.v1"[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed?.schema === ERPNext_ACTION_RESULT_SCHEMA) return parsed;
        } catch {
          // Provider output was not valid structured evidence.
        }
      }
    }
  }
  return null;
}

export function buildReadOnlyRecoveryPlan(input = {}) {
  const sourceIssue = toPositiveInt(input.sourceIssue);
  const plan = {
    mode: 'read_only',
    source_issue: sourceIssue,
    cursor_agent_id: boundedText(input.cursorAgentId, 160),
    cursor_run_id: boundedText(input.cursorRunId, 160),
    action: 'Inspect authoritative external records; do not replay the original mutation.',
    target_doctypes: Array.isArray(input.targetDoctypes) && input.targetDoctypes.length
      ? boundedList(input.targetDoctypes)
      : ['Lead', 'Opportunity', 'Customer', 'Contact', 'Address', 'Quotation'],
    duplicate_mutation_blocked: true,
  };
  return plan;
}

export function canAdvanceDependentQueue(input = {}) {
  return input.finalVerdict === 'PASS' && input.providerStatus === 'COMPLETED';
}

export function formatErpNextActionResultComment(result, input = {}) {
  const safe = validateErpNextActionResult(result, input);
  const payload = safe.result || {
    schema: ERPNext_ACTION_RESULT_SCHEMA,
    source_issue: toPositiveInt(input.sourceIssue),
    cursor_agent_id: boundedText(input.cursorAgentId, 160),
    cursor_run_id: boundedText(input.cursorRunId, 160),
    final_verdict: 'COMPLETED_UNVERIFIED',
    blocker: safe.reason,
  };
  return `CURSOR BUSINESS ACTION CALLBACK\n\nSource issue: #${payload.source_issue || 'n/a'}\nAgent: ${payload.cursor_agent_id || 'n/a'}\nRun: ${payload.cursor_run_id || 'n/a'}\nVerdict: ${payload.final_verdict}\nRead-back verified: ${payload.read_back_verified === true ? 'YES' : 'NO'}\n\n<!-- ${ERPNext_ACTION_RESULT_MARKER} ${JSON.stringify(payload)} -->\n`;
}

/**
 * Extract only a concise provider result. Never persist hidden reasoning or a
 * whole transcript in the durable GitHub evidence.
 */
function extractCursorFinalResult(apiResult) {
  const result = apiResult && typeof apiResult === 'object' ? apiResult : {};
  const run = result.run && typeof result.run === 'object' ? result.run : {};
  const candidate = result.finalResult || result.result || result.output || result.summary || run.finalResult || run.result || run.summary;
  return emptyToNull(candidate)?.slice(0, 1200) || null;
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
Completion fingerprint: ${s.completionFingerprint || 'n/a'}
Progress fingerprint: ${s.progressFingerprint || 'n/a'}
Last observable progress: ${s.lastProgressAt || 'n/a'}
Stale follow-up sent: ${s.staleFollowUpSent ? 'yes' : 'no'}

<!-- ${CURSOR_LIFECYCLE_STATE_MARKER} ${json} -->
`;
}

/**
 * Build a compact, observable heartbeat for an active Cursor run.
 * This reports only facts visible from the Cursor API / GitHub surfaces.
 * It must not infer private reasoning or claim work that has no artifact.
 *
 * @param {{
 *   sourceIssue?: number | null,
 *   cursorAgentId?: string | null,
 *   cursorRunId?: string | null,
 *   phase?: string | null,
 *   rawStatus?: string | null,
 *   branch?: string | null,
 *   prNumber?: number | null,
 *   prUrl?: string | null,
 *   headSha?: string | null,
 *   blocker?: string | null,
 *   nextAction?: string | null,
 *   lastPolledAt?: string | null,
 *   progressFingerprint?: string | null,
 *   lastProgressAt?: string | null,
 * }} input
 */
export function buildCursorHeartbeat(input = {}) {
  const phase = String(emptyToNull(input.phase) || 'UNKNOWN').toUpperCase();
  const branch = emptyToNull(input.branch);
  const prNumber = toPositiveInt(input.prNumber);
  const prUrl = emptyToNull(input.prUrl);
  const headSha = emptyToNull(input.headSha);
  let stage = 'Lifecycle state observed';
  if (phase === 'PENDING') {
    stage = 'Agent accepted; waiting for execution progress';
  } else if (phase === 'RUNNING' && (prNumber || prUrl)) {
    stage = prNumber != null ? `PR #${prNumber} is available` : 'PR is available';
  } else if (phase === 'RUNNING' && branch) {
    stage = `Working on branch ${branch}`;
  } else if (phase === 'RUNNING') {
    stage = 'Agent running; no branch, PR, or head SHA reported yet';
  }

  return {
    schema: CURSOR_HEARTBEAT_SCHEMA,
    source_issue: toPositiveInt(input.sourceIssue),
    cursor_agent_id: emptyToNull(input.cursorAgentId),
    cursor_run_id: emptyToNull(input.cursorRunId),
    phase,
    raw_status: emptyToNull(input.rawStatus),
    stage,
    branch,
    pr: prNumber,
    pr_url: prUrl,
    sha: headSha,
    blocker: emptyToNull(input.blocker),
    next_action:
      emptyToNull(input.nextAction) ||
      (phase === 'RUNNING' || phase === 'PENDING'
        ? 'Poll this same agent/run again; do not requeue'
        : 'Follow lifecycle terminal handling'),
    last_polled_at: emptyToNull(input.lastPolledAt),
    progress_fingerprint: emptyToNull(input.progressFingerprint),
    last_progress_at: emptyToNull(input.lastProgressAt),
  };
}

/**
 * @param {ReturnType<typeof buildCursorHeartbeat>} heartbeat
 */
export function formatCursorHeartbeatComment(heartbeat) {
  const h = heartbeat;
  const json = JSON.stringify(h);
  return `CURSOR HEARTBEAT

Source issue: ${h.source_issue != null ? `#${h.source_issue}` : 'n/a'}
Agent: ${h.cursor_agent_id || 'n/a'}
Run: ${h.cursor_run_id || 'n/a'}
Phase: ${h.phase}
Stage: ${h.stage}
Branch: ${h.branch || 'none yet'}
PR: ${h.pr != null ? `#${h.pr}` : 'none yet'}
SHA: ${h.sha || 'none yet'}
Blocker: ${h.blocker || 'none'}
Next: ${h.next_action || 'n/a'}
Last observable progress: ${h.last_progress_at || 'n/a'}
Last poll: ${h.last_polled_at || 'n/a'}

<!-- ${CURSOR_HEARTBEAT_MARKER} ${json} -->
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
 * Includes executor + CI check state per n8n notifier contract.
 *
 * @param {{
 *   cursorAgentId?: string | null,
 *   cursorRunId?: string | null,
 *   executor?: string | null,
 *   sourceIssue?: number | null,
 *   phase?: string | null,
 *   prNumber?: number | null,
 *   headSha?: string | null,
 *   ciResult?: string | null,
 *   branch?: string | null,
 * }} input
 */
export function buildCompletionFingerprint(input = {}) {
  return [
    'cursor_lifecycle',
    emptyToNull(input.executor) || 'cursor',
    emptyToNull(input.cursorAgentId) || emptyToNull(input.cursorRunId) || 'no-agent',
    toPositiveInt(input.sourceIssue) || 'no-issue',
    emptyToNull(input.phase) || 'no-phase',
    toPositiveInt(input.prNumber) || 'no-pr',
    emptyToNull(input.headSha) || 'no-sha',
    emptyToNull(input.ciResult) || 'no-ci',
    emptyToNull(input.branch) || 'no-branch',
  ].join('|');
}

/**
 * Observable-progress fingerprint for active Cursor runs.
 * Routine polls do not count as progress. Only a change in Cursor/GitHub
 * evidence resets the stale timer.
 *
 * @param {{
 *   cursorAgentId?: string | null,
 *   cursorRunId?: string | null,
 *   rawStatus?: string | null,
 *   branch?: string | null,
 *   prNumber?: number | null,
 *   headSha?: string | null,
 * }} input
 */
export function buildCursorProgressFingerprint(input = {}) {
  return [
    'cursor_progress',
    emptyToNull(input.cursorAgentId) || 'no-agent',
    emptyToNull(input.cursorRunId) || 'no-run',
    emptyToNull(input.rawStatus) || 'no-status',
    emptyToNull(input.branch) || 'no-branch',
    toPositiveInt(input.prNumber) || 'no-pr',
    emptyToNull(input.headSha) || 'no-sha',
  ].join('|');
}

/**
 * n8n exception notifier gate for corpflow.cursor_completion_event.v1.
 * RUNNING / unchanged / COMPLETED without anton_required → silent by default.
 * COMPLETED+anton_required, FAILED, STALE (recovery exhausted) → notify once.
 *
 * @param {ReturnType<typeof buildCursorCompletionEvent> | null | undefined} event
 * @param {{ previousFingerprint?: string | null, alreadyNotified?: boolean }} [opts]
 */
export function shouldNotifyCursorCompletionEvent(event, opts = {}) {
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
 *   finalResult?: string | null,
 *   finalVerdict?: string | null,
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
    final_result: emptyToNull(input.finalResult),
    final_verdict: TERMINAL_VERDICTS.includes(input.finalVerdict)
      ? input.finalVerdict
      : null,
    notify: antonRequired || status === 'FAILED' || status === 'STALE',
    fingerprint: buildCompletionFingerprint({
      cursorAgentId: input.cursorAgentId,
      cursorRunId: input.cursorRunId,
      executor: input.executor,
      sourceIssue: input.sourceIssue,
      phase: status,
      prNumber: input.prNumber,
      headSha: input.headSha,
      ciResult: input.ciResult,
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
 *   runId?: string | null,
 *   sourceIssue?: number | null,
 *   priorState?: CursorLifecycleState | null,
 *   startedAt?: string | null,
 *   staleAfterMinutes?: number,
 *   now?: Date,
 *   fetch?: typeof fetch,
 *   github?: {
 *     listIssueComments?: (issue: number) => Promise<Array<{ body?: string }>>,
 *     createIssueComment?: (issue: number, body: string) => Promise<unknown>,
 *     upsertCompactLifecycle?: (issue: number, event: ReturnType<typeof buildCursorCompletionEvent>) => Promise<unknown>,
 *     upsertHeartbeat?: (issue: number, heartbeat: ReturnType<typeof buildCursorHeartbeat>) => Promise<unknown>,
 *     findPrForBranch?: (branch: string) => Promise<{ number: number, url: string, headSha?: string | null, branch?: string | null } | null>,
 *     findPrForIssue?: (issue: number) => Promise<{ number: number, url: string, headSha?: string | null, branch?: string | null } | null>,
 *     getPrChecks?: (prNumber: number) => Promise<{ conclusion: string | null, summary: string }>,
 *     publishBusinessActionCallback?: (issue: number, body: string) => Promise<unknown>,
 *     addIssueLabels?: (issue: number, labels: string[]) => Promise<unknown>,
 *     removeIssueLabels?: (issue: number, labels: string[]) => Promise<unknown>,
 *     removeIssueLabel?: (issue: number, label: string) => Promise<unknown>,
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
  const knownRunId = emptyToNull(input.runId) || prior.cursorRunId;
  let apiResult;
  try {
    apiResult = /** @type {Record<string, unknown>} */ (
      knownRunId
        ? await getCursorCloudAgentRun(input.apiKey, agentId, knownRunId, { fetch: input.fetch })
        : await getCursorCloudAgent(input.apiKey, agentId, { fetch: input.fetch })
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
  const finalResult = extractCursorFinalResult(apiResult);
  const businessResult = extractErpNextActionResult(apiResult);
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
  if (prNumber && input.github?.findPrForIssue && sourceIssueEarly) {
    const verifiedPr = await input.github.findPrForIssue(sourceIssueEarly);
    if (verifiedPr?.number === prNumber) {
      headSha = emptyToNull(verifiedPr.headSha) || headSha;
      branch = emptyToNull(verifiedPr.branch) || branch;
      prUrl = emptyToNull(verifiedPr.url) || prUrl;
      actions.push('pr_verified_on_github');
    } else {
      prNumber = null;
      prUrl = null;
      actions.push('reported_pr_not_found_on_github');
    }
  }

  // A poll is not progress. Reset the stale clock only when observable
  // Cursor/GitHub evidence changes for this exact agent/run.
  const observed = normalizeCursorAgentLifecycleStatus(apiResult, {
    hasPr: Boolean(prUrl || prNumber),
  });
  const progressFingerprint = buildCursorProgressFingerprint({
    cursorAgentId: agentId,
    cursorRunId: git.runId || prior.cursorRunId,
    rawStatus: observed.rawStatus,
    branch,
    prNumber,
    headSha,
  });
  const hasProgressBaseline = Boolean(prior.progressFingerprint);
  const progressChanged =
    hasProgressBaseline && prior.progressFingerprint !== progressFingerprint;
  const lastProgressAt = progressChanged
    ? nowIso
    : prior.lastProgressAt || prior.startedAt || startedAt;
  actions.push(
    !hasProgressBaseline
      ? 'observable_progress_baseline'
      : progressChanged
        ? 'observable_progress_changed'
        : 'observable_progress_unchanged',
  );

  const normalized = normalizeCursorAgentLifecycleStatus(apiResult, {
    startedAt: lastProgressAt,
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

  // RUNNING / PENDING → upsert one compact heartbeat on the source issue.
  // This remains notification-silent: observability should not become alert spam.
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
      progressFingerprint,
      lastProgressAt,
      rawStatus: normalized.rawStatus,
      lastError: null,
    });
    const heartbeat = buildCursorHeartbeat({
      sourceIssue: next.sourceIssue,
      cursorAgentId: agentId,
      cursorRunId: next.cursorRunId,
      phase,
      rawStatus: normalized.rawStatus,
      branch,
      prNumber,
      prUrl,
      headSha,
      blocker: null,
      nextAction: 'Poll this same agent/run again; do not requeue',
      lastPolledAt: nowIso,
      progressFingerprint,
      lastProgressAt,
    });
    if (next.sourceIssue && input.github?.upsertHeartbeat) {
      try {
        await input.github.upsertHeartbeat(next.sourceIssue, heartbeat);
        actions.push('heartbeat_updated');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        actions.push(`heartbeat_update_failed:${message.slice(0, 160)}`);
      }
    }
    return {
      phase,
      state: next,
      heartbeat,
      emittedCompletion: false,
      silent: true,
      followUpSent: false,
      classification: null,
      event: null,
      reviewPacket: null,
      actions,
    };
  }

  // STALE → operator-visible evidence; follow-up only when explicitly enabled
  if (phase === 'STALE') {
    let followUpSent = false;
    if (input.allowStaleFollowUp === true && !prior.staleFollowUpSent) {
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
      progressFingerprint,
      lastProgressAt,
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
        ? 'STALE-IN-PROGRESS — explicit same-agent follow-up sent; await next poll'
        : `STALE-IN-PROGRESS — no observable progress for ${input.staleAfterMinutes ?? DEFAULT_STALE_AFTER_MINUTES} minutes; same agent/run preserved`,
      nextAction: followUpSent
        ? 'Poll this same agent/run after the explicit follow-up'
        : 'Request a status update from this same Cursor agent/run; do not requeue',
      antonRequired: false,
      ciResult: 'n/a',
    });
    const emit = shouldEmitCompletionEvent(
      prior.completionFingerprint,
      event.fingerprint,
      prior.completionEventEmitted && prior.phase === 'STALE',
    );
    if (emit && next.sourceIssue && input.github?.createIssueComment) {
      if (input.github.upsertCompactLifecycle) {
        await input.github.upsertCompactLifecycle(next.sourceIssue, event);
        actions.push('compact_lifecycle_updated');
      } else {
        await input.github.createIssueComment(next.sourceIssue, formatCursorCompletionEventComment(event));
        actions.push('completion_event_posted');
      }
      // STALE is not terminal execution. Preserve the claimed slot and same
      // agent/run so an operator can inspect or explicitly use a follow-up.
      actions.push('stale_slot_preserved');
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
      silent: !emit,
      followUpSent,
      classification: { kind: 'stale', requeue: false, antonRequired: false },
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
    const economicEvidence = await recordCursorEconomicEvidence(input, {
      agentId,
      runId: git.runId || prior.cursorRunId,
      sourceIssue: next.sourceIssue,
      status: 'FAILED',
      outcomeRef: classification.reason,
      occurredAt: nowIso,
    });
    actions.push(
      economicEvidence.ok
        ? 'cursor_economic_evidence_emitted'
        : `cursor_economic_evidence_skipped:${economicEvidence.reason || 'unknown'}`,
    );
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
      if (input.github.upsertCompactLifecycle) {
        await input.github.upsertCompactLifecycle(next.sourceIssue, event);
        actions.push('compact_lifecycle_updated');
      } else {
        await input.github.createIssueComment(next.sourceIssue, formatCursorCompletionEventComment(event));
        actions.push('completion_event_posted');
      }
      await releaseExecutionSlotOnTerminal({
        issueNumber: next.sourceIssue,
        github: input.github,
        actions,
      });
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

  const terminalOutcome = classifyCursorTerminalOutcome({
    prNumber,
    prUrl,
    headSha,
    ciResult: ciResult || 'unknown',
    finalResult,
    workType: input.workType,
    sourceIssue: toPositiveInt(input.sourceIssue) || prior.sourceIssue,
    cursorAgentId: agentId,
    cursorRunId: git.runId || prior.cursorRunId,
    businessResult,
  });
  const businessAction = isBusinessActionWorkType(input.workType);
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
    finalResult,
    finalVerdict: terminalOutcome.verdict,
    blocker: terminalOutcome.verdict === 'PASS' ? null : terminalOutcome.reason,
    nextAction: reviewPacket.antonRequired
      ? 'Anton: protected review'
      : 'Operator: review PR — do not auto-merge',
    antonRequired: reviewPacket.antonRequired || terminalOutcome.verdict !== 'PASS',
  });
  const economicEvidence = await recordCursorEconomicEvidence(input, {
    agentId,
    runId: git.runId || prior.cursorRunId,
    sourceIssue: toPositiveInt(input.sourceIssue) || prior.sourceIssue,
    status: 'COMPLETED',
    outcomeRef: prUrl || (prNumber ? `github-pr-${prNumber}` : null),
    occurredAt: nowIso,
  });
  actions.push(
    economicEvidence.ok
      ? 'cursor_economic_evidence_emitted'
      : `cursor_economic_evidence_skipped:${economicEvidence.reason || 'unknown'}`,
  );

  const emit = shouldEmitCompletionEvent(
    prior.completionFingerprint,
    event.fingerprint,
    prior.completionEventEmitted && prior.phase === 'COMPLETED',
  );

  const sourceIssue = toPositiveInt(input.sourceIssue) || prior.sourceIssue;
  if (emit && sourceIssue && input.github?.createIssueComment) {
    if (input.github.upsertCompactLifecycle) {
      await input.github.upsertCompactLifecycle(sourceIssue, event);
      actions.push('compact_lifecycle_updated');
    } else {
      await input.github.createIssueComment(sourceIssue, formatCursorCompletionEventComment(event));
      await input.github.createIssueComment(
        sourceIssue,
        formatOperatorDecisionPacketMarkdown(reviewPacket),
      );
      actions.push('completion_event_posted', 'review_packet_posted');
    }
    if (input.github.addIssueLabels) {
      await input.github.addIssueLabels(sourceIssue, ['dispatch:operator-review']);
      actions.push('label:dispatch:operator-review');
    }
    if (terminalOutcome.verdict === 'PASS') {
      await releaseExecutionSlotOnTerminal({
        issueNumber: sourceIssue,
        github: input.github,
        actions,
      });
    } else {
      actions.push('execution_slot_preserved_for_operator_review');
    }
    if ((businessAction || businessResult) && input.github.publishBusinessActionCallback) {
      await input.github.publishBusinessActionCallback(
        sourceIssue,
        formatErpNextActionResultComment(businessResult, {
          sourceIssue,
          cursorAgentId: agentId,
          cursorRunId: git.runId || prior.cursorRunId,
        }),
      );
      actions.push('business_action_callback_posted');
    }
    if (businessAction && terminalOutcome.verdict === 'COMPLETED_UNVERIFIED') {
      const recovery = buildReadOnlyRecoveryPlan({
        sourceIssue,
        cursorAgentId: agentId,
        cursorRunId: git.runId || prior.cursorRunId,
      });
      actions.push(`read_only_recovery_selected:${recovery.target_doctypes.join(',')}`);
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
    finalResult,
    finalVerdict: event.final_verdict,
    lastError: event.final_verdict === 'PASS' ? null : 'COMPLETED_UNVERIFIED',
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
