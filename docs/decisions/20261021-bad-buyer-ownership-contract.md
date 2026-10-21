# BAD buyer ownership contract — bounded synthetic implementation

Status: `IMPLEMENTED SYNTHETIC CONTRACT / DURABLE SCHEMA NOT APPROVED`

Source: issue [#1507](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1507)

## Decision

The existing `AutomationEvent` BAD outbox is safe for Paddle event
idempotency, replay ordering, refunds, and transaction locks, but it is not a
buyer ownership store. It is keyed by the configured Paddle account and
provider event/transaction references; it does not contain an immutable
authenticated user, tenant, and brand binding. The existing accepted-offer
confirmation ledger is explicitly memory-only synthetic proof.

This change therefore adds only a memory adapter and deterministic tests in
`lib/server/paddle-sandbox/bad-buyer-ownership.js`. It does not add an HTTP
retrieval endpoint, use checkout metadata as identity, or mutate Postgres,
ERPNext, Paddle, secrets, or production data.

## Trust boundary

Only a server-side caller with a verified `corpflow_session` may bind:

- `auth_user_id` — immutable `AuthUser.id`;
- `tenant_id` — authoritative session/host tenant;
- `brand` — the server-selected `business_admin_desk` brand;
- `checkout_intent_id` and `order_confirmation_ref` — server-created references;
- `paddle_transaction_id` — a provider reference attached by a trusted
  server-side purchase boundary.

The verified Paddle webhook may update state for an already-bound provider
reference. It may not create or replace ownership from email, a browser
body, custom metadata, correlation ID, or an unbound transaction. Anonymous
retrieval fails closed. The caller must pass an owner already resolved from
the server session; this module is not a public retrieval route.

A provider transaction reference can belong to only one checkout intent.
Refund and revocation write a permanent tombstone and keep reversal history,
including when the reversal arrives before the checkout intent is bound.
A later, earlier, repeated, or concurrent `transaction.completed` event
cannot restore paid status, confirmation issuance, retrieval, or fulfilment
entitlement. Issuance requires a confirmation object with both a non-empty
reference and non-empty content; a missing confirmation is not marked issued.

## Minimal durable schema proposal (not executed)

If this contract is approved for durable use, add a relation such as
`bad_purchase_ownership` with:

| Field | Rule |
|---|---|
| `id` | immutable primary key |
| `auth_user_id` | required foreign/reference to the authenticated owner |
| `tenant_id` | required authoritative tenant scope |
| `brand` | required allowlisted brand |
| `checkout_intent_id` | required unique server-created intent |
| `order_confirmation_ref` | required unique server-created order reference |
| `paddle_transaction_id` | nullable until trusted provider association; unique when present |
| `status` | `draft`, `paid`, `issued`, `abandoned`, `refunded`, or `revoked` |
| `issued_at` | nullable issuance evidence |
| `refunded_at` / `revoked_at` | nullable reversal evidence |
| `last_event_id` / `last_event_at` | webhook idempotency/order evidence |
| `confirmation_ref` | nullable reference to the issued document, never identity proof |
| `created_at` / `updated_at` | retention and audit timestamps |

Mutation authority would be split: authenticated server purchase creation
binds the owner and intent; verified Paddle webhook processing changes payment
and reversal state; an authenticated owner-scoped service issues and retrieves
the confirmation. A unique intent and a unique provider transaction reference
are required. Refunded and revoked rows are sticky tombstones: a newer
completion event must not clear them. Rollback must preserve the
ownership/order audit row and revoke access rather than delete accounting
evidence. Migration, foreign keys, retention, and production rollout remain
separate protected approvals. No durable schema is approved by this record.

## Acceptance mapping

The synthetic suite covers owner/other/anonymous and cross-tenant/brand denial,
draft/unissued denial, unbound webhook denial, replay and out-of-order
events, concurrent delivery, failed/abandoned payment, refund-before-payment,
refund-then-later-completion, concurrent refund/completion, repeated refunds,
replayed completions after refund, duplicate provider-transaction binding,
immutable owner binding, invalid confirmation refusal, unknown-event refusal,
and the absence of confirmation HTML from webhook results.
