/**
 * #1023 — Factory whole-queue 10-minute reconciliation fallback.
 *
 * Proves the thin scheduled wrapper reuses existing Handoff / eligibility / WIP
 * rules and does not become a second dispatcher or Cursor wake path.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatDispatchActivatedComment,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { CURSOR_WIP_MAX_SLOTS } from '../lib/server/cursor-wip-control.js';
import {
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';
import {
  FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  formatFactoryHandoffComment,
  hasRecentFactoryHandoff,
} from '../lib/server/factory-cursor-handoff.js';
import {
  FACTORY_QUEUE_RECONCILE_CRON,
  FACTORY_QUEUE_RECONCILE_WAKE_PATH,
  FACTORY_QUEUE_RECONCILE_WAKE_REASON,
  FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME,
  findStaleReadyReviewIssueNumbers,
  resolveFactoryQueueReconcileDecision,
} from '../lib/server/factory-queue-reconcile.js';
import {
  isInheritedScheduledReconcileWake,
  resolveFactoryDispatcherRunPlan,
} from '../lib/server/cursor-ready-event-dispatch.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const RECONCILE_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-queue-reconcile.yml',
);
const HANDOFF_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-cursor-handoff.yml',
);
const LIFECYCLE_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/cursor-agent-lifecycle-status.yml',
);
const CMP_SELF_HEAL_PATH = path.join(REPO_ROOT, '.github/workflows/cmp-stuck-self-heal.yml');
const LEGACY_PATH = path.join(REPO_ROOT, '.github/workflows/factory-dispatcher-activate.yml');

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

function readyIssue(number, extra = {}) {
  return {
    number,
    title: extra.title || `Ready ${number}`,
    body: extra.body || 'docs only ordinary work',
    state: 'open',
    labels: extra.labels || ['dispatch:cursor-ready', 'priority:P0'],
    createdAt: extra.createdAt || '2026-08-12T10:00:00Z',
    updatedAt: extra.updatedAt || '2026-08-12T10:00:00Z',
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
    comments: activatedComments(number, runId),
    updatedAt: '2026-08-21T01:00:00Z',
  };
}

function extractOnBlock(yaml) {
  const match = yaml.match(/^on:\n([\s\S]*?)\n(?=[A-Za-z])/m);
  assert.ok(match, 'workflow must have a top-level on: block');
  return match[1];
}

function onTriggerKeys(onBlock) {
  return [...onBlock.matchAll(/^  ([A-Za-z_]+):/gm)].map((m) => m[1]);
}

describe('factory queue reconcile workflow (#1023)', () => {
  const yaml = readFileSync(RECONCILE_WORKFLOW_PATH, 'utf8');
  const handoffYaml = readFileSync(HANDOFF_WORKFLOW_PATH, 'utf8');
  const lifecycleYaml = readFileSync(LIFECYCLE_WORKFLOW_PATH, 'utf8');
  const cmpHealYaml = readFileSync(CMP_SELF_HEAL_PATH, 'utf8');
  const legacyYaml = readFileSync(LEGACY_PATH, 'utf8');

  it('is a distinct thin wrapper, not a second Handoff / dispatcher / executor', () => {
    assert.match(yaml, /^name:\s*CorpFlowAI Factory Queue Reconcile\s*$/m);
    assert.equal(FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME, 'CorpFlowAI Factory Queue Reconcile');
    assert.notEqual(FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.match(handoffYaml, /^name:\s*CorpFlowAI Cursor Factory Handoff\s*$/m);
    assert.doesNotMatch(yaml, /uses:\s*\.\/\.github\/workflows\/factory-dispatcher-activate\.yml/);
    assert.doesNotMatch(yaml, /CURSOR_FACTORY_WAKE_WEBHOOK/);
    assert.doesNotMatch(yaml, /secrets\.CURSOR_API_KEY/);
    assert.doesNotMatch(yaml, /secrets\.TELEGRAM_/);
    assert.match(yaml, /uses:\s*\.\/\.github\/workflows\/factory-cursor-handoff\.yml/);
    assert.match(yaml, /wake_reason:\s*scheduled_reconciliation/);
    assert.match(yaml, /CORPFLOW_TEMPORAL_PILOT:\s*\$\{\{\s*vars\.CORPFLOW_TEMPORAL_PILOT\s*\}\}/);
    assert.match(handoffYaml, /CORPFLOW_TEMPORAL_PILOT:\s*\$\{\{\s*vars\.CORPFLOW_TEMPORAL_PILOT\s*\}\}/);
    assert.match(yaml, /node scripts\/factory-queue-reconcile\.mjs/);
    assert.match(yaml, /needs\.scan\.outputs\.should_wake_handoff == '1'/);
    assert.match(yaml, /target_issue:\s*\$\{\{\s*needs\.scan\.outputs\.source_issue\s*\}\}/);
  });

  it('Handoff job if accepts inherited schedule event_name from Queue Reconcile (#1041)', () => {
    // GitHub reusable workflows inherit the caller event_name. Scheduled
    // Queue Reconcile therefore enters Handoff as event_name=schedule, not
    // workflow_call. The job if must not require workflow_call exclusively.
    assert.match(handoffYaml, /inputs\.wake_reason == 'scheduled_reconciliation'/);
    assert.match(handoffYaml, /github\.event_name == 'workflow_call'/);
    assert.doesNotMatch(handoffYaml, /^\s*schedule:/m);
    assert.doesNotMatch(extractOnBlock(handoffYaml), /cron:/);
  });

  it('schedules */10 reconciliation without adding schedule to the named Handoff workflow', () => {
    const reconcileTriggers = onTriggerKeys(extractOnBlock(yaml)).sort();
    assert.deepEqual(reconcileTriggers, ['schedule', 'workflow_dispatch'].sort());
    assert.match(extractOnBlock(yaml), /cron:\s*"\*\/10 \* \* \* \*"/);
    assert.equal(FACTORY_QUEUE_RECONCILE_CRON, '*/10 * * * *');
    assert.doesNotMatch(handoffYaml, /^\s*schedule:/m);
    assert.doesNotMatch(handoffYaml, /^\s*cron:/m);
    assert.match(lifecycleYaml, /cron:\s*"\*\/10 \* \* \* \*"/);
    assert.doesNotMatch(extractOnBlock(cmpHealYaml), /^\s*schedule:/m);
    assert.doesNotMatch(extractOnBlock(legacyYaml), /^\s*schedule:/m);
  });
});

