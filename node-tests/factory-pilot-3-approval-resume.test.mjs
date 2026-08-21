/**
 * Factory pilot 3/3 (#1028) — isolated repo-only proof that work stays
 * non-selected behind a durable operator-approval gate, resumes after the
 * exact approval marker, and that a synthetic stale/orphan claim does not
 * hold genuine Cursor WIP. Always-green; no app/runtime change.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_STALE_CLAIM_HOURS,
  isClaimStale,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { resolveFactoryDispatcherRunPlan } from '../lib/server/cursor-ready-event-dispatch.js';
import { resolveFactoryQueueReconcileDecision } from '../lib/server/factory-queue-reconcile.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const FIXTURE_REL = 'node-tests/factory-pilot-3.status.json';
const FIXTURE_PATH = path.join(REPO_ROOT, FIXTURE_REL);
const EVIDENCE_REL = 'docs/operations/FACTORY_PILOT_3_APPROVAL_RESUME_PROOF.md';

function readPilotFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
}

function syntheticPilotIssue(extra = {}) {
  return {
    number: 1028,
    title: 'Factory pilot 3/3: durable approval stop/resume + stale-state recovery proof',
    body: extra.body || 'synthetic repo-only factory proof, docs and tests only',
    state: 'open',
    labels: extra.labels || ['dispatch:cursor-ready', 'priority:P0'],
    comments: extra.comments || [],
    createdAt: extra.createdAt || '2026-08-21T02:14:20Z',
    updatedAt: extra.updatedAt || '2026-08-21T02:14:20Z',
  };
}

function syntheticOrphanClaim(number, updatedAt) {
  return {
    number,
    title: `Synthetic orphan claim ${number} (not a real worker)`,
    body: 'docs only ordinary work — synthetic stale claim for factory pilot 3',
    state: 'open',
    labels: ['dispatch:cursor-claimed'],
    comments: [],
    updatedAt,
  };
}

describe('Factory pilot 3/3 durable approval stop/resume + stale recovery (#1028)', () => {
  it('keeps an isolated repo-only proof fixture named for factory pilot 3', () => {
    assert.equal(existsSync(FIXTURE_PATH), true, `${FIXTURE_REL} must exist`);
    assert.equal(existsSync(path.join(REPO_ROOT, EVIDENCE_REL)), true, `${EVIDENCE_REL} must exist`);

    const fixture = readPilotFixture();
    assert.equal(fixture.schema, 'corpflow.factory_pilot_3.v1');
    assert.equal(fixture.pilot, 'factory-pilot-3');
    assert.equal(fixture.sourceIssue, 1028);
    assert.equal(fixture.controllerIssue, 1023);
    assert.equal(fixture.protectedAction, false);
    assert.equal(fixture.stopAtOperatorReview, true);

    const testRel = path.relative(REPO_ROOT, __filename).replaceAll('\\', '/');
    assert.equal(testRel, 'node-tests/factory-pilot-3-approval-resume.test.mjs');
  });

  it('records the pre-approval blocked/non-selection state', () => {
    const fixture = readPilotFixture();
    assert.equal(fixture.preApprovalBlocked, true);
    assert.deepEqual(fixture.preApprovalLabels, [
      'execution:paused',
      'dispatch:operator-review',
      'dispatch:cursor-ready',
      'priority:P0',
    ]);
    assert.equal(fixture.preApprovalNonSelectionEvidence.pausedSiblingRecordedAs, 1028);
    assert.equal(fixture.preApprovalNonSelectionEvidence.pilot2HandoffRunId, '32465439603');
    assert.equal(fixture.preApprovalNonSelectionEvidence.initialLabeledAt, '2026-08-21T02:14:20Z');

    const pausedPlan = planCursorIssueClaims({
      readyIssues: [
        syntheticPilotIssue({
          labels: fixture.preApprovalLabels,
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    assert.equal(pausedPlan.activationTargetIssue, null);
    assert.deepEqual(pausedPlan.eligibleIssueNumbers, []);
    const pausedDecision = pausedPlan.decisions.find((d) => d.issue.number === 1028);
    assert.equal(pausedDecision?.eligibleToClaim, false);
    assert.match(String(pausedDecision?.reason || ''), /execution:paused/);
  });

  it('resumes only after the exact durable approval marker and unpause', () => {
    const fixture = readPilotFixture();
    assert.equal(fixture.durableApprovalMarker, 'APPROVAL: PILOT 3');
    assert.equal(fixture.durableApprovalAuthor, 'antonvdberg-bit');
    assert.equal(fixture.durableApprovalCommentAt, '2026-08-21T12:06:44Z');
    assert.equal(fixture.executionPausedUnlabeledAt, '2026-08-21T12:06:50Z');
    assert.equal(fixture.operatorReviewUnlabeledAt, '2026-08-21T12:06:55Z');
    assert.equal(fixture.wakeReason, 'execution_unpaused');
    assert.equal(fixture.wakePath, 'event_execution_unpaused');
    assert.equal(fixture.handoffRunId, '32480334189');
    assert.equal(fixture.handoffWorkflow, 'CorpFlowAI Cursor Factory Handoff');

    const resumedPlan = planCursorIssueClaims({
      readyIssues: [
        syntheticPilotIssue({
          labels: ['dispatch:cursor-ready', 'priority:P0'],
          comments: [
            {
              body: `${fixture.durableApprovalMarker}\n\nAnton explicitly approved the synthetic Factory Pilot 3 proof.`,
              created_at: fixture.durableApprovalCommentAt,
              user: { login: fixture.durableApprovalAuthor },
            },
          ],
          updatedAt: fixture.operatorReviewUnlabeledAt,
        }),
      ],
      claimedIssues: [],
      trackedIssues: [],
    });
    assert.equal(resumedPlan.activationTargetIssue, 1028);
    assert.deepEqual(resumedPlan.eligibleIssueNumbers, [1028]);
    assert.deepEqual(resumedPlan.claimIssueNumbers, [1028]);

    const wake = resolveFactoryDispatcherRunPlan({
      eventName: 'issues',
      action: 'unlabeled',
      labelName: 'execution:paused',
      issueNumber: 1028,
      issueState: 'open',
    });
    assert.equal(wake.shouldRun, true);
    assert.equal(wake.wakeReason, 'execution_unpaused');
    assert.equal(wake.path, 'event_execution_unpaused');
    assert.equal(wake.eventIssueNumber, 1028);
  });

  it('exercises synthetic stale/orphan recovery without altering real worker claims', () => {
    const fixture = readPilotFixture();
    const nowIso = '2026-08-21T12:00:00Z';
    const staleClaim = syntheticOrphanClaim(
      fixture.staleOrphanSyntheticIssue,
      '2026-08-19T01:00:00Z',
    );

    assert.equal(fixture.staleOrphanSyntheticIssue, 10280);
    assert.notEqual(staleClaim.number, 1028);
    assert.equal(isClaimStale(staleClaim, nowIso, DEFAULT_STALE_CLAIM_HOURS), true);

    const plan = planCursorIssueClaims({
      readyIssues: [],
      claimedIssues: [staleClaim],
      trackedIssues: [staleClaim],
    });
    assert.equal(plan.verifiedActiveCount, 0);
    assert.equal(plan.availableSlots, 2);
    assert.equal(plan.activationTargetIssue, null);

    const decision = resolveFactoryQueueReconcileDecision({
      plan,
      claimedIssues: [staleClaim],
      nowIso,
    });
    assert.equal(decision.should_wake_handoff, 0);
    assert.equal(decision.source_issue, null);
    assert.equal(decision.reason, 'stale_claimed_deferred_to_lifecycle');
    assert.equal(decision.staleClaimedCount, 1);
    assert.equal(decision.verifiedActiveCount, 0);
    assert.equal(fixture.staleClaimDoesNotHoldCapacity, true);
  });

  it('keeps durable evidence of the approval-resume and stale-recovery path', () => {
    const evidence = readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), 'utf8');
    assert.match(evidence, /#1028/);
    assert.match(evidence, /#1023/);
    assert.match(evidence, /APPROVAL: PILOT 3/);
    assert.match(evidence, /execution:paused/);
    assert.match(evidence, /dispatch:operator-review/);
    assert.match(evidence, /32465439603/);
    assert.match(evidence, /32480334189/);
    assert.match(evidence, /execution_unpaused/);
    assert.match(evidence, /event_execution_unpaused/);
    assert.match(evidence, /10280/);
    assert.match(evidence, /stale_claimed_deferred_to_lifecycle/);
    assert.match(evidence, /PILOT 3 READY FOR REVIEW/);
  });
});
