/**
 * CorpFlowAI Factory Temporal Phase 1 (#1032).
 *
 * Temporal-shaped supervisory workflow that wraps the existing GitHub/Cursor
 * factory loop. GitHub remains the durable work source of truth.
 * CorpFlowAI Cursor Factory Handoff remains the sole Cursor wake path.
 * This module does not open a live Temporal connection, SSH, or new credential.
 *
 * @see docs/operations/TEMPORAL_FACTORY_PHASE1_V1.md
 * @see lib/server/factory-cursor-handoff.js
 * @see lib/server/factory-queue-reconcile.js
 */

import { CI_FAILURE_SUPERVISOR_SCHEMA } from './ci-failure-cursor-supervisor.js';
import {
  FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  hasRecentFactoryHandoff,
} from './factory-cursor-handoff.js';
import { resolveFactoryQueueReconcileDecision } from './factory-queue-reconcile.js';

export const FACTORY_TEMPORAL_PHASE1_SCHEMA = 'corpflow.factory_temporal_phase1.v1';

export const FACTORY_TEMPORAL_TASK_QUEUE = 'corpflow-factory-phase1';

export const FACTORY_TEMPORAL_WORKFLOW_NAME = 'factoryPhase1Supervisory';

export const FACTORY_TEMPORAL_RECONCILE_TIMER_MS = 10 * 60 * 1000;

export const PHASE1_VERDICT_PASS =
  'AUTONOMOUS DELIVERY PHASE 1 PASS — CONTROLLED OPERATING PILOT READY';

export const PHASE1_LIVE_WORKER_BLOCKER =
  'L3 Temporal worker start on corpflow-exec-01 with a least-privilege GitHub token that can only workflow_dispatch CorpFlowAI Cursor Factory Handoff';

export const PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER =
  'OPERATOR APPROVAL — PROCEED THROUGH LIVE TEMPORAL PHASE 1 ACTIVATION';

export const PHASE1_EXEC01_HOSTNAME = 'corpflow-exec-01';

/** Box-local token path only. Not a Vercel / .env.template app secret name. */
export const PHASE1_L3_HANDOFF_TOKEN_PATH = '~/.corpflow-temporal-handoff.token';

export const PHASE1_FORBIDDEN_HANDOFF_TOKEN_ENV = Object.freeze([
  'CMP_GITHUB_TOKEN',
  'GH_WORKFLOW_TOKEN',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'CURSOR_FACTORY_WAKE_WEBHOOK',
  'CURSOR_FACTORY_WAKE_AUTH_HEADER',
  'POSTGRES_URL',
]);

export const PHASE1_ALLOWED_ACTIONS = Object.freeze([
  'inspect_github',
  'rank_eligible',
  'no_op_wait',
  'request_canonical_handoff',
  'detect_ci_state',
  'request_bounded_correction',
  'wait_operator_review',
  'release_stale_synthetic_claim',
  'post_non_secret_status',
]);

export const PHASE1_FORBIDDEN_ACTIONS = Object.freeze([
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
]);

export const PHASE1_APPROVAL_MARKERS = Object.freeze([
  'OPERATOR GATE AUTHORIZATION',
  'ANTON DURABLE APPROVAL',
  'ANTON EXPLICIT OPERATOR AUTHORIZATION',
  'APPROVAL:',
  PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER,
]);

export const PHASE1_BOUNDED_CORRECTION_PATH = 'CI Cursor repair supervisor';

/**
 * Current vs target factory control plane. Structured so tests can lock the
 * retain / demote / retire decisions without duplicating dispatcher logic.
 */
