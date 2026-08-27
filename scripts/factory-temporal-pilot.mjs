/**
 * CorpFlowAI Factory Temporal real-production pilot runner (#1130).
 *
 * GitHub Actions entry: inspect current GitHub delivery state with the existing
 * eligibility / WIP / generation / Cloud Agents helpers, then emit whether the
 * existing CorpFlowAI Cursor Factory Handoff reusable workflow should be called.
 *
 * Live Handoff wake stays fail-closed unless:
 *   - GitHub Actions repository variable CORPFLOW_TEMPORAL_PILOT=active
 *   - the exact #1130 approval marker is present
 *   - this process is GitHub Actions on main
 *
 * Does not POST the Cursor webhook, does not call the Cursor API, and does not
 * send Telegram / email / WhatsApp / SMS.
 *
 * Usage:
 *   node scripts/factory-temporal-pilot.mjs
 *   node scripts/factory-temporal-pilot.mjs --dry-run
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
  attachLinkedPullRequestsToIssues,
  fetchOpenPullRequestsForWip,
} from '../lib/server/cursor-wip-control.js';
import { hasRecentFactoryHandoff } from '../lib/server/factory-cursor-handoff.js';
import {
  FACTORY_TEMPORAL_PILOT_GITHUB_WORKFLOW_NAME,
  FACTORY_TEMPORAL_PILOT_SCHEMA,
  FACTORY_TEMPORAL_PILOT_WAKE_REASON,
  PILOT_ACTIVE_VARIABLE,
  PILOT_ACTIVE_VARIABLE_VALUE,
  PILOT_SOURCE_ISSUE,
  commentsHavePilotActivationApproval,
  createPilotRuntime,
  decideNextSafeAction,
  evaluateLiveActivationBoundary,
  formatPilotEvidenceComment,
} from '../lib/server/factory-temporal-pilot.js';
import { postGitHubIssueComment } from '../lib/server/cursor-ops-status.js';

const DEFAULT_REPO = 'antonvdberg-bit/corpflow-ai-command-center';
const DEFAULT_OUT = 'factory-temporal-pilot.json';

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    outPath: process.env.FACTORY_TEMPORAL_PILOT_OUT_PATH || DEFAULT_OUT,
  };
}

function appendOutput(lines) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) {
    for (const line of lines) console.log(`output:${line}`);
    return;
  }
  fs.appendFileSync(out, `${lines.join('\n')}\n`);
}

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || DEFAULT_REPO).trim();
  const ref = String(process.env.GITHUB_REF || process.env.GITHUB_REF_NAME || '').trim();
  const githubActions = String(process.env.GITHUB_ACTIONS || '').toLowerCase() === 'true';

  if (!token) {
    console.error('GITHUB_TOKEN required for factory Temporal pilot');
    process.exit(1);
  }

  let readyIssues = [];
  let claimedIssues = [];
  let closedClaimedIssues = [];
  let approvalComments = [];

  readyIssues = await discoverOpenIssuesByLabel(token, repo, DISPATCH_LABEL_READY);
  claimedIssues = await discoverOpenIssuesByLabel(token, repo, DISPATCH_LABEL_CLAIMED);
  try {
    closedClaimedIssues = await listClosedIssuesByLabelGraphql(token, repo, DISPATCH_LABEL_CLAIMED);
  } catch {
    closedClaimedIssues = [];
  }
  try {
    approvalComments = await listIssueComments(token, repo, PILOT_SOURCE_ISSUE);
  } catch {
    approvalComments = [];
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

  const trackedIssues = [...claimedIssues, ...closedClaimedIssues, ...readyIssues];
  try {
    attachLinkedPullRequestsToIssues(trackedIssues, await fetchOpenPullRequestsForWip(token, repo));
  } catch {
    // Fail soft — comments/labels still classify review inventory.
  }

  const plan = planCursorIssueClaims({
    readyIssues,
    claimedIssues,
    trackedIssues,
    preferIssueNumbers: [],
  });
  const targetIssueNumber = Number(plan.activationTargetIssue || 0) || null;
  const targetIssue =
    targetIssueNumber != null
      ? readyIssues.find((i) => Number(i.number) === targetIssueNumber) ||
        claimedIssues.find((i) => Number(i.number) === targetIssueNumber) ||
        null
      : null;
  const comments = Array.isArray(targetIssue?.comments) ? targetIssue.comments : [];
  const recentHandoff =
    targetIssueNumber != null ? hasRecentFactoryHandoff(comments, targetIssueNumber) : false;

  const decision = decideNextSafeAction({
    plan,
    claimedIssues,
    recentHandoff,
    labels: targetIssue?.labels,
    comments,
    issue: targetIssue,
  });

  const boundary = evaluateLiveActivationBoundary({
    comments: approvalComments,
    env: {
      ...process.env,
      [PILOT_ACTIVE_VARIABLE]: process.env[PILOT_ACTIVE_VARIABLE] || process.env.CORPFLOW_TEMPORAL_PILOT,
    },
    githubActions,
    ref,
  });
  const variableActive =
    String(process.env[PILOT_ACTIVE_VARIABLE] || '').trim().toLowerCase() ===
    PILOT_ACTIVE_VARIABLE_VALUE;
  const antonApproved = commentsHavePilotActivationApproval(approvalComments);
  const liveWakePermitted = boundary.wouldActivateOnApprovedGithubActions && variableActive && antonApproved;

  const shouldWakeHandoff =
    !args.dryRun &&
    liveWakePermitted &&
    decision.action === 'request_canonical_handoff' &&
    decision.sourceIssue != null;

  const runtime = createPilotRuntime();
  const snapshot = runtime.applyEvent({
    type: 'timer_reconcile',
    fingerprint: `gha:${process.env.GITHUB_RUN_ID || 'local'}:${targetIssueNumber || 'none'}`,
    sourceIssue: decision.sourceIssue || targetIssueNumber || PILOT_SOURCE_ISSUE,
    github: {
      plan,
      claimedIssues,
      recentHandoff,
      labels: targetIssue?.labels,
      comments,
      issue: targetIssue,
    },
  });

  if (shouldWakeHandoff && !args.dryRun) {
    try {
      await postGitHubIssueComment(
        Number(decision.sourceIssue),
        formatPilotEvidenceComment(snapshot),
        { token, repoFullName: repo },
      );
    } catch {
      // Evidence post is best-effort; Handoff wake still proceeds.
    }
  }

  const result = {
    schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
    workflowName: FACTORY_TEMPORAL_PILOT_GITHUB_WORKFLOW_NAME,
    wakeReason: FACTORY_TEMPORAL_PILOT_WAKE_REASON,
    dryRun: args.dryRun,
    liveWakePermitted,
    shouldWakeHandoff,
    should_wake_handoff: shouldWakeHandoff ? 1 : 0,
    source_issue: shouldWakeHandoff ? decision.sourceIssue : null,
    action: decision.action,
    reason: liveWakePermitted ? decision.reason : 'pilot_activation_fail_closed',
    decisionReason: decision.reason,
    availableSlots: plan.availableSlots,
    verifiedActiveCount: plan.verifiedActiveCount,
    boundary: {
      antonApproved,
      variableActive,
      githubActions,
      canActivateNow: boundary.canActivateNow,
      dispatchFromThisProcess: false,
      exactBlocker: boundary.exactBlocker,
    },
    metrics: snapshot.metrics,
    discovery: {
      readyCount: readyIssues.length,
      claimedCount: claimedIssues.length,
      eligibleIssueNumbers: plan.eligibleIssueNumbers,
      claimIssueNumbers: plan.claimIssueNumbers,
    },
  };

  const outPath = path.resolve(args.outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);

  appendOutput([
    `should_wake_handoff=${shouldWakeHandoff ? '1' : '0'}`,
    `source_issue=${shouldWakeHandoff ? decision.sourceIssue : ''}`,
    `reason=${result.reason}`,
  ]);

  console.log(
    JSON.stringify(
      {
        schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
        shouldWakeHandoff,
        source_issue: result.source_issue,
        reason: result.reason,
        action: decision.action,
        liveWakePermitted,
        outPath,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
