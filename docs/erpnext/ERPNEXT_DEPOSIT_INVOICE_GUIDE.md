# ERPNext deposit invoice guide — 50% MUR sprint deposits

**Status:** Operator guide · **Updated:** 2026-07-14  
**Owner:** Anton  
**Anchor:** `<!-- ERPNEXT_DEPOSIT_INVOICE_GUIDE_V1 -->`

<!-- ERPNEXT_DEPOSIT_INVOICE_GUIDE_V1 -->

**NO IMPLEMENTATION AUTHORIZED** — financial posting requires Phase D gates and Anton approval (NA-002).

---

## 1. Purpose

Issue the **50% deposit Sales Invoice** in MUR after written quote acceptance. Deposit amount funds commencement of sprint work — **not** full project value.

**Catalogue deposit rule:** 50% before work (all three MUR offers in `rapid-delivery-offers.js`).

---

## 2. Deposit amounts (examples)

| Offer | Starting MUR | Deposit (50%) |
| ----- | ------------ | ------------- |
| AI Lead Rescue Sprint | 35,000 | **17,500** |
| Premium Landing Page Rescue | 45,000 | **22,500** |
| Customer Recovery & Reputation Management Sprint | 45,000 | **22,500** |

Adjust only if written scope change adjusts total quote.

---

## 3. Prerequisites

- [ ] Written quote acceptance from client
- [ ] ERPNext Customer exists
- [ ] ERPNext Quotation submitted (or scope documented on Communication)
- [ ] CF-… + lead_id logged on Customer

---

## 4. Create deposit Sales Invoice

### 4.1 Path options

| Path | When to use |
| ---- | ----------- |
| **A — From Quotation** | Quotation exists → **Create Sales Invoice** (deposit % or partial) |
| **B — Direct SI** | Manual path before Quotation module configured — create SI with 50% line |

### 4.2 Invoice fields

| Field | Value |
| ----- | ----- |
| Customer | Existing Customer |
| Currency | MUR |
| Item | Sprint Item |
| Amount | 50% of quoted total |
| Outstanding | Full deposit amount until paid |
| Payment terms | Due on receipt |

### 4.3 Operator steps (ERPNext UI)

> **Anton click-by-click:** ERPNext access required.

1. Open submitted **Quotation** → **Create** → **Sales Invoice**
2. Adjust line amount to **50%** if full quote was on Quotation (or use partial billing)
3. Verify Currency = MUR
4. Save as **Draft** until ready to send OR Submit per environment policy
5. Generate PDF when Print Format live
6. Send via `docs/revenue/templates/deposit-request.md` — **bank instructions in separate message**, not on public pages
7. Record SI name on mapping sheet: `CF-… → deposit SI`

**Wave 1 manual path:** Skip ERPNext SI; send deposit request email with MUR amount only. Log expected deposit on operator checklist.

---

## 5. What happens next

```text
Deposit SI sent
  → Client MUR bank transfer
  → Client sends POP
  → Anton bank verification (NOT POP alone)
  → Payment Entry + allocation
  → Bank reconciliation
  → DELIVERY CLEARED
```

See `docs/erpnext/ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY.md`.

---

## 6. Automation assessment

| Step | Class |
| ---- | ----- |
| Calculate 50% deposit | MANUAL CONTROL |
| Create deposit SI | REQUIRES ERPNext CONFIGURATION |
| Send deposit request email | MANUAL CONTROL |
| Verify cleared funds | **SHOULD REMAIN MANUAL** |
| Link PE to deposit SI | REQUIRES ERPNext CONFIGURATION |

---

## 7. Explicit non-actions

- Do not start delivery on POP alone
- Do not accept USD for MUR sprint deposits (USD banking for sprint path not available)
- Do not mix USD 150 wedge invoicing into this flow
- Do not submit SI to GL until payment policy confirmed with accountant (Wave 3)

---

## 8. Cross-references

- `docs/revenue/templates/deposit-request.md`
- `docs/revenue/templates/deposit-received-manual-verification.md`
- `artifacts/corpflowai-commercial-ops/DELIVERY_RELEASE_CHECKLIST.md`
- `docs/erpnext/ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY.md`
