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
 * release_lock may terminate one confirmed PID only through a server-side
 * statement that re-checks lock identity and backend state. It never
 * terminates by application label or by a bare PID.
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
  GUARDED_SINGLE_SESSION_TERMINATE_SQL,
  PRISMA_ADVISORY_LOCK_SELECT_SQL,
  RELEASE_MODES,
  buildGuardedTerminateParams,
  discoverPrismaMigrateAdvisoryLock,
  evaluateDiagnoseOutcome,
  evaluateExecutionGuard,
  evaluateFreshReleaseIdentity,
  evaluateGuardedTerminateOutcome,
  evaluatePostflight,
  evaluatePreflight,
  evaluateReleaseCandidate,
  evaluateReleaseGuard,
  inspectResolverWorkflow,
  omitSqlFromError,
  publicConnectionReport,
  publicLockLogView,
  publicLockReport,
  publicReleaseAttemptLogView,
  publicTerminateLogView,
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
           pg_is_in_recovery() AS in_recovery,
           (SELECT oid FROM pg_database WHERE datname = current_database()) AS database_oid
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
      PRISMA_ADVISORY_LOCK_SELECT_SQL,
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
  const out = {
    phase: 'inspect',
    mode: '',
    confirm: '',
    confirmPid: '',
    confirmBackendStartEpoch: '',
    confirmTerminate: '',
  };
  for (const arg of argv) {
    if (arg.startsWith('--phase=')) out.phase = arg.slice('--phase='.length);
    else if (arg.startsWith('--mode=')) out.mode = arg.slice('--mode='.length);
    else if (arg.startsWith('--confirm=')) out.confirm = arg.slice('--confirm='.length);
    else if (arg.startsWith('--confirm-pid=')) out.confirmPid = arg.slice('--confirm-pid='.length);
    else if (arg.startsWith('--confirm-backend-start-epoch=')) {
      out.confirmBackendStartEpoch = arg.slice('--confirm-backend-start-epoch='.length);
    } else if (arg.startsWith('--confirm-terminate=')) {
      out.confirmTerminate = arg.slice('--confirm-terminate='.length);
    }
  }
  if (process.env.RESOLVER_MODE) out.mode = String(process.env.RESOLVER_MODE);
  if (process.env.CONFIRM_MIGRATION_ID) out.confirm = String(process.env.CONFIRM_MIGRATION_ID);
  if (process.env.CONFIRM_PID) out.confirmPid = String(process.env.CONFIRM_PID);
  if (process.env.CONFIRM_BACKEND_START_EPOCH) {
    out.confirmBackendStartEpoch = String(process.env.CONFIRM_BACKEND_START_EPOCH);
  }
  if (process.env.CONFIRM_TERMINATE) out.confirmTerminate = String(process.env.CONFIRM_TERMINATE);
  if (!out.mode) out.mode = 'dry_run';
  return out;
}

