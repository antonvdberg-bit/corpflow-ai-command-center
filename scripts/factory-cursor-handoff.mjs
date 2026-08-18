/**
 * CorpFlowAI Cursor Factory Handoff runner for GitHub Actions (#913).
 *
 * Selects exactly one eligible source issue using existing scan/WIP logic,
 * writes a durable handoff packet, optionally posts a source-issue comment,
 * and exits 0 only when a real handoff should wake Cursor Automation MODE B.
 *
 * Exit codes:
 *   0 — handoff published (workflow success → Automation wake)
 *   1 — no handoff / suppressed / wake rejected (workflow failure → no wake)
 *
 * Usage:
 *   node scripts/factory-cursor-handoff.mjs
 *   node scripts/factory-cursor-handoff.mjs --dry-run
 *
 * Env (GHA):
 *   GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SERVER_URL,
 *   EVENT_* / ACTIVATION_* mirrors used by factory-dispatcher-resolve-mode,
 *   FACTORY_HANDOFF_OUT_PATH, FACTORY_HANDOFF_POST_COMMENT=1
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_READY,
  discoverOpenIssuesByLabel,
  listClosedIssuesByLabelGraphql,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  resolveEffectiveActivationTarget,
  resolveFactoryDispatcherRunPlan,
} from '../lib/server/cursor-ready-event-dispatch.js';
import {
  attachLinkedPullRequestsToIssues,
  fetchOpenPullRequestsForWip,
} from '../lib/server/cursor-wip-control.js';
import {
  FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  formatFactoryHandoffComment,
  hasRecentFactoryHandoff,
  resolveFactoryHandoffDecision,
} from '../lib/server/factory-cursor-handoff.js';
import { postGitHubIssueComment } from '../lib/server/cursor-ops-status.js';

const DEFAULT_REPO = 'antonvdberg-bit/corpflow-ai-command-center';
const DEFAULT_OUT = 'factory-cursor-handoff.json';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    postComment:
      argv.includes('--post-comment') ||
      ['1', 'true', 'yes', 'on'].includes(
        String(process.env.FACTORY_HANDOFF_POST_COMMENT || '')
          .trim()
          .toLowerCase(),
      ),
    outPath: process.env.FACTORY_HANDOFF_OUT_PATH || DEFAULT_OUT,
  };
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function parseLabelNames(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string[]} lines
 */
function appendOutput(lines) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) {
    for (const line of lines) console.log(`output:${line}`);
    return;
  }
  fs.appendFileSync(out, `${lines.join('\n')}\n`);
}

/**
 * @param {string} token
 * @param {string} repo
 * @param {number} issueNumber
 * @param {typeof fetch} [fetchFn]
 */
