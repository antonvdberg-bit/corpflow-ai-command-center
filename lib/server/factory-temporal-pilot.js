/**
 * CorpFlowAI Factory Temporal real-production pilot (#1130).
 *
 * Temporal-shaped supervisory workflow that wraps the current GitHub/Cursor
 * factory loop. GitHub remains the durable work source of truth.
 * CorpFlowAI Cursor Factory Handoff remains the sole Cursor wake path.
 * Cloud Agents API v1 is invoked only inside Handoff — never from here.
 *
 * This module does not open a live Temporal connection, SSH, mint a secret,
 * or start the 72-hour pilot. Live activation stays fail-closed until Anton
 * completes the exact protected packet.
 *
 * @see docs/operations/TEMPORAL_FACTORY_REAL_PRODUCTION_PILOT_V1.md
 * @see lib/server/factory-cursor-handoff.js
 * @see lib/server/factory-queue-reconcile.js
 * @see lib/server/factory-cloud-agents-executor.js
 */

import { findAiWorkRequest } from './ai-work-request-lifecycle.js';
import { CI_FAILURE_SUPERVISOR_SCHEMA } from './ci-failure-cursor-supervisor.js';
import {
  parseCursorActivationClaimsFromComments,
  parseCursorRequeuesFromComments,
  sliceCommentsAfterLatestCursorRequeue,
} from './cursor-activation-claim.js';
import { CURSOR_WIP_MAX_SLOTS, CURSOR_WIP_TEMPORAL_EXTRA_SLOTS, CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS, CURSOR_WIP_PRODUCTION_RESERVE_SLOTS, inspectIssueWipState, resolveEffectiveCursorWipMaxSlots } from './cursor-wip-control.js';
import { findKnownCloudAgentsExecutorEvidence } from './factory-cloud-agents-executor.js';
import {
  FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  hasRecentFactoryHandoff,
} from './factory-cursor-handoff.js';
import { resolveFactoryQueueReconcileDecision } from './factory-queue-reconcile.js';

export const FACTORY_TEMPORAL_PILOT_SCHEMA = 'corpflow.factory_temporal_pilot.v1';

export const FACTORY_TEMPORAL_PILOT_TASK_QUEUE = 'corpflow-factory-pilot';

export const FACTORY_TEMPORAL_PILOT_WORKFLOW_NAME = 'factoryPilotSupervisory';

export const FACTORY_TEMPORAL_PILOT_RECONCILE_TIMER_MS = 5 * 60 * 1000;

export const FACTORY_TEMPORAL_PILOT_WAKE_REASON = 'temporal_supervisory';

export const FACTORY_TEMPORAL_PILOT_WORKFLOW_FILE = 'factory-temporal-pilot.yml';

export const FACTORY_TEMPORAL_PILOT_GITHUB_WORKFLOW_NAME =
  'CorpFlowAI Factory Temporal Pilot';

export const PILOT_SOURCE_ISSUE = 1130;

export const PILOT_VERDICT_READY =
  'TEMPORAL REAL-PRODUCTION PILOT READY FOR ACTIVATION';

export const PILOT_LIVE_ACTIVATION_APPROVAL_MARKER =
  'OPERATOR APPROVAL — PROCEED THROUGH TEMPORAL REAL-PRODUCTION PILOT ACTIVATION';

export const PILOT_ACTIVE_VARIABLE = 'CORPFLOW_TEMPORAL_PILOT';

export const PILOT_ACTIVE_VARIABLE_VALUE = 'active';

export const PILOT_ACTIVE_ENV = 'CORPFLOW_TEMPORAL_PILOT_ACTIVE';

export const PILOT_EXACT_PROTECTED_ACTION =
  'After merge of the #1130 PR: (1) comment the exact approval marker on #1130, (2) set GitHub Actions repository variable CORPFLOW_TEMPORAL_PILOT=active, (3) Run workflow “CorpFlowAI Factory Temporal Pilot” on main. No SSH, no new secret, no token mint, no supervisor disable.';

export const PILOT_BOUNDED_CORRECTION_PATH = 'CI Cursor repair supervisor';

export const PILOT_ALLOWED_ACTIONS = Object.freeze([
  'inspect_github',
  'rank_eligible',
  'no_op_wait',
  'request_canonical_handoff',
  'detect_ci_state',
  'request_bounded_correction',
  'wait_operator_review',
  'wait_cursor_run',
  'observe_lifecycle',
  'post_non_secret_status',
]);

export const PILOT_FORBIDDEN_ACTIONS = Object.freeze([
  'production_deploy',
  'db_schema_mutation',
  'env_secrets_change',
  'payment_action',
  'live_message_send',
  'external_outreach',
  'paid_tool',
  'public_client_launch',
  'dns_firewall_change',
  'new_credential_surface',
  'production_client_data_mutation',
  'unauthorized_merge',
  'direct_cursor_api_call',
  'legacy_dispatcher_wake',
  'disable_existing_supervisor',
]);

