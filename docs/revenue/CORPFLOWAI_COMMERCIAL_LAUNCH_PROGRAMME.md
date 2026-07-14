# CorpFlowAI Commercial Launch Programme

**Status:** Programme umbrella · **Updated:** 2026-07-14  
**Owner:** Anton (operator)  
**Anchor:** `<!-- CORPFLOWAI_COMMERCIAL_LAUNCH_PROGRAMME_V1 -->`

<!-- CORPFLOWAI_COMMERCIAL_LAUNCH_PROGRAMME_V1 -->

**NO IMPLEMENTATION AUTHORIZED** — this document governs planning, operating discipline, and documentation only. Financial posting, outreach execution, social profile creation, and ERPNext production configuration each require separate Anton gates.

---

## 1. Programme objective

Deliver **MUR 150,000–200,000** collected or contracted (with deposit verified) by month-end through a **manual-first, ERPNext-authoritative** quote-to-cash operating system for Mauritius rapid-delivery sprints — without building a second CRM, payment runtime, or duplicate commercial surfaces in the CorpFlow app.

**Baseline (2026-07-14):**

- Three public MUR offer pages shipped (`lib/public/rapid-delivery-offers.js`)
- Operator desk at `/admin/rapid-delivery` + revenue cockpit at `/change/revenue`
- Postgres lead intake with `CF-…` references (`corpflow-rapid-delivery` product)
- ERPNext sandbox exercised (Phase C GREEN); production shell **not authorised**
- Manual sales templates in `docs/revenue/templates/`
- Parallel USD 150 wedge at `/lead-rescue` — **separate funnel; do not merge quoting**

**Canonical catalogue:**

| Source | Role |
| ------ | ---- |
| `lib/public/rapid-delivery-offers.js` | Offer names, MUR prices, deposit notes, delivery timelines |
| `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md` | Month-end sales/delivery flow, approval rules, non-actions |

---

## 2. End-to-end visual flow

```text
Social / warm intro
  → Public website (/ or /offers/{slug} or /contact#discovery)
  → DiscoveryIntakeForm submit
  → CF-… reference (Postgres lead ID tail)
  → Row in leads (product = corpflow-rapid-delivery)
  → /admin/rapid-delivery (qualify + proposal summary)
  → /change/revenue (operator checklist + desk link)
  → Qualification + discovery call (15 min)
  → Written quote (template or ERPNext Quotation)
  → Client approves quote
  → ERPNext Quotation / deposit Sales Invoice (MUR, 50%)
  → Client MUR bank transfer
  → Anton verifies bank (cleared funds — NOT POP alone)
  → ERPNext Bank Reconciliation + Payment Entry allocated
  → DELIVERY CLEARED (see clearance rule below)
  → Delivery (24–72h visible output)
  → Client preview feedback
  → Balance Sales Invoice
  → Balance payment + allocate/recon
  → Receipt + commercial closeout
```

**Clearance rule (non-negotiable):**

```text
BANK CREDIT VISIBLE
  + ERPNext PAYMENT ENTRY ALLOCATED
  + RECONCILIATION CONFIRMED
= DELIVERY MAY START
```

**Not clearance:** POP screenshot, POP image, transfer promise, pending transaction, unallocated Payment Entry, manual lead status alone.

---

## 3. Programme streams A–E

| Stream | Priority | Owner | Branch | PR | Status | Blockers | Anton decision | Next action | Evidence | Completion criteria |
| ------ | -------- | ----- | ------ | -- | ------ | -------- | -------------- | ----------- | -------- | ------------------- |
| **A — ERPNext quote-to-cash OS** | P0 | Cursor | `docs/erpnext-quote-to-cash-operating-system` | This PR | **In progress** | None (docs-only) | Approve PR merge | Merge + link from playbook | `docs/erpnext/*`, `artifacts/corpflowai-commercial-ops/` | All 11 ERPNext runbooks + record mapping + delivery release checklist exist; NEEDS_ANTON table published |
| **B — Public surfaces live verify** | P0 | Anton + Cursor | `main` (merged) | Prior PRs | **PARTIAL** | Production deploy audit | Approve live URL sign-off | Live GET on `/offers/*` + `/contact` | Delivery Reality Audit | All three offer pages **200** on production with correct MUR prices + discovery CTA |
| **C — Social + warm outreach** | P1 | Anton | — | — | **Blocked** | Meta holds; avatar consent | Approve first profile + first send batch | Draft only until gates close | Sent-message log (private) | First approved warm outreach sent; no automated bulk |
| **D — Sales assets (PDF, case study)** | P1 | Anton + Cursor | TBD | — | **Not started** | Case study permission | Confirm anonymised proof | One-page offer PDF | PDF + permission on file | Offer PDF + at least one proof asset approved |
| **E — ERPNext production config** | P2 | Anton + Cursor | Gated packets | — | **Blocked** | Phase D hard blockers (HB-1–4) | Approve sandbox vs production shell for first posting | Accountant engage + redacted bank CSV | Sandbox screenshots / production deploy ID | First real Quotation PDF to buyer from authorised environment |

