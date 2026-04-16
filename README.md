# CorpFlow AI Command Center

CorpFlow is a **DB-first** change management and delivery system.

- **Postgres is truth**: tickets, approvals, evidence, and workflow state are durable in the database.
- **One app / one DB**: assume a single deployed Next.js app backed by a single Postgres (`POSTGRES_URL`).
- **Thin UI**: the UI reflects the DB; it does not invent state.
- **Evidence-first gates**: no false “done” — merges and promotions are blocked until required evidence exists.

## What this repo contains

- **App**: Next.js (pages router) + Node API routes
- **DB**: Prisma + Postgres
- **CMP**: change tickets + promotion workflow (`lib/cmp/`, `/change`)
- **Automation**: GitHub/Vercel plumbing + callbacks (workflows under `.github/workflows/`)

## CMP lifecycle (the shape we enforce)

Build → Preview → Verify → Approve → Deploy

## Start here (operator doctrine)

- `AGENTS.md` (repo entrypoint)
- `docs/CORPFLOW_SHARED_TODO.md` (priorities + commit/push checklist)
- `docs/operations/TENANT_CLIENT_LOGIN.md` (tenancy + host/login rules)
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` (reliability / security bar)

## Local dev (app)

```bash
npm ci
npm test
npm run build
```

## Environment

Use `.env.template` as the canonical reference for required variables and aliases.

