/**
 * HTTP surface for the Jan approval control MVP (#1080).
 *
 * GET  /api/factory/jan-approval
 * POST /api/factory/jan-approval/decision
 *
 * Auth: Jan tenant session may view and decide. Factory master may view only.
 * Default evidence source is synthetic (local/test). Live GitHub read is
 * opt-in via JAN_APPROVAL_MODE=live and still cannot perform protected actions.
 */

import { cfg } from './runtime-config.js';
import { getSessionFromRequest, getSessionSecret } from './session.js';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import {
  RARE_EXCLUSIVE_TARGET_REPO,
  RELEASE_BLOCKER_ISSUE_NUMBER,
  buildEvidenceManifest,
  buildSyntheticReviewBundle,
  createJanDecisionCapability,
  listJanDecisionsFromComments,
  prepareJanDecision,
  presentReviewBundleForJan,
  resolveJanApprovalAccess,
  str,
  verifyJanDecisionCapability,
} from './jan-approval-control.js';
import { fetchBoundedJanReviewPackage, readBoundedCurrentHead } from './jan-approval-github-bridge.js';

/** @type {Array<Record<string, unknown>>} */
const syntheticLedger = [];

/** @type {Record<string, Array<{ body: string }>>} */
const syntheticCommentsByItem = Object.create(null);
const usedDecisionNonces = new Map();
const requestCounts = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 12;

export function resetJanApprovalSyntheticStoreForTests() {
  syntheticLedger.length = 0;
  for (const key of Object.keys(syntheticCommentsByItem)) {
    delete syntheticCommentsByItem[key];
  }
  usedDecisionNonces.clear();
  requestCounts.clear();
}

function sessionId(payload) {
  return `${str(payload?.username).toLowerCase()}:${str(payload?.iat)}:${str(payload?.exp)}`;
}

function decisionSecret(deps = {}) {
  return str(deps.decisionSecret || getSessionSecret());
}

function allowDecisionRequest(actorUsername, nowMs = Date.now()) {
  const key = str(actorUsername).toLowerCase();
  const prior = requestCounts.get(key) || [];
  const recent = prior.filter((at) => nowMs - at < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) return false;
  recent.push(nowMs);
  requestCounts.set(key, recent);
  return true;
}

function syntheticEvidencePackage(bundle, item) {
  const evidence = {
    repository: RARE_EXCLUSIVE_TARGET_REPO,
    pr_number: item.number,
    pr_metadata: {
      title: item.title,
      base_sha: bundle.baseline.merge_commit,
      head_sha: item.head_sha,
      mergeable: 'synthetic_unavailable',
      mergeable_state: 'synthetic_unavailable',
    },
    changed_files: [],
    full_diff: '',
    selected_file_context: [],
    issue_comments: [],
    review_comments: [],
    prior_review_decisions: [],
    required_checks: [{ name: item.ci_label, conclusion: item.ci_status }],
    current_blocker_release_state: bundle.release_blockers,
  };
  const manifest = buildEvidenceManifest(evidence);
  return { evidence, manifest: { ...manifest, repository: RARE_EXCLUSIVE_TARGET_REPO, pr_number: item.number, base_sha: bundle.baseline.merge_commit, head_sha: item.head_sha } };
}

function jsonError(res, status, code, extra = {}) {
  return res.status(status).json({ ok: false, error: code, ...extra });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.from(c));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function githubToken() {
  return String(
    cfg('CMP_GITHUB_TOKEN', '') ||
      cfg('GH_WORKFLOW_TOKEN', '') ||
      cfg('GITHUB_TOKEN', '') ||
      cfg('GH_TOKEN', '') ||
      '',
  ).trim();
}

function approvalMode(deps = {}) {
  if (deps.mode === 'live' || deps.mode === 'synthetic') return deps.mode;
  const raw = str(cfg('JAN_APPROVAL_MODE', 'synthetic')).toLowerCase();
  return raw === 'live' ? 'live' : 'synthetic';
}

/**
 * Bounded GitHub comment writeback — target repo + issue/PR number only.
 *
 * @param {{
 *   repo: string,
 *   issueNumber: number,
 *   body: string,
 *   fetchFn?: typeof fetch,
 *   token?: string,
 * }} opts
 */
