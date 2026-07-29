/**
 * CI failure / success supervisor CLI for GitHub Actions.
 *
 * Modes:
 *   --mode=failure  (default) — follow-up Cursor with sanitised CI packet
 *   --mode=success  — post operator-review packet when CI is green
 *   --mode=labels   — ensure lifecycle labels + claim issue when run ID known
 *
 * Env:
 *   GITHUB_TOKEN, GITHUB_REPOSITORY, CURSOR_API_KEY (failure mode live)
 *   CI_SUPERVISOR_WORKFLOW_RUN_ID, CI_SUPERVISOR_CONCLUSION, CI_SUPERVISOR_WORKFLOW_NAME
 *   CI_SUPERVISOR_PR_NUMBER (optional override)
 *   CI_SUPERVISOR_DRY_RUN=1
 */
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import {
  DISPATCH_LABEL_CI_REPAIR,
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_IN_PROGRESS,
  DISPATCH_LABEL_OPERATOR_REVIEW,
  DISPATCH_LABEL_READY,
  addIssueLabelsApi,
  ensureDispatchLifecycleLabels,
  finalizeIssueClaimAfterActivation,
  removeIssueLabelApi,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  buildCiFailurePacket,
  dispatchCiRepairToCursor,
  evaluateCiRepairGate,
  evaluateObsoleteFailureSuppression,
  evaluateRepairAttemptLimits,
  extractMeaningfulFailureContext,
  formatCiFailureFollowUpPrompt,
  formatCiRepairEscalationComment,
  recordRepairAttempt,
  redactSecrets,
} from '../lib/server/ci-failure-cursor-supervisor.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
  resolveCursorOriginMetadata,
} from '../lib/server/cursor-origin-metadata.js';
import {
  detectCompletionSignals,
  buildOperatorDecisionPacket,
  formatOperatorDecisionPacketMarkdown,
} from '../lib/server/operator-review-handoff.js';
import { normalizeCostUsageState, recordActivationUsage } from '../lib/server/agent-cost-controls.js';
import { postGitHubIssueComment } from '../lib/server/cursor-ops-status.js';

const DEFAULT_REPO = 'antonvdberg-bit/corpflow-ai-command-center';

function parseArgs(argv) {
  let mode = 'failure';
  for (const arg of argv) {
    if (arg.startsWith('--mode=')) mode = arg.slice('--mode='.length);
  }
  const modeIdx = argv.indexOf('--mode');
  if (modeIdx >= 0 && argv[modeIdx + 1] && !argv[modeIdx + 1].startsWith('--')) {
    mode = argv[modeIdx + 1];
  }
  return {
    mode: ['failure', 'success', 'labels'].includes(mode) ? mode : 'failure',
    dryRun: argv.includes('--dry-run') || process.env.CI_SUPERVISOR_DRY_RUN === '1',
    outPath: process.env.CI_SUPERVISOR_OUT_PATH || 'ci-supervisor-result.json',
    statePath: process.env.CI_REPAIR_STATE_PATH || '.ci-repair-state/state.json',
    costPath: process.env.CI_REPAIR_COST_PATH || '.ci-repair-state/cost-usage.json',
  };
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function ghJson(token, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...ghHeaders(token), ...(init.headers || {}) },
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status} ${url}: ${text.slice(0, 300)}`);
  return json;
}

async function resolveWorkflowRun(token, repo, runId) {
  return ghJson(token, `https://api.github.com/repos/${repo}/actions/runs/${runId}`);
}

async function resolvePrFromWorkflowRun(token, repo, runId, workflowRun = null) {
  const pullRequests = await ghJson(
    token,
    `https://api.github.com/repos/${repo}/actions/runs/${runId}/pulls`,
  ).catch(() => []);
  if (Array.isArray(pullRequests) && pullRequests[0]) return pullRequests[0];

  const run = workflowRun || (await resolveWorkflowRun(token, repo, runId));
  if (run.pull_requests?.[0]?.number) {
    return ghJson(token, `https://api.github.com/repos/${repo}/pulls/${run.pull_requests[0].number}`);
  }
  const sha = run.head_sha;
  const prs = await ghJson(
    token,
    `https://api.github.com/repos/${repo}/commits/${sha}/pulls`,
  ).catch(() => []);
  if (Array.isArray(prs) && prs[0]) return prs[0];
  return null;
}

/**
 * Download failed job logs (best-effort). Falls back to annotations.
 * @param {string} token
 * @param {string} repo
 * @param {string|number} runId
 */