export const PILOT_APPROVAL_MARKERS = Object.freeze([
  'OPERATOR GATE AUTHORIZATION',
  'ANTON DURABLE APPROVAL',
  'ANTON EXPLICIT OPERATOR AUTHORIZATION',
  'APPROVAL:',
  PILOT_LIVE_ACTIVATION_APPROVAL_MARKER,
]);

export const PILOT_METRIC_KEYS = Object.freeze([
  'eligible_to_pickup_ms',
  'waiting_resume_ms',
  'automatic_continuation_count',
  'recovery_count',
  'manual_controller_interventions_avoided',
  'duplicate_activations',
  'protected_gates_respected',
  'idle_capacity_with_eligible_work',
]);

/**
 * Current vs target factory control plane. Overlapping supervisors stay live
 * during the 72-hour pilot. Demote/retire only after an explicit PASS.
 */
export const FACTORY_CONTROL_PLANE_V1 = Object.freeze({
  schema: 'corpflow.factory_control_plane.v1',
  spine: 'one_supervisory_orchestration_spine',
  sourceOfTruth: 'github',
  cursorWakePath: FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  cursorExecutor: 'handoff_selected_cloud_agents_v1_or_wake_proof',
  wipMaxSlots: CURSOR_WIP_MAX_SLOTS,
  wipPilotMaxSlots: CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS,
  wipProductionReserveSlots: CURSOR_WIP_PRODUCTION_RESERVE_SLOTS,
  wipTemporalExtraSlots: CURSOR_WIP_TEMPORAL_EXTRA_SLOTS,
  temporalRole: 'durable_execution_state_timers_retries_wait_signal_resume',
  reasoningRole: 'choose_next_safe_allowlisted_action_from_github_state',
  n8nRole: 'exception_notification_only',
  components: Object.freeze([
    Object.freeze({
      id: 'factory-cursor-handoff',
      path: '.github/workflows/factory-cursor-handoff.yml',
      class: 'event-driven-cursor-wake',
      pilot: 'retain-primary',
      ifPass: 'retain-primary',
      notes: 'Sole production Cursor wake. Temporal may request it; must not replace it.',
    }),
    Object.freeze({
      id: 'factory-cloud-agents-executor',
      path: 'lib/server/factory-cloud-agents-executor.js',
      class: 'handoff-executor',
      pilot: 'retain-inside-handoff',
      ifPass: 'retain-inside-handoff',
      notes: 'Cloud Agents API v1 runs only after Handoff selects an issue. Temporal never calls Cursor.',
    }),
    Object.freeze({
      id: 'factory-queue-reconcile',
      path: '.github/workflows/factory-queue-reconcile.yml',
      class: 'scheduled-reconciliation',
      pilot: 'retain-fallback',
      ifPass: 'demote-schedule-after-72h-pass',
      notes: '#1023 10-minute missed-event scan. Keep during the pilot. Demote only after Temporal timers prove they cover missed events.',
    }),
    Object.freeze({
      id: 'cursor-agent-lifecycle-status',
      path: '.github/workflows/cursor-agent-lifecycle-status.yml',
      class: 'lifecycle-claimed-run-poller',
      pilot: 'retain',
      ifPass: 'retain-until-github-evidence-replaces-polling',
      notes: 'Capacity backfill for claimed bc-* runs; workflow_calls Handoff. Not a second dispatcher.',
    }),
    Object.freeze({
      id: 'ci-failure-cursor-supervisor',
      path: '.github/workflows/ci-failure-cursor-supervisor.yml',
      class: 'lifecycle-ci-repair',
      pilot: 'retain',
      ifPass: 'retain',
      notes: 'Existing bounded CI correction path. Pilot requests this path; does not invent a Cursor API caller.',
    }),
    Object.freeze({
      id: 'factory-dispatcher-activate',
      path: '.github/workflows/factory-dispatcher-activate.yml',
      class: 'legacy-diagnostic',
      pilot: 'retain-diagnostic-only',
      ifPass: 'retain-diagnostic-only',
      notes: 'Background Agents API. Must not be the production wake path.',
    }),
    Object.freeze({
      id: 'factory-control-loop',
      path: '.github/workflows/factory-control-loop.yml',
      class: 'drift-monitor',
      pilot: 'retain',
      ifPass: 'retain',
      notes: 'Health/deploy SHA drift. Does not select work.',
    }),
    Object.freeze({
      id: 'n8n-github-heartbeat',
      path: 'docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md',
      class: 'n8n-overlap',
      pilot: 'retain-exception-notify',
      ifPass: 'retain-exception-notify',
      notes: 'Do not duplicate Temporal scheduling. Later simplification may retire overlapping timers, not in this PR.',
    }),
    Object.freeze({
      id: 'temporal-phase1-pr-1034',
      path: 'PR #1034 (obsolete)',
      class: 'superseded-packet',
      pilot: 'discard-do-not-merge',
      ifPass: 'close-unmerged',
      notes: 'Obsolete against current main (WIP=2 era, no Cloud Agents/work_request/generation contracts). Do not rebase to save it.',
    }),
    Object.freeze({
      id: 'temporal-pilot-supervisor',
      path: 'lib/server/factory-temporal-pilot.js',
      class: 'temporal-supervisory',
      pilot: 'introduce-activation-prepared',
      ifPass: 'promote-to-active-supervisor',
      notes: 'Durable wait/signal/resume + allow-listed next action. Live wake remains fail-closed until the exact Anton packet.',
    }),
  ]),
});

