/**
 * Single Groq OpenAI-compatible chat entrypoint + model resolution.
 * Keeps provider URL and env keys in one place for supply-chain clarity and future routing seams.
 */

import { cfg } from './runtime-config.js';

export const GROQ_OPENAI_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Built-in Groq chat model when `GROQ_MODEL_NAME` /
 * `CORPFLOW_TECHNICAL_LEAD_LLM_MODEL` are empty (#1013).
 * Groq decommissioned `llama-3.3-70b-versatile` for free/developer-tier usage
 * on 2026-08-16 and recommended this production replacement.
 */
export const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-120b';

/**
 * Known-retired Groq model IDs. Must never be the built-in default again.
 * Explicit env overrides that still name these IDs are operator configuration
 * (do not silently remap); they require an env mutation to clear.
 */
export const RETIRED_GROQ_MODEL_IDS = Object.freeze(['llama-3.3-70b-versatile']);

if (RETIRED_GROQ_MODEL_IDS.includes(GROQ_DEFAULT_MODEL)) {
  throw new Error(
    `GROQ_DEFAULT_MODEL must not be a retired Groq model id (${GROQ_DEFAULT_MODEL}). See issue #1013.`,
  );
}

/**
 * @param {string | null | undefined} modelId
 * @returns {boolean}
 */
export function isRetiredGroqModel(modelId) {
  return RETIRED_GROQ_MODEL_IDS.includes(String(modelId || '').trim());
}

/**
 * Model roles (no new env vars — reuse existing keys from `.env.template`).
 * - `primary`: Change Console refine, tenant concierge chat (`GROQ_MODEL_NAME`).
 * - `technical_lead_rephrase`: optional TL summary rephrase (`CORPFLOW_TECHNICAL_LEAD_LLM_MODEL`, else built-in default — same as pre-centralization, not `GROQ_MODEL_NAME`).
 * Narrow/fast subtasks can later share `primary` or split via `CORPFLOW_RUNTIME_CONFIG_JSON` keys only if added deliberately.
 *
 * @param {'primary' | 'technical_lead_rephrase'} role
 * @returns {string}
 */
export function resolveGroqModel(role) {
  const primary = String(cfg('GROQ_MODEL_NAME', '') || '').trim() || GROQ_DEFAULT_MODEL;
  if (role === 'technical_lead_rephrase') {
    const o = String(cfg('CORPFLOW_TECHNICAL_LEAD_LLM_MODEL', '') || '').trim();
    return o || GROQ_DEFAULT_MODEL;
  }
  return primary;
}

/**
 * @returns {string}
 */
export function getGroqApiKey() {
  return String(cfg('GROQ_API_KEY', '') || process.env.GROQ_API_KEY || '').trim();
}

/**
 * @param {object} opts
 * @param {string} opts.model
 * @param {Array<{ role: string, content: string }>} opts.messages
 * @param {number} [opts.temperature]
 * @param {number} [opts.max_tokens]
 * @returns {Promise<Response>}
 */
export function groqChatCompletionsFetch(opts) {
  const key = getGroqApiKey();
  return fetch(GROQ_OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      ...(typeof opts.temperature === 'number' && !Number.isNaN(opts.temperature)
        ? { temperature: opts.temperature }
        : {}),
      ...(opts.max_tokens != null ? { max_tokens: opts.max_tokens } : {}),
    }),
  });
}
