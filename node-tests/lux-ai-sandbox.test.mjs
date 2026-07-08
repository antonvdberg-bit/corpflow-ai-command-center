import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  LUX_AI_MIGRATIONS_DIR,
  LUX_AI_SANDBOX_ROOT,
  luxAiSandboxHealthEnvReadiness,
} from '../lib/server/lux-ai-sandbox/config.js';
import { buildMigrationManifest } from '../lib/server/lux-ai-sandbox/migrations-manifest.js';
import { buildLuxAiSandboxHealthReport } from '../lib/server/lux-ai-sandbox/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

test('lux-ai-sandbox: scaffold paths exist', () => {
  assert.equal(fs.existsSync(LUX_AI_SANDBOX_ROOT), true);
  assert.equal(fs.existsSync(LUX_AI_MIGRATIONS_DIR), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs/runbooks/LUX_AI_SUPABASE_SANDBOX_DELIVERY.md')), true);
});

test('lux-ai-sandbox: health env fails closed when unset', () => {
  const prevUrl = process.env.LUX_AI_SUPABASE_URL;
  const prevAnon = process.env.LUX_AI_SUPABASE_ANON_KEY;
  delete process.env.LUX_AI_SUPABASE_URL;
  delete process.env.LUX_AI_SUPABASE_ANON_KEY;
  const readiness = luxAiSandboxHealthEnvReadiness();
  assert.equal(readiness.ok, false);
  assert.ok(readiness.missing.includes('LUX_AI_SUPABASE_URL'));
  if (prevUrl !== undefined) process.env.LUX_AI_SUPABASE_URL = prevUrl;
  if (prevAnon !== undefined) process.env.LUX_AI_SUPABASE_ANON_KEY = prevAnon;
});

test('lux-ai-sandbox: migration manifest empty order fails closed', () => {
  const manifest = buildMigrationManifest();
  assert.equal(manifest.expected_count, 0);
  assert.equal(manifest.ready_to_run, false);
});

test('lux-ai-sandbox: health report names blocker when migrations empty', async () => {
  const report = await buildLuxAiSandboxHealthReport();
  assert.equal(typeof report.blocker, 'string');
  assert.equal(report.corpflow_production_postgres, 'not_used');
  assert.equal(report.scope, 'luxe-maurice-ai-sandbox');
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('eyJ'), false, 'must not leak JWT-like keys');
});

test('lux-ai-sandbox page and API routes present', () => {
  const page = fs.readFileSync(path.join(repoRoot, 'pages/client/luxe-maurice-ai-sandbox.js'), 'utf8');
  const router = fs.readFileSync(path.join(repoRoot, 'api/factory_router.js'), 'utf8');
  assert.equal(page.includes('data-testid="lux-ai-sandbox-page"'), true);
  assert.equal(page.includes('/api/lux/ai-sandbox/health'), true);
  assert.equal(router.includes("pathSeg === 'lux/ai-sandbox/health'"), true);
  for (const forbidden of ['service_role', 'LUX_AI_SUPABASE_SERVICE_ROLE_KEY']) {
    assert.equal(page.includes(forbidden), false, `secret reference in client page: ${forbidden}`);
  }
});

test('lux-ai-sandbox: no listing-platform Release 1 copy in sandbox page', () => {
  const page = fs.readFileSync(path.join(repoRoot, 'pages/client/luxe-maurice-ai-sandbox.js'), 'utf8');
  assert.equal(page.includes('Clean public site'), false);
});