---

## 4. Wave plan

### Wave 1 — Sell on manual path (now → week 2)

- Public offer pages + templates carry sales
- Postgres intake + `/admin/rapid-delivery` for qualification
- Manual quote/deposit emails; ERPNext sandbox practice optional
- **No ERPNext production posting**
- Target: 1–3 discovery calls → 1 deposit verified

### Wave 2 — ERPNext sandbox rehearsal (week 2–4)

- Sandbox Lead → Customer → Quotation → Payment Entry for real prospects (no buyer send from sandbox until Print Format verified)
- Record mapping CF-… ↔ ERPNext maintained per `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`
- Close HB-4 (redacted bank CSV) in sandbox
- Target: end-to-end sandbox cycle for one prospect

### Wave 3 — Production ERPNext cutover (week 4–10, gated)

- Requires: accountant CoA + VAT decision + Phase D authorisation + MUST items M-1–M-9
- First production Quotation to real buyer
- First submitted Sales Invoice posts GL revenue
- MUR sprint invoicing in production (separate from USD 150 wedge items)
- Target: authoritative ERPNext PDFs for MUR sprints

---

## 5. Offer catalogue (exact names / prices)

From `lib/public/rapid-delivery-offers.js` — **do not invent offers.**

| Offer | Starting price (MUR) | Deposit | Payment |
| ----- | ------------------- | ------- | ------- |
| **AI Lead Rescue Sprint** | 35,000 | 50% before work | MUR manual bank transfer (ERPNext invoice) |
| **Premium Landing Page Rescue** | 45,000 | 50% before design/build | MUR manual bank transfer (ERPNext invoice) |
| **Customer Recovery & Reputation Management Sprint** | 45,000 | 50% before recovery work | MUR manual bank transfer (ERPNext invoice) |

**Parallel wedge (do not mix into MUR sprint quoting without care):**

- **AI Lead Rescue Setup — USD 150 launch pilot** at `/lead-rescue` → `/admin/lead-rescue`
- Separate intake, separate operator desk, USD-quoted manual pro-forma path
- Mauritius MUR sprint clients pay in MUR — **do not ask MUR sprint clients to settle in USD**

**There is NO live "Automation Starter Sprint"** — do not invent or quote it.

---

## 6. System-of-record boundaries

| Function | System of record | CorpFlow app role |
| -------- | ---------------- | ----------------- |
| Lead intake + CF-… reference | **Postgres** (`leads` table) | Public forms, `/admin/rapid-delivery` |
| CRM pipeline (qualified → won) | **ERPNext** (Lead/Opportunity/Customer) | Operator shortcuts only |
| Quotation / invoice / payment | **ERPNext** | Manual templates until production PDF path live |
| Deposit verification | **Anton + bank** → ERPNext Payment Entry | Checklist template |
| Project / delivery status | **ERPNext** Project/Task + CorpFlow preview URLs | `/change` for eligible engagements |
| Delivery release gate | **ERPNext** + `artifacts/corpflowai-commercial-ops/DELIVERY_RELEASE_CHECKLIST.md` | No auto-release |

**No second system of record.** Postgres holds app/lead state; ERPNext holds commercial state. Cross-reference via `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`.

---

## 7. Explicit non-actions

| Non-action | Reason |
| ---------- | ------ |
| No custom CRM / PM / quote system in CorpFlow | ERPNext-first (`REVENUE_DELIVERY_PLAYBOOK.md` §3) |
| No payment runtime on offer pages | Manual POP + bank verification |
| No email / WhatsApp / SMS send runtime | Anton sends manually |
| No ERPNext production posting without Phase D | Hard blockers open |
| No bank API integration | Manual verification remains canonical |
| No automated outreach / bulk send | Anton approves every external message |
| No mixing USD 150 wedge into MUR sprint quotes | Separate funnels |
| No "Automation Starter Sprint" | Does not exist in catalogue |
| No secrets / bank account numbers in repo | Operator-only |
| **NO IMPLEMENTATION AUTHORIZED** by this programme doc | Planning + operating docs only |

---

## 8. Cross-references

| Doc | Path |
| --- | ---- |
| Revenue delivery playbook | `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md` |
| GTM sellable path | `docs/revenue/CORPFLOWAI_GTM_SELLABLE_PATH.md` |
| Anton decision gates | `docs/revenue/CORPFLOWAI_LAUNCH_NEEDS_ANTON.md` |
| Quote-to-cash runbook | `docs/erpnext/CORPFLOWAI_QUOTE_TO_CASH_RUNBOOK.md` |
| ERPNext current state | `docs/erpnext/ERPNEXT_CURRENT_STATE_AUDIT.md` |
| Delivery release checklist | `artifacts/corpflowai-commercial-ops/DELIVERY_RELEASE_CHECKLIST.md` |
| Market launch readiness | `docs/revenue/CORPFLOWAI_MARKET_LAUNCH_READINESS.md` |
