# ERPNext balance invoice and receipt

**Status:** Operator guide · **Updated:** 2026-07-14  
**Owner:** Anton  
**Anchor:** `<!-- ERPNEXT_BALANCE_INVOICE_AND_RECEIPT_V1 -->`

<!-- ERPNEXT_BALANCE_INVOICE_AND_RECEIPT_V1 -->

**NO IMPLEMENTATION AUTHORIZED** for production GL posting without Phase D gates.

---

## 1. Purpose

Collect the **remaining 50%** after sprint delivery / client acceptance, issue receipt, and mark engagement commercially closed.

**Timing by offer** (from `rapid-delivery-offers.js`):

| Offer | Balance due |
| ----- | ----------- |
| AI Lead Rescue Sprint | On delivery acceptance |
| Premium Landing Page Rescue | Before production release |
| Customer Recovery & Reputation Management Sprint | On sprint handover |

---

## 2. Prerequisites

- [ ] Deposit cleared and delivery completed per scope
- [ ] Preview feedback received OR reminder sent per playbook SLA
- [ ] Production release approval (if landing page offer)
- [ ] Client written acceptance of deliverables (or elapsed wait per quote)

---

## 3. Balance Sales Invoice

### 3.1 Amount

```text
Balance = Quote total − Deposit received
```

Example: MUR 45,000 quote → MUR 22,500 deposit → **MUR 22,500 balance**

### 3.2 Operator steps (ERPNext UI)

> **Anton click-by-click:** ERPNext access required.

1. **Selling** → **Sales Invoice** → **New** (or from Project / remaining from Quotation)
2. Customer = same Customer
3. Item line = balance amount (50%) or remaining line
4. Currency = MUR
5. Submit invoice
6. Send to client with payment instructions (separate email)
7. Record balance SI ID on mapping sheet

---

## 4. Balance payment & allocation

Same triple clearance as deposit:

1. Anton confirms **cleared** MUR on bank dashboard
2. Create **Payment Entry** (Receive) with bank reference
3. Allocate to balance Sales Invoice
4. **Bank Reconciliation** confirms line

See `docs/erpnext/ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY.md`.

---

## 5. Receipt

After balance PE allocated and invoice Paid:

### 5.1 Client message (template intent)

```text
Subject: Paid in full — {offer name} · {business name}

Hi {first name},

We confirm receipt of your final payment of MUR {balance amount}.
Total paid: MUR {quote total} for {offer name}.

Thank you for working with CorpFlowAI. Handover materials are attached / linked.

Optional: we can discuss month-to-month maintenance separately — no obligation.

Anton
CorpFlowAI Ltd
```

### 5.2 ERPNext actions

- Confirm both deposit + balance SIs show **Paid**
- Attach handover doc to Project / Customer Files
- Log Communication "Commercial close — paid in full"

---

## 6. Automation assessment

| Step | Class |
| ---- | ----- |
| Issue balance SI | REQUIRES ERPNext CONFIGURATION |
| Balance bank verification | **SHOULD REMAIN MANUAL** |
| Balance PE + allocation | REQUIRES ERPNext CONFIGURATION |
| Receipt email | MANUAL CONTROL |
| Maintenance upsell | MANUAL CONTROL |

---

## 7. Cross-references

- `docs/revenue/templates/maintenance-offer.md`
- `docs/erpnext/ERPNEXT_COMMERCIAL_CLOSEOUT_CHECKLIST.md`
- `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`
