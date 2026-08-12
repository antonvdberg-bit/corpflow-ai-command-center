/**
 * #904 SYNTHETIC FACTORY PROOF A — assert isolated wake-proof fixture content.
 * Repo-only; no runtime/app behavior.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const PROOF_PATH = path.join(REPO_ROOT, 'artifacts/factory-autonomy-proof/proof-a.txt');
const EXPECTED = 'CorpFlowAI autonomous Cursor wake proof A';

describe('factory autonomy proof A (#904)', () => {
  it('proof-a.txt contains the exact synthetic wake string', () => {
    const actual = readFileSync(PROOF_PATH, 'utf8');
    assert.equal(actual, EXPECTED);
  });
});
