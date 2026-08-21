/**
 * #1032 — Temporal Phase 1 factory loop: architecture + synthetic proofs A–J.
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
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';
import {
  formatDispatchActivatedComment,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME } from '../lib/server/factory-cursor-handoff.js';
import {
  FACTORY_CONTROL_PLANE_V1,
  FACTORY_TEMPORAL_PHASE1_SCHEMA,
  FACTORY_TEMPORAL_TASK_QUEUE,
  PHASE1_ALLOWED_ACTIONS,
  PHASE1_FORBIDDEN_ACTIONS,
  PHASE1_BOUNDED_CORRECTION_PATH,
  PHASE1_FORBIDDEN_HANDOFF_TOKEN_ENV,
  PHASE1_L3_HANDOFF_TOKEN_PATH,
  PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER,
  PHASE1_LIVE_WORKER_BLOCKER,
  PHASE1_VERDICT_PASS,
  buildCanonicalHandoffDispatch,
  buildCanonicalHandoffDispatchRequest,
  createPhase1Runtime,
  decideNextSafeAction,
  evaluateLiveActivationBoundary,
  hasDurableApprovalMarker,
  isCorpflowExec01Hostname,
  phase1ResourceSnapshot,
  requestCanonicalHandoffDispatch,
  resolveLiveTemporalWorkerGate,
  temporalWorkflowIdForIssue,
} from '../lib/server/factory-temporal-phase1.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const HANDOFF_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-cursor-handoff.yml',
);
const RECONCILE_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-queue-reconcile.yml',
);
const LEGACY_PATH = path.join(REPO_ROOT, '.github/workflows/factory-dispatcher-activate.yml');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github/workflows');
const WORKER_PATH = path.join(REPO_ROOT, 'ops/temporal/phase1-worker.mjs');

function readyIssue(number, extra = {}) {
  return {
    number,
    title: extra.title || `Ready ${number}`,
    body: extra.body || 'docs only ordinary work',
    state: 'open',
    labels: extra.labels || ['dispatch:cursor-ready', 'priority:P0'],
    createdAt: extra.createdAt || '2026-08-21T10:00:00Z',
    updatedAt: extra.updatedAt || '2026-08-21T10:00:00Z',
    comments: extra.comments || [],
  };
}

function liveClaimed(number, runId) {
  return {
    number,
    title: `Live ${number}`,
    body: 'docs',
    state: 'open',
    labels: ['dispatch:cursor-claimed', 'status:in-progress'],
    comments: [
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: number,
            generation: 1,
            claimToken: `tok-${number}`,
            status: 'activated',
            agentRunId: runId,
          }),
        ),
        created_at: '2026-08-21T10:00:00Z',
      },
      {
        body: formatDispatchActivatedComment({
          issueNumber: number,
          agentRunId: runId,
        }),
        created_at: '2026-08-21T10:00:01Z',
      },
    ],
    updatedAt: '2026-08-21T11:00:00Z',
  };
}

function eligiblePlan(issueNumber, extra = {}) {
  return planCursorIssueClaims({
    readyIssues: [readyIssue(issueNumber, extra)],
    claimedIssues: extra.claimedIssues || [],
    trackedIssues: extra.trackedIssues || extra.claimedIssues || [],
  });
}

describe('factory Temporal Phase 1 control plane (#1032)', () => {
  const handoffYaml = readFileSync(HANDOFF_WORKFLOW_PATH, 'utf8');
  const reconcileYaml = readFileSync(RECONCILE_WORKFLOW_PATH, 'utf8');
  const legacyYaml = readFileSync(LEGACY_PATH, 'utf8');
  const workflowFiles = readdirSync(WORKFLOWS_DIR);

  it('keeps one spine: GitHub truth, Handoff sole Cursor wake, Temporal is not a second dispatcher', () => {
    assert.equal(FACTORY_CONTROL_PLANE_V1.spine, 'one_supervisory_orchestration_spine');
    assert.equal(FACTORY_CONTROL_PLANE_V1.sourceOfTruth, 'github');
    assert.equal(FACTORY_CONTROL_PLANE_V1.cursorWakePath, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.match(handoffYaml, /^name:\s*CorpFlowAI Cursor Factory Handoff\s*$/m);
    assert.doesNotMatch(handoffYaml, /^\s*schedule:/m);
    assert.match(reconcileYaml, /uses:\s*\.\/\.github\/workflows\/factory-cursor-handoff\.yml/);
    assert.doesNotMatch(reconcileYaml, /CURSOR_FACTORY_WAKE_WEBHOOK/);
    assert.match(legacyYaml, /workflow_dispatch:/);
    assert.equal(
      workflowFiles.includes('factory-temporal-wake.yml'),
      false,
      'must not add a second Temporal Cursor-wake workflow',
    );
    const handoff = FACTORY_CONTROL_PLANE_V1.components.find((c) => c.id === 'factory-cursor-handoff');
    const temporal = FACTORY_CONTROL_PLANE_V1.components.find(
      (c) => c.id === 'temporal-phase1-supervisor',
    );
    const n8n = FACTORY_CONTROL_PLANE_V1.components.find((c) => c.id === 'n8n-github-heartbeat');
    const reconcile = FACTORY_CONTROL_PLANE_V1.components.find(
      (c) => c.id === 'factory-queue-reconcile',
    );
    assert.equal(handoff.phase1, 'retain-primary');
    assert.equal(temporal.phase1, 'introduce-live-activation-prepared');
    assert.equal(n8n.phase1, 'retain-exception-notify');
    assert.equal(reconcile.phase1, 'retain-fallback-until-live-temporal-timer');
  });

  it('allow-list excludes protected consequences and canonical Handoff dispatch never uses the legacy API activator', () => {
    for (const action of PHASE1_FORBIDDEN_ACTIONS) {
      assert.equal(PHASE1_ALLOWED_ACTIONS.includes(action), false);
    }
    const dispatch = buildCanonicalHandoffDispatch({ sourceIssue: 10321 });
    assert.equal(dispatch.workflowName, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.equal(dispatch.workflowFile, 'factory-cursor-handoff.yml');
    assert.equal(dispatch.inputs.target_issue, '10321');
    assert.equal(dispatch.inputs.wake_reason, 'temporal_supervisory');
    assert.deepEqual(dispatch.forbiddenWorkflows, ['factory-dispatcher-activate.yml']);
    const forbidden = decideNextSafeAction({ requestedAction: 'production_deploy' });
    assert.equal(forbidden.action, 'wait_operator_review');
    assert.equal(forbidden.reason, 'protected_action_forbidden');
  });

  it('live worker remains fail-closed without SSH or a new credential surface', () => {
    const gate = resolveLiveTemporalWorkerGate({});
    assert.equal(gate.allowed, false);
    assert.equal(gate.exactProtectedAction, PHASE1_LIVE_WORKER_BLOCKER);
    const withAddress = resolveLiveTemporalWorkerGate({ TEMPORAL_ADDRESS: '127.0.0.1:7233' });
    assert.equal(withAddress.allowed, false);
    const resources = phase1ResourceSnapshot();
    assert.equal(resources.liveTemporalLoadAddedByThisPacket, false);
    assert.equal(resources.cursorCloudSsh, false);
    assert.equal(resources.newVm, false);
    assert.equal(resources.publicTemporalExposure, false);
    assert.equal(resources.productionPostgresReused, false);
    assert.equal(existsSync(WORKER_PATH), true);
    const worker = readFileSync(WORKER_PATH, 'utf8');
    assert.doesNotMatch(worker, /CURSOR_FACTORY_WAKE_WEBHOOK/);
    assert.doesNotMatch(worker, /POSTGRES_URL=/);
    const dry = spawnSync(process.execPath, [WORKER_PATH], { encoding: 'utf8' });
    assert.equal(dry.status, 0, dry.stderr);
    const parsed = JSON.parse(dry.stdout);
    assert.equal(parsed.schema, FACTORY_TEMPORAL_PHASE1_SCHEMA);
    assert.equal(parsed.mode, 'dry-run');
    const live = spawnSync(process.execPath, [WORKER_PATH, '--live'], { encoding: 'utf8' });
    assert.equal(live.status, 2);
    assert.match(live.stderr, /NOT READY/);
    const liveJson = live.stderr.slice(live.stderr.indexOf('{'));
    const livePayload = JSON.parse(liveJson);
    assert.equal(livePayload.dispatchSent, false);
    assert.equal(livePayload.boundary.canActivateNow, false);
    assert.equal(livePayload.boundary.dispatchFromThisProcess, false);
    assert.match(livePayload.boundary.exactBlocker, /HOST_MISMATCH/);
  });

  it('live activation is Anton-approved but Cursor Cloud must not SSH, reuse app tokens, or dispatch Handoff', () => {
    assert.equal(hasDurableApprovalMarker(PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER), true);
    assert.equal(isCorpflowExec01Hostname('cursor-cloud-worker'), false);
    assert.equal(isCorpflowExec01Hostname('corpflow-exec-01-u69678'), true);
    const cloud = evaluateLiveActivationBoundary({
      hostname: 'cursor-cloud-worker',
      comments: [{ body: PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER }],
      tokenPathExists: false,
      env: {},
    });
    assert.equal(cloud.antonApproved, true);
    assert.equal(cloud.hostIsExec01, false);
    assert.equal(cloud.cursorCloudSsh, false);
    assert.equal(cloud.canActivateNow, false);
    assert.equal(cloud.dispatchFromThisProcess, false);
    assert.match(cloud.exactBlocker, /HOST_MISMATCH/);
    const execMissingToken = evaluateLiveActivationBoundary({
      hostname: 'corpflow-exec-01-u69678',
      comments: [{ body: PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER }],
      tokenPathExists: false,
      env: {},
    });
    assert.equal(execMissingToken.wouldActivateOnExec01, false);
    assert.match(execMissingToken.exactBlocker, /least-privilege Handoff token missing/);
    const execReady = evaluateLiveActivationBoundary({
      hostname: 'corpflow-exec-01-u69678',
      comments: [{ body: PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER }],
      tokenPathExists: true,
      env: {},
    });
    assert.equal(execReady.wouldActivateOnExec01, true);
    assert.equal(execReady.canActivateNow, false);
    const reused = evaluateLiveActivationBoundary({
      hostname: 'corpflow-exec-01-u69678',
      comments: [{ body: PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER }],
      tokenPathExists: true,
      env: { GITHUB_TOKEN: 'must-not-use' },
    });
    assert.equal(reused.reusedAppToken, true);
    assert.equal(reused.canActivateNow, false);
    assert.match(reused.exactBlocker, /refuse reused app GitHub/);
    const request = buildCanonicalHandoffDispatchRequest({ sourceIssue: 1032 });
    assert.equal(request.sendFromCursorCloud, false);
    assert.match(request.url, /factory-cursor-handoff\.yml\/dispatches$/);
    const attempted = requestCanonicalHandoffDispatch({
      sourceIssue: 1032,
      hostname: 'cursor-cloud-worker',
      token: 'must-not-send',
    });
    assert.equal(attempted.sent, false);
    assert.equal(attempted.reason, 'cursor_cloud_must_not_workflow_dispatch_handoff');
    assert.equal(PHASE1_L3_HANDOFF_TOKEN_PATH, '~/.corpflow-temporal-handoff.token');
    assert.deepEqual(PHASE1_FORBIDDEN_HANDOFF_TOKEN_ENV.includes('GITHUB_TOKEN'), true);
    const worker = readFileSync(WORKER_PATH, 'utf8');
    assert.doesNotMatch(worker, /CMP_GITHUB_TOKEN/);
    const runbook = readFileSync(
      path.join(REPO_ROOT, 'docs/runbooks/TEMPORAL_FACTORY_PHASE1_LIVE_ACTIVATION.md'),
      'utf8',
    );
    assert.match(runbook, /OPERATOR APPROVAL — PROCEED THROUGH LIVE TEMPORAL PHASE 1 ACTIVATION/);
    assert.match(runbook, /HOST_MISMATCH/);
  });
});

describe('factory Temporal Phase 1 synthetic proofs A–J (#1032)', () => {
  it('A. eligible synthetic issue -> Temporal reconciles -> existing Handoff invoked once', () => {
    const runtime = createPhase1Runtime();
    const plan = eligiblePlan(10321);
    const snap = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'A:10321:ready',
      sourceIssue: 10321,
      github: { plan, labels: ['dispatch:cursor-ready', 'priority:P0'] },
    });
    assert.equal(snap.lastAction, 'request_canonical_handoff');
    assert.equal(runtime.handoffInvocations.length, 1);
    assert.equal(runtime.handoffInvocations[0].workflowName, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.equal(snap.evidenceChain.temporalWorkflowId, temporalWorkflowIdForIssue(10321));
  });

  it('B. no eligible work -> silent wait / no Cursor run', () => {
    const runtime = createPhase1Runtime();
    const plan = planCursorIssueClaims({
      readyIssues: [],
      claimedIssues: [],
      trackedIssues: [],
    });
    const snap = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'B:10322:empty',
      sourceIssue: 10322,
      github: { plan, labels: [] },
    });
    assert.equal(snap.lastAction, 'no_op_wait');
    assert.equal(runtime.handoffInvocations.length, 0);
  });

  it('C. WIP full -> no duplicate activation', () => {
    const runtime = createPhase1Runtime();
    const claimed = [
      liveClaimed(101, 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      liveClaimed(102, 'run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ];
    const plan = planCursorIssueClaims({
      readyIssues: [readyIssue(10323)],
      claimedIssues: claimed,
      trackedIssues: claimed,
    });
    const snap = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'C:10323:wip',
      sourceIssue: 10323,
      github: { plan, claimedIssues: claimed, labels: ['dispatch:cursor-ready'] },
    });
    assert.equal(plan.availableSlots, 0);
    assert.equal(snap.lastAction, 'no_op_wait');
    assert.equal(snap.lastReason, 'wip_cap_reached');
    assert.equal(runtime.handoffInvocations.length, 0);
  });

  it('D. CI failure -> existing bounded correction path -> green', () => {
    const runtime = createPhase1Runtime();
    const plan = eligiblePlan(10324);
    runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'D:10324:ready',
      sourceIssue: 10324,
      github: { plan, labels: ['dispatch:cursor-ready'] },
    });
    const failed = runtime.applyEvent({
      type: 'ci_result',
      fingerprint: 'D:10324:ci-fail',
      sourceIssue: 10324,
      github: {
        plan,
        labels: ['dispatch:cursor-ready'],
        ci: { conclusion: 'failure', fingerprint: 'assert-red' },
      },
    });
    assert.equal(failed.lastAction, 'request_bounded_correction');
    assert.equal(runtime.correctionRequests[0].path, PHASE1_BOUNDED_CORRECTION_PATH);
    const green = runtime.applyEvent({
      type: 'ci_result',
      fingerprint: 'D:10324:ci-green',
      sourceIssue: 10324,
      github: {
        plan,
        labels: ['dispatch:cursor-ready'],
        ci: { conclusion: 'success', fingerprint: 'assert-green' },
      },
    });
    assert.equal(green.lastAction, 'wait_operator_review');
    assert.equal(runtime.handoffInvocations.length, 1);
    assert.equal(runtime.correctionRequests.length, 1);
  });

  it('E. operator / protected gate -> durable STOP', () => {
    const runtime = createPhase1Runtime();
    const reviewPlan = planCursorIssueClaims({
      readyIssues: [
        readyIssue(10325, {
          labels: ['dispatch:cursor-ready', 'dispatch:operator-review', 'priority:P0'],
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    const review = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'E:10325:review',
      sourceIssue: 10325,
      github: {
        plan: reviewPlan,
        labels: ['dispatch:cursor-ready', 'dispatch:operator-review'],
      },
    });
    assert.equal(review.lastAction, 'wait_operator_review');
    assert.equal(review.status, 'waiting_operator');
    const gated = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'E:10326:gate',
      sourceIssue: 10326,
      github: {
        plan: eligiblePlan(10326),
        labels: ['dispatch:cursor-ready'],
        protectedGateActive: true,
      },
    });
    assert.equal(gated.lastAction, 'wait_operator_review');
    assert.equal(gated.lastReason, 'protected_gate_stop');
    assert.equal(runtime.handoffInvocations.length, 0);
  });

  it('F. durable approval marker -> resume without Anton re-prompting the system', () => {
    const runtime = createPhase1Runtime();
    const pausedPlan = planCursorIssueClaims({
      readyIssues: [
        readyIssue(10327, {
          labels: ['dispatch:cursor-ready', 'execution:paused', 'priority:P0'],
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    const stopped = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'F:10327:paused',
      sourceIssue: 10327,
      github: {
        plan: pausedPlan,
        labels: ['dispatch:cursor-ready', 'execution:paused'],
      },
    });
    assert.equal(stopped.lastAction, 'wait_operator_review');
    assert.equal(runtime.handoffInvocations.length, 0);
    const resumed = runtime.applyEvent({
      type: 'approval_marker',
      fingerprint: 'F:10327:approval',
      sourceIssue: 10327,
      github: {
        plan: eligiblePlan(10327, {
          comments: [{ body: 'APPROVAL: PHASE 1 RESUME', created_at: '2026-08-21T12:00:00Z' }],
        }),
        labels: ['dispatch:cursor-ready', 'priority:P0'],
        comments: [{ body: PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER }],
        durableApprovalMarker: true,
      },
    });
    assert.equal(resumed.lastAction, 'request_canonical_handoff');
    assert.equal(runtime.handoffInvocations.length, 1);
  });

  it('G. kill/restart Temporal worker during wait -> resume with no duplicate run', () => {
    const runtime = createPhase1Runtime();
    runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'G:10328:ready',
      sourceIssue: 10328,
      github: { plan: eligiblePlan(10328), labels: ['dispatch:cursor-ready'] },
    });
    assert.equal(runtime.handoffInvocations.length, 1);
    runtime.applyEvent({
      type: 'timer_reconcile',
      fingerprint: 'G:10328:wait',
      sourceIssue: 10328,
      github: { plan: eligiblePlan(10328), labels: ['dispatch:cursor-ready'] },
    });
    runtime.killWorker();
    assert.equal(runtime.isWorkerAlive(), false);
    assert.throws(() =>
      runtime.applyEvent({
        type: 'timer_reconcile',
        fingerprint: 'G:10328:during-down',
        sourceIssue: 10328,
        github: { plan: eligiblePlan(10328), labels: ['dispatch:cursor-ready'] },
      }),
    );
    runtime.restoreWorker();
    const after = runtime.applyEvent({
      type: 'timer_reconcile',
      fingerprint: 'G:10328:after-restore',
      sourceIssue: 10328,
      github: { plan: eligiblePlan(10328), labels: ['dispatch:cursor-ready'] },
    });
    assert.equal(after.handoffCount, 1);
    assert.equal(runtime.handoffInvocations.length, 1);
    assert.equal(after.workflowId, temporalWorkflowIdForIssue(10328));
    assert.equal(FACTORY_TEMPORAL_TASK_QUEUE, 'corpflow-factory-phase1');
  });

  it('H. missed GitHub event -> timer reconciliation self-heals once', () => {
    const runtime = createPhase1Runtime();
    const snap = runtime.applyEvent({
      type: 'timer_reconcile',
      fingerprint: 'H:10329:timer',
      sourceIssue: 10329,
      github: { plan: eligiblePlan(10329), labels: ['dispatch:cursor-ready'] },
    });
    assert.equal(snap.lastAction, 'request_canonical_handoff');
    assert.equal(runtime.handoffInvocations.length, 1);
    runtime.applyEvent({
      type: 'timer_reconcile',
      fingerprint: 'H:10329:timer-2',
      sourceIssue: 10329,
      github: { plan: eligiblePlan(10329), labels: ['dispatch:cursor-ready'] },
    });
    assert.equal(runtime.handoffInvocations.length, 1);
  });

  it('I. repeated / replayed event -> idempotent', () => {
    const runtime = createPhase1Runtime();
    const github = { plan: eligiblePlan(10330), labels: ['dispatch:cursor-ready'] };
    runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'I:10330:same',
      sourceIssue: 10330,
      github,
    });
    const replay = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'I:10330:same',
      sourceIssue: 10330,
      github,
    });
    assert.equal(replay.lastReason, 'replay_idempotent');
    assert.equal(runtime.handoffInvocations.length, 1);
  });

  it('J. GitHub evidence chain: issue -> Temporal workflow -> Handoff -> Cursor run -> PR -> CI -> terminal', () => {
    const runtime = createPhase1Runtime();
    runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: 'J:10331:ready',
      sourceIssue: 10331,
      github: { plan: eligiblePlan(10331), labels: ['dispatch:cursor-ready'] },
      cursorRun: 'synthetic-bc-phase1-10331',
    });
    const terminal = runtime.applyEvent({
      type: 'ci_result',
      fingerprint: 'J:10331:terminal',
      sourceIssue: 10331,
      github: {
        plan: eligiblePlan(10331),
        labels: ['dispatch:operator-review'],
        comments: [{ body: 'OPERATOR GATE AUTHORIZATION' }],
        durableApprovalMarker: true,
        ci: { conclusion: 'success' },
      },
      pr: 99931,
      ci: 'success',
      terminalEvidence: 'dispatch:operator-review',
    });
    assert.equal(terminal.evidenceChain.issue, 10331);
    assert.equal(terminal.evidenceChain.temporalWorkflowId, 'corpflow-factory-phase1:10331');
    assert.equal(terminal.evidenceChain.handoff.workflowName, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.equal(terminal.evidenceChain.cursorRun, 'synthetic-bc-phase1-10331');
    assert.equal(terminal.evidenceChain.pr, 99931);
    assert.equal(terminal.evidenceChain.ci, 'success');
    assert.equal(terminal.evidenceChain.terminalEvidence, 'dispatch:operator-review');
    assert.equal(terminal.status, 'terminal');
    assert.equal(PHASE1_VERDICT_PASS.includes('CONTROLLED OPERATING PILOT READY'), true);
  });
});
