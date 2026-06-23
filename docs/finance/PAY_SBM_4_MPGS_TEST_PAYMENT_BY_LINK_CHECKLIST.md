# PAY-SBM-4 — MPGS TEST Payment-by-Link checklist

**Status:** Implementation branch `feat/pay-sbm-4-mpgs-payment-by-link`. **TEST only** — production MPGS mode blocked for link creation. **No secrets in repo.**

**Prerequisite:** PAY-SBM-3 website compliance live on `corpflowai.com` (merge `41a7fb0e`).

**Design:** `docs/finance/PAY_SBM_4_MPGS_PAYMENT_BY_LINK_DESIGN.md`

---

## Scope (v1)

| In scope | Out of scope |
|----------|--------------|
| Payment-by-Link from approved `payment_records` | Production MPGS / live charging |
| Factory-only create record + create-link + verify | Generic public “pay now” route |
| `/pay/return` + `/pay/cancel` (noindex) | Auto-fulfilment / CMP stage advance |
| Server-side Retrieve Order verification | Hosted Checkout default |
| Mock mode for CI | ERPNext write-back |

---

## Env placeholders (Vercel Preview — PAY-SBM-4 TEST)

**Approved deviation:** Infisical has no Preview target in the current mapping; enter the **13** keys on **Vercel Preview only** (values from Infisical). Remove all MPGS keys from Vercel **Production**. See **`docs/finance/PAY_SBM_4_INFISICAL_SECRETS.md`** § *Temporary deviation*.

| Variable | Purpose | Example placeholder |
|----------|---------|---------------------|
| `CORPFLOW_MPGS_ENABLED` | Master switch | `true` (Preview only) |
| `CORPFLOW_MPGS_MODE` | Gateway mode | `test` (never `production` until authorized) |
| `CORPFLOW_MPGS_MOCK` | CI/local without credentials | `false` for real TEST |
| `CORPFLOW_MPGS_GATEWAY_BASE_URL` | SBM TEST gateway host | SBM-provided TEST URL |
| `CORPFLOW_MPGS_API_VERSION` | REST version | `66` (SBM TEST manual) |
| `CORPFLOW_MPGS_MERCHANT_ID` | Merchant ID | Infisical Preview only |
| `CORPFLOW_MPGS_API_PASSWORD` | Integration password (Password 1) | Infisical Preview only |
| `CORPFLOW_MPGS_RETURN_PATH` | Buyer return path | `/pay/return` |
| `CORPFLOW_MPGS_CANCEL_PATH` | Buyer cancel path | `/pay/cancel` |
| `CORPFLOW_MPGS_PUBLIC_BASE_URL` | MPGS return/cancel origin | Preview `*.vercel.app` only (not `corpflowai.com`) |
| `CORPFLOW_MPGS_PAYMENT_LINK_EXPIRY_HOURS` | Link TTL | `72` |
| `CORPFLOW_MPGS_PAYMENT_LINK_ALLOWED_ATTEMPTS` | Max pay tries | `3` |
| `CORPFLOW_MPGS_HOSTED_CHECKOUT_ENABLED` | Hosted checkout (disabled v1) | `false` |

**Never commit values.** Do not paste Merchant ID, API password, Operator ID, or 2FA codes in chat or repo.

---

## Operator manual steps (before TEST run)

1. **Vercel Preview (direct entry for TEST)** — add 13 MPGS vars on **Preview** only; **remove** from **Production**; optional branch `feat/pay-sbm-4-mpgs-payment-by-link`; redeploy PR #441 Preview.
2. **MPGS merchant portal** — whitelist return URL: `{CORPFLOW_MPGS_PUBLIC_BASE_URL}{CORPFLOW_MPGS_RETURN_PATH}?order_ref=*` and cancel URL (confirm exact pattern with SBM).
3. **Deploy Preview** — merge PAY-SBM-4 PR; wait for Preview **Ready**.
4. **Schema** — factory master `POST /api/factory/postgres/ensure-schema` (or rely on build DDL).
5. **Diagnostics** — `GET /api/factory/payments/mpgs/diagnostics` (factory auth) → `operational: true`, `mode: test`, `merchant_id_present: true` (boolean only).

