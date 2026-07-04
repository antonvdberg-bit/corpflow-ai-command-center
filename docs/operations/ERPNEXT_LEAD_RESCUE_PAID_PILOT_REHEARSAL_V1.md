# ERPNext Lead Rescue paid-pilot rehearsal (v1)

**Status:** Operator rehearsal runbook. **Docs / process + synthetic templates only.** No server access by Cursor; no ERP install/uninstall; no real client data; no runtime/deploy/env/secrets/payment changes authorized by this document.

**Owner:** Anton (operator — all ERPNext UI steps, SSH tunnel, evidence capture).

**Packet:** GitHub #249 — *ERPNext paid-pilot rehearsal support* (post backbone decision: keep ERPNext, defer production rollout, hybrid control plane).

**Anchor sentinel:** `<!-- ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1 -->`

<!-- ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1 -->

**Created:** 2026-07-04.

**Companion artefacts:**

| Artefact | Path |
| -------- | ---- |
| Synthetic field template (CSV) | `docs/operations/templates/erpnext-lead-rescue-paid-pilot-rehearsal-sample.csv` |
| Backbone decision (closed) | `docs/operations/ERP_BACKBONE_DECISION_AUDIT_V1.md` |
| POP + ERPNext minimum | `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` |
| CorpFlow pilot path | `docs/lead-rescue/FIRST_PAID_PILOT_OPERATOR_PACK.md` |

---

## 1. Purpose

Give Anton a **same-day, repeatable rehearsal** of the July paid-pilot **money path** in ERPNext **sandbox**, while **CorpFlowAI remains the control plane** for lead capture, delivery, and proof.

After rehearsal passes, Anton can run the **first real paying pilot** with:

- **ERPNext** = finance/commercial record spine (Customer → Quotation → Sales Invoice → Payment Entry).
- **CorpFlowAI** = lead/intake/delivery/proof (`/lead-rescue`, `/admin/lead-rescue/[id]`, onboarding checklist, fulfilment evidence).

This runbook does **not** authorize ERPNext production go-live, Print Designer template build, or Odoo evaluation.

---

## 2. Decision (backbone — closed)

Recorded on Operator Bridge #249 and in `ERP_BACKBONE_DECISION_AUDIT_V1.md`:

| Decision | Status |
| -------- | ------ |
| **Keep ERPNext installed** | Yes — accounting/reconciliation backbone |
| **Do not switch to Odoo for July** | Closed — no Odoo install or evaluation in this packet |
| **Defer full ERPNext production rollout** | Yes — Phase D hard blockers remain (accountant CoA, VAT row, real bank CSV, Phase D approval) |
| **Use ERPNext now for first paid pilot** | **Sandbox only** as finance/commercial spine; buyer-facing PDF may still use manual pro-forma until Print Format is production-grade |
| **CorpFlowAI control plane** | Unchanged — intake, cockpit, delivery, proof |

---

## 3. Scope

### 3.1 In scope

- One **synthetic** end-to-end rehearsal on ERPNext **sandbox** (`corpflow-exec-01-u69678`, loopback `127.0.0.1:8080` via SSH tunnel).
- Operator checklist, evidence list, CorpFlow ↔ ERPNext field mapping.
- Synthetic sample row in `templates/erpnext-lead-rescue-paid-pilot-rehearsal-sample.csv`.

### 3.2 Out of scope

- Cursor or any agent **accessing** the live ERPNext server.
- Server configuration, install/uninstall, DNS/TLS/SMTP, production shell changes.
- Real customer names, emails, phones, bank details, POP screenshots, or cockpit IDs in git.
- Automated ERPNext ↔ Postgres bridge (deferred until ≥4 pilots per integration roadmap).
- Submitting a **real** Sales Invoice on production shell (`127.0.0.1:8081`) without separate authorization.

### 3.3 Rehearsal first, real buyer second

| Phase | When | ERPNext instance | Customer data |
| ----- | ---- | ---------------- | ------------- |
| **A — Synthetic rehearsal** | Same day as this runbook; before first real pro-forma | **Sandbox only** | Fictional only (see CSV template) |
| **B — First real paid pilot** | Only after §11 go/no-go **GO** + Anton posts approval on #249 | Sandbox for records **until** Phase D opens; buyer PDF = manual template **or** sandbox PDF only if branding is acceptable | Real buyer — **never** committed to repo |

---

## 4. ERPNext objects required

Use **existing sandbox objects** where present; create rehearsal-only records with `REH-` prefix.