export const FACTORY_CONTROL_PLANE_V1 = Object.freeze({
  schema: 'corpflow.factory_control_plane.v1',
  spine: 'one_supervisory_orchestration_spine',
  sourceOfTruth: 'github',
  cursorWakePath: FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  temporalRole: 'durable_execution_state_timers_retries_wait_signal_resume',
  reasoningRole: 'choose_next_safe_allowlisted_action_from_github_state',
  n8nRole: 'exception_notification_only',
  components: Object.freeze([
    Object.freeze({
      id: 'factory-cursor-handoff',
      path: '.github/workflows/factory-cursor-handoff.yml',
      class: 'event-driven-cursor-wake',
      phase1: 'retain-primary',
      notes: 'Sole production Cursor wake. Temporal may request it; must not replace it.',
    }),
    Object.freeze({
      id: 'factory-queue-reconcile',
      path: '.github/workflows/factory-queue-reconcile.yml',
      class: 'scheduled-reconciliation',
      phase1: 'retain-fallback-until-live-temporal-timer',
      notes: '#1023 10-minute missed-event scan. Demote only after Temporal timer is proven on exec-01.',
    }),
    Object.freeze({
      id: 'cursor-agent-lifecycle-status',
      path: '.github/workflows/cursor-agent-lifecycle-status.yml',
      class: 'lifecycle-claimed-run-poller',
      phase1: 'retain',
      notes: 'Capacity backfill for claimed runs; workflow_calls Handoff. Not a second dispatcher.',
    }),
    Object.freeze({
      id: 'ci-failure-cursor-supervisor',
      path: '.github/workflows/ci-failure-cursor-supervisor.yml',
      class: 'lifecycle-ci-repair',
      phase1: 'retain',
      notes: 'Existing bounded CI correction path. Phase 1 requests this path; does not invent a new Cursor API caller.',
    }),
    Object.freeze({
      id: 'factory-dispatcher-activate',
      path: '.github/workflows/factory-dispatcher-activate.yml',
      class: 'legacy-diagnostic',
      phase1: 'retain-diagnostic-only',
      notes: 'Background Agents API. Must not be the production wake path.',
    }),
    Object.freeze({
      id: 'factory-control-loop',
      path: '.github/workflows/factory-control-loop.yml',
      class: 'drift-monitor',
      phase1: 'retain',
      notes: 'Health/deploy SHA drift. Does not select work.',
    }),
    Object.freeze({
      id: 'factory-housekeeping',
      path: '.github/workflows/factory-housekeeping.yml',
      class: 'github-hygiene',
      phase1: 'retain',
      notes: 'Stale CMP sandbox cleanup. Does not select factory execution work.',
    }),
    Object.freeze({
      id: 'n8n-github-heartbeat',
      path: 'docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md',
      class: 'n8n-overlap',
      phase1: 'retain-exception-notify',
      notes: 'Do not duplicate Temporal scheduling. Later simplification may retire overlapping supervisors, not in Phase 1.',
    }),
    Object.freeze({
      id: 'temporal-phase1-supervisor',
      path: 'lib/server/factory-temporal-phase1.js',
      class: 'temporal-supervisory',
      phase1: 'introduce-live-activation-prepared',
      notes: 'Durable wait/signal/resume + allow-listed next action. Live worker remains fail-closed from Cursor Cloud; L3 operator-paste only.',
    }),
  ]),
});

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
  return labels.map((label) => {
    if (typeof label === 'string') return label;
    if (label && typeof label === 'object' && label.name) return String(label.name);
    return '';
  }).filter(Boolean);
}

/**
 * @param {number} sourceIssue
 */
export function temporalWorkflowIdForIssue(sourceIssue) {
  const n = toPositiveIssueNumber(sourceIssue);
  if (n == null) throw new Error('temporalWorkflowIdForIssue: sourceIssue required');
  return `corpflow-factory-phase1:${n}`;
}

/**
 * @param {unknown} text
 */
export function hasDurableApprovalMarker(text) {
  const body = String(text || '');
  return PHASE1_APPROVAL_MARKERS.some((marker) => body.includes(marker));
}

/**
 * @param {Array<{ body?: string | null }> | null | undefined} comments
 */
export function commentsHaveDurableApproval(comments) {
  if (!Array.isArray(comments)) return false;
  return comments.some((comment) => hasDurableApprovalMarker(comment?.body));
}

/**
 * Build the GitHub Actions dispatch that Temporal may request. This is a
 * request object only — Phase 1 does not POST it from Cursor Cloud.
 *
 * @param {{ sourceIssue: number, wakeReason?: string | null }} opts
 */
export function buildCanonicalHandoffDispatch(opts = {}) {
  const sourceIssue = toPositiveIssueNumber(opts.sourceIssue);
  if (sourceIssue == null) {
    throw new Error('buildCanonicalHandoffDispatch: sourceIssue required');
  }
  return {
    kind: 'github_workflow_dispatch',
    workflowFile: 'factory-cursor-handoff.yml',
    workflowName: FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
    ref: 'refs/heads/main',
    inputs: {
      target_issue: String(sourceIssue),
      wake_reason: emptyToNull(opts.wakeReason) || 'temporal_supervisory',
    },
    forbiddenWorkflows: Object.freeze(['factory-dispatcher-activate.yml']),
  };
}

