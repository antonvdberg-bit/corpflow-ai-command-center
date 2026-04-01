# CMP API (`/api/cmp/*`)

Change Management Process: **Postgres** (`cmp_tickets`, `tenants`, `auth_users` via Prisma), costing, optional n8n webhooks, GitHub `repository_dispatch` for sandbox branches.

## Environment variables (high level)

| Area | Variables |
|------|-----------|
| Database | `POSTGRES_URL` (required for CMP + auth) |
| GitHub sandbox | `GITHUB_REPO`, `CMP_GITHUB_TOKEN` (or `GH_WORKFLOW_TOKEN`) |
| Optional n8n | `N8N_WEBHOOK_URL`, `N8N_CMP_WEBHOOK_URL` |
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

Common actions include `ticket-create`, `ticket-get`, `ticket-list`, `costing-preview`, `approve-build`, `change-chat`, `overseer`, etc.

## Static bubble

- `public/assets/cmp/bubble.js` — include with `<script src="/assets/cmp/bubble.js" defer …></script>`.