async function loadFailedJobSummary(token, repo, runId) {
  const jobs = await ghJson(token, `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`);
  const failed = (jobs.jobs || []).find((j) => j.conclusion === 'failure') || null;
  if (!failed) {
    return { failedJob: null, failedStep: null, logExcerpt: '', rawLog: '' };
  }
  const failedStep =
    (failed.steps || []).find((s) => s.conclusion === 'failure')?.name || null;

  let rawLog = '';
  try {
    const logRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/jobs/${failed.id}/logs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(60000),
      },
    );
    if (logRes.ok) {
      const buf = Buffer.from(await logRes.arrayBuffer());
      try {
        rawLog = gunzipSync(buf).toString('utf8');
      } catch {
        rawLog = buf.toString('utf8');
      }
    }
  } catch {
    // ignore — annotations fallback
  }

  if (!rawLog) {
    try {
      const annotations = await ghJson(
        token,
        `https://api.github.com/repos/${repo}/check-runs/${failed.id}/annotations`,
      ).catch(() => []);
      if (Array.isArray(annotations) && annotations.length) {
        rawLog = annotations
          .map((a) => `${a.path || ''}:${a.start_line || ''} ${a.message || ''}`)
          .join('\n');
      }
    } catch {
      // ignore
    }
  }

  if (!rawLog) {
    rawLog = `Failed job ${failed.name}; step ${failedStep || 'unknown'}.`;
  }

  const extracted = extractMeaningfulFailureContext(rawLog);
  return {
    failedJob: failed.name,
    failedStep,
    logExcerpt: extracted.logExcerpt || redactSecrets(rawLog).slice(0, 2500),
    rawLog,
    extracted,
  };
}

async function loadIssueComments(token, repo, issueNumber) {
  if (!issueNumber) return [];
  const comments = await ghJson(
    token,
    `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100`,
  ).catch(() => []);
  return Array.isArray(comments) ? comments : [];
}

async function loadIssueState(token, repo, issueNumber) {
  if (!issueNumber) return null;
  try {
    const issue = await ghJson(token, `https://api.github.com/repos/${repo}/issues/${issueNumber}`);
    return String(issue.state || 'open');
  } catch {
    return null;
  }
}

/**
 * Later Agent CI runs on the same PR (for later-green suppression).
 */
async function listLaterAgentCiRuns(token, repo, prNumber, failedRunId, failedCreatedAt) {
  const runs = await ghJson(
    token,
    `https://api.github.com/repos/${repo}/actions/runs?event=pull_request&per_page=30`,
  ).catch(() => ({ workflow_runs: [] }));
  const failedTs = failedCreatedAt ? Date.parse(failedCreatedAt) : NaN;
  const out = [];
  for (const run of runs.workflow_runs || []) {
    if (!/agent\s*ci/i.test(String(run.name || ''))) continue;
    const id = String(run.id);
    if (id === String(failedRunId)) continue;
    const prs = run.pull_requests || [];
    const touchesPr =
      prs.some((p) => Number(p.number) === Number(prNumber)) ||
      // When pull_requests empty (common), rely on head branch matching via commit pulls below.
      false;
    if (!touchesPr && prs.length) continue;
    const created = Date.parse(run.created_at || '');
    if (Number.isFinite(failedTs) && Number.isFinite(created) && created <= failedTs) continue;
    out.push({
      id: run.id,
      conclusion: run.conclusion,
      headSha: run.head_sha,
      createdAt: run.created_at,
      name: run.name,
    });
  }

  // Also resolve via PR check runs / commit list if empty.
  if (!out.length) {
    try {
      const prCommits = await ghJson(
        token,
        `https://api.github.com/repos/${repo}/pulls/${prNumber}/commits?per_page=20`,
      );
      const shas = (Array.isArray(prCommits) ? prCommits : []).map((c) => c.sha);
      for (const run of runs.workflow_runs || []) {
        if (!/agent\s*ci/i.test(String(run.name || ''))) continue;
        if (String(run.id) === String(failedRunId)) continue;
        if (!shas.includes(run.head_sha)) continue;
        const created = Date.parse(run.created_at || '');
        if (Number.isFinite(failedTs) && Number.isFinite(created) && created <= failedTs) continue;
        out.push({
          id: run.id,
          conclusion: run.conclusion,
          headSha: run.head_sha,
          createdAt: run.created_at,
          name: run.name,
        });
      }
    } catch {
      // ignore
    }
  }
  return out;
}

