/**
 * Static, Prisma-free helpers for the BAD ownership history resolver.
 * Safe to import from unit tests without @prisma/client.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TARGET_MIGRATION = '20261021140000_bad_purchase_ownership';
export const LUXE_MIGRATION = '20260514120000_lux_listings';
export const EXPECTED_MIGRATION_CHECKSUM =
  '71d68c39569a5859d7d8f12fb06c5c19f10781cb4d38050a4cb965cb0db9fa45';
export const EXPECTED_DATABASE = 'neondb';
export const EXPECTED_ROLE = 'neondb_owner';
export const AUTHORIZED_REPOSITORY = 'antonvdberg-bit/corpflow-ai-command-center';
export const AUTHORIZED_REF = 'refs/heads/main';
export const ALLOWED_MODES = Object.freeze(['dry_run', 'execute']);
export const NON_POOLED_KEYS = ['DIRECT_URL', 'POSTGRES_URL_NON_POOLING'];
export const REQUIRED_TABLES = [
  'bad_purchase_ownership',
  'bad_purchase_unbound_reversals',
  'bad_purchase_webhook_events',
];
export const REQUIRED_UNIQUE_INDEXES = [
  'bad_purchase_ownership_checkout_intent_id_key',
  'bad_purchase_ownership_order_confirmation_ref_key',
  'bad_purchase_ownership_paddle_transaction_id_key',
  'bad_purchase_unbound_reversals_paddle_transaction_id_key',
  'bad_purchase_webhook_events_event_id_key',
];
export const EXPECTED_FK = Object.freeze({
  name: 'bad_purchase_ownership_auth_user_id_fkey',
  table: 'bad_purchase_ownership',
  column: 'auth_user_id',
  referenced_table: 'auth_users',
  referenced_column: 'id',
  on_update: 'c',
  on_delete: 'r',
});
export const EXPECTED_TRIGGER = Object.freeze({
  name: 'bad_purchase_ownership_terminal_guard',
  table: 'bad_purchase_ownership',
  function: 'bad_purchase_ownership_keep_terminal',
  enabled: 'O',
});
export const WORKFLOW_RELATIVE_PATH = '.github/workflows/resolve-bad-ownership-history.yml';
export const MIGRATION_RELATIVE_PATH =
  'prisma/migrations/20261021140000_bad_purchase_ownership/migration.sql';

const TEST_YML_INFISICAL_PIN = 'Infisical/secrets-action@8802effbe453d0576cd923567dcc2c97a1f54058';
const TEST_YML_CHECKOUT_PIN = 'actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd';
const TEST_YML_SETUP_NODE_PIN = 'actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function redactSecrets(text) {
  return String(text || '')
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgresql://[redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.neon\.tech/gi, '[redacted-host]')
    .replace(/[?&](password|pwd|user|username)=([^&\s'"]+)/gi, '$1=[redacted]');
}

export function hashMigrationSql(sql) {
  const normalized = String(sql || '').replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function readApprovedMigrationChecksum(root = ROOT) {
  const filePath = path.join(root, MIGRATION_RELATIVE_PATH);
  if (!existsSync(filePath)) {
    return { ok: false, reason: 'migration_file_missing', checksum: null };
  }
  const checksum = hashMigrationSql(readFileSync(filePath, 'utf8'));
  if (checksum !== EXPECTED_MIGRATION_CHECKSUM) {
    return { ok: false, reason: 'migration_checksum_mismatch', checksum };
  }
  return { ok: true, reason: 'checksum_ok', checksum };
}

function connectionIdentity(protocol, user, host, database) {
  return createHash('sha256')
    .update(`${protocol}\0${user}\0${host}\0${database}`)
    .digest('hex');
}

function publicShape(shape) {
  if (!shape) return { present: false, ok: false, reason: 'missing' };
  return {
    present: Boolean(shape.present),
    ok: Boolean(shape.ok),
    reason: shape.reason,
    protocol_postgresql: Boolean(shape.protocol_postgresql),
    neon_host: Boolean(shape.neon_host),
    has_pooler: Boolean(shape.has_pooler),
    has_prisma_io: Boolean(shape.has_prisma_io),
    database_matches_expected: Boolean(shape.database_matches_expected),
  };
}

/**
 * Shape-only classification. Never returns URL, password, username, or hostname.
 * @param {string} value
 */
