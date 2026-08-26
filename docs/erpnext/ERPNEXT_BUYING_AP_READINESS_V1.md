# ERPNext Buying / AP readiness v1 — onboarding packet D

**Status:** Standard-ERPNext-first Buying/AP operating path defined. Accountant-approved account defaults remain on [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055).  
**Issue:** [#1098](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1098)  
**Parents:** [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953), [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918)  
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`, MUR) + synthetic data only. Not `client_production`.  
**Owner:** Cursor (this packet); Accountant (#1055); Anton (merge, Role Permission grant, real supplier approval, payment).  
**Machine contract:** `config/erpnext-buying-ap-readiness.v1.json`  
**Mapper:** `lib/erpnext/buying-ap-readiness.js`  
**Apply:** `node scripts/erpnext/apply-buying-ap-readiness.mjs`  
**Operator runbook:** `docs/runbooks/ERPNEXT_BUYING_AP_OPERATOR_RUNBOOK_V1.md`  
**Anchor:** `<!-- ERPNEXT_BUYING_AP_READINESS_V1 -->`

<!-- ERPNEXT_BUYING_AP_READINESS_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1098
```

This packet does **not** authorize Purchase Invoice submit, Payment Entry, bank credentials, real supplier approval, custom DocTypes, env/secrets change, external send, or merge.

---

## Required return

```text
Cursor agent/run ID: bc-65c1ee85-ed4d-4a24-8c44-a7761c2acb1f
Cursor agent URL: https://cursor.com/agents/bc-65c1ee85-ed4d-4a24-8c44-a7761c2acb1f
Cursor run: run-acc3988a-3583-424a-8d0b-15db3432914e
Work request: cfai-wr-65c1ee85-ed4d-4a24-8c44-a7761c2acb1f
Handoff run: 32933611590

Standard DocTypes/settings audited: Supplier, Supplier Group, Purchase Order, Purchase Invoice, Purchase Receipt, Payment Term, Payment Terms Template, Payment Terms (403), Cost Center, Account, Company, Buying Settings, Accounts Settings, Item, Price List, File, Contact, Address, Purchase Taxes and Charges Template, Fiscal Year, Mode of Payment, Workflow (403)

Synthetic Supplier identifier/read-back: NOT CREATED this run — Supplier CREATE HTTP 403 (No permission for Supplier). LIST HTTP 200 count=0. Planned name: CF1098 Synthetic Operating Supplier Ltd.
Synthetic purchase Item: CF-AP-SYNTHETIC-OPEX (GET HTTP 200; is_purchase_item=1; is_stock_item=0; is_sales_item=0; item_group=Services)

Purchase Order verdict: DEFER
Purchase Invoice/AP lifecycle: Supplier -> Item expense category -> Draft PI (capture) -> Anton review -> Submit (protected, posts GL) -> Payment Entry separately protected
Duplicate-prevention rule: search-before-create on supplier_name and contact email; search PI by supplier + bill_no; ERPNext does not unique-constrain supplier name; Accounts Settings check_supplier_invoice_uniqueness is unset
Approval/payment segregation rule: INVOICE_EXISTENCE_NEVER_AUTHORIZES_PAYMENT
Protected actions remaining: #1055 accountant CoA/tax/defaults; Anton Role Permissions Manager grant for Supplier create; real supplier approval; PI submit; Payment Entry; bank credentials/integration; opening balances

Final verdict: ERPNext BUYING / AP READINESS READY FOR ACCOUNTANT CONFIGURATION
```

---

## 1. Verdict

**`ERPNext BUYING / AP READINESS READY FOR ACCOUNTANT CONFIGURATION`**

Standard ERPNext already has the Buying/AP objects CorpFlowAI needs. The operating path is:

`Supplier -> purchase expense/category -> Purchase Invoice/AP record -> approval/review -> payment remains separately protected`

This packet proved that path as far as it is safe **before** accountant-approved account defaults:

- Supplier, Supplier Group, Purchase Invoice, Cost Center, File attachments, and Buying Settings are readable.
- Buying Settings **`po_required = No`** and **`pr_required = No`**.
- Company currently points payable at `Creditors - CFAI` and expense at `Cost of Goods Sold - CFAI`. Those are standard-skeleton defaults, **not** accountant-approved CorpFlowAI books.
- One synthetic non-stock purchase Item `CF-AP-SYNTHETIC-OPEX` was created (search-before-create). It is a category placeholder, not an accounting posting.
- Synthetic Supplier create is blocked by a Role Permission gap, not by missing ERPNext capability.
- No Purchase Invoice was submitted. No Payment Entry was created. No bank fields were written or recorded.

Exact blocker for **accountant configuration**: **NONE**.  
Remaining non-accountant desk action: Anton grants Supplier Create/Write on `Purchase User` (already held by `integrations@corpflowai.com` per #1019). That grant is **not** an accounting-policy decision.

Anton action now: **NONE** unless merging this PR, or later applying the Supplier Role Permission grant. Do not treat merge as payment or CoA approval.

---

## 2. Live inspection (2026-08-26)

Access path: Cursor Cloud secrets → Frappe token auth (no SSH / Infisical). Identity: `integrations@corpflowai.com`. `MASTER_ADMIN_KEY`: **absent**. Host URL not recorded.

Incidental version read-back (does **not** reopen #1010): **frappe 16.31.0 / erpnext 16.32.3**.

| Object | Readable | Writable this run | Notes |
| --- | --- | --- | --- |
| Company | yes | not changed | `CorpFlowAI LTD` / CFAI / Mauritius / MUR |
| Supplier | LIST yes | CREATE **HTTP 403** | Empty list. Exact error: `No permission for Supplier` |
| Supplier Group | yes | not changed | Default for operating suppliers: `Services` |
| Purchase Order | yes | not used | Count 0. **DEFER** |
| Purchase Invoice | yes | not created | Count 0. Draft mapping only |
| Purchase Receipt | yes | not used | Count 0. `pr_required = No` |
| Payment Term / Template | yes (empty) | not changed | `Payment Terms` DocType HTTP 403 |
| Cost Center | yes | not changed | Group `CorpFlowAI LTD - CFAI`; leaf `Main - CFAI` |
| Account | yes | not changed | 96 rows (27 groups, 69 children). Standard skeleton |
| Buying Settings | yes (Single GET) | not changed | `po_required=No`; `show_pay_button=1` |
| Accounts Settings | yes (Single GET) | not changed | `check_supplier_invoice_uniqueness` unset |
| Item | yes | synthetic create yes | `CF-AP-SYNTHETIC-OPEX` |
| File | yes | not uploaded | Standard Attach is available |
| Workflow | HTTP 403 | — | Keep GitHub + Anton gates |
| Payment Entry | LIST yes | **forbidden** | Count 0. Not used |

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
| Duplicate prevention | Search by exact `supplier_name`, then by Contact email. Reuse on match. AI **cannot** approve suppliers. Anton approves **real** suppliers. |
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
| bill_no_uniqueness | Whether to enable `check_supplier_invoice_uniqueness` | Accounts Settings |
| multi_currency_ap | How USD supplier invoices post on MUR books | Supplier currency / Party Account |

Existing Indirect Expense leaves already on the hosted-test skeleton (names only): Administrative Expenses, Bank Charges, Legal Expenses, Marketing Expenses, Miscellaneous Expenses, Office Maintenance Expenses, Office Rent, Telephone Expenses, Travel Expenses, Utility Expenses, and others. The accountant chooses. This packet does **not**.

---

## 8. Smallest gap proposal (no customization)

**Gap:** `integrations@corpflowai.com` can list Supplier and holds Purchase User / Purchase Manager roles (#1019), but Supplier **create** returns HTTP 403 `No permission for Supplier`.

**Smallest proposal:** Anton, in Role Permissions Manager, grant **Read / Create / Write** on DocType **Supplier** to role **Purchase User**. Do not assign System Manager. Do not add a custom DocType, custom field, or second procurement app.

After that grant, re-run `node scripts/erpnext/apply-buying-ap-readiness.mjs` to create/reuse `CF1098 Synthetic Operating Supplier Ltd` with Contact + Address. Still do **not** submit a Purchase Invoice.

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
- Production deployment ID: n/a — docs + hosted-ERPNext synthetic Item only; no CorpFlowAI app runtime change
- Commit deployed: n/a
- Live URLs tested: n/a — ERPNext API (host not recorded); no CorpFlowAI customer URL changed
- Expected vs actual result: Buying/AP path mapped; synthetic Item read back; Supplier create 403 as recorded; no PI submit; no payment
- Client-facing flow usable: n/a
- Final verdict: PARTIAL (packet complete for accountant configuration; live Supplier write waits on Role grant; PI posting waits on #1055)
```

Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: docs/mapping/Buying-AP operating path only; no AI drafting, prompts, Lead Rescue behaviour, chatbot, tenancy, or protected-action model changes
- cases affected: none
- new cases added: none
- artifact path, if generated: none
- live-model eval used: NO
