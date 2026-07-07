# Dispatcher agent activation v1

**Status:** Phase 0–1 — decision captured; **dry-run activator only** (no live Cursor/Codex calls).  
**Owner:** Anton (operator / approver); Cursor (repo implementation).  
**Created:** 2026-07-06.  
**Anchor sentinel:** `<!-- DISPATCHER_AGENT_ACTIVATION_V1 -->`

<!-- DISPATCHER_AGENT_ACTIVATION_V1 -->

## 1. Problem

The business-operations **dispatcher** classifies monitor findings into executors (`owner=cursor|codex|anton|n8n|no_action`) and emits `executorPrompt` text. Today, **nothing automatically starts** Cursor or Codex when those routings appear.

Posting to Operator Bridge **#249**, Telegram, or n8n **comments** is **notification-only**. Anton remains the manual courier: he must open Cursor or Codex and paste context.

**Constraint (Anton, 2026-07-06):** Notification-only workflows are rejected as the final solution. The activator must eventually **directly start** cloud executors — not merely queue comments.

## 2. Decision (approved)

| Layer | Choice |
|-------|--------|
| **Orchestrator** | **L2 GitHub Actions** — scheduled + manual dispatch |
| **Input** | `GET /api/factory/business-operations-dispatcher` (Bearer `CORPFLOW_CRON_SECRET`) |
| **`owner=cursor`** | **Cursor Cloud Agents API** (`POST /v1/agents`, `autoCreatePR`) — Phase 3+ |
| **`owner=codex`** | **Codex Cloud** (GitHub App / task dispatch) — Phase 4+, blocked on Packet 7.2 install |
| **`owner=anton`** | Activator **skips** — n8n/Telegram operator-gate path unchanged |
| **`owner=n8n`** | Activator **skips** — hosted automation path unchanged |
| **`owner=no_action`** | Activator **skips** — silent success |
| **Rejected** | `corpflow-exec-01` agent runner (violates server boundary §5.3); Cursor desktop/CLI as 24/7 executor; comment-only n8n queue as final path |

**Three execution layers preserved:** L1 laptop (Cursor IDE) · L2 cloud (GHA + cloud agents) · L3 box (operator SSH only).

Companion policy docs (unchanged):

- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`
- `docs/execution/DELIVERY_ACCELERATION_V1.md`
- `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`

## 3. Phase map

| Phase | Scope | Status |
|-------|--------|--------|
| **0** | This doc + cross-links | **In progress (this PR)** |
| **1** | GHA dry-run workflow + plan formatter + tests | **In progress (this PR)** |
| **2** | Dedupe ledger (idempotency keys) | Not started |
| **3** | Live Cursor Cloud Agents API activation | **In progress (this PR)** |
| **4** | Live Codex Cloud activation (requires Packet 7.2) | Not authorized in this PR |
| **5** | Retire n8n cursor/codex comment-queue nodes | Not started |
| **6** | Live verification + Delivery Reality Audit | Not started |

## 4. Phase 1 — dry-run activator (current)

### 4.1 GitHub Actions workflow

**File:** `.github/workflows/factory-dispatcher-activate.yml`

| Trigger | Schedule |
|---------|----------|
| `schedule` | Every 2 hours (`0 */2 * * *` UTC) |
| `workflow_dispatch` | Manual run |

**Manual inputs (`workflow_dispatch`):**

| Input | Default | Purpose |
|-------|---------|---------|
| `activation_mode` | `dry_run` | `dry_run` or `cursor_live` |
| `smoke_internal` | `false` | Inject internal smoke cursor routing when dispatcher has none |
| `target_issue` | *(blank)* | Numeric GitHub issue for direct Cursor activation; blank = dispatcher fetch |

**Repo secrets (same pattern as `factory-cmp-drive.yml`):**

| Secret | Purpose |
|--------|---------|
| `CORPFLOW_CORE_BASE_URL` | e.g. `https://core.corpflowai.com` |
| `CORPFLOW_CRON_SECRET` | Same value as Vercel `CORPFLOW_CRON_SECRET` / `CRON_SECRET` |
| `CORPFLOW_FACTORY_HEALTH_URL` | Optional fallback to derive dispatcher URL |
| `CURSOR_API_KEY` | Required for `activation_mode=cursor_live` only |

Built-in **`GITHUB_TOKEN`** (`issues: read`) fetches `target_issue` title/body when direct-issue activation is used.

If secrets are missing, the job **exits 0 (skipped)** so forks stay green.

### 4.2 What the dry-run does

1. `GET` the dispatcher endpoint (read-only).
2. Parse `routings[]`. **HTTP 503 (or other non-2xx) is valid** when the JSON body has `schema: corpflow.business_operations_dispatcher.v1` — the dispatcher returns 503 when `ok: false` / action is required, same pattern as the monitor endpoint.
3. Group by `owner` and print a **dry-run activation plan**:
   - `cursor` → `WOULD_ACTIVATE_CURSOR_CLOUD_API`
   - `codex` → `WOULD_ACTIVATE_CODEX_CLOUD`
   - `anton` → `SKIP_OPERATOR_GATE`
   - `n8n` → `SKIP_N8N_HOSTED`
   - `no_action` → `SKIP_NO_ACTION`

