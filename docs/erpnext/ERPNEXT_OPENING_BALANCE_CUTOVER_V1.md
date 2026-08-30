# ERPNext onboarding G — Opening balances / cutover preparation v1

**Status:** Read-only / offline preparation. **No posting. No import. No Chart of Accounts mutation.**  
**Issue:** [#1245](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1245)  
**Parents:** [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054), [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)  
**Related readiness:** [#1139](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1139)/[#1220](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1220) bank, [#1056](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1056)/[#1166](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1166) selling, [#1098](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1098)/[#1213](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1213) AP  
**Environment:** hosted ERPNext inspect is `corpflow_test`. Docs/template are local. Not `client_production`.  
**Machine contract:** `config/erpnext-opening-balance-cutover.v1.json`  
**Helper:** `lib/erpnext/opening-balance-cutover.js`  
**Inspect:** `bash scripts/erpnext/opening-cutover-inspect.sh`  
**Evidence:** `artifacts/erpnext/opening-cutover-1245/`  
**Strategy:** [`docs/governance/erpnext/VISION_AND_INTENDED_USE.md`](../governance/erpnext/VISION_AND_INTENDED_USE.md) §7 — accountant owns CoA, tax/VAT/payroll, and cutover/opening-balance decisions.

**Anchor:** `<!-- ERPNEXT_OPENING_BALANCE_CUTOVER_V1 -->`

<!-- ERPNEXT_OPENING_BALANCE_CUTOVER_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1245
```

## Verdict

```text
ERPNext OPENING/CUTOVER PACK READY FOR ACCOUNTANT DECISION
```

This packet prepares the evidence the accountant needs so Chart of Accounts approval and the final cutover instructions can be applied later **without another discovery cycle**. It does **not** post accounting truth.

Anton action now: **NONE**. Merge of this PR is still a human decision. No opening Journal Entry, no Opening Invoice, no Payment Entry, no bank transaction, no tax/VAT/payroll mutation, no real-data import, and no production cutover.

`NO IMPLEMENTATION AUTHORIZED` for posting or import.

---

## Required return

```text
Cursor agent/run ID: bc-06972c53-fed7-45c1-8aa7-1739eaf79b08
Work request: cfai-wr-06972c53-fed7-45c1-8aa7-1739eaf79b08
Handoff run: 33339832226

Current-main SHA used: eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751

Standard ERPNext opening/cutover mechanisms inspected (GET-only, frappe 16.32.0 / erpnext 16.33.0):
- Journal Entry (Opening Entry) — list HTTP 200; 0 rows
- Temporary Opening - CFAI — present (account_type Temporary)
- Opening Balance Equity - CFAI / Retained Earnings - CFAI — present
- Opening Invoice Creation Tool — list HTTP 500 (wizard; not executed)
- Period Closing Voucher — list HTTP 200; 0 rows
- Data Import — HTTP 403 to integrations@corpflowai.com; not executed
- Asset / Asset Category — HTTP 200; 0 rows
- Bank Account — HTTP 200; 0 rows; Bank Accounts GL group has 0 children
- Currency Exchange — MUR-USD and USD-MUR pairs present; rates not printed
- Chart of Accounts Importer — list HTTP 500 (wizard; not executed)
- Accounting Onboarding — 0/6

Opening-data template: docs/erpnext/ERPNEXT_OPENING_BALANCE_CUTOVER_V1.md §4
Machine template: config/erpnext-opening-balance-cutover.v1.json

Migration-method comparison: SUMMARY OPENING BALANCES vs HISTORICAL DETAIL — both presented; neither chosen.

Reconciliation and rollback: §6 and §7.

Accountant decisions remaining: funding classification; cutover date; historical-detail level; opening totals; retained-earnings/equity treatment; FX treatment; fixed-asset openings; tax/payroll openings.

Confirmation: no real accounting entries or imports were created or submitted.

Verdict: ERPNext OPENING/CUTOVER PACK READY FOR ACCOUNTANT DECISION
```

---

## 1. What this packet does

1. Reuses #1054 / #1055 and current hosted ERPNext evidence. It does **not** redo the broad accounting audit.
2. Inspects standard opening/cutover capability and safe configuration metadata only.
3. Publishes a placeholder opening-data template the accountant can fill offline.
4. Defines two candidate migration methods and does **not** choose between them.
5. Maps each required input to the later ERPNext record/import/posting mechanism.
6. Defines a reconciliation checklist and a dry-run / rollback plan for the future protected cutover.
7. Names the smallest remaining accountant decisions.

It does **not** configure accounts. It does **not** invent Mauritius statutory treatment. It does **not** record private bank values, invoices, payroll data, taxpayer identifiers, or real financial amounts.

---

## 2. Reused current-state evidence (do not redo #1055)

#1055 remains the Company & Accounting Foundation packet. This inspect **refreshes** only the opening/cutover facts.

| Fact | 2026-08-25 #1054/#1055 | 2026-08-30 #1245 GET |
|------|------------------------|----------------------|
| Company | `CorpFlowAI LTD` / `CFAI` / MUR / Mauritius | Unchanged |
| Fiscal Year | Not re-audited here | `2026-2027` = 2026-06-01 to 2027-05-31 |
| Accounting Onboarding | 0/6 | Still **0/6**: Chart of Accounts; Setup Sales taxes; Create Sales Invoice; Create Payment Entry; View Balance Sheet; Review Accounts Settings |
| CoA | “root groups / skeleton only” | Standard Template now has **96** accounts (27 groups, 69 children). Still **not** accountant-approved |
| Default bank GL | Unset / unused | `default_bank_account=null`; **no** child under `Bank Accounts - CFAI` |
| Posted books | No usable CorpFlowAI books | **0** Journal Entries, **0** GL Entries, **0** submitted Sales Invoices |
| Draft commercial docs | #882 | `ACC-SINV-2026-00001` and `ACC-SINV-2026-00002` remain draft, `is_opening` = No. Not opening balances |

Default skeleton accounts (`Debtors - CFAI`, `Sales - CFAI`, `VAT - CFAI`, `Mauritius Tax - CFAI`) **exist** and are **not** treated as accountant approval. That is still #1055.

Known business context that must not be lost:

- CorpFlowAI incurred pre-revenue company costs before income began.
- Those costs were funded through a loan / current-account position.
- They must not be silently dropped or reclassified as fresh post-cutover operating activity.
- Legal classification of that funding, the cutover date, and historical-detail vs summarized openings remain **accountant decisions**.

There is **no** dedicated Shareholder Current Account or Director Current Account on the present skeleton. Candidate unapproved leaves exist (`Unsecured Loans - CFAI`, `Opening Balance Equity - CFAI`, `Retained Earnings - CFAI`). The packet does not pick one.

---

## 3. Standard ERPNext opening / cutover mechanisms inspected

Inspect identity: `integrations@corpflowai.com`. Host family: vendor-hosted Frappe. Versions: **frappe 16.32.0** / **erpnext 16.33.0** (newer than the 2026-08-20 WP7 read-back; this packet does not reopen #1010).

| Mechanism | What it is for later | This run |
|-----------|----------------------|----------|
| **Journal Entry** `voucher_type=Opening Entry`, account rows `is_opening=Yes` | Method A GL openings (cash/bank, equity, loans, tax, FX residual) | List HTTP 200; 0 rows. No Opening Entry exists |
| **Temporary Opening - CFAI** | Standard contra while opening legs are posted. Must net to **zero** when the set is complete | Present; type Temporary; currency MUR |
| **Opening Invoice Creation Tool** | Outstanding AR/AP at cutover as `is_opening` Sales/Purchase Invoices | List HTTP 500 (wizard/single-style). Not opened. Not executed |
| **Period Closing Voucher** | Close a historical P&L into Retained Earnings (Method B year-end or first ERPNext year-end) | List HTTP 200; 0 rows |
| **Data Import** | Bounded historical SI / PI / Payment Entry / Journal Entry (Method B) | HTTP 403 to the integration identity. Not executed |
| **Asset** + accumulated depreciation account | Opening gross / accum. dep. if the accountant says company-owned assets exist | Asset listed=0. `Accumulated Depreciation - CFAI` exists as a skeleton leaf |
| **Bank Account** + later Bank Reconciliation Tool | Named operating bank after #1139/#1220 | 0 Bank Account records; 0 bank GL children |
| **Currency Exchange** | Cutover translation / revaluation inputs | MUR-USD and USD-MUR names present. **Rates not printed** |
| **Chart of Accounts Importer** | Later #1055 Phase 2 structure only | List HTTP 500 (wizard). Not executed. Not an opening poster |
| **Account Closing Balance** | Period-close storage | List HTTP 200; 0 rows |
| **Accounting Period** | Optional period lock | List HTTP 200; 0 rows |

Standard later posting path (not executed):

```text
Accountant-approved CoA
  → named Bank / funding / tax accounts if missing
  → Method A Opening Entry + Opening Invoice Creation Tool
     or Method B Data Import of dated historical vouchers
  → Temporary Opening nets to zero
  → Trial Balance = accountant source totals
  → Anton-approved submit
  → bank statement recon (#1139/#1220)
```

---

## 4. Opening-data template (placeholders only)

Fill this offline. Replace tokens with accountant-approved values **outside GitHub**. Do not commit real amounts, bank numbers, invoices, payroll, or taxpayer identifiers.

| ID | Required input | Placeholder | Source owner | Later ERPNext mechanism |
|----|----------------|-------------|--------------|-------------------------|
| `cutover_date` | Cutover date | `[CUTOVER_DATE]` | Accountant | Journal Entry / Opening Invoice `posting_date`. Must fall inside an open Fiscal Year |
| `fiscal_period` | Fiscal period / year mapping | `[FISCAL_YEAR_NAME]` | Accountant | `Fiscal Year`. Current unread year is `2026-2027` (2026-06-01 to 2027-05-31). Confirm or replace; do not assume Mauritius statutory year |
| `cash_bank` | Cash / bank balances by account and currency | `[BANK_BALANCE_PLACEHOLDER]` | Accountant + redacted statement | Method A: Opening Entry to a **named** Bank/Cash Account. Method B: historical Payment / Bank Entry then recon. No bank GL child exists today |
| `receivables_payables` | Receivables / payables outstanding at cutover | `[AR_AP_OUTSTANDING_PLACEHOLDER]` | Accountant | Method A: Opening Invoice Creation Tool. Method B: imported historical invoices minus receipts/payments. Draft #882 invoices are **not** openings |
| `pre_revenue_expenses` | Pre-revenue expense categories + evidence references | `[PRE_REVENUE_EXPENSE_PLACEHOLDER]` | Accountant + Anton evidence pack | Method A: fold into opening equity/deficit or opening funding — **never** as fresh post-cutover opex. Method B: historical expense vouchers dated before `[CUTOVER_DATE]` |
| `funding_balance` | Loan / shareholder / director / current-account funding | `[FUNDING_BALANCE_PLACEHOLDER]` | Accountant | Opening Entry (or historical funding journals) to the **classified** account. Skeleton candidates are unapproved |
| `fixed_assets` | Fixed assets and accumulated depreciation | `[FIXED_ASSET_PLACEHOLDER]` | Accountant | Asset opening or Opening Entry to Fixed Asset + Accumulated Depreciation. Strategy v2: most hardware is personally owned — record only what is actually a company asset |
| `tax_payroll` | Tax / VAT / payroll liabilities | `[TAX_PAYROLL_LIABILITY_PLACEHOLDER]` | Accountant only | Omit unless approved. Do not treat `VAT - CFAI` or `Payroll Payable - CFAI` as approved truth |
| `equity_retained` | Retained earnings / equity / opening-balance treatment | `[EQUITY_OPENING_PLACEHOLDER]` | Accountant | Opening Entry to Opening Balance Equity and/or Retained Earnings and/or Capital Stock; or Period Closing after historical P&L |
| `foreign_currency` | FX balances and translation / revaluation inputs | `[FX_BALANCE_PLACEHOLDER]` | Accountant | Opening Entry in account currency + approved rate. `Debtors USD - CFAI` exists. Rates stay out of the repo |

Machine copy of the same rows: `config/erpnext-opening-balance-cutover.v1.json` → `template_inputs`.

---

## 5. Migration-method comparison — neither chosen

The accountant chooses. This packet does not.

| | **A. SUMMARY OPENING BALANCES** | **B. HISTORICAL DETAIL** |
|--|----------------------------------|--------------------------|
| What is loaded | Approved totals at `[CUTOVER_DATE]` | Dated transactions from inception (or a bounded start date) up to cutover |
| Typical ERPNext tools | Journal Entry Opening Entry; Opening Invoice Creation Tool; optional Asset opening | Data Import of Sales Invoice / Purchase Invoice / Payment Entry / Journal Entry; then Period Closing if a year must close |
| Pre-revenue costs | Survive as opening equity/deficit **plus** the classified funding balance. Not re-booked as new opex | Survive as the original expense vouchers plus the original funding journals |
| Funding / loan / current account | One (or few) opening liability/equity line(s) on the classified account | Same account, built from the historical funding trail |
| When it is enough | Statutory/management reporting can start at cutover; working papers hold the pre-cutover pack | Law, tax, or management requires the transaction trail inside ERPNext |
| Main risk if misused | History is not in the ledger; evidence pack must stay complete | Wrong dates, duplicates, or FX/tax guesses create a messy book that is hard to unwind |
| Prestige / selling | Not blocked. Draft quotations stay draft until #1055 | Same. Historical import must not submit a real client invoice |

A hybrid is allowed only if the accountant writes it: summarized openings for most heads **and** bounded history for a named subset (for example funding + pre-revenue expenses). That is still an accountant choice, not a factory default.

---

## 6. Reconciliation checklist (future openings must balance)

Use this when the accountant has filled the placeholders **offline**. Every total is tied back to an accountant-approved source. Synthetic pairing in the machine contract proves the **structure** now, without amounts.

| Check | Must be true before submit | Source tie-back |
|-------|----------------------------|-----------------|
| R1 | Debits = credits on the complete opening set | Accountant trial-balance pack |
| R2 | `Temporary Opening - CFAI` nets to zero after the last opening voucher | ERPNext Trial Balance on that account |
| R3 | Bank/cash opening by currency = redacted statement closing balance at `[CUTOVER_DATE]` | `[EVIDENCE_REF_BANK_STATEMENT_REDACTED]` |
| R4 | AR/AP openings = ageing total at cutover | `[EVIDENCE_REF_AR_AP_AGEING]` |
| R5 | Pre-revenue expense total + classified funding balance remain paired. Neither side is dropped | `[EVIDENCE_REF_PRE_REVENUE_PACK]` + `[EVIDENCE_REF_FUNDING_MEMO]` |
| R6 | Equity / retained earnings / capital = accountant equity memo | `[EVIDENCE_REF_EQUITY_MEMO]` |
| R7 | FX openings use the named rate source; MUR residual is explained | `[EVIDENCE_REF_FX_RATES]` |
| R8 | Tax/payroll openings are present **only** if the accountant approved them | `[EVIDENCE_REF_TAX_PAYROLL]` or explicit “none” |
| R9 | Fixed-asset gross − accumulated depreciation = net book value on the asset register | `[EVIDENCE_REF_ASSET_REGISTER]` or explicit “none” |
| R10 | No post-cutover operating expense was used to hide pre-cutover spend | Review of expense account movements after `[CUTOVER_DATE]` |
| R11 | #882 draft invoices were not submitted as openings | `is_opening` and `docstatus` read-back |
| R12 | Trial Balance after submit = accountant source totals (placeholder units today: `SYNTHETIC_UNIT_*`) | Side-by-side working paper |

Machine pairing (placeholder units only): `synthetic_reconciliation_pairs` in the JSON contract. `SYNTHETIC_UNIT_PRE_REVENUE` exists so the funding/cost pair cannot be omitted from the structure.

---

## 7. Dry-run / rollback / correction plan (future protected cutover)

This section is the later packet’s gate. **Do not run it now.**

### 7.1 Evidence required before Anton approves real posting

1. Accountant-signed Chart of Accounts (#1055 Phase 2).
2. Accountant-signed `[CUTOVER_DATE]` and Fiscal Year mapping.
3. Accountant choice of Method A, Method B, or a written hybrid.
4. Accountant-signed opening totals (offline; not committed here).
5. Written funding-account classification.
6. Redacted source pack attached to the later ticket (statements, ageing, expense/funding working papers).
7. Draft Trial Balance matches those totals.
8. Temporary Opening nets to zero **in draft**.
9. Named vendor backup / restore point (WP7 still records restore as a protected action).

### 7.2 Dry-run

- Create drafts only. Do not submit.
- Do not run Data Import against real rows.
- Compare the draft Trial Balance to the offline source totals.
- If Method A, post the opening set as drafts in a balanced batch.
- If Method B, import to **Draft** on a disposable copy or stop at validation — live historical submit is a later Anton gate.

### 7.3 Rollback / correction

- If a voucher was submitted in error: **Cancel** (ERPNext reverse GL). Do not delete the audit trail.
- If the books are corrupted: restore the named backup, then open a correction packet.
- Do not “fix” a wrong opening by booking it again as ordinary opex after cutover.
- Re-open #1245 / #1055 only for the exact broken head; do not restart the whole programme.

---

## 8. Exact accountant decisions still required

Smallest set. Do not guess any of these.

| Decision | Why it is still open |
|----------|----------------------|
| **Funding-account classification** | Pre-revenue spend was funded by a loan/current-account position. Skeleton leaves exist; none is approved. Wrong class loses the liability or invents equity |
| **Cutover date** | Fiscal Year `2026-2027` exists; it is not the cutover date |
| **Historical-detail level** | Method A vs Method B vs written hybrid |
| **Opening-balance totals** | Must come from accountant-approved sources. Not from this repo |
| **Retained-earnings / equity treatment** | Opening Balance Equity vs Retained Earnings vs Capital Stock vs a new approved account |
| **FX treatment** | Rate source, which balances stay in USD, and whether a cutover revaluation is required |
| **Fixed-asset opening values** | Whether any company-owned asset (vs personal hardware on loan) must open, and at what gross / accum. dep. |
| **Tax / payroll opening liabilities** | Omit until approved. `VAT - CFAI` / `Payroll Payable - CFAI` are skeleton only |

#1055 still owns CoA structure, VAT posture, and default receivable/payable/income/expense accounts. This packet adds the cutover/opening application shape; it does not close #1055.

---

## 9. Confirmation — no posting

```text
posting_attempted: no
import_attempted: no
coa_mutated: no
journal_entry_created: no
opening_invoice_created: no
payment_entry_created: no
bank_transaction_created: no
real_financial_amounts_recorded: no
```

Live GET inspect: `artifacts/erpnext/opening-cutover-1245/inspect-log.txt`.

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — docs/inspect only
- Commit deployed: n/a — docs/inspect only
- Live URLs tested: n/a — no customer-facing route; hosted ERPNext GET inspect only
- Expected vs actual result: opening/cutover pack written; 0 Journal Entries; 0 GL Entries; Accounting Onboarding 0/6
- Client-facing flow usable: n/a
- Final verdict: PARTIAL — pack ready for accountant decision; live posting not in scope
```
