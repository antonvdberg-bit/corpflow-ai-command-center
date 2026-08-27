# Bank / reconciliation operator runbook (manual-first)

**Status:** Operator procedure for #1139. **No live posting.**  
**Canonical model:** `docs/erpnext/ERPNEXT_BANK_RECONCILIATION_READINESS_V1.md`  
**Anchor:** `<!-- ERPNEXT_BANK_RECONCILIATION_OPERATOR_RUNBOOK_V1 -->`

<!-- ERPNEXT_BANK_RECONCILIATION_OPERATOR_RUNBOOK_V1 -->

This runbook separates **operator evidence** from **accountant-approved accounting actions**. Use it when a client payment (or a supplier payment later) must be traced from proof of funds to a future ERPNext match. Do not treat any step here as permission to submit a Payment Entry or connect a bank feed.

---

## Who does what

| Role | Owns | Does not own |
|------|------|--------------|
| Operator (Anton or named deputy) | Collect evidence, verify cleared funds on the bank dashboard, import a redacted statement later, hold exceptions | Invent Chart of Accounts, guess FX, submit Payment Entry |
| #551 / #714 rail | `financially_approved` for **build / onboarding** | ERPNext cash/AR truth |
| Accountant | Bank/cash ledgers, clearing, FX, fees, cadence, opening/cutover, later Payment Entry / Journal Entry coding | Client commercial offer wording |
| Cursor / factory | Mapping, GET-only read-back, synthetic proof | Any protected mutation listed in the canonical doc |

---

## Path A — inbound client receipt (usual case)

### 1. Invoice / commercial record exists (operator)

- Prefer the ERPNext draft Sales Invoice / Quotation name from #882 (`SAL-QTN-*`, `ACC-SINV-*` drafts).  
- Record the name on the Prospect commercial panel. ERPNext names are **references**.

### 2. Payment evidence received (operator evidence)

Use `docs/revenue/templates/PAYMENT_EVIDENCE_RECORD.md` or the Prospect panel.

Record only:

- expected amount and currency  
- opaque evidence reference (last-4 / operator ref / ERPNext name later)  
- date  
- type (`bank_transfer_reference`, etc.)

**Do not store:** bank logins, full account numbers, international bank identifiers, card numbers, CVV, unredacted statement files in GitHub.

### 3. Operator verification (Anton)

On the **bank dashboard** (not in ERPNext):

- [ ] Amount matches the invoice/deposit due  
- [ ] Payer matches the client or an agreed third party  
- [ ] Funds are **cleared**, not pending  
- [ ] Reference matches the evidence record  
- [ ] Not a duplicate for the same invoice  

POP screenshot, WhatsApp “I sent it”, or a pending line is **not** verification.

### 4. Financial approval rail — payment stays unapproved for GL

If evidence + acceptance + named approver are complete, tick **Record financial approval now**.

- Panel **CLEARED TO BUILD** = #715 / #716 may start.  
- **Payment Entry remains unapproved.** `#714` never posts ERPNext.  
- Rule: `PAYMENT_EVIDENCE_NEVER_AUTHORIZES_PAYMENT_ENTRY`.

### 5. Later accountant-approved Payment Entry (accounting action — not this packet)

Stop here until #1055 bank/cash ledgers exist and Anton approves the **exact** posting.

When later authorized:

1. Accounting → Payment Entry → New  
2. Receive (customer) or Pay (supplier, separately protected)  
3. Paid To / Paid From = **accountant-approved** bank or cash ledger (not a guessed template leaf)  
4. `reference_no` + `reference_date` from the **cleared** statement line (mandatory)  
5. Allocate to the invoice  
6. Save. **Submit only after explicit Anton accounting approval**  
7. Do not treat `show_pay_button` as authority  

### 6. Bank-statement import or manual capture (operator)

- Export CSV/Excel from the bank UI for the period.  
- Redact private numbering before the file is stored anywhere in Git.  
- Import via standard ERPNext Bank Reconciliation Tool / Bank Transaction import.  
- Manual capture of a line is allowed when import is unavailable; still no live feed.

### 7. Reconciliation (operator + accountant review)

Match each statement line to an existing Payment Entry or Journal Entry by **reference + amount + date**.

- Closing balance delta must be within the accountant-approved tolerance (proposed MUR 0.01).  
- Replay of the same file must not create extra ERPNext rows.  
- Confirm recon only when every client receipt line for the engagement is matched.

### 8. Exception review (Anton + accountant)

| Exception | Action |
|-----------|--------|
| Bank fee | Hold; later Journal Entry to the accountant-approved fees account |
| Unknown credit/debit | Hold. Do not force-match. Do not close the period. |
| FX difference | Hold for accountant FX treatment (#882 fail-closed; no invented 1.0 rate) |
| Duplicate import | Search-before-create; reuse the existing Bank Transaction |

Unmatched lines → **delivery not bank-cleared** for quote-to-cash (see `docs/erpnext/ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY.md` clearance rule). That clearance rule is **future** operating intent; it does not authorize posting today.

---

## Path B — supplier / outbound payment

Follow #1098: draft Purchase Invoice is capture only. **Invoice existence never authorizes payment.** Outbound Payment Entry is the same protected step as Path A stage 5.

---

## Traceability checklist (copy into the ticket)

- [ ] ERPNext invoice/quotation name (reference)  
- [ ] Payment evidence ref (opaque)  
- [ ] Operator verification date + “cleared”  
- [ ] #714 `financially_approved` yes/no (build gate only)  
- [ ] Payment Entry name (later; blank until accountant posting)  
- [ ] Statement period + redacted file location (not Git if it still contains private numbering)  
- [ ] Recon date + delta  
- [ ] Exceptions held (list)

---

## Hard stops

- Do not create or edit a real Bank Account or GL bank/cash leaf.  
- Do not submit Payment Entry.  
- Do not connect a bank feed or store bank credentials in ERPNext or GitHub.  
- Do not manufacture a live Bank Transaction to make a test look green.  
- Direct bank-feed for initial operation: **NOT REQUIRED**.
