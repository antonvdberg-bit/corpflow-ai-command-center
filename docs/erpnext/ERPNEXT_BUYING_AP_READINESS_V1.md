# ERPNext Buying / AP readiness v1 — onboarding packet D

**Status:** Standard-ERPNext-first Buying/AP operating path defined and landed on current `main`. Accountant-approved account defaults remain on [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055).  
**Issue:** [#1098](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1098)  
**Current-main landing:** [#1213](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1213) — GET/read-only acceptance of the already-proven #1098 / stale [PR #1107](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1107) packet onto current `main`. Close #1107 without merge.  
**Parents:** [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953), [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918)  
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`, MUR) + synthetic data only. `corpflow_test`. Not `client_production`.  
**Owner:** Cursor (this packet); Accountant (#1055); Anton (merge, Role Permission grant, real supplier approval, payment).  
**Machine contract:** `config/erpnext-buying-ap-readiness.v1.json`  
**Mapper:** `lib/erpnext/buying-ap-readiness.js`  
**Apply / GET:** `node scripts/erpnext/apply-buying-ap-readiness.mjs --read-only`  
**Operator runbook:** `docs/runbooks/ERPNEXT_BUYING_AP_OPERATOR_RUNBOOK_V1.md`  
**Anchor:** `<!-- ERPNEXT_BUYING_AP_READINESS_V1 -->`

<!-- ERPNEXT_BUYING_AP_READINESS_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1213
Prior proof: #1098 / PR #1107
```

This packet does **not** authorize Purchase Invoice submit, Payment Entry, bank credentials, real supplier approval, custom DocTypes, env/secrets change, external send, or merge. #1213 does **not** POST to ERPNext.

---

## Required return

```text
Current-main SHA: b731411734edb01b7dbb8d7e20247c5a7805983a

Cursor agent/run ID: bc-1eda59e6-a178-4381-b320-cde0f99694db
Cursor agent URL: https://cursor.com/agents/bc-1eda59e6-a178-4381-b320-cde0f99694db
Cursor run: run-a3e0247a-cfca-4ba8-aa5d-9a326bdf3cbc
Work request: cfai-wr-1eda59e6-a178-4381-b320-cde0f99694db
Handoff run: 33114821199

Source proof (#1098):
Cursor agent/run ID: bc-65c1ee85-ed4d-4a24-8c44-a7761c2acb1f
Cursor run: run-acc3988a-3583-424a-8d0b-15db3432914e
Work request: cfai-wr-65c1ee85-ed4d-4a24-8c44-a7761c2acb1f
Handoff run: 32933611590

Standard ERPNext objects inspected (GET 2026-08-27 as integrations@corpflowai.com):
Supplier, Supplier Group, Buying Settings, Accounts Settings, Purchase Invoice, Purchase Order, Purchase Receipt, Payment Entry, Payment Term, Payment Terms Template, Cost Center, Account, Company, Item, File, Purchase Taxes and Charges Template, Fiscal Year

Synthetic identifiers already present:
- Item CF-AP-SYNTHETIC-OPEX (GET HTTP 200; is_purchase_item=1; is_stock_item=0; is_sales_item=0; item_group=Services)
- Planned Supplier CF1098 Synthetic Operating Supplier Ltd — NOT CREATED (LIST HTTP 200 count=0)

Duplicate/idempotency:
- search-before-create on supplier_name and contact email (ERPNext does not unique-constrain supplier name)
- search Purchase Invoice by supplier + bill_no before capture (reuse_or_stop)
- Accounts Settings check_supplier_invoice_uniqueness=0 (not enabled; operator convention still mandatory)
- Synthetic Supplier search count=0; synthetic Item reuse count=1

Supplier create vs accountant defaults (distinct):
- Supplier CREATE remains permission-blocked (#1098 HTTP 403; #1213 GET-only did not re-POST; synthetic Supplier still absent)
- That is a Role Permissions Manager grant, not an accountant CoA/tax decision
- Accountant-controlled AP defaults remain #1055 (payable, opex expense, VAT, cost centre)

Purchase Order verdict: DEFER (live po_required=No; pr_required=No)
Payment: invoice existence never authorizes payment; Payment Entry count=0; show_pay_button is UI only

Source proof verdict: ERPNext BUYING / AP READINESS READY FOR ACCOUNTANT CONFIGURATION
Current-main packet verdict: ERPNext BUYING/AP CURRENT-MAIN READY FOR ACCOUNTANT CONFIGURATION
```

---

## 1. Verdict

**`ERPNext BUYING/AP CURRENT-MAIN READY FOR ACCOUNTANT CONFIGURATION`**

Source proof (#1098): **`ERPNext BUYING / AP READINESS READY FOR ACCOUNTANT CONFIGURATION`**

#1213 does **not** redesign Buying/AP. It lands the already-proven #1098 helper, runbook, and 2026-08-26 synthetic evidence onto current `main`, then re-reads hosted ERPNext GET-only.

Standard ERPNext already has the Buying/AP objects CorpFlowAI needs:

`Supplier -> purchase expense/category -> Draft Purchase Invoice -> Anton review -> payment remains separately protected`

GET 2026-08-27 on current `main` (`b731411734edb01b7dbb8d7e20247c5a7805983a`):

- Supplier, Supplier Group, Purchase Invoice, Cost Center, File attachments, and Buying Settings remain readable.
- Buying Settings **`po_required = No`** and **`pr_required = No`**. Purchase Order stays **DEFER**.
- Company still points payable at `Creditors - CFAI` and expense at `Cost of Goods Sold - CFAI`. Those are standard-skeleton defaults, **not** accountant-approved CorpFlowAI books (#1055).
- Synthetic non-stock purchase Item `CF-AP-SYNTHETIC-OPEX` still exists (search-before-create reuse).
- Synthetic Supplier is still absent. Last write proof of CREATE is #1098 HTTP 403. That is a **permission** gap, not accountant policy.
- Purchase Invoice count 0. Payment Entry count 0. No invoice was submitted. No payment occurred.

Exact blocker for **accountant configuration**: **NONE**.  
Remaining non-accountant desk action: Anton grants Supplier Create/Write on `Purchase User`. That grant is **not** an accounting-policy decision and is **not** payment authority.

Anton action now: **NONE** unless merging this PR, or later applying the Supplier Role Permission grant. Do not treat merge as payment or CoA approval. Close stale PR #1107 without merge.

---

## 2. Live inspection

### 2.1 Source proof (2026-08-26, #1098)

Access path: Cursor Cloud secrets → Frappe token auth (no SSH / Infisical). Identity: `integrations@corpflowai.com`. `MASTER_ADMIN_KEY`: **absent**. Host URL not recorded.

Incidental version read-back (does **not** reopen #1010): **frappe 16.31.0 / erpnext 16.32.3**.

Supplier CREATE was attempted once and returned **HTTP 403** `No permission for Supplier`. Synthetic Item `CF-AP-SYNTHETIC-OPEX` was reused.

### 2.2 Current-main GET (2026-08-27, #1213)

Same identity. **No POST/PUT/DELETE.** Artifact: `artifacts/erpnext/buying-ap-readiness-1098/get-only-log-1213.json`.

| Object | Readable | Writable this packet | Notes |
| --- | --- | --- | --- |
| Company | yes | not changed | `CorpFlowAI LTD` / CFAI / Mauritius / MUR; payable `Creditors - CFAI`; expense `Cost of Goods Sold - CFAI`; cost centre `Main - CFAI` |
| Supplier | LIST yes count=0 | **not posted** | Synthetic name still absent. Last CREATE 403 is #1098 permission evidence |
| Supplier Group | yes | not changed | Default for operating suppliers: `Services` (8 groups including Services, Local, Hardware) |
| Purchase Order | yes | not used | Count 0. **DEFER**. Live `po_required=No` |
| Purchase Invoice | yes | not created | Count 0. `bill_no` is a listable field. Draft mapping only |
| Purchase Receipt | yes | not used | Count 0. `pr_required=No` |
| Payment Term / Template | yes (empty) | not changed | Rows empty |
| Cost Center | yes | not changed | Group `CorpFlowAI LTD - CFAI`; leaf `Main - CFAI` |
| Buying Settings | yes (Single GET) | not changed | `po_required=No`; `pr_required=No`; `show_pay_button=1` |
| Accounts Settings | yes (Single GET) | not changed | `check_supplier_invoice_uniqueness=0` (not enabled) |
| Item | yes | not created | `CF-AP-SYNTHETIC-OPEX` GET 200 reuse |
| Fiscal Year | yes | not changed | `2026-2027` |
| Purchase Taxes and Charges Template | yes | not applied | `Mauritius Tax - CFAI` exists; not accountant-approved |
| Payment Entry | LIST yes count=0 | **forbidden** | Invoice existence never authorizes this |

Do **not** confuse this with the CMP **Supplier Onboarding Wizard** (`public/assets/cmp/onboarding-wizard.js`). That UI is tenant-access scaffolding. It is **not** the ERPNext Supplier master.

---

## 3. Minimum Supplier master rules

| Rule | Requirement |
| --- | --- |
| Legal / display name | `supplier_name` (required). Document name follows the name. Search-before-create because a second create is not rejected. |
| Type | `supplier_type = Company` for legal entities. |
| Group | `Services` for software, hosting, licences, professional fees. Use `Local` only when the supplier is clearly a Mauritius local goods/services vendor. Do not invent new groups in this packet. |
| Contact | Linked Contact with working email. Email is **not** unique in ERPNext. |
| Address | Linked Billing Address (line1, city, country). |
| Tax identifier | Leave blank until the accountant says it is appropriate (#1055). |
| Currency / price list | Default MUR + `Standard Buying` unless a later accountant multi-currency AP rule says otherwise. |
| Banking | **Never** store IBAN / SWIFT / account numbers in GitHub, chat, tickets, or `supplier_details`. Bank payment details stay in an approved secure channel. |
| Duplicate prevention | Search by exact `supplier_name`, then by Contact email. Reuse on match. AI **cannot** approve suppliers. Anton approves **real** suppliers. Search Purchase Invoice by supplier + `bill_no` before capture. Accounts Settings uniqueness is **off** (`0`); the operator convention is the control until the accountant enables it. |
| Synthetic vs real | Names beginning `CF1098 Synthetic` are test-only. They must not be used for live bills or payment. |

Planned synthetic Supplier (create blocked this run): **`CF1098 Synthetic Operating Supplier Ltd`**.

---

## 4. Purchase Order verdict: **DEFER**

Use Purchase Order **now**? **No.**

Why:

1. Live Buying Settings: `po_required = No`, `pr_required = No`.
2. Initial CorpFlowAI spend is invoice-first operating cost (hosting, software, licences, accountant, similar). The supplier invoice arrives without a CorpFlowAI-issued PO.
3. CorpFlowAI does not hold stock. Purchase Receipt / three-way match would add process without a current control benefit.
4. Strategy v2 still requires Anton supplier approval and zero default AI spend. Those controls do **not** need a PO.

Revisit PO only if inventory/stock purchasing starts, or the accountant requires three-way match. Until then, **do not** build a second procurement system and **do not** require PO before Purchase Invoice.

---

## 5. Purchase Invoice / AP lifecycle map

| Stage | ERPNext object | What it means | Allowed now? |
| --- | --- | --- | --- |
| 1. Supplier master | Supplier + Contact + Address | Who we buy from | Synthetic create after Role grant; **real** create needs Anton |
| 2. Expense category | Non-stock Item `is_purchase_item=1` + expense account | What was bought | Synthetic Item **proven** (`CF-AP-SYNTHETIC-OPEX`). Expense account waits on #1055 |
| 3. Capture | Purchase Invoice **Draft** (`docstatus=0`) | `bill_no`, `bill_date`, qty, rate, File attachment | Mapping only until Supplier exists **and** accounts are accountant-approved |
| 4. Review | Draft PI | Anton checks supplier, amount, attachment, coding | Yes, as a human review. Not payment. |
| 5. Accounting submit | Purchase Invoice **Submitted** (`docstatus=1`) | Posts Dr expense / Cr `credit_to` payable | **No** until #1055 |
| 6. Payment | Payment Entry (Pay) | Bank/cash out | **No**. Separate protected action. Invoice existence never authorizes this. |

Header fields that exist before accountant configuration (do not treat as approved defaults):

- Required: `naming_series` (`ACC-PINV-.YYYY.-`), `supplier`, `posting_date`, `items`, `credit_to`
- Capture: `bill_no`, `bill_date`, `due_date`, `supplier_address`, `contact_person`
- Accounting-bearing (do not submit on skeleton defaults): `credit_to` currently would fetch `Creditors - CFAI`; item `expense_account` currently would tend to `Cost of Goods Sold - CFAI`; `cost_center` currently `Main - CFAI`
- Tax: optional `taxes` table. Template `Mauritius Tax - CFAI` exists at VAT 15% to `VAT - CFAI` and is **not default**. Do not apply until VAT posture is written.
- Payment UI: `is_paid`, `mode_of_payment`, `cash_bank_account`, Buying Settings `show_pay_button=1` — **UI is not authority**

Draft does **not** post GL. Submit **does**. This packet did not create a Purchase Invoice, even as Draft, because Supplier create was 403 and expense/payable/tax defaults are not accountant-approved.

---

## 6. Approval authority and fail-closed payment rule

```text
INVOICE_EXISTENCE_NEVER_AUTHORIZES_PAYMENT
```

| Action | Who | Rule |
| --- | --- | --- |
| Approve a **real** Supplier | Anton | AI cannot approve suppliers (Strategy v2). |
| Capture a supplier invoice as Draft PI | Operator / Cursor after Supplier exists | Capture only. Not payment. Not books. |
| Submit PI (post GL) | Anton after accountant-approved defaults | Protected accounting mutation. |
| Pay the supplier | Anton as a **separate** protected payment action | Draft or submitted PI is never sufficient. `show_pay_button` is not authority. Zero default AI spend. |

CMP tickets, GitHub issues, and email threads are not payment authority.

---

## 7. Exact accountant inputs after #1055

These are questions, not invented accounts.

| ID | Accountant must confirm | Maps to |
| --- | --- | --- |
| payable_account | Keep or replace `Creditors - CFAI` as default payable | `Company.default_payable_account` / `Purchase Invoice.credit_to` |
| expense_account_structure | Do **not** use `Cost of Goods Sold - CFAI` for software/hosting/licences/professional fees. Which Indirect Expense leaves to use, and whether new accounts are required | `Company.default_expense_account` / PI Item `expense_account` |
| tax_vat_treatment | VAT registration, input-VAT recoverability, and whether template `Mauritius Tax - CFAI` (15% → `VAT - CFAI`) may be used | Purchase Taxes and Charges Template / `Supplier.tax_category` |
| cost_centre_defaults | Confirm leaf `Main - CFAI` vs extra cost centres | Cost Center / PI Item `cost_center` |
| supplier_tax_handling | When to store `tax_id` / tax category / withholding | Supplier tax fields |
| fiscal_year | Confirm `2026-2027` (2026-06-01 to 2027-05-31) | Fiscal Year |
| payment_terms | Whether templates are required before AP go-live | Payment Terms Template |
| bill_no_uniqueness | Whether to enable `check_supplier_invoice_uniqueness`. Currently **0** (off); operator search on supplier + `bill_no` is mandatory until then | Accounts Settings |
| multi_currency_ap | How USD supplier invoices post on MUR books | Supplier currency / Party Account |

Existing Indirect Expense leaves already on the hosted-test skeleton (names only): Administrative Expenses, Bank Charges, Legal Expenses, Marketing Expenses, Miscellaneous Expenses, Office Maintenance Expenses, Office Rent, Telephone Expenses, Travel Expenses, Utility Expenses, and others. The accountant chooses. This packet does **not**.

---

## 8. Smallest gap proposal (no customization)

**Gap:** `integrations@corpflowai.com` can list Supplier and holds Purchase User / Purchase Manager roles (#1019), but Supplier **create** returned HTTP 403 on #1098. #1213 GET-only confirms the synthetic Supplier is still absent, so the Role grant was not applied.

**Smallest proposal:** Anton, in Role Permissions Manager, grant **Read / Create / Write** on DocType **Supplier** to role **Purchase User**. Do not assign System Manager. Do not add a custom DocType, custom field, or second procurement app.

That grant is **not** accountant configuration. After the grant, a later packet may run `node scripts/erpnext/apply-buying-ap-readiness.mjs --write` to create/reuse `CF1098 Synthetic Operating Supplier Ltd` with Contact + Address. Still do **not** submit a Purchase Invoice.

---

## 9. Protected actions remaining

- #1055 accountant-approved Company & Accounting Foundation (CoA, payable, expense, tax/VAT, cost centre, fiscal year)
- Anton Role Permissions Manager grant for Supplier create (desk only)
- Anton approval of any **real** supplier
- Purchase Invoice submit / GL posting
- Payment Entry / bank pay / bank credentials / bank integration
- Opening balances / cutover
- Schema / custom DocTypes
- Env / secrets
- External send / paid tool

---

## 10. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — docs + hosted-ERPNext GET/read-only; no CorpFlowAI app runtime change
- Commit deployed: n/a
- Live URLs tested: n/a — ERPNext API (host not recorded); no CorpFlowAI customer URL changed
- Expected vs actual result: Buying/AP path mapped on current main; synthetic Item read back; Supplier still empty; PO DEFER; uniqueness=0; no PI submit; no payment
- Client-facing flow usable: n/a
- Final verdict: PARTIAL (current-main packet complete for accountant configuration; live Supplier write waits on Role grant; PI posting waits on #1055)
```

Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: docs/mapping/Buying-AP operating path only; no AI drafting, prompts, Lead Rescue behaviour, chatbot, tenancy, or protected-action model changes
- cases affected: none
- new cases added: none
- artifact path, if generated: none
- live-model eval used: NO
