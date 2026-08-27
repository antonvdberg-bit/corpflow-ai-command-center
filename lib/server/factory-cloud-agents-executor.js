/**
 * Correlated Cloud Agents v1 executor contract for Factory Handoff.
 *
 * This module is deliberately pure: the workflow script owns GitHub/API I/O,
 * while this contract prevents a successful HTTP response without a concrete
 * Cursor agent identity from becoming execution.
 */
import {
  buildCursorAgentCreatePayload,
  extractCursorGitDetails,
} from './cursor-cloud-agent-client.js';
import {
  buildAiWorkRequest,
  buildAiWorkRequestStatus,
  findAiWorkRequest,
  redactAiWorkRequestPayload,
} from './ai-work-request-lifecycle.js';
import { sliceCommentsAfterLatestCursorRequeue } from './cursor-activation-claim.js';
import { redactSecretsFromText } from './cursor-ops-status.js';

export const FACTORY_CLOUD_AGENTS_EXECUTOR_SCHEMA =
  'corpflow.factory_cloud_agents_executor.v1';
export const FACTORY_CLOUD_AGENTS_EXECUTOR_MARKER =
  'corpflow.factory_cloud_agents_executor.v1';

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function text(value, max = 12000) {
  const safe = redactSecretsFromText(String(value || '').trim());
  return safe.slice(0, max);
}

/**
 * Build the bounded, durable execution envelope. An existing controller
 * request in the *current generation* wins; otherwise the selected GitHub
 * issue receives a new request record before agent creation.
 *
 * Historical `cfai-wr-*` envelopes from a retired generation must not be
 * reused: Cloud Agents derives `agentId` from the work request id, so a
 * completed Generation N id collides (HTTP 409) instead of creating a
 * fresh Generation N+1 run.
 */
export function buildFactoryCloudAgentsExecutionEnvelope(input = {}) {
  const sourceIssue = positiveInteger(input.sourceIssue || input.issue?.number);
  if (!sourceIssue) throw new Error('Cloud Agents executor requires source_issue');
  const handoffRunId = String(input.handoffRunId || '').trim();
  if (!handoffRunId) throw new Error('Cloud Agents executor requires handoff_run_id');

  const generation = sliceCommentsAfterLatestCursorRequeue(input.comments);
  const requestIssue = generation.hasRequeueBoundary
    ? { ...(input.issue || {}), body: '' }
    : input.issue;
  const existing = findAiWorkRequest(requestIssue, generation.comments);
  const request =
    existing ||
    buildAiWorkRequest({
      source_issue: sourceIssue,
      origin_controller: 'factory_handoff',
      requested_outcome: text(input.issue?.title || 'bounded Cursor implementation packet', 500),
      protected_action_required: false,
    });
  const repo = String(input.repo || '').trim();
  if (!repo.includes('/')) throw new Error('Cloud Agents executor requires repository');

  const prompt = [
    'CorpFlowAI Factory Handoff — bounded execution packet.',
    `Source issue: #${sourceIssue}`,
    `Work request ID: ${request.work_request_id}`,
    `Handoff run ID: ${handoffRunId}`,
    `Repository: ${repo}`,
    `Required outcome: ${request.requested_outcome}`,
    '',
    'Use the durable GitHub issue as the source of truth. Open one PR only.',
    'Do not merge, deploy, change secrets/env, mutate schema/data, send externally, incur spend, or bypass protected-action gates.',
    '',
    'Issue context:',
    text(input.issue?.body, 9000) || '(no additional issue body)',
  ].join('\n');

  const createPayload = buildCursorAgentCreatePayload(
    {
      objectRef: `issue:${sourceIssue}`,
      executorPrompt: prompt,
    },
    { namePrefix: 'factory-handoff' },
  );
  // The work request ID already contains a UUID. Reusing it as the API's
  // caller-supplied agent ID makes an ambiguous create retry idempotent.
  createPayload.agentId = request.work_request_id.replace(/^cfai-wr-/i, 'bc-');

  return {
    schema: FACTORY_CLOUD_AGENTS_EXECUTOR_SCHEMA,
    source_issue: sourceIssue,
    work_request_id: request.work_request_id,
    handoff_run_id: handoffRunId,
    repository: repo,
    request,
    request_was_created: !existing,
    create_payload: createPayload,
  };
}

/**
 * A valid HTTP response is not enough: only a concrete bc-* identity may
 * advance Factory work to IN_PROGRESS.
 */
