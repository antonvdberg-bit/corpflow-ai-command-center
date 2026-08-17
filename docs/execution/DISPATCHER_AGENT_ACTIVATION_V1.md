# Dispatcher agent activation v1

**Status:** **LEGACY / DIAGNOSTIC / NOT PRODUCTION EXECUTION** as of #930 (2026-08-13). Cursor live API activation mechanics remain in-repo for manual smoke only. Production Cursor execution is `CorpFlowAI Cursor Factory Handoff` → Cursor Automation `CorpFlowAI Factory Wake Proof` / MODE B (controller #903, #913, merged PR #914). Codex remains human-triggered specialist (not Phase-4 auto-activate).  
**Owner:** Anton (operator / approver); Cursor (repo implementation).  
**Created:** 2026-07-06.
**Updated:** 2026-08-13 (#930).
**Anchor sentinel:** `<!-- DISPATCHER_AGENT_ACTIVATION_V1 -->`

<!-- DISPATCHER_AGENT_ACTIVATION_V1 -->

> **Operating posture:** `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md` — Cursor Factory Automation (Handoff / Wake Proof) is the automatic primary worker; Anton is **not** the courier between Cursor stages.
>
> **#930 production decision:** `.github/workflows/factory-dispatcher-activate.yml` is **not** the normal production executor. It must not auto-launch from schedule, issue labels/comments, or capacity events. Manual `workflow_dispatch` is retained for diagnostic smoke only.

## 1. Problem (historical — why the activator exists)

The business-operations **dispatcher** classifies monitor findings into executors (`owner=cursor|codex|anton|n8n|no_action`) and emits `executorPrompt` text. Before the activator, **nothing automatically started** Cursor or Codex when those routings appeared.

Posting to Operator Bridge **#249**, Telegram, or n8n **comments** alone was **notification-only**, which forced Anton into a courier role. That posture is **rejected** as the final solution — eligible Cursor work now activates via the GitHub control loop.

**Constraint (Anton, 2026-07-06):** Notification-only workflows are rejected as the final solution. The activator must eventually **directly start** cloud executors — not merely queue comments.

## 2. Decision (approved)

| Layer | Choice |
|-------|--------|
| **Orchestrator** | **L2 GitHub Actions** — **production:** `CorpFlowAI Cursor Factory Handoff` (eligibility events + capacity `workflow_call`). **This API activator:** manual `workflow_dispatch` only (#930) |
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

**#930:** this workflow is **LEGACY / DIAGNOSTIC / NOT PRODUCTION EXECUTION**. Displayed name must remain clearly marked LEGACY. Automatic triggers are forbidden.

| Trigger | Status |
|---------|--------|
| `workflow_dispatch` | **Only allowed trigger** — manual diagnostic / dry_run (default) or `cursor_live` smoke |
| `issues:labeled` / `unlabeled` | **Removed** — production wake is CorpFlowAI Cursor Factory Handoff |
| `issue_comment` | **Removed** — production wake is Handoff |
| `workflow_call` | **Removed** — lifecycle capacity backfill wakes Handoff, not this workflow |
| `schedule` | **Removed** — must not auto-launch Background Agents API workers |

**SLA:** eligibility-changing events should normally begin activation within **5 minutes** via **Handoff → Wake Proof**, not this workflow.

**Segregated issue lifecycle:** the production Handoff run executes the same eligibility / verified WIP scan. This legacy workflow, when dispatched manually, still runs `scripts/cursor-issue-dispatch-scan.mjs` first. See `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`. Helpers: `lib/server/cursor-ready-event-dispatch.js`.

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

**Repo variable / optional secret:**

| Name | Purpose |
|------|---------|
| `CURSOR_LIVE_ENABLED` | Historical scheduled-live kill switch. **Scheduled `cursor_live` is removed (#930).** Manual diagnostic `cursor_live` still requires `CURSOR_API_KEY`. |

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
| `lib/server/cursor-ops-status.js` | Control Tower v0 status packet builder |
| `scripts/cursor-ops-status-summary.mjs` | One-screen status summary for ChatGPT/n8n |
| `node-tests/dispatcher-agent-activation.test.mjs` | Formatter tests (no live secrets) |
| `node-tests/dispatcher-direct-issue-activation.test.mjs` | Direct `target_issue` activation tests |
| `node-tests/cursor-ops-status.test.mjs` | Control Tower status artifact tests |

### 4.5 Local verification

```powershell
node --test node-tests/dispatcher-agent-activation.test.mjs
node --test node-tests/dispatcher-direct-issue-activation.test.mjs
node --test node-tests/cursor-ops-status.test.mjs
npm run dispatcher:activate:fixtures
npm run dispatcher:activate:fetch
```

`dispatcher:activate:fetch` requires local `.env` with `CORPFLOW_CRON_SECRET` and factory URL — optional; CI uses GHA secrets.

## 5. Phase 2–4

### Phase 2 — dedupe ledger (v1 shipped with Phase 3)

GHA cache persists `.dispatcher-activation-state/dedupe.json`. Key: `owner:objectType:objectRef:severity`. No DB writes.

### Phase 3 — Cursor live activation

- 2026-07-06: First GitHub Actions `cursor_live` smoke completed (internal ops smoke only; no secrets recorded).
- `workflow_dispatch` input `activation_mode: cursor_live` remains available for manual approved activations.
- Scheduled runs may enter `cursor_live` only when `CURSOR_LIVE_ENABLED=true`; otherwise the workflow forces `dry_run`.
- Scheduled `cursor_live` is fail-closed behind a throughput packet gate. Cursor is the executor, not the chooser.
- Optional `workflow_dispatch` input `target_issue` — **manual only**. When set to a numeric GitHub issue (e.g. `553`), the activator **skips dispatcher cursor routings** and builds **exactly one** Cursor candidate from that issue (title, URL, body in `executorPrompt`). Blank `target_issue` preserves the existing dispatcher fetch path.
- Secret: `CURSOR_API_KEY` (GHA only; never logged).
- `POST https://api.cursor.com/v1/agents` with `executorPrompt`, repo `antonvdberg-bit/corpflow-ai-command-center`, `startingRef: main`, `autoCreatePR: true`.
- Max **1** live Cursor activation per run. `codex` remains dry-run only.
- Post activation receipt to #249 (audit trail only).

#### Scheduled `cursor_live` throughput packet gate

Dispatcher-sourced scheduled `cursor_live` candidates must include a structured `throughput_packet` (or `throughputPacket`) with every field below. Missing fields or an unapproved category produce `SKIP_THROUGHPUT_PACKET`; no Cursor API call is made.

| Field | Requirement |
|-------|-------------|
| `business_outcome` | Named commercial or delivery outcome. |
| `linked_issue_or_ticket` | GitHub issue, PR, or `/change` ticket. |
| `delivery_surface` | Exact app, admin, client, or operator surface affected. |
| `evidence_required` | Live corpflow_test URL, endpoint result, screenshot, test, or runtime proof on the actual test surface. A Vercel Preview URL is optional internal sandboxing only — not required for CorpFlowAI test-only work (#973). |
| `cost_risk_cap` | Why this is safe within the current Cursor spend cap. |
| `allowed_category` | One of: `revenue`, `client-delivery`, `production-verification`, `lead-rescue`, `lux-recovery`, `paid-pilot`, `ops-unblocker`. |

Block-by-default routing remains in force for docs-only work without delivery evidence, architecture essays, speculative refactors, experimental frameworks, new tools/vendors, new app/database surfaces, polish without client/revenue impact, and anything lacking evidence requirements.

**Runtime packets cannot be satisfied by docs-only PRs.** Per `docs/operations/CORPFLOWAI_BUSINESS_SURVIVAL_OPERATING_DOCTRINE.md` §3–§4, an activated packet classified as runtime / client-visible is only satisfied by a PR with runtime evidence (live corpflow_test URL, endpoint result, screenshot, or test output against the actual surface). A Vercel Preview URL is optional and is not required to complete a corpflow_test packet. A docs-only PR against such a packet is a failed packet, not a completed one.

**Operational kill switch:** production Wake Proof does not use `CURSOR_LIVE_ENABLED`. For this legacy diagnostic workflow, leave it unused; do not restore scheduled `cursor_live`.

#### Manual run — direct issue activation (LEGACY diagnostic only)

Use only for diagnostic smoke of the Background Agents API path. Ordinary factory work must go through **CorpFlowAI Cursor Factory Handoff** / Wake Proof (#930).

1. GitHub → **Actions** → **LEGACY Factory dispatcher activate (diagnostic - not production execution)** → **Run workflow**.
2. Set:
   - `activation_mode` = **`cursor_live`**
   - `target_issue` = numeric issue
   - Leave `smoke_internal` **unchecked** unless you intend the internal smoke routing.
3. Ensure repo secret **`CURSOR_API_KEY`** is set (required for `cursor_live`).
4. Workflow uses built-in **`GITHUB_TOKEN`** (`issues: read` for fetch, `issues: write` for status comment) to fetch the issue title/body — no extra secret.
5. Expected: one Cursor Cloud agent created. This must **not** run in parallel with a Wake Proof worker on the same issue.

**Safety (unchanged):** no auto-merge, no production deploy, no env/DB changes, no client sends. This workflow has **no** schedule and **ignores** automatic eligibility events.

```text
activation_mode=cursor_live
target_issue=553
```

## Cursor Control Tower v0

**Goal:** After every Cursor activation run, leave **machine-visible evidence** so ChatGPT and n8n can inspect status without Anton forwarding screenshots or URLs.

### Run target issue #553

GitHub → **Actions** → **LEGACY Factory dispatcher activate (diagnostic - not production execution)** → **Run workflow**:

```text
activation_mode=cursor_live
target_issue=553
smoke_internal=false
```

Requires repo secret **`CURSOR_API_KEY`**.

### Status artifact

Every run writes **`cursor-ops-status.json`** and uploads it in the **`dispatcher-activation-result`** workflow artifact (alongside `activation-plan.json`, **`activation-audit.json`**, and dedupe state).

`activation-audit.json` uses schema `corpflow.dispatcher_activation_audit.v1` and records every evaluated candidate with action/skipped reason, category, business outcome, evidence required, linked issue/ticket, delivery surface, and spend-risk note.

| Field | Meaning |
|-------|---------|
| `activation_status` | `started`, `skipped`, `blocked`, `failed`, `pr_opened`, `complete`, `unknown`, `stale_pending_review`, `stale_needs_check`, `observability_failed` |
| `workflow_run_id` | GitHub Actions run to inspect logs |
| `workflow_run_url` | Direct link to the workflow run |
| `target_issue` | Direct issue number (e.g. `553`) or null for dispatcher path |
| `cursor_agent_url` | Cursor Cloud agent URL when started |
| `pr_url` / `pr_number` | PR when visible in Cursor API response |
| `blocked_reason` | Why activation did not start |
| `need_anton` | Whether operator action is required |
| `next_check_after_minutes` | Suggested re-check interval (default **10**) |
| `observability` | STARTED/FINISHED comment flags + `observability_failed` when issue comments could not be posted |

Local summary:

```powershell
node scripts/cursor-ops-status-summary.mjs
node scripts/cursor-ops-status-summary.mjs --file cursor-ops-status.json
```

### How ChatGPT / n8n should interpret status

1. **For `target_issue` runs:** read **STARTED** and **FINISHED** comments on that issue first (e.g. #553).
2. Download artifact **`dispatcher-activation-result`** from the workflow run URL in the comment (or job log).
3. Parse **`cursor-ops-status.json`** — no secrets are included.
4. Interpret:
   - `skipped` + `dry_run` → no live activation; re-run with `cursor_live` if intended.
   - `blocked` / `failed` → read `blocked_reason`; `need_anton: true` means stop unattended automation.
   - `observability_failed` → issue comments missing; **green Actions alone is not acceptable** — fix token/permissions and re-run.
   - `started` + empty `pr_url` → agent running; re-check after `next_check_after_minutes`.
   - `pr_opened` → inspect `pr_url`; Anton still merges manually.
   - `stale_pending_review` → no PR within stale window (see below).

Job logs also print a **`CURSOR OPS STATUS`** block with the same fields.

### Manual target_issue observability contract

**A manual `workflow_dispatch` run with `target_issue` set is only operationally successful when the target issue receives both comments:**

1. **`Cursor activation started`** — posted **before** Cursor activation (`activation_status: started_preflight`)
2. **`Cursor activation finished`** — posted **after** activation with final status (including `blocked`, `failed`, `started`, `pr_opened`, or `observability_failed`)

**Green GitHub Actions without these issue comments is not acceptable** for manual `target_issue` runs.

Failure modes (job **must fail**):

- Missing `GITHUB_TOKEN` (`github.token` in workflow — **not** `secrets.GITHUB_TOKEN`)
- STARTED comment cannot be posted → fail **before** Cursor activation
- FINISHED comment cannot be posted → write `cursor-ops-status.json` with `observability_failed`, then fail the job

Dispatcher-only runs (blank `target_issue`) may still post to **#249** when comment posting is enabled; failure there does not fail the job.

ChatGPT/n8n inspection order:

1. Target issue comments (#553)
2. Artifact **`dispatcher-activation-result`** → **`cursor-ops-status.json`**
3. Workflow run logs (`CURSOR OPS STATUS` block)

### Status comments

When `DISPATCHER_ACTIVATION_POST_COMMENT=1` (enabled in GHA):

- **`target_issue` set (manual)** → **required** STARTED + FINISHED comments on that issue; job fails if either is missing
- **otherwise** → optional FINISHED comment on Operator Bridge **#249**

Workflow uses **`GITHUB_TOKEN: ${{ github.token }}`** with `issues: write`.

### Stale-after-10-minutes rule

If `activation_status` is **`started`** and **`pr_url` / `pr_number` are still empty** **10 minutes** after `started_at`, consumers should treat the activation as **`stale_pending_review`** (`need_anton: true`). v0 does **not** poll Cursor automatically; n8n or a later monitor pass can apply this rule when re-reading the artifact.

### Safety boundaries (Control Tower v0)

- Read/write GitHub issue comments only (no email/WhatsApp/SMS).
- No database, no new env vars, no production deploy, no auto-merge.
- Cursor may open a PR only; Anton merges.
- **Scheduled `cursor_live` is disabled unless `CURSOR_LIVE_ENABLED=true` and the candidate passes the throughput packet gate**. This PR only permits Cursor to open PRs; it does not authorize autonomous merge, production deploy, client sends, WhatsApp/SMS/email, payment action, or DB/schema/env changes.

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

- `docs/operations/CORPFLOWAI_BUSINESS_SURVIVAL_OPERATING_DOCTRINE.md` — business-level doctrine (mandatory): output-type classification, docs-only-cannot-close-runtime rule, Delivery Queue v1
- `docs/runbooks/BUSINESS_OPERATIONS_DISPATCHER_V1.md` — dispatcher endpoint + routing rules
- `docs/runbooks/BUSINESS_OPERATIONS_MONITOR_V1.md` — upstream monitor
- `docs/operations/OPERATOR_BRIDGE_V1.md` — #249 coordination (audit receipts, not activation trigger)
- `docs/execution/DELIVERY_ACCELERATION_V1.md` — Cursor + Codex executor boundaries
- `docs/runbooks/CODEX_CLOUD_INSTALL.md` — Packet 7.2 (Codex Phase 4 gate)
