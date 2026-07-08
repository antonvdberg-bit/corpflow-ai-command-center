# LuxeMaurice AI — frontend integration notes

## What this pack is

Executable **PostgreSQL DDL + seed + verify** derived from client Drive v1–v14 product-thinking history. It is a **portable database architecture pack**, not a hosted backend.

---

## Option A — PostgreSQL direct

1. Create a local or client-owned Postgres database.
2. Run `schema.sql` then `seed.sql`.
3. Connect from your app with a standard Postgres client (node-pg, Prisma, Drizzle, etc.).
4. Always scope queries with `tenant_id`.

**Env variable names (no values in repo):**

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `LUX_AI_TENANT_ID` or `LUX_AI_TENANT_SLUG` | Tenant scope (`luxe-maurice`) |

---

## Option B — Supabase (client-owned)

If the client insists on Supabase:

1. Client creates their **own** Supabase project (Anton/billing approval).
2. Supabase SQL Editor → paste and run `schema.sql`, then `seed.sql`.
3. Use Supabase client with **project URL + anon key** in client env only:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Enable Row Level Security policies separately (not included in v1 pack — add per tenant model).

**Do not** paste service role keys into chat, GitHub, or this repo.

---

## Recommended first frontend flow

```
Property list (published)
  → Property detail (slug + gallery)
    → Buyer wizard (buyers + buyer_profiles + buyer_requirements)
      → Enquiry submit (enquiries)
        → Lead created (leads + lead_scores + property_matches)
          → CRM task for operator (crm_tasks)
```

### Minimal queries

- **List:** `properties` where `status = 'published'`
- **Detail:** `properties` + `property_media` + `property_documents`
- **Wizard:** upsert `buyers`, insert `buyer_profiles`, bulk insert `buyer_requirements`
- **Enquiry:** insert `enquiries`, then `leads`
- **CRM:** join `leads` ← `buyers`, `properties`, latest `lead_scores`

---

## CorpFlowAI usage (if we deliver backend/frontend)

- This schema is **separate** from CorpFlow `POSTGRES_URL` / `lux_listings`.
- CorpFlow can host a **preview BFF** against a client-owned DB or a dedicated sandbox DB.
- Map Lux public routes (`/properties`, `/concierge`) to these read/write models in a future bounded build packet.
- Recovery alignment ticket: `cmr7a244f0000l505x5vne2s0`.

---

## What is intentionally not included

- Live hosted API
- Auth provider wiring
- RLS policies
- File upload/storage implementation
- Email/WhatsApp/SMS senders
- Payment / ERPNext
