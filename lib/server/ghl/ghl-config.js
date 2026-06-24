/**
 * GHL env readiness for Living Word — never returns secret values.
 */

import { cfg } from '../runtime-config.js';
import { GHL_ENV_LOCATION_ID, GHL_ENV_PIT } from './constants.js';

/**
 * @returns {{ ok: true, locationId: string, pitPresent: true, pitLength: number } | { ok: false, missing: string[] }}
 */
export function getGhlLivingWordEnvReadiness() {
  const locationId = String(cfg(GHL_ENV_LOCATION_ID, '') || '').trim();
  const pit = String(cfg(GHL_ENV_PIT, '') || '').trim();
  /** @type {string[]} */
  const missing = [];
  if (!locationId) missing.push(GHL_ENV_LOCATION_ID);
  if (!pit) missing.push(GHL_ENV_PIT);
  if (missing.length) {
    return { ok: false, missing };
  }
  return {
    ok: true,
    locationId,
    pitPresent: true,
    pitLength: pit.length,
  };
}

/**
 * Server-side only — returns token for outbound GHL calls. Never log or serialize.
 * @returns {string | null}
 */
export function getGhlLivingWordPitForRequest() {
  const pit = String(cfg(GHL_ENV_PIT, '') || '').trim();
  return pit || null;
}
