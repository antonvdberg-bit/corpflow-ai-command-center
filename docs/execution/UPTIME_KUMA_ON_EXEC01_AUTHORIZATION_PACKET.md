# Packet: Authorize Uptime Kuma on `corpflow-exec-01-u69678` (third-location monitoring only)

**Packet id:** `UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_V1`
**Date opened:** 2026-06-15
**Owner:** Approver = Anton; Executor of THIS packet = Cursor (L1, docs-only); Reviewer = Anton.
**Companion docs (canonical — read these to understand why every clause is what it is):**

- `docs/decisions/20260615-uptime-kuma-on-exec01.md` (the ADR this packet satisfies).
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` (packet shape).
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` (every § 2 checkbox addressed inline in § 6 below).
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5 (allowed L3 surfaces; this packet adds Kuma to § 5.5 carve-out), § 5.3 (hard rules — narrow exception; the rules themselves stay), § 5.4 (the L1 + L3 collaboration pattern the future install packet will follow), § 6 (absence list updated for the Kuma exception), § 10 (the gate this packet satisfies).
- `docs/operations/MONITORING_ARCHITECTURE.md` § 2 Monitor #13 row added by this packet, § 4 alert routing, § 11 status tables.
- `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3 (Phase 1 doctrine).
- `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 5 (Phase 1A gating analysis).

---

## 1. Goal

Authorize a single, narrow Uptime Kuma install on `corpflow-exec-01-u69678` for the explicit and only purpose of **third-location uptime monitoring** of CorpFlow public production URLs and the n8n host's own health endpoint, with operator-driven SSH-tunnel access only — closing blind spot # 7 of `MONITORING_ARCHITECTURE.md` § 6 ("no third-location uptime") without lifting any § 5.3 hard rule beyond this one named container.

This packet is **docs-only**. It does **not** install Kuma. The install runbook is a separate follow-up packet (`UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1`) that will be authored after Anton's merge of this packet, executed at L3 by Anton per the § 5.4 pattern, and verified against the floor URLs in § 6.6 below.

### 1.1 Required authorization language (canonical — cite this verbatim)

> **This packet authorizes only the minimum execution boundary change needed for Uptime Kuma to run as a monitoring service on `corpflow-exec-01-u69678`.**
>
> **It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications, backups/restic, chatbot/live-chat platforms, AI frameworks, or production shell access beyond the documented Kuma installation/operation path.**

This wording is the load-bearing carve-out language used in the companion ADR § 2, in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5, and in `JE-2026-06-15-1`. It must be cited whenever this carve-out is referenced (no paraphrase, no widening, no implied generalization). Any future packet that relaxes any clause in the second paragraph above requires its own ADR + authorization packet + § 10 gate.

## 2. Definition of Done

- [ ] `docs/decisions/20260615-uptime-kuma-on-exec01.md` exists with status PROPOSED at PR-open and flips to ACCEPTED on Anton's merge.
- [ ] This packet exists at `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` with all §§ 1–11 below filled in.
- [ ] `docs/operations/MONITORING_ARCHITECTURE.md` § 2 has a new **Monitor #13** row for "Uptime Kuma probe set (`corpflow-exec-01-u69678`)" with state explicitly noted as "AUTHORIZED — install runbook is a follow-up packet; not yet probing".
- [ ] `docs/operations/MONITORING_ARCHITECTURE.md` § 11.1 has a row for #13 with state `🟡 authorized, not installed`. § 11.2 has a row for `kuma-on-exec01-install` follow-up.
- [ ] `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` has a new § 5.5 "Authorized exceptions to § 5.3 hard rules" subsection naming Kuma as the **first and only** named exception; § 6 absence list rows for Docker / persistent-daemon / scheduled-jobs each gain a "(see § 5.5 — Uptime Kuma carve-out)" suffix.
- [ ] `AGENTS.md` Must-read table has a new row pointing at this authorization packet.
- [ ] `docs/decisions/JOURNAL.md` has a new `JE-2026-06-15-1` row recording the decision + reversibility.
- [ ] `docs/CORPFLOW_SHARED_TODO.md` Step 2 row points at this authorization packet (current state: BLOCKED → AUTHORIZED-PENDING-INSTALL on merge).
- [ ] `artifacts/chat_history.md` has a dated bullet for this packet (per `.cursor/rules/chat-history-cadence.mdc`).
- [ ] `npm test` passes locally on the PR branch.
- [ ] PR opened against `main`, CI green, awaiting Anton's review (this is the **AAP § 3 gate** — Anton's merge IS the authorization).

