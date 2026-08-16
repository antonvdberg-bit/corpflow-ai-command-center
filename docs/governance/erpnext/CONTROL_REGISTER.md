# ERP control register

**Status:** Security, backup, access, change-management, and audit controls for the ERP programme.  
**Owner:** Anton (acceptance and privileged UI). Cursor records evidence only.  
**Review cadence:** with #953 Phase 1 / Phase 3 / Phase 9; sooner if #956 gaps close.  
**Environment:** `local` (docs). Live probes are `corpflow_test` / vendor-hosted ERPNext.  
**Source issues:** [#966](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/966), [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956), [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954)  
**Canonical audit (do not duplicate):** `docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md`  
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
| C-ACC-01 | Least-privilege integration identity `integrations@corpflowai.com` (not System Manager) | Anton | **PARTIAL** | Keep using token auth names `ERPNEXT_BASE_URL` / `ERPNEXT_API_KEY` / `ERPNEXT_API_SECRET`. Do not print values. |
| C-ACC-02 | Project / Task / Issue write via existing Sales Manager grant | Anton | **PROVEN** | Reuse #920 path; do not assign System Manager |
| C-ACC-03 | Privileged 2FA / System Settings / login-attempt policy | Anton | **NOT PROVEN** | Integration user HTTP 403 on System Settings (#956) |
| C-ACC-04 | `MASTER_ADMIN_KEY` absent from ordinary Cursor Cloud runs (#899) | Anton | **NOT PROVEN** | UI-only removal; factory must not use it as ERPNext auth |
| C-ACC-05 | Joiner / mover / leaver for ERPNext users | Anton | **NOT PROVEN** | Phase 3 work; not this packet |
| C-ACC-06 | Who may merge governance records on `main` | Anton | **PROVEN** | PR + required checks; Cursor does not self-merge unless the issue says so |

---

## Backup, restore, DR

| ID | Control | Owner | Mark | Next action |
|----|---------|-------|------|-------------|
| C-BK-01 | Vendor-hosted ERPNext scheduled backup + tested restore | Anton / vendor | **NOT PROVEN** | Read provider console; do not buy a DR server from #956 |
| C-BK-02 | Off-host restic → R2 ops heartbeat | Anton | **PARTIAL** | Mechanism proven; ERPNext volumes **not** in inventory |
| C-BK-03 | Self-hosted sandbox backup/restore | Anton | **PARTIAL** | One-shot 2026-06-01 on-host only |
| C-BK-04 | Neon Postgres PITR window documented + restore drill | Anton | **NOT PROVEN** | Document plan/retention in `POSTGRES_PROVIDER.md` when Anton reads the console |
| C-BK-05 | Recurring restore drill | Anton | **NOT PROVEN** | Phase 1 / Phase 8 |
| C-BK-06 | Independent GitHub mirror | Anton | **REQUIRES DECISION** | #956 repository continuity |

---

## Change management and audit trail

| ID | Control | Owner | Mark | Next action |
|----|---------|-------|------|-------------|
| C-CH-01 | Material ERP decisions on GitHub via PR, append/supersede only | Anton / Cursor | **PROVEN** | This register set |
| C-CH-02 | No custom DocType / schema from programme packets | Anton / Cursor | **PROVEN** | #966 / Version 2 boundary |
| C-CH-03 | No production accounting / tax / bank / payment mutation without exact Anton approval | Anton | **PROVEN** (gate) | Stop at the exact consequential action |
| C-CH-04 | No live email / WhatsApp / SMS / outreach from this environment | Cursor | **PROVEN** (non-action) | Do not enable Notification / Workflow for the programme Project |
| C-CH-05 | Frappe Version / form timeline on the internal Project | Cursor | *filled after Workstream C probe* | One synthetic note append; record blocker if unread |
| C-CH-06 | Protected operating-doctrine paths unchanged by this packet | Cursor | **PROVEN** | `docs/governance/erpnext/*` registers are not in `config/protected-operating-doctrine.v1.json` |

---

## Environment and exposure

| ID | Control | Owner | Mark | Next action |
|----|---------|-------|------|-------------|
| C-ENV-01 | CorpFlowAI-hosted app surfaces classified `corpflow_test`, not `client_production` | Anton | **PROVEN** | `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md` |
| C-ENV-02 | Vendor-hosted ERPNext is HTTPS on the public internet by host class | Anton | **PARTIAL** | VPN/IP restriction **REQUIRES DECISION** (#953 Workstream B) |
| C-ENV-03 | Self-hosted ERPNext loopback-only on `corpflow-exec-01` | Anton | **PARTIAL** | Previously documented; not re-verified in #966 |
| C-ENV-04 | No env/secret **value** change from this packet | Cursor | **PROVEN** | Names only |

---

## Programme-specific controls (#966)

| ID | Control | Owner | Mark | Next action |
|----|---------|-------|------|-------------|
| C-PRG-01 | One internal Project; search-before-create | Cursor | **PARTIAL** until live apply | `scripts/erpnext/apply-governance-programme.sh` |
| C-PRG-02 | Vision task marked complete with GitHub strategy reference | Cursor | **PARTIAL** until live apply | Link `VISION_AND_INTENDED_USE.md` + #954 approval comment |
| C-PRG-03 | No client portal / no Project Update emails | Cursor | **PROVEN** (design) | Confirm on read-back (`collect_progress` / portal fields off or absent) |
| C-PRG-04 | Evidence artefacts contain no secrets | Cursor | **PROVEN** (test) | `node-tests/erpnext-governance-programme.test.mjs` |
