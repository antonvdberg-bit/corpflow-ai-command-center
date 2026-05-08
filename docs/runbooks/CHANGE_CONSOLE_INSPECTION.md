# Change Console (`/change`) — safe inspection path

**Goal:** let Cursor, an operator, or CI verify the LuxeMaurice `/change` UI on the **real production host** without weakening security: no public `/change`, no factory/admin credentials, no secrets in the repo or in logs.

This is the canonical procedure for the inspection workflow used by `npm run smoke:change-overflow` and any equivalent ad-hoc check.

> Cross-references:
> - Tenancy + login: `docs/operations/TENANT_CLIENT_LOGIN.md`
> - Production verification rules: `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`
> - Security envelope (auth, tenant gates, sessions): `docs/operations/SECURITY_REVIEW_CHECKLIST.md`
> - Vercel protection background: `docs/VERCEL_DEPLOYMENT.md` § *Client-facing preview URLs vs Vercel Deployment Protection*

---

## 1. Trust model

| Concern | Production answer |
|---|---|
| Is `/change` public? | **No.** The page renders shell HTML for everyone, but ticket data only comes from `/api/cmp/router?action=ticket-*` after authenticated tenant or admin session via `corpflow_session` cookie. Tenant sessions are scoped to `auth_users.tenant_id` server-side. |
| Does inspection bypass tenant authorization? | **No.** The smoke logs in as a real `auth_users` row with `level=tenant`, `tenant_id=luxe-maurice`. `lib/cmp/router.js` enforces `requireFactoryMasterOnly` on factory routes, and `handleTicketGet` returns `404` if the row's `tenant_id` differs from the session's. |
| Where do secrets live? | Operator's `.env.local` (gitignored) or GitHub Actions repo secrets. **Never** in source files, code comments, `console.log`, or screenshots. |
| Edge protection | If the URL is behind **Vercel Deployment Protection** (typical only for Preview / `*.vercel.app`), the **Protection bypass for automation** secret is sent as the `x-vercel-protection-bypass` header. Production `lux.corpflowai.com` is the customer-facing host and should **not** be SSO-gated; the bypass is a no-op there. |

---

## 2. One-time setup (factory master)

These steps require Postgres access (same DB as Vercel production) and are done **once per environment**.

### 2.1 Provision a dedicated low-privilege test operator

A separate `auth_users` row, never reused for real client work or factory ops.

```powershell
# PowerShell, repo root, with POSTGRES_URL pointing at the same DB Vercel uses.
$env:POSTGRES_URL = "postgresql://..."   # paste from Vercel → Project → Settings → Environment Variables
node scripts/provision-tenant-test-access.mjs `
  --tenant=luxe-maurice `
  --username=lux-smoke@corpflowai.com `
  --gen-password
```

The script prints a one-time "wallet card" with the generated password. **Save it once in 1Password / Bitwarden under a distinct entry (e.g. "Lux smoke operator").** It is never readable from the database again.

The resulting row has:
- `auth_users.username = lux-smoke@corpflowai.com` (lowercased)
- `auth_users.level = tenant`  (not `admin`)
- `auth_users.tenant_id = luxe-maurice`
- `auth_users.enabled = true`

The session signed for this user has `typ=tenant`, which means:
- ✅ Allowed: `requireDormantGate` actions (read/refresh tickets they own, view `/change`).
- ❌ Denied: `requireFactoryMasterOnly` actions (provision PINs, factory promote-merge, factory-only repair) — see `lib/cmp/router.js`.
- ❌ Denied: any tenant-scoped read where `cmp_tickets.tenant_id != 'luxe-maurice'` (returns `404`).

### 2.2 (Optional) Vercel Protection bypass for automation

Only required when the host you target is gated by **Vercel Deployment Protection** — typically Preview deployments (`*.vercel.app`) or projects with Protection enabled on Production.

In Vercel: **Project → Settings → Deployment Protection → Protection Bypass for Automation → Add secret**.

Vercel injects the value as **`VERCEL_AUTOMATION_BYPASS_SECRET`** into deployments automatically. For local / CI use of the smoke script, paste the **same value** into:

- Operator local: `.env.local` → `VERCEL_AUTOMATION_BYPASS_SECRET=...`
- GitHub Actions: repo secret of the same name.

The script sends `x-vercel-protection-bypass: <secret>` and `x-vercel-set-bypass-cookie: true` on every request. The value is never logged.

### 2.3 Confirm tenant hostname mapping

The script targets `LUX_SMOKE_BASE_URL` (default `https://lux.corpflowai.com`). Confirm the `tenant_hostnames` row exists and is `enabled` — if not, see `docs/operations/TENANT_CLIENT_LOGIN.md` § *LuxeMaurice checklist* (or run `npm run factory:upsert-luxe-hosts`).