async function listIssueComments(token, repo, issueNumber, fetchFn = globalThis.fetch) {
  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100`;
  const res = await fetchFn(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub list comments HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text);
  return (Array.isArray(json) ? json : []).map((c) => ({
    body: String(c?.body || ''),
    author: c?.user?.login ? String(c.user.login) : null,
    created_at: c?.created_at ? String(c.created_at) : null,
  }));
}

function buildWorkflowRunUrl() {
  const server = String(process.env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/$/, '');
  const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
  const runId = String(process.env.GITHUB_RUN_ID || '').trim();
  if (!repo || !runId) return null;
  return `${server}/${repo}/actions/runs/${runId}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || DEFAULT_REPO).trim();
  const workflowRunUrl = buildWorkflowRunUrl();

  const wakePlan = resolveFactoryDispatcherRunPlan({
    eventName: process.env.EVENT_NAME || process.env.GITHUB_EVENT_NAME,
    action: process.env.EVENT_ACTION,
    labelName: process.env.EVENT_LABEL,
    issueState: process.env.EVENT_ISSUE_STATE,
    issueNumber: process.env.EVENT_ISSUE_NUMBER,
    issueLabelNames: parseLabelNames(process.env.EVENT_ISSUE_LABELS),
    commentBody: process.env.EVENT_COMMENT_BODY,
    actorLogin: process.env.EVENT_ACTOR_LOGIN,
    commentAuthorAssociation: process.env.EVENT_COMMENT_AUTHOR_ASSOCIATION,
    activationModeInput: process.env.ACTIVATION_MODE_INPUT || 'cursor_live',
    smokeInternalInput: process.env.SMOKE_INTERNAL_INPUT,
    targetIssueInput: process.env.TARGET_ISSUE_INPUT,
    cursorLiveEnabled: process.env.CURSOR_LIVE_ENABLED || 'true',
    wakeReasonInput: process.env.WAKE_REASON_INPUT,
    capacityWakeRequested: process.env.CAPACITY_WAKE_REQUESTED,
  });

  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let readyIssues = [];
  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let claimedIssues = [];
  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let closedClaimedIssues = [];

  if (wakePlan.shouldRun && token) {
    readyIssues = await discoverOpenIssuesByLabel(token, repo, DISPATCH_LABEL_READY);
    claimedIssues = await discoverOpenIssuesByLabel(token, repo, DISPATCH_LABEL_CLAIMED);
    try {
      closedClaimedIssues = await listClosedIssuesByLabelGraphql(
        token,
        repo,
        DISPATCH_LABEL_CLAIMED,
      );
    } catch {
      closedClaimedIssues = [];
    }

    const needsComments = new Map();
    for (const issue of [...claimedIssues, ...closedClaimedIssues, ...readyIssues]) {
      needsComments.set(Number(issue.number), issue);
    }
    for (const issue of needsComments.values()) {
      try {
        issue.comments = await listIssueComments(token, repo, Number(issue.number));
      } catch {
        issue.comments = [];
      }
    }
  }

  const preferIssueNumbers = Array.isArray(wakePlan.preferIssueNumbers)
    ? [...wakePlan.preferIssueNumbers]
    : [];
  const manualTarget = String(wakePlan.manualTargetIssue || '').trim();
  if (manualTarget && !preferIssueNumbers.includes(Number(manualTarget))) {
    const n = Number(manualTarget);
    if (Number.isInteger(n) && n > 0) preferIssueNumbers.unshift(n);
  }

  const trackedIssues = [...claimedIssues, ...closedClaimedIssues, ...readyIssues];
  if (token) {
    try {
      attachLinkedPullRequestsToIssues(
        trackedIssues,
        await fetchOpenPullRequestsForWip(token, repo),
      );
    } catch {
      // Fail soft — comments/labels still classify operator-review inventory.
    }
  }
  const plan = planCursorIssueClaims({
    readyIssues,
    claimedIssues,
    trackedIssues,
    preferIssueNumbers,
  });

  const resolvedTarget = resolveEffectiveActivationTarget({
    manualTargetIssue: wakePlan.manualTargetIssue,
    eventIssueNumber: wakePlan.eventIssueNumber,
    scannedActivationTargetIssue: plan.activationTargetIssue,
    requireExactEventIssue: wakePlan.requireExactEventIssue,
    wakePath: wakePlan.path,
  });

  const targetIssueNumber = Number(resolvedTarget.targetIssue || 0) || null;
  const targetIssue =
    targetIssueNumber != null
      ? readyIssues.find((i) => Number(i.number) === targetIssueNumber) ||
        claimedIssues.find((i) => Number(i.number) === targetIssueNumber) ||
        null
      : null;
  const recentHandoff =
    targetIssueNumber != null
      ? hasRecentFactoryHandoff(targetIssue?.comments || [], targetIssueNumber)
      : false;

  const decision = resolveFactoryHandoffDecision({
    wakeShouldRun: wakePlan.shouldRun,
    wakeIgnoreReason: wakePlan.ignoreReason,
    wakeReason: wakePlan.wakeReason,
    wakePath: wakePlan.path,
    preferIssueNumbers,
    activate: resolvedTarget.activate,
    targetIssue: resolvedTarget.targetIssue,
    holdReason: resolvedTarget.holdReason,
    availableSlots: plan.availableSlots,
    verifiedActiveCount: plan.verifiedActiveCount,
    eligibleIssueNumbers: plan.eligibleIssueNumbers,
    capacityPacket: plan.capacityPacket,
    recentHandoff,
    workflowRunUrl,
    repo,
  });

  /** @type {Record<string, unknown>} */
  const result = {
    ...decision,
    dryRun: args.dryRun,
    discovery: {
      readyCount: readyIssues.length,
      claimedCount: claimedIssues.length,
      closedClaimedCount: closedClaimedIssues.length,
      readyIssueNumbers: readyIssues.map((i) => Number(i.number)),
      claimedIssueNumbers: claimedIssues.map((i) => Number(i.number)),
    },
    wakePlan: {
      shouldRun: wakePlan.shouldRun,
      path: wakePlan.path,
      wakeReason: wakePlan.wakeReason,
      ignoreReason: wakePlan.ignoreReason || null,
      eventIssueNumber: wakePlan.eventIssueNumber,
      preferIssueNumbers,
      requireExactEventIssue: wakePlan.requireExactEventIssue,
    },
    scan: {
      activationTargetIssue: plan.activationTargetIssue,
      availableSlots: plan.availableSlots,
      verifiedActiveCount: plan.verifiedActiveCount,
      eligibleIssueNumbers: plan.eligibleIssueNumbers,
      claimIssueNumbers: plan.claimIssueNumbers,
    },
    resolvedTarget,
    commentPosted: false,
  };

  if (decision.shouldSucceed && decision.source_issue && args.postComment && token && !args.dryRun) {
    const body = formatFactoryHandoffComment({
      sourceIssue: decision.source_issue,
      wakeReason: decision.wakeReason,
      wakePath: decision.wakePath,
      availableSlots: decision.availableSlots,
      verifiedActiveCount: decision.verifiedActiveCount,
      workflowRunUrl,
      workflowName: FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
      capacityPacket: decision.capacityPacket,
    });
    const posted = await postGitHubIssueComment(decision.source_issue, body, {
      token,
      repoFullName: repo,
    });
    result.commentPosted = Boolean(posted?.ok || posted?.id || posted?.url);
    result.comment = posted;
  }

  const outPath = path.resolve(args.outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);

  appendOutput([
    `has_handoff=${decision.has_handoff}`,
    `source_issue=${decision.source_issue || ''}`,
    `reason=${decision.reason}`,
    `should_succeed=${decision.shouldSucceed ? '1' : '0'}`,
  ]);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const summary = decision.shouldSucceed
      ? formatFactoryHandoffComment({
          sourceIssue: decision.source_issue,
          wakeReason: decision.wakeReason,
          wakePath: decision.wakePath,
          availableSlots: decision.availableSlots,
          verifiedActiveCount: decision.verifiedActiveCount,
          workflowRunUrl,
          capacityPacket: decision.capacityPacket,
        })
      : `# ${FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME}\n\nNo handoff published.\n\nReason: \`${decision.reason}\`\nSuppress: \`${decision.suppressReason || 'n/a'}\`\n`;
    fs.appendFileSync(summaryPath, `${summary}\n`);
  }

  console.log(
    JSON.stringify(
      {
        schema: decision.schema,
        shouldSucceed: decision.shouldSucceed,
        source_issue: decision.source_issue,
        reason: decision.reason,
        suppressReason: decision.suppressReason,
        availableSlots: decision.availableSlots,
        verifiedActiveCount: decision.verifiedActiveCount,
        outPath,
      },
      null,
      2,
    ),
  );

  if (!decision.shouldSucceed) {
    console.error(
      `Factory handoff not published (${decision.reason}${
        decision.suppressReason ? `: ${decision.suppressReason}` : ''
      }) — failing closed so Cursor Automation MODE B does not wake`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
