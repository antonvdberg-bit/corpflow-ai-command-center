/**
 * Scan GitHub issues labelled dispatch:cursor-ready and enforce segregated
 * Cursor claim lifecycle (extends factory dispatcher; does not replace it).
 *
 * Discovery uses GraphQL (or paginated Issues API + client-side label filter).
 * Search API is not used — colon labels return zero results.
 *
 * Claim labels are NOT applied here — only after Cursor API returns a real run ID
 * (see scripts/cursor-issue-dispatch-finalize.mjs).
 *
 * Usage:
 *   node scripts/cursor-issue-dispatch-scan.mjs --dry-run
 *   node scripts/cursor-issue-dispatch-scan.mjs --apply-comments
 *   node scripts/cursor-issue-dispatch-scan.mjs --prefer 653,654
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_READY,
  discoverOpenIssuesByLabel,
  formatDispatchDiscoveredComment,
  formatWorkClassificationComment,
  isClaimStale,
  formatStaleWorkStatusRequest,
  planCursorIssueClaims,
  suggestIssueBranchName,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { postGitHubIssueComment } from '../lib/server/cursor-ops-status.js';

const DEFAULT_REPO = 'antonvdberg-bit/corpflow-ai-command-center';
const RESULT_PATH = 'cursor-issue-dispatch-scan.json';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const preferArg = argv.find((a) => a.startsWith('--prefer='));
  const preferInline = preferArg ? preferArg.slice('--prefer='.length) : '';
  const preferIdx = argv.indexOf('--prefer');
  const preferPositional =
    preferIdx >= 0 && argv[preferIdx + 1] && !argv[preferIdx + 1].startsWith('--')
      ? argv[preferIdx + 1]
      : '';
  const preferRaw = preferInline || preferPositional || process.env.DISPATCH_PREFER_ISSUES || '';

  return {
    dryRun: argv.includes('--dry-run') || !argv.includes('--apply-comments'),
    applyComments: argv.includes('--apply-comments'),
    preferIssueNumbers: preferRaw
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0),
    outPath: process.env.CURSOR_ISSUE_DISPATCH_SCAN_PATH || RESULT_PATH,
  };
}

/**
 * @param {string} token
 * @param {string} repo
 * @param {number} issueNumber
 * @param {typeof fetch} [fetchFn]
 */
async function listIssueCommentBodies(token, repo, issueNumber, fetchFn = globalThis.fetch) {
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
  return (Array.isArray(json) ? json : []).map((c) => String(c.body || ''));
}

/**
 * @param {string[]} bodies
 * @param {string} marker
 */
