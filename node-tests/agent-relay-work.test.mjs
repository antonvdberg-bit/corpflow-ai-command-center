import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';

import {
  AGENT_RELAY_REPOSITORIES,
  clearGithubAppRelayTokenCacheForTests,
} from '../lib/server/github-app-relay.js';
import {
  AGENT_RELAY_COMMENT_BODY_MAX_BYTES,
  AGENT_RELAY_WORK_SCHEMA,
  agentRelayWorkHandler,
  executeAgentRelayWork,
  parseAgentRelayWorkEnvelope,
} from '../lib/server/agent-relay-work.js';

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const CONFIG = {
  CORPFLOW_AGENT_RELAY_GITHUB_APP_ID: '123456',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_INSTALLATION_ID: '987654',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n'),
  CORPFLOW_AGENT_RELAY_GITHUB_EXPECTED_BOT_LOGIN: 'corpflowai-agent-relay[bot]',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_SLUG: 'corpflowai-agent-relay',
  CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST: AGENT_RELAY_REPOSITORIES.join(','),
};
const SHA = 'a'.repeat(40);
const NOW = Date.parse('2026-08-26T00:00:00.000Z');

function response(body, { ok = true, status = 200, text } = {}) {
  return {
    ok,
    status,
    async json() { return body; },
    async text() { return text ?? JSON.stringify(body); },
  };
}

function envelope(overrides = {}) {
  const operation = overrides.operation || 'pull_request.get_metadata';
  const target = overrides.target || { type: 'pull_request', number: 34, identifier: '', expected_sha: '' };
  return {
    schema: AGENT_RELAY_WORK_SCHEMA,
    request_id: 'request-12345678',
    origin: { system: 'cursor-factory', actor: 'operator-123' },
    repository: AGENT_RELAY_REPOSITORIES[0],
    operation,
    target,
    payload: {},
    issued_at: '2026-08-25T23:59:00.000Z',
    expires_at: '2026-08-26T00:05:00.000Z',
    replay_identity: 'replay-12345678',
    correlation_id: 'work-order-12345678',
    requested_evidence: [({
      'repository.get_metadata': 'repository_metadata',
      'issue.get_metadata': 'issue_metadata',
      'issue.list_comments': 'issue_comments',
      'pull_request.get_metadata': 'pull_request_metadata',
      'pull_request.list_files': 'pull_request_files',
      'pull_request.get_diff': 'pull_request_diff',
      'pull_request.list_reviews': 'pull_request_reviews',
      'pull_request.list_review_comments': 'pull_request_review_comments',
      'pull_request.get_head': 'pull_request_head',
      'pull_request.list_check_runs': 'check_runs',
      'pull_request.list_workflow_runs': 'workflow_runs',
      'issue.add_comment': 'issue_comment',
    })[operation] || 'unknown'],
    ...overrides,
  };
}

