/**
 * Post durable dispatcher run evidence to the control issue (#661 by default).
 *
 * Usage:
 *   node scripts/dispatcher-run-evidence.mjs --phase started
 *   node scripts/dispatcher-run-evidence.mjs --phase finished
 *   node scripts/dispatcher-run-evidence.mjs --phase=started --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  buildDispatcherRunFinishedEvidence,
  buildDispatcherRunStartedEvidence,
  DEFAULT_DISPATCHER_CONTROL_ISSUE,
} from '../lib/server/dispatcher-run-evidence.js';
import { postGitHubIssueComment } from '../lib/server/cursor-ops-status.js';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  let phase = 'started';
  let issue = Number(process.env.DISPATCHER_CONTROL_ISSUE || DEFAULT_DISPATCHER_CONTROL_ISSUE);
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--phase' || arg.startsWith('--phase=')) {
      const value = arg.startsWith('--phase=') ? arg.slice('--phase='.length) : String(argv[++i] || '');
      phase = value.trim() === 'finished' ? 'finished' : 'started';
      continue;
    }
    if (arg === '--issue' || arg.startsWith('--issue=')) {
      const value = arg.startsWith('--issue=') ? arg.slice('--issue='.length) : String(argv[++i] || '');
      const n = Number(value);
      if (Number.isInteger(n) && n > 0) issue = n;
      continue;
    }
  }

  return {
    phase,
    issueNumber: Number.isInteger(issue) && issue > 0 ? issue : DEFAULT_DISPATCHER_CONTROL_ISSUE,
    dryRun,
    outPath: process.env.DISPATCHER_RUN_EVIDENCE_PATH || 'dispatcher-run-evidence.json',
  };
}

function readJsonIfExists(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return null;
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    return null;
  }
}

function parseBooleanFlag(value) {
  const n = String(value || '')
    .trim()
    .toLowerCase();
  return n === '1' || n === 'true' || n === 'yes' || n === 'on' || n === 'enabled';
}

function resolveLiveFlags() {
  const configuredEnv = process.env.CURSOR_LIVE_ENABLED_CONFIGURED;
  const truthyEnv = process.env.CURSOR_LIVE_ENABLED_TRUTHY;
  const liveRaw = String(process.env.CURSOR_LIVE_ENABLED || '').trim();

  const liveEnabledConfigured =
    configuredEnv != null && String(configuredEnv).trim() !== ''
      ? parseBooleanFlag(configuredEnv)
      : liveRaw.length > 0;
  const liveEnabledTruthy =
    truthyEnv != null && String(truthyEnv).trim() !== ''
      ? parseBooleanFlag(truthyEnv)
      : parseBooleanFlag(liveRaw);

  return { liveEnabledConfigured, liveEnabledTruthy };
}

function resolveRunUrl() {
  const server = String(process.env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/$/, '');
  const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
  const runId = String(process.env.GITHUB_RUN_ID || '').trim();
  if (!repo || !runId) return null;
  return `${server}/${repo}/actions/runs/${runId}`;
}

/**
 * @param {Record<string, unknown> | null} scan
 */
function resolveReadyIssues(scan) {
  if (!scan || typeof scan !== 'object') return [];
  if (Array.isArray(scan.readyIssueNumbers) && scan.readyIssueNumbers.length) {
    return scan.readyIssueNumbers.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  }
  if (Array.isArray(scan.readyIssues) && scan.readyIssues.length) {
    return scan.readyIssues
      .map((item) => Number(item?.number ?? item))
      .filter((n) => Number.isInteger(n) && n > 0);
  }
  if (Array.isArray(scan.actions) && scan.actions.length) {
    return [...new Set(scan.actions.map((a) => Number(a.issue)).filter((n) => Number.isInteger(n) && n > 0))];
  }
  return [];
}

/**
 * @param {Record<string, unknown> | null} scan
 */
