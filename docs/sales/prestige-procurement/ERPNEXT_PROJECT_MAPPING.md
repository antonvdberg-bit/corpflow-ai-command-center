# Prestige Procurement — ERPNext project-record mapping

**Status:** Standard-ERPNext mapping for #919. **No schema customization. No production posting. No client send.**
**Anchor sentinel:** `<!-- PRESTIGE_PROCUREMENT_ERPNEXT_MAPPING_V1 -->`

<!-- PRESTIGE_PROCUREMENT_ERPNEXT_MAPPING_V1 -->

Official ERPNext Projects are task-driven and centralise Tasks, Timesheets, cost, and billing. Project Templates can pre-populate tasks. Quotations can carry payment terms and a proposed payment schedule.

This client can be represented with **standard** doctypes. A custom field / custom DocType proposal is **not** required to start.

---

## 1. Intended commercial chain

```text
Customer (Prestige Procurement)
  → Opportunity (optional; useful if the deal is still being negotiated)
  → Quotation (MUR, draft until Anton approves send)
      → client written acceptance
  → Project (from a Project Template matching the 12-phase WBS)
      → Tasks (one per phase; optional child tasks)
      → Timesheets (optional; useful against the 218h model)
  → Sales Invoice per payment milestone (5 invoices)
      → Payment Entry after bank clearance
  → Issue / warranty tickets only if they raise defects in the 30-day window
```

ERPNext remains the **commercial source of truth**. This markdown pack is the planning original. A disconnected Word/PDF must not replace the ERPNext quotation once #882 print quality is usable.

---

## 2. Standard doctype field map (no custom fields)

### Customer

| Field | Value |
|-------|--------|
| Customer Name | Prestige Procurement (confirm legal name before create) |
| Customer Type | Company |
| Territory / Country | Mauritius |
| Default Currency | MUR |
| Account Manager | Anton |
| Notes | GitHub #919 · one-off website project · no CorpFlowAI retainer |

Do **not** store personal ID numbers, bank details, or registrar passwords on the Customer.

### Opportunity (optional)

| Field | Value |
|-------|--------|
| Opportunity From | Customer |
| Opportunity Type | Sales |
| Source | Warm / direct (confirm) |
| Sales Stage | Proposal |
| Expected closing | Unknown until meeting |

### Quotation

| Field | Value |
|-------|--------|
| Currency | MUR |
| Price List | Standard Selling (MUR) |
| Item | See §3 — **new Item required**; do not reuse landing-rescue SKU |
| Qty | 1 |
| Rate | Anton-approved fee (recommendation MUR 285,000) |
| Valid till | 14 days from issue (Anton may extend) |
| Payment Schedule | Five rows matching 20/20/25/20/15 **or** terms text if Payment Terms Template is still permission-blocked |
| Terms | Independence, client-paid hosting, no revenue guarantee, VAT pending accountant, work starts after cleared funds |
| docstatus | **0 Draft** until Anton authorises submit/send |

Print/PDF quality is **#882**. Until that is ready, Anton may issue from ERPNext draft + the quotation markdown as a meeting aid — still **not** an external send without Anton.

### Project

| Field | Value |
|-------|--------|
| Project Name | Prestige Procurement — independent website |
| Customer | Prestige Procurement |
| Estimated Cost / Billing | Align to quotation total |
| Percent Complete Method | Task Completion |
| Expected start | After mobilisation Payment Entry allocated |

### Tasks (Project Template proposal — standard Task rows)

| Task subject | Phase | Is billable milestone? |
|--------------|-------|------------------------|
| Discovery & confirmation | 1 | Mobilisation already invoiced |
| IA / content plan | 2 | |
| UX/UI design | 3 | Invoice: design approval |
| CMS foundation | 4 | |
| Templates | 5 | |
| Self-management | 6 | Invoice: build |
| Content population | 7 | |
| QA | 8 | |
| Client review | 9 | Invoice: pre-launch |
| Cutover | 10 | |
| Training / handover | 11 | |
| Acceptance / warranty | 12 | Invoice: handover |

No custom Task fields. Use standard subject, description, start/end, assigned_to, and status.

### Sales Invoice / Payment Entry