function githubFetch(url, options = {}) {
  const path = String(url);
  if (path.includes('/access_tokens')) {
    return Promise.resolve(response({ token: 'installation-token-that-must-never-escape', expires_at: '2099-08-26T01:00:00.000Z' }));
  }
  assert.match(options.headers.Authorization, /^Bearer installation-token-that-must-never-escape$/);
  if (path.includes('/pulls/34')) {
    return Promise.resolve(response({
      number: 34, title: 'Bounded PR', state: 'open', draft: false, html_url: 'https://github.test/pr/34',
      base: { sha: 'b'.repeat(40) }, head: { sha: SHA }, user: { login: 'relay-test', type: 'User' },
      updated_at: '2026-08-26T00:00:00Z',
    }));
  }
  if (path.endsWith('/repos/antonvdberg-bit/corpflow-ai-command-center') || path.endsWith('/repos/antonvdberg-bit/rare-and-exclusive-collection')) {
    return Promise.resolve(response({ full_name: path.includes('rare-and-exclusive') ? AGENT_RELAY_REPOSITORIES[1] : AGENT_RELAY_REPOSITORIES[0], private: true, default_branch: 'main', html_url: 'https://github.test/repo' }));
  }
  throw new Error(`unexpected GitHub endpoint ${path}`);
}

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function claimStore() {
  const rows = new Map();
  let nextId = 1;
  const uniqueKey = (input) => `${input.repository}:${input.targetNumber}:${input.replayIdentity}`;
  return {
    agentRelayClaim: {
      async create({ data, select }) {
        const key = uniqueKey(data);
        if (rows.has(key)) {
          const error = new Error('Unique constraint failed');
          error.code = 'P2002';
          throw error;
        }
        const row = {
          id: `claim-${nextId++}`,
          ...data,
          createdAt: new Date('2026-08-26T04:00:00.000Z'),
          updatedAt: new Date('2026-08-26T04:00:00.000Z'),
          commentId: null,
          commentUrl: null,
          botLogin: null,
          appSlug: null,
        };
        rows.set(key, row);
        return Object.fromEntries(Object.keys(select).map((field) => [field, row[field]]));
      },
      async findUnique({ where, select }) {
        const row = rows.get(uniqueKey(where.agent_relay_claims_target_replay));
        return row ? Object.fromEntries(Object.keys(select).map((field) => [field, row[field]])) : null;
      },
      async update({ where, data }) {
        const row = [...rows.values()].find((candidate) => candidate.id === where.id);
        assert.ok(row);
        Object.assign(row, data);
        return row;
      },
    },
  };
}

function commentGithubFetch(comments, { ambiguousWrite = false, botLogin = CONFIG.CORPFLOW_AGENT_RELAY_GITHUB_EXPECTED_BOT_LOGIN, appSlug = CONFIG.CORPFLOW_AGENT_RELAY_GITHUB_APP_SLUG } = {}) {
  return async (url, options = {}) => {
    const path = String(url);
    if (path.includes('/access_tokens')) {
      return response({ token: 'comment-installation-token', expires_at: '2099-08-26T01:00:00.000Z' });
    }
    if (options.method === 'POST' && /\/issues\/34\/comments$/.test(path)) {
      const comment = {
        id: comments.length + 1,
        html_url: `https://github.test/comment/${comments.length + 1}`,
        body: JSON.parse(options.body).body,
        user: { login: botLogin },
        performed_via_github_app: { slug: appSlug, name: 'CorpFlowAI Agent Relay' },
      };
      comments.push(comment);
      if (ambiguousWrite) throw new Error('connection dropped after write');
      return response(comment);
    }
    if (/\/issues\/comments\/\d+$/.test(path)) {
      const id = Number(path.split('/').pop());
      const comment = comments.find((candidate) => candidate.id === id);
      return response(comment || {}, { ok: Boolean(comment), status: comment ? 200 : 404 });
    }
    if (/\/issues\/34\/comments\?/.test(path)) return response(comments);
    throw new Error(`unexpected GitHub endpoint ${path}`);
  };
}

