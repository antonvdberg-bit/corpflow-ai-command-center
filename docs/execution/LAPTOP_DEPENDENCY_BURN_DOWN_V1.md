# Laptop dependency burn-down v1

**Status:** Planning queue — **no implementation authorized by this document.**

**Verdict:** `BURN-DOWN QUEUE CREATED — IMPLEMENTATION PACKETS REQUIRED`

**Owner:** Anton (approver). Planning author: Cursor (docs only).

**Captured:** 2026-06-18.

**Source audit:** `artifacts/audits/2026-05-23-weekend/05-laptop-local-dependencies.md`

**Companion docs:**

- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` — required for every migration packet
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — brain vs hands policy
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1/L2/L3 map
- `docs/execution/DELIVERY_ACCELERATION_V1.md` — Codex Cloud as planned L2 executor #2
- `docs/operations/FACTORY_CONTROL_LOOP.md` — P0 already on GitHub Actions

---

## 1. Problem statement

Anton's **Windows laptop (L1)** remains a **production throughput and risk bottleneck** for CorpFlow:

- Recurring drift checks and smokes still depend on Anton running `npm run …` locally when GitHub Actions coverage is incomplete or secrets live only in `.env.local`.
- PowerShell scripts are **Windows-coupled** and require factory-master or operator credentials on the laptop.
- When the laptop is closed, **scheduled read-only assurance** stops unless an **L2 surface** (GitHub Actions, Vercel cron, n8n) owns the job.

**Goal:** Migrate **eligible recurring / scheduled / read-only** work to approved **L2 surfaces** where safe — without widening trust boundaries, without putting factory master in CI casually, and **without** installing agents on `corpflow-exec-01`.

**Non-goal:** Move operator-only mutations (billing, tenant identity, Vercel env push, break-glass repairs) off the laptop — those stay **Anton-gated** per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.

---

## 2. Execution layer reminder

| Layer | Role | Burn-down target |
| ----- | ---- | ---------------- |
| **L1** | Cursor + Anton laptop — judgment, pairing, break-glass | **Reduce recurring runs**; keep one-off mutations |
| **L2** | GitHub Actions, Vercel cron, n8n, Codex Cloud (planned) | **Accept migrated read-only schedules** |
| **L3** | `corpflow-exec-01` — operator SSH, Kuma, ERPNext sandbox | **Not** a home for Cursor/Codex or new daemons |

---

## 3. Completed off-laptop progress (baseline)

| Item | State | Evidence |
| ---- | ----- | -------- |
| **Step 1 — n8n automation-forward** | **COMPLETE** | `JE-2026-06-17-2`; ingest + DB read-back + n8n consumer payload confirmed (`docs/CORPFLOW_SHARED_TODO.md`) |
| **Step 2 — Uptime Kuma** | **COMPLETE** | Monitor #13 active on `corpflow-exec-01`; 8 sub-probes Up (`JE-2026-06-16-3`) |
| **Step 3 — restic** | **Eligible / not initiated** | Anton hold: *do not proceed to restic* until separate authorization |
| **Factory control loop (P0)** | **IMPLEMENTED on L2** | `.github/workflows/factory-control-loop.yml` daily 06:00 UTC; `docs/operations/FACTORY_CONTROL_LOOP.md` — **no `MASTER_ADMIN_KEY`** |
| **Factory health ping** | **IMPLEMENTED on L2** | `.github/workflows/factory-health-ping.yml` |
| **Factory CMP drive** | **IMPLEMENTED on L2** (manual dispatch) | `.github/workflows/factory-cmp-drive.yml` — uses `CORPFLOW_CRON_SECRET` only |
| **Technical Lead cron** | **IMPLEMENTED on L2** | Vercel cron `/api/cron/technical-lead` per `vercel.json` |
| **Codex Cloud executor #2** | **PLANNED — not activated** | `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md` (Packet 7.2/7.3 pending) |

---

## 4. Candidate queue (P0–P2)

### 4.1 P0 — `factory-control-loop` Git ↔ deploy SHA comparison

| Field | Detail |
| ----- | ------ |
| **Priority** | P0 |
| **Today** | **Already on GitHub Actions** — `.github/workflows/factory-control-loop.yml` |
| **Proposed home** | **L2 — GitHub Actions** (canonical; no further migration needed) |
| **Required env (names only)** | `CORPFLOW_FACTORY_HEALTH_URL`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`, optional `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` |
| **`MASTER_ADMIN_KEY` required today?** | **No** |
| **`CORPFLOW_CRON_SECRET` usable instead?** | **N/A** — loop uses health URL + Vercel API, not CMP routes |
| **Mutation risk** | **None** — read-only; deploy hook **not** triggered from workflow |
| **Audit trail** | GitHub Actions run log + `loop.json` artifact (7-day retention) + optional Telegram on failure |
| **Rollback** | Disable workflow or remove schedule; no DB writes to reverse |
| **First verification step** | GitHub → Actions → *Factory control loop* → confirm last scheduled run **green**; confirm presence-only step shows health + Vercel secrets **configured** |
| **Remaining burn-down work** | **Operational close-out packet** — verify all intended repo secrets set; document in `#249` if any step shows `SKIPPED` |

