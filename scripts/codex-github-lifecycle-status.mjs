#!/usr/bin/env node
/**
 * Codex GitHub-native lifecycle status (#661 Option A).
 *
 * Polls GitHub PR evidence after an @codex trigger comment.
 * Emits corpflow.codex_completion_event.v1 once; second unchanged poll dedupes.
 *
 * Env: GITHUB_TOKEN / GH_TOKEN, GITHUB_REPOSITORY
 *
 * Usage:
 *   node scripts/codex-github-lifecycle-status.mjs --issue=661 --pr=813 --trigger-comment=5224386180
 *   node scripts/codex-github-lifecycle-status.mjs --issue=661 --pr=813 --poll-twice
 */

import {
  buildCodexCompletionEvent,
  buildCodexLifecycleIdentity,
  buildCodexLifecycleState,
  findLatestCodexLifecycleState,
  formatCodexCompletionEventComment,
  formatCodexLifecycleStateComment,
  inspectCodexGithubEvidence,
  isCodexTriggerComment,
  parseCodexCompletionEventFromText,
  parseCodexTriggerMarkerFromText,
  shouldEmitCodexCompletionEvent,
  shouldNotifyCodexCompletionEvent,
} from '../lib/server/codex-github-lifecycle.js';

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
    else if (a.startsWith('--issue=')) out.issue = a.slice('--issue='.length);
    else if (a.startsWith('--pr=')) out.pr = a.slice('--pr='.length);
    else if (a.startsWith('--trigger-comment=')) out.triggerComment = a.slice('--trigger-comment='.length);
    else if (a.startsWith('--attempt=')) out.attempt = a.slice('--attempt='.length);
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
    'User-Agent': 'corpflow-codex-github-lifecycle',
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

async function listCommentReactions(commentId) {
  return (
    (await gh(
      'GET',
      `/repos/${OWNER}/${REPO_NAME}/issues/comments/${commentId}/reactions`,
    )) || []
  );
}

async function listReviews(pr) {
  return (await gh('GET', `/repos/${OWNER}/${REPO_NAME}/pulls/${pr}/reviews`)) || [];
}

async function getPr(pr) {
  return gh('GET', `/repos/${OWNER}/${REPO_NAME}/pulls/${pr}`);
}

/**
 * Prefer explicit trigger id; else latest @codex trigger on the PR.
 * @param {Array<{ id?: number, body?: string, user?: { login?: string }, created_at?: string }>} comments
 * @param {number | null} explicitId
 */
function resolveTriggerComment(comments, explicitId) {
  if (explicitId) {
    const found = comments.find((c) => Number(c.id) === explicitId);
    if (found) return found;
  }
  const triggers = comments.filter((c) => isCodexTriggerComment(c.body || ''));
  return triggers.length ? triggers[triggers.length - 1] : null;
}

/**
 * @param {{
 *   issue: number,
 *   pr: number,
 *   triggerCommentId: number | null,
 *   attempt: number,
 *   staleMinutes: number,
 *   dryRun: boolean,
 * }} opts
 */
