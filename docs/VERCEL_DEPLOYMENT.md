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
| **`CORPFLOW_FACTORY_HEALTH_URL`** or **`FACTORY_HEALTH_URL`** | **Site origin** (e.g. `https://your-domain.com`) **or** the full health URL `https://your-domain.com/api/factory/health` — Technical Lead normalizes both. Alias: **`CORPFLOW_PUBLIC_BASE_URL`**. **Note:** the GitHub Actions secret for `factory-health-ping.yml` is the **full** health URL; you can paste the same value here and it will not double-append the path. |
| **`VERCEL_TOKEN`** (or **`VERCEL_AUTH_TOKEN`**) + **`VERCEL_PROJECT_ID`** | Vercel REST API for preview deployment status (`promote-status`, Technical Lead observer). |
| **`VERCEL_TEAM_ID`** or **`VERCEL_ORG_ID`** | Required when the project is under a team; must match the project you deploy from GitHub. |

Use the **same** `VERCEL_*` values everywhere you rely on preview lookup. Deployments are correlated to CMP by branch name: Vercel’s **`meta.githubCommitRef`** must equal **`cmp/{ticketId}`**, with **`ticketId` sanitized** the same way as in `lib/cmp/_lib/vercel-preview.js` (characters outside `[A-Za-z0-9._-]` replaced with `_`). If GitHub creates a different ref string, preview rows will not match until the branch naming matches.

## Technical Lead observer (Phase A)

| Surface | Purpose |
|---------|---------|
| **`GET /api/cron/technical-lead`** | Daily cron (see `vercel.json`); Bearer **`CORPFLOW_CRON_SECRET`** or **`CRON_SECRET`** (set Vercel **`CRON_SECRET`** to the same value so the scheduler sends the header). |
| **Factory `/api/factory/technical-lead/run`** (GET or POST) | Factory master — manual run (`limit`, `ticket_id`, `dry_run`). |
| **`GET /api/factory/technical-lead/audits?ticket_id=`** | Factory master — recent `technical_lead_audits` rows. |
| **Factory `POST /api/factory/github/pr-create`** | Factory master — create/reuse a PR from `head` → `base` using `CMP_GITHUB_TOKEN` + `GITHUB_REPO` (default: draft PR). If `head` is omitted, the factory generates `factory/<ticketId>/<slug>` (sanitized). |
| **`npm run technical-lead:run`** | Local script (`scripts/technical-lead-run.mjs`); uses `.env` via bootstrap. |

Table: **`prisma/migrations/…/technical_lead_audits`** + **`npm run db:migrate:deploy`** on production DB (or `ensure-schema` idempotent DDL). Evidence is **Postgres** (`evidence_json`, `gaps_json`, `summary_text`), not PR comments alone.

**Phase B (client surface):** `GET /api/cmp/router?action=technical-lead-latest&id=<ticket>` — tenant-safe latest audit for Change Console. Optional **`CORPFLOW_TECHNICAL_LEAD_LLM_SUMMARY=true`** + **`GROQ_API_KEY`** adds `summary_llm` (rephrase; deterministic `summary_text` stays canonical in DB). Optional checklist overrides: **`config/technical-lead-checklist.v1.json`** or **`CORPFLOW_TECHNICAL_LEAD_CHECKLIST_PATH`**.

## Optional: Cursor Bugbot (PR review)

**[Cursor Bugbot setup](https://cursor.com/docs/bugbot#setup)** supports a **free tier** for GitHub PR comments. It complements **Agent CI** and the **Technical Lead observer** (deterministic DB evidence); it does not replace migrations, cron secrets, or `VERCEL_*` alignment.

<!-- Tracked Bugbot link (optional, same destination as docs#setup): https://track.pstmrk.it/3s/cursor.com%2Fdocs%2Fbugbot%23setup/I76j/74HEAQ/AQ/1556dd49-ceef-4739-bd8c-e16116455257/1/rFvvTlI3G-#setup -->