| Object | Sandbox reference | Rehearsal / real pilot value |
| ------ | ----------------- | ---------------------------- |
| **Customer** | New: `REH-CFLR-BUYER-01` | Business legal/trading name, contact, email, phone, Country = Mauritius |
| **Item** | Existing: `SBX-LR-SETUP-USD-150` | Name verbatim: *AI Lead Rescue Setup (USD 150 pilot)*; rate **USD 150** |
| **Quotation** | New series e.g. `REH-QUO-2026-001` | Pre-payment pro-forma record; **Path A** per production readiness eval (Quotation, not submitted Sales Invoice) |
| **Sales Invoice** | Created **after** POP verified (convert from Quotation or new) | Post-verification commercial record; submit only when deliberately exercising GL |
| **Payment Entry** | Manual Receive / Wire Transfer | Marks invoice **Paid** only after Anton verifies **cleared funds** (rehearsal: fictional wire ref) |

**Verbatim footer wording (buyer-facing PDF or email body):** W1–W5 from `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` §1 — must appear on any document sent to a real buyer regardless of ERPNext PDF status.

---

## 5. Exact rehearsal steps

**Time budget:** 45–90 minutes. **Host:** SSH to `corpflow-exec-01-u69678`, tunnel sandbox `8080` (see `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md`).

### 5.0 Pre-flight (5 min)

- [ ] Confirm SSH session on exec-01; sandbox containers healthy.
- [ ] Open ERPNext sandbox UI (not production shell on `8081` unless Anton explicitly extends scope).
- [ ] Open synthetic CSV template locally — do not commit populated rows.
- [ ] Confirm no real client names in clipboard/screenshots.

### 5.1 CorpFlowAI side — synthetic intake mirror (10 min)

Rehearse the control-plane path **without** a real submission:

- [ ] Walk through `https://corpflowai.com/lead-rescue` fields mentally or with fake values **off-repo** only.
- [ ] Note the fields you would copy into ERPNext Customer: business name, contact name, email, phone (`AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` §3).
- [ ] Placeholder CorpFlow lead reference: `REH-LEAD-2026-001` (not a real `leads.id`).
- [ ] On a **real** pilot, buyer submits intake → cockpit opens at `/admin/lead-rescue/[id]` — rehearsal skips live intake.

### 5.2 ERPNext — Customer (5 min)

- [ ] **Selling → Customer → New**
- [ ] Customer Name: `Rehearsal Property Co — CFLR-DRY-RUN` (or CSV template values)
- [ ] Customer Type: Company
- [ ] Country: Mauritius
- [ ] Email / mobile: synthetic (`rehearsal.buyer@example.invalid`)
- [ ] Notes (internal): `CorpFlow lead ref: REH-LEAD-2026-001 | REHEARSAL ONLY — not a real client`
- [ ] Save

### 5.3 ERPNext — confirm Item (2 min)

- [ ] **Stock → Item →** open `SBX-LR-SETUP-USD-150`
- [ ] Confirm rate USD 150; service item; name matches brand doctrine
- [ ] Do not create a duplicate item unless sandbox item is missing

### 5.4 ERPNext — Quotation / pro-forma (10 min)

- [ ] **Selling → Quotation → New**
- [ ] Customer: rehearsal customer from §5.2
- [ ] Item: `SBX-LR-SETUP-USD-150`, qty 1, rate USD 150
- [ ] In **Terms / Notes** (or custom footer field if configured), paste W1–W5 verbatim from manual pro-forma template §1
- [ ] Naming: note quotation ID (e.g. `REH-QUO-2026-001`) — paste into rehearsal log
- [ ] **Save**; optional: **Submit** quotation (does not post GL)
- [ ] Optional: Print / PDF preview — if PDF shows **CorpFlowAI Sandbox**, do **not** send to any real email; record gap for real pilot (use manual pro-forma for buyer)

### 5.5 POP simulation — do not mark Paid early (10 min)

- [ ] Set deal status (private notes): `POP received (synthetic)` — e.g. fake ref `REH-WIRE-2026-001`
- [ ] **Do not** create Payment Entry yet — rehearse the hold discipline
- [ ] Confirm cockpit/commercial card would stay `payment_status = pending` until verification

### 5.6 ERPNext — Sales Invoice + Payment Entry (15 min)

After rehearsing “cleared funds verified”:

