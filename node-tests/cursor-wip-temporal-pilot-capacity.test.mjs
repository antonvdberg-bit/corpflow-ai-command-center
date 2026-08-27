/**
 * #1145 — Temporal pilot Cursor capacity: default 3, active 5 with 3+2 isolation.
 *
 * Repo-only. Does not set the live GitHub Actions variable, start Temporal,
 * or wake Cursor.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

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
  CURSOR_WIP_LANE_ORDINARY,
  CURSOR_WIP_LANE_TEMPORAL,
  CURSOR_WIP_MAX_SLOTS,
  CURSOR_WIP_PRODUCTION_RESERVE_SLOTS,
  CURSOR_WIP_TEMPORAL_EXTRA_SLOTS,
  CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS,
  commentsIndicateTemporalSupervisedLane,
  evaluateCursorWipCapacity,
  inspectIssueWipState,
  isTemporalPilotCapacityActive,
  resolveCursorWipActivationLane,
  resolveEffectiveCursorWipMaxSlots,
  resolveTemporalPilotCapacityState,
} from '../lib/server/cursor-wip-control.js';
import { formatFactoryHandoffComment } from '../lib/server/factory-cursor-handoff.js';
import {
  FACTORY_CONTROL_PLANE_V1,
  FACTORY_TEMPORAL_PILOT_WAKE_REASON,
  PILOT_FORBIDDEN_ACTIONS,
  PILOT_LIVE_ACTIVATION_APPROVAL_MARKER,
  createPilotRuntime,
  decideNextSafeAction,
  resolveFactoryControlPlaneWipMaxSlots,
} from '../lib/server/factory-temporal-pilot.js';
import { resolveFactoryQueueReconcileDecision } from '../lib/server/factory-queue-reconcile.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const HANDOFF_WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/factory-cursor-handoff.yml');
const RECONCILE_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-queue-reconcile.yml',
);
const PILOT_WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/factory-temporal-pilot.yml');
const WORKER_PATH = path.join(REPO_ROOT, 'ops/temporal/pilot-worker.mjs');

const RUNS = [
  'run-11111111-1111-4111-8111-111111111111',
  'run-22222222-2222-4222-8222-222222222222',
  'run-33333333-3333-4333-8333-333333333333',
  'run-44444444-4444-4444-8444-444444444444',
  'run-55555555-5555-4555-8555-555555555555',
  'run-66666666-6666-4666-8666-666666666666',
];

function activatedComments(issueNumber, runId) {
  return [
    {
      body: formatCursorActivationClaimComment(
        buildCursorActivationClaim({
          sourceIssue: issueNumber,
          generation: 1,
          claimToken: `tok-${issueNumber}`,
          status: 'activated',
          agentRunId: runId,
        }),
      ),
    },
    {
      body: formatDispatchActivatedComment({
        issueNumber,
        agentRunId: runId,
      }),
    },
  ];
}

function ordinaryLive(number, runId) {
  return {
    number,
    title: `Ordinary PRODUCT live #${number}`,
    body: 'docs only PRODUCT / CLIENT / REVENUE / ERP work',
    state: 'open',
    labels: ['dispatch:cursor-claimed', 'status:in-progress'],
    comments: activatedComments(number, runId),
  };
}

function temporalLive(number, runId) {
  return {
    number,
    title: `Temporal-supervised live #${number}`,
    body: 'Temporal-supervised real production work',
    state: 'open',
    labels: ['dispatch:cursor-claimed', 'status:in-progress'],
    comments: [
      {
        body: formatFactoryHandoffComment({
          sourceIssue: number,
          wakeReason: FACTORY_TEMPORAL_PILOT_WAKE_REASON,
          wakePath: 'temporal_supervisory',
        }),
      },
      ...activatedComments(number, runId),
    ],
  };
}

function readyIssue(number, extra = {}) {
  return {
    number,
    title: extra.title || `Ready ${number}`,
    body: extra.body || 'docs only PRODUCT / CLIENT / REVENUE / ERP work',
    state: 'open',
    labels: extra.labels || ['dispatch:cursor-ready', 'priority:P0'],
    comments: extra.comments || [],
    createdAt: extra.createdAt || '2026-08-27T10:00:00Z',
  };
}

describe('Temporal pilot 3+2 Cursor capacity (#1145)', () => {
  const handoffYaml = readFileSync(HANDOFF_WORKFLOW_PATH, 'utf8');
  const reconcileYaml = readFileSync(RECONCILE_WORKFLOW_PATH, 'utf8');
  const pilotYaml = readFileSync(PILOT_WORKFLOW_PATH, 'utf8');

  it('default constants stay 3; pilot effective ceiling is 5 = 3+2', () => {
    assert.equal(CURSOR_WIP_MAX_SLOTS, 3);
    assert.equal(CURSOR_WIP_PRODUCTION_RESERVE_SLOTS, 3);
    assert.equal(CURSOR_WIP_TEMPORAL_EXTRA_SLOTS, 2);
    assert.equal(CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS, 5);
    assert.equal(FACTORY_CONTROL_PLANE_V1.wipMaxSlots, 3);
    assert.equal(FACTORY_CONTROL_PLANE_V1.wipPilotMaxSlots, 5);
    assert.equal(FACTORY_CONTROL_PLANE_V1.wipProductionReserveSlots, 3);
    assert.equal(FACTORY_CONTROL_PLANE_V1.wipTemporalExtraSlots, 2);
    assert.equal(resolveCursorWipActivationLane('temporal_supervisory'), CURSOR_WIP_LANE_TEMPORAL);
    assert.equal(resolveCursorWipActivationLane('scheduled_reconciliation'), CURSOR_WIP_LANE_ORDINARY);
    assert.equal(resolveCursorWipActivationLane('capacity_released'), CURSOR_WIP_LANE_ORDINARY);
  });

  it('Handoff, Queue Reconcile and Temporal Pilot all read CORPFLOW_TEMPORAL_PILOT', () => {
    assert.match(handoffYaml, /CORPFLOW_TEMPORAL_PILOT:\s*\$\{\{\s*vars\.CORPFLOW_TEMPORAL_PILOT\s*\}\}/);
    assert.match(reconcileYaml, /CORPFLOW_TEMPORAL_PILOT:\s*\$\{\{\s*vars\.CORPFLOW_TEMPORAL_PILOT\s*\}\}/);
    assert.match(pilotYaml, /CORPFLOW_TEMPORAL_PILOT:\s*\$\{\{\s*vars\.CORPFLOW_TEMPORAL_PILOT\s*\}\}/);
    assert.match(pilotYaml, /vars\.CORPFLOW_TEMPORAL_PILOT == 'active'/);
    assert.doesNotMatch(handoffYaml, /CURSOR_WIP_MAX_SLOTS\s*=\s*3/);
  });

  it('pilot inactive => max 3', () => {
    assert.equal(isTemporalPilotCapacityActive({}), false);
    assert.equal(resolveEffectiveCursorWipMaxSlots({ pilotActive: false }), 3);
    assert.equal(resolveFactoryControlPlaneWipMaxSlots({ env: {} }), 3);
    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        ordinaryLive(101, RUNS[0]),
        ordinaryLive(102, RUNS[1]),
        ordinaryLive(103, RUNS[2]),
      ],
      readyIssues: [readyIssue(104)],
      pilotActive: false,
    });
    assert.equal(wip.pilotActive, false);
    assert.equal(wip.maxSlots, 3);
    assert.equal(wip.used, 3);
    assert.equal(wip.availableSlots, 0);
    assert.equal(wip.temporalExtraSlots, 0);
    assert.match(wip.capacityPacket, /CURSOR CAPACITY: 3\/3 active/);
    assert.doesNotMatch(wip.capacityPacket, /Production reserve:/);
  });

  it('pilot active => max 5', () => {
    assert.equal(isTemporalPilotCapacityActive({ CORPFLOW_TEMPORAL_PILOT: 'active' }), true);
    assert.equal(resolveEffectiveCursorWipMaxSlots({ env: { CORPFLOW_TEMPORAL_PILOT: 'active' } }), 5);
    const wip = evaluateCursorWipCapacity({
      trackedIssues: [],
      readyIssues: [readyIssue(201)],
      env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
    });
    assert.equal(wip.pilotActive, true);
    assert.equal(wip.maxSlots, 5);
    assert.equal(wip.used, 0);
    assert.equal(wip.ordinaryAvailable, 3);
    assert.equal(wip.temporalAvailable, 2);
    assert.match(wip.capacityPacket, /CURSOR CAPACITY: 0\/5 active/);
    assert.match(wip.capacityPacket, /Production reserve: 0\/3/);
    assert.match(wip.capacityPacket, /Temporal extra: 0\/2/);
  });

  it('3 ordinary production runs + 2 Temporal-supervised runs allowed', () => {
    const tracked = [
      ordinaryLive(301, RUNS[0]),
      ordinaryLive(302, RUNS[1]),
      ordinaryLive(303, RUNS[2]),
      temporalLive(304, RUNS[3]),
      temporalLive(305, RUNS[4]),
    ];
    const wip = evaluateCursorWipCapacity({
      trackedIssues: tracked,
      readyIssues: [],
      pilotActive: true,
    });
    assert.equal(wip.maxSlots, 5);
    assert.equal(wip.used, 5);
    assert.equal(wip.ordinaryUsed, 3);
    assert.equal(wip.temporalUsed, 2);
    assert.equal(wip.ordinaryAvailable, 0);
    assert.equal(wip.temporalAvailable, 0);
    assert.equal(inspectIssueWipState(tracked[0]).slot.lane, CURSOR_WIP_LANE_ORDINARY);
    assert.equal(inspectIssueWipState(tracked[3]).slot.lane, CURSOR_WIP_LANE_TEMPORAL);
    assert.equal(commentsIndicateTemporalSupervisedLane(tracked[3].comments), true);
    assert.match(wip.capacityPacket, /CURSOR CAPACITY: 5\/5 active/);
    assert.match(wip.capacityPacket, /Production reserve: 3\/3/);
    assert.match(wip.capacityPacket, /Temporal extra: 2\/2/);
  });

  it('sixth activation blocked on both lanes', () => {
    const tracked = [
      ordinaryLive(401, RUNS[0]),
      ordinaryLive(402, RUNS[1]),
      ordinaryLive(403, RUNS[2]),
      temporalLive(404, RUNS[3]),
      temporalLive(405, RUNS[4]),
    ];
    const ordinaryPlan = planCursorIssueClaims({
      readyIssues: [readyIssue(406)],
      claimedIssues: tracked,
      trackedIssues: tracked,
      pilotActive: true,
      activationLane: 'ordinary',
    });
    assert.equal(ordinaryPlan.availableSlots, 0);
    assert.equal(ordinaryPlan.activationTargetIssue, null);
    assert.match(String(ordinaryPlan.decisions[0].reason), /WIP cap reached/);

    const temporalPlan = planCursorIssueClaims({
      readyIssues: [readyIssue(407)],
      claimedIssues: tracked,
      trackedIssues: tracked,
      pilotActive: true,
      activationLane: 'temporal',
      wakeReason: FACTORY_TEMPORAL_PILOT_WAKE_REASON,
    });
    assert.equal(temporalPlan.availableSlots, 0);
    assert.equal(temporalPlan.activationTargetIssue, null);
    assert.match(String(temporalPlan.decisions[0].reason), /WIP cap reached/);
    assert.match(String(temporalPlan.decisions[0].reason), /production reserve 3\/3 preserved/);
  });

  it('Temporal cannot reduce the 3-lane normal-production reserve', () => {
    const twoTemporal = [temporalLive(501, RUNS[0]), temporalLive(502, RUNS[1])];
    const ordinaryPlan = planCursorIssueClaims({
      readyIssues: [readyIssue(503), readyIssue(504), readyIssue(505), readyIssue(506)],
      claimedIssues: twoTemporal,
      trackedIssues: twoTemporal,
      pilotActive: true,
      activationLane: 'ordinary',
    });
    assert.equal(ordinaryPlan.wipCapacity.ordinaryUsed, 0);
    assert.equal(ordinaryPlan.wipCapacity.temporalUsed, 2);
    assert.equal(ordinaryPlan.wipCapacity.ordinaryAvailable, 3);
    assert.equal(ordinaryPlan.availableSlots, 3);
    assert.equal(ordinaryPlan.claimIssueNumbers.length, 3);
    assert.equal(ordinaryPlan.decisions.find((d) => d.issue.number === 506)?.decision, 'discover_only');

    const thirdTemporal = planCursorIssueClaims({
      readyIssues: [readyIssue(507)],
      claimedIssues: twoTemporal,
      trackedIssues: twoTemporal,
      pilotActive: true,
      activationLane: 'temporal',
    });
    assert.equal(thirdTemporal.availableSlots, 0);
    assert.equal(thirdTemporal.activationTargetIssue, null);
    assert.match(String(thirdTemporal.decisions[0].reason), /Temporal extra 2\/2/);
  });

  it('Queue Reconcile stays on the ordinary reserve while Temporal can use extras', () => {
    const threeOrdinary = [
      ordinaryLive(601, RUNS[0]),
      ordinaryLive(602, RUNS[1]),
      ordinaryLive(603, RUNS[2]),
    ];
    const reconcilePlan = planCursorIssueClaims({
      readyIssues: [readyIssue(604)],
      claimedIssues: threeOrdinary,
      trackedIssues: threeOrdinary,
      pilotActive: true,
      activationLane: 'ordinary',
      wakeReason: 'scheduled_reconciliation',
    });
    const reconcile = resolveFactoryQueueReconcileDecision({
      plan: reconcilePlan,
      claimedIssues: threeOrdinary,
    });
    assert.equal(reconcilePlan.wipLimits.maxActiveCursorImplementationIssues, 5);
    assert.equal(reconcilePlan.availableSlots, 0);
    assert.equal(reconcile.reason, 'wip_cap_reached');
    assert.equal(reconcile.should_wake_handoff, 0);

    const temporalPlan = planCursorIssueClaims({
      readyIssues: [readyIssue(605)],
      claimedIssues: threeOrdinary,
      trackedIssues: threeOrdinary,
      pilotActive: true,
      activationLane: 'temporal',
      wakeReason: FACTORY_TEMPORAL_PILOT_WAKE_REASON,
    });
    assert.equal(temporalPlan.availableSlots, 2);
    assert.equal(temporalPlan.activationTargetIssue, 605);
    const temporalDecision = decideNextSafeAction({
      plan: temporalPlan,
      claimedIssues: threeOrdinary,
      labels: ['dispatch:cursor-ready', 'priority:P0'],
    });
    assert.equal(temporalDecision.action, 'request_canonical_handoff');
    assert.equal(temporalDecision.sourceIssue, 605);
    assert.equal(temporalDecision.handoffRequest.inputs.wake_reason, FACTORY_TEMPORAL_PILOT_WAKE_REASON);
  });

  it('pilot deactivation automatically returns ceiling to 3', () => {
    const fiveLive = [
      ordinaryLive(701, RUNS[0]),
      ordinaryLive(702, RUNS[1]),
      ordinaryLive(703, RUNS[2]),
      temporalLive(704, RUNS[3]),
      temporalLive(705, RUNS[4]),
    ];
    const active = evaluateCursorWipCapacity({
      trackedIssues: fiveLive,
      readyIssues: [readyIssue(706)],
      env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
    });
    assert.equal(active.maxSlots, 5);
    assert.equal(active.used, 5);

    const deactivated = evaluateCursorWipCapacity({
      trackedIssues: fiveLive,
      readyIssues: [readyIssue(706)],
      env: { CORPFLOW_TEMPORAL_PILOT: 'off' },
    });
    assert.equal(deactivated.pilotActive, false);
    assert.equal(deactivated.maxSlots, 3);
    assert.equal(deactivated.used, 5);
    assert.equal(deactivated.availableSlots, 0);
    assert.equal(deactivated.temporalExtraSlots, 0);
    assert.match(deactivated.capacityPacket, /CURSOR CAPACITY: 5\/3 active/);

    const unset = resolveTemporalPilotCapacityState({ env: {} });
    assert.equal(unset.pilotActive, false);
    assert.equal(unset.maxSlots, 3);
  });

  it('CURSOR REQUEUE generation does not keep a Temporal lane after an ordinary restart', () => {
    const requeue = formatCursorRequeueComment(
      buildCursorRequeueMarker({
        sourceIssue: 801,
        generation: 2,
        reason: 'operator rework',
      }),
    );
    const issue = {
      number: 801,
      title: 'Reworked',
      body: 'docs',
      state: 'open',
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments: [
        {
          body: formatFactoryHandoffComment({
            sourceIssue: 801,
            wakeReason: FACTORY_TEMPORAL_PILOT_WAKE_REASON,
          }),
        },
        ...activatedComments(801, RUNS[0]),
        { body: requeue },
        ...activatedComments(801, RUNS[1]).map((row, index) => ({
          ...row,
          body:
            index === 0
              ? formatCursorActivationClaimComment(
                  buildCursorActivationClaim({
                    sourceIssue: 801,
                    generation: 2,
                    claimToken: 'tok-801-g2',
                    status: 'activated',
                    agentRunId: RUNS[1],
                  }),
                )
              : formatDispatchActivatedComment({
                  issueNumber: 801,
                  agentRunId: RUNS[1],
                }),
        })),
      ],
    };
    const inspected = inspectIssueWipState(issue);
    assert.equal(inspected.verifiedLive, true);
    assert.equal(inspected.slot.lane, CURSOR_WIP_LANE_ORDINARY);
    assert.equal(inspected.slot.runId, RUNS[1]);
  });

  it('replay/restart does not duplicate Temporal Handoff runs', () => {
    const threeOrdinary = [
      ordinaryLive(901, RUNS[0]),
      ordinaryLive(902, RUNS[1]),
      ordinaryLive(903, RUNS[2]),
    ];
    const plan = planCursorIssueClaims({
      readyIssues: [readyIssue(904)],
      claimedIssues: threeOrdinary,
      trackedIssues: threeOrdinary,
      pilotActive: true,
      activationLane: 'temporal',
    });
    const runtime = createPilotRuntime();
    runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: '1145:904:ready',
      sourceIssue: 904,
      github: { plan, labels: ['dispatch:cursor-ready', 'priority:P0'] },
    });
    assert.equal(runtime.handoffInvocations.length, 1);
    const replay = runtime.applyEvent({
      type: 'github_issue_event',
      fingerprint: '1145:904:ready',
      sourceIssue: 904,
      github: { plan, labels: ['dispatch:cursor-ready', 'priority:P0'] },
    });
    assert.equal(replay.lastReason, 'replay_idempotent');
    assert.equal(runtime.handoffInvocations.length, 1);
    runtime.killWorker();
    runtime.restoreWorker();
    runtime.applyEvent({
      type: 'timer_reconcile',
      fingerprint: '1145:904:after-restore',
      sourceIssue: 904,
      github: { plan, labels: ['dispatch:cursor-ready', 'priority:P0'] },
    });
    assert.equal(runtime.handoffInvocations.length, 1);
    assert.equal(runtime.getSnapshot(904, 1).metrics.duplicate_activations, 0);
  });

  it('protected gates unchanged while extra Temporal slots exist', () => {
    const twoOrdinary = [ordinaryLive(1001, RUNS[0]), ordinaryLive(1002, RUNS[1])];
    const gated = readyIssue(1003, {
      title: 'Schema mutation',
      body: `Actual schema migration and data mutation required.
Run prisma migrate to alter Postgres schema and backfill rows.
This is a real DB/schema change packet.
Requires protected gate: database.`,
    });
    const plan = planCursorIssueClaims({
      readyIssues: [gated],
      claimedIssues: twoOrdinary,
      trackedIssues: twoOrdinary,
      pilotActive: true,
      activationLane: 'temporal',
    });
    assert.equal(plan.availableSlots, 2);
    assert.equal(plan.activationTargetIssue, null);
    assert.equal(plan.decisions[0].decision, 'discover_only');
    assert.match(String(plan.decisions[0].reason), /protected gate/);

    const forbidden = decideNextSafeAction({
      requestedAction: 'production_deploy',
      plan,
    });
    assert.equal(forbidden.reason, 'protected_action_forbidden');
    assert.equal(PILOT_FORBIDDEN_ACTIONS.includes('env_secrets_change'), true);
    assert.equal(PILOT_FORBIDDEN_ACTIONS.includes('unauthorized_merge'), true);
    assert.match(PILOT_LIVE_ACTIVATION_APPROVAL_MARKER, /OPERATOR APPROVAL/);
  });

  it('dry-run worker reports 3 unless CORPFLOW_TEMPORAL_PILOT=active', () => {
    const off = spawnSync(process.execPath, [WORKER_PATH], {
      encoding: 'utf8',
      env: { ...process.env, CORPFLOW_TEMPORAL_PILOT: '' },
    });
    assert.equal(off.status, 0, off.stderr);
    const offParsed = JSON.parse(off.stdout);
    assert.equal(offParsed.wipMaxSlots, 3);
    assert.equal(offParsed.wipDefaultMaxSlots, 3);

    const on = spawnSync(process.execPath, [WORKER_PATH], {
      encoding: 'utf8',
      env: { ...process.env, CORPFLOW_TEMPORAL_PILOT: 'active' },
    });
    assert.equal(on.status, 0, on.stderr);
    const onParsed = JSON.parse(on.stdout);
    assert.equal(onParsed.wipMaxSlots, 5);
    assert.equal(onParsed.wipPilotMaxSlots, 5);
  });
});
