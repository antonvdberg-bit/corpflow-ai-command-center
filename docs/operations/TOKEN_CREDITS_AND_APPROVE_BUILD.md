# Token credits and **Approve build** (Change Console)

**Why this exists:** Tenant sessions on `/change` only get **`show_approve_build: true`** when there is **pre-paid balance** in Postgres (`tenant_personas.token_credit_balance_usd`) **or** the tenant is **billing-exempt**. Otherwise **`approve-build`** returns **402** (`INSUFFICIENT_CREDITS` or debit failure).

**Canonical code:** `lib/cmp/router.js` (`approve-build`), `lib/factory/costing.js`, `lib/server/billing-exempt.js`, `GET /api/ui/context` in `api/factory_router.js`.

---

## Option A — Billing-exempt (recommended for your own org tenant)

Use for **`corpflowai`** (apex marketing / internal work) when you do **not** want to simulate client wallet debits.

1. In **Vercel** → Project → Settings → Environment Variables, set:
   - **`CORPFLOW_BILLING_EXEMPT_TENANT_IDS`** = `corpflowai`  
   - (Optional) add other ids comma-separated: `corpflowai,root`
2. **Redeploy** production (or wait for the next deploy) so serverless functions read the new value.
3. Confirm: while logged in as a **tenant** user for `corpflowai`, **`GET /api/ui/context`** should show **`billing_exempt: true`** and **`show_approve_build: true`** even with **$0** balance.

**Effect:** No token check before approve; **no debit** on approve-build for those tenants. Estimates still carry audit **`full_market_value_usd`**; client-facing charge line can show **$0** for exempt tenants.

---

## Option B — Top up wallet (simulate paying customer)

Use when you want **real debits** against a float (e.g. testing cash-positive guardrails).

**From a trusted machine with `POSTGRES_URL` (same as production):**

```powershell
cd path\to\corpflow-ai-command-center
$env:POSTGRES_URL="postgresql://..."   # from Vercel
node scripts/top-up-tenant-token-balance.mjs --tenant=corpflowai --usd=2500
```

**Raw SQL (Neon console / psql):**

```sql
insert into tenant_personas (id, tenant_id, token_credit_balance_usd, created_at, updated_at)
values (gen_random_uuid()::text, 'corpflowai', 2500, now(), now())
on conflict (tenant_id) do update set
  token_credit_balance_usd = excluded.token_credit_balance_usd,
  updated_at = now();
```

*(If your `id` column is not `gen_random_uuid()::text`, use a cuid or match your Prisma migrations.)*

Prisma-friendly: prefer the script so `id` and types match your schema.

---

## How much to add?

- Each **Approve build** debits roughly **`displayed_client_usd`** (benchmark × **`CORPFLOW_CLIENT_BUILD_PRICE_RATIO`**, default **0.1**). Complex/risky tickets can be larger.
- For a **multi-ticket marketing build**, either set **exempt** for `corpflowai` or keep **a few hundred to a few thousand USD** in the test wallet and top up when 402s appear.

---

## Verify

- Logged in on **`https://corpflowai.com/change`** as tenant **`corpflowai`**: UI should allow **Approve build** (no red “insufficient credits” path).
- If still blocked: check **`GET /api/ui/context`** JSON for `token_credit_balance_usd`, `billing_exempt`, `show_approve_build`, and `change_console_readiness.warnings`.
