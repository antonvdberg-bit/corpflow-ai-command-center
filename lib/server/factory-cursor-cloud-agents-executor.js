/**
 * Factory Handoff → Cursor Cloud Agents API v1 sole-executor adapter (#1062).
 *
 * Implemented behind `CorpFlowAI Cursor Factory Handoff`. Default remains the
 * live Factory Wake Proof v2 webhook. Cloud Agents v1 is dormant until the
 * exact later live-switch flag. Do not run both as competing production
 * executors.
 *
 * Real `bc-…` agent identity is the only transition to IN_PROGRESS.
 * Polling uses known correlated agent IDs only.
 *
 * @see docs/operations/FACTORY_CURSOR_CLOUD_AGENTS_V1_SOLE_EXECUTOR.md
 * @see docs/operations/AI_WORK_REQUEST_LIFECYCLE_V1.md
 */

import {
  createWorkRequestId,
  findAiWorkRequest,
  formatAiWorkRequestComment,
  formatAiWorkRequestStatusComment,
  parseAiWorkRequestStatusFromText,
} from './ai-work-request-lifecycle.js';
import {
  acquireCursorIssueActivationClaim,
  buildCursorActivationClaim,
  evaluateCursorIssueActivationClaim,
  formatCursorActivationClaimComment,
  parseCursorActivationClaimFromText,
  releaseCursorIssueActivationClaim,
  SKIP_ALREADY_CLAIMED,
} from './cursor-activation-claim.js';
import {
  normalizeCursorAgentLifecycleStatus,
  parseCursorLifecycleStateFromText,
} from './cursor-agent-lifecycle.js';
import {
  buildCursorAgentCreatePayload,
  createCursorCloudAgent,
  extractValidatedCursorAgentIdentity,
  getCursorCloudAgent,
} from './cursor-cloud-agent-client.js';
import { buildDirectIssueExecutorPrompt } from './dispatcher-agent-activation.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
  parseCursorOriginMetadataFromText,
} from './cursor-origin-metadata.js';
import { redactSecretsFromText } from './cursor-ops-status.js';
import {
  buildFactoryCursorHandoffReceipt,
  formatFactoryCursorHandoffReceiptComment,
} from './factory-cursor-handoff-receipt.js';

export const FACTORY_CLOUD_AGENT_ENVELOPE_SCHEMA =
  'corpflow.factory_cloud_agent_envelope.v1';
export const FACTORY_CLOUD_AGENT_ENVELOPE_MARKER =
  'corpflow.factory_cloud_agent_envelope.v1';

export const FACTORY_CURSOR_EXECUTOR_WAKE_PROOF_V2 = 'wake_proof_v2';
export const FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1 = 'cloud_agents_v1';
export const FACTORY_CURSOR_EXECUTOR_DRY_RUN = 'dry_run';

export const FACTORY_CURSOR_EXECUTOR_MODES = Object.freeze([
  FACTORY_CURSOR_EXECUTOR_WAKE_PROOF_V2,
  FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
  FACTORY_CURSOR_EXECUTOR_DRY_RUN,
]);

export const FACTORY_CURSOR_EXECUTOR_VAR_NAME = 'FACTORY_CURSOR_EXECUTOR';
export const FACTORY_CURSOR_EXECUTOR_LIVE_VALUE = 'cloud_agents_v1';

const DEFAULT_REPO = 'antonvdberg-bit/corpflow-ai-command-center';