/**
 * Effective Cursor ceiling for the Temporal control plane: 3 outside the
 * pilot, 5 while `CORPFLOW_TEMPORAL_PILOT=active`.
 *
 * @param {{
 *   pilotActive?: boolean,
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined> | null,
 * }} [input]
 */
export function resolveFactoryControlPlaneWipMaxSlots(input = {}) {
  return resolveEffectiveCursorWipMaxSlots(input);
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toPositiveIssueNumber(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
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
 * @param {unknown} labels
 * @returns {string[]}
 */
function normalizeLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((label) => {
      if (typeof label === 'string') return label;
      if (label && typeof label === 'object' && label.name) return String(label.name);
      return '';
    })
    .filter(Boolean);
}

function emptyMetrics() {
  return {
    eligible_to_pickup_ms: null,
    waiting_resume_ms: null,
    automatic_continuation_count: 0,
    recovery_count: 0,
    manual_controller_interventions_avoided: 0,
    duplicate_activations: 0,
    protected_gates_respected: 0,
    idle_capacity_with_eligible_work: 0,
  };
}

/**
 * @param {number} sourceIssue
 * @param {number} [generation]
 */
export function temporalWorkflowIdForIssue(sourceIssue, generation = 1) {
  const n = toPositiveIssueNumber(sourceIssue);
  if (n == null) throw new Error('temporalWorkflowIdForIssue: sourceIssue required');
  const gen = Math.max(1, Math.floor(Number(generation) || 1));
  return `corpflow-factory-pilot:${n}:g${gen}`;
}

/**
 * @param {unknown} text
 */
export function hasDurableApprovalMarker(text) {
  const body = String(text || '');
  return PILOT_APPROVAL_MARKERS.some((marker) => body.includes(marker));
}

/**
 * @param {Array<{ body?: string | null }> | null | undefined} comments
 */
export function commentsHaveDurableApproval(comments) {
  if (!Array.isArray(comments)) return false;
  return comments.some((comment) => hasDurableApprovalMarker(comment?.body));
}

/**
 * @param {Array<{ body?: string | null }> | null | undefined} comments
 */
export function commentsHavePilotActivationApproval(comments) {
  if (!Array.isArray(comments)) return false;
  return comments.some((comment) =>
    String(comment?.body || '').includes(PILOT_LIVE_ACTIVATION_APPROVAL_MARKER),
  );
}

/**
 * Observe current-generation GitHub execution evidence. Temporal must not
 * invent a second work_request_id, claim, bc-* or run-*.
 *
 * @param {{
 *   sourceIssue?: number | null,
 *   comments?: Array<{ body?: string | null, created_at?: string | null }> | null,
 *   issue?: { number?: unknown, comments?: unknown, labels?: unknown, linkedPrs?: unknown } | null,
 *   nowMs?: number,
 * }} [input]
 */
export function observeCurrentGenerationExecution(input = {}) {
  const comments = Array.isArray(input.comments)
    ? input.comments
    : Array.isArray(input.issue?.comments)
      ? input.issue.comments
      : [];
  const sourceIssue =
    toPositiveIssueNumber(input.sourceIssue) || toPositiveIssueNumber(input.issue?.number);
  const scoped = sliceCommentsAfterLatestCursorRequeue(comments);
  const requeues = parseCursorRequeuesFromComments(comments);
  const generation = Math.max(1, Number(requeues[0]?.generation) || 1);
  const claims = parseCursorActivationClaimsFromComments(scoped.comments).filter(
    (claim) => Number(claim.generation) >= generation,
  );
  const latestClaim = claims[0] || null;
  const workRequest = findAiWorkRequest(
    input.issue || { number: sourceIssue },
    scoped.comments,
  );
  const cloudAgents = sourceIssue
    ? findKnownCloudAgentsExecutorEvidence(scoped.comments, sourceIssue)
    : null;
  const inspected = input.issue ? inspectIssueWipState(input.issue) : null;
  const claimStatus = String(latestClaim?.status || '').toLowerCase();
  const liveClaim = claimStatus === 'pending' || claimStatus === 'activated';
  const liveCloudAgent = Boolean(cloudAgents?.cursor_agent_id && cloudAgents.status === 'IN_PROGRESS');
  const liveWorkRequest = String(workRequest?.status || '').toUpperCase() === 'IN_PROGRESS';
  const recentHandoff =
    sourceIssue != null &&
    hasRecentFactoryHandoff(comments, sourceIssue, { nowMs: input.nowMs });
  const verifiedLive = Boolean(inspected?.verifiedLive);
  const reviewInventory = Boolean(inspected?.reviewInventory);
  const hasLiveCurrentGenerationRun =
    verifiedLive || liveCloudAgent || liveWorkRequest || liveClaim;

  return {
    schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
    sourceIssue,
    generation,
    work_request_id: workRequest?.work_request_id || null,
    claim_status: latestClaim?.status || null,
    claim_token: latestClaim?.claimToken || null,
    cursor_agent_id: cloudAgents?.cursor_agent_id || latestClaim?.agentRunId || null,
    cursor_run_id: cloudAgents?.cursor_run_id || null,
    verifiedLive,
    reviewInventory,
    recentHandoff,
    hasLiveCurrentGenerationRun,
    suppressDuplicateActivation: hasLiveCurrentGenerationRun || recentHandoff,
  };
}

/**
 * Build the GitHub Actions request Temporal may make. This is a request
 * object only — this packet does not POST it from Cursor Cloud.
 *
 * @param {{ sourceIssue: number, wakeReason?: string | null }} opts
 */
export function buildCanonicalHandoffDispatch(opts = {}) {
  const sourceIssue = toPositiveIssueNumber(opts.sourceIssue);
  if (sourceIssue == null) {
    throw new Error('buildCanonicalHandoffDispatch: sourceIssue required');
  }
  return {
    kind: 'github_workflow_call',
    workflowFile: 'factory-cursor-handoff.yml',
    workflowName: FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
    ref: 'refs/heads/main',
    inputs: {
      target_issue: String(sourceIssue),
      wake_reason: emptyToNull(opts.wakeReason) || FACTORY_TEMPORAL_PILOT_WAKE_REASON,
      capacity_wake_requested: 'false',
    },
    forbiddenWorkflows: Object.freeze(['factory-dispatcher-activate.yml']),
    forbiddenDirectApis: Object.freeze(['cursor.com/v1/agents', 'CURSOR_FACTORY_WAKE_WEBHOOK']),
  };
}

/**
 * Fail-closed live worker gate. Presence of an address name is not permission
 * to connect; this packet never opens Temporal, SSH, or a new secret.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 */
export function resolveLiveTemporalPilotGate(env = process.env) {
  const addressSet = Boolean(emptyToNull(env?.TEMPORAL_ADDRESS));
  const variableActive =
    String(env?.[PILOT_ACTIVE_ENV] || env?.[PILOT_ACTIVE_VARIABLE] || '')
      .trim()
      .toLowerCase() === PILOT_ACTIVE_VARIABLE_VALUE;
  return {
    allowed: false,
    addressConfigured: addressSet,
    variableActive,
    reason: variableActive
      ? 'live Temporal pilot remains fail-closed in this repo packet until the exact Anton activation packet is performed outside Cursor Cloud'
      : 'live Temporal pilot not started — CORPFLOW_TEMPORAL_PILOT unset (fail-closed)',
    exactProtectedAction: PILOT_EXACT_PROTECTED_ACTION,
  };
}

/**
 * Live activation is Anton-authorized after merge. Cursor Cloud must not
 * start the pilot, mint a token, or workflow_dispatch Handoff from this
 * process (that would create a second wake path / agent loop).
 *
 * @param {{
 *   comments?: Array<{ body?: string | null }> | null,
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
 *   githubActions?: boolean,
 *   ref?: string | null,
 * }} [input]
 */
export function evaluateLiveActivationBoundary(input = {}) {
  const env = input.env && typeof input.env === 'object' ? input.env : {};
  const antonApproved = commentsHavePilotActivationApproval(input.comments);
  const variableActive =
    String(env[PILOT_ACTIVE_ENV] || env[PILOT_ACTIVE_VARIABLE] || '')
      .trim()
      .toLowerCase() === PILOT_ACTIVE_VARIABLE_VALUE;
  const githubActions = Boolean(input.githubActions);
  const refIsMain =
    String(input.ref || '').trim() === 'refs/heads/main' ||
    String(input.ref || '').trim() === 'main';
  const wouldActivate = antonApproved && variableActive && githubActions && refIsMain;

  let exactBlocker = PILOT_EXACT_PROTECTED_ACTION;
  if (!antonApproved) {
    exactBlocker =
      'live activation requires the #1130 OPERATOR APPROVAL marker on GitHub';
  } else if (!variableActive) {
    exactBlocker =
      'set GitHub Actions repository variable CORPFLOW_TEMPORAL_PILOT=active (no new secret)';
  } else if (!githubActions || !refIsMain) {
    exactBlocker =
      'Cursor Cloud must not start the live Temporal pilot; run CorpFlowAI Factory Temporal Pilot on main after the variable is set';
  }

  return {
    schema: 'corpflow.factory_temporal_pilot_live_activation.v1',
    antonApproved,
    variableActive,
    githubActions,
    refIsMain,
    cursorCloudMustNotActivate: true,
    canActivateNow: false,
    wouldActivateOnApprovedGithubActions: wouldActivate,
    dispatchFromThisProcess: false,
    sshRequired: false,
    newSecretRequired: false,
    disableExistingSupervisors: false,
    exactBlocker,
    exactProtectedAction: PILOT_EXACT_PROTECTED_ACTION,
  };
}

/**
 * Fail-closed dispatcher. Never POSTs from this process.
 *
 * @param {{ sourceIssue: number }} [opts]
 */
export function requestCanonicalHandoffDispatch(opts = {}) {
  return {
    sent: false,
    reason: 'cursor_cloud_must_not_workflow_dispatch_handoff',
    request: buildCanonicalHandoffDispatch({ sourceIssue: opts.sourceIssue }),
    boundary: evaluateLiveActivationBoundary({ githubActions: false }),
  };
}

/**
 * @param {{
 *   requestedAction?: string | null,
 *   labels?: unknown,
 *   comments?: Array<{ body?: string | null, created_at?: string | null }> | null,
 *   issue?: object | null,
 *   plan?: object | null,
 *   claimedIssues?: unknown[],
 *   recentHandoff?: boolean,
 *   ci?: { conclusion?: string | null, correctionRequested?: boolean, fingerprint?: string | null } | null,
 *   protectedGateActive?: boolean,
 *   durableApprovalMarker?: boolean,
 *   workflowSnapshot?: { handoffRequested?: boolean, generation?: number | null } | null,
 *   nowMs?: number,
 *   eventType?: string | null,
 * }} input
 */
export function decideNextSafeAction(input = {}) {
  const requested = emptyToNull(input.requestedAction);
  if (requested && PILOT_FORBIDDEN_ACTIONS.includes(requested)) {
    return {
      schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
      action: 'wait_operator_review',
      reason: 'protected_action_forbidden',
      forbiddenAction: requested,
      sourceIssue: toPositiveIssueNumber(input.plan?.activationTargetIssue),
      handoffRequest: null,
    };
  }
  if (requested && !PILOT_ALLOWED_ACTIONS.includes(requested)) {
    return {
      schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
      action: 'wait_operator_review',
      reason: 'action_not_on_pilot_allow_list',
      forbiddenAction: requested,
      sourceIssue: toPositiveIssueNumber(input.plan?.activationTargetIssue),
      handoffRequest: null,
    };
  }

  const labels = normalizeLabels(input.labels);
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const targetFromPlan = toPositiveIssueNumber(input.plan?.activationTargetIssue);
  const observed = observeCurrentGenerationExecution({
    sourceIssue: targetFromPlan,
    comments,
    issue: input.issue || { number: targetFromPlan, comments, labels },
    nowMs: input.nowMs,
  });
  const approved =
    Boolean(input.durableApprovalMarker) || commentsHaveDurableApproval(comments);
  const operatorReview = labels.includes('dispatch:operator-review');
  const paused = labels.includes('execution:paused');

  if ((input.protectedGateActive || operatorReview || paused) && !approved) {
    return {
      schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
      action: 'wait_operator_review',
      reason: paused
        ? 'execution_paused_stop'
        : input.protectedGateActive
          ? 'protected_gate_stop'
          : 'operator_review_stop',
      sourceIssue: targetFromPlan,
      observed,
      handoffRequest: null,
    };
  }

  if (observed.reviewInventory && !approved) {
    return {
      schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
      action: 'wait_operator_review',
      reason: 'review_ready_zero_wip',
      sourceIssue: targetFromPlan,
      observed,
      handoffRequest: null,
    };
  }

  if (observed.hasLiveCurrentGenerationRun) {
    return {
      schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
      action: 'wait_cursor_run',
      reason: 'current_generation_live_run',
      sourceIssue: targetFromPlan,
      observed,
      handoffRequest: null,
    };
  }

  if (input.ci?.conclusion === 'failure' && !input.ci?.correctionRequested) {
    return {
      schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
      action: 'request_bounded_correction',
      reason: 'ci_failure',
      correctionPath: PILOT_BOUNDED_CORRECTION_PATH,
      correctionSchema: CI_FAILURE_SUPERVISOR_SCHEMA,
      sourceIssue: targetFromPlan,
      observed,
      handoffRequest: null,
    };
  }

  const recentHandoff =
    Boolean(input.recentHandoff) ||
    Boolean(input.workflowSnapshot?.handoffRequested) ||
    observed.recentHandoff;

  const reconcile = resolveFactoryQueueReconcileDecision({
    plan: input.plan,
    claimedIssues: input.claimedIssues,
    recentHandoff,
  });

  if (reconcile.shouldWakeHandoff && reconcile.source_issue != null) {
    const wakeObserved = observeCurrentGenerationExecution({
      sourceIssue: reconcile.source_issue,
      comments,
      issue: input.issue || { number: reconcile.source_issue, comments, labels },
      nowMs: input.nowMs,
    });
    if (wakeObserved.suppressDuplicateActivation) {
      return {
        schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
        action: 'no_op_wait',
        reason: 'duplicate_activation_suppressed',
        sourceIssue: reconcile.source_issue,
        observed: wakeObserved,
        handoffRequest: null,
      };
    }
    return {
      schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
      action: 'request_canonical_handoff',
      reason: reconcile.reason,
      sourceIssue: reconcile.source_issue,
      observed: wakeObserved,
      handoffRequest: buildCanonicalHandoffDispatch({
        sourceIssue: reconcile.source_issue,
        wakeReason: FACTORY_TEMPORAL_PILOT_WAKE_REASON,
      }),
    };
  }

  if (input.ci?.conclusion === 'success' || operatorReview) {
    return {
      schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
      action: 'wait_operator_review',
      reason:
        reconcile.reason === 'operator_review_gated'
          ? reconcile.reason
          : 'ci_green_operator_review',
      sourceIssue: targetFromPlan,
      observed,
      handoffRequest: null,
    };
  }

  return {
    schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
    action: 'no_op_wait',
    reason: reconcile.reason || 'no_ready_work',
    sourceIssue: reconcile.source_issue,
    observed,
    handoffRequest: null,
  };
}

/**
 * @param {number} sourceIssue
 * @param {number} [generation]
 */
function emptySnapshot(sourceIssue, generation = 1) {
  const issue = toPositiveIssueNumber(sourceIssue);
  const gen = Math.max(1, Math.floor(Number(generation) || 1));
  return {
    schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
    workflowId: issue == null ? null : temporalWorkflowIdForIssue(issue, gen),
    workflowName: FACTORY_TEMPORAL_PILOT_WORKFLOW_NAME,
    taskQueue: FACTORY_TEMPORAL_PILOT_TASK_QUEUE,
    sourceIssue: issue,
    generation: gen,
    status: 'running',
    lastAction: 'inspect_github',
    lastReason: 'start',
    handoffRequested: false,
    handoffCount: 0,
    correctionRequested: false,
    correctionCount: 0,
    statusPostCount: 0,
    appliedFingerprints: [],
    history: [],
    metrics: emptyMetrics(),
    eligibleAtMs: null,
    waitingStartedAtMs: null,
    evidenceChain: {
      issue,
      generation: gen,
      temporalWorkflowId: issue == null ? null : temporalWorkflowIdForIssue(issue, gen),
      work_request_id: null,
      claim_status: null,
      cursor_agent_id: null,
      cursor_run_id: null,
      handoff: null,
      pr: null,
      ci: null,
      terminalEvidence: null,
    },
  };
}

function recordMetrics(snapshot, decision, event, nowMs) {
  const metrics = snapshot.metrics;
  const type = String(event?.type || '');
  if (decision.reason === 'protected_gate_stop' || decision.reason === 'protected_action_forbidden') {
    metrics.protected_gates_respected += 1;
  }
  if (decision.reason === 'duplicate_activation_suppressed') {
    metrics.duplicate_activations += 1;
  }
  if (
    decision.action === 'request_canonical_handoff' &&
    Number(snapshot.planAvailableSlots || 0) > 0
  ) {
    // healthy path — not an idle incident
  } else if (
    decision.action !== 'request_canonical_handoff' &&
    decision.reason === 'eligible_ready_work'
  ) {
    metrics.idle_capacity_with_eligible_work += 1;
  }

  if (decision.action === 'request_canonical_handoff') {
    if (snapshot.eligibleAtMs != null && metrics.eligible_to_pickup_ms == null) {
      metrics.eligible_to_pickup_ms = Math.max(0, nowMs - snapshot.eligibleAtMs);
    }
    if (snapshot.waitingStartedAtMs != null && metrics.waiting_resume_ms == null) {
      metrics.waiting_resume_ms = Math.max(0, nowMs - snapshot.waitingStartedAtMs);
    }
    if (type === 'timer_reconcile') {
      metrics.recovery_count += 1;
      metrics.automatic_continuation_count += 1;
      metrics.manual_controller_interventions_avoided += 1;
    } else if (type === 'approval_marker' || type === 'lifecycle' || type === 'ci_result' || type === 'requeue') {
      metrics.automatic_continuation_count += 1;
      metrics.manual_controller_interventions_avoided += 1;
    }
    snapshot.waitingStartedAtMs = null;
  }

  if (
    decision.action === 'wait_operator_review' ||
    decision.action === 'wait_cursor_run' ||
    decision.action === 'no_op_wait'
  ) {
    if (snapshot.waitingStartedAtMs == null) snapshot.waitingStartedAtMs = nowMs;
  }
}

/**
 * In-process Temporal stand-in: durable snapshots survive worker kill/restore.
 * Used for repo proofs. Not a second work database — GitHub remains SoT.
 */
export function createPilotRuntime() {
  /** @type {Map<string, ReturnType<typeof emptySnapshot>>} */
  const store = new Map();
  /** @type {Array<ReturnType<typeof buildCanonicalHandoffDispatch>>} */
  const handoffInvocations = [];
  /** @type {Array<{ path: string, fingerprint?: string | null, sourceIssue: number | null }>} */
  const correctionRequests = [];
  /** @type {Array<{ sourceIssue: number | null, kind: string }>} */
  const statusPosts = [];
  const totals = emptyMetrics();
  let workerAlive = true;

  function snapshotKey(sourceIssue, generation = 1) {
    return temporalWorkflowIdForIssue(sourceIssue, generation);
  }

  function getSnapshot(sourceIssue, generation = 1) {
    const id = snapshotKey(sourceIssue, generation);
    if (!store.has(id)) store.set(id, emptySnapshot(sourceIssue, generation));
    return store.get(id);
  }

  /**
   * @param {{
   *   type: string,
   *   fingerprint: string,
   *   sourceIssue: number,
   *   github?: Parameters<typeof decideNextSafeAction>[0],
   *   nowMs?: number,
   *   work_request_id?: string | null,
   *   cursor_agent_id?: string | null,
   *   cursor_run_id?: string | null,
   *   pr?: number | string | null,
   *   ci?: string | null,
   *   terminalEvidence?: string | null,
   * }} event
   */
  function applyEvent(event) {
    if (!workerAlive) {
      throw new Error('Temporal worker is down; persist the event and restore before applying');
    }
    const sourceIssue = toPositiveIssueNumber(event.sourceIssue);
    if (sourceIssue == null) throw new Error('applyEvent: sourceIssue required');
    const github = event.github && typeof event.github === 'object' ? { ...event.github } : {};
    const comments = Array.isArray(github.comments) ? github.comments : [];
    const observed = observeCurrentGenerationExecution({
      sourceIssue,
      comments,
      issue: github.issue || { number: sourceIssue, comments, labels: github.labels },
      nowMs: event.nowMs,
    });
    const generation = observed.generation || 1;
    const fingerprint = emptyToNull(event.fingerprint) || `${event.type}:${sourceIssue}:g${generation}`;
    const snapshot = getSnapshot(sourceIssue, generation);
    const nowMs = Number.isFinite(event.nowMs) ? Number(event.nowMs) : Date.now();

    if (snapshot.appliedFingerprints.includes(fingerprint)) {
      snapshot.lastAction = 'no_op_wait';
      snapshot.lastReason = 'replay_idempotent';
      snapshot.history.push({
        type: event.type,
        fingerprint,
        action: snapshot.lastAction,
        reason: snapshot.lastReason,
      });
      return snapshot;
    }

    github.workflowSnapshot = snapshot;
    if (snapshot.correctionRequested) {
      github.ci = { ...(github.ci || {}), correctionRequested: true };
    }
    if (!github.issue) {
      github.issue = { number: sourceIssue, comments, labels: github.labels };
    }

    const decision = decideNextSafeAction(github);
    snapshot.planAvailableSlots = github.plan?.availableSlots ?? null;

    if (decision.reason === 'eligible_ready_work' && snapshot.eligibleAtMs == null) {
      snapshot.eligibleAtMs = nowMs;
    }

    if (decision.action === 'request_canonical_handoff' && decision.handoffRequest) {
      handoffInvocations.push(decision.handoffRequest);
      snapshot.handoffRequested = true;
      snapshot.handoffCount += 1;
      snapshot.evidenceChain.handoff = decision.handoffRequest;
      snapshot.statusPostCount += 1;
      statusPosts.push({ sourceIssue, kind: 'non_secret_handoff_status' });
    }

    if (decision.action === 'request_bounded_correction') {
      snapshot.correctionRequested = true;
      snapshot.correctionCount += 1;
      snapshot.evidenceChain.ci = github.ci?.conclusion || 'failure';
      correctionRequests.push({
        path: PILOT_BOUNDED_CORRECTION_PATH,
        fingerprint: github.ci?.fingerprint || null,
        sourceIssue,
      });
    }

    if (decision.action === 'wait_operator_review') {
      snapshot.status = 'waiting_operator';
    } else if (decision.action === 'wait_cursor_run') {
      snapshot.status = 'waiting_cursor';
    } else if (decision.action === 'no_op_wait') {
      snapshot.status = 'waiting';
    } else {
      snapshot.status = 'running';
    }

    recordMetrics(snapshot, decision, event, nowMs);
    totals.automatic_continuation_count +=
      snapshot.metrics.automatic_continuation_count - (snapshot._lastAuto || 0);
    totals.recovery_count += snapshot.metrics.recovery_count - (snapshot._lastRecovery || 0);
    totals.manual_controller_interventions_avoided +=
      snapshot.metrics.manual_controller_interventions_avoided - (snapshot._lastAvoided || 0);
    totals.duplicate_activations +=
      snapshot.metrics.duplicate_activations - (snapshot._lastDup || 0);
    totals.protected_gates_respected +=
      snapshot.metrics.protected_gates_respected - (snapshot._lastGates || 0);
    totals.idle_capacity_with_eligible_work +=
      snapshot.metrics.idle_capacity_with_eligible_work - (snapshot._lastIdle || 0);
    snapshot._lastAuto = snapshot.metrics.automatic_continuation_count;
    snapshot._lastRecovery = snapshot.metrics.recovery_count;
    snapshot._lastAvoided = snapshot.metrics.manual_controller_interventions_avoided;
    snapshot._lastDup = snapshot.metrics.duplicate_activations;
    snapshot._lastGates = snapshot.metrics.protected_gates_respected;
    snapshot._lastIdle = snapshot.metrics.idle_capacity_with_eligible_work;

    if (event.work_request_id) snapshot.evidenceChain.work_request_id = event.work_request_id;
    if (observed.work_request_id) snapshot.evidenceChain.work_request_id = observed.work_request_id;
    if (event.cursor_agent_id || observed.cursor_agent_id) {
      snapshot.evidenceChain.cursor_agent_id = event.cursor_agent_id || observed.cursor_agent_id;
    }
    if (event.cursor_run_id || observed.cursor_run_id) {
      snapshot.evidenceChain.cursor_run_id = event.cursor_run_id || observed.cursor_run_id;
    }
    snapshot.evidenceChain.claim_status = observed.claim_status;
    snapshot.evidenceChain.generation = generation;
    if (event.pr != null) snapshot.evidenceChain.pr = event.pr;
    if (event.ci != null) snapshot.evidenceChain.ci = event.ci;
    if (event.terminalEvidence) {
      snapshot.evidenceChain.terminalEvidence = event.terminalEvidence;
      snapshot.status = 'terminal';
    }

    snapshot.lastAction = decision.action;
    snapshot.lastReason = decision.reason;
    snapshot.appliedFingerprints.push(fingerprint);
    snapshot.history.push({
      type: event.type,
      fingerprint,
      action: decision.action,
      reason: decision.reason,
    });
    return snapshot;
  }

  return {
    applyEvent,
    killWorker() {
      workerAlive = false;
    },
    restoreWorker() {
      workerAlive = true;
    },
    isWorkerAlive() {
      return workerAlive;
    },
    getSnapshot,
    handoffInvocations,
    correctionRequests,
    statusPosts,
    totals,
    store,
  };
}

export function formatPilotEvidenceComment(snapshot, extra = {}) {
  const metrics = snapshot?.metrics || emptyMetrics();
  const evidence = {
    schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
    source_issue: snapshot?.sourceIssue || null,
    generation: snapshot?.generation || 1,
    workflow_id: snapshot?.workflowId || null,
    last_action: snapshot?.lastAction || null,
    last_reason: snapshot?.lastReason || null,
    work_request_id: snapshot?.evidenceChain?.work_request_id || null,
    cursor_agent_id: snapshot?.evidenceChain?.cursor_agent_id || null,
    cursor_run_id: snapshot?.evidenceChain?.cursor_run_id || null,
    duplicate_activations: metrics.duplicate_activations,
    protected_gates_respected: metrics.protected_gates_respected,
    idle_capacity_with_eligible_work: metrics.idle_capacity_with_eligible_work,
    automatic_continuation_count: metrics.automatic_continuation_count,
    recovery_count: metrics.recovery_count,
    recorded_at: extra.recordedAt || new Date().toISOString(),
  };
  return `TEMPORAL PILOT EVIDENCE

Issue: #${evidence.source_issue || 'n/a'}
Generation: ${evidence.generation}
Workflow: ${evidence.workflow_id || 'n/a'}
Last action: ${evidence.last_action || 'n/a'}
Reason: ${evidence.last_reason || 'n/a'}
work_request_id: ${evidence.work_request_id || 'n/a'}
Cursor agent: ${evidence.cursor_agent_id || 'n/a'}
Cursor run: ${evidence.cursor_run_id || 'n/a'}
duplicate_activations: ${evidence.duplicate_activations}
protected_gates_respected: ${evidence.protected_gates_respected}
idle_capacity_with_eligible_work: ${evidence.idle_capacity_with_eligible_work}

This comment is evidence only. It does not wake Cursor, merge, deploy, or change secrets.

<!-- ${FACTORY_TEMPORAL_PILOT_SCHEMA} ${JSON.stringify(evidence)} -->
`;
}

export function parsePilotEvidence(textValue) {
  const match = String(textValue || '').match(
    new RegExp(`<!--\\s*${FACTORY_TEMPORAL_PILOT_SCHEMA}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Repo-only resource snapshot. No live Temporal load, no new VM, no paid tool.
 */
export function pilotResourceSnapshot() {
  return {
    schema: 'corpflow.factory_temporal_pilot_resources.v1',
    liveTemporalLoadAddedByThisPacket: false,
    cursorCloudSsh: false,
    newVm: false,
    paidTool: false,
    publicTemporalExposure: false,
    productionPostgresReused: false,
    secondTaskDatabase: false,
    overlappingSupervisorsDisabled: false,
    note: 'This packet adds no live Temporal load. The 72-hour real-work pilot starts only after the exact Anton activation packet. Existing Handoff / Queue Reconcile / lifecycle / CI repair stay live.',
  };
}
