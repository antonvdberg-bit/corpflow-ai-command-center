/**
 * The CEO-authorised two-lane policy supersedes the former one-lane cap.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';
import { planCursorIssueClaims } from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  CURSOR_WIP_MAX_SLOTS,
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
  it('keeps exactly two active implementation lanes even when Temporal is marked active', () => {
    assert.equal(CURSOR_WIP_MAX_SLOTS, 2);
    assert.equal(CURSOR_WIP_TEMPORAL_EXTRA_SLOTS, 0);
    assert.equal(CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS, 2);
    assert.equal(
      resolveEffectiveCursorWipMaxSlots({
        env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
      }),
      2,
    );
    const capacity = evaluateCursorWipCapacity({
      trackedIssues: [],
      readyIssues: [],
      env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
      maxSlots: 5,
    });
    assert.equal(capacity.maxSlots, 2);
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
