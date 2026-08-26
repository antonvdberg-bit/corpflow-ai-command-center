/**
 * Rare & Exclusive — Jan approval control surface (#1080).
 *
 * Jan du Plessis is the mandatory product/release decision gate.
 * Automation may prepare, review, and route. It must not cross this gate
 * without a recorded Jan decision bound to the exact target head SHA.
 *
 * This module is pure (no env, no fetch, no session I/O) so tests and the
 * decision page can share the same rules.
 *
 * @see docs/operations/JAN_APPROVAL_CONTROL_SURFACE_V1.md
 */

import crypto from 'crypto';

export const JAN_APPROVAL_SCHEMA = 'corpflow.jan_durable_decision.v2';

export const JAN_DECISION_MARKER = '### JAN DURABLE DECISION';

export const RARE_EXCLUSIVE_TARGET_REPO = 'antonvdberg-bit/rare-and-exclusive-collection';

export const RARE_EXCLUSIVE_BASE_BRANCH = 'rare-exclusive-greenfield';

export const RARE_EXCLUSIVE_BUILD3_MERGE_COMMIT =
  '34293747bdda8dcd132a51d87f752d6755dbfd66';

export const RARE_EXCLUSIVE_BUILD3_PR = 33;

/** Mandatory pre-release blocker — kept visibly separate from merge/review approval. */
export const RELEASE_BLOCKER_ISSUE_NUMBER = 35;

export const LUX_TENANT_ID = 'luxe-maurice';

/** Only this identity may record a Jan product decision. */
export const JAN_DECISION_ACTOR_USERNAMES = Object.freeze(['jan@luxemaurice.com']);

export const JAN_ACTOR_DISPLAY_NAME = 'Jan du Plessis';

/** Exact four decisions for the MVP. */
export const JAN_DECISIONS = Object.freeze(['APPROVE', 'CHANGES', 'HOLD', 'REVIEW_FURTHER']);
export const JAN_APPROVAL_SCOPES = Object.freeze(['review-approval-only', 'merge-only']);
export const JAN_MAX_RATIONALE_LENGTH = 500;

export const JAN_DECISION_COPY = Object.freeze({
  APPROVE: Object.freeze({
    button: 'Approve this version',
    short: 'Approve',
    meaning: 'This version matches what you want. We will record your yes against this exact version.',
  }),
  CHANGES: Object.freeze({
    button: 'Request changes',
    short: 'Changes',
    meaning: 'This is not ready. We will send the team back with your decision.',
  }),
  HOLD: Object.freeze({
    button: 'Hold for now',
    short: 'Hold',
    meaning: 'Pause. Nothing moves forward until you decide again.',
  }),
  REVIEW_FURTHER: Object.freeze({
    button: 'Ask AI to review further',
    short: 'Ask AI',
    meaning: 'You want a further review before deciding. We will request that review — we will not release or merge.',
  }),
});

/** Comment-only next steps. Never merge, deploy, or mutate production. */
export const SAFE_NEXT_STEPS = Object.freeze({
  APPROVE: 'github_comment_writeback',
  CHANGES: 'github_comment_writeback',
  HOLD: 'github_comment_writeback',
  REVIEW_FURTHER: 'request_ai_review_comment',
});

export const PROTECTED_ACTIONS = Object.freeze([
  'merge',
  'deploy',
  'production',
  'env',
  'secrets',
  'schema',
  'db',
  'payment',
  'send',
  'outreach',
  'dns',
  'repo_admin',
  'credential',
  'paid_service',
  'legal',
  'destructive',
]);

export const PRODUCT_ADVANCING_STEPS = Object.freeze([
  'release_prep',
  'merge',
  'deploy',
  'tag_release',
  'public_launch',
]);

