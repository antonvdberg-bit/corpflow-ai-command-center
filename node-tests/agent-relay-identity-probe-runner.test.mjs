import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it, beforeEach } from 'node:test';

import {
  AGENT_RELAY_PROBE_ISSUE_NUMBER,
  AGENT_RELAY_PROBE_REPOSITORY,
  resetAgentRelayIdentityProbeRunnerForTests,
} from '../lib/server/agent-relay-identity-probe-runner.js';
import agentRelayIdentityProbeRunner from '../lib/server/agent-relay-identity-probe-runner.js';
import { AGENT_RELAY_REPOSITORIES, clearGithubAppRelayTokenCacheForTests } from '../lib/server/github-app-relay.js';

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const CONFIG = {
  CORPFLOW_AGENT_RELAY_GITHUB_APP_ID: '123456',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_INSTALLATION_ID: '987654',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n'),
  CORPFLOW_AGENT_RELAY_GITHUB_EXPECTED_BOT_LOGIN: 'corpflowai-relay[bot]',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_SLUG: 'corpflowai-agent-relay',
  CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST: AGENT_RELAY_REPOSITORIES.join(','),
};

function response(body, ok = true) {
  return { ok, async json() { return body; } };
}

function makeRes() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

beforeEach(() => {
  resetAgentRelayIdentityProbeRunnerForTests();
  clearGithubAppRelayTokenCacheForTests();
});

describe('Agent Relay one-time identity probe runner (#1089)', () => {
  it('hard-binds the target and returns only sanitized evidence', async () => {
    const res = makeRes();
    let called = null;
    await agentRelayIdentityProbeRunner({ method: 'POST', headers: {} }, res, {
      verifyAuth: () => true,
      configOverrides: CONFIG,
      fetchFn: async (url) => {
        if (String(url).includes('/access_tokens')) return response({ token: 'secret-installation-token', expires_at: new Date(Date.now() + 600_000).toISOString() });
        return response([]);
      },
      runProbe: async (input) => {
        called = input;
        return {
          repository: AGENT_RELAY_PROBE_REPOSITORY,
          commentId: 88,
          commentUrl: 'https://github.example/comment/88',
          botLogin: 'corpflowai-relay[bot]',
          appSlug: 'corpflowai-agent-relay',
          appName: 'CorpFlowAI Agent Relay',
        };
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(called.repo, AGENT_RELAY_PROBE_REPOSITORY);
    assert.equal(called.issueNumber, AGENT_RELAY_PROBE_ISSUE_NUMBER);
    assert.equal(res.body.provenance, 'PASS');
    assert.doesNotMatch(JSON.stringify(res.body), /secret-installation-token|PRIVATE KEY|987654/);
  });

  it('rejects untrusted, malformed, configured-failure, and provenance-mismatch invocations', async () => {
    const unauth = makeRes();
    await agentRelayIdentityProbeRunner({ method: 'POST', headers: {} }, unauth, { verifyAuth: () => false });
    assert.equal(unauth.statusCode, 403);
    assert.equal(unauth.body.error, 'FACTORY_MASTER_REQUIRED');

    const wrongMethod = makeRes();
    await agentRelayIdentityProbeRunner({ method: 'GET', headers: {} }, wrongMethod, { verifyAuth: () => true });
    assert.equal(wrongMethod.statusCode, 405);

    const missingConfig = makeRes();
    await agentRelayIdentityProbeRunner({ method: 'POST', headers: {} }, missingConfig, { verifyAuth: () => true });
    assert.equal(missingConfig.statusCode, 503);

    const mismatch = makeRes();
    await agentRelayIdentityProbeRunner({ method: 'POST', headers: {} }, mismatch, {
      verifyAuth: () => true,
      configOverrides: CONFIG,
      fetchFn: async (url) => String(url).includes('/access_tokens')
        ? response({ token: 'x', expires_at: new Date(Date.now() + 600_000).toISOString() })
        : response([]),
      runProbe: async () => ({ repository: 'evil/repo', commentId: 1, commentUrl: 'x', botLogin: 'x', appSlug: 'x', appName: 'x' }),
    });
    assert.equal(mismatch.statusCode, 503);
    assert.equal(mismatch.body.error, 'AGENT_RELAY_PROBE_PROVENANCE_MISMATCH');
  });

  it('does not mutate when an existing probe marker is found', async () => {
    const res = makeRes();
    let mutations = 0;
    await agentRelayIdentityProbeRunner({ method: 'POST', headers: {} }, res, {
      verifyAuth: () => true,
      configOverrides: CONFIG,
      fetchFn: async (url, options = {}) => {
        if (String(url).includes('/access_tokens')) return response({ token: 'x', expires_at: new Date(Date.now() + 600_000).toISOString() });
        if (options.method === 'POST') mutations += 1;
        return response([{ body: '<!-- corpflow-agent-relay-identity-probe:existing_marker_123 -->' }]);
      },
      runProbe: async () => {
        mutations += 1;
        throw new Error('must not run');
      },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error, 'IDENTITY_PROBE_ALREADY_RECORDED');
    assert.equal(mutations, 0);
  });
});