function resolveEligibleIssues(scan) {
  if (!scan || typeof scan !== 'object') return [];
  if (Array.isArray(scan.eligibleIssueNumbers) && scan.eligibleIssueNumbers.length) {
    return scan.eligibleIssueNumbers.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  }
  if (Array.isArray(scan.claimIssueNumbers) && scan.claimIssueNumbers.length) {
    return scan.claimIssueNumbers.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  }
  return [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || '').trim();
  const { liveEnabledConfigured, liveEnabledTruthy } = resolveLiveFlags();

  const scan = readJsonIfExists(
    process.env.CURSOR_ISSUE_DISPATCH_SCAN_PATH || 'cursor-issue-dispatch-scan.json',
  );
  const ops = readJsonIfExists(process.env.CURSOR_OPS_STATUS_PATH || 'cursor-ops-status.json');
  const activation = readJsonIfExists(
    process.env.DISPATCHER_ACTIVATION_PLAN_PATH || 'activation-plan.json',
  );

  const mode =
    process.env.DISPATCHER_ACTIVATION_MODE ||
    process.env.ACTIVATION_MODE ||
    ops?.activation_mode ||
    'unknown';

  /** @type {Record<string, unknown>} */
  let evidence;
  if (args.phase === 'started') {
    evidence = buildDispatcherRunStartedEvidence({
      runId: process.env.GITHUB_RUN_ID,
      runUrl: resolveRunUrl(),
      eventName: process.env.DISPATCHER_ACTIVATION_EVENT_NAME || process.env.GITHUB_EVENT_NAME,
      mode,
      headSha: process.env.GITHUB_SHA,
      targetIssue: process.env.DISPATCHER_ACTIVATION_TARGET_ISSUE || process.env.TARGET_ISSUE || '',
      liveEnabledConfigured,
      liveEnabledTruthy,
    });
  } else {
    const live = activation?.live && typeof activation.live === 'object' ? activation.live : null;
    const cursor = live?.cursor && typeof live.cursor === 'object' ? live.cursor : null;
    const cursorRunId =
      cursor?.runId ||
      cursor?.agentId ||
      (ops?.cursor_agent_url
        ? String(ops.cursor_agent_url).match(/\/agents\/([^/?#]+)/i)?.[1]
        : null);
    const activationStatus = String(ops?.activation_status || activation?.mode || 'unknown');
    const cursorApiAttempted =
      mode === 'cursor_live' &&
      (Boolean(cursorRunId) ||
        activationStatus === 'started' ||
        activationStatus === 'pr_opened' ||
        activationStatus === 'failed' ||
        activationStatus === 'blocked');

    evidence = buildDispatcherRunFinishedEvidence({
      runId: process.env.GITHUB_RUN_ID,
      runUrl: resolveRunUrl(),
      eventName: process.env.DISPATCHER_ACTIVATION_EVENT_NAME || process.env.GITHUB_EVENT_NAME,
      mode,
      headSha: process.env.GITHUB_SHA,
      activationStatus,
      selectedIssue: scan?.activationTargetIssue || ops?.target_issue || null,
      cursorRunId,
      cursorApiAttempted,
      readyIssues: resolveReadyIssues(scan),
      eligibleIssues: resolveEligibleIssues(scan),
      blocker: ops?.blocked_reason || null,
    });
  }

  fs.writeFileSync(path.resolve(args.outPath), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        schema: evidence.schema,
        phase: evidence.phase,
        outPath: args.outPath,
        controlIssue: args.issueNumber,
        dryRun: args.dryRun,
        workflow_run_id: evidence.workflow_run_id,
        cursor_live_enabled_configured: evidence.cursor_live_enabled_configured ?? null,
        cursor_live_enabled_truthy: evidence.cursor_live_enabled_truthy ?? null,
      },
      null,
      2,
    ),
  );

  if (args.dryRun || !token) {
    if (!token) console.log('GITHUB_TOKEN missing — evidence file written only');
    return;
  }

  try {
    const posted = await postGitHubIssueComment(args.issueNumber, String(evidence.markdown), {
      token,
      repoFullName: repo,
    });
    console.log(
      JSON.stringify(
        { comment_posted: true, issue: args.issueNumber, commentId: posted.commentId },
        null,
        2,
      ),
    );
  } catch (err) {
    // Evidence file remains; do not fail the whole activator on comment failure for started phase.
    console.error(
      `Evidence comment failed (non-fatal for file write): ${err instanceof Error ? err.message : String(err)}`,
    );
    if (args.phase === 'finished' && mode === 'cursor_live') {
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
