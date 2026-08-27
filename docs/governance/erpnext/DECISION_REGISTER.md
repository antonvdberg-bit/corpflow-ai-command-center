# ERP decision register

**Status:** Append-only index of material ERP decisions.  
**Owner:** Anton (approval). Cursor / ChatGPT may propose rows; they may not silently rewrite history.  
**Environment:** `local` (docs/governance ledger). Linked ERPNext Project/Task names are `corpflow_test` operational pointers only.  
**Source issues:** [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966), [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)  
**Anchor:** `<!-- CORPFLOWAI_ERP_DECISION_REGISTER_V1 -->`

<!-- CORPFLOWAI_ERP_DECISION_REGISTER_V1 -->

## How to use this register

- **Append or supersede.** Never edit an existing row to change historical meaning. If a decision is reversed, add a new row with `Status: Superseded` on the old ID only by adding a `Superseded-by` pointer in a **new** row and leaving the original text intact.
- **Link, do not copy.** Point at GitHub issues, PRs, comments, and canonical docs. Do not paste long histories or secret values.
- **IDs:** `ERP-D-YYYY-MM-DD-n`.
- **Statuses:** `Proposed` / `Approved` / `Rejected` / `Superseded`.
- **ERPNext pointer:** fill when the operational Project/Task exists; leave `pending live apply` until then.

Access / retention:

| Role | May author proposals | May approve material ERP decisions | May edit ERPNext Project/Tasks | May merge governance repo records |
|------|----------------------|------------------------------------|--------------------------------|-----------------------------------|
| Anton | Yes | **Yes — only approver** | Yes | Yes |
| Cursor Factory | Yes (ordinary reversible work) | No | Yes, standard Project/Task only, when the controlling issue authorizes it | No (opens PR only) |
| ChatGPT / operator | Yes (framing / review) | No | No | No |

Retention: do not delete a decision or evidence row merely because it was superseded. Review this register when a material ERP decision is taken, and at least when #953 Phase 0 or Phase 9 is next reviewed.

---