describe('CorpFlowAI Agent Relay Phase 2 Slice 1 work contract', () => {
  it('accepts an authenticated valid request and returns bounded non-secret evidence', async () => {
    clearGithubAppRelayTokenCacheForTests();
    const result = await executeAgentRelayWork(envelope(), { nowMs: NOW, fetchFn: githubFetch, configOverrides: CONFIG });
    assert.equal(result.status, 200);
    assert.equal(result.body.policyAccepted, true);
    assert.equal(result.body.protectedActionTriggered, false);
    assert.equal(result.body.evidence.pullRequest.headSha, SHA);
    assert.doesNotMatch(JSON.stringify(result.body), /installation-token|BEGIN PRIVATE KEY|Authorization/i);
  });

  it('requires an admin session or trusted cron bearer, never a MASTER_ADMIN_KEY relay credential', async () => {
    const unauthenticated = fakeResponse();
    await agentRelayWorkHandler({ method: 'POST', body: envelope(), headers: {} }, unauthenticated, {
      getSession: () => ({ ok: false }),
      verifyCronBearer: () => false,
    });
    assert.equal(unauthenticated.statusCode, 401);
    assert.equal(unauthenticated.body.error, 'UNAUTHORIZED');

    const authenticated = fakeResponse();
    await agentRelayWorkHandler({ method: 'POST', body: envelope(), headers: {} }, authenticated, {
      nowMs: NOW, getSession: () => ({ ok: true, payload: { typ: 'admin' } }), verifyCronBearer: () => false,
      fetchFn: githubFetch, configOverrides: CONFIG,
    });
    assert.equal(authenticated.statusCode, 200);
  });

  it('rejects malformed, unknown-version, expired, oversized, and unknown-field envelopes', async () => {
    assert.throws(() => parseAgentRelayWorkEnvelope({}), /UNSUPPORTED_SCHEMA_VERSION|UNKNOWN_ENVELOPE_FIELD/);
    assert.throws(() => parseAgentRelayWorkEnvelope(envelope({ schema: 'corpflow.agent_relay.work.v2' }), { nowMs: NOW }), /UNSUPPORTED_SCHEMA_VERSION/);
    assert.throws(() => parseAgentRelayWorkEnvelope(envelope({ expires_at: '2026-08-25T23:59:30.000Z' }), { nowMs: NOW }), /REQUEST_EXPIRED/);
    assert.throws(() => parseAgentRelayWorkEnvelope({ ...envelope(), arbitrary_url: 'https://attacker.test' }, { nowMs: NOW }), /UNKNOWN_ENVELOPE_FIELD/);
    const oversized = fakeResponse();
    await agentRelayWorkHandler({ method: 'POST', body: `${JSON.stringify(envelope())}${'x'.repeat(25 * 1024)}`, headers: {} }, oversized, {
      getSession: () => ({ ok: true, payload: { typ: 'admin' } }),
    });
    assert.equal(oversized.statusCode, 413);
  });

  it('hard-binds the exact repository policy and rejects misconfigured expansion', async () => {
    const invalidRepo = await executeAgentRelayWork(envelope({ repository: 'evil/repo' }), { nowMs: NOW, fetchFn: githubFetch, configOverrides: CONFIG });
    assert.equal(invalidRepo.status, 403);
    assert.equal(invalidRepo.body.error, 'REPOSITORY_NOT_ALLOWED');
    const expanded = await executeAgentRelayWork(envelope(), {
      nowMs: NOW, fetchFn: githubFetch,
      configOverrides: { ...CONFIG, CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST: `${CONFIG.CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST},evil/repo` },
    });
    assert.equal(expanded.status, 503);
    assert.equal(expanded.body.error, 'AGENT_RELAY_REPOSITORY_NOT_ALLOWLISTED');
  });

  it('rejects unknown/protected operations, arbitrary endpoint fields, identity overrides, and malformed targets', async () => {
    for (const candidate of [
      envelope({ operation: 'github.request', requested_evidence: ['repository_metadata'] }),
      envelope({ operation: 'pull_request.merge', requested_evidence: ['pull_request_metadata'] }),
      { ...envelope(), github_identity: 'attacker-app' },
      envelope({ target: { type: 'pull_request', number: 'not-a-number', identifier: '', expected_sha: '' } }),
      envelope({ target: { type: 'issue', number: 34, identifier: '', expected_sha: '' } }),
      { ...envelope(), payload: { url: 'https://169.254.169.254/latest/meta-data' } },
    ]) {
      const result = await executeAgentRelayWork(candidate, { nowMs: NOW, fetchFn: githubFetch, configOverrides: CONFIG });
      assert.equal(result.body.policyAccepted, false);
      assert.equal(result.body.protectedActionTriggered, false);
    }
  });

  it('fails closed for SHA mismatch and missing App configuration', async () => {
    clearGithubAppRelayTokenCacheForTests();
    const shaSensitive = envelope({
      operation: 'pull_request.get_head',
      target: { type: 'pull_request', number: 34, identifier: '', expected_sha: 'c'.repeat(40) },
      requested_evidence: ['pull_request_head'],
    });
    const mismatch = await executeAgentRelayWork(shaSensitive, { nowMs: NOW, fetchFn: githubFetch, configOverrides: CONFIG });
    assert.equal(mismatch.status, 409);
    assert.equal(mismatch.body.error, 'EXPECTED_SHA_MISMATCH');

    const missingConfig = await executeAgentRelayWork(envelope(), {
      nowMs: NOW, fetchFn: githubFetch,
      configOverrides: { ...CONFIG, CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY: '' },
    });
    assert.equal(missingConfig.status, 503);
    assert.equal(missingConfig.body.error, 'AGENT_RELAY_PRIVATE_KEY_REQUIRED');
  });

  it('returns bounded repository evidence for both hard-allowlisted repositories', async () => {
    clearGithubAppRelayTokenCacheForTests();
    for (const repository of AGENT_RELAY_REPOSITORIES) {
      const result = await executeAgentRelayWork(envelope({
        repository,
        operation: 'repository.get_metadata',
        target: { type: 'repository', number: '', identifier: '', expected_sha: '' },
        requested_evidence: ['repository_metadata'],
      }), { nowMs: NOW, fetchFn: githubFetch, configOverrides: CONFIG });
      assert.equal(result.status, 200);
      assert.equal(result.body.repository, repository);
      assert.equal(result.body.evidence.repository.fullName, repository);
    }
  });

  it('creates one durable claim before one provenanced comment and replays the durable result', async () => {
    clearGithubAppRelayTokenCacheForTests();
    const comments = [];
    const input = envelope({
      operation: 'issue.add_comment',
      target: { type: 'issue', number: 34, identifier: '', expected_sha: '' },
      payload: { comment_body: 'Bounded Relay comment.' },
      requested_evidence: ['issue_comment'],
    });
    const urls = [];
    const upstream = commentGithubFetch(comments);
    const fetchFn = async (url, options) => {
      urls.push(String(url));
      return upstream(url, options);
    };
    const deps = { nowMs: NOW, fetchFn, configOverrides: CONFIG, prisma: claimStore() };
    const created = await executeAgentRelayWork(input, deps);
    assert.equal(created.status, 200);
    assert.equal(created.body.idempotencyState, 'new_execution');
    assert.equal(created.body.evidence.comment.provenance, 'PASS');
    assert.equal(comments.length, 1);
    assert.match(comments[0].body, /corpflow-agent-relay:issue\.add_comment:v1:/);

    const replay = await executeAgentRelayWork(input, deps);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.idempotencyState, 'replay');
    assert.equal(replay.body.evidence.comment.commentId, '1');
    assert.equal(comments.length, 1);
    assert.ok(urls.some((url) => /issues\/34\/comments\?.*since=2026-08-26T03%3A59%3A00/.test(url)));
    assert.doesNotMatch(JSON.stringify(replay.body), /comment-installation-token|BEGIN PRIVATE KEY|Authorization/i);

    const mismatch = await executeAgentRelayWork({
      ...input,
      payload: { comment_body: 'A materially different comment.' },
    }, deps);
    assert.equal(mismatch.status, 409);
    assert.equal(mismatch.body.error, 'RELAY_REPLAY_IDENTITY_MISMATCH');
    assert.equal(mismatch.body.evidence, undefined);
    assert.equal(comments.length, 1);
  });

  it('serializes concurrent same-replay callers with the unique claim and never creates a second comment', async () => {
    clearGithubAppRelayTokenCacheForTests();
    const comments = [];
    const input = envelope({
      operation: 'issue.add_comment',
      target: { type: 'issue', number: 34, identifier: '', expected_sha: '' },
      payload: { comment_body: 'Concurrent safe comment.' },
      requested_evidence: ['issue_comment'],
    });
    const deps = { nowMs: NOW, fetchFn: commentGithubFetch(comments, { ambiguousWrite: true }), configOverrides: CONFIG, prisma: claimStore() };
    const [first, second] = await Promise.all([
      executeAgentRelayWork(input, deps),
      executeAgentRelayWork(input, deps),
    ]);
    assert.equal(comments.length, 1);
    assert.ok([first, second].some((result) => result.body.idempotencyState === 'replay'));
    assert.ok([first, second].every((result) => result.status === 200 || result.status === 409));
  });

  it('marks an ambiguous write for recovery and reads durable GitHub state before returning', async () => {
    clearGithubAppRelayTokenCacheForTests();
    const comments = [];
    const calls = [];
    const upstream = commentGithubFetch(comments, { ambiguousWrite: true });
    const fetchFn = async (url, options) => {
      calls.push({ url: String(url), method: options?.method || 'GET' });
      return upstream(url, options);
    };
    const result = await executeAgentRelayWork(envelope({
      operation: 'issue.add_comment',
      target: { type: 'issue', number: 34, identifier: '', expected_sha: '' },
      payload: { comment_body: 'Ambiguous write readback.' },
      requested_evidence: ['issue_comment'],
    }), { nowMs: NOW, fetchFn, configOverrides: CONFIG, prisma: claimStore() });
    assert.equal(result.status, 200);
    assert.equal(result.body.idempotencyState, 'replay');
    const postIndex = calls.findIndex((call) => call.method === 'POST' && /\/issues\/34\/comments$/.test(call.url));
    const readbackIndex = calls.findIndex((call, index) => index > postIndex && /\/issues\/34\/comments\?/.test(call.url));
    assert.ok(postIndex >= 0);
    assert.ok(readbackIndex > postIndex);
  });

  it('fails closed for invalid body, unavailable claim storage, and mismatched App provenance', async () => {
    const invalid = await executeAgentRelayWork(envelope({
      operation: 'issue.add_comment',
      target: { type: 'issue', number: 34, identifier: '', expected_sha: '' },
      payload: { comment_body: 'x'.repeat(AGENT_RELAY_COMMENT_BODY_MAX_BYTES + 1) },
      requested_evidence: ['issue_comment'],
    }), { nowMs: NOW, fetchFn: githubFetch, configOverrides: CONFIG });
    assert.equal(invalid.body.policyAccepted, false);

    const input = envelope({
      operation: 'issue.add_comment',
      target: { type: 'issue', number: 34, identifier: '', expected_sha: '' },
      payload: { comment_body: 'bounded' },
      requested_evidence: ['issue_comment'],
    });
    const unavailable = await executeAgentRelayWork(input, { nowMs: NOW, fetchFn: commentGithubFetch([]), configOverrides: CONFIG });
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.body.error, 'RELAY_DURABLE_STORE_UNAVAILABLE');

    const mismatch = await executeAgentRelayWork(input, {
      nowMs: NOW,
      fetchFn: commentGithubFetch([], { botLogin: 'wrong[bot]' }),
      configOverrides: CONFIG,
      prisma: claimStore(),
    });
    assert.equal(mismatch.status, 503);
    assert.equal(mismatch.body.error, 'AGENT_RELAY_IDENTITY_PROVENANCE_MISMATCH');
  });

  it('supports the second allowlisted repository under a distinct durable claim key', async () => {
    clearGithubAppRelayTokenCacheForTests();
    const comments = [];
    const result = await executeAgentRelayWork(envelope({
      repository: AGENT_RELAY_REPOSITORIES[1],
      operation: 'issue.add_comment',
      request_id: 'request-87654321',
      replay_identity: 'replay-87654321',
      correlation_id: 'work-order-87654321',
      target: { type: 'issue', number: 34, identifier: '', expected_sha: '' },
      payload: { comment_body: 'Second approved repository.' },
      requested_evidence: ['issue_comment'],
    }), { nowMs: NOW, fetchFn: commentGithubFetch(comments), configOverrides: CONFIG, prisma: claimStore() });
    assert.equal(result.status, 200);
    assert.equal(result.body.repository, AGENT_RELAY_REPOSITORIES[1]);
    assert.equal(comments.length, 1);
  });
});
