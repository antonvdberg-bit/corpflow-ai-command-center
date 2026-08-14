# Slack + Telegram dependency audit — issue #658

**Status:** Repo follow-up complete (PRs #659 / #669). Live Slack retirement **not** complete as of 2026-08-14.  
**Issue:** [#658](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/658) — retire Slack from CorpFlow operations; exception-only Telegram.  
**Repo baseline:** PR [#659](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/659) → `5272c44d` on `main`; PR [#669](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/669) follow-up.  
**Live n8n interrogation (2026-08-14):** `docs/operations/N8N_SLACK_DEPENDENCY_INTERROGATION_658.md` — Factory worker had **no n8n MCP**; live n8n Slack state remains an evidence gap.  
**Anton-only live cutover:** `docs/operations/SLACK_RETIREMENT_ANTON_ACTION_PACKETS_658.md`.

**Anchor:** `<!-- SLACK_TELEGRAM_AUDIT_658 -->`

---

## 1. Executive summary

| Channel | Repo runtime dependency? | Operational role after #658 |
|--------|---------------------------|-----------------------------|
| **Slack** | **No** — no app code, workflows, or n8n templates post to Slack from this repo | **Retired** — GitHub is durable source of truth; disable live n8n/GitHub→Slack via Anton packets |
| **Telegram** | **Yes** — exception-only helpers + n8n forward path | **Retained** — Anton approval (`needs:anton`), failed CI (factory control loop), checkpoints, urgent monitor findings, failed recovery requiring Anton. **Not** WIP cap / open-PR heartbeats (#684) |

**Noise retired in repo:**

- Routine **open-PR age / CI-surfacing** Telegram rules removed from `github-heartbeat-checker` n8n template (#659).
- **Unchanged** CMP delivery `needs_attention` re-alerts suppressed in `cmp-monitor-cron` (transition-only).
- Business-ops monitor n8n template: **urgent-only** paging.
- Heartbeat template + policy: **hour-bucket dedupe** (`kind × target × hour`) so exception alerts page once per hour bucket (#658 follow-up).
- Active ops docs that still named Slack as a live channel cleaned in this follow-up.

---

## 2. Slack inventory (classification)

| Location | Classification | Action |
|----------|----------------|--------|
| `mcp_servers.json` — `slack` MCP (`enabled: false`) | Obsolete | **RETIRED** description kept |
| `.env.template` — `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID` | Obsolete | **RETIRED** comment; placeholders only (no runtime reads) |
| `ops/n8n/production-pulse-v1.workflow.json` meta | Doc reference | Points to Telegram exception path |
| Active ops docs (Monitor / Lead Rescue / Monitoring arch / recipes / bridge digest) | Duplicate / obsolete wording | **Retired wording** in follow-up PR |
| MCP integration docs (en/es/zh) | Dev catalog | Marked RETIRED / disabled |
| Product / marketing / finance mentions of “Slack channel” | Non-ops / confidentiality | Left as historical / product benchmark |
| **Live n8n workflows** (not in repo) | **UNKNOWN** until n8n MCP/UI inventory; Slack-side traffic after 2026-07-03 looks historical/test-only | **Do not Packet A–B until live inventory** — see interrogation doc |
| **GitHub→Slack app / webhooks** | **ACTIVE duplicate** (`#corpflow-dispatch` still mirrored 2026-08-14) | **Anton Packet C** |
| **Slack tokens + email prefs** | External | **Anton Packet D** |
| **Slack workspace** | External | **Anton Packet E** (last; after verify) |

**No Slack references in:** `lib/` runtime senders, `api/`, `.github/workflows/`, active Vercel paths.

**Client / tenant / revenue dependency on Slack:** **None found** in repo.

---

## 3. Telegram inventory

### 3.1 Server runtime (`lib/server/`)

| Module | Trigger | Exception-only? | Notes |
|--------|---------|-----------------|-------|
| `ops-alerts.js` — `sendTelegramOpsAlert` | Direct Telegram POST when env set | Yes when used | **Zero callers** today |
| `ops-alerts.js` — `forwardOpsAlert` | n8n `corpflow.ops_alert.v1` | Yes — checkpoint kinds | Used by checkpoints |
| `operator-checkpoint-alert.js` | Four checkpoint kinds → n8n forward | Yes | Unchanged |
| `cmp-monitor-cron.js` | Delivery validation failure | Yes — transition-only | `ops-notification-policy.js` |
| `webhook.js` | Legacy direct Telegram on webhook ping | Low traffic | Unchanged |
| `business-operations-dispatcher.js` — `shouldPageAntonForRouting` | Dispatcher classification | Yes — Anton/gated only | No send in-repo |
| `operator-review-handoff.js` / `cursor-ops-status.js` | PR status kinds | N/A | **No Telegram** |

### 3.2 CI

| Path | Trigger | Exception-only? |
|------|---------|-----------------|
| `post-control-loop-telegram-alert.mjs` + `factory-control-loop.yml` | **on failure only** | Yes |

### 3.3 n8n templates (`docs/n8n/templates/`) — inactive

| Template | Telegram behavior |
|----------|-------------------|
| `github-heartbeat-checker.template.json` | Anton-required only (`needs:anton` / failed recovery); WIP + digest log-only; fingerprint dedupe (#684) |
| `business-operations-monitor-v1.template.json` | Urgent only |
| `business-operations-dispatcher-v1.template.json` | `should_telegram: false` |
| `automation-forward-issue-611-safe-test.template.json` | Allowlist + 24h event-id dedupe |

---

## 4. Exception-only policy (retained)

Telegram **may** fire for:

1. Anton approval — four `corpflow.ops_alert.v1` checkpoint kinds.
2. Failed CI — factory control loop workflow failure.
3. Meaningful blocker — CMP delivery **newly** blocked or **new** `needs_attention`.
4. Production incident — urgent business-ops monitor findings.
5. **Decision Inbox exceptions (#676 / #684)** — new/changed `needs:anton` items, deadline escalation, failed previously-approved action, or failed recovery requiring Anton. Fingerprint-deduped, nonblank, GitHub link + #684 message contract. See `docs/n8n/anton-decision-inbox-exception-notify.md`.

**Must stay silent:** green crons, unchanged blocked state, open PR merely existing, WIP cap alone, stale digest alone, unchanged review status, routine progress, corpflow_test publish, unknown automation-forward events, unchanged Decision Inbox fingerprints (including after hour roll — no hourly repeat).

Canonical: `lib/server/ops-notification-policy.js`. Live apply: `docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`.

---

## 5. Repo vs Anton-only

### 5.1 Done in repo (#659 + this follow-up)

- Exception-only policy + tests (fingerprint dedupe; WIP/digest no longer page — #684)
- CMP monitor transition-only alerts
- n8n template noise cuts + heartbeat staticData fingerprint store
- Slack retirement across active ops docs / MCP catalog
- Audit + **Anton click-by-click packets**
- Live-apply runbook for in-place n8n correction (#684)

### 5.2 Anton-only (live cutover)

Exact UI steps: **`docs/operations/SLACK_RETIREMENT_ANTON_ACTION_PACKETS_658.md`**

| Packet | Goal |
|--------|------|
| Live n8n inventory | Read-only (n8n MCP or UI) before A/B — `N8N_SLACK_DEPENDENCY_INTERROGATION_658.md` |
| A | Deactivate n8n → Slack posting (**only if live Slack nodes exist**) |
| B | Remove Slack credentials from n8n (after A) |
| C | Disable GitHub→Slack app / webhooks (**proven active 2026-08-14**) |
| D | Revoke tokens + stop Slack email noise |
| E | Archive/delete workspace (last) |

---

## 6. Test evidence (local)

```bash
node --test node-tests/ops-notification-policy.test.mjs
node --test node-tests/n8n-automation-forward-issue-611.test.mjs
node --test node-tests/post-control-loop-telegram-alert.test.mjs
node --test node-tests/n8n-slack-repo-inventory-658.test.mjs
```

**Exception path:** newly blocked, newly `needs_attention`, `needs:anton` packet, recovery-failed-needs-Anton, valid lead/alert (#611), first page per fingerprint.  
**Silence:** unchanged blocked/`needs_attention`, open PR / WIP cap alone, digest stale alone, unknown/duplicate/blank (#611), **same fingerprint after hour roll**.

---

## 7. Rollback

| Layer | Action |
|-------|--------|
| Repo | Revert this PR / #659 merge commit(s) |
| Live Slack | Anton packets A–D rollback sections |
| Workspace delete | Avoid until Packet E verification; archive first |

---

## 8. Completion checklist vs issue #658

| Criterion | Status |
|-----------|--------|
| Inventory + classification | **Repo done**; **live n8n UNKNOWN** without n8n MCP/UI |
| Preserve GitHub lifecycle / approval gates | **Done** (no gate changes) |
| Critical alerts on approved non-Slack route | **Done in repo** (Telegram exception-only); live validate after Packet A |
| Disable n8n / GitHub→Slack posting | **Not done live.** Packet C still required for GitHub app; A–B gated on live n8n inventory |
| Remove Slack from active ops docs / runtime config | **Done in repo** |
| Revoke Slack secrets | **Anton Packet D** (no values in repo) |
| No client/tenant/revenue Slack dependency | **Verified in repo** |
| Validate exception alerts after retirement | **Anton** after live cutover |
| Rollback evidence | **§7 + Anton packets** |
