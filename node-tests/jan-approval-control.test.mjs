import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  JAN_DECISIONS,
  JAN_DECISION_MARKER,
  RELEASE_BLOCKER_ISSUE_NUMBER,
  RARE_EXCLUSIVE_TARGET_REPO,
  assertShaBinding,
  buildSyntheticReviewBundle,
  evaluateJanGate,
  findDuplicateDecision,
  formatJanDurableDecisionComment,
  isJanDecisionActor,
  isProtectedAction,
  janApprovalAppliesToSha,
  parseJanDurableDecision,
  prepareJanDecision,
  presentReviewBundleForJan,
  releaseBlockerRemainsOpen,
  resolveJanApprovalAccess,
  selectNextSafeAutomationStep,
} from '../lib/server/jan-approval-control.js';
import janApprovalHandler, {
  handleJanApproval,
  postBoundedJanDecisionComment,
  resetJanApprovalSyntheticStoreForTests,
} from '../lib/server/jan-approval-api.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const JAN = {
  typ: 'tenant',
  tenant_id: 'luxe-maurice',
  username: 'jan@luxemaurice.com',
};

const FACTORY = { typ: 'admin', username: 'anton@corpflowai.com', factory_master: true };

const OTHER_TENANT = {
  typ: 'tenant',
  tenant_id: 'luxe-maurice',
  username: 'editor@luxemaurice.com',
};

function makeRes() {
  const headers = {};
  return {
    _status: 0,
    _json: null,
    setHeader(k, v) {
      headers[k] = v;
    },
    status(code) {
      this._status = code;
      return this;
    },
    json(obj) {
      this._json = obj;
      return this;
    },
    get headers() {
      return headers;
    },
  };
}

function makeReq({ method = 'GET', payload = JAN, body = {} } = {}) {
  return {
    method,
    headers: {},
    body,
    _payload: payload,
  };
}

function getSessionFromReq(req) {
  if (!req._payload) return { ok: false, payload: null };
  return { ok: true, payload: req._payload };
}

const NOW = '2026-08-25T10:30:00.000Z';
const CURRENT_SHA = 'b7c3e1a0f4d29c8e6a1b5d7f0c3e9a12d4f6b8c0';
const OTHER_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DECISION_SECRET = 'test-decision-secret';

async function decisionRequestBody(overrides = {}) {
  const load = makeRes();
  await handleJanApproval(makeReq({ payload: JAN }), load, {
    getSession: getSessionFromReq,
    factoryMasterAuth: false,
    decisionSecret: DECISION_SECRET,
  });
  return {
    item_id: 'pr:34',
    decision: 'APPROVE',
    expected_head_sha: CURRENT_SHA,
    evidence_manifest: load._json.evidence_manifest_by_item['pr:34'],
    approval_scope: 'review-approval-only',
    decision_capability: load._json.decision_capability,
    ...overrides,
  };
}

beforeEach(() => {
  resetJanApprovalSyntheticStoreForTests();
});

