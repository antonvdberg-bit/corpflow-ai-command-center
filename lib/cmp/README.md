# CMP API (`/api/cmp/*`)

Change Management Process: **Postgres** (`cmp_tickets`, `tenants`, `auth_users` via Prisma), costing, optional n8n webhooks, GitHub `repository_dispatch` for sandbox branches.

## Environment variables (high level)

| Area | Variables |
|------|-----------|
| Database | `POSTGRES_URL` (required for CMP + auth) |
| GitHub sandbox | `CMP_GITHUB_REPOSITORY` (preferred) or `GITHUB_REPO`, plus `CMP_GITHUB_TOKEN` (or `GH_WORKFLOW_TOKEN`) |
| Optional n8n | `N8N_WEBHOOK_URL`, `N8N_CMP_WEBHOOK_URL` |
| Automation callback | `CMP_AUTOMATION_CALLBACK_SECRET`, `CMP_AUTOMATION_CALLBACK_URL` (GitHub Actions → Vercel) |
| Optional Vercel preview lookup | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID` (used by `promote-status` to fill `client_view.automation.preview_url`) |
| Factory gate | `MASTER_ADMIN_KEY`, `DORMANT_GATE_ENABLED`, etc. |
| Automation spine | `CORPFLOW_AUTOMATION_INGEST_SECRET`, `CORPFLOW_AUTOMATION_APPROVAL_SECRET`, optional `CORPFLOW_AUTOMATION_FORWARD_*` |

See repository root `.env.template` for the full list.

## Layout

- `router.js` — unified handler; `action` from query or path (via `factory_router` + `__path`).
- `_lib/costing-engine.js` — market value from complexity × risk × tier.
- `_lib/preview-heuristics.js` — impact text heuristics.
- `_lib/ai-interview.js` — clarification questions.
- `_lib/github-dispatch.js` — sandbox dispatch + PR helpers.
- `_lib/tenant-pin.js` — PIN generation / verify for `tenants.sovereign_pin_hash`.
- `_lib/sovereign-session.js` — tenant sovereign JWT for gated CMP actions.

## HTTP surface

Routes are served as `/api/cmp/router?action=<name>` or legacy path segments; see `lib/cmp/router.js` `switch` / handlers.

Common actions include `ticket-create`, `ticket-get`, `ticket-activity`, `ticket-list`, `costing-preview`, `approve-build`, `change-chat`, `overseer`, etc.

**`ticket-list` scope:** Admin sessions receive only **unscoped** tickets (`tenant_id` null — factory/core queue). Tenant sessions receive only rows for **their** `tenant_id`. Factory master token (no session) returns **all** rows for break-glass support. Response includes `list_scope` (`core` | `tenant` | `factory_master`) and `scope_tenant_id` when applicable.

## Automation spine (agents / webhooks)

Machine-first events and playbooks (separate from CMP `action=` router):

- `POST /api/automation/ingest` — append-only `automation_events`, optional playbook upsert, optional forward webhook. See `docs/automation-framework.md`.
- `GET /api/automation/playbooks` — factory master only; lists curated markdown playbooks for agents.
- `GET /api/automation/events` — factory master only; recent automation rows (`tenant_scope`, `limit`).
- CMP mirrors key lifecycle into `automation_events` when `CORPFLOW_AUTOMATION_CMP_MIRROR` is not `false` (same optional n8n forward).

## Tenant onboarding

- **`tenant-onboard`** (POST, factory master only): upserts a row in `tenants` so tenant auth + tenant-scoped ticketing has a stable identity.
  - Body: `{ tenant_id, slug?, name?, fqdn?, execution_only?, lifecycle?, tenant_status? }`
  - This intentionally does **not** issue credentials; pair it with `provision-tenant-pin` when you want a PIN for sovereign bootstrap.
- **`tenant-hostname-upsert`** (POST, factory master only): upserts a row in `tenant_hostnames` mapping a host (e.g. `legal.corpflowai.com`) to `tenant_id` (e.g. `legal-demo`).
  - Body: `{ host, tenant_id, mode?, enabled? }`
- **`provision-tenant-pin`** (POST, factory master only): upserts `tenants.sovereign_pin_hash` (and creates a minimal tenant row if missing) and returns a one-time plaintext PIN.
- **Auth users (break-glass):** UI `/factory/auth-users` — lists `auth_users` (no password visibility); `POST /api/factory/auth-users/set-password` with factory master to generate or set a new password. API: `GET /api/factory/auth-users/list?tenant_id=`.
- **`assist-request`** (POST): records a tenant-safe “please investigate” snapshot for a ticket into `recovery_vault_entries` (Postgres) and emits telemetry for triage.
  - Body: `{ ticket_id, reason?, snapshot? }`

## Change Console: `client_view` and `ticket_progress`

Durable, tenant-safe progress lives under `cmp_tickets.console_json.client_view`:

- **Estimate** (`costing-preview` with a ticket id): writes `last_estimate_at`, `effort_hours_low` / `effort_hours_high`, `display_amount_usd`, `actual_cost_to_client_usd` (billable line — same as `displayed_client_usd` from the costing engine), `market_reference_usd` / `full_market_value_usd` (audit / market-style reference, not necessarily the invoice), `display_currency`, `complexity`, `risk`.
- **Approve build**: merges `automation` (`dispatch_ok`, GitHub URLs, `last_error`) and status/stage hints.
- **`ticket-get`**: returns `ticket_progress` `{ status, stage, client_view }` for every caller; **`itinerary`** (ordered audit steps from `created_at` / `updated_at` and `console_json` milestones); **full `console_json` only for admin** sessions.
- **`ticket-activity`**: GET/POST with `id` or `ticket_id` — tenant-safe snapshot of GitHub branch presence and recent Actions runs for `cmp/<ticket_id>` (`summary_line`, `needs_attention`, `stuck_hint`, links). Tenant sessions are scoped to their ticket rows; admins see any ticket. Allowed for logged-in tenant cookies without extra JWT allowlist (same idea as `ticket-list`).

## `automation-callback` (POST, secret header)

Server route: `/api/cmp/automation-callback` (same router `action=automation-callback`). Headers: `x-cmp-automation-secret` or `x-corpflow-automation-secret` = `CMP_AUTOMATION_CALLBACK_SECRET`.

JSON body (typical):

- `ticket_id` (required)
- `pr_number`, `pr_url`, `branch_name`, `base_ref`, `event` (existing)
- **`preview_url`** or **`deployment_url`** or **`site_url`** — normalized into `client_view.automation.preview_url` for the Change Console (“Site preview” line).

Use this from n8n or a Vercel deploy webhook after a Preview deployment for branch `cmp/<ticket_id>` is ready.

## Static bubble

- `public/assets/cmp/bubble.js` — include with `<script src="/assets/cmp/bubble.js" defer …></script>`.

## Tenant password reset (login)

The login screen (`public/login.html`) supports tenant password reset by email/username within a tenant:

- `POST /api/auth/password-reset/request` with `{ email, tenant_id? }` (tenant resolved from `auth_users` when the email exists)
  - Stores a one-time token in Postgres `recovery_vault_entries` (`category=password_reset`).
  - Response is non-enumerating (returns ok even if user does not exist).
  - Optional delivery via `CORPFLOW_PASSWORD_RESET_WEBHOOK_URL` (recommended).
- `POST /api/auth/password-reset/confirm` with `{ token, new_password }`
  - Resets password for the specific `auth_users` row matching `tenant_id + username` (supports multiple staff logins).
