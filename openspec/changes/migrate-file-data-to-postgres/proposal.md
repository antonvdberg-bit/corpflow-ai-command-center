# Change: Migrate file-backed operational data to Postgres

## Why
Several runtime paths persist operational state to the filesystem (tenant personas, token debit ledger, telemetry, recovery vault, pending rigor reports). This works locally but breaks or becomes inconsistent on serverless hosts, and it fragments state across machines (local vs Change Console). We want **data in Postgres**, and files to contain **non-database elements only** (static templates, schemas, UI assets).

## What Changes
- Move **operational state** currently written to disk into Postgres tables.
- Replace read/write file access with Postgres reads/writes in the corresponding code paths.
- Keep files only for:
  - static schemas/templates (`vanguard/schema/*.json`)
  - static configuration defaults (non-secret)
  - public assets (`public/**`)

## Inventory (current file-backed data)
- **Tenant personas**: `tenants/<tenantId>/persona.json` (token credits, autonomy/rank, allowed sources, etc.)
- **Token debit ledger**: `vanguard/audit-trail/token_debits.jsonl`
- **Telemetry sink**: `vanguard/audit-trail/telemetry-v1.jsonl`
- **Rigor pending reports**: `vanguard/audit-trail/pending_rigor_reports/<tenant>/<report>.json` (Python verifier)
- **Recovery journaling**: `recovery_vault.json` (DB failover in `lib/server/audit.js`)
- **Secrets/Access manifest**: `vanguard/secrets-manifest.json` (tenant access clusters, admin list, tiers)

## Impact
- Affected code: `lib/factory/costing.js`, `lib/cmp/_lib/telemetry.js`, `lib/server/tenant-telemetry-tail.js`, `lib/server/audit.js`, `lib/cmp/router.js`, Python core services that read personas/manifests.
- Schema: Prisma + SQL migrations required.
- Migration: one-time backfill from existing files into Postgres (idempotent).
- Security: do not move secrets into DB unless explicitly modeled/encrypted; keep PATs and API keys in env/secrets.

