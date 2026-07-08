# LuxeMaurice AI database delivery pack — runbook

**Deliverable:** portable PostgreSQL schema + sample seed + verification SQL.  
**Not included:** hosted backend, Supabase project, live credentials, CorpFlow production DB changes.

---

## Contents

| File | Purpose |
|------|---------|
| `schema.sql` | DDL — 21 core tables (incl. `user_roles`) |
| `seed.sql` | Sample/demo rows (fictional) |
| `verify.sql` | Post-install checks |
| `ERD.md` | Mermaid diagram |
| `DATA_DICTIONARY.md` | Table/column reference |
| `API_CONTRACT.md` | Frontend read/write models |
| `FRONTEND_INTEGRATION_NOTES.md` | Postgres vs Supabase integration |

---

## 1. Create local Postgres database

```powershell
# Example — adjust user/host/password locally; never commit credentials
createdb luxe_maurice_ai_sandbox
```

Or Docker:

```powershell
docker run --name lux-ai-pg -e POSTGRES_PASSWORD=localdevonly -e POSTGRES_DB=luxe_maurice_ai -p 5433:5432 -d postgres:16
```

---

## 2. Apply schema

```powershell
cd C:\CorpFlow\corpflow-ai-command-center
psql "postgresql://USER:PASSWORD@localhost:5432/luxe_maurice_ai_sandbox" -f artifacts/luxe-maurice-ai-db-delivery-pack/schema.sql
```

---

## 3. Apply seed (demo data)

```powershell
psql "postgresql://USER:PASSWORD@localhost:5432/luxe_maurice_ai_sandbox" -f artifacts/luxe-maurice-ai-db-delivery-pack/seed.sql
```

Seed uses `@example.invalid` emails and `SAMPLE` labels — safe for demos only.

---

## 4. Verify

```powershell
psql "postgresql://USER:PASSWORD@localhost:5432/luxe_maurice_ai_sandbox" -f artifacts/luxe-maurice-ai-db-delivery-pack/verify.sql
```

Expected: 21 tables listed; tenant `luxe-maurice`; sample property, buyer, enquiry→lead chain, CRM task; orphan count `0`.

---

## 5. Optional — Supabase import (client-owned project)

1. Client or Anton creates Supabase project (**no CorpFlow production wiring**).
2. Supabase Dashboard → SQL → New query → paste `schema.sql` → Run.
3. Repeat with `seed.sql`.
4. Run `verify.sql` in SQL Editor.
5. Store `SUPABASE_URL` and `SUPABASE_ANON_KEY` in **client env only**.

---

## Security warning

- **Never** commit database passwords, Supabase service role keys, or anon keys to GitHub, PR bodies, chat, or docs.
- **Never** paste secrets into Cursor chat.
- This pack contains **no secrets**.

---

## Source note

Schema derived from LuxeMaurice AI Drive v1–v14 **product-thinking history** (enterprise intent in v14, handover modules in v13, early DB intent in v2). Drive packages are **not** treated as runnable code. Contradictions resolved toward smallest MVP schema with extension points.

---

## Next build packet (after DB green)

1. Wire frontend list/detail/enquiry against this schema (client-owned DB or CorpFlow sandbox BFF).
2. Align with recovery ticket `cmr7a244f0000l505x5vne2s0` and `/client/recovery-roadmap` confirmation.