## ERP-D-2026-08-14-1 — ERP Strategy Version 2 approved

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-14-1` |
| Date/time | 2026-08-14 12:54 +04:00 (Mauritius) |
| Status | **Approved** |
| Question / requirement | What is CorpFlowAI’s intended-use / ERP strategy that agents must consult? |
| Executive intent / source | Anton Version 2 clarifications on #954 |
| Options considered | Keep opportunistic ERPNext setup; wait for a later synthesis; publish Version 2 as canonical doctrine |
| Evidence reviewed | [#954 comment 5291438473](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5291438473); synthesized text in merged [PR #957](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/957) |
| Decision | Version 2 is **APPROVED**. Canonical file: [`VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md) |
| Rationale | Agents must stop re-asking Anton for the same strategy. Historical #954 comments stay intact. |
| Risks / tradeoffs | Approval of strategy is **not** authorization of production accounting, schema, env/secrets, live send, or `client_production`. |
| Approver | Anton van den Berg |
| GitHub implementation | [#955](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/955) / [PR #957](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/957); status alignment [#960](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/960) / [PR #961](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/961) |
| ERPNext Project / Task | Vision task `ERP Vision and Intended Use — Executive Statement` on the internal programme Project (see evidence index) |
| Verification evidence | Canonical status line `APPROVED — VERSION 2`; discovery pointers in `AGENTS.md` and `.cursor/rules/erpnext-strategy.mdc` |
| Supersedes / superseded-by | None |

---

## ERP-D-2026-08-14-2 — Dual-control record environment

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-14-2` |
| Date/time | 2026-08-14 (programme issues #953 / #954) |
| Status | **Approved** (programme design; artefacts completed under #966) |
| Question / requirement | Where do material ERP decisions and the operational programme plan live? |
| Executive intent / source | #954 dual-control requirement |
| Options considered | ERPNext-only ledger; GitHub-only ledger; dual-control (GitHub durable + ERPNext operational) |
| Evidence reviewed | #953 / #954 issue bodies; #920 standard Project/Task proof |
| Decision | **GitHub/repo** is the independent durable governance/evidence ledger. **ERPNext** standard Project/Task is the operational programme record. Neither is claimed tamper-proof. |
| Rationale | A privileged ERPNext administrator can theoretically alter application-held records. Git history + PR review is the independent chain. |
| Risks / tradeoffs | Two systems can drift if links are not maintained. Mitigation: this register + evidence index + search-before-create on the Project. |
| Approver | Anton (via #953 / #954 programme direction) |
| GitHub implementation | This folder; [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966) |
| ERPNext Project / Task | Project name `CorpFlowAI ERPNext Business-Critical Adoption Programme` |
| Verification evidence | [`IMPLEMENTATION_EVIDENCE_INDEX.md`](./IMPLEMENTATION_EVIDENCE_INDEX.md) |
| Supersedes / superseded-by | None |

---

## ERP-D-2026-08-14-3 — Prestige fast lane must not be blocked

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-14-3` |
| Date/time | 2026-08-14 |
| Status | **Approved** |
| Question / requirement | May the broader ERP programme delay the imminent Prestige quotation / proposal? |
| Executive intent / source | Version 2 §16 |
| Options considered | Freeze Prestige until full ERP programme; run Prestige in parallel on minimum validated foundation |
| Evidence reviewed | [#919](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/919) proposal pack; [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920) synthetic foundation |
| Decision | Prestige fast lane runs in parallel. Do not create the real Prestige customer or send the quotation from a factory packet unless separately authorized. |
| Rationale | Revenue deliverable is time-critical. Programme control must not become a commercial blocker. |
| Risks / tradeoffs | Parallel work can create a second commercial path. Mitigation: synthetic-only #920 records; no live Prestige customer. |
| Approver | Anton (Version 2) |
| GitHub implementation | `docs/sales/prestige-procurement/`; `docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md` |
| ERPNext Project / Task | Phase 5 / Prestige evidence rows in the evidence index (not a second Prestige Project) |
| Verification evidence | `PROJ-0001` / `SAL-QTN-2026-00004` are synthetic; #919 pack not sent |
| Supersedes / superseded-by | None |

---

## ERP-D-2026-08-14-4 — Backup / DR / security not proven for irreplaceable use

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-14-4` |
| Date/time | 2026-08-14 |
| Status | **Approved** (audit verdict; treatment still open) |
| Question / requirement | Is ERPNext proven safe as the irreplaceable system of record for real money, tax, or client contracts? |
| Executive intent / source | #953 Workstream B; Version 2 §15 |
| Options considered | Treat current host as production-ready; defer until vendor backup/restore, Neon PITR, and privileged-access controls are proven |
| Evidence reviewed | [`docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md`](../../operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md); [PR #958](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/958) |
| Decision | Verdict **ERPNext BUSINESS-CRITICAL BACKUP/DR/SECURITY: NOT PROVEN**. Do not buy a DR server from this audit. Do not treat ERPNext as irreplaceable until the P0 gaps close. |
| Rationale | Vendor-hosted commercial site backups, 2FA, and System Settings were unread by the integration identity. Self-hosted sandbox restore is one-shot and on-host only. |
| Risks / tradeoffs | Commercial test records exist on a vendor host whose restore we cannot currently read. See control register. |
| Approver | Anton (audit accepted as decision-ready record; closure of gaps is a later decision) |
| GitHub implementation | [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956) / [PR #958](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/958) |
| ERPNext Project / Task | Phase 1 — Environment and platform baseline |
| Verification evidence | Audit marks B1–B10 / S1–S12; live versions `frappe 16.25.0` / `erpnext 16.26.2` |
| Supersedes / superseded-by | None. A later Approved row must be added before irreplaceable cutover. |

---

## ERP-D-2026-08-16-1 — Governance record environment opened under #966

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-16-1` |
| Date/time | 2026-08-16 |
| Status | **Proposed** (this packet; Anton merge remains the Git approval) |
| Question / requirement | Finish the missing #954 repo artefacts and the internal ERPNext implementation Project without reopening strategy. |
| Executive intent / source | [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966) |
| Options considered | Docs-only registers; registers plus live standard Project/Task; invent custom DocTypes |
| Evidence reviewed | #920 Project/Task write path; #954 required artefact list; Version 2 non-negotiables |
| Decision | Create the four missing registers; create or reuse one internal Project named `CorpFlowAI ERPNext Business-Critical Adoption Programme`; represent Vision + Phases 0–10 as standard Tasks; prove one Version/timeline read-back if standard capability allows. |
| Rationale | #954 is incomplete without the registers and the operational Project. Strategy is already approved; this packet is programme control only. |
| Risks / tradeoffs | Live Project create is a standard ERPNext write on the hosted test site. Not accounting/tax/bank. Duplicate Project risk mitigated by search-before-create. |
| Approver | Pending Anton merge of the #966 PR |
| GitHub implementation | This folder + `config/erpnext-governance-programme.v1.json` |
| ERPNext Project / Task | `PROJ-0002` / Vision `TASK-2026-00025` |
| Verification evidence | Focused `node --test` + apply-log (no secrets) |
| Supersedes / superseded-by | Completes the “artefacts not created by #955” note. Does **not** supersede Version 2. |

---

## ERP-D-2026-08-19-1 — #918 source-of-truth matrix (proposed)

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-19-1` |
| Date/time | 2026-08-19 |
| Status | **Proposed** (this packet; Anton merge remains the Git approval). Does **not** approve automated sync or a real Prestige Customer. |
| Question / requirement | For each material CorpFlowAI/ERPNext domain, which system is authoritative, and what is the smallest bridge plan? |
| Executive intent / source | [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918) bounded reconciliation slice; Strategy v2 §3 |
| Options considered | Leave #920 mapping slice as the whole answer; build automated sync now; publish a docs/config matrix with a first Customer-identity bridge |
| Evidence reviewed | #967 baseline; #880/#881/#882/#920 live hosted-test proofs; #701 CRM baseline; Vision v2 |
| Decision | Publish [`SOURCE_OF_TRUTH_MATRIX_V1.md`](./SOURCE_OF_TRUTH_MATRIX_V1.md). First bridge: `qualified_customer_identity`. Daily CRM stays on Postgres `leads`. No automated writer in this packet. |
| Rationale | Dual customer identity is the highest-control failure; no paying quotation exists without a Customer. Prestige Track B must not wait for remaining rows. |
| Risks / tradeoffs | Classification is decision-ready, not live reconciliation. Volume is still low. |
| Approver | Pending Anton merge of the #918 PR |
| GitHub implementation | This file + `config/erpnext-source-of-truth-matrix.v1.json` |
| ERPNext Project / Task | Programme Project `PROJ-0002` / Phase 6 `TASK-2026-00032` (no live apply in this packet) |
| Verification evidence | Focused `node --test node-tests/erpnext-source-of-truth-matrix.test.mjs` |
| Supersedes / superseded-by | Completes the missing #918 matrix called out in the #967 baseline. Does **not** supersede Version 2 or #701. |

---

## ERP-D-2026-08-19-2 — #1009 WP1 Customer bridge (proposed)

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-19-2` |
| Date/time | 2026-08-19 |
| Status | **Proposed** (this packet; Anton merge remains the Git approval). Does **not** approve a real Prestige Customer, cron, or live Postgres lead PATCH. |
| Question / requirement | Implement the first `qualified_customer_identity` bridge with search-before-create and a replay proof. |
| Executive intent / source | [#1009](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1009); matrix [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918) |
| Options considered | Leave mapping-only; build a sync framework; implement one operator-invoked Customer bridge |
| Evidence reviewed | #880 mapper; #993 matrix; hosted-test Frappe REST as `integrations@corpflowai.com` |
| Decision | Land [`ERPNEXT_CUSTOMER_BRIDGE_V1.md`](../../erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md). Synthetic only. Pointer on `qualification_json.erpnext` in the reference lead. |
| Rationale | No quotation exists without a Customer. Dual identity is the highest-control failure. |
| Risks / tradeoffs | Live Postgres persist of the pointer is still a later authorized write. |
| Approver | Pending Anton merge of the #1009 PR |
| GitHub implementation | `lib/erpnext/customer-bridge.js` + apply script |
| ERPNext Project / Task | Programme Project `PROJ-0002` / Phase 6 `TASK-2026-00032` |
| Verification evidence | `node --test node-tests/erpnext-customer-bridge.test.mjs` plus live apply replay |
| Supersedes / superseded-by | Implements matrix step 2. Does **not** supersede Version 2, #701, or the #918 matrix. |

---

## ERP-D-2026-08-20-1 — #1018 WP2 sales lifecycle bridge (proposed)

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-20-1` |
| Date/time | 2026-08-20 |
| Status | **Proposed** (this packet; Anton merge remains the Git approval). Does **not** approve real client migration, WP3 quotation, cron, or live Postgres lead PATCH. |
| Question / requirement | Implement `lead_opportunity_promotion`: one synthetic prospect into Lead → Opportunity → existing/reused Customer with search-before-create and replay proof. |
| Executive intent / source | [#1018](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1018); WP1 [#1009](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1009); matrix [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918) |
| Options considered | Leave WP1 Customer-only; build a sync framework; implement one operator-invoked lifecycle bridge reusing WP1 |
| Evidence reviewed | WP1 Customer bridge; #920 CRM-LEAD/CRM-OPP synthetic path; hosted-test Frappe REST as `integrations@corpflowai.com` |
| Decision | Land [`ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md`](../../erpnext/ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md). Synthetic only. Pointer on `qualification_json.erpnext` in the reference lead. Reuse WP1 for Customer. |
| Rationale | ERPNext must own the durable sales process after qualification without duplicating Customer identity. |
| Risks / tradeoffs | Live Postgres persist of the pointer is still a later authorized write. Quotation remains WP3. |
| Approver | Pending Anton merge of the #1018 PR |
| GitHub implementation | `lib/erpnext/sales-lifecycle-bridge.js` + apply script |
| ERPNext Project / Task | Programme Project `PROJ-0002` / Phase 6 `TASK-2026-00032` |
| Verification evidence | `node --test node-tests/erpnext-sales-lifecycle-bridge.test.mjs` plus live apply replay |
| Supersedes / superseded-by | Implements matrix `lead_opportunity_promotion`. Does **not** supersede Version 2, WP1, #701, or the #918 matrix. |

---

## ERP-D-2026-08-27-1 — #1134 current-main landing of #1097 Projects / Support proof (proposed)

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-27-1` |
| Date/time | 2026-08-27 |
| Status | **Proposed** (this packet; Anton merge remains the Git approval). Does **not** approve Timesheet submit, SLA config, real-client Project/Issue, or a second project/helpdesk app. |
| Question / requirement | Land the already-proven #1097 Projects / Tasks / Issue operating proof onto current `main` as one ERP/DELIVERY packet. |
| Executive intent / source | [#1134](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1134); source proof [#1097](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1097) / stale [PR #1102](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1102) |
| Options considered | Merge stale #1102; redesign the operating model; land the proven helper/docs/evidence onto current `main` |
| Evidence reviewed | #1097 live apply-log on reused `PROJ-0001` / `ISS-2026-00001`; Timesheet DEFER; SLA deferred; #918 `project_task_timesheet` / `issue_support` |
| Decision | Land [`ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md`](../../erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md) on current `main`. Reuse the 2026-08-26 synthetic read-back. Close #1102 without merge. |
| Rationale | The operating proof is already READY. Current `main` needs the same packet without a second Project/Issue or a live re-apply. |
| Risks / tradeoffs | Hosted records may have drifted since 2026-08-26; this packet does not mutate them. |
| Approver | Pending Anton merge of the #1134 PR |
| GitHub implementation | `lib/erpnext/projects-support-ops.js` + apply script + reused apply-log |
| ERPNext Project / Task | Reused synthetic `PROJ-0001` / `ISS-2026-00001` (not programme Project `PROJ-0002`) |
| Verification evidence | `node --test node-tests/erpnext-projects-support-ops.test.mjs` plus reused apply-log |
| Supersedes / superseded-by | Current-main replacement for stale PR #1102. Does **not** supersede Version 2, #918, #920, or the #1097 operating conventions. |

---

## ERP-D-2026-08-27-2 — #1166 current-main landing of #1056 selling / quote-to-cash (proposed)

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-27-2` |
| Date/time | 2026-08-27 |
| Status | **Proposed** (this packet; Anton merge remains the Git approval). Does **not** approve Sales Invoice posting, tax/VAT, Payment Entry, CoA mutation, or send. |
| Question / requirement | Land the already-proven #1056 Selling / Quote-to-Cash safe slice onto exact current `main` after Commercial quotation-evidence continuity (#1162). |
| Executive intent / source | [#1166](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1166); source proof [#1056](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1056) / [#1125](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1125) / stale [PR #1128](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1128) |
| Options considered | Revive stale #1128; redesign Quote-to-Cash; land the proven helper/docs/evidence onto current `main` and retire #1128 |
| Evidence reviewed | #1056 live apply-log `SAL-QTN-2026-00005` CREATE then UPDATE, MUR 45,000, PDF 36,114 bytes; #1055 still OPEN; #918 `quotation_invoice`; #1162 Commercial Workspace GET continuity |
| Decision | Land [`ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md`](../../erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md) on current `main`. Reuse the 2026-08-26 synthetic read-back. Commercial Workspace references the same Quotation name. Close #1128 without revival. |
| Rationale | The selling quotation path is already proven. Current `main` needs the same packet without a second ERP bridge or a live re-apply. |
| Risks / tradeoffs | Hosted quotation may still exist; this packet does not re-create it. Accountant posting remains blocked. |
| Approver | Pending Anton merge of the #1166 PR |
| GitHub implementation | `lib/erpnext/selling-quote-to-cash.js` + apply script + reused apply-log + Commercial Workspace pointer |
| ERPNext Project / Task | Reused synthetic Quotation `SAL-QTN-2026-00005` (not programme Project `PROJ-0002`) |
| Verification evidence | `node --test node-tests/erpnext-selling-quote-to-cash.test.mjs` plus reused apply-log |
| Supersedes / superseded-by | Current-main replacement for stale PR #1128 / #1125. Does **not** supersede Version 2, #918, WP2, #882, or #1162. |

---

## ERP-D-2026-08-27-3 — #1213 current-main Buying/AP GET acceptance (proposed)

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-27-3` |
| Date/time | 2026-08-27 |
| Status | **Proposed** (this packet; Anton merge remains the Git approval). Does **not** approve PI submit, Payment Entry, real suppliers, Role grant, or accountant CoA. |
| Question / requirement | Is the standard ERPNext Buying/AP path operationally ready on current `main` for accountant configuration? |
| Executive intent / source | [#1213](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1213); source proof [#1098](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1098) / stale [PR #1107](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1107) |
| Options considered | Revive stale #1107; invent a second procurement tracker; GET-verify hosted ERPNext and land the proven helper/docs onto current `main` |
| Evidence reviewed | #1098 apply-log (Supplier CREATE 403; Item `CF-AP-SYNTHETIC-OPEX` reuse); #1213 GET-only 2026-08-27: Supplier count=0, PI/PO/PE count=0, `po_required=No`, `check_supplier_invoice_uniqueness=0`; #1055 still OPEN |
| Decision | Land [`ERPNEXT_BUYING_AP_READINESS_V1.md`](../../erpnext/ERPNEXT_BUYING_AP_READINESS_V1.md) on current `main`. Purchase Order **DEFER**. `INVOICE_EXISTENCE_NEVER_AUTHORIZES_PAYMENT`. Distinguish Supplier CREATE permission-block from accountant AP defaults. Close #1107 without merge. |
| Rationale | The operating path is already proven. Current `main` lacked the operator projection. GET-only confirms hosted records have not drifted into a new blocker. |
| Risks / tradeoffs | Integration identity still cannot create Supplier. Operators must not Submit PI on skeleton COGS/Creditors defaults. |
| Approver | Pending Anton merge of the #1213 PR |
| GitHub implementation | `docs/erpnext/ERPNEXT_BUYING_AP_READINESS_V1.md` + `docs/runbooks/ERPNEXT_BUYING_AP_OPERATOR_RUNBOOK_V1.md` + GET-only apply |
| ERPNext Project / Task | Programme Project `PROJ-0002` / Phase 4 `TASK-2026-00030` and Phase 5 `TASK-2026-00031` |
| Verification evidence | `node --test node-tests/erpnext-buying-ap-readiness.test.mjs` plus GET-only log |
| Supersedes / superseded-by | Current-main replacement for stale PR #1107. Advances matrix row `buying_ap_supplier`. Does **not** supersede Version 2 or #1055. |
