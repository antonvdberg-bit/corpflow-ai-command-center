# ERP control register

**Status:** Security, backup, access, change-management, and audit controls for the ERP programme.  
**Owner:** Anton (acceptance and privileged UI). Cursor records evidence only.  
**Review cadence:** with #953 Phase 1 / Phase 3 / Phase 9; sooner if #956 gaps close.  
**Environment:** `local` (docs). Live probes are `corpflow_test` / vendor-hosted ERPNext.  
**Source issues:** [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966), [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956), [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954), [#1010](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1010), [#1019](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1019)  
**Canonical audit (do not duplicate):** `docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md`  
**WP7 refresh (do not redo the audit):** `docs/operations/ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md`  
**WP6 refresh (do not redo #899 / #956 access):** `docs/operations/ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md`  
**Anchor:** `<!-- CORPFLOWAI_ERP_CONTROL_REGISTER_V1 -->`

<!-- CORPFLOWAI_ERP_CONTROL_REGISTER_V1 -->

Marks (issue #966 vocabulary):

| Mark | Meaning |
|------|---------|
| **PROVEN** | Independent evidence from repo record and/or a live probe. |
| **PARTIAL** | Mechanism exists; coverage, recency, or restore is incomplete. |
| **NOT PROVEN** | Claimed, typical, or unread — not verified. |
| **REQUIRES DECISION** | Anton or a named professional must choose. |

An Administrator / System Manager can still alter ERPNext application records and, with database access, history. GitHub PR history is the independent ledger (`ERP-D-2026-08-14-2`). That boundary is intentional, not a defect to “fix” with paid WORM/blockchain products in this packet.

---

## Access and identity

| ID | Control | Owner | Mark | Next action |
|----|---------|-------|------|-------------|
| C-ACC-01 | Least-privilege integration identity `integrations@corpflowai.com` (not System Manager) | Anton | **PROVEN** | #1019 `get_roles`: not Administrator / not System Manager. Extra Stock/Purchase/Accounts Manager roles reported, not stripped. Keep token auth names. Do not print values. |
| C-ACC-02 | Project / Task / Issue write via existing Sales Manager grant | Anton | **PROVEN** | Reuse #920 path; do not assign System Manager |
| C-ACC-03 | Privileged 2FA / System Settings / login-attempt policy | Anton | **NOT PROVEN** | #1019: System Settings still HTTP 403. Exact action: desk Settings → System Settings → Security (2FA + login/session/password policy) |
| C-ACC-04 | `MASTER_ADMIN_KEY` absent from ordinary Cursor Cloud runs (#899) | Anton | **PROVEN** | #1010 and #1019 Factory Automation wakes 2026-08-20: **absent**. Do not re-inject; factory must not use it as ERPNext auth |
| C-ACC-05 | Joiner / mover / leaver for ERPNext users | Anton | **PROVEN** | Runbook: `docs/runbooks/ERPNEXT_JOINER_MOVER_LEAVER_V1.md`. Owner Anton. No second identity system |
| C-ACC-06 | Who may merge governance records on `main` | Anton | **PROVEN** | PR + required checks; Cursor does not self-merge unless the issue says so |

---

## Backup, restore, DR

| ID | Control | Owner | Mark | Next action |
|----|---------|-------|------|-------------|
| C-BK-01 | Vendor-hosted ERPNext scheduled backup + tested restore | Anton / vendor | **NOT PROVEN** | #1010: integration user still HTTP 403 on backup jobs. Exact action: Frappe Cloud Backups tab (names only) + disposable-site restore. Do not buy a DR server. |
| C-BK-02 | Off-host restic → R2 ops heartbeat | Anton | **PARTIAL** | Mechanism proven; ERPNext volumes **not** in inventory |
| C-BK-03 | Self-hosted sandbox backup/restore | Anton | **PARTIAL** | One-shot 2026-06-01 on-host only (wrong SoR for vendor v16) |
| C-BK-04 | Neon Postgres PITR window documented + restore drill | Anton | **NOT PROVEN** | #1010: product model now in `POSTGRES_PROVIDER.md` §6; **this project’s** history window still unread. Exact action: Neon Settings → Instant restore (names only). |
| C-BK-05 | Recurring restore drill | Anton | **NOT PROVEN** | Blocked on C-BK-01 disposable restore; then monthly harmless drill |
| C-BK-06 | Independent GitHub mirror | Anton | **REQUIRES DECISION** | #956 repository continuity |

---

## Change management and audit trail

| ID | Control | Owner | Mark | Next action |
|----|---------|-------|------|-------------|
| C-CH-01 | Material ERP decisions on GitHub via PR, append/supersede only | Anton / Cursor | **PROVEN** | This register set |
| C-CH-02 | No custom DocType / schema from programme packets | Anton / Cursor | **PROVEN** | #966 / Version 2 boundary |
| C-CH-03 | No production accounting / tax / bank / payment mutation without exact Anton approval | Anton | **PROVEN** (gate) | Stop at the exact consequential action |
| C-AP-01 | Invoice existence never authorizes payment (`INVOICE_EXISTENCE_NEVER_AUTHORIZES_PAYMENT`); Purchase Invoice submit and Payment Entry stay separate protected actions | Anton | **PROVEN** (rule recorded) | #1098 / #1213 runbook. Do not Submit PI until #1055. Do not Pay from `show_pay_button`. Supplier CREATE 403 is a permission grant, not accountant policy. |
| C-CH-04 | No live email / WhatsApp / SMS / outreach from this environment | Cursor | **PROVEN** (non-action) | Do not enable Notification / Workflow for the programme Project |
| C-CH-05 | Frappe Version / form timeline on the internal Project | Cursor | **NOT PROVEN** | `VERSION_TRAIL_UNREADABLE`: Version + Comment HTTP 403; getdoc timeline empty. Note stamp on `PROJ-0002` is readable. Do not enable site-wide tracking. |
| C-CH-06 | Protected operating-doctrine paths unchanged by this packet | Cursor | **PROVEN** | `docs/governance/erpnext/*` registers are not in `config/protected-operating-doctrine.v1.json` |

---

## Environment and exposure

| ID | Control | Owner | Mark | Next action |
|----|---------|-------|------|-------------|
| C-ENV-01 | CorpFlowAI-hosted app surfaces classified `corpflow_test`, not `client_production` | Anton | **PROVEN** | `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md` |
| C-ENV-02 | Vendor-hosted ERPNext is HTTPS on the public internet by host class | Anton | **PARTIAL** | VPN/IP restriction **REQUIRES DECISION** (#953 Workstream B) |
| C-ENV-03 | Self-hosted ERPNext loopback-only on `corpflow-exec-01` | Anton | **PARTIAL** | Previously documented; not re-verified in #966 |
| C-ENV-04 | No env/secret **value** change from this packet | Cursor | **PROVEN** | Names only |
| C-PT-01 | Vendor ERPNext on patched v16 (≥ 16.31.0 / current 16.x) | Anton | **NOT PROVEN** | #1010 live read: erpnext **16.26.2** / frappe **16.25.0**. Update required; do not apply from a factory packet. Exact action: Frappe Cloud dashboard upgrade. |

---

## Programme-specific controls (#966)

| ID | Control | Owner | Mark | Next action |
|----|---------|-------|------|-------------|
| C-PRG-01 | One internal Project; search-before-create | Cursor | **PROVEN** | `PROJ-0002` created 2026-08-16; re-run must reuse |
| C-PRG-02 | Vision task marked complete with GitHub strategy reference | Cursor | **PROVEN** | `TASK-2026-00025` status Completed |
| C-PRG-03 | No client portal / no Project Update emails | Cursor | **PROVEN** (design) | Confirm on read-back (`collect_progress` / portal fields off or absent) |
| C-PRG-04 | Evidence artefacts contain no secrets | Cursor | **PROVEN** (test) | `node-tests/erpnext-governance-programme.test.mjs` |
