#!/usr/bin/env node
/**
 * Codex human-triggered specialist lifecycle (#661).
 *
 * prepare  — claim executor=codex + CODEX TRIGGER REQUIRED (AWAITING_HUMAN_TRIGGER)
 * watch    — poll PR GitHub evidence → RUNNING / COMPLETED / STALE / FAILED
 *
 * Env: GITHUB_TOKEN / GH_TOKEN, GITHUB_REPOSITORY
 *
 * Usage:
 *   node scripts/codex-specialist-lifecycle.mjs --prepare --issue=661 --pr=813 --instruction=review
 *   node scripts/codex-specialist-lifecycle.mjs --watch --issue=661 --poll-twice
 *   node scripts/codex-specialist-lifecycle.mjs --watch --issue=661 --dry-run
 */

import {
  buildCodexLifecycleState,
  findLatestCodexLifecycleState,
  formatCodexClaimComment,
  formatCodexCompletionEventComment,
  formatCodexLifecycleStateComment,
  parseCodexClaimsFromComments,
  prepareCodexSpecialistPacket,
  runCodexSpecialistLifecycleTick,
} from '../lib/server/codex-specialist-lifecycle.js';

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
    if (a === '--prepare') out.prepare = true;
    else if (a === '--watch') out.watch = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--poll-twice') out.pollTwice = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--issue=')) out.issue = a.slice('--issue='.length);
    else if (a.startsWith('--pr=')) out.pr = a.slice('--pr='.length);
    else if (a.startsWith('--instruction=')) out.instruction = a.slice('--instruction='.length);
    else if (a.startsWith('--purpose=')) out.purpose = a.slice('--purpose='.length);
    else if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length);
    else if (a.startsWith('--await-minutes=')) out.awaitMinutes = a.slice('--await-minutes='.length);
    else if (a.startsWith('--stale-minutes=')) out.staleMinutes = a.slice('--stale-minutes='.length);
    else if (a.startsWith('--bind-trigger-comment-id=')) {
      out.bindTriggerCommentId = a.slice('--bind-trigger-comment-id='.length);
    }
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
    'User-Agent': 'corpflow-codex-specialist-lifecycle',
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

async function getIssue(issue) {
  return gh('GET', `/repos/${OWNER}/${REPO_NAME}/issues/${issue}`);
}

async function getPull(pr) {
  return gh('GET', `/repos/${OWNER}/${REPO_NAME}/pulls/${pr}`);
}

async function getPrChecks(prNumber, headSha) {
  if (!headSha) return { conclusion: 'unknown', summary: 'no sha' };
  try {
    const data = await gh(
      'GET',
      `/repos/${OWNER}/${REPO_NAME}/commits/${headSha}/check-runs?per_page=50`,
    );
    const runs = Array.isArray(data?.check_runs) ? data.check_runs : [];
    if (runs.length === 0) return { conclusion: 'unknown', summary: 'no check runs' };
    const failed = runs.filter((r) => r.conclusion === 'failure' || r.conclusion === 'timed_out');
    const pending = runs.filter((r) => !r.conclusion || r.status !== 'completed');
    if (failed.length) return { conclusion: 'failure', summary: `${failed.length} failed` };
    if (pending.length) return { conclusion: 'pending', summary: `${pending.length} pending` };
    return { conclusion: 'success', summary: `${runs.length} completed` };
  } catch {
    return { conclusion: 'unknown', summary: 'checks unavailable' };
  }
}

async function listCommentReactions(commentId) {
  try {
    return await gh(
      'GET',
      `/repos/${OWNER}/${REPO_NAME}/issues/comments/${commentId}/reactions`,
    );
  } catch {
    return [];
  }
}

async function prepare(args) {
  const issue = Number(args.issue);
  const pr = Number(args.pr);
  if (!issue || !pr) {
    throw new Error('--prepare requires --issue=N and --pr=N');
  }
  const instruction = String(args.instruction || 'review');
  const purpose = String(args.purpose || 'Codex specialist packet');
  const issueData = await getIssue(issue);
  const prData = await getPull(pr);
  const comments = await listIssueComments(issue);
  const prep = prepareCodexSpecialistPacket({
    issueNumber: issue,
    prNumber: pr,
    instruction,
    purpose,
    prUrl: prData?.html_url || `https://github.com/${OWNER}/${REPO_NAME}/pull/${pr}`,
    labels: issueData?.labels,
    comments,
  });

  if (!prep.ok) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          decision: prep.decision,
          reason: prep.reason,
          blockingExecutor: prep.blockingExecutor || null,
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
    return;
  }

  if (args.dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, attempt: prep.attempt, prep }, null, 2));
    return;
  }

  await createIssueComment(issue, prep.comments.claim);
  await createIssueComment(issue, prep.comments.trigger);
  await createIssueComment(issue, prep.comments.state);
  await createIssueComment(issue, prep.comments.awaitEvent);

  console.log(
    JSON.stringify(
      {
        ok: true,
        decision: 'ACQUIRE',
        phase: 'AWAITING_HUMAN_TRIGGER',
        attempt: prep.attempt,
        recommended_comment: prep.claim.recommended_comment,
        trigger_notification: true,
        source_issue: issue,
        pr,
      },
      null,
      2,
    ),
  );
}

