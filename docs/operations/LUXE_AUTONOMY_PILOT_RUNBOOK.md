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

## Operator decisions (Lux)

Do **not** ask Anton to monitor the Lux workstream continuously. Route only genuine protected decisions (production deploy, env/secrets, DB/schema, payments, external sends, paid tools, public launch, merge authority for agent PRs) to the **central Anton Decision Inbox**:

- Labels: `needs:anton` + the matching `approval:*` reason
- Packet: `### ANTON DECISION PACKET` on the issue/PR (optional pointer on Operator Bridge #249)
- Continue safe Lux preview/docs/implementation while unrelated approvals are pending
- Never deploy or mutate production merely because CI is green

Canonical: `docs/operations/ANTON_DECISION_INBOX_V1.md` and `docs/operations/PROTECTED_ACTION_GATES_V1.md`.

## Cross-references

- `docs/decisions/JOURNAL.md` — row JE-2026-04-10-5 and successor rows.
- `docs/operations/TENANT_CLIENT_LOGIN.md`
- `docs/EXECUTION_BRAIN_VS_HANDS.md`
- `docs/automation-framework.md`
- `lib/cmp/README.md`
- `docs/operations/ANTON_DECISION_INBOX_V1.md`
