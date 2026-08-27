# CorpFlowAI quote-to-cash runbook

**Status:** Operator runbook · **Updated:** 2026-07-14  
**Owner:** Anton  
**Anchor:** `<!-- CORPFLOWAI_QUOTE_TO_CASH_RUNBOOK_V1 -->`

<!-- CORPFLOWAI_QUOTE_TO_CASH_RUNBOOK_V1 -->

Full lifecycle for **Mauritius rapid-delivery sprints** (MUR, 50% deposit, manual bank transfer). Parallel **USD 150 wedge** at `/lead-rescue` uses a separate operator path — do not merge without explicit scope change.

**Client Master (#880):** create standard ERPNext Customer + Contact + Address before the first Quotation — `docs/erpnext/ERPNEXT_CLIENT_MASTER_V1.md`.

**Canonical catalogue:** `lib/public/rapid-delivery-offers.js` + `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`
**Canonical catalogue:** ERPNext item masters in `docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md` / `config/erpnext-product-catalogue.v1.json`. Public offer copy remains `lib/public/rapid-delivery-offers.js` + `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`.  
**Commercial documents (#882):** `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md` — READY: MUR + USD quotations and draft Sales Invoices proven (Anton Currency Exchange USD→MUR 47.15). Synthetic drafts only — do not submit/send.

**Selling / quote-to-cash (#1056 / current-main #1166):** `docs/erpnext/ERPNEXT_SELLING_QUOTE_TO_CASH_V1.md` — CF1018 draft MUR Quotation path proven from reused WP2 Customer. Full quote-to-cash posting is **NOT READY — BLOCKED BY ACCOUNTANT FOUNDATION** (#1055). Client-document PDF/terms for `SAL-QTN-2026-00005` is separately **NOT READY** until the quotation terms body is stamped (#1196). Do not submit invoices or create Payment Entries from this runbook until that blocker clears. #1166 is the current-`main` landing of the proven #1101 slice after #1162 Commercial quotation-evidence continuity; it is not a second design. Stale PR #1128 / #1125 is retired.

**NO IMPLEMENTATION AUTHORIZED** — operating procedure only. No production ERPNext posting without Phase D gates.

---

## Clearance rule (prominent)

```text
╔══════════════════════════════════════════════════════════════════╗
║  BANK CREDIT VISIBLE                                             ║
║    + ERPNext PAYMENT ENTRY ALLOCATED                           ║
║    + RECONCILIATION CONFIRMED                                    ║
║  = DELIVERY MAY START                                            ║
╚══════════════════════════════════════════════════════════════════╝
```

**Not clearance:**

- POP screenshot or POP image alone
- Client transfer promise or "sent today" message
- Pending / uncleared bank transaction
- Unallocated Payment Entry (draft or submitted but not linked to invoice)
- Manual lead status change in Postgres or `/admin/rapid-delivery` alone
- Operator gut feel without bank statement confirmation

---

## Lifecycle overview

```text
Qualified prospect
  → Customer (ERPNext)
  → Quotation (scope + MUR price + 50% deposit terms)
  → Client acceptance (written)
  → [Sales Order — optional; usually skip for sprints]
  → Deposit Sales Invoice (50%)
  → Client MUR bank transfer
  → Anton verifies bank (cleared funds)
  → Bank Reconciliation
  → Payment Entry allocated to deposit invoice
  → DELIVERY CLEARED
  → Delivery (24–72h visible output)
  → Client acceptance / preview feedback
  → Balance Sales Invoice (50%)
  → Balance payment + allocate + recon
  → Receipt / paid-in-full
  → Commercial closeout
```

---

## Stage 1 — Qualification (Postgres + operator)

| Step | Action | System | Automation class |
| ---- | ------ | ------ | ---------------- |
| 1.1 | Prospect submits DiscoveryIntakeForm | Postgres (`leads`) | AUTOMATION CANDIDATE (intake exists) |
| 1.2 | CF-… reference shown on screen | Postgres | LIVE |
| 1.3 | Operator reviews on `/admin/rapid-delivery` | CorpFlow app | MANUAL CONTROL |
| 1.4 | 15-min discovery call | Anton | MANUAL CONTROL |
| 1.5 | Match offer slug to pain (lead / landing / recovery) | Anton | MANUAL CONTROL |
| 1.6 | Set operator status → `quote_ready` or `proposal_sent` | Postgres | MANUAL CONTROL |

**Offer prices (from catalogue):**

- AI Lead Rescue Sprint — from **MUR 35,000**
- Premium Landing Page Rescue — from **MUR 45,000**
- Customer Recovery & Reputation Management Sprint — from **MUR 45,000**

**Gate:** No quotation until fit confirmed. Soft-close if no recent pain example.

---

## Stage 2 — Customer & quotation (ERPNext)

| Step | Action | System | Automation class |
| ---- | ------ | ------ | ---------------- |
| 2.1 | Create ERPNext **Customer** (legal name, contact, email, phone) | ERPNext | REQUIRES ERPNext CONFIGURATION |
| 2.2 | Log CF-… + Postgres lead ID on Customer notes / Communication | ERPNext | MANUAL CONTROL |
| 2.3 | Create **Quotation** — MUR currency, sprint Item, 50% deposit note | ERPNext | REQUIRES ERPNext CONFIGURATION |
| 2.4 | Attach scope from discovery (buyer's "success in 72 hours" language) | ERPNext | MANUAL CONTROL |
| 2.5 | Submit Quotation; generate PDF (when Print Format live) OR send manual quote email | ERPNext / email | MANUAL CONTROL until M-Print |
| 2.6 | Record Quotation ID on operator desk / mapping sheet | Cross-ref | MANUAL CONTROL |

**Detail:** `docs/erpnext/ERPNEXT_CUSTOMER_AND_QUOTATION_GUIDE.md`

**Gate:** Written client acceptance before deposit invoice.

---

## Stage 3 — Deposit invoice & payment

| Step | Action | System | Automation class |
| ---- | ------ | ------ | ---------------- |
| 3.1 | Convert Quotation → **Deposit Sales Invoice** (50%) OR issue deposit SI directly | ERPNext | REQUIRES ERPNext CONFIGURATION |
| 3.2 | Send deposit request email — bank instructions **separate** from public page | Email template | MANUAL CONTROL |
| 3.3 | Client initiates MUR bank transfer | Client bank | OUT OF SCOPE |
| 3.4 | Client sends POP | Email/WhatsApp | MANUAL CONTROL |
| 3.5 | Anton verifies **cleared funds** on bank dashboard | Anton + bank | **SHOULD REMAIN MANUAL** |
| 3.6 | Create **Payment Entry** — Receive, allocate to deposit SI | ERPNext | REQUIRES ERPNext CONFIGURATION |
| 3.7 | Enter `reference_no` + `reference_date` (bank ref) | ERPNext | MANUAL CONTROL |
| 3.8 | Run **Bank Reconciliation** — confirm line matches PE | ERPNext | REQUIRES ERPNext CONFIGURATION |
| 3.9 | Complete `DELIVERY_RELEASE_CHECKLIST.md` | Operator | MANUAL CONTROL |

**Detail:** `docs/erpnext/ERPNEXT_DEPOSIT_INVOICE_GUIDE.md`, `docs/erpnext/ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY.md`

**Gate:** Triple clearance rule before any build/configuration work.

---

## Stage 4 — Delivery

| Step | Action | System | Automation class |
| ---- | ------ | ------ | ---------------- |
| 4.1 | Send approval-to-proceed email | Email template | MANUAL CONTROL |
| 4.2 | Create ERPNext **Project** + Tasks (when configured) | ERPNext | REQUIRES ERPNext CONFIGURATION |
| 4.3 | Execute sprint deliverables (24–72h first visible output) | CorpFlow / tenant | MANUAL CONTROL |
| 4.4 | Send preview link; request feedback (2 business day SLA) | Email | MANUAL CONTROL |
| 4.5 | Production release only after written approval + balance rule | CorpFlow + client | REQUIRES APPROVAL |

**Gate:** No production push to client hostname without release approval (`REVENUE_DELIVERY_PLAYBOOK.md` §10).

---

## Stage 5 — Balance, receipt, closeout

| Step | Action | System | Automation class |
| ---- | ------ | ------ | ---------------- |
| 5.1 | Issue **Balance Sales Invoice** (remaining 50%) | ERPNext | REQUIRES ERPNext CONFIGURATION |
| 5.2 | Client pays balance via MUR transfer | Client bank | OUT OF SCOPE |
| 5.3 | Anton verifies cleared funds | Anton | **SHOULD REMAIN MANUAL** |
| 5.4 | Payment Entry + allocation + recon (same discipline as deposit) | ERPNext | REQUIRES ERPNext CONFIGURATION |
| 5.5 | Send receipt / paid-in-full confirmation | Email | MANUAL CONTROL |
| 5.6 | Run commercial closeout checklist | Operator | MANUAL CONTROL |
| 5.7 | Optional maintenance offer (separate quote) | Email | MANUAL CONTROL |

**Detail:** `docs/erpnext/ERPNEXT_BALANCE_INVOICE_AND_RECEIPT.md`, `docs/erpnext/ERPNEXT_COMMERCIAL_CLOSEOUT_CHECKLIST.md`

---

## Environment selection

| Phase | Authorised environment | External buyer send? |
| ----- | ---------------------- | -------------------- |
| Wave 1 (now) | Manual templates + optional sandbox practice | Manual quote/deposit emails only |
| Wave 2 | ERPNext sandbox | **No** buyer PDF from sandbox until Print Format verified |
| Wave 3 | ERPNext production (after Phase D) | Yes — Quotation PDF from production |

**Anton gate:** NA-002 — sandbox vs production shell for first posting.

---

## Record keeping

Maintain cross-reference per `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`:

```text
CF-… ↔ Postgres lead_id ↔ Customer ↔ Quotation ↔ deposit SI ↔ deposit PE ↔ Project ↔ balance SI ↔ final PE ↔ bank recon
```

**ERPNext = commercial system of record. Postgres = app/lead system of record. No second SoR.**

---

## Explicit non-actions

- No bank API integration
- No automated POP parsing
- No auto-release on intake status alone
- No mixing USD 150 wedge into MUR sprint quotes
- No "Automation Starter Sprint" (does not exist)
- No ERPNext production GL posting without Phase D authorisation

---

## Cross-references

| Guide | Path |
| ----- | ---- |
| Customer & quotation | `docs/erpnext/ERPNEXT_CUSTOMER_AND_QUOTATION_GUIDE.md` |
| Deposit invoice | `docs/erpnext/ERPNEXT_DEPOSIT_INVOICE_GUIDE.md` |
| Bank clearance & PE | `docs/erpnext/ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY.md` |
| Bank reconciliation | `docs/erpnext/ERPNEXT_BANK_RECONCILIATION_GUIDE.md` |
| Balance & receipt | `docs/erpnext/ERPNEXT_BALANCE_INVOICE_AND_RECEIPT.md` |
| Closeout | `docs/erpnext/ERPNEXT_COMMERCIAL_CLOSEOUT_CHECKLIST.md` |
| Test plan | `docs/erpnext/ERPNEXT_TEST_TRANSACTION_PLAN.md` |
| Record mapping | `docs/erpnext/ERPNEXT_RECORD_MAPPING.md` |
| Delivery release | `artifacts/corpflowai-commercial-ops/DELIVERY_RELEASE_CHECKLIST.md` |