const PROTECTED_ACTION_CONSTRAINTS = [
  'Do not merge this PR.',
  'Do not deploy, change env/secrets, mutate DB/schema, pay/upgrade, send externally, or change DNS.',
  'Protected subject mentions in the issue are informational unless the issue already authorizes that exact consequential action.',
  'One source issue, one branch, one non-draft PR, then terminate.',
].join(' ');

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function emptyToNull(value) {
  const s = value == null ? '' : String(value).trim();
  return s || null;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isTruthyFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

/**
 * Resolve the Factory Cursor executor. Default stays Wake Proof v2.
 * `cloud_agents_v1` is the later live-switch value only.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | null | undefined} env
 * @param {{ dryRun?: boolean }} [opts]
 */
export function resolveFactoryCursorExecutorMode(env = {}, opts = {}) {
  if (opts.dryRun === true || isTruthyFlag(env.FACTORY_CURSOR_CLOUD_AGENTS_DRY_RUN)) {
    return {
      mode: FACTORY_CURSOR_EXECUTOR_DRY_RUN,
      wakeProofWebhookEnabled: false,
      cloudAgentsLiveEnabled: false,
      reason: 'dry_run',
    };
  }
  const raw = emptyToNull(env.FACTORY_CURSOR_EXECUTOR) || emptyToNull(env[FACTORY_CURSOR_EXECUTOR_VAR_NAME]);
  if (raw === FACTORY_CURSOR_EXECUTOR_LIVE_VALUE) {
    return {
      mode: FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
      wakeProofWebhookEnabled: false,
      cloudAgentsLiveEnabled: true,
      reason: 'live_switch_flag',
    };
  }
  return {
    mode: FACTORY_CURSOR_EXECUTOR_WAKE_PROOF_V2,
    wakeProofWebhookEnabled: true,
    cloudAgentsLiveEnabled: false,
    reason: 'default_wake_proof_v2',
  };
}

/**
 * One production Cursor executor only. Competing live paths are a blocker.
 *
 * @param {{
 *   executorMode?: string | null,
 *   wakeProofWebhookEnabled?: boolean,
 *   cloudAgentsLiveEnabled?: boolean,
 * }} input
 */
export function assertSoleFactoryCursorExecutor(input = {}) {
  const mode = emptyToNull(input.executorMode);
  const webhook = input.wakeProofWebhookEnabled === true;
  const cloud = input.cloudAgentsLiveEnabled === true;
  if (cloud && webhook) {
    return {
      ok: false,
      reason: 'competing_production_executors',
      blocker:
        'Cloud Agents API v1 and Factory Wake Proof v2 cannot both be live production executors',
    };
  }
  if (mode === FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1 && webhook) {
    return {
      ok: false,
      reason: 'competing_production_executors',
      blocker: 'cloud_agents_v1 mode still has the Wake Proof webhook enabled',
    };
  }
  if (mode === FACTORY_CURSOR_EXECUTOR_WAKE_PROOF_V2 && cloud) {
    return {
      ok: false,
      reason: 'competing_production_executors',
      blocker: 'wake_proof_v2 mode still has Cloud Agents v1 live-enabled',
    };
  }
  return { ok: true, reason: null, blocker: null };
}

/**
 * @param {{
 *   sourceIssue: number,
 *   workRequestId?: string | null,
 *   handoffRunId?: string | null,
 *   repository?: string | null,
 *   requestedOutcome?: string | null,
 *   protectedActionRequired?: boolean,
 * }} input
 */
export function buildFactoryCloudAgentEnvelope(input) {
  const sourceIssue = toPositiveInt(input.sourceIssue);
  if (sourceIssue == null) {
    throw new Error('buildFactoryCloudAgentEnvelope requires sourceIssue');
  }
  return {
    schema: FACTORY_CLOUD_AGENT_ENVELOPE_SCHEMA,
    source_issue: sourceIssue,
    work_request_id: createWorkRequestId(input.workRequestId),
    handoff_run_id: emptyToNull(input.handoffRunId),
    repository: emptyToNull(input.repository) || DEFAULT_REPO,
    requested_outcome:
      emptyToNull(input.requestedOutcome) ||
      `Bounded Cursor implementation of GitHub issue #${sourceIssue}`,
    protected_action_required: Boolean(input.protectedActionRequired),
    protected_action_constraints: PROTECTED_ACTION_CONSTRAINTS,
  };
}

/**
 * @param {unknown} text
 */
export function parseFactoryCloudAgentEnvelopeFromText(text) {
  const match = String(text || '').match(
    new RegExp(
      `<!--\\s*${FACTORY_CLOUD_AGENT_ENVELOPE_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`,
      'i',
    ),
  );
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (!parsed || parsed.schema !== FACTORY_CLOUD_AGENT_ENVELOPE_SCHEMA) return null;
    return buildFactoryCloudAgentEnvelope({
      sourceIssue: parsed.source_issue,
      workRequestId: parsed.work_request_id,
      handoffRunId: parsed.handoff_run_id,
      repository: parsed.repository,
      requestedOutcome: parsed.requested_outcome,
      protectedActionRequired: parsed.protected_action_required,
    });
  } catch {
    return null;
  }
}

