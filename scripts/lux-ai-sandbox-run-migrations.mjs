#!/usr/bin/env node
/**
 * LuxeMaurice AI sandbox — run ordered SQL migrations against client Supabase Postgres.
 * Reads LUX_AI_SUPABASE_DB_URL from local env only. Never logs service_role or DB password.
 *
 * Usage:
 *   node scripts/lux-ai-sandbox-run-migrations.mjs          # dry-run (default)
 *   node scripts/lux-ai-sandbox-run-migrations.mjs --apply  # execute SQL
 *
 * @see docs/runbooks/LUX_AI_SUPABASE_SANDBOX_DELIVERY.md
 */
import fs from 'node:fs';
import path from 'node:path';

import { LUX_AI_MIGRATIONS_DIR, luxAiSandboxMigrationEnvReadiness } from '../lib/server/lux-ai-sandbox/config.js';
import { buildMigrationManifest } from '../lib/server/lux-ai-sandbox/migrations-manifest.js';

const apply = process.argv.includes('--apply');

function redactDbUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '[invalid-url]';
  }
}

async function loadPgClient() {
  try {
    const mod = await import('pg');
    return mod.default?.Client || mod.Client;
  } catch {
    console.error('FAIL: pg package not installed. Run: npm install --save-dev pg');
    process.exit(1);
  }
}

const manifest = buildMigrationManifest();
if (!manifest.ready_to_run) {
  console.error('FAIL: migrations not ready');
  console.error(JSON.stringify(manifest, null, 2));
  process.exit(1);
}

const env = luxAiSandboxMigrationEnvReadiness();
if (!env.ok) {
  console.error('FAIL: missing env for migrations:', env.missing.join(', '));
  console.error('Set LUX_AI_SUPABASE_DB_URL in local .env only (Supabase → Project Settings → Database → URI).');
  process.exit(1);
}

const dbUrl = process.env.LUX_AI_SUPABASE_DB_URL || '';
console.log(`Target: ${redactDbUrl(dbUrl)}`);
console.log(`Mode: ${apply ? 'APPLY' : 'dry-run'}`);
console.log(`Migrations (${manifest.ordered_files.length}):`);

for (const file of manifest.ordered_files) {
  const full = path.join(LUX_AI_MIGRATIONS_DIR, file);
  const sql = fs.readFileSync(full, 'utf8');
  console.log(`  - ${file} (${sql.length} bytes)`);
  if (!apply) continue;

  const Client = await loadPgClient();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`    applied: ${file}`);
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error(`    FAILED: ${file}`, e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (!apply) {
  console.log('\nDry-run complete. Re-run with --apply to execute against client Supabase.');
}
console.log('lux-ai-sandbox-run-migrations: ok');
