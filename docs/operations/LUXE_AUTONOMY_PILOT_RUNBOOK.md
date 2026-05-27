# LUXE autonomy pilot — runbook (canonical v0)

**Status:** v0 back-reference stub. The runbook was planned in `docs/decisions/JOURNAL.md` row **JE-2026-04-10-5** but was never landed at this path; its working content has been distributed across multiple per-surface docs. This file exists to satisfy canonical-reference resolution from the JOURNAL row and from the historical 2026-04-10 entry in `artifacts/chat_history.md`.

**Anchor sentinel:** `<!-- LUXE_AUTONOMY_PILOT_RUNBOOK_V0_STUB -->`

<!-- LUXE_AUTONOMY_PILOT_RUNBOOK_V0_STUB -->

## Where the working content lives today

- `docs/operations/TENANT_CLIENT_LOGIN.md` § *Brownfield Luxe host* — factory linking + tenant hostname mapping for `lux.corpflowai.com`.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — 24/7 execution boundaries that govern what may run unattended.
- `docs/automation-framework.md` — ingest / forward / approval webhook secrets and gates.
- `docs/decisions/JOURNAL.md` — rows JE-2026-04-10-1 through JE-2026-04-10-12 (pilot scope, kill switch, billing exemption supersession, etc.).
- `lib/cmp/README.md` — CMP factory vs tenant gates that the pilot uses.
- `scripts/factory-upsert-hostname-map.mjs` (invoked by `npm run factory:link-lux-hostname`) — idempotent factory upsert for the Luxe hostname.

## Why this file is a back-reference stub

The runbook was named in `docs/decisions/JOURNAL.md` row **JE-2026-04-10-5** as a planned deliverable, but the file itself was never landed. References to it remained in the JOURNAL row and in dated `artifacts/chat_history.md` entries. Packet 6.11 added this back-reference stub so the canonical-reference graph resolves without modifying the historical journal row or the frozen chat-history entry.

## Until the runbook is consolidated

Treat the per-surface sources above as authoritative. Do **not** treat this stub as an operational runbook.

## Cross-references

- `docs/decisions/JOURNAL.md` — row JE-2026-04-10-5 and successor rows.
- `docs/operations/TENANT_CLIENT_LOGIN.md`
- `docs/EXECUTION_BRAIN_VS_HANDS.md`
- `docs/automation-framework.md`
- `lib/cmp/README.md`
