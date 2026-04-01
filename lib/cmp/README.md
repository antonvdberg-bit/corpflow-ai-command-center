# CMP API (`/api/cmp/*`)

Change Management Process: **Postgres** (`cmp_tickets`, `tenants`, `auth_users` via Prisma), costing, optional n8n webhooks, GitHub `repository_dispatch` for sandbox branches.

## Environment variables (high level)

| Area | Variables |
|------|-----------|
| Database | `POSTGRES_URL` (required for CMP + auth) |
| GitHub sandbox | `GITHUB_REPO`, `CMP_GITHUB_TOKEN` (or `GH_WORKFLOW_TOKEN`) |
| Optional n8n | `N8N_WEBHOOK_URL`, `N8N_CMP_WEBHOOK_URL` |
| Automation callback | `CMP_AUTOMATION_CALLBACK_SECRET`, `CMP_AUTOMATION_CALLBACK_URL` (GitHub Actions → Vercel) |
| Optional Vercel preview lookup | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID` (used by `promote-status` to fill `client_view.automation.preview_url`) |
| Factory gate | `MASTER_ADMIN_KEY`, `DORMANT_GATE_ENABLED`, etc. |

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

## Change Console: `client_view` and `ticket_progress`

Durable, tenant-safe progress lives under `cmp_tickets.console_json.client_view`:

- **Estimate** (`costing-preview` with a ticket id): writes `last_estimate_at`, `effort_hours_low` / `effort_hours_high`, `display_amount_usd`, `full_market_value_usd`, `display_currency`, `complexity`, `risk`.
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
