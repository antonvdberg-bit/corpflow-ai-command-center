# ERPNext bank clearance and payment entry

**Status:** Operator guide · **Updated:** 2026-07-14  
**Owner:** Anton  
**Anchor:** `<!-- ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY_V1 -->`

<!-- ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY_V1 -->

**NO IMPLEMENTATION AUTHORIZED** for production posting. Bank clearance **SHOULD REMAIN MANUAL** (NA-006).

---

## Clearance rule

```text
BANK CREDIT VISIBLE
  + ERPNext PAYMENT ENTRY ALLOCATED
  + RECONCILIATION CONFIRMED
= DELIVERY MAY START
```

---

## 1. Bank clearance (Anton — manual)

### 1.1 What Anton verifies

| Check | Pass? |
| ----- | ----- |
| Amount matches deposit due (MUR) | |
| Payer name matches client or agreed third party | |
| Funds show **cleared** on bank dashboard (not pending) | |
| Reference matches client POP / communication | |
| Not a duplicate deposit for same quote/SI | |

Use `docs/revenue/templates/deposit-received-manual-verification.md`.

### 1.2 What is NOT verification

| Input | Why insufficient |
| ----- | ---------------- |
| POP screenshot | Can be forged or pre-transfer |
| POP PDF | Same |
| WhatsApp "I sent it" | No cleared funds |
| Pending transaction | Not cleared |
| Email promise | Not cleared |

### 1.3 Automation class

**SHOULD REMAIN MANUAL** — Anton verifies on banking dashboard. No bank API. No delegate without re-authorisation.

---

## 2. Payment Entry creation

After bank clearance confirmed:

### 2.1 Fields (deposit receipt)

| Field | Value |
| ----- | ----- |
| Payment Type | Receive |
| Party Type | Customer |
| Party | Customer name |
| Paid To | MUR Bank account (e.g. SBM MUR ledger) |
| Paid Amount | Deposit MUR amount received |
| Mode of Payment | Bank Transfer / custom SBM MUR Wire |
| Reference No | **Bank transaction reference** (mandatory — Phase C C-2) |
| Reference Date | Value date on bank statement |
| Allocate to | Deposit Sales Invoice |

### 2.2 Operator steps (ERPNext UI)

> **Anton click-by-click:** ERPNext access required.

1. **Accounting** → **Payment Entry** → **New**
2. Payment Type = **Receive**
3. Select Customer
4. Paid To = MUR bank account
5. Enter received MUR amount
6. **Reference No** + **Reference Date** — paste from bank statement
7. In References table: select deposit **Sales Invoice**, allocate full deposit amount
8. Save → **Submit**
9. Confirm invoice status → **Paid** (or partial if split payment)

### 2.3 Sandbox evidence

Phase C cycle 1: `ACC-PAY-2026-00002` — Receive / Wire Transfer, allocated to `ACC-SINV-2026-00001`, invoice `Paid`.

---

## 3. Allocation rules

| Rule | Detail |
| ---- | ------ |
| Full allocation | Deposit PE must fully allocate to deposit SI |
| Partial payment | Do not clear delivery — hold until full deposit received or written agreement |
| Overpayment | Communicate with client; do not auto-apply to balance without confirmation |
| Unallocated PE | **Does not satisfy clearance rule** |

---

## 4. Communication after clearance

When all three clearance conditions met:

1. Complete `artifacts/corpflowai-commercial-ops/DELIVERY_RELEASE_CHECKLIST.md`
2. Send `docs/revenue/templates/approval-to-proceed.md`
3. Set `/admin/rapid-delivery` status → `won`
4. Start 24–72h delivery clock

---

## 5. Balance payment (same discipline)

Balance Payment Entry follows identical rules:

- Bank credit visible
- PE allocated to balance SI
- Reconciliation confirmed

See `docs/erpnext/ERPNEXT_BALANCE_INVOICE_AND_RECEIPT.md`.

---

## 6. Automation assessment

| Step | Class |
| ---- | ----- |
| Bank dashboard check | **SHOULD REMAIN MANUAL** |
| POP receipt logging | MANUAL CONTROL |
| Payment Entry create/submit | REQUIRES ERPNext CONFIGURATION |
| Invoice allocation | REQUIRES ERPNext CONFIGURATION |
| Delivery release decision | REQUIRES APPROVAL (Anton) |
| Bank API feed | OUT OF SCOPE — do not build |

---

## 7. Cross-references

- `docs/erpnext/ERPNEXT_BANK_RECONCILIATION_GUIDE.md`
- `docs/erpnext/ERPNEXT_DEPOSIT_INVOICE_GUIDE.md`
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` — Finding C-2
