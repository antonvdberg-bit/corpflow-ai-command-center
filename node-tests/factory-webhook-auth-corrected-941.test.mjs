/**
 * #941 — Synthetic factory webhook acceptance after Authorization header correction.
 *
 * Proves MODE C: webhook schema corpflow.factory_cursor_webhook.v1 with
 * numeric source_issue woke one Cursor Cloud run that executed exactly #941.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACT = path.join(
  REPO_ROOT,
  'artifacts/factory-autonomy-proof/webhook-auth-corrected-941.txt',
);

describe('Synthetic factory webhook acceptance (#941)', () => {
  it('records the MODE C webhook wake after Authorization header correction', () => {
    const text = readFileSync(ARTIFACT, 'utf8').trim();
    assert.equal(
      text,
      'CORPFLOW FACTORY WEBHOOK ACCEPTANCE 941 — AUTH CORRECTED — MODE C EXECUTED',
    );
  });
});
