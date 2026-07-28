/**
 * Scan GitHub issues labelled dispatch:cursor-ready and enforce segregated
 * Cursor claim lifecycle (extends factory dispatcher; does not replace it).
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
  DISPATCH_LABEL_IN_PROGRESS,
  DISPATCH_LABEL_READY,
  formatDispatchClaimedComment,
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
    applyLabels: argv.includes('--apply-labels'),
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
 * @param {string} label
 * @param {typeof fetch} [fetchFn]
 */
async function listOpenIssuesByLabel(token, repo, label, fetchFn = globalThis.fetch) {
  const q = encodeURIComponent(`repo:${repo} is:issue is:open label:"${label}"`);
  const url = `https://api.github.com/search/issues?q=${q}&per_page=50`;
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
    throw new Error(`GitHub search HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text);
  const items = Array.isArray(json.items) ? json.items : [];
  return items.map((item) => ({
    number: Number(item.number),
    title: String(item.title || ''),
    body: String(item.body || ''),
    labels: Array.isArray(item.labels) ? item.labels : [],
    htmlUrl: item.html_url ? String(item.html_url) : null,
    updatedAt: item.updated_at ? String(item.updated_at) : null,
  }));
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

/**
 * @param {string} token
 * @param {string} repo
 * @param {number} issueNumber
 * @param {string[]} labels
 * @param {typeof fetch} [fetchFn]
 */
async function addIssueLabels(token, repo, issueNumber, labels, fetchFn = globalThis.fetch) {
  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/labels`;
  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ labels }),
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub add labels HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

/**
 * @param {string} token
 * @param {string} repo
 * @param {number} issueNumber
 * @param {string} label
 * @param {typeof fetch} [fetchFn]
 */
async function removeIssueLabel(token, repo, issueNumber, label, fetchFn = globalThis.fetch) {
  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`;
  const res = await fetchFn(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404) return { ok: true, missing: true };
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub remove label HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return { ok: true };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || DEFAULT_REPO).trim();
  const agentRunId =
    process.env.CURSOR_AGENT_RUN_ID ||
    process.env.GITHUB_RUN_ID ||
    process.env.CURSOR_CONVERSATION_ID ||
    null;

  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let readyIssues = [];
  /** @type {import('../lib/server/cursor-issue-dispatch-lifecycle.js').DispatchIssue[]} */
  let claimedIssues = [];

  if (!token) {
    console.log('GITHUB_TOKEN missing — emitting empty dry-run plan (fail soft for forks)');
  } else {
    readyIssues = await listOpenIssuesByLabel(token, repo, DISPATCH_LABEL_READY);
    claimedIssues = await listOpenIssuesByLabel(token, repo, DISPATCH_LABEL_CLAIMED);
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
      eligibleToClaim: decision.decision === 'claim',
      reason: decision.reason,
      nextAction:
        decision.decision === 'claim'
          ? `Claim on branch ${branch}; open separate PR; do not combine with sibling workstreams.`
          : decision.decision === 'reject'
            ? 'Leave blocked until label cleared.'
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
      reason: decision.reason,
      branch,
      classification: decision.classification,
      comments: {
        discovered,
        classification: classificationComment,
        claimed: null,
      },
      posted: [],
      skippedPosts: [],
      labelsApplied: [],
    };

    if (decision.decision === 'claim') {
      action.comments.claimed = formatDispatchClaimedComment({
        issueNumber,
        agentRunId,
        branch,
        workstream: decision.classification.productWorkstream || decision.classification.workTypes[0],
        tenantOrClient: decision.classification.tenantOrClient,
        environment: decision.classification.environment,
        protectedGate: decision.classification.protectedGate,
      });
    }

    /** @type {string[]} */
    let existingBodies = [];
    if ((args.applyComments || args.applyLabels) && token) {
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
        if (
          decision.decision === 'claim' &&
          action.comments.claimed &&
          !hasCommentMarker(existingBodies, 'CURSOR WORK CLAIMED')
        ) {
          const claimedBody = String(action.comments.claimed);
          const cl = await postGitHubIssueComment(issueNumber, claimedBody, {
            token,
            repoFullName: repo,
          });
          action.posted.push({ kind: 'claimed', ...cl });
        } else if (decision.decision === 'claim') {
          action.skippedPosts.push('claimed');
        }
      } catch (err) {
        action.commentError = err instanceof Error ? err.message : String(err);
      }
    }

    if (args.applyLabels && token && decision.decision === 'claim') {
      try {
        await addIssueLabels(token, repo, issueNumber, [
          DISPATCH_LABEL_CLAIMED,
          DISPATCH_LABEL_IN_PROGRESS,
        ]);
        await removeIssueLabel(token, repo, issueNumber, DISPATCH_LABEL_READY);
        action.labelsApplied = [DISPATCH_LABEL_CLAIMED, DISPATCH_LABEL_IN_PROGRESS];
        action.labelsRemoved = [DISPATCH_LABEL_READY];
      } catch (err) {
        action.labelError = err instanceof Error ? err.message : String(err);
      }
    }

    actions.push(action);
  }

  /** Stale claimed recovery (exception-only). */
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
        // Avoid repetitive heartbeat: skip if a stale request already exists.
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
    applyLabels: args.applyLabels,
    preferIssueNumbers: args.preferIssueNumbers,
    wipLimits: plan.wipLimits,
    claimedCount: plan.claimedCount,
    availableSlots: plan.availableSlots,
    claimIssueNumbers: plan.claimIssueNumbers,
    /** First claim only — preserves max-1 Cursor activation handoff to existing activator. */
    activationTargetIssue: plan.claimIssueNumbers[0] || null,
    actions,
  };

  fs.writeFileSync(path.resolve(args.outPath), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({
    schema: result.schema,
    claimIssueNumbers: result.claimIssueNumbers,
    activationTargetIssue: result.activationTargetIssue,
    actionCount: actions.length,
    outPath: args.outPath,
    dryRun: result.dryRun,
  }, null, 2));

  // Comment/label mutation failures are recorded but do not fail the scheduled
  // activator (labels may be missing until created). Exit 0 so activation can proceed.
  if (actions.some((a) => a.commentError || a.labelError)) {
    console.error('One or more comment/label mutations failed — see scan JSON (non-fatal)');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
