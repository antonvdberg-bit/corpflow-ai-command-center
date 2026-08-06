/**
 * Company Master path helpers (deterministic, no network).
 * @module company-master/lib/paths
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the company-master package root. */
export const COMPANY_MASTER_ROOT = path.resolve(__dirname, '..');

export const COMPANY_MASTER_SCHEMA_PATH = path.join(
  COMPANY_MASTER_ROOT,
  'schemas',
  'company-master-record.schema.json',
);

export const COMPANY_MASTER_VOCABULARIES_PATH = path.join(
  COMPANY_MASTER_ROOT,
  'config',
  'vocabularies.json',
);

export const COMPANY_MASTER_EXAMPLES_DIR = path.join(COMPANY_MASTER_ROOT, 'examples');

export const CORPFLOWAI_SYNTHETIC_REL = 'company-master/examples/corpflowai.synthetic.json';
export const CLIENT_ONBOARDING_SYNTHETIC_REL =
  'company-master/examples/client-onboarding.synthetic.json';