/**
 * Correlated Cloud Agents v1 create payload. Prompt carries the durable
 * GitHub work-record envelope; API metadata fields are not a second store.
 *
 * @param {{
 *   sourceIssue: number,
 *   workRequestId?: string | null,
 *   handoffRunId?: string | null,
 *   repository?: string | null,
 *   requestedOutcome?: string | null,
 *   protectedActionRequired?: boolean,
 *   issueTitle?: string | null,
 *   issueBody?: string | null,
 *   issueUrl?: string | null,
 * }} input
 */
export function buildFactoryCloudAgentCreatePayload(input) {
  const envelope = buildFactoryCloudAgentEnvelope(input);
  const issueUrl =
    emptyToNull(input.issueUrl) ||
    `https://github.com/${envelope.repository}/issues/${envelope.source_issue}`;
  const issuePrompt = buildDirectIssueExecutorPrompt({
    issueNumber: envelope.source_issue,
    url: issueUrl,
    title: emptyToNull(input.issueTitle) || envelope.requested_outcome,
    body: emptyToNull(input.issueBody),
  });
  const prompt = [
    `<!-- ${FACTORY_CLOUD_AGENT_ENVELOPE_MARKER} ${JSON.stringify(envelope)} -->`,
    '',
    'You are the autonomous CorpFlowAI Cursor Factory execution worker.',
    `Execute exactly GitHub issue #${envelope.source_issue}. Do not search for a different issue.`,
    `work_request_id: ${envelope.work_request_id}`,
    `handoff_run_id: ${envelope.handoff_run_id || 'n/a'}`,
    `repository: ${envelope.repository}`,
    `Requested outcome: ${envelope.requested_outcome}`,
    `Protected action required: ${envelope.protected_action_required ? 'YES' : 'NO'}`,
    envelope.protected_action_constraints,
    '',
    issuePrompt,
  ].join('\n');

  return {
    envelope,
    payload: buildCursorAgentCreatePayload(
      {
        executorPrompt: prompt,
        objectRef: `issue:${envelope.source_issue}`,
      },
      { namePrefix: 'factory' },
    ),
  };
}

/**
 * @param {string} text
 */
export function redactFactoryExecutorText(text) {
  return redactSecretsFromText(text);
}

/**
 * Known correlated agent IDs from durable GitHub markers only.
 * Generic Automation worker ids are not a poll set.
 *
 * @param {Array<{ body?: string | null } | string> | null | undefined} comments
 * @param {number | null} [expectedSourceIssue]
 * @returns {string[]}
 */
export function collectKnownCorrelatedCursorAgentIds(comments, expectedSourceIssue = null) {
  const want = toPositiveInt(expectedSourceIssue);
  /** @type {Set<string>} */
  const ids = new Set();
  for (const item of Array.isArray(comments) ? comments : []) {
    const body = typeof item === 'string' ? item : String(item?.body || '');
    if (!body.trim()) continue;
    const origin = parseCursorOriginMetadataFromText(body);
    if (origin?.cursorAgentId && (!want || origin.sourceIssue == null || origin.sourceIssue === want)) {
      ids.add(origin.cursorAgentId);
    }
    const status = parseAiWorkRequestStatusFromText(body);
    if (status?.cursor_agent_id && (!want || status.source_issue === want)) {
      ids.add(status.cursor_agent_id);
    }
    const claim = parseCursorActivationClaimFromText(body);
    if (
      claim?.agentRunId &&
      /^bc-/i.test(claim.agentRunId) &&
      (!want || claim.sourceIssue === want)
    ) {
      ids.add(claim.agentRunId);
    }
    const lifecycle = parseCursorLifecycleStateFromText(body);
    if (
      lifecycle?.cursorAgentId &&
      (!want || lifecycle.sourceIssue == null || lifecycle.sourceIssue === want)
    ) {
      ids.add(lifecycle.cursorAgentId);
    }
  }
  return [...ids];
}

