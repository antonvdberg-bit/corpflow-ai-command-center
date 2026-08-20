# Slack + Telegram dependency audit — issue #658

**Status:** 2026-08-20 restart implementation — remaining repo reintroduction paths removed; CI guard added.  
**Issue:** [#658](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/658) — retire Slack from CorpFlow operations; exception-only Telegram.  
**Repo baseline:** PRs [#659](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/659) / [#669](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/669) on `main`; this restart closes leftover config/CI gaps.  
**Permanent guard:** `lib/server/slack-retirement-guard.js` · `npm run check:slack-retirement` · Agent CI step.  
**Anton-only live cutover (optional remaining desk):** `docs/operations/SLACK_RETIREMENT_ANTON_ACTION_PACKETS_658.md`.

**Anchor:** `<!-- SLACK_TELEGRAM_AUDIT_658 -->`

---

## 0. 2026-08-20 restart — root cause and implementation

Anton restarted #658 on 2026-08-20: treat prior Slack-retirement work as incomplete; do not produce another docs-only audit.

**Root cause of the 2026-08-17 incomplete close:** retirement was declared complete from n8n/docs narrative (archived Slack workflow, credential removed, Telegram test deliveries, waived duplicate-proof) **without**:

1. Removing remaining **repo reintroduction paths** (`mcp_servers.json` still shipped a Slack MCP server template; `.env.template` still assigned Slack-named keys, which enter the Vercel env allowlist).
2. A **permanent CI/regression guard** that fails when those paths return.
3. Binding close-out to scanner evidence rather than an operator “COMPLETE” comment.

That is why #658 could be labelled done while Slack could still be re-enabled by flipping `enabled: true` or setting template keys.

**This implementation (not another audit-only PR):**

| Surface | Classification before restart | Action now |
|---------|-------------------------------|------------|
| `mcp_servers.json` Slack server (`enabled: false` but still present) | **ACTIVE** reintroduction path | **Removed** |
| `.env.template` Slack-named assignments | **ACTIVE** allowlist/reintroduction path | **Removed** |
| `lib/` / `api/` / `pages/` / `.github/workflows/` Slack senders | None found | Guarded |
| Repo n8n JSON (`ops/n8n/`, `docs/n8n/templates/`) Slack nodes | None found | Guarded |
| `package.json` Slack packages | None found | Guarded |
| Historical ops/product docs mentioning Slack retirement | **HISTORICAL** | Left; wording updated where it still implied a live disabled template |
| Product/marketing “Slack channel” confidentiality notes | **FALSE POSITIVE** (not ops) | Left |
| Live n8n / unused vault secrets / workspace delete | External / protected | Not mutated here; Anton MERGE only |

**Regression control:** `scanSlackRetirement()` walks supported runtime/config/CI paths and fails on Slack env keys, MCP server package, npm `@slack/` deps, `hooks.slack.com`, n8n Slack node type, and GitHub Slack actions. Historical prose (“Slack is retired”) is not a finding.

**Tests:** `node --test node-tests/slack-retirement-guard.test.mjs` plus `npm run check:slack-retirement` in Agent CI.

**Live corpflow_test verification (2026-08-20, this worker; current Production spine, pre-merge of this PR):**

| URL | HTTP | Slack markers (`hooks.slack.com`, Slack API host, Slack-named env keys, n8n Slack node) |
|-----|------|------------------------------------------------------------------------------------------|
| `https://core.corpflowai.com/api/factory/health` | 200 JSON `ok: true` | None |
| `https://core.corpflowai.com/api/factory/production-pulse/runtime` | 200 JSON `ok: true` | None |
| `https://lux.corpflowai.com/` | 200 HTML | None |
| `https://lux.corpflowai.com/change` | 200 HTML | None |

No Telegram/Slack/email send was performed. Client-facing Lux routes do not depend on Slack.

---

## 1. Executive summary

| Channel | Repo runtime dependency? | Operational role after #658 |
|--------|---------------------------|-----------------------------|
| **Slack** | **No** — senders removed; MCP template and env placeholders removed; CI forbids reintroduction | **Retired** — GitHub is durable source of truth; Telegram remains the exception-only page |
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
| `mcp_servers.json` Slack MCP template | Was **ACTIVE** reintroduction | **Removed** (2026-08-20) |
| `.env.template` Slack-named keys | Was **ACTIVE** allowlist path | **Removed** (2026-08-20) |
| `ops/n8n/production-pulse-v1.workflow.json` meta | **HISTORICAL** | Points to Telegram exception path |
| Active ops docs (Monitor / Lead Rescue / Monitoring arch / recipes / bridge digest) | **HISTORICAL** | Retired wording; do not reintroduce Slack as a live channel |
| MCP integration docs (en/es/zh) | **HISTORICAL** | Catalog row removed; states Slack MCP is gone |
| Product / marketing / finance mentions of “Slack channel” | **FALSE POSITIVE** | Left as historical / product benchmark |
| `lib/server/slack-retirement-guard.js` + Agent CI | **ACTIVE control** (anti-Slack) | Permanent fail-closed scanner |
| **Live n8n workflows** (not in repo) | Previously reported retired | Not mutated in this PR |
| **GitHub→Slack app / webhooks / unused vault keys / workspace** | External / protected | Optional Anton Packets C–E; not required to merge |

**No Slack senders in:** `lib/` (except the retirement guard pattern list), `api/`, `pages/`, `.github/workflows/`, repo n8n JSON.

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

### 5.1 Done in repo (#659 + #669 + 2026-08-20 restart)

- Exception-only policy + tests (fingerprint dedupe; WIP/digest no longer page — #684)
- CMP monitor transition-only alerts
- n8n template noise cuts + heartbeat staticData fingerprint store
- Slack MCP template and Slack-named `.env.template` keys **removed**
- Permanent Slack-retirement CI guard (`lib/server/slack-retirement-guard.js`)
- Audit + Anton click-by-click packets (optional remaining desk only)
- Live-apply runbook for in-place n8n correction (#684)

### 5.2 Anton-only (live cutover)

Exact UI steps: **`docs/operations/SLACK_RETIREMENT_ANTON_ACTION_PACKETS_658.md`**

| Packet | Goal |
|--------|------|
| A | Deactivate n8n → Slack posting |
| B | Remove Slack credentials from n8n |
| C | Disable GitHub→Slack app / webhooks |
| D | Revoke tokens + stop Slack email noise |
| E | Archive/delete workspace (last) |

---

## 6. Test evidence (local)

```bash
npm run check:slack-retirement
node --test node-tests/slack-retirement-guard.test.mjs
node --test node-tests/ops-notification-policy.test.mjs
node --test node-tests/n8n-automation-forward-issue-611.test.mjs
node --test node-tests/post-control-loop-telegram-alert.test.mjs
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
| Inventory + classification | **Done** (§0 + §2; ACTIVE / HISTORICAL / FALSE POSITIVE) |
| Preserve GitHub lifecycle / approval gates | **Done** (no gate changes) |
| Critical alerts on approved non-Slack route | **Done in repo** (Telegram exception-only) |
| Remove ACTIVE Slack repo reintroduction paths | **Done** (MCP template + env placeholders removed) |
| Permanent CI/regression guard | **Done** (`npm run check:slack-retirement`) |
| Disable n8n / GitHub→Slack posting | Previously reported complete on live n8n; not re-opened here |
| Revoke unused Slack-named secrets / delete workspace | Optional Anton Packets D–E (protected; not required to merge) |
| No client/tenant/revenue Slack dependency | **Verified in repo** |
| Rollback evidence | **§7 + revert this PR** |
