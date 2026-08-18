import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorActivationClaim,
  buildCursorRequeueMarker,
  formatCursorActivationClaimComment,
  formatCursorRequeueComment,
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
  attachLinkedPullRequestsToIssues,
  evaluateCursorWipCapacity,
  extractDispatchActivatedRunId,
  extractSourceIssueFromPullRequest,
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

const GEN1_881_RUN = 'run-fe56d0ab-41b1-4e51-b71f-e8249043e441';
const GEN2_882_RUN = 'run-73933f4a-b259-4f1c-84dc-3c86d6d3abb6';

function issue881GenerationHistory({
  includeGen2Pending = true,
  includeGen2Released = true,
  gen2RunId = null,
} = {}) {
  const gen2Token = 'gen2-881-claim';
  /** @type {Array<{ body: string, created_at: string }>} */
  const comments = [
    {
      created_at: '2026-08-12T10:00:00Z',
      body: formatCursorActivationClaimComment(
        buildCursorActivationClaim({
          sourceIssue: 881,
          generation: 1,
          claimToken: 'gen1-token',
          status: 'activated',
          agentRunId: GEN1_881_RUN,
        }),
      ),
    },
    {
      created_at: '2026-08-12T10:00:05Z',
      body: formatDispatchActivatedComment({
        issueNumber: 881,
        agentRunId: GEN1_881_RUN,
      }),
    },
    {
      created_at: '2026-08-12T10:00:06Z',
      body: formatCursorOriginMetadataComment(
        buildCursorOriginMetadata({
          sourceIssue: 881,
          cursorRunId: GEN1_881_RUN,
          cursorAgentId: 'bc-fe56d0ab-41b1-4e51-b71f-e8249043e441',
        }),
      ),
    },
    {
      created_at: '2026-08-12T18:00:00Z',
      body: formatCursorCompletionEventComment(
        buildCursorCompletionEvent({
          sourceIssue: 881,
          cursorRunId: GEN1_881_RUN,
          cursorAgentId: 'bc-fe56d0ab-41b1-4e51-b71f-e8249043e441',
          status: 'COMPLETED',
        }),
      ),
    },
    {
      created_at: '2026-08-13T06:49:30Z',
      body: formatCursorRequeueComment(
        buildCursorRequeueMarker({
          sourceIssue: 881,
          generation: 2,
          reason: 'continue existing work',
          requeuedAt: '2026-08-13T06:49:30.000Z',
        }),
      ),
    },
  ];
  if (includeGen2Pending) {
    comments.push({
      created_at: '2026-08-13T07:00:00Z',
      body: formatCursorActivationClaimComment(
        buildCursorActivationClaim({
          sourceIssue: 881,
          generation: 2,
          claimToken: gen2Token,
          status: 'pending',
        }),
      ),
    });
  }
  if (includeGen2Released) {
    comments.push({
      created_at: '2026-08-13T07:05:00Z',
      body: formatCursorActivationClaimComment(
        buildCursorActivationClaim({
          sourceIssue: 881,
          generation: 2,
          claimToken: gen2Token,
          status: 'released',
        }),
      ),
    });
  }
  if (gen2RunId) {
    comments.push(
      {
        created_at: '2026-08-13T07:10:00Z',
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 2,
            claimToken: 'gen2-activated',
            status: 'activated',
            agentRunId: gen2RunId,
          }),
        ),
      },
      {
        created_at: '2026-08-13T07:10:01Z',
        body: formatDispatchActivatedComment({
          issueNumber: 881,
          agentRunId: gen2RunId,
        }),
      },
    );
  }
  return comments;
}

