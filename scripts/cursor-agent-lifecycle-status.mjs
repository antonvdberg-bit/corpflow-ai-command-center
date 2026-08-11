#!/usr/bin/env node
/**
 * Cursor agent lifecycle status runner (issue #661).
 *
 * Polls Cursor Cloud Agents API for active agents discovered from:
 *   --agent-id=bc-… (explicit)
 *   --issue=N (read origin metadata + lifecycle state from issue comments)
 *
 * Persists lifecycle state + completion events as GitHub issue comments.
 * Silent on RUNNING/PENDING. Dedupe on second unchanged COMPLETED/FAILED/STALE poll.
 *
 * Env:
 *   CURSOR_API_KEY (required unless --dry-run)
 *   GITHUB_TOKEN / GH_TOKEN (required to read/write issue comments)
 *   GITHUB_REPOSITORY (owner/repo, default antonvdberg-bit/corpflow-ai-command-center)
 *
 * Usage:
 *   node scripts/cursor-agent-lifecycle-status.mjs --issue=123
 *   node scripts/cursor-agent-lifecycle-status.mjs --agent-id=bc-… --issue=123
 *   node scripts/cursor-agent-lifecycle-status.mjs --issue=123 --dry-run
 *   node scripts/cursor-agent-lifecycle-status.mjs --issue=123 --poll-twice   # dedupe proof
 */

import fs from 'node:fs';

import {
  buildCursorLifecycleState,
  findLatestLifecycleState,
  formatCursorLifecycleStateComment,
  runCursorAgentLifecycleTick,
} from '../lib/server/cursor-agent-lifecycle.js';
import { buildCapacityReleaseWakeRequest } from '../lib/server/cursor-ready-event-dispatch.js';
import { resolveCursorOriginMetadata } from '../lib/server/cursor-origin-metadata.js';

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
    else if (a === '--poll-twice') out.pollTwice = true;
    else if (a === '--allow-stale-follow-up') out.allowStaleFollowUp = true;
    else if (a === '--no-stale-follow-up') out.allowStaleFollowUp = false;
    else if (a.startsWith('--issue=')) out.issue = a.slice('--issue='.length);
    else if (a.startsWith('--agent-id=')) out.agentId = a.slice('--agent-id='.length);
    else if (a.startsWith('--stale-minutes=')) out.staleMinutes = a.slice('--stale-minutes='.length);
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
    'User-Agent': 'corpflow-cursor-lifecycle',
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

async function createIssueComment(issue, body) {
  return gh('POST', `/repos/${OWNER}/${REPO_NAME}/issues/${issue}/comments`, { body });
}

async function addIssueLabels(issue, labels) {
  return gh('POST', `/repos/${OWNER}/${REPO_NAME}/issues/${issue}/labels`, { labels });
}

/**
 * Remove labels one-by-one (404 on missing label is ignored).
 * @param {number} issue
 * @param {string[]} labels
 */
