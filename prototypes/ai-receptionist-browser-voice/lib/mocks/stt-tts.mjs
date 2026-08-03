/**
 * Mock STT / TTS adapters for the browser-voice shape.
 *
 * Default CI and local demos use these — no microphone, no paid APIs.
 * Optional browser Web Speech hooks live in demo/app.js only.
 */

/**
 * Pretend to transcribe audio bytes into text.
 * In this prototype, callers pass the intended transcript directly.
 * @param {string | { transcript?: string }} input
 */
export function mockStt(input) {
  if (typeof input === 'string') return { ok: true, text: input.trim(), provider: 'mock-stt' };
  const text = typeof input?.transcript === 'string' ? input.transcript.trim() : '';
  return { ok: Boolean(text), text, provider: 'mock-stt' };
}

/**
 * Pretend to synthesise speech from text.
 * Returns a descriptor only — no audio bytes, no network.
 * @param {string} text
 */
export function mockTts(text) {
  const t = String(text || '').trim();
  return {
    ok: Boolean(t),
    provider: 'mock-tts',
    mime: 'text/plain',
    // Deterministic faux "utterance id" for UI/demo wiring.
    utterance_id: `utt_${hashLite(t)}`,
    text: t,
    audio: null,
  };
}

/**
 * @param {string} s
 */
function hashLite(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}
