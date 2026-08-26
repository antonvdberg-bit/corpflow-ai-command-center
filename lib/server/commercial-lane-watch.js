/**
 * Commercial Lane watch — Relay-backed GitHub evidence snapshot (#1111).
 *
 * Orchestration owner stays Commercial Lane watch. Agent Relay is transport,
 * policy, and evidence only. This module does not replace Factory Handoff,
 * Queue Reconcile, GitHub Actions native checks, Operator Bridge, n8n, or
 * /change. It never dispatches, merges, or writes GitHub comments.
 *
 * Caller auth reuses the existing Agent Relay control-plane boundary:
 * authenticated admin session or trusted CORPFLOW_CRON_SECRET / CRON_SECRET
 * Bearer. No new secret, env, or public route.
 *
 * @see docs/operations/COMMERCIAL_LANE_WATCH_V1.md
 */
import crypto from 'crypto';

import {
  AGENT_RELAY_WORK_SCHEMA,
  executeAgentRelayWork,
  verifyAgentRelayControlPlaneAuth,
} from './agent-relay-work.js';
import {
  isActiveClaimStatus,
  parseCursorActivationClaimsFromComments,
} from './cursor-activation-claim.js';
import { extractCursorAgentIdFromText, extractCursorRunIdFromText } from './cursor-cloud-agent-client.js';
import {
  DISPATCH_LABEL_BLOCKED,
  DISPATCH_LABEL_OPERATOR_REVIEW,
  DISPATCH_LABEL_PAUSED,
  DISPATCH_LABEL_READY,
  inferProtectedSubjectsAndConsequentialGate,
} from './cursor-issue-dispatch-lifecycle.js';
import { findLatestLifecycleState } from './cursor-agent-lifecycle.js';
import { parseCursorCompletionEventsFromComments } from './cursor-wip-control.js';
import { parseCursorOriginMetadataFromText } from './cursor-origin-metadata.js';
import { AGENT_RELAY_REPOSITORIES } from './github-app-relay.js';

export const COMMERCIAL_LANE_WATCH_SCHEMA = 'corpflow.commercial_lane_watch.v1';
export const COMMERCIAL_LANE_WATCH_RESULT_SCHEMA = 'corpflow.commercial_lane_watch.result.v1';
export const COMMERCIAL_LANE_WATCH_MAX_BYTES = 16 * 1024;

export const COMMERCIAL_LANE_CLASSIFICATIONS = Object.freeze([
  'NO_MOVEMENT',
  'ACTIVE',
  'REVIEW_READY',
  'BLOCKED',
  'PROTECTED_GATE',
  'TERMINAL',
]);

export const COMMERCIAL_LANE_DECISIONS = Object.freeze(['advance', 'hold', 'block', 'escalate']);

const EVIDENCE_BY_OPERATION = Object.freeze({
  'issue.get_metadata': 'issue_metadata',
  'issue.list_comments': 'issue_comments',
  'pull_request.get_metadata': 'pull_request_metadata',
  'pull_request.get_head': 'pull_request_head',
  'pull_request.list_check_runs': 'check_runs',
  'pull_request.list_workflow_runs': 'workflow_runs',
});

const SHA_PATTERN = /^[a-f0-9]{40,64}$/;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;
const FAILED_CHECK_CONCLUSIONS = new Set(['failure', 'cancelled', 'timed_out', 'startup_failure', 'action_required']);
const PENDING_CHECK_STATUSES = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);
const PASSING_CHECK_CONCLUSIONS = new Set(['success', 'neutral', 'skipped']);

