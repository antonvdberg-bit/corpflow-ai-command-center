# Server safety baseline + Chatwoot decision packet (v1)

**Status:** Docs/decision only. **No install, no production change, no widget enablement, no migration.**
**Owner:** Anton (operator) for installs/secrets/server actions; Cursor for this doc.
**Created:** 2026-06-30.
**Implements:** GitHub issue [#487](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/487).
**Operates under:** [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) parallel execution board, **Lane C** (server safety / backups / monitoring / Chatwoot gate).
**Anchor sentinel:** `<!-- SERVER_SAFETY_CHATWOOT_DECISION_V1 -->`

<!-- SERVER_SAFETY_CHATWOOT_DECISION_V1 -->

## 0. TL;DR (action-plan-ready recommendation)

| Question | Finding | Recommendation |
|---|---|---|
| **Backup mechanism?** | restic → Cloudflare R2 on `corpflow-exec-01-u69678`, user-systemd **heartbeat** + **retention** timers (7 daily / 4 weekly / 6 monthly + prune), operational since 2026-06-26. Production DB explicitly **out of scope** (Neon-managed). | Mechanism is healthy. **Add a daily backup-health check that Telegram-alerts only on failure** (named gap) + a **lightweight restore-drill requirement** for later scheduling. |
| **Backup failures detectable?** | Detectable in `journalctl` user logs; **no proactive alert** if a backup fails or goes stale. | Close this gap with the backup-health check (design below; implement as a **separate Anton-gated server packet**). |
| **Monitoring / analytics?** | Already substantial: 13 monitors (`MONITORING_ARCHITECTURE.md`), Uptime Kuma active on the box, Plausible analytics (apex, internal-vs-client ADR), factory control loop, CMP monitors, Technical Lead. No Sentry/PostHog/Umami. | **No new analytics product.** Gap not proven; issue constraint honoured. |
| **Living Word chat tool today?** | Public site `livingwordmauritius.com` runs a **GoHighLevel (LeadConnector) widget** (WordPress + Elementor). A **CorpFlow-native chat widget v0** (`lib/server/chat-widget/`, `chat_widget_v0` migration, optional AI retrieval) exists in-repo as the planned GHL replacement on the CorpFlow tenant surface. **No Chatwoot/Crisp/Intercom/Tawk/Tidio present.** | Keep current path. The Living Word chat need = **lead-capture chatbot**, already covered by the native widget plan — **not** a Chatwoot use case. |
| **Should Chatwoot proceed now?** | Chatwoot is a **customer-support / conversation inbox** (agent-facing), **not** a website lead widget and **not** the CRM. Support v1 is Freshdesk-email-only (`SUPPORT_SYSTEM_FEASIBILITY_V1.md`, live chat O6 + AI chatbot O7 **deferred**). Standing hold: no new self-hosted tool except the Uptime Kuma carve-out. | **DEFER Chatwoot. Do not install now.** If pursued, **Option A** (pilot on CorpFlowAI/CoreFlow first) via a **separate authorization packet** — never auto-promoted, never on Living Word in this packet. |
| **Recommended next packet?** | — | **Backup health-check + Telegram-on-failure** (highest value, lowest risk, reuses the existing alert path). Chatwoot remains a **gate/decision**, not an install. |

This packet authorizes **nothing** to run. It records findings and a recommendation for Anton to approve a follow-up packet.

## 1. Scope + hard constraints (from #487)

Docs/planning first. **No** production install, widget enablement, Living Word migration, new analytics product, package install, env var change, or production DB change. One production app + one Postgres via `POSTGRES_URL` preserved. Chatwoot must not touch production credentials or client data until approved. No AgentSpan/OpenJarvis/OpenClaw. Parked secret-rotation cleanup stays parked.

## 2. Task 1 — existing backup setup (findings)

Canonical: `docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md` (operational record), `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` §5 (destination decision).

| Question (#487) | Finding |
|---|---|
| Current backup mechanism | **restic** to **Cloudflare R2** (`s3:` backend), repository prefix `self-hosted-ops/restic`, bucket `corpflowai-ops-backups` (private). |
| Runs daily? | Two **user-systemd** timers under `anton` with `Linger=yes`: a **heartbeat** timer (proves repo writable/reachable) and a **retention** timer (policy: 7 daily / 4 weekly / 6 monthly + prune). |
| Where logs/status live | `journalctl --user -u corpflowai-ops-restic-heartbeat.service` / `…-retention.service` on `corpflow-exec-01-u69678`. |
| Failures currently detectable? | **Only by inspecting the journal.** There is **no push alert** if a run fails or snapshots go stale → this is the gap. |
| Scope | Self-hosted ops data + internal artifacts only. **Production database is explicitly out of scope** (Neon-managed; a prod-DB backup needs its own approved runbook). |

**No redesign needed.** The mechanism is sound; the only gap is **proactive failure visibility**.

## 3. Task 2 — daily backup health check (design, implement later)

A small, **read-only** health check (server-side on the box, operator/L3-owned) that runs daily and **alerts on failure only** (silent on success), reusing the existing Telegram path (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID`, `TELEGRAM_ALERT_WIRING_PACKET_V1.md`).

Checks (all from `restic snapshots` / `restic stats`, no production data touched):

| Check | Pass condition | Alert if |
|---|---|---|
| Latest snapshot exists | ≥ 1 snapshot for the expected tag | none found |
| Recency | newest snapshot timestamp within **36h** | older than 36h |
| Plausible size | snapshot/repo size within an expected band (not ~0, not absurdly large) | implausible size |
| Retention sane | snapshot count consistent with 7/4/6 policy (not collapsing to 0/1) | retention obviously broken |
| Repo reachable | `restic snapshots` exits 0 (credentials + endpoint OK) | non-zero exit |

- **Silent success** (no daily "ok" noise); **error-only** Telegram. Dedupe `kind × hour` per the wiring packet.
- Implemented as a **separate Anton-gated server packet** (it runs on `corpflow-exec-01`, reads the restic repo, uses a Telegram credential) — outside this docs packet's authority.

## 4. Task 3 — restore confidence (design, implement later)

- A **harmless write/read/restore** was verified **once at setup** (into a disposable dir; never production volumes/DB) — recorded in `SELF_HOSTED_OPS_R2_RESTIC.md` §5.
- **No recurring restore drill** is scheduled → add a **lightweight restore-test requirement** (e.g. monthly: restore one small path to a temp dir, confirm contents, delete) to the future server packet. **No risky production restore** in any packet without separate approval.

## 5. Task 4 — existing monitoring / analytics (findings)

Canonical: `docs/operations/MONITORING_ARCHITECTURE.md` (single component map).

| Layer | What exists |
|---|---|
| Drift / health monitors | **13 monitors** incl. factory control loop, factory health endpoint, production pulse, CMP delivery monitor, CMP overseer/stuck-repair, Technical Lead observer, billing sentinel, Postgres env-drift diagnostic, `vercel.json` cron self-validation. |
| Uptime monitoring | **Uptime Kuma** active on `corpflow-exec-01` (Monitor #13, 8 sub-probes incl. 7 public floor URLs + n8n `/healthz`), its own Telegram bot. |
| Analytics | **Plausible** (apex; internal-vs-client boundary ADR `20260526-…`). |
| Alert path | Telegram (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID`) + n8n forward envelope. |
| Not present | Sentry, PostHog, Umami, Grafana, Better Stack/Logtail. |

**Recommendation: do not add a new analytics product.** No proven gap; issue forbids it without approval. The only monitoring gap worth closing now is **backup-failure alerting** (§3) — and the broader Action-Plan throughput heartbeat is already designed under #495.

## 6. Tasks 5–6 — Living Word chat + Chatwoot comparison (findings)

### 6.1 What Living Word uses today
- **Public site** `https://livingwordmauritius.com/`: **GoHighLevel (LeadConnector) widget** on WordPress + Elementor (the GHL subscription's main cost driver). Source: `artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-options-assessment.md`, `estate-map.md`.
- **CorpFlow side**: a **native CorpFlow chat widget v0** (`lib/server/chat-widget/`, `chat_widget_v0` Prisma migration, structured paths + optional AI retrieval behind tenant budget caps) — built as the **GHL replacement** on the CorpFlow tenant surface (`living-word-mauritius.corpflowai.com`), not yet cut over to the public WordPress site.
- **No** Chatwoot / Crisp / Intercom / Tawk / Tidio / Botpress / Voiceflow / Landbot / LiveChat present.

### 6.2 Chatwoot vs the Living Word need
- Living Word's need is a **website lead-capture chatbot** (structured "visit a service / prayer request / give" paths → name+email → route). That is exactly what the **native widget v0** delivers.
- **Chatwoot is a different product class**: an agent-facing **conversation inbox / live-chat / support** platform. Living Word has **no agents on staff** for live chat (per the assessment's out-of-scope list). Chatwoot would **not** replace the GHL lead widget and would **add** an operational surface nobody is staffed to run.
- **Chatwoot is not the CRM** (CRM replacement = Twenty vs EspoCRM, separate).

### 6.3 Conclusion
- For Living Word: **keep the current path** — GHL widget until the **native widget v0** replaces it (separate, already-scoped tenant work). **Chatwoot is not the right tool for Living Word's chat need.**

## 7. Task 7 — Chatwoot recommendation

**Verdict: DEFER (Option C for Living Word + a gated Option A path for CorpFlow).**

- **Do not install Chatwoot now**, anywhere. It is not needed for Living Word (native widget covers the lead-capture need) and support v1 is Freshdesk-email-only with live chat (O6) and AI chatbot (O7) explicitly deferred (`SUPPORT_SYSTEM_FEASIBILITY_V1.md`).
- **Standing self-hosted-tool hold applies.** Uptime Kuma is the **only** authorized self-hosted carve-out (`SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` §5.5). A new container/tool like Chatwoot needs its **own ADR + authorization packet** — sameness is not authorization.
- **If/when a conversation-inbox need is proven** (e.g. real multi-channel support volume), pursue **Option A: pilot Chatwoot on CorpFlowAI/CoreFlow first** — never on Living Word, never with production credentials/client data until approved — via a separate authorization packet that includes an ADR, an install runbook, the §5.5 carve-out test, and a security review.

Options restated for the record: **A** (Chatwoot pilot on CorpFlowAI/CoreFlow first) — *future, gated*; **B** (Chatwoot for Living Word) — **rejected** (wrong tool for the need); **C** (keep current Living Word chat) — **adopted now**; **D** (both with boundaries) — *only after A proves value*.

## 8. Recommended next implementation packet

**`Server-Backup-Health-Check-And-Alert-1`** (Anton-gated, server-side on `corpflow-exec-01`):
- Implements §3 (daily backup-health check, Telegram-on-failure, silent success) + §4 (recurring lightweight restore drill).
- Reuses the existing restic repo + Telegram path; **no** production DB backup, **no** `POSTGRES_URL`, **no** new analytics product, **no** new container.
- Gated because it runs on L3, reads the restic repo, and uses a Telegram credential.

**Chatwoot stays a decision/gate, not an install.** No Chatwoot packet is recommended until a conversation-inbox need is proven.

## 9. Boundaries honoured (this packet)

- Docs/decision only — no install, no widget enablement, no migration, no new analytics product, no package install, no env/secret change, no production DB change.
- One app + one Postgres via `POSTGRES_URL` preserved. No second app/DB.
- No Chatwoot connected to production credentials or client data. No AgentSpan/OpenJarvis/OpenClaw.
- Parked secret-rotation cleanup not reopened. No self-merge.

## 10. Cross-references

- `docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md`, `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` — backup mechanism.
- `docs/operations/MONITORING_ARCHITECTURE.md` — monitoring component map; where a backup-health monitor would register.
- `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` — alert payload contract + severity ladder + anti-spam.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` §5.5 — self-hosted-tool carve-out rule (Kuma only).
- `docs/operations/SUPPORT_SYSTEM_FEASIBILITY_V1.md` — support v1 (Freshdesk; live chat + AI chatbot deferred).
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-options-assessment.md` — Living Word chat options + GHL-widget finding.
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` — Lane C; `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md` — #495 throughput heartbeat.

## 11. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/decision only.
- **Implementation:** none. No runtime, no install, no env, no secrets, no DB, no deploy, no new container, no widget.
- **Verdict:** PARTIAL by design — findings + recommendation delivered; the backup-health-check implementation and any Chatwoot pilot are separate Anton-gated packets.
