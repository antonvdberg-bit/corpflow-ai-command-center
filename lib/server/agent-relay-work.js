/**
 * CorpFlowAI Agent Relay Phase 2 Slice 1 (#1093).
 *
 * Strict server-side work contract for bounded GitHub evidence reads. This is
 * deliberately not a generic GitHub proxy: callers select a named operation,
 * while this module owns every endpoint, method, response projection, and
 * identity boundary.
 */
import crypto from 'crypto';

import { getSessionFromRequest } from './session.js';
import { verifyCronBearerAuth } from './factory-master-auth.js';
import {
  AGENT_RELAY_REPOSITORIES,
  assertAgentRelayRepository,
  assertGithubAppRelayCommentProvenance,
  getGithubAppInstallationToken,
} from './github-app-relay.js';

export const AGENT_RELAY_WORK_SCHEMA = 'corpflow.agent_relay.work.v1';
export const AGENT_RELAY_WORK_MAX_BYTES = 24 * 1024;
const API_ROOT = 'https://api.github.com';
const MAX_EVIDENCE_ITEMS = 8;
const MAX_DIFF_BYTES = 160 * 1024;
const MAX_LIST_ITEMS = 100;
export const AGENT_RELAY_COMMENT_BODY_MAX_BYTES = 8 * 1024;
const GITHUB_COMMENT_TIMESTAMP_SKEW_MS = 60_000;
const SHA_PATTERN = /^[a-f0-9]{40,64}$/;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;
const ACTOR_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:@/-]{1,127}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const OPERATIONS = Object.freeze({
  'repository.get_metadata': { targetType: 'repository', evidence: ['repository_metadata'] },
  'issue.get_metadata': { targetType: 'issue', evidence: ['issue_metadata'] },
  'issue.list_comments': { targetType: 'issue', evidence: ['issue_comments'] },
  'pull_request.get_metadata': { targetType: 'pull_request', evidence: ['pull_request_metadata'] },
  'pull_request.list_files': { targetType: 'pull_request', evidence: ['pull_request_files'] },
  'pull_request.get_diff': { targetType: 'pull_request', evidence: ['pull_request_diff'], shaSensitive: true },
  'pull_request.list_reviews': { targetType: 'pull_request', evidence: ['pull_request_reviews'] },
  'pull_request.list_review_comments': { targetType: 'pull_request', evidence: ['pull_request_review_comments'] },
  'pull_request.get_head': { targetType: 'pull_request', evidence: ['pull_request_head'], shaSensitive: true },
  'pull_request.list_check_runs': { targetType: 'pull_request', evidence: ['check_runs'], shaSensitive: true },
  'pull_request.list_workflow_runs': { targetType: 'pull_request', evidence: ['workflow_runs'], shaSensitive: true },
  'issue.add_comment': { targetType: 'issue', evidence: ['issue_comment'], write: true },
});

export const AGENT_RELAY_READ_OPERATIONS = Object.freeze(
  Object.keys(OPERATIONS).filter((operation) => !OPERATIONS[operation].write),
);
export const AGENT_RELAY_WRITE_OPERATIONS = Object.freeze(
  Object.keys(OPERATIONS).filter((operation) => OPERATIONS[operation].write),
);

function safeString(value) {
  return value == null ? '' : String(value).trim();
}

function normalizeCommentBody(value) {
  return String(value || '').replace(/\r\n?/g, '\n').trim();
}

function relayError(code, status = 400) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertExactKeys(value, allowed, code) {
  if (!isPlainObject(value) || Object.keys(value).some((key) => !allowed.includes(key))) throw relayError(code);
}

function assertString(value, pattern, code, { max = 128, min = 1 } = {}) {
  const normalized = safeString(value);
  if (normalized.length < min || normalized.length > max || !pattern.test(normalized)) throw relayError(code);
  return normalized;
}

function assertTimestamp(value, code) {
  const normalized = safeString(value);
  const parsed = Date.parse(normalized);
  if (!ISO_TIMESTAMP_PATTERN.test(normalized) || !Number.isFinite(parsed)) throw relayError(code);
  return { value: normalized, ms: parsed };
}

