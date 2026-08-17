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
