import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';

import {
  buildEvidenceManifest,
  formatJanDurableDecisionComment,
  RARE_EXCLUSIVE_TARGET_REPO,
  signJanDecisionEnvelope,
} from '../lib/server/jan-approval-control.js';
import janApprovalHandler, { resetJanApprovalSyntheticStoreForTests, trustedJanDecisionRecords } from '../lib/server/jan-approval-api.js';

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
    bridgeIdentity: 'corpflow-bridge',
    decisionSigningKey: 'test-server-secret',
    async readCurrentHead() {
      return { repo: RARE_EXCLUSIVE_TARGET_REPO, prNumber: 34, headSha: HEAD, baseSha: BASE };
    },
    async fetchReviewPackage() {
      const manifest = buildEvidenceManifest(evidence);
      return { evidence, manifest: { ...manifest, repository: RARE_EXCLUSIVE_TARGET_REPO, pr_number: 34, base_sha: BASE, head_sha: HEAD } };
    },
    async postComment({ body }) {
      comments.push({ id: comments.length + 1, body, user: { login: 'corpflow-bridge' } });
      return { ok: true, commentId: String(comments.length), commentUrl: 'https://github.test/comment' };
    },
  };
}

async function liveDecisionPayload(bridge) {
  const get = response();
  await janApprovalHandler(request(), get, { mode: 'live', getSession: session, decisionSecret: 'test', ...bridge });
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
  it('trusts only a configured bridge author with an unaltered authenticated envelope', () => {
    const deps = { bridgeIdentity: 'corpflow-bridge', decisionSigningKey: 'test-server-secret' };
    const derivedKey = crypto.createHmac('sha256', 'test-server-secret')
      .update('corpflow.jan-approval-decision-envelope.v1')
      .digest('hex');
    const envelope = signJanDecisionEnvelope({
      repository: RARE_EXCLUSIVE_TARGET_REPO,
      targetNumber: 34,
      targetSha: HEAD,
      decision: 'APPROVE',
      scope: 'review-approval-only',
      reviewerIdentity: JAN.username,
      timestamp: '2026-08-25T00:00:00.000Z',
      evidenceHash: 'f'.repeat(64),
      replayIdentity: 'nonce-1',
    }, derivedKey);
    const { body } = formatJanDurableDecisionComment({
      decision: 'APPROVE', actorUsername: JAN.username, targetNumber: 34, baseSha: BASE, targetSha: HEAD,
      evidenceManifest: '{}', evidenceHash: 'f'.repeat(64), approvalScope: 'review-approval-only',
      sessionId: 'session', auditHash: 'audit', authenticatedEnvelope: envelope,
    });
    const valid = { body, user: { login: 'corpflow-bridge' } };
    assert.equal(trustedJanDecisionRecords([valid], deps).length, 1);
    assert.equal(trustedJanDecisionRecords([{ ...valid, user: { login: 'another-writer' } }], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ ...valid, body: body.replace('APPROVE', 'HOLD') }], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ ...valid, body: body.replace(HEAD, BASE) }], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ ...valid, body: body.replace(JAN.username, 'forged@example.test') }], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ ...valid, body: body.replace('review-approval-only', 'merge-only') }], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ ...valid, body: body.replace('f'.repeat(64), 'e'.repeat(64)) }], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ ...valid, body: body.replace(envelope.signature, '0'.repeat(64)) }], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ body: '### JAN DURABLE DECISION\\nDecision: APPROVE', user: { login: 'corpflow-bridge' } }], deps).length, 0);
  });

  it('rejects cross-repository replay and relay impersonation even when a signature is otherwise valid', () => {
    const key = crypto.createHmac('sha256', 'test-server-secret')
      .update('corpflow.jan-approval-decision-envelope.v1')
      .digest('hex');
    const copied = signJanDecisionEnvelope({
      repository: 'antonvdberg-bit/corpflow-ai-command-center',
      targetNumber: 34,
      targetSha: HEAD,
      decision: 'APPROVE',
      scope: 'review-approval-only',
      reviewerIdentity: JAN.username,
      timestamp: '2026-08-25T00:00:00.000Z',
      evidenceHash: 'f'.repeat(64),
      replayIdentity: 'cross-repo-nonce',
    }, key);
    const { body } = formatJanDurableDecisionComment({
      decision: 'APPROVE', actorUsername: JAN.username, targetNumber: 34, baseSha: BASE, targetSha: HEAD,
      evidenceManifest: '{}', evidenceHash: 'f'.repeat(64), approvalScope: 'review-approval-only',
      sessionId: 'session', auditHash: 'audit', authenticatedEnvelope: copied,
    });
    const appConfig = {
      CORPFLOW_AGENT_RELAY_GITHUB_APP_ID: '1',
      CORPFLOW_AGENT_RELAY_GITHUB_APP_INSTALLATION_ID: '2',
      CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\ninvalid\\n-----END PRIVATE KEY-----',
      CORPFLOW_AGENT_RELAY_GITHUB_EXPECTED_BOT_LOGIN: 'corpflow-relay[bot]',
      CORPFLOW_AGENT_RELAY_GITHUB_APP_SLUG: 'corpflow-relay',
      CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST: 'antonvdberg-bit/corpflow-ai-command-center,antonvdberg-bit/rare-and-exclusive-collection',
    };
    const relayComment = {
      body,
      user: { login: 'corpflow-relay[bot]' },
      performed_via_github_app: { slug: 'corpflow-relay', name: 'CorpFlow Relay' },
    };
    const deps = { decisionSigningKey: 'test-server-secret', appConfig };
    assert.equal(trustedJanDecisionRecords([relayComment], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ ...relayComment, user: { login: 'github-actions[bot]' } }], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ ...relayComment, user: { login: 'antonvdberg-bit' } }], deps).length, 0);
    assert.equal(trustedJanDecisionRecords([{ ...relayComment, performed_via_github_app: { slug: 'wrong-app', name: 'Wrong' } }], deps).length, 0);
  });

  it('serves live GitHub evidence through the routed handler and persists decisions across fresh state', async () => {
    resetJanApprovalSyntheticStoreForTests();
    const bridge = createLiveBridge();
    const get = response();
    await janApprovalHandler(request(), get, { mode: 'live', getSession: session, decisionSecret: 'test', ...bridge });
    assert.equal(get.statusCode, 200);
    assert.equal(get.body.mode, 'live');
    assert.equal(get.body.evidence_by_item['pr:34'].full_diff, 'diff --git a/live.js b/live.js');

    const post = response();
    await janApprovalHandler(request({ method: 'POST', body: await liveDecisionPayload(bridge) }), post, {
      mode: 'live', getSession: session, decisionSecret: 'test', ...bridge,
    });
    assert.equal(post.statusCode, 200);
    assert.equal(post.body.github_writeback.confirmed, true);

    resetJanApprovalSyntheticStoreForTests();
    const duplicate = response();
    await janApprovalHandler(request({ method: 'POST', body: await liveDecisionPayload(bridge) }), duplicate, {
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
    await janApprovalHandler(request({ method: 'POST', body: stalePayload }), stale, {
      mode: 'live', getSession: session, decisionSecret: 'test', ...bridge,
    });
    assert.equal(stale.statusCode, 409);
    assert.equal(stale.body.error, 'STALE_SHA');

    const unavailable = response();
    await janApprovalHandler(request(), unavailable, {
      mode: 'live', getSession: session, bridgeIdentity: 'corpflow-bridge', decisionSigningKey: 'test-server-secret',
      fetchReviewPackage: async () => { throw new Error('offline'); },
    });
    assert.equal(unavailable.statusCode, 503);
    assert.equal(unavailable.body.error, 'GITHUB_EVIDENCE_UNAVAILABLE');

    const unconfigured = response();
    await janApprovalHandler(request(), unconfigured, {
      mode: 'live', getSession: session, fetchReviewPackage: bridge.fetchReviewPackage,
    });
    assert.equal(unconfigured.statusCode, 503);
    assert.equal(unconfigured.body.error, 'BRIDGE_TRUST_CONFIGURATION_REQUIRED');

    const failingBridge = createLiveBridge();
    const failedWrite = response();
    await janApprovalHandler(request({ method: 'POST', body: await liveDecisionPayload(failingBridge) }), failedWrite, {
      mode: 'live', getSession: session, decisionSecret: 'test', ...failingBridge,
      postComment: async () => ({ ok: false, error: 'GITHUB_COMMENT_FAILED' }),
    });
    assert.equal(failedWrite.statusCode, 503);
    assert.equal(failedWrite.body.error, 'GITHUB_COMMENT_FAILED');
  });
});
