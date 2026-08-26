# ERPNext WP7 — patch, backup, restore and monitoring closure v1

**Status:** Decision-ready closure of the remaining WP7 business-critical readiness controls. **No infrastructure mutation.**  
**Date (UTC):** 2026-08-26 (bounded refresh after provider-side update; supersedes stale 2026-08-20 version/patch marks only)  
**Source issue:** [#1010](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1010)  
**Continuation:** [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054) operator comment on #1010 (2026-08-26) — refresh this same issue, do not open a duplicate  
**Parent programme:** [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)  
**Audit baseline (do not redo):** [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956) / merged [PR #958](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/958) — `docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md`  
**Owner:** Anton (exact protected actions); Cursor Factory (this refresh)  
**Cursor agent ID:** `bc-68a0b368-bcaa-474f-8c55-dc2142a99a97`  
**Cursor agent URL:** https://cursor.com/agents/bc-68a0b368-bcaa-474f-8c55-dc2142a99a97  
**Cursor run ID:** `run-432de4e4-56e4-416b-91c2-798b8bf8b077`  
**Factory handoff run:** `32931635807`  
**Work request:** `cfai-wr-68a0b368-bcaa-474f-8c55-dc2142a99a97`  
**Anchor:** `<!-- ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1 -->`

<!-- ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1010
```

**Environment classification:** this packet is docs + read-only live probe. Surfaces inspected are CorpFlowAI-hosted **`corpflow_test`** floors plus the **vendor-hosted ERPNext** used for commercial test work. None of those are `client_production`.

**NO IMPLEMENTATION AUTHORIZED** beyond this closure record. This document does **not** authorize package/ERPNext upgrade, production restore, Neon restore, Monitor #14 timer enable, env/secret mutation, schema change, payment, external send, public launch, or merge.

Marks used here (issue #1010 vocabulary):

| Mark | Meaning |
|------|---------|
| **PROVEN** | Independent evidence from this run’s read-only probe and/or current public provider docs, dated. |
| **REQUIRES PROTECTED ACTION — \<one exact action\>** | Ordinary discovery is complete. The next step is one named consequential operator/provider action. |

This packet does **not** reopen the broad #956 inventory. `#899` is **not** re-investigated; `MASTER_ADMIN_KEY` presence on this run is incidental only.

---

## 0. Executive verdict

```text
WP7 SECURITY/PATCH/RECOVERY CLOSURE READY FOR REVIEW
```

That verdict means every remaining WP7 control is classified. It does **not** mean ERPNext is irreplaceable, and it does **not** mean vendor backups, restore, Neon PITR, or Monitor #14 are live-proven.

| # | Control | Mark |
|---|---------|------|
| 1 | Current deployed ERPNext / Frappe versions vs support + patch baseline | **PROVEN** |
| 2 | Whether an update is required now (not applied) | **PROVEN** — no security/support update required now |
| 3 | Vendor ERPNext backup coverage (schedule / retention / DB + files) | **REQUIRES PROTECTED ACTION — Anton opens the Frappe Cloud site Backups tab as Administrator and records enabled / last backup / retention / whether database + public files + private files + site config are listed** |
| 4 | Restore readiness | **REQUIRES PROTECTED ACTION — Anton-approved restore of a current vendor backup into a disposable Frappe Cloud site (do not overwrite the live commercial site)** |
| 5 | Neon / CorpFlowAI Postgres PITR window | **REQUIRES PROTECTED ACTION — Anton reads Neon Console → Settings → Instant restore and records plan name + history window (hours/days only; no connection strings)** |
| 6 | Monitoring / health | **PROVEN** for existing factory/server monitors producing current evidence; Monitor #14 enable remains a separate exact action below |
| 7 | Numbered RPO / RTO | **REQUIRES PROTECTED ACTION — Anton supplies the two missing numbers from controls 3 and 5 (Frappe Cloud backup retention + Neon history window) so RPO/RTO can be written** |

Prestige fast lane is **not** blocked by this packet.

**Reclassification vs merged PR #1011 (2026-08-20):** the prior “update required” mark is **stale**. Live 2026-08-26 GET shows **frappe 16.31.0 / erpnext 16.32.3**, which meets the #959 C5 floor (**erpnext ≥ 16.29.0**) and the later advisory floor (**≥ 16.31.0**). Current upstream **16.33.0** (2026-08-25) is optional routine, not a WP7 security blocker. The Frappe Cloud upgrade is **no longer** an Anton-required action from this packet.

---

## 1. What this packet reused (not redone)

| Source | Reused as |
|--------|-----------|
| #956 / PR #958 | Systems map, restic coverage limits, sandbox one-shot restore 2026-06-01, production-shell P-Backup NOT-STARTED, Monitor #14 authored-not-live, no second DR server |
| #959 due diligence | Support lifecycle (v16 through end-2029), C5 patch floor **erpnext ≥ 16.29.0**, C1–C3 backup/PITR/Monitor #14 conditions |
| #899 / PR #1000 | Security correction treated complete for this packet; not reopened |
| #1010 / merged PR #1011 | 2026-08-20 closure shape and remaining vendor/Neon/restore actions; version/patch marks refreshed only |
| #1055 / PR #1057 | Operator-cited hosted versions (frappe 16.31.0 / erpnext 16.32.3) independently re-probed this run |

---

## 2. Live / read-only evidence this run (2026-08-26)

Command: `bash scripts/erpnext/wp7-readiness-probe.sh`  
Artifact: `artifacts/erpnext/wp7-closure-1010/probe-log.txt`  
Identity: `integrations@corpflowai.com`  
Host family: `vendor_hosted_frappe_family` (hostname not recorded)

```text
frappe=16.31.0 erpnext=16.32.3 branch=HEAD
installed_apps: erpnext,frappe
email_delivery_service: not listed this run (was present on 2026-08-20; incidental; not a WP7 control)
System Settings list HTTP 500 (ProgrammingError on DocType)
System Settings doc HTTP 403
Scheduled Job Type HTTP 403
File HTTP 200 (attachments readable to this identity; not a backup proof)
Error Log HTTP 403
postgres_url_present: present
postgres_host_class: neon_tech
NEON_API_KEY: absent
MASTER_ADMIN_KEY: absent (incidental; #899 not reopened)
factory health HTTP 200 JSON ok=true status=healthy
production-pulse HTTP 200 JSON ok=true core.database_reachable=true
lux.corpflowai.com/ HTTP 200
lux.corpflowai.com/change HTTP 200
corpflowai.com/ HTTP 200
mutation: none
secret values printed: no
```

Public GitHub / provider docs (no secrets):

| Fact | Evidence |
|------|----------|
| Latest ERPNext release | `v16.33.0` published 2026-08-25 ([frappe/erpnext releases](https://github.com/frappe/erpnext/releases/latest)) — features / bug fixes; no security-advisory patch note in the release body |
| Latest Frappe Framework release | `v16.31.0` published 2026-08-11 ([frappe/frappe releases](https://github.com/frappe/frappe/releases/latest)) — **matches deployed** |
| v16 support window | End of 2029 (planned) ([Frappe supported versions](https://frappe.io/support-versions)) |
| Critical SSTI floor | [GHSA-qq49-v74j-hjh7](https://github.com/frappe/erpnext/security/advisories/GHSA-qq49-v74j-hjh7) / CVE-2026-72911 — affected **erpnext < 16.29.0**, patched **16.29.0**. Deployed **16.32.3** is above this floor. |
| Later medium advisories | [GHSA-48wc-j2qh-rcgw](https://github.com/frappe/erpnext/security/advisories/GHSA-48wc-j2qh-rcgw) and [GHSA-m5xh-ghvj-xjrv](https://github.com/frappe/erpnext/security/advisories/GHSA-m5xh-ghvj-xjrv) patched **16.31.0**. Deployed **16.32.3** is above this floor. |
| Factory control loop (Monitor #1) | Last completed **success** 2026-08-25T06:40:59Z, run [32818013764](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32818013764) |
| Frappe Cloud backup product docs | Daily backups; each backup is database + public files + private files + site config; offsite S3 on $25+/mo plans ([docs.frappe.io/cloud/sites/backups](https://docs.frappe.io/cloud/sites/backups)) — HTTP 200 this run |
| Neon Instant restore product docs | History window by plan (Free ≤6h, Launch ≤7d, Scale ≤30d); restore from root branch ([neon.com/docs/introduction/history-window](https://neon.com/docs/introduction/history-window)) — HTTP 200 this run |

### 2.1 Stale 2026-08-20 baseline (kept, not re-inventoried)

Merged PR #1011 recorded **frappe=16.25.0 / erpnext=16.26.2**, factory health + pulse **HTTP 500**, and “update required.” That version/patch/health snapshot is **superseded** by this run. Backup/restore/Neon/RPO marks were already exact protected actions and remain so.

---

## 3. Control close-out

### 1. Current deployed versions — **PROVEN**

| Line | Deployed this run | Support baseline | Patch / current baseline |
|------|-------------------|------------------|--------------------------|
| ERPNext | **16.32.3** | v16 supported through end-2029 | Floor from #959 C5: **≥ 16.29.0**. Advisory floor from #1011: **≥ 16.31.0**. Current release: **16.33.0**. |
| Frappe Framework | **16.31.0** | Same v16 major line | Current release: **16.31.0** (matches deployed). |
| Extra app | none listed this run | n/a | `email_delivery_service` was listed on 2026-08-20; not listed on 2026-08-26. Incidental; not a WP7 control. |

The commercial system of record remains the **vendor-hosted v16** site. The Hetzner sandbox/production-shell v15 line is **not** re-inventoried here (#956 S2).

Evidence date: **2026-08-26** GET `frappe.utils.change_log.get_versions` HTTP 200.

### 2. Patch / update posture — **PROVEN** (no security/support update required now)

An update is **not required now**.

- Deployed **erpnext 16.32.3** is **above** the #959 C5 floor of **16.29.0**.
- CVE-2026-72911 (critical SSTI) is patched from **16.29.0**; deployed line is **16.32.3**.
- The 2026-08-13 medium advisories patched at **16.31.0** are covered by **16.32.3**.
- Current upstream **16.33.0** (2026-08-25) is a routine feature/bug-fix release (Accounts Settings, Belgian CoA templates, MRP/Asset/AR report fixes). It is **not** a WP7 security-floor blocker.
- Deployed Frappe Framework **16.31.0** matches current upstream.

This packet **did not** apply packages, trigger a Frappe Cloud upgrade, or mutate hosting.

Optional later action (not required to classify this control): Anton may apply the vendor dashboard catch-up to **16.33.0** at a convenient window. That is ordinary vendor maintenance, not a remaining WP7 blocker.

### 3. Vendor ERPNext backup coverage — **REQUIRES PROTECTED ACTION**

Product docs say Frappe Cloud **can** take a daily backup of **database + public files + private files + site config**, with offsite S3 retention on $25+/month plans. That is **product capability**, not proof of **this** site.

This identity still cannot read backup jobs (unchanged vs 2026-08-20):

| Probe | HTTP | Meaning |
|-------|------|---------|
| System Settings (list) | 500 | Not a readable backup inventory |
| System Settings (doc) | 403 | Least-privilege working as designed |
| Scheduled Job Type | 403 | Backup schedule unread |
| File | 200 | Live attachments exist; **not** a backup |

**REQUIRES PROTECTED ACTION — Anton opens the Frappe Cloud site Backups tab as Administrator and records: backup enabled (yes/no), last backup timestamp, retention counts, offsite yes/no, and whether database + public files + private files + site config are each listed. Names only. Do not grant System Manager to the integration user for this proof.**

Do not buy a second server or paid DR product for this gap.

### 4. Restore readiness — **REQUIRES PROTECTED ACTION**

Documented **safe** restore path (vendor, not Hetzner):

1. Frappe Cloud dashboard → site → Backups / Actions → restore from a listed backup, or
2. Restore/migrate from the four backup files (database `.sql.gz`, public files `.tar`, private files `.tar`, site config `.json`) into a **new disposable site** ([migrate-an-existing-site](https://docs.frappe.io/cloud/sites/migrate-an-existing-site)).

The 2026-06-01 sandbox restore (#956 B6) was **on-host v15** into a disposable second site, then dropped. It is **not** a restore proof of the vendor-hosted v16 commercial test SoR.

This worker has **no** non-mutating restore test: any restore creates or overwrites a site. Production restore is forbidden.

**REQUIRES PROTECTED ACTION — Anton-approved restore of a current vendor backup into a disposable Frappe Cloud site. Do not overwrite the live commercial site. Record pass/fail and whether files/attachments came back. That restore is the exact consequential action.**

### 5. Neon / CorpFlowAI Postgres PITR — **REQUIRES PROTECTED ACTION**

Safe access this run:

- `POSTGRES_URL` **present**
- host class **`neon_tech`** (pooled)
- not `prisma.io` drift
- **no** Neon API credential in this worker
- **no** database mutation
- `docs/operations/POSTGRES_PROVIDER.md` §6 records the **product** Instant restore model and that **this project’s** history window is still unread

Connecting to Postgres cannot prove PITR. Only the Neon console (or a later approved read-only API) can.

**REQUIRES PROTECTED ACTION — Anton reads Neon Console → the CorpFlowAI project → Settings → Instant restore and records: plan name (Free / Launch / Scale / other) + history window (hours or days). No connection strings, no restore click in this packet.**

### 6. Monitoring / health — **PROVEN** (existing factory/server monitors) + one remaining enable action

Existing monitors that produced **current** evidence without mutation:

| Monitor | Current evidence (2026-08-26) |
|---------|-------------------------------|
| #1 Factory control loop | GitHub Actions **success** 2026-08-25T06:40:59Z ([run 32818013764](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32818013764)). Daily 06:00 UTC. Active. |
| #2 factory health | This worker GET **HTTP 200** JSON `ok: true`, `status: healthy` at 2026-08-26T04:51Z (`https://core.corpflowai.com/api/factory/health`). This **supersedes** the 2026-08-20 HTTP 500 snapshot. |
| #3 production-pulse | This worker GET **HTTP 200** JSON `ok: true`, `core.database_reachable: true` at 2026-08-26T04:51Z. Lux `/` and `/change` and apex `/` were **HTTP 200**. |
| #13 Uptime Kuma | Authored live 2026-06-16 with those floor URLs (`MONITORING_ARCHITECTURE.md`). This worker **cannot SSH** to re-confirm Kuma Up/Telegram. Do not change Kuma. |
| ERPNext vendor hostname | **Not** among Kuma’s eight sub-probes. Do not add an ERPNext probe in this packet (that would change monitoring configuration). |
| #14 Backup health timer | Still **authored / install-pending**. Enabling it **would** mutate `corpflow-exec-01`. Stopped. |

Exact remaining enable action (not performed): **Anton enables `corpflowai-ops-backup-health.timer` on `corpflow-exec-01` per `docs/operations/BACKUP_HEALTH_MONITOR.md` §7.** That is Monitor #14 only. It is **not** required to classify the existing factory/server monitors as currently producing evidence.

### 7. RPO / RTO — **REQUIRES PROTECTED ACTION**

RPO/RTO stay **UNKNOWN** until the two vendor windows exist as named numbers.

Inferable **only after** controls 3 and 5:

- Neon RPO ≈ Neon history window (once recorded)
- Vendor ERPNext RPO ≈ Frappe Cloud backup interval / retention (once recorded)
- exec-01 ops RPO ≈ last restic snapshot ≤36h **only if** Monitor #14 is live

**REQUIRES PROTECTED ACTION — Anton supplies Frappe Cloud backup retention and the Neon Instant restore history window (the two missing numbers). Cursor can then write numbered RPO/RTO in a follow-up docs PR. Do not invent numbers.**

---

## 4. Backup coverage summary (honest)

| Store | Included in a proven backup? | Retention | Restore tested? |
|-------|------------------------------|-----------|-----------------|
| Vendor-hosted ERPNext DB + files + config | **Unread** for this site. Product *can* include all four. | Unread | **No** (vendor disposable restore not done) |
| CorpFlowAI Postgres (Neon) | Provider Instant restore **typical**; **this project window unread** | Unread | **No** |
| restic → R2 ops heartbeat | Mechanism **proven** in #956; ERPNext volumes **not** in inventory | 7 daily / 4 weekly / 6 monthly (doc) | Harmless setup restore 2026-06-26 only |
| Sandbox v15 on exec-01 | One-shot 2026-06-01 on-host | n/a | Yes, disposable, **wrong SoR** |

---

## 5. Anton required

**YES** — only these exact consequential actions (ordinary docs/PR review is separate). The Frappe Cloud patched-v16 **upgrade is no longer required**.

1. Read the Frappe Cloud **Backups** tab (names only) as in control 3.
2. Restore a current vendor backup into a **disposable** site as in control 4.
3. Read Neon **Instant restore** history window as in control 5.
4. (Optional, ops not ERPNext) Enable Monitor #14 timer per `BACKUP_HEALTH_MONITOR.md` §7.

Do **not** treat this PR merge as any of those actions.

---

## 6. Protected boundaries honoured

- No firewall, DNS, TLS, or public-exposure change.
- No package upgrade, OS update, or server mutation.
- No secret **values** in this file, tests, JOURNAL, or artifacts.
- No production restore, no Neon restore, no DR deployment, no paid tool.
- No schema / env / payment / send / `client_production`.
- No ERPNext write.

**Protected gate encountered:** **YES** — stopped at the exact actions in §5. Ordinary discovery, docs, tests, and PR are complete.

---

## 7. Cross-links

- `docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md` (#956 baseline)
- `docs/governance/erpnext/ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1.md` (#959 C1–C5)
- `docs/governance/erpnext/CONTROL_REGISTER.md`
- `docs/operations/POSTGRES_PROVIDER.md` §6
- `docs/operations/BACKUP_HEALTH_MONITOR.md`
- `docs/operations/MONITORING_ARCHITECTURE.md`
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` §12 (v15 one-shot only)
- `scripts/erpnext/wp7-readiness-probe.sh`

---

## 8. Change log

- **2026-08-26** — Bounded #1054 refresh for #1010 after the provider-side update. Live GET: frappe **16.31.0** / erpnext **16.32.3**. Patch posture reclassified: **no security/support update required now**. Factory health + production-pulse **HTTP 200**. Vendor backup/restore, Neon Instant restore window, and numbered RPO/RTO remain exact protected actions. Verdict unchanged: **WP7 SECURITY/PATCH/RECOVERY CLOSURE READY FOR REVIEW**.
- **2026-08-20** — Initial WP7 closure for #1010 (merged PR #1011). Live then: frappe=16.25.0 / erpnext=16.26.2; update required; factory health/pulse HTTP 500. Those version/patch/health marks are stale.
