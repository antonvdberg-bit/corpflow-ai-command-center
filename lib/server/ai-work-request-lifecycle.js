/**
 * Correlated AI → Cursor lifecycle readback (#1059).
 *
 * Adds one durable `work_request_id` envelope on the existing GitHub issue
 * record and normalizes already-emitted factory evidence into:
 * REQUESTED | IN_PROGRESS | BLOCKED | COMPLETED.
 *
 * Reuses existing GitHub markers (handoff, activation claim, origin metadata,
 * lifecycle state, completion event). Does not create a second dispatcher,
 * database, or Cursor wake path.
 *
 * GitHub remains the durable source of truth. Live n8n modification is not
 * authorized by this module.
 *
 * @see docs/operations/AI_WORK_REQUEST_LIFECYCLE_V1.md
 */

import { randomUUID } from 'node:crypto';

import { parseCursorActivationClaimFromText } from './cursor-activation-claim.js';
import { parseCursorLifecycleStateFromText } from './cursor-agent-lifecycle.js';
import {
  extractCursorAgentIdFromText,
  extractCursorRunIdFromText,
} from './cursor-cloud-agent-client.js';
import { redactSecretsFromText } from './cursor-ops-status.js';
import { parseCursorOriginMetadataFromText } from './cursor-origin-metadata.js';
import { parseFactoryHandoffSourceIssue } from './factory-cursor-handoff.js';
import { parseCursorCompletionEventFromText } from './cursor-wip-control.js';

export const AI_WORK_REQUEST_SCHEMA = 'corpflow.ai_work_request.v1';
export const AI_WORK_REQUEST_MARKER = 'corpflow.ai_work_request.v1';
export const AI_WORK_STATUS_SCHEMA = 'corpflow.ai_work_status.v1';
export const AI_WORK_STATUS_MARKER = 'corpflow.ai_work_status.v1';

export const AI_WORK_REQUEST_STATUSES = Object.freeze([
  'REQUESTED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
]);

export const MISSING_TRANSPORT_BOUNDARY =
  'MISSING TRANSPORT BOUNDARY — n8n → originating AI controller';

const WORK_REQUEST_ID_RE =
  /^cfai-wr-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SENSITIVE_KEY_RE =
  /secret|token|password|authorization|api[_-]?key|credential|postgres|webhook[_-]?url|private[_-]?key|access[_-]?key/i;

/**
 * @typedef {'REQUESTED'|'IN_PROGRESS'|'BLOCKED'|'COMPLETED'} AiWorkRequestStatus
 */

/**
 * @typedef {{
 *   schema: string,
 *   work_request_id: string,
 *   source_issue: number,
 *   origin_controller: string,
 *   requested_at: string,
 *   requested_outcome: string,
 *   status: AiWorkRequestStatus,
 *   protected_action_required: boolean,
 * }} AiWorkRequest
 */

/**
 * @typedef {{
 *   schema: string,
 *   work_request_id: string,
 *   source_issue: number,
 *   status: AiWorkRequestStatus,
 *   cursor_agent_id: string | null,
 *   cursor_run_id: string | null,
 *   branch: string | null,
 *   pr_number: number | null,
 *   pr_url: string | null,
 *   head_sha: string | null,
 *   ci_state: string | null,
 *   blocker: string | null,
 *   next_action: string | null,
 *   updated_at: string,
 *   protected_action_required: boolean,
 *   fingerprint: string,
 * }} AiWorkRequestStatusObject
 */

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
function toBoolean(value) {
  if (value === true || value === false) return value;
  const s = String(value || '').trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1';
}

/**
 * Preferred durable request id: `cfai-wr-<uuid>`.
 *
 * @param {string | null | undefined} [existing]
 * @returns {string}
 */
