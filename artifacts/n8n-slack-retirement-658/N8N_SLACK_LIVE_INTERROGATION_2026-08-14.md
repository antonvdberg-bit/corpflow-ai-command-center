## N8N SLACK LIVE INTERROGATION — #658

### Status
- Live n8n interrogation completed via native `n8n-mcp` (read-only).
- Scope: Slack dependency proof for CorpFlowAI n8n only. No workflow/credential/env mutations. No sends. No PR.

### Cursor cloud run ID
`bc-7f5a4fe5-999b-457f-8589-f052cd55399f`
URL: https://cursor.com/agents/bc-7f5a4fe5-999b-457f-8589-f052cd55399f

### n8n MCP status: PASS
Connected and usable. Read tools exercised: `search_workflows`, `get_workflow_details`, `search_executions`, `get_workflow_history`, `list_credentials`, `search_projects`.

Canonical Context Preflight: PASS  
Operating model version: `2026-08-13-v1`  
Environment: n/a (operational tooling / live n8n read)  
GitHub state refreshed: YES  
Source item: #658

### What was inspected
- All accessible workflows on the connected n8n instance (10 workflows; personal project only; team projects disabled).
- Explicit name/ID queries: `slack`, `corpflow`, `dispatch`, `alert`, `GitHub`, `notify`, workflow `6RkDerWf2Xj5EfCY`.
- Full node graphs for every accessible workflow for `n8n-nodes-base.slack` / Slack Trigger / channel refs.
- Slack credential list (metadata only).
- Execution search for `6RkDerWf2Xj5EfCY` (all-time + `startedAfter=2026-07-03T00:00:00.000Z`).
- Parallel notification routes (Telegram / GitHub comment) on active operational workflows.

### Slack-related workflow inventory

| workflow name / ID | active/published state | trigger/source | Slack node/action | destination | parallel notification/action | last relevant execution | classification |
|---|---|---|---|---|---|---|---|
| **CorpFlowAI — GitHub to Slack Dispatcher v1** / `6RkDerWf2Xj5EfCY` | **inactive** (`active=false`, `activeVersionId=null`, `triggerCount=0`, not archived) | Schedule Trigger every **30 minutes** → HTTP GET GitHub `#249` comments → data-table memory row → Code classifier | 3× `n8n-nodes-base.slack` **Send a message** (OAuth2): `Send a message`, `Send a message1`, `Send a message2` | Channels by cached name: `#corpflow-alerts`, `#corpflow-control`, `#corpflow-dispatch` (channel IDs present as list selections; no Slack webhook URL secrets exposed in node params) | Classifier reads GitHub `#249` only. Active operational alerting elsewhere uses **Telegram** (Heartbeat / Production Pulse / automation-forward) and **GitHub issue comments** (Business Operations Dispatcher). This Slack path is a **duplicate mirror**, not a unique control plane. | MCP `search_executions` returned **0** rows all-time and **0** after 2026-07-03. Workflow history has one autosaved version dated **2026-07-02T07:19:38Z**. | **RETIRED / INACTIVE** |

**Other workflows (10 total):** none contain Slack nodes, Slack triggers, or channel refs to `corpflow-dispatch` / `corpflow-alerts` / `corpflow-control`.
Notable active non-Slack routes (context only):
- `CorpFlowAI — Business Operations Dispatcher v1` (`V3E4m5KiC1SseaCk`, **active**) → GitHub `#249` comment; Telegram notify node present but **disabled**.
- `CorpFlowAI GitHub Heartbeat Checker v1` (`94gs6QOVed6dWdPZ`, **active**) → Telegram `Notify Anton`.
- `CorpFlowAI Production Pulse v1` (`dxCgQMBoti4n7cgE`, **active**) → Telegram on pulse failure.
- `CorpFlow automation forward hardened v2` (`cPgzIQIm4ztU8sQQ`, **active**) → Telegram Lead Rescue / ops-alert notify.