/**
 * @param {{
 *   agentId?: string | null,
 *   comments?: Array<{ body?: string | null } | string> | null,
 *   sourceIssue?: number | null,
 * }} input
 */
export function shouldPollKnownCursorAgent(input = {}) {
  const agentId = emptyToNull(input.agentId);
  if (!agentId || !/^bc-[0-9a-f-]{20,}$/i.test(agentId)) {
    return { poll: false, reason: 'invalid_or_missing_agent_id' };
  }
  const known = collectKnownCorrelatedCursorAgentIds(input.comments, input.sourceIssue);
  if (!known.includes(agentId)) {
    return { poll: false, reason: 'uncorrelated_agent_id' };
  }
  return { poll: true, reason: 'known_correlated_agent_id' };
}

/**
 * Map a Cloud Agents v1 poll into the #1060/#1061 contract and WIP release.
 *
 * Review-ready work (bounded assignment complete / operator-review / merge-ready PR)
 * consumes zero execution WIP.
 *
 * @param {Record<string, unknown> | null | undefined} apiResult
 * @param {{
 *   hasPr?: boolean,
 *   operatorReview?: boolean,
 *   startedAt?: string | null,
 *   now?: Date,
 * }} [opts]
 */
export function mapPolledCursorAgentToFactoryLifecycle(apiResult, opts = {}) {
  const identity = extractValidatedCursorAgentIdentity(apiResult);
  if (!identity.ok) {
    return {
      workStatus: 'BLOCKED',
      receiptState: 'BLOCKED',
      lifecyclePhase: 'FAILED',
      shouldReleaseWip: true,
      reason: identity.reason,
      identity,
      completed: false,
    };
  }
  const normalized = normalizeCursorAgentLifecycleStatus(apiResult, {
    hasPr: opts.hasPr === true || Boolean(identity.prUrl || identity.prNumber),
    startedAt: opts.startedAt,
    now: opts.now,
  });
  const hasPr = opts.hasPr === true || Boolean(identity.prUrl || identity.prNumber);
  if (normalized.phase === 'COMPLETED' || (hasPr && opts.operatorReview === true)) {
    return {
      workStatus: 'COMPLETED',
      receiptState: 'IN_PROGRESS',
      lifecyclePhase: 'COMPLETED',
      shouldReleaseWip: true,
      reason: hasPr ? 'review_ready_zero_execution_wip' : 'bounded_assignment_complete',
      identity,
      completed: true,
    };
  }
  if (normalized.phase === 'FAILED') {
    return {
      workStatus: 'BLOCKED',
      receiptState: 'BLOCKED',
      lifecyclePhase: 'FAILED',
      shouldReleaseWip: true,
      reason: 'cursor_terminal_failure',
      identity,
      completed: false,
    };
  }
  if (normalized.phase === 'STALE') {
    return {
      workStatus: 'BLOCKED',
      receiptState: 'BLOCKED',
      lifecyclePhase: 'STALE',
      shouldReleaseWip: true,
      reason: 'cursor_stale_no_progress',
      identity,
      completed: false,
    };
  }
  return {
    workStatus: 'IN_PROGRESS',
    receiptState: 'IN_PROGRESS',
    lifecyclePhase: normalized.phase,
    shouldReleaseWip: false,
    reason: 'active_correlated_execution',
    identity,
    completed: false,
  };
}

/**
 * Map a create attempt. No identity → not IN_PROGRESS.
 *
 * @param {{
 *   apiResult?: Record<string, unknown> | null,
 *   error?: unknown,
 *   claimed?: boolean,
 * }} input
 */