export function classifyConnectionUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return { present: false, ok: false, reason: 'missing' };
  }
  let parsed;
  try {
    parsed = new URL(raw.replace(/^postgres(ql)?:/i, 'https:'));
  } catch {
    return { present: true, ok: false, reason: 'unparseable' };
  }
  const protocol = String(raw.split(':')[0] || '').toLowerCase();
  const host = String(parsed.hostname || '').toLowerCase();
  const database = String(parsed.pathname || '').replace(/^\//, '').split('/')[0];
  const user = decodeURIComponent(parsed.username || '');
  const out = {
    present: true,
    ok: false,
    protocol_postgresql: /^postgres(ql)?$/.test(protocol),
    neon_host: host.endsWith('neon.tech'),
    has_pooler: host.includes('-pooler'),
    has_prisma_io: host.includes('prisma.io'),
    database_matches_expected: database === EXPECTED_DATABASE,
  };
  Object.defineProperty(out, 'identity', {
    value: connectionIdentity(protocol, user, host, database),
    enumerable: false,
  });
  if (!out.protocol_postgresql) {
    return { ...out, reason: 'unsupported_protocol' };
  }
  if (out.has_prisma_io) {
    return { ...out, reason: 'prisma_postgres_host' };
  }
  if (!out.neon_host) {
    return { ...out, reason: 'non_neon_host' };
  }
  if (out.has_pooler) {
    return { ...out, reason: 'pooled_endpoint' };
  }
  if (!out.database_matches_expected) {
    return { ...out, reason: 'unexpected_database' };
  }
  out.ok = true;
  out.reason = 'non_pooled_neon_neondb';
  return out;
}

/**
 * Select a pre-existing non-pooled Infisical URL. Does not derive from POSTGRES_URL.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function selectNonPooledConnection(env = process.env) {
  const present = [];
  const classified = {};
  for (const key of NON_POOLED_KEYS) {
    const value = typeof env[key] === 'string' ? env[key].trim() : '';
    if (!value) continue;
    const shape = classifyConnectionUrl(value);
    classified[key] = shape;
    present.push({ key, value, shape });
  }
  const pooledPresent = Boolean(String(env.POSTGRES_URL || '').trim());
  if (present.length === 0) {
    return {
      ok: false,
      reason: 'missing_non_pooled_url',
      pooled_postgres_url_present: pooledPresent,
      classified,
      url: null,
      source_keys: [],
    };
  }
  const bad = present.find((row) => !row.shape.ok);
  if (bad) {
    return {
      ok: false,
      reason: `invalid_non_pooled:${bad.key}:${bad.shape.reason}`,
      pooled_postgres_url_present: pooledPresent,
      classified,
      url: null,
      source_keys: present.map((row) => row.key),
    };
  }
  const identities = new Set(present.map((row) => row.shape.identity));
  if (identities.size > 1) {
    return {
      ok: false,
      reason: 'non_pooled_aliases_disagree',
      pooled_postgres_url_present: pooledPresent,
      classified,
      url: null,
      source_keys: present.map((row) => row.key),
    };
  }
  return {
    ok: true,
    reason: 'non_pooled_ready',
    pooled_postgres_url_present: pooledPresent,
    classified,
    url: present[0].value,
    source_keys: present.map((row) => row.key),
  };
}

export function publicConnectionReport(selected) {
  const classified = {};
  for (const [key, shape] of Object.entries(selected.classified || {})) {
    classified[key] = publicShape(shape);
  }
  return {
    ok: Boolean(selected.ok),
    reason: selected.reason,
    pooled_postgres_url_present: Boolean(selected.pooled_postgres_url_present),
    source_keys: selected.source_keys || [],
    classified,
  };
}

export function inspectResolverWorkflow(yamlText) {
  const yaml = String(yamlText || '');
  const failures = [];
  const requireMatch = (re, label) => {
    if (!re.test(yaml)) failures.push(label);
  };
  const forbidMatch = (re, label) => {
    if (re.test(yaml)) failures.push(label);
  };

  requireMatch(/^on:\s*\n\s*workflow_dispatch:\s*$/m, 'workflow_dispatch_only_trigger');
  forbidMatch(/^\s+push:/m, 'has_push_trigger');
  forbidMatch(/^\s+pull_request:/m, 'has_pull_request_trigger');
  forbidMatch(/^\s+schedule:/m, 'has_schedule_trigger');
  forbidMatch(/cron:/, 'has_cron');
  requireMatch(new RegExp(escapeRegExp(TEST_YML_INFISICAL_PIN)), 'infisical_pin');
  requireMatch(new RegExp(escapeRegExp(TEST_YML_CHECKOUT_PIN)), 'checkout_pin');
  requireMatch(new RegExp(escapeRegExp(TEST_YML_SETUP_NODE_PIN)), 'setup_node_pin');
  requireMatch(/id-token:\s*write/, 'oidc_permission');
  requireMatch(/contents:\s*read/, 'contents_read');
  requireMatch(/method:\s*"oidc"/, 'infisical_oidc_method');
  requireMatch(/identity-id:\s*"\$\{\{\s*vars\.INFISICAL_IDENTITY_ID\s*\}\}"/, 'identity_var');
  requireMatch(/project-slug:\s*"\$\{\{\s*vars\.INFISICAL_PROJECT_SLUG\s*\}\}"/, 'project_var');
  requireMatch(/env-slug:\s*"\$\{\{\s*vars\.INFISICAL_ENV_SLUG\s*\}\}"/, 'env_var');
  requireMatch(/domain:\s*"\$\{\{\s*vars\.INFISICAL_DOMAIN\s*\}\}"/, 'domain_var');
  requireMatch(new RegExp(TARGET_MIGRATION), 'fixed_migration_id');
  requireMatch(/default:\s*dry_run/, 'default_dry_run');
  requireMatch(/confirm_migration_id/, 'confirm_input');
  requireMatch(/cancel-in-progress:\s*false/, 'non_cancelling_concurrency');
  requireMatch(/github\.ref == 'refs\/heads\/main'/, 'execute_requires_main');
  forbidMatch(/prisma migrate deploy/, 'contains_migrate_deploy');
  forbidMatch(/prisma db push/, 'contains_db_push');
  forbidMatch(/prisma migrate reset/, 'contains_migrate_reset');
  forbidMatch(/deriveNonPoolingUrlFromNeonPooler/, 'derives_from_pooler');
  return { ok: failures.length === 0, failures };
}

/**
 * @param {{ mode?: string, confirm?: string, githubRef?: string, githubRepository?: string }} input
 */
