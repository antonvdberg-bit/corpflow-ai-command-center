# PAY-SBM-4 — MPGS TEST Payment-by-Link (design note)

**Status:** Implementation on `feat/pay-sbm-4-mpgs-payment-by-link`. **TEST only.** **No secrets in repo.**

See **`PAY_SBM_4_MPGS_TEST_PAYMENT_BY_LINK_CHECKLIST.md`** for operator TEST steps and rollback.

---

## Non-negotiables (binding)

1. Payment-by-Link v1; Hosted Checkout secondary (`CORPFLOW_MPGS_HOSTED_CHECKOUT_ENABLED=false` default).
2. No generic public pay route — factory-only link creation from approved `payment_records`.
3. Browser return / `resultIndicator` = UX/audit only; **never** marks paid.
4. Paid = server-side **Retrieve Order** + amount + currency match.
5. Fulfilment stays `blocked` after verified paid (operator review only in v1).
6. Return/cancel handlers idempotent.
7. Production MPGS blocked (`CORPFLOW_MPGS_MODE=production` → create-link **403**).

---

## Data model

- **`payment_records`** — approved payable (invoice mirror); authoritative amount/currency.
- **`payment_attempts`** — MPGS session; `attempt_reference` sent to gateway as order id.

---

## API surface (factory master only except buyer return)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/factory/payments/records/create` | Create approved record |
| POST | `/api/factory/payments/mpgs/create-link` | `{ payment_record_id }` → link |
| POST | `/api/factory/payments/mpgs/verify` | Manual Retrieve Order refresh |
| GET | `/api/factory/payments/mpgs/status` | Sanitized attempt snapshot |
| GET | `/api/factory/payments/mpgs/diagnostics` | Non-secret config booleans |
| GET | `/pay/return` | Buyer return (SSR, noindex) |
| GET | `/pay/cancel` | Buyer cancel (SSR, noindex) |

---

## Verification logic

`verifyMpgsRetrieveMatchesRecord(retrieved, { amountMinor, currency })`:

- Gateway status ∈ `{ CAPTURED, PARTIALLY_CAPTURED, PAID }`
- Amount minor units match record
- Currency matches record

**NO IMPLEMENTATION AUTHORIZED for production payments until separate Anton approval.**