## 3. Scope

**In scope (this packet):**

- Authorization-only docs change: ADR + this packet doc + `MONITORING_ARCHITECTURE.md` row + `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 carve-out + § 6 row suffixes + `AGENTS.md` row + JE row + SHARED_TODO Step 2 update + chat_history bullet.
- Zero install commands, zero L3 keystrokes, zero Kuma container bytes on the box.
- Zero new env var names introduced in `.env.template`.
- Zero changes to runtime code, API routes, Postgres schema, or Vercel project settings.

**Out of scope (this packet):**

- Authoring the install runbook itself. That is the follow-up packet `UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1` (not in this round).
- Running any `docker compose`, `docker run`, `apt-get install`, `bench`, `git pull`, or other shell commands on the box.
- Opening any public port, configuring any DNS record, exposing Kuma at a public URL, or putting Kuma behind a reverse proxy.
- Adding Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework, additional self-hosted tools, or any second container of any kind. **This carve-out is for Uptime Kuma alone.**
- Authorizing any tenant data on the box, any DB write capability, any production secret beyond Kuma's own bot/SMTP creds.
- Authorizing the n8n migration onto `corpflow-exec-01` (separate `n8n-on-exec01` packet remains UNAUTHORIZED in `MONITORING_ARCHITECTURE.md` § 11.2).
- Step 3 / restic backup discipline (gated on Steps 1 + 2 of `SELF_HOSTED_OPS_STACK_V1.md` being COMPLETE — this packet only authorizes Step 2's install gate).

## 4. Constraints

Hard rules this packet **must not violate**, in addition to the global `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`:

- Docs-only PR. Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`.
- Zero new env var names. The `.env.template` is **not** modified by this packet (Kuma's own credentials live on the box, never in repo, per ADR § 3).
- Zero secrets in repo, logs, screenshots, PR body, JOURNAL row, or chat_history bullet.
- Zero L3 commands authored, suggested, or executed by THIS packet. `HOST_MISMATCH` guard from `JE-2026-06-04-1` is not triggered because this packet has no L3 step.
- Zero new public exposure. Kuma is bound to `127.0.0.1:3001` loopback only; UI access is operator-driven SSH local-port-forward.
- Zero generalization. The carve-out in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 names **Uptime Kuma** specifically. Any second tool requires its own ADR + authorization packet + § 10 gate.
- Zero modification to monitors #1–#12. Kuma is added as #13; the existing 12-monitor architecture is not refactored by this packet.
- Zero modification to alert routing (§ 4.1 / § 4.2 of `MONITORING_ARCHITECTURE.md`). Kuma uses its own bot/SMTP — separate failure domain.
- Zero contradiction with the Phase 1 doctrine in `SELF_HOSTED_OPS_STACK_V1.md` (Kuma was already named there as a Phase 1 supporting service).

## 5. Risks

| Risk | Blast radius | Mitigation |
|---|---|---|
| § 5.5 carve-out wording is too loose and accidentally authorizes Chatwoot / Open WebUI / Langfuse / etc. | High (governance drift; future agents misread the doc as "Docker is OK now") | Wording is explicit: *"Uptime Kuma is the **first and only** named, narrow, packet-gated exception. No other tool is authorized by this carve-out. Any further exception requires its own ADR + authorization packet + § 10 gate."* Forbidden-tool list pinned in the carve-out and in this packet's § 3 out-of-scope list. |
| `MONITORING_ARCHITECTURE.md` Monitor #13 row gives the impression Kuma is already running and thereby contradicts § 5 always-on minimum (operator looks at the row, doesn't realize Kuma isn't installed yet, treats blind spot # 7 as closed). | Medium (false sense of coverage) | Row state is explicitly `AUTHORIZED — install runbook is a follow-up packet; not yet probing`. § 11.1 status row is `🟡 authorized, not installed`. § 11.2 has the install follow-up packet listed. Three independent doc loci, all consistent. |
| ADR is merged but the install runbook is never authored, leaving permanent docs-only authorization with no install. | Low (no operational impact; only doc drift) | Install runbook is the natural follow-up packet; if Anton declines the install later, a superseding `JE-YYYY-MM-DD-N` row reverses this ADR. Either path keeps the boundary doc honest. |
| Kuma container, once installed, accidentally exposes admin UI on a public port or reverse proxy. | High (admin takeover) | Constraint: bind to `127.0.0.1:3001` only; install runbook will hard-code this; first-week Phase 1A live-verification check confirms the port is **not** listening on `0.0.0.0`. Documented in ADR § 4 threat row 1. |
| Kuma probe loop hammers a CorpFlow URL with too aggressive an interval and creates real production traffic load. | Low–Medium (Vercel cost / log noise) | First-week interval cap: ≥ 60 s per monitor. Operator reviews intervals before enabling. No probes against state-mutating routes. Documented in ADR § 4 threat row 4. |
| Operator forgets the install is L3-only and tries to author commands from a Cursor session that has no SSH. | Low | Install runbook will hard-code the § 5.4 pattern; this authorization packet does **not** include any L3 commands; the `HOST_MISMATCH` rule from `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 7 catches the slip. |
| n8n primary-alert circular dependency (Kuma → n8n → Telegram, when n8n is down). | High (operator never learns about an outage) | Hard rule: Kuma's primary alert (Telegram or SMTP) must not pass through n8n. Documented in ADR § 6. Verified at install time by the operator forcing a fail with n8n stopped. |

A packet with no plausible risks is suspicious — these six are the ones that matter.

## 6. Migration-to-server checklist (every § 2 row of `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`, addressed inline)

This packet adds a recurring server-side surface (Kuma's internal probe scheduler), so `MIGRATION_TO_SERVER_CHECKLIST.md` § 1 applies. Every § 2 row below is filled in for THIS authorization packet and the install runbook follow-up packet that it gates.

### 6.1 Credential placement (§ 2.1)

- [x] **Source of truth identified.** Three credential kinds: (a) **Kuma admin password** (operator's password manager → install-time copy in Kuma's encrypted SQLite DB at `~/uptime-kuma-data/kuma.db`); (b) **Kuma Telegram bot token + chat id** (separate Telegram bot from `TELEGRAM_BOT_TOKEN` — operator creates a dedicated bot via BotFather; stored in Kuma's notification config inside the same SQLite DB); (c) optional **Kuma SMTP relay creds** (operator-side mailbox app password, never `support@corpflowai.com` Gmail OAuth). **Names only:** `KUMA_ADMIN_PASSWORD`, `KUMA_TELEGRAM_BOT_TOKEN`, `KUMA_TELEGRAM_CHAT_ID`, `KUMA_SMTP_PASSWORD` — these names are illustrative; they live in the operator's password manager and Kuma's config, **not** in `.env.template`. Zero new env vars in repo.
- [x] **Target home chosen.** Kuma's encrypted SQLite DB on the box (operator's home dir), backed by the operator's password manager. Not Vercel env, not GitHub Actions secrets, not Infisical — Kuma is a separate failure domain by design.
- [x] **No credential broadening.** Kuma holds zero CorpFlow secrets. Specifically: zero `POSTGRES_URL`, zero `MASTER_ADMIN_KEY`, zero `VERCEL_*`, zero `CORPFLOW_AUTOMATION_*`, zero `N8N_EMAIL_WEBHOOK_*`, zero Stripe / payment / banking, zero `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ALERT_CHAT_ID`. Kuma's bot is **distinct** from the in-repo bot. No `policy:` PR is needed because no audience is broadened.
- [x] **No factory master in CI.** N/A — this packet adds no CI workflow; the install runbook adds no CI workflow either. Kuma's probes run on the box; alert routing is Kuma → Telegram/SMTP direct.
- [x] **Rotation story.** Kuma admin password: operator regenerates in password manager, updates in Kuma UI under Settings → Security; one operator action, no code change. Kuma Telegram bot token: rotate via BotFather; update in Kuma → Notifications → edit bot. SMTP password: rotate in mail provider; update in Kuma → Notifications → edit SMTP. None of these touch the repo.

### 6.2 Parameterization / no machine-local state (§ 2.2)

- [x] **No hard-coded paths.** Install runbook will use `~/uptime-kuma-data/` (operator home dir, expanded by shell). No `C:\Users\anton\…` (the box is Linux). No profile-relative paths.
- [x] **No hard-coded hostnames.** Monitor URLs are configured in Kuma's UI by the operator at install time, not in repo. The install runbook references CorpFlow URLs by name only (e.g. `https://core.corpflowai.com/api/factory/health`); this is the same posture as `MONITORING_ARCHITECTURE.md` § 5.
- [x] **No "first-run" assumptions.** Kuma's first-run setup wizard is a one-time operator interaction over the SSH tunnel; subsequent boots auto-resume from the SQLite DB. No browser-saved credentials, no OS keyring dependency.
- [x] **`bootstrap-repo-env.mjs` import discipline.** N/A — Kuma is not a Node script that reads `process.env`. It is a Docker container with its own config DB.

### 6.3 Idempotency and safety (§ 2.3)

- [x] **Idempotent on success.** `docker compose up -d` is idempotent: re-running it with the same Compose file is a no-op when the container is already running with the same spec. Probe runs are stateless from CorpFlow's perspective (they are GET requests against existing public URLs).
- [x] **Idempotent on partial failure.** If the container dies mid-probe-cycle, the next cycle reads the same monitor list from the SQLite DB and resumes. No half-states leak into CorpFlow.
- [x] **No destructive side effect by default.** Kuma probes are GET-only against URLs that do not mutate state. Forbidden in install runbook: probes against `POST /api/automation/ingest`, any `/api/admin/*`, any factory-master path, any tenant-write path. **Repeated** in install runbook § 0 hard limits.
- [x] **`tenant_id` is read-only in this job.** Kuma never sees a `tenant_id`. It only probes public URLs by hostname / path. Zero DB connection.

### 6.4 Failure / retry behavior (§ 2.4)

- [x] **Timeouts.** Default Kuma HTTP probe timeout is 48 s; install runbook will document the operator's chosen value (recommend 10 s for `/api/factory/health`, 15 s for landing-page HTML, longer only if needed). Configurable per monitor.
- [x] **Retries are bounded.** Kuma's "retries before alert" is per-monitor; install runbook recommends 2 retries (3 total attempts) before an alert fires — avoids one-blip noise.
- [x] **Loud failure.** Kuma's primary alert (Telegram via Kuma's own bot, optionally SMTP) fires on monitor down. Test alert is required at install time per ADR § 6.
- [x] **Quiet success.** Kuma does not page on success. Daily roll-up summaries are optional and routed to Kuma's own email/Telegram, not the in-repo channels.