export function mapFactoryCloudAgentCreateResult(input = {}) {
  if (input.error) {
    const message = redactFactoryExecutorText(
      input.error instanceof Error ? input.error.message : String(input.error),
    );
    const entitlement = /402|payment|upgrade|entitlement|plan|quota|billing/i.test(message);
    return {
      workStatus: entitlement ? 'BLOCKED' : 'NOT_RECEIVED',
      receiptState: entitlement ? 'BLOCKED' : 'NOT_RECEIVED',
      shouldReleaseWip: true,
      reason: entitlement ? 'cursor_api_entitlement_rejected' : 'cursor_api_create_rejected',
      blocker: message.slice(0, 300),
      identity: null,
    };
  }
  const identity = extractValidatedCursorAgentIdentity(input.apiResult);
  if (!identity.ok) {
    return {
      workStatus: 'NOT_RECEIVED',
      receiptState: 'NOT_RECEIVED',
      shouldReleaseWip: true,
      reason: identity.reason,
      blocker: 'Cursor Cloud Agents API v1 returned no valid agent identity',
      identity: null,
    };
  }
  return {
    workStatus: 'IN_PROGRESS',
    receiptState: 'IN_PROGRESS',
    shouldReleaseWip: false,
    reason: 'valid_agent_identity',
    blocker: null,
    identity,
  };
}

/**
 * @param {{
 *   mode?: string,
 *   envelope: ReturnType<typeof buildFactoryCloudAgentEnvelope>,
 *   sourceIssue: number,
 *   handoffRunId?: string | null,
 *   startedAt?: string | null,
 *   mapping: ReturnType<typeof mapFactoryCloudAgentCreateResult>,
 *   dryRun?: boolean,
 *   claimDecision?: string | null,
 *   commentsPosted?: string[],
 * }} input
 */
export function buildFactoryCloudAgentExecutionEvidence(input) {
  const mapping = input.mapping;
  const identity = mapping.identity;
  const startedAt = emptyToNull(input.startedAt) || new Date().toISOString();
  const evidence = {
    schema: 'corpflow.factory_cloud_agent_execution.v1',
    mode: emptyToNull(input.mode) || FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
    dry_run: input.dryRun === true,
    source_issue: input.sourceIssue,
    work_request_id: input.envelope.work_request_id,
    handoff_run_id: emptyToNull(input.handoffRunId),
    cursor_agent_id: identity?.agentId || null,
    cursor_run_id: identity?.runId || null,
    status: mapping.workStatus,
    started_at: mapping.workStatus === 'IN_PROGRESS' ? startedAt : null,
    blocker: mapping.blocker,
    reason: mapping.reason,
    claim_decision: emptyToNull(input.claimDecision),
    comments_posted: Array.isArray(input.commentsPosted) ? input.commentsPosted : [],
    should_release_wip: mapping.shouldReleaseWip,
  };
  return JSON.parse(redactFactoryExecutorText(JSON.stringify(evidence)));
}

/**
 * Durable GitHub comments after a validated create (no secrets).
 *
 * @param {{
 *   envelope: ReturnType<typeof buildFactoryCloudAgentEnvelope>,
 *   identity: Extract<ReturnType<typeof extractValidatedCursorAgentIdentity>, { ok: true }>,
 *   claim?: import('./cursor-activation-claim.js').CursorActivationClaim | null,
 *   startedAt?: string | null,
 *   existingWorkRequest?: boolean,
 * }} input
 */
export function formatFactoryCloudAgentSuccessComments(input) {
  const startedAt = emptyToNull(input.startedAt) || new Date().toISOString();
  const comments = [];
  if (input.existingWorkRequest !== true) {
    comments.push({
      kind: 'ai_work_request',
      body: formatAiWorkRequestComment({
        work_request_id: input.envelope.work_request_id,
        source_issue: input.envelope.source_issue,
        origin_controller: 'corpflow.factory_cursor_handoff',
        requested_at: startedAt,
        requested_outcome: input.envelope.requested_outcome,
        status: 'IN_PROGRESS',
        protected_action_required: input.envelope.protected_action_required,
      }),
    });
  }
  if (input.claim) {
    comments.push({
      kind: 'activation_claim_activated',
      body: formatCursorActivationClaimComment(
        buildCursorActivationClaim({
          ...input.claim,
          status: 'activated',
          agentRunId: input.identity.agentId,
        }),
      ),
    });
  }
  comments.push({
    kind: 'origin_metadata',
    body: formatCursorOriginMetadataComment(
      buildCursorOriginMetadata({
        sourceIssue: input.envelope.source_issue,
        activationWorkflowRunId: input.envelope.handoff_run_id,
        cursorAgentId: input.identity.agentId,
        cursorRunId: input.identity.runId,
        cursorAgentUrl: input.identity.agentUrl,
        branch: input.identity.branch,
        prNumber: input.identity.prNumber,
      }),
    ),
  });
  comments.push({
    kind: 'ai_work_status',
    body: formatAiWorkRequestStatusComment({
      work_request_id: input.envelope.work_request_id,
      source_issue: input.envelope.source_issue,
      status: 'IN_PROGRESS',
      cursor_agent_id: input.identity.agentId,
      cursor_run_id: input.identity.runId,
      branch: input.identity.branch,
      pr_url: input.identity.prUrl,
      next_action: 'Await Cursor terminal evidence on the same work record',
      updated_at: startedAt,
      protected_action_required: input.envelope.protected_action_required,
    }),
  });
  comments.push({
    kind: 'handoff_receipt',
    body: formatFactoryCursorHandoffReceiptComment(
      buildFactoryCursorHandoffReceipt({
        sourceIssue: input.envelope.source_issue,
        handoffRunId: input.envelope.handoff_run_id,
        handedOffAt: startedAt,
        state: 'IN_PROGRESS',
        cursorAgentId: input.identity.agentId,
        cursorRunId: input.identity.runId,
        updatedAt: startedAt,
      }),
    ),
  });
  return comments;
}

