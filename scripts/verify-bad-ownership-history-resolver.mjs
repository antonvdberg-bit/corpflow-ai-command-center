#!/usr/bin/env node
/**
 * Guarded Prisma history registration for 20261021140000_bad_purchase_ownership.
 *
 * Classifies Infisical-injected connection names, verifies the already-installed
 * buyer-ownership schema, and (only in execute mode) runs exactly one
 * `prisma migrate resolve --applied` command.
 *
 * It never prints connection strings, passwords, usernames, or hostnames.
 * It never derives a non-pooled URL from a pooler host.
 * It never runs `prisma migrate deploy`, `db push`, or `migrate reset`.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

import {
  LUXE_MIGRATION,
  RESOLVER_REPO_ROOT,
  TARGET_MIGRATION,
  WORKFLOW_RELATIVE_PATH,
  discoverPrismaMigrateAdvisoryLock,
  evaluateExecutionGuard,
  evaluatePostflight,
  evaluatePreflight,
  inspectResolverWorkflow,
  omitSqlFromError,
  publicConnectionReport,
  publicLockReport,
  readApprovedMigrationChecksum,
  redactSecrets,
  selectNonPooledConnection,
  summarizeHistoryRows,
} from './bad-ownership-history-resolver-lib.mjs';

const ROOT = RESOLVER_REPO_ROOT;

function printSafe(obj) {
  console.log(redactSecrets(JSON.stringify(obj, null, 2)));
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

async function readIdentity(prisma) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT current_database() AS database,
           current_user AS role,
           pg_is_in_recovery() AS in_recovery
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
    SELECT
      c.conname AS name,
      rel.relname AS table_name,
      (
        SELECT attname FROM pg_attribute
        WHERE attrelid = c.conrelid AND attnum = c.conkey[1]
      ) AS column_name,
      conf.relname AS referenced_table,
      (
        SELECT attname FROM pg_attribute
        WHERE attrelid = c.confrelid AND attnum = c.confkey[1]
      ) AS referenced_column,
      c.confupdtype AS on_update,
      c.confdeltype AS on_delete
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_class conf ON conf.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND c.contype = 'f'
      AND c.conname = 'bad_purchase_ownership_auth_user_id_fkey'
  `);
  const trigger = await prisma.$queryRawUnsafe(`
    SELECT
      t.tgname AS name,
      t.tgenabled,
      c.relname AS table_name,
      p.proname AS function_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND t.tgname = 'bad_purchase_ownership_terminal_guard'
      AND NOT t.tgisinternal
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
  return prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
     FROM _prisma_migrations
     WHERE migration_name = $1
     ORDER BY started_at ASC`,
    name,
  );
}

async function collectDatabaseEvidence(url) {
  return withPrisma(url, async (prisma) => {
    const identity = await readIdentity(prisma);
    const schema = await readSchemaPresence(prisma);
    const target = summarizeHistoryRows(await readHistory(prisma, TARGET_MIGRATION));
    const luxe = summarizeHistoryRows(await readHistory(prisma, LUXE_MIGRATION));
    return { identity, schema, target, luxe };
  });
}

async function collectLockEvidence(url, discovery) {
  if (!discovery?.ok) {
    return publicLockReport({ discovery });
  }
  return withPrisma(url, async (prisma) => {
    const selfRows = await prisma.$queryRawUnsafe(`SELECT pg_backend_pid() AS pid`);
    const selfPid = selfRows[0]?.pid;
    const columns = {
      classid: discovery.classid,
      objid: discovery.objid,
      objsubid: discovery.objsubid,
    };
    const rows = await prisma.$queryRawUnsafe(
      `SELECT
         l.pid,
         l.granted,
         l.mode,
         a.state,
         a.wait_event_type,
         a.wait_event,
         a.application_name,
         a.backend_type,
         EXTRACT(EPOCH FROM (now() - a.backend_start))::int AS session_age_seconds,
         CASE
           WHEN a.xact_start IS NULL THEN NULL
           ELSE EXTRACT(EPOCH FROM (now() - a.xact_start))::int
         END AS xact_age_seconds,
         CASE
           WHEN a.state_change IS NULL THEN NULL
           ELSE EXTRACT(EPOCH FROM (now() - a.state_change))::int
         END AS state_age_seconds,
         (a.usename = current_user) AS role_matches_current,
         (a.datname = current_database()) AS database_matches_current
       FROM pg_locks l
       LEFT JOIN pg_stat_activity a ON a.pid = l.pid
       WHERE l.locktype = 'advisory'
         AND l.classid = $1
         AND l.objid = $2
         AND l.objsubid = $3
       ORDER BY l.granted DESC, l.pid`,
      columns.classid,
      columns.objid,
      columns.objsubid,
    );
    return publicLockReport({ discovery, rows, selfPid });
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
  const out = { phase: 'inspect', mode: '', confirm: '' };
  for (const arg of argv) {
    if (arg.startsWith('--phase=')) out.phase = arg.slice('--phase='.length);
    else if (arg.startsWith('--mode=')) out.mode = arg.slice('--mode='.length);
    else if (arg.startsWith('--confirm=')) out.confirm = arg.slice('--confirm='.length);
  }
  if (process.env.RESOLVER_MODE) out.mode = String(process.env.RESOLVER_MODE);
  if (process.env.CONFIRM_MIGRATION_ID) out.confirm = String(process.env.CONFIRM_MIGRATION_ID);
  if (!out.mode) out.mode = 'dry_run';
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
      advisory_lock: discoverPrismaMigrateAdvisoryLock(),
      note: 'No database command ran.',
    });
    return;
  }

  const guard = evaluateExecutionGuard({
    mode: args.mode,
    confirm: args.confirm,
    githubRef: process.env.GITHUB_REF,
    githubRepository: process.env.GITHUB_REPOSITORY,
  });
  if (!guard.ok) {
    fail(1, {
      step: 'execute_guard',
      guard,
      blocker: 'Mode, repository, branch, or confirmation is not authorised. No database connection was opened.',
    });
  }

  const selected = selectNonPooledConnection(process.env);
  const selectedSafe = publicConnectionReport(selected);
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
      error: omitSqlFromError(error && error.message),
    });
  }

  const preflight = evaluatePreflight(evidence);
  if (!preflight.ok) {
    fail(1, { step: 'database_preflight', selected: selectedSafe, preflight });
  }

  const alreadyApplied = Boolean(
    preflight.target.count === 1 && preflight.target.finished && !preflight.target.rolled_back,
  );

  if (args.mode === 'diagnose') {
    let lock;
    try {
      lock = await collectLockEvidence(selected.url, discoverPrismaMigrateAdvisoryLock());
    } catch (error) {
      lock = publicLockReport({
        discovery: discoverPrismaMigrateAdvisoryLock(),
        queryError: error && error.message,
      });
    }
    printSafe({
      ok: true,
      step: 'diagnose',
      selected: selectedSafe,
      preflight,
      lock,
      resolve: 'skipped',
      note: 'diagnose does not call prisma migrate resolve, terminate sessions, or disable advisory locking.',
    });
    return;
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
      error: omitSqlFromError(error && error.message),
    });
  }

  const postflight = evaluatePostflight(preflight, post);
  if (!postflight.ok) {
    fail(1, {
      step: 'database_postflight',
      selected: selectedSafe,
      preflight,
      resolve,
      postflight,
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
      schema: post.schema,
    },
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const args = parseArgs(process.argv.slice(2));
  run(args).catch((error) => {
    fail(1, { step: 'unhandled', error: omitSqlFromError(error && error.message) });
  });
}