---

## TEST checklist

### Automated (CI)

- [ ] `npm test` — `mpgs-config.test.mjs`, `mpgs-payment-verification.test.mjs`
- [ ] `npm run build`
- [ ] Repo scan: no literal API passwords, Merchant IDs, or gateway secrets in diff

### Factory API (Preview, factory master session)

- [ ] `POST /api/factory/payments/records/create` → `payment_record_id`, status `approved`
- [ ] `POST /api/factory/payments/mpgs/create-link` with `payment_record_id` → `payment_link_url`, `attempt_reference`
- [ ] `GET /api/factory/payments/mpgs/status?attempt_ref=…` → `link_created` / pending states
- [ ] `POST /api/factory/payments/mpgs/verify` before pay → `verified_paid: false`

### Buyer flow (TEST card — operator browser)

- [ ] Open `payment_link_url` from create-link response (do not publish link on marketing pages)
- [ ] Complete TEST payment on MPGS hosted page
- [ ] Land on `/pay/return?order_ref=…` → “pending” or “verified” after server Retrieve Order
- [ ] `POST /api/factory/payments/mpgs/verify` → `verified_paid: true` only after gateway capture
- [ ] Amount/currency on record unchanged; attempt `verified_paid`; record `paid`; `fulfilment_status: blocked`

### Security / idempotency

- [ ] Hit `/pay/return` twice with same `order_ref` → idempotent; single `verified_paid` transition
- [ ] `resultIndicator` alone does **not** mark paid if Retrieve Order fails (simulate with verify before pay)
- [ ] `/pay/cancel` → attempt `cancelled`; record not `paid`
- [ ] Unauthenticated caller cannot create-link
- [ ] `CORPFLOW_MPGS_MODE=production` → create-link returns **403** (until separately authorized)

---

## Rollback plan

1. Set `CORPFLOW_MPGS_ENABLED=false` in Infisical (Preview) → sync → redeploy Preview.
2. Revert merge commit on `main` if code rollback required.
3. `payment_records` / `payment_attempts` rows are audit-only — no auto-fulfilment to unwind.
4. Remove MPGS return URL whitelist in merchant portal if abandoning TEST.

---

## Files changed (PAY-SBM-4)

| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | `PaymentRecord`, `PaymentAttempt` models |
| `lib/server/postgres-ensure-schema-statements.js` | Idempotent DDL |
| `lib/server/payments/mpgs-config.js` | Env/config (no secrets in logs) |
| `lib/server/payments/mpgs-client.js` | Server-only MPGS REST |
| `lib/server/payments/mpgs-verify.js` | Amount/currency/status verification |
| `lib/server/payments/payment-store.js` | Record + attempt persistence |
| `lib/server/payments/mpgs-payment-api.js` | Factory handlers |
| `api/factory_router.js` | Route wiring |
| `pages/pay/return.js`, `pages/pay/cancel.js` | Buyer return/cancel (noindex) |
| `.env.template` | Placeholder names only |
| `node-tests/mpgs-*.test.mjs` | Unit tests |
| `docs/finance/PAY_SBM_4_INFISICAL_SECRETS.md` | Infisical-first secret names + sync |

**PAY-SBM-3 pages untouched** except `/pay/*` return routes (integration surface, not marketing).

---

## Unknowns for SBM / Anton

- Exact TEST gateway base URL and API version
- Authorized Retrieve Order “paid” status values
- Return URL whitelist format on MPGS portal (use `{CORPFLOW_MPGS_PUBLIC_BASE_URL}{CORPFLOW_MPGS_RETURN_PATH}` on Preview `*.vercel.app`)

**Verdict until TEST run:** `IMPLEMENTATION READY — AWAITING PREVIEW ENV + MANUAL TEST`