/**
 * Run the Cloud Agents v1 executor for one Factory Handoff source issue.
 *
 * Dry-run never calls the live API and never emits IN_PROGRESS.
 *
 * @param {{
 *   sourceIssue: number,
 *   handoffRunId?: string | null,
 *   repository?: string | null,
 *   workRequestId?: string | null,
 *   requestedOutcome?: string | null,
 *   protectedActionRequired?: boolean,
 *   issueTitle?: string | null,
 *   issueBody?: string | null,
 *   issueUrl?: string | null,
 *   labels?: unknown,
 *   comments?: Array<{ body?: string | null, created_at?: string | null }>,
 *   mode?: string,
 *   dryRun?: boolean,
 *   cursorApiKey?: string | null,
 *   githubToken?: string | null,
 *   wakeProofWebhookEnabled?: boolean,
 *   cloudAgentsLiveEnabled?: boolean,
 *   postComment?: (issueNumber: number, body: string) => Promise<unknown>,
 *   acquireClaim?: typeof acquireCursorIssueActivationClaim,
 *   releaseClaim?: typeof releaseCursorIssueActivationClaim,
 *   createAgent?: typeof createCursorCloudAgent,
 *   cursorDeps?: { fetch?: typeof fetch, timeoutMs?: number },
 *   nowIso?: string,
 * }} opts
 */