### 6.5 Audit trail (§ 2.5)

- [x] **Where the run is recorded.** Each probe run is recorded in Kuma's SQLite DB; visible in the UI under Monitor → History. The DB is the audit trail. Operator-readable over the SSH tunnel.
- [x] **What is recorded.** Per-probe: timestamp, status (up/down), latency, HTTP status code, optional response body excerpt for content-marker monitors. Optionally TLS cert expiry. **Never** secrets — Kuma probes do not send `Authorization` headers (the URLs in scope are all public).
- [x] **What is NOT logged.** No `Authorization` headers (none are sent by these probes); no request bodies (probes are GET-only); no factory-master or tenant secrets (Kuma has none). Per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § Logging discipline.

### 6.6 Schedule / trigger discipline (§ 2.6)

- [x] **Hobby-cron-safe.** N/A — Kuma's probe scheduler is internal to the container, not a Vercel cron. `npm run verify:vercel-hobby-crons` is unaffected by this packet (does not touch `vercel.json`).
- [x] **GitHub Actions schedule expressed in UTC.** N/A — no GitHub Actions workflow added.
- [x] **No overlapping invocations.** Kuma's internal scheduler is single-threaded per monitor; no overlap. Probe interval ≥ 60 s for the v1 monitor set.

### 6.7 Rollback plan (§ 2.7)

