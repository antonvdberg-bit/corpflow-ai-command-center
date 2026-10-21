## Context

Authenticated BAD customers need a durable owner record in the existing
CorpFlowAI Postgres database. CEO approved preparing the schema and adapter;
not applying it.

## Goals / Non-Goals

- Goals: smallest durable relation; session-only identity; sticky refund
  tombstones including unbound refunds; unique Paddle references; fail-closed
  until flag + migration.
- Non-Goals: new database, new login, live migration, live ERPNext/Paddle
  mutation, public HTML document leakage, ensure-schema auto-apply.

## Decisions

- Decision: new tables rather than reuse `AutomationEvent` as identity.
  Alternatives considered: stuffing owner ids into outbox payload JSON —
  rejected because that store is keyed by Paddle account/event, not AuthUser.
- Decision: keep statements out of `ENSURE_SCHEMA_STATEMENTS` so Vercel build
  DDL cannot create tables on merge.
- Decision: `paddle_transaction_id` nullable unique until a trusted server
  association. Webhooks match only an already-bound provider reference.

## Risks / Trade-offs

- Current sandbox checkout is browser `Checkout.open` — the browser cannot
  supply a trusted Paddle transaction id. Server-created Paddle transactions
  remain a later gate. Bind still records the authenticated owner and intent.
- Missing table with flag on → Prisma errors. Flag stays off until migrate.

## Migration Plan

See `docs/operations/BAD_BUYER_OWNERSHIP_MIGRATION.md`.

## Open Questions

- When to enable the flag after migrate (separate Anton approval).