const SYNTHETIC_HEAD_SHA = 'b7c3e1a0f4d29c8e6a1b5d7f0c3e9a12d4f6b8c0';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function str(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSha(value) {
  const raw = str(value).toLowerCase();
  if (!/^[a-f0-9]{7,64}$/.test(raw)) return '';
  return raw;
}

/**
 * @param {unknown} value
 * @returns {value is typeof JAN_DECISIONS[number]}
 */
export function isJanDecision(value) {
  return JAN_DECISIONS.includes(/** @type {string} */ (str(value).toUpperCase()));
}

/**
 * A decision scope is evidence of what Jan reviewed, not authority to carry
 * out the named action. Protected actions remain separately fail-closed.
 */
export function isJanApprovalScope(value) {
  return JAN_APPROVAL_SCOPES.includes(str(value));
}

export function normalizeBoundedRationale(value) {
  return str(value).replace(/\s+/g, ' ').slice(0, JAN_MAX_RATIONALE_LENGTH);
}

export function validateDecisionSemantics(decision, rationale, approvalScope) {
  const key = str(decision).toUpperCase();
  const note = normalizeBoundedRationale(rationale);
  if (!isJanApprovalScope(approvalScope)) {
    return { ok: false, error: 'INVALID_APPROVAL_SCOPE', message: 'Choose an explicit, narrow approval scope.' };
  }
  if (key === 'CHANGES' && !note) {
    return { ok: false, error: 'CHANGES_RATIONALE_REQUIRED', message: 'Describe the actionable implementation changes needed.' };
  }
  if (key === 'HOLD' && !note) {
    return { ok: false, error: 'HOLD_RATIONALE_REQUIRED', message: 'State the governance or external dependency that requires a hold.' };
  }
  return { ok: true, rationale: note, approvalScope: str(approvalScope) };
}

/**
 * @param {unknown} payload session payload
 * @returns {boolean}
 */
export function isJanDecisionActor(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const p = /** @type {Record<string, unknown>} */ (payload);
  if (str(p.typ) !== 'tenant') return false;
  if (str(p.tenant_id) !== LUX_TENANT_ID) return false;
  const username = str(p.username).toLowerCase();
  if (!username) return false;
  return JAN_DECISION_ACTOR_USERNAMES.includes(username);
}

/**
 * Factory operators may look, never record Jan's decision.
 *
 * @param {unknown} payload
 * @returns {boolean}
 */
export function isFactoryViewer(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const p = /** @type {Record<string, unknown>} */ (payload);
  if (str(p.typ) === 'admin') return true;
  if (p.factory_master === true) return true;
  return false;
}

/**
 * @param {unknown} payload
 * @param {{ factoryMasterAuth?: boolean }} [opts]
 */
export function resolveJanApprovalAccess(payload, opts = {}) {
  if (isJanDecisionActor(payload)) {
    const p = /** @type {Record<string, unknown>} */ (payload);
    return {
      ok: true,
      canView: true,
      canDecide: true,
      error: null,
      actor: {
        username: str(p.username).toLowerCase(),
        displayName: JAN_ACTOR_DISPLAY_NAME,
        typ: 'tenant',
      },
    };
  }
  if (opts.factoryMasterAuth === true || isFactoryViewer(payload)) {
    const p = payload && typeof payload === 'object' ? /** @type {Record<string, unknown>} */ (payload) : {};
    return {
      ok: true,
      canView: true,
      canDecide: false,
      error: 'FACTORY_VIEW_ONLY',
      actor: {
        username: str(p.username).toLowerCase() || 'factory-operator',
        displayName: 'Factory operator',
        typ: str(p.typ) || 'admin',
      },
    };
  }
  if (!payload) {
    return {
      ok: false,
      canView: false,
      canDecide: false,
      error: 'UNAUTHENTICATED',
      actor: null,
    };
  }
  return {
    ok: false,
    canView: false,
    canDecide: false,
    error: 'NOT_JAN_ACTOR',
    actor: null,
  };
}

/**
 * @param {unknown} expectedHeadSha
 * @param {unknown} currentHeadSha
 */
export function assertShaBinding(expectedHeadSha, currentHeadSha) {
  const expected = normalizeSha(expectedHeadSha);
  const current = normalizeSha(currentHeadSha);
  if (expected.length !== 40 || current.length !== 40) {
    return { ok: false, error: 'MISSING_SHA', expected, current };
  }
  if (expected !== current) {
    return { ok: false, error: 'STALE_SHA', expected, current };
  }
  return { ok: true, error: null, expected, current };
}

/**
 * A prior APPROVE never applies after the head SHA changes.
 *
 * @param {{ decision?: string, targetSha?: string } | null | undefined} record
 * @param {unknown} currentHeadSha
 */
export function janApprovalAppliesToSha(record, currentHeadSha) {
  if (!record || str(record.decision).toUpperCase() !== 'APPROVE') return false;
  const bound = pickRecordSha(record);
  const current = normalizeSha(currentHeadSha);
  if (!bound || !current) return false;
  return bound === current;
}

/**
 * @param {unknown} step
 */
export function isProtectedAction(step) {
  const raw = str(step).toLowerCase().replace(/[-\s]+/g, '_');
  if (!raw) return false;
  return PROTECTED_ACTIONS.some((name) => raw === name || raw.includes(name));
}

/**
 * @param {unknown} decision
 * @returns {string}
 */
export function selectNextSafeAutomationStep(decision) {
  const key = str(decision).toUpperCase();
  const step = SAFE_NEXT_STEPS[key] || '';
  if (!step || isProtectedAction(step)) {
    return 'github_comment_writeback';
  }
  return step;
}

function pickRecordSha(row) {
  return normalizeSha(row?.targetSha || row?.target_sha);
}

export function buildEvidenceManifest(evidence) {
  const canonical = JSON.stringify(evidence || {}, Object.keys(evidence || {}).sort());
  return {
    algorithm: 'sha256',
    hash: crypto.createHash('sha256').update(canonical).digest('hex'),
    canonical,
  };
}

export function buildJanAuditRecord(fields) {
  const payload = {
    schema: 'corpflow.jan_decision_audit.v1',
    target_repo: str(fields.targetRepo),
    target_pr: Number(fields.targetNumber),
    base_sha: normalizeSha(fields.baseSha),
    head_sha: normalizeSha(fields.headSha),
    evidence_manifest: fields.evidenceManifest,
    evidence_hash: str(fields.evidenceHash),
    decision: str(fields.decision).toUpperCase(),
    decision_scope: str(fields.approvalScope),
    rationale: normalizeBoundedRationale(fields.rationale),
    actor_username: str(fields.actorUsername).toLowerCase(),
    session_id: str(fields.sessionId).slice(0, 128),
    replay_nonce: str(fields.replayNonce).slice(0, 128),
    recorded_at: str(fields.recordedAt) || new Date().toISOString(),
    durable_github_record: fields.durableGithubRecord || null,
    protected_action_triggered: false,
    release_blocker_issue: RELEASE_BLOCKER_ISSUE_NUMBER,
  };
  payload.audit_hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return payload;
}

export function verifyJanAuditRecord(record) {
  if (!record || typeof record !== 'object' || !str(record.audit_hash)) return false;
  const copy = { ...record };
  const supplied = str(copy.audit_hash);
  delete copy.audit_hash;
  const expected = crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export function canonicalJanDecisionEnvelope(fields) {
  return JSON.stringify({
    repository: str(fields.repository),
    target_number: Number(fields.targetNumber),
    target_sha: normalizeSha(fields.targetSha),
    decision: str(fields.decision).toUpperCase(),
    scope: str(fields.scope),
    reviewer_identity: str(fields.reviewerIdentity).toLowerCase(),
    timestamp: str(fields.timestamp),
    evidence_hash: str(fields.evidenceHash),
    replay_identity: str(fields.replayIdentity),
  });
}

export function signJanDecisionEnvelope(fields, signingKey) {
  const canonical = canonicalJanDecisionEnvelope(fields);
  const signature = crypto.createHmac('sha256', String(signingKey || '')).update(canonical).digest('hex');
  return { algorithm: 'hmac-sha256', canonical, signature, fields: JSON.parse(canonical) };
}

export function verifyJanDecisionEnvelope(envelope, signingKey) {
  if (!envelope || envelope.algorithm !== 'hmac-sha256' || !envelope.fields || !str(envelope.signature)) return false;
  const fields = envelope.fields;
  if (
    !str(fields.repository) ||
    !Number.isInteger(Number(fields.target_number)) ||
    normalizeSha(fields.target_sha).length !== 40 ||
    !isJanDecision(fields.decision) ||
    !isJanApprovalScope(fields.scope) ||
    !str(fields.reviewer_identity) ||
    !str(fields.timestamp) ||
    !/^[a-f0-9]{64}$/.test(str(fields.evidence_hash)) ||
    !str(fields.replay_identity)
  ) return false;
  const canonical = canonicalJanDecisionEnvelope({
    repository: fields.repository,
    targetNumber: fields.target_number,
    targetSha: fields.target_sha,
    decision: fields.decision,
    scope: fields.scope,
    reviewerIdentity: fields.reviewer_identity,
    timestamp: fields.timestamp,
    evidenceHash: fields.evidence_hash,
    replayIdentity: fields.replay_identity,
  });
  if (canonical !== envelope.canonical) return false;
  const expected = crypto.createHmac('sha256', String(signingKey || '')).update(canonical).digest('hex');
  return expected.length === str(envelope.signature).length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(str(envelope.signature)));
}

export function createJanDecisionCapability({ actorUsername, sessionId, secret, nowMs = Date.now() }) {
  const exp = Math.floor(nowMs / 1000) + 600;
  const payload = {
    actor_username: str(actorUsername).toLowerCase(),
    session_id: str(sessionId).slice(0, 128),
    exp,
    nonce: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', str(secret)).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyJanDecisionCapability({ token, actorUsername, sessionId, secret, nowMs = Date.now() }) {
  const [encoded, signature] = str(token).split('.');
  if (!encoded || !signature || !str(secret)) return { ok: false, error: 'DECISION_CAPABILITY_REQUIRED' };
  const expected = crypto.createHmac('sha256', str(secret)).update(encoded).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return { ok: false, error: 'DECISION_CAPABILITY_INVALID' };
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (Number(payload.exp) < Math.floor(nowMs / 1000)) return { ok: false, error: 'DECISION_CAPABILITY_EXPIRED' };
    if (
      str(payload.actor_username).toLowerCase() !== str(actorUsername).toLowerCase() ||
      str(payload.session_id) !== str(sessionId)
    ) {
      return { ok: false, error: 'DECISION_CAPABILITY_ACTOR_MISMATCH' };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, error: 'DECISION_CAPABILITY_INVALID' };
  }
}

function pickRecordRepo(row) {
  return str(row?.targetRepo || row?.target_repo || RARE_EXCLUSIVE_TARGET_REPO);
}

function pickRecordNumber(row) {
  const n = row?.targetNumber ?? row?.target_number;
  return Number(n);
}

function pickRecordActor(row) {
  return str(row?.actorUsername || row?.actor_username).toLowerCase();
}

function pickRecordScope(row) {
  return str(row?.approvalScope || row?.approval_scope || row?.decision_scope);
}

/**
 * @param {{ decision: string, targetSha?: string, target_sha?: string, targetRepo?: string, target_repo?: string, targetNumber?: number, target_number?: number, actorUsername?: string, actor_username?: string }} record
 * @param {Array<Record<string, unknown>>} existing
 */
export function findDuplicateDecision(record, existing) {
  const list = Array.isArray(existing) ? existing : [];
  const sha = pickRecordSha(record);
  const decision = str(record.decision).toUpperCase();
  const repo = pickRecordRepo(record);
  const number = pickRecordNumber(record);
  const actor = pickRecordActor(record);
  return (
    list.find((row) => {
      return (
        str(row.decision).toUpperCase() === decision &&
        pickRecordSha(row) === sha &&
        pickRecordRepo(row) === repo &&
        pickRecordNumber(row) === number &&
        pickRecordActor(row) === actor &&
        pickRecordScope(row) === pickRecordScope(record)
      );
    }) || null
  );
}

/**
 * Automation cannot advance product/release work without Jan's SHA-bound APPROVE,
 * and Jan APPROVE still does not unlock protected actions.
 *
 * @param {{
 *   proposedStep: string,
 *   currentHeadSha: string,
 *   janRecord?: { decision?: string, targetSha?: string } | null,
 * }} input
 */
export function evaluateJanGate(input) {
  const step = str(input.proposedStep);
  if (isProtectedAction(step)) {
    return {
      allowed: false,
      reason: 'PROTECTED_ACTION_BLOCKED',
      detail:
        'Jan product approval is not merge, deploy, or any other protected action. Those stay separately gated.',
    };
  }
  const advancing = PRODUCT_ADVANCING_STEPS.includes(step);
  if (advancing && !janApprovalAppliesToSha(input.janRecord, input.currentHeadSha)) {
    return {
      allowed: false,
      reason: 'JAN_GATE_REQUIRED',
      detail:
        'Automation must not cross the Jan product gate without a recorded Jan decision for this exact version.',
    };
  }
  const safeStep = Object.values(SAFE_NEXT_STEPS).includes(step);
  if (safeStep) {
    return { allowed: true, reason: 'SAFE_WRITEBACK', detail: 'Comment-only evidence writeback.' };
  }
  return {
    allowed: false,
    reason: 'UNKNOWN_STEP_BLOCKED',
    detail: 'Only already-authorised comment-only steps may run from this surface.',
  };
}

/**
 * Issue #35 (and any release blocker) must stay separate from review/merge approval.
 *
 * @param {{ number?: number, kind?: string, separateFromMergeApproval?: boolean }} blocker
 * @param {{ decision?: string } | null} reviewDecision
 */
export function releaseBlockerRemainsOpen(blocker, reviewDecision) {
  const number = Number(blocker?.number);
  const isReleaseBlocker =
    number === RELEASE_BLOCKER_ISSUE_NUMBER || str(blocker?.kind) === 'release_blocker';
  if (!isReleaseBlocker) return Boolean(blocker);
  if (reviewDecision && str(reviewDecision.decision).toUpperCase() === 'APPROVE') {
    return true;
  }
  return true;
}

/**
 * @param {Record<string, unknown>} fields
 */
export function formatJanDurableDecisionComment(fields) {
  const decision = str(fields.decision).toUpperCase();
  const targetSha = normalizeSha(fields.targetSha);
  const recordedAt = str(fields.recordedAt) || new Date().toISOString();
  const nextStep = selectNextSafeAutomationStep(decision);
  const payload = {
    schema: JAN_APPROVAL_SCHEMA,
    actor: JAN_ACTOR_DISPLAY_NAME,
    actor_username: str(fields.actorUsername).toLowerCase(),
    decision,
    target_repo: str(fields.targetRepo || RARE_EXCLUSIVE_TARGET_REPO),
    target_kind: str(fields.targetKind || 'pull_request'),
    target_number: Number(fields.targetNumber),
    base_sha: normalizeSha(fields.baseSha),
    target_sha: targetSha,
    evidence_manifest: str(fields.evidenceManifest),
    evidence_hash: str(fields.evidenceHash),
    decision_scope: str(fields.approvalScope),
    session_id: str(fields.sessionId).slice(0, 128),
    audit_hash: str(fields.auditHash),
    audit_record: fields.auditRecord || null,
    authenticated_envelope: fields.authenticatedEnvelope || null,
    recorded_at: recordedAt,
    next_safe_step: nextStep,
    protected_action_triggered: false,
    release_blocker_issue: RELEASE_BLOCKER_ISSUE_NUMBER,
    note: normalizeBoundedRationale(fields.note),
  };
  const lines = [
    `<!-- ${JAN_APPROVAL_SCHEMA} ${JSON.stringify(payload)} -->`,
    '',
    JAN_DECISION_MARKER,
    '',
    `Actor: ${JAN_ACTOR_DISPLAY_NAME}`,
    `Actor username: ${payload.actor_username}`,
    `Decision: ${decision}`,
    `Target repo: ${payload.target_repo}`,
    `Target: ${payload.target_kind} #${payload.target_number}`,
    `Base SHA: ${payload.base_sha}`,
    `Target SHA: ${targetSha}`,
    `Evidence manifest: ${payload.evidence_manifest}`,
    `Evidence hash: ${payload.evidence_hash}`,
    `Decision scope: ${payload.decision_scope}`,
    `Audit hash: ${payload.audit_hash}`,
    `Recorded at: ${recordedAt}`,
    `Next safe step: ${nextStep}`,
    'Protected action triggered: no',
    `Release blocker (separate): Issue #${RELEASE_BLOCKER_ISSUE_NUMBER}`,
  ];
  if (payload.note) lines.push(`Note: ${payload.note}`);
  lines.push('');
  lines.push(
    'This record is evidence only. It does not merge, deploy, change secrets, mutate data, or bypass protected-action gates.',
  );
  return { body: lines.join('\n'), record: payload };
}

/**
 * @param {unknown} body
 * @returns {{ ok: boolean, record: Record<string, string | number | boolean> | null }}
 */
export function parseJanDurableDecision(body) {
  const text = String(body || '');
  const marker = `<!-- ${JAN_APPROVAL_SCHEMA} `;
  const idx = text.indexOf(marker);
  if (idx >= 0) {
    const after = text.slice(idx + marker.length);
    const end = after.indexOf(' -->');
    if (end > 0) {
      try {
        const json = JSON.parse(after.slice(0, end));
        if (json && json.schema === JAN_APPROVAL_SCHEMA) {
          return { ok: true, record: json };
        }
      } catch {
        /* fall through */
      }
    }
  }
  if (!text.includes(JAN_DECISION_MARKER)) return { ok: false, record: null };
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of text.split('\n')) {
    const m = /^([A-Za-z][A-Za-z0-9 ]+):\s*(.*)$/.exec(line.trim());
    if (m) fields[m[1].trim().toLowerCase().replace(/\s+/g, '_')] = m[2].trim();
  }
  if (!fields.decision || !fields.target_sha) return { ok: false, record: null };
  return {
    ok: true,
    record: {
      schema: JAN_APPROVAL_SCHEMA,
      actor: fields.actor || JAN_ACTOR_DISPLAY_NAME,
      actor_username: fields.actor_username || '',
      decision: str(fields.decision).toUpperCase(),
      target_repo: fields.target_repo || RARE_EXCLUSIVE_TARGET_REPO,
      target_kind: 'pull_request',
      target_number: Number(String(fields.target || '').replace(/[^\d]/g, '')) || 0,
      target_sha: normalizeSha(fields.target_sha),
      recorded_at: fields.recorded_at || '',
      next_safe_step: fields.next_safe_step || '',
      protected_action_triggered: false,
    },
  };
}

