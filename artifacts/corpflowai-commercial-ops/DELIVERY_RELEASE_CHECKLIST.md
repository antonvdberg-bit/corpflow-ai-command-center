# Delivery release checklist

**Status:** Operator gate · **Updated:** 2026-07-14  
**Owner:** Anton  
**Path:** `artifacts/corpflowai-commercial-ops/DELIVERY_RELEASE_CHECKLIST.md`

**NO IMPLEMENTATION AUTHORIZED** — manual gate only. Complete before any sprint build/configuration work begins.

---

## Clearance rule

```text
BANK CREDIT VISIBLE
  + ERPNext PAYMENT ENTRY ALLOCATED
  + RECONCILIATION CONFIRMED
= DELIVERY MAY START
```

**Not clearance:** POP screenshot, POP image, transfer promise, pending transaction, unallocated Payment Entry, manual lead status alone.

---

## Engagement

| Field | Value |
| ----- | ----- |
| CF-… reference | |
| Business name | |
| Contact | |
| Offer | |
| Quote total (MUR) | |
| Deposit due (MUR) | |
| ERPNext deposit Sales Invoice | |
| Date | |

---

## A. Quote & acceptance

- [ ] Written quote sent (ERPNext Quotation or manual quote email)
- [ ] Client accepted quote in writing (email reply logged)
- [ ] Scope matches catalogue offer slug and MUR price
- [ ] 50% deposit terms communicated

---

## B. Bank clearance (Anton — manual)

- [ ] POP received from client (if applicable)
- [ ] **Bank credit visible** on operator banking dashboard
- [ ] Amount matches deposit due (MUR)
- [ ] Payer name matches client or agreed third party
- [ ] Funds are **cleared** (not pending)
- [ ] Not a duplicate deposit for this quote reference

---

## C. ERPNext payment (when configured)

- [ ] Deposit Sales Invoice issued in ERPNext
- [ ] **Payment Entry created and submitted**
- [ ] Payment Entry **allocated** to deposit Sales Invoice
- [ ] Invoice status = Paid (or correct partial state documented)
- [ ] `reference_no` and `reference_date` recorded on Payment Entry
- [ ] **Bank reconciliation confirmed** for statement line

---

## D. Triple clearance confirmation

- [ ] **BANK CREDIT VISIBLE** — confirmed by Anton
- [ ] **ERPNext PAYMENT ENTRY ALLOCATED** — confirmed in ERPNext
- [ ] **RECONCILIATION CONFIRMED** — bank recon complete for period

- [ ] **DELIVERY CLEARED** — all three above true

---

## E. Client communication & access

- [ ] Approval-to-proceed email sent to client
- [ ] Client access / assets requested per offer (credentials, logo, etc.)
- [ ] `/admin/rapid-delivery` operator status updated
- [ ] ERPNext Project + Tasks created (when configured)
- [ ] Mapping sheet updated (`docs/erpnext/ERPNEXT_RECORD_MAPPING.md`)

---

## F. Explicit rejects (do not clear if any true)

- [ ] ~~POP screenshot alone~~ — **NOT sufficient**
- [ ] ~~Client says "payment sent"~~ — **NOT sufficient**
- [ ] ~~Pending bank transaction~~ — **NOT sufficient**
- [ ] ~~Unallocated Payment Entry~~ — **NOT sufficient**
- [ ] ~~Postgres status changed without bank verify~~ — **NOT sufficient**

---

## Approval

| Role | Name | Date | Approved |
| ---- | ---- | ---- | -------- |
| Operator (Anton) | | | [ ] |

**Delivery start authorised:** [ ] YES — only when Section D fully complete

---

## Automation assessment

| Check | Class |
| ----- | ----- |
| Entire checklist | MANUAL CONTROL |
| Bank verification | **SHOULD REMAIN MANUAL** |
| PE allocation verify | MANUAL CONTROL |
| Auto-clear on intake | OUT OF SCOPE — forbidden |
| Bank API | OUT OF SCOPE — do not build |

---

## Cross-references

- `docs/erpnext/ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY.md`
- `docs/revenue/templates/deposit-received-manual-verification.md`
- `docs/revenue/templates/approval-to-proceed.md`
- `docs/erpnext/CORPFLOWAI_QUOTE_TO_CASH_RUNBOOK.md`
