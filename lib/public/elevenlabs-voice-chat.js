/**
 * ElevenLabs website voice + text enquiry gate helpers (CorpFlowAI-owned pages only).
 *
 * DISABLED BY DEFAULT. Missing or placeholder env must never break the build
 * and must never render a live widget.
 *
 * v1 uses one ElevenLabs agent for voice and text (typing fallback).
 * Do NOT enable in production without explicit Anton approval —
 * see docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md and
 * docs/runbooks/ELEVENLABS_WEBSITE_VOICE_CHAT_ACTIVATION_V1.md
 *
 * NO ACTIVATION AUTHORIZED by shipping this module.
 */

export const ELEVENLABS_AGENT_ID_PLACEHOLDER = 'REPLACE_ME';

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | undefined} [env]
 * @returns {boolean}
 */
export function isElevenLabsVoiceChatEnabled(env = typeof process !== 'undefined' ? process.env : {}) {
  const raw = env && env.NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT;
  return String(raw || '').trim().toLowerCase() === 'true';
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | undefined} [env]
 * @returns {string}
 */
export function resolveElevenLabsAgentId(env = typeof process !== 'undefined' ? process.env : {}) {
  const raw = env && env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  return String(raw || '').trim();
}

/**
 * True only when the flag is on and the agent id is a non-empty, non-placeholder value.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | undefined} [env]
 * @returns {boolean}
 */
export function shouldRenderElevenLabsVoiceChat(env = typeof process !== 'undefined' ? process.env : {}) {
  if (!isElevenLabsVoiceChatEnabled(env)) return false;
  const id = resolveElevenLabsAgentId(env);
  if (!id) return false;
  if (id === ELEVENLABS_AGENT_ID_PLACEHOLDER) return false;
  if (/^replace[_-]?me$/i.test(id)) return false;
  return true;
}
