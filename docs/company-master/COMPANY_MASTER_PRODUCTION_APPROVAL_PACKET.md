# Company Master — production approval packet (#776)

**Status:** Preview-backed implementation PR — awaiting Anton production approval  
**Controller:** #776 (parent #765)  
**Do not apply to production until Anton approves.**

## What ships in this PR

- Route: `/admin/company-master` (factory admin session)
- API: `/api/company-master/*` (via existing `factory_router`)
- Tables: `company_master_companies`, `company_master_artifacts`
- Storage adapter: **`postgres_company_master_bytes`** (dedicated BYTEA on `company_master_artifacts.data`)

## Storage adapter selection

| Option | Status in repo | Decision |
|--------|----------------|----------|
| Vercel Blob / S3 / R2 SDK | Not present; no env vars in `.env.template` | Not used |
| Google Drive server upload SDK | Not present | Not used |
| Existing Postgres BYTEA (change attachments pattern) | Live and used | **Selected** |

Binaries are stored in a **dedicated** Company Master table, not in `cmp_ticket_attachments`.  
Upload size limits **reuse** existing `CORPFLOW_CHANGE_UPLOAD_MAX_BYTES` (no new env var names).

## Migration

- Forward: `prisma/migrations/20260806120000_company_master_v1/migration.sql`
- Also mirrored in `lib/server/postgres-ensure-schema-statements.js` for Vercel build / ensure-schema

### Rollback (destructive)

```sql
BEGIN;
DROP TABLE IF EXISTS "company_master_artifacts";
DROP TABLE IF EXISTS "company_master_companies";
COMMIT;
```

```bash
npx prisma migrate resolve --rolled-back 20260806120000_company_master_v1
```

Synthetic cleanup without dropping tables:

```bash
# As factory admin session:
POST /api/company-master/synthetic-cleanup
{ "prefix": "cmp_synthetic_" }
```

## Production-only approvals still required

1. Apply migration / ensure-schema on production Postgres  
2. Confirm factory admin access to `/admin/company-master` on production hosts  
3. First **real** company onboarding (not synthetic)  
4. Any future move from BYTEA to external object storage (optional; adapter boundary already isolated)

## Explicit non-actions in this packet

- No production migration applied by the implementing agent  
- No production deploy / merge  
- No real company data or restricted document contents  
- No new secrets or paid storage products  