---

### 4.2 P1 — `smoke-change-console-technical-lead`

| Field | Detail |
| ----- | ------ |
| **Priority** | P1 |
| **Script** | `scripts/smoke-change-console-technical-lead.mjs` (`npm run smoke:change-technical-lead`) |
| **Proposed home** | **L2 — GitHub Actions** scheduled smoke (daily or on `workflow_dispatch`) |
| **Required env (names only)** | `SMOKE_BASE_URL` (or default `https://core.corpflowai.com`), `SMOKE_TICKET_ID`, **`MASTER_ADMIN_KEY` or `ADMIN_PIN` or `SMOKE_FACTORY_TOKEN` or `SMOKE_COOKIE`** |
| **`MASTER_ADMIN_KEY` required today?** | **Yes** (unless `SMOKE_COOKIE` tenant session copied from browser) |
| **`CORPFLOW_CRON_SECRET` usable instead?** | **No today** — `technical-lead-latest` goes through `requireDormantGate`; cron Bearer not wired for this action |
| **Mutation risk** | **Read-only GET** — no writes if script unchanged |
| **Audit trail** | GHA log; optional `automation_events` ingest if extended later |
| **Rollback** | Remove/disable workflow file |
| **First verification step** | Run locally once with `--ticket=<id>`; then manual GHA `workflow_dispatch` before enabling schedule |
| **Blocker** | **Auth-normalization packet recommended first** — add cron-secret read-only path for `technical-lead-latest` (or dedicated factory smoke route) so GHA uses `CORPFLOW_CRON_SECRET` instead of factory master |

---

### 4.3 P1 — `smoke-lux-phase4c1-attachment-review`

| Field | Detail |
| ----- | ------ |
| **Priority** | P1 |
| **Script** | `scripts/smoke-lux-phase4c1-attachment-review.mjs` (`npm run smoke:lux-phase4c1`) |
| **Proposed home** | **L2 — GitHub Actions** — **preview-first** or **dedicated read-only subset** before any production schedule |
| **Required env (names only)** | `LUX_SMOKE_USERNAME`, `LUX_SMOKE_PASSWORD`, `LUX_SMOKE_BASE_URL` or `LUX_SMOKE_PREVIEW_BASE_URL`, optional `VERCEL_AUTOMATION_BYPASS_SECRET` / `CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET` |
| **`MASTER_ADMIN_KEY` required today?** | **No** — uses **tenant DB-backed login** (`POST /api/auth/login`) |
| **`CORPFLOW_CRON_SECRET` usable instead?** | **No** — tenant session smoke, not factory cron |
| **Mutation risk** | **HIGH — mutates production** — creates Lux client-request ticket, uploads attachments, publish/archive flows (`POST` to CMP router). **Not a read-only smoke.** |
| **Audit trail** | Script stdout; creates real CMP rows scoped to smoke ticket |
| **Rollback** | Archive smoke artifacts (`--archive-smoke-artifacts`); manual ticket cleanup if needed |
| **First verification step** | Run against **preview** URL with bypass secret; never schedule full script against production without Anton approval |
| **Burn-down note** | **Do not** lift verbatim to daily production cron. Split a **read-only** Lux smoke (public GET `/`, `/change`, attachment GET URLs) for GHA, or keep full script **manual / preview-only** |

---

### 4.4 P2 — PowerShell scripts (port only; do not schedule mutations)

| Script | Purpose | Proposed action | Schedule? |
| ------ | ------- | --------------- | --------- |
| `scripts/onboard-demo-tenants.ps1` | Demo tenant bootstrap via factory API | Port to `.mjs` for cross-platform **operator** use | **No** — mutates tenants |
| `scripts/ensure-postgres-schema.ps1` | Manual `ensure-schema` POST | **Deprecate** in favor of Vercel build `apply-ensure-schema-build.mjs` | **No** |
| `scripts/provision-luxe-maurice-test-login.ps1` | Test login provisioning | Port to `.mjs` for operator convenience | **No** — mutates auth |

| Field | Detail |
| ----- | ------ |
| **`MASTER_ADMIN_KEY` required today?** | **Yes** (all three) |
| **`CORPFLOW_CRON_SECRET` usable instead?** | **No** |
| **Mutation risk** | **High** — factory API mutations |
| **Audit trail** | Operator chat / `#249` STATUS; no standing cron |
| **Rollback** | N/A — operator-only |
| **First verification step** | Port one script to `.mjs`; run once from Anton laptop to parity-check; **do not** add GHA schedule |

---

## 5. Recommended first implementation packets

### 5.1 Immediate — P0 close-out (lowest risk, mostly done)

**Packet:** `Laptop-Burn-down-P0-Control-Loop-Closeout-1`

