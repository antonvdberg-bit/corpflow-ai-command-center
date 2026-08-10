import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';
import {
  buildCursorCompletionEvent,
  formatCursorCompletionEventComment,
} from '../lib/server/cursor-agent-lifecycle.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
} from '../lib/server/cursor-origin-metadata.js';
import {
  formatDispatchActivatedComment,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  DISPATCH_LABEL_PAUSED,
  evaluateCursorWipCapacity,
  formatCursorCapacityPacket,
  inspectIssueWipState,
} from '../lib/server/cursor-wip-control.js';

function activatedComments(issueNumber, runId, { paused = false, status = 'activated' } = {}) {
  return [
    {
      body: formatCursorActivationClaimComment(
        buildCursorActivationClaim({
          sourceIssue: issueNumber,
          generation: 1,
          claimToken: `tok-${issueNumber}`,
          status,
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

function liveIssue(number, runId, extraLabels = []) {
  return {
    number,
    title: `Live #${number}`,
    body: 'docs only',
    state: 'open',
    labels: ['dispatch:cursor-claimed', 'status:in-progress', ...extraLabels],
    comments: activatedComments(number, runId),
  };
}

describe('cursor WIP control v1 (#862)', () => {
  it('1) two verified live runs => 2/2', () => {
    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        liveIssue(101, 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
        liveIssue(102, 'run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
      ],
      readyIssues: [],
    });
    assert.equal(wip.used, 2);
    assert.equal(wip.availableSlots, 0);
    assert.equal(wip.capacityFull, true);
    assert.match(wip.capacityPacket, /CURSOR CAPACITY: 2\/2 active/);
    assert.match(wip.capacityPacket, /run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/);
    assert.match(wip.capacityPacket, /run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/);
  });

  it('2) one live run plus stale labels => 1/2', () => {
    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        liveIssue(201, 'run-cccccccc-cccc-cccc-cccc-cccccccccccc'),
        {
          number: 202,
          title: 'Stale labels only',
          body: 'docs',
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: [],
        },
      ],
      readyIssues: [],
    });
    assert.equal(wip.used, 1);
    assert.equal(wip.availableSlots, 1);
    assert.equal(wip.reconciledCount, 1);
    assert.equal(wip.reconcileActions[0].issueNumber, 202);
  });

  it('3) third ready item waits behind two real runs', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [
        {
          number: 303,
          title: 'Waiting docs',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P0'],
        },
      ],
      trackedIssues: [
        liveIssue(301, 'run-dddddddd-dddd-dddd-dddd-dddddddddddd'),
        liveIssue(302, 'run-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
      ],
      claimedIssues: [
        liveIssue(301, 'run-dddddddd-dddd-dddd-dddd-dddddddddddd'),
        liveIssue(302, 'run-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
      ],
    });
    assert.equal(plan.availableSlots, 0);
    assert.equal(plan.verifiedActiveCount, 2);
    assert.equal(plan.decisions[0].decision, 'discover_only');
    assert.equal(plan.decisions[0].eligibleToClaim, true);
    assert.match(String(plan.decisions[0].reason), /WIP cap reached/);
    assert.equal(plan.activationTargetIssue, null);
  });

  it('4) P0 outranks P1/P2/unprioritized', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [
        {
          number: 410,
          title: 'Unprioritized',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready'],
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          number: 411,
          title: 'P2',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P2'],
          createdAt: '2026-01-02T00:00:00Z',
        },
        {
          number: 412,
          title: 'P1',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P1'],
          createdAt: '2026-01-03T00:00:00Z',
        },
        {
          number: 413,
          title: 'P0',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P0'],
          createdAt: '2026-01-04T00:00:00Z',
        },
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    assert.equal(plan.activationTargetIssue, 413);
    assert.deepEqual(plan.claimIssueNumbers.slice(0, 2), [413, 412]);
  });

  it('5) stable oldest-ready tie-break inside same priority', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [
        {
          number: 520,
          title: 'Newer P0',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P0'],
          createdAt: '2026-06-02T00:00:00Z',
        },
        {
          number: 521,
          title: 'Older P0',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P0'],
          createdAt: '2026-06-01T00:00:00Z',
        },
      ],
      claimedIssues: [],
    });
    assert.equal(plan.activationTargetIssue, 521);
    assert.deepEqual(plan.claimIssueNumbers, [521, 520]);
  });

  it('6) paused ready item skipped', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [
        {
          number: 601,
          title: 'Paused ready',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P0', DISPATCH_LABEL_PAUSED],
        },
        {
          number: 602,
          title: 'Active ready',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P1'],
        },
      ],
      claimedIssues: [],
    });
    const d601 = plan.decisions.find((d) => d.issue.number === 601);
    assert.equal(d601?.eligibleToClaim, false);
    assert.match(String(d601?.reason || ''), /execution:paused/);
    assert.equal(plan.activationTargetIssue, 602);
    assert.ok(plan.capacityPacket.includes('Paused: #601'));
  });

  it('7) unpause restores eligibility', () => {
    const paused = planCursorIssueClaims({
      readyIssues: [
        {
          number: 701,
          title: 'Was paused',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P0', DISPATCH_LABEL_PAUSED],
        },
      ],
      claimedIssues: [],
    });
    assert.equal(paused.activationTargetIssue, null);

    const unpaused = planCursorIssueClaims({
      readyIssues: [
        {
          number: 701,
          title: 'Was paused',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready', 'priority:P0'],
        },
      ],
      claimedIssues: [],
    });
    assert.equal(unpaused.activationTargetIssue, 701);
    assert.equal(unpaused.decisions[0].decision, 'claim');
  });

  it('8) operator-review releases slot automatically', () => {
    const inspected = inspectIssueWipState({
      number: 801,
      state: 'open',
      labels: ['dispatch:cursor-claimed', 'status:in-progress', 'dispatch:operator-review'],
      comments: activatedComments(801, 'run-ffffffff-ffff-ffff-ffff-ffffffffffff'),
    });
    assert.equal(inspected.verifiedLive, false);
    assert.equal(inspected.reconcile.length, 1);
    assert.equal(inspected.reconcile[0].reason, 'operator_review_with_active_execution_labels');

    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        {
          number: 801,
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress', 'dispatch:operator-review'],
          comments: activatedComments(801, 'run-ffffffff-ffff-ffff-ffff-ffffffffffff'),
        },
      ],
      readyIssues: [
        {
          number: 802,
          labels: ['dispatch:cursor-ready'],
          body: 'documentation only',
          title: 'next',
        },
      ],
    });
    assert.equal(wip.used, 0);
    assert.equal(wip.nextEligible, 802);
  });

  it('9) closed item releases slot automatically', () => {
    const inspected = inspectIssueWipState({
      number: 901,
      state: 'closed',
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments: activatedComments(901, 'run-11111111-1111-1111-1111-111111111111'),
    });
    assert.equal(inspected.verifiedLive, false);
    assert.equal(inspected.reconcile[0].reason, 'closed_with_active_execution_labels');
  });

  it('10) orphaned/failed activation labels consume zero slots', () => {
    const failedCompletion = formatCursorCompletionEventComment(
      buildCursorCompletionEvent({
        sourceIssue: 1001,
        cursorAgentId: 'bc-dead',
        cursorRunId: 'run-22222222-2222-2222-2222-222222222222',
        status: 'FAILED',
        antonRequired: true,
      }),
    );
    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        {
          number: 1001,
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: [
            {
              body: formatCursorActivationClaimComment(
                buildCursorActivationClaim({
                  sourceIssue: 1001,
                  generation: 1,
                  claimToken: 'failed-tok',
                  status: 'released',
                  agentRunId: 'run-22222222-2222-2222-2222-222222222222',
                }),
              ),
            },
            { body: failedCompletion },
          ],
        },
        {
          number: 1002,
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: [],
        },
      ],
      readyIssues: [],
    });
    assert.equal(wip.used, 0);
    assert.equal(wip.availableSlots, 2);
    assert.ok(wip.reconciledCount >= 2);
  });

  it('11) capacity packet names exact run IDs', () => {
    const packet = formatCursorCapacityPacket({
      used: 1,
      max: 2,
      slots: [
        {
          issueNumber: 1101,
          state: 'running',
          runId: 'run-33333333-3333-3333-3333-333333333333',
          paused: false,
          generation: 1,
        },
        null,
      ],
      nextEligible: 1102,
      pausedIssueNumbers: [],
      reconciledCount: 0,
    });
    assert.match(packet, /Slot 1: #1101 — running — run-33333333-3333-3333-3333-333333333333/);
    assert.match(packet, /Slot 2: FREE/);
    assert.match(packet, /Next eligible: #1102/);
    assert.match(packet, /Paused: NONE/);
    assert.match(packet, /Reconciled stale states: 0/);
  });

  it('12) open PR count does not change WIP count', () => {
    const base = evaluateCursorWipCapacity({
      trackedIssues: [liveIssue(1201, 'run-44444444-4444-4444-4444-444444444444')],
      readyIssues: [],
      openPrCount: 0,
    });
    const withPrs = evaluateCursorWipCapacity({
      trackedIssues: [liveIssue(1201, 'run-44444444-4444-4444-4444-444444444444')],
      readyIssues: [],
      openPrCount: 99,
    });
    assert.equal(base.used, withPrs.used);
    assert.equal(base.availableSlots, withPrs.availableSlots);
    assert.equal(withPrs.openPrCountIgnored, true);
  });

  it('13) protected-gate behavior remains unchanged', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [
        {
          number: 1301,
          title: 'Client production cutover',
          body: 'Deploy to client_production on the client-owned production target after Anton approval.',
          labels: ['dispatch:cursor-ready', 'priority:P0'],
        },
      ],
      claimedIssues: [],
    });
    const d = plan.decisions[0];
    assert.equal(d.eligibleToClaim, false);
    assert.equal(d.decision, 'discover_only');
    assert.match(String(d.reason), /protected gate/);
  });

  it('paused live run still occupies a verified slot (no invented kill)', () => {
    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        liveIssue(1401, 'run-55555555-5555-5555-5555-555555555555', [DISPATCH_LABEL_PAUSED]),
      ],
      readyIssues: [
        {
          number: 1402,
          title: 'Next',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready'],
        },
      ],
    });
    assert.equal(wip.used, 1);
    assert.equal(wip.slots[0].state, 'running-paused');
    assert.ok(wip.pausedIssueNumbers.includes(1401));
  });

  it('origin metadata alone with claimed labels can verify a live run', () => {
    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        {
          number: 1501,
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: [
            {
              body: formatCursorOriginMetadataComment(
                buildCursorOriginMetadata({
                  sourceIssue: 1501,
                  cursorRunId: 'run-66666666-6666-6666-6666-666666666666',
                  cursorAgentId: 'bc-66666666-6666-6666-6666-666666666666',
                }),
              ),
            },
          ],
        },
      ],
      readyIssues: [],
    });
    assert.equal(wip.used, 1);
    assert.equal(wip.slots[0].runId, 'run-66666666-6666-6666-6666-666666666666');
  });
});
