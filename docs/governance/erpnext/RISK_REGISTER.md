# ERP risk register

**Status:** Living register. Append or supersede; do not silently rewrite a closed row.  
**Owner:** Anton (acceptance). Cursor updates evidence links when a packet lands.  
**Review cadence:** when a material ERP decision is taken; otherwise with #953 Phase 0 / Phase 9 review.  
**Environment:** `local` (docs).  
**Source issues:** [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966), [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)  
**Anchor:** `<!-- CORPFLOWAI_ERP_RISK_REGISTER_V1 -->`

<!-- CORPFLOWAI_ERP_RISK_REGISTER_V1 -->

Marks: **PROVEN** / **PARTIAL** / **NOT PROVEN** / **REQUIRES DECISION** describe the *treatment evidence*, not whether the risk exists.

| ID | Risk | Owner | Treatment | Acceptance | Evidence | Mark | Next review / action |
|----|------|-------|-----------|------------|----------|------|----------------------|
| R-ERP-01 | Treating ERPNext as irreplaceable before backup/restore/DR is proven | Anton | Keep #956 verdict in force; no cutover | Not accepted as residual for money/tax/contracts | `docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md`; #1010 `docs/operations/ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md` | **NOT PROVEN** (control) | Exact remaining actions: Frappe Cloud Backups tab + disposable restore; Neon Instant restore window; patched v16 ≥ 16.31.0. Do not buy a DR server |
| R-ERP-02 | Privileged ERPNext administrator can alter application-held records | Anton | Dual-control: GitHub ledger + ERPNext operational Project | Accepted with compensating Git history | #954; this folder | **PARTIAL** | Keep material decisions on `main` via PR |
| R-ERP-03 | Single-human control / key-person incapacity | Anton | Compensating AI review + accountant + documented operating system; no theatre second approver | Accepted as startup posture (Version 2 §12 / §14) | [`VISION_AND_INTENDED_USE.md`](./VISION_AND_INTENDED_USE.md) §12–§14 | **PARTIAL** | Design later authority matrix; not this packet |
| R-ERP-04 | Accounting / CoA / tax configuration error | External accountant + Anton | Accountant authority; no invented tax/CoA; monthly close direction | Acknowledged; zero-error not claimed | Version 2 §6 / §11; #953 Phase 2 | **REQUIRES DECISION** | Accountant session before production accounting mutation |
| R-ERP-05 | AI spend, supplier approval, or unapproved external quotation | Anton | Zero default spend; Anton approves suppliers; every external quote needs Anton commercial + presentation approval | In force | Version 2 §5; `.cursor/rules/erpnext-strategy.mdc` | **PROVEN** (rule recorded) | Keep factory packets from sending |
| R-ERP-06 | Source-of-truth divergence (CorpFlowAI vs ERPNext) | Anton / Cursor | Reconcile, do not duplicate; #918 matrix + #920 mapping-only bridge | Currently low volume; monitor | `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`; `docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`; #701 CRM baseline | **PARTIAL** | First bridge is qualified Customer identity; no automated sync in #918 |
| R-ERP-07 | Prestige revenue blocked by the broader programme | Anton | Fast lane in parallel; synthetic foundation only | Accepted | `ERP-D-2026-08-14-3`; #919 / #920 | **PROVEN** (policy) | Do not create live Prestige customer here |
| R-ERP-08 | Over-implementation / custom DocTypes | Anton / Cursor | Standard ERPNext first; smallest coherent increment | In force | Version 2 §2; #966 constraints | **PROVEN** (constraint) | Stop if a custom DocType is proposed |
| R-ERP-09 | Public GitHub repo + issue/PR continuity if the GitHub account is lost | Anton | Rulesets on `main`; no independent mirror yet | Open | #956 repository continuity section | **NOT PROVEN** | Independent mirror **REQUIRES DECISION** |
| R-ERP-10 | `#899` `MASTER_ADMIN_KEY` injected into ordinary Cursor Cloud runs | Anton (keep absent) | Must not be used as ERPNext auth; ordinary packets fail closed on ERPNext secrets | Current Factory Automation wakes show absence | 2026-08-19 wake **PRESENT** (`JE-2026-08-19-1`). 2026-08-20 #1010 and #1019 wakes **ABSENT**. Canonical WP6: `docs/operations/ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md`. Do not reopen #899 unless presence returns. | **PROVEN** (current absence) | Keep the name out of Factory Automation secrets; do not re-inject |
| R-ERP-11 | Duplicate internal programme Project created by concurrent factory runs | Cursor | Search-before-create on exact `project_name` | Mitigated in #966 apply script | `lib/erpnext/governance-programme.js` | **PARTIAL** | Re-run apply; do not invent a second name |
| R-ERP-12 | External Project Update / portal leak of internal programme | Cursor | No customer; no portal flag; no Notification enablement | Must remain closed | #954 / #966 acceptance | **PROVEN** (non-action) | Do not enable Workflow/Notification for this Project |
| R-ERP-13 | Live bank feed / stored bank credentials before volume or accountant need exists | Anton | Manual CSV/Excel import first; #1139/#1220 bank-feed **NOT REQUIRED** | In force for initial operation | `docs/erpnext/ERPNEXT_BANK_RECONCILIATION_READINESS_V1.md` | **PROVEN** (rule recorded) | Do not buy or connect a feed from a factory packet |

Closed or superseded rows stay in this table. Add a new ID if treatment changes.
