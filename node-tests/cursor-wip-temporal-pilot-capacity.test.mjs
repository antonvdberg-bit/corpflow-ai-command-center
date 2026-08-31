/**
 * #1249 supersedes the former 3+2 capacity allowance.
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
  it('keeps exactly one active implementation lane even when Temporal is marked active', () => {
    assert.equal(CURSOR_WIP_MAX_SLOTS, 1);
    assert.equal(CURSOR_WIP_TEMPORAL_EXTRA_SLOTS, 0);
    assert.equal(CURSOR_WIP_TEMPORAL_PILOT_MAX_SLOTS, 1);
    assert.equal(
      resolveEffectiveCursorWipMaxSlots({
        env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
      }),
      1,
    );
    const capacity = evaluateCursorWipCapacity({
      trackedIssues: [],
      readyIssues: [],
      env: { CORPFLOW_TEMPORAL_PILOT: 'active' },
      maxSlots: 5,
    });
    assert.equal(capacity.maxSlots, 1);
  });

  it('one live run plus a second ready item stays discover_only (no catch-up slot)', () => {
    const live = liveRun(12491, 'run-aaaaaaaa-1249-1249-1249-124912491249');
    const waiting = readyIssue(12492);
    const plan = planCursorIssueClaims({
      readyIssues: [waiting],
      claimedIssues: [live],
      trackedIssues: [live, waiting],
    });
    assert.equal(plan.verifiedActiveCount, 1);
    assert.equal(plan.availableSlots, 0);
    assert.equal(plan.activationTargetIssue, null);
    assert.equal(plan.decisions[0]?.decision, 'discover_only');
    assert.equal(plan.decisions[0]?.eligibleToClaim, true);
    assert.match(String(plan.decisions[0]?.reason || ''), /WIP cap reached/);
  });

  it('empty lane claims exactly one of two otherwise eligible ready items', () => {
    const first = readyIssue(12493);
    const second = readyIssue(12494);
    const plan = planCursorIssueClaims({
      readyIssues: [first, second],
      claimedIssues: [],
    });
    assert.deepEqual(plan.claimIssueNumbers, [12493]);
    assert.equal(plan.activationTargetIssue, 12493);
    const held = plan.decisions.find((d) => d.issue.number === 12494);
    assert.equal(held?.decision, 'discover_only');
    assert.match(String(held?.reason || ''), /WIP cap reached/);
  });

  it('caller-requested higher WIP limits cannot reopen a second lane', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [readyIssue(12495), readyIssue(12496)],
      claimedIssues: [],
      wipLimits: { maxActiveCursorImplementationIssues: 3 },
    });
    assert.equal(plan.wipLimits.maxActiveCursorImplementationIssues, 1);
    assert.deepEqual(plan.claimIssueNumbers, [12495]);
  });
});
