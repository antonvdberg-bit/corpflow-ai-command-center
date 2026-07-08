/**
 * LuxeMaurice AI Supabase sandbox config (client-owned delivery artifact).
 * Isolated from CorpFlow production Postgres — see docs/runbooks/LUX_AI_SUPABASE_SANDBOX_DELIVERY.md
 */

import fs from 'node:fs';
import path from 'node:path';

import { cfg } from '../runtime-config.js';

export const LUX_AI_SANDBOX_ROOT = path.join(process.cwd(), 'sandbox', 'luxe-maurice-ai');
export const LUX_AI_MIGRATIONS_DIR = path.join(LUX_AI_SANDBOX_ROOT, 'database', 'migrations');
export const LUX_AI_MIGRATION_ORDER_FILE = path.join(LUX_AI_SANDBOX_ROOT, 'scripts', 'run_migrations_order.txt');

/** @returns {string} */
export function luxAiSupabaseUrl() {
  return String(cfg('LUX_AI_SUPABASE_URL', '') || '').trim();
}

/** @returns {string} */
export function luxAiSupabaseAnonKey() {
  return String(cfg('LUX_AI_SUPABASE_ANON_KEY', '') || '').trim();
}

/** @returns {string} */
export function luxAiSupabaseServiceRoleKey() {
  return String(cfg('LUX_AI_SUPABASE_SERVICE_ROLE_KEY', '') || '').trim();
}

/** Direct Postgres connection string from Supabase project settings (migrations only). */
/** @returns {string} */
export function luxAiSupabaseDbUrl() {
  return String(cfg('LUX_AI_SUPABASE_DB_URL', '') || '').trim();
}

/**
 * @returns {{ url: boolean, anon_key: boolean, service_role_key: boolean, db_url: boolean }}
 */
export function luxAiSandboxEnvFlags() {
  return {
    url: Boolean(luxAiSupabaseUrl()),
    anon_key: Boolean(luxAiSupabaseAnonKey()),
    service_role_key: Boolean(luxAiSupabaseServiceRoleKey()),
    db_url: Boolean(luxAiSupabaseDbUrl()),
  };
}

/**
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function luxAiSandboxHealthEnvReadiness() {
  const flags = luxAiSandboxEnvFlags();
  /** @type {string[]} */
  const missing = [];
  if (!flags.url) missing.push('LUX_AI_SUPABASE_URL');
  if (!flags.anon_key) missing.push('LUX_AI_SUPABASE_ANON_KEY');
  return { ok: missing.length === 0, missing };
}

/**
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function luxAiSandboxMigrationEnvReadiness() {
  const flags = luxAiSandboxEnvFlags();
  /** @type {string[]} */
  const missing = [];
  if (!flags.db_url) missing.push('LUX_AI_SUPABASE_DB_URL');
  return { ok: missing.length === 0, missing };
}

/**
 * @returns {boolean}
 */
export function luxAiSandboxCodebasePresent() {
  return fs.existsSync(LUX_AI_SANDBOX_ROOT) && fs.existsSync(LUX_AI_MIGRATIONS_DIR);
}
