# BAD buyer ownership — prepared migration and rollback

**Status:** PREPARED / NOT APPLIED  
**Issue:** [#1509](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1509)  
**Parent programme:** [#1504](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1504)  
**Synthetic contract:** [#1507](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1507), merged PR #1508

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

## Runtime gate (fail closed until authorised)

`CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` defaults off (`0` / unset).

While off:

- authenticated bind/retrieve routes return `404 feature_disabled`;
- verified Paddle webhooks continue to update the existing purchase outbox only;
- no ownership row is created.

These statements are **intentionally absent** from
`lib/server/postgres-ensure-schema-statements.js` so a Vercel Production build
cannot create the tables as a side effect of merge.

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
by the disposable test below.

Two checks exist:

- `node-tests/paddle-bad-buyer-ownership-durable.test.mjs` simulates two connections. It runs in ordinary `npm test` and does not open a database.
- `node-tests/paddle-bad-buyer-ownership-disposable-pg.test.mjs` uses two independent PostgreSQL connections. It stays skipped unless `CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_PG=1` and `CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_URL` name a loopback database whose name contains `disposable`. It refuses to start when `POSTGRES_URL`, `DATABASE_URL`, or `PRISMA_DATABASE_URL` is present, when the URL contains a password, or when the server is not on loopback. These two names are local test switches only. Do not set them in Vercel or any shared environment.

Disposable verification on 21 October 2026 passed against a local PostgreSQL 16.15 database that listened only on `localhost`, with Prisma Client 6.19.2 and Node v22.23.3. Two backend process IDs proved the connections were independent. The shared Core database was not used. `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` stayed unset. Empty-table rollback removed only the three new tables. After rows existed, turning the feature off left the audit rows in place. That result does **not** approve applying the migration to shared or production Postgres.

## Apply (separate approval required)

1. Confirm Anton has approved **this** migration execution against the intended
   Core Postgres (`corpflow_test` or later `client_production` — never inferred).
2. Snapshot / note current schema.
3. Apply **only** `prisma/migrations/20261021140000_bad_purchase_ownership/migration.sql`
   through the approved schema path (not a laptop ad-hoc session unless that is
   the recorded path).
4. Verify tables, unique indexes, and the `auth_users` foreign key exist.
5. Set `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE=1` in the intended runtime only
   after the tables exist.
6. Live bind/retrieve/webhook proof remains a further gate. Do not treat merge
   or CI as operational delivery.

## Rollback

- **Before any live buyer row:** the DROP statements in the migration header
  may be used, including the terminal-guard trigger and function. This is
  destructive to empty tables only.
- **After any live buyer row:** do **not** drop the tables. Turn the flag off,
  keep the audit rows, and revoke fulfilment entitlement. Deleting ownership
  evidence is not an allowed rollback.

## Prisma history registration (separate from SQL apply)

Issue [#1517](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1517) authorises **only**

`npx prisma migrate resolve --applied 20261021140000_bad_purchase_ownership`

after the SQL file was already applied. Do **not** run `prisma migrate deploy`
(unrelated unfinished `20260514120000_lux_listings`), do not reapply the SQL,
and do not edit `_prisma_migrations` by hand.

The prepared L2 path is the manual workflow
`.github/workflows/resolve-bad-ownership-history.yml`. It reuses the existing
Infisical OIDC identity from Agent CI, requires `DIRECT_URL` or
`POSTGRES_URL_NON_POOLING`, and stays inert when those names are absent. It
does not derive a direct URL from pooled `POSTGRES_URL`.

Do not dispatch `execute` until:

1. this workflow is merged with Anton’s approval;
2. Infisical production already contains a non-pooled Neon `neondb` URL under one of those two names;
3. the operator chooses `execute` from `main` and types the exact migration id.

Default dispatch mode is `dry_run`. `diagnose` is read-only: it re-reads target/Luxe history and Prisma’s migration advisory lock (`pg_advisory_lock(72707369)` in Prisma 6.19.2 schema-engine) via `pg_locks` / `pg_stat_activity`, scoped to the current database OID so a same-key lock in another database cannot look held here. Diagnose exits unsuccessful when lock identity or session inspect is unavailable; it never treats that as “lock absent”. It never calls `migrate resolve`, never terminates sessions, and never disables advisory locking. `execute` is rejected unless GitHub reports `refs/heads/main` and the confirmation matches the fixed migration id. Workflow logs report shape booleans, occupancy, wait events, ages, application labels, and a `pid_fingerprint` of `pid:backend_start_epoch`. They do not print raw PIDs, SQL, usernames, or hostnames. Operator `confirm_pid` / `confirm_backend_start_epoch` still come from the already-captured diagnose runs on #1517; GitHub may show those workflow inputs in the Actions UI.

If `diagnose` reports the Prisma lock **absent**, re-run `dry_run` and confirm the target marker is still missing before any gated `execute` retry under the original history-write approval. If the lock is **held**, do not retry `execute`. Use `release_preview` on `main` with the diagnose PID and `backend_start_epoch` to re-identify the holder. A separate CEO approval is required before `release_lock`.

### Guarded single-session lock release

`release_preview` never terminates. `release_lock` may call `pg_terminate_backend` only from a **single SQL statement** that re-selects the target immediately before the kill. JavaScript identification (two fresh reads) is not the mutation boundary.

The mutating statement builds a CTE of advisory locks on the current database OID for Prisma key `72707369`, then a candidate row that must match all of:

1. current database is `neondb` / role `neondb_owner` and the live database OID equals the confirmed OID;
2. exactly one granted holder and zero waiters for that key;
3. confirmed PID and `backend_start` epoch;
4. holder `idle` with `xact_start` null;
5. holder database and role match `current_database()` / `current_user`;
6. application label equals `pgbouncer` (additional predicate, never the sole selector);
7. PID is distinct from `pg_backend_pid()`.

If that CTE is empty, the statement returns **zero rows** and the workflow fails closed. It never issues a bare `pg_terminate_backend($pid)`. If PostgreSQL returns `false` (backend already gone, or not permitted), the workflow also fails closed and does not retry from this step.

Never terminate by application label. Never disable advisory locking. Never run `migrate resolve` from `release_lock`.

**Residual race (not claimed atomic).** `pg_locks` and `pg_stat_activity` are shared-memory views, not MVCC tables. PostgreSQL’s `pg_terminate_backend(pid)` identifies a backend by PID only; there is no `backend_start` argument. This statement materialises the gated PID in a CTE, then calls `pg_terminate_backend` on that PID in the same query. That removes the previous **second-connection** TOCTOU (JS checks, then a later `pg_terminate_backend($1)`). A remaining window exists if, after the CTE is materialised and before the signal is sent, the original backend exits and the kernel reuses that PID for a new backend. That window is in-statement, not a new client round trip, and is not formally zero. `pg_terminate_backend` returning `false`, or a later post-check that the Prisma lock is still held, both fail closed. Do not treat a failed release as proof the lock is gone.

**PgBouncer / Neon blast radius.** Neon pooled endpoints use PgBouncer in transaction mode. Session-level `pg_advisory_lock` can remain on an idle pooled backend after the client transaction ends. Diagnoses #40298825546 and #40300233884 match that pattern: one idle `pgbouncer`-labelled holder, no open transaction, persistent PID. Terminating that **one** backend:

- releases the stranded Prisma migrate lock when the session ends;
- may disconnect whoever is currently assigned that pooled backend (mitigated by re-checking idle / no xact immediately before kill);
- does **not** restart Neon, drop the project, or terminate every pooler client.

After an approved `release_lock` success: rerun `diagnose`, then `dry_run` (target still missing, Luxe unchanged), then the already-approved one-time `execute`, then postflight. Keep #1517 open until the live history receipt exists.

## Outstanding approvals

- Merge the real-Postgres lock correction (advisory lock must return an integer Prisma can read)
- CEO merge of the guarded `release_lock` workflow, then a separate approval to dispatch `release_lock` on `main` with the diagnose PID / `backend_start_epoch` / `terminate_one_session`
- Register the already-applied ownership migration in Prisma history (`diagnose` → `dry_run` → `execute` after the lock is absent)
- Enable the durable flag in a live runtime
- Merge/deploy of the integration
- Live Paddle / ERPNext end-to-end against real or authorised test parties
- Customer communications
