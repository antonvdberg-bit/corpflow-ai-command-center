/**
 * #1041 — Canonical Context Preflight CI must accept a later bare Environment
 * acknowledgement even when an earlier factory-packet Environment line has notes.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'check-canonical-context-preflight.mjs');
const CURRENT_VERSION = '2026-08-13-v1';

function runPreflight(prBody, createdAt = '2026-08-22T06:26:27Z') {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PR_BODY: prBody,
      PR_CREATED_AT: createdAt,
    },
  });
}

function acknowledgement(environment = 'n/a') {
  return [
    'Canonical Context Preflight: PASS',
    `Operating model version: ${CURRENT_VERSION}`,
    `Environment: ${environment}`,
    'GitHub state refreshed: YES',
    'Source item: #1041',
  ].join('\n');
}

describe('canonical context preflight (#1041 PR body Environment parse)', () => {
  it('accepts a later bare Environment enum after a narrative Environment line with notes', () => {
    const body = [
      '## Factory packet',
      '- Environment: n/a (GitHub Actions control plane only)',
      '',
      acknowledgement('n/a'),
    ].join('\n');
    const result = runPreflight(body);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Canonical Context Preflight PASS/);
    assert.match(result.stdout, /Environment: n\/a/);
  });

  it('fails when the only Environment line has extra notes and no bare enum exists', () => {
    const body = [
      'Canonical Context Preflight: PASS',
      `Operating model version: ${CURRENT_VERSION}`,
      'Environment: n/a (GitHub Actions control plane only)',
      'GitHub state refreshed: YES',
      'Source item: #1041',
    ].join('\n');
    const result = runPreflight(body);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /Environment must be one of/);
  });

  it('accepts a bare n/a Environment acknowledgement', () => {
    const result = runPreflight(acknowledgement('n/a'));
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Environment: n\/a/);
  });

  it('rejects CorpFlowAI-hosted URLs classified as client_production', () => {
    const body = `${acknowledgement('client_production')}\n\nSee https://lux.corpflowai.com/\n`;
    const result = runPreflight(body);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /CorpFlowAI-hosted URL classified as client_production/);
  });
});