export function evaluateExecutionGuard(input = {}) {
  const mode = String(input.mode || '').trim();
  const confirm = String(input.confirm || '').trim();
  const githubRef = String(input.githubRef || '').trim();
  const githubRepository = String(input.githubRepository || '').trim();
  const failures = [];

  if (!ALLOWED_MODES.includes(mode)) failures.push('invalid_mode');
  if (mode === 'execute') {
    if (!githubRef) failures.push('missing_github_ref');
    else if (githubRef !== AUTHORIZED_REF) failures.push('ref_not_main');
    if (confirm !== TARGET_MIGRATION) failures.push('confirm_mismatch');
    if (githubRepository && githubRepository !== AUTHORIZED_REPOSITORY) {
      failures.push('unexpected_repository');
    }
    if (!githubRepository) failures.push('missing_github_repository');
  }
  return {
    ok: failures.length === 0,
    failures,
    mode: ALLOWED_MODES.includes(mode) ? mode : null,
  };
}

export function summarizeHistoryRows(rows) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  if (list.length === 0) {
    return { present: false, count: 0, ambiguous: false, finished: false, rolled_back: false };
  }
  if (list.length > 1) {
    return {
      present: true,
      count: list.length,
      ambiguous: true,
      finished: false,
      rolled_back: list.some((row) => Boolean(row.rolled_back_at)),
    };
  }
  const row = list[0];
  return {
    present: true,
    count: 1,
    ambiguous: false,
    finished: Boolean(row.finished_at),
    rolled_back: Boolean(row.rolled_back_at),
    applied_steps_count: row.applied_steps_count ?? null,
  };
}

export function publicSchemaReport(schema = {}) {
  const fk = schema.fk || null;
  const trigger = schema.trigger || null;
  return {
    tables_present: REQUIRED_TABLES.every((name) => (schema.tables || []).includes(name)),
    unique_indexes_present: REQUIRED_UNIQUE_INDEXES.every((name) =>
      (schema.indexes || []).includes(name),
    ),
    fk: {
      present: Boolean(fk),
      name_matches: fk?.name === EXPECTED_FK.name,
      table_matches: fk?.table_name === EXPECTED_FK.table,
      column_matches: fk?.column_name === EXPECTED_FK.column,
      referenced_table_matches: fk?.referenced_table === EXPECTED_FK.referenced_table,
      referenced_column_matches: fk?.referenced_column === EXPECTED_FK.referenced_column,
      on_update_cascade: fk?.on_update === EXPECTED_FK.on_update,
      on_delete_restrict: fk?.on_delete === EXPECTED_FK.on_delete,
    },
    trigger: {
      present: Boolean(trigger),
      name_matches: trigger?.name === EXPECTED_TRIGGER.name,
      table_matches: trigger?.table_name === EXPECTED_TRIGGER.table,
      function_matches: trigger?.function_name === EXPECTED_TRIGGER.function,
      enabled: trigger?.tgenabled === EXPECTED_TRIGGER.enabled,
    },
  };
}