export async function runFactoryCloudAgentsExecutor(opts) {
  const sourceIssue = toPositiveInt(opts.sourceIssue);
  if (sourceIssue == null) {
    throw new Error('runFactoryCloudAgentsExecutor requires sourceIssue');
  }
  const dryRun = opts.dryRun === true || opts.mode === FACTORY_CURSOR_EXECUTOR_DRY_RUN;
  const mode = dryRun
    ? FACTORY_CURSOR_EXECUTOR_DRY_RUN
    : emptyToNull(opts.mode) || FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1;
  const sole = assertSoleFactoryCursorExecutor({
    executorMode: mode,
    wakeProofWebhookEnabled: Boolean(opts.wakeProofWebhookEnabled),
    cloudAgentsLiveEnabled:
      opts.cloudAgentsLiveEnabled ?? mode === FACTORY_CURSOR_EXECUTOR_CLOUD_AGENTS_V1,
  });
  if (!sole.ok) {
    const envelope = buildFactoryCloudAgentEnvelope({
      sourceIssue,
      workRequestId: opts.workRequestId,
      handoffRunId: opts.handoffRunId,
      repository: opts.repository,
      requestedOutcome: opts.requestedOutcome,
      protectedActionRequired: opts.protectedActionRequired,
    });
    return {
      ok: false,
      evidence: buildFactoryCloudAgentExecutionEvidence({
        mode,
        envelope,
        sourceIssue,
        handoffRunId: opts.handoffRunId,
        mapping: {
          workStatus: 'BLOCKED',
          receiptState: 'BLOCKED',
          shouldReleaseWip: true,
          reason: sole.reason,
          blocker: sole.blocker,
          identity: null,
        },
        dryRun,
        commentsPosted: [],
      }),
    };
  }

  const comments = Array.isArray(opts.comments) ? opts.comments : [];
  const existingRequest = findAiWorkRequest(
    { number: sourceIssue, body: opts.issueBody },
    comments,
  );
  const { envelope, payload } = buildFactoryCloudAgentCreatePayload({
    sourceIssue,
    workRequestId: opts.workRequestId || existingRequest?.work_request_id,
    handoffRunId: opts.handoffRunId,
    repository: opts.repository,
    requestedOutcome: opts.requestedOutcome || existingRequest?.requested_outcome,
    protectedActionRequired:
      opts.protectedActionRequired ?? existingRequest?.protected_action_required,
    issueTitle: opts.issueTitle,
    issueBody: opts.issueBody,
    issueUrl: opts.issueUrl,
  });

  if (dryRun) {
    const claimGate = evaluateCursorIssueActivationClaim({
      issueNumber: sourceIssue,
      labels: opts.labels,
      issueBody: opts.issueBody,
      comments,
    });
    const skipped = claimGate.decision === SKIP_ALREADY_CLAIMED;
    return {
      ok: true,
      evidence: buildFactoryCloudAgentExecutionEvidence({
        mode,
        envelope,
        sourceIssue,
        handoffRunId: opts.handoffRunId,
        mapping: {
          workStatus: 'REQUESTED',
          receiptState: 'PENDING',
          shouldReleaseWip: skipped,
          reason: skipped ? claimGate.reason : 'dry_run_would_call_cloud_agents_v1',
          blocker: skipped ? `claim_skipped:${claimGate.reason}` : null,
          identity: null,
        },
        dryRun: true,
        claimDecision: claimGate.decision,
        commentsPosted: [],
      }),
      payload,
      envelope,
    };
  }

  const claimGate = evaluateCursorIssueActivationClaim({
    issueNumber: sourceIssue,
    labels: opts.labels,
    issueBody: opts.issueBody,
    comments,
  });
  if (claimGate.decision === SKIP_ALREADY_CLAIMED) {
    return {
      ok: true,
      skipped: true,
      evidence: buildFactoryCloudAgentExecutionEvidence({
        mode,
        envelope,
        sourceIssue,
        handoffRunId: opts.handoffRunId,
        mapping: {
          workStatus: 'BLOCKED',
          receiptState: 'SUPPRESSED',
          shouldReleaseWip: true,
          reason: claimGate.reason,
          blocker: `duplicate_or_ineligible_claim:${claimGate.reason}`,
          identity: null,
        },
        dryRun: false,
        claimDecision: claimGate.decision,
        commentsPosted: [],
      }),
    };
  }

  const apiKey = emptyToNull(opts.cursorApiKey);
  if (!apiKey) {
    return {
      ok: false,
      evidence: buildFactoryCloudAgentExecutionEvidence({
        mode,
        envelope,
        sourceIssue,
        handoffRunId: opts.handoffRunId,
        mapping: {
          workStatus: 'BLOCKED',
          receiptState: 'BLOCKED',
          shouldReleaseWip: true,
          reason: 'cursor_api_key_missing',
          blocker:
            'CURSOR_API_KEY missing — Cloud Agents API v1 live path fail-closed (secret name only)',
          identity: null,
        },
        dryRun: false,
        claimDecision: null,
        commentsPosted: [],
      }),
    };
  }

  const acquire = opts.acquireClaim || acquireCursorIssueActivationClaim;
  const acquired = await acquire({
    token: opts.githubToken || '',
    repo: envelope.repository,
    issueNumber: sourceIssue,
    labels: opts.labels,
    issueBody: opts.issueBody,
    comments,
    workflowRunId: opts.handoffRunId,
    postComment: opts.postComment,
    nowIso: opts.nowIso,
  });
  if (!acquired?.ok) {
    return {
      ok: true,
      skipped: true,
      evidence: buildFactoryCloudAgentExecutionEvidence({
        mode,
        envelope,
        sourceIssue,
        handoffRunId: opts.handoffRunId,
        mapping: {
          workStatus: 'BLOCKED',
          receiptState: 'SUPPRESSED',
          shouldReleaseWip: true,
          reason: acquired?.reason || 'claim_not_acquired',
          blocker: `claim_before_api:${acquired?.reason || 'claim_not_acquired'}`,
          identity: null,
        },
        dryRun: false,
        claimDecision: acquired?.decision || SKIP_ALREADY_CLAIMED,
        commentsPosted: [],
      }),
    };
  }

  const createAgent = opts.createAgent || createCursorCloudAgent;
  /** @type {ReturnType<typeof mapFactoryCloudAgentCreateResult>} */
  let mapping;
  try {
    const apiResult = await createAgent(apiKey, payload, opts.cursorDeps);
    mapping = mapFactoryCloudAgentCreateResult({ apiResult, claimed: true });
  } catch (error) {
    mapping = mapFactoryCloudAgentCreateResult({ error, claimed: true });
  }

  const posted = [];
  if (!mapping.identity) {
    const release = opts.releaseClaim || releaseCursorIssueActivationClaim;
    await release({
      token: opts.githubToken || '',
      repo: envelope.repository,
      issueNumber: sourceIssue,
      claim: acquired.claim,
      postComment: opts.postComment,
    });
    if (opts.postComment) {
      const receipt = formatFactoryCursorHandoffReceiptComment(
        buildFactoryCursorHandoffReceipt({
          sourceIssue,
          handoffRunId: opts.handoffRunId,
          handedOffAt: opts.nowIso,
          state: mapping.receiptState,
          blocker: mapping.blocker,
          updatedAt: opts.nowIso,
        }),
      );
      await opts.postComment(sourceIssue, receipt);
      posted.push('handoff_receipt');
    }
    return {
      ok: false,
      evidence: buildFactoryCloudAgentExecutionEvidence({
        mode,
        envelope,
        sourceIssue,
        handoffRunId: opts.handoffRunId,
        startedAt: opts.nowIso,
        mapping,
        dryRun: false,
        claimDecision: acquired.decision,
        commentsPosted: posted,
      }),
    };
  }

  const successComments = formatFactoryCloudAgentSuccessComments({
    envelope,
    identity: mapping.identity,
    claim: acquired.claim,
    startedAt: opts.nowIso,
    existingWorkRequest: Boolean(existingRequest),
  });
  if (opts.postComment) {
    for (const comment of successComments) {
      await opts.postComment(sourceIssue, comment.body);
      posted.push(comment.kind);
    }
  }

  return {
    ok: true,
    evidence: buildFactoryCloudAgentExecutionEvidence({
      mode,
      envelope,
      sourceIssue,
      handoffRunId: opts.handoffRunId,
      startedAt: opts.nowIso,
      mapping,
      dryRun: false,
      claimDecision: acquired.decision,
      commentsPosted: posted,
    }),
    envelope,
    payload,
  };
}

