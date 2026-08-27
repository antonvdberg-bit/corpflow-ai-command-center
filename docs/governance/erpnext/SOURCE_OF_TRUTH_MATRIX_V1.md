# ERPNext-first source-of-truth matrix v1

**Status:** Decision-ready reconciliation packet (docs / mapping only).  
**Source issue:** [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918)  
**Parent programme:** [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)  
**Approved doctrine:** [`VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md) — `APPROVED — VERSION 2`  
**Reuses (do not redo):** [#967](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/967) baseline, [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880) Client Master, [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881) catalogue, [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882) commercial documents, [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920) Prestige foundation, [#701](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/701) CRM baseline  
**Date (UTC):** 2026-08-19  
**Owner:** Anton (protected actions and merge); Cursor Factory (this matrix)  
**Environment:** `local` (docs/governance + mapping config). Cited live proofs are `corpflow_test` hosted ERPNext. This packet does **not** change any live host.  
**Machine contract:** `config/erpnext-source-of-truth-matrix.v1.json`  
**Helper:** `lib/erpnext/source-of-truth-matrix.js`  
**Earlier mapping slice:** [`docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`](../../erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md) (still valid; this file is the full #918 matrix)  
**Anchor:** `<!-- CORPFLOWAI_ERP_SOURCE_OF_TRUTH_MATRIX_V1 -->`

<!-- CORPFLOWAI_ERP_SOURCE_OF_TRUTH_MATRIX_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: local
GitHub state refreshed: YES
Source item: #918
```

**NO IMPLEMENTATION AUTHORIZED** beyond this classification matrix and mapping/config. This file does **not** authorize automated sync, Postgres migration, accounting/tax/bank mutation, bulk migration, schema/custom DocTypes, env/secrets change, live send, paid actions, public exposure change, real Prestige Customer, or merge.

---

## 0. Verdict

```text
ERPNext-FIRST RECONCILIATION READY FOR IMPLEMENTATION
```

This verdict means Anton and agents now have **one row-by-row ownership matrix**, **bridge contracts for every `needs bridge` domain**, **a first bridge candidate chosen by revenue/control value**, and **a smallest implementation sequence**. It does **not** mean records already sync. It does **not** mean Prestige may be sent.

| Question | Answer now |
|----------|------------|
| What belongs in ERPNext? | Commercial identity, catalogue/prices, quotations/invoices, payment clearance, client Project/Task/Timesheet, durable support Issue — where standard ERPNext already fits. |
| What stays in CorpFlowAI? | Daily prospect kanban, `/change` execution, auth/tenancy, tenant catalogues (Lux), automation/AI telemetry, factory evidence. |
| First bridge to implement? | **Qualified commercial Customer identity** (`leads.id` → Customer / Contact / Address). |
| Does this delay Prestige? | **No.** Track B stays on #919 / #882 / #920. Real Customer + send remain Anton gates. |
| What must Anton do because of *this* packet? | **Merge this PR when satisfied.** No other Anton action is created by the matrix itself. |

`ANTON ACTION: NONE` for this bounded packet.

---

## 1. How to read this file

| Classification | Meaning |
|----------------|---------|
| **ERPNext authoritative** | ERPNext owns the business record. CorpFlowAI may project or cache a pointer. |
| **CorpFlowAI execution + ERPNext authoritative outcome** | Work runs in CorpFlowAI; the durable business result is persisted in ERPNext. |
| **CorpFlowAI authoritative** | No appropriate ERPNext semantic home, or ERPNext must not own it (auth, telemetry, tenant runtime). |
| **Duplicate/retire** | Stop expanding this custom store as a business master. Do not delete in this packet. |
| **Needs bridge** | Explicit mapping, idempotency, conflict, retry, and audit contract required before any write. |

**Proven** = merged packet or live hosted-test read-back already cited by #880/#881/#882/#920/#701/#967. This packet does **not** re-run those proofs.

Do **not** treat CorpFlowAI-hosted ERPNext as `client_production`.

---

## 2. Classification matrix

| ID | Domain | CorpFlowAI store | ERPNext home | Classification | Evidence (reused) |
|----|--------|------------------|--------------|----------------|-------------------|
| `lead_intake_pipeline` | Lead / prospect intake and daily kanban | `leads` + `qualification_json` | Lead/Opportunity only after qualification | **CorpFlowAI authoritative** | #701 |
| `lead_opportunity_promotion` | Lead / Opportunity after a real sales process starts | `leads.id` | Lead then Opportunity | **Needs bridge** | #920 |
| `qualified_customer_identity` | Customer / Contact / Address | `leads.id` when quotation-ready or won | Customer + Contact + Address | **Needs bridge** (first candidate) | #880 / #920 |
| `item_pricing` | Item / Price List / Item Price | none as catalogue master | Item / Item Group / Price List / Item Price | **ERPNext authoritative** | #881 / #1207 |
| `quotation_invoice` | Quotation / Sales Invoice | proposal packs / #714 drafts | Quotation / Sales Invoice | **Needs bridge** | #882 / #919 |
| `payment_evidence` | Payment evidence vs GL clearance | `payment_records` / `payment_attempts` | Sales Invoice / Payment Entry | **Needs bridge** (blocked) | #920 / #714 |
| `project_task_timesheet` | Project / Task / Timesheet | CMP notes / delivery records | Project / Task / Timesheet | **Needs bridge** | #920 |
| `issue_support` | Durable support / business ticket | `cmp_tickets.id` | Issue | **Needs bridge** | #920 |
| `cmp_execution` | `/change` tickets, attachments, Technical Lead audits | `cmp_tickets` + audits | none as execution store | **CorpFlowAI authoritative** | CMP / `/change` |
| `change_execution_erpnext_issue_pattern` | Client delivery execution with a durable ERPNext Issue | `cmp_tickets` (execution) | Issue (durable outcome) | **CorpFlowAI execution + ERPNext authoritative outcome** | Vision §3 / #920 |
| `growth_company_ledger` | GrowthCompany as customer/CRM ledger | `growth_companies` / `growth_contacts` | Customer only if promoted | **Duplicate/retire** | stop expanding |
| `growth_touchpoint_outreach` | Outreach execution | `growth_touchpoints` | none yet | **CorpFlowAI authoritative** | Vision §3 |
| `company_master_evidence` | Logos / certificates / governed assets | Company Master tables | Company + Letter Head for legal/print | **CorpFlowAI authoritative** | #765 / #882 |
| `tenant_auth_runtime` | Tenant, login, host mapping | `tenants` / `auth_users` / `tenant_hostnames` | none | **CorpFlowAI authoritative** | tenant login doctrine |
| `lux_listings` | Tenant catalogue / public content | `lux_listings` / knowledge atoms | none | **CorpFlowAI authoritative** | Lux runtime |
| `automation_telemetry` | Automation, AI logs, token debits | `automation_*` / `telemetry_events` / chat widget | none | **CorpFlowAI authoritative** | automation framework |
| `workflow_runtime` | Tenant workflow runs | `workflow_*` | ERPNext Workflow still 403 | **CorpFlowAI authoritative** | #920 |
| `buying_ap_supplier` | Buying / AP / Supplier | none | Supplier / PO / PI when started | **ERPNext authoritative** | not started; AI cannot approve suppliers |
| `change_revenue_localstorage` | `/change/revenue` overlay | browser localStorage | none | **Duplicate/retire** | #701 |

Rows that are **Needs bridge** in the table above are the same as **CorpFlowAI execution + ERPNext authoritative outcome** once the listed contract is followed. Until then they must not be treated as already synced.

---

## 3. Needs-bridge contracts

Every `needs_bridge` row has: CorpFlowAI key, ERPNext DocType/key, direction, idempotency, conflict rule, retry/failure path, and audit evidence. Machine copy: `config/erpnext-source-of-truth-matrix.v1.json`.

### 3.1 `qualified_customer_identity` — first bridge candidate

**Why first (revenue / control):** no paying-client quotation can exist without a Customer. Dual customer identity is the highest-control failure. The synthetic path is already proven (#880 / #920). Daily kanban stays on Postgres (#701).

| Field | Contract |
|-------|----------|
| CorpFlowAI key | `leads.id` |
| ERPNext DocType / key | Customer.name / Contact.name / Address.name |
| Direction | CorpFlowAI → ERPNext when operator stage is `proposal_ready` or `won`. Search-before-create. |
| Idempotency | Search Customer by normalized name; Contact by email. Disable suffix duplicates. One Customer per paying legal entity. |
| Conflict | **ERPNext Customer wins** as commercial master. Do not grow a second billing identity in GrowthCompany or a new table. |
| Retry / failure | Safe to retry search. On API failure, leave Postgres unchanged; do not create a second Customer. |
| Audit | Pointer may later sit on `qualification_json.erpnext` — **not written by this packet**. Synthetic proofs: CF880 / CF920 customers. |
| Sync mode | Queued / operator-manual. **No automated writer.** |
| Exact later gate | Creating the **real Prestige Procurement** Customer needs Anton. |

### 3.2 `lead_opportunity_promotion`

| Field | Contract |
|-------|----------|
| CorpFlowAI key | `leads.id` |
| ERPNext DocType / key | Lead.name / Opportunity.name |
| Direction | CorpFlowAI → ERPNext after a real sales process starts (not every website intake). |
| Idempotency | Search Lead by email then company name; Opportunity by party / title containing `leads.id`. |
| Conflict | ERPNext is the durable sales-process record after create; Postgres remains the daily kanban. |
| Retry / failure | Search-before-create. Never a second Lead for the same email. |
| Audit | #920 `CRM-LEAD-2026-00002` → `CRM-OPP-2026-00001`. |

### 3.3 `quotation_invoice`

| Field | Contract |
|-------|----------|
| CorpFlowAI key | operator proposal pack / `related_refs.quote_issue` |
| ERPNext DocType / key | Quotation.name / Sales Invoice.name |
| Direction | CorpFlowAI assembles content; ERPNext holds the authoritative document **after** Anton commercial + presentation gates. |
| Idempotency | Search open draft by customer + item + currency. One draft per engagement until submit. |
| Conflict | ERPNext wins on rate, tax, currency, status. GitHub packs are working papers. |
| Retry / failure | Keep `docstatus=0`. Do not submit or send on retry. |
| Audit | #882 draft quotations/invoices; #919 Prestige pack **not sent**. Sales Order is not required for services. #1056/#1166 maps the CF1018 draft MUR Quotation `SAL-QTN-2026-00005` and stops Sales Invoice posting at accountant foundation. |

### 3.4 `payment_evidence` — blocked

| Field | Contract |
|-------|----------|
| CorpFlowAI key | `payment_records.record_reference` |
| ERPNext DocType / key | Sales Invoice.name / Payment Entry.name |
| Direction | Pointer **after** financial-rail approval and bank clearance. |
| Idempotency | Do **not** create SI/PE from PaymentRecord in this packet. |
| Conflict | ERPNext GL after submit is cash/AR truth. PaymentRecord is app fulfilment only. |
| Retry / failure | **Blocked.** Do not invent a Payment Entry. |
| Audit | Hosted-test payment not submitted. #714 remains the financial approval-to-build gate. |

### 3.5 `project_task_timesheet`

| Field | Contract |
|-------|----------|
| CorpFlowAI key | accepted Customer engagement / CMP notes |
| ERPNext DocType / key | Project.name / Task.name / Timesheet.name |
| Direction | After accepted commercial handoff, from the reusable 12-phase Project Template. |
| Idempotency | One Project per accepted Customer engagement; search `project_name` + customer. |
| Conflict | ERPNext is the commercial delivery plan; CorpFlowAI holds GitHub, preview URLs, execution evidence. |
| Retry / failure | Search-before-create. Reuse `CF920 Independent Website 12-phase`. |
| Audit | #920 `PROJ-0001`, Tasks `TASK-2026-00013`–`00024`, Timesheet `TS-2026-00001` draft. #1097 reused the same Project/Tasks; Timesheet remains **DEFER**. |

### 3.6 `issue_support`

| Field | Contract |
|-------|----------|
| CorpFlowAI key | `cmp_tickets.id` |
| ERPNext DocType / key | Issue.name |
| Direction | `/change` execution → ERPNext Issue when a durable client-support or business ticket is required. |
| Idempotency | Search Issue subject containing `cmp_tickets.id`; create once. |
| Conflict | ERPNext Issue is durable support; CmpTicket stays the execution surface. Technical Lead audits stay in CorpFlowAI. |
| Retry / failure | Do not duplicate Issues. |
| Audit | #920 `ISS-2026-00001`. #1097 proved close/reopen and description trail. Workflow/Notification/Comment still HTTP 403 — no email. |

---

## 4. First bridge candidate

**Selected:** `qualified_customer_identity`

**Not selected (and why):**

| Candidate | Why not first |
|-----------|----------------|
| Quotation writer | Requires a Customer first, plus Anton dual quotation gate. |
| Payment Entry | Protected GL/payment consequence; hosted-test payment not proven. |
| CmpTicket → Issue | Control-useful, not the revenue unblocker. |
| Automated sync job | Unauthorized. Mapping must exist first — this packet is that mapping. |

Operator meaning: when a prospect is ready to quote or has won, an agent or Anton creates (or reuses) the ERPNext Customer by search-before-create. The daily pipeline does **not** move into ERPNext.

---

## 5. Duplicate systems — stop expanding now

Do **not** delete these stores in this packet. Stop treating them as masters.

| Stop expanding | Why |
|----------------|-----|
| A second CRM table, paid CRM, or GrowthCompany pipeline/billing fields | #701: one Postgres `leads` table. Promote to ERPNext Customer; do not quote from GrowthCompany. |
| `PaymentRecord` / MPGS attempts as ledger truth | ERPNext Payment Entry after bank clearance. |
| ERPNext custom DocTypes / custom fields for overlap | Standard path already proven. |
| Sandbox SSH / Infisical ERPNext bridges (#879 / #886 / #893) | Direct Cursor Cloud → Frappe API (#899) is the commercial path. |
| A Customer named `CorpFlowAI LTD` | Company document is the legal identity. |
| `/change/revenue` localStorage as pipeline truth | #701 already marked it non-canonical. |

---

## 6. Smallest implementation sequence

Prestige Track B is **parallel**, not step 0 of this list.

| Step | Action | Owner | Protected? |
|-----:|--------|-------|------------|
| 1 | Land this matrix (this PR). No sync. | Cursor | **NO** |
| 2 | First bridge: operator-manual Customer/Contact/Address for commercially qualified leads. Pointer optional later. | Cursor; Anton for **real** clients | **YES** for a real paying Customer (including Prestige) |
| 3 | Prestige quotation/presentation continues on #919 — do not wait for remaining rows | Anton | **YES** — send / submit / real Prestige Customer |
| 4 | Manual CmpTicket → Issue for durable support tickets only | Cursor | **NO** for synthetic; **YES** if it emails the client |
| 5 | Project from accepted quotation using the existing 12-phase template | Cursor | **YES** for a real client Project |
| 6 | Payment pointer only after financial-rail + bank-clearance approval | Anton | **YES** — Payment Entry / live payment |

There is **no** bulk migration step. There is **no** automated queue in this packet.

---

## 7. Prestige fast lane (must not be blocked)

| Piece | State | This matrix |
|-------|-------|-------------|
| Commercial pack | #919 recommended MUR 285,000; not sent | Unchanged |
| ERP foundation | #920 READY on hosted test | Reuse; do not recreate |
| Real Prestige Customer | **Not created** (correct) | First bridge names the mapping; creation still needs Anton |
| Send / portal / email | Forbidden until explicit Anton approval | Unchanged |

A technically valid ERPNext quotation is **not** ready to send until Anton approves **commercial content** and **rendered presentation**.

---

## 8. Protected boundaries encountered

**Protected gate encountered while producing this matrix: NO.**

Exact actions that still need approval later (not by this PR):

- creating the real Prestige Procurement Customer
- submit / send of any quotation or invoice
- Payment Entry / bank / live payment
- automated sync writers
- Postgres schema / bulk migration
- ERPNext custom DocTypes
- env/secret value change
- `client_production` / public ERP launch
- merge of this PR (Anton)

---

## 9. What agents must do with this file

1. Consult [`VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md) for **strategy**. Consult **this file** for **which store owns which domain**.  
2. Consult [`ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`](../../erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md) for the earlier #920 mapping slice — do not treat it as the full matrix.  
3. Do not build a second CRM.  
4. Do not start automated ERPNext writes from this PR.  
5. Do not delay Prestige drafting for remaining #918 rows.  
6. Do not describe CorpFlowAI-hosted ERPNext as client production.

---

## 10. Delivery Reality Audit (this packet)

```text
Delivery Reality Audit:
- Local fix exists: YES (this file + config + tests)
- Merged to main: NO
- Production deployment ID: n/a — docs/config only
- Commit deployed: n/a — docs/config only
- Live URLs tested: n/a — docs-only matrix; no new runtime
- Expected vs actual result: decision-ready #918 matrix and first bridge candidate exist in-repo
- Client-facing flow usable: n/a — no client-facing change
- Final verdict: PARTIAL until Anton merges; automated reconciliation remains unauthorized by design
```

---

## 11. Implementation follow-up (#1009 / #1018)

This matrix packet stays mapping/config only (`NO IMPLEMENTATION AUTHORIZED` here). The first bridge itself is implemented under [#1009](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1009): [`docs/erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md`](../../erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md). The sales-lifecycle bridge is implemented under [#1018](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1018): [`docs/erpnext/ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md`](../../erpnext/ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md). Both packets are operator/factory-invoked, synthetic-only, and are **not** a cron or automated writer.