function readJsonState(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonState(filePath, data) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(data, null, 2)}\n`);
}

async function postPrComment(token, repo, prNumber, body) {
  return ghJson(token, `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
}

async function runFailureMode(args, ctx) {
  const { token, repo, runId, conclusion, workflowName } = ctx;
  if (!runId) {
    return { ok: false, error: 'CI_SUPERVISOR_WORKFLOW_RUN_ID required' };
  }

  const workflowRun = await resolveWorkflowRun(token, repo, runId);
  const failedHeadSha = String(workflowRun.head_sha || process.env.CI_SUPERVISOR_FAILED_HEAD_SHA || '').trim();

  const prOverride = Number(process.env.CI_SUPERVISOR_PR_NUMBER || 0);
  const pr = prOverride
    ? await ghJson(token, `https://api.github.com/repos/${repo}/pulls/${prOverride}`)
    : await resolvePrFromWorkflowRun(token, repo, runId, workflowRun);
  if (!pr) {
    return { ok: true, skipped: true, reason: 'no_pr_for_workflow_run', failedHeadSha };
  }

  const currentPrHeadSha = String(pr.head?.sha || '').trim();
  const issueComments = await loadIssueComments(token, repo, pr.number);
  const bodyIssueMatch =
    String(pr.body || '').match(/Tracks?\s+#(\d+)/i) ||
    String(pr.body || '').match(/Closes\s+#(\d+)/i) ||
    String(pr.body || '').match(/#(\d+)/);
  const guessedIssue = bodyIssueMatch ? Number(bodyIssueMatch[1]) : null;
  const sourceComments =
    guessedIssue && guessedIssue !== pr.number
      ? [...issueComments, ...(await loadIssueComments(token, repo, guessedIssue))]
      : issueComments;
  // Control-loop issue #661 often holds DISPATCHER RUN FINISHED with Cursor run ID.
  const controlComments = await loadIssueComments(token, repo, 661);
  const allOriginComments = [...sourceComments, ...controlComments];

  // Origin metadata must NOT use current PR head as the failed SHA.
  const origin = resolveCursorOriginMetadata({
    prBody: pr.body,
    comments: allOriginComments,
    prNumber: pr.number,
    branch: pr.head?.ref,
    headSha: failedHeadSha || null,
  });
  // Prefer the source issue that matches this PR when control comments mention multiple.
  if (guessedIssue && (!origin.sourceIssue || origin.sourceIssue === 661)) {
    origin.sourceIssue = guessedIssue;
  }
  // If run ID still missing, scan control comments for the matching selected source issue.
  if (!origin.cursorRunId && (origin.sourceIssue || guessedIssue)) {
    const want = Number(origin.sourceIssue || guessedIssue);
    for (const c of [...controlComments].reverse()) {
      const body = String(c.body || '');
      if (!body.includes(`Selected source issue: ${want}`) && !body.includes(`Issue: #${want}`)) {
        continue;
      }
      const m = body.match(/Cursor run ID:\s*(run-[0-9a-f-]{20,})/i);
      if (m) {
        origin.cursorRunId = m[1];
        break;
      }
    }
  }
  const sourceIssueNumber = origin.sourceIssue || guessedIssue;
  const sourceIssueState = await loadIssueState(token, repo, sourceIssueNumber);

  const laterRuns = await listLaterAgentCiRuns(
    token,
    repo,
    pr.number,
    runId,
    workflowRun.created_at,
  );

  const obsolete = evaluateObsoleteFailureSuppression({
    failedHeadSha,
    currentPrHeadSha,
    prState: pr.state,
    prMerged: Boolean(pr.merged),
    sourceIssueState,
    laterAgentCiRuns: laterRuns,
    workflowRunId: String(runId),
  });

  // Always load failure context for observability (even when obsolete/skipped).
  const jobSummary = await loadFailedJobSummary(token, repo, runId);
  const extracted = jobSummary.extracted || extractMeaningfulFailureContext(jobSummary.rawLog || '');
  const packet = buildCiFailurePacket({
    repo,
    sourceIssue: sourceIssueNumber,
    prNumber: pr.number,
    prUrl: pr.html_url,
    branch: pr.head?.ref,
    headSha: failedHeadSha,
    currentPrHeadSha,
    workflowName: workflowName || workflowRun.name || 'Agent CI',
    workflowRunId: String(runId),
    workflowRunUrl: `https://github.com/${repo}/actions/runs/${runId}`,
    failedJob: jobSummary.failedJob,
    failedStep: jobSummary.failedStep,
    failingTests: extracted.failingTests,
    failingTestFile: extracted.failingTestFile,
    suite: extracted.suite,
    subtest: extracted.subtest,
    assertionExcerpt: extracted.assertionExcerpt,
    logExcerpt: jobSummary.logExcerpt || extracted.logExcerpt,
    cursorAgentId: origin.cursorAgentId,
    cursorRunId: origin.cursorRunId,
  });

  if (obsolete.suppress) {
    return {
      ok: true,
      skipped: true,
      reason: obsolete.reason,
      pr: pr.number,
      failedHeadSha,
      currentPrHeadSha,
      obsolete,
      origin,
      packet,
    };
  }

  const gate = evaluateCiRepairGate({
    workflowConclusion: conclusion || workflowRun.conclusion || 'failure',
    workflowName: workflowName || workflowRun.name || 'Agent CI',
    prState: pr.state,
    origin,
  });
  if (!gate.allow) {
    return {
      ok: true,
      skipped: true,
      reason: gate.reason,
      pr: pr.number,
      failedHeadSha,
      currentPrHeadSha,
      origin,
      packet,
    };
  }
  const repairState = readJsonState(args.statePath, {
    schema: 'corpflow.ci_failure_cursor_supervisor.v1',
    attemptsByPr: {},
    fingerprintsSent: [],
    lastSentAtByPr: {},
    activeRepairAgentByPr: {},
    lastWorkflowRunIds: [],
  });
  const costState = normalizeCostUsageState(readJsonState(args.costPath, null));

  const limits = evaluateRepairAttemptLimits({
    packet,
    origin,
    repairState,
    costState,
  });
  if (!limits.allow) {
    if (limits.escalate) {
      const escalation = formatCiRepairEscalationComment(packet, {
        attempts: limits.attempts,
        reason: limits.reason,
      });
      if (!args.dryRun) {
        await postPrComment(token, repo, pr.number, escalation);
        if (packet.sourceIssue) {
          await postGitHubIssueComment(packet.sourceIssue, escalation, {
            token,
            repoFullName: repo,
          });
        }
      }
    }
    return {
      ok: true,
      skipped: true,
      reason: limits.reason,
      attempts: limits.attempts,
      packet,
      escalate: !!limits.escalate,
      failedHeadSha,
      currentPrHeadSha,
    };
  }

  const prompt = formatCiFailureFollowUpPrompt(packet);
  /** @type {Record<string, unknown>} */
  let dispatchResult = { mode: 'dry_run', ok: true, prompt };
  if (!args.dryRun) {
    const apiKey = String(process.env.CURSOR_API_KEY || '').trim();
    if (!apiKey) {
      return { ok: false, error: 'CURSOR_API_KEY missing', packet };
    }
    dispatchResult = await dispatchCiRepairToCursor({ apiKey, packet });
    const nextState = recordRepairAttempt(repairState, packet, {
      followUpRunId: dispatchResult.runId,
      agentId: dispatchResult.agentId || packet.cursorAgentId,
    });
    writeJsonState(args.statePath, nextState);
    writeJsonState(
      args.costPath,
      recordActivationUsage(costState, {
        provider: 'cursor',
        dedupeKey: `ci-repair:pr:${packet.prNumber}:${packet.failureFingerprint}`,
        objectRef: `pr:${packet.prNumber}`,
        category: 'ci-repair',
        activatedAt: new Date().toISOString(),
        issueNumber: packet.sourceIssue,
      }),
    );

    await ensureDispatchLifecycleLabels(token, repo);
    if (packet.sourceIssue) {
      await addIssueLabelsApi(token, repo, packet.sourceIssue, [
        DISPATCH_LABEL_CI_REPAIR,
        DISPATCH_LABEL_IN_PROGRESS,
      ]);
      await removeIssueLabelApi(token, repo, packet.sourceIssue, DISPATCH_LABEL_READY).catch(() => {});
      const meta = buildCursorOriginMetadata({
        ...origin,
        prNumber: packet.prNumber,
        branch: packet.branch,
        headSha: packet.headSha,
        followUpAttemptCount: limits.attempts + 1,
        lastFailureFingerprint: packet.failureFingerprint,
        lastFollowUpAt: new Date().toISOString(),
        lastFollowUpRunId: dispatchResult.runId || null,
        cursorAgentId: dispatchResult.agentId || packet.cursorAgentId,
        cursorRunId: packet.cursorRunId || origin.cursorRunId,
        cursorAgentUrl:
          origin.cursorAgentUrl ||
          (packet.cursorAgentId ? `https://cursor.com/agents/${packet.cursorAgentId}` : null),
      });
      await postGitHubIssueComment(packet.sourceIssue, formatCursorOriginMetadataComment(meta), {
        token,
        repoFullName: repo,
      });
    }
    await postPrComment(
      token,
      repo,
      pr.number,
      `CI REPAIR FOLLOW-UP SENT\n\nMode: ${dispatchResult.mode}\nCursor agent: ${dispatchResult.agentId || packet.cursorAgentId}\nCursor run (origin): ${packet.cursorRunId || 'n/a'}\nFollow-up run: ${dispatchResult.runId || 'n/a'}\nFailed head SHA: ${packet.headSha}\nFingerprint: ${packet.failureFingerprint}\nAttempt: ${limits.attempts + 1}\n\nSame-branch repair required. No replacement PR.`,
    );
  }

  return {
    ok: true,
    skipped: false,
    dryRun: args.dryRun,
    packet,
    failedHeadSha,
    currentPrHeadSha,
    dispatch: {
      mode: dispatchResult.mode,
      agentId: dispatchResult.agentId || null,
      runId: dispatchResult.runId || null,
    },
    promptPreview: prompt.slice(0, 800),
  };
}

async function runSuccessMode(args, ctx) {
  const { token, repo, runId, conclusion, workflowName } = ctx;
  if (String(conclusion).toLowerCase() !== 'success') {
    return { ok: true, skipped: true, reason: 'workflow_not_success' };
  }
  const workflowRun = runId ? await resolveWorkflowRun(token, repo, runId).catch(() => null) : null;
  const pr = await resolvePrFromWorkflowRun(token, repo, runId, workflowRun);
  if (!pr || pr.state !== 'open') {
    return { ok: true, skipped: true, reason: 'no_open_pr' };
  }
  const comments = await loadIssueComments(token, repo, pr.number);
  const bodyIssueMatch = String(pr.body || '').match(/#(\d+)/);
  const guessedIssue = bodyIssueMatch ? Number(bodyIssueMatch[1]) : null;
  const sourceComments =
    guessedIssue && guessedIssue !== pr.number
      ? [...comments, ...(await loadIssueComments(token, repo, guessedIssue))]
      : comments;
  const origin = resolveCursorOriginMetadata({
    prBody: pr.body,
    comments: sourceComments,
    prNumber: pr.number,
    branch: pr.head?.ref,
    headSha: pr.head?.sha,
  });
  if (!origin.cursorAgentId && !origin.cursorRunId) {
    return { ok: true, skipped: true, reason: 'not_cursor_lifecycle_pr' };
  }

  const signals = detectCompletionSignals({
    run: {
      issueNumber: origin.sourceIssue || guessedIssue,
      prNumber: pr.number,
      prUrl: pr.html_url,
      branch: pr.head?.ref,
      phase: 'operator_review',
    },
    pr: {
      number: pr.number,
      url: pr.html_url,
      checksPassing: true,
      linkedIssue: origin.sourceIssue || guessedIssue,
    },
  });
  signals.testsPassing = true;
  signals.kind = 'implementation_complete';
  signals.evidencePresent = true;
  signals.commitSha = pr.head?.sha || null;

  const packet = buildOperatorDecisionPacket(signals, {
    title: pr.title,
    businessOutcome: 'CI green on Cursor PR — operator review required (no auto-merge)',
  });
  const markdown = [
    'OPERATOR REVIEW REQUIRED — CI GREEN',
    '',
    `Source issue: ${origin.sourceIssue != null ? `#${origin.sourceIssue}` : guessedIssue ? `#${guessedIssue}` : 'n/a'}`,
    `PR: #${pr.number} ${pr.html_url}`,
    `Cursor agent: ${origin.cursorAgentId || 'n/a'}`,
    `Cursor run: ${origin.cursorRunId || 'n/a'}`,
    `Commit SHA: ${pr.head?.sha || 'n/a'}`,
    `Workflow: ${workflowName} run ${runId} — success`,
    `Preview URL: check Vercel check on the PR`,
    `Production status: not deployed by this loop`,
    '',
    'Protected approvals remaining: merge decision (Anton); no auto-merge.',
    '',
    'Exact Anton action: merge | close without merge | approval required | or none',
    '',
    formatOperatorDecisionPacketMarkdown(packet),
  ].join('\n');

  if (!args.dryRun) {
    await ensureDispatchLifecycleLabels(token, repo);
    await postPrComment(token, repo, pr.number, markdown);
    if (origin.sourceIssue || guessedIssue) {
      const issueNum = origin.sourceIssue || guessedIssue;
      await addIssueLabelsApi(token, repo, issueNum, [DISPATCH_LABEL_OPERATOR_REVIEW]);
      await removeIssueLabelApi(token, repo, issueNum, DISPATCH_LABEL_CI_REPAIR).catch(() => {});
      await postGitHubIssueComment(issueNum, markdown, { token, repoFullName: repo });
    }
  }

  return { ok: true, skipped: false, dryRun: args.dryRun, pr: pr.number, origin, packet };
}

async function runLabelsMode(args, ctx) {
  const { token, repo } = ctx;
  const issueNumber = Number(process.env.CI_SUPERVISOR_CLAIM_ISSUE || 0);
  const runId = String(process.env.CI_SUPERVISOR_CURSOR_RUN_ID || '').trim();
  const agentUrl = String(process.env.CI_SUPERVISOR_CURSOR_AGENT_URL || '').trim();
  const ensured = await ensureDispatchLifecycleLabels(token, repo);
  if (!issueNumber || !runId) {
    return { ok: true, labels: ensured, skipped: true, reason: 'missing_issue_or_run_id' };
  }
  if (args.dryRun) {
    return { ok: true, dryRun: true, wouldClaim: issueNumber, runId, labels: ensured };
  }
  const result = await finalizeIssueClaimAfterActivation({
    token,
    repo,
    issueNumber,
    agentRunId: runId,
    agentUrl: agentUrl || null,
    branch: process.env.CI_SUPERVISOR_BRANCH || null,
    postComment: async (num, body) =>
      postGitHubIssueComment(num, body, { token, repoFullName: repo }),
  });
  await addIssueLabelsApi(token, repo, issueNumber, [DISPATCH_LABEL_CLAIMED, DISPATCH_LABEL_IN_PROGRESS]);
  await removeIssueLabelApi(token, repo, issueNumber, DISPATCH_LABEL_READY).catch(() => {});
  const agentIdMatch = agentUrl.match(/\/agents\/([^/?#]+)/i);
  await postGitHubIssueComment(
    issueNumber,
    formatCursorOriginMetadataComment(
      buildCursorOriginMetadata({
        sourceIssue: issueNumber,
        cursorRunId: runId,
        cursorAgentId: agentIdMatch ? agentIdMatch[1] : null,
        cursorAgentUrl: agentUrl || null,
        branch: process.env.CI_SUPERVISOR_BRANCH || null,
        followUpAttemptCount: 0,
      }),
    ),
    { token, repoFullName: repo },
  );
  return { ok: true, claim: result, labels: ensured };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || DEFAULT_REPO).trim();
  const runId = String(
    process.env.CI_SUPERVISOR_WORKFLOW_RUN_ID || process.env.GITHUB_RUN_ID || '',
  ).trim();
  const conclusion = String(process.env.CI_SUPERVISOR_CONCLUSION || '').trim();
  const workflowName = String(process.env.CI_SUPERVISOR_WORKFLOW_NAME || 'Agent CI').trim();

  if (!token) throw new Error('GITHUB_TOKEN required');

  const ctx = { token, repo, runId, conclusion, workflowName };
  let result;
  if (args.mode === 'success') result = await runSuccessMode(args, ctx);
  else if (args.mode === 'labels') result = await runLabelsMode(args, ctx);
  else result = await runFailureMode(args, ctx);

  fs.writeFileSync(path.resolve(args.outPath), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ mode: args.mode, outPath: args.outPath, ...summarize(result) }, null, 2));
  if (result?.ok === false) process.exitCode = 1;
}

function summarize(result) {
  if (!result || typeof result !== 'object') return {};
  return {
    ok: result.ok,
    skipped: result.skipped || false,
    reason: result.reason || null,
    pr: result.pr || result.packet?.prNumber || null,
    failedHeadSha: result.failedHeadSha || result.packet?.headSha || null,
    currentPrHeadSha: result.currentPrHeadSha || result.packet?.currentPrHeadSha || null,
    cursorRunId: result.packet?.cursorRunId || result.origin?.cursorRunId || null,
    failingTestFile: result.packet?.failingTestFile || null,
    dispatchMode: result.dispatch?.mode || null,
    followUpRunId: result.dispatch?.runId || null,
  };
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