export async function postBoundedJanDecisionComment(opts) {
  const repo = str(opts.repo);
  if (repo !== RARE_EXCLUSIVE_TARGET_REPO) {
    return { ok: false, error: 'REPO_NOT_ALLOWLISTED' };
  }
  const issueNumber = Number(opts.issueNumber);
  if (!Number.isInteger(issueNumber) || issueNumber < 1) {
    return { ok: false, error: 'INVALID_TARGET' };
  }
  const token = str(opts.token || githubToken());
  if (!token) return { ok: false, error: 'GITHUB_TOKEN_MISSING' };
  const fetchFn = opts.fetchFn || globalThis.fetch;
  const url = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`;
  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: opts.body }),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: 'GITHUB_COMMENT_FAILED', status: res.status };
  }
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    ok: true,
    commentId: json && json.id != null ? String(json.id) : null,
    commentUrl: json && json.html_url ? String(json.html_url) : null,
  };
}

function attachLastDecisions(bundle, durableComments = []) {
  const items = Array.isArray(bundle.review_items) ? bundle.review_items : [];
  for (const item of items) {
    const comments = durableComments.length ? durableComments : syntheticCommentsByItem[item.id] || [];
    const records = listJanDecisionsFromComments(comments);
    const last = records.length ? records[records.length - 1] : null;
    item.last_decision = last
      ? {
          decision: last.decision,
          recorded_at: last.recorded_at,
          target_sha: last.target_sha,
          idempotent_hint: true,
        }
      : null;
  }
  return bundle;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {{ getSession?: typeof getSessionFromRequest, factoryMasterAuth?: boolean }} [deps]
 */
export function resolveAccessFromRequest(req, deps = {}) {
  const getSession = deps.getSession || getSessionFromRequest;
  const sess = getSession(req);
  const payload = sess?.ok === true ? sess.payload : null;
  const factoryMasterAuth =
    deps.factoryMasterAuth != null ? deps.factoryMasterAuth : verifyFactoryMasterAuth(req);
  return resolveJanApprovalAccess(payload, { factoryMasterAuth });
}

function buildLiveReviewBundle(reviewPackage) {
  const evidence = reviewPackage.evidence;
  const metadata = evidence.pr_metadata || {};
  const checks = Array.isArray(evidence.required_checks) ? evidence.required_checks : [];
  return {
    evidence_source: 'github',
    target_repo: RARE_EXCLUSIVE_TARGET_REPO,
    baseline: { merge_commit: metadata.base_sha || '', base_branch: 'github-live' },
    review_items: [{
      id: `pr:${evidence.pr_number}`,
      kind: 'pull_request',
      number: evidence.pr_number,
      title: metadata.title || `Rare & Exclusive PR #${evidence.pr_number}`,
      url: metadata.url || '',
      head_sha: metadata.head_sha || '',
      ci_status: checks.every((row) => row.conclusion === 'success') ? 'pass' : 'pending_or_failed',
      ci_label: `${checks.length} GitHub checks retrieved`,
      review_summary: 'Live allowlisted GitHub evidence is attached to this review package.',
      recommendation: 'Review the attached live evidence before deciding.',
      outstanding_blockers: [],
      last_decision: null,
    }],
    release_blockers: buildSyntheticReviewBundle().release_blockers,
  };
}

async function loadReviewBundle(deps = {}) {
  const mode = approvalMode(deps);
  if (mode === 'live') {
    const fetchReviewPackage = deps.fetchReviewPackage || fetchBoundedJanReviewPackage;
    const reviewPackage = await fetchReviewPackage({
      repo: RARE_EXCLUSIVE_TARGET_REPO,
      prNumber: Number(deps.livePrNumber || 34),
      token: githubToken(),
      fetchFn: deps.fetchFn,
      contextPaths: deps.contextPaths || [],
    });
    const bundle = buildLiveReviewBundle(reviewPackage);
    const item = bundle.review_items[0];
    if (!item?.head_sha || !reviewPackage?.manifest?.hash) throw new Error('LIVE_EVIDENCE_INVALID');
    return {
      bundle,
      mode: 'live',
      evidenceByItem: { [item.id]: reviewPackage.evidence },
      manifestByItem: { [item.id]: reviewPackage.manifest },
      durableComments: [...(reviewPackage.evidence.issue_comments || []), ...(reviewPackage.evidence.review_comments || [])],
    };
  }
  const bundle = buildSyntheticReviewBundle();
  return { bundle, mode: 'synthetic', evidenceByItem: {}, manifestByItem: {}, durableComments: [] };
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse & { status: Function, json: Function, setHeader: Function }} res
 * @param {{
 *   getSession?: typeof getSessionFromRequest,
 *   factoryMasterAuth?: boolean,
 *   nowIso?: string,
 *   postComment?: typeof postBoundedJanDecisionComment,
 *   liveBundle?: object | null,
 *   readCurrentHead?: typeof readBoundedCurrentHead,
 * }} [deps]
 */
