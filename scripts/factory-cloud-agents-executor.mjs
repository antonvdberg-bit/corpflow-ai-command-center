#!/usr/bin/env node
/**
 * Factory Handoff → Cursor Cloud Agents API v1.
 *
 * Runs only after the selector chose one source issue. It claims before the
 * API request and emits either correlated IN_PROGRESS evidence or a bounded
 * BLOCKED state; it never leaves a successful handoff ambiguous.
 */
import {
  addIssueLabelsApi,
  removeIssueLabelApi,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  acquireCursorIssueActivationClaim,
  releaseCursorIssueActivationClaim,
} from '../lib/server/cursor-activation-claim.js';
import {
  buildCloudAgentsExecutorEvidence,
  buildFactoryCloudAgentsCreatePayload,
  buildFactoryCloudAgentsExecutionEnvelope,
  formatCloudAgentsExecutorEvidence,
  redactCloudAgentsFailure,
  validateCloudAgentCreateResponse,
} from '../lib/server/factory-cloud-agents-executor.js';
import {
  createCursorCloudAgent,
  listCursorCloudAgentModels,
} from '../lib/server/cursor-cloud-agent-client.js';
import {
  fetchGitHubIssue,
} from '../lib/server/dispatcher-agent-activation.js';
import {
  postGitHubIssueComment,
} from '../lib/server/cursor-ops-status.js';

async function listGitHubIssueComments({ token, repo, issueNumber }) {
  const comments = [];
  const fetchFn = globalThis.fetch;
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`;
    const res = await fetchFn(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      throw new Error(`GitHub issue comments HTTP ${res.status}`);
    }
    const pageComments = await res.json();
    if (!Array.isArray(pageComments)) {
      throw new Error('GitHub issue comments response was not an array');
    }
    comments.push(...pageComments);
    if (pageComments.length < 100) break;
  }
  return comments;
}

const sourceIssue = Number(process.env.SOURCE_ISSUE || 0);
const handoffRunId = String(process.env.HANDOFF_RUN_ID || '').trim();
const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
const token = String(process.env.GITHUB_TOKEN || '').trim();
const apiKey = String(process.env.CURSOR_API_KEY || '').trim();
const currentMainSha = String(process.env.GITHUB_SHA || '').trim();

if (!Number.isInteger(sourceIssue) || sourceIssue < 1 || !handoffRunId || !repo || !token) {
  throw new Error('SOURCE_ISSUE, HANDOFF_RUN_ID, GITHUB_REPOSITORY, and GITHUB_TOKEN are required');
}

const comments = await listGitHubIssueComments({ token, repo, issueNumber: sourceIssue });
const issue = await fetchGitHubIssue(sourceIssue, { token, repoFullName: repo });
async function upsertCurrentRunEvidence(body) {
  const existing = [...comments].reverse().find((comment) =>
    /corpflow\.factory_cloud_agents_executor\.v1/i.test(String(comment?.body || '')),
  );
  if (existing?.id) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues/comments/${existing.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ body }),
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!response.ok) throw new Error(`GitHub compact lifecycle update HTTP ${response.status}`);
    return;
  }
  await postGitHubIssueComment(sourceIssue, body, { token, repoFullName: repo });
}
let envelope;
try {
  envelope = buildFactoryCloudAgentsExecutionEnvelope({
    sourceIssue,
    handoffRunId,
    repo,
    issue,
    comments,
  });
} catch (error) {
  const blocker = redactCloudAgentsFailure(error);
  await addIssueLabelsApi(token, repo, sourceIssue, ['dispatch:blocked']);
  await removeIssueLabelApi(token, repo, sourceIssue, 'dispatch:cursor-ready');
  await upsertCurrentRunEvidence(
    formatCloudAgentsExecutorEvidence({
      source_issue: sourceIssue,
      handoff_run_id: handoffRunId,
      status: 'BLOCKED',
      blocker,
      current_main_sha: currentMainSha,
    }),
  );
  throw error;
}

const claimResult = await acquireCursorIssueActivationClaim({
  token,
  repo,
  issueNumber: sourceIssue,
  labels: issue.labels,
  issueBody: issue.body,
  comments,
  workflowRunId: handoffRunId,
  markInProgress: false,
  // The compact current-run evidence comment below retains the claim/run
  // fields; separate claim ceremony comments are deliberately suppressed.
  listComments: () => listGitHubIssueComments({ token, repo, issueNumber: sourceIssue }),
});

if (claimResult.decision !== 'CLAIM_ACQUIRED') {
  // A winner may already be creating/running. Do not overwrite its durable
  // lifecycle with a false blocker merely because this duplicate lost.
  console.log(
    `Cloud Agents v1 duplicate suppressed for #${sourceIssue}: ${claimResult.reason || 'claim_not_acquired'}`,
  );
  process.exit(0);
}

let apiResult;
let validated;
try {
  if (!apiKey) throw new Error('CURSOR_API_KEY missing — Cloud Agents executor disabled (fail closed)');
  const resolvedCreate = buildFactoryCloudAgentsCreatePayload(
    envelope,
    await listCursorCloudAgentModels(apiKey),
  );
  envelope.create_payload = resolvedCreate.createPayload;
  envelope.model_selection = resolvedCreate.selected.model;
  apiResult = await createCursorCloudAgent(apiKey, envelope.create_payload);
  validated = validateCloudAgentCreateResponse(apiResult);
  if (!validated.ok) throw new Error(validated.reason);
} catch (error) {
  const blocker = redactCloudAgentsFailure(error);
  await releaseCursorIssueActivationClaim({
    token,
    repo,
    issueNumber: sourceIssue,
    claim: claimResult.claim,
  });
  // A failed paid run is a review stop, not a candidate for automatic
  // regeneration by Queue Reconcile or an implicit retry.
  await addIssueLabelsApi(token, repo, sourceIssue, ['dispatch:blocked']);
  await removeIssueLabelApi(token, repo, sourceIssue, 'dispatch:cursor-ready');
  await upsertCurrentRunEvidence(
    formatCloudAgentsExecutorEvidence({
      source_issue: sourceIssue,
      work_request_id: envelope.work_request_id,
      handoff_run_id: handoffRunId,
      status: 'BLOCKED',
      blocker,
      model_selection: envelope.model_selection || null,
      current_main_sha: currentMainSha,
      execution_tier: envelope.execution_tier,
    }),
  );
  throw error;
}

const startedAt = new Date().toISOString();
const details = validated.details;
await addIssueLabelsApi(token, repo, sourceIssue, ['status:in-progress']);
await upsertCurrentRunEvidence(
  formatCloudAgentsExecutorEvidence(
    buildCloudAgentsExecutorEvidence({
      source_issue: sourceIssue,
      work_request_id: envelope.work_request_id,
      handoff_run_id: handoffRunId,
      cursor_agent_id: details.agentId,
      cursor_run_id: details.runId,
      status: 'IN_PROGRESS',
      started_at: startedAt,
      packet_validation: envelope.packet_validation,
      model_selection: envelope.model_selection,
      current_main_sha: currentMainSha,
      execution_tier: envelope.execution_tier,
    }),
  ),
);
console.log(`Cloud Agents v1 created ${details.agentId} for source issue #${sourceIssue}`);
