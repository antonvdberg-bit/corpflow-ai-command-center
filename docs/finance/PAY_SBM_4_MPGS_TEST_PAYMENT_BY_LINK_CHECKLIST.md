# PAY-SBM-4 — MPGS TEST Payment-by-Link spike checklist

**Status:** TEST-only implementation spike. **No production payment enablement.**  
**Owner:** Cursor (repo implementation + PR).  
**Branch:** `feat/pay-sbm-3-website-mpgs-compliance` (extends PAY-SBM-3 website compliance).

---

## Architecture rules (non-negotiable)

| Rule | Implementation |
|------|----------------|
| Browser redirect never marks paid | `processMpgsBrowserReturn` records `redirect_seen` then calls Retrieve Order; `paid_from_redirect_only: false` in all API responses |
| `resultIndicator` is signal only | Stored in `result_indicator_seen`; **not** compared to grant paid status |
| Paid only after Retrieve Order | `isMpgsOrderVerifiedPaid()` requires gateway status `CAPTURED` / `PARTIALLY_CAPTURED` / `PAID` |
| Fulfilment after verified payment | Return page copy states setup starts after verification + operator review; no auto `PAID_SETUP` flip in this spike |
| TEST vs production separated | `CORPFLOW_MPGS_MODE=test` default; production requires explicit mode + credentials |
| No secrets in repo | `.env.template` placeholders only; credentials in Vercel / operator vault |

---

## API routes (factory master auth unless noted)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/factory/payments/mpgs/create-link` | Create internal `payment_orders` row + INITIATE_CHECKOUT session |
| POST | `/api/factory/payments/mpgs/verify` | Manual/server Retrieve Order + mark `verified_paid` when captured |
| GET | `/api/factory/payments/mpgs/status?order_ref=` | Operator read non-sensitive payment order status |
| GET | `/api/factory/payments/mpgs/diagnostics` | Non-secret MPGS config diagnostics |
| POST | `/api/factory/payments/mpgs/hosted-checkout/create` | **501 disabled** — secondary path |
| GET | `/api/payments/mpgs/return` | JSON return handler (redirect + server verify) |
| GET | `/pay/return` | Buyer-facing return page (SSR server verify) |

---

## Env configuration (`.env.template` § MPGS)

| Variable | Purpose |
|----------|---------|
| `CORPFLOW_MPGS_ENABLED` | Master switch (`false` default) |
| `CORPFLOW_MPGS_MODE` | `test` (default) or `production` (gated) |
| `CORPFLOW_MPGS_MOCK` | Local/CI mock without real gateway (`false` default) |
| `CORPFLOW_MPGS_GATEWAY_BASE_URL` | TEST gateway base URL placeholder |
| `CORPFLOW_MPGS_API_VERSION` | REST version (default `100`) |
| `CORPFLOW_MPGS_MERCHANT_ID` | Operator-supplied; never commit |
| `CORPFLOW_MPGS_API_PASSWORD` | Operator-supplied; never commit |
| `CORPFLOW_MPGS_RETURN_PATH` | Default `/pay/return` |
| `CORPFLOW_MPGS_HOSTED_CHECKOUT_ENABLED` | `false` default |

---

## Manual TEST checklist (operator)

### A. Config

1. Set `CORPFLOW_MPGS_ENABLED=true`, `CORPFLOW_MPGS_MODE=test`, real TEST `MERCHANT_ID` + `API_PASSWORD` from SBM (in Vercel Preview only first).
2. `GET /api/factory/payments/mpgs/diagnostics` → `operational: true`, `mode: test`.
3. Confirm **no** credentials appear in repo, PR diff, or automation logs.

### B. Create link

4. `POST /api/factory/payments/mpgs/create-link` with factory master auth:
   ```json
   {
     "purchaser_name": "Test Buyer",
     "purchaser_email": "test@example.com",
     "amount_minor": 15000,
     "currency": "USD",
     "description": "AI Lead Rescue TEST"
   }
   ```
5. Response includes `order_reference`, `payment_link_url`, `status: link_created`.
6. Postgres row exists in `payment_orders` with `success_indicator` stored server-side (not exposed on public pages).

### C. Pay on TEST gateway

7. Open `payment_link_url` in browser; complete TEST card payment per SBM TEST card list.
8. Gateway redirects to `/pay/return?order_ref=…&resultIndicator=…`.

### D. Verification discipline

9. `/pay/return` shows **verified** only if Retrieve Order returns captured status.
10. `GET /api/factory/payments/mpgs/status?order_ref=…` shows `verified_paid` only after step 9.
11. Deliberately call return URL **without** paying → status must **not** become `verified_paid`.
12. `automation_events` contains `payments.mpgs.link_created` and, when paid, `payments.mpgs.verified_paid` with **no** card numbers or API passwords.

### E. Fulfilment gate

13. Confirm lead-rescue operator status is **not** auto-flipped to `PAID_SETUP` by redirect alone.
14. Operator moves lead to paid only after reviewing `verified_paid` + intake (existing manual workflow).

---

## Automated tests

| File | Covers |
|------|--------|
| `node-tests/mpgs-config.test.mjs` | TEST default, mock mode, production gated |
| `node-tests/mpgs-payment-verification.test.mjs` | Captured-status gate, sanitization, status separation |
| `node-tests/merchant-identity.test.mjs` | Website compliance constants |

---

## Out of scope (this spike)

- Production `CORPFLOW_MPGS_MODE=production` enablement
- Public marketing “Pay now” buttons
- Hosted Checkout implementation (endpoint returns 501)
- ERPNext Payment Request auto-bridge
- Webhook receiver (future packet)
- Visa/Mastercard/UPI logos on marketing pages

---

## Anton confirmations still required

1. **Customer service telephone** — `CUSTOMER_SERVICE_PHONE` in `lib/public/merchant-identity.js`
2. **TEST merchant ID + API password** — set in Vercel Preview/Production secrets only
3. **TEST gateway base URL** — confirm SBM-supplied TEST host if different from Mastercard default
4. **UPI acceptance** — confirm with SBM before any public UPI acceptance claim beyond conditional wording
5. **Production go-live** — separate explicit approval before `CORPFLOW_MPGS_MODE=production`
