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

/**
 * Shape-only classification. Never returns the URL or password.
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
    protocol,
    host_suffix: host.split('.').slice(-2).join('.'),
    has_pooler: host.includes('-pooler'),
    has_prisma_io: host.includes('prisma.io'),
    database,
    has_user: Boolean(user),
    has_password: Boolean(parsed.password),
    sslmode: parsed.searchParams.get('sslmode'),
    fingerprint: `${protocol}://${user}@${host}/${database}`,
  };
  if (!/^postgres(ql)?$/.test(protocol)) {
    return { ...out, reason: 'unsupported_protocol' };
  }
  if (out.has_prisma_io) {
    return { ...out, reason: 'prisma_postgres_host' };
  }
  if (!host.endsWith('neon.tech')) {
    return { ...out, reason: 'non_neon_host' };
  }
  if (out.has_pooler) {
    return { ...out, reason: 'pooled_endpoint' };
  }
  if (database !== EXPECTED_DATABASE) {
    return { ...out, reason: 'unexpected_database' };
  }
  return { ...out, ok: true, reason: 'non_pooled_neon_neondb' };
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
  const fingerprints = new Set(present.map((row) => row.shape.fingerprint));
  if (fingerprints.size > 1) {
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
  forbidMatch(/prisma migrate deploy/, 'contains_migrate_deploy');
  forbidMatch(/prisma db push/, 'contains_db_push');
  forbidMatch(/prisma migrate reset/, 'contains_migrate_reset');
  forbidMatch(/deriveNonPoolingUrlFromNeonPooler/, 'derives_from_pooler');
  return { ok: failures.length === 0, failures };
}

export function evaluatePreflight(evidence) {
  const failures = [];
  const identity = evidence.identity || {};
  const schema = evidence.schema || { tables: [], indexes: [] };
  if (identity.database !== EXPECTED_DATABASE) failures.push('unexpected_database');
  if (identity.role !== EXPECTED_ROLE) failures.push('unexpected_role');
  if (identity.in_recovery === true) failures.push('replica_not_primary');
  for (const table of REQUIRED_TABLES) {
    if (!schema.tables.includes(table)) failures.push(`missing_table:${table}`);
  }
  for (const index of REQUIRED_UNIQUE_INDEXES) {
    if (!schema.indexes.includes(index)) failures.push(`missing_index:${index}`);
  }
  if (!schema.fk) failures.push('missing_auth_users_fk');
  if (!schema.trigger) failures.push('missing_terminal_trigger');
  return {
    ok: failures.length === 0,
    failures,
    identity,
    schema,
    target: evidence.target,
    luxe: evidence.luxe,
  };
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