- [ ] **Convert Quotation → Sales Invoice** (or create matching Sales Invoice draft then submit per Phase C pattern)
- [ ] Submit Sales Invoice (sandbox GL — acceptable for rehearsal)
- [ ] **Accounting → Payment Entry → New**
  - Payment Type: Receive
  - Party: rehearsal Customer
  - Mode: Wire Transfer
  - Reference No: `REH-WIRE-2026-001` (synthetic)
  - Reference Date: today
  - Allocate to Sales Invoice USD 150
  - Paid to: sandbox MU bank account per Phase C (`Mauritius Domestic Bank - Main - CFS` or equivalent)
- [ ] Submit Payment Entry → confirm invoice status **Paid**

### 5.7 CorpFlowAI cockpit mirror (10 min)

On a **real** pilot after payment verified:

- [ ] Open `/admin/lead-rescue/[id]` → Commercial card: `payment_status = paid`, `invoice_reference = REH-QUO-2026-001` (or ERPNext doc name)
- [ ] Status → `PAID_SETUP`; start 13-item checklist (`AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`)
- [ ] Activity log: `payment_confirmed_manual` — no bank digits
- [ ] Rehearsal: tick through checklist on paper only

### 5.8 Delivery + proof (5 min — pointer only)

- [ ] Delivery runs in cockpit + Google Sheet — **not** in ERPNext
- [ ] Proof capture: `docs/lead-rescue/FIRST_PAID_PILOT_FULFILMENT_EVIDENCE_CHECKLIST.md`
- [ ] `/change` applies to **client site change work** (Lux/CMP), not the Lead Rescue 48h setup wedge

### 5.9 Rehearsal close (5 min)

- [ ] Complete §6 evidence checklist (operator-held)
- [ ] Run §11 go/no-go self-assessment
- [ ] Post one-line STATUS to #249: *"ERPNext rehearsal PASS/FAIL — sandbox synthetic — no real client data"*

---

## 6. What to screenshot / evidence (operator-held only)

Capture **locally** or in private notes — **do not commit to git** or paste into #249 with PII.

| # | Evidence | Pass criterion |
| - | -------- | -------------- |
| E1 | Customer record showing `REH-` / `CFLR-DRY-RUN` naming | Synthetic name visible |
| E2 | Quotation with USD 150 line + W1–W5 in notes/footer | Wording readable |
| E3 | Quotation PDF preview (if generated) | Note whether header says Sandbox — drives real-pilot PDF decision |
| E4 | Sales Invoice submitted + Paid status | Matches Phase C pattern |
| E5 | Payment Entry with synthetic `reference_no` only | No real bank account numbers in screenshot |
| E6 | CorpFlow commercial-field mock-up (spreadsheet or redacted cockpit) | Shows ERPNext doc cross-ref field |
| E7 | Rehearsal timing | Start/end UTC; total minutes |

---

## 7. What not to store in GitHub

Never commit or PR:

- Real client legal names, emails, phones, addresses, BRN
- Bank account numbers, SWIFT/IBAN, POP screenshots, transaction IDs
- Real `/admin/lead-rescue/[id]` URLs with live lead IDs tied to identifiable buyers
- ERPNext admin passwords, site config, DB connection strings
- Populated rehearsal CSV rows that accidentally use real data
- Buyer-facing PDFs sent to real inboxes

---

## 8. What not to store in ERPNext

Even on sandbox — minimize sensitive data:

| Do not enter | Why |
| ------------ | --- |
| Real bank account numbers / SWIFT / IBAN on Company or Payment Request | Export/backup risk; payment instructions stay separate email (W1) |
| Full POP images with payer account details | Use operator private storage (`MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` §3.5) |
| Card numbers, CVV, OTPs | Forbidden everywhere |
| Clinical, payroll, or government-ID data | Out of pilot scope |
| Production CorpFlow secrets or API keys | Never |

**Rehearsal residue:** prefer clearly named `REH-*` / `CFLR-DRY-RUN` records; optional cleanup by cancelling rehearsal docs after evidence captured (sandbox only).

---

## 9. CorpFlowAI control-plane mapping

```text
Warm prospect (Sheet / outreach)
    → /lead-rescue intake (Postgres lead + automation event)
    → /admin/lead-rescue/[id] (qualification, commercial card, status pipeline)
    → ERPNext sandbox (Customer → Quotation → SI → Payment Entry)  ← finance spine
    → Manual POP verify (Anton bank app — outside both systems)
    → PAID_SETUP + onboarding runbook (cockpit checklist + Sheet + alerts)
    → Fulfilment evidence checklist (private proof)
    → Optional public proof (client permission)
```

