/**
 * Static guards for the #1517 Prisma history-registration workflow.
 * No live database, no Infisical values, no production mutation.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EXPECTED_MIGRATION_CHECKSUM,
  EXPECTED_PRISMA_ADVISORY_LOCK_ID,
  GUARDED_SINGLE_SESSION_TERMINATE_SQL,
  PRISMA_ADVISORY_LOCK_SELECT_SQL,
  TARGET_MIGRATION,
  TERMINATE_ONE_SESSION_CONFIRM,
  WORKFLOW_RELATIVE_PATH,
  classifyAdvisoryLockRow,
  classifyConnectionUrl,
  buildGuardedTerminateParams,
  classifyLockQueryError,
  discoverPrismaMigrateAdvisoryLock,
  evaluateDiagnoseOutcome,
  evaluateExecutionGuard,
  evaluateFreshReleaseIdentity,
  evaluateGuardedTerminateOutcome,
  evaluateReleaseCandidate,
  evaluateReleaseGuard,
  evaluatePostflight,
  evaluatePreflight,
  hashMigrationSql,
  inspectGuardedTerminateSql,
  inspectLockQuerySql,
  inspectResolverWorkflow,
  inspectTerminateScript,
  omitSqlFromError,
  parseExactBackendStart,
  parsePrismaAdvisoryLockIdFromEngineText,
  prismaAdvisoryLockColumns,
  publicCandidateLogView,
  publicConnectionReport,
  publicHolderLogView,
  publicLockLogView,
  publicLockReport,
  publicReleaseAttemptLogView,
  publicReleaseGuardLogView,
  publicTerminateLogView,
  sessionFingerprint,
  readApprovedMigrationChecksum,
  redactSecrets,
  selectNonPooledConnection,
  summarizeHistoryRows,
} from '../scripts/bad-ownership-history-resolver-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRECT =
  'postgresql://neondb_owner:secret@ep-example.c-6.us-east-1.aws.neon.tech:5432/neondb?sslmode=require';
const POOLED =
  'postgresql://neondb_owner:secret@ep-example-pooler.c-6.us-east-1.aws.neon.tech:5432/neondb?sslmode=require';
const BACKEND_START = '2026-10-26T12:00:00.123456Z';
const BACKEND_START_SAME_SECOND = '2026-10-26T12:00:00.123457Z';

function validEvidence(overrides = {}) {
  const identity = {
    database: 'neondb',
    role: 'neondb_owner',
    in_recovery: false,
    ...overrides.identity,
  };
  const schema = {
    tables: [
      'bad_purchase_ownership',
      'bad_purchase_unbound_reversals',
      'bad_purchase_webhook_events',
    ],
    indexes: [
      'bad_purchase_ownership_checkout_intent_id_key',
      'bad_purchase_ownership_order_confirmation_ref_key',
      'bad_purchase_ownership_paddle_transaction_id_key',
      'bad_purchase_unbound_reversals_paddle_transaction_id_key',
      'bad_purchase_webhook_events_event_id_key',
    ],
    fk: {
      name: 'bad_purchase_ownership_auth_user_id_fkey',
      table_name: 'bad_purchase_ownership',
      column_name: 'auth_user_id',
      referenced_table: 'auth_users',
      referenced_column: 'id',
      on_update: 'c',
      on_delete: 'r',
    },
    trigger: {
      name: 'bad_purchase_ownership_terminal_guard',
      tgenabled: 'O',
      table_name: 'bad_purchase_ownership',
      function_name: 'bad_purchase_ownership_keep_terminal',
    },
    ...overrides.schema,
  };
  return {
    identity,
    schema,
    target: overrides.target || summarizeHistoryRows([]),
    luxe:
      overrides.luxe ||
      summarizeHistoryRows([{ finished_at: null, rolled_back_at: null, applied_steps_count: 0 }]),
  };
}

describe('BAD ownership Prisma history resolver', () => {
  it('fails closed when Infisical has no non-pooled URL, even if pooled POSTGRES_URL exists', () => {
    const selected = selectNonPooledConnection({ POSTGRES_URL: POOLED });
    assert.equal(selected.ok, false);
    assert.equal(selected.reason, 'missing_non_pooled_url');
    assert.equal(selected.url, null);
    assert.equal(selected.pooled_postgres_url_present, true);
  });

  it('rejects a pooler endpoint and does not treat it as DIRECT_URL', () => {
    const pooledShape = classifyConnectionUrl(POOLED);
    assert.equal(pooledShape.ok, false);
    assert.equal(pooledShape.reason, 'pooled_endpoint');
    const selected = selectNonPooledConnection({ DIRECT_URL: POOLED });
    assert.equal(selected.ok, false);
    assert.match(selected.reason, /pooled_endpoint/);
  });

  it('accepts matching non-pooled aliases and rejects disagreement or prisma.io hosts', () => {
    const ready = selectNonPooledConnection({
      DIRECT_URL: DIRECT,
      POSTGRES_URL_NON_POOLING: DIRECT,
    });
    assert.equal(ready.ok, true);
    assert.deepEqual(ready.source_keys, ['DIRECT_URL', 'POSTGRES_URL_NON_POOLING']);

    const disagree = selectNonPooledConnection({
      DIRECT_URL: DIRECT,
      POSTGRES_URL_NON_POOLING:
        'postgresql://neondb_owner:secret@ep-other.c-6.us-east-1.aws.neon.tech:5432/neondb?sslmode=require',
    });
    assert.equal(disagree.ok, false);
    assert.equal(disagree.reason, 'non_pooled_aliases_disagree');

    const prismaHost = classifyConnectionUrl(
      'postgresql://user:secret@db.prisma.io:5432/neondb',
    );
    assert.equal(prismaHost.ok, false);
    assert.equal(prismaHost.reason, 'prisma_postgres_host');
  });

  it('does not put username, hostname, URL, or fingerprint in logged connection diagnostics', () => {
    const selected = selectNonPooledConnection({ DIRECT_URL: DIRECT });
    const report = JSON.stringify(publicConnectionReport(selected));
    const classified = JSON.stringify(classifyConnectionUrl(DIRECT));
    for (const leak of ['ep-example', 'neondb_owner', 'secret', 'fingerprint', DIRECT]) {
      assert.equal(report.includes(leak), false, leak);
      assert.equal(classified.includes(leak), false, leak);
    }
    assert.equal(publicConnectionReport(selected).classified.DIRECT_URL.database_matches_expected, true);
    assert.equal(publicConnectionReport(selected).classified.DIRECT_URL.has_pooler, false);
  });

  it('rejects execute without main ref, confirmation, or a recognised mode before any database use', () => {
    assert.equal(evaluateExecutionGuard({ mode: 'dry_run' }).ok, true);
    assert.deepEqual(evaluateExecutionGuard({ mode: 'explode' }).failures, ['invalid_mode']);
    assert.ok(
      evaluateExecutionGuard({
        mode: 'execute',
        confirm: TARGET_MIGRATION,
      }).failures.includes('missing_github_ref'),
    );
    assert.ok(
      evaluateExecutionGuard({
        mode: 'execute',
        confirm: TARGET_MIGRATION,
        githubRef: 'refs/heads/cursor/issue-1517-history-resolver-802e',
        githubRepository: 'antonvdberg-bit/corpflow-ai-command-center',
      }).failures.includes('ref_not_main'),
    );
    assert.ok(
      evaluateExecutionGuard({
        mode: 'execute',
        confirm: 'some_other_migration',
        githubRef: 'refs/heads/main',
        githubRepository: 'antonvdberg-bit/corpflow-ai-command-center',
      }).failures.includes('confirm_mismatch'),
    );
    assert.equal(
      evaluateExecutionGuard({
        mode: 'execute',
        confirm: TARGET_MIGRATION,
        githubRef: 'refs/heads/main',
        githubRepository: 'antonvdberg-bit/corpflow-ai-command-center',
      }).ok,
      true,
    );
  });

  it('fails preflight when FK target/actions or the terminal trigger are wrong', () => {
    assert.equal(evaluatePreflight(validEvidence()).ok, true);

    const wrongTable = evaluatePreflight(
      validEvidence({
        schema: {
          ...validEvidence().schema,
          fk: {
            ...validEvidence().schema.fk,
            referenced_table: 'tenants',
          },
        },
      }),
    );
    assert.equal(wrongTable.ok, false);
    assert.ok(wrongTable.failures.includes('fk_referenced_table_mismatch'));

    const disabled = evaluatePreflight(
      validEvidence({
        schema: {
          ...validEvidence().schema,
          trigger: {
            ...validEvidence().schema.trigger,
            tgenabled: 'D',
          },
        },
      }),
    );
    assert.equal(disabled.ok, false);
    assert.ok(disabled.failures.includes('trigger_not_enabled'));

    const replica = evaluatePreflight(validEvidence({ identity: { in_recovery: true } }));
    assert.ok(replica.failures.includes('replica_not_primary'));
  });

  it('fails closed on ambiguous history rows and on a changed Luxe fingerprint after resolve', () => {
    const ambiguous = evaluatePreflight(
      validEvidence({
        target: summarizeHistoryRows([
          { finished_at: null, rolled_back_at: null },
          { finished_at: new Date(), rolled_back_at: null },
        ]),
      }),
    );
    assert.equal(ambiguous.ok, false);
    assert.ok(ambiguous.failures.includes('target_history_ambiguous'));

    const pre = evaluatePreflight(validEvidence());
    const postOk = evaluatePreflight(
      validEvidence({
        target: summarizeHistoryRows([
          { finished_at: new Date('2026-10-26T08:00:00Z'), rolled_back_at: null, applied_steps_count: 1 },
        ]),
      }),
    );
    assert.equal(evaluatePostflight(pre, postOk).ok, true);

    const postChangedLuxe = evaluatePreflight(
      validEvidence({
        target: summarizeHistoryRows([
          { finished_at: new Date('2026-10-26T08:00:00Z'), rolled_back_at: null, applied_steps_count: 1 },
        ]),
        luxe: summarizeHistoryRows([
          { finished_at: new Date('2026-10-26T08:00:00Z'), rolled_back_at: null, applied_steps_count: 1 },
        ]),
      }),
    );
    const luxeChanged = evaluatePostflight(pre, postChangedLuxe);
    assert.equal(luxeChanged.ok, false);
    assert.ok(luxeChanged.failures.includes('luxe_history_changed'));
  });

  it('pins the workflow to manual dispatch, existing Infisical OIDC, and the approved checksum', () => {
    const yaml = readFileSync(path.join(ROOT, WORKFLOW_RELATIVE_PATH), 'utf8');
    const inspection = inspectResolverWorkflow(yaml);
    assert.equal(inspection.ok, true, inspection.failures.join(','));
    assert.match(yaml, /workflow_dispatch:/);
    assert.doesNotMatch(yaml, /^\s+push:/m);
    assert.doesNotMatch(yaml, /^\s+pull_request:/m);
    assert.doesNotMatch(yaml, /^\s+schedule:/m);
    assert.doesNotMatch(yaml, /prisma migrate deploy/);
    assert.doesNotMatch(yaml, /deriveNonPoolingUrlFromNeonPooler/);
    assert.match(yaml, /github\.ref == 'refs\/heads\/main'/);
    assert.match(yaml, new RegExp(TARGET_MIGRATION));

    const checksum = readApprovedMigrationChecksum(ROOT);
    assert.equal(checksum.ok, true);
    assert.equal(checksum.checksum, EXPECTED_MIGRATION_CHECKSUM);
    assert.equal(
      hashMigrationSql(
        readFileSync(
          path.join(ROOT, 'prisma/migrations/20261021140000_bad_purchase_ownership/migration.sql'),
          'utf8',
        ),
      ),
      EXPECTED_MIGRATION_CHECKSUM,
    );
    assert.equal(redactSecrets(`connected with ${DIRECT}`).includes('secret'), false);
  });

  it('reads the Prisma migrate advisory lock id from installed schema-engine and classifies holders', () => {
    const missing = parsePrismaAdvisoryLockIdFromEngineText('no lock sql here');
    assert.equal(missing.ok, false);
    assert.equal(missing.reason, 'advisory_lock_sql_not_found');
    assert.equal(missing.lock_id, null);

    const ambiguous = parsePrismaAdvisoryLockIdFromEngineText(
      'SELECT pg_advisory_lock(1) SELECT pg_advisory_lock(2)',
    );
    assert.equal(ambiguous.ok, false);
    assert.equal(ambiguous.reason, 'advisory_lock_id_ambiguous');

    const engine = parsePrismaAdvisoryLockIdFromEngineText(
      'SELECT pg_advisory_lock(72707369) Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(72707369)). Timeout: 10000 ms.',
    );
    assert.equal(engine.ok, true);
    assert.equal(engine.lock_id, 72707369);
    assert.deepEqual(prismaAdvisoryLockColumns(72707369), {
      classid: 0,
      objid: 72707369,
      objsubid: 1,
    });

    const installed = discoverPrismaMigrateAdvisoryLock(ROOT);
    assert.equal(installed.ok, true, installed.reason);
    assert.equal(installed.lock_id, 72707369);
    assert.equal(installed.classid, 0);
    assert.equal(installed.objsubid, 1);

    const unverified = publicLockReport({ discovery: { ok: false, reason: 'schema_engine_missing' } });
    assert.equal(unverified.ok, false);
    assert.equal(unverified.recommendation, 'do_not_retry_unverified_lock_id');
    assert.equal(unverified.lock_id, null);

    const denied = publicLockReport({
      discovery: installed,
      queryError: 'permission denied for view pg_stat_activity',
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.reason, 'session_inspect_permission_denied');
    assert.equal(denied.recommendation, 'report_access_limitation_no_session_mutation');
    assert.equal(classifyLockQueryError('permission denied for view pg_stat_activity').reason, 'session_inspect_permission_denied');

    const holder = classifyAdvisoryLockRow(
      {
        pid: 4242,
        granted: true,
        mode: 'ExclusiveLock',
        state: 'idle in transaction',
        wait_event_type: 'Client',
        wait_event: 'ClientRead',
        application_name: 'prisma-schema-engine',
        backend_type: 'client backend',
        session_age_seconds: 120,
        xact_age_seconds: 90,
        state_age_seconds: 88,
        role_matches_current: true,
        database_matches_current: true,
      },
      99,
    );
    assert.equal(holder.occupancy, 'holder');
    assert.equal(holder.activity, 'idle_in_transaction');
    assert.equal(holder.is_this_session, false);

    const held = publicLockReport({
      discovery: installed,
      selfPid: 99,
      rows: [
        {
          pid: 4242,
          granted: true,
          mode: 'ExclusiveLock',
          state: 'idle in transaction',
          wait_event_type: 'Client',
          wait_event: 'ClientRead',
          application_name: `prisma@ep-example.c-6.us-east-1.aws.neon.tech ${DIRECT}`,
          backend_type: 'client backend',
          session_age_seconds: 120,
          xact_age_seconds: 90,
          state_age_seconds: 88,
          role_matches_current: true,
          database_matches_current: true,
        },
      ],
    });
    assert.equal(held.ok, true);
    assert.equal(held.occupancy, 'held_idle_in_transaction');
    assert.equal(held.recommendation, 'identify_holder_gated_decision_no_terminate');
    const heldJson = JSON.stringify(held);
    for (const leak of ['ep-example', 'secret', 'neondb_owner', 'SELECT ', DIRECT, 'pg_stat_activity']) {
      assert.equal(heldJson.includes(leak), false, leak);
    }

    const absent = publicLockReport({ discovery: installed, rows: [], selfPid: 1 });
    assert.equal(absent.occupancy, 'absent');
    assert.equal(
      absent.recommendation,
      'recheck_history_then_gated_execute_under_original_approval',
    );

    assert.equal(evaluateExecutionGuard({ mode: 'diagnose' }).ok, true);
    assert.ok(evaluateExecutionGuard({ mode: 'explode' }).failures.includes('invalid_mode'));

    const lockSql = inspectLockQuerySql(PRISMA_ADVISORY_LOCK_SELECT_SQL);
    assert.equal(lockSql.ok, true, lockSql.failures.join(','));
    const unscoped = inspectLockQuerySql(
      "SELECT l.pid FROM pg_locks l WHERE l.locktype = 'advisory' AND l.classid = $1",
    );
    assert.equal(unscoped.ok, false);
    assert.ok(unscoped.failures.includes('missing_database_oid_filter'));

    const verifySrc = readFileSync(
      path.join(ROOT, 'scripts/verify-bad-ownership-history-resolver.mjs'),
      'utf8',
    );
    assert.match(verifySrc, /PRISMA_ADVISORY_LOCK_SELECT_SQL/);
    assert.match(verifySrc, /evaluateDiagnoseOutcome/);
    assert.doesNotMatch(verifySrc, /pg_advisory_unlock/);
    assert.doesNotMatch(verifySrc, /PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK/);

    assert.equal(evaluateDiagnoseOutcome(held).ok, true);
    assert.equal(evaluateDiagnoseOutcome(denied).ok, false);
    assert.equal(evaluateDiagnoseOutcome(unverified).ok, false);
    assert.equal(evaluateDiagnoseOutcome(denied).reason, 'session_inspect_permission_denied');
  });

  it('redacts Prisma datasource hostnames and omits SQL from public errors', () => {
    const prismaStdout =
      'Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-abc-123.c-6.us-east-1.aws.neon.tech"';
    const redacted = redactSecrets(prismaStdout);
    assert.equal(redacted.includes('neon.tech'), false);
    assert.equal(redacted.includes('ep-abc-123'), false);
    assert.match(redacted, /\[redacted-host\]/);

    const withSql = omitSqlFromError('permission denied for view pg_stat_activity SELECT query FROM pg_stat_activity');
    assert.equal(withSql.includes('SELECT'), false);
    assert.match(withSql, /permission denied/);
  });

  it('fails closed on unsafe lock-release conditions and never targets by application label', () => {
    const identity = { database: 'neondb', role: 'neondb_owner', database_oid: 16384 };
    const holderRow = {
      pid: 4242,
      granted: true,
      mode: 'ExclusiveLock',
      state: 'idle',
      wait_event_type: 'Client',
      wait_event: 'ClientRead',
      application_name: 'pgbouncer',
      backend_type: 'client backend',
      backend_start: BACKEND_START,
      session_age_seconds: 2205,
      xact_age_seconds: null,
      state_age_seconds: 12,
      role_matches_current: true,
      database_matches_current: true,
    };
    const discovery = {
      ok: true,
      lock_id: EXPECTED_PRISMA_ADVISORY_LOCK_ID,
      prisma_version: '6.19.2',
    };
    const lock = publicLockReport({ discovery, selfPid: 99, rows: [holderRow] });
    const target = { pid: 4242, backend_start: BACKEND_START };
    const ok = evaluateReleaseCandidate(lock, target, identity);
    assert.equal(ok.ok, true, ok.failures.join(','));
    assert.equal(ok.pooler.likely_neon_transaction_pooler_backend, true);
    assert.equal(ok.pooler.does_not_restart_neon, true);

    const twoHolders = publicLockReport({
      discovery,
      selfPid: 99,
      rows: [holderRow, { ...holderRow, pid: 4243 }],
    });
    assert.ok(evaluateReleaseCandidate(twoHolders, target, identity).failures.includes('holder_count_not_one'));

    const waiter = publicLockReport({
      discovery,
      selfPid: 99,
      rows: [holderRow, { ...holderRow, pid: 7, granted: false }],
    });
    assert.ok(evaluateReleaseCandidate(waiter, target, identity).failures.includes('waiters_present'));

    assert.ok(
      evaluateReleaseCandidate(lock, { pid: 1, backend_start: BACKEND_START }, identity).failures.includes(
        'pid_mismatch',
      ),
    );
    assert.ok(
      evaluateReleaseCandidate(lock, { pid: 4242, backend_start: BACKEND_START_SAME_SECOND }, identity).failures.includes(
        'backend_start_mismatch',
      ),
    );
    assert.equal(parseExactBackendStart('1761470000'), null);
    assert.equal(parseExactBackendStart('2026-10-26T12:00:00Z'), null);
    assert.equal(parseExactBackendStart(BACKEND_START), BACKEND_START);

    const busy = publicLockReport({
      discovery,
      selfPid: 99,
      rows: [{ ...holderRow, state: 'active' }],
    });
    assert.ok(evaluateReleaseCandidate(busy, target, identity).failures.includes('holder_not_idle'));

    const inTxn = publicLockReport({
      discovery,
      selfPid: 99,
      rows: [{ ...holderRow, xact_age_seconds: 3 }],
    });
    assert.ok(evaluateReleaseCandidate(inTxn, target, identity).failures.includes('holder_has_open_transaction'));

    const selfLock = publicLockReport({ discovery, selfPid: 4242, rows: [holderRow] });
    assert.ok(evaluateReleaseCandidate(selfLock, target, identity).failures.includes('would_terminate_self'));

    const unknownApp = publicLockReport({
      discovery,
      selfPid: 99,
      rows: [{ ...holderRow, application_name: 'prisma-schema-engine' }],
    });
    assert.ok(
      evaluateReleaseCandidate(unknownApp, target, identity).failures.includes('holder_application_uncertain'),
    );

    const wrongKey = publicLockReport({
      discovery: { ...discovery, lock_id: 1 },
      selfPid: 99,
      rows: [holderRow],
    });
    assert.ok(evaluateReleaseCandidate(wrongKey, target, identity).failures.includes('lock_id_mismatch'));

    const noOid = evaluateReleaseCandidate(lock, target, { ...identity, database_oid: null });
    assert.ok(noOid.failures.includes('database_oid_unverified'));

    const changed = evaluateFreshReleaseIdentity(ok, {
      ...ok,
      holder: { ...ok.holder, pid: 9999 },
    });
    assert.ok(changed.failures.includes('pid_changed'));

    assert.equal(
      evaluateReleaseGuard({
        mode: 'release_preview',
        confirmPid: '4242',
        confirmBackendStart: BACKEND_START,
      }).ok,
      true,
    );
    assert.ok(
      evaluateReleaseGuard({
        mode: 'release_preview',
        confirmPid: '4242',
        confirmBackendStart: BACKEND_START,
        confirmTerminate: TERMINATE_ONE_SESSION_CONFIRM,
      }).failures.includes('terminate_confirm_not_allowed_in_preview'),
    );
    assert.ok(
      evaluateReleaseGuard({
        mode: 'release_lock',
        confirmPid: '4242',
        confirmBackendStart: BACKEND_START,
      }).failures.includes('confirm_terminate_mismatch'),
    );
    assert.equal(
      evaluateReleaseGuard({
        mode: 'release_lock',
        confirmPid: '4242',
        confirmBackendStart: BACKEND_START,
        confirmTerminate: TERMINATE_ONE_SESSION_CONFIRM,
      }).ok,
      true,
    );
    assert.ok(
      evaluateReleaseGuard({
        mode: 'release_lock',
        confirmPid: 'pgbouncer',
        confirmBackendStart: BACKEND_START,
        confirmTerminate: TERMINATE_ONE_SESSION_CONFIRM,
      }).failures.includes('missing_or_invalid_confirm_pid'),
    );
    assert.ok(
      evaluateReleaseGuard({
        mode: 'release_lock',
        confirmPid: '4242',
        confirmBackendStart: '1761470000',
        confirmTerminate: TERMINATE_ONE_SESSION_CONFIRM,
      }).failures.includes('missing_or_invalid_confirm_backend_start'),
    );

    assert.ok(
      evaluateExecutionGuard({
        mode: 'release_lock',
        confirm: TARGET_MIGRATION,
      }).failures.includes('missing_github_ref'),
    );
    assert.equal(
      evaluateExecutionGuard({
        mode: 'release_lock',
        confirm: TARGET_MIGRATION,
        githubRef: 'refs/heads/main',
        githubRepository: 'antonvdberg-bit/corpflow-ai-command-center',
      }).ok,
      true,
    );

    const yaml = readFileSync(path.join(ROOT, WORKFLOW_RELATIVE_PATH), 'utf8');
    assert.doesNotMatch(yaml, /pg_terminate_backend/);
    const verifySrc = readFileSync(
      path.join(ROOT, 'scripts/verify-bad-ownership-history-resolver.mjs'),
      'utf8',
    );
    const terminateInspect = inspectTerminateScript(verifySrc, GUARDED_SINGLE_SESSION_TERMINATE_SQL);
    assert.equal(terminateInspect.ok, true, terminateInspect.failures.join(','));
    assert.match(GUARDED_SINGLE_SESSION_TERMINATE_SQL, /application_name = \$9::text/);
    assert.match(GUARDED_SINGLE_SESSION_TERMINATE_SQL, /pg_terminate_backend\(gate\.pid\)/);
    assert.doesNotMatch(GUARDED_SINGLE_SESSION_TERMINATE_SQL, /pg_terminate_backend\(\$1::int\)/);
  });

  it('fails closed at the guarded terminate boundary and does not log raw PIDs', () => {
    const identity = { database: 'neondb', role: 'neondb_owner', database_oid: 16384 };
    const target = { pid: 4242, backend_start: BACKEND_START };
    const discovery = {
      ok: true,
      lock_id: EXPECTED_PRISMA_ADVISORY_LOCK_ID,
    };
    const sqlInspect = inspectGuardedTerminateSql(GUARDED_SINGLE_SESSION_TERMINATE_SQL);
    assert.equal(sqlInspect.ok, true, sqlInspect.failures.join(','));

    const barePid = inspectGuardedTerminateSql(
      'SELECT pg_terminate_backend($1::int) AS terminated WHERE $1::int IS DISTINCT FROM pg_backend_pid()',
    );
    assert.equal(barePid.ok, false);
    assert.ok(barePid.failures.includes('bare_pid_terminate'));
    assert.ok(barePid.failures.includes('terminate_not_gated'));
    assert.ok(barePid.failures.includes('missing_backend_start_predicate'));
    assert.ok(barePid.failures.includes('missing_idle_predicate'));

    const params = buildGuardedTerminateParams(discovery, target, identity);
    assert.equal(params.ok, true, (params.failures || []).join(','));
    assert.deepEqual(params.values, [
      0,
      EXPECTED_PRISMA_ADVISORY_LOCK_ID,
      1,
      4242,
      BACKEND_START,
      16384,
      'neondb',
      'neondb_owner',
      'pgbouncer',
    ]);
    assert.ok(
      buildGuardedTerminateParams(discovery, { pid: 4243, backend_start: BACKEND_START }, identity)
        .ok,
    );
    assert.ok(
      buildGuardedTerminateParams(discovery, { pid: 4242, backend_start: '1761470000' }, identity).failures.includes(
        'missing_or_invalid_confirm_backend_start',
      ),
    );
    assert.ok(
      buildGuardedTerminateParams({ ok: true, lock_id: 1 }, target, identity).failures.includes(
        'lock_id_unverified',
      ),
    );
    assert.ok(
      buildGuardedTerminateParams(discovery, target, { ...identity, database_oid: null }).failures.includes(
        'database_oid_unverified',
      ),
    );
    assert.ok(
      buildGuardedTerminateParams(discovery, target, { ...identity, database: 'postgres' }).failures.includes(
        'unexpected_database',
      ),
    );
    assert.ok(
      buildGuardedTerminateParams(discovery, target, { ...identity, role: 'cloud_admin' }).failures.includes(
        'unexpected_role',
      ),
    );

    assert.deepEqual(evaluateGuardedTerminateOutcome([]), {
      ok: false,
      terminated: false,
      reason: 'no_matching_session',
      row_count: 0,
    });
    assert.equal(evaluateGuardedTerminateOutcome([{ terminated: false }]).reason, 'terminate_returned_false');
    assert.equal(
      evaluateGuardedTerminateOutcome([{ terminated: true }, { terminated: true }]).reason,
      'ambiguous_terminate_result',
    );
    assert.deepEqual(evaluateGuardedTerminateOutcome([{ terminated: true }]), {
      ok: true,
      terminated: true,
      reason: 'terminated_one_session',
      row_count: 1,
    });

    const holderRow = {
      pid: 4242,
      granted: true,
      mode: 'ExclusiveLock',
      state: 'idle',
      wait_event_type: 'Client',
      wait_event: 'ClientRead',
      application_name: 'pgbouncer',
      backend_type: 'client backend',
      backend_start: BACKEND_START,
      session_age_seconds: 2205,
      xact_age_seconds: null,
      state_age_seconds: 12,
      role_matches_current: true,
      database_matches_current: true,
    };
    const lock = publicLockReport({ discovery, selfPid: 99, rows: [holderRow] });
    const candidate = evaluateReleaseCandidate(lock, target, identity);
    const logView = JSON.stringify({
      lock: publicLockLogView(lock),
      candidate: publicCandidateLogView(candidate),
      attempt: publicReleaseAttemptLogView({
        first: candidate,
        second: candidate,
        fresh: { ok: true, failures: [] },
      }),
      termination: publicTerminateLogView({
        ok: true,
        terminated: true,
        reason: 'terminated_one_session',
        row_count: 1,
      }),
    });
    assert.equal(logView.includes('"pid":'), false);
    assert.equal(logView.includes('"pid":4242'), false);
    assert.equal(logView.includes('"pid": 4242'), false);
    assert.equal(publicHolderLogView(candidate.holder).pid_fingerprint, sessionFingerprint(4242, BACKEND_START));
    assert.match(logView, /pid_fingerprint/);

    const failedConfirmGuard = evaluateReleaseGuard({
      mode: 'release_lock',
      confirmPid: '4242',
      confirmBackendStart: BACKEND_START,
      confirmTerminate: 'wrong',
    });
    assert.equal(failedConfirmGuard.ok, false);
    assert.ok(failedConfirmGuard.failures.includes('confirm_terminate_mismatch'));
    assert.equal(failedConfirmGuard.confirm_pid, 4242);
    const failedConfirmPayload = JSON.stringify({
      ok: false,
      step: 'release_guard',
      release_guard: publicReleaseGuardLogView(failedConfirmGuard),
      blocker: 'Release targeting is incomplete or not authorised. No session was terminated.',
    });
    assert.doesNotMatch(failedConfirmPayload, /"confirm_pid":/);
    assert.doesNotMatch(failedConfirmPayload, /"confirm_backend_start":/);
    assert.equal(JSON.parse(failedConfirmPayload).release_guard.confirm_pid_present, true);
    assert.equal(JSON.parse(failedConfirmPayload).release_guard.confirm_backend_start_present, true);
    const missingTerminatePayload = JSON.stringify({
      release_guard: publicReleaseGuardLogView(
        evaluateReleaseGuard({
          mode: 'release_lock',
          confirmPid: '4242',
          confirmBackendStart: BACKEND_START,
        }),
      ),
    });
    assert.doesNotMatch(missingTerminatePayload, /"confirm_pid":/);
    assert.ok(JSON.parse(missingTerminatePayload).release_guard.failures.includes('confirm_terminate_mismatch'));

    const verifySrc = readFileSync(
      path.join(ROOT, 'scripts/verify-bad-ownership-history-resolver.mjs'),
      'utf8',
    );
    assert.match(verifySrc, /GUARDED_SINGLE_SESSION_TERMINATE_SQL/);
    assert.match(verifySrc, /evaluateGuardedTerminateOutcome/);
    assert.match(verifySrc, /publicLockLogView/);
    assert.match(verifySrc, /publicReleaseGuardLogView/);
    assert.doesNotMatch(verifySrc, /release_guard:\s*releaseGuard/);
    assert.doesNotMatch(verifySrc, /terminateConfirmedSession\(selected\.url, target\.pid\)/);
  });
});
