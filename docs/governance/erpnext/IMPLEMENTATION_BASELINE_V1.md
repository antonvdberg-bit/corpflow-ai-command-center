# ERP Strategy v2 — implementation baseline v1

**Status:** Decision-ready baseline (docs / evidence reuse only).  
**Source issue:** [#967](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/967)  
**Parent programme:** [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)  
**Approved doctrine:** [`VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md) — `APPROVED — VERSION 2`  
**Date (UTC):** 2026-08-16  
**Owner:** Anton (decisions and protected actions); Cursor Factory (this baseline)  
**Environment:** `local` (docs/governance only). Evidence cited below may come from `corpflow_test` hosted ERPNext. This packet does **not** change any live host.  
**Anchor:** `<!-- ERPNEXT_STRATEGY_V2_IMPLEMENTATION_BASELINE_V1 -->`

<!-- ERPNEXT_STRATEGY_V2_IMPLEMENTATION_BASELINE_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: local
GitHub state refreshed: YES
Source item: #967
```

**NO IMPLEMENTATION AUTHORIZED** beyond this baseline record. This file does **not** authorize accounting/tax/bank mutation, bulk migration, schema/custom DocTypes, env/secrets change, live send, paid actions, public exposure change, or merge.

---

## 0. Verdict

```text
ERP STRATEGY V2 IMPLEMENTATION BASELINE READY
```

This verdict means Anton and agents now have one place that says **where implementation stands**, **what is proven versus assumed**, **what comes next**, **who owns each gap**, and **which exact protected approvals remain**. It does **not** mean ERPNext is approved as the irreplaceable business-critical system of record, and it does **not** mean Prestige or any real quotation may be sent.

| Question | Answer now |
|----------|------------|
| Is Strategy v2 approved? | **Yes.** Anton 2026-08-14 12:54 +04:00. Evidence: [#954 comment 5291438473](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5291438473); merged [PR #957](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/957); status recorded by merged [PR #961](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/961). |
| Is ERPNext formally approved for business-critical use? | **Not yet.** [#959](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/959) has no verdict PR. |
| Are backup / DR / security proven? | **No.** [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956) / merged [PR #958](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/958): **NOT PROVEN**. |
| Can Prestige quotation work continue? | **Yes — fast lane stays open.** Do not wait for this programme. See §6. |
| What must Anton do because of *this* packet? | **Merge this PR when satisfied.** No other Anton action is created by the baseline itself. |

---

## 1. How to read this file

| Mark | Meaning |
|------|---------|
| **DONE** | Merged and/or live read-back evidence exists for that exact requirement. |
| **PARTIAL** | Real progress exists, but a material gap remains. |
| **NOT STARTED** | No merged/runtime evidence for that requirement. An open issue alone is not DONE. |
| **REQUIRES DECISION** | Cursor cannot close this from repo/API evidence. Anton, accountant, or provider must choose. |

**Proven** = GitHub merge, live ERPNext read-back, or a dated audit probe. **Assumed** = older docs, vendor-typical behaviour, or an open issue with no evidence packet.

Do **not** treat Vercel “Production” or a CorpFlowAI-hosted URL as `client_production`. Current ERPNext commercial work is **`corpflow_test`**.

`#966` will create the remaining #954 registers and the internal ERPNext programme Project. This file is the **implementation status baseline**. Do not copy Strategy v2 into those registers.

---

## 2. Executive roll-up

### 2.1 Phase 0–10 status

| Phase | Title | Roll-up | What is actually true |
|------:|-------|---------|------------------------|
| 0 | Programme charter and decision record | **PARTIAL** | Strategy and gates are approved. Decision/risk/control registers and the ERPNext programme Project are still missing (`#954` / `#966`). |
| 1 | Environment and platform baseline | **PARTIAL** | Three ERPNext surfaces are documented. Versions are known. Security/backup/DR are **not** proven. Which surface is the future system of record is still a decision. |
| 2 | Company foundation | **PARTIAL** | Legal identity, MUR company currency, and letterhead read-back exist on hosted test. Chart of Accounts, tax, fiscal year, and production naming series wait on the accountant / Anton. |
| 3 | Identity, access, segregation of duties | **PARTIAL** | `integrations@corpflowai.com` works and is **not** System Manager (#1019). JML runbook exists. 2FA and Administrator inventory remain unread (desk). `#899` `MASTER_ADMIN_KEY` is **absent** on 2026-08-20 Factory wakes (`JE-2026-08-20-2`). |
| 4 | Master data | **PARTIAL** | Synthetic Customer/Contact/Address, Items/prices, a website Project Template, and #1098 synthetic purchase Item are proven. Supplier CREATE is 403; real-client masters are not. |
| 5 | Business process configuration | **PARTIAL** | Lead → Opportunity → Customer, draft Quotation/Invoice, Project/Task/Timesheet, and Issue are proven on hosted test. Nothing is submitted or sent. #1098 mapped Buying/AP (PO **DEFER**); PI submit and workflows are not started. |
| 6 | CorpFlowAI integration / reconciliation | **PARTIAL** | Policy and a mapping-only bridge exist. `#918` matrix is incomplete. No automated sync. CorpFlowAI CRM (`#701`) still owns the daily prospect pipeline. |
| 7 | Data migration and cutover | **NOT STARTED** | Explicitly unauthorized until accountant guidance and a separate Anton approval. |
| 8 | User acceptance / operational readiness | **NOT STARTED** | Synthetic proofs are not role-based UAT, training, or a restore drill of the vendor-hosted site. |
| 9 | Go-live approval | **NOT STARTED** | No readiness packet. Do not treat hosted-test proofs as go-live. |
| 10 | Post-go-live control | **NOT STARTED** | No patch cadence, access review, or recurring restore test is in operation for ERPNext. |

**Workstream A (due diligence, `#959`):** **NOT STARTED** as a verdict. Issue notes exist; no APPROVE / LIMIT / REJECT packet.  
**Workstream B (security readiness, `#956`):** **PARTIAL** — audit is merged; controls remain **NOT PROVEN**.  
**Workstream C (methodology baseline):** **DONE** by this file for status classification.  
**Workstream D (run the programme in ERPNext):** **NOT STARTED** — owned by `#966`, not this packet.

### 2.2 Top 10 remaining gaps

Ranked by business / revenue / control impact. Prestige is first so the programme cannot bury revenue.

| Rank | Gap | Impact | Status | Next smallest action | Owner | Protected? |
|-----:|-----|--------|--------|----------------------|-------|------------|
| 1 | Prestige proposal / quotation still not Anton-approved or sent | Revenue | **PARTIAL** — pack exists (`#919`); synthetic ERP foundation exists (`#920`); real customer and send do not | Anton reviews `docs/sales/prestige-procurement/`, decides price and presentation, then a **separate** send approval | Anton | **YES** — live send / real customer / submit |
| 2 | No formal ERPNext business-critical use verdict | Control | **NOT STARTED** | Execute `#959` docs research against Strategy v2 fit criteria | Cursor | **NO** for the research packet |
| 3 | Backup / DR / security **NOT PROVEN** | Control — blocks treating ERPNext as irreplaceable | **PARTIAL** | Act on `#956` §6 P0 list; do not buy a DR server | Anton + provider | **YES** for restore, network, paid DR, secret changes |
| 4 | Accountant has not signed CoA, VAT, or cutover | Control — blocks real invoices / books | **REQUIRES DECISION** | Send `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md`; record written answers | Accountant then Anton | **YES** — production accounting / tax |
| 5 | `MASTER_ADMIN_KEY` in ordinary Cursor Cloud runs | Security | **PROVEN** absent on 2026-08-20 Factory Automation wakes (#1010 / #1019). 2026-08-19 was **PRESENT**. | Keep the name out of Factory Automation secrets; do not re-inject | Anton | **YES** — secret mutation (UI add would be a regression) |
| 6 | Client-facing quotation PDF is not yet the professional standard | Revenue / brand | **PARTIAL** — standard PDFs exist; branded Print Format missing | Design/test Print Format on hosted test; do not send | Cursor then Anton visual accept | **NO** until send |
| 7 | `#918` source-of-truth matrix incomplete; no sync | Architecture | **PARTIAL** — bridge mapping only | Docs matrix for remaining CorpFlowAI stores; no automated write | Cursor | **NO** for the matrix |
| 8 | Future system-of-record host is undecided (vendor-hosted v16 vs box sandbox/shell) | Control | **REQUIRES DECISION** | Anton names which ERPNext site will hold real books | Anton | **YES** if public DNS / exposure / paid hosting change |
| 9 | Buying / AP / supplier process not started | Phase 1 order item 4 | **PARTIAL** — #1098 mapped standard path; synthetic Item proven; Supplier CREATE 403; PI submit waits on #1055 | Continue accountant pack; Anton Role grant for Supplier create; AI still cannot approve suppliers | Cursor / Anton / accountant | **NO** for design; **YES** to create real suppliers or submit PI |
| 10 | `#954` registers + internal ERPNext programme Project missing | Programme control | **NOT STARTED** | Execute `#966` only; do not reopen strategy | Cursor | **NO** for standard internal Project/Tasks |

### 2.3 Blockers that genuinely require Anton

| Exact action | Why Anton | Do not wait to do |
|--------------|-----------|-------------------|
| Merge this PR | Human merge; factory must not self-merge | Reading and using the baseline |
| Cursor Dashboard / Automation delete of secret **name** `MASTER_ADMIN_KEY` (`#899`) | UI-only secret change. 2026-08-13 Cloud Agents Secrets delete did not clear Factory Automation wakes | Ordinary ERPNext API work |
| `#959` accept / reject / condition the due-diligence verdict once written | Formal business-critical decision | Writing the research packet |
| `#956` P0 control choices (vendor backup proof, Neon PITR window, Monitor #14 timer, GitHub continuity) | Operator / billing / console access | Keeping the audit as the current truth |
| Name the ERPNext site that will hold real books | Hosting / exposure / cost | Continue using hosted test as `corpflow_test` |
| Accountant engagement and recorded CoA / VAT / cutover answers | External professional authority | Synthetic commercial work |
| Prestige **commercial** and **presentation** approval, then send | Dual quotation gate | Drafting the pack and synthetic ERP records |
| Close or supersede stale open issues listed in §2.7 | Operator issue hygiene | Agents already treating them as superseded in this file |
| Any real customer, submitted document, payment, bank CSV, or public ERP URL | Protected consequence | Synthetic proofs |

### 2.4 Blockers that require the accountant or a provider

| Owner | Exact gap | Source |
|-------|-----------|--------|
| External accountant | Mauritius Chart of Accounts; VAT posture; payroll ↔ ledger handoff; cutover date vs reconstruction; evidential standard for automated postings | Strategy v2 §7 / §18; HB-2 / HB-3 in `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` |
| ERPNext / Frappe Cloud provider | Scheduled backup, retention, restore drill, and whether copies sit in a second failure domain for the **vendor-hosted** v16 site | `#956` B1 / B2 |
| Neon (app Postgres) | Documented PITR / retention / restore drill | `#956` B8 |
| Payment / bank provider (not selected) | Gateway facts before bank-reconciliation design is locked | Strategy v2 §8.1 and open question 6 |

### 2.5 Work that can proceed autonomously now

Ordinary reversible work. Stop at the exact protected action.

1. **`#959` due-diligence packet** — docs research and a recommended verdict. Anton decides.  
2. **`#966` governance finish** — `DECISION_REGISTER.md`, `IMPLEMENTATION_EVIDENCE_INDEX.md` (link here; do not rewrite this baseline), `RISK_REGISTER.md`, `CONTROL_REGISTER.md`, plus a standard internal ERPNext Project/Tasks.  
3. **`#918` classification matrix** — docs only; no sync, no second database.  
4. **Quotation Print Format / letterhead quality** on hosted test — no send.  
5. **Buying / AP design notes** — #1098 landed the operating path. No real supplier create; no PI submit.  
6. **Prestige pack refinement** — no send, no real Prestige Customer.  
7. **Issue hygiene recommendations** in §2.7 — Anton closes; agents stop expanding the stale ones.

### 2.6 Phase 1 business-priority alignment

Approved order (Strategy v2 §8). This baseline does **not** change that order.

| Order | Domain | Current baseline | Fast-lane note |
|------:|--------|------------------|----------------|
| 1 | Quotation / Selling | **PARTIAL** — `#882` READY for synthetic drafts; `#919` pack ready for Anton review; branded PDF and send remain | **Keep moving.** Do not block on `#959` / `#956` / accountant. |
| 2 | Company & Accounting Foundation | **PARTIAL** — identity live on hosted test; CoA/tax/cutover blocked | Accountant pack already written; do not invent tax/CoA. |
| 3 | Customers / CRM | **PARTIAL** — ERPNext Client Master READY (synthetic); daily prospect CRM is still Postgres `#701` | Reconcile later via `#918`; do not build a second CRM. |
| 4 | Buying / AP | **PARTIAL** — #1098 readiness packet; PO **DEFER** | After quotation fast lane; AI cannot approve suppliers; PI submit waits on #1055. |
| 5 | Projects | **PARTIAL** — `#920` template/project/tasks/timesheet proven synthetic | Reuse for Prestige; `/change` stays execution. |
| 6 | Bank / Reconciliation | **PARTIAL** — sandbox Phase C arithmetic proven 2026-06; hosted-test payment not submitted; real bank CSV needs Anton | Provider-neutral until a gateway is chosen. |
| 7 | Support / Help Desk | **PARTIAL** — synthetic Issue `#920`; `/change` remains the execution surface | Expand only when useful. |
| 8 | Deferred modules | **NOT STARTED** (correct) | Full HR/Payroll, Inventory, Manufacturing, mature Assets stay deferred. |

### 2.7 Duplicate / stale ERP items — stop expanding

| Item | Recommendation | Why |
|------|----------------|-----|
| `#955` still OPEN | Close after operator review | Strategy published by merged PR `#957`. |
| `#960` still OPEN | Close after operator review | Approval status recorded by merged PR `#961`. |
| `#882` still OPEN | Close or narrow to Print Format only | Commercial-document **READY** + merged PR `#924`. Remaining gap is presentation quality, not a second commercial-document programme. |
| `#879`, `#886`, `#893` still OPEN | Supersede / close | Sandbox SSH path. Current commercial path is **direct Cursor Cloud → Frappe API** (`#899`). Do not rebuild SSH/Infisical bridges. |
| `#920` CLOSED | Leave closed | Prestige foundation READY. Do not reopen for programme Project work — that is `#966`. |
| `#880`, `#881` CLOSED | Leave closed | Client Master and catalogue READY. |
| `#954` vs `#966` | Keep `#966` as the remaining governance packet | `#954` is the controller; `#966` is the finish work. Do not start a third governance issue. |
| `#967` vs `#966` | Different jobs | This file = implementation status. `#966` = registers + ERPNext Project. |
| Older finance docs that treat loopback `:8081` as “production ERPNext” | Treat as **historical** | Commercial Cursor work since `#880` is **vendor-hosted v16**. The box sandbox/shell still exist and are a different dataset. |
| `#766` | Keep only if still about Lead Rescue pilot rehearsal | Not the Strategy v2 programme baseline. Do not expand it into `#953`. |

---

## 3. Evidence reuse (inspected before calling anything missing)

| Evidence | State | What it proves | What it does **not** prove |
|----------|-------|----------------|----------------------------|
| `#954` / `#955` / merged `#957` / `#960` / merged `#961` | Strategy **APPROVED — VERSION 2** | Canonical doctrine and discovery pointers | No protected consequence; registers and ERPNext Project still open on `#954`/`#966` |
| `#956` / merged `#958` | Audit **DONE**; controls **NOT PROVEN** | Honest map of backup/DR/security | Vendor backup, Neon PITR, Monitor #14 live, `#899` removal |
| `#959` | Issue OPEN; no PR | Research notes only | No APPROVE / LIMIT / REJECT verdict |
| `#880` / merged `#916` | **Client Master READY** | Synthetic Customer + Contact + Address on hosted test | Real clients; unique email constraint |
| `#881` / merged `#915` | **Catalogue READY** | 5 service Items; MUR + USD price lists; 4 Item Prices | T2/T3 rates; maintenance list price |
| `#882` / merged `#924` | **Commercial documents READY** | Draft MUR/USD Quotation + Sales Invoice; FX 47.15; standard PDFs | Submit, send, tax, branded Print Format |
| `#920` / merged `#946` | **Prestige foundation READY** | Lead→Opp→Customer; Item `CF-WS-CUSTOM-PROJECT`; draft `SAL-QTN-2026-00004`; Project `PROJ-0001`; Timesheet `TS-2026-00001`; Issue `ISS-2026-00001` | Real Prestige customer; submit/send/payment; Workflow/Notification (HTTP 403) |
| `#918` | OPEN | Direction: ERPNext-first durable business records | Full classification matrix; automated bridge |
| `#899` / merged `#900` | **INCOMPLETE** | Direct API path PASS | `MASTER_ADMIN_KEY` removed from Cloud Secrets |
| `#919` | OPEN / operator-review | Docs proposal pack; recommended MUR 285,000; not sent | Anton price + presentation + send |
| `#701` / merged `#947` | CRM baseline on Postgres | Daily prospect pipeline stays in CorpFlowAI for now | ERPNext is not the daily CRM kanban |

Live hosted-test identity used for commercial proofs: `integrations@corpflowai.com` on vendor-hosted **frappe 16.25.0 / erpnext 16.26.2**, company **CorpFlowAI LTD / CFAI / MUR**. Hostname is **not** recorded in repo (correct).

---

## 4. Phase requirement rows

Each row is one material `#953` Phase 0–10 requirement.

### Phase 0 — Programme charter and decision record

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P0-1 | Objectives | **DONE** | `#953`; Vision §1–2 | Proven (merged doctrine) | None for charter text | P2 | Point here; do not rewrite | n/a | NO |
| P0-2 | Scope / out of scope | **DONE** | Vision §2, §8, §20 | Proven | None for charter text | P2 | Keep deferred modules deferred | n/a | NO |
| P0-3 | Executive sponsor | **DONE** | Anton named in Vision header | Proven | None | P2 | None | Anton | NO |
| P0-4 | System owner | **PARTIAL** | Anton implied | Assumed SoD matrix | Named owner vs integrator vs accountant | P1 | Record in `#966` decision register | Anton | NO |
| P0-5 | Implementation owner | **PARTIAL** | Factory executes packets; Anton merges | Proven in operating model | ERPNext Project owners not created | P1 | `#966` Task owners | Cursor | NO |
| P0-6 | Source-of-truth policy | **PARTIAL** | Vision §3; `ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`; `#918` open | Policy proven; matrix not | Full `#918` classification | P0 | Docs matrix | Cursor | NO |
| P0-7 | Risk appetite | **DONE** | Vision §14 | Proven | Registers still missing | P2 | `#966` risk register links here | Cursor | NO |
| P0-8 | Approval gates | **DONE** | Vision §5, §20 | Proven | Authority matrix still open (Vision Q10) | P1 | Do not invent delegated spend | n/a | YES if creating a spend matrix |
| P0-9 | Decision log | **PARTIAL** | `#954` comments; `JOURNAL.md` ERP rows; no `DECISION_REGISTER.md` | Partial | `#966` artefact | P1 | Create register; do not rewrite history | Cursor | NO |

### Phase 1 — Environment and platform baseline

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P1-1 | Deployment architecture | **PARTIAL** | `#956` §1; current-state audit | Three surfaces proven as *described* | Anton must name the future books host | P0 | Decision, not a new install | Anton | YES if DNS/exposure/paid host changes |
| P1-2 | Version / support baseline | **PARTIAL** | Live v16.25.0/16.26.2; sandbox v15.109.1; `#959` notes v15→2027 / v16→2029 | Versions proven; lifecycle assumed from public policy | Formal accept + patch owner | P1 | `#959` + `#956` patch policy | Cursor then Anton | NO for docs |
| P1-3 | Security baseline | **PARTIAL** | `#956`; `#899` | Audit proven; 2FA/admin/advisories unread | Privileged 2FA, advisory watch, `#899` | P0 | `#899` delete; `#959` security section | Anton / Cursor | YES for secret/network |
| P1-4 | Backup / restore baseline | **PARTIAL** | `#956` B1–B10 | Sandbox one-shot 2026-06-01 proven; vendor/Neon **NOT PROVEN** | Scheduled off-host ERPNext backup + restore drill | P0 | Provider evidence; no DR purchase | Anton + provider | YES for restore / paid DR |
| P1-5 | Sandbox vs production classification | **PARTIAL** | Environment doctrine `#679`; `#956` | CorpFlowAI hosts = `corpflow_test` proven as policy | Vendor-hosted ERPNext is commercial **test**, not `client_production` | P0 | Keep language honest in every packet | All agents | NO |
| P1-6 | Monitoring / health | **PARTIAL** | Kuma Monitor #13 for app floor; Monitor #14 authored not live | App monitors proven; ERPNext business-critical monitor not | Vendor ERPNext health + backup alert | P1 | Do not add a new self-hosted tool | Anton | YES if new box service |

### Phase 2 — Company foundation

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P2-1 | Company legal identity | **DONE** (hosted test) | `#882` / `#920` read-back: CorpFlowAI LTD, tax_id, Company No | Proven on vendor-hosted test | Confirm same values if a different site becomes books | P1 | Do not create a second Company | n/a | YES to alter production Company |
| P2-2 | Abbreviation / default currency | **DONE** (hosted test) | CFAI / MUR | Proven | None on current test site | P2 | None | n/a | YES to change company currency |
| P2-3 | Address / contact / logo / letterhead | **PARTIAL** | Letter Head “Company Letterhead - Grey” read-back; logo write 403 | Partial | Logo, branded system, Mauritius field lock-down (Vision Q11) | P0 | Visual quotation standard for Prestige | Cursor / Anton | NO until send |
| P2-4 | Fiscal year | **NOT STARTED** | No read-back in cited packets | Assumed ERPNext default | Confirm / set after accountant | P1 | Inspect only | Cursor | YES to change FY on books site |
| P2-5 | Chart of Accounts | **REQUIRES DECISION** | Accountant pack written; HB-2 open | Pack proven; sign-off missing | Written accountant CoA answer | P0 | Send pack; do not invent CoA | Accountant | YES |
| P2-6 | Cost centres / dimensions | **NOT STARTED** | Not required by current volume | Correctly deferred | None until a real need | deferred | Do not implement for completeness | n/a | NO |
| P2-7 | Taxes | **REQUIRES DECISION** | HB-3; public pages say VAT pending | Proven as *pending* | Accountant VAT posture | P0 | Same pack §5 / §10 | Accountant | YES |
| P2-8 | Default AR / AP accounts | **PARTIAL** | `Debtors USD - CFAI` used on `#882` USD draft; `#1098` read-back `Creditors - CFAI` / `Cost of Goods Sold - CFAI` | AR partial; AP skeleton unused for posting | Accountant must confirm payable + opex accounts (#1055) | P1 | Do not submit PI on skeleton defaults | Accountant | YES to change GL defaults |
| P2-9 | Naming series | **NOT STARTED** | Current-state audit: `CFLR-QUO-*` missing | Proven missing | Decide series after document-quality session | P1 | Docs proposal only | Cursor | YES to change live series |
| P2-10 | System / company defaults | **PARTIAL** | Selling Settings inspected in `#880` | Partial | Payment Terms templates 403; tax category empty | P1 | `#882` leftover / accountant | Cursor | YES for accounting defaults |

### Phase 3 — Identity, access, segregation of duties

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P3-1 | Named users | **PARTIAL** | `#1019` `integrations@` GET User + `get_roles`. User list 2 enabled rows; other names not printed | Partial | Privileged human inventory is a desk click (WP6 control 3) | P0 | Anton User list; do not dump emails into git | Anton | YES for user create/disable |
| P3-2 | Role profiles | **PARTIAL** | `#1019` effective roles match Accounts + Sales Manager; Role Profile field unread on User GET | Partial | Formal tighter profile if Stock/Purchase/Accounts Manager should drop | P1 | Do not mutate roles in this packet | Anton | YES to change Role Profile |
| P3-3 | Role permissions | **PARTIAL** | Several grants were Administrator UI-only | Proven pattern | Remaining 403s: Workflow, Notification, Payment Terms, System Settings | P1 | Grant only when a packet needs it | Anton | YES if widening admin |
| P3-4 | Privileged / admin accounts | **REQUIRES DECISION** | `#1019`: Has Role System Manager/Administrator HTTP 403; 2 User rows visible | Unread beyond “integration is not SM” | Who holds System Manager | P0 | Anton inspects desk User list; do not print secrets | Anton | YES |
| P3-5 | API service identities | **PROVEN** (non-admin) | `#1019` `get_roles`: not Administrator / not System Manager | Path + non-admin proven | Extra Stock/Purchase/Accounts Manager reported | P1 | Keep integration user non-admin | Cursor | YES to rotate secrets |
| P3-6 | 2FA | **NOT PROVEN** | `#1019` System Settings HTTP 403 | Unread | Mandatory 2FA for privileged roles | P0 | Anton records or enables in desk Security tab | Anton | YES (security config) |
| P3-7 | User permissions / document restrictions | **NOT STARTED** | — | — | Needed before real client data | P1 | Design after `#959` | Cursor | NO for design |
| P3-8 | Joiner / mover / leaver | **PROVEN** (procedure) | `#1019` `docs/runbooks/ERPNEXT_JOINER_MOVER_LEAVER_V1.md` | Procedure proven; no leaver executed | Follow the runbook when a person changes | P2 | Anton owns clicks | Anton | YES to create/disable users |
| P3-9 | `MASTER_ADMIN_KEY` out of ordinary Cloud runs | **PROVEN** (current absence) | `#1010` / `#1019` 2026-08-20 Factory wakes **ABSENT** | Current absence proven; 2026-08-19 was present | Do not re-inject | P0 | Keep name out of Automation secrets | Anton | YES |

### Phase 4 — Master data

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P4-1 | Customers / Contacts / Addresses | **DONE** (synthetic) | `#880`, `#920` | Proven synthetic | Real Prestige / paying clients | P0 | Create real Customer only with Anton | Anton | YES — real client |
| P4-2 | Suppliers | **PARTIAL** | #1098: LIST HTTP 200 empty; CREATE HTTP 403; rules + runbook landed | Synthetic name planned; not created | Anton Role Permissions Manager grant for Supplier create | P1 | Grant then create CF1098 synthetic only | Anton / Cursor | YES to approve/create real supplier |
| P4-3 | Items / groups / UOM | **DONE** | `#881` | Proven | Extra SKUs only when a real offer needs them | P2 | Do not clone USD 150 as MUR | n/a | NO |
| P4-4 | Price lists / Item Prices | **DONE** | `#881` generation 4 | Proven | Prestige MUR 285,000 is **not** an Item Price (correct) | P2 | Quote-time rate for custom projects | n/a | NO |
| P4-5 | Projects / templates / service masters | **DONE** (synthetic) | `#920` 12-phase template | Proven | Real Prestige project after accepted quote | P1 | Reuse template; do not custom-DocType | Cursor | YES for real client project |
| P4-6 | Controlled import / cleanup | **NOT STARTED** | Bulk migration unauthorized | Correct | None until cutover | deferred | Do not import production data | n/a | YES — bulk migration |
| P4-7 | Duplicate prevention | **PARTIAL** | Search-before-create in `#880`/`#920`/bridge | Process proven; ERPNext does not unique-constrain email | Operator discipline + later `#918` | P1 | Keep search-before-create | All agents | NO |

### Phase 5 — Business process configuration

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P5-1 | Lead → Opportunity → Quotation → Customer | **PARTIAL** | `#920` Lead→Opp→Customer; quotations from Customer | Path proven; not one continuous submitted chain | Do not require Sales Order for services | P1 | Reuse for Prestige draft | Cursor | YES to submit/send |
| P5-2 | Quotation → acceptance → invoice → payment evidence | **PARTIAL** | `#882` drafts; sandbox Phase C paid SI (2026-06, different site) | Hosted-test drafts proven; hosted-test payment **not** proven | Submit/payment only after Anton + bank clearance | P0 | Keep drafts; Prestige uses Quotation first | Anton | YES — submit/payment |
| P5-3 | Project → Task → Timesheet → billing | **PARTIAL** | `#920` P/T/TS; timesheet not billable | Structure proven | Billing link not proven | P1 | Leave until accepted work | Cursor | YES to bill |
| P5-4 | Issue / support lifecycle | **PARTIAL** | `#920` `ISS-2026-00001`; `/change` stays execution | Durable Issue proven synthetic | Help Desk boundary still open (Vision Q3) | P2 | Do not replace `/change` | n/a | NO |
| P5-5 | Purchasing / payables | **PARTIAL** | #1098 path mapped; PO **DEFER**; `po_required=No` | Draft mapping proven; no PI created | Accountant defaults then Draft PI; never pay from invoice existence | P1 | #1055 then capture-only Draft | Cursor / accountant | YES for real PO/bill/payment |
| P5-6 | Internal approvals / workflows | **NOT STARTED** | Workflow GET 403 | Inspect denied | Use GitHub + Anton gates until Workflow is granted | P2 | Do not enable email Workflow | Cursor | YES if Notification/email |
| P5-7 | Document / print / letterhead standards | **PARTIAL** | Standard PDFs in `#882` artefacts; Print Designer work is older/shell | Standard render proven; prestige visual standard not | Print Format + Anton visual accept | P0 | Hosted-test Print Format | Cursor | NO until send |

### Phase 6 — CorpFlowAI integration / reconciliation

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P6-1 | ERPNext-authoritative records | **PARTIAL** | Vision §3; bridge contract | Policy proven | `#918` row-by-row matrix | P0 | Docs matrix | Cursor | NO |
| P6-2 | CorpFlowAI execution + ERPNext outcome | **PARTIAL** | Bridge: `/change` execution; ERPNext Issue/Project | Mapping proven; no writer | No automated create from CMP | P1 | Keep manual until `#918` says otherwise | Cursor | YES if auto-write financials |
| P6-3 | CorpFlowAI-authoritative runtime | **PARTIAL** | Bridge + `#701` | Proven as stated | Do not move auth/session/telemetry into ERPNext | P2 | None | n/a | NO |
| P6-4 | Bridges / idempotency / conflict rules | **PARTIAL** | Bridge table; search-before-create | Mapping only | Queued sync, failure path, pointers in Postgres | P1 | Specify in `#918`; do not code sync yet | Cursor | NO for spec |
| P6-5 | Retire duplicate business stores | **NOT STARTED** | `#701` still canonical for daily CRM | Correct for now | Retire only after proven migration | deferred | Do not expand a second customer ledger | All agents | YES to drop stores |

### Phase 7 — Data migration and cutover

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P7-1 | Inventory existing records | **NOT STARTED** | — | — | Later | deferred | Inventory list only when asked | Cursor | NO for a list |
| P7-2 | Cleanse / mapping / dry run / totals | **NOT STARTED** | `#953` forbids bulk migration by this programme alone | — | Accountant cutover decision first | deferred | None | Accountant | YES — bulk migration |
| P7-3 | Rollback / production cutover approval | **REQUIRES DECISION** | Vision Q8 | — | Cutover vs reconstruction | deferred | Wait for accountant | Anton + accountant | YES |

### Phase 8 — User acceptance / operational readiness

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P8-1 | Role-based UAT | **NOT STARTED** | Synthetic packets are not UAT | — | After `#959` and company foundation | P2 | Do not call `#920` UAT | n/a | NO |
| P8-2 | Finance / commercial validation | **PARTIAL** | `#882` drafts; accountant pack unsigned | Partial | Accountant + Anton visual PDF | P0 | Prestige presentation gate | Anton / accountant | YES to accept real docs |
| P8-3 | CRM / project / support validation | **PARTIAL** | `#920` synthetic | Partial | Real engagement rehearsal | P1 | After Prestige accept | Cursor | NO for synthetic |
| P8-4 | Security tests | **PARTIAL** | `#899` probe; `#956` | Partial | 2FA, admin review, advisory process | P0 | `#899` + `#956` follow-through | Anton | YES for hardening |
| P8-5 | Backup restore drill | **PARTIAL** | Sandbox 2026-06-01 only | Not vendor-hosted | Vendor + Neon drills | P0 | `#956` | Anton + provider | YES — restore |
| P8-6 | Operational runbooks | **PARTIAL** | Many `docs/erpnext/*` and finance runbooks | Partial | One operator “what I do this week” page | P2 | After `#966` | Cursor | NO |
| P8-7 | User training | **NOT STARTED** | AI-operated company; Anton is the user | — | Short exception-handling notes | P2 | After go-live packet | Cursor | NO |
| P8-8 | Known issues / risk acceptance | **PARTIAL** | Vision §18 open questions | Proven as open | Do not silently close them | P1 | Keep listing | All agents | NO |

### Phase 9 — Go-live approval

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P9-1 | Formal readiness packet | **NOT STARTED** | — | — | After `#959`, `#956` P0, accountant, UAT | P0 | Do not start now | Anton | YES — go-live |
| P9-2 | Owner sign-offs / rollback readiness | **NOT STARTED** | — | — | Same | P0 | None | Anton | YES |

### Phase 10 — Post-go-live control

| ID | Requirement | Status | Evidence | Proven vs assumed | Remaining gap | Priority | Next smallest action | Owner | Protected? |
|----|-------------|--------|----------|-------------------|---------------|----------|----------------------|-------|------------|
| P10-1 | Patch cadence | **NOT STARTED** | `#956` / `#959` notes advisories exist | Assumed need | Named owner + cadence | P1 | After `#959` | Anton | YES to apply production patches |
| P10-2 | Backups and restore tests | **NOT STARTED** as recurring | One-shot sandbox only | — | Recurring drill | P0 | `#956` | Anton | YES |
| P10-3 | Access / audit / change reviews | **NOT STARTED** | — | — | Quarterly review once live | deferred | None | Anton | NO to schedule; YES to change live perms |
| P10-4 | Annual BC / recovery test | **NOT STARTED** | — | — | After DR design | deferred | Do not buy a DR server | Anton | YES if paid DR |

---

## 5. `#953` immediate sequencing — honest score

| `#953` immediate step | Status |
|-----------------------|--------|
| 1. Complete independent product/market/security due diligence before deeper lock-in | **NOT STARTED** (`#959`) |
| 2. In parallel, create the internal ERPNext implementation Project/Tasks | **NOT STARTED** (`#966`) |
| 3. Baseline current deployment against the methodology | **DONE** (this file) |
| 4. Do not redo proven `#880`/`#881`/`#882`/`#920` work | **DONE** — reused, not reopened |
| 5. Prioritise missing foundation/security/accounting over new ERP features | **IN FORCE** — see §2.2 ranks 2–5 and 8 |

---

## 6. Prestige fast lane (must not be blocked)

| Piece | State | Action |
|-------|-------|--------|
| Commercial pack | `#919` — recommended MUR 285,000; five milestones; not sent | Anton commercial review |
| ERP foundation | `#920` READY on hosted test | Reuse; do not recreate masters |
| Real Prestige Customer | **Not created** (correct) | Separate Anton approval |
| ERPNext Quotation for the real deal | **Not created** | After customer + price + presentation gates |
| Send / portal / email | **Forbidden** until explicit Anton approval | Stop at draft |

A technically valid ERPNext quotation is **not** ready to send until Anton approves **commercial content** and **rendered presentation**.

---

## 7. Protected boundaries encountered

**Protected gate encountered while producing this baseline: NO.**

This packet only classified existing evidence. Exact actions that still need approval later (not by this PR):

- client_production / public ERP launch  
- env/secret value change (including `#899` Dashboard delete)  
- production DB/schema or ERPNext custom DocTypes  
- production accounting / tax / bank / payment mutation  
- live email / WhatsApp / SMS / external send  
- bulk migration / opening balances  
- paid vendor / DR purchase  
- merge of this PR (Anton)

---

## 8. What agents must do with this file

1. Consult [`VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md) for **strategy**. Consult **this file** for **implementation status**.  
2. Do not mark a planned issue DONE.  
3. Do not reopen `#880`/`#881`/`#882`/`#920` unless live read-back contradicts them.  
4. Do not implement `#966` artefacts inside a `#967` follow-up.  
5. Do not delay Prestige drafting for `#959` or accountant sign-off.  
6. Do not describe CorpFlowAI-hosted ERPNext as client production.

---

## 9. Delivery Reality Audit (this packet)

```text
Delivery Reality Audit:
- Local fix exists: YES (this file)
- Merged to main: NO
- Production deployment ID: n/a — docs-only
- Commit deployed: n/a — docs-only
- Live URLs tested: n/a — docs-only baseline; no new runtime
- Expected vs actual result: decision-ready Phase 0–10 baseline exists in-repo
- Client-facing flow usable: n/a — no client-facing change
- Final verdict: PARTIAL until Anton merges; operational ERP programme remains incomplete by design
```
