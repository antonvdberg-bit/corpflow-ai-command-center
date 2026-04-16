# Firm request: DB-driven tenant surfaces + staged engineering path

**To:** CorpFlow engineering (human + factory automation)  
**From:** Product / architecture (Cursor agent session, 2026-04-03)  
**Status:** Request for prioritization and execution

---

## 1. Business intent

We are targeting **many tenants**, **frequent copy/theme changes**, and a **small engineering team**. Building sites like LuxeMaurice primarily by hand in Cursor **does not exercise factory automation** and duplicates work. We request a deliberate shift: **data and automation own repeatable tenant work**; the repo owns **contracts, safety, and thin rendering**.

---

## 2. Interaction rubric: factory (hands) vs brain (Cursor / design)

Use this to classify work **before** starting. Not every chat turn maps 1:1—use **intent**.

| Interaction / work type | Default owner | Rationale |
|-------------------------|---------------|-----------|
| **Tenant hostname → tenant_id mapping** | **Factory** (DB + `tenant-hostname-upsert` / onboarding script) | Repeatable, audited, no code change per client |
| **Provisioning PIN / auth_users** | **Factory** (`provision-tenant-test-access.mjs`, later ingest/playbook) | Same path for every tenant; secrets handled operationally |
| **Website draft JSON (theme, copy, i18n)** | **Factory** (editor + `website_draft` in Postgres, optional n8n) | Frequent changes without deploy |
| **Scheduled health / cron / webhooks** | **Factory** (GitHub Actions, Vercel cron, n8n) | 24/7 execution per `EXECUTION_BRAIN_VS_HANDS.md` |
| **CMP mirror, automation ingest, notifications** | **Factory** | Already designed as hands |
| **New API contract or auth rule** | **Brain** (repo + review) | Security and compatibility |
| **Schema migration (Prisma)** | **Brain** | One-time shape of the vault |
| **Refactor shared loader (one read path + cache headers)** | **Brain** | Code quality; then factory benefits |
| **LuxeMaurice-specific marketing copy in source** | **Wrong default** — should live in **draft or playbook seed**, not hardcoded JS/HTML | Scales to N tenants |
| **Debugging a single prod incident** | **Brain** first → automate prevention in **Factory** after | Learn once, encode as check or playbook |

**Rule of thumb:** If the answer is “we’ll do that again for the next tenant,” **push it toward factory + DB** after the first brain-led design.

---

## 3. Staged path (low drama → high leverage) — commit to executing

1. **Unify tenant site read path** — One server module builds `{ tenant row + merged draft + defaults }` for both `getServerSideProps` and `GET /api/tenant/site` (reduce drift).
2. **Public GET caching** — Short `Cache-Control` / optional `ETag` on `/api/tenant/site` for anonymous traffic to cut DB cost and latency.
3. **Pooling / Prisma hygiene** — Align with serverless Postgres (pooler / single client pattern per runtime) per deployment docs.
4. **Optional ISR / edge cache** for `/` per hostname when staleness tradeoff is acceptable.

Track progress in `docs/CORPFLOW_SHARED_TODO.md` (P1 — Tenant surfaces).

---

## 4. LuxeMaurice client login (operational)

Canonical tenant id: **`luxe-maurice`**. Primary host: **`lux.corpflowai.com`** (see `docs/lux-v1-acceptance.md`).

**Required in Postgres:**

1. Row(s) in **`tenant_hostnames`**: **`lux.corpflowai.com`** (official) and optionally **`luxe.corpflowai.com`** (alias) → `tenant_id` `luxe-maurice`, `enabled` true (`npm run factory:upsert-luxe-hosts`). Without `lux`, the edge may guess tenant `lux` from the subdomain and **not** match your DB user/PIN.
2. **`tenants.sovereign_pin_hash`** set (provision script `--pin`) **or** **`auth_users`** row with `level=tenant` and matching `tenant_id`.

**Code change (2026-04-03):** Tenant login now treats **`tenant_hostnames` as authoritative**: empty Tenant ID is filled server-side; a mismatched ID returns **`TENANT_ID_HOST_MISMATCH`** with `expected_tenant_id`. See `docs/operations/TENANT_CLIENT_LOGIN.md`.

---

*This artifact is the written firm request referenced in shared planning; update it when stages complete.*
