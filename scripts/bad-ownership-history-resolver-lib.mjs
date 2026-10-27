/**
 * Static, Prisma-free helpers for the BAD ownership history resolver.
 * Safe to import from unit tests without @prisma/client.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
export const ALLOWED_MODES = Object.freeze([
  'dry_run',
  'diagnose',
  'release_preview',
  'release_lock',
  'execute',
]);
export const RELEASE_MODES = Object.freeze(['release_preview', 'release_lock']);
export const EXPECTED_PRISMA_ADVISORY_LOCK_ID = 72707369;
export const TERMINATE_ONE_SESSION_CONFIRM = 'terminate_one_session';
export const RECOGNISED_POOLER_APPLICATION_LABEL = 'pgbouncer';
export const PRISMA_ADVISORY_LOCK_OBJSUBID = 1;
export const P1002_TIMEOUT_MS_OBSERVED = 10000;
export const BACKEND_START_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
export const BACKEND_START_UTC_SQL =
  `to_char(a.backend_start AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z'`;
export const PRISMA_ADVISORY_LOCK_SELECT_SQL = `SELECT
         l.pid,
         l.granted,
         l.mode,
         a.state,
         a.wait_event_type,
         a.wait_event,
         a.application_name,
         a.backend_type,
         ${BACKEND_START_UTC_SQL} AS backend_start,
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
         AND l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
         AND l.classid = $1
         AND l.objid = $2
         AND l.objsubid = $3
       ORDER BY l.granted DESC, l.pid`;
export const GUARDED_SINGLE_SESSION_TERMINATE_SQL = `WITH scoped_locks AS (
         SELECT l.pid, l.granted
         FROM pg_locks l
         WHERE l.locktype = 'advisory'
           AND l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
           AND l.classid = $1::int
           AND l.objid = $2::int
           AND l.objsubid = $3::int
           AND (SELECT oid FROM pg_database WHERE datname = current_database()) = $6::oid
           AND current_database() = $7::text
           AND current_user = $8::text
       ),
       candidate AS (
         SELECT a.pid
         FROM scoped_locks l
         INNER JOIN pg_stat_activity a ON a.pid = l.pid
         WHERE l.granted IS TRUE
           AND a.pid = $4::int
           AND a.pid IS DISTINCT FROM pg_backend_pid()
           AND ${BACKEND_START_UTC_SQL} = $5::text
           AND a.state = 'idle'
           AND a.xact_start IS NULL
           AND a.datname = current_database()
           AND a.usename = current_user
           AND a.application_name = $9::text
       ),
       gate AS (
         SELECT c.pid
         FROM candidate c
         WHERE (SELECT COUNT(*)::int FROM scoped_locks WHERE granted IS TRUE) = 1
           AND (SELECT COUNT(*)::int FROM scoped_locks WHERE granted IS NOT TRUE) = 0
           AND (SELECT COUNT(*)::int FROM candidate) = 1
       )
       SELECT pg_terminate_backend(gate.pid) AS terminated
       FROM gate`;
export const SINGLE_SESSION_TERMINATE_SQL = GUARDED_SINGLE_SESSION_TERMINATE_SQL;
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
    .replace(/\b[A-Za-z0-9._-]+\.neon\.tech\b/gi, '[redacted-host]')
    .replace(/\bat\s+"[^"]+"/gi, 'at "[redacted-host]"')
    .replace(/[?&](password|pwd|user|username)=([^&\s'"]+)/gi, '$1=[redacted]');
}

export function omitSqlFromError(message) {
  return redactSecrets(String(message || ''))
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|WITH)\b[\s\S]{0,800}/gi, '[sql-omitted]')
    .slice(0, 240);
}

export function parsePrismaAdvisoryLockIdFromEngineText(text) {
  const matches = [...String(text || '').matchAll(/pg_advisory_lock\((\d+)\)/g)].map(
    (match) => match[1],
  );
  if (matches.length === 0) {
    return { ok: false, reason: 'advisory_lock_sql_not_found', lock_id: null };
  }
  const unique = [...new Set(matches)];
  if (unique.length !== 1) {
    return { ok: false, reason: 'advisory_lock_id_ambiguous', lock_id: null };
  }
  const lockId = Number(unique[0]);
  if (!Number.isSafeInteger(lockId) || lockId <= 0) {
    return { ok: false, reason: 'advisory_lock_id_invalid', lock_id: null };
  }
  return { ok: true, reason: 'schema_engine_pg_advisory_lock', lock_id: lockId };
}

export function prismaAdvisoryLockColumns(lockId) {
  const id = BigInt(lockId);
  return {
    classid: Number(id >> 32n),
    objid: Number(id & 0xffffffffn),
    objsubid: PRISMA_ADVISORY_LOCK_OBJSUBID,
  };
}

export function discoverPrismaMigrateAdvisoryLock(root = ROOT) {
  const enginesDir = path.join(root, 'node_modules', '@prisma', 'engines');
  const prismaPkg = path.join(root, 'node_modules', 'prisma', 'package.json');
  let prisma_version = null;
  if (existsSync(prismaPkg)) {
    try {
      prisma_version = JSON.parse(readFileSync(prismaPkg, 'utf8')).version || null;
    } catch {
      prisma_version = null;
    }
  }
  if (!existsSync(enginesDir)) {
    return {
      ok: false,
      reason: 'prisma_engines_missing',
      lock_id: null,
      prisma_version,
    };
  }
  const files = readdirSync(enginesDir).filter((name) => name.startsWith('schema-engine'));
  if (files.length === 0) {
    return {
      ok: false,
      reason: 'schema_engine_missing',
      lock_id: null,
      prisma_version,
    };
  }
  const chunks = files.map((name) =>
    readFileSync(path.join(enginesDir, name), { encoding: 'latin1' }),
  );
  const parsed = parsePrismaAdvisoryLockIdFromEngineText(chunks.join('\n'));
  if (!parsed.ok) {
    return { ...parsed, prisma_version };
  }
  return {
    ...parsed,
    ...prismaAdvisoryLockColumns(parsed.lock_id),
    prisma_version,
    p1002_timeout_ms_observed: P1002_TIMEOUT_MS_OBSERVED,
  };
}

export function sanitizeApplicationLabel(value) {
  const cleaned = redactSecrets(String(value || '').replace(/[\r\n\t]+/g, ' ').trim());
  if (!cleaned) return '';
  return cleaned.length > 80 ? cleaned.slice(0, 80) : cleaned;
}

export function classifyLockQueryError(message) {
  const text = String(message || '');
  if (/permission denied|must be owner|insufficient privilege|pg_stat_activity|pg_locks/i.test(text)) {
    return { reason: 'session_inspect_permission_denied' };
  }
  return { reason: 'lock_query_failed' };
}

function intOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

export function classifyAdvisoryLockRow(row, selfPid) {
  const granted = Boolean(row?.granted);
  const state = String(row?.state || '');
  let activity = 'unknown';
  if (state === 'active') activity = 'active';
  else if (state === 'idle in transaction') activity = 'idle_in_transaction';
  else if (state === 'idle in transaction (aborted)') activity = 'idle_in_transaction_aborted';
  else if (state === 'idle') activity = 'idle';
  const pid = intOrNull(row?.pid);
  return {
    pid,
    granted,
    occupancy: granted ? 'holder' : 'waiter',
    mode: String(row?.mode || ''),
    state,
    activity,
    wait_event_type: String(row?.wait_event_type || ''),
    wait_event: String(row?.wait_event || ''),
    application_label: sanitizeApplicationLabel(row?.application_name),
    backend_type: String(row?.backend_type || ''),
    backend_start: parseExactBackendStart(row?.backend_start),
    session_age_seconds: intOrNull(row?.session_age_seconds),
    xact_age_seconds: intOrNull(row?.xact_age_seconds),
    state_age_seconds: intOrNull(row?.state_age_seconds),
    is_this_session: pid !== null && Number(selfPid) === pid,
    role_matches_current: Boolean(row?.role_matches_current),
    database_matches_current: Boolean(row?.database_matches_current),
  };
}

export function publicLockReport(input = {}) {
  const discovery = input.discovery || { ok: false, reason: 'lock_id_unverified', lock_id: null };
  if (!discovery.ok) {
    return {
      ok: false,
      reason: discovery.reason || 'lock_id_unverified',
      lock_id: null,
      prisma_version: discovery.prisma_version || null,
      holders: [],
      waiters: [],
      occupancy: 'unverified',
      recommendation: 'do_not_retry_unverified_lock_id',
    };
  }
  if (input.queryError) {
    const classified = classifyLockQueryError(input.queryError);
    return {
      ok: false,
      reason: classified.reason,
      lock_id: discovery.lock_id,
      prisma_version: discovery.prisma_version || null,
      holders: [],
      waiters: [],
      occupancy: 'inspect_unavailable',
      recommendation: 'report_access_limitation_no_session_mutation',
    };
  }
  const classifiedRows = (input.rows || []).map((row) => classifyAdvisoryLockRow(row, input.selfPid));
  const holders = classifiedRows.filter((row) => row.granted);
  const waiters = classifiedRows.filter((row) => !row.granted);
  let occupancy = 'absent';
  if (holders.length > 0) {
    if (holders.some((row) => row.activity === 'active')) occupancy = 'held_active';
    else if (holders.some((row) => row.activity.startsWith('idle_in_transaction'))) {
      occupancy = 'held_idle_in_transaction';
    } else occupancy = 'held_idle';
  } else if (waiters.length > 0) {
    occupancy = 'waiters_only';
  }
  const recommendation =
    occupancy === 'absent'
      ? 'recheck_history_then_gated_execute_under_original_approval'
      : 'identify_holder_gated_decision_no_terminate';
  return {
    ok: true,
    reason: occupancy,
    lock_id: discovery.lock_id,
    prisma_version: discovery.prisma_version || null,
    p1002_timeout_ms_observed: P1002_TIMEOUT_MS_OBSERVED,
    holders,
    waiters,
    occupancy,
    recommendation,
    current_database_scoped: true,
  };
}

export function inspectLockQuerySql(sql) {
  const text = String(sql || '');
  const failures = [];
  if (
    !/l\.database\s*=\s*\(\s*SELECT oid FROM pg_database WHERE datname\s*=\s*current_database\(\)\s*\)/.test(
      text,
    )
  ) {
    failures.push('missing_database_oid_filter');
  }
  if (!/locktype = 'advisory'/.test(text)) failures.push('missing_advisory_locktype');
  if (!/to_char\(a\.backend_start AT TIME ZONE 'UTC'/.test(text) || !/HH24:MI:SS\.US/.test(text)) {
    failures.push('missing_exact_backend_start');
  }
  if (/backend_start_epoch/.test(text) || /EXTRACT\(EPOCH FROM a\.backend_start\)::bigint/.test(text)) {
    failures.push('coarse_backend_start_epoch');
  }
  if (/a\.query\b/.test(text)) failures.push('selects_query_text');
  if (/pg_terminate_backend/.test(text)) failures.push('contains_terminate_backend');
  return { ok: failures.length === 0, failures };
}

export function evaluateDiagnoseOutcome(lock) {
  if (!lock || lock.ok !== true) {
    return {
      ok: false,
      reason: lock?.reason || 'lock_inspect_failed',
      occupancy: lock?.occupancy || 'inspect_unavailable',
    };
  }
  return { ok: true, reason: lock.occupancy, occupancy: lock.occupancy };
}

export function parsePositiveInt(value) {
  const raw = String(value ?? '').trim();
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const num = Number(raw);
  return Number.isSafeInteger(num) ? num : null;
}

export function parseExactBackendStart(value) {
  const raw = String(value ?? '').trim();
  if (!BACKEND_START_UTC_RE.test(raw)) return null;
  return raw;
}

export function assessPoolerHolder(applicationLabel) {
  const label = sanitizeApplicationLabel(applicationLabel).toLowerCase();
  const matches_pgbouncer_label = label === RECOGNISED_POOLER_APPLICATION_LABEL;
  return {
    matches_pgbouncer_label,
    likely_neon_transaction_pooler_backend: matches_pgbouncer_label,
    session_advisory_lock_can_outlive_client_transaction: matches_pgbouncer_label,
    terminate_kills_one_postgres_backend_not_cluster: true,
    may_disconnect_client_currently_assigned_that_backend: true,
    does_not_restart_neon: true,
    ownership_certain_enough_to_consider: matches_pgbouncer_label,
  };
}

export function evaluateReleaseGuard(input = {}) {
  const mode = String(input.mode || '').trim();
  const failures = [];
  if (!RELEASE_MODES.includes(mode)) failures.push('invalid_release_mode');
  const pid = parsePositiveInt(input.confirmPid);
  const backendStart = parseExactBackendStart(
    input.confirmBackendStart ?? input.confirmBackendStartEpoch,
  );
  if (pid === null) failures.push('missing_or_invalid_confirm_pid');
  if (backendStart === null) failures.push('missing_or_invalid_confirm_backend_start');
  const terminate = String(input.confirmTerminate || '').trim();
  if (mode === 'release_preview' && terminate) {
    failures.push('terminate_confirm_not_allowed_in_preview');
  }
  if (mode === 'release_lock' && terminate !== TERMINATE_ONE_SESSION_CONFIRM) {
    failures.push('confirm_terminate_mismatch');
  }
  return {
    ok: failures.length === 0,
    failures,
    mode: RELEASE_MODES.includes(mode) ? mode : null,
    confirm_pid: pid,
    confirm_backend_start: backendStart,
    mutation_requested: mode === 'release_lock' && terminate === TERMINATE_ONE_SESSION_CONFIRM,
  };
}

export function evaluateReleaseCandidate(lock, target = {}, identity = {}) {
  const failures = [];
  const pooler = assessPoolerHolder(lock?.holders?.[0]?.application_label);
  if (!lock || lock.ok !== true) {
    return {
      ok: false,
      failures: ['lock_inspect_failed'],
      pooler,
      holder: null,
    };
  }
  if (lock.lock_id !== EXPECTED_PRISMA_ADVISORY_LOCK_ID) failures.push('lock_id_mismatch');
  if (lock.current_database_scoped !== true) failures.push('lock_not_database_scoped');
  if (identity.database && identity.database !== EXPECTED_DATABASE) {
    failures.push('unexpected_database');
  }
  if (identity.role && identity.role !== EXPECTED_ROLE) failures.push('unexpected_role');
  if (identity.database_oid !== undefined && identity.database_oid !== null) {
    const oid = intOrNull(identity.database_oid);
    if (oid === null || oid <= 0) failures.push('database_oid_unverified');
  } else {
    failures.push('database_oid_unverified');
  }
  const holders = lock.holders || [];
  const waiters = lock.waiters || [];
  if (holders.length !== 1) failures.push('holder_count_not_one');
  if (waiters.length !== 0) failures.push('waiters_present');
  const holder = holders.length === 1 ? holders[0] : null;
  if (!holder) {
    return { ok: false, failures, pooler, holder: null };
  }
  const expectedPid = parsePositiveInt(target.pid);
  const expectedStart = parseExactBackendStart(target.backend_start ?? target.backend_start_epoch);
  if (expectedPid === null || holder.pid !== expectedPid) failures.push('pid_mismatch');
  if (expectedStart === null || holder.backend_start !== expectedStart) {
    failures.push('backend_start_mismatch');
  }
  if (holder.is_this_session) failures.push('would_terminate_self');
  if (holder.activity !== 'idle' || holder.state !== 'idle') failures.push('holder_not_idle');
  if (holder.xact_age_seconds !== null) failures.push('holder_has_open_transaction');
  if (!holder.database_matches_current) failures.push('holder_database_mismatch');
  if (!holder.role_matches_current) failures.push('holder_role_mismatch');
  if (!pooler.ownership_certain_enough_to_consider) {
    failures.push('holder_application_uncertain');
  }
  return {
    ok: failures.length === 0,
    failures,
    pooler,
    holder,
    lock_id: lock.lock_id,
  };
}

export function evaluateFreshReleaseIdentity(first, second) {
  const failures = [];
  if (!first?.ok) failures.push('first_identification_failed');
  if (!second?.ok) failures.push('second_identification_failed');
  if (first?.holder?.pid !== second?.holder?.pid) failures.push('pid_changed');
  if (first?.holder?.backend_start !== second?.holder?.backend_start) {
    failures.push('backend_start_changed');
  }
  return { ok: failures.length === 0, failures };
}

export function sessionFingerprint(pid, backendStart) {
  const parsedPid = parsePositiveInt(pid);
  const parsedStart = parseExactBackendStart(backendStart);
  if (parsedPid === null || parsedStart === null) return null;
  return createHash('sha256').update(`${parsedPid}:${parsedStart}`, 'utf8').digest('hex').slice(0, 16);
}

export function publicHolderLogView(holder) {
  if (!holder) return null;
  return {
    granted: holder.granted,
    occupancy: holder.occupancy,
    mode: holder.mode,
    state: holder.state,
    activity: holder.activity,
    wait_event_type: holder.wait_event_type,
    wait_event: holder.wait_event,
    application_label: holder.application_label,
    backend_type: holder.backend_type,
    backend_start: holder.backend_start,
    session_age_seconds: holder.session_age_seconds,
    xact_age_seconds: holder.xact_age_seconds,
    state_age_seconds: holder.state_age_seconds,
    is_this_session: holder.is_this_session,
    role_matches_current: holder.role_matches_current,
    database_matches_current: holder.database_matches_current,
    pid_present: holder.pid !== null && holder.pid !== undefined,
    pid_fingerprint: sessionFingerprint(holder.pid, holder.backend_start),
  };
}

export function publicLockLogView(lock) {
  if (!lock) return null;
  return {
    ok: lock.ok,
    reason: lock.reason,
    lock_id: lock.lock_id,
    prisma_version: lock.prisma_version || null,
    p1002_timeout_ms_observed: lock.p1002_timeout_ms_observed,
    occupancy: lock.occupancy,
    recommendation: lock.recommendation,
    current_database_scoped: lock.current_database_scoped,
    holders: (lock.holders || []).map(publicHolderLogView),
    waiters: (lock.waiters || []).map(publicHolderLogView),
  };
}

export function publicCandidateLogView(candidate) {
  if (!candidate) return null;
  return {
    ok: candidate.ok,
    failures: candidate.failures,
    pooler: candidate.pooler,
    lock_id: candidate.lock_id,
    holder: publicHolderLogView(candidate.holder),
  };
}

export function publicReleaseAttemptLogView(attempt) {
  if (!attempt) return null;
  return {
    first: publicCandidateLogView(attempt.first),
    second: publicCandidateLogView(attempt.second),
    fresh: {
      ok: Boolean(attempt.fresh?.ok),
      failures: attempt.fresh?.failures || [],
    },
  };
}

export function publicReleaseGuardLogView(guard) {
  if (!guard) return null;
  return {
    ok: Boolean(guard.ok),
    failures: guard.failures || [],
    mode: guard.mode || null,
    mutation_requested: Boolean(guard.mutation_requested),
    confirm_pid_present: guard.confirm_pid !== null && guard.confirm_pid !== undefined,
    confirm_backend_start_present: Boolean(parseExactBackendStart(guard.confirm_backend_start)),
    pid_fingerprint: sessionFingerprint(guard.confirm_pid, guard.confirm_backend_start),
  };
}

export function publicTerminateLogView(outcome) {
  if (!outcome) return null;
  return {
    ok: Boolean(outcome.ok),
    terminated: Boolean(outcome.terminated),
    reason: outcome.reason || null,
    row_count: intOrNull(outcome.row_count),
  };
}

export function buildGuardedTerminateParams(discovery, target = {}, identity = {}) {
  const failures = [];
  if (discovery?.ok !== true || discovery.lock_id !== EXPECTED_PRISMA_ADVISORY_LOCK_ID) {
    failures.push('lock_id_unverified');
  }
  const pid = parsePositiveInt(target.pid);
  const backendStart = parseExactBackendStart(target.backend_start ?? target.backend_start_epoch);
  const databaseOid = intOrNull(identity.database_oid);
  if (pid === null) failures.push('missing_or_invalid_confirm_pid');
  if (backendStart === null) failures.push('missing_or_invalid_confirm_backend_start');
  if (databaseOid === null || databaseOid <= 0) failures.push('database_oid_unverified');
  if (identity.database && identity.database !== EXPECTED_DATABASE) {
    failures.push('unexpected_database');
  }
  if (identity.role && identity.role !== EXPECTED_ROLE) failures.push('unexpected_role');
  if (failures.length > 0) {
    return { ok: false, failures, values: null };
  }
  const columns = prismaAdvisoryLockColumns(discovery.lock_id);
  return {
    ok: true,
    failures: [],
    values: [
      columns.classid,
      columns.objid,
      columns.objsubid,
      pid,
      backendStart,
      databaseOid,
      EXPECTED_DATABASE,
      EXPECTED_ROLE,
      RECOGNISED_POOLER_APPLICATION_LABEL,
    ],
  };
}

export function evaluateGuardedTerminateOutcome(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    return {
      ok: false,
      terminated: false,
      reason: 'no_matching_session',
      row_count: 0,
    };
  }
  if (list.length !== 1) {
    return {
      ok: false,
      terminated: false,
      reason: 'ambiguous_terminate_result',
      row_count: list.length,
    };
  }
  if (list[0]?.terminated !== true) {
    return {
      ok: false,
      terminated: false,
      reason: 'terminate_returned_false',
      row_count: 1,
    };
  }
  return {
    ok: true,
    terminated: true,
    reason: 'terminated_one_session',
    row_count: 1,
  };
}

export function inspectGuardedTerminateSql(sql) {
  const text = String(sql || '');
  const failures = [];
  if (
    !/l\.database\s*=\s*\(\s*SELECT oid FROM pg_database WHERE datname\s*=\s*current_database\(\)\s*\)/.test(
      text,
    )
  ) {
    failures.push('missing_database_oid_filter');
  }
  if (!/locktype = 'advisory'/.test(text)) failures.push('missing_advisory_locktype');
  if (!/\$1::int/.test(text) || !/\$2::int/.test(text) || !/\$3::int/.test(text)) {
    failures.push('missing_lock_key_params');
  }
  if (!/\$4::int/.test(text)) failures.push('missing_pid_param');
  if (!/\$5::text/.test(text) || !/to_char\(a\.backend_start AT TIME ZONE 'UTC'/.test(text)) {
    failures.push('missing_backend_start_predicate');
  }
  if (/\$5::bigint/.test(text) || /EXTRACT\(EPOCH FROM a\.backend_start\)::bigint/.test(text)) {
    failures.push('coarse_backend_start_epoch');
  }
  if (!/\$6::oid/.test(text)) failures.push('missing_oid_param');
  if (!/\$7::text/.test(text) || !/\$8::text/.test(text)) {
    failures.push('missing_database_role_params');
  }
  if (!/a\.state = 'idle'/.test(text)) failures.push('missing_idle_predicate');
  if (!/a\.xact_start IS NULL/.test(text)) failures.push('missing_xact_null_predicate');
  if (!/IS DISTINCT FROM pg_backend_pid\(\)/.test(text)) failures.push('missing_self_guard');
  if (!/COUNT\(\*\)::int FROM scoped_locks WHERE granted IS TRUE\) = 1/.test(text)) {
    failures.push('missing_single_holder_gate');
  }
  if (!/COUNT\(\*\)::int FROM scoped_locks WHERE granted IS NOT TRUE\) = 0/.test(text)) {
    failures.push('missing_zero_waiters_gate');
  }
  if (!/COUNT\(\*\)::int FROM candidate\) = 1/.test(text)) {
    failures.push('missing_single_candidate_gate');
  }
  if (!/pg_terminate_backend\(gate\.pid\)/.test(text)) {
    failures.push('terminate_not_gated');
  }
  if (/pg_terminate_backend\(\$1::int\)/.test(text)) {
    failures.push('bare_pid_terminate');
  }
  if (!/application_name = \$9::text/.test(text)) {
    failures.push('missing_application_label_predicate');
  }
  if (/WHERE a\.application_name = \$9::text\s*$/m.test(text) && !/\$4::int/.test(text)) {
    failures.push('terminate_by_application_label');
  }
  if (/a\.query\b/.test(text)) failures.push('selects_query_text');
  if (/pg_advisory_unlock/.test(text)) failures.push('contains_advisory_unlock');
  return { ok: failures.length === 0, failures };
}

export function inspectTerminateScript(verifySource, terminateSql = GUARDED_SINGLE_SESSION_TERMINATE_SQL) {
  const text = String(verifySource || '');
  const sqlInspect = inspectGuardedTerminateSql(terminateSql);
  const failures = [...sqlInspect.failures];
  if (!text.includes('GUARDED_SINGLE_SESSION_TERMINATE_SQL')) {
    failures.push('missing_parameterized_terminate');
  }
  if (!/buildGuardedTerminateParams/.test(text)) failures.push('missing_terminate_params_builder');
  if (!/evaluateGuardedTerminateOutcome/.test(text)) failures.push('missing_terminate_outcome_guard');
  if (!/evaluateReleaseCandidate/.test(text)) failures.push('missing_release_candidate_guard');
  if (!/evaluateFreshReleaseIdentity/.test(text)) failures.push('missing_fresh_identity_guard');
  if (!/publicReleaseGuardLogView/.test(text)) failures.push('missing_public_release_guard_log');
  if (/release_guard:\s*releaseGuard/.test(text)) failures.push('emits_raw_release_guard');
  if (/pg_advisory_unlock/.test(text)) failures.push('contains_advisory_unlock');
  if (/PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK/.test(text)) failures.push('disables_advisory_lock');
  return { ok: failures.length === 0, failures };
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
  requireMatch(/-\s*diagnose\s*$/m, 'diagnose_mode');
  requireMatch(/-\s*release_preview\s*$/m, 'release_preview_mode');
  requireMatch(/-\s*release_lock\s*$/m, 'release_lock_mode');
  requireMatch(/confirm_migration_id/, 'confirm_input');
  requireMatch(/confirm_pid/, 'confirm_pid_input');
  requireMatch(/confirm_backend_start:/, 'confirm_backend_start_input');
  forbidMatch(/confirm_backend_start_epoch/, 'coarse_backend_start_epoch_input');
  requireMatch(/confirm_terminate/, 'confirm_terminate_input');
  requireMatch(/terminate_one_session/, 'terminate_confirm_phrase');
  requireMatch(/cancel-in-progress:\s*false/, 'non_cancelling_concurrency');
  requireMatch(/github\.ref == 'refs\/heads\/main'/, 'execute_requires_main');
  requireMatch(/inputs\.mode != 'release_lock'/, 'release_lock_requires_main');
  forbidMatch(/prisma migrate deploy/, 'contains_migrate_deploy');
  forbidMatch(/prisma db push/, 'contains_db_push');
  forbidMatch(/prisma migrate reset/, 'contains_migrate_reset');
  forbidMatch(/pg_terminate_backend/, 'contains_terminate_backend');
  forbidMatch(/pg_advisory_unlock/, 'contains_advisory_unlock');
  forbidMatch(/PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK/, 'disables_advisory_lock');
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
  if (mode === 'execute' || RELEASE_MODES.includes(mode)) {
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
