/**
 * Cursor Cloud Agents API client (v1) — dispatcher activator + CI repair follow-up.
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
 * @param {string} path
 * @param {{ method?: string, body?: unknown, fetch?: typeof fetch, timeoutMs?: number }} [deps]
 */
async function cursorApiRequest(apiKey, path, deps = {}) {
  const key = String(apiKey || '').trim();
  if (!key) {
    throw new Error('CURSOR_API_KEY missing — Cursor Cloud API disabled (fail closed)');
  }
  const fetchFn = deps.fetch || globalThis.fetch;
  const timeoutMs = deps.timeoutMs ?? 60000;
  const method = deps.method || 'GET';
  /** @type {Record<string, string>} */
  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  };
  /** @type {RequestInit} */
  const init = { method, headers, signal: AbortSignal.timeout(timeoutMs) };
  if (deps.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(deps.body);
  }
  const res = await fetchFn(`${CURSOR_CLOUD_AGENT_API_BASE}${path}`, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!res.ok) {
    const detail =
      (json && typeof json === 'object' && (json.message || json.error || json.code)) ||
      text.slice(0, 300);
    throw new Error(`Cursor Cloud API HTTP ${res.status}: ${detail}`);
  }
  return json;
}

/**
 * @param {string} apiKey
 * @param {ReturnType<typeof buildCursorAgentCreatePayload>} payload
 * @param {{ fetch?: typeof fetch, timeoutMs?: number }} [deps]
 */
export async function createCursorCloudAgent(apiKey, payload, deps = {}) {
  return cursorApiRequest(apiKey, '/agents', { method: 'POST', body: payload, ...deps });
}

/**
 * Send a follow-up prompt to an existing agent (same conversation/workspace).
 * POST /v1/agents/{id}/runs
 *
 * @param {string} apiKey
 * @param {string} agentId
 * @param {{ text: string, mode?: 'agent' | 'plan' }} prompt
 * @param {{ fetch?: typeof fetch, timeoutMs?: number }} [deps]
 */
export async function createCursorAgentFollowUpRun(apiKey, agentId, prompt, deps = {}) {
  const id = String(agentId || '').trim();
  if (!id) throw new Error('createCursorAgentFollowUpRun requires agentId');
  const text = String(prompt?.text || '').trim();
  if (!text) throw new Error('createCursorAgentFollowUpRun requires prompt.text');
  /** @type {Record<string, unknown>} */
  const body = { prompt: { text } };
  if (prompt?.mode === 'plan' || prompt?.mode === 'agent') body.mode = prompt.mode;
  return cursorApiRequest(apiKey, `/agents/${encodeURIComponent(id)}/runs`, {
    method: 'POST',
    body,
    ...deps,
  });
}

/**
 * @param {string} apiKey
 * @param {string} agentId
 * @param {{ fetch?: typeof fetch, timeoutMs?: number }} [deps]
 */
export async function getCursorCloudAgent(apiKey, agentId, deps = {}) {
  const id = String(agentId || '').trim();
  if (!id) throw new Error('getCursorCloudAgent requires agentId');
  return cursorApiRequest(apiKey, `/agents/${encodeURIComponent(id)}`, deps);
}

/**
 * Create a bounded repair agent tied to an existing PR (fallback when follow-up is impossible).
 *
 * @param {string} apiKey
 * @param {{ promptText: string, prUrl: string, name?: string, repoUrl?: string }} opts
 * @param {{ fetch?: typeof fetch, timeoutMs?: number }} [deps]
 */
export async function createCursorRepairAgentForPr(apiKey, opts, deps = {}) {
  const promptText = String(opts.promptText || '').trim();
  const prUrl = String(opts.prUrl || '').trim();
  if (!promptText) throw new Error('createCursorRepairAgentForPr requires promptText');
  if (!prUrl) throw new Error('createCursorRepairAgentForPr requires prUrl');
  const payload = {
    prompt: { text: promptText },
    repos: [
      {
        url: opts.repoUrl || CORPFLOW_CURSOR_REPO_URL,
        prUrl,
      },
    ],
    workOnCurrentBranch: true,
    autoCreatePR: false,
    name: String(opts.name || 'ci-repair').slice(0, 100),
  };
  return createCursorCloudAgent(apiKey, payload, deps);
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

  // Follow-up run responses may return { id, agentId, status } without nested agent.
  const topLevelAgentId = result.agentId != null ? String(result.agentId) : null;
  const topLevelRunId = result.id != null && String(result.id).startsWith('run-') ? String(result.id) : null;

  return {
    agentId: agent.id != null ? String(agent.id) : topLevelAgentId,
    agentUrl: String(agent.url || target.url || '').trim() || null,
    runId:
      run.id != null
        ? String(run.id)
        : topLevelRunId || (agent.latestRunId != null ? String(agent.latestRunId) : null),
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

/**
 * Extract bc-… agent id from text/HTML.
 * @param {string} text
 */
export function extractCursorAgentIdFromText(text) {
  const m = String(text || '').match(/\b(bc-[0-9a-f-]{20,})\b/i);
  return m ? m[1] : null;
}

/**
 * Extract run-… id from text.
 * @param {string} text
 */
export function extractCursorRunIdFromText(text) {
  const m = String(text || '').match(/\b(run-[0-9a-f-]{20,})\b/i);
  return m ? m[1] : null;
}
