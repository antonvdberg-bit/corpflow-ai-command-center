# Change: Add durable BAD buyer ownership

## Why

Business Admin Desk checkout must permanently bind the authenticated customer
to their Paddle purchase, ERPNext order, and order confirmation. The merged
synthetic contract (#1507 / PR #1508) is memory-only. `AutomationEvent` is an
outbox, not an identity ledger.

CEO authorised **preparation** of the schema and gated adapter in a reviewable
PR (#1509). Live migration is not authorised by this change.

## What Changes

- Add `bad_purchase_ownership`, unbound-reversal, and webhook-event tables to
  existing Core Postgres (migration files only; **not applied**).
- Share the #1508 ownership engine with a Prisma adapter.
- Bind owner identity only from `corpflow_session`; webhooks cannot create or
  replace ownership.
- Keep the feature disabled until `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE=1`
  after a separately approved migration.

## Impact

- Affected specs: `bad-buyer-ownership` (new)
- Affected code: Prisma schema, paddle-sandbox ownership modules, factory
  router bind/retrieve routes, `.env.template`
- **BREAKING** for live data: none while the flag is off and the migration is
  unapplied
