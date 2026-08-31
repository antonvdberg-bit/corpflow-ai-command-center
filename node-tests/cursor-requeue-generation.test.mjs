/**
 * #1116 — explicit CURSOR REQUEUE must create a new executable generation.
 *
 * Ordinary ready relabels after a completed generation stay suppressed.
 * An authorised operator/controller CURSOR REQUEUE instruction increments a
 * durable next generation that Factory Handoff / Queue Reconcile can select.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorActivationClaim,
  buildCursorRequeueMarker,
  evaluateCursorIssueActivationClaim,
  formatCursorActivationClaimComment,
  formatCursorRequeueComment,
  looksLikeExplicitCursorRequeueInstruction,
  parseCursorRequeuesFromComments,
  planCursorRequeueMaterialization,
  SKIP_ALREADY_CLAIMED,
} from '../lib/server/cursor-activation-claim.js';
import {
  buildCursorCompletionEvent,
  formatCursorCompletionEventComment,
} from '../lib/server/cursor-agent-lifecycle.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
  resolveCursorOriginMetadata,
} from '../lib/server/cursor-origin-metadata.js';
import { planCursorIssueClaims } from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  inspectIssueWipState,
} from '../lib/server/cursor-wip-control.js';
import { resolveFactoryQueueReconcileDecision } from '../lib/server/factory-queue-reconcile.js';
import {
  resolveFactoryDispatcherRunPlan,
  shouldWakeOnCursorRequeueComment,
} from '../lib/server/cursor-ready-event-dispatch.js';

const ANTON = 'antonvdberg-bit';
const GEN1_RUN = 'run-d77e301b-bc5e-44d1-99df-d6dc3db5ece3';
const GEN1_AGENT = 'bc-cf3af4df-7d1d-4d8b-886f-59783672d31c';
const GEN2_RUN = 'run-aaaaaaaa-1116-1116-1116-111611161116';
const GEN2_AGENT = 'bc-bbbbbbbb-1116-1116-1116-111611161116';

function gen1CompletedComments(issueNumber, { prNumber = 1099 } = {}) {
  return [
    {
      created_at: '2026-08-26T04:00:35Z',
      author: 'github-actions[bot]',
      body: formatCursorActivationClaimComment(
        buildCursorActivationClaim({
          sourceIssue: issueNumber,
          generation: 1,
          claimToken: `tok-${issueNumber}-g1`,
          status: 'activated',
          agentRunId: GEN1_AGENT,
        }),
      ),
    },
    {
      created_at: '2026-08-26T04:00:40Z',
      author: 'github-actions[bot]',
      body: formatCursorOriginMetadataComment(
        buildCursorOriginMetadata({
          sourceIssue: issueNumber,
          cursorRunId: GEN1_RUN,
          cursorAgentId: GEN1_AGENT,
          prNumber,
        }),
      ),
    },
    {
      created_at: '2026-08-26T04:20:01Z',
      author: 'github-actions[bot]',
      body: formatCursorCompletionEventComment(
        buildCursorCompletionEvent({
          sourceIssue: issueNumber,
          cursorAgentId: GEN1_AGENT,
          cursorRunId: GEN1_RUN,
          status: 'COMPLETED',
          prNumber,
          prUrl: `https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/${prNumber}`,
        }),
      ),
    },
  ];
}

function antonRequeueComment(issueNumber, { createdAt = '2026-08-27T00:10:00Z', extra = '' } = {}) {
  return {
    created_at: createdAt,
    author: ANTON,
    author_association: 'OWNER',
    body: `CURSOR REQUEUE — current-main integration repair required.

Reason: PR lineage is non-mergeable against current main. This is executable rework, not terminal review inventory.
${extra}`,
  };
}

function readyIssue(number, comments, extra = {}) {
  return {
    number,
    title: `P1 App build #${number}`,
    body: 'ordinary app work. No schema, env/secrets, payment, send, or production deploy.',
    state: 'open',
    labels: ['priority:P1', 'dispatch:cursor-ready'],
    comments,
    linkedPrs: [
      {
        number: 1099,
        state: 'open',
        draft: false,
        mergeReady: true,
        title: `fix: #${number} commercial`,
      },
    ],
    ...extra,
  };
}

describe('explicit CURSOR REQUEUE generation contract (#1116)', () => {
  it('does not treat ordinary mentions as a requeue instruction', () => {
    assert.equal(
      looksLikeExplicitCursorRequeueInstruction(
        'A further attempt requires an explicit CURSOR REQUEUE generation boundary.',
      ),
      false,
    );
    assert.equal(
      looksLikeExplicitCursorRequeueInstruction('CURSOR REQUEUE — current-main repair.'),
      true,
    );
  });

  it('completed Gen1 + ordinary ready relabel remains suppressed', () => {
    const issue = readyIssue(1004, gen1CompletedComments(1004));
    const inspected = inspectIssueWipState(issue);
    assert.equal(inspected.reviewInventory, true);
    assert.equal(inspected.verifiedLive, false);

    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 1004,
      labels: issue.labels,
      comments: issue.comments,
    });
    assert.equal(gate.decision, SKIP_ALREADY_CLAIMED);

    const plan = planCursorIssueClaims({
      readyIssues: [issue],
      claimedIssues: [],
      trackedIssues: [issue],
    });
    assert.equal(plan.activationTargetIssue, null);
    assert.match(
      String(plan.decisions.find((d) => d.issue.number === 1004)?.reason || ''),
      /review inventory/i,
    );
  });

  it('completed Gen1 + one explicit CURSOR REQUEUE => Gen2 eligible', () => {
    const comments = [...gen1CompletedComments(1004), antonRequeueComment(1004)];
    const issue = readyIssue(1004, comments);

    const requeues = parseCursorRequeuesFromComments(comments);
    assert.equal(requeues[0]?.generation, 2);

    const origin = resolveCursorOriginMetadata({ comments });
    assert.equal(origin.cursorAgentId, null);
    assert.equal(origin.cursorRunId, null);

    const inspected = inspectIssueWipState(issue);
    assert.equal(inspected.reviewInventory, false);

    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 1004,
      labels: issue.labels,
      comments,
    });
    assert.equal(gate.decision, 'ACQUIRE');
    assert.equal(gate.reason, 'explicit_requeue');
    assert.equal(gate.generation, 2);

    const plan = planCursorIssueClaims({
      readyIssues: [issue],
      claimedIssues: [],
      trackedIssues: [issue],
    });
    assert.equal(plan.activationTargetIssue, 1004);
    assert.equal(plan.availableSlots, 1);
  });

  it('replay of the same CURSOR REQUEUE stays on Gen2 and materializes once', () => {
    const first = antonRequeueComment(1004, { createdAt: '2026-08-27T00:10:00Z' });
    const replay = antonRequeueComment(1004, { createdAt: '2026-08-27T00:10:00Z' });
    const comments = [...gen1CompletedComments(1004), first, replay];

    const requeues = parseCursorRequeuesFromComments(comments);
    assert.equal(requeues[0]?.generation, 2);
    assert.ok(requeues.every((r) => r.generation === 2));

    const firstPlan = planCursorRequeueMaterialization({
      issueNumber: 1004,
      comments,
      nowIso: '2026-08-27T00:12:00.000Z',
    });
    assert.equal(firstPlan.post, true);
    assert.equal(firstPlan.generation, 2);

    const afterMaterialize = [
      ...comments,
      { body: firstPlan.body, author: 'github-actions[bot]', created_at: '2026-08-27T00:12:00Z' },
    ];
    const secondPlan = planCursorRequeueMaterialization({
      issueNumber: 1004,
      comments: afterMaterialize,
    });
    assert.equal(secondPlan.post, false);
    assert.equal(secondPlan.generation, 2);
    assert.equal(parseCursorRequeuesFromComments(afterMaterialize)[0]?.generation, 2);

    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 1004,
      labels: ['dispatch:cursor-ready'],
      comments: afterMaterialize,
    });
    assert.equal(gate.generation, 2);
  });

  it('Gen2 active does not create a duplicate Gen2', () => {
    const comments = [
      ...gen1CompletedComments(1004),
      antonRequeueComment(1004),
      {
        created_at: '2026-08-27T00:20:00Z',
        author: 'github-actions[bot]',
        body: formatCursorRequeueComment(
          buildCursorRequeueMarker({
            sourceIssue: 1004,
            generation: 2,
            reason: 'explicit operator requeue',
          }),
        ),
      },
      {
        created_at: '2026-08-27T00:21:00Z',
        author: 'github-actions[bot]',
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 1004,
            generation: 2,
            claimToken: 'tok-1004-g2',
            status: 'activated',
            agentRunId: GEN2_AGENT,
          }),
        ),
      },
    ];

    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 1004,
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments,
    });
    assert.equal(gate.decision, SKIP_ALREADY_CLAIMED);

    const issue = {
      ...readyIssue(1004, comments, {
        labels: ['dispatch:cursor-claimed', 'status:in-progress'],
        linkedPrs: [
          { number: 1099, state: 'open', draft: false, mergeReady: true, title: 'fix: #1004' },
        ],
      }),
    };
    const inspected = inspectIssueWipState(issue);
    assert.equal(inspected.reviewInventory, false);
    assert.equal(inspected.verifiedLive, true);
    assert.equal(inspected.isContinuation, true);

    const otherReady = {
      number: 1083,
      title: 'P0 Factory repair',
      body: 'ordinary factory repair. No schema, env/secrets, payment, send, or production deploy.',
      state: 'open',
      labels: ['priority:P0', 'dispatch:cursor-ready'],
      comments: [],
    };
    const plan = planCursorIssueClaims({
      readyIssues: [otherReady],
      claimedIssues: [issue],
      trackedIssues: [issue, otherReady],
    });
    assert.equal(plan.activationTargetIssue, null);
    assert.ok(!plan.claimIssueNumbers.includes(1004));
    assert.ok(!plan.claimIssueNumbers.includes(1083));
    assert.equal(plan.verifiedActiveCount, 1);
    assert.match(
      String(plan.decisions.find((d) => d.issue.number === 1083)?.reason || ''),
      /WIP cap/i,
    );
  });

  it('Gen2 completes + new explicit requeue => Gen3 eligible', () => {
    const comments = [
      ...gen1CompletedComments(1004),
      antonRequeueComment(1004, { createdAt: '2026-08-27T00:10:00Z' }),
      {
        created_at: '2026-08-27T00:12:00Z',
        author: 'github-actions[bot]',
        body: formatCursorRequeueComment(
          buildCursorRequeueMarker({ sourceIssue: 1004, generation: 2, reason: 'gen2' }),
        ),
      },
      {
        created_at: '2026-08-27T00:21:00Z',
        author: 'github-actions[bot]',
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 1004,
            generation: 2,
            claimToken: 'tok-1004-g2',
            status: 'activated',
            agentRunId: GEN2_AGENT,
          }),
        ),
      },
      {
        created_at: '2026-08-27T01:00:00Z',
        author: 'github-actions[bot]',
        body: formatCursorCompletionEventComment(
          buildCursorCompletionEvent({
            sourceIssue: 1004,
            cursorAgentId: GEN2_AGENT,
            cursorRunId: GEN2_RUN,
            status: 'COMPLETED',
            prNumber: 1200,
          }),
        ),
      },
      antonRequeueComment(1004, {
        createdAt: '2026-08-27T02:00:00Z',
        extra: 'Generation 2 completed; current-main rebase still required.',
      }),
    ];

    const requeues = parseCursorRequeuesFromComments(comments);
    assert.equal(requeues[0]?.generation, 3);

    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 1004,
      labels: ['dispatch:cursor-ready'],
      comments,
    });
    assert.equal(gate.decision, 'ACQUIRE');
    assert.equal(gate.generation, 3);

    const plan = planCursorIssueClaims({
      readyIssues: [readyIssue(1004, comments, { linkedPrs: [] })],
      claimedIssues: [],
      trackedIssues: [readyIssue(1004, comments, { linkedPrs: [] })],
    });
    assert.equal(plan.activationTargetIssue, 1004);
  });

  it('protected and operator-review holds still block after generation increment', () => {
    const comments = [...gen1CompletedComments(1004), antonRequeueComment(1004)];

    const reviewPlan = planCursorIssueClaims({
      readyIssues: [
        readyIssue(1004, comments, {
          labels: ['priority:P1', 'dispatch:cursor-ready', 'dispatch:operator-review'],
        }),
      ],
      claimedIssues: [],
    });
    assert.equal(reviewPlan.activationTargetIssue, null);
    assert.match(
      String(reviewPlan.decisions[0]?.reason || ''),
      /operator-review/i,
    );

    const protectedPlan = planCursorIssueClaims({
      readyIssues: [
        readyIssue(1004, comments, {
          body: 'Deploy to client_production on the client-owned production target after Anton approval.',
        }),
      ],
      claimedIssues: [],
    });
    assert.equal(protectedPlan.activationTargetIssue, null);
    assert.match(String(protectedPlan.decisions[0]?.reason || ''), /protected gate/i);
  });

  it('scheduled reconcile can select a valid new generation', () => {
    const issue = readyIssue(1005, [...gen1CompletedComments(1005), antonRequeueComment(1005)]);
    const plan = planCursorIssueClaims({
      readyIssues: [issue],
      claimedIssues: [],
      trackedIssues: [issue],
    });
    assert.equal(plan.activationTargetIssue, 1005);
    const decision = resolveFactoryQueueReconcileDecision({
      plan,
      claimedIssues: [],
    });
    assert.equal(decision.should_wake_handoff, 1);
    assert.equal(decision.source_issue, 1005);
  });

  it('authorised CURSOR REQUEUE comments wake Handoff; bots and mentions do not', () => {
    assert.equal(
      shouldWakeOnCursorRequeueComment({
        eventName: 'issue_comment',
        action: 'created',
        issueState: 'open',
        issueNumber: 1004,
        actorLogin: ANTON,
        commentAuthorAssociation: 'OWNER',
        commentBody: 'CURSOR REQUEUE — current-main integration repair required.',
      }),
      true,
    );
    assert.equal(
      shouldWakeOnCursorRequeueComment({
        eventName: 'issue_comment',
        action: 'created',
        issueState: 'open',
        issueNumber: 1004,
        actorLogin: 'github-actions[bot]',
        commentBody: 'CURSOR REQUEUE\n\nIssue: #1004\nGeneration: 2',
      }),
      false,
    );
    assert.equal(
      shouldWakeOnCursorRequeueComment({
        eventName: 'issue_comment',
        action: 'created',
        issueState: 'open',
        issueNumber: 1004,
        actorLogin: ANTON,
        commentAuthorAssociation: 'OWNER',
        commentBody: 'Restore ready after an explicit CURSOR REQUEUE later.',
      }),
      false,
    );

    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'issue_comment',
      action: 'created',
      issueState: 'open',
      issueNumber: 1004,
      actorLogin: ANTON,
      commentAuthorAssociation: 'OWNER',
      commentBody: 'CURSOR REQUEUE — current-main integration repair required.',
      cursorLiveEnabled: 'true',
    });
    assert.equal(plan.shouldRun, true);
    assert.equal(plan.wakeReason, 'cursor_requeue');
    assert.equal(plan.eventIssueNumber, 1004);
    assert.equal(plan.requireExactEventIssue, true);
  });

  it('unauthorized prose CURSOR REQUEUE does not increment generation', () => {
    const comments = [
      ...gen1CompletedComments(1004),
      {
        created_at: '2026-08-27T00:10:00Z',
        author: 'random-contributor',
        author_association: 'NONE',
        body: 'CURSOR REQUEUE please rerun this.',
      },
    ];
    const requeues = parseCursorRequeuesFromComments(comments);
    assert.equal(requeues.length, 0);
    const inspected = inspectIssueWipState(readyIssue(1004, comments));
    assert.equal(inspected.reviewInventory, true);
  });
});
