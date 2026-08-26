/**
 * One-time operator-only runner for #1089.
 * Fixed target only: corpflow-ai-command-center issue #1088.
 */
import crypto from 'crypto';

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import {
  AGENT_RELAY_REPOSITORIES,
  getGithubAppInstallationToken,
  runGithubAppIdentityProbe,
} from './github-app-relay.js';

export const AGENT_RELAY_PROBE_REPOSITORY = AGENT_RELAY_REPOSITORIES[0];
export const AGENT_RELAY_PROBE_ISSUE_NUMBER = 1088;
let completedInProcess = false;

function jsonError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function marker() {
  return `<!-- corpflow-agent-relay-identity-probe:${crypto.randomUUID()} -->`;
}

function safeEvidence(result) {
  return {
    repository: result.repository,
    issueNumber: AGENT_RELAY_PROBE_ISSUE_NUMBER,
    commentId: result.commentId,
    commentUrl: result.commentUrl,
    botLogin: result.botLogin,
    appSlug: result.appSlug,
    appName: result.appName,
    provenance: 'PASS',
  };
}

async function existingProbeExists({ fetchFn, configOverrides }) {
  const token = await getGithubAppInstallationToken({
    repo: AGENT_RELAY_PROBE_REPOSITORY,
    fetchFn,
    configOverrides,
  });
  const response = await fetchFn(
    `https://api.github.com/repos/${AGENT_RELAY_PROBE_REPOSITORY}/issues/${AGENT_RELAY_PROBE_ISSUE_NUMBER}/comments?per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) throw new Error('AGENT_RELAY_PROBE_PRECHECK_FAILED');
  const comments = await response.json();
  return Array.isArray(comments) && comments.some((comment) =>
    String(comment?.body || '').includes('<!-- corpflow-agent-relay-identity-probe:'),
  );
}

export function resetAgentRelayIdentityProbeRunnerForTests() {
  completedInProcess = false;
}

export default async function agentRelayIdentityProbeRunner(req, res, deps = {}) {
  if (String(req.method || '').toUpperCase() !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'METHOD_NOT_ALLOWED');
  }
  const verifyAuth = deps.verifyAuth || verifyFactoryMasterAuth;
  if (!verifyAuth(req)) return jsonError(res, 403, 'FACTORY_MASTER_REQUIRED');
  if (completedInProcess) return jsonError(res, 409, 'IDENTITY_PROBE_ALREADY_EXECUTED');

  const fetchFn = deps.fetchFn || globalThis.fetch;
  const configOverrides = deps.configOverrides;
  try {
    if (await existingProbeExists({ fetchFn, configOverrides })) {
      return jsonError(res, 409, 'IDENTITY_PROBE_ALREADY_RECORDED');
    }
    const result = await (deps.runProbe || runGithubAppIdentityProbe)({
      repo: AGENT_RELAY_PROBE_REPOSITORY,
      issueNumber: AGENT_RELAY_PROBE_ISSUE_NUMBER,
      marker: marker(),
      fetchFn,
      configOverrides,
    });
    const evidence = safeEvidence(result);
    if (
      evidence.repository !== AGENT_RELAY_PROBE_REPOSITORY ||
      evidence.issueNumber !== AGENT_RELAY_PROBE_ISSUE_NUMBER ||
      !evidence.commentId ||
      !evidence.commentUrl ||
      !evidence.botLogin ||
      !evidence.appSlug ||
      !evidence.appName
    ) {
      return jsonError(res, 503, 'AGENT_RELAY_PROBE_PROVENANCE_MISMATCH');
    }
    completedInProcess = true;
    return res.status(200).json({ ok: true, ...evidence });
  } catch (error) {
    return jsonError(res, 503, error instanceof Error ? error.message : 'AGENT_RELAY_PROBE_FAILED');
  }
}
