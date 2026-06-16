# ADR — Uptime Kuma on `corpflow-exec-01-u69678` (third-location monitoring only)

**Date:** 2026-06-15
**Status:** PROPOSED — pending Anton's merge of the authorization packet `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md`. Becomes ACCEPTED on merge.
**Supersedes:** none.
**Related:** `JE-2026-06-15-1` (companion journal row); `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3 (doctrine that named Kuma as a Phase 1 supporting service); `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 5 (gating analysis that recommended this ADR).
**Authors:** Anton (operator) + Assistant (Cursor at L1).

---

## 1. Context

Phase 1A live verification (`artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md`) confirmed that the producer-side wiring of CorpFlow's automation forward is live in production (Vercel: ingest secret set, forward URL set, CMP mirror enabled; Postgres reachable; seven public production URLs all 200). The remaining Phase 1A goal is **independent third-location monitoring** that does not share a failure domain with Vercel or GitHub Actions — i.e., closes blind spot # 7 of `docs/operations/MONITORING_ARCHITECTURE.md` § 6 ("no third-location uptime").

`docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3 already names **Uptime Kuma** as the chosen tool for that role. The doctrine packet was approved as COMPLETE for docs-only baseline; this ADR is the operational gate that authorizes the actual install on `corpflow-exec-01-u69678`.

`docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3 lists two hard rules that an Uptime Kuma install would lift:

- *"❌ No Docker / Ollama / Postgres install beyond the ERPNext sandbox + (authorised) production-shell scope."*
- *"❌ No scheduled jobs — no cron, no systemd timers, no `at`. Anything scheduled today still lives on L2 (Vercel cron or GitHub Actions)."*

Per § 10 of that doc, lifting either rule requires (in the same PR): an ADR (this doc), a passed `MIGRATION_TO_SERVER_CHECKLIST.md`, a new `MONITORING_ARCHITECTURE.md` § 2 row, an update to the boundary doc itself, an `AGENTS.md` Must-read row, a `JE-YYYY-MM-DD-N` row, and Anton's merge approval.

## 2. Decision

**Authorize Uptime Kuma to run as a single, narrow, packet-gated container on `corpflow-exec-01-u69678` for the explicit and only purpose of third-location uptime monitoring of CorpFlow public production URLs.**

Specifically:

