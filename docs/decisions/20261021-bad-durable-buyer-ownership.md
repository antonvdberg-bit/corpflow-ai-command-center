# BAD durable buyer ownership in existing Postgres

**Date:** 2026-10-21  
**Status:** accepted for reviewable preparation; live migration not approved  
**Source:** issue [#1509](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1509)

## Context

PR #1508 proved the ownership contract in memory. `AutomationEvent` remains the
Paddle outbox; it is not an identity ledger. CEO authorised preparing the
smallest durable schema and adapter on a branch, with synthetic tests, and
opening a reviewable PR. Live migration, merge, deploy, payments, ERPNext
writes, and customer sends stay gated.

## Decision

Add `bad_purchase_ownership` (plus unbound-reversal and webhook-event receipts)
to the existing Core Postgres database. Bind owners only from a verified
`corpflow_session`. Verified Paddle webhooks may update a bound provider
reference or remember an unbound refund; they may not create or replace the
buyer. The feature stays disabled until the migration is separately applied
and `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE=1` is set.

## Consequences

- Positive: permanent buyer ↔ purchase ↔ order confirmation relation without a
  second database or login system.
- Follow-up: migration execution, flag enablement, and live verification are
  separate approvals. See `docs/operations/BAD_BUYER_OWNERSHIP_MIGRATION.md`.
- Cross-instance writes use a Postgres transaction, advisory lock, and a
  terminal compare-and-set. Passing single-process tests is not live
  multi-instance proof. The migration remains unapplied.

## Links

- Contract: `docs/decisions/20261021-bad-buyer-ownership-contract.md`
- Code: `lib/server/paddle-sandbox/bad-buyer-ownership.js`
- Adapter: `lib/server/paddle-sandbox/bad-buyer-ownership-durable.js`
- Migration: `prisma/migrations/20261021140000_bad_purchase_ownership/migration.sql`
