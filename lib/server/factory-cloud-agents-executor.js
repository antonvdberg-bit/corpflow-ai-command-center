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
import { routeCursorEconomicExecution } from './cursor-economic-execution-gate.js';
import {
  buildAiWorkRequest,
  buildAiWorkRequestStatus,
  findAiWorkRequest,
  redactAiWorkRequestPayload,
} from './ai-work-request-lifecycle.js';
import { sliceCommentsAfterLatestCursorRequeue } from './cursor-activation-claim.js';
import { redactSecretsFromText } from './cursor-ops-status.js';
import { validateCurrentCursorExecutionPacket } from './cursor-execution-packet.js';
import { resolveCursorExecutionModelSelection } from './cursor-execution-tier.js';

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
  const packetValidation = validateCurrentCursorExecutionPacket(input.issue);
  if (!packetValidation.ok) {
    throw new Error(`CURSOR_EXECUTION_PACKET_INVALID: ${packetValidation.reason}`);
  }

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

  // Economic routing is deterministic and preserves the existing #1249
  // durable MEDIUM/HIGH evidence gates. The remote API itself separately
  // enforces the master PARKED / LOCAL_ONLY / FACTORY_ARMED switch.
  const economicRoute = routeCursorEconomicExecution({
    mode: 'FACTORY_ARMED',
    sourceIssue,
    issue: input.issue,
    comments: input.comments,
  });

  const prompt = [
    'CorpFlowAI Factory Handoff — bounded execution packet.',
    `Source issue: #${sourceIssue}`,
    `Work request ID: ${request.work_request_id}`,
    `Handoff run ID: ${handoffRunId}`,
    `Repository: ${repo}`,
    `Task complexity: ${economicRoute.complexity}`,
    `Economic objective: ${economicRoute.objective}`,
    `Execution budget: attempts=${economicRoute.budget.max_attempts}; follow-ups=${economicRoute.budget.max_follow_ups}; elapsed_minutes=${economicRoute.budget.max_elapsed_minutes}`,
    `Packet validation: PASS; marker=${packetValidation.marker}; characters=${packetValidation.character_count}`,
    `Frugal metadata: value_class=${packetValidation.frugal_metadata.value_class}; context_budget=${packetValidation.frugal_metadata.context_budget}; execution_budget=${packetValidation.frugal_metadata.execution_budget}; stop_condition=${packetValidation.frugal_metadata.stop_condition}`,
    '',
    'Execute only the validated current packet below. Do not fetch or inject historical issue material by default.',
    'Use focused changed-surface tests during implementation and affected/package checks before any PR. Required GitHub CI runs broad regression once; do not repeatedly run broad local test, build, or audit suites. If CI reports an unrelated blocker, report that exact blocker and stop.',
    'Evaluate current-main/runtime/read-only evidence first. If acceptance is already proven, make no code change, create no branch or PR, and return structured evidence with a PASS verdict. If a real defect is proven, make only the bounded fix and open one PR.',
    'Do not merge, deploy, change secrets/env, mutate schema/data, send externally, incur unbounded spend, or bypass protected-action gates.',
    'When the execution budget is exhausted, stop and report the blocker instead of retrying indefinitely.',
    '',
    'Validated current execution packet:',
    packetValidation.packet,
  ].join('\n');

  return {
    schema: FACTORY_CLOUD_AGENTS_EXECUTOR_SCHEMA,
    source_issue: sourceIssue,
    work_request_id: request.work_request_id,
    handoff_run_id: handoffRunId,
    repository: repo,
    request,
    request_was_created: !existing,
    comments: Array.isArray(input.comments) ? input.comments : [],
    task_complexity: economicRoute.complexity,
    economic_objective: economicRoute.objective,
    execution_budget: economicRoute.budget,
    execution_tier: economicRoute.tier,
    packet_validation: {
      status: 'PASS',
      marker: packetValidation.marker,
      character_count: packetValidation.character_count,
      frugal_metadata: packetValidation.frugal_metadata,
    },
    executor_prompt: prompt,
    completion_mode: 'evidence_first',
  };
}

/**
 * Bind a validated packet to one live-catalogue model selection immediately
 * before API creation. The exact selection is execution evidence, not packet
 * policy, and `autoCreatePR=false` permits a genuine zero-code completion.
 */
