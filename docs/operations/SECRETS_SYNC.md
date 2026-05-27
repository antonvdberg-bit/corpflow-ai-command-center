# Secrets sync — Infisical → Vercel (canonical v0)

**Status:** v0 stub. Owner packet: **Packet 2.1** in `docs/execution/WEEKEND_EXECUTION_QUEUE.md`. This file exists to satisfy the canonical-reference graph; the full operational doc lands when Packet 2.1 ships.

**Anchor sentinel:** `<!-- SECRETS_SYNC_V0_STUB -->`

<!-- SECRETS_SYNC_V0_STUB -->

## Why this stub

Multiple canonical docs name `docs/operations/SECRETS_SYNC.md` as the source of truth for how secrets flow from **Infisical** into **Vercel Production / Preview / Development** and how CI (`vercel-env`, Agent CI) consumes them. Packet 6.11 added this v0 stub so cross-references resolve. Until Packet 2.1 ships, the operational content is distributed across the per-surface sources below.

## Current sources of record (until Packet 2.1 ships)

- `docs/operations/POSTGRES_PROVIDER.md` — Neon as the sole approved Postgres provider; specific `POSTGRES_URL` rotation and Vercel-redeploy rules.
- `artifacts/audits/2026-05-23-weekend/01-infisical-vercel-sync.md` — audit-time snapshot of the Infisical → Vercel sync model (which envs are in scope, where drift was observed).
- `docs/automation-framework.md` § *Ingest, forward, and approval secrets* — n8n-side webhook secret expectations (`N8N_EMAIL_WEBHOOK_SECRET`, `CORPFLOW_AUTOMATION_FORWARD_SECRET`, ingest/approval gates).
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` § *Webhooks and secrets*.
- `.env.template` — operator-facing list of expected env vars (no secret values).

## Scope when Packet 2.1 ships

Per the DoD in `docs/execution/WEEKEND_EXECUTION_QUEUE.md` § *Packet 2.1*, the full version of this doc will cover:

- **Source of truth:** Infisical project layout (folders, environments).
- **Value flow:** how an Infisical value reaches Vercel Production, Preview, and Development at deploy time.
- **Redeploy rules:** when a Vercel **Redeploy** is required after a value change (Infisical is not a push-source — value changes take effect on next deploy unless the live app re-reads at request-time).
- **Agent CI:** how `vercel-env` and similar workflows consume Infisical via OIDC where applicable.
- **Rotation playbooks:** named for at minimum `POSTGRES_URL`, `N8N_EMAIL_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`, and the `CORPFLOW_AUTOMATION_*` family.
- **Failure modes:** value updated in Infisical but Vercel still serves the old value; CI green but production stale; missing scopes; OIDC token expiry; etc.
- **Audit trail:** how secret changes are recorded in `telemetry_events` / `automation_events` where applicable.

## Cross-references

- `docs/operations/POSTGRES_PROVIDER.md`
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md`
- `docs/automation-framework.md`
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md` § *Packet 2.1*
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- `artifacts/audits/2026-05-23-weekend/01-infisical-vercel-sync.md`

## Until Packet 2.1 ships

For any concrete operational question about a specific secret, use the most specific source above. **Do not** treat this stub as operational guidance, and **do not** paste secret values into this file or any other repo file (per `.cursor/rules/security-sensitive-changes.mdc`).
