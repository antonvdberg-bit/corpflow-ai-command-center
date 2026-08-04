# Payment evidence / financial evidence record

**Rail:** #714 · `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md`  
**Use:** Prove funds (or an approved exception) without storing secrets.

<!-- PAYMENT_EVIDENCE_RECORD_V1 -->

## Forbidden to store

Do **not** record: bank login credentials, full account passwords, card numbers, CVV, real payment screenshots containing sensitive data, or private client financial documents beyond a **reference id**.

## Standard evidence

| Field | Value |
|---|---|
| Payment evidence ref | `<PAYMENT_EVIDENCE_REF>` |
| Opportunity ref | `<OPPORTUNITY_REF>` |
| Proposal ref / version | `<PROPOSAL_REF> / <VERSION>` |
| Expected amount | `<EXPECTED_AMOUNT>` |
| Currency | `<CURRENCY>` |
| Payment term | `<PAYMENT_TERMS>` |
| Evidence type | ☐ bank_transfer_reference · ☐ proforma_marked_paid_operator · ☐ manual_receipt_reference · ☐ deferred_payment_exception · ☐ other_operator_verified |
| Evidence reference (opaque id) | `<REF e.g. transfer last-4 / ERPNext payment entry id>` |
| Evidence date | `<YYYY-MM-DD>` |
| Amount evidenced | `<AMOUNT>` |
| Verification status | ☐ pending · ☐ recorded · ☐ verified · ☐ exception_approved · ☐ rejected |
| Verified by | `<OPERATOR_NAME>` |
| Notes | `<NO SECRETS>` |

Gate treats `recorded` or `verified` as satisfying payment evidence when amount, currency, type, and ref are present.

## Deferred / exception payment (optional)

Complete **all** fields below or the gate returns `PAYMENT_EXCEPTION_INCOMPLETE`.

| Field | Value |
|---|---|
| Exception authorised by | `<NAMED_APPROVER e.g. Anton>` |
| Written reason | `<WHY deferred is allowed>` |
| Approved at (ISO) | `<TIMESTAMP>` |
| Due-by date | `<YYYY-MM-DD>` |
| Evidence status | `exception_approved` |

## Invoice / pro-forma handoff (manual)

| Field | Value |
|---|---|
| Pro-forma / invoice ref | `<INVOICE_REF or n/a>` |
| Issued via | ☐ ERPNext · ☐ manual PDF · ☐ other |
| Sent to client? | ☐ yes (manual) · ☐ no |
| Send channel | operator-managed only — **no automation in this rail** |
