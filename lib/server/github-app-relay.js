/**
 * CorpFlowAI Agent Relay — GitHub App identity boundary (#1086).
 *
 * This is deliberately a narrow server-only client. It never accepts an
 * arbitrary repository, URL, or mutation payload.
 */
import crypto from 'crypto';

import { cfg } from './runtime-config.js';

export const AGENT_RELAY_REPOSITORIES = Object.freeze([
  'antonvdberg-bit/corpflow-ai-command-center',
  'antonvdberg-bit/rare-and-exclusive-collection',
]);

const API_ROOT = 'https://api.github.com';
const JWT_TTL_SECONDS = 9 * 60;
const TOKEN_SAFETY_WINDOW_MS = 60_000;
let tokenCache = null;

function value(input) {
  return input == null ? '' : String(input).trim();
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function configured(name, overrides) {
  return value(overrides?.[name] ?? cfg(name, ''));
}

export function normalizeGithubAppPrivateKey(raw) {
  const key = value(raw).replace(/\\n/g, '\n').replace(/\r\n?/g, '\n');
  return key.includes('-----BEGIN') && key.includes('-----END') ? key : '';
}

export function parseAgentRelayRepositoryAllowlist(raw) {
  const entries = value(raw).split(',').map((entry) => entry.trim()).filter(Boolean);
  return [...new Set(entries)];
}

export function assertAgentRelayRepository(repo, overrides) {
  const normalized = value(repo);
  const configuredAllowlist = parseAgentRelayRepositoryAllowlist(
    configured('CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST', overrides),
  );
  if (
    configuredAllowlist.length !== AGENT_RELAY_REPOSITORIES.length ||
    !AGENT_RELAY_REPOSITORIES.every((allowed) => configuredAllowlist.includes(allowed)) ||
    !AGENT_RELAY_REPOSITORIES.includes(normalized)
  ) {
    throw new Error('AGENT_RELAY_REPOSITORY_NOT_ALLOWLISTED');
  }
  return normalized;
}

export function getGithubAppRelayConfiguration(overrides = {}) {
  const appId = configured('CORPFLOW_AGENT_RELAY_GITHUB_APP_ID', overrides);
  const installationId = configured('CORPFLOW_AGENT_RELAY_GITHUB_APP_INSTALLATION_ID', overrides);
  const privateKey = normalizeGithubAppPrivateKey(configured('CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY', overrides));
  const expectedBotLogin = configured('CORPFLOW_AGENT_RELAY_GITHUB_EXPECTED_BOT_LOGIN', overrides).toLowerCase();
  const expectedAppSlug = configured('CORPFLOW_AGENT_RELAY_GITHUB_APP_SLUG', overrides).toLowerCase();
  const repositories = parseAgentRelayRepositoryAllowlist(
    configured('CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST', overrides),
  );
  if (!/^\d+$/.test(appId)) throw new Error('AGENT_RELAY_APP_ID_REQUIRED');
  if (!/^\d+$/.test(installationId)) throw new Error('AGENT_RELAY_INSTALLATION_ID_REQUIRED');
  if (!privateKey) throw new Error('AGENT_RELAY_PRIVATE_KEY_REQUIRED');
  if (!expectedBotLogin) throw new Error('AGENT_RELAY_EXPECTED_BOT_LOGIN_REQUIRED');
  if (!expectedAppSlug) throw new Error('AGENT_RELAY_APP_SLUG_REQUIRED');
  if (
    repositories.length !== AGENT_RELAY_REPOSITORIES.length ||
    !AGENT_RELAY_REPOSITORIES.every((repo) => repositories.includes(repo))
  ) {
    throw new Error('AGENT_RELAY_ALLOWLIST_CONFIGURATION_INVALID');
  }
  return { appId, installationId, privateKey, expectedBotLogin, expectedAppSlug, repositories };
}

export function createGithubAppJwt({ appId, privateKey, nowSeconds = Math.floor(Date.now() / 1000) }) {
  if (!/^\d+$/.test(value(appId)) || !normalizeGithubAppPrivateKey(privateKey)) {
    throw new Error('AGENT_RELAY_JWT_CONFIGURATION_INVALID');
  }
  const encodedHeader = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const encodedPayload = base64url(JSON.stringify({ iat: nowSeconds - 30, exp: nowSeconds + JWT_TTL_SECONDS, iss: value(appId) }));
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), normalizeGithubAppPrivateKey(privateKey));
  return `${encodedHeader}.${encodedPayload}.${signature.toString('base64url')}`;
}

