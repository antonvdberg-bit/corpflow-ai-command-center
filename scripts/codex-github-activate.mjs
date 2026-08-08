#!/usr/bin/env node
/**
 * Codex GitHub-native activate (#661 Option A).
 *
 * Claim executor=codex → identify bounded PR → post @codex as GITHUB_TOKEN identity.
 * Does not invent fake Codex run IDs. No OpenAI API keys. No auto-merge.
 *
 * Usage:
 *   node scripts/codex-github-activate.mjs --issue=661 --pr=813
 *   node scripts/codex-github-activate.mjs --issue=661 --pr=813 --mode=task --task="review the marker only"
 *   node scripts/codex-github-activate.mjs --issue=661 --pr=813 --skip-claim   # status-only path / proof
 */

import {
  SKIP_ALREADY_CLAIMED,
  acquireCodexIssueActivationClaim,
  evaluateCodexIssueActivationClaim,
} from '../lib/server/codex-activation-claim.js';
import { formatCodexTriggerComment } from '../lib/server/codex-github-lifecycle.js';

const REPO =
  process.env.GITHUB_REPOSITORY ||
  process.env.GITHUB_REPO ||
  'antonvdberg-bit/corpflow-ai-command-center';
const [OWNER, REPO_NAME] = REPO.split('/');
const API = 'https://api.github.com';

function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--skip-claim') out.skipClaim = true;
    else if (a.startsWith('--issue=')) out.issue = a.slice('--issue='.length);
    else if (a.startsWith('--pr=')) out.pr = a.slice('--pr='.length);
    else if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length);
    else if (a.startsWith('--task=')) out.task = a.slice('--task='.length);
    else if (a.startsWith('--attempt=')) out.attempt = a.slice('--attempt='.length);
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function ghToken() {
  return String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
}

/**
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 */
async function gh(method, path, body) {
  const token = ghToken();
  if (!token) throw new Error('GITHUB_TOKEN / GH_TOKEN missing');
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'corpflow-codex-github-activate',
  };
  /** @type {RequestInit} */
  const init = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new Error(`GitHub HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return json;
}

async function listIssueComments(issue) {
  const all = [];
  let page = 1;
  while (page <= 10) {
    const batch = await gh(
      'GET',
      `/repos/${OWNER}/${REPO_NAME}/issues/${issue}/comments?per_page=100&page=${page}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      'Usage: node scripts/codex-github-activate.mjs --issue=N --pr=N [--mode=review|task] [--skip-claim] [--dry-run]',
    );
    process.exit(0);
  }
  const issue = Number(args.issue);
  const pr = Number(args.pr);
  if (!issue || !pr) {
    console.error('Required: --issue=N --pr=N (bounded PR context is mandatory)');
    process.exit(2);
  }

  const token = ghToken();
  const issueMeta = await gh('GET', `/repos/${OWNER}/${REPO_NAME}/issues/${issue}`);
  const comments = await listIssueComments(issue);
  const attempt = args.attempt ? Number(args.attempt) : 1;
  const mode = args.mode === 'task' ? 'task' : 'review';

  if (!args.skipClaim) {
    if (args.dryRun) {
      const gate = evaluateCodexIssueActivationClaim({
        issueNumber: issue,
        labels: issueMeta.labels,
        issueBody: issueMeta.body,
        comments,
      });
      console.log(JSON.stringify({ dryRun: true, claimGate: gate }, null, 2));
      if (gate.decision === SKIP_ALREADY_CLAIMED) process.exit(0);
    } else {
      const claimResult = await acquireCodexIssueActivationClaim({
        token,
        repo: REPO,
        issueNumber: issue,
        labels: issueMeta.labels,
        issueBody: issueMeta.body,
        comments,
        prNumber: pr,
        workflowRunId: process.env.GITHUB_RUN_ID || null,
        postComment: async (issueNumber, body) => {
          await gh('POST', `/repos/${OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`, { body });
        },
        listComments: listIssueComments,
      });
      if (!claimResult.ok) {
        console.log(
          JSON.stringify(
            {
              ok: false,
              decision: claimResult.decision,
              reason: claimResult.reason,
              claimedBy: claimResult.claimedBy || null,
            },
            null,
            2,
          ),
        );
        process.exit(0);
      }
      console.log(
        JSON.stringify(
          {
            ok: true,
            decision: claimResult.decision,
            claim: claimResult.claim,
          },
          null,
          2,
        ),
      );
    }
  }

  const body = formatCodexTriggerComment({
    mode,
    task: typeof args.task === 'string' ? args.task : null,
    sourceIssue: issue,
    attempt,
  });

  if (args.dryRun) {
    console.log(JSON.stringify({ dryRun: true, wouldPost: body }, null, 2));
    process.exit(0);
  }

  const posted = await gh('POST', `/repos/${OWNER}/${REPO_NAME}/issues/${pr}/comments`, { body });
  console.log(
    JSON.stringify(
      {
        ok: true,
        decision: 'CODEX_TRIGGER_POSTED',
        pr,
        triggerCommentId: posted?.id || null,
        triggerAuthor: posted?.user?.login || null,
        htmlUrl: posted?.html_url || null,
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
