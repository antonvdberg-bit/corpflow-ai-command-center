import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildEvidenceManifest, RARE_EXCLUSIVE_TARGET_REPO } from '../lib/server/jan-approval-control.js';
import { handleJanApproval, resetJanApprovalSyntheticStoreForTests } from '../lib/server/jan-approval-api.js';

const HEAD = 'b7c3e1a0f4d29c8e6a1b5d7f0c3e9a12d4f6b8c0';
const BASE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const JAN = { typ: 'tenant', tenant_id: 'luxe-maurice', username: 'jan@luxemaurice.com', iat: 1, exp: 2 };

function response() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request({ method = 'GET', body = {}, payload = JAN } = {}) {
  return { method, body, headers: {}, _payload: payload };
}

function session(req) {
  return req._payload ? { ok: true, payload: req._payload } : { ok: false, payload: null };
}

function createLiveBridge() {
  const comments = [];
  const evidence = {
    repository: RARE_EXCLUSIVE_TARGET_REPO,
    pr_number: 34,
    pr_metadata: { title: 'Live target', url: 'https://github.test/pr/34', base_sha: BASE, head_sha: HEAD, mergeable: true },
    changed_files: [{ filename: 'live.js', status: 'modified' }],
    full_diff: 'diff --git a/live.js b/live.js',
    selected_file_context: [],
    issue_comments: comments,
    review_comments: [],
    prior_review_decisions: [],
    required_checks: [{ name: 'test', conclusion: 'success' }],
    workflow_runs: [],
    current_blocker_release_state: { issue_35_separate_and_required: true },
  };
  return {
    comments,
    async readCurrentHead() {
      return { repo: RARE_EXCLUSIVE_TARGET_REPO, prNumber: 34, headSha: HEAD, baseSha: BASE };
    },
    async fetchReviewPackage() {
      const manifest = buildEvidenceManifest(evidence);
      return { evidence, manifest: { ...manifest, repository: RARE_EXCLUSIVE_TARGET_REPO, pr_number: 34, base_sha: BASE, head_sha: HEAD } };
    },
    async postComment({ body }) {
      comments.push({ id: comments.length + 1, body });
      return { ok: true, commentId: String(comments.length), commentUrl: 'https://github.test/comment' };
    },
  };
}

async function liveDecisionPayload(bridge) {
  const get = response();
  await handleJanApproval(request(), get, { mode: 'live', getSession: session, decisionSecret: 'test', ...bridge });
  return {
    item_id: 'pr:34',
    decision: 'APPROVE',
    expected_head_sha: HEAD,
    evidence_manifest: get.body.evidence_manifest_by_item['pr:34'],
    approval_scope: 'review-approval-only',
    decision_capability: get.body.decision_capability,
  };
}

describe('Jan approval routed live integration', () => {
  it('serves live GitHub evidence through the routed handler and persists decisions across fresh state', async () => {
    resetJanApprovalSyntheticStoreForTests();
    const bridge = createLiveBridge();
    const get = response();
    await handleJanApproval(request(), get, { mode: 'live', getSession: session, decisionSecret: 'test', ...bridge });
    assert.equal(get.statusCode, 200);
    assert.equal(get.body.mode, 'live');
    assert.equal(get.body.evidence_by_item['pr:34'].full_diff, 'diff --git a/live.js b/live.js');

    const post = response();
    await handleJanApproval(request({ method: 'POST', body: await liveDecisionPayload(bridge) }), post, {
      mode: 'live', getSession: session, decisionSecret: 'test', ...bridge,
    });
    assert.equal(post.statusCode, 200);
    assert.equal(post.body.github_writeback.confirmed, true);

    resetJanApprovalSyntheticStoreForTests();
    const duplicate = response();
    await handleJanApproval(request({ method: 'POST', body: await liveDecisionPayload(bridge) }), duplicate, {
      mode: 'live', getSession: session, decisionSecret: 'test', ...bridge,
    });
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.body.idempotent, true);
  });

  it('fails closed for stale live evidence, missing live evidence, and durable write failures', async () => {
    const bridge = createLiveBridge();
    const stale = response();
    const stalePayload = await liveDecisionPayload(bridge);
    stalePayload.expected_head_sha = BASE;
    await handleJanApproval(request({ method: 'POST', body: stalePayload }), stale, {
      mode: 'live', getSession: session, decisionSecret: 'test', ...bridge,
    });
    assert.equal(stale.statusCode, 409);
    assert.equal(stale.body.error, 'STALE_SHA');

    const unavailable = response();
    await handleJanApproval(request(), unavailable, {
      mode: 'live', getSession: session, decisionSecret: 'test', fetchReviewPackage: async () => { throw new Error('offline'); },
    });
    assert.equal(unavailable.statusCode, 503);
    assert.equal(unavailable.body.error, 'GITHUB_EVIDENCE_UNAVAILABLE');

    const failingBridge = createLiveBridge();
    const failedWrite = response();
    await handleJanApproval(request({ method: 'POST', body: await liveDecisionPayload(failingBridge) }), failedWrite, {
      mode: 'live', getSession: session, decisionSecret: 'test', ...failingBridge,
      postComment: async () => ({ ok: false, error: 'GITHUB_COMMENT_FAILED' }),
    });
    assert.equal(failedWrite.statusCode, 503);
    assert.equal(failedWrite.body.error, 'GITHUB_COMMENT_FAILED');
  });
});