describe('cursor WIP claim status + generation boundary (#922)', () => {
  it('#881 gen1 history + gen2 pending + gen2 released + ready => zero old WIP', () => {
    const comments = issue881GenerationHistory();
    const inspected = inspectIssueWipState({
      number: 881,
      state: 'open',
      labels: ['dispatch:cursor-ready'],
      comments,
    });
    assert.equal(inspected.verifiedLive, false);
    assert.equal(inspected.slot, null);
    assert.equal(extractDispatchActivatedRunId(comments), null);

    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        {
          number: 881,
          state: 'open',
          labels: ['dispatch:cursor-ready'],
          comments,
        },
      ],
      readyIssues: [
        {
          number: 881,
          state: 'open',
          labels: ['dispatch:cursor-ready'],
          body: 'documentation only',
          title: 'Product Catalogue',
          comments,
        },
      ],
    });
    assert.equal(wip.used, 0);
    assert.equal(wip.availableSlots, 2);
    assert.equal(wip.nextEligible, 881);
    assert.equal(wip.maxSlots, 2);
  });

  it('terminal gen2 claim with leftover execution labels consumes zero WIP and reconciles', () => {
    const comments = issue881GenerationHistory();
    const inspected = inspectIssueWipState({
      number: 881,
      state: 'open',
      labels: ['dispatch:cursor-claimed', 'status:in-progress', 'dispatch:cursor-ready'],
      comments,
    });
    assert.equal(inspected.verifiedLive, false);
    assert.equal(inspected.reconcile.length, 1);
    assert.equal(inspected.reconcile[0].reason, 'terminal_claim_with_active_execution_labels');

    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        {
          number: 881,
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments,
        },
      ],
      readyIssues: [],
    });
    assert.equal(wip.used, 0);
    assert.ok(wip.reconciledCount >= 1);
  });

  it('gen2 pending in flight after requeue must not occupy WIP with the gen1 run id', () => {
    const comments = issue881GenerationHistory({
      includeGen2Pending: true,
      includeGen2Released: false,
    });
    const inspected = inspectIssueWipState({
      number: 881,
      state: 'open',
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments,
    });
    assert.equal(extractDispatchActivatedRunId(comments), null);
    assert.equal(inspected.verifiedLive, false);
    assert.notEqual(inspected.runId, GEN1_881_RUN);

    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        {
          number: 881,
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments,
        },
      ],
      readyIssues: [],
    });
    assert.equal(wip.used, 0);
  });

  it('current-generation activated run still consumes exactly one slot', () => {
    const gen2Run = 'run-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const comments = issue881GenerationHistory({
      includeGen2Pending: false,
      includeGen2Released: false,
      gen2RunId: gen2Run,
    });
    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        {
          number: 881,
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments,
        },
      ],
      readyIssues: [],
    });
    assert.equal(wip.used, 1);
    assert.equal(wip.slots[0].runId, gen2Run);
    assert.equal(wip.slots[0].issueNumber, 881);
    assert.equal(wip.slots[0].generation, 2);
  });

  it('one old run id cannot occupy two issues or survive a generation boundary', () => {
    const quotedHandoff = `<!-- corpflow.factory_cursor_handoff.v1 -->
# CORPFLOW FACTORY HANDOFF

Selected source issue: #882
Capacity packet:
\`\`\`
CURSOR CAPACITY: 1/2 active
Slot 1: #881 — running — ${GEN1_881_RUN}
Slot 2: FREE
Next eligible: #882
\`\`\``;

    const wip = evaluateCursorWipCapacity({
      trackedIssues: [
        {
          number: 881,
          state: 'open',
          labels: ['dispatch:cursor-ready'],
          comments: issue881GenerationHistory(),
        },
        {
          number: 882,
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: [{ body: quotedHandoff }],
        },
      ],
      readyIssues: [],
    });
    assert.equal(wip.used, 0);
    assert.ok(!wip.slots.some((s) => s.runId === GEN1_881_RUN));

    const livePair = evaluateCursorWipCapacity({
      trackedIssues: [
        liveIssue(881, GEN2_882_RUN.replace('73933f4a', 'aaaaaaaa')),
        liveIssue(882, GEN2_882_RUN),
      ],
      readyIssues: [],
    });
    assert.equal(livePair.used, 2);
    const ids = livePair.slots.map((s) => s.runId);
    assert.equal(new Set(ids).size, 2);
    assert.ok(!ids.includes(GEN1_881_RUN));
  });
});