describe('factory queue reconcile decisions (#1023)', () => {
  it('eligible ready work + capacity -> one Handoff wake', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [readyIssue(10231)],
      claimedIssues: [],
      trackedIssues: [],
    });
    const decision = resolveFactoryQueueReconcileDecision({ plan, claimedIssues: [] });
    assert.equal(plan.activationTargetIssue, 10231);
    assert.equal(decision.should_wake_handoff, 1);
    assert.equal(decision.source_issue, 10231);
    assert.equal(decision.reason, 'eligible_ready_work');
    assert.equal(decision.wakeReason, FACTORY_QUEUE_RECONCILE_WAKE_REASON);
    assert.equal(decision.wakePath, FACTORY_QUEUE_RECONCILE_WAKE_PATH);
    assert.equal(decision.handoffWorkflowName, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
  });

  it('no ready work -> no wake', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [],
      claimedIssues: [],
      trackedIssues: [],
    });
    const decision = resolveFactoryQueueReconcileDecision({ plan, claimedIssues: [] });
    assert.equal(decision.should_wake_handoff, 0);
    assert.equal(decision.source_issue, null);
    assert.equal(decision.reason, 'no_ready_work');
  });

  it('ready but WIP full -> no duplicate worker', () => {
    const claimed = [
      liveClaimed(101, 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      liveClaimed(102, 'run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
      liveClaimed(103, 'run-cccccccc-cccc-cccc-cccc-cccccccccccc'),
    ];
    const plan = planCursorIssueClaims({
      readyIssues: [readyIssue(10232)],
      claimedIssues: claimed,
      trackedIssues: claimed,
    });
    const decision = resolveFactoryQueueReconcileDecision({ plan, claimedIssues: claimed });
    assert.equal(plan.wipLimits.maxActiveCursorImplementationIssues, CURSOR_WIP_MAX_SLOTS);
    assert.equal(plan.verifiedActiveCount, CURSOR_WIP_MAX_SLOTS);
    assert.equal(plan.availableSlots, 0);
    assert.equal(plan.activationTargetIssue, null);
    assert.equal(decision.should_wake_handoff, 0);
    assert.equal(decision.reason, 'wip_cap_reached');
    assert.equal(decision.source_issue, null);
  });

  it('ready with two live runs still wakes the catch-up slot', () => {
    const claimed = [
      liveClaimed(101, 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      liveClaimed(102, 'run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ];
    const plan = planCursorIssueClaims({
      readyIssues: [readyIssue(10232)],
      claimedIssues: claimed,
      trackedIssues: claimed,
    });
    const decision = resolveFactoryQueueReconcileDecision({ plan, claimedIssues: claimed });
    assert.equal(plan.verifiedActiveCount, 2);
    assert.equal(plan.availableSlots, 1);
    assert.equal(plan.activationTargetIssue, 10232);
    assert.equal(decision.should_wake_handoff, 1);
    assert.equal(decision.source_issue, 10232);
    assert.equal(decision.reason, 'eligible_ready_work');
  });

  it('ready but execution:paused -> no wake', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [
        readyIssue(10233, {
          labels: ['dispatch:cursor-ready', 'execution:paused', 'priority:P0'],
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    const decision = resolveFactoryQueueReconcileDecision({ plan, claimedIssues: [] });
    assert.equal(plan.activationTargetIssue, null);
    assert.equal(decision.should_wake_handoff, 0);
    assert.equal(decision.reason, 'execution_paused');
  });

  it('operator-review / gated work -> no unauthorized continuation', () => {
    const reviewPlan = planCursorIssueClaims({
      readyIssues: [
        readyIssue(10234, {
          labels: ['dispatch:cursor-ready', 'dispatch:operator-review', 'priority:P0'],
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    const reviewDecision = resolveFactoryQueueReconcileDecision({
      plan: reviewPlan,
      claimedIssues: [],
    });
    assert.equal(reviewPlan.activationTargetIssue, null);
    assert.equal(reviewDecision.should_wake_handoff, 0);
    assert.equal(reviewDecision.reason, 'operator_review_gated');

    const gatedPlan = planCursorIssueClaims({
      readyIssues: [
        readyIssue(10235, {
          body: 'Requires protected gate: database. Internal synthetic only.',
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    const gatedDecision = resolveFactoryQueueReconcileDecision({
      plan: gatedPlan,
      claimedIssues: [],
    });
    assert.equal(gatedPlan.activationTargetIssue, null);
    assert.equal(gatedDecision.should_wake_handoff, 0);
    assert.equal(gatedDecision.reason, 'operator_review_gated');
    assert.ok(gatedDecision.gatedCount >= 1);
  });

  it('reconciles stale ready labels only for review inventory, not protected gate holds', () => {
    const plan = {
      decisions: [
        {
          issue: { number: 102341 },
          reason:
            'dispatch:operator-review — prior generation awaits operator review; not eligible for new claim without CURSOR REQUEUE',
        },
        {
          issue: { number: 102342 },
          reason:
            'review-ready linked PR or terminal completion — review inventory, not eligible for new claim without CURSOR REQUEUE',
        },
        {
          issue: { number: 102343 },
          reason: 'protected gate database — classify and wait for Anton unlock before claim/activation',
        },
      ],
    };
    assert.deepEqual(findStaleReadyReviewIssueNumbers(plan), [102341, 102342]);
  });

  it('stale/abandoned claimed state defers to existing lifecycle rules', () => {
    const staleClaimed = {
      number: 10236,
      title: 'Stale claimed',
      body: 'docs',
      state: 'open',
      labels: ['dispatch:cursor-claimed'],
      comments: [],
      updatedAt: '2026-08-19T01:00:00Z',
    };
    const plan = planCursorIssueClaims({
      readyIssues: [],
      claimedIssues: [staleClaimed],
      trackedIssues: [staleClaimed],
    });
    const decision = resolveFactoryQueueReconcileDecision({
      plan,
      claimedIssues: [staleClaimed],
      nowIso: '2026-08-21T01:00:00Z',
    });
    assert.equal(plan.activationTargetIssue, null);
    assert.equal(decision.should_wake_handoff, 0);
    assert.equal(decision.reason, 'stale_claimed_deferred_to_lifecycle');
    assert.equal(decision.staleClaimedCount, 1);
    assert.equal(decision.verifiedActiveCount, 0);
  });

  it('repeated scan is idempotent when a recent Handoff already exists', () => {
    const comments = [
      {
        body: formatFactoryHandoffComment({
          sourceIssue: 10237,
          wakeReason: 'scheduled_reconciliation',
        }),
        created_at: '2026-08-21T01:05:00Z',
      },
    ];
    const issue = readyIssue(10237, { comments });
    const plan = planCursorIssueClaims({
      readyIssues: [issue],
      claimedIssues: [],
      trackedIssues: [],
    });
    assert.equal(
      hasRecentFactoryHandoff(comments, 10237, { nowMs: Date.parse('2026-08-21T01:12:00Z') }),
      true,
    );
    const first = resolveFactoryQueueReconcileDecision({
      plan,
      claimedIssues: [],
      recentHandoff: true,
    });
    const second = resolveFactoryQueueReconcileDecision({
      plan,
      claimedIssues: [],
      recentHandoff: true,
    });
    assert.equal(first.should_wake_handoff, 0);
    assert.equal(first.reason, 'duplicate_handoff_suppressed');
    assert.deepEqual(first.reason, second.reason);
    assert.equal(second.should_wake_handoff, 0);
  });

  it('does not retry a handoff that the bounded receipt check has made terminal', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [readyIssue(10238)],
      claimedIssues: [],
      trackedIssues: [],
    });
    const decision = resolveFactoryQueueReconcileDecision({
      plan: {
        ...plan,
        activationTargetIssue: null,
        claimIssueNumbers: [],
        eligibleIssueNumbers: [],
      },
      claimedIssues: [],
    });
    assert.equal(decision.should_wake_handoff, 0);
    assert.equal(decision.reason, 'no_ready_work');
  });

  it('workflow_call scheduled_reconciliation is a full-priority Handoff scan', () => {
    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'workflow_call',
      wakeReasonInput: 'scheduled_reconciliation',
      capacityWakeRequested: 'false',
    });
    assert.equal(plan.shouldRun, true);
    assert.equal(plan.mode, 'cursor_live');
    assert.equal(plan.path, 'schedule_fallback');
    assert.equal(plan.wakeReason, 'scheduled_reconciliation');
    assert.equal(plan.requireExactEventIssue, false);
    assert.deepEqual(plan.preferIssueNumbers, []);
  });

  it('inherited schedule event_name still publishes scheduled_reconciliation (#1041 / #1037)', () => {
    // Live evidence: run 32555465184 scanned #1037 as eligible_ready_work
    // (should_wake_handoff=1) then skipped the inner Handoff job because
    // github.event_name was schedule, not workflow_call.
    assert.equal(isInheritedScheduledReconcileWake('scheduled_reconciliation', 'schedule'), true);
    assert.equal(isInheritedScheduledReconcileWake('scheduled_reconciliation', 'workflow_dispatch'), true);
    assert.equal(isInheritedScheduledReconcileWake('scheduled_reconciliation', 'workflow_call'), true);
    assert.equal(isInheritedScheduledReconcileWake('scheduled_reconciliation', 'issues'), false);
    assert.equal(isInheritedScheduledReconcileWake('', 'schedule'), false);

    const inherited = resolveFactoryDispatcherRunPlan({
      eventName: 'schedule',
      wakeReasonInput: 'scheduled_reconciliation',
      capacityWakeRequested: 'false',
      targetIssueInput: '1037',
    });
    assert.equal(inherited.shouldRun, true);
    assert.equal(inherited.mode, 'cursor_live');
    assert.equal(inherited.path, 'schedule_fallback');
    assert.equal(inherited.wakeReason, 'scheduled_reconciliation');
    assert.equal(inherited.requireExactEventIssue, false);
    assert.deepEqual(inherited.preferIssueNumbers, [1037]);

    const manualReconcile = resolveFactoryDispatcherRunPlan({
      eventName: 'workflow_dispatch',
      wakeReasonInput: 'scheduled_reconciliation',
      targetIssueInput: '1037',
    });
    assert.equal(manualReconcile.shouldRun, true);
    assert.equal(manualReconcile.wakeReason, 'scheduled_reconciliation');
    assert.deepEqual(manualReconcile.preferIssueNumbers, [1037]);
  });
});
