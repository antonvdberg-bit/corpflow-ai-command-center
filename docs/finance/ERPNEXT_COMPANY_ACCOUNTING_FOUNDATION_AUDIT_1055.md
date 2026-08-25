# ERPNext Company & Accounting Foundation audit — accountant handoff

**Status:** Read-only audit + accountant decision packet.  
**Source issue:** [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055)  
**Parent completion controller:** [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054)  
**Programme:** [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)  
**Strategy:** [`docs/governance/erpnext/VISION_AND_INTENDED_USE.md`](../governance/erpnext/VISION_AND_INTENDED_USE.md) — `APPROVED — VERSION 2`  
**Environment:** `corpflow_test` (vendor-hosted ERPNext). Not `client_production`.  
**Owner:** Cursor (audit/evidence); Mauritius accountant (CoA / tax / opening balances); Anton (protected approval after the accountant responds).  
**Date (UTC):** 2026-08-25  
**Anchor:** `<!-- ERPNEXT_COMPANY_ACCOUNTING_FOUNDATION_AUDIT_1055 -->`

<!-- ERPNEXT_COMPANY_ACCOUNTING_FOUNDATION_AUDIT_1055 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1055
```

**Verdict:** `ACCOUNTING FOUNDATION READY FOR ACCOUNTANT REVIEW`

This packet is decision-ready for the engaged Mauritius accountant. It does **not** authorize Chart of Accounts mutation, tax configuration, opening-balance posting, bank integration, schema/custom DocTypes, env/secrets change, payment, or external send.

**NO IMPLEMENTATION AUTHORIZED** for Phase 2 until the accountant recommendation is received **and** Anton explicitly approves the exact accounting configuration.

Machine contract: `config/erpnext-accounting-foundation.v1.json`  
Safe snapshot: `artifacts/erpnext/accounting-foundation-1055/coa-skeleton.json`  
Probe: `node scripts/erpnext/accounting-foundation-audit.mjs` (GET-only)

---

## 0. How to read this pack

| Audience | What to do |
|----------|------------|
| Accountant | Read §1–§4 and answer the checklist in §5. Do not treat the current standard template as approved Mauritian books. |
| Anton | Send this pack. After written answers, decide whether to authorize Phase 2 configuration. No action required to start that review. |
| Cursor | Stop at Phase 2. Do not invent a CoA. Do not post opening balances. |

Older proposed-structure questions remain in [`ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md`](./ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md). That pack assumed **no hosted books site**. This #1055 packet is the **current-state** handoff. Where they differ, **this file wins for current ERPNext facts**.

---

## 1. Live probe identity (2026-08-25)

| Field | Value |
|-------|--------|
| Cursor agent | `bc-edd6a244-c620-4611-9345-60861efd5dd8` |
| Factory handoff | `32793786178` |
| Authenticated identity | `integrations@corpflowai.com` |
| `MASTER_ADMIN_KEY` | **absent** |
| Mutation | none (GET-only) |
| Host / URL | **not recorded** |
| Versions | **frappe 16.31.0 / erpnext 16.32.3** |
| Company | `CorpFlowAI LTD` / `CFAI` / Mauritius / MUR |

Version note: #1010 previously recorded `frappe 16.25.0 / erpnext 16.26.2`. This wake read newer patched versions. That does **not** close WP7 backup/restore.

---

## 2. Operator visual vs live API (important)

Issue #1055 recorded operator evidence that Chart of Accounts showed only root groups and Accounting Onboarding was `0/6`.

Live API on this wake:

| Claim | Operator visual (issue) | Live API 2026-08-25 | What is true |
|-------|-------------------------|---------------------|--------------|
| CoA | Only root groups / skeleton | **96 accounts**: 5 roots, 27 groups, **69 child/leaf accounts** | A **standard ERPNext template CoA** is already present. It is **not** an accountant-approved Mauritius chart. |
| Accounting Onboarding | `0/6` | Module `Accounting Onboarding` `is_complete=0`; all six mapped steps `is_complete=0` | The **wizard is still 0/6**. That does not mean no accounts exist. |
| Usable CorpFlowAI books | Not configured | Defaults exist (`Debtors - CFAI`, `Sales - CFAI`, `Cash - CFAI`) | Defaults are **template defaults**, not accountant sign-off. |

Do not collapse the tree in the desk and conclude the CoA is empty. The accountant is reviewing a **standard template that is already installed**, not a blank company.

---

## 3. Company foundation state

| Item | Current value | Mark |
|------|---------------|------|
| Legal name | `CorpFlowAI LTD` | Present (hosted test) |
| Abbreviation | `CFAI` | Present |
| Country | Mauritius | Present |
| Default currency | MUR | Present |
| Tax ID | `28466939` | Present; do not change without accountant + Anton |
| Company number | `Company No : C25228280` | Present; matches public BRN |
| Commercial email | `finance@corpflowai.com` | Present |
| Public website | `https://corpflowai.com` | Present |
| Date of establishment | `2025-11-10` | Present |
| Holiday list | `Mauritius` | Present |
| Default cost centre | `Main - CFAI` (child of group `CorpFlowAI LTD - CFAI`) | Present |
| Default receivable | `Debtors - CFAI` | Template default — **REQUIRES ACCOUNTANT** |
| Default payable | `Creditors - CFAI` | Template default — **REQUIRES ACCOUNTANT** |
| Default income | `Sales - CFAI` | Template default — **REQUIRES ACCOUNTANT** |
| Default expense | `Cost of Goods Sold - CFAI` | Poor fit for a services company — **REQUIRES ACCOUNTANT** |
| Default cash | `Cash - CFAI` | Present; no operating bank leaf |
| Default bank | unset | **REQUIRES ACCOUNTANT** |
| Round off / write off | `Round Off - CFAI` / `Write Off - CFAI` | Present |
| FX gain/loss | `Exchange Gain/Loss - CFAI` (Expense) | Present — **REQUIRES ACCOUNTANT** (one account vs split) |
| Depreciation accounts | `Accumulated Depreciation - CFAI` / `Depreciation - CFAI` | Present |
| Letter Head | `Company Letterhead - Grey` (default); second `Company Letterhead` | Present |
| Company address | Office, Trou Aux Biches, Mauritius, pincode `22301` (title `Home Office`) | Present |
| Logo write | Previously HTTP 403 (#882) | Unchanged this packet |
| Fiscal year | `2026-2027` = 2026-06-01 → 2027-05-31 | Present — **REQUIRES ACCOUNTANT** to confirm |
| Bank Account doctype | **0 rows** | No bank credentials stored |
| Tax Category | **0 rows** | Empty |
| Sales tax template | `Mauritius Tax - CFAI` exists; **not default** | **REQUIRES ACCOUNTANT** |
| Purchase tax template | `Mauritius Tax - CFAI` exists; **not default** | **REQUIRES ACCOUNTANT** |
| VAT account | `VAT - CFAI` (Tax / Liability); currency empty | **REQUIRES ACCOUNTANT** |
| Opening Journal Entry | **0 rows** | **REQUIRES ACCOUNTANT** then **REQUIRES ANTON** to post |
| Document Naming Settings | HTTP **500** to integration user | Unread |
| Accounts Settings | HTTP **500** to integration user | **REQUIRES ANTON** (desk) |

USD receivable `Debtors USD - CFAI` exists from prior commercial proofs (#882). It is not the Company default receivable.

---

## 4. Chart of Accounts summary (do not invent replacements)

| Count | Value |
|------:|-------|
| Total Account rows | 96 |
| Root groups | 5 |
| All groups | 27 |
| Child / leaf accounts | 69 |
| Skeleton only? | **No** |

Root groups:

- `Application of Funds (Assets) - CFAI`
- `Source of Funds (Liabilities) - CFAI`
- `Equity - CFAI`
- `Income - CFAI`
- `Expenses - CFAI`

This is a **standard ERPNext chart** with stock, manufacturing, and generic trading accounts (COGS, Stock In Hand, Plants and Machineries, etc.) that CorpFlowAI may not need. It is **not** a designed Mauritian professional-services chart.

Safe full name/type listing: `artifacts/erpnext/accounting-foundation-1055/coa-skeleton.json`. No bank account numbers, IBANs, or credentials are stored.

Observed facts the accountant should treat as **questions**, not truth:

- Income is generic (`Sales - CFAI`, `Service - CFAI`) — no Lead Rescue / Website Rescue / Prestige split.
- Expense default is `Cost of Goods Sold - CFAI`.
- Bank folder exists as a **group** only. Leaf cash is `Cash - CFAI`. No SBM / USD receipt bank ledger.
- Equity includes `Capital Stock`, `Retained Earnings`, `Opening Balance Equity`, `Dividends Paid`, `Revaluation Surplus`.
- `VAT - CFAI` exists; currency is blank; tax templates are not Company default.

---

## 5. Accounting Onboarding — exact 0/6

ERPNext v16 on this site (`Accounting Onboarding`, module Accounts) has these six steps. All six have `is_complete=0`. The module itself is `is_complete=0`.

| # | ERPNext step | Wizard `is_complete` | Audit mark | Why |
|---|----------------|----------------------|------------|-----|
| 1 | Chart of Accounts | 0 | **REQUIRES ACCOUNTANT** | Standard template with 69 leaves exists. Not approved as CorpFlowAI books. |
| 2 | Setup Sales taxes | 0 | **REQUIRES ACCOUNTANT** | `Mauritius Tax - CFAI` exists and is not default. VAT posture unsigned. |
| 3 | Create Sales Invoice | 0 | **NOT DONE** | Wizard incomplete. Draft synthetic invoices from #882 are not a submitted tax invoice. |
| 4 | Create Payment Entry | 0 | **REQUIRES ANTON** | Live payment posting is a protected consequence. |
| 5 | View Balance Sheet | 0 | **REQUIRES ACCOUNTANT** | No opening balances. Cutover date unsigned. |
| 6 | Review Accounts Settings | 0 | **REQUIRES ANTON** | Integration user HTTP 500. Desk review only. |

Company / Customer / Item already exist from earlier packets. They are **not** the six Accounting Onboarding steps on this version.

---

## 6. Accountant decision checklist

Answer in writing (PDF / signed memo / dated email). Do **not** ask Cursor to guess.

| ID | Decision | Proposed categories / questions only | Standard ERPNext object after approval |
|----|----------|--------------------------------------|----------------------------------------|
| A1 | CoA structure | Keep the standard template, slim it, or replace with a Mauritian professional-services chart? | `Account` |
| A2 | Account numbering | Required / preferred / not needed? | `Account.account_number` |
| A3 | Receivables / payables | Keep `Debtors - CFAI` + `Debtors USD - CFAI`, or one trade debtor with currency per customer? Default payable `Creditors - CFAI`? | `Company.default_receivable_account` / `default_payable_account` |
| A4 | Bank / cash | Name/split for MUR operating, USD receipts, petty cash? **No real account numbers in GitHub.** | `Account` type Bank/Cash. `Bank Account` name/type only later |
| A5 | Equity / director current account | Treatment of capital, retained earnings, opening-balance equity, any director/shareholder current account | `Account` (Equity) |
| A6 | Income / service revenue | One `Service` account vs Lead Rescue / Website Rescue / Prestige / other operating income | `Account` (Income) + Item Default |
| A7 | Operating expenses | Which expense accounts are needed now (software/hosting, banking fees, professional fees, marketing)? Disable unused stock/manufacturing accounts? | `Account` (Expense) + `Company.default_expense_account` |
| A8 | VAT / tax | Threshold, domestic vs export, output/input accounts, whether `Mauritius Tax - CFAI` may be used | `Account` (Tax) + Sales/Purchase Taxes and Charges Template |
| A9 | Fixed assets / depreciation | Needed now or deferred? Keep template asset accounts unused? | `Account` (Fixed Asset / Depreciation) |
| A10 | Fiscal year + cutover | Confirm `2026-2027` (1 Jun 2026 – 31 May 2027) or set another year. Cutover date. Reconstruction vs opening balances. | `Fiscal Year` + Opening Invoice / `Journal Entry` |
| A11 | FX | Keep single `Exchange Gain/Loss - CFAI` or split gain vs loss? Book-rate source? | `Company.exchange_gain_loss_account` |
| A12 | Revenue recognition | For USD 150 Lead Rescue and MUR project work: invoice-at-payment vs delivery. | Sales Invoice / Deferred Revenue (only if required) |

Older detailed VAT / FX / document-title questions in the v1 pack remain valid **questions**. They are not current-state claims.

---

## 7. Exact ERPNext mapping after accountant + Anton approval

Phase 2 (later, protected) would configure **standard** objects only:

| Approved output | ERPNext doctype | Fields / action |
|-----------------|-----------------|-----------------|
| Legal identity / currency | Company | `company_name`, `abbr`, `country`, `default_currency`, `tax_id`, `registration_details` — change only if accountant says the current values are wrong |
| CoA + numbering | Account | Create / rename / disable **standard** accounts. No custom DocType |
| AR / AP / income / expense / cash / bank defaults | Company | `default_*_account` |
| Cost centre | Cost Center | Reuse `Main - CFAI` unless accountant requires more |
| Fiscal year | Fiscal Year | Confirm or add year; do not invent |
| Tax templates | Sales / Purchase Taxes and Charges Template | Enable default only after VAT answer |
| Bank/cash ledgers | Account + later Bank Account | Names/types only in repo; credentials never |
| Opening balances | Journal Entry / Opening Invoice Creation Tool | Separate Anton cutover approval |
| Letterhead | Letter Head | Already present; visual accept is Anton |
| Naming series | Document Naming Settings | Unreadable to integration user; desk after approval |

---

## 8. Protected actions remaining

| Action | Status |
|--------|--------|
| Accountant written CoA / VAT / cutover recommendation | **Open** — this pack |
| Anton approval of that exact configuration | **Blocked** until accountant responds |
| Configure/rename/disable accounts | **Blocked** (Phase 2) |
| Set Company accounting defaults | **Blocked** (Phase 2) |
| Enable tax templates / charge VAT | **Blocked** |
| Post opening balances | **Blocked** — separate cutover approval |
| Bank credential / payment integration | **Blocked** |
| Submit real Sales Invoice / Payment Entry | **Blocked** |
| Custom DocType / schema / CorpFlowAI Postgres | **Not requested; forbidden** |
| Env / secrets / live email send | **Not requested; forbidden** |

Anton action now: **NONE**. Send the pack to the accountant.

---

## 9. What this packet does not do

- Invent a Mauritius Chart of Accounts.
- Mark Accounting Onboarding complete.
- Treat the standard template as usable statutory books.
- Install accounting apps or paid tools.
- Customize ERPNext schema.
- Post accounting entries.
- Configure real bank integrations.
- Send email from ERPNext.
- Touch CorpFlowAI production Postgres.

---

## 10. Delivery Reality

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — docs/config/audit evidence; no CorpFlowAI app runtime change
- Commit deployed: n/a
- Live URLs tested: vendor-hosted ERPNext GET-only (hostname not recorded); corpflow_test app URLs not in scope
- Expected vs actual result: expected a decision-ready current-state pack; live API showed a standard 96-account CoA and Accounting Onboarding 0/6
- Client-facing flow usable: n/a
- Final verdict: PARTIAL until Anton merges; accountant review is the next business step
```