export function publicIdentityReport(identity = {}) {
  return {
    database_matches_expected: identity.database === EXPECTED_DATABASE,
    role_matches_expected: identity.role === EXPECTED_ROLE,
    is_primary: identity.in_recovery === false,
  };
}

export function evaluatePreflight(evidence) {
  const failures = [];
  const identity = evidence.identity || {};
  const schema = evidence.schema || { tables: [], indexes: [] };
  const target = evidence.target || summarizeHistoryRows([]);
  const luxe = evidence.luxe || summarizeHistoryRows([]);

  if (identity.database !== EXPECTED_DATABASE) failures.push('unexpected_database');
  if (identity.role !== EXPECTED_ROLE) failures.push('unexpected_role');
  if (identity.in_recovery === true) failures.push('replica_not_primary');
  if (identity.in_recovery !== false && identity.in_recovery !== true) {
    failures.push('primary_state_unknown');
  }
  for (const table of REQUIRED_TABLES) {
    if (!(schema.tables || []).includes(table)) failures.push(`missing_table:${table}`);
  }
  for (const index of REQUIRED_UNIQUE_INDEXES) {
    if (!(schema.indexes || []).includes(index)) failures.push(`missing_index:${index}`);
  }

  const fk = schema.fk;
  if (!fk) failures.push('missing_auth_users_fk');
  else {
    if (fk.name !== EXPECTED_FK.name) failures.push('fk_name_mismatch');
    if (fk.table_name !== EXPECTED_FK.table) failures.push('fk_table_mismatch');
    if (fk.column_name !== EXPECTED_FK.column) failures.push('fk_column_mismatch');
    if (fk.referenced_table !== EXPECTED_FK.referenced_table) failures.push('fk_referenced_table_mismatch');
    if (fk.referenced_column !== EXPECTED_FK.referenced_column) {
      failures.push('fk_referenced_column_mismatch');
    }
    if (fk.on_update !== EXPECTED_FK.on_update) failures.push('fk_on_update_not_cascade');
    if (fk.on_delete !== EXPECTED_FK.on_delete) failures.push('fk_on_delete_not_restrict');
  }

  const trigger = schema.trigger;
  if (!trigger) failures.push('missing_terminal_trigger');
  else {
    if (trigger.name !== EXPECTED_TRIGGER.name) failures.push('trigger_name_mismatch');
    if (trigger.table_name !== EXPECTED_TRIGGER.table) failures.push('trigger_table_mismatch');
    if (trigger.function_name !== EXPECTED_TRIGGER.function) failures.push('trigger_function_mismatch');
    if (trigger.tgenabled !== EXPECTED_TRIGGER.enabled) failures.push('trigger_not_enabled');
  }

  if (target.ambiguous) failures.push('target_history_ambiguous');
  if (luxe.ambiguous) failures.push('luxe_history_ambiguous');
  if (target.present && !target.finished && !target.rolled_back) {
    failures.push('target_history_unfinished');
  }

  return {
    ok: failures.length === 0,
    failures,
    identity: publicIdentityReport(identity),
    schema: publicSchemaReport(schema),
    target,
    luxe,
  };
}

export function evaluatePostflight(preflight, postflight) {
  const failures = [];
  if (!postflight?.ok) failures.push(...(postflight?.failures || ['postflight_invalid']));
  if (postflight?.target?.ambiguous) failures.push('target_history_ambiguous');
  if (postflight?.luxe?.ambiguous) failures.push('luxe_history_ambiguous');
  if (
    !(
      postflight?.target?.count === 1 &&
      postflight.target.finished &&
      !postflight.target.rolled_back
    )
  ) {
    failures.push('target_history_not_completed');
  }
  if (JSON.stringify(postflight?.luxe) !== JSON.stringify(preflight?.luxe)) {
    failures.push('luxe_history_changed');
  }
  return { ok: failures.length === 0, failures };
}

export { ROOT as RESOLVER_REPO_ROOT };

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const workflowPath = path.join(ROOT, WORKFLOW_RELATIVE_PATH);
  const workflow = inspectResolverWorkflow(readFileSync(workflowPath, 'utf8'));
  const checksum = readApprovedMigrationChecksum();
  const payload = {
    ok: workflow.ok && checksum.ok,
    step: 'inspect',
    workflow,
    checksum,
    target_migration: TARGET_MIGRATION,
    note: 'No database command ran.',
  };
  console.log(JSON.stringify(payload, null, 2));
  if (!payload.ok) process.exit(1);
}