export function createWorkRequestId(existing) {
  const given = emptyToNull(existing);
  if (given && isValidWorkRequestId(given)) return given;
  return `cfai-wr-${randomUUID()}`;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidWorkRequestId(value) {
  return WORK_REQUEST_ID_RE.test(String(value || '').trim());
}

/**
 * @param {unknown} value
 * @returns {AiWorkRequestStatus}
 */
export function normalizeAiWorkRequestStatus(value) {
  const upper = String(value || '').trim().toUpperCase();
  if (AI_WORK_REQUEST_STATUSES.includes(/** @type {AiWorkRequestStatus} */ (upper))) {
    return /** @type {AiWorkRequestStatus} */ (upper);
  }
  return 'REQUESTED';
}

/**
 * Drop secrets, credentials, tokens, and webhook URLs from a request payload
 * before it is written to GitHub or returned to a controller.
 *
 * @param {unknown} input
 * @returns {Record<string, unknown>}
 */
export function redactAiWorkRequestPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = String(rawKey);
    if (SENSITIVE_KEY_RE.test(key)) continue;
    if (typeof rawValue === 'string') {
      const text = redactSecretsFromText(rawValue);
      if (/webhook\.site|hooks\.n8n|n8n\.cloud\/webhook|x-n8n-secret/i.test(text)) continue;
      if (/https?:\/\/[^\s]+\/webhook\/[A-Za-z0-9_-]{12,}/i.test(text)) continue;
      out[key] = text;
      continue;
    }
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      out[key] = redactAiWorkRequestPayload(rawValue);
      continue;
    }
    if (typeof rawValue === 'number' || typeof rawValue === 'boolean' || rawValue == null) {
      out[key] = rawValue;
    }
  }
  return out;
}

/**
 * @param {Partial<AiWorkRequest> & { source_issue: number }} input
 * @returns {AiWorkRequest}
 */
export function buildAiWorkRequest(input) {
  const sourceIssue = toPositiveInt(input.source_issue);
  if (sourceIssue == null) {
    throw new Error('buildAiWorkRequest requires source_issue');
  }
  const redacted = redactAiWorkRequestPayload(input);
  return {
    schema: AI_WORK_REQUEST_SCHEMA,
    work_request_id: createWorkRequestId(
      emptyToNull(input.work_request_id) || emptyToNull(redacted.work_request_id),
    ),
    source_issue: sourceIssue,
    origin_controller:
      emptyToNull(redacted.origin_controller) ||
      emptyToNull(input.origin_controller) ||
      'unknown',
    requested_at:
      emptyToNull(redacted.requested_at) ||
      emptyToNull(input.requested_at) ||
      new Date().toISOString(),
    requested_outcome:
      emptyToNull(redacted.requested_outcome) ||
      emptyToNull(input.requested_outcome) ||
      'bounded Cursor implementation packet',
    status: normalizeAiWorkRequestStatus(input.status),
    protected_action_required: toBoolean(input.protected_action_required),
  };
}

/**
 * @param {AiWorkRequest} request
 * @returns {string}
 */
export function formatAiWorkRequestComment(request) {
  const r = buildAiWorkRequest(request);
  const json = JSON.stringify(r);
  return `AI WORK REQUEST

work_request_id: ${r.work_request_id}
Source issue: #${r.source_issue}
Origin controller: ${r.origin_controller}
Requested at: ${r.requested_at}
Requested outcome: ${r.requested_outcome}
Status: ${r.status}
Protected action required: ${r.protected_action_required ? 'YES' : 'NO'}

<!-- ${AI_WORK_REQUEST_MARKER} ${json} -->
`;
}

/**
 * @param {unknown} text
 * @returns {AiWorkRequest | null}
 */