/**
 * Poll one already-correlated Cloud Agents v1 identity.
 *
 * @param {{
 *   apiKey: string,
 *   agentId: string,
 *   comments?: Array<{ body?: string | null }>,
 *   sourceIssue?: number | null,
 *   hasPr?: boolean,
 *   operatorReview?: boolean,
 *   startedAt?: string | null,
 *   getAgent?: typeof getCursorCloudAgent,
 *   cursorDeps?: { fetch?: typeof fetch, timeoutMs?: number },
 * }} opts
 */
export async function pollKnownFactoryCursorAgent(opts) {
  const gate = shouldPollKnownCursorAgent({
    agentId: opts.agentId,
    comments: opts.comments,
    sourceIssue: opts.sourceIssue,
  });
  if (!gate.poll) {
    return { ok: false, polled: false, reason: gate.reason, mapping: null };
  }
  const getAgent = opts.getAgent || getCursorCloudAgent;
  const apiResult = await getAgent(opts.apiKey, opts.agentId, opts.cursorDeps);
  const mapping = mapPolledCursorAgentToFactoryLifecycle(apiResult, {
    hasPr: opts.hasPr,
    operatorReview: opts.operatorReview,
    startedAt: opts.startedAt,
  });
  return { ok: true, polled: true, reason: gate.reason, mapping, apiResult };
}
