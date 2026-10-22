/**
 * Real disposable PostgreSQL verification for BAD buyer ownership.
 *
 * Skipped unless CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_PG=1 and
 * CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_URL name a loopback database whose name
 * contains "disposable". Refuses to start when POSTGRES_URL or DATABASE_URL
 * is present, when the URL has a password, or when the server is not local.
 * This file does not read the shared Core Postgres URL and does not enable
 * CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import {
  createPrismaBadBuyerOwnershipStore,
  isBadBuyerOwnershipDurableEnabled,
  resolveDurableBadBuyerOwnershipStore,
} from '../lib/server/paddle-sandbox/bad-buyer-ownership-durable.js';
import { handleBadBuyerOrderConfirmation } from '../lib/server/paddle-sandbox/bad-buyer-ownership-http.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = path.join(
  ROOT,
  'prisma/migrations/20261021140000_bad_purchase_ownership/migration.sql',
);
const ENABLED = process.env.CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_PG === '1';
const DISPOSABLE_URL = process.env.CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_URL || '';
const BRAND = 'business_admin_desk';
const BUYER_A = { auth_user_id: 'auth-buyer-a', tenant_id: 'tenant-bad', brand: BRAND };
const BUYER_B = { auth_user_id: 'auth-buyer-b', tenant_id: 'tenant-bad', brand: BRAND };
const EMPTY_ROLLBACK_SQL = `
DROP TRIGGER IF EXISTS "bad_purchase_ownership_terminal_guard" ON "bad_purchase_ownership";
DROP FUNCTION IF EXISTS bad_purchase_ownership_keep_terminal();
DROP TABLE IF EXISTS "bad_purchase_webhook_events";
DROP TABLE IF EXISTS "bad_purchase_unbound_reversals";
DROP TABLE IF EXISTS "bad_purchase_ownership";
`;

function safe(value) {
  return String(value || '')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-url]')
    .replace(/password\s*[:=]\s*\S+/gi, 'password=[redacted]');
}

function assertIsolatedTarget(url) {
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL) {
    throw new Error('REFUSING_SHARED_DATABASE_ENV');
  }
  if (process.env.CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE === '1') {
    throw new Error('REFUSING_DURABLE_FLAG_ENABLED');
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('REFUSING_UNPARSEABLE_DISPOSABLE_URL');
  }
  const host = parsed.hostname;
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new Error('REFUSING_NON_LOOPBACK_DATABASE');
  }
  if (parsed.password) throw new Error('REFUSING_URL_WITH_EMBEDDED_PASSWORD');
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database.includes('disposable')) throw new Error('REFUSING_NON_DISPOSABLE_DATABASE_NAME');
  if (parsed.username !== 'bad_verify_local') throw new Error('REFUSING_UNEXPECTED_DATABASE_ROLE');
  return {
    host,
    database,
    user: parsed.username,
    port: parsed.port || '5432',
  };
}

function clientFor(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('connection_limit', '1');
  return new PrismaClient({ datasourceUrl: parsed.toString() });
}

function psql(target, sql, { expectFailure = false, tuplesOnly = false } = {}) {
  const args = ['-X', '-v', 'ON_ERROR_STOP=1'];
  if (tuplesOnly) args.push('-t', '-A');
  const result = spawnSync('psql', args, {
    input: sql,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      PGHOST: target.host,
      PGPORT: target.port,
      PGUSER: target.user,
      PGDATABASE: target.database,
      PGOPTIONS: '-c statement_timeout=15000',
    },
  });
  if (expectFailure) {
    if (result.status === 0) throw new Error(`EXPECTED_SQL_FAILURE:${safe(sql).slice(0, 120)}`);
    return safe(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`PSQL_FAILED:${safe(result.stderr)}`);
  }
  return result.stdout;
}

function psqlJson(target, sql) {
  const stdout = psql(target, `SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json)::text FROM (${sql}) q;`, {
    tuplesOnly: true,
  });
  const line = stdout.trim();
  if (!line) return [];
  return JSON.parse(line);
}

function tables(target) {
  return psqlJson(
    target,
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  ).map((row) => row.table_name);
}

function num(value) {
  if (typeof value === 'bigint') return Number(value);
  return Number(value);
}

async function counts(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT
      (SELECT count(*) FROM bad_purchase_ownership) AS ownership,
      (SELECT count(*) FROM bad_purchase_unbound_reversals) AS unbound,
      (SELECT count(*) FROM bad_purchase_webhook_events) AS events,
      (SELECT count(*) FROM auth_users) AS auth_users,
      (SELECT count(*) FROM disposable_schema_sentinel) AS sentinel
  `;
  const row = rows[0];
  return {
    ownership: num(row.ownership),
    unbound: num(row.unbound),
    events: num(row.events),
    auth_users: num(row.auth_users),
    sentinel: num(row.sentinel),
  };
}

async function ownershipByIntent(prisma, intentId) {
  const rows = await prisma.badPurchaseOwnership.findMany({
    where: { checkoutIntentId: intentId },
  });
  return rows;
}

function purchase(id, transactionId, owner = BUYER_A) {
  return {
    checkout_intent_id: id,
    order_confirmation_ref: `OC-${id}`,
    paddle_transaction_id: transactionId,
    owner,
  };
}

function completed(eventId, transactionId, occurredAt) {
  return {
    eventId,
    eventType: 'transaction.completed',
    occurredAt,
    data: {
      id: transactionId,
      status: 'completed',
      customData: { brand: BRAND, email: 'ignored@example.test' },
    },
  };
}

function refund(eventId, transactionId, occurredAt) {
  return {
    eventId,
    eventType: 'adjustment.created',
    occurredAt,
    data: {
      id: `adj-${eventId}`,
      transactionId,
      action: 'refund',
    },
  };
}

function confirmation(id) {
  return { name: `OC-${id}`, html: '<p>synthetic confirmation</p>' };
}

function outcome(settled) {
  if (settled.status === 'fulfilled') {
    return { ok: true, value: settled.value };
  }
  return { ok: false, code: settled.reason?.code || 'ERROR', message: safe(settled.reason?.message) };
}

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function assertRefundStaysTerminal(row, label) {
  assert.equal(row?.status, 'refunded', label);
  assert.equal(row?.fulfilmentEntitled, false, label);
  assert.ok(row?.refundedAt, label);
  assert.equal(JSON.stringify(row).includes('<p>'), false, label);
}

test(
  'disposable PostgreSQL enforces BAD buyer ownership under real concurrent connections',
  { skip: !ENABLED && 'set CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_PG=1 with a loopback disposable URL', timeout: 120000 },
  async () => {
    const target = assertIsolatedTarget(DISPOSABLE_URL);
    let left = clientFor(DISPOSABLE_URL);
    let right = clientFor(DISPOSABLE_URL);
    const evidence = {
      isolation: null,
      versions: null,
      migration: null,
      empty_rollback: null,
      scenarios: [],
      invariants: null,
      flag_off_preserves_rows: null,
    };
    try {
      const identity = await left.$queryRaw`
        SELECT current_database() AS database,
               current_user AS role,
               host(inet_server_addr()) AS addr,
               inet_server_port()::int AS port,
               current_setting('listen_addresses') AS listen,
               current_setting('server_version') AS server_version,
               (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser
      `;
      const who = identity[0];
      assert.equal(who.database, target.database);
      assert.equal(who.role, 'bad_verify_local');
      assert.equal(who.superuser, false);
      assert.ok(who.addr === '127.0.0.1' || who.addr === '::1');
      assert.ok(who.listen === 'localhost' || who.listen === '127.0.0.1');
      const other = psql(
        { ...target, database: 'postgres' },
        'SELECT current_database();',
        { expectFailure: true },
      );
      assert.match(other, /no password supplied|password authentication failed|no pg_hba.conf entry/i);

      const release = { resolve: () => {} };
      const started = new Promise((resolve) => {
        release.resolve = resolve;
      });
      const leftPidPromise = left.$transaction(async (tx) => {
        const rows = await tx.$queryRaw`SELECT pg_backend_pid()::int AS pid`;
        release.resolve();
        await new Promise((resolve) => setTimeout(resolve, 400));
        return num(rows[0].pid);
      });
      await started;
      const rightPid = num((await right.$queryRaw`SELECT pg_backend_pid()::int AS pid`)[0].pid);
      const leftPid = await leftPidPromise;
      assert.notEqual(leftPid, rightPid);

      const prismaPkg = JSON.parse(readFileSync(path.join(ROOT, 'node_modules/@prisma/client/package.json'), 'utf8'));
      evidence.versions = {
        postgres: who.server_version,
        prisma_client: prismaPkg.version,
        node: process.version,
      };
      evidence.isolation = {
        database: who.database,
        role: who.role,
        addr: who.addr,
        port: num(who.port),
        listen: who.listen,
        superuser: false,
        shared_postgres_url_present: false,
        other_database_connect: 'DENIED',
        independent_backend_pids: [leftPid, rightPid],
        durable_flag: process.env.CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE || 'unset',
      };

      psql(target, `
        DROP TABLE IF EXISTS "bad_purchase_webhook_events";
        DROP TABLE IF EXISTS "bad_purchase_unbound_reversals";
        DROP TABLE IF EXISTS "bad_purchase_ownership" CASCADE;
        DROP FUNCTION IF EXISTS bad_purchase_ownership_keep_terminal();
        DROP TABLE IF EXISTS disposable_schema_sentinel;
        DROP TABLE IF EXISTS auth_users;
      `);
      psql(target, `
        CREATE TABLE auth_users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          level TEXT NOT NULL,
          tenant_id TEXT,
          enabled BOOLEAN NOT NULL DEFAULT true,
          factory_master BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMPTZ
        );
        INSERT INTO auth_users (id, username, password_hash, password_salt, level, tenant_id)
        VALUES
          ('auth-buyer-a', 'buyer-a', 'synthetic-not-a-secret', 'synthetic-not-a-secret', 'client', 'tenant-bad'),
          ('auth-buyer-b', 'buyer-b', 'synthetic-not-a-secret', 'synthetic-not-a-secret', 'client', 'tenant-bad');
        CREATE TABLE disposable_schema_sentinel (
          id INTEGER PRIMARY KEY,
          note TEXT NOT NULL
        );
        INSERT INTO disposable_schema_sentinel (id, note) VALUES (1, 'unrelated-before-migration');
      `);
      const before = tables(target);
      assert.deepEqual(before, ['auth_users', 'disposable_schema_sentinel']);
      psql(target, readFileSync(MIGRATION, 'utf8'));
      const after = tables(target);
      assert.deepEqual(after, [
        'auth_users',
        'bad_purchase_ownership',
        'bad_purchase_unbound_reversals',
        'bad_purchase_webhook_events',
        'disposable_schema_sentinel',
      ]);
      const sentinelBefore = psql(target, "SELECT note FROM disposable_schema_sentinel WHERE id = 1;").trim();
      const indexes = psqlJson(
        target,
        `SELECT indexname FROM pg_indexes
         WHERE schemaname = 'public' AND tablename LIKE 'bad_purchase%'
         ORDER BY indexname`,
      ).map((row) => row.indexname);
      for (const name of [
        'bad_purchase_ownership_checkout_intent_id_key',
        'bad_purchase_ownership_order_confirmation_ref_key',
        'bad_purchase_ownership_paddle_transaction_id_key',
        'bad_purchase_unbound_reversals_paddle_transaction_id_key',
        'bad_purchase_webhook_events_event_id_key',
      ]) {
        assert.ok(indexes.includes(name), name);
      }
      const fk = psql(
        target,
        `SELECT pg_get_constraintdef(oid) FROM pg_constraint
         WHERE conname = 'bad_purchase_ownership_auth_user_id_fkey';`,
      );
      assert.match(fk, /REFERENCES auth_users\(id\)/);
      assert.match(fk, /ON DELETE RESTRICT/);
      const trigger = psql(
        target,
        `SELECT tgname FROM pg_trigger
         WHERE tgname = 'bad_purchase_ownership_terminal_guard' AND NOT tgisinternal;`,
      );
      assert.match(trigger, /bad_purchase_ownership_terminal_guard/);

      psql(target, `
        INSERT INTO bad_purchase_ownership (
          id, auth_user_id, tenant_id, brand, checkout_intent_id, order_confirmation_ref, status
        ) VALUES
          ('probe-1', 'auth-buyer-a', 'tenant-bad', 'business_admin_desk', 'probe-intent-1', 'OC-probe-1', 'draft'),
          ('probe-2', 'auth-buyer-a', 'tenant-bad', 'business_admin_desk', 'probe-intent-2', 'OC-probe-2', 'draft');
      `);
      const duplicateIntent = psql(target, `
        INSERT INTO bad_purchase_ownership (
          id, auth_user_id, tenant_id, brand, checkout_intent_id, order_confirmation_ref, status
        ) VALUES ('probe-3', 'auth-buyer-a', 'tenant-bad', 'business_admin_desk', 'probe-intent-1', 'OC-probe-3', 'draft');
      `, { expectFailure: true });
      assert.match(duplicateIntent, /23505|duplicate key/);
      const duplicateTxn = psql(target, `
        UPDATE bad_purchase_ownership SET paddle_transaction_id = 'txn-probe' WHERE id = 'probe-1';
        UPDATE bad_purchase_ownership SET paddle_transaction_id = 'txn-probe' WHERE id = 'probe-2';
      `, { expectFailure: true });
      assert.match(duplicateTxn, /23505|duplicate key/);
      const badBrand = psql(target, `
        INSERT INTO bad_purchase_ownership (
          id, auth_user_id, tenant_id, brand, checkout_intent_id, order_confirmation_ref, status
        ) VALUES ('probe-4', 'auth-buyer-a', 'tenant-bad', 'other_brand', 'probe-intent-4', 'OC-probe-4', 'draft');
      `, { expectFailure: true });
      assert.match(badBrand, /23514|check constraint/);
      const missingUser = psql(target, `
        INSERT INTO bad_purchase_ownership (
          id, auth_user_id, tenant_id, brand, checkout_intent_id, order_confirmation_ref, status
        ) VALUES ('probe-5', 'missing-user', 'tenant-bad', 'business_admin_desk', 'probe-intent-5', 'OC-probe-5', 'draft');
      `, { expectFailure: true });
      assert.match(missingUser, /23503|foreign key/);
      psql(target, `
        UPDATE bad_purchase_ownership
        SET status = 'refunded', refunded_at = CURRENT_TIMESTAMP, fulfilment_entitled = true
        WHERE id = 'probe-1';
      `);
      const resurrect = psql(target, `
        UPDATE bad_purchase_ownership
        SET status = 'paid', fulfilment_entitled = true
        WHERE id = 'probe-1';
      `, { expectFailure: true });
      assert.match(resurrect, /bad_purchase_ownership_terminal/);
      const forcedEntitlement = psql(
        target,
        "SELECT status || ',' || fulfilment_entitled::text FROM bad_purchase_ownership WHERE id = 'probe-1';",
        { tuplesOnly: true },
      ).trim();
      assert.equal(forcedEntitlement, 'refunded,false');
      const replaceOwner = psql(target, `
        UPDATE bad_purchase_ownership SET auth_user_id = 'auth-buyer-b' WHERE id = 'probe-1';
      `, { expectFailure: true });
      assert.match(replaceOwner, /bad_purchase_ownership_immutable/);
      const clearRefund = psql(target, `
        UPDATE bad_purchase_ownership SET refunded_at = NULL WHERE id = 'probe-1';
      `, { expectFailure: true });
      assert.match(clearRefund, /bad_purchase_ownership_terminal/);
      const deleteUser = psql(target, `DELETE FROM auth_users WHERE id = 'auth-buyer-a';`, { expectFailure: true });
      assert.match(deleteUser, /23503|foreign key|restrict/i);
      const badUnbound = psql(target, `
        INSERT INTO bad_purchase_unbound_reversals (id, paddle_transaction_id, status)
        VALUES ('unb-bad', 'txn-unbound-bad', 'paid');
      `, { expectFailure: true });
      assert.match(badUnbound, /23514|check constraint/);
      psql(target, `
        INSERT INTO bad_purchase_webhook_events (id, event_id, event_type, outcome)
        VALUES ('evt-probe-1', 'evt-probe', 'transaction.completed', 'probe');
      `);
      const duplicateEvent = psql(target, `
        INSERT INTO bad_purchase_webhook_events (id, event_id, event_type, outcome)
        VALUES ('evt-probe-2', 'evt-probe', 'transaction.completed', 'probe');
      `, { expectFailure: true });
      assert.match(duplicateEvent, /23505|duplicate key/);

      psql(target, `
        DELETE FROM bad_purchase_webhook_events;
        DELETE FROM bad_purchase_unbound_reversals;
        DELETE FROM bad_purchase_ownership;
      `);
      assert.deepEqual(await counts(left), {
        ownership: 0,
        unbound: 0,
        events: 0,
        auth_users: 2,
        sentinel: 1,
      });
      psql(target, EMPTY_ROLLBACK_SQL);
      assert.deepEqual(tables(target), ['auth_users', 'disposable_schema_sentinel']);
      const sentinelAfterDrop = psql(target, "SELECT note FROM disposable_schema_sentinel WHERE id = 1;").trim();
      assert.match(sentinelBefore, /unrelated-before-migration/);
      assert.equal(sentinelAfterDrop.includes('unrelated-before-migration'), true);
      evidence.empty_rollback = {
        tables_after_drop: tables(target),
        sentinel_preserved: true,
        auth_users_preserved: true,
      };
      psql(target, readFileSync(MIGRATION, 'utf8'));
      assert.deepEqual(tables(target), after);
      const sentinelAfterReapply = psql(target, "SELECT note FROM disposable_schema_sentinel WHERE id = 1;", {
        tuplesOnly: true,
      }).trim();
      assert.equal(sentinelAfterReapply, 'unrelated-before-migration');
      await left.$disconnect();
      await right.$disconnect();
      const scenarioLeft = clientFor(DISPOSABLE_URL);
      const scenarioRight = clientFor(DISPOSABLE_URL);
      left = scenarioLeft;
      right = scenarioRight;
      evidence.migration = {
        applied_twice_on_disposable_database: true,
        added_tables: [
          'bad_purchase_ownership',
          'bad_purchase_unbound_reversals',
          'bad_purchase_webhook_events',
        ],
        unrelated_sentinel_unchanged: true,
        terminal_guard: true,
        auth_user_fk: 'ON DELETE RESTRICT',
      };

      const storeA = createPrismaBadBuyerOwnershipStore(left);
      const storeB = createPrismaBadBuyerOwnershipStore(right);

      async function recordScenario(name, fn) {
        const result = await fn();
        evidence.scenarios.push({ name, ...result });
        return result;
      }

      await recordScenario('1 payment completion and refund simultaneous', async () => {
        const id = 's1-intent';
        const txn = 's1-txn';
        await storeA.bindCheckoutIntent(purchase(id, txn));
        const settled = await Promise.allSettled([
          storeA.applyVerifiedWebhook(completed('s1-pay', txn, '2026-10-21T08:00:00Z')),
          storeB.applyVerifiedWebhook(refund('s1-refund', txn, '2026-10-21T08:00:01Z')),
        ]);
        const row = (await ownershipByIntent(left, id))[0];
        assertRefundStaysTerminal(row, 'scenario 1');
        assert.equal(await left.badPurchaseOwnership.count({ where: { paddleTransactionId: txn } }), 1);
        return { outcomes: settled.map(outcome), status: row.status, fulfilment_entitled: row.fulfilmentEntitled };
      });

      await recordScenario('2 refund arrives before payment completion', async () => {
        const id = 's2-intent';
        const txn = 's2-txn';
        await storeA.bindCheckoutIntent(purchase(id, txn));
        const refunded = await storeA.applyVerifiedWebhook(refund('s2-refund', txn, '2026-10-21T07:00:00Z'));
        const late = await storeB.applyVerifiedWebhook(completed('s2-pay', txn, '2026-10-21T08:00:00Z'));
        const row = (await ownershipByIntent(left, id))[0];
        assertRefundStaysTerminal(row, 'scenario 2');
        assert.equal(late.status, 'refunded');
        assert.equal(refunded.status, 'refunded');
        return { status: row.status, completion_status: late.status, completion_ignored: late.ignored };
      });

      await recordScenario('3 payment completion arrives after refund', async () => {
        const id = 's3-intent';
        const txn = 's3-txn';
        await storeA.bindCheckoutIntent(purchase(id, txn));
        await storeA.applyVerifiedWebhook(refund('s3-refund', txn, '2026-10-21T09:00:00Z'));
        const delayed = await storeB.applyVerifiedWebhook(completed('s3-pay', txn, '2026-10-21T12:00:00Z'));
        const issued = await storeA.issueOrderConfirmation({
          checkout_intent_id: id,
          owner: BUYER_A,
          confirmation: confirmation(id),
        });
        const row = (await ownershipByIntent(left, id))[0];
        assertRefundStaysTerminal(row, 'scenario 3');
        assert.equal(delayed.status, 'refunded');
        assert.equal(issued.code, 'ORDER_NOT_ISSUABLE');
        return { status: row.status, issue_code: issued.code };
      });

      await recordScenario('4 duplicate payment webhooks concurrent', async () => {
        const id = 's4-intent';
        const txn = 's4-txn';
        await storeA.bindCheckoutIntent(purchase(id, txn));
        const settled = await Promise.allSettled([
          storeA.applyVerifiedWebhook(completed('s4-pay', txn, '2026-10-21T08:00:00Z')),
          storeB.applyVerifiedWebhook(completed('s4-pay', txn, '2026-10-21T08:00:00Z')),
        ]);
        const row = (await ownershipByIntent(left, id))[0];
        const eventCount = await left.badPurchaseWebhookEvent.count({ where: { eventId: 's4-pay' } });
        const ownershipCount = await left.badPurchaseOwnership.count({ where: { paddleTransactionId: txn } });
        assert.equal(row.status, 'paid');
        assert.equal(eventCount, 1);
        assert.equal(ownershipCount, 1);
        const values = settled.map(outcome);
        assert.equal(values.filter((item) => item.ok && item.value?.deduped).length, 1);
        return { status: row.status, event_count: eventCount, ownership_count: ownershipCount };
      });

      await recordScenario('5 duplicate refund webhooks concurrent', async () => {
        const id = 's5-intent';
        const txn = 's5-txn';
        await storeA.bindCheckoutIntent(purchase(id, txn));
        await storeA.applyVerifiedWebhook(completed('s5-pay', txn, '2026-10-21T08:00:00Z'));
        const settled = await Promise.allSettled([
          storeA.applyVerifiedWebhook(refund('s5-refund', txn, '2026-10-21T09:00:00Z')),
          storeB.applyVerifiedWebhook(refund('s5-refund', txn, '2026-10-21T09:00:00Z')),
        ]);
        const row = (await ownershipByIntent(left, id))[0];
        const eventCount = await left.badPurchaseWebhookEvent.count({ where: { eventId: 's5-refund' } });
        assertRefundStaysTerminal(row, 'scenario 5');
        assert.equal(eventCount, 1);
        assert.equal(await left.badPurchaseOwnership.count({ where: { checkoutIntentId: id } }), 1);
        assert.equal(settled.map(outcome).filter((item) => item.ok && item.value?.deduped).length, 1);
        return { status: row.status, event_count: eventCount };
      });

      await recordScenario('6 refund before checkout ownership', async () => {
        const id = 's6-intent';
        const txn = 's6-txn';
        const early = await storeA.applyVerifiedWebhook(refund('s6-refund', txn, '2026-10-21T06:00:00Z'));
        assert.equal(await left.badPurchaseOwnership.count({ where: { paddleTransactionId: txn } }), 0);
        assert.equal(await left.badPurchaseUnboundReversal.count({ where: { paddleTransactionId: txn } }), 1);
        await storeB.bindCheckoutIntent(purchase(id, txn));
        const late = await storeA.applyVerifiedWebhook(completed('s6-pay', txn, '2026-10-21T08:00:00Z'));
        const row = (await ownershipByIntent(left, id))[0];
        assertRefundStaysTerminal(row, 'scenario 6');
        assert.equal(late.status, 'refunded');
        assert.equal(early.status, 'refunded');
        return { status: row.status, unbound_preserved: true };
      });

      await recordScenario('7 two buyers claim the same Paddle transaction', async () => {
        const txn = 's7-txn';
        const settled = await Promise.allSettled([
          storeA.bindCheckoutIntent(purchase('s7-intent-a', txn, BUYER_A)),
          storeB.bindCheckoutIntent(purchase('s7-intent-b', txn, BUYER_B)),
        ]);
        const values = settled.map(outcome);
        const wins = values.filter((item) => item.ok);
        const losses = values.filter((item) => !item.ok);
        assert.equal(wins.length, 1);
        assert.equal(losses.length, 1);
        assert.equal(losses[0].code, 'PADDLE_TRANSACTION_ALREADY_BOUND');
        const rows = await left.badPurchaseOwnership.findMany({ where: { paddleTransactionId: txn } });
        assert.equal(rows.length, 1);
        assert.equal(rows[0].authUserId, wins[0].value.owner.auth_user_id);
        return { owner: rows[0].authUserId, ownership_count: rows.length, loser: losses[0].code };
      });

      await recordScenario('8 two requests issue the same order confirmation', async () => {
        const id = 's8-intent';
        const txn = 's8-txn';
        await storeA.bindCheckoutIntent(purchase(id, txn));
        await storeA.applyVerifiedWebhook(completed('s8-pay', txn, '2026-10-21T08:00:00Z'));
        const settled = await Promise.allSettled([
          storeA.issueOrderConfirmation({ checkout_intent_id: id, owner: BUYER_A, confirmation: confirmation(id) }),
          storeB.issueOrderConfirmation({ checkout_intent_id: id, owner: BUYER_A, confirmation: confirmation(id) }),
        ]);
        const values = settled.map(outcome);
        const codes = values.map((item) => item.value?.code).sort();
        assert.deepEqual(codes, ['ISSUED', 'REPLAYED']);
        const rows = await ownershipByIntent(left, id);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].status, 'issued');
        assert.equal(rows[0].fulfilmentEntitled, true);
        assert.equal(await left.badPurchaseOwnership.count({ where: { orderConfirmationRef: `OC-${id}` } }), 1);
        return { codes, status: rows[0].status };
      });

      await recordScenario('9 unauthorised buyer cannot retrieve another confirmation', async () => {
        const id = 's9-intent';
        const txn = 's9-txn';
        await storeA.bindCheckoutIntent(purchase(id, txn));
        await storeA.applyVerifiedWebhook(completed('s9-pay', txn, '2026-10-21T08:00:00Z'));
        await storeA.issueOrderConfirmation({
          checkout_intent_id: id,
          owner: BUYER_A,
          confirmation: confirmation(id),
        });
        const other = await storeB.retrieveOrderConfirmation({ checkout_intent_id: id, owner: BUYER_B });
        const owner = await storeA.retrieveOrderConfirmation({ checkout_intent_id: id, owner: BUYER_A });
        assert.equal(other.code, 'FORBIDDEN');
        assert.equal(owner.code, 'RETRIEVED');
        assert.equal(JSON.stringify(owner).includes('<p>'), false);
        const denied = mockRes();
        await handleBadBuyerOrderConfirmation(
          { method: 'GET', query: { checkout_intent_id: id } },
          denied,
          {
            env: { CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE: '1' },
            ownership: storeB,
            allowInjectedSession: true,
            session: { ok: true, payload: { typ: 'tenant', user_id: BUYER_B.auth_user_id, tenant_id: BUYER_B.tenant_id } },
          },
        );
        assert.equal(denied.statusCode, 403);
        assert.equal(JSON.stringify(denied.body).includes('<p>'), false);
        const allowed = mockRes();
        await handleBadBuyerOrderConfirmation(
          { method: 'GET', query: { checkout_intent_id: id } },
          allowed,
          {
            env: { CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE: '1' },
            ownership: storeA,
            allowInjectedSession: true,
            session: { ok: true, payload: { typ: 'tenant', user_id: BUYER_A.auth_user_id, tenant_id: BUYER_A.tenant_id } },
          },
        );
        assert.equal(allowed.statusCode, 200);
        assert.equal(allowed.body.html, undefined);
        return { other: other.code, owner: owner.code, http_other: denied.statusCode, http_owner: allowed.statusCode };
      });

      await recordScenario('10 refunded order receives a delayed payment completion', async () => {
        const id = 's10-intent';
        const txn = 's10-txn';
        await storeA.bindCheckoutIntent(purchase(id, txn));
        await storeA.applyVerifiedWebhook(completed('s10-pay', txn, '2026-10-21T08:00:00Z'));
        await storeA.issueOrderConfirmation({
          checkout_intent_id: id,
          owner: BUYER_A,
          confirmation: confirmation(id),
        });
        await storeA.applyVerifiedWebhook(refund('s10-refund', txn, '2026-10-21T09:00:00Z'));
        const delayed = await storeB.applyVerifiedWebhook(completed('s10-pay-late', txn, '2026-10-21T15:00:00Z'));
        const row = (await ownershipByIntent(left, id))[0];
        const retrieved = await storeA.retrieveOrderConfirmation({ checkout_intent_id: id, owner: BUYER_A });
        assertRefundStaysTerminal(row, 'scenario 10');
        assert.equal(delayed.status, 'refunded');
        assert.equal(delayed.ignored, true);
        assert.equal(retrieved.code, 'NOT_FOUND');
        const direct = psql(target, `
          UPDATE bad_purchase_ownership
          SET status = 'paid', fulfilment_entitled = true, refunded_at = NULL
          WHERE checkout_intent_id = 's10-intent';
        `, { expectFailure: true });
        assert.match(direct, /bad_purchase_ownership_terminal/);
        const still = (await ownershipByIntent(left, id))[0];
        assertRefundStaysTerminal(still, 'scenario 10 direct sql');
        return { status: still.status, retrieve: retrieved.code, direct_sql: 'rejected' };
      });

      const finalCounts = await counts(left);
      const resurrected = await left.badPurchaseOwnership.count({
        where: {
          refundedAt: { not: null },
          status: { in: ['draft', 'paid', 'issued'] },
        },
      });
      const entitledTerminal = await left.badPurchaseOwnership.count({
        where: {
          fulfilmentEntitled: true,
          status: { in: ['refunded', 'revoked'] },
        },
      });
      assert.equal(resurrected, 0);
      assert.equal(entitledTerminal, 0);
      assert.equal(finalCounts.sentinel, 1);
      assert.equal(finalCounts.auth_users, 2);
      assert.equal(finalCounts.ownership, 10);
      assert.equal(finalCounts.unbound, 1);
      evidence.invariants = {
        refunded_rows_returned_to_paid: resurrected,
        terminal_rows_still_entitled: entitledTerminal,
        counts: finalCounts,
      };

      const beforeDisable = await counts(left);
      const disabled = mockRes();
      await handleBadBuyerOrderConfirmation(
        { method: 'GET', query: { checkout_intent_id: 's9-intent' } },
        disabled,
        {
          env: {},
          ownership: storeA,
          allowInjectedSession: true,
          session: { ok: true, payload: { typ: 'tenant', user_id: BUYER_A.auth_user_id, tenant_id: BUYER_A.tenant_id } },
        },
      );
      assert.equal(disabled.statusCode, 404);
      assert.equal(disabled.body.error, 'feature_disabled');
      assert.equal(isBadBuyerOwnershipDurableEnabled({}), false);
      assert.equal(resolveDurableBadBuyerOwnershipStore(left, {}), null);
      const afterDisable = await counts(left);
      assert.deepEqual(afterDisable, beforeDisable);
      assert.equal(tables(target).includes('bad_purchase_ownership'), true);
      evidence.flag_off_preserves_rows = {
        http: disabled.statusCode,
        error: disabled.body.error,
        counts_unchanged: true,
        tables_not_dropped: true,
      };
      console.log(`BAD_OWNERSHIP_PG_EVIDENCE ${JSON.stringify(evidence)}`);
    } finally {
      await left.$disconnect();
      await right.$disconnect();
    }
  },
);
