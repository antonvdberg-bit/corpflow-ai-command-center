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

1. Merge the authenticated checkout PR (this change).
2. Confirm the intended runtime’s `POSTGRES_URL` is the existing Core Neon `neondb` (shared).
3. Anton sets the flag on **one** named runtime only (Preview **or** Production — not both in the same approval).
4. Synthetic smoke only: authenticated bind, other-buyer denial, anonymous denial. No real Paddle charge, no ERPNext financial posting, no customer message.
5. Separate later approval for live Paddle sandbox webhook proof and any ERPNext write mode other than disabled.

## Verification after the flag is set

Use an existing signed-in tenant `corpflow_session` on the BAD host. Do not use email or a transaction id as identity.

| Check | Expected |
|---|---|
| Unauthenticated `POST /api/paddle/bad/checkout` | `401 AUTH_USER_REQUIRED` |
| Authenticated checkout with flag off | `404 feature_disabled` |
| Authenticated checkout with flag on | `200` with server `checkout_intent_id` and `paddle_transaction_id` |
| `GET /api/paddle/bad/order-confirmation` before paid+issued | `404 NOT_FOUND` |
| Other buyer / other tenant | `403 FORBIDDEN` |
| Anonymous retrieve | `401` |

Live Paddle overlay + webhook round-trip remains a **protected live test**. Browser `checkout.completed` is not proof of ownership.

## Rollback

- **Before any live buyer row:** set `CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE` back to unset/`0`. Empty tables may stay.
- **After any live buyer row:** turn the flag off. Keep the audit rows. Do not drop `bad_purchase_ownership`. Fulfilment entitlement stays revoked for terminal rows.

## Explicit non-actions

- No production/preview env mutation from an agent
- No production deploy from an agent
- No real Paddle payment
- No ERPNext Sales Invoice / Payment Entry
- No customer email/WhatsApp
- No Prisma migrate deploy / resolve