export function validateCloudAgentCreateResponse(apiResult) {
  const details = extractCursorGitDetails(apiResult);
  const agentId = String(details.agentId || '').trim();
  const runId = String(details.runId || '').trim();
  const responseRunAgentId = String(apiResult?.run?.agentId || '').trim();
  if (
    !/^bc-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(agentId) ||
    !/^run-[a-z0-9-]{6,}$/i.test(runId) ||
    (responseRunAgentId && responseRunAgentId !== agentId)
  ) {
    return {
      ok: false,
      reason: 'cursor_create_response_missing_valid_agent_or_run_identity',
      details: { ...details, agentId: null, runId: null },
    };
  }
  return { ok: true, details: { ...details, agentId, runId } };
}

export function buildCloudAgentsExecutorEvidence(input = {}) {
  const status = String(input.status || 'BLOCKED').toUpperCase();
  const sourceIssue = positiveInteger(input.source_issue);
  if (!sourceIssue) throw new Error('executor evidence requires source_issue');
  return {
    schema: FACTORY_CLOUD_AGENTS_EXECUTOR_SCHEMA,
    source_issue: sourceIssue,
    work_request_id: String(input.work_request_id || '').trim() || null,
    handoff_run_id: String(input.handoff_run_id || '').trim() || null,
    cursor_agent_id: String(input.cursor_agent_id || '').trim() || null,
    cursor_run_id: String(input.cursor_run_id || '').trim() || null,
    status: status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'BLOCKED',
    started_at: status === 'IN_PROGRESS' ? String(input.started_at || new Date().toISOString()) : null,
    blocker: status === 'IN_PROGRESS' ? null : text(input.blocker || 'cursor_create_failed', 500),
  };
}

export function formatCloudAgentsExecutorEvidence(input = {}) {
  const evidence = buildCloudAgentsExecutorEvidence(input);
  return `CURSOR CLOUD AGENTS EXECUTOR

Source issue: #${evidence.source_issue}
Work request ID: ${evidence.work_request_id || 'n/a'}
Handoff run ID: ${evidence.handoff_run_id || 'n/a'}
Cursor agent: ${evidence.cursor_agent_id || 'n/a'}
Cursor run: ${evidence.cursor_run_id || 'n/a'}
Status: ${evidence.status}
Started at: ${evidence.started_at || 'n/a'}
Blocker: ${evidence.blocker || 'none'}

<!-- ${FACTORY_CLOUD_AGENTS_EXECUTOR_MARKER} ${JSON.stringify(evidence)} -->
`;
}

export function parseCloudAgentsExecutorEvidence(textValue) {
  const match = String(textValue || '').match(
    new RegExp(
      `<!--\\s*${FACTORY_CLOUD_AGENTS_EXECUTOR_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`,
      'i',
    ),
  );
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    const evidence = buildCloudAgentsExecutorEvidence(parsed);
    return evidence.cursor_agent_id ? evidence : null;
  } catch {
    return null;
  }
}

export function findKnownCloudAgentsExecutorEvidence(comments, sourceIssue) {
  const wanted = positiveInteger(sourceIssue);
  for (const comment of Array.isArray(comments) ? [...comments].reverse() : []) {
    const evidence = parseCloudAgentsExecutorEvidence(comment?.body);
    if (
      evidence &&
      evidence.status === 'IN_PROGRESS' &&
      (!wanted || evidence.source_issue === wanted)
    ) {
      return evidence;
    }
  }
  return null;
}

export function buildCloudAgentsWorkStatus(envelope, input = {}) {
  const validated = validateCloudAgentCreateResponse(input.apiResult);
  return buildAiWorkRequestStatus({
    work_request_id: envelope.work_request_id,
    source_issue: envelope.source_issue,
    status: validated.ok ? 'IN_PROGRESS' : 'BLOCKED',
    cursor_agent_id: validated.ok ? validated.details.agentId : null,
    cursor_run_id: validated.ok ? validated.details.runId : null,
    blocker: validated.ok ? null : input.blocker || validated.reason,
    next_action: validated.ok
      ? 'Poll the known Cursor agent ID only'
      : 'Factory handoff did not create a valid Cursor agent identity',
    protected_action_required: envelope.request.protected_action_required,
  });
}

export function redactCloudAgentsFailure(error) {
  return text(error instanceof Error ? error.message : error, 500) || 'cursor_create_failed';
}
