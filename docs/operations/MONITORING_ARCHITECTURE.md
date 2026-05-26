# Monitoring & 24/7 execution architecture (canonical)

**Status:** v1 — 2026-05-27
**Owner:** Anton (operator) for hosts/secrets/scheduled jobs; Cursor for repo-side wiring + this doc.
**Scope:** This doc is the **single component map** for "what monitors what, who runs it, where alerts go." It does not restate component-level details; it points at the canonical doc per component.
**Companion docs (component-level — read those for details, not this one):**

- `docs/operations/PRODUCTION_PULSE_V1.md` — the `/api/factory/production-pulse/runtime` HTTP contract.
- `docs/operations/FACTORY_CONTROL_LOOP.md` — the daily GitHub Actions drift check.
- `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` — CMP-ticket delivery verdict + Telegram/n8n alert routing.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — high-level "brain on laptop, hands 24/7" policy. This doc is its concrete component map.
- `docs/operations/POSTGRES_PROVIDER.md` — Neon-only mandate; § 3 + § 4b explain why `/api/factory/health` alone cannot prove DB connectivity.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — outbound email model; `operator_escalation` event type used by ops alerts.

---

## 1. Why this doc exists

Before this doc, the monitoring story was scattered across five separate places: the control-loop doc described one workflow, the pulse doc described one endpoint, the delivery-alerts doc described CMP tickets, the brain-vs-hands doc described policy, and the new execution node had no doc at all. New surfaces are arriving (analytics, communications, the `corpflow-exec-01` node) and the question "what do we run, where, with which alert path?" was getting harder to answer in one read.

This doc is the answer in one read. Everything below is **descriptive of what exists today (2026-05-27)** plus **named future packets**. Anything not listed here does not exist in this system; do not assume otherwise.

---

## 2. Component map (today)