/**
 * Fail-closed live worker gate. Presence of an address name is not permission
 * to connect; this packet never opens Temporal, SSH, or a new secret.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 */
export function resolveLiveTemporalWorkerGate(env = process.env) {
  const addressSet = Boolean(emptyToNull(env?.TEMPORAL_ADDRESS));
  return {
    allowed: false,
    addressConfigured: addressSet,
    reason: addressSet
      ? 'live Temporal connect is not implemented in the Phase 1 repo packet'
      : 'live Temporal worker not started — TEMPORAL_ADDRESS unset (fail-closed)',
    exactProtectedAction: PHASE1_LIVE_WORKER_BLOCKER,
  };
}

/**
 * @param {unknown} hostname
 */
export function isCorpflowExec01Hostname(hostname) {
  const host = String(hostname || '').trim().toLowerCase();
  return host === PHASE1_EXEC01_HOSTNAME || host.startsWith(`${PHASE1_EXEC01_HOSTNAME}-`);
}

/**
 * Live activation is Anton-authorized on #1032, but Cursor Cloud must not
 * SSH, mint a token, reuse app GitHub tokens, or workflow_dispatch Handoff
 * (that would create a second wake path / agent loop).
 *
 * @param {{
 *   hostname?: string | null,
 *   comments?: Array<{ body?: string | null }> | null,
 *   tokenPathExists?: boolean,
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
 * }} [input]
 */
export function evaluateLiveActivationBoundary(input = {}) {
  const env = input.env && typeof input.env === 'object' ? input.env : {};
  const antonApproved = commentsHaveDurableApproval(input.comments);
  const hostIsExec01 = isCorpflowExec01Hostname(input.hostname);
  const reusedAppToken = PHASE1_FORBIDDEN_HANDOFF_TOKEN_ENV.some((name) =>
    Boolean(emptyToNull(env[name])),
  );
  const tokenPathExists = Boolean(input.tokenPathExists);
  const canActivateNow = antonApproved && hostIsExec01 && tokenPathExists && !reusedAppToken;
  let exactBlocker = PHASE1_LIVE_WORKER_BLOCKER;
  if (!hostIsExec01) {
    exactBlocker =
      'HOST_MISMATCH — Cursor Cloud has no SSH to corpflow-exec-01; live Temporal worker is operator-paste L3 only';
  } else if (!tokenPathExists) {
    exactBlocker =
      `box-local least-privilege Handoff token missing at ${PHASE1_L3_HANDOFF_TOKEN_PATH} (do not reuse CMP_GITHUB_TOKEN / GITHUB_TOKEN)`;
  } else if (reusedAppToken) {
    exactBlocker =
      'refuse reused app GitHub / factory webhook secrets — mint a box-local workflow_dispatch-only token';
  } else if (!antonApproved) {
    exactBlocker = 'live activation requires the #1032 OPERATOR APPROVAL marker';
  }

  return {
    schema: 'corpflow.factory_temporal_phase1_live_activation.v1',
    antonApproved,
    hostIsExec01,
    cursorCloudSsh: false,
    tokenPath: PHASE1_L3_HANDOFF_TOKEN_PATH,
    tokenPathExists,
    reusedAppToken,
    canActivateNow: false,
    wouldActivateOnExec01: canActivateNow,
    dispatchFromThisProcess: false,
    exactBlocker,
    exactProtectedAction: PHASE1_LIVE_WORKER_BLOCKER,
  };
}

/**
 * Build the GitHub API request Temporal may POST from exec-01 only.
 * Cursor Cloud must not send this request.
 *
 * @param {{ sourceIssue: number, wakeReason?: string | null, repository?: string | null }} opts
 */
export function buildCanonicalHandoffDispatchRequest(opts = {}) {
  const dispatch = buildCanonicalHandoffDispatch(opts);
  const repository = emptyToNull(opts.repository) || 'antonvdberg-bit/corpflow-ai-command-center';
  return {
    ...dispatch,
    method: 'POST',
    url: `https://api.github.com/repos/${repository}/actions/workflows/${dispatch.workflowFile}/dispatches`,
    body: {
      ref: 'main',
      inputs: dispatch.inputs,
    },
    requiredTokenPrivilege: 'actions:write workflow_dispatch on factory-cursor-handoff.yml only',
    sendFromCursorCloud: false,
  };
}

/**
 * Fail-closed dispatcher. Never POSTs. Used so tests lock the no-loop rule.
 *
 * @param {{ sourceIssue: number, hostname?: string | null, token?: string | null }} [opts]
 */
