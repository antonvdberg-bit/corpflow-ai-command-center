# CorpFlowAI ERP governance records

**Status:** Folder opened by [#955](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/955).  
**Environment:** `local` (docs/governance only).  
**Protected actions:** none from this folder.

This directory is the independent GitHub/repo ledger for ERP strategy and material ERP decisions. ERPNext remains the operational programme record; GitHub remains the durable governance/evidence ledger ([#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954)).

## Canonical strategy (read this first)

| Record | Path | Status |
|--------|------|--------|
| ERP Strategy / Vision v2 | [`docs/governance/erpnext/VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md) | **APPROVED — VERSION 2** |
| Independent due diligence (#959) | [`docs/governance/erpnext/ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1.md`](./ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1.md) | **ERPNext BUSINESS-CRITICAL USE APPROVED WITH CONDITIONS** — platform stays ERPNext; irreplaceable trust waits on #956 P0s + patch/accountant conditions. Research/docs only. |
| WP6 identity / roles / 2FA / least-privilege (#1019) | [`docs/operations/ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md`](../../operations/ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md) | **WP6 ACCESS CONTROL CLOSURE READY FOR REVIEW** — integration identity not System Manager; 2FA / privileged User inventory still exact desk actions. |
| WP7 patch / backup / restore / monitoring (#1010) | [`docs/operations/ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md`](../../operations/ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md) | **WP7 SECURITY/PATCH/RECOVERY CLOSURE READY FOR REVIEW** — versions proven; update required; vendor backup/restore, Neon PITR, and RPO/RTO still exact protected actions. |
| Strategy v2 implementation baseline (#967) | [`docs/governance/erpnext/IMPLEMENTATION_BASELINE_V1.md`](./IMPLEMENTATION_BASELINE_V1.md) | **ERP STRATEGY V2 IMPLEMENTATION BASELINE READY** — dated baseline snapshot. #966 / PR #970 subsequently completed the governance registers and internal ERPNext programme Project; use the current registers/evidence index below for live programme state. |
| ERPNext-first source-of-truth matrix (#918) | [`docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`](./SOURCE_OF_TRUTH_MATRIX_V1.md) | **ERPNext-FIRST RECONCILIATION READY FOR IMPLEMENTATION** — row-by-row ownership + smallest bridge plan. Mapping/config only; no automated sync. |
| WP1 Customer bridge (#1009) | [`docs/erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md`](../../erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md) | **WP1 CUSTOMER BRIDGE READY FOR REVIEW** — synthetic search-before-create Customer/Contact/Address. No schema/cron. |
| WP2 sales lifecycle bridge (#1018) | [`docs/erpnext/ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md`](../../erpnext/ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md) | **WP2 SALES LIFECYCLE BRIDGE READY FOR REVIEW** — synthetic Lead → Opportunity → reused Customer. No schema/cron/quotation. |
| Onboarding C selling / quote-to-cash (#1056 / current-main #1166) | [`docs/erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md`](../../erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md) | **NOT READY — BLOCKED BY ACCOUNTANT FOUNDATION** — CF1018 draft MUR Quotation proven; SI posting waits on #1055. #1166 lands the proven #1101 slice onto current `main` after #1162; retire stale PR #1128. |
| Onboarding E Projects / Support (#1097 / current-main #1134) | [`docs/erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md`](../../erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md) | **ERPNext PROJECTS / SUPPORT CURRENT-MAIN READY FOR REVIEW** — reused #920/#1097 Project/Issue; Timesheet DEFER; SLA deferred. Close stale PR #1102 without merge. |
| Onboarding F bank / reconciliation (#1139 / current-main #1220) | [`docs/erpnext/ERPNEXT_BANK_RECONCILIATION_READINESS_V1.md`](../../erpnext/ERPNEXT_BANK_RECONCILIATION_READINESS_V1.md) | **ERPNext BANK/RECONCILIATION CURRENT-MAIN READY FOR ACCOUNTANT CONFIGURATION** — manual/import-first; no live bank mutation. Close stale PR #1141 without merge. |

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

Operational programme record (ERPNext, not this Git ledger): Project `PROJ-0002` — `CorpFlowAI ERPNext Business-Critical Adoption Programme`. Vision task `TASK-2026-00025` is Completed; Phase 0–10 tasks are `TASK-2026-00026`–`TASK-2026-00036`. Apply with `bash scripts/erpnext/apply-governance-programme.sh`. Search-before-create. No custom DocTypes. No external send.

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
- Independent market/security/AI-fit due diligence: [#959](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/959)
- Deployment backup/DR/security audit: [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956)
- WP6 identity / roles / 2FA / least-privilege closure: [#1019](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1019) — `docs/operations/ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md`
- WP7 patch / backup / restore / monitoring closure: [#1010](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1010) — `docs/operations/ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md`
- Governance artefacts + internal Project: [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966) / [PR #970](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/970)
- Strategy v2 Phase 0–10 implementation baseline: [#967](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/967) / [PR #969](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/969)
- ERPNext-first source-of-truth matrix: [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918)

Historical meaning in #954 comments must remain intact. Corrections belong in the synthesized vision or a new superseding decision record, never by silently rewriting the source history.
