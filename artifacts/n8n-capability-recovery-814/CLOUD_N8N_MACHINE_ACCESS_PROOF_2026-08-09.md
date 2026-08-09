# #814 Cloud n8n machine-access capability proof

**Date:** 2026-08-09  
**Operating-model version checked:** `2026-08-09-v1` (current; packet aligned)  
**Cloud run / executor ID:** `bc-d519a7b1-bbe4-4c14-b2b6-8e952de2ca0e`  
**Run URL:** https://cursor.com/agents/bc-d519a7b1-bbe4-4c14-b2b6-8e952de2ca0e  
**Active #814 machine-access proof executor:** YES (this cloud run)  
**Hostname policy:** live origin is referenced only as `<N8N_ORIGIN>` in this artifact (same public host already used by Kuma `/healthz` and Vercel automation-forward). No credentials, tokens, or secret values are recorded here.

---

## Non-duplication check

| Check | Result |
|-------|--------|
| Prior OpenHands Implementation Packet browser session | Treated as **stale/expired** — authenticated UI session is not durable machine access |
| Competing active #814 machine-access proof executor | **None** found after STALE WORK CHECK (2026-08-08) |
| One-source-packet → one-executor | Obeyed — this run claimed machine-access **proof** only; no parallel live estate edits |
| GitHub issue comment write from this environment | **Blocked** (`gh` integration cannot `addComment` on #814) — durable evidence is this artifact + PR |

---

## Environment facts (actual probes)

### Cursor Cloud posture

- Linked Cursor Cloud environment: **none** (`environment-info` → `environment: null`)
- MCP servers available to this agent: **`cursor-cloud` only** (no n8n MCP)
- `N8N_API_KEY` / MCP access token / n8n session cookies in this pod: **absent**
- SSH to `corpflow-exec-01` for Kuma DB read-back: **denied** (no key)
- Vercel/Infisical secret read: **unavailable**
- Laptop independence for network reachability to live n8n: **PASS** (public HTTPS from this cloud pod)

### Live n8n instance

| Probe | Result |
|-------|--------|
| `GET <N8N_ORIGIN>/healthz` | **200** `{"status":"ok"}` |
| `GET <N8N_ORIGIN>/healthz/readiness` | **200** `{"status":"ok"}` |
| Installed version | **n8n@2.33.7** (from public UI sentry release meta) |
| Native instance-level MCP endpoint | **`POST <N8N_ORIGIN>/mcp-server/http`** exists |
| Unauthenticated MCP call | **401** `Unauthorized: Authorization header not sent` |
| `WWW-Authenticate` | `Bearer realm="n8n MCP Server"` + OAuth protected-resource metadata |
| OAuth protected resource | **200** at `/.well-known/oauth-protected-resource/mcp-server/http` |
| OAuth authorization server | **200** at `/.well-known/oauth-authorization-server` |
| Public API | `GET /api/v1/workflows` → **401** `'X-N8N-API-KEY' header required` |
| Session REST | `GET /rest/workflows` → **401** Unauthorized |

### MCP OAuth scopes advertised by the live instance

`workflow:read`, `workflow:write`, `workflow:execute`, `execution:read`, `credential:read`, `dataTable:read`, `dataTable:write`, `project:read`, `tag:read`

### Dynamic client registration (probe only)

- `POST <N8N_ORIGIN>/mcp-oauth/register` returned **201** with a public `client_id` (no secret; `token_endpoint_auth_method: none`).
- Authorization-code grant still requires an **owner/admin browser consent** step — cannot be completed autonomously from this cloud pod.
- No access token was obtained. No workflows were listed, created, modified, activated, or deleted.
- Optional cleanup later: revoke unused OAuth clients under **Settings → Instance-level MCP → Connected clients** (not required for the setup packet below).

### Native MCP toolset (from first-party n8n docs; not yet live-connected here)

Once authenticated, instance-level MCP exposes (among others):

- **LIST/READ:** `search_workflows`, `get_workflow_details`
- **CREATE/UPDATE/VALIDATE:** `validate_workflow`, `create_workflow_from_code`, `update_workflow`
- **TEST/EXECUTE/DEBUG:** `test_workflow`, `execute_workflow`, `get_execution`, `search_executions`, `prepare_test_pin_data`
- **ACTIVATE/DEACTIVATE:** `publish_workflow`, `unpublish_workflow`
- **ARCHIVE:** `archive_workflow`
- Plus builder helpers (`search_nodes`, `get_node_types`, …) and data-table tools

Public API can fill gaps with `X-N8N-API-KEY` for deterministic list/create/update/activate/deactivate/execute operations when MCP is insufficient.

---

## Synthetic proof

**Status:** **NOT EXECUTED** — blocked on missing durable auth in this Cursor Cloud run.

Intended synthetic workflow name (when unblocked):

`CorpFlowAI #814 Cloud n8n Capability Probe`

Constraints (unchanged): no client data; no Gmail/WhatsApp/SMS/Slack/payment integrations; no production credentials; send nothing externally; do not touch existing business workflows.

---

## Capability matrix

| Item | Result |
|------|--------|
| Cursor Cloud independent of laptop | **PASS** (host reachable; no laptop session required for network) |
| n8n version | **2.33.7** |
| native MCP available | **YES** |
| native MCP connected | **NO** |
| public API available | **YES** (endpoint live; key not present in this env) |
| LIST | **BLOCKED** (no MCP token / API key) |
| READ | **BLOCKED** |
| CREATE | **BLOCKED** |
| UPDATE | **BLOCKED** |
| VALIDATE | **BLOCKED** |
| TEST/EXECUTE | **BLOCKED** |
| EXECUTION DEBUG | **BLOCKED** |
| ACTIVATE | **BLOCKED** |
| DEACTIVATE | **BLOCKED** |
| ARCHIVE/DELETE | **BLOCKED** |

---

## Final verdict

**CLOUD ACCESS REQUIRES ONE-TIME SETUP**

Rationale: the live CorpFlowAI n8n instance already exposes native instance-level MCP (v2.33.7) and the public API. This Cursor Cloud agent can reach the host without Anton's laptop, but cannot authenticate. No custom username/password bridge is justified — MCP + API are sufficient once a one-time protected auth binding exists.

---

## ANTON ACTION — single one-time setup packet

Do **not** paste any secret into chat, GitHub, or the repo.

1. **Exact screen / setting**
   - In the live CorpFlowAI n8n UI (owner/admin): **Settings → Instance-level MCP**
   - Confirm **Enable MCP access** is ON (endpoint evidence already shows the MCP server is live).
   - Open **Connection details**.

2. **Exact integration / credential to create**
   - Preferred: **OAuth2** connection from Cursor → n8n MCP (`<N8N_ORIGIN>/mcp-server/http`).
   - Acceptable fallback: **MCP Access Token** (personal token from the Access Token tab) **or** a least-privilege **n8n Public API key** for API gap-fill.
   - Do **not** build a username/password automation bridge.

3. **Where it must be stored**
   - Cursor Cloud / team MCP configuration for this repo’s cloud agents (remote MCP server entry), and/or the linked Cursor environment secret store.
   - Optional API key: Cursor environment secret / Vercel-operator vault equivalent used by cloud agents — **not** git, not issue comments, not chat.

4. **Permissions / capabilities needed**
   - Minimum for the synthetic proof: `workflow:read`, `workflow:write`, `workflow:execute`, `execution:read`
   - Useful extras already advertised by the instance: `project:read`, `tag:read`
   - Avoid granting broader credential-write rights; `credential:read` is advertised but not required for the synthetic no-integration probe.

5. **Auth type involved**
   - **OAuth2** (preferred for Cursor) **or** **Bearer MCP Access Token**; optionally **API key** (`X-N8N-API-KEY`) for public API gap-fill.
   - Browser login is needed only for this one-time enable/consent/copy step.

6. **Why this cannot be performed autonomously**
   - This cloud run has no linked environment MCP config, no n8n token/API key, and no browser session.
   - OAuth authorization-code consent and Access Token issuance both require an n8n owner/admin interactive step.
   - Creating secrets in Cursor Cloud MCP config is outside this agent’s write permissions.

7. **Test that will run immediately after completion**
   - Re-run / resume cloud executor `bc-d519a7b1-bbe4-4c14-b2b6-8e952de2ca0e` (or a fresh #814 kick-start).
   - Prove LIST → READ → CREATE → UPDATE → VALIDATE → TEST/EXECUTE → EXECUTION DEBUG → (safe) ACTIVATE → immediate DEACTIVATE → ARCHIVE/DELETE on synthetic workflow **`CorpFlowAI #814 Cloud n8n Capability Probe` only**.
   - Re-post the capability matrix with PASS/FAIL per operation and a final verdict of **FULL** or **PARTIAL CLOUD N8N DEVELOPMENT CONTROL**.

**ANTON ACTION:** the single setup packet above only. No other operator courier steps.

---

## Explicit non-actions taken

- No merge / deploy
- No production env/secret mutation
- No DB/schema change
- No external sends / payments / launches
- No edits to existing CorpFlowAI business workflows
- No custom username/password bridge
- No protected operating-doctrine changes
- No secret values printed, logged, or committed
