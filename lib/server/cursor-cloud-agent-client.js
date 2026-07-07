/**
 * Cursor Cloud Agents API client (v1) — dispatcher activator only.
 *
 * @see https://cursor.com/docs/cloud-agent/api/endpoints
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */

export const CURSOR_CLOUD_AGENT_API_BASE = 'https://api.cursor.com/v1';

export const CORPFLOW_CURSOR_REPO_URL =
  'https://github.com/antonvdberg-bit/corpflow-ai-command-center';

export const CORPFLOW_CURSOR_STARTING_REF = 'main';

/**
 * @param {import('./business-operations-dispatcher.js').BusinessOpsRouting} routing
 * @param {{ repoUrl?: string, startingRef?: string, namePrefix?: string }} [opts]
 */
export function buildCursorAgentCreatePayload(routing, opts = {}) {
  const prompt = String(
    routing?.executorPrompt || routing?.recommendedNextAction || '',
  ).trim();
  if (!prompt) {
    throw new Error('cursor routing missing executorPrompt');
  }

  const objectRef = String(routing?.objectRef || 'unknown').replace(/[^\w:.-]+/g, '_');
  const namePrefix = opts.namePrefix || 'dispatcher';
  const name = `${namePrefix}-${objectRef}`.slice(0, 100);

  return {
    prompt: { text: prompt },
    repos: [
      {
        url: opts.repoUrl || CORPFLOW_CURSOR_REPO_URL,
        startingRef: opts.startingRef || CORPFLOW_CURSOR_STARTING_REF,
      },
    ],
    autoCreatePR: true,
    name,
  };
}

/**
 * @param {string} apiKey
 * @param {ReturnType<typeof buildCursorAgentCreatePayload>} payload
 * @param {{ fetch?: typeof fetch, timeoutMs?: number }} [deps]
 */
export async function createCursorCloudAgent(apiKey, payload, deps = {}) {
  const key = String(apiKey || '').trim();
  if (!key) {
    throw new Error('CURSOR_API_KEY missing — live Cursor activation disabled (fail closed)');
  }

  const fetchFn = deps.fetch || globalThis.fetch;
  const timeoutMs = deps.timeoutMs ?? 60000;
  const res = await fetchFn(`${CURSOR_CLOUD_AGENT_API_BASE}/agents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    const detail =
      (json && typeof json === 'object' && (json.message || json.error)) ||
      text.slice(0, 300);
    throw new Error(`Cursor Cloud API HTTP ${res.status}: ${detail}`);
  }

  return json;
}

/**
 * @param {Record<string, unknown> | null | undefined} apiResult
 */
export function extractCursorGitDetails(apiResult) {
  const result = apiResult && typeof apiResult === 'object' ? apiResult : {};
  const agent = result.agent && typeof result.agent === 'object' ? result.agent : {};
  const run = result.run && typeof result.run === 'object' ? result.run : {};
  const target = agent.target && typeof agent.target === 'object' ? agent.target : {};
  const runGit = run.git && typeof run.git === 'object' ? run.git : {};
  const agentGit = agent.git && typeof agent.git === 'object' ? agent.git : {};

  const branchLists = [
    Array.isArray(runGit.branches) ? runGit.branches : [],
    Array.isArray(agentGit.branches) ? agentGit.branches : [],
  ];

  let branch = String(target.branchName || '').trim() || null;
  let prUrl = String(target.prUrl || '').trim() || null;
  let prNumber = prUrl ? parsePrNumberFromUrl(prUrl) : null;

  for (const branches of branchLists) {
    for (const entry of branches) {
      if (!entry || typeof entry !== 'object') continue;
      if (!branch && entry.branch) branch = String(entry.branch).trim() || null;
      if (!prUrl && entry.prUrl) {
        prUrl = String(entry.prUrl).trim() || null;
        prNumber = prUrl ? parsePrNumberFromUrl(prUrl) : prNumber;
      }
    }
  }

  return {
    agentId: agent.id != null ? String(agent.id) : null,
    agentUrl: String(agent.url || target.url || '').trim() || null,
    runId: run.id != null ? String(run.id) : agent.latestRunId != null ? String(agent.latestRunId) : null,
    branch,
    prUrl,
    prNumber: prNumber != null ? String(prNumber) : null,
  };
}

/**
 * @param {string} url
 */
export function parsePrNumberFromUrl(url) {
  const m = String(url || '').match(/\/pull\/(\d+)(?:[/?#]|$)/i);
  return m ? Number(m[1]) : null;
}
