## 1. Design / Decisions
- [ ] 1.1 Decide which fields from `persona.json` become first-class columns vs JSONB.
- [ ] 1.2 Decide whether to keep `vanguard/secrets-manifest.json` as file-only config or migrate non-secret portions to DB.
- [ ] 1.3 Define retention/limits for telemetry + ledgers in Postgres (row caps, TTL, archiving).

## 2. Implementation
- [ ] 2.1 Add Prisma models + SQL migration(s) for:
  - [ ] tenant_personas (or extend `tenants` table)
  - [ ] token_debits ledger
  - [ ] telemetry events
  - [ ] recovery vault entries
  - [ ] rigor reports (pending + acknowledged state) **or** explicitly deprecate serverless ack flow
- [ ] 2.2 Update Node code paths to use Postgres first; keep file fallback only for local dev behind env flag.
- [ ] 2.3 Update Python services to read from Postgres (or mark as local-only tooling).

## 3. Migration / Backfill
- [ ] 3.1 Add backfill script: ingest personas + ledgers + telemetry + recovery vault into Postgres (idempotent).
- [ ] 3.2 Add verification script comparing file vs DB counts and key fields.

## 4. Test Plan
- [ ] 4.1 Local: run backfill; run approve-build; verify token debit and telemetry stored in DB.
- [ ] 4.2 Vercel: verify no filesystem writes are required for normal CMP flows.