function projectUser(user) {
  return {
    login: safeString(user?.login).slice(0, 128),
    type: safeString(user?.type).slice(0, 32),
  };
}

function projectLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((entry) => {
      if (typeof entry === 'string') return safeString(entry).slice(0, 64);
      return safeString(entry?.name).slice(0, 64);
    })
    .filter(Boolean)
    .slice(0, 32);
}

function projectIssue(issue) {
  return {
    number: Number(issue?.number) || null,
    title: safeString(issue?.title).slice(0, 512),
    state: safeString(issue?.state).slice(0, 32),
    url: safeString(issue?.html_url).slice(0, 2048),
    author: projectUser(issue?.user),
    labels: projectLabels(issue?.labels),
    isPullRequest: Boolean(issue?.pull_request),
    createdAt: safeString(issue?.created_at),
    updatedAt: safeString(issue?.updated_at),
  };
}

function projectPr(pr) {
  const mergeable = pr?.mergeable;
  return {
    number: Number(pr?.number) || null,
    title: safeString(pr?.title).slice(0, 512),
    state: safeString(pr?.state).slice(0, 32),
    draft: Boolean(pr?.draft),
    merged: Boolean(pr?.merged),
    mergeable: mergeable == null ? null : Boolean(mergeable),
    mergeableState: safeString(pr?.mergeable_state).slice(0, 32),
    url: safeString(pr?.html_url).slice(0, 2048),
    baseSha: safeString(pr?.base?.sha).toLowerCase(),
    headSha: safeString(pr?.head?.sha).toLowerCase(),
    author: projectUser(pr?.user),
    updatedAt: safeString(pr?.updated_at),
  };
}

function projectComment(comment) {
  return {
    id: Number(comment?.id) || null,
    url: safeString(comment?.html_url).slice(0, 2048),
    author: projectUser(comment?.user),
    body: safeString(comment?.body).slice(0, 16 * 1024),
    createdAt: safeString(comment?.created_at),
    updatedAt: safeString(comment?.updated_at),
  };
}

function headers(token, accept = 'application/vnd.github+json', extra = {}) {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  };
}

