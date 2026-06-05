/**
 * AI Lead Rescue assistant — OpenAI Responses API client.
 *
 * Mirrors the `lib/server/groq-client.js` pattern: single function, raw fetch,
 * one URL, env-driven model + key. No new npm dependencies — keeps the
 * security-review surface narrow and the supply-chain footprint identical
 * to the rest of the repo.
 *
 * Why raw fetch (not `@openai/agents` SDK or `@openai/chatkit-react`):
 * - We do not need multi-agent handoffs, MCP, or session persistence.
 * - We do not need ChatKit's iframe-rendered UI (we ship our own UI in
 *   `components/LeadRescueBot.js` so doctrine vocabulary stays in our repo).
 * - The Responses API surface we use is small: model, input, instructions,
 *   tools, temperature, max_output_tokens. Stable since GA.
 * - Zero new packages = no npm install path, no audit/lockfile churn, no
 *   transitive-dep CVE noise to chase.
 *
 * Streaming: v1 uses NON-streaming for simplicity (audit § 8 does not require
 * streaming). v1.5 can move to SSE.
 *
 * Doctrine reference: `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` § 5 Q1, § 8.
 */

import { cfg } from '../runtime-config.js';

export const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

/**
 * Default model — chosen for low latency + low cost at the launch-volume floor
 * documented in the audit (~500 visitors / month, ~$1–15 / mo run-rate).
 * Override per-env via `CORPFLOW_LEAD_RESCUE_BOT_MODEL`.
 */
const DEFAULT_MODEL = 'gpt-4o-mini';

/** @returns {string} */
export function resolveLeadRescueBotModel() {
  const raw = String(cfg('CORPFLOW_LEAD_RESCUE_BOT_MODEL', '') || '').trim();
  return raw || DEFAULT_MODEL;
}

/** @returns {string} */
export function getOpenAiApiKey() {
  return String(cfg('OPENAI_API_KEY', '') || process.env.OPENAI_API_KEY || '').trim();
}

/**
 * @typedef {Object} ResponsesInputItem
 * @property {'system' | 'user' | 'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} ResponsesToolSchema
 * @property {'function'} type
 * @property {string} name
 * @property {string} description
 * @property {Record<string, unknown>} parameters  — JSON Schema
 * @property {boolean} [strict]
 */

/**
 * @typedef {Object} ResponsesFunctionCall
 * @property {'function_call'} type
 * @property {string} name
 * @property {string} call_id
 * @property {string} arguments       — raw JSON string
 */

/**
 * @typedef {Object} ResponsesAssistantMessage
 * @property {'message'} type
 * @property {'assistant'} role
 * @property {Array<{ type: 'output_text', text: string }>} content
 */

/**
 * @typedef {Object} ResponsesApiResult
 * @property {string} id
 * @property {Array<ResponsesAssistantMessage | ResponsesFunctionCall>} output
 * @property {Record<string, unknown>} [usage]
 * @property {string} [model]
 */

/**
 * Call the OpenAI Responses API. Returns the parsed JSON response or throws
 * with a stable shape `{ status, body }` on non-2xx, `{ kind: 'fetch_failed' }`
 * on network error.
 *
 * @param {Object} args
 * @param {string} args.model
 * @param {string} args.instructions      — full system prompt (with KB appended)
 * @param {ResponsesInputItem[]} args.input
 * @param {ResponsesToolSchema[]} args.tools
 * @param {number} args.temperature
 * @param {number} args.maxOutputTokens
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<ResponsesApiResult>}
 */
export async function callOpenAiResponses(args) {
  const key = getOpenAiApiKey();
  if (!key) {
    const e = new Error('OPENAI_API_KEY missing');
    /** @type {any} */ (e).kind = 'no_key';
    throw e;
  }

  const body = {
    model: args.model,
    instructions: args.instructions,
    input: args.input,
    tools: args.tools,
    temperature: args.temperature,
    max_output_tokens: args.maxOutputTokens,
    parallel_tool_calls: false,
    store: false,
  };

  /** @type {Response} */
  let resp;
  try {
    resp = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: args.signal,
    });
  } catch (err) {
    const e = new Error(`Responses API fetch failed: ${err?.message || err}`);
    /** @type {any} */ (e).kind = 'fetch_failed';
    /** @type {any} */ (e).cause = err;
    throw e;
  }

  if (!resp.ok) {
    let bodyText = '';
    try {
      bodyText = await resp.text();
    } catch {
      /* ignore */
    }
    const e = new Error(`Responses API non-2xx: ${resp.status}`);
    /** @type {any} */ (e).kind = 'http_error';
    /** @type {any} */ (e).status = resp.status;
    /** @type {any} */ (e).body = bodyText.slice(0, 800);
    throw e;
  }

  /** @type {ResponsesApiResult} */
  let json;
  try {
    json = /** @type {any} */ (await resp.json());
  } catch (err) {
    const e = new Error('Responses API returned non-JSON');
    /** @type {any} */ (e).kind = 'bad_json';
    /** @type {any} */ (e).cause = err;
    throw e;
  }

  return json;
}

/**
 * Extract the final assistant text from a Responses API result. Concatenates
 * all `output_text` parts of the last `message` item. Returns '' if none.
 *
 * @param {ResponsesApiResult} result
 * @returns {string}
 */
export function extractAssistantText(result) {
  if (!result || !Array.isArray(result.output)) return '';
  const lastMessage = [...result.output].reverse().find((o) => o && o.type === 'message');
  if (!lastMessage || !Array.isArray(/** @type {any} */ (lastMessage).content)) return '';
  return /** @type {any} */ (lastMessage).content
    .filter((c) => c && c.type === 'output_text' && typeof c.text === 'string')
    .map((c) => /** @type {any} */ (c).text)
    .join('')
    .trim();
}

/**
 * Extract function calls from a Responses API result, in order. The handler
 * runs these client-side — they NEVER hit the server (both tools are pure
 * client-side effects).
 *
 * @param {ResponsesApiResult} result
 * @returns {Array<{ name: string, call_id: string, arguments: string }>}
 */
export function extractFunctionCalls(result) {
  if (!result || !Array.isArray(result.output)) return [];
  return /** @type {any} */ (result.output)
    .filter((o) => o && o.type === 'function_call')
    .map((o) => ({
      name: String(o.name || ''),
      call_id: String(o.call_id || ''),
      arguments: String(o.arguments || ''),
    }));
}
