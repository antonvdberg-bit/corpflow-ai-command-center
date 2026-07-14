# ERPNext commercial closeout checklist

**Status:** Operator checklist · **Updated:** 2026-07-14  
**Owner:** Anton  
**Anchor:** `<!-- ERPNEXT_COMMERCIAL_CLOSEOUT_CHECKLIST_V1 -->`

<!-- ERPNEXT_COMMERCIAL_CLOSEOUT_CHECKLIST_V1 -->

Run when sprint is **delivered**, **balance paid**, and engagement is **commercially complete**.

**NO IMPLEMENTATION AUTHORIZED** — checklist only.

---

## Engagement record

| Field | Value |
| ----- | ----- |
| CF-… reference | |
| Business name | |
| Offer | |
| Quote total (MUR) | |
| ERPNext Customer ID | |
| Quotation ID | |
| Deposit SI / PE | |
| Balance SI / PE | |
| Project ID (if used) | |

---

## A. Commercial documents (ERPNext)

- [ ] Customer record complete (contact, address, CF-… in notes)
- [ ] Quotation submitted and linked
- [ ] Deposit Sales Invoice **Paid**
- [ ] Deposit Payment Entry submitted + allocated
- [ ] Balance Sales Invoice **Paid**
- [ ] Balance Payment Entry submitted + allocated
- [ ] Bank reconciliation confirmed for both payment periods
- [ ] All Communications logged (quote, deposit request, approval, receipt)

---

## B. Delivery documents

- [ ] Discovery notes attached
- [ ] Scope / quote acceptance on file
- [ ] Approval-to-proceed email sent (timestamp)
- [ ] Preview feedback logged
- [ ] Production release approval (if applicable)
- [ ] Handover document delivered to client
- [ ] Project tasks marked complete (if Project used)

---

## C. CorpFlow app alignment

- [ ] `/admin/rapid-delivery` status = `won`
- [ ] Postgres lead notes updated with ERPNext doc IDs
- [ ] Mapping sheet row complete (`ERPNEXT_RECORD_MAPPING.md`)
- [ ] `/change` ticket closed if engagement had CMP ticket (Delivery Reality Audit if client-visible)

---

## D. Delivery Reality Audit (if client-visible URLs touched)

```text
Delivery Reality Audit:
- Local fix exists: YES/NO
- Merged to main: YES/NO
- Production deployment ID:
- Commit deployed:
- Live URLs tested:
- Expected vs actual result:
- Client-facing flow usable: YES/NO
- Final verdict: COMPLETE / PARTIAL / FAILED
```

---

## E. Post-close optional

- [ ] Maintenance offer sent (optional — separate quote, never bundled)
- [ ] Case study permission requested (NA-009)
- [ ] ERPNext Project set to Completed

---

## F. Explicit non-actions at closeout

- Do not delete Customer or GL history
- Do not merge USD 150 wedge records into MUR sprint Customer
- Do not mark closed on Postgres alone without ERPNext payment confirmation

---

## Automation assessment

| Step | Class |
| ---- | ----- |
| Closeout checklist execution | MANUAL CONTROL |
| ERPNext doc verification | MANUAL CONTROL |
| Delivery Reality Audit | MANUAL CONTROL |
| Auto-close on payment | AUTOMATION CANDIDATE (future — not authorised) |

---

## Cross-references

- `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`
- `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md` — §13
- `.cursor/rules/delivery-reality.mdc`