### 4.3 What Phase 1 explicitly does NOT do

- No Cursor API call
- No Codex trigger
- No GitHub issue creation or #249 comments
- No DB write
- No env / schema / deploy change
- No client sends

### 4.4 Implementation files

| Path | Role |
|------|------|
| `lib/server/dispatcher-agent-activation.js` | Pure plan builder (`corpflow.dispatcher_agent_activation.v1`) |
| `scripts/dispatcher-agent-activation.mjs` | CLI: `--fixtures`, `--file`, `--fetch`, `--target-issue` |
| `node-tests/dispatcher-agent-activation.test.mjs` | Formatter tests (no live secrets) |
| `node-tests/dispatcher-direct-issue-activation.test.mjs` | Direct `target_issue` activation tests |

### 4.5 Local verification

```powershell
node --test node-tests/dispatcher-agent-activation.test.mjs
node --test node-tests/dispatcher-direct-issue-activation.test.mjs
npm run dispatcher:activate:fixtures
npm run dispatcher:activate:fetch
```

`dispatcher:activate:fetch` requires local `.env` with `CORPFLOW_CRON_SECRET` and factory URL — optional; CI uses GHA secrets.

## 5. Phase 2–4

### Phase 2 — dedupe ledger (v1 shipped with Phase 3)

GHA cache persists `.dispatcher-activation-state/dedupe.json`. Key: `owner:objectType:objectRef:severity`. No DB writes.

### Phase 3 — Cursor live activation (manual GHA only)

- 2026-07-06: First GitHub Actions `cursor_live` smoke completed (internal ops smoke only; no secrets recorded).
- `workflow_dispatch` input `activation_mode: cursor_live`; **scheduled runs stay `dry_run`**.
- Optional `workflow_dispatch` input `target_issue` — **manual only**. When set to a numeric GitHub issue (e.g. `553`), the activator **skips dispatcher cursor routings** and builds **exactly one** Cursor candidate from that issue (title, URL, body in `executorPrompt`). Blank `target_issue` preserves the existing dispatcher fetch path.
- Secret: `CURSOR_API_KEY` (GHA only; never logged).
- `POST https://api.cursor.com/v1/agents` with `executorPrompt`, repo `antonvdberg-bit/corpflow-ai-command-center`, `startingRef: main`, `autoCreatePR: true`.
- Max **1** live Cursor activation per run. `codex` remains dry-run only.
- Post activation receipt to #249 (audit trail only).

#### Manual run — direct issue activation (Option B)

Use when the production dispatcher returns **zero** `owner=cursor` routings but Anton wants to activate one approved GitHub issue directly.

1. GitHub → **Actions** → **Factory dispatcher activate** → **Run workflow**.
2. Set:
   - `activation_mode` = **`cursor_live`**
   - `target_issue` = **`553`** (numeric issue only; first target: Cursor spend/value/burn-rate guardrails)
   - Leave `smoke_internal` **unchecked** unless you intend the internal smoke routing.
3. Ensure repo secret **`CURSOR_API_KEY`** is set (required for `cursor_live`).
4. Workflow uses built-in **`GITHUB_TOKEN`** (`issues: read`) to fetch the issue title/body — no extra secret.
5. Expected: one Cursor Cloud agent created, PR opened by Cursor (Anton merges manually). Artifact `dispatcher-activation-result` includes `activation-plan.json`.

**Safety (unchanged):** no auto-merge, no production deploy, no env/DB changes, no client sends. Scheduled runs **ignore** `target_issue` and remain `dry_run` only.

```text
activation_mode=cursor_live
target_issue=553
```

### Phase 4 — Codex activation

- Blocked until `docs/runbooks/CODEX_CLOUD_INSTALL.md` (Packet 7.2) completes.
- Structured dispatch issue + Codex Cloud GitHub App trigger; enforce `codex/*` branch discipline.

## 6. Security boundaries (all phases)

| Rule | Phase 1 |
|------|---------|
| Activator holds only dispatcher read secret (`CORPFLOW_CRON_SECRET`) | Yes |
| No `POSTGRES_URL`, `MASTER_ADMIN_KEY`, Vercel tokens on activator | Yes |
| No production DB writes from activator | Yes |
| No autonomous merge — Anton merges all PRs | Yes (no PRs in Phase 1) |
| No customer-facing sends | Yes |

## 7. Cost / plan impact (future phases)

| Item | Notes |
|------|-------|
| GHA dry-run | ~$0 incremental |
| Cursor Cloud Agents API | Cursor usage-metered; API key in GHA — Phase 3 |
| Codex Cloud | ChatGPT Plus (Anton); Packet 7.2 install — Phase 4 |

## 8. Related docs

- `docs/runbooks/BUSINESS_OPERATIONS_DISPATCHER_V1.md` — dispatcher endpoint + routing rules
- `docs/runbooks/BUSINESS_OPERATIONS_MONITOR_V1.md` — upstream monitor
- `docs/operations/OPERATOR_BRIDGE_V1.md` — #249 coordination (audit receipts, not activation trigger)
- `docs/execution/DELIVERY_ACCELERATION_V1.md` — Cursor + Codex executor boundaries
- `docs/runbooks/CODEX_CLOUD_INSTALL.md` — Packet 7.2 (Codex Phase 4 gate)