async function oneTick(opts) {
  const prMeta = await getPr(opts.pr);
  const prComments = await listIssueComments(opts.pr);
  const issueComments = opts.issue === opts.pr ? prComments : await listIssueComments(opts.issue);
  const trigger = resolveTriggerComment(prComments, opts.triggerCommentId);
  if (!trigger) {
    return {
      ok: false,
      error: 'no_trigger_comment',
      phase: 'PENDING',
    };
  }

  const reactions = await listCommentReactions(Number(trigger.id));
  const reviews = await listReviews(opts.pr);
  const marker = parseCodexTriggerMarkerFromText(trigger.body || '') || {};
  const attempt = opts.attempt || Number(marker.attempt) || 1;

  const evidence = inspectCodexGithubEvidence({
    triggerComment: trigger,
    comments: prComments,
    reactions,
    reviews,
    headSha: prMeta?.head?.sha || null,
    staleAfterMinutes: opts.staleMinutes,
  });

  const identity = buildCodexLifecycleIdentity({
    sourceIssue: opts.issue,
    prNumber: opts.pr,
    attempt,
    triggerCommentId: Number(trigger.id),
  });

  const prior = findLatestCodexLifecycleState(issueComments, identity.identity);
  const fingerprint = evidence.phase === 'COMPLETED' || evidence.phase === 'FAILED' || evidence.phase === 'STALE'
    ? [
        'codex_github_lifecycle',
        'codex',
        identity.identity,
        evidence.phase,
        evidence.headSha || 'no-sha',
        'unknown',
        evidence.codexTaskId || 'no-task',
      ].join('|')
    : null;

  const event =
    evidence.phase === 'COMPLETED' || evidence.phase === 'FAILED' || evidence.phase === 'STALE'
      ? buildCodexCompletionEvent({
          sourceIssue: opts.issue,
          prNumber: opts.pr,
          prUrl: prMeta?.html_url || null,
          attempt,
          triggerCommentId: Number(trigger.id),
          codexTaskUrl: evidence.codexTaskUrl,
          codexTaskId: evidence.codexTaskId,
          status: evidence.phase,
          headSha: evidence.headSha,
          ciResult: 'unknown',
          blocker: evidence.blocker,
          nextAction: evidence.nextAction,
          antonRequired: evidence.antonRequired,
          whatMoved: evidence.raw.resultPreview || evidence.phase,
          branch: prMeta?.head?.ref || null,
        })
      : null;

  const emit = event
    ? shouldEmitCodexCompletionEvent(
        prior?.completionFingerprint,
        event.fingerprint,
        Boolean(prior?.completionEventEmitted),
      )
    : false;

  // Also treat an identical completion event already on the issue as deduped.
  let alreadyPosted = false;
  if (event && !emit) {
    alreadyPosted = true;
  } else if (event) {
    for (const c of issueComments) {
      const parsed = parseCodexCompletionEventFromText(c.body || '');
      if (parsed?.fingerprint === event.fingerprint) {
        alreadyPosted = true;
        break;
      }
    }
  }

  const willPostEvent = Boolean(event && emit && !alreadyPosted);
  const notify = event ? shouldNotifyCodexCompletionEvent(event) : false;

  const nextState = buildCodexLifecycleState({
    sourceIssue: opts.issue,
    prNumber: opts.pr,
    attempt,
    triggerCommentId: Number(trigger.id),
    phase: evidence.phase,
    codexTaskUrl: evidence.codexTaskUrl,
    codexTaskId: evidence.codexTaskId,
    headSha: evidence.headSha,
    lastPolledAt: new Date().toISOString(),
    startedAt: prior?.startedAt || trigger.created_at || new Date().toISOString(),
    completedAt:
      evidence.phase === 'COMPLETED' || evidence.phase === 'FAILED' || evidence.phase === 'STALE'
        ? new Date().toISOString()
        : null,
    completionFingerprint: event?.fingerprint || prior?.completionFingerprint || null,
    completionEventEmitted: willPostEvent || alreadyPosted || Boolean(prior?.completionEventEmitted),
    blocker: evidence.blocker,
  });

  const actions = [];
  if (opts.dryRun) {
    actions.push('dry_run');
  } else {
    await gh('POST', `/repos/${OWNER}/${REPO_NAME}/issues/${opts.issue}/comments`, {
      body: formatCodexLifecycleStateComment(nextState),
    });
    actions.push('lifecycle_state_posted');
    if (willPostEvent && event) {
      await gh('POST', `/repos/${OWNER}/${REPO_NAME}/issues/${opts.issue}/comments`, {
        body: formatCodexCompletionEventComment(event),
      });
      actions.push('completion_event_posted');
    } else if (event && (alreadyPosted || !emit)) {
      actions.push('completion_event_deduped');
    }
  }

  return {
    ok: true,
    phase: evidence.phase,
    identity: identity.identity,
    triggerCommentId: Number(trigger.id),
    triggerAuthor: evidence.triggerAuthor,
    eyesReaction: evidence.eyesReaction,
    connectPrompt: evidence.connectPrompt,
    codexTaskUrl: evidence.codexTaskUrl,
    codexTaskId: evidence.codexTaskId,
    resultCommentId: evidence.resultCommentId,
    antonRequired: evidence.antonRequired,
    notify,
    actions,
    event: event || null,
    evidence,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/codex-github-lifecycle-status.mjs --issue=N --pr=N [--trigger-comment=ID] [--poll-twice]`);
    process.exit(0);
  }
  const issue = Number(args.issue);
  const pr = Number(args.pr);
  if (!issue || !pr) {
    console.error('Required: --issue=N --pr=N');
    process.exit(2);
  }
  const opts = {
    issue,
    pr,
    triggerCommentId: args.triggerComment ? Number(args.triggerComment) : null,
    attempt: args.attempt ? Number(args.attempt) : 1,
    staleMinutes: args.staleMinutes ? Number(args.staleMinutes) : 30,
    dryRun: Boolean(args.dryRun),
  };

  const first = await oneTick(opts);
  console.log(JSON.stringify({ poll: 1, ...first }, null, 2));
  if (args.pollTwice) {
    const second = await oneTick(opts);
    console.log(JSON.stringify({ poll: 2, ...second }, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
