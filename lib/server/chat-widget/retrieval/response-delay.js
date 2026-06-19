/**
 * Minimum response delay for chat widget "Ask a question" (human-feeling UX).
 *
 * Applied only on successful AI ask handler paths — never on validation/rate-limit errors.
 * Disabled in tests via skipDelay option or CORPFLOW_CHAT_WIDGET_AI_DELAY_DISABLED=1.
 */

/** @typedef {{ skipDelay?: boolean; minMs?: number; maxMs?: number; now?: number; random?: () => number }} DelayOptions */

export const AI_ASK_THINKING_MESSAGE = 'Looking through approved church information…';

export const AI_ASK_MIN_RESPONSE_DELAY_MS = 2000;
export const AI_ASK_MAX_RESPONSE_DELAY_MS = 2500;

/**
 * Resolve wait duration (ms). Zero when delay disabled.
 *
 * @param {DelayOptions} [options]
 * @returns {number}
 */
export function resolveAiResponseDelayMs(options = {}) {
  if (options.skipDelay || isAiResponseDelayDisabled()) return 0;
  const min = Number.isFinite(options.minMs) ? options.minMs : AI_ASK_MIN_RESPONSE_DELAY_MS;
  const max = Number.isFinite(options.maxMs) ? options.maxMs : AI_ASK_MAX_RESPONSE_DELAY_MS;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const rand = typeof options.random === 'function' ? options.random() : Math.random();
  return lo + Math.floor(rand * (hi - lo + 1));
}

/**
 * @returns {boolean}
 */
export function isAiResponseDelayDisabled() {
  const v = String(process.env.CORPFLOW_CHAT_WIDGET_AI_DELAY_DISABLED || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Compute remaining wait without sleeping (for tests).
 *
 * @param {number} startedAt
 * @param {DelayOptions} [options]
 * @returns {{ remainingMs: number; targetMs: number }}
 */
export function computeAiResponseDelayWait(startedAt, options = {}) {
  const targetMs = resolveAiResponseDelayMs(options);
  const now = options.now != null ? options.now : Date.now();
  const elapsed = Math.max(0, now - startedAt);
  return { remainingMs: Math.max(0, targetMs - elapsed), targetMs };
}

/**
 * Wait until minimum delay elapsed since startedAt.
 *
 * @param {number} startedAt — Date.now() at handler entry
 * @param {DelayOptions} [options]
 * @returns {Promise<{ waitedMs: number; targetMs: number }>}
 */
export async function waitForAiResponseDelay(startedAt, options = {}) {
  const { remainingMs, targetMs } = computeAiResponseDelayWait(startedAt, options);
  if (remainingMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingMs));
  }
  return { waitedMs: remainingMs, targetMs };
}
