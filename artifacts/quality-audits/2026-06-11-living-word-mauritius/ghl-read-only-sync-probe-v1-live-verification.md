# Living Word — GHL read-only sync probe v1 (live verification)

**Status:** **PARTIAL** — probe route deployed and auth model fixed; live probe still blocked on a one-time operator value sync (see below). No GHL API calls made.

**Timestamp (UTC):** 2026-06-26 (secret-wiring / auth-availability pass)

**Environment target:** Vercel Production factory (`core.corpflowai.com`)

## Statements

- **No secrets exposed** in this artifact
- **No GHL writes** performed (pending live run)
- **No outbound messages** sent
- **No public site / DNS / GHL config** changes

## Confirmed factory auth model

`verifyFactoryMasterAuth()` (`lib/server/factory-master-auth.js`) accepts, in order:

1. an **admin session cookie** (`typ === 'admin'`), then
2. a Bearer / `x-session-token` matching **`MASTER_ADMIN_KEY`**, then its alias **`ADMIN_PIN`** (both via `cfg()`).

On **Vercel Production** there is **no standalone `MASTER_ADMIN_KEY` / `ADMIN_PIN` env row**. The live health endpoint shows `runtime_config.present: true, key_count: 13`, so the value is resolved from **`CORPFLOW_RUNTIME_CONFIG_JSON`** (source of truth: **Infisical**). That blob is not returned by the Vercel project env API, so the value cannot be read back programmatically — it must come from Infisical / operator custody.

## Root cause of the earlier 403

- The operator's local `MASTER_ADMIN_KEY` differed from the value inside Production's runtime-config blob, **and**
- the probe script previously did **not** auto-load `.env.local` / `.env` (no `bootstrap-repo-env.mjs` import), so only a manually exported value was ever seen.

## Fix applied (config only — no secret values, no production change)

- `scripts/invoke-ghl-living-word-probe.mjs` now imports `bootstrap-repo-env.mjs` and reads `MASTER_ADMIN_KEY` **or** `ADMIN_PIN` from repo-root `.env.local` / `.env`. **No per-run `$env:` export is required.** A 403 now prints an actionable hint.
- `.env.template` documents the source of truth and the one-time `.env.local` step.

## How to complete this artifact (operator — one-time, no exposure)

1. Copy the **current Production `MASTER_ADMIN_KEY`** (from Infisical / runtime-config blob) into repo-root **`.env.local`** as `MASTER_ADMIN_KEY=<value>`. Never paste it into chat, commits, PRs, or logs.
2. Run (no export needed — the script auto-loads `.env.local`):

```powershell
$env:GHL_PROBE_WRITE_ARTIFACT = "1"
node scripts/invoke-ghl-living-word-probe.mjs
```

3. On exit code **0** the script overwrites this artifact with the redacted manifest. If you still get **403**, the local value is stale vs Production — re-sync from Infisical.

Or authenticated GET (admin cookie or matching `x-session-token`):

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
Local fix exists: YES (probe script auto-loads .env.local/.env; accepts MASTER_ADMIN_KEY|ADMIN_PIN)
Merged to main: PENDING (see auth-wiring PR)
Production deployment ID: probe route live (403 without matching auth)
Commit deployed: GHL probe implementation on main (prior PR)
Live probe executed: NO (blocked on one-time operator value sync)
API call count: 0
GHL writes: NO
Secrets in artifact: NO
Real member data in artifact: NO
Final verdict: PARTIAL (auth model fixed; awaiting operator .env.local value sync from Infisical)
Client-facing flow usable: N/A
```
