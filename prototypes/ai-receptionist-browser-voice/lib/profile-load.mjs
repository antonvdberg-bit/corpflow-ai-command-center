/**
 * Node-only profile disk loader.
 * Browser demos should import profiles/corpflowai-general.mjs or fetch the JSON.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PROFILE_ID, normalizeProfile } from './profile.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = path.join(__dirname, '..', 'profiles');

/**
 * @param {string} [profileId]
 */
export function resolveProfilePath(profileId = DEFAULT_PROFILE_ID) {
  const id = String(profileId || DEFAULT_PROFILE_ID).replace(/[^a-z0-9_-]/gi, '');
  return path.join(PROFILES_DIR, `${id}.json`);
}

/**
 * @param {string} [profileId]
 */
export function loadProfile(profileId = DEFAULT_PROFILE_ID) {
  const filePath = resolveProfilePath(profileId);
  if (!existsSync(filePath)) {
    throw new Error(`Receptionist profile not found: ${filePath}`);
  }
  return normalizeProfile(JSON.parse(readFileSync(filePath, 'utf8')));
}
