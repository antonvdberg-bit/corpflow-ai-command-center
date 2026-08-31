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
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
  releaseCursorIssueActivationClaim,
} from '../lib/server/cursor-activation-claim.js';
import {
  buildCloudAgentsExecutorEvidence,
  buildCloudAgentsWorkStatus,
  buildFactoryCloudAgentsExecutionEnvelope,
  formatCloudAgentsExecutorEvidence,
  redactCloudAgentsFailure,
  validateCloudAgentCreateResponse,
} from '../lib/server/factory-cloud-agents-executor.js';
import {
  formatAiWorkRequestComment,
  formatAiWorkRequestStatusComment,
} from '../lib/server/ai-work-request-lifecycle.js';
import { createCursorCloudAgent } from '../lib/server/cursor-cloud-agent-client.js';
import { formatCursorOriginMetadataComment } from '../lib/server/cursor-origin-metadata.js';
import {
  buildFactoryCursorHandoffReceipt,
  formatFactoryCursorHandoffReceiptComment,
} from '../lib/server/factory-cursor-handoff-receipt.js';
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

if (!Number.isInteger(sourceIssue) || sourceIssue < 1 || !handoffRunId || !repo || !token) {
  throw new Error('SOURCE_ISSUE, HANDOFF_RUN_ID, GITHUB_REPOSITORY, and GITHUB_TOKEN are required');
}

const post = (body) =>
  postGitHubIssueComment(sourceIssue, body, { token, repoFullName: repo });
const comments = await listGitHubIssueComments({ token, repo, issueNumber: sourceIssue });
const issue = await fetchGitHubIssue(sourceIssue, { token, repoFullName: repo });
const envelope = buildFactoryCloudAgentsExecutionEnvelope({
  sourceIssue,
  handoffRunId,
  repo,
  issue,
  comments,
});

if (envelope.request_was_created) {
  await post(formatAiWorkRequestComment(envelope.request));
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
  postComment: (_issueNumber, body) => post(body),
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
    postComment: (_issueNumber, body) => post(body),
  });
  // A failed paid run is a review stop, not a candidate for automatic
  // regeneration by Queue Reconcile or an implicit retry.
  await addIssueLabelsApi(token, repo, sourceIssue, ['dispatch:blocked']);
  await removeIssueLabelApi(token, repo, sourceIssue, 'dispatch:cursor-ready');
  await post(
    formatFactoryCursorHandoffReceiptComment(
      buildFactoryCursorHandoffReceipt({
        sourceIssue,
        handoffRunId,
        state: 'BLOCKED',
        blocker,
      }),
    ),
  );
  await post(
    formatAiWorkRequestStatusComment(
      buildCloudAgentsWorkStatus(envelope, { apiResult: null, blocker }),
    ),
  );
  await post(
    formatCloudAgentsExecutorEvidence({
      source_issue: sourceIssue,
      work_request_id: envelope.work_request_id,
      handoff_run_id: handoffRunId,
      status: 'BLOCKED',
      blocker,
    }),
  );
  throw error;
}

const startedAt = new Date().toISOString();
const details = validated.details;
await post(
  formatCursorActivationClaimComment(
    buildCursorActivationClaim({
      ...claimResult.claim,
      status: 'activated',
      agentRunId: details.agentId,
    }),
  ),
);
await addIssueLabelsApi(token, repo, sourceIssue, ['status:in-progress']);
await post(
  formatCursorOriginMetadataComment({
    sourceIssue,
    activationWorkflowRunId: handoffRunId,
    cursorAgentId: details.agentId,
    cursorAgentUrl: details.agentUrl,
    cursorRunId: details.runId,
    branch: details.branch,
    prNumber: details.prNumber,
  }),
);
await post(
  formatFactoryCursorHandoffReceiptComment(
    buildFactoryCursorHandoffReceipt({
      sourceIssue,
      handoffRunId,
      state: 'IN_PROGRESS',
      cursorAgentId: details.agentId,
      cursorRunId: details.runId,
      handedOffAt: startedAt,
      updatedAt: startedAt,
    }),
  ),
);
await post(formatAiWorkRequestStatusComment(buildCloudAgentsWorkStatus(envelope, { apiResult })));
await post(
  formatCloudAgentsExecutorEvidence(
    buildCloudAgentsExecutorEvidence({
      source_issue: sourceIssue,
      work_request_id: envelope.work_request_id,
      handoff_run_id: handoffRunId,
      cursor_agent_id: details.agentId,
      cursor_run_id: details.runId,
      status: 'IN_PROGRESS',
      started_at: startedAt,
    }),
  ),
);
console.log(`Cloud Agents v1 created ${details.agentId} for source issue #${sourceIssue}`);
