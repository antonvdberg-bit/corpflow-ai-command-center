/**
 * Browser TTS voice settings helpers (no paid providers).
 * Pure normalization — speechSynthesis wiring stays in the demo UI.
 */

export const DEFAULT_VOICE_SETTINGS = {
  voiceURI: '',
  voiceName: '',
  rate: 1,
  pitch: 1,
};

/**
 * @param {Partial<typeof DEFAULT_VOICE_SETTINGS> | null | undefined} raw
 */
export function normalizeVoiceSettings(raw) {
  const rate = clampNumber(raw?.rate, 0.5, 2, DEFAULT_VOICE_SETTINGS.rate);
  const pitch = clampNumber(raw?.pitch, 0, 2, DEFAULT_VOICE_SETTINGS.pitch);
  return {
    voiceURI: String(raw?.voiceURI || ''),
    voiceName: String(raw?.voiceName || ''),
    rate,
    pitch,
  };
}

/**
 * Pick a SpeechSynthesisVoice from a list using saved settings.
 * @param {Array<{ voiceURI?: string, name?: string, lang?: string }>} voices
 * @param {ReturnType<typeof normalizeVoiceSettings>} settings
 */
export function selectVoice(voices, settings) {
  const list = Array.isArray(voices) ? voices : [];
  if (!list.length) return null;
  const uri = settings?.voiceURI || '';
  const name = settings?.voiceName || '';
  if (uri) {
    const byUri = list.find((v) => v.voiceURI === uri);
    if (byUri) return byUri;
  }
  if (name) {
    const byName = list.find((v) => v.name === name);
    if (byName) return byName;
  }
  const en = list.find((v) => /^en\b/i.test(String(v.lang || '')));
  return en || list[0];
}

/**
 * Options for a UI voice dropdown.
 * @param {Array<{ voiceURI?: string, name?: string, lang?: string }>} voices
 */
export function voiceOptions(voices) {
  return (Array.isArray(voices) ? voices : []).map((v) => ({
    value: String(v.voiceURI || v.name || ''),
    label: `${v.name || 'Voice'}${v.lang ? ` (${v.lang})` : ''}`,
  }));
}

/**
 * Describe fallback when speechSynthesis is unavailable or empty.
 * @param {{ speechSynthesisAvailable: boolean, voiceCount: number }} info
 */
export function voiceAvailabilityMessage(info) {
  if (!info?.speechSynthesisAvailable) {
    return 'Browser speech synthesis is unavailable or blocked. Text replies still work; use typed input for the reliable demo path.';
  }
  if (!info.voiceCount) {
    return 'No system voices are available yet. Text replies still work; try again after voices load, or continue with typed input.';
  }
  return 'Browser voices loaded. Sound quality depends on the OS/browser and may still sound robotic.';
}

/**
 * Build a plain descriptor for SpeechSynthesisUtterance wiring.
 * @param {string} text
 * @param {ReturnType<typeof normalizeVoiceSettings>} settings
 * @param {{ voiceURI?: string, name?: string } | null} [voice]
 */
export function buildUtteranceConfig(text, settings, voice = null) {
  const s = normalizeVoiceSettings(settings);
  return {
    text: String(text || ''),
    rate: s.rate,
    pitch: s.pitch,
    voiceURI: voice?.voiceURI || s.voiceURI || '',
    voiceName: voice?.name || s.voiceName || '',
  };
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
