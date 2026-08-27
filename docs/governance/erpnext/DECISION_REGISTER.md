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

## ERP-D-2026-08-26-1 — #1056 selling / quote-to-cash (proposed)

| Field | Record |
|-------|--------|
| Decision ID | `ERP-D-2026-08-26-1` |
| Date/time | 2026-08-26 |
| Status | **Proposed** (this packet; Anton merge remains the Git approval). Does **not** approve Sales Invoice posting, Payment Entry, client send, or accountant CoA/tax. |
| Question / requirement | Prove the synthetic selling path Lead/Opportunity → Customer → Quotation → accepted record → SI/pro-forma → payment evidence → Proceed Approved using standard ERPNext first. |
| Executive intent / source | [#1056](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1056); current-main continuation [#1125](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1125); parent [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054); accountant dependency [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055) |
| Options considered | Wait for #1055 before any selling work; invent a custom acceptance/invoice engine; reuse WP2/#882 and prove draft quotation now, stop before posting |
| Evidence reviewed | WP2 CF1018 Lead/Opportunity/Customer; #882 draft quotations/invoices; hosted-test Company defaults and `Mauritius Tax - CFAI` presence without accountant approval |
| Decision | Land [`ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md`](../../erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md). Draft MUR Quotation only. Map SI/pro-forma and #714 payment evidence. Classify posting as `BLOCKED BY ACCOUNTANT FOUNDATION`. |
| Rationale | Ordinary audit/reuse may proceed while accounting-bearing mutations wait. Do not guess CoA/tax. |
| Risks / tradeoffs | Operators might treat default `Debtors - CFAI` / `Sales - CFAI` as approved. This packet forbids that inference. |
| Approver | Pending Anton merge of the current-main #1125 PR (supersedes behind-main PR #1101 as the landing vehicle; does not change the design) |
| GitHub implementation | `lib/erpnext/selling-quote-to-cash.js` + apply script |
| ERPNext Project / Task | Programme Project `PROJ-0002` / Phase 5 `TASK-2026-00031` |
| Verification evidence | `node --test node-tests/erpnext-selling-quote-to-cash.test.mjs` plus live apply replay |
| Supersedes / superseded-by | Implements matrix `quotation_invoice` as a draft-only bridge. Does **not** supersede Version 2, WP1, WP2, #882, #714, or #1055. |
