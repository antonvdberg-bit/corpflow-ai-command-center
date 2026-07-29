# Slack + Telegram dependency audit — issue #658

**Status:** Audit + repo-side noise retirement (2026-07-28).  
**Issue:** [#658](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/658) — retire Slack from CorpFlow operations; exception-only Telegram.  
**Verdict:** Repo changes in PR on branch `cursor/slack-telegram-noise-retire-658-1e9e`. **Anton-only** steps listed in §6.

**Anchor:** `<!-- SLACK_TELEGRAM_AUDIT_658 -->`

---

## 1. Executive summary

| Channel | Repo runtime dependency? | Operational role after #658 |
|--------|---------------------------|-----------------------------|
| **Slack** | **No** — no app code, workflows, or n8n templates post to Slack from this repo | **Retired** — GitHub is durable source of truth; disable live n8n/GitHub→Slack in n8n dashboard (Anton) |
| **Telegram** | **Yes** — exception-only helpers + n8n forward path | **Retained** — Anton approval, failed CI (factory control loop), checkpoints, urgent monitor findings, stale digest / WIP cap |

**Noise retired in repo (this PR):**

- Routine **open-PR age / CI-surfacing** Telegram rules removed from `github-heartbeat-checker` n8n template.
- **Unchanged** CMP delivery `needs_attention` re-alerts suppressed in `cmp-monitor-cron` (transition-only).
- Business-ops monitor n8n template: **urgent-only** paging (warnings no longer fall through to Telegram).

---

## 2. Slack inventory

| Location | Classification | Action (this PR) |
|----------|----------------|------------------|
| `mcp_servers.json` — `slack` MCP entry (`enabled: false`) | Obsolete / test-only | Mark **RETIRED** in description; keep disabled |
| `.env.template` — `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID` | Obsolete | Comment **RETIRED — issue #658**; no runtime reads |
| `ops/n8n/production-pulse-v1.workflow.json` meta | Doc reference only | Replace Slack with Telegram exception path |
| `docs/n8n/automation-forward-recipe.md` | Operator guidance | Remove Slack as recommended branch |
| `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` | Canonical ops | Point to Telegram exception-only |
| `docs/operations/OPERATOR_BRIDGE_DIGEST_V1.md` | Planning | Slack mirror **not planned** (unchanged) |
| `docs/operations/MONITORING_ARCHITECTURE.md` | Reference | Slack = future v2 only (unchanged) |
| `mcp_servers.json` / `docs/en/MCP_INTEGRATION.md` etc. | Dev docs | Slack MCP listed but disabled — not operational |
| **Live n8n workflows** (not in repo) | **Duplicate / noise** | **Anton:** deactivate GitHub→Slack + `#corpflow-dispatch` / `#corpflow-alerts` posting |
| **Slack workspace apps** | External | **Anton:** revoke/disable after n8n retirement verified |

**No Slack references in:** `lib/` runtime senders, `api/`, `.github/workflows/`, active Vercel paths.

---

## 3. Telegram inventory

### 3.1 Server runtime (`lib/server/`)

| Module | Trigger | Exception-only? | Change |
|--------|---------|-----------------|--------|
| `ops-alerts.js` — `sendTelegramOpsAlert` | Direct Telegram POST when env set | Yes — callers only on failure/blocker | Unchanged |
| `ops-alerts.js` — `forwardOpsAlert` | n8n `corpflow.ops_alert.v1` | Yes — checkpoint kinds only in safe template | Unchanged |
| `operator-checkpoint-alert.js` | Four checkpoint kinds → n8n forward | Yes | Unchanged |
| `cmp-monitor-cron.js` | Delivery validation failure | **Fixed** — transition-only via `ops-notification-policy.js` |
| `webhook.js` | Legacy direct Telegram on webhook | Low traffic | Unchanged |
| `business-operations-dispatcher.js` — `shouldPageAntonForRouting` | Dispatcher classification | Yes — Anton/gated only | Unchanged |

### 3.2 CI (`scripts/`, `.github/workflows/`)

| Path | Trigger | Exception-only? | Change |
|------|---------|-----------------|--------|
| `post-control-loop-telegram-alert.mjs` | `factory-control-loop.yml` **on failure only** | Yes | Unchanged |
| `factory-control-loop.yml` | Daily drift / SHA / cron guard failure | Yes | Unchanged |
| `telegram-get-chat-id.mjs` | Operator utility | N/A | Unchanged |

### 3.3 n8n templates (`docs/n8n/templates/`)

| Template | Active in repo? | Telegram behavior | Change |
|----------|-----------------|-------------------|--------|
| `automation-forward-issue-611-safe-test.template.json` | **Inactive** | Lead Rescue intake + four checkpoint kinds; dedupe + burst cap | Unchanged |
| `github-heartbeat-checker.template.json` | **Inactive** | Was: digest + WIP + **per-PR age** | **Removed per-PR age** (#658) |
| `business-operations-monitor-v1.template.json` | **Inactive** | Was: urgent **or** warning+antonNeeded | **Urgent only** |
| `business-operations-dispatcher-v1.template.json` | **Inactive** | `should_telegram: false` | Unchanged |

---

## 4. Exception-only policy (retained)

Telegram **may** fire for:

1. Anton approval — four `corpflow.ops_alert.v1` checkpoint kinds.
2. Failed CI — factory control loop workflow failure.
3. Meaningful blocker — CMP delivery **newly** blocked or **new** `needs_attention`.
4. Stale work — dispatcher digest stale > 12h (heartbeat, when activated).
5. Production incident — urgent business-ops monitor findings.
6. PR ready for Anton — WIP cap > 2; merge/approval checkpoints.

**Must stay silent:** green crons, unchanged blocked state, open PR merely existing, unknown automation-forward events.

Canonical: `lib/server/ops-notification-policy.js`.

---

## 5. Repo changes vs Anton-only

### 5.1 Done in repo (this PR)

- `lib/server/ops-notification-policy.js` + tests
- `lib/server/cmp-monitor-cron.js` — transition-only alerts
- n8n template updates, `mcp_servers.json`, `.env.template`
- This audit + recipe/runbook updates

### 5.2 Anton-only

| Step | Owner |
|------|-------|
| Deactivate live n8n workflows posting to Slack | Anton |
| Remove Slack credentials from n8n | Anton |
| Disable GitHub→Slack app | Anton |
| Revoke Slack tokens after verification | Anton |
| Slack workspace archive | Anton (after verification) |

---

## 6. Test evidence (local)

```bash
node --test node-tests/ops-notification-policy.test.mjs
node --test node-tests/n8n-automation-forward-issue-611.test.mjs
node --test node-tests/post-control-loop-telegram-alert.test.mjs
```

**Exception path:** newly blocked, newly `needs_attention`, `digest_stale`, `wip_cap`, valid lead/alert (#611).  
**Silence:** unchanged blocked/`needs_attention`, healthy digest + open PR, unknown/duplicate/blank (#611).

---

## 7. Rollback

Revert PR for repo state. Slack re-enable is Anton-only (n8n + Slack app).