export function requestCanonicalHandoffDispatch(opts = {}) {
  const boundary = evaluateLiveActivationBoundary({
    hostname: opts.hostname,
    comments: [{ body: PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER }],
    tokenPathExists: Boolean(emptyToNull(opts.token)),
  });
  return {
    sent: false,
    reason: 'cursor_cloud_must_not_workflow_dispatch_handoff',
    request: buildCanonicalHandoffDispatchRequest({ sourceIssue: opts.sourceIssue }),
    boundary,
  };
}

/**
 * @param {{
 *   requestedAction?: string | null,
 *   labels?: unknown,
 *   comments?: Array<{ body?: string | null, created_at?: string | null }> | null,
 *   plan?: object | null,
 *   claimedIssues?: unknown[],
 *   recentHandoff?: boolean,
 *   ci?: { conclusion?: string | null, correctionRequested?: boolean, fingerprint?: string | null } | null,
 *   staleSyntheticClaim?: boolean,
 *   protectedGateActive?: boolean,
 *   durableApprovalMarker?: boolean,
 *   workflowSnapshot?: { handoffRequested?: boolean } | null,
 *   nowMs?: number,
 * }} input
 */
export function decideNextSafeAction(input = {}) {
  const requested = emptyToNull(input.requestedAction);
  if (requested && PHASE1_FORBIDDEN_ACTIONS.includes(requested)) {
    return {
      schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
      action: 'wait_operator_review',
      reason: 'protected_action_forbidden',
      forbiddenAction: requested,
      sourceIssue: toPositiveIssueNumber(input.plan?.activationTargetIssue),
      handoffRequest: null,
    };
  }
  if (requested && !PHASE1_ALLOWED_ACTIONS.includes(requested)) {
    return {
      schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
      action: 'wait_operator_review',
      reason: 'action_not_on_phase1_allow_list',
      forbiddenAction: requested,
      sourceIssue: toPositiveIssueNumber(input.plan?.activationTargetIssue),
      handoffRequest: null,
    };
  }

  const labels = normalizeLabels(input.labels);
  const approved =
    Boolean(input.durableApprovalMarker) || commentsHaveDurableApproval(input.comments);
  const operatorReview = labels.includes('dispatch:operator-review');
  const paused = labels.includes('execution:paused');

  if ((input.protectedGateActive || operatorReview || paused) && !approved) {
    return {
      schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
      action: 'wait_operator_review',
      reason: paused
        ? 'execution_paused_stop'
        : input.protectedGateActive
          ? 'protected_gate_stop'
          : 'operator_review_stop',
      sourceIssue: toPositiveIssueNumber(input.plan?.activationTargetIssue),
      handoffRequest: null,
    };
  }

  if (input.ci?.conclusion === 'failure' && !input.ci?.correctionRequested) {
    return {
      schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
      action: 'request_bounded_correction',
      reason: 'ci_failure',
      correctionPath: PHASE1_BOUNDED_CORRECTION_PATH,
      correctionSchema: CI_FAILURE_SUPERVISOR_SCHEMA,
      sourceIssue: toPositiveIssueNumber(input.plan?.activationTargetIssue),
      handoffRequest: null,
    };
  }

  const comments = Array.isArray(input.comments) ? input.comments : [];
  const targetFromPlan = toPositiveIssueNumber(input.plan?.activationTargetIssue);
  const recentHandoff =
    Boolean(input.recentHandoff) ||
    Boolean(input.workflowSnapshot?.handoffRequested) ||
    (targetFromPlan != null &&
      hasRecentFactoryHandoff(comments, targetFromPlan, { nowMs: input.nowMs }));

  const reconcile = resolveFactoryQueueReconcileDecision({
    plan: input.plan,
    claimedIssues: input.claimedIssues,
    recentHandoff,
  });

  if (reconcile.shouldWakeHandoff && reconcile.source_issue != null) {
    return {
      schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
      action: 'request_canonical_handoff',
      reason: reconcile.reason,
      sourceIssue: reconcile.source_issue,
      handoffRequest: buildCanonicalHandoffDispatch({
        sourceIssue: reconcile.source_issue,
        wakeReason: 'temporal_supervisory',
      }),
    };
  }

  if (input.staleSyntheticClaim) {
    return {
      schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
      action: 'release_stale_synthetic_claim',
      reason: 'stale_synthetic_claim',
      sourceIssue: targetFromPlan,
      handoffRequest: null,
    };
  }

  if (input.ci?.conclusion === 'success' || operatorReview) {
    return {
      schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
      action: 'wait_operator_review',
      reason: reconcile.reason === 'operator_review_gated' ? reconcile.reason : 'ci_green_operator_review',
      sourceIssue: targetFromPlan,
      handoffRequest: null,
    };
  }

  return {
    schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
    action: 'no_op_wait',
    reason: reconcile.reason || 'no_ready_work',
    sourceIssue: reconcile.source_issue,
    handoffRequest: null,
  };
}

