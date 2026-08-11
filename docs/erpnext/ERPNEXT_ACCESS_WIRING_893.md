# ERPNext access wiring evidence — issue #893

**Status:** Wiring packet evidence (transport/session).  
**Cursor run ID:** `run-e17a62f5-94fb-4aa5-ae4b-0e12ca1c76b8`  
**Cursor agent ID:** `bc-7ebe2c06-661e-4de2-8e69-d4a6a21ba28d`  
**Branch:** `cursor/dispatcher-issue-893-eb96`  
**Date (UTC):** 2026-08-11  
**Anchor:** `<!-- ERPNEXT_ACCESS_WIRING_893 -->`

<!-- ERPNEXT_ACCESS_WIRING_893 -->

## Evidence contract (this run)

```text
secure path type: not configured
Cursor run ID: run-e17a62f5-94fb-4aa5-ae4b-0e12ca1c76b8
ERPNext reachability: FAIL
safe site/version metadata: NOT REACHED this run (last known from Phase B/C docs: ERPNext v15 on site corpflowai-sandbox.localhost)
object capability summary: NONE verified this run (application unreachable without SSH secret)
exact blocker: Cursor Cloud Secrets UI still missing CORPFLOW_EXEC01_SSH_PRIVATE_KEY for API-dispatched agents; automation cannot write secret values into the dashboard. TCP to 5.78.213.185:22 works; SSH BatchMode returns Permission denied (publickey). Local 127.0.0.1:8080 refused (no tunnel). Public ERPNext exposure correctly absent.
next activated issue(s): none — hold #880 / #881 until a fresh PASS probe after UI secret save
```

## What this run proved (safe)

| Check | Result |
|---|---|
| Linked Cursor environment | **none** (`environment-info` → `environment: null`) |
| Injected Cursor secret names | `MASTER_ADMIN_KEY` only (`CLOUD_AGENT_INJECTED_SECRET_NAMES`) |
| `CORPFLOW_EXEC01_SSH_PRIVATE_KEY` present | **no** |
| `~/.ssh` / ssh-agent keys | **none** |
| `127.0.0.1:8080` / `:8081` | connection refused |
| SSH to `anton@5.78.213.185` BatchMode | `Permission denied (publickey)` |
| Public ERPNext port invent | **not done** (forbidden) |
| n8n ERPNext credential reuse | **not found / not used** |

## What landed in-repo (no secret values)

| Path | Role |
|---|---|
| `docs/runbooks/ERPNEXT_CURSOR_CLOUD_SECURE_ACCESS_WIRING_V1.md` | Canonical operator UI wiring runbook |
| `scripts/erpnext/cursor-cloud-sandbox-tunnel.sh` | SSH tunnel / remote command helper (reads secret from env only) |
| `scripts/erpnext/cursor-cloud-sandbox-probe.sh` | Safe PASS/FAIL probe for #879/#886 re-runs |
| `docs/decisions/JOURNAL.md` (`JE-2026-08-11-3`) | Decision row |

## Operator UI action still required (smallest)

1. Add team/repo Cursor Cloud secret **`CORPFLOW_EXEC01_SSH_PRIVATE_KEY`** via [Cloud Agents Secrets](https://cursor.com/dashboard/cloud-agents) (PEM or base64 PEM).
2. Ensure the matching **public** key is in `authorized_keys` on `corpflow-exec-01`.
3. Do **not** paste the private key into GitHub, chat, or PR comments.
4. Start a fresh Cursor Cloud run for #879 or #886 and run:

```bash
bash scripts/erpnext/cursor-cloud-sandbox-probe.sh
```

## Non-actions honoured

- No merge, no deploy
- No public ERPNext exposure
- No CorpFlowAI DB/schema changes
- No Vercel/GitHub production secret changes
- No client sends / payments
- No #880 / #881 activation (FAIL probe)
