/**
 * Regression: merging sequential workspace slices must not leave two
 * APP_WORKSPACE_SLICE_VERSION exports. Node fails every importer with
 * SyntaxError: Identifier has already been declared (CI on PR #1162 / #1160).
 *
 * This file reads source text only so the assertion still runs if the module
 * itself cannot load.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONSTANTS_PATH = join(root, 'lib/app/constants.js');
const EXPORT_RE = /export\s+const\s+APP_WORKSPACE_SLICE_VERSION\b/g;

describe('app constants unique workspace slice version', () => {
  it('declares APP_WORKSPACE_SLICE_VERSION exactly once', () => {
    const src = readFileSync(CONSTANTS_PATH, 'utf8');
    const matches = src.match(EXPORT_RE) || [];
    assert.equal(
      matches.length,
      1,
      'APP_WORKSPACE_SLICE_VERSION must be exported exactly once; collapse sequential workspace-slice merges instead of keeping both constants',
    );
    assert.match(src, /export\s+const\s+APP_WORKSPACE_SLICE_VERSION\s*=\s*'workspace-1160-v1'\s*;/);
  });
});