async function terminateConfirmedSession(url, params) {
  return withPrisma(url, async (prisma) => {
    const rows = await prisma.$queryRawUnsafe(GUARDED_SINGLE_SESSION_TERMINATE_SQL, ...params.values);
    return evaluateGuardedTerminateOutcome(rows);
  });
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
    if (args.mode === 'execute' || RELEASE_MODES.includes(args.mode) || args.mode === 'diagnose') {
      fail(args.mode === 'execute' ? 2 : 1, { ...payload, step: args.mode === 'diagnose' ? 'diagnose' : payload.step });
    }
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
    const diagnose = evaluateDiagnoseOutcome(lock);
    const payload = {
      step: 'diagnose',
      selected: selectedSafe,
      preflight,
      lock: publicLockLogView(lock),
      diagnose,
      resolve: 'skipped',
      note: 'diagnose does not call prisma migrate resolve, terminate sessions, or disable advisory locking. Holder PIDs are fingerprinted in logs.',
    };
    if (!diagnose.ok) fail(1, payload);
    printSafe({ ok: true, ...payload });
    return;
  }

  if (RELEASE_MODES.includes(args.mode)) {
    const releaseGuard = evaluateReleaseGuard({
      mode: args.mode,
      confirmPid: args.confirmPid,
      confirmBackendStartEpoch: args.confirmBackendStartEpoch,
      confirmTerminate: args.confirmTerminate,
    });
    if (!releaseGuard.ok) {
      fail(1, {
        step: 'release_guard',
        release_guard: releaseGuard,
        blocker: 'Release targeting is incomplete or not authorised. No session was terminated.',
      });
    }

    const target = {
      pid: releaseGuard.confirm_pid,
      backend_start_epoch: releaseGuard.confirm_backend_start_epoch,
    };
    const discovery = discoverPrismaMigrateAdvisoryLock();
    let firstLock;
    let secondLock;
    try {
      firstLock = await collectLockEvidence(selected.url, discovery);
      secondLock = await collectLockEvidence(selected.url, discovery);
    } catch (error) {
      fail(1, {
        step: args.mode,
        selected: selectedSafe,
        preflight,
        error: omitSqlFromError(error && error.message),
      });
    }
    const first = evaluateReleaseCandidate(firstLock, target, evidence.identity);
    const second = evaluateReleaseCandidate(secondLock, target, evidence.identity);
    const fresh = evaluateFreshReleaseIdentity(first, second);
    const candidate = { first, second, fresh };
    const candidateLog = publicReleaseAttemptLogView(candidate);
    if (!first.ok || !second.ok || !fresh.ok) {
      fail(1, {
        step: args.mode,
        selected: selectedSafe,
        preflight,
        candidate: candidateLog,
        resolve: 'skipped',
        terminated: false,
        note: 'Fail closed. No session was terminated.',
      });
    }

    if (args.mode === 'release_preview' || !releaseGuard.mutation_requested) {
      printSafe({
        ok: true,
        step: 'release_preview',
        selected: selectedSafe,
        preflight,
        candidate: candidateLog,
        resolve: 'skipped',
        terminated: false,
        note: 'release_preview does not terminate sessions or call prisma migrate resolve.',
      });
      return;
    }

    const terminateParams = buildGuardedTerminateParams(discovery, target, evidence.identity);
    if (!terminateParams.ok) {
      fail(1, {
        step: 'release_lock',
        selected: selectedSafe,
        preflight,
        candidate: candidateLog,
        terminate_params: { ok: false, failures: terminateParams.failures },
        terminated: false,
        note: 'Fail closed. Guarded terminate parameters were incomplete. No session was terminated.',
      });
    }

    let termination;
    try {
      termination = await terminateConfirmedSession(selected.url, terminateParams);
    } catch (error) {
      fail(1, {
        step: 'release_lock',
        selected: selectedSafe,
        preflight,
        candidate: candidateLog,
        error: omitSqlFromError(error && error.message),
        terminated: false,
      });
    }
    if (!termination.ok || !termination.terminated) {
      fail(1, {
        step: 'release_lock',
        selected: selectedSafe,
        preflight,
        candidate: candidateLog,
        termination: publicTerminateLogView(termination),
        terminated: false,
        blocker:
          'Guarded terminate did not match one idle lock holder, or pg_terminate_backend returned false. No retry from this step.',
      });
    }

    let postLock;
    try {
      postLock = await collectLockEvidence(selected.url, discovery);
    } catch (error) {
      fail(1, {
        step: 'release_lock_postcheck',
        selected: selectedSafe,
        preflight,
        candidate: candidateLog,
        termination: publicTerminateLogView(termination),
        error: omitSqlFromError(error && error.message),
      });
    }
    if (postLock.occupancy !== 'absent' || (postLock.holders || []).length !== 0) {
      fail(1, {
        step: 'release_lock_postcheck',
        selected: selectedSafe,
        preflight,
        candidate: candidateLog,
        termination: publicTerminateLogView(termination),
        post_lock: publicLockLogView(postLock),
        blocker: 'Targeted terminate ran but the Prisma advisory lock is still held. Do not retry blindly.',
      });
    }

    printSafe({
      ok: true,
      step: 'release_lock_complete',
      selected: selectedSafe,
      preflight,
      candidate: candidateLog,
      termination: publicTerminateLogView(termination),
      post_lock: publicLockLogView(postLock),
      resolve: 'skipped',
      note: 'Session terminated. Controller must rerun diagnose, then dry_run, then the already-approved execute. This mode does not call prisma migrate resolve.',
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