### Execution evidence after 2026-07-03
- `search_executions` for `6RkDerWf2Xj5EfCY` with `startedAfter=2026-07-03T00:00:00.000Z`: **count=0**.
- Unfiltered executions for same workflow: **count=0**.
- Live workflow state: inactive, no published active version, `triggerCount=0`.
- Interpretation: **no MCP-visible successful (or any) n8n executions of the Slack dispatcher after 2026-07-03**. Historical ~2026-07-02 test traffic is consistent with version timestamp + prior Slack-side notes, but those execution rows are **not present** in the MCP execution store (retention/pruning or never persisted). This does **not** contradict inactive state.

### Credential-reference evidence (safe metadata only)
- Slack credentials found: **1**
  - display name: `Slack account`
  - type: `slackOAuth2Api`
  - id: `kiEx0aGxtNfc9yU4`
  - managed: false; global: false; home: personal project
- `slackApi` (token) credentials: **none**
- Workflows with Slack nodes that can reference this credential: **only** `6RkDerWf2Xj5EfCY`
- No credential secret values, tokens, headers, or webhook secret URLs are included here.

### Slack read-path present: NO
No Slack Trigger / Slack event ingest / Slack message-read nodes found on any accessible workflow. Slack usage in n8n is **outbound send only** (inactive).

### Unique dependencies found: NO
### Revenue/client/tenant/production dependency found: NO
No revenue, client, tenant, production approval, delivery, or operator-control function uniquely depends on Slack inside n8n. Durable truth remains GitHub; exception paging is Telegram on active workflows.

### What Slack actually does today (in n8n)
**Nothing operational.** The only Slack-bearing workflow is inactive and unpublished. It was a scheduled GitHub `#249` → classify → post mirror into `#corpflow-dispatch` / `#corpflow-alerts` / `#corpflow-control`. It is not running. Current Slack channel noise (if any) is outside this n8n path (e.g. GitHub-for-Slack app mirroring), not live n8n Slack nodes.

### What would break if Slack were removed (n8n components)
- **Nothing unique in CorpFlowAI operations.** Removing/archiving `6RkDerWf2Xj5EfCY` and later revoking the Slack OAuth credential would only remove a dormant duplicate mirror.
- Active Telegram + GitHub comment routes remain.
- GitHub issue/PR lifecycle and approval gates are unaffected.

### Safe removal sequence (smallest reversible; requires separate protected approval — not executed)
1. Keep workflow inactive (already true) — reversible no-op.
2. Archive `6RkDerWf2Xj5EfCY` via approved protected action.
3. Confirm no remaining Slack-node workflows (re-run this inventory).
4. Delete/revoke n8n credential `Slack account` (`kiEx0aGxtNfc9yU4`) via Anton/secrets path.
5. Optionally clean data-table memory key used only by this classifier (`corpflow_n8n_memory` / `corpflow_issue_249_last_seen_comment_id`) if unused elsewhere.
6. Separately retire GitHub↔Slack app mirroring (outside n8n) if still posting to those channels.
7. Do **not** disable Telegram / GitHub exception routes as part of Slack removal.

### Rollback
- Restore archived workflow draft / republish only if re-enabling Slack mirror is intentionally approved.
- Re-attach Slack OAuth credential if revoked.
- Because the workflow is already inactive with no post-2026-07-03 MCP-visible runs, rollback risk to production operations is **low**.

### Protected action required next: YES
### Exact next protected action, if any
Anton/operator-approved n8n change to **archive** inactive workflow `6RkDerWf2Xj5EfCY` and later **revoke** credential `Slack account` (`kiEx0aGxtNfc9yU4`), plus a separate decision on GitHub-for-Slack app mirroring outside n8n. This read-only run did not perform those steps.

---

**N8N SLACK DEPENDENCY PROOF COMPLETE — NO UNIQUE N8N DEPENDENCY FOUND**
