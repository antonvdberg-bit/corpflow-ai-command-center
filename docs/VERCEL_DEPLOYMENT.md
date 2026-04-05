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