/**
 * @param {Array<{ body?: string | null }>} comments
 */
export function listJanDecisionsFromComments(comments) {
  const out = [];
  for (const row of Array.isArray(comments) ? comments : []) {
    const parsed = parseJanDurableDecision(row?.body);
    if (
      parsed.ok &&
      parsed.record &&
      (!parsed.record.audit_record || verifyJanAuditRecord(parsed.record.audit_record))
    ) {
      out.push(parsed.record);
    }
  }
  return out;
}

/**
 * @param {{
 *   actor: { username: string, displayName?: string },
 *   canDecide: boolean,
 *   decision: string,
 *   item: {
 *     id: string,
 *     kind?: string,
 *     number: number,
 *     headSha: string,
 *     repo?: string,
 *   },
 *   expectedHeadSha: string,
 *   currentHeadSha: string,
 *   baseSha: string,
 *   evidenceManifest: string,
 *   evidenceHash: string,
 *   approvalScope: string,
 *   sessionId: string,
 *   authenticatedEnvelope?: Record<string, unknown>,
 *   existingRecords?: Array<Record<string, unknown>>,
 *   note?: string,
 *   nowIso?: string,
 * }} input
 */
export function prepareJanDecision(input) {
  if (!input?.canDecide) {
    return {
      ok: false,
      error: 'JAN_GATE_REQUIRED',
      message: 'Only Jan can record this product decision. Automation and factory operators cannot impersonate him.',
    };
  }
  if (!isJanDecision(input.decision)) {
    return { ok: false, error: 'UNKNOWN_DECISION', message: 'Choose one of: Approve, Request changes, Hold, Ask AI.' };
  }
  const decision = str(input.decision).toUpperCase();
  const semantics = validateDecisionSemantics(decision, input.note, input.approvalScope);
  if (!semantics.ok) return semantics;
  const shaCheck = assertShaBinding(input.expectedHeadSha, input.currentHeadSha);
  if (!shaCheck.ok) {
    if (shaCheck.error === 'STALE_SHA') {
      return {
        ok: false,
        error: 'STALE_SHA',
        message:
          'This version changed since you opened it. Refresh to see the current version — an earlier yes cannot be reused.',
        expected: shaCheck.expected,
        current: shaCheck.current,
      };
    }
    return { ok: false, error: shaCheck.error, message: 'This decision must be locked to an exact version.' };
  }
  const itemSha = normalizeSha(input.item?.headSha);
  if (itemSha && itemSha !== shaCheck.current) {
    return {
      ok: false,
      error: 'STALE_SHA',
      message:
        'This version changed since you opened it. Refresh to see the current version — an earlier yes cannot be reused.',
      expected: itemSha,
      current: shaCheck.current,
    };
  }

  const nextStep = selectNextSafeAutomationStep(decision);
  const gate = evaluateJanGate({
    proposedStep: nextStep,
    currentHeadSha: shaCheck.current,
    janRecord: { decision, targetSha: shaCheck.current },
  });
  if (!gate.allowed) {
    return { ok: false, error: gate.reason, message: gate.detail };
  }

  const auditRecord = buildJanAuditRecord({
    targetRepo: input.item.repo || RARE_EXCLUSIVE_TARGET_REPO,
    targetNumber: input.item.number,
    baseSha: input.baseSha,
    headSha: shaCheck.current,
    evidenceManifest: input.evidenceManifest,
    evidenceHash: input.evidenceHash,
    decision,
    approvalScope: semantics.approvalScope,
    rationale: semantics.rationale,
    actorUsername: input.actor.username,
    sessionId: input.sessionId,
    replayNonce: input.replayNonce,
    recordedAt: input.nowIso,
  });
  const formatted = formatJanDurableDecisionComment({
    decision,
    actorUsername: input.actor.username,
    targetRepo: input.item.repo || RARE_EXCLUSIVE_TARGET_REPO,
    targetKind: input.item.kind || 'pull_request',
    targetNumber: input.item.number,
    baseSha: input.baseSha,
    targetSha: shaCheck.current,
    evidenceManifest: input.evidenceManifest,
    evidenceHash: input.evidenceHash,
    approvalScope: semantics.approvalScope,
    sessionId: input.sessionId,
    auditHash: auditRecord.audit_hash,
    auditRecord,
    authenticatedEnvelope: input.authenticatedEnvelope,
    recordedAt: input.nowIso || new Date().toISOString(),
    note: input.note,
  });

  const duplicate = findDuplicateDecision(
    {
      decision,
      targetSha: shaCheck.current,
      targetRepo: formatted.record.target_repo,
      targetNumber: formatted.record.target_number,
      actorUsername: formatted.record.actor_username,
      approvalScope: semantics.approvalScope,
    },
    /** @type {Array<{ decision?: string, targetSha?: string, targetRepo?: string, targetNumber?: number, actorUsername?: string }>} */ (
      input.existingRecords || []
    ),
  );
  if (duplicate) {
    return {
      ok: true,
      idempotent: true,
      error: null,
      record: duplicate,
      commentBody: null,
      nextSafeStep: str(duplicate.next_safe_step) || nextStep,
      protectedActionTriggered: false,
    };
  }

  return {
    ok: true,
    idempotent: false,
    error: null,
    record: formatted.record,
    commentBody: formatted.body,
    nextSafeStep: nextStep,
    protectedActionTriggered: false,
    auditRecord,
  };
}