- **Tool:** Uptime Kuma (open source — `https://github.com/louislam/uptime-kuma`). No alternative tool is authorized by this ADR.
- **Host:** `corpflow-exec-01-u69678` only (post-resize: 4 vCPU / 7,751 MiB RAM / 150 GB / 2 GB swap; per `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1).
- **Deployment shape:** single Docker container (typically `louislam/uptime-kuma:1`), persistent volume in the operator's home dir (e.g. `~/uptime-kuma-data/`), bound to **`127.0.0.1:3001`** loopback only. No public port. Operator UI access is via SSH local-port-forward (`ssh -L 3001:localhost:3001 anton@5.78.213.185`), the same pattern proven by `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 10.
- **Monitors (Phase 1A v1 set):** the seven public CorpFlow URLs already confirmed in Phase 1A (`https://core.corpflowai.com/api/factory/health`, `https://core.corpflowai.com/api/factory/production-pulse/runtime`, `https://corpflowai.com/`, `https://corpflowai.com/lead-rescue`, `https://aileadrescue.corpflowai.com/`, `https://lux.corpflowai.com/`, `https://lux.corpflowai.com/change`) plus an n8n reachability probe of the **n8n host's own health endpoint** (URL operator-held, not in repo). No probes against tenant-private routes; no probes against client APIs that would write rows.
- **Alert path:** Kuma's own Telegram bot + email/SMTP, **independent of** the in-repo `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ALERT_CHAT_ID` (separate failure domain is the point). n8n forwarding is permitted for non-critical signals only and **must not** be on the critical-outage primary alert path (no circular dependency).

This decision is the **first** (and as of 2026-06-15 the **only**) named, narrow, packet-gated exception to the § 5.3 hard rules. It does **not** generalize: any future tool (Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework, additional monitoring tool) requires its own ADR + authorization packet + § 10 gate. The exception is the named container, not "Docker beyond ERPNext".

### 2.1 Canonical authorization language (cite verbatim — no paraphrase)

> **This packet authorizes only the minimum execution boundary change needed for Uptime Kuma to run as a monitoring service on `corpflow-exec-01-u69678`.**
>
> **It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications, backups/restic, chatbot/live-chat platforms, AI frameworks, or production shell access beyond the documented Kuma installation/operation path.**

The same wording appears in `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` § 1.1, in `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5, and in `JE-2026-06-15-1`. It is the load-bearing carve-out: any future packet that relaxes any clause in the second paragraph above requires its own ADR + § 10 gate.

## 3. Credentials held on the box (named, narrow)

Inside the Kuma container (or its bind-mounted data volume) only:

- **Kuma admin credentials** (operator-set username + password; stored encrypted in Kuma's SQLite DB at `~/uptime-kuma-data/kuma.db`, `chmod 600`). Operator's password manager is the source of truth; the box copy is a derivative.
- **Kuma's Telegram bot token + chat id** (separate bot from the in-repo `TELEGRAM_BOT_TOKEN`; isolated failure domain; stored in Kuma's notification config inside the SQLite DB).
- **Optional Kuma SMTP relay credentials** (e.g. an app-password for an operator-side mailbox, never `support@corpflowai.com` Gmail OAuth — that token belongs to n8n, not Kuma).

Explicitly **not** on the box (re-stating § 5.3 hard rules that this ADR does **not** lift):

- ❌ `POSTGRES_URL` / `DATABASE_URL` / `DIRECT_URL` / any DB connection string.
- ❌ `MASTER_ADMIN_KEY` / `SESSION_TOKEN` / any factory-master credential.
- ❌ `VERCEL_TOKEN` / `VERCEL_*` / any deploy capability.
- ❌ `CORPFLOW_AUTOMATION_INGEST_SECRET` / `CORPFLOW_AUTOMATION_FORWARD_SECRET`.
- ❌ `N8N_EMAIL_WEBHOOK_SECRET` or any Gmail OAuth token.
- ❌ Stripe / payment / banking credentials.
- ❌ Tenant data of any kind (no DB exports, no content snapshots, no client emails, no client phone numbers).
- ❌ The in-repo `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ALERT_CHAT_ID` — Kuma uses its own bot/chat to keep failure domains separate.

## 4. Threat model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Public-internet exposure of Kuma admin UI | Low | High (admin UI takeover → can edit monitors / bot config) | Bind to `127.0.0.1:3001` only; UI access via SSH local-port-forward; no public DNS, no reverse proxy. Verified at install time + as part of monitor #13's first-week health checks. |
| Kuma admin password reuse / weak password | Low | High | Operator generates a long random password in his password manager at install time; never reused; stored only in password manager + Kuma's encrypted DB. |
| Kuma-vulnerability supply-chain (new CVE in container) | Medium | Medium (admin takeover or DoS on the box) | Pin to a specific Kuma minor (e.g. `louislam/uptime-kuma:1.23`); operator pulls newer pinned tag on a quarterly cadence; rollback is one-line `docker compose down && pin previous tag && up -d`. |
| Probe loop hammers a CorpFlow URL with a misconfigured interval | Low | Medium (unwanted traffic to production) | First-week interval cap: ≥ 60 s per monitor. Operator reviews intervals before enabling. No probe against any path that mutates state. |
| n8n alert path becomes circular (Kuma → n8n → Telegram, when n8n is down) | Medium | High (operator never learns about an outage) | **Hard rule:** Kuma's primary alert (Telegram or SMTP) must not pass through n8n. n8n forwarding is permitted as a *secondary* sink for non-critical signals only. Verified at install time by the operator forcing a fail with n8n stopped. |
| Box compromise → Kuma DB stolen → Telegram bot abused | Low | Low–Medium (a bot that can only send Kuma alerts; not an outbound corp channel) | Use a separate Telegram bot for Kuma; never reuse the in-repo bot token. Rotation via Telegram BotFather is one operator action. |
| Box becomes a beachhead into Vercel / Postgres | Very low | High (full prod compromise) | The box already holds **zero** prod secrets per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3. This ADR does **not** add any. The Kuma container has no DB connection, no Vercel token, no admin key. Lateral movement requires a separate § 5.3 violation. |
| Operator forgets the install runbook is operator-driven and tries to automate it from Cursor (L1 → L3 violation) | Medium | High (drift from § 5.4 pattern) | The install runbook (separate follow-up packet) hard-codes the § 5.4 pattern: Cursor authors at L1, Anton pastes at L3, Cursor records evidence. Cursor's tools have no SSH to the box. |

## 5. Rollback path

1. **Disable the monitor surface (operator, ≤ 60 s):** `docker compose -p uptime-kuma down` on the box. All probes stop instantly. No app-tier impact.
2. **Remove the install (operator, ≤ 5 min):** `docker compose -p uptime-kuma down -v` (also drops the persistent volume), `rm -rf ~/uptime-kuma-data/ ~/uptime-kuma/compose.yaml`, `docker image rm louislam/uptime-kuma:<pinned-tag>`. The box returns to its pre-Kuma state.
3. **Revert this PR (Cursor at L1, ≤ 1 hour to author + Anton merge):** revert the merge commit of the authorization packet. The boundary doc + `MONITORING_ARCHITECTURE.md` row + `AGENTS.md` row + JE row + Step-2 SHARED_TODO link all roll back atomically. This is repo state only — it does not stop a running Kuma install on the box (operator must run step 1).
4. **Per-row revocation (Cursor at L1, future packet):** future superseding `JE-YYYY-MM-DD-N` row that explicitly references and reverses `JE-2026-06-15-1`. Preferred when Kuma is replaced (e.g. by a managed third-party uptime probe) and the historical record of the v1 authorization should be kept.

The CorpFlow runtime, Vercel project, GitHub workflows, Postgres / Neon DB, Prisma schema, public pages, payment posture, ERPNext production-shell state (`corpflowai-production` Docker project + `corpflowai-production.localhost` site + `~/.erpnext-production-credentials`), ERPNext sandbox state, Phase B-a / Phase C state, n8n state, Plausible state, SBM application state, accountant-engagement state, and DNS / mail-routing are all unchanged by both the install and the rollback of THIS authorization.

## 6. Alert path (canonical for monitor #13)

| Channel | Role | Allowed for critical outage? | Notes |
|---|---|---|---|
| Telegram (Kuma's own bot) | Primary | YES | Required — must work even if n8n is down. Operator forces a test fail at install time to prove it. |
| SMTP / email (Kuma's own SMTP creds) | Backup primary | YES | Optional but recommended; same rule (must not depend on n8n). |
| n8n forwarding (Kuma → n8n → email/Slack/etc.) | Secondary | NO | Permitted for non-critical signals (status-page summaries, daily roll-ups). **Must not** be the only critical-outage path. |

Cross-reference: `docs/operations/MONITORING_ARCHITECTURE.md` § 4.1 Telegram contract; § 4.2 n8n forward contract; this ADR's alert path is **separate** from the in-repo Telegram contract by design (different bot, different chat, different code path).

## 7. Consequences

**Positive:**

- Closes blind spot # 7 ("no third-location uptime") of `MONITORING_ARCHITECTURE.md` § 6.
- Adds partial coverage for blind spot # 3 ("tenant resolution failure looks like apex 200") if the client-host monitor includes a content-marker assertion.
- Demonstrates that the § 10 gate works end-to-end (this ADR is its first invocation), proving the boundary discipline can be lifted **safely and narrowly** when the case is good.
- Gives the operator a single visible status dashboard (over SSH tunnel) covering both CorpFlow public surfaces and the n8n host.

**Negative / accepted:**

- One additional Docker container surface on the box (mitigated by binding to loopback, no public port, narrow credential scope).
- One additional set of credentials to rotate (Kuma admin password, Kuma Telegram bot token, optional SMTP creds). All operator-managed; none enter the repo.
- One additional doc (this ADR) + one packet + one runbook (the future install packet) to maintain. Mitigated by treating Kuma as the named exception that does **not** authorize further tools.
- The box's hard-rule list (`SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3) becomes "mostly forbidden, with one named carve-out at § 5.5". Mitigated by making § 5.5 explicit, naming Kuma as the only carve-out today, and requiring a new ADR for any further exception.

