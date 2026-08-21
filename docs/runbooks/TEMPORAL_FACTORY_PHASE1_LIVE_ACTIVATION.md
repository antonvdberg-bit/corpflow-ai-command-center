# Temporal Factory Phase 1 — live activation (operator-paste L3)

**Issue:** [#1032](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1032)  
**Authorized by:** Anton comment *OPERATOR APPROVAL — PROCEED THROUGH LIVE TEMPORAL PHASE 1 ACTIVATION* (2026-08-22).  
**Who runs this:** Anton at L3 on `corpflow-exec-01-u69678`.  
**Who must not run this:** Cursor Cloud / this factory worker (no SSH; `HOST_MISMATCH`).

<!-- TEMPORAL_FACTORY_PHASE1_LIVE_ACTIVATION -->

## Exact remaining blocker

Cursor Cloud cannot start the live worker. Required on the box only:

1. Confirm the #1025 Temporal server is still loopback-only and healthy.
2. Create a **box-local** GitHub credential that can **only** `workflow_dispatch` **CorpFlowAI Cursor Factory Handoff** (`factory-cursor-handoff.yml` on `main`).
3. Store that token at `~/.corpflow-temporal-handoff.token` (`chmod 600`). Do **not** put it in this repo, Vercel, `.env.template`, chat, logs, or screenshots.
4. Do **not** reuse `CMP_GITHUB_TOKEN`, `GH_WORKFLOW_TOKEN`, `GITHUB_TOKEN`, Cursor webhook secrets, or CorpFlow production Postgres.
5. Start `ops/temporal/phase1-worker.mjs --live` only after those files exist on `corpflow-exec-01`.
6. Capture non-secret evidence (workflow id, Handoff run URL, one-handoff-only, restart/idempotency). Use `docs/runbooks/TEMPORAL_FACTORY_PHASE1_ROLLBACK.md` to stop.

If the live worker needs broader GitHub/server permission than that narrow `workflow_dispatch`, **STOP** and return the exact permission gap.

## Least-privilege token (names only)

- Fine-grained PAT or GitHub App installation token on `antonvdberg-bit/corpflow-ai-command-center` only.
- Permission: Actions write sufficient to dispatch `factory-cursor-handoff.yml`.
- No repo administration, no secrets read, no webhook URL, no production DB.

## What this runbook does not authorize

- Public Temporal exposure
- New VM / paid vendor
- DNS / firewall / reverse-proxy change
- Production/client deploy
- DB/schema or CorpFlow production data mutation
- Email / WhatsApp / SMS / outreach / payment
- Autonomous merge beyond the already-approved #1034 merge after green checks