/**
 * @param {number} sourceIssue
 */
function emptySnapshot(sourceIssue) {
  const issue = toPositiveIssueNumber(sourceIssue);
  return {
    schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
    workflowId: issue == null ? null : temporalWorkflowIdForIssue(issue),
    workflowName: FACTORY_TEMPORAL_WORKFLOW_NAME,
    taskQueue: FACTORY_TEMPORAL_TASK_QUEUE,
    sourceIssue: issue,
    status: 'running',
    lastAction: 'inspect_github',
    lastReason: 'start',
    handoffRequested: false,
    handoffCount: 0,
    correctionRequested: false,
    correctionCount: 0,
    statusPostCount: 0,
    staleClaimReleased: false,
    appliedFingerprints: [],
    history: [],
    evidenceChain: {
      issue: issue,
      temporalWorkflowId: issue == null ? null : temporalWorkflowIdForIssue(issue),
      handoff: null,
      cursorRun: null,
      pr: null,
      ci: null,
      terminalEvidence: null,
    },
  };
}

/**
 * In-process Temporal stand-in: durable snapshots survive worker kill/restore.
 * Used for repo-only proofs A–J. Not a second work database.
 */
export function createPhase1Runtime() {
  /** @type {Map<string, ReturnType<typeof emptySnapshot>>} */
  const store = new Map();
  /** @type {Array<ReturnType<typeof buildCanonicalHandoffDispatch>>} */
  const handoffInvocations = [];
  /** @type {Array<{ path: string, fingerprint?: string | null, sourceIssue: number | null }>} */
  const correctionRequests = [];
  /** @type {Array<{ sourceIssue: number | null, kind: string }>} */
  const statusPosts = [];
  let workerAlive = true;

  function getSnapshot(sourceIssue) {
    const id = temporalWorkflowIdForIssue(sourceIssue);
    if (!store.has(id)) store.set(id, emptySnapshot(sourceIssue));
    return store.get(id);
  }

  /**
   * @param {{
   *   type: string,
   *   fingerprint: string,
   *   sourceIssue: number,
   *   github?: Parameters<typeof decideNextSafeAction>[0],
   *   cursorRun?: string | null,
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
    const fingerprint = emptyToNull(event.fingerprint) || `${event.type}:${sourceIssue}`;
    const snapshot = getSnapshot(sourceIssue);

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

    const github = event.github && typeof event.github === 'object' ? { ...event.github } : {};
    github.workflowSnapshot = snapshot;
    if (snapshot.correctionRequested) {
      github.ci = { ...(github.ci || {}), correctionRequested: true };
    }

    const decision = decideNextSafeAction(github);

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
        path: PHASE1_BOUNDED_CORRECTION_PATH,
        fingerprint: github.ci?.fingerprint || null,
        sourceIssue,
      });
    }

    if (decision.action === 'release_stale_synthetic_claim') {
      snapshot.staleClaimReleased = true;
    }

    if (decision.action === 'wait_operator_review') {
      snapshot.status = 'waiting_operator';
    } else if (decision.action === 'no_op_wait') {
      snapshot.status = 'waiting';
    } else {
      snapshot.status = 'running';
    }

    if (event.cursorRun) snapshot.evidenceChain.cursorRun = event.cursorRun;
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
    store,
  };
}

/**
 * Repo-only resource snapshot. Live exec-01 numbers stay with #1025 evidence
 * and are not re-probed from Cursor Cloud (no SSH).
 */
export function phase1ResourceSnapshot() {
  return {
    schema: 'corpflow.factory_temporal_phase1_resources.v1',
    liveTemporalLoadAddedByThisPacket: false,
    cursorCloudSsh: false,
    newVm: false,
    publicTemporalExposure: false,
    productionPostgresReused: false,
    note: 'Phase 1 repo packet adds no live Temporal load. Live host snapshot remains the #1025 POC baseline until the L3 operator-paste worker is started on corpflow-exec-01.',
  };
}
