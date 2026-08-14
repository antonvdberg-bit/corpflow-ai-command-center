# ERPNext Prestige operating foundation v1

**Status:** Live hosted-test proof. **NOT READY** on Project / Task / Issue write. CRM + MUR quotation path is proven.  
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
NOT READY — Project/Task/Issue Role Permission grant is UI-only
```

This packet does **not** claim READY from repo-only configuration. Live API read-back is below.

Anton required now: **YES** — Role Permissions Manager grant on role **Sales Manager** (already held by `integrations@corpflowai.com`) for Project, Project Template, Task, Issue, and Issue Type. Same pattern as the #881 Item Price grant. Not a payment, send, schema, or client_production action.

Do **not** create the real Prestige Procurement customer in this packet.

---

## Required return

```text
ERPNext PRESTIGE FOUNDATION NOT READY — Project/Task/Issue Role Permission grant is UI-only

Current state: hosted ERPNext as integrations@corpflowai.com; frappe 16.25.0 / erpnext 16.26.2
Company: CorpFlowAI LTD / CFAI / MUR / tax_id=28466939 / Company No C25228280 / finance@corpflowai.com
Letter Head: Company Letterhead - Grey (read-back)
Price Lists: Standard Selling (MUR) + Standard Selling USD — live
Item: CF-WS-CUSTOM-PROJECT in CF Website Projects (no Item Price; not Website Rescue T1)
CRM: Lead CRM-LEAD-2026-00002 (Converted) → Opportunity CRM-OPP-2026-00001
Customer: CF920 Synthetic Website Project Ltd + Contact Alex Synthetic + billing Address
Quotation: SAL-QTN-2026-00004 MUR 1,000 draft (docstatus=0) on Standard Selling
Timesheet: TS-2026-00001 draft 1h (not linked to Project — Project 403)
Project / Task / Issue: GET+POST HTTP 403
Workflow / Notification: GET HTTP 403; no external send enabled
Anton required now: YES — Sales Manager Role Permissions Manager grant, then re-run apply script
```

---

## Phase results

| Phase | Result | Live evidence |
| ----- | ------ | ------------- |
| 1 Commercial foundation | **Proven** | Company MUR unchanged; USD + MUR selling Price Lists; Letter Head read-back; Item + draft MUR quotation |
| 2 CRM operating foundation | **Proven** | Lead → Opportunity → Customer/Contact/Address with search-before-create; Lead status became `Converted` after Customer `lead_name` |
| 3 Project-management foundation | **Blocked** | Project / Project Template / Task HTTP 403. 12-task template is specified in config; not inserted |
| 4 Support / Issue foundation | **Blocked** | Issue / Issue Type HTTP 403. `/change` remains the execution surface until Issue write exists |
| 5 Workflow / notification | **Inspect denied; not enabled** | Workflow + Notification HTTP 403. No email/SMS/WhatsApp send attempted |
| 6 CorpFlowAI bridge contract | **Written** | Mapping-only; no Postgres migration; no automated sync |

---

## Synthetic records (not Prestige Procurement)

| Object | Name | Notes |
| ------ | ---- | ----- |
| Lead | `CRM-LEAD-2026-00002` | email `alex.synthetic.cf920@example.invalid`; status Converted |
| Opportunity | `CRM-OPP-2026-00001` | from Lead; MUR; Open |
| Customer | `CF920 Synthetic Website Project Ltd` | MUR, Mauritius, Commercial |
| Contact | `Alex Synthetic` | linked primary |
| Address | `CF920 Synthetic Website Project Ltd-Billing` | Port Louis, Mauritius |
| Item Group | `CF Website Projects` | under CorpFlowAI Services |
| Item | `CF-WS-CUSTOM-PROJECT` | non-stock sales; `standard_rate=0`; no Item Price |
| Quotation | `SAL-QTN-2026-00004` | MUR 1,000; draft; Letter Head + CF882 terms; five-milestone schedule in terms text |
| Timesheet | `TS-2026-00001` | draft; 1 hour; not billable; not a Prestige timesheet |

Quotation rate **MUR 1,000** is foundation-proof only. It is **not** the #919 MUR 285,000 recommendation and **not** a list price.

Probe Leads `CRM-LEAD-2026-00001` and `00003`–`00007` were set to **Do Not Contact** after field-isolation tests (`notes` is not a safe Data field on this site; `utm_source` rejected `Warm / direct`).

---

## Standard gaps that actually block Prestige

1. **Exact blocker:** `integrations@corpflowai.com` has no DocType access for Project, Project Template, Task, Issue, Issue Type (HTTP 403). Metadata (`getdoctype`) is readable; list/create is not. The identity cannot grant this itself (`Role` / `Custom DocPerm` / permission manager also 403).
2. **Payment Terms** remain HTTP 403 — five-milestone schedule is stored as Quotation terms text until a later grant.
3. **No custom DocType gap.** Project Template in ERPNext 16 is standard Task links + Project. Sufficient once write exists.
4. **Timesheet** create worked without Employee, but cannot be linked to a Project/Task until those writes exist.
5. Customer portal / Issue portal behaviour was **not** inspected (Issue 403). Do not assume a client-facing ERPNext portal replaces `/change`.

### Smallest Anton click path

1. ERPNext Desk as Administrator.
2. Home → Users → Role Permissions Manager.
3. Role = **Sales Manager** (already held by the integration identity).
4. Grant Read/Create/Write on **Project**, **Project Template**, **Task**, **Issue**, **Issue Type**.
5. Save. Do not assign System Manager. Do not change Role Profile Accounts.
6. Re-run `bash scripts/erpnext/apply-prestige-foundation.sh`

---

## `/change` vs ERPNext Issue

Until Issue write is granted, **`/change` remains the client-facing execution and evidence surface.** After the grant, ERPNext Issue is the durable support/business ticket; CorpFlowAI keeps CMP execution fields, attachments, and Technical Lead audits. Do not migrate `cmp_tickets` in this issue.

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
