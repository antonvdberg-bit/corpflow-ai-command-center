/**
 * Factory pilot 4 (#1035) — isolated repo-only proof that the 10-minute
 * CorpFlowAI Factory Queue Reconcile fallback is the intended selecting
 * wake after operator-review is removed, and that this run's actual
 * selecting wake was the event-driven Handoff path instead.
 *
 * Always-green; no app/runtime change.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { planCursorIssueClaims } from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { resolveFactoryDispatcherRunPlan } from '../lib/server/cursor-ready-event-dispatch.js';
import {
  FACTORY_QUEUE_RECONCILE_WAKE_PATH,
  FACTORY_QUEUE_RECONCILE_WAKE_REASON,
  FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME,
  resolveFactoryQueueReconcileDecision,
} from '../lib/server/factory-queue-reconcile.js';
import { FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME } from '../lib/server/factory-cursor-handoff.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const FIXTURE_REL = 'node-tests/factory-pilot-4.status.json';
const FIXTURE_PATH = path.join(REPO_ROOT, FIXTURE_REL);
const EVIDENCE_REL = 'docs/operations/FACTORY_PILOT_4_SCHEDULED_RECONCILIATION_PROOF.md';
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
    number: 1035,
    title: 'Factory pilot 4: prove scheduled reconciliation is the selecting wake path',
    body: extra.body || 'synthetic repo-only factory proof, docs and tests only',
    state: 'open',
    labels: extra.labels || ['dispatch:cursor-ready', 'priority:P0'],
    comments: extra.comments || [],
    createdAt: extra.createdAt || '2026-08-21T12:51:55Z',
    updatedAt: extra.updatedAt || '2026-08-21T12:51:55Z',
  };
}

describe('Factory pilot 4 scheduled reconciliation selecting-wake proof (#1035)', () => {
  it('keeps an isolated repo-only proof fixture named for factory pilot 4', () => {
    assert.equal(existsSync(FIXTURE_PATH), true, `${FIXTURE_REL} must exist`);
    assert.equal(existsSync(path.join(REPO_ROOT, EVIDENCE_REL)), true, `${EVIDENCE_REL} must exist`);

    const fixture = readPilotFixture();
    assert.equal(fixture.schema, 'corpflow.factory_pilot_4.v1');
    assert.equal(fixture.pilot, 'factory-pilot-4');
    assert.equal(fixture.sourceIssue, 1035);
    assert.equal(fixture.controllerIssue, 1023);
    assert.equal(fixture.environment, 'n/a');
    assert.equal(fixture.protectedAction, false);
    assert.equal(fixture.stopAtOperatorReview, true);

    const testRel = path.relative(REPO_ROOT, __filename).replaceAll('\\', '/');
    assert.equal(testRel, 'node-tests/factory-pilot-4-scheduled-reconciliation.test.mjs');
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
    assert.equal(fixture.operatorReviewUnlabeledRunId, '32483949978');
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
    const gatedDecision = gatedPlan.decisions.find((d) => d.issue.number === 1035);
    assert.equal(gatedDecision?.eligibleToClaim, false);
    assert.match(String(gatedDecision?.reason || ''), /operator-review/);

    const gatedReconcile = resolveFactoryQueueReconcileDecision({
      plan: gatedPlan,
      claimedIssues: [],
      recentHandoff: false,
    });
    assert.equal(gatedReconcile.should_wake_handoff, 0);
    assert.equal(gatedReconcile.source_issue, null);
  });

  it('would select via scheduled_reconciliation after operator-review is removed', () => {
    const fixture = readPilotFixture();
    assert.equal(FACTORY_QUEUE_RECONCILE_WAKE_REASON, 'scheduled_reconciliation');
    assert.equal(FACTORY_QUEUE_RECONCILE_WAKE_PATH, 'schedule_fallback');
    assert.equal(FACTORY_QUEUE_RECONCILE_WORKFLOW_NAME, 'CorpFlowAI Factory Queue Reconcile');
    assert.equal(fixture.scheduledReconcileWakeReasonExpected, 'scheduled_reconciliation');
    assert.equal(fixture.scheduledReconcileWakePathExpected, 'schedule_fallback');

    const scheduled = resolveFactoryDispatcherRunPlan({
      eventName: 'workflow_call',
      wakeReasonInput: 'scheduled_reconciliation',
    });
    assert.equal(scheduled.shouldRun, true);
    assert.equal(scheduled.wakeReason, 'scheduled_reconciliation');
    assert.equal(scheduled.path, 'schedule_fallback');
    assert.equal(scheduled.requireExactEventIssue, false);

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
    assert.equal(eligiblePlan.activationTargetIssue, 1035);
    assert.deepEqual(eligiblePlan.eligibleIssueNumbers, [1035]);
    assert.deepEqual(eligiblePlan.claimIssueNumbers, [1035]);

    const decision = resolveFactoryQueueReconcileDecision({
      plan: eligiblePlan,
      claimedIssues: [],
      recentHandoff: false,
    });
    assert.equal(decision.shouldWakeHandoff, true);
    assert.equal(decision.should_wake_handoff, 1);
    assert.equal(decision.source_issue, 1035);
    assert.equal(decision.reason, 'eligible_ready_work');
    assert.equal(decision.wakeReason, 'scheduled_reconciliation');
    assert.equal(decision.wakePath, 'schedule_fallback');
    assert.equal(decision.handoffWorkflowName, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);

    const reconcileYaml = readFileSync(RECONCILE_WORKFLOW_PATH, 'utf8');
    assert.match(reconcileYaml, /wake_reason:\s*scheduled_reconciliation/);
    assert.match(reconcileYaml, /cron:\s*"\*\/10 \* \* \* \*"/);
  });

  it('records that the actual selecting wake was priority_changed, not scheduled_reconciliation', () => {
    const fixture = readPilotFixture();
    assert.equal(fixture.selectingHandoffWorkflow, FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME);
    assert.equal(fixture.selectingHandoffEvent, 'issues');
    assert.equal(fixture.selectingWakeReason, 'priority_changed');
    assert.equal(fixture.selectingWakePath, 'event_priority_ready');
    assert.equal(fixture.selectingHandoffRunId, '32483944130');
    assert.equal(fixture.scheduledReconcileSelectedThisIssue, false);
    assert.equal(fixture.lastScheduledReconcileRunIdBeforeIssue, '32479630886');
    assert.equal(fixture.lastScheduledReconcileRunAt, '2026-08-21T11:58:03Z');
    assert.match(
      fixture.verdict,
      /^SCHEDULED RECONCILIATION BLOCKED — selecting wake was issues\/priority_changed \(event_priority_ready\) on Handoff run 32483944130, not workflow_call scheduled_reconciliation$/,
    );

    const actual = resolveFactoryDispatcherRunPlan({
      eventName: 'issues',
      action: 'labeled',
      labelName: 'priority:P0',
      issueNumber: 1035,
      issueState: 'open',
      issueLabelNames: ['priority:P0', 'dispatch:cursor-ready', 'dispatch:operator-review'],
    });
    assert.equal(actual.shouldRun, true);
    assert.equal(actual.wakeReason, 'priority_changed');
    assert.equal(actual.path, 'event_priority_ready');
    assert.notEqual(actual.wakeReason, 'scheduled_reconciliation');
  });

  it('keeps durable evidence of the scheduled-reconciliation blocker', () => {
    const evidence = readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), 'utf8');
    assert.match(evidence, /#1035/);
    assert.match(evidence, /#1023/);
    assert.match(evidence, /32483944130/);
    assert.match(evidence, /32483949978/);
    assert.match(evidence, /32479630886/);
    assert.match(evidence, /priority_changed/);
    assert.match(evidence, /event_priority_ready/);
    assert.match(evidence, /scheduled_reconciliation/);
    assert.match(evidence, /dispatch:operator-review/);
    assert.match(evidence, /bc-40323463-2402-4ed8-ba7e-e14ff19a1b52/);
    assert.match(
      evidence,
      /SCHEDULED RECONCILIATION BLOCKED — selecting wake was issues\/priority_changed \(event_priority_ready\) on Handoff run 32483944130, not workflow_call scheduled_reconciliation/,
    );
  });
});