| CorpFlow surface | Role | ERPNext link field |
| ---------------- | ---- | ------------------ |
| `/lead-rescue` | Buyer intent capture | Copy prospect fields → Customer |
| `/admin/lead-rescue/[id]` Card 1 | Prospect review | Source for Customer create |
| `/admin/lead-rescue/[id]` Card 2 | `invoice_reference`, `payment_status`, `payment_route` | Quotation / SI name; Paid after Payment Entry |
| `/admin/lead-rescue/[id]` Card 3 | Status pipeline | `QUOTE_SENT` → `PAYMENT_PENDING` → `PAID_SETUP` |
| `/admin/lead-rescue/[id]` Card 4 | 13-item delivery checklist | No ERPNext object — operator delivery |
| `/change` + CMP tickets | Client site changes (Lux etc.) | Not used for Lead Rescue wedge delivery |
| Fulfilment evidence checklist | Proof discipline | ERPNext invoice ref may appear in private notes only |

**Deal desk alignment:** stages `PROFORMA_SENT` → `POP_VERIFIED` → `PAYMENT_VERIFIED` → `SERVICE_STARTED` in `MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md` map to ERPNext + cockpit updates in parallel.

---

## 10. Failure / rollback path

| Failure | Immediate action | Rollback |
| ------- | ---------------- | -------- |
| Cannot reach sandbox UI | Fix SSH tunnel / Docker per `ERPNEXT_SANDBOX_INSTALL.md`; **stop** — do not use production shell as substitute without #249 approval | None |
| Item `SBX-LR-SETUP-USD-150` missing | Do not invent production item; restore sandbox or recreate per sandbox plan §2.3 | N/A |
| Quotation PDF shows wrong company name | Expected on sandbox — for **real** buyer use manual pro-forma template for external send; ERPNext record stays internal | Cancel mistaken email if sent |
| Payment Entry created before POP verify | **Cancel** Payment Entry in sandbox; reset invoice; rehearse hold again | Document in rehearsal log |
| Accidental real client data entered | Stop; redact/correct in ERPNext; rotate any exposed refs; do not commit screenshots | Operator incident note private |
| GL / FX confusion | Do not proceed to real pilot ERP path; accountant question first | Leave rehearsal docs in draft |

**Real pilot rollback:** if ERPNext record wrong but payment truly received — fix ERPNext under accountant guidance; delivery in cockpit continues if POP verified.

---

## 11. Go / no-go — use ERPNext on first **real** paid pilot

All must be **GO** before ERPNext is used alongside a real buyer (sandbox records + manual or acceptable PDF to buyer):

| # | Criterion | GO | NO-GO |
| - | --------- | -- | ----- |
| G1 | Synthetic rehearsal §5 completed same day or previous business day | ✓ | Skip ERP for pilot — manual pro-forma + Sheet only |
| G2 | Anton posted **GO** on #249 for hybrid path | ✓ | Hold |
| G3 | Buyer submitted real `/lead-rescue` intake; cockpit record exists | ✓ | No ERP Customer for anonymous prospect |
| G4 | W1–W5 on buyer-facing document (manual or ERP PDF) | ✓ | Do not send |
| G5 | Buyer-facing PDF does **not** show *CorpFlowAI Sandbox* or wrong legal entity | ✓ | Use manual pro-forma for buyer; ERP internal only |
| G6 | POP verified in bank — not screenshot alone | ✓ | No Payment Entry; no `PAID_SETUP` |
| G7 | Payment instructions sent **separately** (W1) | ✓ | Hold send |
| G8 | Operator accepts sandbox GL for first pilot **or** Phase D opened | ✓ (sandbox) | Wait for accountant if uncomfortable |

**Default if any NO-GO:** run pilot on **CorpFlowAI + manual pro-forma** only; ERPNext optional internal note after pilot 1 cashflows.

---

## 12. Cross-references

- `docs/operations/ERP_BACKBONE_DECISION_AUDIT_V1.md` — backbone decision
- `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` — POP + ERP minimum
- `docs/operations/MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md` — deal stages
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` — Phase D gates (still deferred)
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` — proven payment pattern
- `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` — W1–W5 + buyer PDF fallback
- `docs/lead-rescue/FIRST_PAID_PILOT_OPERATOR_PACK.md` — end-to-end pilot
- `docs/marketing/CORPFLOWAI_GROWTH_OPERATING_LOOP.md` — July outreach loop

---

## 13. Status block

- **Delivery state:** Local docs artefact — merge via PR; operator rehearsal pending Anton execution.
- **Implementation:** none in repo runtime; ERP steps are operator-run on sandbox only.
- **Verdict:** PARTIAL until Anton completes §5 rehearsal and posts #249 STATUS.