describe('Jan approval control surface (#1080)', () => {
  it('exposes exactly four decisions and keeps Issue #35 as a release blocker', () => {
    assert.deepEqual([...JAN_DECISIONS], ['APPROVE', 'CHANGES', 'HOLD', 'REVIEW_FURTHER']);
    const bundle = buildSyntheticReviewBundle();
    assert.equal(bundle.review_items.length, 1);
    assert.equal(bundle.release_blockers[0].number, RELEASE_BLOCKER_ISSUE_NUMBER);
    assert.equal(bundle.release_blockers[0].separate_from_merge_approval, true);
    const presented = presentReviewBundleForJan(bundle);
    assert.match(presented.release_blockers_heading, /Before we can release/i);
    assert.match(presented.release_blockers[0].heading, /Issue #35/);
    assert.equal(presented.release_blockers[0].separate, true);
    assert.match(presented.intro, /do not need to copy/i);
    assert.equal(presented.review_items[0].version_label, 'Locked to this exact version');
  });

  it('rejects a stale SHA and never reuses an older approval', () => {
    const stale = assertShaBinding(OTHER_SHA, CURRENT_SHA);
    assert.equal(stale.ok, false);
    assert.equal(stale.error, 'STALE_SHA');

    const oldApprove = { decision: 'APPROVE', targetSha: OTHER_SHA };
    assert.equal(janApprovalAppliesToSha(oldApprove, CURRENT_SHA), false);
    assert.equal(janApprovalAppliesToSha({ decision: 'APPROVE', targetSha: CURRENT_SHA }, CURRENT_SHA), true);

    const prepared = prepareJanDecision({
      actor: { username: JAN.username },
      canDecide: true,
      decision: 'APPROVE',
      item: { id: 'pr:34', kind: 'pull_request', number: 34, headSha: CURRENT_SHA },
      expectedHeadSha: OTHER_SHA,
      currentHeadSha: CURRENT_SHA,
      approvalScope: 'review-approval-only',
      nowIso: NOW,
    });
    assert.equal(prepared.ok, false);
    assert.equal(prepared.error, 'STALE_SHA');
  });

  it('rejects an unauthorised decision attempt', () => {
    assert.equal(isJanDecisionActor(FACTORY), false);
    assert.equal(isJanDecisionActor(OTHER_TENANT), false);
    assert.equal(isJanDecisionActor(JAN), true);

    const factoryAccess = resolveJanApprovalAccess(FACTORY);
    assert.equal(factoryAccess.canView, true);
    assert.equal(factoryAccess.canDecide, false);

    const prepared = prepareJanDecision({
      actor: { username: 'anton@corpflowai.com' },
      canDecide: false,
      decision: 'APPROVE',
      item: { id: 'pr:34', number: 34, headSha: CURRENT_SHA },
      expectedHeadSha: CURRENT_SHA,
      currentHeadSha: CURRENT_SHA,
      approvalScope: 'review-approval-only',
      note: 'Awaiting an external governance decision.',
      nowIso: NOW,
    });
    assert.equal(prepared.ok, false);
    assert.equal(prepared.error, 'JAN_GATE_REQUIRED');
  });

  it('treats the same Jan decision on the same SHA as idempotent', () => {
    const first = prepareJanDecision({
      actor: { username: JAN.username },
      canDecide: true,
      decision: 'HOLD',
      item: { id: 'pr:34', kind: 'pull_request', number: 34, headSha: CURRENT_SHA, repo: RARE_EXCLUSIVE_TARGET_REPO },
      expectedHeadSha: CURRENT_SHA,
      currentHeadSha: CURRENT_SHA,
      approvalScope: 'review-approval-only',
      note: 'Awaiting an external governance decision.',
      nowIso: NOW,
    });
    assert.equal(first.ok, true);
    assert.equal(first.idempotent, false);
    const parsed = parseJanDurableDecision(first.commentBody);
    assert.equal(parsed.ok, true);
    assert.match(first.commentBody, new RegExp(JAN_DECISION_MARKER));

    const duplicate = findDuplicateDecision(
      {
        decision: 'HOLD',
        targetSha: CURRENT_SHA,
        targetRepo: RARE_EXCLUSIVE_TARGET_REPO,
        targetNumber: 34,
        actorUsername: JAN.username,
        approvalScope: 'review-approval-only',
      },
      [first.record],
    );
    assert.ok(duplicate);

    const second = prepareJanDecision({
      actor: { username: JAN.username },
      canDecide: true,
      decision: 'HOLD',
      item: { id: 'pr:34', kind: 'pull_request', number: 34, headSha: CURRENT_SHA, repo: RARE_EXCLUSIVE_TARGET_REPO },
      expectedHeadSha: CURRENT_SHA,
      currentHeadSha: CURRENT_SHA,
      approvalScope: 'review-approval-only',
      note: 'Awaiting an external governance decision.',
      existingRecords: [first.record],
      nowIso: NOW,
    });
    assert.equal(second.ok, true);
    assert.equal(second.idempotent, true);
    assert.equal(second.commentBody, null);
  });

  it('keeps Issue #35 open even after a review APPROVE', () => {
    const blocker = buildSyntheticReviewBundle().release_blockers[0];
    assert.equal(releaseBlockerRemainsOpen(blocker, { decision: 'APPROVE' }), true);
    assert.equal(releaseBlockerRemainsOpen(blocker, { decision: 'CHANGES' }), true);
  });

  it('enforces the Jan gate and never selects a protected action', () => {
    assert.equal(selectNextSafeAutomationStep('APPROVE'), 'github_comment_writeback');
    assert.equal(selectNextSafeAutomationStep('REVIEW_FURTHER'), 'request_ai_review_comment');
    assert.equal(isProtectedAction('merge'), true);
    assert.equal(isProtectedAction('github_comment_writeback'), false);

    const withoutJan = evaluateJanGate({
      proposedStep: 'release_prep',
      currentHeadSha: CURRENT_SHA,
      janRecord: null,
    });
    assert.equal(withoutJan.allowed, false);
    assert.equal(withoutJan.reason, 'JAN_GATE_REQUIRED');

    const withJanButMerge = evaluateJanGate({
      proposedStep: 'merge',
      currentHeadSha: CURRENT_SHA,
      janRecord: { decision: 'APPROVE', targetSha: CURRENT_SHA },
    });
    assert.equal(withJanButMerge.allowed, false);
    assert.equal(withJanButMerge.reason, 'PROTECTED_ACTION_BLOCKED');

    const staleJan = evaluateJanGate({
      proposedStep: 'release_prep',
      currentHeadSha: CURRENT_SHA,
      janRecord: { decision: 'APPROVE', targetSha: OTHER_SHA },
    });
    assert.equal(staleJan.allowed, false);
    assert.equal(staleJan.reason, 'JAN_GATE_REQUIRED');
  });

  it('formats a bounded GitHub evidence comment without claiming a protected action', () => {
    const { body, record } = formatJanDurableDecisionComment({
      decision: 'APPROVE',
      actorUsername: JAN.username,
      targetNumber: 34,
      targetSha: CURRENT_SHA,
      recordedAt: NOW,
    });
    assert.equal(record.protected_action_triggered, false);
    assert.equal(record.target_repo, RARE_EXCLUSIVE_TARGET_REPO);
    assert.match(body, /Protected action triggered: no/);
    assert.match(body, /Issue #35/);
  });
});

describe('Jan approval HTTP surface', () => {
  it('returns the synthetic review item and Issue #35 to Jan', async () => {
    const req = makeReq({ payload: JAN });
    const res = makeRes();
    await handleJanApproval(req, res, { getSession: getSessionFromReq, factoryMasterAuth: false });
    assert.equal(res._status, 200);
    assert.equal(res._json.ok, true);
    assert.equal(res._json.can_decide, true);
    assert.equal(res._json.presented.release_blockers[0].heading.includes('#35'), true);
    assert.equal(res._json.bundle.review_items[0].head_sha, CURRENT_SHA);
  });

  it('rejects unauthenticated and non-Jan decision posts', async () => {
    const unauth = makeReq({ method: 'POST', payload: null, body: { item_id: 'pr:34', decision: 'APPROVE' } });
    const unauthRes = makeRes();
    await handleJanApproval(unauth, unauthRes, { getSession: getSessionFromReq, factoryMasterAuth: false });
    assert.equal(unauthRes._status, 401);

    const factoryReq = makeReq({
      method: 'POST',
      payload: FACTORY,
      body: { item_id: 'pr:34', decision: 'APPROVE', expected_head_sha: CURRENT_SHA },
    });
    const factoryRes = makeRes();
    await handleJanApproval(factoryReq, factoryRes, {
      getSession: getSessionFromReq,
      factoryMasterAuth: true,
    });
    assert.equal(factoryRes._status, 403);
    assert.equal(factoryRes._json.error, 'JAN_GATE_REQUIRED');
  });

  it('records Jan APPROVE, writes durable evidence, and is idempotent on repeat', async () => {
    const req = makeReq({
      method: 'POST',
      payload: JAN,
      body: await decisionRequestBody(),
    });
    const res = makeRes();
    await handleJanApproval(req, res, { getSession: getSessionFromReq, nowIso: NOW, decisionSecret: DECISION_SECRET });
    assert.equal(res._status, 200);
    assert.equal(res._json.record.decision, 'APPROVE');
    assert.equal(res._json.record.target_sha, CURRENT_SHA);
    assert.equal(res._json.protected_action_triggered, false);
    assert.equal(res._json.release_blocker_still_open, true);
    assert.equal(res._json.github_writeback.skipped, false);
    assert.equal(res._json.audit_record.decision_scope, 'review-approval-only');

    const replay = makeRes();
    await handleJanApproval(req, replay, { getSession: getSessionFromReq, nowIso: NOW, decisionSecret: DECISION_SECRET });
    assert.equal(replay._status, 409);
    assert.equal(replay._json.error, 'REPLAY_DETECTED');

    const again = makeRes();
    const duplicateReq = makeReq({ method: 'POST', payload: JAN, body: await decisionRequestBody() });
    await handleJanApproval(duplicateReq, again, {
      getSession: getSessionFromReq,
      nowIso: NOW,
      decisionSecret: DECISION_SECRET,
    });
    assert.equal(again._status, 200);
    assert.equal(again._json.idempotent, true);
    assert.equal(again._json.github_writeback.reason, 'duplicate_decision');
  });

  it('re-reads the bounded bridge head at decision time and rejects a changed PR', async () => {
    const req = makeReq({
      method: 'POST',
      payload: JAN,
      body: await decisionRequestBody(),
    });
    const res = makeRes();
    let reads = 0;
    await handleJanApproval(req, res, {
      getSession: getSessionFromReq,
      decisionSecret: DECISION_SECRET,
      readCurrentHead: async () => {
        reads += 1;
        return { repo: RARE_EXCLUSIVE_TARGET_REPO, prNumber: 34, headSha: OTHER_SHA, baseSha: CURRENT_SHA };
      },
    });
    assert.equal(reads, 1);
    assert.equal(res._status, 409);
    assert.equal(res._json.error, 'STALE_SHA');
  });

  it('rejects missing evidence, replayed capabilities, and malformed scopes', async () => {
    const missingEvidence = makeReq({
      method: 'POST',
      payload: JAN,
      body: { ...(await decisionRequestBody()), evidence_manifest: '' },
    });
    const missingEvidenceRes = makeRes();
    await handleJanApproval(missingEvidence, missingEvidenceRes, {
      getSession: getSessionFromReq,
      decisionSecret: DECISION_SECRET,
    });
    assert.equal(missingEvidenceRes._json.error, 'EVIDENCE_MANIFEST_MISMATCH');

    const invalidScope = makeReq({
      method: 'POST',
      payload: JAN,
      body: await decisionRequestBody({ approval_scope: 'deploy' }),
    });
    const invalidScopeRes = makeRes();
    await handleJanApproval(invalidScope, invalidScopeRes, {
      getSession: getSessionFromReq,
      decisionSecret: DECISION_SECRET,
    });
    assert.equal(invalidScopeRes._json.error, 'INVALID_APPROVAL_SCOPE');
  });

  it('allowlists GitHub writeback to the Rare & Exclusive repo only', async () => {
    const denied = await postBoundedJanDecisionComment({
      repo: 'antonvdberg-bit/corpflow-ai-command-center',
      issueNumber: 34,
      body: 'nope',
      token: 'x',
      fetchFn: async () => {
        throw new Error('must not fetch');
      },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, 'REPO_NOT_ALLOWLISTED');
  });

  it('default export handles GET without crashing', async () => {
    const req = makeReq({ payload: JAN });
    const res = makeRes();
    await janApprovalHandler(req, res);
    // Without injected session this uses real cookies → 401, which is fail-closed.
    assert.ok([200, 401, 403].includes(res._status));
  });
});

describe('Jan approval wiring and evidence', () => {
  it('factory_router dispatches the Jan approval routes', () => {
    const src = readFileSync(join(ROOT, 'api', 'factory_router.js'), 'utf8');
    assert.match(src, /factory\/jan-approval/);
    assert.match(src, /jan-approval-api\.js/);
  });

  it('keeps decision-flow evidence for reviewers', () => {
    const presented = presentReviewBundleForJan(buildSyntheticReviewBundle());
    const htmlPath = join(ROOT, 'artifacts', 'jan-approval-mvp', 'jan-decision-page.html');
    const mdPath = join(ROOT, 'artifacts', 'jan-approval-mvp', 'decision-flow-evidence.md');
    const html = readFileSync(htmlPath, 'utf8');
    const written = readFileSync(mdPath, 'utf8');
    assert.match(html, /Approve this version/);
    assert.match(html, /Issue #35/);
    assert.match(html, /Your decision/);
    assert.doesNotMatch(html, /developer console/i);
    assert.match(written, /STALE_SHA/);
    assert.equal(presented.review_items.length, 1);
  });
});