async function githubJson(fetchFn, path, token) {
  const response = await fetchFn(`${API_ROOT}${path}`, {
    headers: headers(token),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response?.ok) throw relayError('GITHUB_READ_FAILED', 503);
  return response.json();
}

async function readPr(repo, number, token, fetchFn) {
  return githubJson(fetchFn, `/repos/${repo}/pulls/${number}`, token);
}

async function resolveShaBoundPr(envelope, token, fetchFn) {
  const pr = await readPr(envelope.repository, envelope.target.number, token, fetchFn);
  const currentHead = safeString(pr?.head?.sha).toLowerCase();
  if (!SHA_PATTERN.test(currentHead)) throw relayError('GITHUB_HEAD_SHA_MISSING', 503);
  if (currentHead !== envelope.target.expectedSha) throw relayError('EXPECTED_SHA_MISMATCH', 409);
  return pr;
}

function durableMarker(envelope) {
  const identity = `${envelope.repository}:${envelope.target.number}:${envelope.replayIdentity}`;
  return `<!-- corpflow-agent-relay:issue.add_comment:v1:${crypto.createHash('sha256').update(identity).digest('hex')} -->`;
}

function writeFingerprint(envelope) {
  const canonical = JSON.stringify({
    operation: envelope.operation,
    repository: envelope.repository,
    target: { type: envelope.target.type, number: envelope.target.number },
    commentBody: normalizeCommentBody(envelope.payload.commentBody),
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function isUniqueConstraint(error) {
  return error?.code === 'P2002' || /unique constraint/i.test(safeString(error?.message));
}

async function claimCommentWrite(prisma, envelope) {
  if (!prisma?.agentRelayClaim) throw relayError('RELAY_DURABLE_STORE_UNAVAILABLE', 503);
  const marker = durableMarker(envelope);
  const fingerprint = writeFingerprint(envelope);
  try {
    const row = await prisma.agentRelayClaim.create({
      data: {
        repository: envelope.repository,
        targetNumber: envelope.target.number,
        replayIdentity: envelope.replayIdentity,
        requestId: envelope.requestId,
        correlationId: envelope.correlationId,
        operation: envelope.operation,
        writeFingerprint: fingerprint,
        state: 'claimed',
        marker,
      },
      select: {
        id: true, repository: true, targetNumber: true, replayIdentity: true,
        writeFingerprint: true, state: true, marker: true, commentId: true, commentUrl: true,
        botLogin: true, appSlug: true, createdAt: true,
      },
    });
    return { owned: true, row };
  } catch (error) {
    if (!isUniqueConstraint(error)) throw relayError('RELAY_DURABLE_CLAIM_FAILED', 503);
    const row = await prisma.agentRelayClaim.findUnique({
      where: {
        agent_relay_claims_target_replay: {
          repository: envelope.repository,
          targetNumber: envelope.target.number,
          replayIdentity: envelope.replayIdentity,
        },
      },
      select: {
        id: true, repository: true, targetNumber: true, replayIdentity: true,
        writeFingerprint: true, state: true, marker: true, commentId: true, commentUrl: true,
        botLogin: true, appSlug: true, createdAt: true,
      },
    });
    if (!row) throw relayError('RELAY_DURABLE_CLAIM_FAILED', 503);
    if (row.writeFingerprint !== fingerprint) throw relayError('RELAY_REPLAY_IDENTITY_MISMATCH', 409);
    return { owned: false, row };
  }
}

async function updateClaim(prisma, id, data) {
  return prisma.agentRelayClaim.update({ where: { id }, data });
}

function commentEvidence(comment, envelope, configOverrides) {
  const marker = durableMarker(envelope);
  if (!safeString(comment?.body).includes(marker)) throw relayError('RELAY_DURABLE_MARKER_MISMATCH', 503);
  const identity = assertGithubAppRelayCommentProvenance(comment, configOverrides);
  const commentId = Number(comment?.id);
  if (!Number.isInteger(commentId) || commentId < 1) throw relayError('GITHUB_COMMENT_READBACK_INVALID', 503);
  return {
    commentId: String(commentId),
    commentUrl: safeString(comment?.html_url).slice(0, 2048),
    botLogin: identity.botLogin,
    appSlug: identity.appSlug,
    provenance: 'PASS',
  };
}

async function findDurableComment(envelope, token, fetchFn, configOverrides, createdAt) {
  const repo = encodeURIComponent(envelope.repository).replace('%2F', '/');
  // GitHub issue-comment timestamps are second-granular while Postgres claims
  // retain milliseconds. Widen by one minute so a write in the claim's same
  // second remains visible during replay recovery.
  const claimedAt = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  const since = Number.isFinite(claimedAt)
    ? new Date(Math.max(0, claimedAt - GITHUB_COMMENT_TIMESTAMP_SKEW_MS)).toISOString()
    : new Date(0).toISOString();
  const comments = await githubJson(
    fetchFn,
    `/repos/${repo}/issues/${envelope.target.number}/comments?per_page=${MAX_LIST_ITEMS}&since=${encodeURIComponent(since)}`,
    token,
  );
  const marker = durableMarker(envelope);
  const comment = (Array.isArray(comments) ? comments : []).find((candidate) => safeString(candidate?.body).includes(marker));
  return comment ? commentEvidence(comment, envelope, configOverrides) : null;
}

async function recoverOrReportClaim(envelope, claim, token, fetchFn, configOverrides, prisma) {
  const evidence = await findDurableComment(envelope, token, fetchFn, configOverrides, claim.row.createdAt);
  if (evidence) {
    await updateClaim(prisma, claim.row.id, {
      state: 'confirmed',
      commentId: evidence.commentId,
      commentUrl: evidence.commentUrl,
      botLogin: evidence.botLogin,
      appSlug: evidence.appSlug,
    });
    return { evidence: { comment: evidence }, idempotencyState: 'replay' };
  }
  throw relayError(
    claim.row.state === 'ambiguous' ? 'RELAY_AMBIGUOUS_WRITE_UNRESOLVED' : 'RELAY_CLAIM_IN_PROGRESS',
    409,
  );
}

async function performIssueComment(envelope, { fetchFn, configOverrides, prisma }) {
  assertAgentRelayRepository(envelope.repository, configOverrides);
  const token = await getGithubAppInstallationToken({
    repo: envelope.repository,
    fetchFn,
    configOverrides,
  });
  const claim = await claimCommentWrite(prisma, envelope);
  if (!claim.owned) return recoverOrReportClaim(envelope, claim, token, fetchFn, configOverrides, prisma);

  const repo = encodeURIComponent(envelope.repository).replace('%2F', '/');
  const body = `${envelope.payload.commentBody}\n\n${claim.row.marker}`;
  let created;
  try {
    created = await fetchFn(`${API_ROOT}/repos/${repo}/issues/${envelope.target.number}/comments`, {
      method: 'POST',
      headers: headers(token, 'application/vnd.github+json', { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ body }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    await updateClaim(prisma, claim.row.id, { state: 'ambiguous' });
    return recoverOrReportClaim(envelope, { ...claim, row: { ...claim.row, state: 'ambiguous' } }, token, fetchFn, configOverrides, prisma);
  }
  if (!created?.ok) {
    await updateClaim(prisma, claim.row.id, { state: 'ambiguous' });
    return recoverOrReportClaim(envelope, { ...claim, row: { ...claim.row, state: 'ambiguous' } }, token, fetchFn, configOverrides, prisma);
  }
  const createdPayload = await created.json();
  const commentId = Number(createdPayload?.id);
  if (!Number.isInteger(commentId) || commentId < 1) {
    await updateClaim(prisma, claim.row.id, { state: 'ambiguous' });
    throw relayError('GITHUB_COMMENT_WRITE_INVALID', 503);
  }
  try {
    const read = await githubJson(fetchFn, `/repos/${repo}/issues/comments/${commentId}`, token);
    const evidence = commentEvidence(read, envelope, configOverrides);
    await updateClaim(prisma, claim.row.id, {
      state: 'confirmed',
      commentId: evidence.commentId,
      commentUrl: evidence.commentUrl,
      botLogin: evidence.botLogin,
      appSlug: evidence.appSlug,
    });
    return { evidence: { comment: evidence }, idempotencyState: 'new_execution' };
  } catch (error) {
    await updateClaim(prisma, claim.row.id, { state: 'ambiguous' });
    throw error;
  }
}

/**
 * Parse and validate the complete external contract. No unknown top-level,
 * nested, payload, or evidence fields are accepted.
 */
export function parseAgentRelayWorkEnvelope(input, { nowMs = Date.now() } = {}) {
  if (!isPlainObject(input)) throw relayError('MALFORMED_ENVELOPE');
  assertExactKeys(input, [
    'schema', 'request_id', 'origin', 'repository', 'operation', 'target',
    'payload', 'issued_at', 'expires_at', 'replay_identity', 'correlation_id', 'requested_evidence',
  ], 'UNKNOWN_ENVELOPE_FIELD');
  if (safeString(input.schema) !== AGENT_RELAY_WORK_SCHEMA) throw relayError('UNSUPPORTED_SCHEMA_VERSION');
  const requestId = assertString(input.request_id, ID_PATTERN, 'INVALID_REQUEST_ID');
  const replayIdentity = assertString(input.replay_identity, ID_PATTERN, 'INVALID_REPLAY_IDENTITY');
  const correlationId = assertString(input.correlation_id, ID_PATTERN, 'INVALID_CORRELATION_ID');

  assertExactKeys(input.origin, ['system', 'actor'], 'INVALID_ORIGIN');
  const origin = {
    system: assertString(input.origin.system, ACTOR_PATTERN, 'INVALID_ORIGIN'),
    actor: assertString(input.origin.actor, ACTOR_PATTERN, 'INVALID_ORIGIN'),
  };
  const repository = safeString(input.repository);
  if (!AGENT_RELAY_REPOSITORIES.includes(repository)) throw relayError('REPOSITORY_NOT_ALLOWED', 403);
  const operation = safeString(input.operation);
  const operationPolicy = OPERATIONS[operation];
  if (!operationPolicy) throw relayError('OPERATION_NOT_ALLOWED', 403);

  assertExactKeys(input.target, ['type', 'number', 'identifier', 'expected_sha'], 'INVALID_TARGET');
  const type = safeString(input.target.type);
  if (type !== operationPolicy.targetType) throw relayError('TARGET_TYPE_MISMATCH');
  let target;
  if (type === 'repository') {
    if (safeString(input.target.number) || safeString(input.target.identifier) || safeString(input.target.expected_sha)) {
      throw relayError('INVALID_TARGET');
    }
    target = { type };
  } else {
    const number = Number(input.target.number);
    if (!Number.isInteger(number) || number < 1 || number > 2_000_000_000 || safeString(input.target.identifier)) {
      throw relayError('INVALID_TARGET');
    }
    const expectedSha = safeString(input.target.expected_sha).toLowerCase();
    if (operationPolicy.shaSensitive && !SHA_PATTERN.test(expectedSha)) throw relayError('EXPECTED_SHA_REQUIRED');
    if (!operationPolicy.shaSensitive && expectedSha && !SHA_PATTERN.test(expectedSha)) throw relayError('INVALID_EXPECTED_SHA');
    target = { type, number, ...(expectedSha ? { expectedSha } : {}) };
  }

  let payload = {};
  if (operationPolicy.write) {
    assertExactKeys(input.payload, ['comment_body'], 'INVALID_PAYLOAD');
    const commentBody = typeof input.payload?.comment_body === 'string' ? normalizeCommentBody(input.payload.comment_body) : '';
    if (
      !commentBody ||
      Buffer.byteLength(commentBody, 'utf8') > AGENT_RELAY_COMMENT_BODY_MAX_BYTES ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(commentBody) ||
      /corpflow-agent-relay:issue\.add_comment:v1/i.test(commentBody)
    ) {
      throw relayError('INVALID_COMMENT_BODY');
    }
    payload = { commentBody };
  } else {
    assertExactKeys(input.payload, [], 'INVALID_PAYLOAD');
  }
  if (!Array.isArray(input.requested_evidence) || input.requested_evidence.length !== 1 || input.requested_evidence.length > MAX_EVIDENCE_ITEMS) {
    throw relayError('INVALID_REQUESTED_EVIDENCE');
  }
  const requestedEvidence = input.requested_evidence.map((item) => assertString(item, /^[a-z_]+$/, 'INVALID_REQUESTED_EVIDENCE', { max: 64 }));
  if (requestedEvidence[0] !== operationPolicy.evidence[0]) throw relayError('EVIDENCE_OPERATION_MISMATCH');

  const issued = assertTimestamp(input.issued_at, 'INVALID_ISSUED_AT');
  const expires = assertTimestamp(input.expires_at, 'INVALID_EXPIRY');
  if (expires.ms <= issued.ms || expires.ms - issued.ms > 10 * 60_000 || issued.ms > nowMs + 60_000 || expires.ms <= nowMs) {
    throw relayError('REQUEST_EXPIRED', 400);
  }
  return {
    schema: AGENT_RELAY_WORK_SCHEMA,
    requestId,
    origin,
    repository,
    operation,
    target,
    payload,
    issuedAt: issued.value,
    expiresAt: expires.value,
    replayIdentity,
    correlationId,
    requestedEvidence,
  };
}

export function verifyAgentRelayControlPlaneAuth(req, deps = {}) {
  const session = (deps.getSession || getSessionFromRequest)(req);
  if (session?.ok && session.payload?.typ === 'admin') return true;
  return (deps.verifyCronBearer || verifyCronBearerAuth)(req);
}

async function performOperation(envelope, { fetchFn, configOverrides, prisma } = {}) {
  if (envelope.operation === 'issue.add_comment') {
    return performIssueComment(envelope, { fetchFn, configOverrides, prisma });
  }
  assertAgentRelayRepository(envelope.repository, configOverrides);
  const token = await getGithubAppInstallationToken({
    repo: envelope.repository,
    fetchFn,
    configOverrides,
  });
  const repo = encodeURIComponent(envelope.repository).replace('%2F', '/');
  const number = envelope.target.number;
  const list = (rows, project) => (Array.isArray(rows) ? rows : []).slice(0, MAX_LIST_ITEMS).map(project);

  switch (envelope.operation) {
    case 'repository.get_metadata': {
      const metadata = await githubJson(fetchFn, `/repos/${repo}`, token);
      return { evidence: { repository: { fullName: safeString(metadata?.full_name), private: Boolean(metadata?.private), defaultBranch: safeString(metadata?.default_branch), url: safeString(metadata?.html_url) } } };
    }
    case 'issue.get_metadata':
      return { evidence: { issue: projectIssue(await githubJson(fetchFn, `/repos/${repo}/issues/${number}`, token)) } };
    case 'issue.list_comments':
      return { evidence: { comments: list(await githubJson(fetchFn, `/repos/${repo}/issues/${number}/comments?per_page=${MAX_LIST_ITEMS}`, token), projectComment) } };
    case 'pull_request.get_metadata':
      return { evidence: { pullRequest: projectPr(await readPr(envelope.repository, number, token, fetchFn)) } };
    case 'pull_request.list_files': {
      const files = await githubJson(fetchFn, `/repos/${repo}/pulls/${number}/files?per_page=${MAX_LIST_ITEMS}`, token);
      return { evidence: { files: list(files, (file) => ({ filename: safeString(file?.filename).slice(0, 1024), status: safeString(file?.status).slice(0, 32), sha: safeString(file?.sha).toLowerCase(), additions: Number(file?.additions) || 0, deletions: Number(file?.deletions) || 0, changes: Number(file?.changes) || 0 })) } };
    }
    case 'pull_request.get_diff': {
      await resolveShaBoundPr(envelope, token, fetchFn);
      const response = await fetchFn(`${API_ROOT}/repos/${repo}/pulls/${number}`, { headers: headers(token, 'application/vnd.github.v3.diff'), signal: AbortSignal.timeout(20_000) });
      if (!response?.ok) throw relayError('GITHUB_READ_FAILED', 503);
      const diff = await response.text();
      return { evidence: { diff: diff.slice(0, MAX_DIFF_BYTES), truncated: diff.length > MAX_DIFF_BYTES } };
    }
    case 'pull_request.list_reviews':
      return { evidence: { reviews: list(await githubJson(fetchFn, `/repos/${repo}/pulls/${number}/reviews?per_page=${MAX_LIST_ITEMS}`, token), (review) => ({ id: Number(review?.id) || null, state: safeString(review?.state).slice(0, 32), author: projectUser(review?.user), submittedAt: safeString(review?.submitted_at), body: safeString(review?.body).slice(0, 16 * 1024) })) } };
    case 'pull_request.list_review_comments':
      return { evidence: { reviewComments: list(await githubJson(fetchFn, `/repos/${repo}/pulls/${number}/comments?per_page=${MAX_LIST_ITEMS}`, token), projectComment) } };
    case 'pull_request.get_head': {
      const pr = await resolveShaBoundPr(envelope, token, fetchFn);
      return { evidence: { head: { sha: safeString(pr?.head?.sha).toLowerCase(), baseSha: safeString(pr?.base?.sha).toLowerCase() } } };
    }
    case 'pull_request.list_check_runs': {
      const pr = await resolveShaBoundPr(envelope, token, fetchFn);
      const checks = await githubJson(fetchFn, `/repos/${repo}/commits/${encodeURIComponent(pr.head.sha)}/check-runs?per_page=${MAX_LIST_ITEMS}`, token);
      return { evidence: { checkRuns: list(checks?.check_runs, (check) => ({ id: Number(check?.id) || null, name: safeString(check?.name).slice(0, 256), status: safeString(check?.status).slice(0, 32), conclusion: safeString(check?.conclusion).slice(0, 64), detailsUrl: safeString(check?.details_url).slice(0, 2048) })) } };
    }
    case 'pull_request.list_workflow_runs': {
      const pr = await resolveShaBoundPr(envelope, token, fetchFn);
      const runs = await githubJson(fetchFn, `/repos/${repo}/actions/runs?head_sha=${encodeURIComponent(pr.head.sha)}&per_page=30`, token);
      return { evidence: { workflowRuns: list(runs?.workflow_runs, (run) => ({ id: Number(run?.id) || null, name: safeString(run?.name).slice(0, 256), status: safeString(run?.status).slice(0, 32), conclusion: safeString(run?.conclusion).slice(0, 64), url: safeString(run?.html_url).slice(0, 2048), headSha: safeString(run?.head_sha).toLowerCase() })) } };
    }
    default:
      throw relayError('OPERATION_NOT_ALLOWED', 403);
  }
}

function resultEnvelope(envelope, { ok, accepted, error = null, evidence = null } = {}) {
  return {
    schema: 'corpflow.agent_relay.result.v1',
    ok,
    policyAccepted: accepted,
    requestId: envelope?.requestId || null,
    correlationId: envelope?.correlationId || null,
    replayIdentity: envelope?.replayIdentity || null,
    operation: envelope?.operation || null,
    repository: envelope?.repository || null,
    target: envelope?.target || null,
    protectedActionTriggered: false,
    ...(error ? { error } : {}),
    ...(evidence ? { evidence } : {}),
  };
}

function safeErrorCode(error) {
  const code = safeString(error?.code || error?.message);
  return /^(?:AGENT_RELAY_[A-Z_]+|RELAY_[A-Z_]+|EXPECTED_SHA_MISMATCH|GITHUB_HEAD_SHA_MISSING|GITHUB_READ_FAILED|GITHUB_COMMENT_[A-Z_]+)$/.test(code)
    ? code
    : 'GITHUB_EVIDENCE_UNAVAILABLE';
}

export async function executeAgentRelayWork(envelopeInput, deps = {}) {
  let envelope;
  try {
    envelope = parseAgentRelayWorkEnvelope(envelopeInput, { nowMs: deps.nowMs });
  } catch (error) {
    return { status: error?.status || 400, body: resultEnvelope(null, { ok: false, accepted: false, error: error?.code || 'MALFORMED_ENVELOPE' }) };
  }
  try {
    const result = await performOperation(envelope, {
      fetchFn: deps.fetchFn || globalThis.fetch,
      configOverrides: deps.configOverrides,
      prisma: deps.prisma,
    });
    return {
      status: 200,
      body: {
        ...resultEnvelope(envelope, { ok: true, accepted: true, evidence: result.evidence }),
        ...(result.idempotencyState ? { idempotencyState: result.idempotencyState } : {}),
      },
    };
  } catch (error) {
    return { status: error?.status || 503, body: resultEnvelope(envelope, { ok: false, accepted: true, error: safeErrorCode(error) }) };
  }
}

async function readBoundedJsonBody(req) {
  if (isPlainObject(req.body) && !Buffer.isBuffer(req.body)) {
    const encoded = Buffer.byteLength(JSON.stringify(req.body));
    return encoded <= AGENT_RELAY_WORK_MAX_BYTES ? req.body : undefined;
  }
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body) > AGENT_RELAY_WORK_MAX_BYTES) return undefined;
    try { return JSON.parse(req.body); } catch { return null; }
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += Buffer.byteLength(chunk);
    if (total > AGENT_RELAY_WORK_MAX_BYTES) return undefined;
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export async function agentRelayWorkHandler(req, res, deps = {}) {
  if (String(req.method || '').toUpperCase() !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json(resultEnvelope(null, { ok: false, accepted: false, error: 'METHOD_NOT_ALLOWED' }));
  }
  if (!verifyAgentRelayControlPlaneAuth(req, deps)) {
    return res.status(401).json(resultEnvelope(null, { ok: false, accepted: false, error: 'UNAUTHORIZED' }));
  }
  const body = await readBoundedJsonBody(req);
  if (body === undefined) return res.status(413).json(resultEnvelope(null, { ok: false, accepted: false, error: 'PAYLOAD_TOO_LARGE' }));
  if (body === null) return res.status(400).json(resultEnvelope(null, { ok: false, accepted: false, error: 'INVALID_JSON' }));
  const outcome = await executeAgentRelayWork(body, deps);
  return res.status(outcome.status).json(outcome.body);
}

export default agentRelayWorkHandler;
