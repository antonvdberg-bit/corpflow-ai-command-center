/**
 * Optional POST to n8n (or any orchestrator) after automation events are recorded.
 */

import { cfg } from '../server/runtime-config.js';

/**
 * Unit tests must never call configured external automation endpoints. GitHub
 * Actions receives runtime configuration from Infisical, so test fixtures can
 * otherwise reach production when they exercise trusted event writers.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function isAutomationForwardSuppressedForTests(env = process.env) {
  return (
    String(env.NODE_ENV || '').trim().toLowerCase() === 'test' ||
    String(env.NODE_TEST_CONTEXT || '').trim() !== ''
  );
}

/**
 * @param {Record<string, unknown>} envelope
 * @returns {Promise<void>}
 */
export async function forwardAutomationEnvelope(envelope) {
  if (isAutomationForwardSuppressedForTests()) return;
  const url = String(cfg('CORPFLOW_AUTOMATION_FORWARD_URL', '')).trim();
  if (!url) return;
  const secret = String(cfg('CORPFLOW_AUTOMATION_FORWARD_SECRET', '')).trim();
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-corpflow-automation-forward-secret': secret } : {}),
      },
      body: JSON.stringify(envelope),
    });
  } catch {
    // best-effort — never block primary path
  }
}
