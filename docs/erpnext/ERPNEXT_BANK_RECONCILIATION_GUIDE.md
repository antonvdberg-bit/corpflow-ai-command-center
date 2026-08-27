# ERPNext bank reconciliation guide

**Status:** Operator guide · **Updated:** 2026-07-14  
**Owner:** Anton + Cursor (sandbox import)  
**Anchor:** `<!-- ERPNEXT_BANK_RECONCILIATION_GUIDE_V1 -->`

<!-- ERPNEXT_BANK_RECONCILIATION_GUIDE_V1 -->

**Current onboarding packet F (#1139 / current-main #1220):** the hosted-test operating model is `docs/erpnext/ERPNEXT_BANK_RECONCILIATION_READINESS_V1.md`. This sandbox guide remains Phase C history. Do not copy sandbox bank ledger names onto the vendor-hosted site.

**NO IMPLEMENTATION AUTHORIZED** for production. No bank API integration — CSV import only.

---

## 1. Purpose

Confirm that **bank statement lines** match **ERPNext Payment Entries and Journal Entries** so the third condition of the delivery clearance rule is satisfied:

```text
RECONCILIATION CONFIRMED = bank GL balance matches statement after matching all lines
```

Clearance requires all three: bank credit visible + PE allocated + **reconciliation confirmed**.

---

## 2. Scope

| In scope | Out of scope |
| -------- | ------------ |
| MUR bank CSV import (manual export from SBM dashboard) | Live bank API / open banking |
| Match deposit + balance receipts | PayPal / Wise (deferred / removed from v1) |
| Manual JE for bank fees | Automated fee posting |
| Sandbox synthetic CSV (Phase C cycle 3) | Production posting without Phase D |

---

## 3. Sandbox evidence (Phase C cycle 3)

Synthetic 3-line MU bank CSV reconciled to **MUR 0.00** delta:

| Line | Narration | Amount MUR | Matched to |
| ---- | --------- | ---------- | ---------- |
| 1 | Wire in — Client A | Cr 6,705 | `ACC-PAY-2026-00002` |
| 2 | PayPal xfer in | Cr 6,645 | `ACC-JV-2026-00002` |
| 3 | Bank fee | Dr 150 | Manual JE → `Banking & Payment Fees` |

**Limitation:** Arithmetic verified; Bank Reconciliation Tool **UI not invoked** end-to-end. HB-4 requires real redacted CSV (NA-008).

---

## 4. Reconciliation workflow (production intent)

### 4.1 Export bank statement

> **Anton click-by-click:** SBM online banking — export CSV/Excel for date range covering deposit.

- Redact account number before sharing with Cursor for sandbox tests
- Preserve: dates, amounts, narrations, references

### 4.2 Import to ERPNext

> **Anton click-by-click:** ERPNext access required.

1. **Accounting** → **Bank Reconciliation Tool** (or Bank Statement import per version)
2. Select MUR Bank account
3. Upload CSV
4. Map columns: date, deposit, withdrawal, narration
5. ERPNext suggests matches against existing Payment Entries

### 4.3 Match lines

| Line type | Match target |
| --------- | ------------ |
| Client deposit | Payment Entry (Receive) for deposit SI |
| Client balance | Payment Entry for balance SI |
| Bank fee | Manual Journal Entry → Banking & Payment Fees |
| Unknown | Hold — do not confirm recon until resolved |

### 4.4 Confirm reconciliation

- Running balance on bank account matches statement closing balance
- Delta within **MUR 0.01** tolerance (Phase C standard)
- Document reconciliation date on mapping sheet

---

## 5. Clearance linkage

For **delivery release**, operator confirms:

- [ ] Deposit bank line matched to deposit Payment Entry
- [ ] No unmatched client receipt lines for this engagement
- [ ] Reconciliation completed for statement period containing deposit

Unmatched or partial reconciliation → **delivery not cleared**.

---

## 6. Hard blockers

| ID | Item | Status |
| -- | ---- | ------ |
| HB-4 | Real redacted MU bank CSV test | NEEDS_ANTON (NA-008) |
| — | 30-day reconciliation cycle | SHOULD — deferred until operating volume |

---

## 7. Automation assessment

| Step | Class |
| ---- | ----- |
| Bank statement export | **SHOULD REMAIN MANUAL** |
| CSV redaction | MANUAL CONTROL |
| ERPNext import + match | REQUIRES ERPNext CONFIGURATION |
| Manual JE for fees | MANUAL CONTROL |
| Auto-match all lines | AUTOMATION CANDIDATE (future — ERPNext built-in) |
| Bank API | OUT OF SCOPE |

---

## 8. Cross-references

- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` — §3.3
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` — B-Bank-CSV, S-Bank-Recon-30d
- `docs/erpnext/ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY.md`
