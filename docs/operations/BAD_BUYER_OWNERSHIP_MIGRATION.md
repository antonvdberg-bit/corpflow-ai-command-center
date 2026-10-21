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

The automated concurrency test uses two simulated connections and a lock
manager. It is **not** a live multi-instance Postgres run. That proof stays
inside the separate migration-execution approval, on a disposable database,
never on shared or production Postgres from this change.

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

## Outstanding approvals

- Execute the migration on shared/production Postgres
- Enable the durable flag in a live runtime
- Merge/deploy of the integration
- Live Paddle / ERPNext end-to-end against real or authorised test parties
- Customer communications