## 8. Alternatives considered (and rejected for this round)

| Alternative | Why it was considered | Why rejected for this round |
|---|---|---|
| Managed third-party uptime probe (Better Stack / UptimeRobot / Pingdom / Cronitor) | Zero install on the box; named in `MONITORING_ARCHITECTURE.md` § 11.2 as `exec01-uptime-from-third-location`. | Adds a vendor + a DPA + a billing line; gives less operator control over probe shape and content-marker assertions; doesn't double as a status dashboard. Kept on the radar as a **future** complementary path (a second third-location probe) rather than a replacement. |
| Add content-marker assertion to existing GitHub-Actions floor monitor (`factory-control-loop.yml` + `factory-health-ping.yml`) | Pure L2 change; no new server-side surface; named as the second non-install fallback in `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 5.3. | Same failure domain as the producer (GitHub Actions); does not close blind spot # 7. Worth doing **anyway** as a small follow-up, but not a substitute for third-location coverage. |
| Sibling Elestio VM dedicated to Kuma (separate from `corpflow-exec-01`) | Cleanest isolation; survives a `corpflow-exec-01` outage. | Costs another VM; adds another credential surface; Phase 1 budget is "use the paid server we already have". Reconsider when there are two paid servers and Kuma's failure-domain isolation matters more than $5/month. |
| Self-hosted Prometheus + Alertmanager | More flexible and ecosystem-native. | Heavier (Prometheus + Alertmanager + Grafana ≈ 4 containers, more memory) and heavier learning curve; Kuma is single-container and operator-friendly. Reconsider only when Kuma's feature set is genuinely outgrown. |
| Do nothing in Phase 1A; revisit in Phase 2 | Lowest-risk option. | Leaves blind spot # 7 open; the paid server is sitting idle for the third-location role it is best-suited to fill; Anton's stated goal ("prove that the paid server is beginning to provide real operational value") goes unmet. |

## 9. References

- `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3 (Kuma named in doctrine).
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3 (the rules being lifted), § 5.4 (the L1 + L3 collaboration pattern the future install packet will follow), § 5.5 (the carve-out subsection added by this packet), § 6 (absence list updated for Kuma's named exception), § 10 (the gate this ADR satisfies).
- `docs/operations/MONITORING_ARCHITECTURE.md` § 2 (Monitor #13 row added by this packet), § 4 (alert routing), § 5 (always-on minimum live URLs), § 6 (blind spots # 3 / # 7 partially closed by Kuma), § 11.1 (status table — Kuma row added with state "🟡 authorized, install pending"), § 11.2 (status table — `kuma-on-exec01-install` follow-up packet added).
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` (packet structure followed by `UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md`).
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` (every § 2 checkbox addressed inline in the authorization packet).
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` § 3 (Anton's merge of this PR is the AAP § 3 gate).
- `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 5 (gating analysis that recommended this ADR).
- `docs/decisions/JOURNAL.md` row `JE-2026-06-15-1` (companion journal row added by this packet).

## 10. Decision record

- **Status changes:** PROPOSED (2026-06-15, this commit) → ACCEPTED (on Anton's merge of the authorization packet) → SUPERSEDED (by a future ADR if Kuma is ever replaced or this carve-out is widened/narrowed).
- **Approver:** Anton (sole approver per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` § 3 for any L3 surface change).
- **Reviewer:** Anton (operator).
- **Scope of this ADR:** authorization only. The actual install commands are a **separate follow-up packet** — `UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1` (not authored in this round; will be authored once this ADR is ACCEPTED on merge, then executed at L3 by the operator per § 5.4 pattern).
