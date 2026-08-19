# ERPNext / server backup, security, DR and repository continuity — audit v1

**Status:** Decision-ready audit (docs + read-only live probe). **No infrastructure mutation.**  
**Date (UTC):** 2026-08-14  
**Source issue:** [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956) (parent [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953) / [#954](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/954))  
**Owner:** Anton (operator decisions); Cursor Factory (this audit)  
**Cursor agent ID:** `bc-fbaefdf5-034f-4d76-b894-0f20d34b2f9c`  
**Anchor:** `<!-- ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1 -->`

<!-- ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1 -->

**Environment classification:** this packet is **docs-only** (`local`). Surfaces inspected are CorpFlowAI-hosted **`corpflow_test`** (Vercel/Neon app, `corpflow-exec-01-u69678`) plus the **vendor-hosted ERPNext** used for #880/#882/#920. None of those are `client_production`.

**NO IMPLEMENTATION AUTHORIZED** beyond this audit record. This document does **not** authorize firewall/network changes, package upgrades, server mutation, secret/env changes, production restore, DR deployment, paid tooling, or merge.

Classification key used on every control:

| Mark | Meaning |
|------|---------|
| **PROVEN** | Independent evidence from repo record and/or this run’s read-only probe. |
| **PARTIAL** | Mechanism exists, but coverage, recency, or restore is incomplete. |
| **NOT PROVEN** | Claimed or typical, but this audit could not verify it. |
| **NOT PRESENT** | No mechanism found. |
| **REQUIRES DECISION** | Anton must choose; Cursor cannot close it from repo/API evidence. |

---

## 0. Executive verdict

**ERPNext BUSINESS-CRITICAL BACKUP/DR/SECURITY: NOT PROVEN**

CorpFlowAI must **not** treat ERPNext as the irreplaceable system of record for real money, tax, or client contracts until the P0 gaps in § 6 are closed.

What is actually true today:

1. **The ERPNext that Cursor has been using for commercial work (#880 / #882 / #920) is vendor-hosted** (Frappe Cloud / ERPNext.com family; hostname not recorded). Live this run: **frappe 16.25.0**, **erpnext 16.26.2**, extra app `email_delivery_service`, identity `integrations@corpflowai.com`. That instance **does not live on** `corpflow-exec-01`. Losing the Hetzner box would **not** by itself destroy those commercial records.
2. **The Hetzner box** still holds the **sandbox** (loopback `:8080`, image `frappe/erpnext:v15.109.1`) and the **production shell** (loopback `:8081`). Those are **different versions and different data** from the vendor-hosted site. A one-shot sandbox backup/restore was proven on **2026-06-01**. There is **no** proven scheduled off-host backup of ERPNext MariaDB, files, or site config on the box.
3. **restic → Cloudflare R2** is operational for a **narrow ops heartbeat** (since 2026-06-26), destination off-host. It is **explicitly out of scope for production Postgres** and is **not proven** to include ERPNext volumes, n8n data, or Kuma’s SQLite. Independent backup-health Telegram alerting (**Monitor #14**) is **authored but not proven live**.
4. **CorpFlow app data** lives in **Neon Postgres** (sole approved provider). Provider-managed backup/PITR is **typical** for Neon and is **asserted** in older ops docs, but **`POSTGRES_PROVIDER.md` does not record plan, retention, or a restore drill**. Treat as **NOT PROVEN**.
5. **GitHub** is the durable engineering ledger. The repo is **public**, with **active** rulesets `main-protection` and `Tech_Partner` (PR + required checks + no force-push/delete). There is **no** independent mirror. **Dependabot alerts are disabled.** Continuity risk is **account/settings/issues**, not “can we clone the code.”
6. **Security:** loopback-only for self-hosted ERPNext is documented and previously verified. Vendor-hosted ERPNext is **HTTPS on the public internet** by nature of that host class. 2FA, backup encryption, and System Settings are **403** to the integration user — **NOT PROVEN**. `#899` **`MASTER_ADMIN_KEY` is still injected** into ordinary Cursor Cloud runs (**INCOMPLETE**). Later check 2026-08-19 (`JE-2026-08-19-1`, Factory Automation wake): still **PRESENT** after Anton’s 2026-08-13 Cloud Agents Secrets delete confirmation.

**RPO / RTO:** **UNKNOWN** for every irreplaceable store except “vendor-hosted ERPNext probably has provider backups we cannot currently read.”

---

## 1. What exists (systems map)

| System | Where | Business role today | Backup domain |
|--------|-------|---------------------|---------------|
| CorpFlowAI Next.js app | Vercel Production spine | Factory + tenant `corpflow_test` surfaces | GitHub source + Vercel redeploy; **not** a data store |
| Production Postgres | Neon (`POSTGRES_URL`) | Canonical app/CMP/auth data | Provider-managed (unverified here) |
| Vendor-hosted ERPNext v16 | Frappe Cloud / ERPNext.com family | Live commercial test used by Cursor Cloud | **Provider** (unread by this identity) |
| ERPNext sandbox v15.109.1 | `corpflow-exec-01` `127.0.0.1:8080` | Practice / Phase C history | One-shot 2026-06-01 on-host `bench backup` |
| ERPNext production shell | `corpflow-exec-01` `127.0.0.1:8081` | Visual/print-designer shell; not buyer-live | **P-Backup NOT-STARTED** |
| n8n, Uptime Kuma, restic timers | `corpflow-exec-01` | Ops supporting stack | restic heartbeat → R2 (narrow; see B3) |
| GitHub repo + issues/PRs | `antonvdberg-bit/corpflow-ai-command-center` (**public**) | Durable engineering/governance ledger | GitHub platform + local clones; no CorpFlow mirror |

Cursor Cloud **cannot SSH** to `corpflow-exec-01`. Live restic snapshot age, timer status, and on-box file lists are therefore **not re-verified in this run**. Box claims below use **repository operational records**, not a fresh L3 inspect.

---

## 2. Backup controls

| ID | Control | Mark | Evidence |
|----|---------|------|----------|
| **B1** | Vendor-hosted ERPNext (v16) database + files backed up on a schedule | **NOT PROVEN** | Integration user HTTP **403** on System Settings, Scheduled Job Type (`%backup%`), and `encrypt_backup`. Provider family **usually** includes backups; CorpFlowAI has **no** recorded restore, retention, or off-site copy of **this** site. |
| **B2** | Vendor-hosted ERPNext backup is off-host / off-failure-domain | **PARTIAL** | Host class is vendor-hosted, so data is **not** solely on `corpflow-exec-01`. Whether the vendor copies are in a **second** failure domain is **NOT PROVEN**. |
| **B3** | restic → R2 ops backup job exists | **PROVEN** (mechanism) / **PARTIAL** (coverage) | `docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md` (operational 2026-06-26): bucket name `corpflowai-ops-backups`, prefix `self-hosted-ops/restic`, heartbeat + retention timers, 7 daily / 4 weekly / 6 monthly + prune. Heartbeat backs up a **small ops path**, not a proven full inventory. Production Postgres **explicitly excluded**. |
| **B4** | restic includes ERPNext MariaDB, site files, attachments, credentials files | **NOT PRESENT** | Scope text lists n8n exports, Kuma data, compose/proxy, internal media, restore-test evidence. **ERPNext is not in that inventory.** Credentials files `~/.erpnext-*-credentials` must **never** be restic targets without a separate approved design. |
| **B5** | restic includes n8n + Kuma volumes (not just heartbeat file) | **NOT PROVEN** | Monitor #14 itself warns it cannot see whether Kuma’s volume is in a snapshot path set (`BACKUP_HEALTH_MONITOR.md` §8). |
| **B6** | Sandbox ERPNext backup + restore ever tested | **PROVEN** (one-shot, 2026-06-01) | `ERPNEXT_SANDBOX_INSTALL.md` §12; `JE-2026-06-01-1`: 82 = 82 Account rows; 3 = 3 enabled User rows. Restore was **on-host** into a disposable second site, then dropped. **Not** a recurring drill. **Not** off-host. |
| **B7** | Production-shell ERPNext backup + restore | **NOT PRESENT** | `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` **P-Backup / S-5 = NOT-STARTED**. Recipe exists; off-host destination **REQUIRES DECISION**. |
| **B8** | Neon / CorpFlow Postgres backup + PITR | **NOT PROVEN** | Neon is sole approved provider (`POSTGRES_PROVIDER.md`). `SELF_HOSTED_OPS_STACK_V1.md` §4 *asserts* PITR + branching; **`POSTGRES_PROVIDER.md` has no backup/retention/restore section**. No restore drill recorded. Plan/retention **REQUIRES DECISION** (Anton reads Neon console; names only). |
| **B9** | Backup integrity independently monitored | **PARTIAL** | Monitor #14 script + systemd templates **in-repo** (PR #641). **L3 timer enable pending Anton.** Until then, restic failures are **journal-only** on the box. Parser-fix note: box script must match git after 2026-07-27. |
| **B10** | Recurring restore drill (any store) | **NOT PRESENT** | One harmless restic restore at **setup** (2026-06-26). Sandbox restore **once** (2026-06-01). No monthly drill. No Neon restore. No vendor-ERPNext restore. |

**Included today (best current statement):**

- Git history of this **public** repo (GitHub + any laptop/cloud clones).
- A restic repository in **private** R2 with heartbeat snapshots (ops proof-of-life; exact path set **unverified this run**).
- Neon holds live app data (backup **unverified**).
- Vendor-hosted ERPNext holds live commercial test records (backup **unverified**).

**Excluded / not proven:**

- ERPNext sandbox/production-shell MariaDB + files + attachments (no scheduled off-host copy).
- Production Postgres dumps into R2 (forbidden without a separate approved runbook).
- Secret values, Infisical, Vercel env, Cursor Cloud secret **values**.
- GitHub issues, PR review threads, Actions logs, ruleset config, collaborator/admin settings (not in `git clone`).

---

## 3. Availability / disaster recovery

| ID | Control | Mark | Evidence |
|----|---------|------|----------|
| **D1** | Realistic recovery if `corpflow-exec-01` is lost | **PARTIAL** | **Survives:** Vercel app (redeploy from GitHub), Neon (if account intact), vendor-hosted ERPNext (separate vendor). **Dies with the box until restored:** n8n, Kuma, restic timers, sandbox, production shell, OpenHands (cold standby), on-host credentials files. Kuma runs **on** the box, so it **cannot** alert that the box is gone (`MONITORING_ARCHITECTURE.md` blind spot #8). |
| **D2** | Realistic recovery if vendor-hosted ERPNext is lost | **NOT PROVEN** | Depends entirely on **vendor backup/restore** we could not read (B1). GitHub docs reconstruct *process*, not live Customer/Quotation/GL rows. |
| **D3** | Realistic recovery if Neon project is lost | **NOT PROVEN** | Needs Neon PITR/branch restore **or** a separately approved dump. No drill. App without Postgres is not a working factory. |
| **D4** | Realistic recovery if GitHub account/repo is lost | **PARTIAL** | Source can be re-pushed from any clone (repo is public). **Issues, PR metadata, Actions history, rulesets, secrets, Infisical OIDC bindings are not in git.** One collaborator visible via API (`collaborators` length = 1). |
| **D5** | Documented RPO / RTO | **NOT PRESENT** | No numbered RPO/RTO in canonical ops docs. Inferable only as **UNKNOWN**. |
| **D6** | Cold/warm DR environment warranted at current scale | **REQUIRES DECISION** | **Recommendation:** **do not** buy a second server or paid DR site yet. Current scale is one operator, one Vercel project, one Neon project, one vendor ERPNext, one Hetzner box. Cheapest DR is **prove vendor + Neon restore**, **enable Monitor #14**, and **treat GitHub account recovery as a named person/process**. A warm replica of exec-01 is **not** the first lever. |

### If the main server is lost — recovery procedure (current, honest)

1. **Do not** try to “restore ERPNext commercial records from the box.” Those records are on the **vendor-hosted** site (B1/B2), not on Hetzner.
2. Confirm Vercel Production still serves `core.corpflowai.com` / `lux.corpflowai.com` from GitHub `main`. Redeploy if needed (merge/deploy remain Anton-gated).
3. Confirm Neon project is reachable (`/api/factory/health`, production-pulse). If Neon is gone, **stop** — that is a provider restore, not a restic restore.
4. Restore **ops** from restic R2 **only** into a **new disposable host/path** after Anton approves that restore packet. Never restore onto a live volume blindly. Coverage of n8n/Kuma is **unproven** (B5).
5. Sandbox / production-shell ERPNext: rebuild from `ERPNEXT_SANDBOX_INSTALL.md` / production-shell recipe; accept **data loss** of those loopback sites unless an on-host backup file still exists somewhere (not proven off-host).
6. Re-install Kuma only inside the existing § 5.5 carve-out; do **not** widen self-hosted tools.

**Dependencies to restore service:** GitHub account, Vercel project, Neon project, Infisical (env), Cursor Cloud secret **names**, DNS at the registrar, Telegram bots (factory + Kuma’s separate bot), vendor ERPNext account, R2 + restic password (ops only).

---

## 4. Security posture

| ID | Control | Mark | Evidence |
|----|---------|------|----------|
| **S1** | Exact deployed Frappe/ERPNext versions (vendor-hosted) | **PROVEN** | This run, GET-only probe: `frappe=16.25.0` `erpnext=16.26.2` `branch=HEAD`; apps `email_delivery_service,erpnext,frappe`. Identity `integrations@corpflowai.com`. |
| **S2** | Sandbox / production-shell versions and patch cadence | **PARTIAL** | Sandbox pin recorded 2026-06-01: `frappe/erpnext:v15.109.1`. Production-shell Print Designer work is PARTIAL in older docs. **No** patch owner or advisory watch for v15 **or** v16. Two major lines (15 vs 16) increases upgrade risk. |
| **S3** | Security advisories affecting those versions | **NOT PROVEN** | This audit did not scrape CVE feeds. **REQUIRES DECISION** to assign an owner and a monthly check of Frappe/ERPNext security announcements. |
| **S4** | Self-hosted ERPNext internet exposure | **PROVEN** (historical) / **NOT PROVEN** (this run) | Production shell mapped `127.0.0.1:8081` (2026-06-05 `docker ps`). Kuma K2 showed port 3001 not reachable from the public internet. Cursor Cloud cannot re-run `ss`/`docker ps` this run. |
| **S5** | Vendor-hosted ERPNext TLS / public reachability | **PARTIAL** | Host class uses `https` on a vendor family domain (FQDN **not** recorded). That **is** internet-reachable by design. WAF/IP allowlist/VPN **NOT PROVEN**. Restricting it is a **protected network change** — do not do it in this packet. |
| **S6** | Privileged access + 2FA | **NOT PROVEN** | System Settings and `enable_two_factor_auth` HTTP **403** to the integration user. Administrator 2FA on vendor site and GitHub org 2FA are operator-console facts. |
| **S7** | Least-privilege integration identity | **PARTIAL** | `integrations@corpflowai.com` can read 24 commercial DocTypes this run; **Payment Terms 403**; System Settings / Error Log / Activity Log / Version / Scheduled Job Type **403**. Item Price is now readable (was 403 on 2026-08-12 after #881 grant). Integration is **not** a System Manager via API-visible settings (roles list itself 403). Good containment; also means **this identity cannot audit backup/2FA**. |
| **S8** | `MASTER_ADMIN_KEY` not in ordinary Cursor Cloud | **NOT PRESENT** (control failed) | 2026-08-14 audit run: **PRESENT**. Later 2026-08-19 Factory Automation wake `bc-c67a9751-28cb-47e6-918a-29a13c213561`: still **PRESENT** (`JE-2026-08-19-1`) after Anton’s 2026-08-13 Cloud Agents Secrets delete confirmation. Remaining store is UI-only (Cloud Agents Secrets re-check and/or Factory Automation secrets). Values never printed. |
| **S9** | OS / app update posture on exec-01 | **NOT PROVEN** | No unattended-upgrades evidence in repo. L3 inspect required. |
| **S10** | Credential/secret exposure in git | **PARTIAL** | `.gitignore` includes `.env` / `*.env`. Probe scripts refuse to print `ERPNEXT_BASE_URL`. Repo is **public** — any future secret commit is immediately world-readable. `MASTER_ADMIN_KEY` **name** is documented; **value** must stay out of git (this audit contains none). |
| **S11** | Monitoring / incident evidence | **PARTIAL** | Kuma (Monitor #13) live for public CorpFlow floors + n8n `/healthz`. Factory Telegram path exists. Incident stub: `docs/runbooks/SECURITY_OR_INCIDENT.md`. ERPNext-specific audit log **not readable** to integration user. Backup-failure Telegram **not live** until Monitor #14 timer is on. |
| **S12** | GitHub Dependabot / vulnerability alerts | **NOT PRESENT** | `dependabot.yml` schedules version-update PRs, but API: **“Dependabot alerts are disabled for this repository.”** Supply-chain **alert** path is off. |

---

## 5. Repository / IP continuity

| ID | Control | Mark | Evidence |
|----|---------|------|----------|
| **R1** | Git source/history redundancy GitHub inherently provides | **PROVEN** | Git objects, tags, and public clones. Rulesets **active**: `main-protection`, `Tech_Partner` — `pull_request`, `required_status_checks`, `required_linear_history`, `deletion`, `non_fast_forward`; bypass actor count **0**. |
| **R2** | Issues, PR metadata, Actions logs, project settings | **NOT PRESENT** (as an independent copy) | Not included in `git clone`. Public issues are scrapeable but that is not a CorpFlow-owned backup. |
| **R3** | Access-loss / account-compromise recovery | **NOT PROVEN** | Personal namespace `antonvdberg-bit/…`, collaborators API length **1**, forks **0**. No documented second owner, recovery codes custody, or org-migration plan. |
| **R4** | Independent mirror / export | **NOT PRESENT** | No `git bundle` to R2, no second Git host. **Justification at current scale:** **low** for *source* (already public). **Higher** for *governance metadata* if GitHub account lockout is plausible. |
| **R5** | Smallest free/open continuity approach | **REQUIRES DECISION** | Recommended if Anton wants a belt: (1) GitHub 2FA + printed recovery codes in the existing operator vault (not git); (2) add a **second trusted GitHub owner** or convert to an org with two owners; (3) optional monthly `git bundle --all` onto the **existing** R2 bucket via a future Anton-gated packet — **do not** start it in this audit. |
| **R6** | Recovery ownership without exposing credentials | **PARTIAL** | Anton is sole proven owner. Cursor/GitHub Actions can open PRs; they cannot recover a locked GitHub user. Infisical OIDC identity IDs are in workflow files (not secrets); **values** of vault secrets are not. |

---

## 6. Gaps — severity, remedy, approval

| Gap | Severity | Smallest safe remedy | Anton approval required? |
|-----|----------|----------------------|--------------------------|
| Vendor ERPNext backups unread (B1) | **P0** | Anton opens vendor dashboard as Administrator; record **backup enabled / interval / retention / last restore** as names-only in a follow-up comment or superseding JE. Optional: grant the integration user **read** on System Settings / backup jobs only (UI Role Permission — same class as #881/#920 grants). | **Yes** for dashboard inspect (operator identity) and any permission grant. **No** for docs capture after. |
| Neon PITR/retention unknown (B8) | **P0** | Anton reads Neon console: plan, PITR window, restore button existence. Add a short section to `POSTGRES_PROVIDER.md` (names, no connection strings). | **Yes** to view billing/plan. Docs PR after is ordinary. |
| Monitor #14 not live (B9) | **P0** | Run existing L3 install in `BACKUP_HEALTH_MONITOR.md` §7; enable `corpflowai-ops-backup-health.timer`. Reinstall script from git (2026-07-27 parser fix). | **Yes** (L3 + Telegram env names on the box). Packet already authored. |
| `MASTER_ADMIN_KEY` still in Cursor Cloud (S8) | **P0** | Re-check Cloud Agents Secrets **and** Factory Automation secrets (`CorpFlowAI Factory Wake Proof v2`). Delete secret **name** `MASTER_ADMIN_KEY` from the remaining store. Keep the three ERPNext API names. Fresh Factory Automation wake must show **ABSENT**. 2026-08-19 re-probe still **PRESENT** (`JE-2026-08-19-1`). | **Yes** (UI-only). Already authorized by #899; **not** a new ceremony. |
| No recurring restore drill (B10) | **P1** | Monthly: `restic restore` **one harmless file** to a disposable dir; delete. Never production volumes / Postgres / ERPNext live sites. | **Yes** to schedule on the box. Harmless restore is not a production restore. |
| restic path set may omit Kuma/n8n/ERPNext (B4/B5) | **P1** | Anton-gated **read-only** `restic snapshots` + `ls` of include paths (no secret dump). Then a **separate** packet if ERPNext-on-box or Kuma volume must be added. Do **not** add MariaDB dumps or credentials files without a written include/exclude list. | **Yes** to widen backup scope. Inspect is ordinary if L3 is approved. |
| GitHub Dependabot alerts off (S12) | **P1** | Enable Dependabot **alerts** (and optionally security updates) in GitHub repo settings. `dependabot.yml` already exists for version PRs. | **Yes** (repo settings). Free. |
| GitHub single-owner continuity (R3) | **P1** | Second owner **or** GitHub org with two owners; 2FA + recovery codes in operator vault. | **Yes**. |
| Two ERPNext version lines (v15 box vs v16 vendor) (S2) | **P1** | Decide **one** system of record (this audit: **vendor-hosted v16** is the commercial test SoR). Do not grow sandbox/production-shell as a second ledger. Patch-watch that SoR. | **Yes** (SoR decision). Aligns with #953 programme; does not approve Phase D public DNS. |
| No numbered RPO/RTO (D5) | **P2** | After B1+B8 known, write RPO/RTO as “Neon = vendor window; ERPNext = vendor window; exec-01 ops = last restic snapshot ≤36h **if** Monitor #14 is live.” | Decision after evidence. |
| Independent git bundle (R4) | **P2** | Optional; **not** first. Public repo already has many copies of **source**. | Yes if implemented. |
| Second DR server / paid DR (D6) | **Deferred** | **Do not purchase.** | Would require explicit approval; **not recommended now**. |

---

## 7. Smallest prioritized fixes (before ERPNext is business-critical)

Do these **in order**. None of them are this PR’s job to execute on live infra.

1. **Prove vendor ERPNext backup + one restore into a disposable site** (or vendor “restore test” UI). Until then, commercial records are a **single-vendor hope**.
2. **Record Neon PITR window** and whether Anton can restore a branch without opening a support ticket.
3. **Turn on Monitor #14** so restic silence is visible off-box.
4. **Remove `MASTER_ADMIN_KEY` from ordinary Cursor Cloud** (#899 leftover).
5. **Enable GitHub Dependabot alerts** and confirm GitHub 2FA / recovery codes.
6. **Confirm restic include paths** (read-only). Add Kuma/n8n only if missing. Do **not** dump production Postgres to R2 in the same packet.
7. **Monthly harmless restore drill** (restic; later Neon and vendor ERPNext).

Only after 1–4 should #953 consider `ERPNext BUSINESS-CRITICAL USE APPROVED WITH CONDITIONS`. This audit alone is **not** that approval.

---

## 8. Docs drift called out (do not silently rewrite doctrine)

| Topic | Newer operational record | Older leftover |
|-------|--------------------------|----------------|
| restic live? | `SELF_HOSTED_OPS_R2_RESTIC.md` **operational 2026-06-26** | `CORPFLOW_SHARED_TODO.md` Step 3 still **unchecked / “not initiated”**; `SELF_HOSTED_OPS_STACK_V1.md` §4 still “deferred” |
| Production DB backup | Explicitly **out of restic scope**; Neon-managed | Some older text says “PITR as documented in POSTGRES_PROVIDER” — that file **does not** document PITR |

This audit does **not** rewrite those protected/baseline docs. A later docs-sync packet may, without claiming a new restic install.

---

## 9. Live / read-only evidence this run (2026-08-14)

Command: `bash scripts/erpnext/cursor-cloud-api-probe.sh` plus a GET-only classifier that **never printed** `ERPNEXT_BASE_URL`, keys, or hostname.

```text
ERPNEXT_BASE_URL / ERPNEXT_API_KEY / ERPNEXT_API_SECRET: present
MASTER_ADMIN_KEY: present   # #899 INCOMPLETE
authenticated_user: integrations@corpflowai.com
host_class: vendor_hosted_frappe_family
scheme: https
frappe=16.25.0 erpnext=16.26.2
installed_apps: email_delivery_service,erpnext,frappe
ERPNext access: PASS (GET-only)
Payment Terms: HTTP 403
System Settings / backup jobs / 2FA field: HTTP 403
mutation: none
secret values printed: no
SSH / Infisical runtime bridge: not used
```

GitHub (this run): repo **public**; rulesets `main-protection` + `Tech_Partner` **active**; Dependabot **alerts disabled**; collaborators length **1**.

---

## 10. Protected boundaries honoured

- No firewall, DNS, TLS, reverse-proxy, or public-exposure change.
- No package upgrade, OS update, or server mutation.
- No secret **values** in this file, tests, JOURNAL, or PR.
- No production restore, no DR deployment, no paid tool.
- No Neon/schema/env change.
- No ERPNext write (no backup kickoff, no user change, no submit/send).

**Protected gate encountered:** **NO** consequential action attempted. Remaining operator actions in § 6 are **exact** UI/console inspect or already-authorized #899 secret-name removal — not performed by this run.

---

## 11. Cross-links

- `docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md`
- `docs/operations/BACKUP_HEALTH_MONITOR.md`
- `docs/operations/MONITORING_ARCHITECTURE.md`
- `docs/operations/POSTGRES_PROVIDER.md`
- `docs/operations/SERVER_SAFETY_BASELINE_AND_CHATWOOT_DECISION_V1.md`
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` §12
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` (P-Backup)
- `docs/erpnext/ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899.md`
- `docs/runbooks/ERPNEXT_CURSOR_CLOUD_SECRETS_LEAST_PRIVILEGE_V1.md`
- `docs/runbooks/SECURITY_OR_INCIDENT.md`

---

## 12. Change log

- **2026-08-14** — Initial audit for #956. Verdict: **ERPNext BUSINESS-CRITICAL BACKUP/DR/SECURITY: NOT PROVEN**.
