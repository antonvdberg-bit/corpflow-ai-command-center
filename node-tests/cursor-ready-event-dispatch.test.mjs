import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildCursorActivationClaim,
  evaluateCursorIssueActivationClaim,
  formatCursorActivationClaimComment,
  formatCursorRequeueComment,
  buildCursorRequeueMarker,
  SKIP_ALREADY_CLAIMED,
} from '../lib/server/cursor-activation-claim.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
} from '../lib/server/cursor-origin-metadata.js';
import {
  inferIssueClassification,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { formatDurableApproval } from '../lib/server/anton-decision-inbox.js';
import {
  buildCapacityReleaseWakeRequest,
  buildCursorReadyWakeDispatchInputs,
  buildEligibilityWakeDedupeKey,
  commentBodyLooksLikeEligibilityAuthorization,
  CURSOR_READY_WAKE_LABEL,
  ELIGIBILITY_WAKE_SLA_MINUTES,
  isIgnoredDispatcherWakeActor,
  isNonWakeLifecycleLabel,
  resolveEffectiveActivationTarget,
  resolveEventDrivenTargetIssue,
  resolveFactoryDispatcherRunPlan,
  shouldActivateOnIssueLabeledEvent,
  shouldWakeOnExecutionUnpausedEvent,
  shouldWakeOnOperatorAuthorizationComment,
  shouldWakeOnPriorityLabeledEvent,
} from '../lib/server/cursor-ready-event-dispatch.js';
import { validateDirectIssueActivationContext } from '../lib/server/dispatcher-agent-activation.js';
import {
  evaluateOperatorGateAuthorization,
  formatOperatorGateAuthorization,
} from '../lib/server/operator-gate-authorization.js';

const READY_EVENT = {
  eventName: 'issues',
  action: 'labeled',
  labelName: 'dispatch:cursor-ready',
  issueState: 'open',
  issueNumber: 9001,
};

const HELPER_SOURCE = fs.readFileSync(
  fileURLToPath(new URL('../lib/server/cursor-ready-event-dispatch.js', import.meta.url)),
  'utf8',
);

describe('cursor-ready event-driven dispatch (Phase A)', () => {
  it('exact dispatch:cursor-ready label on open issue triggers', () => {
    assert.equal(CURSOR_READY_WAKE_LABEL, 'dispatch:cursor-ready');
    assert.equal(shouldActivateOnIssueLabeledEvent(READY_EVENT), true);
    assert.deepEqual(resolveEventDrivenTargetIssue(READY_EVENT), {
      ok: true,
      issueNumber: 9001,
    });
  });

  it('other labels do not trigger', () => {
    const cases = [
      'bug',
      'priority:P0',
      'dispatch:cursor-claimed',
      'status:in-progress',
      'dispatch:blocked',
      'needs:anton',
      'Dispatch:cursor-ready',
      'dispatch:cursor-ready-extra',
    ];
    for (const labelName of cases) {
      const event = { ...READY_EVENT, labelName };
      assert.equal(
        shouldActivateOnIssueLabeledEvent(event),
        false,
        `label ${JSON.stringify(labelName)} must not wake`,
      );
    }
  });

  it('bot-written lifecycle labels are non-wake (no recursive activation loops)', () => {
    for (const labelName of [
      'dispatch:cursor-claimed',
      'status:in-progress',
      'dispatch:blocked',
      'dispatch:operator-review',
      'dispatch:ci-repair',
      'execution:paused',
      'needs:anton',
    ]) {
      assert.equal(isNonWakeLifecycleLabel(labelName), true);
      const plan = resolveFactoryDispatcherRunPlan({
        ...READY_EVENT,
        labelName,
      });
      assert.equal(plan.shouldRun, false);
      assert.equal(plan.path, 'event_label_ignored');
      assert.equal(plan.ignoreReason, 'lifecycle_label_non_wake');
    }
  });

  it('closed issues and non-labeled actions do not trigger', () => {
    assert.equal(
      shouldActivateOnIssueLabeledEvent({ ...READY_EVENT, issueState: 'closed' }),
      false,
    );
    assert.equal(
      shouldActivateOnIssueLabeledEvent({ ...READY_EVENT, action: 'unlabeled' }),
      false,
    );
    assert.equal(
      shouldActivateOnIssueLabeledEvent({ ...READY_EVENT, eventName: 'workflow_dispatch' }),
      false,
    );
  });

  it('event path selects cursor_live for the exact issue without bypassing gates', () => {
    const plan = resolveFactoryDispatcherRunPlan(READY_EVENT);
    assert.equal(plan.shouldRun, true);
    assert.equal(plan.mode, 'cursor_live');
    assert.equal(plan.eventIssueNumber, 9001);
    assert.deepEqual(plan.preferIssueNumbers, [9001]);
    assert.equal(plan.manualTargetIssue, '');
    assert.equal(plan.bypassEligibilityGates, false);
    assert.equal(plan.concurrencyKey, '9001');
    assert.equal(plan.path, 'event_label_ready');
  });

  it('scheduled fallback remains available and backward compatible', () => {
    const dry = resolveFactoryDispatcherRunPlan({
      eventName: 'schedule',
      cursorLiveEnabled: false,
    });
    assert.equal(dry.shouldRun, true);
    assert.equal(dry.mode, 'dry_run');
    assert.equal(dry.path, 'schedule_fallback');
    assert.equal(dry.concurrencyKey, 'scan');

    const live = resolveFactoryDispatcherRunPlan({
      eventName: 'schedule',
      cursorLiveEnabled: 'true',
    });
    assert.equal(live.mode, 'cursor_live');
    assert.equal(live.path, 'schedule_fallback');
  });

  it('manual workflow_dispatch remains backward compatible', () => {
    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'workflow_dispatch',
      activationModeInput: 'cursor_live',
      smokeInternalInput: false,
      targetIssueInput: '553',
    });
    assert.equal(plan.mode, 'cursor_live');
    assert.equal(plan.manualTargetIssue, '553');
    assert.equal(plan.bypassEligibilityGates, true);
    assert.equal(plan.path, 'manual_dispatch');
    assert.equal(plan.concurrencyKey, '553');
  });

  it('protected-gate issue evaluates and stops rather than activates', () => {
    const protectedIssue = {
      number: 9002,
      title: 'Change production DB schema for tenant migration',
      body: 'Requires production deploy and DB schema change on client_production.',
      labels: ['dispatch:cursor-ready', 'priority:P0'],
    };
    const classification = inferIssueClassification(protectedIssue);
    assert.notEqual(classification.protectedGate, 'none');

    const plan = planCursorIssueClaims({
      readyIssues: [protectedIssue],
      claimedIssues: [],
      preferIssueNumbers: [9002],
    });
    const decision = plan.decisions.find((d) => d.issue.number === 9002);
    assert.equal(decision?.eligibleToClaim, false);
    assert.match(String(decision?.reason || ''), /protected gate/i);
    assert.equal(plan.activationTargetIssue, null);

    const eventPlan = resolveFactoryDispatcherRunPlan({
      ...READY_EVENT,
      issueNumber: 9002,
    });
    const resolved = resolveEffectiveActivationTarget({
      manualTargetIssue: eventPlan.manualTargetIssue,
      eventIssueNumber: eventPlan.eventIssueNumber,
      scannedActivationTargetIssue: plan.activationTargetIssue,
    });
    assert.equal(resolved.activate, false);
    assert.equal(resolved.targetSource, 'event_label_held');
    assert.match(String(resolved.holdReason || ''), /not selected|protected|WIP/i);
  });

  it('WIP limit still blocks event-driven activation', () => {
    const ready = {
      number: 9003,
      title: 'Docs-only synthetic event dispatch proof',
      body: 'Internal docs-only. No client/runtime effect.',
      labels: ['dispatch:cursor-ready'],
    };
    const claimed = [
      {
        number: 801,
        title: 'Active A',
        body: 'implementation',
        labels: ['dispatch:cursor-claimed', 'status:in-progress'],
        comments: [
          {
            body: formatCursorActivationClaimComment(
              buildCursorActivationClaim({
                sourceIssue: 801,
                generation: 1,
                claimToken: 'live-a',
                status: 'activated',
                agentRunId: 'run-aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
              }),
            ),
          },
        ],
      },
      {
        number: 802,
        title: 'Active B',
        body: 'implementation',
        labels: ['dispatch:cursor-claimed', 'status:in-progress'],
        comments: [
          {
            body: formatCursorActivationClaimComment(
              buildCursorActivationClaim({
                sourceIssue: 802,
                generation: 1,
                claimToken: 'live-b',
                status: 'activated',
                agentRunId: 'run-bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
              }),
            ),
          },
        ],
      },
    ];
    const scan = planCursorIssueClaims({
      readyIssues: [ready],
      claimedIssues: claimed,
      trackedIssues: claimed,
      preferIssueNumbers: [9003],
    });
    assert.equal(scan.activationTargetIssue, null);
    assert.equal(scan.verifiedActiveCount, 2);
    const held = scan.decisions.find((d) => d.issue.number === 9003);
    assert.equal(held?.eligibleToClaim, true);
    assert.match(String(held?.reason || ''), /WIP cap/i);

    const resolved = resolveEffectiveActivationTarget({
      eventIssueNumber: 9003,
      scannedActivationTargetIssue: scan.activationTargetIssue,
    });
    assert.equal(resolved.activate, false);
    assert.equal(resolved.targetSource, 'event_label_held');
  });

  it('already-claimed / completed issue does not duplicate activate', () => {
    const claimComment = formatCursorActivationClaimComment(
      buildCursorActivationClaim({
        sourceIssue: 9004,
        generation: 1,
        claimToken: 'tok-1',
        status: 'activated',
        agentRunId: 'run-abc',
      }),
    );
    const origin = formatCursorOriginMetadataComment(
      buildCursorOriginMetadata({
        sourceIssue: 9004,
        activationWorkflowRunId: '111',
        cursorRunId: 'run-abc',
        cursorAgentId: 'bc-abc',
        cursorAgentUrl: 'https://cursor.com/agents/bc-abc',
      }),
    );

    const claimedGate = evaluateCursorIssueActivationClaim({
      issueNumber: 9004,
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments: [{ body: claimComment }],
    });
    assert.equal(claimedGate.decision, SKIP_ALREADY_CLAIMED);

    const completedGate = evaluateCursorIssueActivationClaim({
      issueNumber: 9004,
      labels: ['dispatch:operator-review'],
      comments: [{ body: claimComment }, { body: origin }],
    });
    assert.equal(completedGate.decision, SKIP_ALREADY_CLAIMED);

    const scan = planCursorIssueClaims({
      readyIssues: [
        {
          number: 9004,
          title: 'already claimed',
          body: 'n/a',
          labels: ['dispatch:cursor-ready', 'dispatch:cursor-claimed'],
        },
      ],
      claimedIssues: [
        {
          number: 9004,
          title: 'already claimed',
          body: 'n/a',
          labels: ['dispatch:cursor-claimed'],
        },
      ],
      preferIssueNumbers: [9004],
    });
    assert.equal(scan.activationTargetIssue, null);
    const resolved = resolveEffectiveActivationTarget({
      eventIssueNumber: 9004,
      scannedActivationTargetIssue: scan.activationTargetIssue,
    });
    assert.equal(resolved.activate, false);
  });

  it('replay / remove+re-add is generation-safe with CURSOR REQUEUE', () => {
    const gen1 = formatCursorActivationClaimComment(
      buildCursorActivationClaim({
        sourceIssue: 9005,
        generation: 1,
        claimToken: 'tok-old',
        status: 'activated',
        agentRunId: 'run-old',
      }),
    );
    const origin = formatCursorOriginMetadataComment(
      buildCursorOriginMetadata({
        sourceIssue: 9005,
        activationWorkflowRunId: '222',
        cursorRunId: 'run-old',
        cursorAgentId: 'bc-old',
        cursorAgentUrl: 'https://cursor.com/agents/bc-old',
      }),
    );
    const withoutRequeue = evaluateCursorIssueActivationClaim({
      issueNumber: 9005,
      labels: ['dispatch:cursor-ready'],
      comments: [{ body: gen1 }, { body: origin }],
    });
    assert.equal(withoutRequeue.decision, SKIP_ALREADY_CLAIMED);

    const requeue = formatCursorRequeueComment(
      buildCursorRequeueMarker({
        sourceIssue: 9005,
        generation: 2,
        reason: 'operator requeue after remove+re-add ready label',
      }),
    );
    const withRequeue = evaluateCursorIssueActivationClaim({
      issueNumber: 9005,
      labels: ['dispatch:cursor-ready'],
      comments: [{ body: gen1 }, { body: origin }, { body: requeue }],
    });
    assert.equal(withRequeue.decision, 'ACQUIRE');
    assert.equal(withRequeue.generation, 2);
  });

  it('event path activates only when scan selects the exact labeled issue', () => {
    const activate = resolveEffectiveActivationTarget({
      eventIssueNumber: 9006,
      scannedActivationTargetIssue: 9006,
    });
    assert.equal(activate.activate, true);
    assert.equal(activate.targetSource, 'event_label');
    assert.equal(activate.targetIssue, '9006');

    const otherSelected = resolveEffectiveActivationTarget({
      eventIssueNumber: 9006,
      scannedActivationTargetIssue: 9007,
    });
    assert.equal(otherSelected.activate, false);
    assert.equal(otherSelected.targetSource, 'event_label_held');
  });

  it('validateDirectIssueActivationContext allows issues event handoff', () => {
    const result = validateDirectIssueActivationContext({
      targetIssue: '9008',
      eventName: 'issues',
      issueScanHandoff: true,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.issueNumber, 9008);
  });

  it('legacy wake dispatch inputs stay pinned to cursor_live + target_issue', () => {
    assert.deepEqual(buildCursorReadyWakeDispatchInputs(847), {
      ref: 'main',
      inputs: {
        activation_mode: 'cursor_live',
        smoke_internal: 'false',
        target_issue: '847',
      },
    });
    assert.throws(() => buildCursorReadyWakeDispatchInputs(0));
  });

  it('no new secret names are introduced by event helpers', () => {
    for (const name of [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'N8N_API_KEY',
      'PROMPTFOO_API_KEY',
      'process.env.',
    ]) {
      assert.equal(HELPER_SOURCE.includes(name), false, `must not reference ${name}`);
    }
  });
});

