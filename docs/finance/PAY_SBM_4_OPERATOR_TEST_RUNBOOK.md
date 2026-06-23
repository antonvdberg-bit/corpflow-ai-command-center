# PAY-SBM-4 — Operator TEST runbook (MPGS Payment Link)

**Audience:** Anton (operator). **TEST only.** Do not paste Password 1, Merchant ID, or API responses containing secrets into chat or git.

**Prerequisite:** PAY-SBM-3 live on `corpflowai.com`. PAY-SBM-4 PR merged to a **Preview** deployment.

---

## Part A — Secrets before TEST

**Canonical long-term:** Infisical → Vercel Preview (`docs/finance/PAY_SBM_4_INFISICAL_SECRETS.md`).

**PAY-SBM-4 TEST (approved deviation):** Because Infisical→Vercel mapping lands MPGS keys on **Production** only, enter the **13** keys **directly in Vercel → Preview** for this spike:

1. **Remove** all `CORPFLOW_MPGS_*` keys from Vercel **Production**.
2. **Add** the same 13 keys to Vercel **Preview** only (copy values from Infisical — do not paste into chat).
3. **Optional branch scope:** `feat/pay-sbm-4-mpgs-payment-by-link` if the UI offers it.
4. **Do not** add MPGS keys to Agent CI / GitHub Infisical OIDC.
5. **`CORPFLOW_MPGS_PUBLIC_BASE_URL`:** `https://corpflow-ai-command-center-96xmzjh67-corpflowai.vercel.app` (no trailing slash).

**Cleanup later:** Map Infisical staging → Vercel Preview; delete manual Preview duplicates once sync is correct.

Do **not** paste credentials into Cursor, GitHub, or chat.

| Variable | What to set | Notes |
|----------|-------------|-------|
| `CORPFLOW_MPGS_ENABLED` | `true` | Master switch |
| `CORPFLOW_MPGS_MODE` | `test` | Never `production` until separately authorized |
| `CORPFLOW_MPGS_MOCK` | `false` | Real TEST gateway |
| `CORPFLOW_MPGS_GATEWAY_BASE_URL` | `https://test-gateway.mastercard.com` | SBM TEST REST host |
| `CORPFLOW_MPGS_API_VERSION` | `66` | Per SBM TEST manual |
| `CORPFLOW_MPGS_MERCHANT_ID` | Your TEST merchant ID | From MPGS portal — **do not commit** |
| `CORPFLOW_MPGS_API_PASSWORD` | Password 1 from Admin → Integration Settings | **do not commit or paste in chat** |
| `CORPFLOW_MPGS_RETURN_PATH` | `/pay/return` | Default |
| `CORPFLOW_MPGS_CANCEL_PATH` | `/pay/cancel` | Default |
| `CORPFLOW_MPGS_PAYMENT_LINK_EXPIRY_HOURS` | `72` | Optional |
| `CORPFLOW_MPGS_PAYMENT_LINK_ALLOWED_ATTEMPTS` | `3` | Optional |
| `CORPFLOW_MPGS_HOSTED_CHECKOUT_ENABLED` | `false` | Payment Link v1 |
| `CORPFLOW_MPGS_PUBLIC_BASE_URL` | Your **Preview** URL | e.g. `https://corpflow-ai-command-center-….vercel.app` (not `corpflowai.com`) |

After Vercel Preview entry: **redeploy PR #441 Preview**, then run diagnostics (Part B). Env changes require a new deployment.

### MPGS merchant portal (TEST)

Portal: `https://test-gateway.mastercard.com/ma/`

Whitelist return URLs to match:

- `{CORPFLOW_MPGS_PUBLIC_BASE_URL}{CORPFLOW_MPGS_RETURN_PATH}`
- `{CORPFLOW_MPGS_PUBLIC_BASE_URL}{CORPFLOW_MPGS_CANCEL_PATH}`

(Confirm exact whitelist pattern with SBM if required.)

---

## Part B — One TEST Payment Link (factory master session)

Use browser logged in as **factory master**, or API client with factory master cookie.

### 1. Schema

`POST https://<preview>/api/factory/postgres/ensure-schema`  
(factory master auth)

### 2. Diagnostics

`GET https://<preview>/api/factory/payments/mpgs/diagnostics`

Expect: `operational: true`, `mode: "test"`, `api_version: "66"`, `merchant_id_present: true`, `mpgs_public_base_url_present: true`, `mpgs_public_base_url_valid: true`  
(no password or merchant id in response)

### 3. Create approved payment record

`POST https://<preview>/api/factory/payments/records/create`

```json
{
  "purchaser_name": "TEST Buyer",
  "purchaser_email": "test-buyer@example.com",
  "amount_minor": 15000,
  "currency": "USD",
  "description": "AI Lead Rescue launch pilot TEST"
}
```

Save `payment_record_id` and `record_reference`.

### 4. Create Payment Link

`POST https://<preview>/api/factory/payments/mpgs/create-link`

```json
{
  "payment_record_id": "<payment_record_id from step 3>"
}
```

Save `attempt_reference` and `payment_link_url`.  
Send `payment_link_url` to your test browser only — **do not** publish on marketing pages.

### 5. Pay with MPGS TEST card

Open `payment_link_url` in a private browser window.

Use **MPGS / SBM TEST card numbers** from the MPGS TEST documentation (portal → Test Cards).  
Do not record full card numbers in repo or tickets — note only “TEST card used, last four …” if needed.

Complete payment; you should land on `/pay/return?order_ref=<attempt_reference>`.

### 6. Verify server-side (Retrieve Order)

`POST https://<preview>/api/factory/payments/mpgs/verify`

```json
{
  "attempt_reference": "<attempt_reference>"
}
```

Expect when payment succeeded:

- `verified_paid: true`
- `paid_from_redirect_only: false`
- `fulfilment_status: "blocked"` (no auto-fulfilment)
- `operator_review_required: true`

`GET .../api/factory/payments/mpgs/status?attempt_ref=<attempt_reference>` for snapshot.

### 7. Negative check (optional)

Before paying, hit `/pay/return?order_ref=<attempt_reference>&resultIndicator=fake` — must **not** show verified paid until verify returns gateway CAPTURED.

---

## Part C — Safe evidence for SBM

Capture **only**:

- Screenshot of `/pay/return` showing “pending” or “verified” wording (no card data)
- Redacted factory `status` JSON: `attempt_reference`, `record_reference`, `attempt_status`, `gateway_status`, `verified_paid_at` (boolean/timestamp only)
- Diagnostics JSON (booleans only)
- Note: TEST portal used, API version 66, Payment Link flow

Do **not** capture:

- Password 1, Merchant ID in screenshots, Authorization headers, full gateway JSON with card data, payment link URLs in public tickets (operator-only)

---

## Rollback

1. `CORPFLOW_MPGS_ENABLED=false` in Infisical (Preview env) → sync → redeploy Preview.
2. Revert PAY-SBM-4 merge if needed.
3. Payment rows remain audit-only; fulfilment was never auto-started.

---

## Reference

- Checklist: `docs/finance/PAY_SBM_4_MPGS_TEST_PAYMENT_BY_LINK_CHECKLIST.md`
- Infisical secrets: `docs/finance/PAY_SBM_4_INFISICAL_SECRETS.md`
- Design: `docs/finance/PAY_SBM_4_MPGS_PAYMENT_BY_LINK_DESIGN.md`
