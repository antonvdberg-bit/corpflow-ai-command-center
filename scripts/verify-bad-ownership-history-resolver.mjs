#!/usr/bin/env node
/**
 * Guarded Prisma history registration for 20261021140000_bad_purchase_ownership.
 *
 * Classifies Infisical-injected connection names, verifies the already-installed
 * buyer-ownership schema, and (only in execute mode) runs exactly one
 * `prisma migrate resolve --applied` command.
 *
 * It never prints connection strings, passwords, or secret values.
 * It never derives a non-pooled URL from a pooler host.
 * It never runs `prisma migrate deploy`, `db push`, or `migrate reset`.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

import {
  EXPECTED_DATABASE,
  EXPECTED_ROLE,
  LUXE_MIGRATION,
  RESOLVER_REPO_ROOT,
  TARGET_MIGRATION,
  WORKFLOW_RELATIVE_PATH,
  evaluatePreflight,
  inspectResolverWorkflow,
  readApprovedMigrationChecksum,
  redactSecrets,
  selectNonPooledConnection,
} from './bad-ownership-history-resolver-lib.mjs';

const ROOT = RESOLVER_REPO_ROOT;

function printSafe(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function fail(code, payload) {
  printSafe({ ok: false, ...payload });
  process.exit(code);
}

async function withPrisma(url, fn) {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: [],
  });
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

function fingerprintHistoryRow(row) {
  if (!row) return { present: false };
  return {
    present: true,
    migration_name: row.migration_name,
    finished: Boolean(row.finished_at),
    rolled_back: Boolean(row.rolled_back_at),
    applied_steps_count: row.applied_steps_count ?? null,
  };
}

async function readIdentity(prisma) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT current_database() AS database,
           current_user AS role,
           pg_is_in_recovery() AS in_recovery,
           current_setting('transaction_read_only') AS transaction_read_only
  `);
  return rows[0] || {};
}

async function readSchemaPresence(prisma) {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'bad_purchase_ownership',
        'bad_purchase_unbound_reversals',
        'bad_purchase_webhook_events'
      )
    ORDER BY c.relname
  `);
  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname AS name
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'bad_purchase_ownership_checkout_intent_id_key',
        'bad_purchase_ownership_order_confirmation_ref_key',
        'bad_purchase_ownership_paddle_transaction_id_key',
        'bad_purchase_unbound_reversals_paddle_transaction_id_key',
        'bad_purchase_webhook_events_event_id_key'
      )
    ORDER BY indexname
  `);
  const fk = await prisma.$queryRawUnsafe(`
    SELECT conname AS name, confdeltype, confupdtype
    FROM pg_constraint
    WHERE conname = 'bad_purchase_ownership_auth_user_id_fkey'
  `);
  const trigger = await prisma.$queryRawUnsafe(`
    SELECT tgname AS name, tgenabled
    FROM pg_trigger
    WHERE tgname = 'bad_purchase_ownership_terminal_guard'
  `);
  const counts = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*)::int FROM bad_purchase_ownership) AS ownership,
      (SELECT COUNT(*)::int FROM bad_purchase_unbound_reversals) AS unbound,
      (SELECT COUNT(*)::int FROM bad_purchase_webhook_events) AS webhook
  `);
  return {
    tables: tables.map((row) => row.name),
    indexes: indexes.map((row) => row.name),
    fk: fk[0] || null,
    trigger: trigger[0] || null,
    counts: counts[0] || null,
  };
}

async function readHistory(prisma, name) {
  if (name !== TARGET_MIGRATION && name !== LUXE_MIGRATION) {
    throw new Error('refusing unexpected migration name');
  }
  const rows = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
     FROM _prisma_migrations
     WHERE migration_name = $1`,
    name,
  );
  return rows[0] || null;
}

async function collectDatabaseEvidence(url) {
  return withPrisma(url, async (prisma) => {
    const identity = await readIdentity(prisma);
    const schema = await readSchemaPresence(prisma);
    const target = fingerprintHistoryRow(await readHistory(prisma, TARGET_MIGRATION));
    const luxe = fingerprintHistoryRow(await readHistory(prisma, LUXE_MIGRATION));
    return { identity, schema, target, luxe };
  });
}

function runPrismaResolve(url) {
  const result = spawnSync(
    'npx',
    ['prisma', 'migrate', 'resolve', '--applied', TARGET_MIGRATION],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        POSTGRES_URL: url,
        PRISMA_HIDE_UPDATE_MESSAGE: '1',
      },
    },
  );
  return {
    status: result.status,
    stdout: redactSecrets(result.stdout || '').trim(),
    stderr: redactSecrets(result.stderr || '').trim(),
  };
}

function parseArgs(argv) {
  const out = { phase: 'inspect', mode: 'dry_run', confirm: '' };
  for (const arg of argv) {
    if (arg.startsWith('--phase=')) out.phase = arg.slice('--phase='.length);
    else if (arg.startsWith('--mode=')) out.mode = arg.slice('--mode='.length);
    else if (arg.startsWith('--confirm=')) out.confirm = arg.slice('--confirm='.length);
  }
  if (process.env.RESOLVER_MODE) out.mode = String(process.env.RESOLVER_MODE);
  if (process.env.CONFIRM_MIGRATION_ID) out.confirm = String(process.env.CONFIRM_MIGRATION_ID);
  return out;
}

async function run(args) {
  const workflowPath = path.join(ROOT, WORKFLOW_RELATIVE_PATH);
  const workflow = inspectResolverWorkflow(readFileSync(workflowPath, 'utf8'));
  if (!workflow.ok) {
    fail(1, { step: 'workflow_inspect', workflow });
  }
  const checksum = readApprovedMigrationChecksum();
  if (!checksum.ok) {
    fail(1, { step: 'migration_checksum', checksum });
  }

  if (args.phase === 'inspect') {
    printSafe({
      ok: true,
      step: 'inspect',
      workflow,
      checksum,
      target_migration: TARGET_MIGRATION,
      expected_database: EXPECTED_DATABASE,
      expected_role: EXPECTED_ROLE,
      note: 'No database command ran.',
    });
    return;
  }

  const selected = selectNonPooledConnection(process.env);
  const selectedSafe = {
    ok: selected.ok,
    reason: selected.reason,
    pooled_postgres_url_present: selected.pooled_postgres_url_present,
    source_keys: selected.source_keys,
    classified: selected.classified,
  };
  if (!selected.ok) {
    const payload = {
      step: 'select_connection',
      selected: selectedSafe,
      blocker:
        'Infisical production still lacks a pre-existing non-pooled Neon URL under DIRECT_URL or POSTGRES_URL_NON_POOLING. Do not derive one from POSTGRES_URL. CEO approval is required to add that existing Neon direct connection as a named Infisical secret for the current OIDC identity.',
    };
    if (args.mode === 'execute') fail(2, payload);
    printSafe({ ok: true, inert: true, ...payload });
    return;
  }

  let evidence;
  try {
    evidence = await collectDatabaseEvidence(selected.url);
  } catch (error) {
    fail(1, {
      step: 'database_preflight',
      selected: selectedSafe,
      error: redactSecrets(error && error.message),
    });
  }

  const preflight = evaluatePreflight(evidence);
  if (!preflight.ok) {
    fail(1, { step: 'database_preflight', selected: selectedSafe, preflight });
  }

  const alreadyApplied = Boolean(preflight.target.present && preflight.target.finished);
  const unfinishedTarget = Boolean(preflight.target.present && !preflight.target.finished);
  if (unfinishedTarget) {
    fail(1, {
      step: 'database_preflight',
      selected: selectedSafe,
      preflight,
      blocker: 'Target history row exists but is unfinished. Do not resolve or repair it automatically.',
    });
  }

  if (args.mode !== 'execute') {
    printSafe({
      ok: true,
      step: 'dry_run_preflight',
      selected: selectedSafe,
      preflight,
      resolve: 'skipped',
      note: 'dry_run does not call prisma migrate resolve.',
    });
    return;
  }

  const ref = String(process.env.GITHUB_REF || '');
  if (ref && ref !== 'refs/heads/main') {
    fail(1, {
      step: 'execute_guard',
      selected: selectedSafe,
      blocker: 'execute is allowed only from refs/heads/main after merge.',
      github_ref_present: Boolean(ref),
    });
  }
  if (args.confirm !== TARGET_MIGRATION) {
    fail(1, {
      step: 'execute_guard',
      selected: selectedSafe,
      blocker: 'confirm_migration_id must equal the fixed approved migration id.',
    });
  }

  if (alreadyApplied) {
    printSafe({
      ok: true,
      step: 'already_applied',
      selected: selectedSafe,
      preflight,
      resolve: 'skipped_duplicate',
    });
    return;
  }

  const resolve = runPrismaResolve(selected.url);
  if (resolve.status !== 0) {
    fail(1, { step: 'migrate_resolve', selected: selectedSafe, preflight, resolve });
  }

  let post;
  try {
    post = evaluatePreflight(await collectDatabaseEvidence(selected.url));
  } catch (error) {
    fail(1, {
      step: 'database_postflight',
      selected: selectedSafe,
      error: redactSecrets(error && error.message),
    });
  }

  const postFailures = [];
  if (!(post.target.present && post.target.finished && !post.target.rolled_back)) {
    postFailures.push('target_history_not_completed');
  }
  if (JSON.stringify(post.luxe) !== JSON.stringify(preflight.luxe)) {
    postFailures.push('luxe_history_changed');
  }
  if (postFailures.length) {
    fail(1, {
      step: 'database_postflight',
      selected: selectedSafe,
      preflight,
      resolve,
      postflight: post,
      postFailures,
    });
  }

  printSafe({
    ok: true,
    step: 'execute_complete',
    selected: selectedSafe,
    preflight,
    resolve,
    postflight: {
      target: post.target,
      luxe: post.luxe,
      counts: post.schema.counts,
    },
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const args = parseArgs(process.argv.slice(2));
  run(args).catch((error) => {
    fail(1, { step: 'unhandled', error: redactSecrets(error && error.message) });
  });
}
