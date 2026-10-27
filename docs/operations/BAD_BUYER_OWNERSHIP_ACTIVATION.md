# BAD buyer ownership — flag activation and rollback

**Status:** PREPARED — not executed  
**Issues:** [#1509](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1509), [#1504](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1504)  
**Schema:** applied and Prisma-history registered under [#1517](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1517) (closed). Do not re-run that migration.

This is the remaining protected gate after code merge. It does **not** authorise changing Vercel or Infisical values from this packet.

## Current runtime

`CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` is absent / unset on the Core Vercel project. Routes:

- `POST /api/paddle/bad/checkout` and `POST /api/paddle/bad/checkout-intent` return `404 feature_disabled`
- `GET /api/paddle/bad/order-confirmation` returns `404 feature_disabled`
- verified Paddle webhooks update the existing purchase outbox only and do not write ownership rows

A Vercel **Preview** label is not an isolated database. Preview and Production may share the same Neon Core `neondb`. Enabling the flag in Preview writes the same `bad_purchase_*` tables as Production.

## Minimum safe enablement

One environment variable, after the buyer-ownership code is merged and deployed to the chosen runtime:

```text
CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE=1
```

Do not invent a second database, a second Vercel project, or a new secret. Do not set `CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_PG` or `CORPFLOW_BAD_OWNERSHIP_DISPOSABLE_URL` in Vercel.

### Smallest recommended sequence (separate approvals)

1. Merge the authenticated checkout PR.
2. Confirm the intended runtime’s `POSTGRES_URL` is the existing Core Neon `neondb` (shared).
3. Run **class A** checks below while the flag is still off.
4. Anton sets the flag on **one** named runtime only (Preview **or** Production — not both in the same approval).
5. Run **class B** negative HTTP checks only. Do **not** POST an authenticated checkout.
6. Separate later approval for **class C**: authenticated sandbox `transactions.create`, ownership-row writes, webhook proof, and any ERPNext write mode other than disabled.

## Verification classes

Use an existing signed-in tenant `corpflow_session` on the BAD host only where a check says “authenticated”. Do not use email or a transaction id as identity.

### Class A — read-only, flag still off (no extra approval)

These do not call Paddle and do not insert `bad_purchase_*` rows.

| Check | Expected |
|---|---|
| Unauthenticated `POST /api/paddle/bad/checkout` | `404 feature_disabled` |
| Authenticated `POST /api/paddle/bad/checkout` | `404 feature_disabled` |
| `GET /api/paddle/bad/order-confirmation` | `404 feature_disabled` |

### Class B — negative HTTP after the flag is on (flag approval only)

Safe only if nobody has already POSTed an authenticated checkout on that runtime. These still **must not** create a Paddle transaction or an ownership row.

| Check | Expected | Mutates? |
|---|---|---|
| Unauthenticated `POST /api/paddle/bad/checkout` | `401 AUTH_USER_REQUIRED` | No. Fails before bind and before Paddle. |
| Authenticated `GET /api/paddle/bad/order-confirmation` without a bound intent | `404 NOT_FOUND` | No. Read only. |
| Anonymous `GET /api/paddle/bad/order-confirmation` | `401` | No. Read only. |

Do **not** treat a `200` from authenticated `POST /api/paddle/bad/checkout` as smoke. That path is class C.

### Class C — approval-gated mutations (do not run from this packet)

Each of the following needs its own explicit Anton approval. Preview and Production share Neon unless independently proven otherwise.

| Action | Why it is gated |
|---|---|
| Authenticated `POST /api/paddle/bad/checkout` with flag on | Calls Paddle sandbox `transactions.create` **and** inserts `bad_purchase_ownership` on shared Core Neon |
| `POST /api/paddle/bad/checkout-intent` with flag on | Inserts an ownership row on shared Neon |
| Completing a sandbox overlay / card / webhook round-trip | Provider event plus ownership status change on shared Neon |
| ERPNext order/document write | Financial/shared-estate mutation |
| Customer message | External send |

Live Paddle overlay + webhook round-trip remains a **protected live test**. Browser `checkout.completed` is not proof of ownership.

## Rollback

- **Before any live buyer row:** set `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` back to unset/`0`. Empty tables may stay.
- **After any live buyer row:** turn the flag off. Keep the audit rows. Do not drop `bad_purchase_ownership`. Fulfilment entitlement stays revoked for terminal rows.

## Explicit non-actions

- No production/preview env mutation from an agent
- No production deploy from an agent
- No Paddle sandbox or live transaction from this packet
- No ownership-row insert on shared Neon from this packet
- No ERPNext Sales Invoice / Payment Entry
- No customer email/WhatsApp
- No Prisma migrate deploy / resolve