/**
 * Synthetic local/test bundle — one review item plus Issue #35 as a release blocker.
 */
export function buildSyntheticReviewBundle() {
  return {
    evidence_source: 'synthetic',
    target_repo: RARE_EXCLUSIVE_TARGET_REPO,
    baseline: {
      merged_pr: RARE_EXCLUSIVE_BUILD3_PR,
      merge_commit: RARE_EXCLUSIVE_BUILD3_MERGE_COMMIT,
      base_branch: RARE_EXCLUSIVE_BASE_BRANCH,
    },
    review_items: [
      {
        id: 'pr:34',
        kind: 'pull_request',
        number: 34,
        title: 'Latest Rare & Exclusive version — ready for your product decision',
        url: `https://github.com/${RARE_EXCLUSIVE_TARGET_REPO}/pull/34`,
        head_sha: SYNTHETIC_HEAD_SHA,
        ci_status: 'pass',
        ci_label: 'Checks passed',
        review_summary:
          'The team finished the latest version on top of the already-accepted baseline. Checks passed. This is ready for your yes, a change request, a hold, or a further AI review.',
        recommendation: 'Approve this version if it still matches what you asked for.',
        outstanding_blockers: [],
        last_decision: null,
      },
    ],
    release_blockers: [
      {
        id: 'issue:35',
        kind: 'release_blocker',
        number: RELEASE_BLOCKER_ISSUE_NUMBER,
        title: 'Mandatory pre-release blocker',
        url: `https://github.com/${RARE_EXCLUSIVE_TARGET_REPO}/issues/${RELEASE_BLOCKER_ISSUE_NUMBER}`,
        separate_from_merge_approval: true,
        summary:
          'This must be resolved before public launch. Approving the review above does not clear it, and it is not a merge button.',
        status: 'open',
      },
    ],
  };
}

