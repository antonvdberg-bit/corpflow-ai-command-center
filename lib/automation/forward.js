/**
 * Optional POST to n8n (or any orchestrator) after automation events are recorded.
 */

import { cfg } from '../server/runtime-config.js';

/**
 * @param {Record<string, unknown>} envelope
 * @returns {Promise<void>}
 */
export async function forwardAutomationEnvelope(envelope) {
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