function headers(token, extra = {}) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function getGithubAppInstallationToken({ repo, fetchFn = globalThis.fetch, configOverrides, nowMs = Date.now() }) {
  assertAgentRelayRepository(repo, configOverrides);
  const config = getGithubAppRelayConfiguration(configOverrides);
  if (tokenCache && tokenCache.installationId === config.installationId && tokenCache.expiresAtMs - nowMs > TOKEN_SAFETY_WINDOW_MS) {
    return tokenCache.token;
  }
  const jwt = createGithubAppJwt(config, { nowSeconds: Math.floor(nowMs / 1000) });
  let response;
  try {
    response = await fetchFn(`${API_ROOT}/app/installations/${config.installationId}/access_tokens`, {
      method: 'POST',
      headers: headers(jwt),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error('AGENT_RELAY_TOKEN_ACQUISITION_FAILED');
  }
  if (!response?.ok) throw new Error('AGENT_RELAY_TOKEN_ACQUISITION_FAILED');
  const payload = await response.json();
  const token = value(payload?.token);
  const expiresAtMs = Date.parse(value(payload?.expires_at));
  if (!token || !Number.isFinite(expiresAtMs) || expiresAtMs - nowMs <= TOKEN_SAFETY_WINDOW_MS) {
    throw new Error('AGENT_RELAY_TOKEN_ACQUISITION_FAILED');
  }
  tokenCache = { token, expiresAtMs, installationId: config.installationId };
  return token;
}

export function clearGithubAppRelayTokenCacheForTests() {
  tokenCache = null;
}

function assertCommentTarget(number) {
  const parsed = Number(number);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error('AGENT_RELAY_INVALID_COMMENT_TARGET');
  return parsed;
}

function assertMarker(marker) {
  const normalized = value(marker);
  if (!/^<!-- corpflow-agent-relay-identity-probe:[a-zA-Z0-9_-]{12,128} -->$/.test(normalized)) {
    throw new Error('AGENT_RELAY_INVALID_PROBE_MARKER');
  }
  return normalized;
}

function appProvenance(comment, config) {
  const login = value(comment?.user?.login).toLowerCase();
  const app = comment?.performed_via_github_app;
  const slug = value(app?.slug).toLowerCase();
  const name = value(app?.name);
  if (login !== config.expectedBotLogin || slug !== config.expectedAppSlug || !name) {
    throw new Error('AGENT_RELAY_IDENTITY_PROVENANCE_MISMATCH');
  }
  return { botLogin: login, appSlug: slug, appName: name };
}

export function assertGithubAppRelayCommentProvenance(comment, configOverrides) {
  return appProvenance(comment, getGithubAppRelayConfiguration(configOverrides));
}

/**
 * This is intentionally a library-only operation. No route invokes it; an
 * operator must explicitly run a future protected setup procedure.
 */
export async function runGithubAppIdentityProbe({
  repo,
  issueNumber,
  marker,
  fetchFn = globalThis.fetch,
  configOverrides,
}) {
  const allowedRepo = assertAgentRelayRepository(repo, configOverrides);
  const target = assertCommentTarget(issueNumber);
  const exactMarker = assertMarker(marker);
  const token = await getGithubAppInstallationToken({ repo: allowedRepo, fetchFn, configOverrides });
  const created = await fetchFn(`${API_ROOT}/repos/${allowedRepo}/issues/${target}/comments`, {
    method: 'POST',
    headers: headers(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ body: `${exactMarker}\nCorpFlowAI Agent Relay identity probe. No approval or protected action.` }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!created.ok) throw new Error('AGENT_RELAY_PROBE_WRITE_FAILED');
  const createdComment = await created.json();
  const id = assertCommentTarget(createdComment?.id);
  const read = await fetchFn(`${API_ROOT}/repos/${allowedRepo}/issues/comments/${id}`, {
    headers: headers(token),
    signal: AbortSignal.timeout(20_000),
  });
  if (!read.ok) throw new Error('AGENT_RELAY_PROBE_READ_FAILED');
  const comment = await read.json();
  if (!value(comment?.body).includes(exactMarker)) throw new Error('AGENT_RELAY_PROBE_MARKER_MISMATCH');
  const identity = appProvenance(comment, getGithubAppRelayConfiguration(configOverrides));
  return {
    repository: allowedRepo,
    commentId: id,
    commentUrl: value(comment?.html_url),
    ...identity,
    performedViaGithubApp: { slug: identity.appSlug, name: identity.appName },
  };
}
