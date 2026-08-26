# ERP implementation evidence index

**Status:** Phase map for the CorpFlowAI ERPNext Business-Critical Adoption Programme.  
**Owner:** Anton (programme); Cursor (keep links current when a packet lands).  
**Environment:** GitHub rows are `local` docs. ERPNext Project/Task IDs are `corpflow_test` operational pointers.  
**Source issues:** [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953), [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954), [#1019](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1019)  
**Machine contract:** `config/erpnext-governance-programme.v1.json`  
**Anchor:** `<!-- CORPFLOWAI_ERP_IMPLEMENTATION_EVIDENCE_INDEX_V1 -->`

<!-- CORPFLOWAI_ERP_IMPLEMENTATION_EVIDENCE_INDEX_V1 -->

Do not copy long histories here. Link GitHub and record ERPNext document names only — never credentials, hostnames, or secret URLs.

Marks used on each row:

| Mark | Meaning |
|------|---------|
| **PROVEN** | Independent GitHub and/or live ERPNext read-back exists for this slice. |
| **PARTIAL** | Some evidence exists; required close-out is incomplete. |
| **NOT PROVEN** | Required evidence is missing or unread. |
| **REQUIRES DECISION** | Anton (or the named professional) must choose before the step can close. |

---

## Operational programme record

| Field | Value |
|-------|--------|
| Project name | `CorpFlowAI ERPNext Business-Critical Adoption Programme` |
| ERPNext Project ID | `PROJ-0002` |
| Company | `CorpFlowAI LTD` (internal; no client Customer) |
| Customer / portal | None. Do not enable customer portal or Project Update emails. |
| Identity used | `integrations@corpflowai.com` |
| Apply | `bash scripts/erpnext/apply-governance-programme.sh` |
| Search-before-create | Reuse the Project if `project_name` already matches |

---

## Task map — Vision + Phases 0–10

| Seq | ERPNext Task subject | Phase | Status in programme | Evidence (link, do not copy) | Mark |
|-----|----------------------|-------|---------------------|------------------------------|------|
| 0 | `ERP Vision and Intended Use — Executive Statement` | Charter | Complete / approved in GitHub | [`VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md); [#954 comment 5291438473](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954#issuecomment-5291438473); [PR #957](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/957); [#960](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/960) / [PR #961](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/961) | **PROVEN** |
| 1 | `Phase 0 — Programme charter and decision record` | 0 | Open / in progress | This folder; [`DECISION_REGISTER.md`](./DECISION_REGISTER.md); #953 / #954 / #966 | **PARTIAL** |
| 2 | `Phase 1 — Environment and platform baseline` | 1 | Open | [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956) / [PR #958](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/958); [#1010](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1010) WP7 refresh `docs/operations/ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md`; `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md` | **PARTIAL** |
| 3 | `Phase 2 — Company foundation` | 2 | Open | #880 Client Master; #882 commercial documents; #920 Company MUR read-back (`CorpFlowAI LTD` / CFAI / MUR). Accountant still owns CoA / tax / opening balances. | **PARTIAL** |
| 4 | `Phase 3 — Identity, access and segregation of duties` | 3 | Open | #1019 WP6: identity `integrations@corpflowai.com` **PROVEN** not System Manager; JML runbook **PROVEN**; `MASTER_ADMIN_KEY` **absent** this run. Privileged User inventory / 2FA / login policy still exact desk actions. Canonical: `docs/operations/ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md`. | **PARTIAL** |
| 5 | `Phase 4 — Master data` | 4 | Open | #880 synthetic Customers; #881 catalogue; #920 Item `CF-WS-CUSTOM-PROJECT` + CRM path. #1098 synthetic purchase Item `CF-AP-SYNTHETIC-OPEX`; Supplier CREATE still HTTP 403. No live Prestige customer. | **PARTIAL** |
| 6 | `Phase 5 — Business process configuration` | 5 | Open | #920 Lead → Opportunity → Customer → draft Quotation → Project → Task → Timesheet → Issue. #1098 Buying/AP path mapped; Purchase Order **DEFER**; no PI submit. Workflow / Notification HTTP 403; no external send. Prestige pack #919 not sent. | **PARTIAL** |
| 7 | `Phase 6 — CorpFlowAI integration / reconciliation` | 6 | Open | [`docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`](../../erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md) mapping-only. Full #918 matrix: [`SOURCE_OF_TRUTH_MATRIX_V1.md`](./SOURCE_OF_TRUTH_MATRIX_V1.md). WP1 Customer bridge: [`ERPNEXT_CUSTOMER_BRIDGE_V1.md`](../../erpnext/ERPNEXT_CUSTOMER_BRIDGE_V1.md) (#1009). WP2 sales lifecycle: [`ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md`](../../erpnext/ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1.md) (#1018). No Postgres migration. No cron. #701 CRM baseline stays on existing `leads`. | **PARTIAL** |
| 8 | `Phase 7 — Data migration and cutover` | 7 | Not started | #953: no bulk migration authorized by the programme issue. | **REQUIRES DECISION** |
| 9 | `Phase 8 — User acceptance / operational readiness` | 8 | Not started | Depends on Phases 1–6 close-out and accountant review. | **NOT PROVEN** |
| 10 | `Phase 9 — Go-live approval` | 9 | Not started | Separate Anton approval for any `client_production` or irreplaceable cutover. | **REQUIRES DECISION** |
| 11 | `Phase 10 — Post-go-live control` | 10 | Not started | Patch cadence, restore drills, access reviews — after go-live approval. | **NOT PROVEN** |

Live Task IDs from the 2026-08-16 apply as `integrations@corpflowai.com` (re-runs must reuse):

| Subject | Task ID | Status |
|---------|---------|--------|
| ERP Vision and Intended Use — Executive Statement | `TASK-2026-00025` | Completed |
| Phase 0 — Programme charter and decision record | `TASK-2026-00026` | Open |
| Phase 1 — Environment and platform baseline | `TASK-2026-00027` | Open |
| Phase 2 — Company foundation | `TASK-2026-00028` | Open |
| Phase 3 — Identity, access and segregation of duties | `TASK-2026-00029` | Open |
| Phase 4 — Master data | `TASK-2026-00030` | Open |
| Phase 5 — Business process configuration | `TASK-2026-00031` | Open |
| Phase 6 — CorpFlowAI integration / reconciliation | `TASK-2026-00032` | Open |
| Phase 7 — Data migration and cutover | `TASK-2026-00033` | Open |
| Phase 8 — User acceptance / operational readiness | `TASK-2026-00034` | Open |
| Phase 9 — Go-live approval | `TASK-2026-00035` | Open |
| Phase 10 — Post-go-live control | `TASK-2026-00036` | Open |

Read-back: no Customer, `collect_progress=0`, Notification/Workflow inspect HTTP 403 (not enabled). Artifact: `artifacts/erpnext/governance-programme-966/apply-log.json`.

---

## Reused implementation evidence (do not redo)

| Packet | What it already proved | Do not repeat |
|--------|------------------------|---------------|
| [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880) | Standard Customer + Contact + Address | Custom fields / second identity store |
| [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881) | Product catalogue / Items | Invent new SKUs for this governance packet |
| [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882) | Draft commercial documents + FX | Submit / send invoices |
| [#919](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/919) | Prestige proposal pack (docs) | Live send or ERPNext Prestige customer |
| [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920) | Synthetic Project `PROJ-0001`, Tasks, Issue `ISS-2026-00001` | A second Prestige/synthetic website Project |
| [#955](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/955) / [#960](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/960) | Canonical Version 2 + approved status | Rewrite strategy |
| [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956) | Backup / DR / security audit | Buy a DR server; mutate the box |
| [#1010](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1010) | WP7 version/patch/backup/restore/monitoring classification | Apply the Frappe Cloud upgrade, production restore, Neon restore, or Monitor #14 timer |
| [#1019](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1019) | WP6 identity / roles / 2FA / least-privilege classification | Grant System Manager to the integration user; enable 2FA from the factory; mutate roles |
| [#1098](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1098) | Buying / AP readiness: [`docs/erpnext/ERPNEXT_BUYING_AP_READINESS_V1.md`](../../erpnext/ERPNEXT_BUYING_AP_READINESS_V1.md); PO **DEFER**; payment segregation | Submit PI; Payment Entry; real supplier; custom DocType |

---

## Version / audit proof (Workstream C)

Standard Frappe `Version` / form timeline is used **only if already readable**. This packet does not enable site-wide tracking or paid compliance products.

| Check | Result 2026-08-16 |
|-------|-------------------|
| One internal Project note append (`CF966 governance stamp`) | **PROVEN** on `PROJ-0002.notes` via GET Project / getdoc |
| Frappe `Version` list | HTTP **403** to `integrations@corpflowai.com` |
| getdoc `docinfo.versions` / `comments` | HTTP 200, both **empty** |
| Comment create | HTTP **403** (doctype access denied) |
| Exact standard-capability blocker | `VERSION_TRAIL_UNREADABLE` — do **not** enable site-wide tracking or grant System Manager for this proof |
| Secrets in evidence | Forbidden |

---

## Cross-links

- Decisions: [`DECISION_REGISTER.md`](./DECISION_REGISTER.md)
- Risks: [`RISK_REGISTER.md`](./RISK_REGISTER.md)
- Controls: [`CONTROL_REGISTER.md`](./CONTROL_REGISTER.md)
- Strategy (do not duplicate): [`VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md)
- Source-of-truth matrix (#918): [`SOURCE_OF_TRUTH_MATRIX_V1.md`](./SOURCE_OF_TRUTH_MATRIX_V1.md)
