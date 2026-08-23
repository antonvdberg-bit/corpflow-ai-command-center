/**
 * Factory pilot 5 (#1037) — isolated repo-only proof that the 10-minute
 * CorpFlowAI Factory Queue Reconcile fallback was the selecting wake after
 * creation-time event Handoff runs drained while operator-review still held.
 *
 * Always-green; no app/runtime change.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { planCursorIssueClaims } from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  isInheritedScheduledReconcileWake,
  resolveFactoryDispatcherRunPlan,
} from '../lib/server/cursor-ready-event-dispatch.js';
import {
  FACTORY_QUEUE_RECONCILE_WAKE_PATH,
  FACTORY_QUEUE_RECONCILE_WAKE_REASON,
  FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME,
  resolveFactoryQueueReconcileDecision,
} from '../lib/server/factory-queue-reconcile.js';
import { FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME } from '../lib/server/factory-cursor-handoff.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const FIXTURE_REL = 'node-tests/factory-pilot-5.status.json';
const FIXTURE_PATH = path.join(REPO_ROOT, FIXTURE_REL);
const EVIDENCE_REL = 'docs/operations/FACTORY_PILOT_5_SCHEDULED_RECONCILIATION_PROOF.md';
const HANDOFF_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-cursor-handoff.yml',
);
const RECONCILE_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-queue-reconcile.yml',
);

function readPilotFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
}

function syntheticPilotIssue(extra = {}) {
  return {
    number: 1037,
    title: 'Factory pilot 5: clean scheduled reconciliation proof after trigger drain',
    body: extra.body || 'synthetic repo-only factory proof, docs and tests only',
    state: 'open',
    labels: extra.labels || ['dispatch:cursor-ready', 'priority:P0'],
    comments: extra.comments || [],
    createdAt: extra.createdAt || '2026-08-22T01:46:51Z',
    updatedAt: extra.updatedAt || '2026-08-22T01:46:51Z',
  };
}

describe('Factory pilot 5 scheduled reconciliation selecting-wake proof (#1037)', () => {
  it('keeps an isolated repo-only proof fixture named for factory pilot 5', () => {
    assert.equal(existsSync(FIXTURE_PATH), true, `${FIXTURE_REL} must exist`);
    assert.equal(existsSync(path.join(REPO_ROOT, EVIDENCE_REL)), true, `${EVIDENCE_REL} must exist`);

    const fixture = readPilotFixture();
    assert.equal(fixture.schema, 'corpflow.factory_pilot_5.v1');
    assert.equal(fixture.pilot, 'factory-pilot-5');
    assert.equal(fixture.sourceIssue, 1037);
    assert.equal(fixture.controllerIssue, 1023);
    assert.equal(fixture.repairIssue, 1041);
    assert.equal(fixture.repairPullRequest, 1042);
    assert.equal(fixture.environment, 'n/a');
    assert.equal(fixture.protectedAction, false);
    assert.equal(fixture.stopAtOperatorReview, true);

    const testRel = path.relative(REPO_ROOT, __filename).replaceAll('\\', '/');
    assert.equal(testRel, 'node-tests/factory-pilot-5-scheduled-reconciliation.test.mjs');
  });

  it('does not wake Handoff on unlabeled dispatch:operator-review', () => {
    const fixture = readPilotFixture();
    const unlabeled = resolveFactoryDispatcherRunPlan({
      eventName: 'issues',
      action: 'unlabeled',
      labelName: 'dispatch:operator-review',
      issueNumber: fixture.sourceIssue,
      issueState: 'open',
      issueLabelNames: ['dispatch:cursor-ready', 'priority:P0'],
    });
    assert.equal(unlabeled.shouldRun, false);
    assert.equal(unlabeled.path, 'event_label_ignored');
    assert.equal(unlabeled.ignoreReason, 'lifecycle_label_non_wake');

    const yaml = readFileSync(HANDOFF_WORKFLOW_PATH, 'utf8');
    assert.match(yaml, /unlabeled.*\n.*execution:paused/s);
    assert.doesNotMatch(
      yaml,
      /unlabeled.*dispatch:operator-review|dispatch:operator-review.*unlabeled/,
    );
    assert.equal(fixture.operatorReviewUnlabeledRunId, '32544641984');
    assert.equal(fixture.operatorReviewUnlabeledRunConclusion, 'skipped');
  });

  it('keeps the issue ineligible while dispatch:operator-review is present', () => {
    const fixture = readPilotFixture();
    assert.deepEqual(fixture.initialLabels, [
      'priority:P0',
      'dispatch:cursor-ready',
      'dispatch:operator-review',
    ]);

    const gatedPlan = planCursorIssueClaims({
      readyIssues: [
        syntheticPilotIssue({
          labels: fixture.initialLabels,
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    assert.equal(gatedPlan.activationTargetIssue, null);
    assert.deepEqual(gatedPlan.eligibleIssueNumbers, []);
    const gatedDecision = gatedPlan.decisions.find((d) => d.issue.number === 1037);
    assert.equal(gatedDecision?.eligibleToClaim, false);
    assert.match(String(gatedDecision?.reason || ''), /operator-review/);

    const gatedReconcile = resolveFactoryQueueReconcileDecision({
      plan: gatedPlan,
      claimedIssues: [],
      recentHandoff: false,
    });
    assert.equal(gatedReconcile.should_wake_handoff, 0);
    assert.equal(gatedReconcile.source_issue, null);

    const creationEvent = resolveFactoryDispatcherRunPlan({
      eventName: 'issues',
      action: 'labeled',
      labelName: 'priority:P0',
      issueNumber: 1037,
      issueState: 'open',
      issueLabelNames: fixture.initialLabels,
    });
    assert.equal(creationEvent.shouldRun, true);
    assert.equal(creationEvent.wakeReason, 'priority_changed');
    assert.equal(creationEvent.path, 'event_priority_ready');
    assert.equal(fixture.creationHandoffRunId, '32544413585');
    assert.equal(fixture.creationHandoffConclusion, 'failure');
    assert.equal(fixture.creationHandoffReason, 'no_eligible_source_issue');
    assert.equal(fixture.creationHandoffSourceIssue, null);
    assert.equal(fixture.creationHandoffCommentPosted, false);
  });

  it('selects via inherited schedule + scheduled_reconciliation after operator-review is removed', () => {
    const fixture = readPilotFixture();
    assert.equal(FACTORY_QUEUE_RECONCILE_WAKE_REASON, 'scheduled_reconciliation');
    assert.equal(FACTORY_QUEUE_RECONCILE_WAKE_PATH, 'schedule_fallback');
    assert.equal(FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME, 'CorpFlowAI Factory Queue Reconcile');
    assert.equal(fixture.scheduledReconcileWakeReasonExpected, 'scheduled_reconciliation');
    assert.equal(fixture.scheduledReconcileWakePathExpected, 'schedule_fallback');
    assert.equal(
      isInheritedScheduledReconcileWake('scheduled_reconciliation', 'schedule'),
      true,
    );

    const scheduled = resolveFactoryDispatcherRunPlan({
      eventName: 'schedule',
      wakeReasonInput: 'scheduled_reconciliation',
      targetIssueInput: '1037',
    });
    assert.equal(scheduled.shouldRun, true);
    assert.equal(scheduled.wakeReason, 'scheduled_reconciliation');
    assert.equal(scheduled.path, 'schedule_fallback');
    assert.equal(scheduled.requireExactEventIssue, false);
    assert.deepEqual(scheduled.preferIssueNumbers, [1037]);

    const eligiblePlan = planCursorIssueClaims({
      readyIssues: [
        syntheticPilotIssue({
          labels: ['dispatch:cursor-ready', 'priority:P0'],
          updatedAt: fixture.operatorReviewUnlabeledAt,
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    assert.equal(eligiblePlan.activationTargetIssue, 1037);
    assert.deepEqual(eligiblePlan.eligibleIssueNumbers, [1037]);
    assert.deepEqual(eligiblePlan.claimIssueNumbers, [1037]);

    const decision = resolveFactoryQueueReconcileDecision({
      plan: eligiblePlan,
      claimedIssues: [],
      recentHandoff: false,
    });
    assert.equal(decision.shouldWakeHandoff, true);
    assert.equal(decision.should_wake_handoff, 1);
    assert.equal(decision.source_issue, 1037);
    assert.equal(decision.reason, 'eligible_ready_work');
    assert.equal(decision.wakeReason, 'scheduled_reconciliation');
    assert.equal(decision.wakePath, 'schedule_fallback');
    assert.equal(decision.handoffWorkflowName, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);

    const reconcileYaml = readFileSync(RECONCILE_WORKFLOW_PATH, 'utf8');
    assert.match(reconcileYaml, /wake_reason:\s*scheduled_reconciliation/);
    assert.match(reconcileYaml, /cron:\s*"\*\/10 \* \* \* \*"/);
    assert.match(reconcileYaml, /target_issue:\s*\$\{\{\s*needs\.scan\.outputs\.source_issue\s*\}\}/);

    const handoffYaml = readFileSync(HANDOFF_WORKFLOW_PATH, 'utf8');
    assert.match(handoffYaml, /inputs\.wake_reason == 'scheduled_reconciliation'/);
    assert.doesNotMatch(handoffYaml, /^  schedule:/m);
  });

  it('records that the actual selecting wake was scheduled_reconciliation', () => {
    const fixture = readPilotFixture();
    assert.equal(fixture.selectingWrapperWorkflow, FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME);
    assert.equal(fixture.selectingWrapperEvent, 'schedule');
    assert.equal(fixture.selectingHandoffWorkflow, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.equal(fixture.selectingHandoffEvent, 'schedule');
    assert.equal(fixture.selectingWakeReason, 'scheduled_reconciliation');
    assert.equal(fixture.selectingWakePath, 'schedule_fallback');
    assert.equal(fixture.selectingHandoffRunId, '32609642234');
    assert.equal(fixture.selectingHandoffSourceIssue, 1037);
    assert.equal(fixture.selectingHandoffCommentId, '5383518667');
    assert.equal(fixture.scheduledReconcileSelectedThisIssue, true);
    assert.equal(fixture.verdict, 'SCHEDULED RECONCILIATION PROVEN');
  });

  it('keeps durable evidence of the scheduled-reconciliation proof', () => {
    const evidence = readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), 'utf8');
    assert.match(evidence, /#1037/);
    assert.match(evidence, /#1023/);
    assert.match(evidence, /#1041/);
    assert.match(evidence, /#1042/);
    assert.match(evidence, /32544413585/);
    assert.match(evidence, /32544641984/);
    assert.match(evidence, /32609642234/);
    assert.match(evidence, /5383518667/);
    assert.match(evidence, /scheduled_reconciliation/);
    assert.match(evidence, /schedule_fallback/);
    assert.match(evidence, /dispatch:operator-review/);
    assert.match(evidence, /bc-56159618-9766-4e61-a58c-f793f207a523/);
    assert.match(evidence, /SCHEDULED RECONCILIATION PROVEN/);
    assert.doesNotMatch(evidence, /SCHEDULED RECONCILIATION BLOCKED/);
  });
});
