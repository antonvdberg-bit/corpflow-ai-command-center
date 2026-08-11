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

/**
 * @param {string | undefined} raw
 * @returns {string[]}
 */
function parseLabelNames(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function runModePhase() {
  const plan = resolveFactoryDispatcherRunPlan({
    eventName: process.env.EVENT_NAME || process.env.GITHUB_EVENT_NAME,
    action: process.env.EVENT_ACTION,
    labelName: process.env.EVENT_LABEL,
    issueState: process.env.EVENT_ISSUE_STATE,
    issueNumber: process.env.EVENT_ISSUE_NUMBER,
    issueLabelNames: parseLabelNames(process.env.EVENT_ISSUE_LABELS),
    commentBody: process.env.EVENT_COMMENT_BODY,
    actorLogin: process.env.EVENT_ACTOR_LOGIN,
    commentAuthorAssociation: process.env.EVENT_COMMENT_AUTHOR_ASSOCIATION,
    activationModeInput: process.env.ACTIVATION_MODE_INPUT || 'dry_run',
    smokeInternalInput: process.env.SMOKE_INTERNAL_INPUT,
    targetIssueInput: process.env.TARGET_ISSUE_INPUT,
    cursorLiveEnabled: process.env.CURSOR_LIVE_ENABLED,
    wakeReasonInput: process.env.WAKE_REASON_INPUT,
    capacityWakeRequested: process.env.CAPACITY_WAKE_REQUESTED,
  });

  if (!plan.shouldRun) {
    console.log(`Event path ignored (${plan.ignoreReason || 'predicate_failed'})`);
    // Job-level `if` should already skip non-wake events; exit 0 soft.
    appendOutput([
      'mode=dry_run',
      'smoke_internal=0',
      'target_issue=',
      'event_issue=',
      'prefer_issues=',
      'path=event_ignored',
      'wake_reason=',
      'require_exact_event_issue=0',
      'should_run=0',
      'concurrency_key=scan',
      'cursor_live_enabled_configured=false',
      'cursor_live_enabled_truthy=false',
      'dedupe_key=',
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
    `wake_reason=${plan.wakeReason || ''}`,
    `require_exact_event_issue=${plan.requireExactEventIssue ? '1' : '0'}`,
    `should_run=1`,
    `concurrency_key=${plan.concurrencyKey}`,
    `cursor_live_enabled_configured=${liveConfigured ? 'true' : 'false'}`,
    `cursor_live_enabled_truthy=${liveTruthy ? 'true' : 'false'}`,
    `dedupe_key=${plan.dedupeKey || ''}`,
  ]);

  console.log(
    `Resolved path=${plan.path} mode=${plan.mode} wake=${plan.wakeReason || '(none)'} event_issue=${plan.eventIssueNumber || '(none)'} manual_target=${plan.manualTargetIssue || '(blank)'} prefer=${(plan.preferIssueNumbers || []).join(',') || '(none)'}`,
  );
}

function runTargetPhase() {
  const resolved = resolveEffectiveActivationTarget({
    manualTargetIssue: process.env.MANUAL_TARGET,
    eventIssueNumber: process.env.EVENT_ISSUE,
    scannedActivationTargetIssue: process.env.SCANNED_TARGET,
    requireExactEventIssue: process.env.REQUIRE_EXACT_EVENT_ISSUE,
    wakePath: process.env.WAKE_PATH,
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