```
                ┌──────────────────────────────────────────────────────────┐
                │ Vercel Production (the deployment we monitor)            │
                │   serves: corpflowai.com (apex)                          │
                │           aileadrescue.corpflowai.com (Lead Rescue mkt)  │
                │           lux.corpflowai.com (tenant working surface)    │
                │           core.corpflowai.com (factory subdomain)        │
                │                                                          │
                │   exposes:                                               │
                │     GET /api/factory/health                              │
                │       (env-shape self-report; NOT a DB connect — see     │
                │        POSTGRES_PROVIDER.md §3)                          │
                │     GET /api/factory/production-pulse/runtime            │
                │       (DB reachability + monitoring chain JSON)          │
                │     GET /api/cron/cmp-monitor    (Vercel cron, daily)    │
                │     GET /api/cron/technical-lead (Vercel cron, daily)    │
                └─────────────────┬────────────────────────────────────────┘
                                  │  HTTPS GET (read-only)
              ┌───────────────────┼───────────────────────┐
              │                   │                       │
              ▼                   ▼                       ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐
   │ GitHub Actions   │  │ GitHub Actions   │  │ Operator laptop        │
   │ factory-control- │  │ factory-health-  │  │ (Anton, Cursor)        │
   │ loop.yml         │  │ ping.yml         │  │  scripts/              │
   │ (daily 06:00 UTC)│  │ (lighter weekly) │  │   production-pulse.mjs │
   │                  │  │ — superseded by  │  │   factory-control-     │
   │ checks:          │  │   the daily loop │  │   loop.mjs             │
   │  - factory health│  │   for drift; kept│  │                        │
   │  - main↔Vercel   │  │   for low-noise  │  │ Used for: ad-hoc       │
   │    SHA compare   │  │   pings.         │  │   probes, packet       │
   │  - vercel.json   │  │                  │  │   evidence, debugging. │
   │    cron policy   │  │                  │  └────────────────────────┘
   │                  │  │                  │
   │ alert path:      │  │ alert path:      │
   │   Telegram on    │  │   workflow fail  │
   │   failure (via   │  │   visible in     │
   │   ops-alerts.js) │  │   GitHub UI      │
   └──────────────────┘  └──────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │ Vercel cron (in-app, runs against own deployment)        │
   │   /api/cron/cmp-monitor       — CMP delivery verdict     │
   │   /api/cron/technical-lead    — read-only TL audits      │
   │                                                          │
   │   alert paths:                                           │
   │     - Telegram (TELEGRAM_BOT_TOKEN/CHAT_ID)              │
   │     - n8n forward (CORPFLOW_AUTOMATION_FORWARD_URL)      │
   │       envelope: corpflow.ops_alert.v1                    │
   │       comms classification: operator_escalation          │
   │       (Comms v1 §4 — internal only, never client-facing) │
   └──────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │ n8n (always-on host, separate from Vercel)               │
   │                                                          │
   │ Roles today:                                             │
   │   - outbound email (Comms v1 — password_reset, etc.)     │
   │   - automation forward sink (lead intake, ops alerts)    │
   │                                                          │
   │ Roles NOT today:                                         │
   │   - n8n is not currently a monitoring source — it does   │
   │     not probe Vercel. It is an alert + email sink.       │
   └──────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │ Telegram                                                 │
   │   - sink for factory-control-loop.yml failures           │
   │   - sink for /api/cron/cmp-monitor blocked-ticket alerts │
   │   - sink for any sendTelegramOpsAlert() call             │
   │   (Same TELEGRAM_BOT_TOKEN / TELEGRAM_ALERT_CHAT_ID      │
   │    are reused across all three.)                         │
   └──────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │ corpflow-exec-01  (Elestio, Hetzner, 2 vCPU / 2 GB,      │
   │                    Ubuntu 24.04 LTS — bootstrapped       │
   │                    2026-05-26)                           │
   │                                                          │
   │ Roles today:                                             │
   │   - operator/maintenance shell only                      │
   │     (gh CLI authed, repo cloned to ~/corpflow-ai-command-│
   │     center, npm ci + npm test verified at 382/382)       │
   │                                                          │
   │ Roles NOT today (explicit non-goals for v1):             │
   │   - no production secrets on the box                     │
   │   - no DB writes                                         │
   │   - no Vercel deploy keys                                │
   │   - no scheduled jobs                                    │
   │   - no client data                                       │
   │   - no n8n migration yet                                 │
   │                                                          │
   │ Future packets (see §6) may add specific scheduled jobs  │
   │ here; each one needs its own packet, its own threat      │
   │ model, and its own narrow-scope credentials.             │
   └──────────────────────────────────────────────────────────┘
```

---

## 3. What each component is responsible for (today)

