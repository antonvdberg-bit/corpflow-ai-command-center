/**
 * ElevenLabs website voice-chat gate helpers (CorpFlowAI-owned pages only).
 *
 * DISABLED BY DEFAULT. Missing or placeholder env must never break the build
 * and must never render a live widget.
 *
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
 * Returns the configured, exact-match website paths. Empty entries are ignored.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | undefined} [env]
 * @returns {string[]}
 */
export function resolveElevenLabsVoiceChatAllowedPaths(
  env = typeof process !== 'undefined' ? process.env : {},
) {
  const raw = env && env.NEXT_PUBLIC_ELEVENLABS_VOICE_CHAT_ALLOWED_PATHS;
  return String(raw || '')
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean);
}

/**
 * Extracts a pathname without query strings or hash fragments. Relative paths
 * are supported so this remains deterministic in Node tests.
 *
 * @param {string | undefined | null} pathOrUrl
 * @returns {string}
 */
export function normalizeElevenLabsVoiceChatPathname(pathOrUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';

  try {
    return new URL(value, 'https://corpflowai.invalid').pathname;
  } catch {
    return '';
  }
}

/**
 * @param {string | undefined | null} pathname
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | undefined} [env]
 * @returns {boolean}
 */
export function isElevenLabsVoiceChatPathAllowed(
  pathname,
  env = typeof process !== 'undefined' ? process.env : {},
) {
  const currentPathname = normalizeElevenLabsVoiceChatPathname(pathname);
  if (!currentPathname) return false;

  return resolveElevenLabsVoiceChatAllowedPaths(env).some(
    (allowedPath) => normalizeElevenLabsVoiceChatPathname(allowedPath) === currentPathname,
  );
}

/**
 * True only when the flag is on, the agent ID is usable, and the current
 * pathname has an exact match in the configured allowlist.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | undefined} [env]
 * @param {string | undefined | null} pathname
 * @returns {boolean}
 */
export function shouldRenderElevenLabsVoiceChat(
  env = typeof process !== 'undefined' ? process.env : {},
  pathname,
) {
  if (!isElevenLabsVoiceChatEnabled(env)) return false;
  const id = resolveElevenLabsAgentId(env);
  if (!id) return false;
  if (id === ELEVENLABS_AGENT_ID_PLACEHOLDER) return false;
  if (/^replace[_-]?me$/i.test(id)) return false;
  return isElevenLabsVoiceChatPathAllowed(pathname, env);
}