- [x] **Disable path documented.** ADR § 5 step 1: `docker compose -p uptime-kuma down` on the box (≤ 60 s, no app-tier impact). Step 2: full uninstall `docker compose down -v` + `rm -rf ~/uptime-kuma-data/` (≤ 5 min). Step 3: revert this PR's merge commit (atomic for repo state). Step 4: per-row revocation via superseding JE row.
- [x] **Reversibility named.** "Stopping the Kuma container restores the previous (no-third-location-monitoring) state in ≤ 60 s. The CorpFlow runtime, Vercel project, GitHub workflows, Postgres, public pages, ERPNext production-shell, ERPNext sandbox, n8n state, Plausible, SBM, and DNS are all unchanged by both the install and the rollback."
- [x] **No silent data drift.** Kuma never writes to Postgres or any CorpFlow surface; probes are GET-only. Rolling back the install removes the probes without leaving residual rows anywhere in CorpFlow's DB.

### 6.8 Documentation discipline (§ 2.8)

- [x] **Canonical doc updated.** `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3 already names Kuma; this packet adds the operational gate that authorizes the install. `docs/operations/MONITORING_ARCHITECTURE.md` § 2 + § 11 updated by THIS packet.
- [x] **`.env.template` updated.** N/A — no new env var (Kuma's creds are box-local; ADR § 3 lists them).
- [x] **`AGENTS.md` Must-read row added.** Yes, by this packet.
- [x] **`docs/decisions/JOURNAL.md` row.** Yes — `JE-2026-06-15-1` added by this packet.

### 6.9 Anti-patterns avoided (§ 8 of MIGRATION checklist)

- ❌ "We need `MASTER_ADMIN_KEY` in CI to make this work." → No: Kuma uses its own creds for its own Telegram bot. Zero CorpFlow secrets on the box.
- ❌ "We'll log the request body for debugging." → No: Kuma is GET-only against public URLs.
- ❌ "It's idempotent because it checks first then writes." → No: probes don't write at all.
- ❌ "We can fix it manually if it goes wrong." → No: rollback is `docker compose down`, ≤ 60 s.
- ❌ "We'll skip the schedule guard." → N/A: not a Vercel cron.

### 6.10 Verification floor (§ 7 of MIGRATION checklist)

For THIS authorization packet (docs-only): `npm test` passes, `npm run build` passes (sanity check; this packet does not change runtime), Delivery Reality Audit not applicable (zero customer-visible behavior change). For the install runbook follow-up packet: same plus the live verification block in § 9 below.

## 7. Allowed actions (this packet)

- Read-only inspection of the repo (already done).
- Docs updates under `docs/decisions/`, `docs/execution/`, `docs/operations/`, `AGENTS.md`, `docs/CORPFLOW_SHARED_TODO.md`, `artifacts/chat_history.md`.
- Branch creation under `docs/*` or `chore/*`.
- Run `npm test` and `npm run build` for sanity (no runtime change expected).
- Open a PR (no merge by Cursor).
- Capture `ReadLints` output for changed files; capture `npm test` summary.

**Not allowed by this packet** (would require a different packet):

- Authoring the install runbook itself (separate follow-up packet).
- Any L3 SSH command, any `docker compose`, any `apt`, any `bench`, any `ssh anton@5.78.213.185`.
- Any `.env*` edit, any `vercel.json` edit, any `.github/workflows/*` edit.
- Any change to runtime code, API routes, Prisma schema, package manifests, or CI workflow files.
- Any change to alert routing in `MONITORING_ARCHITECTURE.md` § 4.1 / § 4.2.

## 8. Approval gates

1. **Pre-merge gate (the AAP § 3 gate this packet exists for).** PR opened, CI green, awaiting Anton's review. Anton's merge IS the authorization. This is the gate that flips the ADR from PROPOSED → ACCEPTED, the boundary doc § 5.5 carve-out from "PROPOSED in PR" to "in effect on `main`", and the `MONITORING_ARCHITECTURE.md` Monitor #13 row from "AUTHORIZED-PENDING-INSTALL (PR not merged)" to "AUTHORIZED-PENDING-INSTALL".
2. **Pre-install gate (post-merge of THIS packet).** Once this packet is merged, the **install runbook follow-up packet** (`UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1`) requires its own separate Anton approval before any L3 keystroke. Cursor authors the runbook at L1; Anton reviews + merges; then Anton (only Anton, at L3 keyboard) pastes the install commands.
3. **Pre-secret-change gate.** N/A for this packet (no secrets touched). Becomes active for the install runbook (when operator generates Kuma admin password + bot token + SMTP creds — all box-side, never repo).
4. **Pre-DNS gate.** N/A (no public exposure; loopback-only by design).
5. **Pre-billing gate.** N/A (Uptime Kuma is open source; Hetzner box is already paid for).

**Default rule:** when uncertain whether to stop, stop.

## 9. Verification evidence (this packet — docs-only)

- **Local checks:** `npm test` summary (expected: full suite pass, no test changes from this packet); `npm run build` summary (expected: clean Next build, no route changes).
- **Repo state:** branch name, base commit SHA, head commit SHA, PR URL.
- **Diff scope verification:** all touched paths fall under the docs-only allowed set in § 7. Specifically:
  - **Created:** `docs/decisions/20260615-uptime-kuma-on-exec01.md`, `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md`.
  - **Edited:** `docs/operations/MONITORING_ARCHITECTURE.md` (§ 2 + § 11.1 + § 11.2), `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (new § 5.5; § 6 row suffixes), `AGENTS.md` (Must-read row), `docs/CORPFLOW_SHARED_TODO.md` (Step 2 row), `docs/decisions/JOURNAL.md` (`JE-2026-06-15-1`), `artifacts/chat_history.md` (dated bullet).
  - **NOT edited:** `.env.template`, `vercel.json`, any `api/`, `lib/`, `components/`, `pages/`, `prisma/`, `middleware*`, `scripts/`, `public/`, `.github/`, `node-tests/`, `tests/`, `core/engine/`, `package*.json`, `tsconfig*`, `next.config*`.
- **Negative checks:** no secrets in any diff (verified by repo scanners + manual review); no env var name added to `.env.template` (verified — file untouched); no L3 command added to any doc (verified — install runbook is a separate follow-up).

For the **install runbook follow-up packet** (NOT in this packet): live verification floor below — Cursor will lift it verbatim into that packet's § 9.

```text
Delivery Reality Audit (install runbook follow-up — TEMPLATE for next packet, NOT for THIS one):
- Local fix exists: YES/NO (runbook authored at L1)
- Merged to main: YES/NO (runbook PR merged)
- Production deployment ID: n/a (no Vercel deploy)
- Commit deployed: <sha of runbook PR merge>
- Live URLs tested:
    [K1] Operator SSH tunnel `ssh -L 3001:localhost:3001 anton@5.78.213.185`
         GET http://localhost:3001/ → expect 200, Kuma UI HTML
    [K2] From a different network (operator's phone tether) GET http://5.78.213.185:3001/
         → expect connection refused or timeout (proves loopback binding)
    [K3] Kuma UI Monitor list contains all 7 Phase 1A floor URLs + n8n health
         → expect status "Up" within 60 s of enable
    [K4] Operator forces a fail (e.g. probe a non-existent path) and confirms
         Kuma's Telegram bot delivers an alert to the operator chat (NOT the
         in-repo `TELEGRAM_ALERT_CHAT_ID`)
         → expect alert delivered with monitor name + status "Down"
    [K5] Operator stops the n8n host and confirms Kuma's primary alert still
         fires (Telegram bot is direct, not via n8n)
         → expect Telegram alert delivered while n8n is offline
- Expected vs actual result: per-row YES/NO
- Client-facing flow usable: n/a (operator cockpit only; Kuma is operator-facing)
- Final verdict: COMPLETE / PARTIAL / FAILED
```

## 10. Rollback plan (this packet)

**Repo state (Cursor at L1, ≤ 1 hour):** revert the merge commit. ADR + packet doc + `MONITORING_ARCHITECTURE.md` Monitor #13 row + § 11 status rows + boundary doc § 5.5 carve-out + § 6 row suffixes + `AGENTS.md` row + JE row + SHARED_TODO Step 2 link + chat_history bullet all roll back atomically. No runtime impact (this packet has no runtime).

**Live state on the box:** **none changed by this packet.** The box is unaffected because the install runbook is a separate follow-up packet that has not yet been authored or executed. There is nothing to roll back on the box.

**Per-row revocation (Cursor at L1, future packet):** future superseding `JE-YYYY-MM-DD-N` row that explicitly references and reverses `JE-2026-06-15-1`. Preferred when keeping the v1 authorization as historical record (e.g. if Kuma is later replaced by a managed third-party probe).

The CorpFlow runtime, Vercel project, GitHub workflows, Postgres / Neon DB, Prisma schema, public pages, payment posture, ERPNext production-shell state, ERPNext sandbox state, n8n state, Plausible state, SBM application state, accountant-engagement state, DNS, mail-routing, and any L3 host commands are all unchanged by both the merge and the revert of this packet.

## 11. Owner

- **Approver:** Anton (sole approver per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` § 3).
- **Executor (this packet):** Cursor at L1 (docs-only edits + PR open).
- **Executor (follow-up install packet):** Cursor at L1 to author the runbook; Anton at L3 keyboard to paste the install commands. § 5.4 collaboration pattern.
- **Reviewer:** Anton.

---

## Packet status

```text
Packet status:
- State: AWAITING_APPROVAL (pre-merge)
- Started: 2026-06-15 (UTC+4)
- Last update: 2026-06-15 (UTC+4)
- Branch: <to be opened — proposed name `docs/uptime-kuma-on-exec01-authorization-v1`>
- PR: <to be opened against main>
- Local checks: npm test = pending; npm run build = pending
- Live URLs tested: n/a (docs-only)
- Deployment ID: n/a (no Vercel deploy)
- Verdict: pending Anton's merge
- Notes: This packet is the AAP § 3 gate. Anton's merge IS the authorization. After merge, Cursor authors the install runbook follow-up packet at L1; Anton then pastes install commands at L3 per § 5.4 pattern. Step 2 of `SELF_HOSTED_OPS_STACK_V1.md` flips from BLOCKED → AUTHORIZED-PENDING-INSTALL on this packet's merge, and from AUTHORIZED-PENDING-INSTALL → COMPLETE on the install runbook's live-verification PASS.
```

## Change log

- **2026-06-15** — Packet authored (DRAFT → AWAITING_APPROVAL). Companion ADR `docs/decisions/20260615-uptime-kuma-on-exec01.md` authored in the same change set. `MONITORING_ARCHITECTURE.md` § 2 + § 11 rows added. `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 carve-out + § 6 row suffixes added. `AGENTS.md` Must-read row added. `JE-2026-06-15-1` row added. `CORPFLOW_SHARED_TODO.md` Step 2 row updated. `artifacts/chat_history.md` dated bullet added. No runtime, no L3, no secrets, no `.env.template`, no `vercel.json`, no CI workflow changes.
