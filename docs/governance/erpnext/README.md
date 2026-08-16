# CorpFlowAI ERP governance records

**Status:** Folder opened by [#955](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/955).  
**Environment:** `local` (docs/governance only).  
**Protected actions:** none from this folder.

This directory is the independent GitHub/repo ledger for ERP strategy and (later) material ERP decisions. ERPNext remains the operational programme record; GitHub remains the durable governance/evidence ledger ([#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954)).

## Canonical strategy (read this first)

| Record | Path | Status |
|--------|------|--------|
| ERP Strategy / Vision v2 | [`docs/governance/erpnext/VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md) | **APPROVED — VERSION 2** |

Anton approved Version 2 on 2026-08-14 12:54 +04:00. Evidence: [#954 comment 5291438473](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5291438473) and merged [PR #957](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/957). Repo status recorded by [#960](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/960).

## Agent discovery

Small repo decisions that touch ERPNext, CRM/business records, finance, Projects, Support, proposals/quotations, automation authority, or source-of-truth boundaries must consult the canonical vision before implementation.

Do not copy the full doctrine into `AGENTS.md`, Cursor rules, or OpenAI/operator context files. Point here.

## Programme-control artefacts (#966)

[#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954) also required a decision register, evidence index, risk register, and control register. Those artefacts are now opened by [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966). They do **not** rewrite Version 2.

| Record | Path | Rule |
|--------|------|------|
| Decision register | [`DECISION_REGISTER.md`](./DECISION_REGISTER.md) | Append or supersede; never silent history rewrite |
| Implementation evidence index | [`IMPLEMENTATION_EVIDENCE_INDEX.md`](./IMPLEMENTATION_EVIDENCE_INDEX.md) | Link GitHub / ERPNext names; no secrets |
| Risk register | [`RISK_REGISTER.md`](./RISK_REGISTER.md) | Owners + next review; marks PROVEN / PARTIAL / NOT PROVEN / REQUIRES DECISION |
| Control register | [`CONTROL_REGISTER.md`](./CONTROL_REGISTER.md) | Security, backup, access, change, audit |

Operational programme record (ERPNext, not this Git ledger): Project name `CorpFlowAI ERPNext Business-Critical Adoption Programme`. Apply with `bash scripts/erpnext/apply-governance-programme.sh`. Search-before-create. No custom DocTypes. No external send.

## Access and retention

- **Propose:** Cursor / ChatGPT / Anton may author rows.
- **Approve material ERP decisions:** Anton only.
- **Edit ERPNext Project/Tasks:** Cursor may, using standard fields, when the controlling issue authorizes it.
- **Merge governance records to `main`:** Anton (PR review). Cursor does not self-merge unless the issue gives that exact authority.
- **Retention:** do not delete superseded decisions or evidence.
- **Correction:** append a new decision that points at the old ID.

## Source lineage

- Programme: [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)
- Governance record environment: [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954)
- Strategy publish packet: [#955](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/955)
- Approval-status packet: [#960](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/960)
- Governance artefacts + internal Project: [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966)

Historical meaning in #954 comments must remain intact. Corrections belong in the synthesized vision as explicit interpretation.
