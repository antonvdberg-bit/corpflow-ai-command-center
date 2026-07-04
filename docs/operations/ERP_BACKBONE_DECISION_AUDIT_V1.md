# ERPNext vs Odoo — installed-backbone decision audit (v1)

**Status:** Docs-only decision memo. **No runtime, deploy, server, DB/schema, env/secrets, payment, outbound comms, or merge authorized by this document.**

**Owner:** Anton (operator decision). **Author:** Cursor (docs audit under Operator Bridge #249).

**Packet:** *ERPNext vs Odoo decision audit — installed-backbone reality check* (July 2026 revenue-readiness).

**Anchor sentinel:** `<!-- ERP_BACKBONE_DECISION_AUDIT_V1 -->`

<!-- ERP_BACKBONE_DECISION_AUDIT_V1 -->

**Created:** 2026-07-04.

**Hard limits honoured:** No ERPNext uninstall/install, no Odoo install, no server configuration, no runtime app code, no DB/schema, no env/secrets, no Vercel/GitHub settings, no payment tooling, no paid tools, no outbound comms, no deploy, no merge, no client/private data access.

**Canonical inputs inspected:**

| Area | Primary docs |
| ---- | ------------ |
| Agent / process canon | `AGENTS.md`, `docs/CORPFLOW_SHARED_TODO.md`, `docs/automation-framework.md` |
| ERPNext footprint | `docs/finance/ERPNEXT_*`, `docs/runbooks/ERPNEXT_*`, `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` |
| July revenue / Lead Rescue | `docs/marketing/CORPFLOWAI_GROWTH_OPERATING_LOOP.md`, `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md`, `docs/lead-rescue/FIRST_PAID_PILOT_OPERATOR_PACK.md`, `docs/revenue/*`, `docs/operations/MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md` |
| Payment / POP | `docs/finance/PAYMENT_READINESS_2026_06_01.md`, `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md`, `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` |
| Delivery / handoff | `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md`, `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`, `docs/lead-rescue/FIRST_PAID_PILOT_FULFILMENT_EVIDENCE_CHECKLIST.md` |
| Operator priorities | `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md` |
| CRM / integration posture | `docs/strategy/AI_LEAD_RESCUE_INTEGRATION_ROADMAP.md`, `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md` (Product A lane only) |

**Odoo repo footprint:** **Zero implementation docs.** One explicit non-goal: `docs/automation-framework.md` § *Explicit non-goals* — *"No Odoo/ERP replacement, no full CRM, no billing engine, no payment execution."*

---

## 1. Executive recommendation

**Do not replace ERPNext with Odoo for July 2026 or the first paid-pilot window.**

CorpFlowAI should:

1. **Run July revenue manually** on the already-canonical Mauritius warm-outreach + manual POP + manual pro-forma + `/admin/lead-rescue` cockpit path (**Option D for ERP timing**, which is what the repo already prescribes).
2. **Keep ERPNext installed** as the long-term **accounting / invoicing / reconciliation backbone** — activate production accounting **after** the first paying pilot cashflows and accountant hard-blockers close (**Option A deferred**, not discard).
3. **Continue Option C informally** — deal-desk stages, Google Sheets pre-intake CRM, cockpit delivery — without installing Odoo modules.

**Odoo does not create a material July revenue advantage** that outweighs migration distraction. The July bottleneck is **outreach + POP verification + 48-hour delivery**, not ERP choice.

---

## 2. Current ERPNext footprint in repo

### 2.1 What is installed (server reality, documented — not re-verified live in this audit)

| Instance | Host | Port / access | State per canon |
| -------- | ---- | ------------- | ----------------- |
| **Sandbox** | `corpflow-exec-01-u69678` | Loopback `127.0.0.1:8080` | Phase B install **executed**; Phase C cycles 1–4 **all green** (`docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md`) |
| **Production shell** | Same host | Loopback `127.0.0.1:8081` (`corpflowai-production.localhost`) | Recipe exists; Print Designer **v1.6.7 installed (PARTIAL)** per `docs/finance/ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md` — **no real client invoices, no GL posting on production, no public DNS/TLS** |

### 2.2 Repo documentation corpus (13 ERPNext-primary files)

| Category | Files |
| -------- | ----- |
| Plan / evaluation | `ERPNEXT_SANDBOX_PLAN_V1.md`, `ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md`, `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md`, `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md`, `ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md`, `ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md` |
| Runbooks | `ERPNEXT_SANDBOX_INSTALL.md`, `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md`, `ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md`, `ERPNEXT_PRINT_DESIGNER_*` (3 closure/editor packets) |
| Operating integration | `MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md`, cross-links in `AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md`, `AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` |

### 2.3 What ERPNext has already proven (sandbox)

Per Phase C evidence:

- USD 150 Sales Invoice → Payment Entry → GL trail (**Paid**)
- FX gain/loss on USD invoice / MUR bank receipt
- Synthetic bank CSV reconciliation to **MUR 0.00** delta
- Custom **Accountant Read-Only** role (11 sub-tests green)
- Item `SBX-LR-SETUP-USD-150` matches brand doctrine naming

**Not yet proven in sandbox or production shell:** buyer-facing branded PDF via Print Format (Phase C skipped PDF render); production Company/Letter Head; real bank CSV import; VAT posture.

### 2.4 Production go-live gates still open (Phase D)

From `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` — **four HARD BLOCKERS** before any production ERPNext accounting:

| Blocker | Owner |
| ------- | ----- |
| Phase D operator approval row (`JE-2026-05-29-1`) | Anton |
| Mauritius accountant CoA review in writing | Anton → accountant |
| VAT decision recorded in `JOURNAL.md` | Anton → accountant |
| Real (redacted) MU bank CSV reconciliation cycle | Anton + Cursor |

**Verdict already in canon:** *"Can ERPNext generate the first real pro-forma today? **No.** Manual PDF path is correct for first 1–3 paying pilots."*

### 2.5 What ERPNext is **not** in CorpFlow canon

- **Not** the pre-intake CRM (Google Sheet / private worksheet)
- **Not** the delivery cockpit (`/admin/lead-rescue/[id]`)
- **Not** Change Console / CMP delivery for client site work
- **Not** payment collection (manual POP; SBM international **Blocked P0** on control board)
- **Not** support ticketing (Freshdesk feasibility doc is separate lane)

---

## 3. Current paid-client value chain map

End-to-end chain for **AI Lead Rescue USD 150 Mauritius warm-network pilot** (July-critical path):

```text
Lead → CRM → Qualification → Quote/pro-forma → Invoice/POP → Onboarding →
Requirements → Delivery tasks → Client review → Deployment/evidence → Follow-up/proof
```

| Stage | System of record (today) | ERPNext role |
| ----- | ------------------------ | ------------ |
| **Lead** | Warm outreach worksheet / `artifacts/*` template → Google Sheet; intake at `https://corpflowai.com/lead-rescue` | Optional Lead → Customer (sandbox doc only) |
| **CRM (pre-intake)** | Private Google Sheet; cockpit **explicitly not** pre-intake CRM (`AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md`) | None by design |
| **Qualification** | 15-min discovery call; cockpit status pipeline (`NEW_INTAKE` → …) | None |
| **Quote / pro-forma** | **Manual template** `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (W1–W5 verbatim) — **canonical** | Future Quotation + Print Designer PDF — **not production-ready** |
| **Invoice / payment / POP** | Deal desk stages `PROFORMA_SENT` → `POP_VERIFIED` (`MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md`); manual bank verification by Anton | Optional Sales Invoice + Paid status after verification — operator-run |
| **Onboarding** | `AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` — 48h checklist | Notes/attachments only (optional) |
| **Requirements** | Cockpit Cards 1–4; buyer info via WhatsApp/email | None |
| **Delivery project / tasks** | Cockpit 13-item setup checklist; Google Sheet lead log; operator Telegram alerts | None (ERPNext Projects not in scope) |
| **Client review / approval** | Buyer handover message; Change Console for **site change work** (Lux / CMP), not Lead Rescue pilot | None |
| **Deployment / evidence** | `FIRST_PAID_PILOT_FULFILMENT_EVIDENCE_CHECKLIST.md`; delivery-reality audit for app changes | None |
| **Follow-up / proof** | Activity log; `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`; 7-day monitoring | None |

**July-critical path:** rows through **Quote/POP/Onboarding/Delivery** run **without ERPNext production**. Growth loop (`CORPFLOWAI_GROWTH_OPERATING_LOOP.md`) explicitly excludes *"new CRM, new database"* and targets **one paying pilot** via warm manual outreach.

---

## 4. ERPNext coverage

### 4.1 Covered well (once Phase D completes — estimated 4–6 weeks after pilot 1, per production readiness eval)

| Capability | ERPNext module / artifact | Readiness |
| ---------- | ------------------------- | --------- |
| Customer master | Customer doctype | Sandbox proven; production not started |
| Service catalog | Item `LR-SETUP-USD-150` (production naming) | Sandbox item exists; production item not created |
| Pre-payment document | Quotation (renamed pro-forma via Print Format) | Designed; template build **HELD** pending authorisation |
| Post-payment invoice | Sales Invoice + Payment Entry | Sandbox proven |
| FX / multi-currency | Exchange Gain/Loss | Sandbox proven |
| Bank reconciliation | Bank Reconciliation Tool + CSV import | Synthetic CSV green; **real CSV = hard blocker** |
| Accountant oversight | Custom read-only role | Sandbox green; must replay on production |
| Audit trail for revenue recognition | GL + submitted invoices | Sandbox only |

### 4.2 Partially covered / transitional

| Capability | Gap |
| ---------- | --- |
| Branded PDF pro-forma | Print Designer installed PARTIAL; manual Word/Pages path **canonical until AC-1..AC-11 pass** |
| Payment instructions | By design **separate email**, not on PDF (W1) — ERPNext mirrors this, does not automate collection |
| Mauritius VAT | W5 *"pending accountant confirmation"* — no VAT activation in sandbox |

### 4.3 Not covered (and not intended to be ERPNext in current canon)

| Capability | Canonical alternative |
| ---------- | --------------------- |
| Pre-intake pipeline / outreach cadence | Google Sheet + operator pack |
| Lead capture + operator alerts | CorpFlow app + n8n notify-only forward |
| Delivery operations | `/admin/lead-rescue` cockpit |
| Client site delivery / PR / preview | CMP + Change Console |
| Buyer lead log | Google Sheet (Tab 1 / Tab 2) |
| Support tickets | Freshdesk feasibility (separate; not activated) |
| Online card checkout | SBM e-Commerce **Blocked**; manual POP only for Mauritius warm network |

---

## 5. Odoo possible advantages

**Evidence basis:** industry-standard Odoo capability map + CorpFlow gap analysis. **No Odoo sandbox, install doc, or operator workflow exists in this repo.**

### 5.1 Where Odoo could theoretically help

| Area | Odoo advantage vs ERPNext |
| ---- | ------------------------- |
| **CRM pipeline** | Native pipeline stages, activities, lost reasons — closer to "deal desk in one UI" than ERPNext CRM |
| **Quotation → SO → Invoice** | Single product UI for sales documents; less Frappe/Print Designer friction |
| **Project / tasks** | Project app for delivery checklists and milestones |
| **Helpdesk** | Built-in ticket app (vs separate Freshdesk evaluation) |
| **Website / eCommerce** | Optional — **not needed** for current single-offer manual-intake wedge |
| **All-in-one operator UX** | One login for sales + delivery + accounting — appealing for a one-operator business **if** fully configured |

### 5.2 Community (free) vs Enterprise (paid) — honest split

| Capability | Odoo Community (typical) | Likely Enterprise / paid / hosting cost |
| ---------- | ------------------------ | --------------------------------------- |
| CRM, Sales, Invoicing (basic) | Yes | — |
| Accounting (full localization) | Basic; Mauritius localization may need customization or partner | Localisation packs, accountant-grade reports often paid/partner-led |
| Studio / advanced automation | No | Enterprise |
| Helpdesk (modern) | Limited vs Enterprise Helpdesk | Enterprise |
| Sign, Documents, Marketing automation | No / limited | Enterprise apps |
| Multi-company advanced | Partial | Enterprise features |
| **Hosting** | Self-host (operator labour) or Odoo.sh / partner hosting | Recurring cost; Anton standing rule: **no new paid tools without approval** |
| **Implementation time** | Not free — operator + migration cost | Partner implementation fees |

**CorpFlow-relevant read:** Odoo's "free Community" does **not** eliminate setup time, Mauritius accounting review, PDF branding, bank reconciliation testing, or the distraction of replacing an already-installed ERPNext stack.

### 5.3 What Odoo does **not** solve for July

| July blocker | Odoo impact |
| ------------ | ----------- |
| SBM international card collection unresolved | **None** — still manual POP for warm Mauritius |
| No paying pilot yet | **None** — outreach discipline is the constraint (`CORPFLOWAI_GROWTH_OPERATING_LOOP.md`) |
| Delivery proof | Still requires cockpit + Sheet + operator work — not ERP |
| Accountant sign-off | **Same** hard blocker — new system = new CoA review |
| Tenant site delivery | Still CMP/Vercel — Odoo does not replace Change Console |

---

## 6. Switching-cost and risk assessment

### 6.1 What would be lost if ERPNext is removed now

| Loss | Severity |
| ---- | -------- |
| Phase C validated accounting flows (USD invoice, FX, reconciliation) | **High** — months of sandbox work discarded |
| Print Designer install + CFLR pro-forma design brief + build runbook | **High** — sunk docs + partial production shell |
| Accountant review pack aligned to ERPNext/Frappe | **Medium** — restart accounting evaluation |
| 13 ERPNext-specific runbooks and JE decision trail | **Medium** — rewrite for Odoo |
| Operator learning on Frappe bench/Docker on `corpflow-exec-01` | **Medium** |
| Parallel sandbox as test bed | **Medium** |

### 6.2 Switching cost estimate (Odoo replace)

| Cost dimension | Realistic range |
| -------------- | ----------------- |
| **Time to first real Odoo pro-forma** | 2–4+ weeks minimum (install, CoA, template, accountant, bank recon test) — comparable to ERPNext Phase D, **starting from zero** |
| **July revenue distraction** | **Severe** — replaces outreach/setup hours with migration |
| **Risk** | New failure modes (Mauritius tax localisation, hosting, backup, server capacity on exec-01) |
| **Doctrine conflict** | `automation-framework.md` non-goal; no authorised Odoo packet |
| **Security / boundary** | New self-hosted app on exec-01 requires same § 5.5 carve-out discipline as Kuma — **not authorised** |

### 6.3 Switching benefit for July

**Not material.** First pilot canon already runs with manual pro-forma and does not require any ERP for cash collection or delivery.

---

## 7. July revenue readiness path

**Fastest path to July revenue (repo-grounded sequence):**

| # | Action | Owner | Doc |
| - | ------ | ----- | --- |
| 1 | Run warm outreach loop (3–7 manual messages / 10-day sprint) | Anton | `CORPFLOWAI_GROWTH_OPERATING_LOOP.md` §15 |
| 2 | Score prospects; discovery call | Anton | `FIRST_PAID_PILOT_OPERATOR_PACK.md`, discovery script |
| 3 | Buyer submits `/lead-rescue` intake | Buyer | Live production intake |
| 4 | Send **manual pro-forma** + payment instructions **separately** | Anton | `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` |
| 5 | Verify **cleared funds** (POP ≠ paid) | Anton | `MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md` §2 |
| 6 | Deliver 48h setup + 7-day monitoring | Anton | `AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` |
| 7 | Capture fulfilment evidence (private) | Anton | `FIRST_PAID_PILOT_FULFILMENT_EVIDENCE_CHECKLIST.md` |
| 8 | **Optional parallel:** record paid customer in ERPNext **sandbox** for operator practice | Anton | `MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` §2 — **not blocking** |

**Explicitly not on July critical path:**

- ERPNext production go-live (Phase D blockers open)
- Odoo install/evaluation
- SBM card gateway (P0 **Blocked** on control board)
- CRM bake-off (Twenty/EspoCRM — Product A lane; deferred until ≥4 pilots per First Paid Pilots §13)
- Freshdesk activation

**Success metric for July:** one **paying USD 150 pilot delivered** with honest evidence — not ERP completeness (`CORPFLOWAI_GROWTH_OPERATING_LOOP.md` §1).

---

## 8. Decision options A / B / C / D

| Option | Description | July revenue | Risk | Repo alignment |
| ------ | ----------- | ------------ | ---- | -------------- |
| **A — Keep ERPNext, use now** | Production ERPNext for pro-forma/invoicing immediately | **Slow** — Phase D blockers + Print Designer HELD | Medium — rushing accounting before accountant sign-off | Partial — capability exists in sandbox; production **not authorised** |
| **B — Replace with Odoo** | Uninstall ERPNext; install/configure Odoo | **Harmful** — 2–4+ week migration during outreach window | **High** — sunk ERPNext work + no Odoo foundation in repo | **Contradicts** automation-framework non-goals; zero Odoo docs |
| **C — Keep ERPNext; copy Odoo-style processes** | Manual deal desk + Sheets + cockpit; ERPNext for accounting when ready | **Fast** — already documented | **Low** — no new platform | **Strong** — matches `MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md`, sales handoff, integration roadmap |
| **D — Defer ERP; run July manually** | Manual pro-forma only; ERP decision after pilot 1 | **Fastest** — current canonical path | **Lowest** | **Strong** — `AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md`, production readiness eval §1 |

**Combined recommendation:** **D for July execution** + **C for operating model** + **A for post-pilot accounting backbone** (not B).

**Operator follow-up (2026-07-04):** Anton closed the Odoo debate on #249 — **hybrid model**: ERPNext sandbox as finance/commercial spine for the first paid pilot; CorpFlowAI as lead/intake/delivery/proof control plane; full production rollout still deferred. Same-day rehearsal: `docs/operations/ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md`.

---

## 9. Recommendation with confidence score

| Recommendation | Confidence | Rationale |
| -------------- | ---------- | --------- |
| **Do not replace ERPNext with Odoo** | **92%** | No repo authorisation; sunk Phase C + Print Designer work; Odoo adds no July POP/outreach advantage; explicit automation-framework non-goal |
| **Defer ERP production until after first paying pilot + accountant blockers** | **90%** | Already stated in `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` and manual pro-forma canon |
| **Execute July on manual path + warm outreach** | **95%** | Entire July doc stack points here; growth loop created 2026-07-03 for this purpose |
| **Keep ERPNext installed; do not uninstall** | **88%** | Best-fit accounting/reconciliation backbone for Mauritius CoA + SBM CSV recon when ready |

**Decision standard applied:** Odoo replacement **fails** — it does not show material July revenue advantage outweighing migration distraction.

---

## 10. Next 48 hours if ERPNext is retained (recommended)

**Scope:** Retain installed ERPNext; **do not** start Phase D production accounting without closing HB-1..HB-4. July revenue work takes priority.

| Window | Anton (operator) | Cursor (if dispatched — docs/process only) |
| ------ | ---------------- | ------------------------------------------ |
| **0–4 h** | Run **same-day synthetic rehearsal** per `ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md` §5 (sandbox only) | None |
| **4–24 h** | Pick 1–3 warm names; worksheet scoring (`FIRST_OUTREACH_CANDIDATE_WORKSHEET.md`); send **one** manual outreach message | None |
| **24–48 h** | Follow up warm threads; book discovery if reply; ensure manual pro-forma template locally populated (W1–W5) | Optional: post STATUS to #249 with rehearsal PASS/FAIL |

**ERPNext-specific:**

- [ ] Complete rehearsal checklist + §11 go/no-go before using ERPNext on a **real** buyer.
- [ ] **Do not** issue buyer-facing PDF from sandbox if header shows *CorpFlowAI Sandbox* — use manual pro-forma for external send.
- [ ] **Do not** execute `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` or CFLR template build without separate #249 `AUTHORISE` decision.

---

## 11. Next 48 hours if Odoo were chosen (not recommended — for completeness)

**Status: BLOCKED** — would violate packet hard limits and repo non-goals without a new authorisation packet.

If Anton ever reopens this against advice, minimum sequence would be:

| Step | Reality check |
| ---- | ------------- |
| Odoo evaluation packet on #249 | Not drafted; requires Anton `AUTHORISE` |
| Server capacity / boundary review | Same exec-01 box; new carve-out risk |
| Mauritius accountant engagement | Restart — no Odoo CoA pack in repo |
| Parallel run during July outreach | **Unrealistic** for one operator |

**Honest 48h outcome if Odoo chosen:** zero July revenue progress; ERPNext left in ambiguous half-state.

---

## 12. What must not be custom-built anymore

Per `AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` §13, `AI_LEAD_RESCUE_INTEGRATION_ROADMAP.md`, and `automation-framework.md`:

| Do not build (now) | Why |
| ------------------ | --- |
| **Full / multi-tenant CRM** | NO-GO per First Paid Pilots §13; cockpit is delivery-only |
| **Odoo or second ERP** | Non-goal; ERPNext already installed for accounting lane |
| **ERPNext ↔ intake automation bridge** | Deferred until ≥4 paying pilots (`ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` §2 Q1.4) |
| **Self-serve checkout / Stripe on page** | Held; manual pro-forma canonical |
| **Payment gateway before SBM resolution** | P0 Blocked on control board |
| **Bulk email / WhatsApp / cold scrape engines** | Doctrine-forbidden for first pilots |
| **Chatbot expansion as moat** | Below-the-line; separate audit; not authorised |
| **Custom billing engine in CorpFlow app** | automation-framework non-goal |
| **Replacing Google Sheet lead log with custom CRM UI** | First-pilot scope is Sheet by design |
| **Freshdesk / support portal** | Feasibility only; not July-critical |

**Do build / do run (manual):** warm outreach, discovery, manual pro-forma, POP verification, cockpit checklist, Sheet lead log, fulfilment evidence.

---

## 13. Audit question index (research checklist)

| # | Question | Short answer |
| - | -------- | ------------ |
| 1 | What have we documented/built around ERPNext? | 13+ docs; sandbox Phase C green; production shell + Print Designer PARTIAL; runbooks for pro-forma template |
| 2 | What is ERPNext intended to do? | Accounting backbone: Customer, Item, Quotation/Invoice, Payment Entry, bank recon — **not** CRM or delivery |
| 3 | Modules/processes using or planned? | Using: sandbox accounting tests. Planned: production Quotation PDF, Sales Invoice, SBM ledger, accountant read-only |
| 4 | Paid-client value chain covered? | **Quote/payment accounting only** (when Phase D done); rest is app + Sheets + cockpit |
| 5 | Missing even with ERPNext? | CRM, outreach, delivery ops, POP collection, support desk, online checkout, CMP delivery |
| 6 | Lost if ERPNext removed? | Phase C proof, Print Designer work, accountant pack alignment, runbooks, operator Frappe familiarity |
| 7 | Odoo adds what ERPNext lacks? | Stronger native CRM/pipeline/helpdesk/project UX in one product |
| 8 | Odoo Community vs paid? | CRM/sales/invoicing basics free self-host; Mauritius accounting localisation, enterprise helpdesk, hosting, partner = cost/labour |
| 9 | Switching cost? | 2–4+ weeks; July distraction; high risk; no repo foundation |
| 10 | Fastest July revenue path? | Manual warm outreach + POP + pro-forma + cockpit delivery (**no ERP production required**) |

---

## 14. Delivery verdict (this document)

```text
Delivery Reality Audit (docs packet only):
- Local fix exists: YES (this memo)
- Merged to main: NO (awaiting Anton review / PR)
- Production deployment ID: n/a (docs-only)
- Commit deployed: n/a
- Live URLs tested: n/a (no runtime change)
- Expected vs actual result: Decision memo complete; no production behavior change
- Client-facing flow usable: unchanged
- Final verdict: PARTIAL (docs complete; operator decision + optional PR merge pending)
```

---

## 15. Cross-references

- `docs/operations/ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md` — same-day sandbox rehearsal + go/no-go for first real pilot
- `docs/operations/templates/erpnext-lead-rescue-paid-pilot-rehearsal-sample.csv` — synthetic field template
- `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` — ERPNext minimum + POP sequencing
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` — Phase D gates
- `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` — Friday-safe manual path
- `docs/marketing/CORPFLOWAI_GROWTH_OPERATING_LOOP.md` — July outreach operating loop
- `docs/lead-rescue/FIRST_PAID_PILOT_OPERATOR_PACK.md` — end-to-end pilot path
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md` — SBM P0 Blocked; ERP docs P2
- `docs/automation-framework.md` — explicit non-goals (no Odoo/ERP replacement)
- `docs/strategy/AI_LEAD_RESCUE_INTEGRATION_ROADMAP.md` — what not to build before 4 pilots
