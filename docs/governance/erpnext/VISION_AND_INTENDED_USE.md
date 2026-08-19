# CorpFlowAI ERP Strategy and Intended Use — Version 2

**Status:** `APPROVED — VERSION 2`  
**Approver:** Anton van den Berg  
**Approval time:** 2026-08-14 12:54 +04:00 (Mauritius)  
**Approval evidence:** [#954 comment 5291438473](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5291438473); synthesized text published by merged [PR #957](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/957). Repo status recorded by [#960](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/960).  
**Environment:** `local` (docs/governance only). Approving this doctrine does **not** change ERPNext runtime, accounting, or any live host.  
**Owner:** Anton (executive vision and approval).  
**Synthesized by:** Cursor Factory worker from #954 Version 2 source comments.  
**Date of synthesis:** 2026-08-14.  
**Anchor:** `<!-- CORPFLOWAI_ERP_VISION_AND_INTENDED_USE_V2 -->`

<!-- CORPFLOWAI_ERP_VISION_AND_INTENDED_USE_V2 -->

> **How to use this file.** This is the single canonical ERP strategy for OpenAI/ChatGPT operating-system work and Cursor/repo agents. Point to it. Do not duplicate it. Historical source comments on [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954) stay intact; if this synthesis is wrong, correct **this** document with an explicit interpretation note.

---

## 0. Non-negotiable agent rules

Consult this document before any small repo decision that touches:

- ERPNext;
- CRM / business records;
- finance / accounting / quotations / invoices;
- Projects;
- Support / Help Desk;
- automation authority;
- source-of-truth boundaries between CorpFlowAI and ERPNext.

Version 2 is **approved executive doctrine**. The rules below still do **not** licence production accounting mutation or sending client documents; those remain protected consequential actions.

| Rule | Direction |
|------|-----------|
| Minimum viable ERP, correctly founded | Implement the smallest coherent foundation that makes selected Phase 1 functions work. Do not omit masters/controls that would make later accounting, commercial, project, or audit records unreliable. |
| ERPNext authority | ERPNext is authoritative for financial/corporate business truth **where standard ERPNext fit exists**. |
| Reconcile, do not duplicate | CorpFlowAI execution/automation outside ERPNext must reconcile into ERPNext rather than grow a second set of business masters and transactions. |
| AI spend authority | **Zero default** autonomous expenditure authority. Bounded spend may be delegated later only by an explicit Anton authority matrix. |
| Supplier approval | AI **cannot** approve suppliers. Anton approves suppliers. |
| External quotations | **Every** external quotation/proposal requires Anton approval before release, regardless of value, until an explicit authority matrix says otherwise. |
| Document lifecycle | Draft → Review → Reject / Amend / Approve → Submit → Externally Share. No skip of the approval gate for outbound client-facing documents. |
| Anton time | Anton’s time is a real delivery cost in proposal/project economics. It is not free. |
| Pricing | Value-based pricing may exceed cost-plus. Internal cost sanity checks remain required. |
| Accountant authority | External accountant is authoritative for statutory/tax/payroll/Chart of Accounts and for cutover/opening-balance decisions. |
| Prestige fast lane | The immediate Prestige quotation/proposal must **not** be blocked by the broader ERP programme. |

This document authorizes **no** production deploy, ERP/accounting mutation, env/secrets change, DB/schema/custom DocTypes, external send, paid tool, or public/client_production change.

---

## 1. Purpose and lineage

CorpFlowAI is moving from opportunistic ERPNext setup to a governed, auditable business-critical ERP. This file is the executive **intended-use** statement that [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953) must evaluate against, and that agents must consult so Anton does not have to re-explain the strategy in every chat.

| Role | System |
|------|--------|
| Canonical strategy (this file) | GitHub/repo |
| Durable governance/evidence ledger | GitHub issues/PRs/docs ([#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954)) |
| Operational programme record | ERPNext standard Project/Task (when created under #954; not this packet) |
| Execution/runtime evidence | CorpFlowAI app, `/change`, GitHub checks |

Related operational docs (not substitutes for this strategy):

- `docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md` — mapping-only bridge; ERPNext commercial SoR, CorpFlowAI execution store
- `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md` — #918 row-by-row ownership matrix and smallest bridge plan (mapping/config only; no automated sync)
- `docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md` — synthetic Prestige foundation on hosted test (#920)
- `docs/sales/prestige-procurement/` — Prestige commercial pack (#919); not sent

### 1.1 Source comments on #954 (do not edit)

| Part | GitHub comment | Coverage |
|------|----------------|----------|
| Part 1 | [comment 5290601855](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5290601855) | Implementation philosophy; accounting/payroll; inventory; buying; selling; CRM; manufacturing; projects; HR; assets |
| Part 2 | [comment 5290611966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5290611966) | Asset expansion; support; AI-operated company; API-first; approvals; evidence; bank/payment reconciliation |
| Part 3 | **Not posted as a standalone #954 comment** | See §1.2 |
| Part 4 / conclusion | [comment 5290736901](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5290736901) | Survival milestones; first synthesis; #953 fit criteria |
| Version 2 clarifications | [comment 5290947208](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5290947208) | Quote gate; Anton-time cost; cutover deferral; Phase 1 order; document quality |
| Control/resilience | [comment 5291155759](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5291155759) | Lifecycle; value-based pricing; SoD compensating controls; incapacity; monthly close |
| Risk posture | [comment 5291263363](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5291263363) | Startup risk; backup/DR/IP; Prestige fast lane; knowledge-sharing |

### 1.2 Interpretation — missing Part 3

**Interpretation (not a silent rewrite of history):** #954 jumps from Part 2 (§§11–18) to Part 4 (§§27–30). No standalone “Part 3” comment with §§19–26 was found on #954 at synthesis time.

Substance that Part 4 §29 attributes to “Parts 1–4” — especially AI spend/supplier gates, ERPNext financial authority, non-duplication, and the AI financial evaluator — is captured in this document from Part 4 §29 and later Version 2 clarifications. If Anton later posts or locates Part 3, supersede this interpretation rather than editing the historical comments.

---

## 2. Implementation philosophy — minimum viable ERP, correctly founded

CorpFlowAI is a new startup. A massively complex, fully fledged ERP is the wrong starting point, even if a broader footprint may be needed later.

**Phase 1 principle:** implement the absolute minimum foundation required for ERPNext to contain the information, access, interactions, and data that the selected initial functions need in order to work correctly and coherently.

Avoid premature module activation and enterprise-style over-implementation. At the same time, do **not** omit foundational setup that would make later accounting, commercial, project, or audit records unreliable.

**Governing constraint (risk §54):** smallest coherent next increment. No module/process build unless required by current operation, control, compliance, resilience, or imminent revenue delivery.

Draft principles from Part 1 (still subject to Anton approval of this synthesis):

1. Minimum viable ERP, not minimum-quality ERP.
2. Standard ERPNext first; activate modules because the business needs them, not because they exist.
3. Selling, CRM, buying/procurement, accounting foundation, and projects are the likely Phase 1 core.
4. Inventory, manufacturing, full HR/payroll, and asset management are initially limited/deferred.
5. External professionals remain authoritative where specialist statutory/accounting/payroll expertise is required; ERPNext consumes/records their approved outputs rather than inventing accounting policy.
6. CorpFlowAI execution systems may sit outside ERPNext, but durable business/commercial records should increasingly reconcile into ERPNext where its standard model is fit for purpose.
7. The implementation must remain iterative and auditable, with unresolved questions recorded rather than hidden by configuration assumptions.

---

## 3. Source of truth — ERPNext authority and reconciliation

**Intended direction:**

- ERPNext becomes the authoritative financial/corporate-management record **where its standard model fits**.
- CorpFlowAI avoids duplicating ERPNext business masters and transactions in peripheral systems.
- CorpFlowAI execution/user-experience layers may remain outside ERPNext (factory, `/change`, outreach execution, marketing sites).
- Those layers must have a clear integration/reconciliation relationship to ERPNext CRM/business records.
- Durable support/help-desk and project-control records should favor ERPNext where standard capability fits.

Current bridge mapping (operational, not a strategy override): `docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md` — ERPNext for Customer / Quotation / Invoice / payment reference / Project / durable Issue; CorpFlowAI for `/change` execution evidence. Full domain matrix: `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md` (#918).

Prospect-engagement/outreach execution is **intentionally not defined** as an ERPNext-owned surface yet. It may remain outside ERPNext, but it must not become a second customer/commercial ledger.

---

## 4. AI-operated, API-first company

CorpFlowAI currently has one human source of operational labour: Anton. Day-to-day execution is Anton plus AI agents.

Primary agents today:

- **ChatGPT** — coordination, analysis, decision framing, governance, operating-system control;
- **Cursor** — primary code/repository implementation agent.

ERPNext must be designed for an **AI-operated company**, not a conventional screen-driven office. Anton may not open an ERPNext screen for days or weeks.

Intended pattern:

1. An inbound business event arrives (email or other intake).
2. An AI agent periodically detects/reads it.
3. The agent classifies it against predefined business rules.
4. The event is routed into a defined workflow.
5. Actions execute inside approval and control boundaries.
6. Business transactions are recorded in ERPNext where ERPNext is the correct durable record.
7. Evidence is retained to the standard agreed with accountants/compliance/auditors.
8. Downstream documents, tasks, accounting records, or management outputs are produced.

**Architectural implication:** reliable, least-privilege, machine-operable APIs/workflows and predictable business rules are core selection criteria — not secondary conveniences. Human UI remains important for exceptions, review, audit, and administration.

Automation does not remove accountability. Distinguish:

- routine, pre-authorized, reversible operations that AI/workflows may execute automatically;
- consequential actions requiring Anton approval;
- specialist accounting/statutory decisions requiring accountant/compliance authority;
- exceptions that must be escalated rather than guessed.

---

## 5. AI authority gates

Until Anton explicitly establishes delegated authority levels:

| Gate | Rule |
|------|------|
| Spend | **Zero default** autonomous expenditure authority. Bounded financial authority may be delegated later only by an explicit Anton matrix with pre-set limits. |
| Suppliers | AI **cannot** approve suppliers. Anton approves suppliers. |
| External quotations / proposals | **Every** external quotation/proposal requires Anton approval before release, **regardless of value**. AI may prepare and internally review, including commercial analysis. AI may not release/send. |
| Client-facing documents | No outbound client-facing document skips the approval gate while current authority rules remain in force. |
| Inbound information | Incoming material is accepted as source input for processing. Quality checks may still apply. There is no equivalent Anton-approval lifecycle merely for receiving inbound information. |

### 5.1 Outbound document lifecycle

For client-facing documents the intended lifecycle is linear, with possible repeated iterations:

1. **Draft** — assemble the proposed document and present it internally.
2. **Review** — Anton acts as the second authority and evaluates against the relevant criteria.
3. **Outcome** — Reject; or Amend (return to draft/review); or Approve.
4. **Submit / release** — only after approval may the actual release/submission action occur.
5. **Externally share / send** — the approved document is transmitted to the client.

Quotation fast lane has **two** gates, both required before external release:

1. **Commercial gate:** price, Anton-time delivery cost, other material delivery/compute/direct costs where known, projected contribution/margin, assumptions and terms.
2. **Presentation gate:** rendered quotation/PDF meets CorpFlowAI professional-document standard and known statutory/company requirements.

A technically valid ERPNext quotation is **not** ready for external release until Anton has approved both commercial content and rendered presentation.

---

## 6. Commercial costing and pricing

Anton’s available time is the business’s current finite human-delivery constraint. Proposal/project profitability analysis **must include an internal cost/value for Anton’s time**. It must not be treated as free because the company is early-stage.

Future extension: compute/AI consumption should be attributed where materially measurable. The method is a separate costing discussion and must not block the immediate quotation.

Cost base includes, among other things:

- rented server/infrastructure;
- AI tooling/compute;
- software/product subscriptions;
- third-party licences;
- Microsoft operating environment/licensing;
- internet and telecommunications;
- accountant/professional fees;
- future payment-gateway costs;
- Anton’s finite human delivery time.

Fully allocated product/project cost is still immature and should be developed iteratively. Many infrastructure/software overheads are likely small relative to human labour, but they are still real.

**Prestige Procurement pricing principle:** the upcoming Prestige proposal is primarily **value-based** — value created for the client, expected savings over a multi-year horizon, and projected commercial outcomes. It is not a pure cost-plus quotation.

Therefore:

- cost visibility is required so the work is economically rational;
- internal cost is not the sole price-setting mechanism;
- proposal pricing may be materially above direct/allocated delivery cost where justified by client value;
- the costing model can mature after the immediate quotation rather than blocking it.

Commercial models ERPNext item/pricing design must support without forcing an inventory model:

- one-time setup/implementation plus recurring/maintenance/service;
- two or more distinct pricing components;
- a single all-inclusive price.

---

## 7. External accountant authority

CorpFlowAI is appointing an external accounting firm. Expected responsibilities include:

- statutory company-secretarial work;
- government/statutory interactions;
- financial/tax compliance;
- payroll service.

**Accountant-authoritative decisions (do not implement until guidance is recorded):**

- Mauritius-appropriate Chart of Accounts and statutory accounting requirements;
- tax treatment on commercial documents;
- payroll service handoff versus ERPNext versus the ledger (currently one contemplated salary; exact handoff unknown);
- whether ERPNext becomes authoritative from a defined cutover date with opening balances, or reconstructs earlier transactions from inception.

**Control rule:** do not implement historical reconstruction, opening balances, or formal accounting cutover until accountant guidance has been obtained and recorded.

ERPNext should then support general ledger, accounts payable, accounts receivable, budgets, and financial reporting on that authoritative basis.

Routine finance is performed internally. The accountant provides statutory/tax/payroll functions, Chart-of-Accounts guidance, and professional advice. CorpFlowAI must not improvise statutory/tax/compliance matters.

Commercial/statutory documents may have Mauritius-specific presentation or content requirements. Verify those first. Within those rules, documents should be highly professional and strongly branded.

Legal/commercial document fields (company identity, address, tax/registration, numbering, validity, currency, tax treatment, payment terms, scope/assumptions/exclusions, acceptance, bank/payment information, signatory conventions) still need a dedicated configuration session. Prioritise what the imminent quotation needs. Do not assume unresolved statutory content.

---

## 8. Phase 1 implementation order

Anton approved this Phase 1 priority order (Version 2 clarification §34):

1. Quotation / Selling
2. Company & Accounting Foundation
3. Customers / CRM
4. Buying / Accounts Payable
5. Projects
6. Bank / Payment Reconciliation
7. Support / Help Desk
8. Deferred / low-priority: full HR/Payroll, Inventory, Manufacturing, mature Asset Management — unless an actual business requirement moves them forward

This order is intentionally **revenue-first** and may run a quotation fast lane while the broader programme continues.

### 8.1 Domain directions (Phase 1)

**Selling.** Core early ERP function. Quotations, accepted commercial records, delivery/completion evidence where relevant to services/digital work, customer invoicing, professional client-facing documents.

**Company / accounting foundation.** Minimum masters and controls so later records are reliable. Accountant validates CoA/statutory basis. Do not alter production accounting/tax/bank truth without Anton approval, and do not invent tax/CoA.

**Customers / CRM.** Lead tracking, opportunity management, and core customer-relationship pipeline records should increasingly live in or reconcile to ERPNext rather than expanding a competing independent CorpFlowAI CRM.

**Buying / AP.** Relevant early even without stock. Supplier onboarding, purchasing/procurement records, and accounting consequences for software, hardware, hosting, licences, accountants, and other operating suppliers. AI cannot approve suppliers.

**Projects.** Used substantially for larger client engagements. Wanted: documentation, phases/schedules, tasks/dependencies/milestones, timesheets, staged/gated payment milestones, client-appropriate delivery and acceptance evidence. **ERPNext-first:** run Projects inside ERPNext as far as standard capability remains practical; add specialist tools only for proven gaps. Open design question: full project-management operating surface versus project accounting/control records with another execution surface for day-to-day delivery — test against real capability, do not assume.

**Bank / payment reconciliation.** Critical future integration. Provider-neutral requirement first; map the selected gateway onto standard ERPNext capability. Do not design around a gateway that has not been selected.

**Support / Help Desk.** Important, start basic. **ERPNext-first:** use standard Help Desk/Issue for durable support records where it fits; CorpFlowAI execution surfaces may sit above it. Expand only when proven useful.

**Deferred / thin:**

- **HR/Payroll** — minimum employee/people master required by accounting, access, time records, or third-party payroll handoff. No full internal payroll/HR in Phase 1.
- **Inventory** — software/digital-products business; no ordinary stock expected in Phase 1. Do not implement merely because ERPNext provides it.
- **Manufacturing** — not the operating model. Do not implement Manufacturing in Phase 1 merely to obtain product costing. First ask whether standard accounting, project costing, or service costing can represent digital-product economics.
- **Asset management** — currently almost no company-owned operational hardware (existing hardware is personally owned by Anton and Sarah Ferré and loaned/made available). Record only what is actually required. Preserve a clean path to later expansion when CorpFlowAI buys company-owned assets.

---

## 9. Client-facing document quality

Visual/document professionalism is an **acceptance criterion**, not a cosmetic afterthought.

Required direction:

- verify Mauritius statutory/content requirements first;
- create a consistent CorpFlowAI commercial-document system (identity, typography/layout, logo/letterhead, terms, pricing presentation, scope/assumptions/exclusions, payment information);
- prioritize Quotation print/PDF immediately because a real project quotation is required within days;
- use standard ERPNext/Frappe Print Format/letterhead first where it can meet the standard;
- introduce custom print-format code/templates only when standard tooling demonstrably cannot achieve the required quality;
- test rendered PDF/output visually, not only the underlying ERP data.

---

## 10. AI financial review / evaluator

An AI-assisted periodic financial-control / due-diligence mechanism is required to detect anomalies, omissions, and potential mistakes **without replacing professional accounting judgement**.

ChatGPT and other AI evaluators should identify where second/third review is justified and help design layered review where the risk warrants it. AI reviewers do **not** create true human segregation of duties, but can still challenge, detect anomalies, and review evidence if their evaluation process is sufficiently independent.

Do not add uninvolved human approvers purely as governance theatre.

AI error, duplicate processing, and incorrect retries remain an acknowledged gap. Future controls should likely include idempotency, duplicate detection, reconciliation, exception queues, and independently verifiable transaction references. Those mechanisms are **not yet approved in detail**.

---

## 11. Monthly financial close

Anton expects formal period discipline and cannot envisage running the business without proper month-end closure/review.

**Monthly is the minimum expected financial close/review boundary.** The external accountant should guide exact accounting policy/process.

Plan for:

- monthly reconciliation/review;
- close/checklist discipline;
- accountant/statutory inputs where relevant;
- controlled post-close adjustments;
- evidence that the month was reviewed and exceptions were resolved or carried formally.

---

## 12. One-human control, incapacity, and key-person resilience

Anton is the only active day-to-day human operator. That is a real control weakness.

**Direction:** practical compensating controls, not artificial personnel. Candidate controls: independent professional accountant review where relevant, AI cross-checking, anomaly detection, tamper-evident evidence, retrospective sampling/reconciliation, and explicit approval trails.

**Incapacity / key-person resilience is a strategic design requirement**, broader than death or permanent loss. The business should continue if Anton becomes temporarily or permanently physically or cognitively impaired.

This is one reason Anton is driving automation, extensive documentation, structured communication, voice-control capability, minimized dependence on manual screens, and reduction of required day-to-day contribution over time.

**Strategic objective:** the company should be capable of supporting Anton even under materially diminished ability to operate it manually, while preserving appropriate approval/control safeguards. Treat this as an ERP/operating-system design criterion and a business-continuity requirement.

---

## 13. Executive reporting — survival first

Do not build a mature-company KPI system while the company is focused on survival and revenue acquisition.

Ordered financial survival milestones:

1. **Cover operating costs** (servers/hosting, software, licences/subscriptions, other recurring opex).
2. **Fund Anton’s salary and associated tax burden** — a distinct threshold, not merely another expense line.
3. **Sustainably no longer losing money** on ordinary monthly operations (not necessarily mature profitability).

The ERP/reporting environment should show monthly operating-cost requirement, monthly salary/tax requirement when authoritative figures exist, combined survival/break-even target, and actual/forecast revenue against those thresholds.

Initial CEO reporting is revenue-first: marketing effectiveness, conversion, proposal economics, monthly operating-cost coverage, salary/tax coverage, and the path to break-even.

After sustainable break-even, revisit KPIs, investment measures, profitability targets, and growth controls. That future review is an intentional governance checkpoint, not an omission.

---

## 14. Startup risk posture

Anton accepts that a startup will act before every process/control is fully mature. Waiting for perfect control would prevent commercially necessary action.

**Policy direction:** move quickly, but preserve enough evidence to reconstruct:

- what decision/process was attempted;
- what actions were taken;
- what outcome resulted;
- what defect was later identified;
- what corrective decision was made;
- what corrective actions followed;
- what subsequent transactions/outcomes demonstrate the changed process.

Document enough to make decisions, mistakes, corrections, and outcomes auditable **without** process overhead that prevents the startup from moving.

| Risk | Posture |
|------|---------|
| Accounting configuration error | Acknowledged. Mitigate with correct foundation, periodic review, AI evaluator, accountant guidance where material, month-end control, and correction records. Zero-error operation is not claimed. |
| Single-human control | Accepted, with layered AI evaluators and compensating controls. No governance-theatre second approver. |
| Integration / source-of-truth divergence | Currently low because volume is low and strategy is consolidation. Monitor as volume grows: scheduled reconciliation, SoT checks, duplicate/divergence detection. |
| Immature cost model | Explicitly accepted for now. Improve visibility progressively without blocking revenue. Prestige remains value-based with enough cost sanity to avoid obviously uneconomic work. |
| Compliance | Mitigated by procuring an external legal/compliance/accounting provider as an authoritative escalation source. |
| Over-implementation | Actively constrained. Smallest coherent next increment. |

---

## 15. Security, backup, DR, and IP continuity

These are **business-critical controls** and an immediate due-diligence requirement ([#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953) Workstream B). This strategy packet does **not** perform that audit.

Anton is unsure what the current server backup process actually protects and wants configuration audited rather than assumed.

Required investigation includes:

- what the server backup process backs up;
- frequency / retention / destination;
- whether ERPNext database/files/configuration are included;
- whether CorpFlowAI application/Postgres/runtime data are included as appropriate;
- restore procedure and whether it has been tested;
- server security/hardening and exposure;
- patch/update posture;
- disaster-recovery options if the primary server is lost;
- realistic recovery time / recovery point expectations.

**Backup is not DR.** Having backup data is not the same as having a practical way to restore or spin up the business after loss of the server.

**Repository/IP continuity:** GitHub-held intellectual property is business-critical. Review GitHub redundancy/history, whether an independent repository backup/mirror/export is required, access/recovery if the primary GitHub account/repository became unavailable, preservation of issues/PRs/docs as well as source, and **no secret replication into unsafe backup media**.

---

## 16. Prestige quotation / proposal fast lane

The near-term deliverable is not only an ERPNext Quotation record.

The Prestige engagement requires, in a very short timeframe:

- a professional commercial proposal;
- supporting project/delivery infrastructure;
- a professional ERPNext quotation;
- value-based pricing logic;
- project scope / timeline / payment structure;
- commercial and presentation approval gates;
- enough underlying ERP/company/customer/product data to make the quotation genuine and reusable downstream.

**The ERP adoption programme must not block this revenue deliverable.** Run the Prestige fast lane in parallel using the minimum validated ERP foundation.

Existing evidence (do not redo; do not send):

- [#919](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/919) / `docs/sales/prestige-procurement/` — proposal pack; not sent
- [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920) — synthetic Prestige foundation on hosted test; no live Prestige customer; no submit/send/payment

---

## 17. What #953 must evaluate against

The business-critical due-diligence programme must evaluate ERPNext against **this** operating model, not a generic ERP feature checklist.

Heavily weighted fit criteria:

- machine-operable API reliability;
- least-privilege service identities;
- strong financial/accounting integrity and auditability;
- clear submit/approval boundaries;
- draft-versus-committed transaction states;
- ability to enforce supplier / expenditure / proposal-release gates;
- strong Customer / CRM / Selling / Buying / Project support;
- bank/payment reconciliation capability;
- version/change/audit evidence;
- reporting/data access suitable for AI control review;
- low administrative burden for a one-human, AI-operated company;
- ability to start small without blocking later expansion;
- incapacity/key-person resilience;
- security / backup / DR / IP continuity.

---

## 18. Open questions (do not silently close)

Recorded as unresolved on purpose:

1. Exact third-party payroll ↔ ERPNext ↔ ledger handoff.
2. Whether ERPNext is the full project-management operating surface or primarily project accounting/control.
3. Exact Help Desk boundary between CorpFlowAI execution UX and ERPNext durable records.
4. Digital-product costing model (accounting vs project vs service costing vs manufacturing — manufacturing not assumed).
5. Accounting/legal treatment of loaned/director-owned equipment.
6. Bank/payment-gateway provider facts and reconciliation mapping.
7. Exact evidential standard per automated transaction class (to be agreed with the accountant).
8. Cutover date vs reconstruction-from-inception (accountant decides).
9. AI error / idempotency / duplicate-processing control design.
10. Delegated spend/quotation authority matrix (none exists today).
11. Commercial-document legal/identity field lock-down session.
12. Backup/DR/IP continuity factual audit (separate control workstream).

---

## 19. Knowledge-sharing and change control

Anton requires this strategy to be discoverable beyond a single chat:

- OpenAI/ChatGPT CorpFlowAI operating-system work;
- Cursor agents / repo implementation;
- future contributors/automation where appropriate.

Implementation principle:

- **one** canonical ERP strategy document (this file);
- lightweight pointers from existing shared agent-context surfaces;
- #953 / #954 remain the decision/evidence lineage;
- ERPNext Project/Tasks remain the operational programme record (when created);
- material strategy changes use new decision records / supersession rather than silently rewriting historical intent.

Discovery pointers shipped with [#955](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/955):

- `AGENTS.md`
- `.cursor/rules/erpnext-strategy.mdc`
- `.context/system_prompt.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md` (ChatGPT/operator coordination surface)

---

## 20. Protected boundaries

This approved Version 2 strategy does **not** authorize:

- production accounting / tax / bank / payment mutation;
- bulk migration or opening-balance posting;
- schema / custom DocTypes;
- public exposure / network / firewall changes;
- env / secrets changes;
- paid vendor engagement;
- live email / WhatsApp / SMS / external send;
- client_production launch;
- merge to `main` (Anton merge approval still required).

Ordinary reversible work that **is** in scope for follow-on packets: discovery, inspection, design, docs, tests, PRs, synthetic proofs, corpflow_test validation — still stopping at the exact consequential action.

---

## 21. Approval state

**Current verdict:** `APPROVED — VERSION 2`  
**Approver:** Anton van den Berg  
**Approval time:** 2026-08-14 12:54 +04:00 (Mauritius)  
**Approval evidence:** Anton’s explicit approval on [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5291438473). The synthesized Version 2 text was published by merged [PR #957](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/957) from [#955](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/955). [#960](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/960) records that approval in the canonical repo doctrine.

Historical meaning of Version 2 is unchanged. Future changes must be recorded as a new decision that explicitly supersedes the relevant Version 2 decision; do not silently rewrite historical #954 comments.

Follow-on work (not authorized by this approval-status packet):

1. Independent market/product/security research against this AI-operated startup model ([#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)).
2. Backup/security/DR/repository continuity as a dedicated control workstream.
3. Prestige quotation/proposal fast lane in parallel.
4. Remaining #954 governance artefacts (decision/risk/control registers; ERPNext programme Project) stay on #954.

This approval does **not** authorize production accounting mutation, env/secrets change, schema/custom DocTypes, live send, paid tools, or client_production launch.
