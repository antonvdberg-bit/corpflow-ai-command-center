/**
 * #929 — Background Agents API is the only production Cursor execution rail.
 *
 * Proves:
 * 1. schedule → cursor_live even when CURSOR_LIVE_ENABLED is absent/false
 * 2. dispatch:cursor-ready still resolves immediately to cursor_live
 * 3. WIP=2 still prevents a third API activation
 * 4. protected consequential gates still prevent activation
 * 5. terminal/released work consumes zero WIP
 * 6. native handoff is manual/diagnostic-only and does not keep the exact
 *    production Automation trigger name
 * 7. no new secret/env name is introduced
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';
import {
  inferIssueClassification,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  resolveEffectiveActivationTarget,
  resolveFactoryDispatcherRunPlan,
} from '../lib/server/cursor-ready-event-dispatch.js';
import {
  FACTORY_CURSOR_HANDOFF_LEGACY_PRODUCTION_WORKFLOW_NAME,
  FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  formatFactoryHandoffComment,
} from '../lib/server/factory-cursor-handoff.js';
import { evaluateCursorWipCapacity } from '../lib/server/cursor-wip-control.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

const ACTIVATE_YML = path.join(REPO_ROOT, '.github/workflows/factory-dispatcher-activate.yml');
const HANDOFF_YML = path.join(REPO_ROOT, '.github/workflows/factory-cursor-handoff.yml');
const LIFECYCLE_YML = path.join(REPO_ROOT, '.github/workflows/cursor-agent-lifecycle-status.yml');
const RESOLVE_MODE_JS = path.join(REPO_ROOT, 'scripts/factory-dispatcher-resolve-mode.mjs');
const ACTIVATION_CLI = path.join(REPO_ROOT, 'scripts/dispatcher-agent-activation.mjs');
const READY_HELPER = path.join(REPO_ROOT, 'lib/server/cursor-ready-event-dispatch.js');

const FORBIDDEN_NEW_SECRET_NAMES = [
  'CURSOR_SCHEDULE_ENABLED',
  'CURSOR_LIVE_SCHEDULE',
  'CURSOR_BG_API_KEY',
  'CURSOR_BACKGROUND_API_KEY',
  'CURSOR_AUTOMATION_KEY',
  'CURSOR_WAKE_SECRET',
  'BACKGROUND_AGENTS_API_KEY',
  'CURSOR_API_TOKEN',
  'CURSOR_LIVE_SECRET',
];

function read(relOrAbs) {
  return readFileSync(relOrAbs, 'utf8');
}

function activatedIssue(number, runId, status = 'activated') {
  return {
    number,
    title: `Live ${number}`,
    body: 'implementation',
    labels: ['dispatch:cursor-claimed', 'status:in-progress'],
    comments: [
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: number,
            generation: 1,
            claimToken: `tok-${number}`,
            status,
            agentRunId: runId,
          }),
        ),
      },
    ],
  };
}

describe('cursor API execution rail (#929)', () => {
  it('1) schedule resolves to cursor_live even with CURSOR_LIVE_ENABLED absent/false', () => {
    for (const cursorLiveEnabled of [undefined, null, '', false, 'false', '0', 'off']) {
      const plan = resolveFactoryDispatcherRunPlan({
        eventName: 'schedule',
        cursorLiveEnabled,
      });
      assert.equal(plan.shouldRun, true, String(cursorLiveEnabled));
      assert.equal(plan.mode, 'cursor_live', String(cursorLiveEnabled));
      assert.equal(plan.path, 'schedule_fallback');
      assert.equal(plan.wakeReason, 'schedule_fallback');
      assert.equal(plan.bypassEligibilityGates, false);
    }

    const activateYml = read(ACTIVATE_YML);
    assert.match(activateYml, /cron:\s*"0,30 \* \* \* \*"/);
    assert.doesNotMatch(
      activateYml,
      /scheduled cursor_live disabled/i,
    );
    const activationCli = read(ACTIVATION_CLI);
    assert.doesNotMatch(
      activationCli,
      /CURSOR_LIVE_ENABLED is not true — scheduled cursor_live disabled/,
    );
  });

  it('2) event dispatch:cursor-ready still resolves immediately to cursor_live', () => {
    const plan = resolveFactoryDispatcherRunPlan({
      eventName: 'issues',
      action: 'labeled',
      labelName: 'dispatch:cursor-ready',
      issueState: 'open',
      issueNumber: 9291,
    });
    assert.equal(plan.shouldRun, true);
    assert.equal(plan.mode, 'cursor_live');
    assert.equal(plan.path, 'event_label_ready');
    assert.equal(plan.eventIssueNumber, 9291);
    assert.deepEqual(plan.preferIssueNumbers, [9291]);
    assert.equal(plan.manualTargetIssue, '');
    assert.equal(plan.bypassEligibilityGates, false);
    assert.equal(plan.requireExactEventIssue, true);
  });

  it('3) WIP=2 still prevents a third API activation', () => {
    const waiting = {
      number: 9292,
      title: 'Docs-only waiting behind two live runs',
      body: 'Internal docs-only. No client/runtime effect.',
      labels: ['dispatch:cursor-ready', 'priority:P0'],
    };
    const liveA = activatedIssue(801, 'run-aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1');
    const liveB = activatedIssue(802, 'run-bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2');
    const scan = planCursorIssueClaims({
      readyIssues: [waiting],
      claimedIssues: [liveA, liveB],
      trackedIssues: [liveA, liveB],
      preferIssueNumbers: [9292],
    });
    assert.equal(scan.verifiedActiveCount, 2);
    assert.equal(scan.availableSlots, 0);
    assert.equal(scan.activationTargetIssue, null);
    const held = scan.decisions.find((d) => d.issue.number === 9292);
    assert.equal(held?.eligibleToClaim, true);
    assert.match(String(held?.reason || ''), /WIP cap/i);

    const eventPlan = resolveFactoryDispatcherRunPlan({
      eventName: 'issues',
      action: 'labeled',
      labelName: 'dispatch:cursor-ready',
      issueState: 'open',
      issueNumber: 9292,
    });
    const resolved = resolveEffectiveActivationTarget({
      manualTargetIssue: eventPlan.manualTargetIssue,
      eventIssueNumber: eventPlan.eventIssueNumber,
      scannedActivationTargetIssue: scan.activationTargetIssue,
      requireExactEventIssue: eventPlan.requireExactEventIssue,
    });
    assert.equal(resolved.activate, false);
  });

  it('4) protected consequential gates still prevent activation', () => {
    const protectedIssue = {
      number: 9293,
      title: 'Change production DB schema for tenant migration',
      body: 'Requires production deploy and DB schema change on client_production.',
      labels: ['dispatch:cursor-ready', 'priority:P0'],
    };
    const classification = inferIssueClassification(protectedIssue);
    assert.notEqual(classification.protectedGate, 'none');

    const plan = planCursorIssueClaims({
      readyIssues: [protectedIssue],
      claimedIssues: [],
      preferIssueNumbers: [9293],
    });
    const decision = plan.decisions.find((d) => d.issue.number === 9293);
    assert.equal(decision?.eligibleToClaim, false);
    assert.match(String(decision?.reason || ''), /protected gate/i);
    assert.equal(plan.activationTargetIssue, null);
  });

  it('5) terminal/released work consumes zero WIP', () => {
    const released = activatedIssue(
      803,
      'run-ccccccc3-cccc-cccc-cccc-ccccccccccc3',
      'released',
    );
    released.labels = ['dispatch:operator-review'];
    const completed = activatedIssue(
      804,
      'run-ddddddd4-dddd-dddd-dddd-ddddddddddd4',
      'completed',
    );
    completed.labels = ['dispatch:operator-review'];

    const waiting = {
      number: 9294,
      title: 'Docs-only next eligible after terminal release',
      body: 'Internal docs-only. No client/runtime effect.',
      labels: ['dispatch:cursor-ready', 'priority:P0'],
    };

    const wip = evaluateCursorWipCapacity({
      trackedIssues: [released, completed],
      readyIssues: [waiting],
    });
    assert.equal(wip.used, 0);
    assert.equal(wip.availableSlots, 2);

    const scan = planCursorIssueClaims({
      readyIssues: [waiting],
      claimedIssues: [released, completed],
      trackedIssues: [released, completed],
    });
    assert.equal(scan.verifiedActiveCount, 0);
    assert.equal(scan.activationTargetIssue, 9294);
  });

  it('6) native handoff is manual/diagnostic-only and does not keep the production trigger name', () => {
    assert.equal(
      FACTORY_CURSOR_HANDOFF_LEGACY_PRODUCTION_WORKFLOW_NAME,
      'CorpFlowAI Cursor Factory Handoff',
    );
    assert.notEqual(
      FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
      FACTORY_CURSOR_HANDOFF_LEGACY_PRODUCTION_WORKFLOW_NAME,
    );
    assert.match(FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME, /legacy diagnostic/i);

    const handoffYml = read(HANDOFF_YML);
    assert.match(
      handoffYml,
      /^name:\s*CorpFlowAI Cursor Factory Handoff \(legacy diagnostic\)\s*$/m,
    );
    assert.doesNotMatch(handoffYml, /^name:\s*CorpFlowAI Cursor Factory Handoff\s*$/m);
    assert.match(handoffYml, /workflow_dispatch:/);
    assert.doesNotMatch(handoffYml, /^\s*workflow_call:/m);
    assert.doesNotMatch(handoffYml, /types:\s*\[labeled/);
    assert.doesNotMatch(handoffYml, /^\s*issue_comment:/m);
    assert.doesNotMatch(handoffYml, /^\s*schedule:/m);
    assert.match(handoffYml, /Not an execution authority/i);

    const lifecycleYml = read(LIFECYCLE_YML);
    assert.doesNotMatch(lifecycleYml, /factory-cursor-handoff\.yml/);
    assert.doesNotMatch(lifecycleYml, /wake_factory_handoff/);
    assert.match(lifecycleYml, /factory-dispatcher-activate\.yml/);

    const comment = formatFactoryHandoffComment({
      sourceIssue: 929,
      wakeReason: 'manual_dispatch',
    });
    assert.match(comment, /diagnostic only/i);
    assert.match(comment, /not an execution authority/i);
    assert.doesNotMatch(comment, /MODE B must execute/i);
  });

  it('7) no new secret/env name is introduced; CURSOR_API_KEY remains the live key', () => {
    const files = [
      ACTIVATE_YML,
      HANDOFF_YML,
      LIFECYCLE_YML,
      RESOLVE_MODE_JS,
      ACTIVATION_CLI,
      READY_HELPER,
    ];
    for (const file of files) {
      assert.equal(existsSync(file), true, file);
      const source = read(file);
      for (const name of FORBIDDEN_NEW_SECRET_NAMES) {
        assert.equal(source.includes(name), false, `${file} must not introduce ${name}`);
      }
    }

    const activateYml = read(ACTIVATE_YML);
    assert.match(activateYml, /secrets\.CURSOR_API_KEY/);
    assert.doesNotMatch(activateYml, /secrets\.CURSOR_API_KEY_[A-Z]/);

    const handoffYml = read(HANDOFF_YML);
    assert.doesNotMatch(handoffYml, /secrets\.CURSOR_API_KEY/);

    const readyHelper = read(READY_HELPER);
    assert.doesNotMatch(readyHelper, /process\.env\./);
  });

  it('manual workflow_dispatch still supports dry_run', () => {
    const dry = resolveFactoryDispatcherRunPlan({
      eventName: 'workflow_dispatch',
      activationModeInput: 'dry_run',
    });
    assert.equal(dry.mode, 'dry_run');
    assert.equal(dry.path, 'manual_dispatch');

    const live = resolveFactoryDispatcherRunPlan({
      eventName: 'workflow_dispatch',
      activationModeInput: 'cursor_live',
    });
    assert.equal(live.mode, 'cursor_live');
  });
});
