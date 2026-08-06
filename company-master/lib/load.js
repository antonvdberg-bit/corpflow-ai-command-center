/**
 * Company Master load helpers — local JSON only, no production services.
 * @module company-master/lib/load
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CLIENT_ONBOARDING_SYNTHETIC_REL,
  COMPANY_MASTER_EXAMPLES_DIR,
  COMPANY_MASTER_ROOT,
  COMPANY_MASTER_SCHEMA_PATH,
  COMPANY_MASTER_VOCABULARIES_PATH,
  CORPFLOWAI_SYNTHETIC_REL,
} from './paths.js';

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, 'utf8'));
}

export function loadVocabularies() {
  return readJson(COMPANY_MASTER_VOCABULARIES_PATH);
}

export function loadCompanyMasterSchema() {
  return readJson(COMPANY_MASTER_SCHEMA_PATH);
}

export function loadCorpflowaiSyntheticRecord() {
  return readJson(path.join(COMPANY_MASTER_ROOT, '..', CORPFLOWAI_SYNTHETIC_REL));
}

export function loadClientOnboardingSyntheticRecord() {
  return readJson(path.join(COMPANY_MASTER_ROOT, '..', CLIENT_ONBOARDING_SYNTHETIC_REL));
}

/**
 * @param {string} fileName example file name under company-master/examples/
 */
export function loadExampleRecord(fileName) {
  return readJson(path.join(COMPANY_MASTER_EXAMPLES_DIR, fileName));
}

/**
 * In-memory catalogue keyed by company_id for isolation tests.
 * @param {Array<object>} records
 */
export function buildCompanyCatalogue(records) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const record of records) {
    if (!record || typeof record.company_id !== 'string') {
      throw new Error('company catalogue requires company_id on every record');
    }
    if (map.has(record.company_id)) {
      throw new Error(`duplicate company_id in catalogue: ${record.company_id}`);
    }
    map.set(record.company_id, record);
  }
  return map;
}
