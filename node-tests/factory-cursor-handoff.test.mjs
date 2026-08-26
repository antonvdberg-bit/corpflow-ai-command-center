/**
 * #913 — CorpFlowAI Cursor Factory Handoff: trigger/eligibility + duplicate suppression.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FACTORY_CURSOR_HANDOFF_MARKER,
  FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  buildFactoryHandoffPacket,
  formatFactoryHandoffComment,
  hasRecentFactoryHandoff,
  parseFactoryHandoffSourceIssue,
  resolveFactoryHandoffDecision,
} from '../lib/server/factory-cursor-handoff.js';
import {
  formatDispatchActivatedComment,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/factory-cursor-handoff.yml');
const PROOF_C_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-proof-c-bot-comment.yml',
);
const PROOF_C_TEST_PATH = path.join(
  REPO_ROOT,
  'node-tests/factory-proof-c-bot-comment.test.mjs',
);

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
      created_at: '2026-08-12T20:00:00Z',
    },
    {
      body: formatDispatchActivatedComment({
        issueNumber,
        agentRunId: runId,
      }),
      created_at: '2026-08-12T20:00:01Z',
    },
  ];
}

describe('factory cursor handoff workflow (#913)', () => {
  const yaml = readFileSync(WORKFLOW_PATH, 'utf8');

  it('uses the exact displayed workflow name required by Cursor Automation MODE B', () => {
    assert.match(yaml, /^name:\s*CorpFlowAI Cursor Factory Handoff\s*$/m);
    assert.equal(FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME, 'CorpFlowAI Cursor Factory Handoff');
  });

  it('wakes on eligibility/capacity events and does not use schedule as primary path', () => {
    assert.match(yaml, /workflow_call:/);
    assert.match(yaml, /workflow_dispatch:/);
    assert.match(yaml, /issues:\s*\n\s*types:\s*\[labeled,\s*unlabeled\]/);
    assert.match(yaml, /issue_comment:/);
    assert.match(yaml, /dispatch:cursor-ready/);
    assert.match(yaml, /execution:paused/);
    assert.doesNotMatch(yaml, /^\s*schedule:/m);
    assert.doesNotMatch(yaml, /cron:/);
    // #1041: inherited schedule event_name from Queue Reconcile must still run.
    assert.match(yaml, /inputs\.wake_reason == 'scheduled_reconciliation'/);
  });

  it('keeps the Cloud Agents executor cutover-gated and runs the handoff selector', () => {
    assert.match(yaml, /vars\.CURSOR_FACTORY_EXECUTOR == 'cloud_agents_v1'/);
    assert.match(yaml, /CURSOR_API_KEY: \$\{\{ secrets\.CURSOR_API_KEY \}\}/);
    assert.match(yaml, /node scripts\/factory-cloud-agents-executor\.mjs/);
    assert.match(yaml, /Validate sole executor selection/);
    assert.match(yaml, /node scripts\/factory-cursor-handoff\.mjs/);
    assert.match(yaml, /Wake Cursor Factory v2 webhook/);
    assert.match(yaml, /Publish successful handoff and pending Cursor receipt/);
    assert.match(yaml, /node scripts\/factory-cursor-handoff-publish\.mjs/);
    assert.match(yaml, /permissions:\s*\n\s*contents:\s*read\s*\n\s*issues:\s*write/);
  });

  it('removes the temporary Proof C bot-comment workflow and its proof-only test', () => {
    assert.equal(existsSync(PROOF_C_PATH), false);
    assert.equal(existsSync(PROOF_C_TEST_PATH), false);
  });
});

describe('factory cursor handoff decision logic (#913)', () => {
  it('encodes exactly one selected source issue in the durable packet/comment', () => {
    const comment = formatFactoryHandoffComment({
      sourceIssue: 913,
      wakeReason: 'ready_labeled',
      wakePath: 'event_label_ready',
      availableSlots: 1,
      verifiedActiveCount: 1,
      workflowRunUrl: 'https://github.com/example/actions/runs/1',
    });
    assert.match(comment, new RegExp(FACTORY_CURSOR_HANDOFF_MARKER));
    assert.match(comment, /Selected source issue: #913/);
    assert.equal(parseFactoryHandoffSourceIssue(comment), 913);

    const packet = buildFactoryHandoffPacket({
      shouldSucceed: true,
      sourceIssue: 913,
      reason: 'eligible_handoff',
      availableSlots: 1,
    });
    assert.equal(packet.has_handoff, 1);
    assert.equal(packet.source_issue, 913);
    assert.equal(packet.shouldSucceed, true);
  });

  it('fails closed when there is no eligible source issue (no Automation wake)', () => {
    const decision = resolveFactoryHandoffDecision({
      wakeShouldRun: true,
      wakeReason: 'ready_labeled',
      wakePath: 'event_label_ready',
      activate: false,
      targetIssue: '',
      holdReason: 'scan_selected_none',
      availableSlots: 2,
      verifiedActiveCount: 0,
      eligibleIssueNumbers: [],
    });
    assert.equal(decision.shouldSucceed, false);
    assert.equal(decision.has_handoff, 0);
    assert.equal(decision.source_issue, null);
    assert.equal(decision.reason, 'no_eligible_source_issue');
  });

  it('suppresses duplicate handoff success for the same issue inside the dedupe window', () => {
    const nowMs = Date.parse('2026-08-12T23:30:00Z');
    const comments = [
      {
        body: formatFactoryHandoffComment({
          sourceIssue: 9201,
          wakeReason: 'ready_labeled',
        }),
        created_at: '2026-08-12T23:10:00Z',
      },
    ];
    assert.equal(hasRecentFactoryHandoff(comments, 9201, { nowMs }), true);

    const decision = resolveFactoryHandoffDecision({
      wakeShouldRun: true,
      wakeReason: 'ready_labeled',
      activate: true,
      targetIssue: 9201,
      availableSlots: 1,
      verifiedActiveCount: 1,
      recentHandoff: true,
    });
    assert.equal(decision.shouldSucceed, false);
    assert.equal(decision.reason, 'duplicate_handoff_suppressed');
    assert.equal(decision.source_issue, null);
  });

  it('does not select paused or operator-review work; respects verified WIP cap = 3', () => {
    const paused = planCursorIssueClaims({
      readyIssues: [
        {
          number: 9301,
          title: 'Paused ready',
          body: 'docs only ordinary work',
          state: 'open',
          labels: ['dispatch:cursor-ready', 'execution:paused', 'priority:P0'],
          comments: [],
        },
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    assert.equal(paused.activationTargetIssue, null);

    const operatorReviewReady = planCursorIssueClaims({
      readyIssues: [
        {
          number: 9302,
          title: 'Operator review',
          body: 'docs only ordinary work',
          state: 'open',
          labels: ['dispatch:cursor-ready', 'dispatch:operator-review', 'priority:P0'],
          comments: [],
        },
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    assert.equal(operatorReviewReady.activationTargetIssue, null);
    assert.equal(
      operatorReviewReady.decisions[0]?.eligibleToClaim,
      false,
    );

    const fullWip = planCursorIssueClaims({
      readyIssues: [
        {
          number: 9303,
          title: 'Waiting behind WIP',
          body: 'docs only ordinary work',
          state: 'open',
          labels: ['dispatch:cursor-ready', 'priority:P0'],
          createdAt: '2026-08-12T10:00:00Z',
          comments: [],
        },
      ],
      claimedIssues: [
        {
          number: 101,
          title: 'Live A',
          body: 'docs',
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: activatedComments(101, 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
        },
        {
          number: 102,
          title: 'Live B',
          body: 'docs',
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: activatedComments(102, 'run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
        },
        {
          number: 103,
          title: 'Live C',
          body: 'docs',
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: activatedComments(103, 'run-cccccccc-cccc-cccc-cccc-cccccccccccc'),
        },
      ],
      trackedIssues: [
        {
          number: 101,
          title: 'Live A',
          body: 'docs',
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: activatedComments(101, 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
        },
        {
          number: 102,
          title: 'Live B',
          body: 'docs',
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: activatedComments(102, 'run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
        },
        {
          number: 103,
          title: 'Live C',
          body: 'docs',
          state: 'open',
          labels: ['dispatch:cursor-claimed', 'status:in-progress'],
          comments: activatedComments(103, 'run-cccccccc-cccc-cccc-cccc-cccccccccccc'),
        },
      ],
    });
    assert.equal(fullWip.availableSlots, 0);
    assert.equal(fullWip.activationTargetIssue, null);

    const wipDecision = resolveFactoryHandoffDecision({
      wakeShouldRun: true,
      activate: true,
      targetIssue: 9303,
      availableSlots: 0,
      verifiedActiveCount: 2,
      recentHandoff: false,
    });
    assert.equal(wipDecision.shouldSucceed, false);
    assert.equal(wipDecision.reason, 'wip_cap_reached');
  });

  it('publishes handoff when wake + scan select one eligible issue with capacity', () => {
    const decision = resolveFactoryHandoffDecision({
      wakeShouldRun: true,
      wakeReason: 'capacity_released',
      wakePath: 'capacity_backfill_scan',
      activate: true,
      targetIssue: 9400,
      availableSlots: 1,
      verifiedActiveCount: 1,
      eligibleIssueNumbers: [9400],
      recentHandoff: false,
    });
    assert.equal(decision.shouldSucceed, true);
    assert.equal(decision.has_handoff, 1);
    assert.equal(decision.source_issue, 9400);
    assert.equal(decision.reason, 'eligible_handoff');
  });
});
