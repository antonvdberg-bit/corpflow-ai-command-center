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
| **A — ERPNext quote-to-cash + delivery release** | P0 | Cursor | `docs/erpnext-quote-to-cash-operating-system` | [#603](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/603) | **PR open** | Phase D for live posting | Approve sandbox-vs-production for first buyer PDF | Merge docs; rehearse in sandbox | `docs/erpnext/*`, delivery release checklist | Runbooks + record mapping + clearance rule + test plan published; no production GL posts |
| **B — HeyGen + Canva launch media factory** | P0 | Cursor + Anton (capture) | `docs/corpflowai-launch-media-production-kit` | [#604](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/604) | **PR open** | Temporary HeyGen/Canva access; avatar consent | Approve likeness/voice (NA-001) + capture checklist | Generate exports while access remains | `artifacts/corpflowai-launch-media/` | Full script/storyboard/Canva kit ready; renders only after Anton consent |
| **C — Social profile foundation** | P1 | Anton (manual) + Cursor (pack) | `docs/corpflowai-social-launch-foundation` | [#605](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/605) | **PR open** | Meta holds; no auto-create | Approve first profile creation (NA-003) | Anton creates LinkedIn first using pack | `artifacts/corpflowai-social-launch/` | Profiles named/copied; Anton completes platform setup; no publish without approval |
| **D — Website insights + video hub** | P1 | Cursor | `feat/corpflowai-insights-and-video-hub` | [#606](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/606) | **PR open** | YouTube URLs pending | Confirm logo/CTA (NA-005); approve Production deploy | Ship Preview with polished coming-soon video states | `/insights`, `/videos` | Routes live on Preview; no broken embeds; Production deploy gated |
| **E — Launch campaign + manual outreach prep** | P1 | Cursor (drafts) + Anton (send) | `docs/corpflowai-launch-campaign` | [#602](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/602) | **PR open** | Outreach approval gate | Approve first warm batch (NA-004) | Merge drafts; Anton approves one send | `artifacts/corpflowai-launch-campaign/` | 30-day calendar + drafts marked DRAFT ONLY; zero outbound sends until approved |

**Related (not renamed streams):** public offer URL live-verify and ERPNext Phase D production config remain **gates inside A/E**, not separate programme streams.

---

## 4. Wave plan

### Wave 1 — begin immediately (docs + media prep)

- Stream A audit + ERPNext runbooks
- Stream B scripts + production kit (while HeyGen/Canva access is live)
- Stream C profile copy + asset requirements
- Stream E campaign + outreach drafts
- Manual quote/deposit path carries sales; **no ERPNext production posting**
- Target: docs merged; media pack ready for Anton capture

### Wave 2 — once scripts + content model stable

- Stream D website insights/video implementation
- Canva asset population + HeyGen production from approved scripts
- Social profile **manual** setup by Anton
- ERPNext sandbox rehearsal (Customer → Quotation → Payment Entry) using `docs/erpnext/ERPNEXT_TEST_TRANSACTION_PLAN.md`
- Target: Preview insights hub; sandbox end-to-end for one synthetic prospect

### Wave 3 — after finance process + public assets ready

- Controlled launch content publication (Anton)
- First manual outreach batch (Anton-approved)
- Qualification → ERPNext quotation test → first cleared-payment process
- Production ERPNext cutover only after Phase D hard blockers + MUST items
- Target: first deposit cleared + delivery released under the clearance rule

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
