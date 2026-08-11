# ERPNext Infisical API access probe — issue #893 (fresh run)

**Status:** Read-only connectivity / permissions probe evidence.  
**Cursor agent ID:** `bc-bf91d738-e441-4f12-807b-89a6a237521c`  
**Cursor run URL:** https://cursor.com/agents/bc-bf91d738-e441-4f12-807b-89a6a237521c  
**Date (UTC):** 2026-08-11  
**Anchor:** `<!-- ERPNEXT_API_ACCESS_PROBE_893 -->`

<!-- ERPNEXT_API_ACCESS_PROBE_893 -->

## Required return

```text
ERPNext access: FAIL
Cursor run ID: bc-bf91d738-e441-4f12-807b-89a6a237521c
access path: Infisical-backed API credentials (ERPNEXT_BASE_URL / ERPNEXT_API_KEY / ERPNEXT_API_SECRET) — names present in Infisical per Anton #893 note; NOT injected into this Cursor Cloud run
authenticated user identity: not_obtained
safe site/version metadata: not_reached
reachable DocTypes: none
denied DocTypes: none (probe did not reach ERPNext; no HTTP DocType results)
exact HTTP/status error: secrets absent in agent env (CLOUD_AGENT_INJECTED_SECRET_NAMES=MASTER_ADMIN_KEY only); no Frappe HTTP call executed
#880 / #881 can proceed: NO
exact blocker: Cursor Cloud Secrets / linked environment does not inject ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET into this run (Infisical alone does not auto-inject into Cursor Cloud)
next execution: Anton maps the three Infisical secret names into Cursor Dashboard → Cloud Agents → Secrets (copy Infisical→Cursor UI only; never paste into chat/GitHub); start a fresh Cursor Cloud run; bash scripts/erpnext/cursor-cloud-api-probe.sh
Anton required now: YES (one-time Secrets UI wiring)
```

## Canonical Context Preflight

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-09-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #893
```

## What was checked (safe)

| Check | Result |
| --- | --- |
| Linked Cursor environment | **none** (`environment-info` → `environment: null`) |
| Injected Cursor secret names | `MASTER_ADMIN_KEY` only |
| `ERPNEXT_BASE_URL` / `ERPNEXT_API_KEY` / `ERPNEXT_API_SECRET` | **ABSENT** in process env |
| Infisical CLI / machine identity in agent | **not available** |
| n8n credentials named erpnext / frappe / CorpFlow | **none** |
| Local `127.0.0.1:8080` / `:8081` | connection refused (no tunnel) |
| Public host `:8080` / `:8081` (`5.78.213.185`) | connection reset (sandbox remains loopback-only) |
| Guessed public hostnames (`erp` / `erpnext` / `sandbox`.corpflowai.com) | HTTP 404 (not the sandbox API) |
| Secret values printed / logged / committed | **NO** |

## Probe command

```bash
bash scripts/erpnext/cursor-cloud-api-probe.sh
```

This script is GET-only. When the three secrets are injected, it authenticates via Frappe token header, reads safe identity + version metadata, and probes read access for Customer, Lead, Opportunity, Contact, Address, Item, Item Price, Price List, Quotation, Sales Invoice, Company, Currency — without mutating any record.

## Smallest one-time operator action (no paste into chat)

1. Open Infisical and confirm the three secret **names** (values stay in Infisical).
2. Open [Cursor Dashboard → Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents).
3. Add team/repo secrets with **exact names**:
   - `ERPNEXT_BASE_URL`
   - `ERPNEXT_API_KEY`
   - `ERPNEXT_API_SECRET`
4. Copy values Infisical → Cursor Secrets UI only. Do **not** paste into GitHub, chat, PR comments, or screenshots.
5. Start a **fresh** Cursor Cloud run for #893 and re-run `bash scripts/erpnext/cursor-cloud-api-probe.sh`.

Automation cannot write secret values into the Cursor Secrets UI from this agent.

## Non-actions honoured

- No create / update / submit / cancel / delete in ERPNext
- No secret values exposed
- No public ERPNext exposure invented
- No CorpFlowAI DB/schema / Vercel / payment / client-send changes
- #880 / #881 **not** activated (FAIL)

## Relation to prior #893 SSH wiring (PR #894)

PR #894 documented an SSH-tunnel path (`CORPFLOW_EXEC01_SSH_PRIVATE_KEY`). Anton’s later #893 comments authorize the **Infisical API identity** path for this fresh probe. This evidence packet covers the API path only. Either approved private path is fine once injected; this run had neither ERPNext API secrets nor an SSH key.
