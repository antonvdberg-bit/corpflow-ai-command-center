/**
 * #907 SYNTHETIC FACTORY PROOF C — static checks for the temporary one-shot
 * github-actions[bot] comment workflow. Repo-only; no runtime/app behavior.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github/workflows/factory-proof-c-bot-comment.yml',
);

describe('factory proof C bot-comment workflow (#907)', () => {
  const yaml = readFileSync(WORKFLOW_PATH, 'utf8');

  it('triggers only on push to main when this workflow file changes', () => {
    assert.match(yaml, /branches:\s*\n\s*-\s*main/);
    assert.match(
      yaml,
      /paths:\s*\n\s*-\s*'\.github\/workflows\/factory-proof-c-bot-comment\.yml'/,
    );
    assert.doesNotMatch(yaml, /workflow_dispatch/);
  });

  it('uses least-privilege GITHUB_TOKEN permissions only', () => {
    assert.match(yaml, /contents:\s*read/);
    assert.match(yaml, /issues:\s*write/);
    assert.doesNotMatch(yaml, /secrets\.[A-Z0-9_]+/);
    assert.match(yaml, /GH_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/);
  });

  it('posts exact CURSOR FACTORY EXECUTE comment to issue #908 only', () => {
    assert.match(yaml, /\/issues\/908\/comments/);
    assert.match(yaml, /-f body='CURSOR FACTORY EXECUTE'/);
    assert.doesNotMatch(yaml, /\/issues\/907\/comments/);
  });
});