export function buildFactoryCloudAgentsCreatePayload(envelope, modelCatalog) {
  const selected = resolveCursorExecutionModelSelection(modelCatalog, {
    tier: envelope.execution_tier,
    sourceIssue: envelope.source_issue,
    comments: envelope.comments || [],
  });
  const createPayload = buildCursorAgentCreatePayload(
    {
      objectRef: `issue:${envelope.source_issue}`,
      executorPrompt: envelope.executor_prompt,
    },
    {
      namePrefix: 'factory-handoff',
      modelSelection: selected.model,
      autoCreatePR: false,
    },
  );
  createPayload.agentId = envelope.work_request_id.replace(/^cfai-wr-/i, 'bc-');
  return { createPayload, selected };
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
    status: ['IN_PROGRESS', 'COMPLETED'].includes(status) ? status : 'BLOCKED',
    started_at: ['IN_PROGRESS', 'COMPLETED'].includes(status)
      ? String(input.started_at || new Date().toISOString())
      : null,
    blocker: ['IN_PROGRESS', 'COMPLETED'].includes(status)
      ? null
      : text(input.blocker || 'cursor_create_failed', 500),
    branch: String(input.branch || '').trim() || null,
    pr_number: positiveInteger(input.pr_number),
    pr_url: String(input.pr_url || '').trim() || null,
    head_sha: String(input.head_sha || '').trim() || null,
    ci_state: String(input.ci_state || '').trim() || null,
    final_verdict: String(input.final_verdict || '').trim() || null,
    protected_action_required: Boolean(input.protected_action_required),
    execution_tier: String(input.execution_tier || '').trim().toLowerCase() || null,
    packet_validation: input.packet_validation || null,
    model_selection: input.model_selection || null,
    current_main_sha: String(input.current_main_sha || '').trim() || null,
    blocker_fingerprint:
      status === 'IN_PROGRESS'
        ? null
        : String(input.blocker_fingerprint || '').trim() ||
          `factory_block|${String(input.current_main_sha || '').trim() || 'unknown'}|${text(input.blocker || 'cursor_create_failed', 160)}`,
    factory_created_block: status !== 'IN_PROGRESS',
  };
}

export function formatCloudAgentsExecutorEvidence(input = {}) {
  const evidence = buildCloudAgentsExecutorEvidence(input);
  const packet = evidence.packet_validation;
  const packetSummary = packet
    ? `Packet validation: ${packet.status || 'n/a'}\nPacket characters: ${packet.character_count ?? 'n/a'}\nPacket marker: ${packet.marker || 'n/a'}\nFrugal metadata: ${packet.frugal_metadata ? `value_class=${packet.frugal_metadata.value_class || 'n/a'}; context_budget=${packet.frugal_metadata.context_budget || 'n/a'}; execution_budget=${packet.frugal_metadata.execution_budget || 'n/a'}; stop_condition=${packet.frugal_metadata.stop_condition || 'n/a'}` : 'n/a'}\n`
    : '';
  const selectionSummary = evidence.model_selection
    ? `Model selection: ${evidence.model_selection.id || 'n/a'}; params=${JSON.stringify(evidence.model_selection.params || [])}\n`
    : '';
  return `CURSOR CLOUD AGENTS EXECUTOR\n\nSource issue: #${evidence.source_issue}\nWork request ID: ${evidence.work_request_id || 'n/a'}\nHandoff run ID: ${evidence.handoff_run_id || 'n/a'}\nCursor agent: ${evidence.cursor_agent_id || 'n/a'}\nCursor run: ${evidence.cursor_run_id || 'n/a'}\nStatus: ${evidence.status}\nBranch: ${evidence.branch || 'n/a'}\nPR: ${evidence.pr_number ? `#${evidence.pr_number}` : 'n/a'}\nSHA: ${evidence.head_sha || 'n/a'}\nCI: ${evidence.ci_state || 'n/a'}\nFinal verdict: ${evidence.final_verdict || 'n/a'}\nStarted at: ${evidence.started_at || 'n/a'}\nBlocker: ${evidence.blocker || 'none'}\n${selectionSummary}${packetSummary}\n<!-- ${FACTORY_CLOUD_AGENTS_EXECUTOR_MARKER} ${JSON.stringify(evidence)} -->\n`;
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
    return buildCloudAgentsExecutorEvidence(parsed);
  } catch {
    return null;
  }
}

/**
 * A factory-created block is valid only for the main revision that produced it.
 * Human/protected holds are deliberately outside this mechanism and are never
 * cleared here. The next executor run recomputes live catalogue/transport facts.
 */
export function planStaleFactoryBlockRecovery(input = {}) {
  const currentMainSha = String(input.currentMainSha || '').trim();
  const comments = Array.isArray(input.comments) ? [...input.comments].reverse() : [];
  for (const comment of comments) {
    const evidence = parseCloudAgentsExecutorEvidence(comment?.body);
    if (!evidence || evidence.status !== 'BLOCKED') continue;
    if (!evidence.factory_created_block || evidence?.protected_action_required) {
      return { recover: false, reason: 'protected_or_non_factory_block' };
    }
    const tier = evidence.execution_tier || 'low';
    if (
      input.liveModelCatalog &&
      /CURSOR_EXECUTION_TIER_(?:NO_COMPLIANT|MODEL_UNAVAILABLE)/.test(evidence.blocker || '')
    ) {
      try {
        resolveCursorExecutionModelSelection(input.liveModelCatalog, { tier });
        return {
          recover: true,
          reason: 'stale_factory_model_block_live_catalogue_changed',
          blockerFingerprint: evidence.blocker_fingerprint,
        };
      } catch {
        return { recover: false, reason: 'current_factory_model_block' };
      }
    }
    if (!currentMainSha || evidence.current_main_sha === currentMainSha) {
      return { recover: false, reason: currentMainSha ? 'current_factory_block' : 'current_main_sha_missing' };
    }
    return {
      recover: true,
      reason: 'stale_factory_block_current_main_changed',
      blockerFingerprint: evidence.blocker_fingerprint,
    };
  }
  return { recover: false, reason: 'no_factory_block_evidence' };
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