- **Goal:** Confirm `factory-control-loop.yml` runs daily with all intended secrets configured; no laptop needed for drift detection.
- **Why first:** Already implemented; **avoids `MASTER_ADMIN_KEY`**; read-only; migration checklist mostly satisfied.
- **Work:** Operator verifies GitHub repo secrets; one `#249` STATUS with run URL; update `FACTORY_CONTROL_LOOP.md` if secret gaps found.
- **Not in scope:** New workflow code unless a secret alias is missing.

### 5.2 First new automation — auth-normalization then Change Console smoke

**Packet A:** `Cron-Auth-Read-Only-Smoke-Normalization-1`

- **Goal:** Allow **read-only** factory/CMP smoke routes to authenticate with `Authorization: Bearer ${CORPFLOW_CRON_SECRET}` (same pattern as `factory-cmp-drive.yml`) instead of `MASTER_ADMIN_KEY`.
- **Candidate routes:** `technical-lead-latest` (GET, fixed ticket id) and/or a thin new `GET /api/factory/smoke/change-console` read-only aggregator.
- **Why before P1 smoke GHA:** `smoke-change-console-technical-lead.mjs` **requires factory master today**; migration checklist §2.1 prefers cron secret over master in CI.

**Packet B:** `Laptop-Burn-down-P1-Change-Console-Smoke-GHA-1`

- **Goal:** New `.github/workflows/smoke-change-console-technical-lead.yml` — `workflow_dispatch` first, then fixed daily schedule.
- **Secrets (names only):** `CORPFLOW_CORE_BASE_URL`, `CORPFLOW_CRON_SECRET`, `SMOKE_TICKET_ID` (or `CMP_SMOKE_CHANGE_TICKET_ID`).
- **Depends on:** Packet A merged and deployed.
- **Verification:** Green manual dispatch; diff stays read-only GET.

### 5.3 Defer — Lux phase 4C.1 full smoke on schedule

Keep **`smoke-lux-phase4c1-attachment-review.mjs`** as **operator / preview** until a **read-only Lux public-surface smoke** is designed. Do not schedule the full mutating script against production.

### 5.4 Parallel track — Codex Cloud (not laptop burn-down, but reduces L1 throughput load)

Activate per `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md` — docs/audit work moves to **Codex Cloud L2 executor**, not Anton's laptop.

---

## 6. Explicit holds (this burn-down plan)

The following are **out of scope** for all burn-down implementation packets unless Anton opens a **separate** authorized packet:

- No **production DB writes** from new scheduled jobs (except explicitly approved smoke tickets with rollback — Lux full smoke is **not** approved for prod schedule).
- No **tenant mutation** (`tenant_id`, hostnames, billing-exempt, wallet credits).
- No **Vercel env writes** (`scripts/vercel-env.mjs push`).
- No **billing / payment** changes.
- No **server daemon** or new **systemd/cron on `corpflow-exec-01`** for these jobs.
- No **Cursor or Codex on `corpflow-exec-01`**.
- No **restic** inside burn-down packets.
- No **new containers** (beyond existing authorized Kuma/ERPNext scope).
- No **n8n migration** of these checks in v1 (GHA is the preferred home for read-only git/deploy/health work).

---

## 7. Migration checklist gate

Every implementation packet that moves a job off the laptop **must** satisfy `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` §2 in full before merge — especially:

- §2.1 — prefer `CORPFLOW_CRON_SECRET` over `MASTER_ADMIN_KEY` in CI
- §2.3 — default read-only; no destructive side effects
- §2.5 — audit trail named; no secrets in logs
- §2.7 — disable path documented

---

## 8. Success metrics (burn-down v1)

| Metric | Target |
| ------ | ------ |
| Daily drift detection without laptop | **Met** when P0 close-out verified |
| Change Console smoke without laptop | **Met** after Packets A + B |
| Zero new `MASTER_ADMIN_KEY` in GitHub Actions | **Required** |
| Anton laptop runs for recurring checks | **Trend to zero** for P0/P1 read-only items |
| Operator mutations stay on laptop | **Preserved** |

---

## 9. Cross-references

| Doc | Role |
| --- | ---- |
| `artifacts/audits/2026-05-23-weekend/05-laptop-local-dependencies.md` | Original inventory |
| `docs/operations/MONITORING_ARCHITECTURE.md` | Monitor #1 control loop, full L2 map |
| `docs/operations/FACTORY_CONTROL_LOOP.md` | P0 runbook |
| `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md` | Parallel L2 executor #2 |
| `docs/execution/CLOUD_FIRST_AGENT_EXECUTION_MIGRATION_V1.md` | Migration epic design — bucket table, Codex GitHub handoff, cloud-first model (#485) |
| `.github/workflows/factory-control-loop.yml` | P0 implementation |
| `.github/workflows/factory-cmp-drive.yml` | Cron-secret auth pattern to copy |

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-18 | Initial burn-down queue — P0 state corrected (GHA already live); P1/P2 candidates with auth-normalization recommendation. |
