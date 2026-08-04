/**
 * Profile loader for the synthetic AI receptionist.
 * Default profile: CorpFlowAI general enquiry.
 * Node-safe sync load; browser can pass a fetched profile object.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = path.join(__dirname, '..', 'profiles');

export const DEFAULT_PROFILE_ID = 'corpflowai-general';

/** @type {Map<string, object>} */
const cache = new Map();

/**
 * @param {string} [profileId]
 * @returns {object}
 */
export function loadProfile(profileId = DEFAULT_PROFILE_ID) {
  const id = String(profileId || DEFAULT_PROFILE_ID).trim() || DEFAULT_PROFILE_ID;
  if (cache.has(id)) return cache.get(id);

  const filePath = path.join(PROFILES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Receptionist profile not found: ${id} (${filePath})`);
  }
  const profile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateProfile(profile);
  cache.set(id, profile);
  return profile;
}

/**
 * Clear loader cache (tests).
 */
export function clearProfileCache() {
  cache.clear();
}

/**
 * @param {object} profile
 */
export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    throw new Error('Profile must be an object');
  }
  if (!profile.id || !profile.greeting) {
    throw new Error('Profile requires id and greeting');
  }
  if (!Array.isArray(profile.field_order) || profile.field_order.length === 0) {
    throw new Error('Profile requires field_order');
  }
  if (!profile.field_prompts || typeof profile.field_prompts !== 'object') {
    throw new Error('Profile requires field_prompts');
  }
  for (const key of profile.field_order) {
    if (!profile.field_prompts[key]) {
      throw new Error(`Profile missing prompt for field: ${key}`);
    }
  }
  if (!Array.isArray(profile.service_interest_values)) {
    throw new Error('Profile requires service_interest_values');
  }
  return true;
}

/**
 * @param {object} profile
 * @param {string} fieldKey
 */
export function getFieldPrompt(profile, fieldKey) {
  return profile.field_prompts?.[fieldKey] || `Please provide ${fieldKey}.`;
}

/**
 * @param {object} profile
 * @param {string} serviceInterest
 */
export function getServiceCaveat(profile, serviceInterest) {
  return profile.service_caveats?.[serviceInterest] || null;
}

/**
 * @param {object} profile
 */
export function listSupportedServiceLabels(profile) {
  return (profile.supported_service_areas || []).map((s) => s.label).join(', ');
}
