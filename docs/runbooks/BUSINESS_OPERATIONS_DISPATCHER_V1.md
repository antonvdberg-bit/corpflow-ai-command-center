# Business Operations Dispatcher v1 — runbook

**Status:** Stage 1 — classifier + read-only endpoint + secret-free n8n template (inactive).
**Owner:** Anton (operator) for n8n activation; Cursor for repo-side implementation.
**Created:** 2026-07-06.
**Builds on:** `docs/runbooks/BUSINESS_OPERATIONS_MONITOR_V1.md` (monitor endpoint unchanged).
**Anchor sentinel:** `<!-- BUSINESS_OPERATIONS_DISPATCHER_V1 -->`

<!-- BUSINESS_OPERATIONS_DISPATCHER_V1 -->

## 0. What this is (and is not)

The **dispatcher** consumes `corpflow.business_operations_monitor.v1` findings and **routes each finding to the correct executor**:

| Owner | When |
|-------|------|
| **anton** | Payment, invoice, paid setup, urgent intake SLA, urgent client review — hard-gated operator decisions |
| **cursor** | CMP delivery stale, non-urgent client review — repo/app/admin tooling |
| **codex** | ERPNext cross-check gaps, unclassified findings — research / decision memo |
| **n8n** | Intake digests, monitor retries, lead owner reminders — hosted automation only |
| **no_action** | Safe informational findings — silent success |

**Anton Telegram paging rule (v1):** page **only** when `owner = anton` **or** `gated = true`. Cursor/Codex/n8n routings do **not** page Anton.

**Doctrine note:** dispatched executor work is governed by `docs/operations/CORPFLOWAI_BUSINESS_SURVIVAL_OPERATING_DOCTRINE.md` — runtime / client-visible packets cannot be satisfied by docs-only PRs, and every packet needs output type, surface, evidence requirement, stale threshold, and approval gates.

The monitor endpoint is **unchanged**. Use the dispatcher endpoint for n8n going forward.

## 1. HTTP endpoint (read-only)

```
GET /api/factory/business-operations-dispatcher
Authorization: Bearer <CORPFLOW_CRON_SECRET>
```

**Response schema:** `corpflow.business_operations_dispatcher.v1`

Each routing object includes:

- `owner`, `severity`, `source`, `objectType`, `objectRef`
- `gated`, `reason`, `recommendedNextAction`, `executorPrompt`
- `antonNeeded`, `safeToIgnore`, `link`

`summary.page_anton` counts routings that qualify for Telegram paging.

Implementation: `lib/server/business-operations-dispatcher.js`, route in `api/factory_router.js`.

## 2. Routing rules (v1)

| Monitor signal | Owner | Gated | Anton Telegram? |
|----------------|-------|-------|-----------------|
| `payment` / `invoice` | anton | yes | yes |
| `setup` (paid window) | anton | yes | yes |
| `lead` urgent intake | anton | yes | yes |
| `lead` warning intake | n8n | no | no |
| `delivery` ticket (CMP) | cursor | no | no |
| `delivery` lead (no owner) | n8n | no* | no* |
| `review` urgent | anton | yes | yes |
| `review` warning | cursor | no | no |
| `monitor` DB unreachable | n8n | yes | yes |
| `monitor` other unreachable | n8n | no | no |
| `monitor` ERPNext skipped | codex | no | no |
| `monitor` optional skipped | no_action | no | no |
| `safeToIgnore` + info | no_action | no | no |

\* urgent + `antonNeeded` escalates to Anton.

## 3. CLI

```powershell
npm run business-ops:dispatcher:fixtures
npm run business-ops:dispatcher -- --url https://core.corpflowai.com/api/factory/business-operations-dispatcher
```

## 4. n8n Stage 2 — dispatcher template (replaces monitor-only paging)

Template: `docs/n8n/templates/business-operations-dispatcher-v1.template.json`

**Inactive by design.** Import alongside or instead of monitor-only template.

**n8n env (never in repo):**

- `CORPFLOW_MONITOR_BASE_URL` — e.g. `https://core.corpflowai.com`
- `CORPFLOW_CRON_SECRET`
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` — Anton-gated pages only
- `CORPFLOW_DISPATCHER_GITHUB_ISSUE` — default `249` (Cursor/Codex queue comments)
- `GITHUB_TOKEN` — read/write issues on `antonvdberg-bit/corpflow-ai-command-center` (n8n credential)

**Per-run flow (n8n template — notification only):**

1. Poll dispatcher endpoint
2. Split `routings` by `owner`
3. `owner=anton` OR `gated=true` → Telegram (max 8 items)
4. `owner=cursor` → GitHub comment on #249 with `**Executor:** Cursor` + `executorPrompt`
5. `owner=codex` → GitHub comment on #249 with `**Executor:** Codex Cloud` + `executorPrompt`
6. `owner=n8n` → internal digest/retry branch (no customer sends)
7. `owner=no_action` → silent success

**Important:** Steps 4–5 are **not sufficient** for laptop-independent execution — they notify Anton; they do not start Cursor or Codex. The **dispatcher agent activator** (GitHub Actions, dry-run Phase 1) is the path to direct executor activation. See **`docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md`**.

## 5. Dispatcher agent activator (Phase 1 — dry-run)

| Item | Detail |
|------|--------|
| **Doc** | `docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md` |
| **Workflow** | `.github/workflows/factory-dispatcher-activate.yml` |
| **Schedule** | Every 2 hours + `workflow_dispatch` |
| **Secrets** | `CORPFLOW_CORE_BASE_URL` + `CORPFLOW_CRON_SECRET` (same as `factory-cmp-drive.yml`) |
| **Phase 1 behavior** | Poll dispatcher → print dry-run plan by owner — **no** Cursor/Codex/GitHub/DB calls |
| **Local CLI** | `npm run dispatcher:activate:fixtures` · `npm run dispatcher:activate:fetch` |

## 6. Security boundaries

Same as monitor v1: no secrets in repo, no customer sends, no DB writes, no payment changes.

## 7. Verification

```powershell
node --test node-tests/business-operations-dispatcher.test.mjs
node --test node-tests/dispatcher-agent-activation.test.mjs
npm run business-ops:dispatcher:fixtures
npm run dispatcher:activate:fixtures
```

Sample: `node-tests/fixtures/business-operations-dispatcher-sample.json`

## 8. Related docs

- `docs/runbooks/BUSINESS_OPERATIONS_MONITOR_V1.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md`
- `docs/execution/DELIVERY_ACCELERATION_V1.md`
- `docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md`
