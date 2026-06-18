# Server agent access & execution boundary (v1)

**Status:** v1 — 2026-06-04 — canonical.
**Owner:** Anton (operator) for the hard rules and any rule changes; Cursor for keeping this doc in sync with `MONITORING_ARCHITECTURE.md` § 11.3 and `EXECUTION_BRAIN_VS_HANDS.md`.
**Scope:** Single source of truth for **where work actually executes** in CorpFlow — which layer runs which class of work, what does **not** exist as an execution layer (and is forbidden), and how `HOST_MISMATCH` is decided.

**Anchor sentinel:** `<!-- SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1 -->`

<!-- SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1 -->

**Companion canonical docs (read those for component-level details):**

- `docs/EXECUTION_BRAIN_VS_HANDS.md` — the high-level brain/hands policy this doc concretises.
- `docs/operations/MONITORING_ARCHITECTURE.md` § 11.3 — `corpflow-exec-01-u69678` posture, hard rules, future packets.
- `docs/execution/DELIVERY_ACCELERATION_V1.md` § 3 + § 4.3 — actor model; explicit statement that Codex Cloud runs in OpenAI infra (not on `corpflow-exec-01`).
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` — gate that every new server-side execution surface must pass.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §§ 2–3 — what each actor may do unattended vs gated.
- `docs/runbooks/CODEX_CLOUD_INSTALL.md` — how Codex Cloud is installed (GitHub App, ChatGPT Plus sign-in preferred); confirms Codex Cloud is not on `corpflow-exec-01`.
- `docs/execution/CODEX_UTILIZATION_PLAN_V1.md` — June 2026 product sync, allowed/forbidden tasks, Plus-first entitlement, evaluation rubric, server-side CLI not authorized.
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 10 — operator UI access via SSH tunnel; canonical example of the operator-driven SSH pattern.

If any of those conflict with this doc, **those docs win** — this doc is a synthesis, not a new policy.

---

## 1. Why this doc exists

On 2026-06-04 a Cursor handoff comment ([bridge #249 issuecomment-4617719340](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4617719340)) stated *"resume in a Cursor instance running on `corpflow-exec-01-u69678` itself (same posture as Phase B-a sandbox install)"*. Both clauses were factually wrong:

- **No Cursor instance runs on `corpflow-exec-01-u69678`.** Never has. `MONITORING_ARCHITECTURE.md` § 11.3 hard rule explicitly forbids it: *"❌ No Cursor server extension — no remote Cursor Agent yet (deferred at bootstrap)"*.
- **Phase B-a sandbox install was not executed from a Cursor on the box.** It was executed by Anton at his keyboard, pasting commands authored by Cursor on his laptop, into an SSH session he opened from his own terminal. The post-install `JE-2026-05-31-2` records *"§2 Docker install completed by Anton from the operator-side block"* and *"the operator pasted the block into a `sudo bash -c '...'` shell"* — both Anton-at-keyboard verbatim.

Anton's APPROVED investigation directive on bridge [#249 issuecomment-4617928519](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4617928519) (2026-06-04 00:43 UTC) asked for a docs-only runbook that prevents the same mistake from recurring. **This is that runbook.**

The single sentence: **CorpFlow has three execution layers, and only three.** Anything an agent or handoff comment claims as a *fourth* layer is wrong and must be challenged before action.

---

## 2. The three execution layers (concrete component map)

| # | Layer | Where it lives | What runs there | Who triggers |
|---|---|---|---|---|
| **L1** | **Laptop brain** | Anton's Windows laptop — Cursor desktop app, the chat surface | Authoring code / docs / commands / commit messages / PR bodies / STATUS comments; reading repo; running `npm test` / `npm run build` / `git`/`gh`; capturing evidence from chat output; opening PRs | Anton (in chat) or a sub-agent Cursor spawns |
| **L2** | **Cloud hands** | Vercel (HTTP routes + cron) · GitHub Actions · Postgres / Neon · n8n (Hetzner / Elestio host, separate from `corpflow-exec-01-u69678`) · Codex Cloud (OpenAI infra) | All scheduled / event-driven 24/7 execution: Vercel cron, GitHub Actions workflows, Postgres reads/writes via API routes, n8n flows, factory-control-loop, Production Pulse, CMP delivery monitor, Codex Cloud-authored PRs | The schedule (cron / GHA `schedule:`), an inbound webhook, a `repository_dispatch`, or a PR / push event |
| **L3** | **Box hands** (operator-driven) | `corpflow-exec-01-u69678` (Hetzner via Elestio, `5.78.213.185`, Ubuntu 24.04, 4 vCPU / 7.5 GiB RAM / 150 GB disk post-resize per `JE-2026-05-31-2`) — accessed via SSH from Anton's terminal | One-off operator commands: `docker compose …`, `bench …`, `git pull`, ERPNext install / bench operations, sandbox tear-down, read-only audits; the ERPNext sandbox container stack from Phase B-a lives here (`erpnext-sandbox` Docker project; `corpflowai-sandbox.localhost` Frappe site on `localhost:8080`) | Anton, by SSHing in from his own terminal and pasting commands (which may have been authored by Cursor on L1) |

**Key property: L3 is operator-driven, never agent-driven.** Cursor's role with respect to L3 is **author commands + capture evidence**, never **execute commands directly**. The actual `docker compose exec` / `bench` / `apt-get` calls run under Anton's hands, in Anton's SSH session, on Anton's terminal — not from any Cursor process.

---

## 3. Layer 1 — Laptop brain

### 3.1 What L1 is

- **Cursor desktop** running on Anton's Windows machine.
- The repo is checked out locally; Cursor reads, writes (via `Read` / `StrReplace` / `Write` tools), and commits to local branches.
- Cursor can run terminal commands via PowerShell or whatever shell the Cursor session is configured for.
- Cursor authors documents, code, commit messages, PR bodies, JOURNAL rows, bridge #249 STATUS comments.

### 3.2 What L1 does NOT do

- L1 does **not** stay awake when Anton closes the lid (`EXECUTION_BRAIN_VS_HANDS.md` § "Mental model": *"The agent in Cursor cannot stay 'awake' on your machine after you close the lid"*).
- L1 does **not** hold production secrets in a server-readable form. The `.env.local` that may live on the laptop is Anton's, not an agent's; agents read `process.env` at runtime, never the file directly.
- L1 does **not** execute commands on `corpflow-exec-01-u69678` directly. Any L3 work that needs shell execution on the box goes through Anton at L3 (operator-driven SSH).
- L1 does **not** mutate Vercel Production / GitHub repository settings / DNS / billing — those are AAP §3 gates, owned by Anton.

### 3.3 L1 SSH posture (important: differs by Cursor session)

- **Cursor sessions are not guaranteed to have an SSH client.** A Cursor session opened in PowerShell on a Windows laptop typically has no `ssh` on PATH and no `~/.ssh/` directory; Anton's separate Git Bash / WSL / OpenSSH-Server-installed-but-not-on-PowerShell-PATH terminal usually does.
- This is acceptable because L1 does not execute L3 work directly. If a Cursor L1 session ever needs SSH for an automation, that automation is an L2 surface (GitHub Actions with a stored SSH key) and must pass `MIGRATION_TO_SERVER_CHECKLIST.md` first.
- **A Cursor L1 session that detects it has no SSH must not silently invent results from L3.** It must report `HOST_MISMATCH` (see § 7) and hand off to Anton.

---

## 4. Layer 2 — Cloud hands

### 4.1 What L2 is

The deterministic, secret-protected, 24/7 execution surface CorpFlow already pays for. Everything monitored in `MONITORING_ARCHITECTURE.md` § 2 monitors #1–#11 runs here.

| Sub-surface | Examples | Secret store |
|---|---|---|
| **Vercel** | HTTP API routes (`/api/factory/health`, `/api/factory/production-pulse/runtime`); cron routes (`/api/cron/cmp-monitor`, `/api/cron/billing-sentinel`, `/api/cron/technical-lead`) per `vercel.json` | Vercel project env (Production / Preview / Development) |
| **GitHub Actions** | `factory-control-loop.yml`, `factory-health-ping.yml`, `diagnose-postgres-env.yml`, `factory-cmp-drive.yml`, `test.yml`, `vercel-env-check.yml`, CMP PR-gating workflows | GitHub Actions repository / environment secrets |
| **Postgres / Neon** | App reads + writes via Prisma / direct SQL; `automation_events` audit log; CMP ticket state | DB connection string in Vercel env (`POSTGRES_URL`) — Neon-only per `docs/operations/POSTGRES_PROVIDER.md` |
| **n8n** | Lead intake forward; password-reset email; future Comms-v1 flows | n8n credential store (Gmail OAuth, etc.) |
| **Codex Cloud** | Bounded second in-repo executor; `codex/*` branches; PR + bridge STATUS authoring | OpenAI dashboard (key) + GitHub App permissions per `DELIVERY_ACCELERATION_V1.md` § 4.1 |

### 4.2 What L2 does NOT do

- L2 does **not** execute on `corpflow-exec-01-u69678` (per `DELIVERY_ACCELERATION_V1.md` § 4.3: *"Codex Cloud runs in OpenAI's infrastructure, not on Anton's laptop and not on `corpflow-exec-01`"*).
- L2 does **not** hold the kinds of credentials it doesn't need (AAP §3.2; Migration-to-Server Checklist § 2.1.3 "No credential broadening").
- L2 does **not** self-merge PRs (AAP §3 + protocol; Anton merges).
- L2 does **not** invent new env var names without an explicit packet that updates `.env.template`.

### 4.3 Adding a new L2 surface

Any new scheduled or event-driven L2 execution goes through `MIGRATION_TO_SERVER_CHECKLIST.md` § 2 (credential placement, parameterization, idempotency, retries, audit trail, schedule discipline, rollback, doc updates). If the surface adds a new alert path, also through `MONITORING_ARCHITECTURE.md` § 9 add-a-monitor recipe.

---

## 5. Layer 3 — Box hands (operator-driven SSH to `corpflow-exec-01-u69678`)

### 5.1 What L3 is today

Per `MONITORING_ARCHITECTURE.md` § 11.3 (canonical posture for the box):

- Hetzner / Elestio Ubuntu 24.04 VM at `5.78.213.185`, hostname `corpflow-exec-01-u69678` post-resize.
- Post-`JE-2026-05-31-2` capacity: **4 vCPU / 7,751 MiB RAM / 150 GB disk / 2 GB swap**. (Note: `MONITORING_ARCHITECTURE.md` § 11.3 / § 2 monitor #12 was authored 2026-05-27, before the Phase B-a resize, and still names the pre-resize spec `2 vCPU / 2 GB / 38 GB`. This is a known doc-drift item to fix in a separate small PR; see § 10 below.)
- Operator/maintenance shell access via SSH key for user `anton` (uid 1000, in `sudo` group).
- Pre-installed: Node 24, npm, git, GitHub CLI (`gh`) authenticated to `antonvdberg-bit/corpflow-ai-command-center`.
- **Repo clone exists** at `~/corpflow-ai-command-center` (planned move to `/opt/corpflow/repos/`; tracked as packet `move-repo-to-/opt/corpflow/repos` in `MONITORING_ARCHITECTURE.md` § 11.2).
- Verified at bootstrap (HEAD `63d87660`): `npm ci` (14s, 617 M `node_modules`) and `npm test` 382/382 PASS.
- ERPNext sandbox stack from Phase B-a (`JE-2026-06-01-1`): Docker project `erpnext-sandbox`; Frappe site `corpflowai-sandbox.localhost` on `localhost:8080`; credentials at `~/.erpnext-sandbox-credentials` (`chmod 600`, never read by Cursor, never committed). Sandbox is preserved by default per `JE-2026-06-04-1` sandbox-preservation rule.

### 5.2 What L3 is for in v1 (allowed)

- **Operator shell** — Anton SSHes in from his terminal for repo-local commands (`git`, `gh`, `npm test`, `node scripts/production-pulse.mjs --url …`) without touching production keys.
- **Operator-driven evidence capture** — long-running read-only audits (e.g. quality-audit probes) that don't need the laptop awake.
- **Operator-driven ERPNext sandbox + (authorised) production-shell work** — `docker compose -p <project> exec backend bench …`, all under Anton's keyboard, with command text authored on L1 and pasted by Anton on L3.
- **Future packet host** — staging surface for individual approved packets that need 24/7 execution; each must explicitly opt in via a packet that passes `MIGRATION_TO_SERVER_CHECKLIST.md` and brings its own narrow-scope credentials.

### 5.3 What L3 is NOT for in v1 (hard rules — changing any requires a new ADR + explicit packet)

From `MONITORING_ARCHITECTURE.md` § 11.3, restated:

- ❌ **No production secrets on the box** — no `POSTGRES_URL`, `MASTER_ADMIN_KEY`, `VERCEL_TOKEN`, Stripe keys, Gmail tokens. The box is treated as *less trusted than Vercel Production* until proven otherwise.
- ❌ **No DB writes** — any DB-touching script runs from an operator session against a copy/dev DB only.
- ❌ **No Vercel deploys** triggered from the box — no `vercel deploy`, no deploy-hook curl.
- ❌ **No scheduled jobs** — no cron, no systemd timers, no `at`. Anything scheduled today still lives on L2 (Vercel cron or GitHub Actions). *(One narrow named exception: the **Uptime Kuma** container's internal probe scheduler — see § 5.5. The `cron` / `systemd timer` / `at` rule is otherwise unchanged.)*
- ❌ **No tenant data** — no DB exports, content snapshots, or tenant secrets.
- ❌ **No n8n migration yet** — n8n stays where it is until packet `n8n-on-exec01` is approved.
- ❌ **No Cursor server extension** — no remote Cursor Agent, no Cursor Remote SSH endpoint, no `code-server`, no VS Code Server installed on the box. **Deferred at bootstrap and reaffirmed by this runbook v1.**
- ❌ **No Docker / Ollama / Postgres install beyond the ERPNext sandbox + (authorised) production-shell scope.** Adds attack surface and memory pressure. *(One narrow named exception: the **Uptime Kuma** container — see § 5.5. The rule is otherwise unchanged; no other Docker workload is authorized by the Kuma carve-out.)*

### 5.4 The Cursor + Anton L3 collaboration pattern (the proven Phase B-a model)

This is the pattern proven by `JE-2026-05-31-2` (Phase B-a § 2 Docker install + § 3–§6 bootstrap) and `JE-2026-06-01-1` (§ 7 wizard bypass + § 8 users + § 9 scheduler + § 12 backup parity):

```
Step 1.  Cursor (L1) drafts the exact command block in a docs-only
         runbook (e.g. ERPNEXT_SANDBOX_INSTALL.md §§ 2-9 or a packet-
         specific recipe). Block is parameterised (no per-host paths,
         no inline secrets).

Step 2.  Anton opens his SSH session from his own terminal:
         `ssh -L 8080:localhost:8080 anton@5.78.213.185`
         (Cursor does not see the SSH terminal; Anton runs it from
         Git Bash / WSL / OpenSSH / whichever shell on his laptop
         already has working SSH.)

Step 3.  Anton pastes blocks from the recipe into the SSH terminal
         and runs them. Anton may run them as separate operator-side
         pre-flight steps (e.g. `df -h`, `free -h`) before pasting the
         install block.

Step 4.  Anton shares the output back into chat. Cursor (L1) reads
         the output, captures the relevant numbers / file paths / SHAs
         / counts into a JOURNAL row + a bridge #249 STATUS comment.
         Cursor never reads or prints password values; it only records
         file paths (e.g. `~/.erpnext-sandbox-credentials`) and lengths
         (e.g. "file grew 312 -> 653 bytes").

Step 5.  Cursor (L1) opens a docs-only PR with the JOURNAL row +
         chat_history entry + any runbook updates discovered during
         execution. Anton merges.
```

**Key invariants of the pattern:**

- The bytes that change host state are typed (or pasted) by Anton, not by Cursor.
- The bytes that change repo state (commits) are typed by Cursor on L1.
- Credentials live on L3 in `~/.erpnext-sandbox-credentials` / `~/.erpnext-production-credentials` (`chmod 600`) — Cursor reports the file *path*, never the *contents*.
- Evidence flows L3 → Anton's chat → L1 → JOURNAL.md / bridge #249.

### 5.5 Authorized exceptions to § 5.3 hard rules (named, narrow, packet-gated)

**Doctrine:** § 5.3 hard rules **stay in force**. Each row below is a **named, narrow exception** authorized by a specific ADR + packet that passed the § 10 gate. The exception is the named container / surface, **not** a category. Adding a second name to this table requires a new ADR + new authorization packet + new § 10 gate run — there is no "Docker is now OK" generalization, ever.

**Canonical authorization language (cite verbatim — same wording in the ADR § 2.1, in the authorization packet § 1.1, and in `JE-2026-06-15-1`):**

> **This packet authorizes only the minimum execution boundary change needed for Uptime Kuma to run as a monitoring service on `corpflow-exec-01-u69678`.**
>
> **It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications, backups/restic, chatbot/live-chat platforms, AI frameworks, or production shell access beyond the documented Kuma installation/operation path.**

Any future row added below must come with its own ADR-anchored canonical paragraph at the same level of narrowness. Paraphrase is not authorized.

| Authorized exception | Packet that authorized it | What is permitted (narrow) | What § 5.3 rule(s) the exception lifts (and only this far) | Rollback |
|---|---|---|---|---|
| **Uptime Kuma** — single Docker container on `corpflow-exec-01-u69678`, `127.0.0.1:3001` loopback only, persistent volume `~/uptime-kuma-data/`, internal probe scheduler | `JE-2026-06-15-1` — `docs/decisions/20260615-uptime-kuma-on-exec01.md` (ADR) + `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` (packet) | One Kuma container; HTTP probes (GET-only) against the seven CorpFlow public floor URLs in `MONITORING_ARCHITECTURE.md` § 5 + the n8n host's own health endpoint; Kuma's own Telegram bot (separate from in-repo `TELEGRAM_BOT_TOKEN`) + optional SMTP for alerts; UI access via SSH local-port-forward (`ssh -L 3001:localhost:3001`); operator-managed admin password / bot token / SMTP creds in Kuma's encrypted SQLite DB at `~/uptime-kuma-data/kuma.db` (`chmod 600`); zero CorpFlow secrets on the box | (a) "No Docker / Ollama / Postgres install beyond the ERPNext sandbox + (authorised) production-shell scope" — lifted **only** for the named Kuma container, **not** for any other Docker workload; (b) "No scheduled jobs" — lifted **only** for Kuma's internal probe scheduler running inside the named container, **not** for `cron`/`systemd timer`/`at` outside Kuma | `docker compose -p uptime-kuma down` (≤ 60 s) → `docker compose down -v` + `rm -rf ~/uptime-kuma-data/` (≤ 5 min) → revert authorization packet's merge commit (≤ 1 hour); details in ADR § 5 |

**Explicit non-generalization (re-stated for clarity):**

- This carve-out is for **Uptime Kuma** alone. It does **not** authorize Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework, additional monitoring tool, additional self-hosted tool of any kind, or any second container.
- This carve-out is for **`corpflow-exec-01-u69678`** alone. It does not authorize Kuma on a sibling VM or on the laptop.
- This carve-out is for **third-location uptime monitoring** alone. It does not authorize Kuma to probe state-mutating routes, factory-master endpoints, tenant data, or anything that requires a CorpFlow secret.
- This carve-out is for **loopback-only access**. It does not authorize a public port, a reverse proxy, a public DNS record, or any change to `cors`/`csp`/`x-frame-options` on CorpFlow surfaces.
- This carve-out's **install runbook is a separate follow-up packet** (`UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1`). The authorization packet alone does not put Kuma on the box.

**How to read this table when proposing new work:** if you are about to write *"this is similar to the Kuma exception, so we can also …"*, **stop**. Each named exception is the result of its own ADR + its own threat model + its own packet. Sameness is not authorization. Open a new ADR.

---

## 6. What does NOT exist as an execution layer (canonical absence list)

A layer that does not appear in § 2 above is **not a CorpFlow execution layer**. Specifically, none of the following exists today and none may be silently introduced:

| Claimed surface | Reality | Why it doesn't exist |
|---|---|---|
| Cursor session running on `corpflow-exec-01-u69678` | Does not exist | `MONITORING_ARCHITECTURE.md` § 11.3 hard rule — *"No Cursor server extension … deferred at bootstrap"* |
| Cursor Remote SSH endpoint configured to the box | Does not exist | Same rule as above |
| `code-server` / VS Code Server on the box | Does not exist | Same rule as above |
| Web-shell / browser terminal on the box | Does not exist | No such service installed; would require opening a port + reverse proxy, both forbidden in v1 |
| Persistent daemon / systemd service / cron / `at` job on the box | Does not exist (with one named exception — see § 5.5: the **Uptime Kuma** container's internal probe scheduler is authorized **only** as that named carve-out and **only** inside that named container; no `cron` / `systemd timer` / `at` outside Kuma is authorized) | § 11.3 hard rule — *"No scheduled jobs"* |
| Codex Cloud running on the box | Does not exist | `DELIVERY_ACCELERATION_V1.md` § 4.3 — *"Codex Cloud runs in OpenAI's infrastructure, not on Anton's laptop and not on `corpflow-exec-01`"* |
| Codex CLI / Codex daemon / MCP server on the box | Does not exist | `docs/execution/CODEX_UTILIZATION_PLAN_V1.md` §8 — **`NOT AUTHORIZED / FUTURE EVALUATION ONLY`**; would imply a fourth execution layer + violate § 5.3 no-daemon rule |
| Tailscale / WireGuard / reverse-tunnel from box to laptop | Does not exist | Repo-wide grep returns zero hits; would expand attack surface |
| Production secrets on the box | Does not exist | § 11.3 hard rule — explicit list of secrets that may not be on the box |
| Vercel deploy capability from the box | Does not exist | § 11.3 hard rule |
| Tenant DB exports on the box | Does not exist | § 11.3 hard rule + Migration-to-Server Checklist § 2.3 |
| n8n process on the box | Does not exist | Packet `n8n-on-exec01` is named in `MONITORING_ARCHITECTURE.md` § 11.2 future packets but NOT approved; n8n still on its current host |

**The rule:** if an agent or handoff comment claims one of these surfaces exists, demand the file path / process / port / config row that proves it. If none can be produced, the claim is wrong.

**Exception clarifier (2026-06-15, `JE-2026-06-15-1`):** The only authorized lifting of any row in this table is the **Uptime Kuma** carve-out documented in § 5.5 (Docker container row + scheduled-jobs row, **only** for the named Kuma container, **only** on `corpflow-exec-01-u69678`, **only** loopback-bound for third-location monitoring). Any future authorized exception must appear in § 5.5 with its own ADR + packet — and must explicitly identify which absence-list row(s) it lifts and how narrowly. No row in the table above is lifted by category.

---

## 7. `HOST_MISMATCH` semantics

`HOST_MISMATCH` is the literal status code an L1 Cursor session (or any agent session) must emit when it discovers it cannot execute a packet that requires L3 (box hands) directly.

### 7.1 When `HOST_MISMATCH` applies

A Cursor session must stop and emit `HOST_MISMATCH` when **all** of the following are true:

1. The packet authorisation row in JOURNAL.md requires execution on `corpflow-exec-01-u69678` (e.g. `JE-2026-06-04-1` for `ERPNext-Production-Shell-Setup-Host-Agent-1`).
2. The current Cursor session is not running on that host (verifiable via `hostname` and absence of host-local Docker / bench / production-shell credentials).
3. The packet requires bytes to change on L3 (e.g. `docker compose exec`, `bench new-site`, file creation in `~/.erpnext-production-credentials`).

### 7.2 What `HOST_MISMATCH` is NOT

`HOST_MISMATCH` is **not** triggered by:

- A docs-only packet that only edits repo files (any Cursor session anywhere can do that; the work is on L1).
- A packet whose recipe is being **drafted** (drafting is L1 work; the recipe is then handed to Anton to paste on L3 — no L3 byte change has been attempted, no mismatch).
- A packet whose only L3 requirement is **read-only inspection** that an L2 surface can fulfil (e.g. `GET /api/factory/health` from L1 or L2; not an L3 command).

### 7.3 What `HOST_MISMATCH` requires

A session that emits `HOST_MISMATCH` must:

1. **Stop immediately.** Do not run partial L3 commands. Do not fabricate L3 output.
2. **Post evidence to bridge #249.** A STATUS comment naming: (a) which JE row required L3, (b) what the current session host is, (c) why the host cannot fulfil L3 work, (d) what the next-correct action is.
3. **Hand off to the right surface.** Either (a) Anton + L1 Cursor in the Phase B-a collaboration pattern (§ 5.4), or (b) a future Cursor session that does have the right L3 access (only possible if § 5.3 hard rules are ever relaxed via ADR + packet).
4. **Not silently fail.** A handoff comment that omits the mismatch and pretends L3 was reachable is the 2026-06-04 incident; this section exists to prevent the repeat.

### 7.4 Worked example — `ERPNext-Production-Shell-Setup-Host-Agent-1`

- Anton authorised the packet on 2026-06-04 with `JE-2026-06-04-1`.
- The row's HOST_MISMATCH guard says *"host-side execution must occur only from a Cursor session running directly on `corpflow-exec-01-u69678` (or with equivalent host-local Docker / Frappe / bench access). Any other host … must stop immediately with the literal status code `HOST_MISMATCH`."*
- The Cursor L1 session on Anton's Windows laptop that drafted `JE-2026-06-04-1` would correctly emit `HOST_MISMATCH` if it tried to run `docker compose exec` on the box itself — because Cursor on Windows has no SSH client in its PowerShell PATH and no `~/.ssh/` directory, and even if it did, executing on L3 from L1 violates § 5.4 invariant *"the bytes that change host state are typed by Anton, not by Cursor"*.
- The **correct** next step is § 5.4 step 1: draft the recipe in a docs-only PR. The recipe is then pasted by Anton in his own SSH terminal at L3.

---

## 8. Decision tree — which layer for which class of work

When a new packet lands, run through this tree **once** before authoring any command:

| Class of work | Layer | Why |
|---|---|---|
| Docs-only edit (e.g. JOURNAL row, chat_history bullet, runbook) | **L1** | Repo edits are L1 by definition |
| Repo automation that must run unattended on a schedule | **L2 (GitHub Actions or Vercel cron)** | Scheduled = L2; passes Migration-to-Server Checklist |
| Repo automation that runs once per event (PR open, push, webhook) | **L2 (GitHub Actions or Vercel HTTP route)** | Event-driven = L2 |
| Read-only HTTP probe of production (factory health, production pulse, marketing surface) | **L1 or L2** | L1 from chat for a one-off; L2 (GitHub Actions `workflow_dispatch`) for periodic |
| Read-only DB query that needs `POSTGRES_URL` | **L2** | Production secrets only exist on L2; L1 must not hold them |
| DB **write** | **L2 via an audited API route**, never direct | Forces audit trail + auth + idempotency |
| Vercel deploy | **L2 (Vercel itself, triggered by push to `main`)** | Anton owns merge; deploy is downstream |
| DNS / billing / GitHub repo settings | **Anton (operator) directly** | AAP §3 hard gates |
| One-off shell command on `corpflow-exec-01-u69678` (Docker, bench, npm, git pull on the server-side clone) | **L3 — operator-driven SSH; Cursor authors at L1, Anton pastes at L3** | § 5.4 pattern |
| ERPNext sandbox or (authorised) production-shell setup / bench operations | **L3 — § 5.4 pattern** | Proven by Phase B-a, Phase C |
| Cursor session "executing on the box itself" | **DOES NOT EXIST as a class** | § 6 absence list; any packet that claims this is misconfigured |

**If a packet does not fit any row above, stop and ask Anton.** Do not invent a new layer.

---

## 9. Anti-patterns (the 2026-06-04 handoff mistake; how to avoid)

| Anti-pattern | What it looks like | Why it's wrong | What to do instead |
|---|---|---|---|
| **Imaginary L4** — claiming a Cursor / agent / daemon on the box exists | *"Resume in a Cursor instance running on `corpflow-exec-01-u69678` itself."* | No such instance exists; § 6 absence list is the canonical answer | Read § 6; if the surface isn't named there, demand the file path / process / port that proves it. If none exists, treat the claim as wrong. |
| **Cross-layer execution claim** — pretending an L1 session can directly mutate L3 | *"I'll just run `docker compose exec` on the box."* | L1 has no SSH to L3 in most Cursor sessions, and even with SSH the § 5.4 invariant says Anton's hands type L3 bytes | Use § 5.4 pattern: author command at L1, Anton pastes at L3 |
| **Silent invention** — proceeding past `HOST_MISMATCH` without stopping | The session never emits `HOST_MISMATCH`, just produces a result and moves on | Either fabricates results (lying) or stalls invisibly (waste); both erode trust | § 7.3: emit `HOST_MISMATCH`, post evidence to #249, hand off |
| **Layer drift via packet** — a single packet smuggles a new L3 capability (cron, daemon, secret) | A runbook quietly suggests `crontab -e` on the box, or `echo $POSTGRES_URL > /opt/.env` | Bypasses `MIGRATION_TO_SERVER_CHECKLIST.md` § 2; violates § 5.3 hard rules | Reject the packet; require a separate ADR + Migration packet that lists the new credential, the rollback, the alert path |
| **Secret leak via doc** — printing credential values in JOURNAL / chat_history / STATUS / PR body | Pasting an `openssl rand -base64 32` output into a markdown row | Repo + bridge are public-adjacent surfaces; never store secret values | Report the file path only (e.g. `~/.erpnext-production-credentials`), and the file size delta (e.g. "grew 312 → 653 bytes") |
| **Same-name confusion** — using `corpflow-exec-01` and `corpflow-exec-01-u69678` interchangeably without noting the resize | A row says "`corpflow-exec-01` posture 2 vCPU / 2 GB" but the box has been resized | Doc drift; future readers confused about whether ERPNext containers fit | Use the post-resize identity (`-u69678`) when referring to current state; cite `JE-2026-05-31-2` for the resize event |
| **AGENTS.md row drift** — adding a new canonical doc without an `AGENTS.md` Must-read row | A new ops doc lives at `docs/operations/X.md` but is never discoverable | Future agents miss the doc; the canonical-doc claim is invisible | Every new canonical doc lands with an `AGENTS.md` Must-read row in the same PR |

---

## 10. Adding a new server-side execution surface (the gate)

If a future packet proposes lifting any § 5.3 hard rule (e.g. installing Cursor Remote SSH on the box, or adding a cron job for `exec01-cron-pulse`, or migrating n8n to `corpflow-exec-01`):

1. **Write an ADR** under `docs/decisions/YYYYMMDD-<topic>.md` naming: the new surface; the credential it holds; the threat model; the rollback path; the alert path.
2. **Pass `MIGRATION_TO_SERVER_CHECKLIST.md` § 2** — every checkbox.
3. **Add a new row** in `MONITORING_ARCHITECTURE.md` § 2 surface map (and § 11 status tables) in the same PR.
4. **Update this runbook** to move the surface from § 6 "does NOT exist" to § 5 "what L3 is for in v1" (or extend § 2 with a new layer if it doesn't fit L3 — though no new layer is currently anticipated).
5. **Add an `AGENTS.md` Must-read row** if the surface introduces a new operational class an agent must know about.
6. **Record a `JE-YYYY-MM-DD-N` row** with the decision + reversibility.
7. **Anton approves the merge.** L2 / L3 surface changes are AAP §3 gates.

**The `MONITORING_ARCHITECTURE.md` § 11.3 stale-spec doc-drift item** (the 2026-05-27 row still naming the pre-resize `2 vCPU / 2 GB / 38 GB` even though `JE-2026-05-31-2` resized the box on 2026-05-31) is a separate small follow-up PR; this runbook does not silently fix it because the fix touches a sibling canonical doc and deserves its own commit.

---

## 11. Cross-references

- `docs/EXECUTION_BRAIN_VS_HANDS.md` — high-level policy parent.
- `docs/operations/MONITORING_ARCHITECTURE.md` § 2 monitor #12 + § 11.3 — `corpflow-exec-01-u69678` posture + hard rules.
- `docs/execution/DELIVERY_ACCELERATION_V1.md` § 3 actor model + § 4.3 Codex-Cloud-not-on-exec-01.
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` — gate for any new L2 / L3 surface.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §§ 2–3.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet structure that all L1 / L2 / L3 work follows.
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 10 — the canonical SSH-tunnel example of the L3 pattern.
- `docs/runbooks/CODEX_CLOUD_INSTALL.md` — confirms Codex Cloud is hosted by OpenAI; not on `corpflow-exec-01-u69678`.
- `docs/runbooks/SECURITY_OR_INCIDENT.md` — escalation if L3 secrets leak or a hard rule is suspected violated.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — outbound channels (L2 only; no L3 outbound today).
- `docs/operations/POSTGRES_PROVIDER.md` — Neon-only mandate (L2 secret store).
- `docs/operations/OPERATOR_BRIDGE_V1.md` + `docs/runbooks/OPERATOR_BRIDGE.md` — bridge #249 STATUS protocol (the evidence channel `HOST_MISMATCH` posts to).
- Decision rows: `JE-2026-05-29-1` (ERPNext self-host on `corpflow-exec-01`), `JE-2026-05-29-2` (capacity finding + pre-flight script `/tmp/cf-erpnext-preflight.sh` on box only), `JE-2026-05-31-2` (Path A resize + Docker install pasted by Anton), `JE-2026-06-01-1` (Phase B-a closure including § 7.1 wizard bypass authored at L1, executed at L3), `JE-2026-06-01-3` (Phase C cycles), `JE-2026-06-01-5` (Option B custom Role), `JE-2026-06-03-2` (Production Readiness Evaluation HB-1..HB-4), `JE-2026-06-03-3` (Accountant Review Pack), `JE-2026-06-04-1` (ERPNext-Production-Shell-Setup-Host-Agent-1 narrowed-scope authorisation with HOST_MISMATCH guard), this runbook's JE row.
- Bridge handoff: [#249 issuecomment-4617928519](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4617928519) (Anton's APPROVED investigation directive).

---

## 12. Verdict per `.cursor/rules/delivery-reality.mdc`

**Docs-only artefact. COMPLETE at PR merge.** No customer-visible URL to probe by design — this runbook is operator + agent governance. The next operational milestone is the on-server execution of `ERPNext-Production-Shell-Setup-Host-Agent-1` under the § 5.4 pattern (recipe drafted at L1, pasted by Anton at L3, evidence captured back at L1).

**Standing holds (unchanged by this runbook):** Phase D (full ERPNext go-live) · HB-2 (accountant CoA review) · HB-3 (VAT decision) · HB-4 (real redacted MU bank CSV) · Phase C² · runbook §8.1 hardening · production ERPNext go-live · scheduler · payment gateway configuration · Lead Rescue wording adoption (`LR-Pay-1`) · SBM application submission · `PAY-SBM-3` · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · Pomelli activation · `MONITORING_ARCHITECTURE.md` § 11.3 stale-spec doc-drift (separate small follow-up PR).

**New holds introduced by this runbook:** none — the runbook formalises existing rules, it does not change them. No new credentials, no new envs, no new surfaces, no policy lifting.

---

## 13. Change log

- **v1, 2026-06-04** — initial canonical version. Triggered by bridge [#249 issuecomment-4617928519](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4617928519). Synthesises rules already in `EXECUTION_BRAIN_VS_HANDS.md`, `MONITORING_ARCHITECTURE.md` § 11.3, `DELIVERY_ACCELERATION_V1.md` § 4.3, `MIGRATION_TO_SERVER_CHECKLIST.md`, `ERPNEXT_SANDBOX_INSTALL.md` § 10. Recorded as `JE-2026-06-04-2`.
- **v1.1, 2026-06-15** — added § 5.5 *Authorized exceptions to § 5.3 hard rules (named, narrow, packet-gated)* and listed **Uptime Kuma** on `corpflow-exec-01-u69678` as the **first and only** named carve-out, authorized by `docs/decisions/20260615-uptime-kuma-on-exec01.md` + `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` (`JE-2026-06-15-1`). § 5.3's two affected rules ("No Docker / Ollama / Postgres beyond ERPNext sandbox + production-shell" and "No scheduled jobs") gained parenthetical pointers at § 5.5; rule wording itself unchanged. § 6 absence-list "Persistent daemon / systemd / cron / `at`" row gained an in-line clarifier; a new "Exception clarifier" paragraph was added under § 6 explaining that the only authorized lifting of any row is the Uptime Kuma carve-out, narrow and named. The carve-out is **not** a category-level lift: any further exception requires its own ADR + authorization packet + § 10 gate. No § 5.3 hard rule is removed by this version.
