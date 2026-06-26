# Living Word — GHL read-only sync probe v1 (live verification)

**Status:** **PARTIAL** — probe route deployed; auth switched to admin **session** (no master key); live probe pending an operator session login. No GHL API calls made.

**Timestamp (UTC):** 2026-06-26 (no-master-key auth pass)

**Environment target:** Vercel Production factory (`core.corpflowai.com`)

## Statements

- **No secrets exposed** in this artifact
- **No GHL writes** performed (pending live run)
- **No outbound messages** sent
- **No public site / DNS / GHL config** changes

## Security policy — no master key in any process

**`MASTER_ADMIN_KEY` must never be used by an operator process, script, or automation.** It is deliberately **not** provisioned in Vercel or Infisical for this reason. Operator-run factory scripts authenticate via the admin **session** channel only.

## Confirmed factory auth model

`verifyFactoryMasterAuth()` (`lib/server/factory-master-auth.js`) accepts an **admin session cookie** (`corpflow_session`, signed JWT, `typ === 'admin'`) as its first and intended path. (It also has a legacy Bearer/`x-session-token` = `MASTER_ADMIN_KEY` fallback, but that secret is intentionally absent in Production, so that path is dead by design and is not used here.)

The admin session is minted by logging in at `/login` with **`CORPFLOW_ADMIN_USERNAME` / `CORPFLOW_ADMIN_PASSWORD`** (the approved, provisioned secrets) — never the master key.

## Root cause of the earlier 403

The probe script authenticated with `MASTER_ADMIN_KEY`, which is intentionally not present in Production — so the Bearer path could never succeed. The fix removes that path entirely.

## Fix applied (config only — no secret values, no production change)

- `scripts/invoke-ghl-living-word-probe.mjs` **no longer references `MASTER_ADMIN_KEY` / `ADMIN_PIN`**. It now sends the admin `corpflow_session` cookie (via `CORPFLOW_SESSION` or `GHL_PROBE_COOKIE`, auto-loaded from `.env.local`).
- `.env.template` records the no-master-key-in-process policy.

## How to complete this artifact (operator)

1. Log in as the factory admin in a browser at `https://core.corpflowai.com/login` (uses `CORPFLOW_ADMIN_USERNAME` / `CORPFLOW_ADMIN_PASSWORD`).
2. Copy the `corpflow_session` cookie value (DevTools → Application → Cookies). Put it in repo-root `.env.local` as `CORPFLOW_SESSION=<value>`. Never paste it into chat, commits, PRs, or logs.
3. Run (the script auto-loads `.env.local`):

```powershell
$env:GHL_PROBE_WRITE_ARTIFACT = "1"
node scripts/invoke-ghl-living-word-probe.mjs
```

4. On exit code **0** the script overwrites this artifact with the redacted manifest. A **403** means the session is missing/expired — re-log in and refresh `CORPFLOW_SESSION`.

Or simply open this authenticated GET in the **logged-in admin browser**:

`https://core.corpflowai.com/api/factory/ghl/living-word/probe?tenant_id=living-word-mauritius`

Env readiness (no GHL calls):

`https://core.corpflowai.com/api/factory/ghl/living-word/env-readiness`

## Sensitive domains intentionally excluded

- conversations
- messages
- notes
- contact_create_update_delete
- outbound_send
- webhooks_register

## Recommended next packet

Living Word GHL field mapping report (Phase 2) — **not** direct canonical import.

## Delivery Reality Audit

```text
Local fix exists: YES (probe uses admin session cookie; no MASTER_ADMIN_KEY in process)
Merged to main: PENDING (see auth PR)
Production deployment ID: probe route live (403 without admin session)
Commit deployed: GHL probe implementation on main (prior PR)
Live probe executed: NO (blocked on operator admin session login)
API call count: 0
GHL writes: NO
Secrets in artifact: NO
Real member data in artifact: NO
Final verdict: PARTIAL (auth switched to session-only; awaiting operator login)
Client-facing flow usable: N/A
```
