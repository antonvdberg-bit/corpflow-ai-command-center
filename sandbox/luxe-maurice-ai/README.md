# LuxeMaurice AI — client-designed Supabase sandbox (ingest target)

**Status:** Delivery sandbox only · **NOT** CorpFlow production Postgres · **NOT** wired to CorpFlow production without Anton approval.

## Purpose

This folder holds **Jan's LuxeMaurice AI codebase** (Supabase-backed) as a **client-owned sandbox artifact**. CorpFlow uses it to run migrations and preview the designed system without replacing `POSTGRES_URL`.

## Current blocker

**The client SQL migrations and application code are not in this repo yet.** They live in Jan's Drive packages (v1–v14). Until an operator copies them here, migration scripts will report `client_codebase_not_ingested` or `migration_order_empty`.

## Ingest steps (operator)

1. Download Jan's LuxeMaurice AI package from Drive (see `artifacts/luxe-maurice-ai-handoff/README.md` for links).
2. Copy into this directory, preserving:
   - `database/migrations/*.sql` (15 files)
   - `scripts/run_migrations_order.txt` (execution order — one filename per line)
   - Application source if present (README from Jan's package)
3. **Do not commit** `.env`, anon keys, service_role keys, or database passwords.
4. Follow `docs/runbooks/LUX_AI_SUPABASE_SANDBOX_DELIVERY.md` for Supabase project setup and verification.

## Expected layout after ingest

```text
sandbox/luxe-maurice-ai/
  README.md
  database/migrations/          ← 15 × .sql from Jan's package
  scripts/run_migrations_order.txt
  (optional app source from Jan)
```

## Recovery ticket

Programme control: `cmr7a244f0000l505x5vne2s0` · Review surface: `/client/recovery-roadmap`

## Preview routes (CorpFlow host)

- Health UI: `/client/luxe-maurice-ai-sandbox`
- Health API: `/api/lux/ai-sandbox/health`
