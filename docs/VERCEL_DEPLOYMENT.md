# Vercel deployment loop (CorpFlow)

## What broke production before (Hobby plan)

Vercel **Hobby** rejects projects whose `vercel.json` **crons** run **more than once per day**. A schedule like `*/20 * * * *` caused **every** production deploy to fail at config time — including Git-triggered builds — so `main` moved forward while production stayed on an old commit.

**Fix:** each cron must use a **fixed minute and fixed hour** (e.g. `0 4 * * *`). See current `vercel.json`.

## Guards (so it does not happen again)

| Check | When |
|--------|------|
| `npm run verify:vercel-hobby-crons` | Local / CI; exits non-zero if `vercel.json` crons are not Hobby-safe |
| `npm run control:loop` | Includes a **Hobby cron** section; exits **1** if crons are invalid (override: `VERCEL_ALLOW_SUBDAILY_CRONS=1` on **Pro** with sub-daily crons) |
| GitHub **Agent CI** | Runs the cron guard on every push/PR to `main` |

`npm run verify:ci` runs the cron guard, then tests, then `next build`.

## Operational loop

1. **`npm run verify:vercel-hobby-crons`** before pushing if you edit `vercel.json`.
2. Push **`main`** → Vercel should build (Git connected) or use **Redeploy** / **deploy hook** (`.github/workflows/vercel-production-deploy-hook.yml`).
3. **`npm run control:loop -- --fetch`** — confirms `origin/main` SHA matches latest **production** deployment and (if env is set) factory health.

## Env loading (local scripts)

Repo-root **`.env`** and **`.env.local`** are loaded automatically by `scripts/bootstrap-repo-env.mjs` when you run Node scripts under `scripts/` (including `control:loop`, `vercel:env:*`, `ci:report`). See `.env.example`.

## Upgrade path (Pro)

If you move to **Pro** and need sub-daily crons, either:

- Loosen schedules in `vercel.json`, **or**
- Set **`VERCEL_ALLOW_SUBDAILY_CRONS=1`** so `control:loop` does not fail on stricter checks (CI still uses the Hobby validator unless you change the workflow).

For **CI** on Pro with sub-daily crons, adjust `.github/workflows/test.yml` or replace the guard with a policy that matches your plan.

## GitHub Actions: `POSTGRES_URL` and Prisma migrate

The **Agent CI** workflow (`.github/workflows/test.yml`) runs **`npx prisma migrate deploy`** when the repository secret **`POSTGRES_URL`** is set.

1. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: **`POSTGRES_URL`**. Value: the same pooled Postgres URL you use on Vercel for this project (Prisma).
3. Optional CLI: `gh secret set POSTGRES_URL` and paste the URL when prompted.

Forks and contributors without this secret still pass CI; the step prints a skip message. Nothing in the repo can create this secret for you automatically.

## Vercel env: factory health + Technical Lead + preview matching

Set on the Vercel project (at least **Production**):

| Variable | Purpose |
|----------|---------|
| **`CORPFLOW_FACTORY_HEALTH_URL`** or **`FACTORY_HEALTH_URL`** | Site origin only, e.g. `https://your-domain.com`. Technical Lead calls **`{origin}/api/factory/health`**. Alias: **`CORPFLOW_PUBLIC_BASE_URL`** is used if the health-specific vars are unset. |
| **`VERCEL_TOKEN`** (or **`VERCEL_AUTH_TOKEN`**) + **`VERCEL_PROJECT_ID`** | Vercel REST API for preview deployment status (`promote-status`, Technical Lead observer). |
| **`VERCEL_TEAM_ID`** or **`VERCEL_ORG_ID`** | Required when the project is under a team; must match the project you deploy from GitHub. |

Use the **same** `VERCEL_*` values everywhere you rely on preview lookup. Deployments are correlated to CMP by branch name: Vercel’s **`meta.githubCommitRef`** must equal **`cmp/{ticketId}`**, with **`ticketId` sanitized** the same way as in `lib/cmp/_lib/vercel-preview.js` (characters outside `[A-Za-z0-9._-]` replaced with `_`). If GitHub creates a different ref string, preview rows will not match until the branch naming matches.