One **Sales Invoice** per milestone (not one invoice for the whole project). Payment Entry only after bank credit is visible and allocated — same clearance rule as `docs/erpnext/CORPFLOWAI_QUOTE_TO_CASH_RUNBOOK.md`.

**Not authorised in this issue:** submitting invoices, recording payments, GL posting, VAT configuration, or emailing documents.

---

## 3. Catalogue gap (bounded proposal — do not apply here)

Current live Items (`docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md`) are sprint SKUs:

- `LR-SETUP-USD-150` / `LR-REC-USD-99`
- `CF-RD-LEAD-RESCUE` (MUR 35,000)
- `CF-RD-LANDING-RESCUE` (MUR 45,000)
- `CF-WR-REC-MUR-MAINT`

**Do not** put Prestige on `CF-RD-LANDING-RESCUE`. Wrong product, wrong price, wrong payment shape.

**Separate bounded proposal (Anton may authorise later, not in this PR):**

| Proposed Item | Suggested code | UOM | Notes |
|---------------|----------------|-----|-------|
| Custom independent website project | `CF-WS-CUSTOM-PROJECT` | Nos | Non-stock service; rate editable per quotation |
| Item Group | `CF Website Rescue` or new `CF Website Projects` leaf | — | Prefer a **new leaf group** so sprints stay distinct |

Until that Item exists, an ERPNext quotation can still be drafted with a generic service Item **only if** Anton accepts a one-off editable rate and the description clearly says “Prestige Procurement custom website — not Website Rescue T1.” Prefer creating the Item first.

Payment Terms Template HTTP 403 was previously observed for `integrations@corpflowai.com` (#899). If that remains, put the five-milestone schedule in Quotation Terms until a Role Permission grant. That is a permission issue, not a schema gap.

---

## 4. What standard ERPNext already covers (no customization)

| Need | Standard object |
|------|-----------------|
| Client | Customer + Contact + Address |
| Quote | Quotation + items + terms + validity |
| Milestone cash | Payment Schedule on Quotation / Payment Terms Template / separate Sales Invoices |
| Delivery plan | Project + Project Template + Tasks |
| Effort evidence | Timesheet against Tasks |
| Aftercare | Issue against Customer/Project |
| PDF | Print Format (#882) |

**Insufficient without a new Item (not a custom field):** a clean catalogue identity for this one-off project. That is an Item master addition, not a schema change.

---

## 5. Synthetic evidence (repo-safe)

No live Customer, Quotation, or Project was created for Prestige in this packet (would be a real commercial record and is not required to prepare the meeting pack).

Synthetic record **shape** Anton (or a later authorised sandbox step) can paste:

```text
Customer: Prestige Procurement
Quotation: DRAFT / MUR / qty 1 / rate {Anton-approved}
Payment schedule:
  20% mobilisation
  20% design approval
  25% build
  20% pre-launch
  15% handover
Project template: prestige-independent-website-12-phase
Tasks: 12 standard Tasks as §3
Invoices: 5 × Sales Invoice after each gate, not before
docstatus: 0 until Anton authorises submit
Send: forbidden until Anton authorises the exact send
```

Sandbox/test inspection for this issue is **mapping + catalogue-gap evidence**, not a posted sandbox Customer using real client legal details. If Anton later wants a sandbox rehearsal, use a synthetic name such as `SYN-Prestige-Proposal-919` — never mix with production Customers.

**#920 follow-up (2026-08-14):** reusable synthetic path exists as `CF920 Synthetic Website Project Ltd` + Item `CF-WS-CUSTOM-PROJECT` + draft quotation `SAL-QTN-2026-00004` + Project `PROJ-0001` + Issue `ISS-2026-00001`. That is **not** the Prestige Procurement client record. Canonical: `docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md`.

---

## 6. Blockers that are **not** this issue

| Blocker | Owner |
|---------|--------|
| Quotation PDF / Print Format quality | #882 |
| Authoritative item/price master for sprints | #881 / catalogue (does not include this custom Item yet) |
| ERPNext-first reconciliation | #918 |
| Actual quotation submit + email | Anton protected send |

None of those block Anton from using this pack in a live negotiation **as a meeting original**, provided he does not treat the markdown as the signed commercial document.
