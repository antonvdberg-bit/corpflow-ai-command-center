# Smoke Change Console technical-lead audits — GitHub Actions (manual)

**Workflow:** `.github/workflows/smoke-change-console-technical-lead.yml`

**Status:** Manual dispatch only — **no schedule** in Packet B v1.

**Verdict when green:** Confirms production accepts `CORPFLOW_CRON_SECRET` on read-only `GET /api/factory/technical-lead/audits` without factory master in CI.

---

## Prerequisites

1. **Packet A merged and deployed** — cron Bearer auth on audits GET (`#403`).
2. **Repo secrets set** (GitHub → Settings → Secrets and variables → Actions):

| Secret | Example |
| ------ | ------- |
| `CORPFLOW_CORE_BASE_URL` | `https://core.corpflowai.com` |
| `CORPFLOW_CRON_SECRET` | Same as Vercel `CORPFLOW_CRON_SECRET` / `CRON_SECRET` |
| `CMP_SMOKE_CHANGE_TICKET_ID` | One CMP ticket id (stable smoke ticket) |

**Never add:** `MASTER_ADMIN_KEY`, `ADMIN_PIN`, tenant passwords, or `POSTGRES_URL` to GitHub Actions.

---

## How Anton runs it

1. GitHub → **Actions** → **Smoke Change Console technical-lead audits**.
2. Click **Run workflow** → **Run workflow** (no inputs).
3. Open the run log.

**Expected success:**

- Step prints `Endpoint: GET /api/factory/technical-lead/audits?...`
- `HTTP 200` (or other 2xx)
- `ok:true found: True`
- `Smoke passed: read-only technical-lead audits accepts cron Bearer`

**Expected failure (fix before enabling any future schedule):**

- `HTTP 401` or `403` — Packet A not on Production, wrong cron secret, or auth regression
- Non-2xx — endpoint or routing issue
- `ok:true found: False` — unexpected JSON shape

---

## Rollback

Delete or disable `.github/workflows/smoke-change-console-technical-lead.yml` in a follow-up PR. No production runtime change required to disable.

---

## Related

- `docs/execution/LAPTOP_BURN_DOWN_P0_CLOSEOUT_READINESS_V1.md` §6
- `docs/execution/LAPTOP_DEPENDENCY_BURN_DOWN_V1.md` §4.2–5.2
