# ERPNext current state audit — CorpFlowAI commercial launch

**Status:** Docs-only audit · **Updated:** 2026-08-11  
**Owner:** Anton  
**Anchor:** `<!-- ERPNEXT_CURRENT_STATE_AUDIT_V1 -->`

<!-- ERPNEXT_CURRENT_STATE_AUDIT_V1 -->

**2026-08-11 Cursor Cloud note (#893):** Infisical now holds `ERPNEXT_BASE_URL` / `ERPNEXT_API_KEY` / `ERPNEXT_API_SECRET` (CorpFlowAI Integration API identity). Fresh Cursor Cloud probe `bc-bf91d738-e441-4f12-807b-89a6a237521c` still **FAIL** — those secrets were **not injected** into the agent (`MASTER_ADMIN_KEY` only). See `docs/erpnext/ERPNEXT_API_ACCESS_PROBE_893.md`. #880/#881 remain blocked on a PASS re-probe.

Classification key:

| Class | Meaning |
| ----- | ------- |
| **LIVE AND VERIFIED** | Exercised end-to-end with evidence |
| **CONFIGURED BUT NOT VERIFIED** | Exists in sandbox/config but UI/PDF/buyer path not proven |
| **DOCUMENTED ONLY** | Canon exists; no runtime configuration |
| **MISSING** | Required for quote-to-cash; not present |
| **NEEDS_ANTON** | Blocked on operator/accountant decision |
| **OUT OF SCOPE** | Explicitly deferred or not in v1 programme |

**NO IMPLEMENTATION AUTHORIZED** by this audit.

---

## 1. Environment summary

| Environment | Host | Status | Use |
| ----------- | ---- | ------ | --- |
| Sandbox | `127.0.0.1:8080` on `corpflow-exec-01-u69678` | **LIVE AND VERIFIED** (Phase C) | Operator practice, synthetic rehearsal |
| Production shell | `127.0.0.1:8081` | **CONFIGURED BUT NOT VERIFIED** | Install runbook exists; not authorised for buyer docs |
| Production (public DNS) | TBD (`erp.corpflowai.com` proposed) | **MISSING** | Phase D MUST M-1 |

---

## 2. Capability matrix

### CRM & customer

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| Lead doctype | **CONFIGURED BUT NOT VERIFIED** | Mapped in evaluation; sandbox synthetic leads only |
| Opportunity doctype | **DOCUMENTED ONLY** | Stage transitions documented; not rehearsed for MUR sprints |
| Customer doctype | **LIVE AND VERIFIED** | Phase C: `Sandbox Client A/B - USD` created |
| Customer custom fields (BRN, etc.) | **MISSING** | S-Customer-Fields in production readiness eval |
| Lead → Customer conversion workflow | **DOCUMENTED ONLY** | Runbook written; MUR sprint path not sandbox-rehearsed |

### Quotation & sales order

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| Quotation (pro-forma path) | **CONFIGURED BUT NOT VERIFIED** | Recommended Path A; no PDF rendered in Phase C |
| Quotation Print Format ("Pro-forma invoice") | **MISSING** | M-Print not started |
| Sales Order | **OUT OF SCOPE** | MUR sprints are service projects; SO optional |
| Naming series `CFLR-QUO-*` | **MISSING** | M-Numbering not set |
| MUR-denominated Quotation | **MISSING** | Phase C USD-only; MUR items for sprints not in sandbox |

### Sales invoice

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| Deposit Sales Invoice (50%) | **DOCUMENTED ONLY** | Playbook rule; no MUR sprint item in sandbox |
| Balance Sales Invoice | **DOCUMENTED ONLY** | Closeout guide references |
| Sales Invoice PDF / Print Format | **MISSING** | Phase C did not exercise wkhtmltopdf path |
| Submitted SI → GL revenue posting | **LIVE AND VERIFIED** | Phase C cycles 1–2 (USD sandbox) |

### Payment & bank

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| Payment Entry (Receive) | **LIVE AND VERIFIED** | Phase C: `ACC-PAY-2026-00002`, `00003` |
| Payment Entry allocation to invoice | **LIVE AND VERIFIED** | Invoice status `Paid` in Phase C |
| `reference_no` + `reference_date` on bank PE | **LIVE AND VERIFIED** | Finding C-2 — process rule |
| Bank Reconciliation (arithmetic) | **LIVE AND VERIFIED** | Phase C cycle 3 — MUR 0.00 delta |
| Bank Reconciliation Tool UI | **CONFIGURED BUT NOT VERIFIED** | Arithmetic only; UI not invoked |
| Real (redacted) MU bank CSV import | **NEEDS_ANTON** | HB-4; NA-008 |
| MUR bank account ledger | **CONFIGURED BUT NOT VERIFIED** | Sandbox `Mauritius Domestic Bank - Main - CFS` |
| Modes of Payment (SBM MUR wire) | **MISSING** | Custom mode needed for production |

### Deposit & delivery release

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| Deposit verification checklist | **LIVE AND VERIFIED** | `docs/revenue/templates/deposit-received-manual-verification.md` |
| Bank clearance = Anton manual | **LIVE AND VERIFIED** | NA-006 standing approval |
| Delivery release gate (triple condition) | **DOCUMENTED ONLY** | Runbook + `DELIVERY_RELEASE_CHECKLIST.md` |
| Approval-to-proceed template | **LIVE AND VERIFIED** | `docs/revenue/templates/` |
| POP alone as clearance | **OUT OF SCOPE** | Explicitly rejected — not a valid gate |

### Project & delivery

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| Project + Task / WBS | **DOCUMENTED ONLY** | Playbook §8; not configured for MUR sprints |
| Production release milestone | **DOCUMENTED ONLY** | Template exists |
| CorpFlow preview URL linkage | **LIVE AND VERIFIED** | Tenant/Vercel preview surfaces |

### Receipt & closeout

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| Balance payment + final PE | **DOCUMENTED ONLY** | Phase C covers single payment; balance flow documented |
| Receipt / paid-in-full confirmation | **DOCUMENTED ONLY** | Closeout checklist |
| Maintenance / Contract (recurring) | **OUT OF SCOPE** | CAN-DEFER per production readiness §7.4 |

### CorpFlow app integration

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| `/change/revenue` cockpit | **LIVE AND VERIFIED** | `pages/change/revenue.js` — checklist + desk links |
| `/admin/rapid-delivery` operator desk | **LIVE AND VERIFIED** | Qualify + proposal summary APIs |
| CF-… reference generation | **LIVE AND VERIFIED** | `rapidDeliveryReferenceFromLeadId()` |
| Postgres lead intake (`corpflow-rapid-delivery`) | **LIVE AND VERIFIED** | `POST /api/tenant/intake` |
| ERPNext ↔ Postgres sync API | **MISSING** | Manual cross-reference only (`ERPNEXT_RECORD_MAPPING.md`) |
| `/admin/lead-rescue` (USD wedge) | **LIVE AND VERIFIED** | Separate funnel |

### Runbooks & docs

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| ERPNext-first evaluation | **LIVE AND VERIFIED** | `ERPNEXT_FIRST_REVENUE_OPERATING_SYSTEM_EVALUATION.md` |
| Production readiness evaluation | **LIVE AND VERIFIED** | Phase D gates documented |
| Sandbox Phase C findings | **LIVE AND VERIFIED** | Four cycles GREEN |
| Quote-to-cash runbook pack | **DOCUMENTED ONLY** | This PR — `docs/erpnext/*` |
| Mauritius POP flow | **LIVE AND VERIFIED** | `MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` |
| Sandbox install runbook | **LIVE AND VERIFIED** | Phase B-a executed |
| Production shell setup runbook | **DOCUMENTED ONLY** | Not executed |

### Accountant & compliance

| Capability | Class | Evidence / notes |
| ---------- | ----- | ---------------- |
| Accountant Read-Only role | **LIVE AND VERIFIED** | Phase C Option B — 11 tests GREEN |
| Accountant CoA review | **NEEDS_ANTON** | HB-2; NA-007 |
| VAT decision | **NEEDS_ANTON** | HB-3 |
| Phase D authorisation | **NEEDS_ANTON** | HB-1; NA-011 |
| W1–W5 footer on PDF | **MISSING** | Manual template only until M-Print |

---

## 3. Sandbox Phase C evidence summary

| Cycle | Result | Relevance to MUR sprints |
| ----- | ------ | ------------------------ |
| 1 — USD invoice + bank wire PE | ✅ Paid | Proves PE + FX path; MUR sprint uses MUR not USD |
| 2 — PayPal-style PE | ✅ Paid | Out of scope for MUR bank-transfer sprints |
| 3 — Bank recon arithmetic | ✅ MUR 0.00 | Proves recon logic; UI path still open |
| 4 — Accountant read-only | ✅ 11/11 | Production role replay required (M-9) |

---

## 4. Priority gaps for Wave 1 (manual path)

1. **MUR Item master** for three sprint offers — **MISSING** in any ERPNext environment
2. **Quotation Print Format** — **MISSING**; use manual quote email until M-Print
3. **Real bank CSV test** — **NEEDS_ANTON** (NA-008)
4. **Record mapping discipline** — **DOCUMENTED ONLY** until first prospect logged

---

## 5. Cross-references

- `docs/erpnext/CORPFLOWAI_QUOTE_TO_CASH_RUNBOOK.md`
- `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md`
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md`
- `docs/revenue/CORPFLOWAI_LAUNCH_NEEDS_ANTON.md`
