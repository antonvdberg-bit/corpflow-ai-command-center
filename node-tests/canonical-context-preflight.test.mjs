/**
 * Canonical Context Preflight regression tests.
 *
 * The gate must validate objective context without requiring fragile,
 * self-attested boilerplate in every PR body.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'check-canonical-context-preflight.mjs');
const CURRENT_VERSION = '2026-10-02-v2';

function runPreflight(prBody, createdAt = '2026-08-22T06:26:27Z', prNumber = '1041') {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PR_BODY: prBody,
      PR_CREATED_AT: createdAt,
      PR_NUMBER: prNumber,
    },
  });
}

describe('canonical context preflight', () => {
  it('passes without handwritten PASS/refreshed/source boilerplate', () => {
    const body = [
      '## Summary',
      'Small docs or code change.',
      '',
      'Environment: n/a',
    ].join('\n');

    const result = runPreflight(body);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Canonical Context Preflight PASS/);
    assert.match(result.stdout, /Source item: PR #1041/);
    assert.match(result.stdout, /Environment: n\/a/);
  });

  it('accepts annotated environment prose without creating a false failure', () => {
    const body = [
      '## Factory packet',
      '- Environment: n/a (GitHub Actions control plane only)',
      '',
      `Operating model version: ${CURRENT_VERSION}`,
    ].join('\n');

    const result = runPreflight(body);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Canonical Context Preflight PASS/);
    assert.match(result.stdout, /Environment: n\/a/);
  });

  it('infers corpflow_test from a CorpFlowAI-hosted review URL', () => {
    const body = [
      '## Verification target',
      'https://cipc.corpflowai.com/partners',
    ].join('\n');

    const result = runPreflight(body);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Environment: corpflow_test/);
  });

  it('rejects an explicitly stale operating-model version', () => {
    const body = [
      'Environment: n/a',
      'Operating model version: 2026-01-01-old',
    ].join('\n');

    const result = runPreflight(body);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /stale operating model version/);
  });

  it('rejects CorpFlowAI-hosted URLs explicitly classified as client_production', () => {
    const body = [
      'Environment: client_production',
      'See https://lux.corpflowai.com/',
    ].join('\n');

    const result = runPreflight(body);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /CorpFlowAI-hosted URL classified as client_production/);
  });
});
