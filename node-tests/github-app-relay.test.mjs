import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  AGENT_RELAY_REPOSITORIES,
  assertAgentRelayRepository,
  clearGithubAppRelayTokenCacheForTests,
  createGithubAppJwt,
  getGithubAppInstallationToken,
  normalizeGithubAppPrivateKey,
  runGithubAppIdentityProbe,
} from '../lib/server/github-app-relay.js';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
const CONFIG = {
  CORPFLOW_AGENT_RELAY_GITHUB_APP_ID: '123456',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_INSTALLATION_ID: '987654',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY: PEM.replace(/\n/g, '\\n'),
  CORPFLOW_AGENT_RELAY_GITHUB_EXPECTED_BOT_LOGIN: 'corpflowai-relay[bot]',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_SLUG: 'corpflowai-agent-relay',
  CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST: AGENT_RELAY_REPOSITORIES.join(','),
};
const REPO = AGENT_RELAY_REPOSITORIES[1];

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, async json() { return body; } };
}

describe('CorpFlowAI Agent Relay GitHub App identity', () => {
  it('creates a valid short-lived RS256 GitHub App JWT with newline-safe PEM', () => {
    const jwt = createGithubAppJwt({ appId: CONFIG.CORPFLOW_AGENT_RELAY_GITHUB_APP_ID, privateKey: CONFIG.CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY }, { nowSeconds: 1_700_000_000 });
    const [header, payload, signature] = jwt.split('.');
    assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'RS256', typ: 'JWT' });
    assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).iss, '123456');
    assert.equal(crypto.verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url')), true);
    assert.match(normalizeGithubAppPrivateKey(CONFIG.CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY), /BEGIN PRIVATE KEY/);
  });

  it('exchanges only the configured installation identity for a short-lived server token', async () => {
    clearGithubAppRelayTokenCacheForTests();
    const token = await getGithubAppInstallationToken({
      repo: REPO,
      configOverrides: CONFIG,
      nowMs: 1_700_000_000_000,
      fetchFn: async (url, options) => {
        assert.match(String(url), /\/app\/installations\/987654\/access_tokens$/);
        assert.equal(options.method, 'POST');
        assert.match(options.headers.Authorization, /^Bearer ey/);
        return response({ token: 'installation-token-never-serialized', expires_at: '2023-11-14T23:13:20.000Z' });
      },
    });
    assert.equal(token, 'installation-token-never-serialized');
  });

  it('fails closed for non-allowlisted repositories, missing credentials, and token acquisition errors', async () => {
    assert.throws(() => assertAgentRelayRepository('evil/repo', CONFIG), /NOT_ALLOWLISTED/);
    assert.throws(() => assertAgentRelayRepository(REPO, { ...CONFIG, CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST: REPO }), /NOT_ALLOWLISTED/);
    await assert.rejects(
      getGithubAppInstallationToken({ repo: REPO, configOverrides: { ...CONFIG, CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY: '' } }),
      /PRIVATE_KEY_REQUIRED/,
    );
    clearGithubAppRelayTokenCacheForTests();
    await assert.rejects(
      getGithubAppInstallationToken({ repo: REPO, configOverrides: CONFIG, fetchFn: async () => response({}, { ok: false, status: 401 }) }),
      /TOKEN_ACQUISITION_FAILED/,
    );
  });

  it('proves the exact bot and performed_via_github_app provenance after a bounded marker write/read', async () => {
    clearGithubAppRelayTokenCacheForTests();
    const marker = '<!-- corpflow-agent-relay-identity-probe:probe_1234567890 -->';
    const comment = {
      id: 42,
      html_url: 'https://github.example/comment/42',
      body: `${marker}\nCorpFlowAI Agent Relay identity probe. No approval or protected action.`,
      user: { login: 'corpflowai-relay[bot]' },
      performed_via_github_app: { slug: 'corpflowai-agent-relay', name: 'CorpFlowAI Agent Relay' },
    };
    const result = await runGithubAppIdentityProbe({
      repo: REPO,
      issueNumber: 34,
      marker,
      configOverrides: CONFIG,
      fetchFn: async (url, options = {}) => {
        if (String(url).includes('/access_tokens')) return response({
          token: 'probe-token',
          expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        });
        if (options.method === 'POST') return response(comment);
        return response(comment);
      },
    });
    assert.deepEqual(result, {
      repository: REPO,
      commentId: 42,
      commentUrl: 'https://github.example/comment/42',
      botLogin: 'corpflowai-relay[bot]',
      appSlug: 'corpflowai-agent-relay',
      appName: 'CorpFlowAI Agent Relay',
      performedViaGithubApp: { slug: 'corpflowai-agent-relay', name: 'CorpFlowAI Agent Relay' },
    });
  });

  it('keeps identity-probe execution library-only after Phase 1 cleanup', () => {
    const router = readFileSync(join(process.cwd(), 'api/factory_router.js'), 'utf8');
    assert.doesNotMatch(router, /agent-relay\/identity-probe/);
    assert.doesNotMatch(router, /agentRelayIdentityProbeRunner/);
  });
});