async function removeIssueLabels(issue, labels) {
  const list = Array.isArray(labels) ? labels : [];
  for (const label of list) {
    const encoded = encodeURIComponent(String(label));
    try {
      await gh('DELETE', `/repos/${OWNER}/${REPO_NAME}/issues/${issue}/labels/${encoded}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/HTTP 404/.test(msg)) throw err;
    }
  }
}

async function findPrForBranch(branch) {
  const q = encodeURIComponent(`repo:${OWNER}/${REPO_NAME} is:pr head:${branch}`);
  const data = await gh('GET', `/search/issues?q=${q}&per_page=5`);
  const item = Array.isArray(data?.items) ? data.items[0] : null;
  if (!item?.number) return null;
  const pr = await gh('GET', `/repos/${OWNER}/${REPO_NAME}/pulls/${item.number}`);
  return {
    number: item.number,
    url: pr.html_url || item.html_url,
    headSha: pr.head?.sha || null,
  };
}

async function getPrChecks(prNumber) {
  const pr = await gh('GET', `/repos/${OWNER}/${REPO_NAME}/pulls/${prNumber}`);
  const sha = pr.head?.sha;
  if (!sha) return { conclusion: null, summary: 'no_sha' };
  const checks = await gh(
    'GET',
    `/repos/${OWNER}/${REPO_NAME}/commits/${sha}/check-runs?per_page=50`,
  );
  const runs = Array.isArray(checks?.check_runs) ? checks.check_runs : [];
  if (runs.length === 0) {
    // fallback combined status
    try {
      const status = await gh('GET', `/repos/${OWNER}/${REPO_NAME}/commits/${sha}/status`);
      return {
        conclusion: status.state || null,
        summary: `legacy_status:${status.state || 'unknown'}`,
      };
    } catch {
      return { conclusion: null, summary: 'no_checks' };
    }
  }
  const failed = runs.some((r) => r.conclusion === 'failure' || r.conclusion === 'timed_out');
  const pending = runs.some((r) => r.status !== 'completed');
  if (failed) return { conclusion: 'failure', summary: 'check_runs_failure' };
  if (pending) return { conclusion: 'pending', summary: 'check_runs_pending' };
  const allSuccess = runs.every(
    (r) => r.conclusion === 'success' || r.conclusion === 'neutral' || r.conclusion === 'skipped',
  );
  return {
    conclusion: allSuccess ? 'success' : 'unknown',
    summary: `check_runs:${runs.length}`,
  };
}

async function findPrForIssue(issue) {
  const q = encodeURIComponent(`repo:${OWNER}/${REPO_NAME} is:pr is:open ${issue} in:title,body`);
  const data = await gh('GET', `/search/issues?q=${q}&per_page=5`);
  const items = Array.isArray(data?.items) ? data.items : [];
  const item =
    items.find((i) => String(i.title || '').includes(`#${issue}`) || String(i.body || '').includes(`#${issue}`)) ||
    items[0];
  if (!item?.number) return null;
  const pr = await gh('GET', `/repos/${OWNER}/${REPO_NAME}/pulls/${item.number}`);
  return {
    number: item.number,
    url: pr.html_url || item.html_url,
    headSha: pr.head?.sha || null,
    branch: pr.head?.ref || null,
  };
}

function buildGithubAdapter() {
  return {
    listIssueComments,
    createIssueComment,
    findPrForBranch,
    findPrForIssue,
    getPrChecks,
    addIssueLabels,
    removeIssueLabels,
  };
}

/**
 * Persist wake request for factory-dispatcher-activate (capacity backfill).
 * @param {ReturnType<typeof buildCapacityReleaseWakeRequest>} wake
 */
function writeCapacityWakeArtifact(wake) {
  const path =
    process.env.DISPATCHER_ELIGIBILITY_WAKE_PATH || 'dispatcher-eligibility-wake.json';
  fs.writeFileSync(path, `${JSON.stringify(wake, null, 2)}\n`, 'utf8');
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    fs.appendFileSync(
      out,
      `wake_dispatcher=${wake.shouldWake ? 'true' : 'false'}\nwake_reason=${wake.wakeReason || ''}\nwake_issue=${wake.issueNumber || ''}\n`,
    );
  }
}

/**
 * Discover agent id from issue comments / origin metadata.
 * @param {number} issue
 */
async function discoverAgentFromIssue(issue) {
  const comments = await listIssueComments(issue);
  const meta = resolveCursorOriginMetadata({
    comments,
    issueBody: '',
  });
  const life = findLatestLifecycleState(comments);
  return {
    comments,
    agentId: meta.cursorAgentId || life?.cursorAgentId || null,
    runId: meta.cursorRunId || life?.cursorRunId || null,
    priorState: life,
    meta,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/cursor-agent-lifecycle-status.mjs --issue=N [--agent-id=bc-…] [--dry-run] [--poll-twice]`);
    process.exit(0);
  }

  const issue = args.issue ? Number(args.issue) : null;
  if (!issue && !args.agentId) {
    console.error('Require --issue=N and/or --agent-id=bc-…');
    process.exit(2);
  }

  const dryRun = Boolean(args.dryRun);
  const apiKey = String(process.env.CURSOR_API_KEY || '').trim();
  if (!dryRun && !apiKey) {
    console.error('CURSOR_API_KEY missing (fail closed)');
    process.exit(2);
  }

  let agentId = args.agentId ? String(args.agentId).trim() : null;
  let priorState = null;
  /** @type {Array<{ body?: string }>} */
  let comments = [];

  if (issue) {
    const discovered = await discoverAgentFromIssue(issue);
    comments = discovered.comments;
    priorState = discovered.priorState;
    if (!agentId) agentId = discovered.agentId;
    if (!agentId) {
      console.error(`No Cursor agent ID found on issue #${issue} (origin metadata / lifecycle state)`);
      process.exit(3);
    }
    console.log(JSON.stringify({ discovered_agent_id: agentId, prior_phase: priorState?.phase || null }, null, 2));
  }

  if (!agentId) {
    console.error('agent id unresolved');
    process.exit(3);
  }

  if (!priorState) {
    priorState = buildCursorLifecycleState({
      cursorAgentId: agentId,
      sourceIssue: issue,
      phase: 'PENDING',
      startedAt: new Date().toISOString(),
    });
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry_run',
          agentId,
          issue,
          priorPhase: priorState.phase,
          would_poll: true,
          note: 'No Cursor API call',
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const github = issue ? buildGithubAdapter() : null;
  const allowStale =
    args.allowStaleFollowUp === false
      ? false
      : args.allowStaleFollowUp === true
        ? true
        : true;

  const tickOnce = async () =>
    runCursorAgentLifecycleTick({
      apiKey,
      agentId,
      sourceIssue: issue,
      priorState,
      startedAt: priorState.startedAt,
      staleAfterMinutes: args.staleMinutes ? Number(args.staleMinutes) : undefined,
      allowStaleFollowUp: allowStale,
      github: github || undefined,
    });

  const first = await tickOnce();
  console.log(
    JSON.stringify(
      {
        poll: 1,
        phase: first.phase,
        silent: first.silent,
        emittedCompletion: first.emittedCompletion,
        followUpSent: first.followUpSent,
        actions: first.actions,
        state: first.state,
        event: first.event,
      },
      null,
      2,
    ),
  );

  if (issue && first.state) {
    await createIssueComment(issue, formatCursorLifecycleStateComment(first.state));
  }

  /** @type {string[]} */
  let wakeActions = Array.isArray(first.actions) ? [...first.actions] : [];
  let wakePhase = first.phase;

  if (args.pollTwice) {
    priorState = first.state;
    const second = await tickOnce();
    const deduped =
      second.emittedCompletion === false &&
      (second.actions.includes('completion_event_deduped') ||
        second.silent ||
        (first.emittedCompletion && first.phase === second.phase));
    console.log(
      JSON.stringify(
        {
          poll: 2,
          phase: second.phase,
          silent: second.silent,
          emittedCompletion: second.emittedCompletion,
          actions: second.actions,
          dedupe_ok: Boolean(deduped || (first.phase === 'COMPLETED' && second.emittedCompletion === false)),
        },
        null,
        2,
      ),
    );
    if (issue && second.state) {
      await createIssueComment(issue, formatCursorLifecycleStateComment(second.state));
    }
    wakeActions = [...wakeActions, ...(Array.isArray(second.actions) ? second.actions : [])];
    wakePhase = second.phase || wakePhase;
  }

  const wake = buildCapacityReleaseWakeRequest({
    issueNumber: issue,
    actions: wakeActions,
    phase: wakePhase,
  });
  writeCapacityWakeArtifact(wake);
  console.log(
    JSON.stringify(
      {
        dispatcher_eligibility_wake: wake,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
