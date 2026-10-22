# BAD buyer ownership — prepared migration and rollback

**Status:** PREPARED / NOT APPLIED  
**Issue:** [#1509](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1509)  
**Parent programme:** [#1504](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1504)  
**Synthetic contract:** [#1507](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1507), merged PR #1508  
**Durable adapter:** merged PR #1510  
**Disposable Postgres concurrency + lock correction:** merged PR #1513 (`3548e8d21f0dac6773877314257ead2339da0ab7`)  
**Readiness probe:** 22 October 2026 (Africa/Johannesburg) — read-only against existing Core Neon `neondb`. **No DDL was executed.**

This document is the operator-facing rollout plan for the durable
`bad_purchase_ownership` relation. The SQL exists in the repository.
**It has not been applied to shared or production Postgres.**

## What this migration does

Adds three tables to the **existing** Core Postgres database (`POSTGRES_URL`):

| Table | Purpose |
|---|---|
| `bad_purchase_ownership` | Immutable authenticated buyer, tenant, brand, checkout intent, order confirmation reference, optional Paddle transaction, ERPNext order reference, payment/refund status, and reversal history |
| `bad_purchase_unbound_reversals` | Refund/revocation receipts that arrive before an authenticated bind |
| `bad_purchase_webhook_events` | Unique Paddle event IDs so duplicate/out-of-order deliveries cannot create a second order |

`paddle_transaction_id` is unique when present and **nullable** until a trusted
server-side purchase boundary associates the provider reference. Webhooks cannot
fill that gap from email, custom metadata, or a correlation ID.

No confirmation HTML, secrets, or browser-supplied identity are stored.

The SQL creates unique indexes, the `auth_users(id)` foreign key
(`ON DELETE RESTRICT`), brand/status checks, and a `BEFORE UPDATE` trigger that
rejects owner/intent replacement and any resurrection out of `refunded` /
`revoked`. It does not `ALTER` or `DROP` existing customer, tenant, listing, or
financial tables.

## Runtime gate (fail closed until authorised)

`CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` defaults off (`0` / unset).

While off:

- authenticated bind/retrieve routes return `404 feature_disabled`;
- verified Paddle webhooks continue to update the existing purchase outbox only;
- no ownership row is created.

These statements are **intentionally absent** from
`lib/server/postgres-ensure-schema-statements.js` so a Vercel Production build
cannot create the tables as a side effect of merge. Independently verified
22 October 2026: that file still has no `bad_purchase` statements.

## Cross-instance transitions

Durable writes do not use an in-process lock. Each bind, webhook, issuance,
and retrieval runs in one Postgres transaction that:

1. takes `pg_advisory_xact_lock` on the webhook event, checkout intent, and/or
   Paddle transaction **before** reading;
2. updates `bad_purchase_ownership` with a compare-and-set that cannot move a
   row out of `refunded` or `revoked`;
3. inserts the webhook receipt with `ON CONFLICT DO NOTHING`;
4. retries a deadlock or lost update at most three times, then fails closed.

Lock order is event, then intent, then transaction. The adapter never takes
an intent lock after a transaction lock. A database trigger in the prepared
migration rejects owner/intent replacement and any status transition out of a
tombstone, and forces `fulfilment_entitled` false while the row is terminal.

`pg_advisory_xact_lock` returns `void`. Prisma cannot read a `void` column, so
the adapter runs the lock inside a subquery and selects `1::int`. The lock is
still taken before the read. This was found on real PostgreSQL and is covered
by the disposable test below. **Merged on `main` via PR #1513.**

Two checks exist:

- `node-tests/paddle-bad-buyer-ownership-durable.test.mjs` simulates two connections. It runs in ordinary `npm test` and does not open a database.
- `node-tests/paddle-bad-buyer-ownership-disposable-pg.test.mjs` uses two independent PostgreSQL connections. It stays skipped unless `CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_PG=1` and `CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_URL` name a loopback database whose name contains `disposable`. It refuses to start when `POSTGRES_URL`, `DATABASE_URL`, or `PRISMA_DATABASE_URL` is present, when the URL contains a password, or when the server is not on loopback. These two names are local test switches only. Do not set them in Vercel or any shared environment.

Disposable verification on 21 October 2026 passed against a local PostgreSQL 16.15 database that listened only on `localhost`, with Prisma Client 6.19.2 and Node v22.23.3. Two backend process IDs proved the connections were independent. The shared Core database was not used. `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` stayed unset. Empty-table rollback removed only the three new tables. After rows existed, turning the feature off left the audit rows in place. That result does **not** approve applying the migration to shared or production Postgres.

## Verified target (read-only, 22 October 2026)

Independently verified against the injected Core `POSTGRES_URL` (shape only; no
URLs, credentials, or private rows recorded):

| Check | Result |
|---|---|
| Provider / host class | Neon (`*.neon.tech`), pooled (`-pooler`) |
| Database name | `neondb` (the existing Core database; not a second project) |
| PostgreSQL | `17.11` (read-write primary; not in recovery) |
| Live identity | Hostname rows for `lux.corpflowai.com` / `luxe.corpflowai.com` → `luxe-maurice`; `businessadmindesk.co.za` → `cipc-desk` with `mode=client_production` |
| Tenants present | `cipc-desk`, `corpflowai`, `living-word-mauritius`, `luxe-maurice` |
| Buyer-ownership tables | **Absent** (`bad_purchase_ownership`, `bad_purchase_unbound_reversals`, `bad_purchase_webhook_events`, trigger, function) |
| FK target | `auth_users.id` primary key exists |
| Privileges of the current Core role | `CREATE` on `public`; `SELECT` / `INSERT` / `UPDATE` / `REFERENCES` on `auth_users` |
| Vercel auto-DDL | Will **not** create these tables (absent from ensure-schema) |
| Feature flag | `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` unset in this probe environment |

This is the **current active shared Core database**. One Postgres serves
CorpFlowAI-hosted `corpflow_test` hosts **and** the Business Admin Desk
`client_production` hostname. There is no separate BAD database.

**Assumption (not independently proven this probe):** the six Vercel Production
aliases (`POSTGRES_URL`, `DIRECT_URL`, `POSTGRES_URL_NON_POOLING`, …) still all
point at this same Neon project. Shape checks remain as in
`docs/operations/POSTGRES_PROVIDER.md` §2. This probe used the pooled URL only.

Live factory pulse at probe time: `https://core.corpflowai.com/api/factory/production-pulse/runtime` reported `ok: true`, `database_reachable: true`. That proves connectivity, not schema.

## Prisma history conflict — do not use `migrate deploy`

`npx prisma migrate deploy` is **not** the approved apply path for this change.

Independently verified in `_prisma_migrations` on Core `neondb`:

1. **Failed unfinished row** `20260514120000_lux_listings` (`finished_at` null, logs class `already_exists`). Prisma P3009 will refuse every later migration until that row is resolved. `lux_listings` **does** exist. Remediation is documented in `docs/operations/POSTGRES_PROVIDER.md` §5b and is a **separate** operator approval. Do **not** fold it into this packet.
2. Repo migrations **not** recorded as applied, while related objects already exist via ensure-schema / earlier paths: `20260806120000_company_master_v1` (`company_master_companies` / `company_master_artifacts` present), `20260826042000_agent_relay_claims` (`agent_relay_claims` present), `20260929020000_client_context_fabric_v1` (table not found under that name this probe).
3. `20261021140000_bad_purchase_ownership` is **not** recorded (correct — not applied).

GitHub Actions `test.yml` still runs optional `prisma migrate deploy` when
Infisical supplies `POSTGRES_URL`. `continue-on-error: true` currently fails
closed on P3009. **Leave the failed `lux_listings` row in place** until a
dedicated hygiene packet reconciles history. Resolving it without first
applying and marking *this* ownership SQL would let CI attempt several pending
migrations at once.

## Backup / recovery — not yet proven for this project

Canonical status (`docs/operations/POSTGRES_PROVIDER.md` §6, unchanged this
probe): Neon Instant restore exists **as a product**. CorpFlowAI’s **this-project**
plan name, history window, and restore-button proof are **NOT PROVEN**. No Neon
API credential was available. restic/R2 does **not** dump this Postgres.

This is a **hard precondition** before execution. Anton must read the Neon
Console (project → Settings → Instant restore) and record **plan name** and
**history window** (hours or days). If the window is zero, do not migrate.
A restore click remains a later exact approval. Do not paste connection
strings into GitHub.

## Apply (separate target-specific approval required)

Do **not** run this section until Anton has (a) recorded the Neon restore
window and (b) explicitly approved **this** SQL against Core Neon `neondb`.

Do **not** enable `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE`, deploy for the
purpose of turning the buyer journey on, process live Paddle/ERPNext, or send
customer communications in the same step.

Approved mechanism: apply **only** the one SQL file on the **non-pooled**
Neon URL (`DIRECT_URL` / `POSTGRES_URL_NON_POOLING` from Infisical), then mark
that migration applied. Pooled PgBouncer is for runtime queries, not DDL.

### 1. Pre-migration backup confirmation

1. Neon Console → CorpFlowAI project → Settings → Instant restore.
2. Record plan name and history window. Stop if the window is zero.
3. Optional: create a Neon child branch from current state (no extra paid
   product; uses existing Neon). Not required if Instant restore window is
   confirmed and non-zero.

### 2. Pre-execution identity and schema checks (read-only)

From an operator machine, using the **non-pooled** URL loaded from Infisical
(never committed, never pasted into tickets):

```sql
SELECT current_database() AS database,
       split_part(version(), ' on ', 1) AS pg_version,
       pg_is_in_recovery() AS in_recovery;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'auth_users',
    'bad_purchase_ownership',
    'bad_purchase_unbound_reversals',
    'bad_purchase_webhook_events'
  )
ORDER BY table_name;

SELECT migration_name, finished_at IS NOT NULL AS finished,
       rolled_back_at IS NOT NULL AS rolled_back
FROM _prisma_migrations
WHERE migration_name IN (
  '20260514120000_lux_listings',
  '20261021140000_bad_purchase_ownership'
);

SELECT count(*)::int AS auth_users FROM auth_users;
SELECT count(*)::int AS tenants FROM tenants;
SELECT count(*)::int AS automation_events FROM automation_events;
```

Expected immediately before apply: database `neondb`; ownership tables
**absent**; `20261021140000_bad_purchase_ownership` **not** recorded;
`auth_users` present. Capture the three counts. Do not select usernames,
emails, hashes, or order payloads.

### 3. Exact approved apply

From the repository at merge commit `3548e8d21f0dac6773877314257ead2339da0ab7`
or later `main` that still contains this file unchanged:

```bash
# Non-pooled URL from Infisical. Do not print the value.
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 \
  -f prisma/migrations/20261021140000_bad_purchase_ownership/migration.sql

npx prisma migrate resolve --applied 20261021140000_bad_purchase_ownership
```

Required permission: `CREATE` on `public` plus `REFERENCES` on `auth_users`
(both verified for the current Core role on 22 October 2026).

**Forbidden on this packet:** `npx prisma migrate deploy`, `prisma db push`,
`prisma migrate reset`, copying the SQL into
`postgres-ensure-schema-statements.js`, Vercel rebuild as a substitute for
apply, laptop ad-hoc sessions unless that is the recorded operator path.

### 4. Post-migration verification

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'bad_purchase%'
ORDER BY table_name;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'bad_purchase_ownership_checkout_intent_id_key',
    'bad_purchase_ownership_order_confirmation_ref_key',
    'bad_purchase_ownership_paddle_transaction_id_key',
    'bad_purchase_unbound_reversals_paddle_transaction_id_key',
    'bad_purchase_webhook_events_event_id_key'
  )
ORDER BY indexname;

SELECT conname, confrelid::regclass::text AS referenced_table
FROM pg_constraint
WHERE conname = 'bad_purchase_ownership_auth_user_id_fkey';

SELECT tgname
FROM pg_trigger
WHERE tgname = 'bad_purchase_ownership_terminal_guard'
  AND NOT tgisinternal;

SELECT count(*)::int FROM bad_purchase_ownership;
SELECT count(*)::int FROM bad_purchase_unbound_reversals;
SELECT count(*)::int FROM bad_purchase_webhook_events;

SELECT count(*)::int AS auth_users FROM auth_users;
SELECT count(*)::int AS tenants FROM tenants;
SELECT count(*)::int AS automation_events FROM automation_events;
```

Expected: three tables; five unique indexes; FK to `auth_users`; terminal
trigger present; new tables at count `0`; `auth_users` / `tenants` /
`automation_events` counts **unchanged** from the pre-check.

### 5. Evidence before calling the schema step successful

Record on #1509 (no secrets):

- Neon plan name + history window (no restore click unless separately approved)
- Apply timestamp (Africa/Johannesburg)
- `main` SHA used
- Pre/post aggregate counts
- Table / index / FK / trigger presence
- Confirmation that `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` is still unset
- Confirmation that no Paddle/ERPNext live processing was attempted

Schema success is **not** operational delivery of the customer purchase path.

## Rollback

- **Before any live buyer row:** the DROP statements in the migration header
  may be used, including the terminal-guard trigger and function. This is
  destructive to empty tables only. Then
  `npx prisma migrate resolve --rolled-back 20261021140000_bad_purchase_ownership`.
- **After any live buyer row:** do **not** drop the tables. Turn the flag off,
  keep the audit rows, and revoke fulfilment entitlement. Deleting ownership
  evidence is not an allowed rollback.
- **Failed apply mid-file:** `psql -v ON_ERROR_STOP=1` stops at the first
  error. Inspect `information_schema` for partial objects. If no buyer rows
  exist, use the header DROP block and retry. If P3009 or “already exists”
  appears, stop and do not run `migrate deploy`.
- Neon Instant restore / branch restore is the last-resort recovery for an
  unexpected shared-schema incident, and only after Anton’s exact restore
  approval.

## Outstanding approvals (separate gates)

- **This packet:** Anton records Neon Instant restore window, then explicitly
  approves SQL-file apply + `migrate resolve --applied` for
  `20261021140000_bad_purchase_ownership` on Core Neon `neondb`
- Enable `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` in a live runtime
- Production deployment intended to serve the buyer journey
- Live Paddle / ERPNext processing against real or authorised test parties
- Customer communications
- Optional later hygiene: resolve `20260514120000_lux_listings` and reconcile
  unrecorded Prisma history — **not** part of this apply
