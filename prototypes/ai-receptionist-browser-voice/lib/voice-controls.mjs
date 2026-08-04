/**
 * Browser TTS voice selection helpers (no paid TTS).
 * Pure logic for rate/pitch clamping and voice list shaping.
 */

export const DEFAULT_VOICE_SETTINGS = {
  voiceURI: null,
  rate: 1,
  pitch: 1,
};

/**
 * @param {number} rate
 */
export function clampRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return DEFAULT_VOICE_SETTINGS.rate;
  return Math.min(2, Math.max(0.5, n));
}

/**
 * @param {number} pitch
 */
export function clampPitch(pitch) {
  const n = Number(pitch);
  if (!Number.isFinite(n)) return DEFAULT_VOICE_SETTINGS.pitch;
  return Math.min(2, Math.max(0, n));
}

/**
 * @param {Array<{ name?: string, lang?: string, voiceURI?: string, default?: boolean }>} voices
 */
export function shapeVoiceOptions(voices) {
  if (!Array.isArray(voices) || voices.length === 0) {
    return {
      available: false,
      options: [],
      fallback_message:
        'No browser speechSynthesis voices are available. Text input remains the reliable demo path; spoken replies may be silent.',
    };
  }
  const options = voices.map((v, i) => ({
    voiceURI: v.voiceURI || `voice-${i}`,
    name: v.name || `Voice ${i + 1}`,
    lang: v.lang || '',
    isDefault: Boolean(v.default),
  }));
  return {
    available: true,
    options,
    fallback_message: null,
  };
}

/**
 * @param {ReturnType<typeof shapeVoiceOptions>['options']} options
 * @param {string | null} voiceURI
 */
export function resolveSelectedVoice(options, voiceURI) {
  if (!Array.isArray(options) || options.length === 0) return null;
  if (voiceURI) {
    const hit = options.find((o) => o.voiceURI === voiceURI);
    if (hit) return hit;
  }
  return options.find((o) => o.isDefault) || options[0];
}

/**
 * @param {object} settings
 */
export function normalizeVoiceSettings(settings = {}) {
  return {
    voiceURI: settings.voiceURI ?? null,
    rate: clampRate(settings.rate ?? DEFAULT_VOICE_SETTINGS.rate),
    pitch: clampPitch(settings.pitch ?? DEFAULT_VOICE_SETTINGS.pitch),
  };
}

export const TEST_VOICE_PHRASE =
  'This is a CorpFlowAI voice test. Browser speech may sound robotic depending on your operating system.';
