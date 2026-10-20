/** The CEO-authorised four-slot exception falls back automatically to two. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';
import { planCursorIssueClaims } from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  CURSOR_WIP_MAX_SLOTS,
  CURSOR_WIP_TEMPORARY_CAPACITY_EXPIRES_AT,
  CURSOR_WIP_TEMPORAL_EXTRA_SLOTS,
  CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS,
  evaluateCursorWipCapacity,
  resolveEffectiveCursorWipMaxSlots,
} from '../lib/server/cursor-wip-control.js';

function liveRun(number, runId) {
  return {
    number,
    title: `Live #${number}`,
    body: 'documentation only',
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
      },
    ],
  };
}

function readyIssue(number) {
  return {
    number,
    title: `Ready #${number}`,
    body: 'documentation only ordinary work',
    state: 'open',
    labels: ['dispatch:cursor-ready', 'priority:P0'],
    createdAt: `2026-08-31T00:00:0${number % 10}Z`,
  };
}

describe('Cursor spend control capacity (#1249)', () => {
  it('allows four active implementation lanes while the temporary pilot is active', () => {
    assert.equal(CURSOR_WIP_MAX_SLOTS, 2);
    assert.equal(CURSOR_WIP_TEMPORAL_EXTRA_SLOTS, 2);
    assert.equal(CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS, 4);
    assert.equal(
      resolveEffectiveCursorWipMaxSlots({
        env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
        now: '2026-10-14T12:00:00Z',
      }),
      4,
    );
    const capacity = evaluateCursorWipCapacity({
      trackedIssues: [],
      readyIssues: [],
      env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
      maxSlots: 5,
      now: '2026-10-14T12:00:00Z',
    });
    assert.equal(capacity.maxSlots, 4);
  });

  it('admits four independent tasks and rejects the fifth during the exception', () => {
    const active = Array.from({ length: 4 }, (_, index) =>
      liveRun(12480 + index, `run-${String(index + 1).repeat(8)}-1249-1249-1249-124912491249`),
    );
    const fifth = readyIssue(12484);
    const capacity = evaluateCursorWipCapacity({
      trackedIssues: active,
      readyIssues: [fifth],
      pilotActive: true,
      now: '2026-10-14T12:00:00Z',
    });
    assert.equal(capacity.used, 4);
    assert.equal(capacity.availableSlots, 0);
    assert.equal(capacity.nextEligible, 12484);
    assert.equal(capacity.capacityFull, true);
  });

  it('falls back to two at the Mauritius cutoff', () => {
    const capacity = evaluateCursorWipCapacity({
      trackedIssues: [],
      readyIssues: [],
      pilotActive: true,
      now: CURSOR_WIP_TEMPORARY_CAPACITY_EXPIRES_AT,
    });
    assert.equal(capacity.pilotActive, false);
    assert.equal(capacity.maxSlots, 2);
    assert.equal(capacity.availableSlots, 2);
  });

  it('one live run leaves the second isolated slot available', () => {
    const live = liveRun(12491, 'run-aaaaaaaa-1249-1249-1249-124912491249');
    const waiting = readyIssue(12492);
    const plan = planCursorIssueClaims({
      readyIssues: [waiting],
      claimedIssues: [live],
      trackedIssues: [live, waiting],
    });
    assert.equal(plan.verifiedActiveCount, 1);
    assert.equal(plan.availableSlots, 1);
    assert.equal(plan.activationTargetIssue, 12492);
    assert.equal(plan.decisions[0]?.decision, 'claim');
    assert.equal(plan.decisions[0]?.eligibleToClaim, true);
    assert.match(String(plan.decisions[0]?.reason || ''), /eligible under segregation/);
  });

  it('empty lanes claim two otherwise eligible ready items', () => {
    const first = readyIssue(12493);
    const second = readyIssue(12494);
    const plan = planCursorIssueClaims({
      readyIssues: [first, second],
      claimedIssues: [],
    });
    assert.deepEqual(plan.claimIssueNumbers, [12493, 12494]);
    assert.equal(plan.activationTargetIssue, 12493);
    const held = plan.decisions.find((d) => d.issue.number === 12494);
    assert.equal(held?.decision, 'claim');
    assert.match(String(held?.reason || ''), /eligible under segregation/);
  });

  it('caller-requested higher WIP limits cannot exceed the two-lane ceiling', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [readyIssue(12495), readyIssue(12496)],
      claimedIssues: [],
      wipLimits: { maxActiveCursorImplementationIssues: 3 },
    });
    assert.equal(plan.wipLimits.maxActiveCursorImplementationIssues, 2);
    assert.deepEqual(plan.claimIssueNumbers, [12495, 12496]);
  });
});