function safeString(value) {
  return value == null ? '' : String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function watchError(code, status = 400) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isoNow(nowMs) {
  return new Date(nowMs).toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

function addMinutesIso(nowMs, minutes) {
  return new Date(nowMs + minutes * 60_000).toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

function resultEnvelope(snapshot, { ok, error = null } = {}) {
  return {
    schema: COMMERCIAL_LANE_WATCH_RESULT_SCHEMA,
    ok,
    protectedActionTriggered: false,
    activationAttempted: false,
    statusMutationAttempted: false,
    ...(error ? { error } : {}),
    ...(snapshot ? { snapshot } : {}),
  };
}

export function parseCommercialLaneWatchInput(input) {
  if (!isPlainObject(input)) throw watchError('MALFORMED_WATCH_REQUEST');
  const allowed = ['schema', 'repository', 'source_issue', 'pull_request', 'agent_report', 'correlation_id'];
  if (Object.keys(input).some((key) => !allowed.includes(key))) throw watchError('UNKNOWN_WATCH_FIELD');
  if (safeString(input.schema) !== COMMERCIAL_LANE_WATCH_SCHEMA) throw watchError('UNSUPPORTED_SCHEMA_VERSION');
  const repository = safeString(input.repository);
  if (!AGENT_RELAY_REPOSITORIES.includes(repository)) throw watchError('REPOSITORY_NOT_ALLOWED', 403);
  const sourceIssue = toPositiveInt(input.source_issue);
  if (!sourceIssue) throw watchError('INVALID_SOURCE_ISSUE');
  const pullRequest = input.pull_request == null || input.pull_request === ''
    ? null
    : toPositiveInt(input.pull_request);
  if (input.pull_request != null && input.pull_request !== '' && !pullRequest) {
    throw watchError('INVALID_PULL_REQUEST');
  }
  let agentReport = null;
  if (input.agent_report != null) {
    if (!isPlainObject(input.agent_report)) throw watchError('INVALID_AGENT_REPORT');
    const reportKeys = Object.keys(input.agent_report);
    if (reportKeys.some((key) => !['status', 'summary'].includes(key))) throw watchError('INVALID_AGENT_REPORT');
    agentReport = {
      status: safeString(input.agent_report.status).toUpperCase().slice(0, 32),
      summary: safeString(input.agent_report.summary).slice(0, 512) || null,
    };
    if (!agentReport.status) throw watchError('INVALID_AGENT_REPORT');
  }
  const correlationId = safeString(input.correlation_id);
  if (correlationId && !ID_PATTERN.test(correlationId)) throw watchError('INVALID_CORRELATION_ID');
  return { repository, sourceIssue, pullRequest, agentReport, correlationId: correlationId || null };
}

function relayEnvelope({ operation, repository, number, expectedSha, nowMs, correlationId, replaySuffix }) {
  const evidence = EVIDENCE_BY_OPERATION[operation];
  const issued = addMinutesIso(nowMs, -1);
  const expires = addMinutesIso(nowMs, 4);
  return {
    schema: AGENT_RELAY_WORK_SCHEMA,
    request_id: `clw-${operation.replace(/[._]/g, '-')}-${String(number).padStart(4, '0')}`.slice(0, 128),
    origin: { system: 'commercial-lane-watch', actor: 'factory-control-plane' },
    repository,
    operation,
    target: {
      type: operation.startsWith('pull_request.') ? 'pull_request' : 'issue',
      number,
      identifier: '',
      expected_sha: expectedSha || '',
    },
    payload: {},
    issued_at: issued,
    expires_at: expires,
    replay_identity: `clw-read-${operation.replace(/[._]/g, '-')}-${replaySuffix}`.slice(0, 128),
    correlation_id: correlationId || `clw-correlation-${replaySuffix}`.slice(0, 128),
    requested_evidence: [evidence],
  };
}

async function relayRead(operation, { repository, number, expectedSha, nowMs, correlationId, replaySuffix, executeRelay, fetchFn, configOverrides, prisma }) {
  const envelope = relayEnvelope({ operation, repository, number, expectedSha, nowMs, correlationId, replaySuffix });
  const result = await executeRelay(envelope, { nowMs, fetchFn, configOverrides, prisma });
  return { operation, envelope, result };
}

function commentBodies(comments) {
  return (Array.isArray(comments) ? comments : []).map((comment) => safeString(comment?.body));
}

function latestOrigin(comments) {
  const list = Array.isArray(comments) ? [...comments].reverse() : [];
  for (const comment of list) {
    const parsed = parseCursorOriginMetadataFromText(comment?.body || '');
    if (parsed) return parsed;
  }
  return null;
}

function inferPrNumber({ requested, issue, comments }) {
  if (requested) return requested;
  if (issue?.isPullRequest && issue.number) return issue.number;
  const origin = latestOrigin(comments);
  if (origin?.prNumber) return origin.prNumber;
  const blob = commentBodies(comments).join('\n');
  const match = blob.match(/\bPR:\s*#?(\d+)\b/i) || blob.match(/pull\/(\d+)/i);
  return match ? toPositiveInt(match[1]) : null;
}

function summarizeChecks(rows) {
  const checks = Array.isArray(rows) ? rows : [];
  if (!checks.length) return { state: 'none', failedNames: [], pendingNames: [] };
  const failed = checks.filter((check) => FAILED_CHECK_CONCLUSIONS.has(safeString(check?.conclusion).toLowerCase()));
  const pending = checks.filter((check) => {
    const status = safeString(check?.status).toLowerCase();
    const conclusion = safeString(check?.conclusion).toLowerCase();
    return PENDING_CHECK_STATUSES.has(status) && !conclusion;
  });
  if (failed.length) {
    return { state: 'failure', failedNames: failed.map((check) => safeString(check.name)).filter(Boolean), pendingNames: [] };
  }
  if (pending.length) {
    return { state: 'pending', failedNames: [], pendingNames: pending.map((check) => safeString(check.name)).filter(Boolean) };
  }
  const allPassing = checks.every((check) => PASSING_CHECK_CONCLUSIONS.has(safeString(check?.conclusion).toLowerCase()));
  return { state: allPassing ? 'success' : 'unknown', failedNames: [], pendingNames: [] };
}

function summarizeWorkflows(rows) {
  const runs = Array.isArray(rows) ? rows : [];
  if (!runs.length) return { state: 'none', failedNames: [], pendingNames: [] };
  return summarizeChecks(runs.map((run) => ({
    name: run?.name,
    status: run?.status,
    conclusion: run?.conclusion,
  })));
}

function currentGenerationEvidence(comments) {
  const claims = parseCursorActivationClaimsFromComments(comments);
  const latestClaim = claims.length ? claims[claims.length - 1] : null;
  const origin = latestOrigin(comments);
  const blob = commentBodies(comments).join('\n');
  const agentId = origin?.cursorAgentId || latestClaim?.agentRunId || extractCursorAgentIdFromText(blob);
  const runId = origin?.cursorRunId || extractCursorRunIdFromText(blob);
  const lifecycle = findLatestLifecycleState(comments, agentId || undefined);
  const completions = parseCursorCompletionEventsFromComments(comments);
  const latestCompletion = completions.length ? completions[completions.length - 1] : null;
  return {
    claimStatus: latestClaim?.status || null,
    claimActive: latestClaim ? isActiveClaimStatus(latestClaim.status) : false,
    cursorAgentId: agentId || null,
    cursorRunId: runId || null,
    lifecyclePhase: lifecycle?.phase || null,
    lifecycleError: lifecycle?.lastError || null,
    completionPresent: Boolean(latestCompletion),
  };
}

function explicitBlocker({ labels, generation, checkSummary, workflowSummary, comments }) {
  if (labels.includes(DISPATCH_LABEL_BLOCKED)) return 'dispatch:blocked label on source issue';
  if (generation.lifecyclePhase === 'FAILED' && generation.lifecycleError) {
    return `cursor_lifecycle_failed:${generation.lifecycleError}`.slice(0, 256);
  }
  if (generation.lifecyclePhase === 'FAILED') return 'cursor_lifecycle_failed';
  if (checkSummary.state === 'failure') {
    return `required_check_failed:${checkSummary.failedNames[0] || 'check'}`.slice(0, 256);
  }
  if (workflowSummary.state === 'failure') {
    return `workflow_run_failed:${workflowSummary.failedNames[0] || 'workflow'}`.slice(0, 256);
  }
  const blob = commentBodies(comments).join('\n');
  const match = blob.match(/Exact blocker:\s*(.+)/i) || blob.match(/Blocker:\s*(.+)/i);
  if (match) return safeString(match[1]).split('\n')[0].slice(0, 256);
  return null;
}

function agentReportConflicts({ agentReport, classification, pullRequest, checkSummary }) {
  if (!agentReport) return false;
  const completed = ['COMPLETED', 'COMPLETE', 'DONE', 'REVIEW_READY'].includes(agentReport.status);
  if (!completed) return false;
  if (classification === 'TERMINAL' || classification === 'REVIEW_READY') return false;
  if (!pullRequest || pullRequest.draft || pullRequest.state !== 'open') return true;
  if (checkSummary.state === 'failure' || checkSummary.state === 'pending' || checkSummary.state === 'none') return true;
  return classification !== 'REVIEW_READY' && classification !== 'TERMINAL';
}

function classifySnapshot({
  issue,
  labels,
  pullRequest,
  generation,
  checkSummary,
  workflowSummary,
  protectedGate,
  paused,
}) {
  if (safeString(issue?.state).toLowerCase() === 'closed' || pullRequest?.merged) {
    return { classification: 'TERMINAL', blocker: null };
  }
  if (protectedGate && protectedGate !== 'none') {
    return { classification: 'PROTECTED_GATE', blocker: `protected_gate:${protectedGate}` };
  }
  if (generation.lifecyclePhase === 'STALE' && !pullRequest) {
    return { classification: 'BLOCKED', blocker: 'cursor_lifecycle_stale_no_pr' };
  }
  const blocker = explicitBlocker({
    labels, generation, checkSummary, workflowSummary, comments: [],
  });
  if (blocker && (labels.includes(DISPATCH_LABEL_BLOCKED) || generation.lifecyclePhase === 'FAILED' || checkSummary.state === 'failure' || workflowSummary.state === 'failure')) {
    return { classification: 'BLOCKED', blocker };
  }
  if (pullRequest && !pullRequest.draft && pullRequest.state === 'open' && checkSummary.state === 'success') {
    return { classification: 'REVIEW_READY', blocker: null };
  }
  if (generation.cursorAgentId && generation.cursorRunId) {
    return { classification: 'ACTIVE', blocker: null };
  }
  if (pullRequest && pullRequest.state === 'open' && (checkSummary.state === 'pending' || pullRequest.draft)) {
    return { classification: 'ACTIVE', blocker: null };
  }
  if (paused) {
    return { classification: 'NO_MOVEMENT', blocker: 'execution:paused' };
  }
  return { classification: 'NO_MOVEMENT', blocker: null };
}

function decide({ classification, labels, blocker, protectedGate }) {
  if (classification === 'TERMINAL') {
    return {
      decision: 'hold',
      nextPermittedAction: 'do_not_reselect',
      blocker: null,
    };
  }
  if (classification === 'PROTECTED_GATE') {
    return {
      decision: 'escalate',
      nextPermittedAction: `anton_only:${protectedGate}`,
      blocker,
    };
  }
  if (classification === 'BLOCKED') {
    return {
      decision: 'block',
      nextPermittedAction: 'record_exact_blocker',
      blocker,
    };
  }
  if (classification === 'REVIEW_READY') {
    return {
      decision: 'advance',
      nextPermittedAction: 'release_execution_wip_merge_review_gate',
      blocker: null,
    };
  }
  if (classification === 'ACTIVE') {
    return {
      decision: 'hold',
      nextPermittedAction: 'no_duplicate_activation',
      blocker: null,
    };
  }
  if (labels.includes(DISPATCH_LABEL_PAUSED)) {
    return {
      decision: 'hold',
      nextPermittedAction: 'paused_no_activation',
      blocker: 'execution:paused',
    };
  }
  if (labels.includes(DISPATCH_LABEL_OPERATOR_REVIEW)) {
    return {
      decision: 'hold',
      nextPermittedAction: 'operator_review_no_activation',
      blocker: null,
    };
  }
  if (labels.includes(DISPATCH_LABEL_READY) || !labels.includes('dispatch:cursor-claimed')) {
    return {
      decision: 'advance',
      nextPermittedAction: 'factory_cursor_handoff_owns_activation',
      blocker: null,
    };
  }
  return {
    decision: 'hold',
    nextPermittedAction: 'await_current_generation_evidence',
    blocker: null,
  };
}

function fingerprintFor(snapshot) {
  const canonical = JSON.stringify({
    repository: snapshot.repository,
    issue: snapshot.issue?.number,
    issueState: snapshot.issue?.state,
    labels: snapshot.issue?.labels,
    pr: snapshot.pullRequest?.number,
    prState: snapshot.pullRequest?.state,
    draft: snapshot.pullRequest?.draft,
    merged: snapshot.pullRequest?.merged,
    headSha: snapshot.headSha,
    checkState: snapshot.checkRuns?.state,
    workflowState: snapshot.workflowRuns?.state,
    agentId: snapshot.cursor?.cursorAgentId,
    runId: snapshot.cursor?.cursorRunId,
    classification: snapshot.classification,
    decision: snapshot.controllerDecision,
    blocker: snapshot.blocker,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Evaluate one Commercial Lane source item through existing Relay reads.
 *
 * @param {Record<string, unknown>} input
 * @param {Record<string, unknown>} [deps]
 */
export async function evaluateCommercialLaneWatch(input, deps = {}) {
  const parsed = parseCommercialLaneWatchInput(input);
  const nowMs = Number.isFinite(deps.nowMs) ? deps.nowMs : Date.now();
  const executeRelay = deps.executeRelay || executeAgentRelayWork;
  const replaySuffix = `${parsed.sourceIssue}-${parsed.correlationId || 'watch'}`;
  const operations = [];
  const requestIds = [];

  const read = async (operation, number, expectedSha = '') => {
    const outcome = await relayRead(operation, {
      repository: parsed.repository,
      number,
      expectedSha,
      nowMs,
      correlationId: parsed.correlationId,
      replaySuffix,
      executeRelay,
      fetchFn: deps.fetchFn,
      configOverrides: deps.configOverrides,
      prisma: deps.prisma,
    });
    operations.push(operation);
    if (outcome.result?.body?.requestId) requestIds.push(outcome.result.body.requestId);
    if (!outcome.result?.body?.ok) {
      const error = watchError(outcome.result?.body?.error || 'GITHUB_EVIDENCE_UNAVAILABLE', outcome.result?.status || 503);
      error.relay = outcome.result?.body || null;
      throw error;
    }
    return outcome.result.body;
  };

  const issueBody = await read('issue.get_metadata', parsed.sourceIssue);
  const commentsBody = await read('issue.list_comments', parsed.sourceIssue);
  const issue = issueBody.evidence?.issue || null;
  const comments = Array.isArray(commentsBody.evidence?.comments) ? commentsBody.evidence.comments : [];
  const labels = Array.isArray(issue?.labels) ? issue.labels : [];
  const prNumber = inferPrNumber({ requested: parsed.pullRequest, issue, comments });

  let pullRequest = null;
  let headSha = null;
  let checkRuns = [];
  let workflowRuns = [];
  if (prNumber) {
    const prBody = await read('pull_request.get_metadata', prNumber);
    pullRequest = prBody.evidence?.pullRequest || null;
    headSha = safeString(pullRequest?.headSha).toLowerCase() || null;
    if (headSha && SHA_PATTERN.test(headSha)) {
      const headBody = await read('pull_request.get_head', prNumber, headSha);
      headSha = safeString(headBody.evidence?.head?.sha).toLowerCase() || headSha;
      const checksBody = await read('pull_request.list_check_runs', prNumber, headSha);
      checkRuns = Array.isArray(checksBody.evidence?.checkRuns) ? checksBody.evidence.checkRuns : [];
      const workflowsBody = await read('pull_request.list_workflow_runs', prNumber, headSha);
      workflowRuns = Array.isArray(workflowsBody.evidence?.workflowRuns) ? workflowsBody.evidence.workflowRuns : [];
    }
  }

  const generation = currentGenerationEvidence(comments);
  const checkSummary = summarizeChecks(checkRuns);
  const workflowSummary = summarizeWorkflows(workflowRuns);
  const textBlob = [
    issue?.title,
    ...commentBodies(comments).slice(-8),
    pullRequest?.title,
  ].filter(Boolean).join('\n');
  const protectedGate = inferProtectedSubjectsAndConsequentialGate(textBlob).consequentialGate || 'none';
  const classified = classifySnapshot({
    issue,
    labels,
    pullRequest,
    generation,
    checkSummary,
    workflowSummary,
    protectedGate,
    paused: labels.includes(DISPATCH_LABEL_PAUSED),
  });

  let classification = classified.classification;
  let blocker = classified.blocker || explicitBlocker({
    labels, generation, checkSummary, workflowSummary, comments,
  });
  const reportConflicts = agentReportConflicts({
    agentReport: parsed.agentReport,
    classification,
    pullRequest,
    checkSummary,
  });
  if (reportConflicts) {
    classification = 'BLOCKED';
    blocker = 'agent_report_conflicts_with_relay_github_evidence';
  }

  const decided = decide({
    classification,
    labels,
    blocker,
    protectedGate,
  });

  const snapshot = {
    schema: COMMERCIAL_LANE_WATCH_SCHEMA,
    repository: parsed.repository,
    issue: issue ? {
      number: issue.number,
      state: issue.state,
      title: issue.title,
      labels,
      url: issue.url || null,
      updatedAt: issue.updatedAt || null,
    } : { number: parsed.sourceIssue, state: null, title: null, labels: [], url: null, updatedAt: null },
    pullRequest: pullRequest ? {
      number: pullRequest.number,
      state: pullRequest.state,
      draft: Boolean(pullRequest.draft),
      merged: Boolean(pullRequest.merged),
      mergeable: pullRequest.mergeable,
      mergeableState: pullRequest.mergeableState || null,
      url: pullRequest.url || null,
    } : null,
    headSha,
    checkRuns: { state: checkSummary.state, items: checkRuns.slice(0, 12) },
    workflowRuns: { state: workflowSummary.state, items: workflowRuns.slice(0, 8) },
    cursor: {
      cursorAgentId: generation.cursorAgentId,
      cursorRunId: generation.cursorRunId,
      claimStatus: generation.claimStatus,
      lifecyclePhase: generation.lifecyclePhase,
      completionPresent: generation.completionPresent,
    },
    classification,
    controllerDecision: decided.decision,
    blocker: decided.blocker,
    nextPermittedAction: decided.nextPermittedAction,
    agentReportRejected: reportConflicts,
    commentMarker: {
      used: false,
      reason: 'read_only_snapshot_is_the_controller_handoff',
    },
    provenance: {
      source: AGENT_RELAY_WORK_SCHEMA,
      operations,
      requestIds,
      observedAt: isoNow(nowMs),
    },
  };
  snapshot.fingerprint = fingerprintFor(snapshot);
  snapshot.activationAttempted = false;
  snapshot.statusMutationAttempted = false;
  snapshot.protectedActionTriggered = false;
  return snapshot;
}

async function readBoundedJsonBody(req) {
  if (isPlainObject(req.body) && !Buffer.isBuffer(req.body)) {
    const encoded = Buffer.byteLength(JSON.stringify(req.body));
    return encoded <= COMMERCIAL_LANE_WATCH_MAX_BYTES ? req.body : undefined;
  }
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body) > COMMERCIAL_LANE_WATCH_MAX_BYTES) return undefined;
    try { return JSON.parse(req.body); } catch { return null; }
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += Buffer.byteLength(chunk);
    if (total > COMMERCIAL_LANE_WATCH_MAX_BYTES) return undefined;
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export async function commercialLaneWatchHandler(req, res, deps = {}) {
  if (String(req.method || '').toUpperCase() !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json(resultEnvelope(null, { ok: false, error: 'METHOD_NOT_ALLOWED' }));
  }
  if (!verifyAgentRelayControlPlaneAuth(req, deps)) {
    return res.status(401).json(resultEnvelope(null, { ok: false, error: 'UNAUTHORIZED' }));
  }
  const body = await readBoundedJsonBody(req);
  if (body === undefined) return res.status(413).json(resultEnvelope(null, { ok: false, error: 'PAYLOAD_TOO_LARGE' }));
  if (body === null) return res.status(400).json(resultEnvelope(null, { ok: false, error: 'INVALID_JSON' }));
  try {
    const snapshot = await evaluateCommercialLaneWatch(body, deps);
    return res.status(200).json(resultEnvelope(snapshot, { ok: true }));
  } catch (error) {
    const code = safeString(error?.code || error?.message) || 'GITHUB_EVIDENCE_UNAVAILABLE';
    const status = error?.status || (/REPOSITORY_NOT_ALLOWED|OPERATION_NOT_ALLOWED/.test(code) ? 403 : /MALFORMED|INVALID|UNKNOWN|UNSUPPORTED/.test(code) ? 400 : 503);
    return res.status(status).json(resultEnvelope(null, { ok: false, error: code }));
  }
}

export default commercialLaneWatchHandler;