---

## 3. Per-run setup (operator / Cursor / CI)

### 3.1 Local `.env.local`

Create / update `.env.local` (gitignored — verified by `.gitignore` `.env*.local` rule):

```ini
LUX_SMOKE_BASE_URL=https://lux.corpflowai.com
LUX_SMOKE_TENANT_ID=luxe-maurice
LUX_SMOKE_USERNAME=lux-smoke@corpflowai.com
LUX_SMOKE_PASSWORD=<the value printed by the wallet card in step 2.1>
LUX_SMOKE_TICKET_MASTER=cmo8mjijk0000jl04l1jz0v6d
# Optional:
# LUX_SMOKE_TICKET_SHORT=<a known short Lux ticket id>
# VERCEL_AUTOMATION_BYPASS_SECRET=<only if the host is SSO-gated>
```

### 3.2 Install Playwright Chromium (one-time per machine)

```powershell
npx playwright install chromium
```

### 3.3 Run the smoke

```powershell
npm run smoke:change-overflow
```

Successful output (truncated):

```
[smoke] base=https://lux.corpflowai.com tenant=luxe-maurice master=cmo8mjijk0000jl04l1jz0v6d bypass=not_set headless=true
[login] OK level=tenant tenant_id=luxe-maurice
[master] selecting ticket=cmo8mjijk0000jl04l1jz0v6d
[master] screenshot=.smoke-screenshots/2026-05-08T...master.png
[overflow:master] doc=1440px win=1440px docOverflow=false wideElements=0
[short] picking short ticket from queue
[short] selected ticket=<short_id> source=queue
[short] screenshot=.smoke-screenshots/2026-05-08T...short_<short_id>.png
[overflow:short] doc=1440px win=1440px docOverflow=false wideElements=0
[smoke] OK
```

If the master ticket triggers horizontal overflow but the short ticket does not, the script exits non-zero with `FAILED: overflow:master`. The two screenshots are in `.smoke-screenshots/` (gitignored) for visual diff.

### 3.4 Cursor automation

Cursor / agents can drive the same flow via the script and read the screenshots in `.smoke-screenshots/` for analysis. They must not paste credentials into chats; they should rely on `.env.local` already provisioned by the operator.

---

## 4. Required env summary

| Variable | Required | Used for | Source |
|---|---|---|---|
| `LUX_SMOKE_USERNAME` | ✅ | tenant login (auth_users.username) | `.env.local` / GH secret |
| `LUX_SMOKE_PASSWORD` | ✅ | tenant login | `.env.local` / GH secret |
| `LUX_SMOKE_TENANT_ID` | optional (default `luxe-maurice`) | tenant scope | `.env.local` |
| `LUX_SMOKE_BASE_URL` | optional (default `https://lux.corpflowai.com`) | target host | `.env.local` |
| `LUX_SMOKE_TICKET_MASTER` | optional (default `cmo8mjijk0000jl04l1jz0v6d`) | master ticket id under inspection | `.env.local` |
| `LUX_SMOKE_TICKET_SHORT` | optional | pin a specific short ticket | `.env.local` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` (or `CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET`) | only if URL is Vercel-protected | adds `x-vercel-protection-bypass` header | `.env.local` / GH secret |
| `LUX_SMOKE_OUT_DIR` | optional (default `.smoke-screenshots`) | screenshot output dir | `.env.local` |
| `LUX_SMOKE_HEADLESS`, `LUX_SMOKE_SLOWMO_MS` | optional | local debugging | `.env.local` |

**Rule:** these names are not added to Vercel project envs. They live on the operator machine or CI runner only.

---

## 5. What the script verifies (and what it does not)

Verifies:
- HTTPS reachability of `LUX_SMOKE_BASE_URL`.
- `POST /api/auth/login` succeeds with the test credentials and returns `level: tenant`, `tenant_id: <expected>`.
- `/change` loads the operator queue.
- The master ticket can be selected (`#cfSelectedTicketId` updates and `/api/cmp/router?action=ticket-get` resolves successfully — proven by lack of error toasts and the synced brief).
- A short ticket from the queue can be selected the same way.
- `document.documentElement.scrollWidth <= window.innerWidth + 1` for both views.
- Key panels (`main`, `section`, panels marked with `data-cf-panel` / `data-testid`) do not exceed the viewport width.
- Two full-page screenshots are written to `LUX_SMOKE_OUT_DIR` for visual diff.

Does not verify:
- Functional correctness of any business action (approve-build, refine, etc.). This is read-only inspection.
- Mobile breakpoints — the script uses 1440×900. Add additional viewport runs if needed.

---

## 6. Security risks and how they are bounded

