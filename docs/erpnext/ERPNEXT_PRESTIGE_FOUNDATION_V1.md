# ERPNext Prestige operating foundation v1

**Status:** Live hosted-test proof. **ERPNext PRESTIGE FOUNDATION READY.**  
**Issue:** [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920)  
**Parents:** [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918), [#919](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/919), [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882), [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881), [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880)  
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`, company currency **MUR**) — `corpflow_test`  
**Machine contract:** `config/erpnext-prestige-foundation.v1.json`  
**Mapper:** `lib/erpnext/prestige-foundation.js`  
**Apply:** `bash scripts/erpnext/apply-prestige-foundation.sh`  
**Evidence:** `artifacts/erpnext/prestige-foundation-920/`  
**Bridge:** `docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`

**Anchor:** `<!-- ERPNEXT_PRESTIGE_FOUNDATION_V1 -->`

<!-- ERPNEXT_PRESTIGE_FOUNDATION_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #920
```

## Verdict

```text
ERPNext PRESTIGE FOUNDATION READY
```

This packet does **not** claim READY from repo-only configuration. Live API read-back is below.

Onboarding E operational proof (owner, next-action, Issue close/reopen) reuses these same records: [`ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md`](./ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md) (#1097, current-main landing #1134).

Anton required now: **NO** for ordinary foundation setup. Merge of the evidence PR is still a human decision. No submit, send, payment, real Prestige customer, env/secret change, or client_production.

Do **not** create the real Prestige Procurement customer in this packet.

---

## Required return

```text
ERPNext PRESTIGE FOUNDATION READY

Current state: hosted ERPNext as integrations@corpflowai.com
Company: CorpFlowAI LTD / CFAI / MUR / tax_id=28466939 / Company No C25228280 / finance@corpflowai.com
Letter Head: Company Letterhead - Grey (read-back)
Price Lists: Standard Selling (MUR) + Standard Selling USD — live
Item: CF-WS-CUSTOM-PROJECT in CF Website Projects (not Website Rescue T1)
CRM: Lead CRM-LEAD-2026-00002 → Opportunity CRM-OPP-2026-00001
Customer: CF920 Synthetic Website Project Ltd + Contact Alex Synthetic + billing Address
Quotation: SAL-QTN-2026-00004 MUR 1,000 draft (docstatus=0) on Standard Selling
Project Template: CF920 Independent Website 12-phase (template Tasks TASK-2026-00001..00012)
Project: PROJ-0001 linked to CF920 Synthetic Website Project Ltd
Project Tasks: TASK-2026-00013..00024 with sequential dates and depends_on; four invoice-gate milestones
Timesheet: TS-2026-00001 draft 1h parent_project=PROJ-0001 task=TASK-2026-00013 (not billable)
Issue Type: CF920 Website Support
Issue: ISS-2026-00001 Open, customer+project linked, via_customer_portal=0
Workflow / Notification: GET HTTP 403; no external send enabled
Anton required now: NO
```

---

## Phase results

| Phase | Result | Live evidence |
| ----- | ------ | ------------- |
| 1 Commercial foundation | **Proven** | Company MUR unchanged; USD + MUR selling Price Lists; Letter Head read-back; Item + draft MUR quotation |
| 2 CRM operating foundation | **Proven** | Lead → Opportunity → Customer/Contact/Address with search-before-create |
| 3 Project-management foundation | **Proven** | Template `CF920 Independent Website 12-phase`; Project `PROJ-0001`; 12 project Tasks with dates + dependencies; four milestones |
| 4 Support / Issue foundation | **Proven** | Issue Type `CF920 Website Support`; Issue `ISS-2026-00001` Open, customer + project linked. `/change` remains the execution surface |
| 5 Workflow / notification | **Inspect denied; not enabled** | Workflow + Notification HTTP 403. No email/SMS/WhatsApp send attempted |
| 6 CorpFlowAI bridge contract | **Written** | Mapping-only; no Postgres migration; no automated sync |

---

## Synthetic records (not Prestige Procurement)

| Object | Name | Notes |
| ------ | ---- | ----- |
| Lead | `CRM-LEAD-2026-00002` | email `alex.synthetic.cf920@example.invalid` |
| Opportunity | `CRM-OPP-2026-00001` | from Lead; MUR; Open |
| Customer | `CF920 Synthetic Website Project Ltd` | MUR, Mauritius, Commercial |
| Contact | `Alex Synthetic` | linked primary |
| Address | `CF920 Synthetic Website Project Ltd-Billing` | Port Louis, Mauritius |
| Item Group | `CF Website Projects` | under CorpFlowAI Services |
| Item | `CF-WS-CUSTOM-PROJECT` | non-stock sales; not Website Rescue T1 |
| Quotation | `SAL-QTN-2026-00004` | MUR 1,000; draft; Letter Head + CF882 terms |
| Project Template | `CF920 Independent Website 12-phase` | 12 template Tasks `TASK-2026-00001`–`00012` |
| Project | `PROJ-0001` | customer linked; template applied; Task Completion |
| Project Tasks | `TASK-2026-00013`–`00024` | sequential `exp_start_date`/`exp_end_date`; `depends_on` chain |
| Milestones | `TASK-2026-00015`, `00018`, `00021`, `00024` | UX/UI, self-management, client review, acceptance |
| Timesheet | `TS-2026-00001` | draft; 1 hour; not billable; `parent_project=PROJ-0001` / `task=TASK-2026-00013` |
| Issue Type | `CF920 Website Support` | synthetic support type |
| Issue | `ISS-2026-00001` | Open; Medium; customer + project linked; `via_customer_portal=0` |

Quotation rate **MUR 1,000** is foundation-proof only. It is **not** the #919 MUR 285,000 recommendation.

ERPNext copied template Tasks onto the Project without `is_milestone`. This run then set the four invoice-gate project Tasks to `is_milestone=1`. The apply script now repeats that on re-run.

An Item Price row `cinhp0o5r3` already existed on `CF-WS-CUSTOM-PROJECT` / Standard Selling at MUR 1,000 (not 285,000). This run did not create or change it.

---

## Standard gaps that do **not** block this READY verdict

1. **Payment Terms** remain HTTP 403 — five-milestone schedule stays in Quotation terms text until a later grant.
2. **Employee** and **Activity Type** remain HTTP 403. Timesheet still linked using existing activity `Execution` without an Employee row.
3. **Workflow / Notification / Assignment Rule** remain HTTP 403. No external send was enabled or attempted.
4. **Customer portal:** `Issue.via_customer_portal=0`. Do not assume an ERPNext portal replaces `/change`.
5. **No custom DocType gap.** Standard Project Template + Task + Issue were sufficient.
6. Project-copied Tasks needed an extra `is_milestone` write (standard ERPNext copy behaviour).

---

## `/change` vs ERPNext Issue

**`/change` remains the client-facing execution and evidence surface.** ERPNext Issue is now writable and is the durable support/business ticket (`ISS-2026-00001` proved the path). CorpFlowAI keeps CMP execution fields, attachments, and Technical Lead audits. Do not migrate `cmp_tickets` in this issue.

---

## Non-actions honoured

- No custom DocTypes / custom fields / schema
- No Postgres migration or automated sync
- No submit / client send / payment / bank / tax mutation
- No live Prestige Procurement customer
- No env/secret value change
- No client_production deploy

---

## Cross-references

- Bridge contract: `docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`
- Prestige proposal mapping: `docs/sales/prestige-procurement/ERPNEXT_PROJECT_MAPPING.md`
- Client Master: `docs/erpnext/ERPNEXT_CLIENT_MASTER_V1.md`
- Catalogue: `docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md`
- Commercial documents: `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md`
