# Token credits and **Approve build** (Change Console)

**Model (simple):** One Postgres row per tenant in **`tenant_personas`**, keyed by **`tenant_id`** (unique index). The server reads **`token_credit_balance_usd`** and **`billing_exempt`** in **a single query** per request on hot paths (`getTenantWalletSnapshot` in `lib/factory/costing.js`). With thousands of tenants, each session still touches **only that tenant’s row** — there is no table scan and no per-tenant env parsing on the DB path.

**Optional env OR:** **`CORPFLOW_BILLING_EXEMPT_TENANT_IDS`** is still supported as a **break-glass override** (same effect as `billing_exempt = true` in the DB). Effective rule: **`billing_exempt_effective = env_list_has(tenant) OR billing_exempt`**.

**Canonical code:** `lib/factory/costing.js`, `lib/cmp/router.js` (`approve-build`, `costing-preview`), `GET /api/ui/context` in `api/factory_router.js`, `lib/server/billing-exempt.js` (env only).

---

## Option A — Billing exempt in the database (recommended)

1. Run **`POST /api/factory/postgres/ensure-schema`** once after deploy (adds `billing_exempt` if missing; idempotently sets **`corpflowai`** to exempt if that row exists).
2. Or set per tenant from a trusted machine:

```powershell
$env:POSTGRES_URL="postgresql://..."
node scripts/top-up-tenant-token-balance.mjs --tenant=corpflowai --billing-exempt=true
```

3. Confirm: **`GET /api/ui/context`** while logged in as that tenant → **`billing_exempt: true`**, **`show_approve_build: true`** without needing a positive balance.

**Effect:** No token pre-check and **no debit** on approve-build for that tenant. Estimates can show **$0** client line; audit benchmark fields unchanged.

---

## Option B — Env override only (legacy / emergency)

Vercel → **`CORPFLOW_BILLING_EXEMPT_TENANT_IDS`** = comma-separated ids (e.g. `corpflowai`). Redeploy so lambdas pick it up. Prefer DB for anything long-lived so ops does not depend on redeploys.

---

## Option C — Pre-paid wallet (paying customer simulation)

```powershell
node scripts/top-up-tenant-token-balance.mjs --tenant=acme-corp --usd=2500
# or
node scripts/top-up-tenant-token-balance.mjs --tenant=acme-corp --add-usd=500
```

Each **Approve build** debits roughly **`displayed_client_usd`** (benchmark × **`CORPFLOW_CLIENT_BUILD_PRICE_RATIO`**, default **0.1**).

---

## Schema / migrations

- Prisma: `TenantPersona.billingExempt` → column **`billing_exempt`**.
- **`ensure-schema`** and `scripts/sql/001_factory_init.sql` add the column on older databases.

---

## Verify

- Tenant session on **`/change`**: **`GET /api/ui/context`** → `token_credit_balance_usd`, `billing_exempt`, `show_approve_build`.
- If **402** on approve: balance ≤ 0 and not exempt — use Option A/B/C above.

---

*Last updated: 2026-04-04 — DB-backed `billing_exempt` + single-query wallet snapshot.*