| Risk | Bound |
|---|---|
| Test operator credentials leaked → impersonation of LuxeMaurice tenant | Stored only in `.env.local` / GH secrets. Account is `level=tenant`, scoped to `luxe-maurice`. Rotate by rerunning `provision-tenant-test-access.mjs` with the same `--username` and a new `--gen-password`. |
| Test operator escalated to factory privileges | Cannot happen via app code: `requireFactoryMasterOnly` rejects `typ=tenant` sessions; the user is not in `CORPFLOW_ADMIN_USERNAME` / `auth_users` admin rows. |
| Test operator reads other tenants' tickets | `handleTicketGet` enforces `cmp_tickets.tenant_id == session.tenant_id`; mismatched IDs return 404. The `ticket-operator-queue` is also tenant-scoped. |
| Vercel bypass secret leaked → public bypass of deployment protection | Stored only as Vercel env (auto-injected) and optionally `.env.local` / GH secret. Rotated by deleting + re-adding the secret in Vercel. Never logged. |
| Screenshots commit to git | `.smoke-screenshots/` is gitignored. Screenshots may contain ticket text from `luxe-maurice` only — share via secure channel, not public PRs. |
| Smoke run masks a real outage | Production verification rules in `.cursor/rules/delivery-reality.mdc` still apply: a green smoke is **not** a Delivery Reality verdict; it is one input. |

---

## 7. Required workflow for Lux `/change` UI / layout fixes

**This loop is mandatory** for any change touching `pages/change.js`, the `/change` layout helpers in `lib/cmp/_lib/change-*`, or any Lux-only render block that ships to `lux.corpflowai.com/change`. Static code inspection and "looks right locally" are **not** sufficient evidence; the smoke against a live preview is.

| Step | Action | Pass criterion |
|------|--------|----------------|
| 1 | Push the branch and let Vercel build a preview deployment. If the preview build is `ERROR` (e.g. transient `database_connection_problem`), trigger a redeploy until it is `READY`. | Preview deployment ID recorded; state = `READY`. |
| 2 | Run `npm run smoke:change-overflow` with `LUX_SMOKE_BASE_URL=<preview .vercel.app URL>` and `VERCEL_AUTOMATION_BYPASS_SECRET` set (preview deployments are SSO-gated). | Script exits 0; both master and short tickets show `overflow=0px`, `widerCount=0`. |
| 3 | Inspect `.smoke-screenshots/<stamp>_<host>_master_*.png` and the matching `.json` report. Compare against the baseline screenshot from before the fix. | Visual: master ticket fully fits the 1440px viewport, no horizontal scroll, key panels render. JSON: `top_offenders` either empty or only `internalOverflow=true` items that do **not** push the viewport. |
| 4 | **Only after steps 1–3 pass** on the preview do you merge the PR to `main`. | PR is merged with at least one passing preview-smoke run referenced in the PR description or commit body. |
| 5 | After Vercel Production deploys the merge commit, re-run the smoke against `LUX_SMOKE_BASE_URL=https://lux.corpflowai.com` (no bypass needed — custom domain). Record deployment ID + commit + smoke result in the **Delivery Reality Audit** before flipping the verdict to `COMPLETE`. | Production smoke: same `overflow=0px`, `widerCount=0` across master + short. |

If step 2 or 5 fails, do **not** merge / do **not** declare COMPLETE — fix the offending elements (apply `changeFlexMainChildStyle()`, `changeTextContainStyle()`, `minmax(0, …)` grid tracks, `minWidth: 0` on grid items) and re-run from step 1. Use `?layoutDebug=1` on the preview URL when offender paths are non-obvious; the in-page overlay highlights every element wider than its viewport.

> **Why this is mandatory:** prior layout regressions (PR #152, #153 history) shipped on the back of code-only review and re-broke production within hours. The preview→smoke→merge→prod-smoke loop catches the regression before it reaches `lux.corpflowai.com`.

---

## 8. Rotation / decommission

- **Rotate password:** rerun `node scripts/provision-tenant-test-access.mjs --tenant=luxe-maurice --username=lux-smoke@corpflowai.com --gen-password`. Update `.env.local` and any GitHub Actions secret. Old password stops working immediately because `password_hash` / `password_salt` are overwritten.
- **Disable account:** `UPDATE auth_users SET enabled=false WHERE username='lux-smoke@corpflowai.com';` (or do it via factory tooling). Login then fails with `INVALID_CREDENTIALS` and the smoke exits non-zero.
- **Delete account:** `DELETE FROM auth_users WHERE username='lux-smoke@corpflowai.com';` once the inspection workflow is no longer needed.
- **Rotate Vercel bypass:** Vercel UI → Deployment Protection → Protection Bypass → rotate. Update `.env.local` / GH secret to match if used outside deployments.
