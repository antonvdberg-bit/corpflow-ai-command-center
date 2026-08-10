/**
 * Resolve factory-dispatcher-activate mode/target outputs for GHA.
 *
 * Usage (mode step):
 *   node scripts/factory-dispatcher-resolve-mode.mjs --phase mode
 *
 * Usage (target step):
 *   node scripts/factory-dispatcher-resolve-mode.mjs --phase target
 */
import fs from 'node:fs';

import {
  resolveEffectiveActivationTarget,
  resolveFactoryDispatcherRunPlan,
} from '../lib/server/cursor-ready-event-dispatch.js';

function appendOutput(lines) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) {
    for (const line of lines) console.log(`output:${line}`);
    return;
  }
  fs.appendFileSync(out, `${lines.join('\n')}\n`);
}

function normalizeTruthyFlag(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
}

function runModePhase() {
  const plan = resolveFactoryDispatcherRunPlan({
    eventName: process.env.EVENT_NAME || process.env.GITHUB_EVENT_NAME,
    action: process.env.EVENT_ACTION,
    labelName: process.env.EVENT_LABEL,
    issueState: process.env.EVENT_ISSUE_STATE,
    issueNumber: process.env.EVENT_ISSUE_NUMBER,
    activationModeInput: process.env.ACTIVATION_MODE_INPUT || 'dry_run',
    smokeInternalInput: process.env.SMOKE_INTERNAL_INPUT,
    targetIssueInput: process.env.TARGET_ISSUE_INPUT,
    cursorLiveEnabled: process.env.CURSOR_LIVE_ENABLED,
  });

  if (!plan.shouldRun) {
    console.log(`Event path ignored (${plan.ignoreReason || 'predicate_failed'})`);
    // Job-level `if` should already skip non-ready labels; exit 0 soft.
    appendOutput([
      'mode=dry_run',
      'smoke_internal=0',
      'target_issue=',
      'event_issue=',
      'prefer_issues=',
      'path=event_label_ignored',
      'concurrency_key=scan',
      'cursor_live_enabled_configured=false',
      'cursor_live_enabled_truthy=false',
    ]);
    return;
  }

  const liveConfigured = Boolean(String(process.env.CURSOR_LIVE_ENABLED || '').trim());
  const liveTruthy = normalizeTruthyFlag(process.env.CURSOR_LIVE_ENABLED);

  const evidenceTarget =
    plan.eventIssueNumber != null
      ? String(plan.eventIssueNumber)
      : plan.manualTargetIssue || '';

  appendOutput([
    `mode=${plan.mode}`,
    `smoke_internal=${plan.smokeInternal ? '1' : '0'}`,
    `target_issue=${plan.manualTargetIssue || ''}`,
    `event_issue=${plan.eventIssueNumber != null ? plan.eventIssueNumber : ''}`,
    `evidence_target_issue=${evidenceTarget}`,
    `prefer_issues=${(plan.preferIssueNumbers || []).join(',')}`,
    `path=${plan.path}`,
    `concurrency_key=${plan.concurrencyKey}`,
    `cursor_live_enabled_configured=${liveConfigured ? 'true' : 'false'}`,
    `cursor_live_enabled_truthy=${liveTruthy ? 'true' : 'false'}`,
  ]);

  console.log(
    `Resolved path=${plan.path} mode=${plan.mode} event_issue=${plan.eventIssueNumber || '(none)'} manual_target=${plan.manualTargetIssue || '(blank)'} prefer=${(plan.preferIssueNumbers || []).join(',') || '(none)'}`,
  );
}

function runTargetPhase() {
  const resolved = resolveEffectiveActivationTarget({
    manualTargetIssue: process.env.MANUAL_TARGET,
    eventIssueNumber: process.env.EVENT_ISSUE,
    scannedActivationTargetIssue: process.env.SCANNED_TARGET,
  });

  appendOutput([
    `target_issue=${resolved.targetIssue}`,
    `target_source=${resolved.targetSource}`,
    `activate=${resolved.activate ? '1' : '0'}`,
  ]);

  if (resolved.holdReason) {
    console.log(`Effective target held: ${resolved.holdReason}`);
  } else {
    console.log(
      `Effective target_issue=${resolved.targetIssue || '(blank)'} source=${resolved.targetSource}`,
    );
  }
}

const phaseIdx = process.argv.indexOf('--phase');
const phase = phaseIdx >= 0 ? String(process.argv[phaseIdx + 1] || '').trim() : 'mode';

if (phase === 'target') {
  runTargetPhase();
} else if (phase === 'mode') {
  runModePhase();
} else {
  console.error(`Unknown phase: ${phase}`);
  process.exit(2);
}
