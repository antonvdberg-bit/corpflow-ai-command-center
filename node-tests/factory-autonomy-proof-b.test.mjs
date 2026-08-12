/**
 * #906 SYNTHETIC FACTORY PROOF B — assert isolated workflow-wake proof fixture.
 * Repo-only; no runtime/app behavior.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const PROOF_PATH = path.join(REPO_ROOT, 'artifacts/factory-autonomy-proof/proof-b.txt');
const EXPECTED = 'CorpFlowAI workflow-completion Cursor wake proof B';

describe('factory autonomy proof B (#906)', () => {
  it('proof-b.txt contains the exact synthetic wake string', () => {
    const actual = readFileSync(PROOF_PATH, 'utf8');
    assert.equal(actual, EXPECTED);
  });
});