| # | Surface / job | Where it runs | Schedule | Reads | Writes | Alert path | Canonical doc |
|---|---|---|---|---|---|---|---|
| 1 | `GET /api/factory/health` | Vercel Production | on-demand | env vars (shape only); does **not** open DB connection | nothing | (none — surface only) | `docs/operations/FACTORY_CONTROL_LOOP.md` § "What 'healthy' means" + `docs/operations/POSTGRES_PROVIDER.md` § 3 |
| 2 | `GET /api/factory/production-pulse/runtime` | Vercel Production | on-demand | env vars + DB reachability + monitoring chain | nothing | (none — surface only) | `docs/operations/PRODUCTION_PULSE_V1.md` |
| 3 | `factory-control-loop.yml` | GitHub Actions | `0 6 * * *` UTC daily + `workflow_dispatch` | surface 1 + Vercel API SHA + `vercel.json` crons | `loop.json` artifact (7-day retention) | Telegram on failure (via `scripts/post-control-loop-telegram-alert.mjs`) | `docs/operations/FACTORY_CONTROL_LOOP.md` |
| 4 | `factory-health-ping.yml` | GitHub Actions | weekly | surface 1 only | nothing | GitHub UI workflow status | (header note in #3 — superseded by #3 for daily drift; kept for low-noise weekly ping) |
| 5 | `diagnose-postgres-env.yml` | GitHub Actions | `workflow_dispatch` only | Vercel env names + value shape (booleans only — never values) | artifact `diagnose-vercel-postgres-env` (7-day) | none — operator-driven | `docs/operations/POSTGRES_PROVIDER.md` § 4b + § 5b |
| 6 | `/api/cron/cmp-monitor` | Vercel cron (in-app) | daily | DB tickets in Approved/Build, GitHub PR state, preview URLs | updates `cmp_tickets.console_json.client_view.delivery_verdict` | Telegram + `corpflow.ops_alert.v1` via `CORPFLOW_AUTOMATION_FORWARD_URL` (n8n) — `operator_escalation` per Comms v1 | `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` |
| 7 | `/api/cron/technical-lead` | Vercel cron (in-app) | daily | Approved/Build tickets, GitHub PR/check-runs, optional Vercel preview rows, optional factory health | rows in `technical_lead_audits` | (none — read-only observer) | `AGENTS.md` § "Technical Lead Phase A (observer)" |
| 8 | n8n (Gmail OAuth) | always-on n8n host | event-driven | webhook payloads (envelope `corpflow.automation.v1` / `corpflow.ops_alert.v1`) | sends email via Gmail; logs in n8n only | (sink, not source) | `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`, `docs/n8n/automation-forward-recipe.md`, `docs/n8n/password-reset-email-recipe.md` |
| 9 | `corpflow-exec-01` (Elestio) | Hetzner VM (Ubuntu 24.04, 2 vCPU / 2 GB, 2 GB swap) | none yet | repo (read-only ops via `gh`/`git`) | nothing on production | (no alert path — no scheduled jobs yet) | this doc § 5 |

---

## 4. Health surfaces vs deeper checks

A frequent point of confusion that this doc fixes once and for all:

### `/api/factory/health` is a **configuration self-report**, not a connectivity check

- Returns `database_configured: true` whenever `POSTGRES_URL` is non-empty.
- Does **not** open a Postgres connection.
- A green response does **not** prove Postgres is reachable; it proves only that env shape is acceptable.

This is intentional (the endpoint is a Hobby-friendly cheap probe) but it caused a real incident on 2026-05-25 when `db.prisma.io` drift returned a green health while tenant resolution was failing. The remedy is not to change `/health`; it is to use the right tool for the job:

| Symptom | Right surface |
|---|---|
| "Is the deployment up and configured?" | `/api/factory/health` (or `factory-control-loop.yml`) |
| "Is the database actually reachable?" | `/api/factory/production-pulse/runtime` — `core.database_reachable` field |
| "Is a tenant marketing surface returning correct content?" | live `GET https://<tenant>.corpflowai.com/` + delivery-reality audit |
| "Did `db.prisma.io:5432` drift back in?" | `diagnose-postgres-env.yml` (manual dispatch) |

See `docs/operations/POSTGRES_PROVIDER.md` § 3 ("`/api/factory/health` is not a DB connectivity check") and § 4b ("Known drift symptoms") for the canonical wording.

---

## 5. `corpflow-exec-01` — what it is and is not (v1)

### What it is

- An always-on Ubuntu 24.04 LTS box on Hetzner (managed by Elestio): `5.78.213.185`, 2 vCPU / 2 GB RAM / 38 GB disk / 2 GB swap.
- Operator/maintenance shell access via SSH key for user `anton` (uid 1000, in `sudo` group).
- Pre-installed: Node 24, npm, git, GitHub CLI (`gh`), authenticated to the `antonvdberg-bit/corpflow-ai-command-center` repo with `repo` scope.
- Repo cloned at `~/corpflow-ai-command-center` (planned move to `/opt/corpflow/repos/` once `sudo chown` is run; tracked in §7).
- Verified clean: `npm ci` (14s, 617M `node_modules`, Prisma client generated), `npm test` (382/382 pass at HEAD `63d87660`).

### What it is for in v1

- **Operator shell.** Anton or Cursor can SSH in and run repo-local commands (`git`, `gh`, `npm test`, `node scripts/production-pulse.mjs --url …`) without touching production keys.
- **Evidence capture.** Long-running read-only audits (e.g. quality-audit probe scripts) can run here without keeping the laptop awake.
- **Future packet host.** A staging surface for *individual approved packets* that need 24/7 execution (see §6) — each packet must explicitly opt in here and bring its own narrow-scope credentials.

### What it is **NOT** for in v1 (explicit non-goals)

These are **hard rules** — changing any of them requires a new ADR plus an explicit packet:

- ❌ **No production secrets on the box.** No `POSTGRES_URL`, no `MASTER_ADMIN_KEY`, no `VERCEL_TOKEN`, no Stripe keys, no Gmail tokens. The box is treated as *less trusted than Vercel Production* until proven otherwise.
- ❌ **No DB writes.** Any DB-touching script runs from an operator session against a copy/dev DB only.
- ❌ **No Vercel deploys** triggered from the box. No `vercel deploy`, no deploy-hook curl.
- ❌ **No scheduled jobs.** The box runs no cron, no systemd timers, no `at`. Anything scheduled today still lives on GitHub Actions or Vercel cron (see §3).
- ❌ **No tenant data.** No tenant DB exports, no tenant content snapshots, no tenant secrets.
- ❌ **No n8n migration yet.** n8n stays where it is until a packet decides otherwise.
- ❌ **No Cursor server extension** / no remote Cursor Agent yet (deferred per the bootstrap task).
- ❌ **No Docker, no Ollama, no Postgres install** (deferred per the bootstrap task — adds attack surface and memory pressure that 2 GB cannot absorb).

The boundary in `docs/EXECUTION_BRAIN_VS_HANDS.md` § "Security note" applies in full: *"24/7 execution should not mean agent has prod keys on a server."*

### How `corpflow-exec-01` differs from GitHub Actions today

GitHub Actions is the **first-choice 24/7 hands** because:

- secrets stay in GitHub's encrypted store (presence-only printing in jobs);
- workflows are versioned in-repo (`.github/workflows/*.yml`);
- runs are reproducible and auditable;
- nothing persists between runs.

`corpflow-exec-01` is the **second-choice 24/7 hands** for cases where GitHub Actions does not fit — long-running probes, things that need a stable IP, or workloads that exceed GitHub's free minutes. v1 has zero of these workloads, hence zero scheduled jobs on the box.

---

## 6. Future packets (named, not promised)

These are placeholders so future agents/operators do not invent the same packets twice. Each line is **a packet that has not been approved yet**; nothing here is in-flight.

| Packet id | One-liner | Pre-conditions | Where it would live | What it would NOT do |
|---|---|---|---|---|
| `exec01-cron-pulse` | Run `node scripts/production-pulse.mjs` on a 30-min cron from `corpflow-exec-01`, posting Telegram alerts independent of GitHub Actions. Diversifies the alert path. | Box has only the public `/api/factory/production-pulse/runtime` URL + a *narrow* Telegram bot/chat (preferably a separate bot from the GitHub one) configured. | systemd timer or `cron` user job on `corpflow-exec-01`. | Would not gain any DB / Vercel / Gmail keys. |
| `exec01-quality-audit-runner` | Schedule the read-only quality-audit probe (`docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`) to run weekly per tenant and write evidence under `~/audits/`. | Probe scripts are read-only; no auth required for tenant marketing surfaces. | systemd timer on `corpflow-exec-01`; results pushed to repo via `gh pr create` from a narrow-scope token. | Would not run authenticated tenant operations. |
| `n8n-on-exec01` | Migrate the n8n host onto `corpflow-exec-01` (or a sibling Elestio VM). | Threat model + DPA review (n8n holds Gmail OAuth tokens — sensitive). | Docker on a *different* VM, not this 2 GB box. | Would not consolidate prod secrets onto a single box; would split n8n credentials from operator shell access. |
| `exec01-uptime-from-third-location` | Run a diversified third-party uptime probe (something like `check-host`, BetterStack, Cronitor) pointed at `corpflowai.com`, `aileadrescue.corpflowai.com`, `lux.corpflowai.com`, `core.corpflowai.com/api/factory/health`. | Pure SaaS — no in-box install needed; this packet is "pick a vendor + DNS-verify." | Vendor SaaS; alerts forwarded to existing Telegram + n8n. | Would not replace `factory-control-loop.yml` (which checks repo↔deploy SHA — outside the SaaS scope). |
| `move-repo-to-/opt/corpflow/repos` | Run `sudo chown -R anton:anton /opt/corpflow` once and `mv ~/corpflow-ai-command-center /opt/corpflow/repos/`. Trivial; just needs Anton's sudo password in one session. | Anton at the keyboard with sudo password; or narrow `sudoers.d/anton-nopasswd` entry for `chown /opt/corpflow*`. | One-shot operator action. | Would not change permissions globally; the `sudoers.d` entry, if used, would be scoped to specific commands. |

When any of these moves out of "future" and into "in-flight," update the corresponding row in §3 in the same PR.

---

## 7. Open items that this doc tracks (today)

The status table here is the live one — update it in the same PR as the change.

| # | Item | State | Owner | Notes |
|---|---|---|---|---|
| 1 | `corpflow-exec-01` repo location | At `~/corpflow-ai-command-center`. Move to `/opt/corpflow/repos/` deferred. | Anton (one sudo command) | See `move-repo-to-/opt/corpflow/repos` packet in §6. |
| 2 | `corpflow-exec-01` repo HEAD currency | At `63d87660` (PR #226 era). Will jump to current main when PR #228 + #229 merge. | Anton or Cursor (`git pull` from the box). | Test count rises 382 → 394 once #229 lands. |
| 3 | Passwordless `sudo` for `anton` on the box | OFF (password required). | Anton — decision pending. | Either keep password sudo (safer), or scope a narrow `sudoers.d/anton-nopasswd` to the few commands future packets need. |
| 4 | Diversified uptime probe (third location, not GitHub Actions, not Vercel) | Not yet wired. | Future packet `exec01-uptime-from-third-location` or `exec01-cron-pulse`. | Today GitHub Actions is the only external alerting source for `factory-control-loop`. |
| 5 | n8n host location | Same as today (not on `corpflow-exec-01`). | Future packet `n8n-on-exec01`. | Migration is non-trivial — token store + DPA review needed before any move. |

---

## 8. Maintenance & change discipline

Adding any **new monitoring surface, scheduled job, or alert path** must:

1. Update **§ 3** ("Component map — today") in the same PR — never leave a new monitor undocumented.
2. Update **§ 6** ("Future packets") if the new surface graduates from a placeholder; remove the placeholder row.
3. Cross-link from the component-level canonical doc back to this file (one line in their "See also").
4. Respect `.cursor/rules/security-sensitive-changes.mdc`: if the new surface touches `api/`, `lib/server/`, secrets, or Prisma, also walk `docs/operations/SECURITY_REVIEW_CHECKLIST.md`.
5. For **production-impacting changes**, follow `.cursor/rules/delivery-reality.mdc`: live verification on the real production URLs is required before claiming `COMPLETE`.

Adding any **scheduled job to `corpflow-exec-01`** must additionally:

- Bring its own narrow-scope credentials (no reuse of operator-shell credentials).
- Pass the migration-to-server checklist (`docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`).
- Ship its own packet (`docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`) with explicit rollback and threat model.
- Have an alert path other than "look at the box" — Telegram, n8n forward, or both.

---

## 9. See also

- `docs/operations/PRODUCTION_PULSE_V1.md`
- `docs/operations/FACTORY_CONTROL_LOOP.md`
- `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md`
- `docs/operations/POSTGRES_PROVIDER.md`
- `docs/EXECUTION_BRAIN_VS_HANDS.md`
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `.github/workflows/factory-control-loop.yml`
- `.github/workflows/factory-health-ping.yml`
- `.github/workflows/diagnose-postgres-env.yml`
- `vercel.json` (in-app crons: `/api/cron/cmp-monitor`, `/api/cron/technical-lead`)
- `scripts/production-pulse.mjs`
- `scripts/factory-control-loop.mjs`
- `scripts/post-control-loop-telegram-alert.mjs`
- `lib/server/ops-alerts.js`

---

*This doc is the single source of truth for the monitoring component map. Component-level details live in their own canonical docs (linked above). When the system gains a new component, this doc gains a row in §3 in the same PR.*