export async function handleJanApproval(req, res, deps = {}) {
  const access = resolveAccessFromRequest(req, deps);
  if (!access.canView) {
    const status = access.error === 'UNAUTHENTICATED' ? 401 : 403;
    return jsonError(res, status, access.error || 'FORBIDDEN', {
      message:
        access.error === 'UNAUTHENTICATED'
          ? 'Sign in to open this decision page.'
          : 'This page is only for Jan, or for a factory operator to look (not to decide).',
    });
  }

  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET') {
    let loaded;
    try {
      loaded = await loadReviewBundle(deps);
    } catch {
      return jsonError(res, 503, 'GITHUB_EVIDENCE_UNAVAILABLE');
    }
    const bundle = attachLastDecisions(loaded.bundle, loaded.durableComments);
    const presented = presentReviewBundleForJan(bundle);
    const evidenceManifestByItem = Object.fromEntries((bundle.review_items || []).map((item) => [
      item.id,
      loaded.mode === 'live' ? loaded.manifestByItem[item.id]?.hash : syntheticEvidencePackage(bundle, item).manifest.hash,
    ]));
    const evidenceByItem = Object.fromEntries((bundle.review_items || []).map((item) => [
      item.id,
      loaded.mode === 'live' ? loaded.evidenceByItem[item.id] : syntheticEvidencePackage(bundle, item).evidence,
    ]));
    const payload = (deps.getSession || getSessionFromRequest)(req)?.payload || null;
    const canRecordDecision = access.canDecide && loaded.mode === 'live';
    const capability = canRecordDecision
      ? createJanDecisionCapability({
          actorUsername: access.actor.username,
          sessionId: sessionId(payload),
          secret: decisionSecret(deps),
        })
      : null;
    return res.status(200).json({
      ok: true,
      can_decide: canRecordDecision,
      actor: access.actor,
      mode: loaded.mode,
      bundle,
      presented,
      release_blocker_issue: RELEASE_BLOCKER_ISSUE_NUMBER,
      protected_actions_blocked: true,
      decision_capability: capability,
      evidence_manifest_by_item: evidenceManifestByItem,
      evidence_by_item: evidenceByItem,
      openapi_contract: '/docs/operations/JAN_APPROVAL_CONTROL_SURFACE_V1.md#openapi-facing-contract',
    });
  }

  if (method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'METHOD_NOT_ALLOWED');
  }

  if (access.canDecide !== true) {
    return jsonError(res, 403, 'JAN_GATE_REQUIRED', {
      message: 'Only Jan can record this product decision. Factory operators and automation cannot.',
    });
  }
  if (approvalMode(deps) !== 'live') {
    return jsonError(res, 403, 'LIVE_EVIDENCE_REQUIRED', {
      message: 'Decisions require live allowlisted GitHub evidence. Synthetic mode is a local/test preview only.',
    });
  }

  const body = (await readJsonBody(req)) ?? null;
  if (body == null) return jsonError(res, 400, 'INVALID_JSON');
  const sess = (deps.getSession || getSessionFromRequest)(req);
  const payload = sess?.ok ? sess.payload : null;
  const currentSessionId = sessionId(payload);
  const capability = verifyJanDecisionCapability({
    token: body.decision_capability || body.decisionCapability,
    actorUsername: access.actor.username,
    sessionId: currentSessionId,
    secret: decisionSecret(deps),
  });
  if (!capability.ok) return jsonError(res, 401, capability.error);
  if (usedDecisionNonces.has(capability.payload.nonce)) return jsonError(res, 409, 'REPLAY_DETECTED');
  if (!allowDecisionRequest(access.actor.username)) return jsonError(res, 429, 'RATE_LIMITED');

  let loaded;
  try {
    loaded = await loadReviewBundle(deps);
  } catch {
    return jsonError(res, 503, 'GITHUB_EVIDENCE_UNAVAILABLE');
  }
  const bundle = attachLastDecisions(loaded.bundle, loaded.durableComments);
  const itemId = str(body.item_id || body.itemId);
  const item = (bundle.review_items || []).find((row) => row.id === itemId) || null;
  if (!item) {
    return jsonError(res, 404, 'REVIEW_ITEM_NOT_FOUND', {
      message: 'That review item is not on this decision page.',
    });
  }
  const evidencePackage =
    loaded.mode === 'live'
      ? { evidence: loaded.evidenceByItem[item.id], manifest: loaded.manifestByItem[item.id] }
      : syntheticEvidencePackage(bundle, item);
  const suppliedManifest = str(body.evidence_manifest || body.evidenceManifest);
  if (!suppliedManifest || suppliedManifest !== evidencePackage.manifest.hash) {
    return jsonError(res, 409, 'EVIDENCE_MANIFEST_MISMATCH', { evidence_manifest: evidencePackage.manifest.hash });
  }
  const currentHeadReader =
    deps.readCurrentHead ||
    (loaded.mode === 'live'
      ? readBoundedCurrentHead
      : async () => ({
          repo: RARE_EXCLUSIVE_TARGET_REPO,
          prNumber: item.number,
          headSha: item.head_sha,
          baseSha: bundle.baseline?.merge_commit || '',
        }));
  let liveTarget;
  try {
    liveTarget = await currentHeadReader({
      repo: RARE_EXCLUSIVE_TARGET_REPO,
      prNumber: item.number,
      token: githubToken(),
      fetchFn: deps.fetchFn,
    });
  } catch {
    return jsonError(res, 503, 'GITHUB_HEAD_READ_FAILED');
  }
  if (str(liveTarget.repo) !== RARE_EXCLUSIVE_TARGET_REPO || Number(liveTarget.prNumber) !== Number(item.number)) {
    return jsonError(res, 403, 'BRIDGE_TARGET_REJECTED');
  }

  const existing = listJanDecisionsFromComments(
    loaded.mode === 'live' ? loaded.durableComments : syntheticCommentsByItem[item.id] || [],
  );
  const prepared = prepareJanDecision({
    actor: access.actor,
    canDecide: true,
    decision: str(body.decision),
    item: {
      id: item.id,
      kind: item.kind,
      number: item.number,
      headSha: item.head_sha,
      repo: RARE_EXCLUSIVE_TARGET_REPO,
    },
    expectedHeadSha: body.expected_head_sha || body.expectedHeadSha,
    currentHeadSha: liveTarget.headSha,
    baseSha: liveTarget.baseSha,
    evidenceManifest: evidencePackage.manifest.canonical,
    evidenceHash: evidencePackage.manifest.hash,
    approvalScope: body.approval_scope || body.approvalScope,
    sessionId: currentSessionId,
    replayNonce: capability.payload.nonce,
    existingRecords: existing,
    note: body.note,
    nowIso: deps.nowIso,
  });

  if (!prepared.ok) {
    const status = prepared.error === 'STALE_SHA' ? 409 : prepared.error === 'JAN_GATE_REQUIRED' ? 403 : 400;
    return jsonError(res, status, prepared.error, {
      message: prepared.message,
      expected: prepared.expected,
      current: prepared.current,
    });
  }
  if (prepared.idempotent) {
    return res.status(200).json({
      ok: true,
      idempotent: true,
      record: prepared.record,
      next_safe_step: prepared.nextSafeStep,
      protected_action_triggered: false,
      github_writeback: { skipped: true, reason: 'duplicate_decision' },
    });
  }

  const comments = syntheticCommentsByItem[item.id] || (syntheticCommentsByItem[item.id] = []);
  comments.push({ body: prepared.commentBody });
  syntheticLedger.push(prepared.record);

  let githubWriteback = { skipped: true, reason: 'synthetic_mode' };
  const mode = loaded.mode;
  if (mode === 'live' && prepared.commentBody) {
    const postComment = deps.postComment || postBoundedJanDecisionComment;
    const posted = await postComment({
      repo: RARE_EXCLUSIVE_TARGET_REPO,
      issueNumber: item.number,
      body: prepared.commentBody,
    });
    if (!posted.ok) return jsonError(res, 503, posted.error || 'GITHUB_COMMENT_FAILED');
    const confirmDurableDecision = deps.confirmDurableDecision || (async () => {
      const refreshed = await loadReviewBundle(deps);
      const records = listJanDecisionsFromComments(refreshed.durableComments);
      return records.some((record) =>
        str(record.decision).toUpperCase() === str(prepared.record.decision).toUpperCase() &&
        str(record.target_sha) === str(prepared.record.target_sha) &&
        str(record.evidence_hash) === str(prepared.record.evidence_hash) &&
        str(record.decision_scope) === str(prepared.record.decision_scope),
      );
    });
    let confirmed = false;
    try {
      confirmed = await confirmDurableDecision({ record: prepared.record, posted });
    } catch {
      confirmed = false;
    }
    if (!confirmed) return jsonError(res, 503, 'GITHUB_DURABLE_RECORD_UNCONFIRMED');
    usedDecisionNonces.set(capability.payload.nonce, Date.now());
    githubWriteback = { skipped: false, comment_id: posted.commentId, comment_url: posted.commentUrl, confirmed: true };
  } else if (prepared.commentBody) {
    githubWriteback = {
      skipped: false,
      mode: 'synthetic',
      durable_store: 'in_memory_plus_comment_body',
    };
    usedDecisionNonces.set(capability.payload.nonce, Date.now());
  }

  return res.status(200).json({
    ok: true,
    idempotent: false,
    record: prepared.record,
    audit_record: prepared.auditRecord,
    next_safe_step: prepared.nextSafeStep,
    protected_action_triggered: false,
    github_writeback: githubWriteback,
    release_blocker_still_open: true,
    release_blocker_issue: RELEASE_BLOCKER_ISSUE_NUMBER,
  });
}

export default async function janApprovalHandler(req, res, deps = {}) {
  return handleJanApproval(req, res, deps);
}