const MERGE_READY_974_RUN = 'run-aaaaaaaa-9740-9740-9740-974097409740';
const MERGE_READY_975_RUN = 'run-bbbbbbbb-9750-9750-9750-975097509750';
const CONTINUATION_801_OLD = 'run-cccccccc-8010-8010-8010-801080108010';
const CONTINUATION_801_NEW = 'run-dddddddd-8011-8011-8011-801180118011';

function mergeReadyIssue(number, runId, extra = {}) {
  return {
    number,
    title: `Merge-ready #${number}`,
    body: 'documentation only',
    state: 'open',
    labels: ['dispatch:cursor-claimed', 'status:in-progress'],
    comments: activatedComments(number, runId),
    linkedPrs: [
      {
        number: number + 1000,
        state: 'open',
        draft: false,
        mergeReady: true,
        title: `fix: #${number} merge-ready`,
      },
    ],
    ...extra,
  };
}

function eligibleReadyIssue(number) {
  return {
    number,
    title: `Eligible #${number}`,
    body: 'documentation only ordinary work',
    state: 'open',
    labels: ['dispatch:cursor-ready', 'priority:P0'],
    createdAt: `2026-08-18T00:00:0${number % 10}Z`,
  };
}

describe('cursor WIP release at merge-ready (#976)', () => {
  it('two merge-ready PRs + two new eligible items => both new items may start', () => {
    const mergeReadyA = mergeReadyIssue(1974, MERGE_READY_974_RUN);
    const mergeReadyB = mergeReadyIssue(1975, MERGE_READY_975_RUN);
    const readyA = eligibleReadyIssue(1976);
    const readyB = eligibleReadyIssue(1977);

    const inspectedA = inspectIssueWipState(mergeReadyA);
    assert.equal(inspectedA.verifiedLive, false);
    assert.equal(inspectedA.reviewInventory, true);
    assert.equal(inspectedA.reconcile[0].reason, 'merge_ready_review_inventory');

    const plan = planCursorIssueClaims({
      trackedIssues: [mergeReadyA, mergeReadyB],
      claimedIssues: [mergeReadyA, mergeReadyB],
      readyIssues: [readyA, readyB],
    });
    assert.equal(plan.verifiedActiveCount, 0);
    assert.equal(plan.availableSlots, 2);
    assert.deepEqual(plan.claimIssueNumbers, [1976, 1977]);
    assert.equal(plan.activationTargetIssue, 1976);
    assert.deepEqual(plan.wipCapacity.reviewDecisionInventoryIssueNumbers, [1974, 1975]);
    assert.match(plan.capacityPacket, /CURSOR CAPACITY: 0\/2 active/);
    assert.match(plan.capacityPacket, /Review\/decision inventory: #1974, #1975/);
  });

  it('one review item needing rework => only the actual continuation run consumes execution capacity', () => {
    const reviewOnly = {
      number: 1801,
      title: 'Review may later request rework',
      body: 'documentation only',
      state: 'open',
      labels: ['dispatch:operator-review'],
      comments: [
        ...activatedComments(1801, CONTINUATION_801_OLD),
        {
          body: formatCursorCompletionEventComment(
            buildCursorCompletionEvent({
              sourceIssue: 1801,
              cursorRunId: CONTINUATION_801_OLD,
              cursorAgentId: 'bc-80108010-8010-8010-8010-801080108010',
              status: 'COMPLETED',
            }),
          ),
        },
      ],
      linkedPrs: [
        {
          number: 2801,
          state: 'open',
          draft: false,
          mergeReady: true,
          title: 'fix: #1801 merge-ready',
        },
      ],
    };

    const waitingForPossibleRework = planCursorIssueClaims({
      trackedIssues: [reviewOnly],
      claimedIssues: [],
      readyIssues: [eligibleReadyIssue(1802), eligibleReadyIssue(1803)],
    });
    assert.equal(waitingForPossibleRework.verifiedActiveCount, 0);
    assert.equal(waitingForPossibleRework.availableSlots, 2);
    assert.deepEqual(waitingForPossibleRework.claimIssueNumbers, [1802, 1803]);
    assert.ok(waitingForPossibleRework.wipCapacity.reviewDecisionInventoryIssueNumbers.includes(1801));

    const continuation = {
      number: 1801,
      title: 'Bounded rework continuation',
      body: 'documentation only',
      state: 'open',
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments: [
        ...activatedComments(1801, CONTINUATION_801_OLD),
        {
          created_at: '2026-08-18T01:00:00Z',
          body: formatCursorCompletionEventComment(
            buildCursorCompletionEvent({
              sourceIssue: 1801,
              cursorRunId: CONTINUATION_801_OLD,
              cursorAgentId: 'bc-80108010-8010-8010-8010-801080108010',
              status: 'COMPLETED',
            }),
          ),
        },
        {
          created_at: '2026-08-18T02:00:00Z',
          body: formatCursorRequeueComment(
            buildCursorRequeueMarker({
              sourceIssue: 1801,
              generation: 2,
              reason: 'review requested bounded rework',
              requeuedAt: '2026-08-18T02:00:00.000Z',
            }),
          ),
        },
        {
          created_at: '2026-08-18T02:05:00Z',
          body: formatCursorActivationClaimComment(
            buildCursorActivationClaim({
              sourceIssue: 1801,
              generation: 2,
              claimToken: 'tok-1801-gen2',
              status: 'activated',
              agentRunId: CONTINUATION_801_NEW,
            }),
          ),
        },
        {
          created_at: '2026-08-18T02:05:01Z',
          body: formatDispatchActivatedComment({
            issueNumber: 1801,
            agentRunId: CONTINUATION_801_NEW,
          }),
        },
      ],
      linkedPrs: [
        {
          number: 2801,
          state: 'open',
          draft: false,
          mergeReady: true,
          title: 'fix: #1801 still open during rework',
        },
      ],
    };

    const continuationWip = evaluateCursorWipCapacity({
      trackedIssues: [continuation],
      readyIssues: [eligibleReadyIssue(1804)],
    });
    assert.equal(continuationWip.used, 1);
    assert.equal(continuationWip.availableSlots, 1);
    assert.equal(continuationWip.slots[0].issueNumber, 1801);
    assert.equal(continuationWip.slots[0].runId, CONTINUATION_801_NEW);
    assert.equal(inspectIssueWipState(continuation).isContinuation, true);
    assert.equal(inspectIssueWipState(continuation).reviewInventory, false);
  });

  it('binds open PRs to source issues without treating raw PR count as WIP', () => {
    const issues = [
      liveIssue(1962, 'run-eeeeeeee-1962-1962-1962-196219621962'),
      liveIssue(1973, 'run-ffffffff-1973-1973-1973-197319731973'),
    ];
    attachLinkedPullRequestsToIssues(issues, [
      {
        number: 2974,
        state: 'open',
        draft: false,
        title: 'fix(factory): #1962 list-form constraints',
        body: 'Source issue: #1962\nCanonical Context Preflight: PASS',
      },
      {
        number: 2975,
        state: 'open',
        draft: false,
        title: 'fix(delivery): #1973 skip preview gating',
        body: 'Source item: #1973',
      },
    ]);
    assert.equal(extractSourceIssueFromPullRequest({ title: 'fix: #962', body: '' }), 962);
    assert.equal(issues[0].linkedPrs[0].number, 2974);
    assert.equal(issues[1].linkedPrs[0].number, 2975);

    const wip = evaluateCursorWipCapacity({
      trackedIssues: issues,
      readyIssues: [eligibleReadyIssue(1976), eligibleReadyIssue(1977)],
      openPrCount: 2,
    });
    assert.equal(wip.used, 0);
    assert.equal(wip.availableSlots, 2);
    assert.equal(wip.openPrCountIgnored, true);
    assert.deepEqual(wip.reviewDecisionInventoryIssueNumbers, [1962, 1973]);
    assert.equal(wip.nextEligible, 1976);
  });
});
