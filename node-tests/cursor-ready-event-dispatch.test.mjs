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
import {
  buildCursorReadyWakeDispatchInputs,
  CURSOR_READY_WAKE_LABEL,
  isNonWakeLifecycleLabel,
  resolveEffectiveActivationTarget,
  resolveEventDrivenTargetIssue,
  resolveFactoryDispatcherRunPlan,
  shouldActivateOnIssueLabeledEvent,
} from '../lib/server/cursor-ready-event-dispatch.js';
import { validateDirectIssueActivationContext } from '../lib/server/dispatcher-agent-activation.js';

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
