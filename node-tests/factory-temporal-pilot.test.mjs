/**
 * #1130 — Temporal real-production pilot: current-main factory contracts,
 * restart/idempotency, and 72-hour evidence metrics.
 *
 * Repo-only. Does not start a live Temporal worker, SSH, or Cursor wake.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildAiWorkRequest,
  formatAiWorkRequestComment,
} from '../lib/server/ai-work-request-lifecycle.js';
import {
  buildCursorActivationClaim,
  buildCursorRequeueMarker,
  formatCursorActivationClaimComment,
  formatCursorRequeueComment,
} from '../lib/server/cursor-activation-claim.js';
import {
  formatDispatchActivatedComment,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  isInheritedTemporalPilotWake,
  resolveFactoryDispatcherRunPlan,
} from '../lib/server/cursor-ready-event-dispatch.js';
import { CURSOR_WIP_MAX_SLOTS } from '../lib/server/cursor-wip-control.js';
import {
  formatCloudAgentsExecutorEvidence,
} from '../lib/server/factory-cloud-agents-executor.js';
import { FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME } from '../lib/server/factory-cursor-handoff.js';
import {
  FACTORY_CONTROL_PLANE_V1,
  FACTORY_TEMPORAL_PILOT_GITHUB_WORKFLOW_NAME,
  FACTORY_TEMPORAL_PILOT_SCHEMA,
  FACTORY_TEMPORAL_PILOT_TASK_QUEUE,
  FACTORY_TEMPORAL_PILOT_WAKE_REASON,
  FACTORY_TEMPORAL_PILOT_WORKFLOW_FILE,
  PILOT_ALLOWED_ACTIONS,
  PILOT_BOUNDED_CORRECTION_PATH,
  PILOT_EXACT_PROTECTED_ACTION,
  PILOT_FORBIDDEN_ACTIONS,
  PILOT_LIVE_ACTIVATION_APPROVAL_MARKER,
  PILOT_METRIC_KEYS,
  PILOT_SOURCE_ISSUE,
  PILOT_VERDICT_READY,
  buildCanonicalHandoffDispatch,
  commentsHavePilotActivationApproval,
  createPilotRuntime,
  decideNextSafeAction,
  evaluateLiveActivationBoundary,
  formatPilotEvidenceComment,
  observeCurrentGenerationExecution,
  parsePilotEvidence,
  pilotResourceSnapshot,
  requestCanonicalHandoffDispatch,
  resolveLiveTemporalPilotGate,
  temporalWorkflowIdForIssue,
} from '../lib/server/factory-temporal-pilot.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const HANDOFF_WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/factory-cursor-handoff.yml');
const RECONCILE_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-queue-reconcile.yml',
);
const PILOT_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows',
  FACTORY_TEMPORAL_PILOT_WORKFLOW_FILE,
);
const LEGACY_PATH = path.join(REPO_ROOT, '.github/workflows/factory-dispatcher-activate.yml');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github/workflows');
const WORKER_PATH = path.join(REPO_ROOT, 'ops/temporal/pilot-worker.mjs');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts/factory-temporal-pilot.mjs');

const BC_A = 'bc-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RUN_A = 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function readyIssue(number, extra = {}) {
  return {
    number,
    title: extra.title || `Ready ${number}`,
    body: extra.body || 'docs only ordinary work',
    state: 'open',
    labels: extra.labels || ['dispatch:cursor-ready', 'priority:P0'],
    createdAt: extra.createdAt || '2026-08-27T10:00:00Z',
    updatedAt: extra.updatedAt || '2026-08-27T10:00:00Z',
    comments: extra.comments || [],
    linkedPrs: extra.linkedPrs || [],
  };
}

function liveClaimed(number, runId, extra = {}) {
  const generation = extra.generation || 1;
  const agentId = extra.agentId || runId.replace(/^run-/, 'bc-');
  const workRequestId = extra.workRequestId || `cfai-wr-${String(agentId).replace(/^bc-/, '')}`;
  return {
    number,
    title: `Live ${number}`,
    body: 'docs',
    state: 'open',
    labels: extra.labels || ['dispatch:cursor-claimed', 'status:in-progress'],
    comments: extra.comments || [
      {
        body: formatAiWorkRequestComment(
          buildAiWorkRequest({
            source_issue: number,
            work_request_id: workRequestId,
            origin_controller: 'factory_handoff',
            status: 'IN_PROGRESS',
          }),
        ),
        created_at: '2026-08-27T10:00:00Z',
      },
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: number,
            generation,
            claimToken: `tok-${number}`,
            status: 'activated',
            agentRunId: runId,
          }),
        ),
        created_at: '2026-08-27T10:00:01Z',
      },
      {
        body: formatDispatchActivatedComment({
          issueNumber: number,
          agentRunId: runId,
        }),
        created_at: '2026-08-27T10:00:02Z',
      },
      {
        body: formatCloudAgentsExecutorEvidence({
          source_issue: number,
          work_request_id: workRequestId,
          handoff_run_id: '33000000000',
          cursor_agent_id: agentId,
          cursor_run_id: runId,
          status: 'IN_PROGRESS',
          started_at: '2026-08-27T10:00:03Z',
        }),
        created_at: '2026-08-27T10:00:03Z',
      },
    ],
    updatedAt: '2026-08-27T11:00:00Z',
  };
}

function eligiblePlan(issueNumber, extra = {}) {
  return planCursorIssueClaims({
    readyIssues: [readyIssue(issueNumber, extra)],
    claimedIssues: extra.claimedIssues || [],
    trackedIssues: extra.trackedIssues || extra.claimedIssues || [],
  });
}

describe('factory Temporal real-production pilot control plane (#1130)', () => {
  const handoffYaml = readFileSync(HANDOFF_WORKFLOW_PATH, 'utf8');
  const reconcileYaml = readFileSync(RECONCILE_WORKFLOW_PATH, 'utf8');
  const pilotYaml = readFileSync(PILOT_WORKFLOW_PATH, 'utf8');
  const legacyYaml = readFileSync(LEGACY_PATH, 'utf8');
  const workflowFiles = readdirSync(WORKFLOWS_DIR);

  it('keeps one spine: GitHub truth, Handoff sole Cursor wake, WIP=1, Temporal is not a second dispatcher', () => {
    assert.equal(FACTORY_CONTROL_PLANE_V1.spine, 'one_supervisory_orchestration_spine');
    assert.equal(FACTORY_CONTROL_PLANE_V1.sourceOfTruth, 'github');
    assert.equal(FACTORY_CONTROL_PLANE_V1.cursorWakePath, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.equal(FACTORY_CONTROL_PLANE_V1.wipMaxSlots, 1);
    assert.equal(FACTORY_CONTROL_PLANE_V1.wipPilotMaxSlots, 1);
    assert.equal(FACTORY_CONTROL_PLANE_V1.wipProductionReserveSlots, 1);
    assert.equal(FACTORY_CONTROL_PLANE_V1.wipTemporalExtraSlots, 0);
    assert.equal(CURSOR_WIP_MAX_SLOTS, 1);
    assert.match(handoffYaml, /CORPFLOW_TEMPORAL_PILOT:\s*\$\{\{\s*vars\.CORPFLOW_TEMPORAL_PILOT\s*\}\}/);
    assert.match(reconcileYaml, /CORPFLOW_TEMPORAL_PILOT:\s*\$\{\{\s*vars\.CORPFLOW_TEMPORAL_PILOT\s*\}\}/);
    assert.match(handoffYaml, /^name:\s*CorpFlowAI Cursor Factory Handoff\s*$/m);
    assert.doesNotMatch(handoffYaml, /^\s*schedule:/m);
    assert.match(handoffYaml, /inputs\.wake_reason == 'temporal_supervisory'/);
    assert.match(reconcileYaml, /uses:\s*\.\/\.github\/workflows\/factory-cursor-handoff\.yml/);
    assert.match(pilotYaml, /^name:\s*CorpFlowAI Factory Temporal Pilot\s*$/m);
    assert.equal(FACTORY_TEMPORAL_PILOT_GITHUB_WORKFLOW_NAME, 'CorpFlowAI Factory Temporal Pilot');
    assert.match(pilotYaml, /uses:\s*\.\/\.github\/workflows\/factory-cursor-handoff\.yml/);
    assert.match(pilotYaml, /wake_reason:\s*temporal_supervisory/);
    assert.match(pilotYaml, /vars\.CORPFLOW_TEMPORAL_PILOT == 'active'/);
    assert.doesNotMatch(pilotYaml, /CURSOR_FACTORY_WAKE_WEBHOOK/);
    assert.doesNotMatch(pilotYaml, /CURSOR_API_KEY/);
    assert.doesNotMatch(pilotYaml, /factory-dispatcher-activate/);
    assert.match(legacyYaml, /workflow_dispatch:/);
    assert.equal(workflowFiles.includes('factory-temporal-wake.yml'), false);
    const handoff = FACTORY_CONTROL_PLANE_V1.components.find((c) => c.id === 'factory-cursor-handoff');
    const temporal = FACTORY_CONTROL_PLANE_V1.components.find(
      (c) => c.id === 'temporal-pilot-supervisor',
    );
    const reconcile = FACTORY_CONTROL_PLANE_V1.components.find(
      (c) => c.id === 'factory-queue-reconcile',
    );
    const obsolete = FACTORY_CONTROL_PLANE_V1.components.find(
      (c) => c.id === 'temporal-phase1-pr-1034',
    );
    assert.equal(handoff.pilot, 'retain-primary');
    assert.equal(temporal.pilot, 'introduce-activation-prepared');
    assert.equal(reconcile.pilot, 'retain-fallback');
    assert.equal(reconcile.ifPass, 'demote-schedule-after-72h-pass');
    assert.equal(obsolete.pilot, 'discard-do-not-merge');
  });

  it('allow-list excludes protected consequences and never uses the legacy API activator', () => {
    for (const action of PILOT_FORBIDDEN_ACTIONS) {
      assert.equal(PILOT_ALLOWED_ACTIONS.includes(action), false);
    }
    const dispatch = buildCanonicalHandoffDispatch({ sourceIssue: 11301 });
    assert.equal(dispatch.workflowName, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.equal(dispatch.workflowFile, 'factory-cursor-handoff.yml');
    assert.equal(dispatch.inputs.target_issue, '11301');
    assert.equal(dispatch.inputs.wake_reason, FACTORY_TEMPORAL_PILOT_WAKE_REASON);
    assert.deepEqual(dispatch.forbiddenWorkflows, ['factory-dispatcher-activate.yml']);
    const forbidden = decideNextSafeAction({ requestedAction: 'production_deploy' });
    assert.equal(forbidden.action, 'wait_operator_review');
    assert.equal(forbidden.reason, 'protected_action_forbidden');
    const directApi = decideNextSafeAction({ requestedAction: 'direct_cursor_api_call' });
    assert.equal(directApi.reason, 'protected_action_forbidden');
  });

  it('inherited Temporal wake is accepted by Handoff run-plan without becoming a second executor', () => {
    assert.equal(isInheritedTemporalPilotWake('temporal_supervisory', 'schedule'), true);
    assert.equal(isInheritedTemporalPilotWake('temporal_supervisory', 'workflow_dispatch'), true);
    assert.equal(isInheritedTemporalPilotWake('temporal_supervisory', 'workflow_call'), true);
    assert.equal(isInheritedTemporalPilotWake('temporal_supervisory', 'issues'), false);
    assert.equal(isInheritedTemporalPilotWake('scheduled_reconciliation', 'schedule'), false);
    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'schedule',
      wakeReasonInput: 'temporal_supervisory',
      targetIssueInput: '1130',
    });
    assert.equal(plan.shouldRun, true);
    assert.equal(plan.mode, 'cursor_live');
    assert.equal(plan.wakeReason, 'temporal_supervisory');
    assert.deepEqual(plan.preferIssueNumbers, [1130]);
  });

  it('live worker remains fail-closed without SSH, new secret, or overlapping-supervisor disable', () => {
    const gate = resolveLiveTemporalPilotGate({});
    assert.equal(gate.allowed, false);
    assert.equal(gate.exactProtectedAction, PILOT_EXACT_PROTECTED_ACTION);
    const withAddress = resolveLiveTemporalPilotGate({ TEMPORAL_ADDRESS: '127.0.0.1:7233' });
    assert.equal(withAddress.allowed, false);
    const resources = pilotResourceSnapshot();
    assert.equal(resources.liveTemporalLoadAddedByThisPacket, false);
    assert.equal(resources.cursorCloudSsh, false);
    assert.equal(resources.newVm, false);
    assert.equal(resources.paidTool, false);
    assert.equal(resources.secondTaskDatabase, false);
    assert.equal(resources.overlappingSupervisorsDisabled, false);
    assert.equal(existsSync(WORKER_PATH), true);
    assert.equal(existsSync(SCRIPT_PATH), true);
    const worker = readFileSync(WORKER_PATH, 'utf8');
    assert.doesNotMatch(worker, /CURSOR_FACTORY_WAKE_WEBHOOK/);
    assert.doesNotMatch(worker, /POSTGRES_URL=/);
    const dry = spawnSync(process.execPath, [WORKER_PATH], { encoding: 'utf8' });
    assert.equal(dry.status, 0, dry.stderr);
    const parsed = JSON.parse(dry.stdout);
    assert.equal(parsed.schema, FACTORY_TEMPORAL_PILOT_SCHEMA);
    assert.equal(parsed.mode, 'dry-run');
    assert.equal(parsed.wipMaxSlots, 1);
    assert.equal(parsed.wipDefaultMaxSlots, 1);
    assert.equal(parsed.wipPilotMaxSlots, 1);
    const live = spawnSync(process.execPath, [WORKER_PATH, '--live'], { encoding: 'utf8' });
    assert.equal(live.status, 2);
    assert.match(live.stderr, /NOT READY/);
    const liveJson = live.stderr.slice(live.stderr.indexOf('{'));
    const livePayload = JSON.parse(liveJson);
    assert.equal(livePayload.dispatchSent, false);
    assert.equal(livePayload.boundary.canActivateNow, false);
    assert.equal(livePayload.boundary.dispatchFromThisProcess, false);
    assert.equal(livePayload.boundary.sshRequired, false);
  });

  it('activation is GitHub-native: approval marker + repo variable + Actions on main; Cursor Cloud must not dispatch', () => {
    assert.equal(commentsHavePilotActivationApproval([{ body: PILOT_LIVE_ACTIVATION_APPROVAL_MARKER }]), true);
    const cloud = evaluateLiveActivationBoundary({
      comments: [{ body: PILOT_LIVE_ACTIVATION_APPROVAL_MARKER }],
      env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
      githubActions: false,
      ref: 'cursor-cloud',
    });
    assert.equal(cloud.antonApproved, true);
    assert.equal(cloud.canActivateNow, false);
    assert.equal(cloud.dispatchFromThisProcess, false);
    assert.equal(cloud.sshRequired, false);
    const githubReady = evaluateLiveActivationBoundary({
      comments: [{ body: PILOT_LIVE_ACTIVATION_APPROVAL_MARKER }],
      env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
      githubActions: true,
      ref: 'refs/heads/main',
    });
    assert.equal(githubReady.wouldActivateOnApprovedGithubActions, true);
    assert.equal(githubReady.canActivateNow, false);
    const attempted = requestCanonicalHandoffDispatch({ sourceIssue: 1130 });
    assert.equal(attempted.sent, false);
    assert.equal(attempted.reason, 'cursor_cloud_must_not_workflow_dispatch_handoff');
    assert.match(PILOT_EXACT_PROTECTED_ACTION, /No SSH/);
  });
});

describe('factory Temporal current-main contracts (#1130)', () => {
  it('WIP=1: an empty lane allows one Handoff; one live Cloud Agent run blocks the next', () => {
    const withRoom = planCursorIssueClaims({
      readyIssues: [readyIssue(11303)],
      claimedIssues: [],
      trackedIssues: [],
    });
    assert.equal(withRoom.availableSlots, 1);
    const roomDecision = decideNextSafeAction({
      plan: withRoom,
      claimedIssues: [],
      labels: ['dispatch:cursor-ready', 'priority:P0'],
    });
    assert.equal(roomDecision.action, 'request_canonical_handoff');
    assert.equal(roomDecision.sourceIssue, 11303);

    const oneLive = [liveClaimed(201, RUN_A, { agentId: BC_A })];
    const full = planCursorIssueClaims({
      readyIssues: [readyIssue(11304)],
      claimedIssues: oneLive,
      trackedIssues: oneLive,
    });
    assert.equal(full.availableSlots, 0);
    const blocked = decideNextSafeAction({
      plan: full,
      claimedIssues: oneLive,
      labels: ['dispatch:cursor-ready'],
    });
    assert.equal(blocked.action, 'no_op_wait');
    assert.equal(blocked.reason, 'wip_cap_reached');
  });

  it('current-generation work_request / claim / bc-* / run-* suppress a duplicate Handoff', () => {
    const live = liveClaimed(11305, RUN_A, { agentId: BC_A });
    const observed = observeCurrentGenerationExecution({
      sourceIssue: 11305,
      comments: live.comments,
      issue: live,
    });
    assert.equal(observed.generation, 1);
    assert.match(observed.work_request_id, /^cfai-wr-/);
    assert.equal(observed.claim_status, 'activated');
    assert.equal(observed.cursor_agent_id, BC_A);
    assert.equal(observed.cursor_run_id, RUN_A);
    assert.equal(observed.hasLiveCurrentGenerationRun, true);
    const decision = decideNextSafeAction({
      plan: {
        activationTargetIssue: 11305,
        availableSlots: 2,
        eligibleIssueNumbers: [11305],
        claimIssueNumbers: [11305],
      },
      labels: ['dispatch:cursor-ready'],
      comments: live.comments,
      issue: live,
    });
    assert.equal(decision.action, 'wait_cursor_run');
    assert.equal(decision.reason, 'current_generation_live_run');
    assert.equal(decision.handoffRequest, null);
  });

  it('CURSOR REQUEUE generation N+1 is a new executable attempt; generation N evidence does not occupy it', () => {
    const requeue = formatCursorRequeueComment(
      buildCursorRequeueMarker({ sourceIssue: 11306, generation: 2, reason: 'operator rework' }),
    );
    const gen1 = liveClaimed(11306, RUN_A, { agentId: BC_A, generation: 1 });
    const issue = readyIssue(11306, {
      comments: [
        ...gen1.comments,
        { body: 'CURSOR IMPLEMENTATION COMPLETE — READY FOR MERGE REVIEW', created_at: '2026-08-27T12:00:00Z' },
        { body: requeue, created_at: '2026-08-27T13:00:00Z' },
      ],
    });
    const observed = observeCurrentGenerationExecution({
      sourceIssue: 11306,
      comments: issue.comments,
      issue,
    });
    assert.equal(observed.generation, 2);
    assert.equal(observed.hasLiveCurrentGenerationRun, false);
    const plan = eligiblePlan(11306, { comments: issue.comments });
    const decision = decideNextSafeAction({
      plan,
      labels: ['dispatch:cursor-ready', 'priority:P0'],
      comments: issue.comments,
      issue,
    });
    assert.equal(decision.action, 'request_canonical_handoff');
    assert.equal(decision.observed.generation, 2);
  });

  it('review-ready inventory consumes zero execution WIP so other eligible work can be handed off', () => {
    const reviewReady = readyIssue(11307, {
      labels: ['dispatch:cursor-ready', 'dispatch:operator-review', 'priority:P0'],
      comments: [{ body: 'CURSOR IMPLEMENTATION COMPLETE — READY FOR MERGE REVIEW' }],
      linkedPrs: [{ number: 99907, state: 'open', draft: false, mergeReady: true }],
    });
    const eligible = readyIssue(11308);
    const plan = planCursorIssueClaims({
      readyIssues: [reviewReady, eligible],
      claimedIssues: [],
      trackedIssues: [reviewReady, eligible],
    });
    assert.equal(plan.availableSlots, 1);
    assert.equal(plan.activationTargetIssue, 11308);
    const decision = decideNextSafeAction({
      plan,
      labels: eligible.labels,
      comments: eligible.comments,
      issue: eligible,
    });
    assert.equal(decision.action, 'request_canonical_handoff');
    assert.equal(decision.sourceIssue, 11308);
    const reviewDecision = decideNextSafeAction({
      plan: {
        activationTargetIssue: 11307,
        availableSlots: 1,
        eligibleIssueNumbers: [],
        claimIssueNumbers: [],
      },
      labels: reviewReady.labels,
      comments: reviewReady.comments,
      issue: reviewReady,
    });
    assert.equal(reviewDecision.action, 'wait_operator_review');
    assert.ok(
      reviewDecision.reason === 'operator_review_stop' ||
        reviewDecision.reason === 'review_ready_zero_wip',
    );
  });
});

describe('factory Temporal restart, replay, and 72-hour metrics (#1130)', () => {
  it('A. eligible issue -> one canonical Handoff request (Cloud Agents path stays inside Handoff)', () => {
    const runtime = createPilotRuntime();
    const plan = eligiblePlan(11321);
    const snap = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'A:11321:ready',
      sourceIssue: 11321,
      github: { plan, labels: ['dispatch:cursor-ready', 'priority:P0'] },
    });
    assert.equal(snap.lastAction, 'request_canonical_handoff');
    assert.equal(runtime.handoffInvocations.length, 1);
    assert.equal(runtime.handoffInvocations[0].workflowName, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.equal(runtime.handoffInvocations[0].inputs.wake_reason, 'temporal_supervisory');
    assert.equal(snap.evidenceChain.temporalWorkflowId, temporalWorkflowIdForIssue(11321, 1));
    assert.equal(FACTORY_TEMPORAL_PILOT_TASK_QUEUE, 'corpflow-factory-pilot');
  });

  it('B. no eligible work -> silent wait / no Cursor run', () => {
    const runtime = createPilotRuntime();
    const plan = planCursorIssueClaims({ readyIssues: [], claimedIssues: [], trackedIssues: [] });
    const snap = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'B:11322:empty',
      sourceIssue: 11322,
      github: { plan, labels: [] },
    });
    assert.equal(snap.lastAction, 'no_op_wait');
    assert.equal(runtime.handoffInvocations.length, 0);
  });

  it('C. worker kill/restore during wait -> no duplicate Handoff / Cursor run', () => {
    const runtime = createPilotRuntime();
    runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'C:11323:ready',
      sourceIssue: 11323,
      github: { plan: eligiblePlan(11323), labels: ['dispatch:cursor-ready'] },
    });
    assert.equal(runtime.handoffInvocations.length, 1);
    runtime.applyEvent({
      type: 'timer_reconcile',
      fingerprint: 'C:11323:wait',
      sourceIssue: 11323,
      github: { plan: eligiblePlan(11323), labels: ['dispatch:cursor-ready'] },
    });
    runtime.killWorker();
    assert.equal(runtime.isWorkerAlive(), false);
    assert.throws(() =>
      runtime.applyEvent({
        type: 'timer_reconcile',
        fingerprint: 'C:11323:during-down',
        sourceIssue: 11323,
        github: { plan: eligiblePlan(11323), labels: ['dispatch:cursor-ready'] },
      }),
    );
    runtime.restoreWorker();
    const after = runtime.applyEvent({
      type: 'timer_reconcile',
      fingerprint: 'C:11323:after-restore',
      sourceIssue: 11323,
      github: { plan: eligiblePlan(11323), labels: ['dispatch:cursor-ready'] },
    });
    assert.equal(after.handoffCount, 1);
    assert.equal(runtime.handoffInvocations.length, 1);
    assert.equal(after.metrics.duplicate_activations, 0);
  });

  it('D. replayed event is idempotent; missed-event timer self-heals once', () => {
    const runtime = createPilotRuntime();
    const github = { plan: eligiblePlan(11324), labels: ['dispatch:cursor-ready'] };
    runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'D:11324:same',
      sourceIssue: 11324,
      github,
    });
    const replay = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'D:11324:same',
      sourceIssue: 11324,
      github,
    });
    assert.equal(replay.lastReason, 'replay_idempotent');
    assert.equal(runtime.handoffInvocations.length, 1);
    const recovered = runtime.applyEvent({
      type: 'timer_reconcile',
      fingerprint: 'D:11325:timer',
      sourceIssue: 11325,
      github: { plan: eligiblePlan(11325), labels: ['dispatch:cursor-ready'] },
    });
    assert.equal(recovered.lastAction, 'request_canonical_handoff');
    assert.equal(recovered.metrics.recovery_count, 1);
    runtime.applyEvent({
      type: 'timer_reconcile',
      fingerprint: 'D:11325:timer-2',
      sourceIssue: 11325,
      github: { plan: eligiblePlan(11325), labels: ['dispatch:cursor-ready'] },
    });
    assert.equal(runtime.handoffInvocations.filter((h) => h.inputs.target_issue === '11325').length, 1);
  });

  it('E. CI failure requests the existing bounded correction path; protected gate STOPs', () => {
    const runtime = createPilotRuntime();
    const plan = eligiblePlan(11326);
    runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'E:11326:ready',
      sourceIssue: 11326,
      github: { plan, labels: ['dispatch:cursor-ready'] },
    });
    const failed = runtime.applyEvent({
      type: 'ci_result',
      fingerprint: 'E:11326:ci-fail',
      sourceIssue: 11326,
      github: {
        plan,
        labels: ['dispatch:cursor-ready'],
        ci: { conclusion: 'failure', fingerprint: 'assert-red' },
      },
    });
    assert.equal(failed.lastAction, 'request_bounded_correction');
    assert.equal(runtime.correctionRequests[0].path, PILOT_BOUNDED_CORRECTION_PATH);
    const gated = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'E:11327:gate',
      sourceIssue: 11327,
      github: {
        plan: eligiblePlan(11327),
        labels: ['dispatch:cursor-ready'],
        protectedGateActive: true,
      },
    });
    assert.equal(gated.lastAction, 'wait_operator_review');
    assert.equal(gated.lastReason, 'protected_gate_stop');
    assert.equal(gated.metrics.protected_gates_respected >= 1, true);
  });

  it('F. durable approval resumes; evidence comment is non-secret and parseable', () => {
    const runtime = createPilotRuntime();
    const pausedPlan = planCursorIssueClaims({
      readyIssues: [
        readyIssue(11328, {
          labels: ['dispatch:cursor-ready', 'execution:paused', 'priority:P0'],
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    const stopped = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'F:11328:paused',
      sourceIssue: 11328,
      github: {
        plan: pausedPlan,
        labels: ['dispatch:cursor-ready', 'execution:paused'],
      },
    });
    assert.equal(stopped.lastAction, 'wait_operator_review');
    const resumed = runtime.applyEvent({
      type: 'approval_marker',
      fingerprint: 'F:11328:approval',
      sourceIssue: 11328,
      github: {
        plan: eligiblePlan(11328),
        labels: ['dispatch:cursor-ready', 'priority:P0'],
        comments: [{ body: PILOT_LIVE_ACTIVATION_APPROVAL_MARKER }],
        durableApprovalMarker: true,
      },
    });
    assert.equal(resumed.lastAction, 'request_canonical_handoff');
    const body = formatPilotEvidenceComment(resumed);
    assert.match(body, /TEMPORAL PILOT EVIDENCE/);
    assert.doesNotMatch(body, /ghp_|sk-|CURSOR_API_KEY|POSTGRES_URL=/);
    const parsed = parsePilotEvidence(body);
    assert.equal(parsed.source_issue, 11328);
    assert.equal(parsed.duplicate_activations, 0);
    for (const key of PILOT_METRIC_KEYS) {
      assert.equal(Object.prototype.hasOwnProperty.call(resumed.metrics, key), true);
    }
    assert.equal(PILOT_SOURCE_ISSUE, 1130);
    assert.equal(PILOT_VERDICT_READY, 'TEMPORAL REAL-PRODUCTION PILOT READY FOR ACTIVATION');
  });
});
