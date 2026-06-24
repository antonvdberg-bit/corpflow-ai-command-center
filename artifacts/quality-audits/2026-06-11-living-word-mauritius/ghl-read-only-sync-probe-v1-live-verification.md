# Living Word — GHL read-only sync probe v1 (live verification)

**Status:** **PARTIAL** — implementation merged pending; live probe not yet executed on Production.

**Timestamp (UTC):** 2026-06-24 (placeholder — update after Production probe run)

**Environment target:** Vercel Production factory (`core.corpflowai.com`)

## Statements

- **No secrets exposed** in this artifact
- **No GHL writes** performed (pending live run)
- **No outbound messages** sent
- **No public site / DNS / GHL config** changes

## How to complete this artifact (operator)

After the implementation PR is merged and Vercel Production is **Ready**:

```powershell
$env:MASTER_ADMIN_KEY = "<factory master key — never paste in chat>"
$env:GHL_PROBE_WRITE_ARTIFACT = "1"
node scripts/invoke-ghl-living-word-probe.mjs
```

Or authenticated GET:

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
Local fix exists: YES
Merged to main: PENDING (see PR)
Production deployment ID: pending
Live probe executed: NO
Final verdict: PARTIAL (awaiting Production deploy + probe run)
Client-facing flow usable: N/A
```
