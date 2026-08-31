/**
 * CorpFlowAI Factory whole-queue reconciliation runner (#1023).
 *
 * Scheduled / manual GitHub Actions entry: scan current GitHub state with the
 * existing eligibility / WIP helpers, then emit whether the existing
 * CorpFlowAI Cursor Factory Handoff reusable workflow should be called.
 *
 * Always exits 0 after a successful scan (including "nothing to wake") so the
 * thin wrapper stays silent. Does not post issue comments, does not POST the
 * Cursor webhook, and does not send Telegram / email / WhatsApp / SMS.
 *
 * Usage:
 *   node scripts/factory-queue-reconcile.mjs
 *   node scripts/factory-queue-reconcile.mjs --dry-run
 *
 * Env (GHA):
 *   GITHUB_TOKEN, GITHUB_REPOSITORY, FACTORY_QUEUE_RECONCILE_OUT_PATH
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  DISPATCH_LABEL_BLOCKED,
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_IN_PROGRESS,
  DISPATCH_LABEL_READY,
  addIssueLabelsApi,
  discoverOpenIssuesByLabel,
  listClosedIssuesByLabelGraphql,
  planCursorIssueClaims,
  removeIssueLabelApi,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  attachLinkedPullRequestsToIssues,
  fetchOpenPullRequestsForWip,
} from '../lib/server/cursor-wip-control.js';
import { hasRecentFactoryHandoff } from '../lib/server/factory-cursor-handoff.js';
import {
  formatFactoryCursorHandoffReceiptComment,
  resolveFactoryCursorHandoffReceipt,
} from '../lib/server/factory-cursor-handoff-receipt.js';
import {
  findStaleReadyReviewIssueNumbers,
  resolveFactoryQueueReconcileDecision,
} from '../lib/server/factory-queue-reconcile.js';
import { formatCursorOriginMetadataComment } from '../lib/server/cursor-origin-metadata.js';
import { postGitHubIssueComment } from '../lib/server/cursor-ops-status.js';

const DEFAULT_REPO = 'antonvdberg-bit/corpflow-ai-command-center';
const DEFAULT_OUT = 'factory-queue-reconcile.json';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    outPath: process.env.FACTORY_QUEUE_RECONCILE_OUT_PATH || DEFAULT_OUT,
  };
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

async function reconcileHandoffReceipts(token, repo, readyIssues) {
  const outcomes = [];
  for (const issue of readyIssues) {
    const resolved = resolveFactoryCursorHandoffReceipt({
      sourceIssue: issue.number,
      issueBody: issue.body,
      comments: issue.comments,
    });
    if (!resolved.transition) continue;

    await postGitHubIssueComment(
      Number(issue.number),
      formatFactoryCursorHandoffReceiptComment(resolved.receipt),
      { token, repoFullName: repo },
    );

    if (resolved.transition === 'IN_PROGRESS') {
      if (resolved.origin) {
        await postGitHubIssueComment(
          Number(issue.number),
          formatCursorOriginMetadataComment(resolved.origin),
          { token, repoFullName: repo },
        );
      }
      await addIssueLabelsApi(
        token,
        repo,
        Number(issue.number),
        [DISPATCH_LABEL_CLAIMED, DISPATCH_LABEL_IN_PROGRESS],
      );
      await removeIssueLabelApi(token, repo, Number(issue.number), DISPATCH_LABEL_READY);
    } else {
      await addIssueLabelsApi(token, repo, Number(issue.number), [DISPATCH_LABEL_BLOCKED]);
      await removeIssueLabelApi(token, repo, Number(issue.number), DISPATCH_LABEL_READY);
    }

    outcomes.push({
      source_issue: Number(issue.number),
      state: resolved.receipt.state,
      blocker: resolved.receipt.blocker,
      cursor_agent_id: resolved.receipt.cursor_agent_id,
    });
  }
  return outcomes;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || DEFAULT_REPO).trim();

  if (!token) {
    console.error('GITHUB_TOKEN required for factory queue reconcile');
    process.exit(1);
  }

  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let readyIssues = [];
  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let claimedIssues = [];
  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let closedClaimedIssues = [];

  readyIssues = await discoverOpenIssuesByLabel(token, repo, DISPATCH_LABEL_READY);
  claimedIssues = await discoverOpenIssuesByLabel(token, repo, DISPATCH_LABEL_CLAIMED);
  try {
    closedClaimedIssues = await listClosedIssuesByLabelGraphql(token, repo, DISPATCH_LABEL_CLAIMED);
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

  const receiptOutcomes = args.dryRun
    ? []
    : await reconcileHandoffReceipts(token, repo, readyIssues);
  const receiptIssueNumbers = new Set(receiptOutcomes.map((outcome) => outcome.source_issue));
  for (const outcome of receiptOutcomes.filter((item) => item.state === 'IN_PROGRESS')) {
    const issue = readyIssues.find((candidate) => Number(candidate.number) === outcome.source_issue);
    if (!issue) continue;
    issue.labels = [
      ...(Array.isArray(issue.labels) ? issue.labels : []).filter(
        (label) => String(label).toLowerCase() !== DISPATCH_LABEL_READY,
      ),
      DISPATCH_LABEL_CLAIMED,
      DISPATCH_LABEL_IN_PROGRESS,
    ];
    issue.comments = [
      ...(Array.isArray(issue.comments) ? issue.comments : []),
      {
        body: formatCursorOriginMetadataComment({
          sourceIssue: outcome.source_issue,
          cursorAgentId: outcome.cursor_agent_id,
        }),
      },
    ];
    claimedIssues.push(issue);
  }
  readyIssues = readyIssues.filter((issue) => !receiptIssueNumbers.has(Number(issue.number)));

  const trackedIssues = [...claimedIssues, ...closedClaimedIssues, ...readyIssues];
  try {
    attachLinkedPullRequestsToIssues(trackedIssues, await fetchOpenPullRequestsForWip(token, repo));
  } catch {
    // Fail soft — comments/labels still classify operator-review inventory.
  }

  const plan = planCursorIssueClaims({
    readyIssues,
    claimedIssues,
    trackedIssues,
    wipLimits: { maxActiveCursorImplementationIssues: 1 },
    preferIssueNumbers: [],
    wakeReason: 'scheduled_reconciliation',
    activationLane: 'ordinary',
  });
  const staleReadyReviewIssueNumbers = findStaleReadyReviewIssueNumbers(plan);
  if (!args.dryRun) {
    for (const issueNumber of staleReadyReviewIssueNumbers) {
      await removeIssueLabelApi(token, repo, issueNumber, DISPATCH_LABEL_READY);
    }
  }

  const targetIssueNumber = Number(plan.activationTargetIssue || 0) || null;
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

  const decision = resolveFactoryQueueReconcileDecision({
    plan,
    claimedIssues,
    recentHandoff,
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
      staleReadyReviewIssueNumbers,
    },
    scan: {
      activationTargetIssue: plan.activationTargetIssue,
      availableSlots: plan.availableSlots,
      verifiedActiveCount: plan.verifiedActiveCount,
      eligibleIssueNumbers: plan.eligibleIssueNumbers,
      claimIssueNumbers: plan.claimIssueNumbers,
    },
    handoffReceiptOutcomes: receiptOutcomes,
  };

  const outPath = path.resolve(args.outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);

  appendOutput([
    `should_wake_handoff=${decision.should_wake_handoff}`,
    `source_issue=${decision.source_issue || ''}`,
    `reason=${decision.reason}`,
  ]);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const summary = decision.shouldWakeHandoff
      ? `# ${decision.workflowName}\n\nWill workflow_call \`${decision.handoffWorkflowName}\` for #${decision.source_issue}.\n\nReason: \`${decision.reason}\`\n`
      : `# ${decision.workflowName}\n\nSilent success — no Handoff wake.\n\nReason: \`${decision.reason}\`\n`;
    fs.appendFileSync(summaryPath, `${summary}\n`);
  }

  console.log(
    JSON.stringify(
      {
        schema: decision.schema,
        shouldWakeHandoff: decision.shouldWakeHandoff,
        source_issue: decision.source_issue,
        reason: decision.reason,
        availableSlots: decision.availableSlots,
        verifiedActiveCount: decision.verifiedActiveCount,
        outPath,
      },
      null,
      2,
    ),
  );

  if (decision.shouldWakeHandoff) {
    console.log(
      `Queue reconcile: workflow_call ${decision.handoffWorkflowName} for #${decision.source_issue}`,
    );
  } else {
    console.log(`Queue reconcile: silent success (${decision.reason})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
