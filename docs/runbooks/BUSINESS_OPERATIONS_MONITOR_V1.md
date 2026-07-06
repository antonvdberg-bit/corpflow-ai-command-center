# Business Operations Monitor v1 — runbook

**Status:** Stage 1 — read-only endpoint + secret-free n8n template (inactive). Activation is Anton-gated.
**Owner:** Anton (operator) for n8n import + secrets; Cursor for repo-side implementation.
**Created:** 2026-07-04.
**Anchor sentinel:** `<!-- BUSINESS_OPERATIONS_MONITOR_V1 -->`

<!-- BUSINESS_OPERATIONS_MONITOR_V1 -->

## 0. What this is (and is not)

A **hosted, read-only** monitor for the July Lead Rescue paid-pilot path. It watches Postgres-backed operator state (Lead Rescue intakes, commercial fields, setup checklist, CMP delivery tickets) and returns structured findings JSON for **n8n** (or any scheduler) to poll and alert Anton **only when action is needed**.

It is **not**:

- a CRM,
- an autonomous executor,
- a customer-facing surface,
- an outbound send channel,
- a payment processor,
- a 24/7 “AI manager.”

**24/7 responsibility** stays with **hosted automation**: CorpFlowAI app + Postgres + ERPNext (finance spine) + n8n + Telegram/Slack alerts. Anton’s laptop and Cursor are **not** the manager.

| Stage | What | Authorization |
|---|---|---|
| **1** | Read-only API + evaluation library + inactive n8n template + runbook | This PR |
| **2** | Import n8n template, attach `CORPFLOW_CRON_SECRET` Bearer, test Telegram alert | Anton-gated |
| **3** | Optional ERPNext cross-check node in n8n (sandbox only, env in n8n store) | Anton-gated after rehearsal go/no-go |

## 1. Business states monitored (v1)

| # | State | Source | Default thresholds |
|---|---|---|---|
| 1 | New Lead Rescue intake, no operator review | CorpFlowAI `leads` + activity log | warning ≥ 2h, urgent ≥ 4h |
| 2 | Quote/payment stage without invoice reference | Commercial card `invoice_reference` | warning ≥ 12h, urgent ≥ 24h |
| 3 | Invoice reference recorded, payment not confirmed | `payment_status` + status | warning ≥ 72h, urgent ≥ 120h |
| 4 | Paid setup window (48h) approaching/breached | `PAID_SETUP` / `SETUP_IN_PROGRESS` + checklist | warning ≥ 24h, urgent ≥ 48h |
| 5 | Client review waiting on Change Console | `cmp_tickets.console_json.client_view.workflow_state` | warning ≥ 48h, urgent ≥ 96h |
| 6 | Delivery stale (CMP Approved/Build or lead without owner) | `cmp_tickets.updated_at`, lead `owner` | warning ≥ 48h, urgent ≥ 72h |
| 7 | Monitor source unreachable | DB ping + optional source list | urgent immediately |

SLA references: `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` (2 business-hour intake reply), `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` (48h setup window).

## 2. HTTP endpoint (read-only)

```
GET /api/factory/business-operations-monitor
Authorization: Bearer <CORPFLOW_CRON_SECRET>
```

Also accepts factory master session / `MASTER_ADMIN_KEY` (same gate as `/api/factory/lead-rescue/*`).

**Response schema:** `corpflow.business_operations_monitor.v1`

Each finding includes:

- `severity`: `info` | `warning` | `urgent`
- `source`: `corpflowai` | `erpnext` | `n8n` | `github`
- `objectType`: `lead` | `invoice` | `payment` | `setup` | `review` | `delivery` | `monitor`
- `objectRef`, `status`, `ageHours`, `actionRequired`, `antonNeeded`, `recommendedNextAction`, `safeToIgnore`, `link`

**No PII** in findings — references are `lead:<id>` / `ticket:<id>` only.

**Status codes:**

- `200` — evaluated; no urgent findings (`ok: true`)
- `503` — evaluated; urgent findings present (`ok: false`) or DB unreachable
- `401` — missing/invalid auth

Implementation: `lib/server/business-operations-monitor.js`, route wired in `api/factory_router.js`.

## 3. CLI (local / hosted scheduler)

```powershell
# Synthetic sample — no DB, no secrets
node scripts/business-operations-monitor.mjs --fixtures

# Poll production endpoint (uses CORPFLOW_CRON_SECRET from env)
node scripts/business-operations-monitor.mjs --url https://core.corpflowai.com/api/factory/business-operations-monitor

# Direct DB evaluation (POSTGRES_URL required — operator machine or exec01 clone)
node scripts/business-operations-monitor.mjs
```

Exit code: `0` when `ok: true`, `1` when urgent findings or failure.

## 4. n8n workflow (Stage 2 — inactive template)

Template: `docs/n8n/templates/business-operations-monitor-v1.template.json`

**Before activating in n8n only (never in repo):**

1. Set `CORPFLOW_MONITOR_BASE_URL` → e.g. `https://core.corpflowai.com`
2. Set `CORPFLOW_CRON_SECRET` in n8n env (same value as Vercel Production)
3. Set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` (reuse existing ops alert path)
4. Optional: `ERPNEXT_MONITOR_URL` + `ERPNEXT_API_KEY` for sandbox read-only ping (disabled by default)

Schedule default: **every 2 hours**. Silent on success; Telegram only when `summary.urgent > 0` or `summary.actionRequired` crosses operator threshold.

See also: `docs/n8n/automation-forward-recipe.md`, `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md`.

## 5. ERPNext boundary

CorpFlowAI remains **lead/intake/delivery/proof** control plane. ERPNext remains **finance/commercial** spine.

- Repo code **does not** call live ERPNext.
- `invoice_reference` on the Lead Rescue Commercial card is the CorpFlow-side ledger hook.
- n8n template includes a **disabled** optional ERPNext HTTP node with placeholder env refs only.
- Cross-check against ERPNext Sales Invoice status is **Stage 3** after `ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md` go/no-go.

## 6. Security boundaries

- No secrets in repo or committed templates (env **references** only).
- No outbound customer WhatsApp/SMS/email from this monitor.
- No DB writes, schema changes, or payment configuration changes.
- No production deploy from this packet — merge + Vercel deploy is a separate operator step.
- Findings must not log private client data (names, emails, phone numbers).

## 7. Verification (Stage 1)

```powershell
npm test -- node-tests/business-operations-monitor.test.mjs
node scripts/business-operations-monitor.mjs --fixtures
```

Expected: JSON with `schema: corpflow.business_operations_monitor.v1`, multiple synthetic findings, `ok: false` (urgent setup window fixture).

Sample artifact: `node-tests/fixtures/business-operations-monitor-sample.json`.

## 8. Register in monitoring map (follow-up)

When Stage 2 activates, add Monitor #14 row to `docs/operations/MONITORING_ARCHITECTURE.md` §2 per §9 recipe (same PR as activation or immediate docs follow-up).

## 9. Dispatcher v1 (successor for n8n paging)

Monitor v1 pages Anton for every urgent finding. **Dispatcher v1** classifies findings to executors and pages Anton only when `owner=anton` or `gated=true`.

See **`docs/runbooks/BUSINESS_OPERATIONS_DISPATCHER_V1.md`** and `docs/n8n/templates/business-operations-dispatcher-v1.template.json`.

## 10. Related docs

- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`
- `docs/lead-rescue/FIRST_PAID_PILOT_OPERATOR_PACK.md`
- `docs/operations/ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md`
- `docs/operations/MONITORING_ARCHITECTURE.md`
- `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md` (sibling pattern)
