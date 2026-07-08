/**
 * LuxeMaurice AI Supabase sandbox health — no secret values in responses.
 */

import { buildMigrationManifest } from './migrations-manifest.js';
import {
  luxAiSandboxCodebasePresent,
  luxAiSandboxEnvFlags,
  luxAiSandboxHealthEnvReadiness,
  luxAiSupabaseAnonKey,
  luxAiSupabaseUrl,
} from './config.js';

/**
 * @returns {Promise<{ ok: boolean, status_code: number|null, error?: string }>}
 */
export async function pingSupabaseRest() {
  const base = luxAiSupabaseUrl();
  const anon = luxAiSupabaseAnonKey();
  if (!base || !anon) {
    return { ok: false, status_code: null, error: 'env_not_configured' };
  }
  const url = `${base.replace(/\/+$/, '')}/rest/v1/`;
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
    });
    return { ok: r.status >= 200 && r.status < 500, status_code: r.status };
  } catch (e) {
    return { ok: false, status_code: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export async function buildLuxAiSandboxHealthReport() {
  const env = luxAiSandboxEnvFlags();
  const envReadiness = luxAiSandboxHealthEnvReadiness();
  const migrations = buildMigrationManifest();
  const codebase_present = luxAiSandboxCodebasePresent();
  const supabase = envReadiness.ok ? await pingSupabaseRest() : { ok: false, status_code: null, error: 'env_not_configured' };

  /** @type {string|null} */
  let blocker = null;
  if (!codebase_present) {
    blocker = 'client_codebase_not_ingested';
  } else if (migrations.expected_count === 0) {
    blocker = 'migration_order_empty';
  } else if (migrations.missing_files.length > 0) {
    blocker = 'migration_files_missing';
  } else if (!envReadiness.ok) {
    blocker = 'supabase_env_missing';
  } else if (!supabase.ok) {
    blocker = 'supabase_unreachable';
  }

  const ok = !blocker && migrations.ready_to_run && supabase.ok;

  return {
    ok,
    scope: 'luxe-maurice-ai-sandbox',
    corpflow_production_postgres: 'not_used',
    recovery_ticket_id: 'cmr7a244f0000l505x5vne2s0',
    codebase_present,
    env_configured: env,
    env_readiness: envReadiness,
    supabase_rest: {
      reachable: supabase.ok,
      status_code: supabase.status_code,
      error: supabase.error || null,
    },
    migrations,
    blocker,
    next_step: blocker
      ? nextStepForBlocker(blocker)
      : 'Run npm run lux-ai-sandbox:migrate -- --apply then open /client/luxe-maurice-ai-sandbox',
  };
}

/** @param {string} blocker */
function nextStepForBlocker(blocker) {
  if (blocker === 'client_codebase_not_ingested') {
    return 'Copy Jan Drive LuxeMaurice AI package into sandbox/luxe-maurice-ai/ per README, then fill scripts/run_migrations_order.txt';
  }
  if (blocker === 'migration_order_empty') {
    return 'Add the 15 SQL migration filenames to sandbox/luxe-maurice-ai/scripts/run_migrations_order.txt';
  }
  if (blocker === 'migration_files_missing') {
    return 'Copy missing SQL files into sandbox/luxe-maurice-ai/database/migrations/';
  }
  if (blocker === 'supabase_env_missing') {
    return 'Set LUX_AI_SUPABASE_URL and LUX_AI_SUPABASE_ANON_KEY in local .env only (never commit)';
  }
  if (blocker === 'supabase_unreachable') {
    return 'Verify Supabase project URL and anon key; check project is not paused';
  }
  return 'See docs/runbooks/LUX_AI_SUPABASE_SANDBOX_DELIVERY.md';
}