export function parseAiWorkRequestFromText(text) {
  const body = String(text || '');
  const match = body.match(
    new RegExp(`<!--\\s*${AI_WORK_REQUEST_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (!parsed || parsed.schema !== AI_WORK_REQUEST_SCHEMA) return null;
    const request = buildAiWorkRequest(parsed);
    if (!isValidWorkRequestId(request.work_request_id) || !request.source_issue) return null;
    return request;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} text
 * @returns {AiWorkRequestStatusObject | null}
 */
export function parseAiWorkRequestStatusFromText(text) {
  const body = String(text || '');
  const match = body.match(
    new RegExp(`<!--\\s*${AI_WORK_STATUS_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (!parsed || parsed.schema !== AI_WORK_STATUS_SCHEMA) return null;
    return buildAiWorkRequestStatus(parsed);
  } catch {
    return null;
  }
}

/**
 * @param {Array<{ body?: string | null } | string> | null | undefined} texts
 * @returns {string[]}
 */
export function collectEvidenceTexts(texts) {
  if (!Array.isArray(texts)) return [];
  return texts
    .map((item) => (typeof item === 'string' ? item : String(item?.body || '')))
    .filter((body) => body.trim().length > 0);
}

/**
 * Latest work-request marker from issue body + comments.
 *
 * @param {{ body?: string | null, number?: number } | null | undefined} issue
 * @param {Array<{ body?: string | null }> | null | undefined} comments
 * @returns {AiWorkRequest | null}
 */
export function findAiWorkRequest(issue, comments) {
  const bodies = [String(issue?.body || ''), ...collectEvidenceTexts(comments)];
  /** @type {AiWorkRequest | null} */
  let found = null;
  for (const body of bodies) {
    const parsed = parseAiWorkRequestFromText(body);
    if (!parsed) continue;
    const issueNumber = toPositiveInt(issue?.number);
    if (issueNumber != null && parsed.source_issue !== issueNumber) continue;
    found = parsed;
  }
  return found;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isFactoryHandoffOnlyText(text) {
  return parseFactoryHandoffSourceIssue(text) != null;
}

/**
 * Independent Cursor pickup evidence. Issue/comment/handoff creation is not enough.
 *
 * @param {string} text
 * @returns {{
 *   cursor_agent_id: string | null,
 *   cursor_run_id: string | null,
 *   branch: string | null,
 *   pr_number: number | null,
 *   pr_url: string | null,
 *   head_sha: string | null,
 *   ci_state: string | null,
 *   blocker: string | null,
 *   next_action: string | null,
 *   lifecycle_phase: string | null,
 *   completion_status: string | null,
 *   anton_required: boolean,
 *   claim_status: string | null,
 *   picked_up: boolean,
 *   active_execution: boolean,
 * }}
 */
export function extractCursorPickupEvidence(text) {
  const empty = {
    cursor_agent_id: /** @type {string | null} */ (null),
    cursor_run_id: /** @type {string | null} */ (null),
    branch: /** @type {string | null} */ (null),
    pr_number: /** @type {number | null} */ (null),
    pr_url: /** @type {string | null} */ (null),
    head_sha: /** @type {string | null} */ (null),
    ci_state: /** @type {string | null} */ (null),
    blocker: /** @type {string | null} */ (null),
    next_action: /** @type {string | null} */ (null),
    lifecycle_phase: /** @type {string | null} */ (null),
    completion_status: /** @type {string | null} */ (null),
    anton_required: false,
    claim_status: /** @type {string | null} */ (null),
    picked_up: false,
    active_execution: false,
  };

  const body = String(text || '');
  if (!body.trim()) return empty;

  const claim = parseCursorActivationClaimFromText(body);
  if (claim) {
    const agent = emptyToNull(claim.agentRunId);
    return {
      ...empty,
      cursor_agent_id: agent,
      cursor_run_id: agent && /^run-/i.test(agent) ? agent : null,
      claim_status: claim.status,
      picked_up: Boolean(agent),
      active_execution: claim.status === 'pending' || claim.status === 'activated',
    };
  }

  const origin = parseCursorOriginMetadataFromText(body);
  if (origin && (origin.cursorAgentId || origin.cursorRunId)) {
    return {
      ...empty,
      cursor_agent_id: emptyToNull(origin.cursorAgentId),
      cursor_run_id: emptyToNull(origin.cursorRunId),
      branch: emptyToNull(origin.branch),
      pr_number: toPositiveInt(origin.prNumber),
      head_sha: emptyToNull(origin.headSha),
      picked_up: true,
      active_execution: !origin.prNumber,
    };
  }

  const lifecycle = parseCursorLifecycleStateFromText(body);
  if (lifecycle && lifecycle.cursorAgentId) {
    const phase = String(lifecycle.phase || '').toUpperCase();
    return {
      ...empty,
      cursor_agent_id: emptyToNull(lifecycle.cursorAgentId),
      cursor_run_id: emptyToNull(lifecycle.cursorRunId),
      branch: emptyToNull(lifecycle.branch),
      pr_number: toPositiveInt(lifecycle.prNumber),
      pr_url: emptyToNull(lifecycle.prUrl),
      head_sha: emptyToNull(lifecycle.headSha),
      lifecycle_phase: phase,
      picked_up: true,
      active_execution: phase === 'RUNNING' || phase === 'PENDING',
      blocker:
        phase === 'FAILED' || phase === 'STALE'
          ? emptyToNull(lifecycle.lastError) || phase
          : null,
    };
  }

  if (/CURSOR DISPATCH ACTIVATED/i.test(body) && !/CORPFLOW FACTORY HANDOFF/i.test(body)) {
    const agent = extractCursorAgentIdFromText(body);
    const run = extractCursorRunIdFromText(body);
    if (agent || run) {
      return {
        ...empty,
        cursor_agent_id: agent,
        cursor_run_id: run,
        picked_up: true,
        active_execution: true,
      };
    }
  }

  const completion = parseCursorCompletionEventFromText(body);
  if (completion && typeof completion === 'object') {
    const agent =
      emptyToNull(completion.cursor_agent_id) ||
      emptyToNull(completion.agent_run_id);
    const run = emptyToNull(completion.cursor_run_id);
    const status = String(completion.status || '').toUpperCase();
    return {
      ...empty,
      cursor_agent_id: agent,
      cursor_run_id: run,
      branch: emptyToNull(completion.branch),
      pr_number: toPositiveInt(completion.pr),
      pr_url: emptyToNull(completion.pr_url),
      head_sha: emptyToNull(completion.sha),
      ci_state: emptyToNull(completion.ci_check_result),
      blocker: emptyToNull(completion.blocker),
      next_action: emptyToNull(completion.next_action),
      completion_status: status || null,
      anton_required: Boolean(completion.anton_required),
      picked_up: Boolean(agent || run),
      active_execution: status === 'RUNNING' || status === 'PENDING' || status === 'WORKING',
    };
  }

  return empty;
}

/**
 * @param {Array<ReturnType<typeof extractCursorPickupEvidence>>} evidence
 */
function mergePickupEvidence(evidence) {
  const merged = {
    cursor_agent_id: /** @type {string | null} */ (null),
    cursor_run_id: /** @type {string | null} */ (null),
    branch: /** @type {string | null} */ (null),
    pr_number: /** @type {number | null} */ (null),
    pr_url: /** @type {string | null} */ (null),
    head_sha: /** @type {string | null} */ (null),
    ci_state: /** @type {string | null} */ (null),
    blocker: /** @type {string | null} */ (null),
    next_action: /** @type {string | null} */ (null),
    lifecycle_phase: /** @type {string | null} */ (null),
    completion_status: /** @type {string | null} */ (null),
    anton_required: false,
    claim_status: /** @type {string | null} */ (null),
    picked_up: false,
    active_execution: false,
    named_blocker: false,
  };
  for (const item of evidence) {
    merged.cursor_agent_id = item.cursor_agent_id || merged.cursor_agent_id;
    merged.cursor_run_id = item.cursor_run_id || merged.cursor_run_id;
    merged.branch = item.branch || merged.branch;
    merged.pr_number = item.pr_number || merged.pr_number;
    merged.pr_url = item.pr_url || merged.pr_url;
    merged.head_sha = item.head_sha || merged.head_sha;
    merged.ci_state = item.ci_state || merged.ci_state;
    merged.next_action = item.next_action || merged.next_action;
    merged.anton_required = merged.anton_required || item.anton_required;
    merged.picked_up = merged.picked_up || item.picked_up;
    const hasStructuredState = Boolean(
      item.lifecycle_phase || item.completion_status || item.claim_status,
    );
    if (!hasStructuredState && !item.picked_up) continue;
    if (hasStructuredState) {
      merged.lifecycle_phase = item.lifecycle_phase || merged.lifecycle_phase;
      merged.completion_status = item.completion_status || merged.completion_status;
      merged.claim_status = item.claim_status || merged.claim_status;
      merged.active_execution = item.active_execution;
      merged.blocker = item.blocker || merged.blocker;
      merged.named_blocker = Boolean(
        item.blocker &&
          (item.lifecycle_phase === 'FAILED' ||
            item.lifecycle_phase === 'STALE' ||
            item.completion_status === 'FAILED' ||
            item.completion_status === 'STALE' ||
            item.completion_status === 'BLOCKED'),
      );
    } else if (item.active_execution) {
      merged.active_execution = true;
    }
  }
  return merged;
}

/**
 * Normalize existing GitHub evidence into the four controller states.
 * Issue/comment/handoff creation alone stays REQUESTED.
 *
 * @param {{
 *   issue?: { number?: number, body?: string | null } | null,
 *   comments?: Array<{ body?: string | null }> | null,
 *   now?: Date,
 * }} [input]
 * @returns {AiWorkRequestStatusObject | null}
 */
export function deriveAiWorkRequestStatus(input = {}) {
  const issue = input.issue || null;
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const request = findAiWorkRequest(issue, comments);
  if (!request) return null;

  const texts = [String(issue?.body || ''), ...collectEvidenceTexts(comments)];
  const evidence = mergePickupEvidence(texts.map((text) => extractCursorPickupEvidence(text)));
  const handoffOnly = texts.some((text) => isFactoryHandoffOnlyText(text));

  /** @type {AiWorkRequestStatus} */
  let status = 'REQUESTED';
  let blocker = evidence.blocker;
  let nextAction = evidence.next_action;

  const completed =
    evidence.completion_status === 'COMPLETED' ||
    evidence.lifecycle_phase === 'COMPLETED' ||
    evidence.claim_status === 'completed';

  if (completed && evidence.picked_up) {
    status = 'COMPLETED';
    nextAction = nextAction || 'Operator review — do not treat as merged or deployed';
  } else if (evidence.named_blocker && !evidence.active_execution) {
    status = 'BLOCKED';
    nextAction = nextAction || 'Inspect named blocker; do not invent a second dispatcher';
  } else if (evidence.picked_up) {
    status = 'IN_PROGRESS';
    nextAction = nextAction || 'Await Cursor terminal evidence on the same work record';
  } else {
    status = 'REQUESTED';
    nextAction =
      nextAction ||
      (handoffOnly
        ? 'Factory handoff is not Cursor pickup — wait for agent/run evidence'
        : 'Wait for independent Cursor pickup evidence');
  }

  return buildAiWorkRequestStatus({
    work_request_id: request.work_request_id,
    source_issue: request.source_issue,
    status,
    cursor_agent_id: evidence.cursor_agent_id,
    cursor_run_id: evidence.cursor_run_id,
    branch: evidence.branch,
    pr_number: evidence.pr_number,
    pr_url: evidence.pr_url,
    head_sha: evidence.head_sha,
    ci_state: evidence.ci_state,
    blocker: status === 'BLOCKED' ? blocker : status === 'COMPLETED' ? null : blocker,
    next_action: nextAction,
    updated_at: (input.now || new Date()).toISOString(),
    protected_action_required: request.protected_action_required,
  });
}

/**
 * @param {Partial<AiWorkRequestStatusObject> & { work_request_id: string, source_issue: number }} input
 * @returns {AiWorkRequestStatusObject}
 */
export function buildAiWorkRequestStatus(input) {
  const sourceIssue = toPositiveInt(input.source_issue);
  const workRequestId = createWorkRequestId(input.work_request_id);
  if (sourceIssue == null || !isValidWorkRequestId(workRequestId)) {
    throw new Error('buildAiWorkRequestStatus requires work_request_id and source_issue');
  }
  const status = normalizeAiWorkRequestStatus(input.status);
  const obj = {
    schema: AI_WORK_STATUS_SCHEMA,
    work_request_id: workRequestId,
    source_issue: sourceIssue,
    status,
    cursor_agent_id: emptyToNull(input.cursor_agent_id),
    cursor_run_id: emptyToNull(input.cursor_run_id),
    branch: emptyToNull(input.branch),
    pr_number: toPositiveInt(input.pr_number),
    pr_url: emptyToNull(input.pr_url),
    head_sha: emptyToNull(input.head_sha),
    ci_state: emptyToNull(input.ci_state),
    blocker: emptyToNull(input.blocker),
    next_action: emptyToNull(input.next_action),
    updated_at: emptyToNull(input.updated_at) || new Date().toISOString(),
    protected_action_required: toBoolean(input.protected_action_required),
    fingerprint: '',
  };
  obj.fingerprint = buildAiWorkRequestStatusFingerprint(obj);
  return obj;
}

/**
 * @param {Pick<AiWorkRequestStatusObject, 'work_request_id'|'status'|'cursor_agent_id'|'cursor_run_id'|'pr_number'|'head_sha'|'ci_state'|'blocker'|'protected_action_required'>} input
 */
export function buildAiWorkRequestStatusFingerprint(input) {
  return [
    'ai_work_request',
    emptyToNull(input.work_request_id) || 'no-id',
    normalizeAiWorkRequestStatus(input.status),
    emptyToNull(input.cursor_agent_id) || 'no-agent',
    emptyToNull(input.cursor_run_id) || 'no-run',
    toPositiveInt(input.pr_number) || 'no-pr',
    emptyToNull(input.head_sha) || 'no-sha',
    emptyToNull(input.ci_state) || 'no-ci',
    emptyToNull(input.blocker) || 'no-blocker',
    toBoolean(input.protected_action_required) ? 'protected' : 'unprotected',
  ].join('|');
}

/**
 * Unchanged lifecycle state must not fan out again.
 *
 * @param {string | null | undefined} previousFingerprint
 * @param {string | null | undefined} nextFingerprint
 */
export function shouldEmitAiWorkRequestStatus(previousFingerprint, nextFingerprint) {
  const next = emptyToNull(nextFingerprint);
  if (!next) return false;
  return emptyToNull(previousFingerprint) !== next;
}

/**
 * @param {AiWorkRequestStatusObject} status
 */
export function formatAiWorkRequestStatusComment(status) {
  const s = buildAiWorkRequestStatus(status);
  const json = JSON.stringify(s);
  return `AI WORK REQUEST STATUS

work_request_id: ${s.work_request_id}
Source issue: #${s.source_issue}
Status: ${s.status}
Cursor agent: ${s.cursor_agent_id || 'n/a'}
Cursor run: ${s.cursor_run_id || 'n/a'}
Branch: ${s.branch || 'n/a'}
PR: ${s.pr_number != null ? `#${s.pr_number}` : 'n/a'}
Head SHA: ${s.head_sha || 'n/a'}
CI: ${s.ci_state || 'n/a'}
Blocker: ${s.blocker || 'none'}
Next action: ${s.next_action || 'n/a'}
Protected action required: ${s.protected_action_required ? 'YES' : 'NO'}

<!-- ${AI_WORK_STATUS_MARKER} ${json} -->
`;
}

/**
 * Public machine-readback object (no fingerprint required by the controller).
 *
 * @param {AiWorkRequestStatusObject} status
 */
export function toControllerReadbackObject(status) {
  const s = buildAiWorkRequestStatus(status);
  return {
    work_request_id: s.work_request_id,
    source_issue: s.source_issue,
    status: s.status,
    cursor_agent_id: s.cursor_agent_id,
    cursor_run_id: s.cursor_run_id,
    branch: s.branch,
    pr_number: s.pr_number,
    pr_url: s.pr_url,
    head_sha: s.head_sha,
    ci_state: s.ci_state,
    blocker: s.blocker,
    next_action: s.next_action,
    updated_at: s.updated_at,
    protected_action_required: s.protected_action_required,
  };
}

/**
 * Audit the existing n8n/GitHub bridge before inventing a new callback.
 *
 * @returns {{
 *   boundary: string,
 *   available_transport: string[],
 *   missing_interface: string,
 *   smallest_compatible_extension: string,
 *   overbuild_forbidden: true,
 * }}
 */
export function auditAiControllerReadbackTransport() {
  return {
    boundary: MISSING_TRANSPORT_BOUNDARY,
    available_transport: [
      'GitHub issue body/comments as durable source of truth (pollable via existing GitHub App auth)',
      'CorpFlow automation forward hardened v2: app → n8n only (corpflow.automation.envelope.v1)',
      'Existing GitHub Heartbeat Checker evaluate output (ephemeral; Telegram remains exception-only)',
      'Existing corpflow.cursor_completion_event.v1 comments for exception paging',
    ],
    missing_interface:
      'No n8n → originating AI controller callback webhook, signed response contract, or poll endpoint that returns the normalized status object to the submitting controller.',
    smallest_compatible_extension:
      'Do not invent a new callback transport. The originating controller should poll the durable GitHub work record for corpflow.ai_work_request.v1 / corpflow.ai_work_status.v1. After a separate Anton-approved in-place Heartbeat paste, the existing evaluate node may also emit ai_work_statuses in its current JSON output. Live n8n edit is not authorized by #1059.',
    overbuild_forbidden: true,
  };
}