async function watchOnce(args, priorState) {
  const issue = Number(args.issue);
  if (!issue) throw new Error('--watch requires --issue=N');

  let state = priorState;
  if (!state) {
    const comments = await listIssueComments(issue);
    state = findLatestCodexLifecycleState(comments, { sourceIssue: issue });
    if (!state) {
      const claims = parseCodexClaimsFromComments(comments);
      const claim = claims[0];
      if (!claim) {
        throw new Error(`No Codex lifecycle state/claim on issue #${issue}; run --prepare first`);
      }
      state = buildCodexLifecycleState({
        sourceIssue: claim.source_issue,
        prNumber: claim.pr,
        attempt: claim.attempt,
        phase: claim.status || 'AWAITING_HUMAN_TRIGGER',
        recommendedComment: claim.recommended_comment,
        purpose: claim.purpose,
        awaitingSince: claim.claimed_at,
        startedAt: claim.claimed_at,
        triggerNotificationEmitted: true,
      });
    }
  }

  if (args.bindTriggerCommentId) {
    state = buildCodexLifecycleState({
      ...state,
      humanTriggerCommentId: Number(args.bindTriggerCommentId),
    });
  }

  const prNumber = state.pr;
  if (!prNumber) throw new Error('Lifecycle state missing PR number');

  const prData = await getPull(prNumber);
  const headSha = prData?.head?.sha || null;
  const prComments = await listIssueComments(prNumber);
  const checks = await getPrChecks(prNumber, headSha);

  let triggerReactions = [];
  const triggerId = state.human_trigger_comment_id;
  // Prefer bound / known id; else detect after tick will set it — pre-fetch if known
  if (triggerId) {
    triggerReactions = await listCommentReactions(triggerId);
  }

  const tick = runCodexSpecialistLifecycleTick({
    priorState: state,
    prComments,
    triggerReactions: Array.isArray(triggerReactions) ? triggerReactions : [],
    headSha,
    checkState: checks.conclusion,
    mode: args.mode === 'change' ? 'change' : 'review',
    awaitTriggerMinutes: args.awaitMinutes ? Number(args.awaitMinutes) : undefined,
    runningStaleMinutes: args.staleMinutes ? Number(args.staleMinutes) : undefined,
  });

  // If human trigger found this tick but we had no reactions yet, re-fetch once
  if (
    tick.humanTrigger?.id &&
    tick.phase !== 'COMPLETED' &&
    tick.phase !== 'FAILED' &&
    !triggerId
  ) {
    const reactions = await listCommentReactions(tick.humanTrigger.id);
    const tick2 = runCodexSpecialistLifecycleTick({
      priorState: tick.state,
      prComments,
      triggerReactions: Array.isArray(reactions) ? reactions : [],
      headSha,
      checkState: checks.conclusion,
      mode: args.mode === 'change' ? 'change' : 'review',
      awaitTriggerMinutes: args.awaitMinutes ? Number(args.awaitMinutes) : undefined,
      runningStaleMinutes: args.staleMinutes ? Number(args.staleMinutes) : undefined,
    });
    return { tick: tick2, headSha, checks };
  }

  return { tick, headSha, checks };
}

async function watch(args) {
  const issue = Number(args.issue);
  let prior = null;
  const runs = args.pollTwice ? 2 : 1;
  /** @type {unknown[]} */
  const results = [];

  for (let i = 0; i < runs; i += 1) {
    const { tick, headSha, checks } = await watchOnce(args, prior);
    prior = tick.state;

    if (!args.dryRun) {
      await createIssueComment(issue, formatCodexLifecycleStateComment(tick.state));
      if (tick.emittedCompletion && tick.event) {
        await createIssueComment(issue, formatCodexCompletionEventComment(tick.event));
        // Mark claim completed when terminal
        if (tick.phase === 'COMPLETED' || tick.phase === 'FAILED' || tick.phase === 'STALE') {
          const claimUpdate = formatCodexClaimComment({
            source_issue: tick.state.source_issue,
            executor: 'codex',
            pr: tick.state.pr,
            attempt: tick.state.attempt,
            status: tick.phase,
            recommended_comment: tick.state.recommended_comment,
            purpose: tick.state.purpose,
            claimed_at: tick.state.started_at || new Date().toISOString(),
            claim_token: `codex-${tick.state.source_issue}-${tick.state.attempt}`,
          });
          await createIssueComment(issue, claimUpdate);
        }
      }
    }

    results.push({
      poll: i + 1,
      phase: tick.phase,
      silent: tick.silent,
      emittedCompletion: tick.emittedCompletion,
      deduped: tick.deduped,
      human_trigger_comment_id: tick.humanTrigger?.id || tick.state.human_trigger_comment_id,
      acknowledgement: tick.acknowledgement,
      completion_kind: tick.completion?.kind || null,
      head_sha: headSha,
      checks: checks.conclusion,
      event_fingerprint: tick.event?.fingerprint || tick.state.completion_fingerprint,
      anton_required: tick.event?.anton_required ?? null,
    });
  }

  console.log(JSON.stringify({ ok: true, dryRun: Boolean(args.dryRun), results }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.prepare && !args.watch)) {
    console.log(`Usage:
  node scripts/codex-specialist-lifecycle.mjs --prepare --issue=N --pr=N [--instruction=review] [--purpose=...]
  node scripts/codex-specialist-lifecycle.mjs --watch --issue=N [--poll-twice] [--dry-run] [--mode=review|change]
`);
    process.exit(args.help ? 0 : 1);
  }
  if (args.prepare) await prepare(args);
  else await watch(args);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
