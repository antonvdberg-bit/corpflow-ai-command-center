# ERPNext-first revenue operating system evaluation

**Status:** Docs-only evaluation. **No ERPNext production posting. No runtime, deploy, DB/schema, env/secrets, payment integration, automated sends, or external outreach.**

**Owner:** Anton (operator decision). **Evaluator packet:** Codex research import via Cursor (issue [#573](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/573)).

**Parent doctrine:** [#572](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/572) — visible delivery throughput is the default.

**Business target:** Bank **MUR 150,000–200,000** by month-end via fast sales-to-delivery execution.

**Anchor sentinel:** `<!-- ERPNEXT_FIRST_REVENUE_OPERATING_SYSTEM_EVALUATION_V1 -->`

<!-- ERPNEXT_FIRST_REVENUE_OPERATING_SYSTEM_EVALUATION_V1 -->

**Created:** 2026-07-08.

**Companion revenue packet (PR #574):**

- Public offer pages: `/offers/ai-lead-rescue`, `/offers/premium-landing-page-rescue`, `/offers/customer-reputation-recovery`
- Template pack: `docs/revenue/templates/` (10 files)
- Playbook: `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`

---

## 1. Executive verdict

**ERPNext is the system of record** for CRM, quotations, client onboarding documents, deposit/payment records, projects/WBS, feedback, release approval, and maintenance **unless explicitly proven unsuitable**.

**CorpFlowAI remains a thin public/revenue wrapper:**

- Public offer pages and buyer-visible delivery surfaces
- Operator shortcuts where they reduce friction (`/admin/lead-rescue`, `/change` where eligible)
- Client-visible preview/production URLs
- Manual sales templates that mirror ERPNext record types

**Do not build:** custom CRM, custom project management, custom quote/deposit system, or duplicate ERPNext modules in the CorpFlow app.

**July execution posture:** Sell and deliver on manual templates + offer pages **today**; configure ERPNext sandbox records in parallel; **no ERPNext production posting** until Phase D hard blockers close (`docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md`).

---

## 2. ERPNext configuration map

Map each revenue workflow stage to ERPNext DocTypes/modules. Configure — do not reimplement in CorpFlow.

| Stage                  | ERPNext module / DocType                                                       | Configuration action                                                                                              | CorpFlowAI role                                                                 |
| ---------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Prospect discovery     | **Lead** → **Opportunity**                                                     | Create Lead from discovery notes; convert to Opportunity when qualified                                           | Public `/offers/*` pages; mailto discovery CTA; manual discovery email template |
| Quote                  | **Quotation** (+ Print Format)                                                 | Issue Quotation renamed _Pro-forma invoice_ per production readiness eval; attach scope from quote email template | Written quote email template only — no quote runtime                            |
| Deposit request        | **Quotation** note + **Communication**                                         | Record deposit terms (50%); payment instructions sent separately — not on public page                             | `deposit-request.md` template; no payment runtime                               |
| Bank deposit / POP     | **Payment Entry** (draft until verified)                                       | Record POP reference; submit Payment Entry only after **cleared funds** verified                                  | `deposit-received-manual-verification.md` checklist                             |
| Approval to proceed    | **Opportunity** stage + **Project** creation trigger                           | Move Opportunity to _Won_; create Project at deposit verification                                                 | `approval-to-proceed.md` template                                               |
| Client onboarding docs | **Customer** + **File** attachments on Customer/Project                        | Attach discovery notes, scope, quote, POP, approvals per checklist                                                | `client-onboarding-document-checklist.md`                                       |
| Project / WBS          | **Project** + **Task** (+ **Milestone** if useful)                             | Map sprint deliverables: connect source / preview / handover / release                                            | CorpFlow holds preview/production URLs; ERPNext holds status and dates          |
| Delivery timeline      | **Task** dates + **Project** expected dates                                    | 24–72h first-output task; five-day handover task                                                                  | Visible slice on tenant host or preview URL                                     |
| Client feedback        | **Task** comment + **Communication**                                           | Log preview feedback; SLA 2 business days                                                                         | `preview-feedback-request.md` template                                          |
| Production release     | **Task** milestone _Released_ + written approval file                          | No GL impact; release approval attached to Project                                                                | `production-release-approval.md` template                                       |
| Maintenance            | **Contract** or recurring **Sales Invoice** template (defer until post-sprint) | Month-to-month maintenance quoted separately                                                                      | `maintenance-offer.md` template                                                 |

**Environment rule:**

| Environment                                     | Use for month-end revenue                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| ERPNext **sandbox** (`127.0.0.1:8080`)          | Operator practice, synthetic rehearsal, optional pilot record-keeping                |
| ERPNext **production shell** (`127.0.0.1:8081`) | **Not authorised** for buyer-facing documents until Phase D + Print Designer AC pass |
| **Manual templates**                            | **Canonical for external buyer send** until production PDF path is verified          |

---

## 3. Client onboarding document configuration (ERPNext)

Store these 13 document types against **Customer** and/or **Project** records (File attachment + Communication log):

| #   | Document                         | ERPNext location                                   |
| --- | -------------------------------- | -------------------------------------------------- |
| 1   | Discovery notes                  | Lead/Opportunity → Communication; file on Customer |
| 2   | Client profile / company details | Customer doctype                                   |
| 3   | Scope summary                    | Opportunity custom field or attached scope note    |
| 4   | Quote / proposal                 | Quotation PDF + Communication                      |
| 5   | Deposit request                  | Communication (payment instructions separate)      |
| 6   | Payment proof (POP)              | File on Customer/Project; Payment Entry draft      |
| 7   | Bank deposit verification note   | Communication on Payment Entry                     |
| 8   | Approval to proceed              | Communication + Project created                    |
| 9   | WBS / delivery plan              | Project + Tasks                                    |
| 10  | Preview feedback request         | Communication + Task comment                       |
| 11  | Client feedback log              | Task comments / Issue (if Issue module enabled)    |
| 12  | Production release approval      | File attachment + Task milestone                   |
| 13  | Maintenance agreement / handover | File on Project; optional Contract                 |

**Template mirror:** `docs/revenue/templates/` maps 1:1 to these record types for manual operation until ERPNext UI is configured.

---

## 4. CorpFlowAI pages/templates still required

| Asset                                     | Status      | Path                                             |
| ----------------------------------------- | ----------- | ------------------------------------------------ |
| AI Lead Rescue Sprint offer page          | **Shipped** | `/offers/ai-lead-rescue`                         |
| Premium Landing Page Rescue offer page    | **Shipped** | `/offers/premium-landing-page-rescue`            |
| Customer Recovery Sprint offer page       | **Shipped** | `/offers/customer-reputation-recovery`           |
| Sales template pack (10)                  | **Shipped** | `docs/revenue/templates/`                        |
| Revenue delivery playbook                 | **Shipped** | `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`      |
| Legacy USD 150 wedge (separate funnel)    | **Exists**  | `/lead-rescue` — do not merge with sprint offers |
| `/change` for eligible client engagements | **Exists**  | Operator/client control plane — not a CRM        |
| ERPNext evaluation (this doc)             | **Shipped** | This file                                        |

**Not required in CorpFlow app (ERPNext-first):**

- Custom CRM UI
- Custom quote builder
- Payment checkout
- Email/WhatsApp/SMS send runtime
- Custom project management board
- Duplicate onboarding document store

---

## 5. CorpFlowAI vs ERPNext boundary

| Function             | ERPNext (system of record)              | CorpFlowAI (thin wrapper)                      |
| -------------------- | --------------------------------------- | ---------------------------------------------- |
| CRM pipeline         | Lead, Opportunity, Customer             | Public offer pages; discovery mailto           |
| Quotation / invoice  | Quotation, Sales Invoice, Payment Entry | Manual quote/deposit templates                 |
| Deposit verification | Payment Entry + bank recon              | Manual verification checklist                  |
| Project delivery     | Project, Task, Milestone                | Preview URLs, tenant surfaces, `/change`       |
| Client feedback      | Communication, Task comments            | Preview feedback template                      |
| Release approval     | Project milestone + file                | Production release template                    |
| Maintenance          | Contract / recurring invoice (later)    | Maintenance offer template                     |
| Visible marketing    | —                                       | `/offers/*`, `/contact`, legacy `/lead-rescue` |

---

## 6. 24-hour proof plan

**Goal:** Prove the revenue operating system works end-to-end without ERPNext production posting.

| Hour block | Anton (operator)                                                                                  | Evidence                                                |
| ---------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0–2h       | Send one warm `prospect-discovery-email.md` with correct `/offers/*` link                         | Sent message screenshot (private)                       |
| 2–4h       | Run `discovery-call-script.md` on a real or role-play prospect; log fit                           | Discovery notes captured                                |
| 4–6h       | Issue `quote-email.md` for one offer (MUR price, 50% deposit)                                     | Quote email draft approved                              |
| 6–8h       | Optional: create **sandbox** Lead + Customer + Quotation for same prospect                        | ERPNext sandbox screenshot (no buyer send from sandbox) |
| 8–24h      | If deposit received: run `deposit-received-manual-verification.md`; send `approval-to-proceed.md` | Verification checklist complete                         |

**CorpFlow visible slice proof (same day):**

- Preview URL for `/offers/*` returns **200** with price, deposit, timeline, discovery CTA
- First delivery preview link for an active sprint (tenant or Vercel preview) within 24–72h after deposit clearance

---

## 7. Risks and non-negotiables

| Risk                                                  | Mitigation                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Building duplicate CRM in CorpFlow                    | ERPNext-first rule; templates only in repo                               |
| ERPNext production posting before accountant sign-off | **No production posting** this month-end window                          |
| POP screenshot treated as paid                        | Manual bank verification required (playbook §6)                          |
| Scope creep into generic AI / chatbot                 | Route to sprint offers; decline misframed asks                           |
| Sandbox PDF sent to buyer                             | Manual pro-forma template for external send until Print Designer AC pass |
| Month-end target missed while configuring ERP         | Sell on manual path first; ERPNext config in parallel                    |

**Non-negotiables:**

- ERPNext is system of record when configured — CorpFlow does not duplicate it
- Visible delivery in 24–72h after deposit clearance
- No revenue guarantees on public pages
- Anton approves every external send
- No ERPNext production GL posting without separate Phase D authorisation

---

## 8. Cursor work packet (completed + next)

### Completed (PR #574)

- [x] Three public `/offers/*` pages with MUR pricing, deposit, timeline, discovery CTA
- [x] Ten manual sales templates in `docs/revenue/templates/`
- [x] `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`
- [x] This ERPNext-first evaluation doc
- [x] Tests: `node-tests/revenue-offer-pages.test.mjs`

### Next (operator / gated — not in this PR)

- [ ] Configure ERPNext sandbox Lead → Customer → Quotation for first real prospect
- [ ] Run `ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md` if not done this week
- [ ] Close Phase D hard blockers before any production ERPNext posting
- [ ] Optional: link sandbox Customer to CMP ticket for `/change` engagements only

---

## 9. Codex evaluation packet (closure)

**Evaluation questions (issue #573) — answers:**

| #   | Question                                   | Answer                                                                                                    |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1   | Which workflow stages can ERPNext support? | All 11 stages in §2 map — CRM through maintenance                                                         |
| 2   | Which DocTypes to configure vs build?      | Configure Lead/Opportunity/Customer/Quotation/Payment Entry/Project/Task; do not build custom equivalents |
| 3   | Client onboarding documents in ERPNext?    | 13 types in §3 — File + Communication on Customer/Project                                                 |
| 4   | What stays in `/change` vs ERPNext?        | `/change` = client site delivery control; ERPNext = commercial + project record                           |
| 5   | What CorpFlow pages still needed?          | §4 — offer pages and templates **shipped**; no CRM build                                                  |
| 6   | Fastest 24h proof?                         | §6 manual sales path + optional sandbox record                                                            |

**Codex packet status:** **IMPORTED** — evaluation captured in this doc; no separate Codex PR required.

---

## 10. Explicit non-actions

| Non-action                        | Reason                                       |
| --------------------------------- | -------------------------------------------- |
| No custom CRM / PM / quote system | ERPNext-first                                |
| No payment runtime                | Manual POP + bank verification               |
| No email / WhatsApp / SMS runtime | Anton sends manually                         |
| No production DB/schema change    | Docs + static offer pages only               |
| No secrets / paid tools           | Operator-controlled stack                    |
| No external outreach execution    | Templates only                               |
| **No ERPNext production posting** | Phase D blockers open; sandbox practice only |

---

## 11. Cross-references

- `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md` — month-end sales/delivery flow
- `docs/operations/ERP_BACKBONE_DECISION_AUDIT_V1.md` — keep ERPNext; no Odoo switch
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` — Phase D gates
- `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` — POP + sandbox sequencing
- `docs/operations/ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md` — sandbox rehearsal
- GitHub [#573](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/573) — evaluation parent issue

---

## 12. Delivery verdict (this document)

```text
Delivery Reality Audit (docs packet only):
- Local fix exists: YES
- Merged to main: pending PR #574
- Production deployment ID: n/a (docs + offer pages in same PR)
- Commit deployed: pending merge
- Live URLs tested: /offers/* on Vercel preview (pending update after push)
- Expected vs actual result: ERPNext-first evaluation doc added; no ERPNext production change
- Client-facing flow usable: offer pages usable on preview after push
- Final verdict: PARTIAL (awaiting PR merge + production deploy + live URL check)
```