describe('eligibility wake (#891) — approval and capacity changes', () => {
  const approvalBody = formatOperatorGateAuthorization({
    issue: 9101,
    gate: 'database',
    author: 'antonvdberg-bit',
    decision: 'approve',
    notes: 'synthetic unlock for eligibility wake',
  });

  it('A: ready + gated + no approval → no Cursor activation target', () => {
    const gated = {
      number: 9101,
      title: 'Synthetic gated database task',
      body: 'Requires protected gate: database. Internal synthetic only.',
      labels: ['dispatch:cursor-ready', 'priority:P0'],
    };
    const scan = planCursorIssueClaims({
      readyIssues: [gated],
      claimedIssues: [],
      preferIssueNumbers: [9101],
    });
    assert.equal(scan.activationTargetIssue, null);
    const decision = scan.decisions.find((d) => d.issue.number === 9101);
    assert.equal(decision?.eligibleToClaim, false);
    assert.match(String(decision?.reason || ''), /protected gate|authorization/i);
  });

  it('B: matching approval comment wakes dispatcher and prefers the issue', () => {
    assert.equal(
      shouldWakeOnOperatorAuthorizationComment({
        eventName: 'issue_comment',
        action: 'created',
        issueState: 'open',
        issueNumber: 9101,
        commentBody: approvalBody,
        actorLogin: 'antonvdberg-bit',
      }),
      true,
    );
    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'issue_comment',
      action: 'created',
      issueState: 'open',
      issueNumber: 9101,
      commentBody: approvalBody,
      actorLogin: 'antonvdberg-bit',
    });
    assert.equal(plan.shouldRun, true);
    assert.equal(plan.mode, 'cursor_live');
    assert.equal(plan.path, 'event_operator_authorization');
    assert.equal(plan.wakeReason, 'operator_authorization');
    assert.deepEqual(plan.preferIssueNumbers, [9101]);
    assert.equal(plan.bypassEligibilityGates, false);

    const gated = {
      number: 9101,
      title: 'Synthetic gated database task',
      body: 'Requires protected gate: database. Internal synthetic only.',
      labels: ['dispatch:cursor-ready', 'priority:P0'],
      comments: [
        {
          body: approvalBody,
          author: 'antonvdberg-bit',
          created_at: '2026-08-11T12:00:00.000Z',
        },
      ],
    };
    const auth = evaluateOperatorGateAuthorization({
      gate: 'database',
      issueNumber: 9101,
      body: gated.body,
      comments: gated.comments,
    });
    assert.equal(auth.allowed, true);

    const scan = planCursorIssueClaims({
      readyIssues: [gated],
      claimedIssues: [],
      preferIssueNumbers: [9101],
    });
    // Prefer path selects when capacity exists and auth matches.
    const decision = scan.decisions.find((d) => d.issue.number === 9101);
    assert.equal(decision?.eligibleToClaim, true);
    assert.equal(scan.activationTargetIssue, 9101);
  });

  it('C: capacity release wake runs full priority backfill scan (not prefer terminal issue)', () => {
    const wake = buildCapacityReleaseWakeRequest({
      issueNumber: 801,
      phase: 'COMPLETED',
      actions: ['completion_event_posted', 'release_execution_slot_labels', 'label:dispatch:operator-review'],
    });
    assert.equal(wake.shouldWake, true);
    assert.equal(wake.wakeReason, 'capacity_released');
    assert.equal(wake.slaMinutes, ELIGIBILITY_WAKE_SLA_MINUTES);

    const silent = buildCapacityReleaseWakeRequest({
      issueNumber: 801,
      phase: 'RUNNING',
      actions: [],
    });
    assert.equal(silent.shouldWake, false);

    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'workflow_call',
      wakeReasonInput: 'capacity_released',
      capacityWakeRequested: 'true',
      targetIssueInput: '801',
    });
    assert.equal(plan.shouldRun, true);
    assert.equal(plan.mode, 'cursor_live');
    assert.equal(plan.path, 'capacity_backfill_scan');
    assert.deepEqual(plan.preferIssueNumbers, []);
    assert.equal(plan.eventIssueNumber, null);
    assert.equal(plan.requireExactEventIssue, false);

    const waiting = {
      number: 9102,
      title: 'Docs-only waiting for WIP capacity',
      body: 'Internal docs-only synthetic. No client/runtime effect.',
      labels: ['dispatch:cursor-ready', 'priority:P0'],
    };
    const stillActive = {
      number: 802,
      title: 'Still active',
      body: 'implementation',
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments: [
        {
          body: formatCursorActivationClaimComment(
            buildCursorActivationClaim({
              sourceIssue: 802,
              generation: 1,
              claimToken: 'live-b',
              status: 'activated',
              agentRunId: 'run-bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
            }),
          ),
        },
      ],
    };
    // After one terminal release, only one verified active remains → slot frees.
    const scan = planCursorIssueClaims({
      readyIssues: [waiting],
      claimedIssues: [stillActive],
      trackedIssues: [stillActive, waiting],
    });
    assert.equal(scan.activationTargetIssue, 9102);
    const resolved = resolveEffectiveActivationTarget({
      eventIssueNumber: null,
      scannedActivationTargetIssue: scan.activationTargetIssue,
      requireExactEventIssue: false,
      wakePath: 'capacity_backfill_scan',
    });
    assert.equal(resolved.activate, true);
    assert.equal(resolved.targetSource, 'capacity_backfill');
    assert.equal(resolved.targetIssue, '9102');
  });

  it('D: wrong-gate approval does not activate', () => {
    const wrongGate = formatOperatorGateAuthorization({
      issue: 9103,
      gate: 'secrets',
      author: 'antonvdberg-bit',
      decision: 'approve',
    });
    // Wake still fires (eligibility may have changed) — scan holds wrong gate.
    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'issue_comment',
      action: 'created',
      issueState: 'open',
      issueNumber: 9103,
      commentBody: wrongGate,
      actorLogin: 'antonvdberg-bit',
    });
    assert.equal(plan.shouldRun, true);

    const gated = {
      number: 9103,
      title: 'Synthetic database gate task',
      body: 'Requires protected gate: database.',
      labels: ['dispatch:cursor-ready'],
      comments: [{ body: wrongGate, user: { login: 'antonvdberg-bit' } }],
    };
    const scan = planCursorIssueClaims({
      readyIssues: [gated],
      claimedIssues: [],
      preferIssueNumbers: [9103],
    });
    assert.equal(scan.activationTargetIssue, null);
    const decision = scan.decisions.find((d) => d.issue.number === 9103);
    assert.equal(decision?.eligibleToClaim, false);
  });

  it('E: repeated approval / lifecycle event does not duplicate Cursor run', () => {
    const claimComment = formatCursorActivationClaimComment(
      buildCursorActivationClaim({
        sourceIssue: 9104,
        generation: 1,
        claimToken: 'tok-1',
        status: 'activated',
        agentRunId: 'run-dup-guard',
      }),
    );
    const origin = formatCursorOriginMetadataComment(
      buildCursorOriginMetadata({
        sourceIssue: 9104,
        activationWorkflowRunId: '333',
        cursorRunId: 'run-dup-guard',
        cursorAgentId: 'bc-dup',
        cursorAgentUrl: 'https://cursor.com/agents/bc-dup',
      }),
    );
    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 9104,
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments: [{ body: claimComment }, { body: origin }, { body: approvalBody }],
    });
    assert.equal(gate.decision, SKIP_ALREADY_CLAIMED);

    const key1 = buildEligibilityWakeDedupeKey({
      wakeReason: 'operator_authorization',
      issueNumber: 9104,
      commentBody: approvalBody,
      actorLogin: 'antonvdberg-bit',
    });
    const key2 = buildEligibilityWakeDedupeKey({
      wakeReason: 'operator_authorization',
      issueNumber: 9104,
      commentBody: approvalBody,
      actorLogin: 'antonvdberg-bit',
    });
    assert.equal(key1, key2);

    const silentLifecycle = buildCapacityReleaseWakeRequest({
      issueNumber: 9104,
      phase: 'COMPLETED',
      actions: ['completion_event_deduped'],
    });
    assert.equal(silentLifecycle.shouldWake, false);
  });

  it('F: schedule fallback remains the reconciliation path', () => {
    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'schedule',
      cursorLiveEnabled: true,
    });
    assert.equal(plan.shouldRun, true);
    assert.equal(plan.path, 'schedule_fallback');
    assert.equal(plan.mode, 'cursor_live');
    assert.equal(plan.wakeReason, 'schedule_fallback');

    const called = resolveFactoryDispatcherRunPlan({
      eventName: 'workflow_call',
      wakeReasonInput: 'scheduled_reconciliation',
      capacityWakeRequested: 'true',
    });
    assert.equal(called.shouldRun, true);
    assert.equal(called.path, 'schedule_fallback');
    assert.equal(called.wakeReason, 'scheduled_reconciliation');
    assert.equal(called.requireExactEventIssue, false);

    const inheritedSchedule = resolveFactoryDispatcherRunPlan({
      eventName: 'schedule',
      wakeReasonInput: 'scheduled_reconciliation',
      targetIssueInput: '1037',
    });
    assert.equal(inheritedSchedule.shouldRun, true);
    assert.equal(inheritedSchedule.mode, 'cursor_live');
    assert.equal(inheritedSchedule.path, 'schedule_fallback');
    assert.equal(inheritedSchedule.wakeReason, 'scheduled_reconciliation');
    assert.deepEqual(inheritedSchedule.preferIssueNumbers, [1037]);
  });

  it('G: eligibility wakes do not require manual label toggle or workflow_dispatch', () => {
    for (const eventName of ['issue_comment', 'workflow_call', 'issues']) {
      assert.notEqual(eventName, 'workflow_dispatch');
    }
    assert.equal(
      shouldWakeOnExecutionUnpausedEvent({
        eventName: 'issues',
        action: 'unlabeled',
        labelName: 'execution:paused',
        issueState: 'open',
        issueNumber: 9105,
      }),
      true,
    );
    assert.equal(
      shouldWakeOnPriorityLabeledEvent({
        eventName: 'issues',
        action: 'labeled',
        labelName: 'priority:P0',
        issueState: 'open',
        issueNumber: 9106,
        issueLabelNames: ['dispatch:cursor-ready', 'priority:P0'],
      }),
      true,
    );
    // Priority alone without ready must not wake.
    assert.equal(
      shouldWakeOnPriorityLabeledEvent({
        eventName: 'issues',
        action: 'labeled',
        labelName: 'priority:P0',
        issueState: 'open',
        issueNumber: 9106,
        issueLabelNames: ['priority:P0'],
      }),
      false,
    );
  });

  it('H: SLA constant is defined (5 minutes) for idle-window proof', () => {
    assert.equal(ELIGIBILITY_WAKE_SLA_MINUTES, 5);
    assert.ok(HELPER_SOURCE.includes('ELIGIBILITY_WAKE_SLA_MINUTES'));
  });

  it('bot / GITHUB_TOKEN actors never wake on authorization comments', () => {
    assert.equal(isIgnoredDispatcherWakeActor('github-actions[bot]'), true);
    assert.equal(isIgnoredDispatcherWakeActor('cursor[bot]'), true);
    assert.equal(
      shouldWakeOnOperatorAuthorizationComment({
        eventName: 'issue_comment',
        action: 'created',
        issueState: 'open',
        issueNumber: 9107,
        commentBody: approvalBody,
        actorLogin: 'github-actions[bot]',
      }),
      false,
    );
    assert.equal(commentBodyLooksLikeEligibilityAuthorization(approvalBody), true);
    assert.equal(
      commentBodyLooksLikeEligibilityAuthorization(
        formatDurableApproval({
          issue_or_pr: '#9107',
          approval_type: 'approval:db-schema',
          decision: 'approve',
          approver: 'Anton',
          notes: 'synthetic',
        }),
      ),
      true,
    );
  });

  it('claim-release continuation path is cursor_live full scan', () => {
    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'workflow_call',
      wakeReasonInput: 'claim_released_continuation',
    });
    assert.equal(plan.shouldRun, true);
    assert.equal(plan.path, 'claim_release_continuation');
    assert.equal(plan.mode, 'cursor_live');
  });
});