function hasCommentMarker(bodies, marker) {
  return bodies.some((body) => body.includes(marker));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || DEFAULT_REPO).trim();

  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let readyIssues = [];
  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let claimedIssues = [];
  /** @type {Record<string, unknown>} */
  const discovery = {
    method: token ? 'graphql_or_rest' : 'none',
    readyLabel: DISPATCH_LABEL_READY,
    claimedLabel: DISPATCH_LABEL_CLAIMED,
    readyCount: 0,
    claimedCount: 0,
    readyIssueNumbers: [],
    claimedIssueNumbers: [],
  };

  if (!token) {
    console.log('GITHUB_TOKEN missing — emitting empty dry-run plan (fail soft for forks)');
  } else {
    readyIssues = await discoverOpenIssuesByLabel(token, repo, DISPATCH_LABEL_READY);
    claimedIssues = await discoverOpenIssuesByLabel(token, repo, DISPATCH_LABEL_CLAIMED);
    discovery.readyCount = readyIssues.length;
    discovery.claimedCount = claimedIssues.length;
    discovery.readyIssueNumbers = readyIssues.map((i) => Number(i.number));
    discovery.claimedIssueNumbers = claimedIssues.map((i) => Number(i.number));
  }

  const plan = planCursorIssueClaims({
    readyIssues,
    claimedIssues,
    preferIssueNumbers: args.preferIssueNumbers,
  });

  /** @type {Array<Record<string, unknown>>} */
  const actions = [];

  for (const decision of plan.decisions) {
    const issueNumber = Number(decision.issue.number);
    const branch = suggestIssueBranchName(issueNumber, decision.classification);
    const priority =
      (decision.issue.labels || [])
        .map((l) => (typeof l === 'string' ? l : l?.name || ''))
        .find((name) => /^priority:/i.test(String(name)) || /^P0$/i.test(String(name))) ||
      'unspecified';

    const discovered = formatDispatchDiscoveredComment({
      issueNumber,
      priority: String(priority),
      classificationComplete: true,
      eligibleToClaim: decision.eligibleToClaim,
      reason: decision.reason,
      nextAction:
        decision.decision === 'claim'
          ? `Eligible — await Cursor activation run ID before claim labels; branch ${branch}.`
          : decision.decision === 'reject'
            ? 'Leave blocked until label cleared.'
            : decision.eligibleToClaim
              ? 'Eligible but held this cycle (WIP/sequencing); re-scan after capacity clears.'
              : 'Hold claim; re-scan after WIP/gate clears.',
    });

    const classificationComment = formatWorkClassificationComment(
      issueNumber,
      decision.classification,
    );

    /** @type {Record<string, unknown>} */
    const action = {
      issue: issueNumber,
      decision: decision.decision,
      eligibleToClaim: decision.eligibleToClaim,
      reason: decision.reason,
      branch,
      classification: decision.classification,
      comments: {
        discovered,
        classification: classificationComment,
      },
      posted: [],
      skippedPosts: [],
    };

    /** @type {string[]} */
    let existingBodies = [];
    if (args.applyComments && token) {
      try {
        existingBodies = await listIssueCommentBodies(token, repo, issueNumber);
      } catch (err) {
        action.commentError = err instanceof Error ? err.message : String(err);
      }
    }

    if (args.applyComments && token && !action.commentError) {
      try {
        if (!hasCommentMarker(existingBodies, 'CURSOR DISPATCH DISCOVERED')) {
          const d = await postGitHubIssueComment(issueNumber, discovered, {
            token,
            repoFullName: repo,
          });
          action.posted.push({ kind: 'discovered', ...d });
        } else {
          action.skippedPosts.push('discovered');
        }
        if (!hasCommentMarker(existingBodies, 'WORK CLASSIFICATION')) {
          const c = await postGitHubIssueComment(issueNumber, classificationComment, {
            token,
            repoFullName: repo,
          });
          action.posted.push({ kind: 'classification', ...c });
        } else {
          action.skippedPosts.push('classification');
        }
      } catch (err) {
        action.commentError = err instanceof Error ? err.message : String(err);
      }
    }

    actions.push(action);
  }

  for (const issue of claimedIssues) {
    if (!isClaimStale(issue)) continue;
    const body = formatStaleWorkStatusRequest(issue.number);
    const staleAction = {
      issue: issue.number,
      decision: 'stale_status_request',
      reason: 'claimed issue exceeded stale threshold',
      comments: { stale: body },
      posted: [],
      skippedPosts: [],
    };
    if (args.applyComments && token) {
      try {
        const existing = await listIssueCommentBodies(token, repo, issue.number);
        const recentStale = existing
          .filter((b) => b.includes('CURSOR STALE WORK STATUS REQUEST'))
          .slice(-1)[0];
        if (recentStale) {
          staleAction.skippedPosts.push('stale');
        } else {
          const posted = await postGitHubIssueComment(issue.number, body, {
            token,
            repoFullName: repo,
          });
          staleAction.posted.push({ kind: 'stale', ...posted });
        }
      } catch (err) {
        staleAction.commentError = err instanceof Error ? err.message : String(err);
      }
    }
    actions.push(staleAction);
  }

  const result = {
    schema: plan.schema,
    generatedAt: new Date().toISOString(),
    repo,
    dryRun: args.dryRun && !args.applyComments,
    applyComments: args.applyComments,
    preferIssueNumbers: args.preferIssueNumbers,
    discovery,
    wipLimits: plan.wipLimits,
    claimedCount: plan.claimedCount,
    availableSlots: plan.availableSlots,
    eligibleIssueNumbers: plan.eligibleIssueNumbers,
    claimIssueNumbers: plan.claimIssueNumbers,
    activationTargetIssue: plan.activationTargetIssue,
    actions,
  };

  fs.writeFileSync(path.resolve(args.outPath), `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        schema: result.schema,
        discovery: result.discovery,
        eligibleIssueNumbers: result.eligibleIssueNumbers,
        claimIssueNumbers: result.claimIssueNumbers,
        activationTargetIssue: result.activationTargetIssue,
        actionCount: actions.length,
        outPath: args.outPath,
        dryRun: result.dryRun,
      },
      null,
      2,
    ),
  );

  if (actions.some((a) => a.commentError)) {
    console.error('One or more comment mutations failed — see scan JSON (non-fatal)');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
