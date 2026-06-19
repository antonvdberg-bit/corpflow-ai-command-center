/**
 * Provider adapter — Groq (OpenAI-compatible chat/completions).
 * Uses existing lib/server/groq-client.js env conventions (GROQ_API_KEY, GROQ_MODEL_NAME).
 */

import { getGroqApiKey, groqChatCompletionsFetch, resolveGroqModel } from '../../../groq-client.js';

export const GROQ_PROVIDER_ID = 'groq';

/**
 * @returns {boolean}
 */
export function isGroqConfigured() {
  return !!getGroqApiKey();
}

/**
 * @param {{
 *   systemPrompt: string;
 *   question: string;
 *   maxTokens?: number;
 *   temperature?: number;
 * }} opts
 * @returns {Promise<{
 *   ok: boolean;
 *   text?: string;
 *   model?: string;
 *   provider?: string;
 *   promptTokens?: number;
 *   completionTokens?: number;
 *   totalTokens?: number;
 *   error?: string;
 * }>}
 */
export async function completeWithGroq(opts) {
  const key = getGroqApiKey();
  const model = resolveGroqModel('primary');
  if (!key) {
    return { ok: false, error: 'groq_api_key_missing', provider: GROQ_PROVIDER_ID, model };
  }

  try {
    const res = await groqChatCompletionsFetch({
      model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: String(opts.question || '').trim() },
      ],
      temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.2,
      max_tokens: opts.maxTokens ?? 220,
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        (body && body.error && body.error.message) ||
        (body && body.message) ||
        `groq_http_${res.status}`;
      return { ok: false, error: String(errMsg), provider: GROQ_PROVIDER_ID, model };
    }

    const text = body?.choices?.[0]?.message?.content;
    if (!text || !String(text).trim()) {
      return { ok: false, error: 'groq_empty_response', provider: GROQ_PROVIDER_ID, model };
    }

    const usage = body.usage || {};
    return {
      ok: true,
      text: String(text).trim(),
      provider: GROQ_PROVIDER_ID,
      model,
      promptTokens: usage.prompt_tokens != null ? Number(usage.prompt_tokens) : undefined,
      completionTokens: usage.completion_tokens != null ? Number(usage.completion_tokens) : undefined,
      totalTokens: usage.total_tokens != null ? Number(usage.total_tokens) : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      provider: GROQ_PROVIDER_ID,
      model,
    };
  }
}
