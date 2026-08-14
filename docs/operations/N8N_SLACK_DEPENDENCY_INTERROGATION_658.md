# n8n / Slack dependency interrogation — issue #658

**Status:** Investigation evidence (2026-08-14). Live n8n MCP interrogation **not possible** in this Cursor Factory Automation worker.  
**Issue:** [#658](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/658)  
**Dispatch:** Anton comment on #658 (2026-08-14T06:05:42Z) — investigation-only; no disable/delete/edit/restart/rotate/revoke/deploy/send.  
**Factory run:** `bc-ea4e5bc9-dc36-485c-8066-cb265df144bf` (handoff Actions run `31775135698`)  
**Companion audit:** `docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md`  
**Anton live cutover packets:** `docs/operations/SLACK_RETIREMENT_ANTON_ACTION_PACKETS_658.md`  
**Anchor:** `<!-- N8N_SLACK_DEPENDENCY_INTERROGATION_658 -->`

<!-- N8N_SLACK_DEPENDENCY_INTERROGATION_658 -->

This pass answers the current #658 investigation dispatch. It does **not** retire live Slack, change n8n, or claim #658 complete.

---

## Status

**Repo-side n8n/Slack inventory: COMPLETE.**  
**Live n8n MCP interrogation: NOT PERFORMED — access limitation.**  
**Unique live Slack producer already evidenced on Slack itself: GitHub for Slack → `#corpflow-dispatch` (not n8n).**  
**Issue #658: NOT COMPLETE.** Live GitHub→Slack traffic remains; live n8n Slack node/credential/execution state remains an evidence gap.

---

## What was inspected

| Surface | Method | Result |
|---------|--------|--------|
| This Cursor Factory worker MCP catalog | `GetMcpTools` catalog | Only `Cursor Automation Tools` and `cursor-cloud`. **No n8n MCP. No Slack MCP.** |
| Repo `mcp_servers.json` | Read | Slack entry exists, **`enabled: false`**, marked RETIRED (#658). No n8n server entry. |
| Tracked n8n workflow JSON | Recursive node-type scan + focused test | **Zero** `n8n-nodes-base.slack` nodes; **zero** `hooks.slack.com` URLs. Telegram nodes exist on inactive templates only. |
| `lib/`, `api/`, `.github/workflows/` | Search | **No** Slack senders or Slack GitHub Actions. |
| GitHub repo webhooks | `GET /repos/.../hooks` | **403** `Resource not accessible by integration` — same gap as Anton’s 2026-08-14 verification comment. |
| Live n8n workflows / credentials / executions | n8n MCP | **Not available.** No secret values requested or used. No live n8n HTTP/API call attempted. |
| Slack-side operator evidence already on #658 | Read-only reconcile | Used as **external** evidence, not as n8n MCP proof. |

Hard boundaries honoured: no workflow edit, no credential change, no env/secret change, no server change, no deploy, no test send to Slack/Telegram/email.

---

## Slack-related workflow inventory

### A. Live n8n (required by the dispatch)

| Workflow | Active? | Trigger | Last execution | Slack path reachable? |
|----------|---------|---------|----------------|------------------------|
| Any live workflow with Slack node / Slack webhook / Slack credential / `#corpflow-dispatch` / `#corpflow-alerts` / `#corpflow-control` / id `6RkDerWf2Xj5EfCY` | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** |

**Why unknown:** this Factory Automation worker has no n8n MCP server, so it cannot list live workflows, read node graphs, or read execution history. That is an **access limitation**, not a finding that Slack is absent from live n8n.

Historical Slack-side mention of workflow id `6RkDerWf2Xj5EfCY` remains **unverified in n8n** in this pass.

### B. Tracked repo n8n JSON (inactive templates / skeletons)

Scanned paths:

- `docs/n8n/templates/github-heartbeat-checker.template.json`
- `docs/n8n/templates/business-operations-monitor-v1.template.json`
- `docs/n8n/templates/business-operations-dispatcher-v1.template.json`
- `docs/n8n/templates/automation-forward-issue-611-safe-test.template.json`
- `docs/execution/n8n-templates/LR_Pilot_1_Intake_Received_Notify_v1.json`
- `ops/n8n/production-pulse-v1.workflow.json`

| File | `active` | Slack node / Slack webhook URL | Other notify nodes | Verdict |
|------|----------|--------------------------------|--------------------|---------|
| Heartbeat checker template | `false` | None | Telegram (exception-only; #684) | **RETIRED / INACTIVE** in repo |
| Business-ops monitor template | `false` | None | Telegram urgent-only | **RETIRED / INACTIVE** in repo |
| Business-ops dispatcher template | `false` | None | `should_telegram: false` | **RETIRED / INACTIVE** in repo |
| Issue 611 automation-forward test | `false` | None | Telegram (gated test) | **RETIRED / INACTIVE** in repo |
| LR Pilot 1 intake notify | (template) | None | Telegram | **RETIRED / INACTIVE** in repo (Lead Rescue notify spine; not Slack) |
| Production Pulse skeleton | `false` | None | Meta says extend with Telegram, not Slack | **RETIRED / INACTIVE** in repo |

Repo templates are **not** proof of live n8n. They prove the **git-tracked** workflow copies do not post to Slack.

Exact function / data flow for **live** Slack-related n8n workflows: **UNKNOWN — evidence gap.**  
Anything that **reads from Slack** in live n8n: **UNKNOWN — evidence gap.**  
Repo templates: **no Slack read or write nodes.**

---

## Execution evidence

| Claim | Evidence | Confidence |
|-------|----------|------------|
| Any Slack-related **n8n** workflow executed successfully after **2026-07-03**? | **Cannot confirm or deny from n8n.** MCP execution history not available. | n8n: **UNKNOWN** |
| Slack-side search already on #658 | No `Automated with this` after 2026-07-03; July 2 packets labelled as n8n/Slack route tests, including host marker `automation-u69678` and historical workflow path `workflow/6RkDerWf2Xj5EfCY`. | Slack-side: **HISTORICAL / TEST-ONLY** (not n8n MCP) |
| Current Slack traffic | Anton 2026-08-14 verification: `#corpflow-dispatch` still receiving **GitHub for Slack** PR lifecycle events (example: PR #946). `#corpflow-alerts` dormant since 2026-07-02 tests. | Slack-side: **ACTIVE GitHub app mirror**, not proven n8n |

This pass **does not** treat Slack-side absence of n8n footer markers as proof that live n8n Slack nodes are gone.

---

## Credential-reference evidence

| Item | Evidence | Classification |
|------|----------|----------------|
| Live n8n Slack credentials (name/id/type only) | **Not inspectable** — no n8n MCP | **UNKNOWN — evidence gap** |
| Repo `.env.template` `SLACK_BOT_TOKEN` / `SLACK_TEAM_ID` | Placeholders only; comments mark RETIRED; no runtime reads found in `lib/` | **RETIRED / INACTIVE** in repo |
| `mcp_servers.json` Slack env names | Template compatibility only; `enabled: false` | **RETIRED / INACTIVE** |
| Secret **values** | None requested, printed, or committed | n/a |

---

## Dependency verdict

| Item | Verdict |
|------|---------|
| Tracked repo n8n JSON Slack send/read | **RETIRED / INACTIVE** |
| Repo app/runtime Slack sender | **RETIRED / INACTIVE** |
| Live n8n Slack workflows / credentials / executions | **UNKNOWN — evidence gap** |
| GitHub for Slack → `#corpflow-dispatch` | **ACTIVE — DUPLICATE / NON-ESSENTIAL** (operator Slack audit 2026-08-14; duplicates GitHub) |
| `#corpflow-alerts` / `#corpflow-control` | **DORMANT / TEST-ONLY** by Slack-side observation; live n8n still unknown |
| Unique revenue / client / tenant / approval / delivery dependency on Slack | **NO** in repo. **NO** unique operator-control function observed in Slack-side audit. Live n8n uniqueness still **UNKNOWN** until MCP/UI inventory. |

**Unique dependencies found: NO** for repo + observed Slack channels.  
**Live n8n uniqueness: UNKNOWN** (access limitation).

---

## What Slack actually does today

Reconciled picture (do not collapse the evidence gap):

1. **GitHub remains** the durable source of truth.
2. **Telegram remains** the approved exception-only ops route in repo policy (`lib/server/ops-notification-policy.js`).
3. **Live Slack `#corpflow-dispatch`** is still an **active duplicate GitHub mirror** via the GitHub Slack app (Anton verification 2026-08-14). This path does **not** require n8n.
4. **n8n → Slack** is **not proven active** after 2026-07-03 on Slack-side search, and is **not proven absent** in live n8n because this worker could not interrogate n8n.
5. Repo-side Slack posting is already retired (merged PRs #659 and #669).

---

## Removal impact map — no removal executed

| If disabled/removed | What would break |
|---------------------|------------------|
| GitHub for Slack app / `#corpflow-dispatch` subscription (Packet C) | Secondary visual GitHub feed in Slack. **No** unique approval, revenue, client, tenant, or durable audit function observed. GitHub itself unchanged. |
| Live n8n Slack nodes/credentials (Packets A–B) | **Unknown until live inventory.** Slack-side evidence suggests historical test-only traffic; do not treat that as proof nothing would break. |
| Repo templates / retired MCP Slack entry | Nothing operational; already inactive. |
| Telegram exception path | **Out of scope — do not touch.** |

**Smallest reversible cutover sequence (not executed):**

1. Close the live n8n evidence gap (attach n8n MCP to this Factory worker **or** Anton read-only n8n UI inventory: workflows, Slack nodes, credential **names** only, executions after 2026-07-03).
2. Only then Packet A (deactivate n8n→Slack) if live Slack nodes exist.
3. Packet C (unsubscribe/disable GitHub for Slack on `#corpflow-dispatch`) — this is the **proven active** noise source.
4. Packet B (delete n8n Slack credentials) after A.
5. Packet D (revoke Slack tokens / stop email noise).
6. Packet E (archive workspace) only after 48h quiet + Telegram exception path still working.

**Rollback:** Packet C rollback = re-subscribe GitHub for Slack to `#corpflow-dispatch`. Packet A rollback = re-activate the same n8n workflow. Do not delete the Slack workspace in this sequence.

---

## Protected action required next

**YES.**

Exact remaining actions (none performed by this run):

1. **Access:** attach a read-only n8n MCP (or equivalent n8n API) to **Cursor Factory Automation** so a later worker can complete the live inventory — **or** Anton performs the same read-only inventory in the n8n UI. This is an access limitation, not authorization to change n8n.
2. **Live cutover (already in issue #658 sequence, still Anton-only):** Packet C — disable GitHub for Slack / `#corpflow-dispatch` subscription. Do not execute from this agent.
3. **Live cutover, only after live n8n inventory:** Packets A–B. Do not execute from this agent.
4. **Secrets:** Packet D token revocation. Do not execute from this agent.

This run did **not** enable MCP, edit env, call n8n APIs, or disable Slack.

---

## Required evidence packet (dispatch contract)

**Status:** Investigation recorded. Live n8n MCP evidence missing because this worker has no n8n MCP.  
**What was inspected:** Factory MCP catalog, repo n8n JSON, `mcp_servers.json`, `lib/` / workflows, GitHub hooks (403), prior #658 Slack-side comments.  
**Slack-related workflow inventory:** Repo templates Slack-free and inactive. Live n8n **UNKNOWN**.  
**Execution evidence:** n8n after 2026-07-03 **UNKNOWN**. Slack-side historical tests 2026-07-02; current Slack traffic is GitHub app, not proven n8n.  
**Credential-reference evidence:** Live n8n **UNKNOWN**. Repo Slack env names retired placeholders only.  
**Unique dependencies found: NO** (repo + observed Slack). Live n8n uniqueness **UNKNOWN**.  
**What Slack actually does today:** Duplicate GitHub mirror in `#corpflow-dispatch`; n8n role unproven in this worker.  
**Safe removal sequence:** Inventory live n8n → A if needed → C (proven GitHub app) → B → D → E last.  
**Rollback:** Re-subscribe GitHub for Slack; re-activate n8n Slack workflows if A was used.  
**Protected action required next: YES** — n8n MCP/UI read-only inventory, then Anton Packets C (active GitHub app) and A–B (only after n8n evidence).
