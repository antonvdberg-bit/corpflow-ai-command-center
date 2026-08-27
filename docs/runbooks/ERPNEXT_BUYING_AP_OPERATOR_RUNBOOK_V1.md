# ERPNext Buying / AP operator runbook v1

**Status:** Operator steps for Supplier creation, invoice capture, review, approval, and handoff to separately protected payment.  
**Source:** [#1098](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1098) / current-main [#1213](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1213)  
**Canonical evidence:** `docs/erpnext/ERPNEXT_BUYING_AP_READINESS_V1.md`  
**Accountant gate:** [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055)  
**Environment:** hosted ERPNext test until a later books-host decision. Not `client_production`.  
**Anchor:** `<!-- ERPNEXT_BUYING_AP_OPERATOR_RUNBOOK_V1 -->`

<!-- ERPNEXT_BUYING_AP_OPERATOR_RUNBOOK_V1 -->

Use **standard ERPNext only**. Do not invent a second procurement tracker in GitHub, CMP, or spreadsheets as the payable ledger.

Fail-closed rule:

```text
Invoice existence never authorizes payment.
```

AI cannot approve suppliers. Anton approves real suppliers. Zero default AI spend.

---

## 0. Before you start

| Check | Pass when |
| --- | --- |
| This is a **real** supplier, not the synthetic `CF1098` test row | Anton has approved the supplier in GitHub or desk |
| You are **not** paying | Payment stays a later protected action |
| Accounting defaults | #1055 accountant answers exist before you **Submit** a Purchase Invoice |
| Bank details | Stay in an approved secure channel. Never paste IBAN/SWIFT/account numbers into GitHub, ERPNext `supplier_details`, or chat |

CMP **Supplier Onboarding Wizard** is not this process.

---

## 1. Create or reuse a Supplier

1. In ERPNext Desk open **Buying → Supplier**.
2. **Search first** by legal name. If a row exists, reuse it. Do not create `Name - 1`.
3. If creating:
   - **Name:** legal/display name as on the invoice.
   - **Supplier Type:** Company (usual).
   - **Supplier Group:** Services for software/hosting/licences/professional fees; Local only when that is clearly true.
   - **Country** and **default currency**.
   - **Tax ID:** leave blank unless the accountant has said to store it.
   - Do **not** fill bank account fields.
4. Add a **Contact** (email) and **Billing Address** (line1, city, country), both linked to the Supplier.
5. Search Contact by email as well. Email is not unique in ERPNext.

Synthetic test name only: `CF1098 Synthetic Operating Supplier Ltd`. Never pay it.

---

## 2. Capture the supplier invoice (Draft Purchase Invoice)

Do this **after** the Supplier exists. Keep the document **Draft** unless #1055 defaults are approved.

1. Open **Accounting → Purchase Invoice → New** (or Buying → Purchase Invoice).
2. **Supplier:** the master from step 1.
3. **Supplier Invoice No** (`bill_no`) and **Supplier Invoice Date** (`bill_date`) from the PDF.
4. Search existing Purchase Invoices for the same Supplier + `bill_no`. If found, stop. Duplicate capture is the usual error. ERPNext Accounts Settings uniqueness is currently **off** (`check_supplier_invoice_uniqueness=0`); this search is the control.
5. One row per charge:
   - Prefer a non-stock **purchase Item** (`is_purchase_item = 1`). Selling catalogue SKUs (`LR-SETUP-USD-150` and similar) are **not** purchase items.
   - Test category placeholder: `CF-AP-SYNTHETIC-OPEX` (synthetic only).
   - Qty and rate from the invoice.
6. **Do not Submit.**
7. **Do not** tick Paid / use Pay.
8. **Do not** add the `Mauritius Tax - CFAI` 15% template unless the accountant has written that input VAT applies.
9. Attach the supplier PDF with standard **Attach** (File). That is the evidence. Do not paste bank details into Remarks.

Draft (`docstatus = 0`) does not post the ledger. Submit does.

---

## 3. Review

Anton (or a named reviewer) checks:

- Supplier is the approved legal entity (not a similarly named duplicate).
- Amount, currency, and `bill_no` match the attachment.
- Expense category is plausible. `Cost of Goods Sold - CFAI` is the wrong default for hosting/software/professional fees until the accountant says otherwise.
- No payment has been initiated from the Pay button.

Reject / amend in Draft. Do not Submit to “make it look done.”

---

## 4. Approval vs payment (keep these apart)

| Decision | Meaning | Next step |
| --- | --- | --- |
| “Supplier approved” | This vendor may exist as an ERPNext Supplier | Still not a payment |
| “Invoice captured / reviewed” | Draft PI matches the PDF | Still not a payment |
| “OK to post” | Accountant-approved accounts exist; Anton allows Submit | Posts payable/expense. **Still not a payment** |
| “OK to pay” | Separate protected payment action | Payment Entry / bank instruction. Never inferred from the PI existing |

Buying Settings currently show a Pay button (`show_pay_button = 1`). Ignore it as authority.

---

## 5. Handoff to protected payment processing

When a reviewed invoice must actually be paid:

1. Leave the Purchase Invoice as the AP record (Draft until #1055; Submitted only after accountant-approved defaults).
2. Open a **separate** protected payment request (Anton Decision Inbox / explicit payment approval). Include: Supplier name, PI name, `bill_no`, amount, currency, and that the PDF is attached in ERPNext.
3. Do **not** create Payment Entry, bank integration, or a payout from this runbook.
4. After a human payment is made outside ERPNext, a later authorized packet may record Payment Entry. That is onboarding F (#1054), not this packet.

---

## 6. Purchase Order

**Do not use Purchase Order** for initial CorpFlowAI operations. Buying Settings do not require it. Revisit only if stock purchasing or three-way match becomes a real need.

---

## 7. If the integration user cannot create a Supplier

Factory identity `integrations@corpflowai.com` can **read** Supplier but got **HTTP 403** on create (2026-08-26). Current-main GET 2026-08-27 (#1213) did not re-POST; the synthetic Supplier is still absent, so this grant is still outstanding. That is a permission gap, not accountant CoA approval.

Anton desk path:

1. Administrator → Users → Role Permissions Manager.
2. Role = **Purchase User**.
3. DocType = **Supplier**: Read, Create, Write.
4. Save. Do not grant System Manager.

Then operators (or a later `--write` re-run of `node scripts/erpnext/apply-buying-ap-readiness.mjs`) can create the synthetic test Supplier. Real suppliers still need Anton approval. Default apply is GET-only.