/**
 * Product-owner presentation of a review bundle (no copy/paste console).
 *
 * @param {ReturnType<typeof buildSyntheticReviewBundle>} bundle
 */
export function presentReviewBundleForJan(bundle) {
  const items = Array.isArray(bundle?.review_items) ? bundle.review_items : [];
  const blockers = Array.isArray(bundle?.release_blockers) ? bundle.release_blockers : [];
  return {
    page_title: 'Your decision',
    eyebrow: 'Rare & Exclusive Collection',
    intro:
      'Review what is ready, then choose one action. You do not need to copy anything from GitHub, or paste a version number.',
    decisions: JAN_DECISIONS.map((key) => ({ key, ...JAN_DECISION_COPY[key] })),
    review_items: items.map((item) => ({
      id: item.id,
      heading: item.title,
      what_this_is: `Review item ${item.kind === 'pull_request' ? 'PR' : 'Issue'} #${item.number}`,
      what_we_checked: item.ci_label || 'Checks not yet available',
      recommendation: item.recommendation,
      still_open: Array.isArray(item.outstanding_blockers) && item.outstanding_blockers.length
        ? item.outstanding_blockers
        : ['Nothing else is blocking this product decision.'],
      summary: item.review_summary,
      version_token: item.head_sha,
      version_label: 'Locked to this exact version',
      last_decision: item.last_decision,
      url: item.url,
    })),
    release_blockers_heading: 'Before we can release',
    release_blockers_intro:
      'These stay separate from the decision above. Approving a version does not clear a release blocker.',
    release_blockers: blockers.map((b) => ({
      id: b.id,
      heading: `Issue #${b.number} — ${b.title}`,
      summary: b.summary,
      separate: b.separate_from_merge_approval === true,
      url: b.url,
    })),
    empty_review_copy: 'Nothing is waiting for your product decision right now.',
  };
}
