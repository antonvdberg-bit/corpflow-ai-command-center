# LuxeMaurice AI — Supabase sandbox delivery runbook

**Scope:** Client-owned LuxeMaurice AI sandbox · **NOT** CorpFlow production Postgres  
**Recovery ticket:** `cmr7a244f0000l505x5vne2s0`  
**Preview UI:** `/client/luxe-maurice-ai-sandbox`  
**Health API:** `/api/lux/ai-sandbox/health`

---

## Boundary (non-negotiable)

- Do **not** replace or migrate CorpFlow `POSTGRES_URL` / Neon production.
- Do **not** add Supabase keys to Vercel Production unless Anton explicitly approves.
- Do **not** commit secrets to GitHub, docs, PR bodies, chat, or screenshots.
- Do **not** paste `service_role` keys into chat — enter them only in local `.env` or Supabase dashboard.

---

## Blocker today

Jan's Supabase-backed codebase (15 SQL migrations + app) is **not ingested** into this repo. Only the sandbox scaffold exists under `sandbox/luxe-maurice-ai/`. Until Drive package files are copied locally, scripts report `client_codebase_not_ingested` or `migration_order_empty`.

---

## 1. Create Supabase project (Anton / client-owned)

1. Supabase dashboard → **New project** → name e.g. `LuxeMaurice AI` (client sandbox).
2. Record (locally only, never commit):
   - **Project URL** → `LUX_AI_SUPABASE_URL`
   - **anon public key** → `LUX_AI_SUPABASE_ANON_KEY`
   - **service_role key** → `LUX_AI_SUPABASE_SERVICE_ROLE_KEY` (server/scripts only if needed; prefer DB URI for migrations)
   - **Database URI** (Settings → Database → Connection string → URI) → `LUX_AI_SUPABASE_DB_URL`

Enter values in **local `.env` only** (copy from `.env.template` placeholders).

---

## 2. Ingest Jan's codebase

1. Download LuxeMaurice AI package from client Drive (see `sandbox/luxe-maurice-ai/README.md`).
2. Copy **15 SQL files** → `sandbox/luxe-maurice-ai/database/migrations/`
3. Copy migration order → `sandbox/luxe-maurice-ai/scripts/run_migrations_order.txt` (one filename per line, Jan's order)
4. Verify no `.env` or keys are committed: `git status`

---

## 3. Verify (local)

```powershell
cd C:\CorpFlow\corpflow-ai-command-center
npm run lux-ai-sandbox:verify
```

Expected when blocked: JSON with `blocker` and `next_step`.  
Expected when ready: `"ok": true` after env + migrations present + Supabase reachable.

---

## 4. Run migrations (local only)

Dry-run (lists files, no SQL executed):

```powershell
npm run lux-ai-sandbox:migrate
```

Apply (requires `LUX_AI_SUPABASE_DB_URL` in local `.env`):

```powershell
npm run lux-ai-sandbox:migrate -- --apply
```

Scripts **fail closed** if env or migration files missing. **Never logs** service_role or DB password.

Alternative: paste each SQL file into Supabase **SQL Editor** in the order listed in `run_migrations_order.txt`.

---

## 5. Verify tables (Supabase dashboard)

1. Supabase → **Table Editor** — confirm tables from Jan's schema exist after migrations.
2. Or SQL Editor: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;`

---

## 6. Start preview (CorpFlow app, local or Vercel Preview)

```powershell
npm run build
npm run start
```

Open:

- `http://localhost:3000/client/luxe-maurice-ai-sandbox` — status UI
- `http://localhost:3000/api/lux/ai-sandbox/health` — JSON health

On Lux preview host: same paths on `*.vercel.app` (set `LUX_AI_SUPABASE_*` in **Preview env only** if Anton approves).

Operator recovery ticket: `/change?id=cmr7a244f0000l505x5vne2s0` → **Open recovery review preview**

---

## 7. Next build packet (after sandbox green)

1. Jan confirms recovery direction via `/client/recovery-roadmap` private link.
2. Anton reviews confirmation on `/change`.
3. Open bounded build packet: wire Jan's app routes into sandbox or selected Lux surfaces — **separate PR**, Anton-gated.

---

## Explicit non-actions

No production deploy · No CorpFlow DB replacement · No secrets in repo · No external email/WhatsApp/SMS · No payment/ERPNext · No paid Supabase tier change without Anton approval.
