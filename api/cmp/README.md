# CMP API (`api/cmp`)

Change Management Process backend: Baserow sync, costing, webhooks, and (later) GitHub dispatch for branch/preview/merge.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BASEROW_URL` | Yes | e.g. `https://crm.corpflowai.com` |
| `BASEROW_TOKEN` | Yes | Baserow database token |
| `BASEROW_CMP_TABLE_ID` | Recommended | Change Requests table ID (falls back to `BASEROW_TABLE_ID`) |

Optional per-tenant overrides can pass `tableId` into client methods.

## Layout

- `lib/baserow.js` — HTTP wrapper for row CRUD against Baserow.
- `lib/costing-engine.js` — Market value ($) from complexity × risk × tier; demo display rule.
- `lib/cmp-fields.js` — Baserow **user field names** for Description / Status / Stage (env overrides).
- `lib/preview-heuristics.js` — Text heuristics for impact preview until a model is wired.

## HTTP routes (Vercel)

| Route | Method | Role |
|-------|--------|------|
| `/api/cmp/ticket-create` | POST | Create Baserow row; body `{ description, client_id?, site_id? }`. |
| `/api/cmp/ticket-get` | GET | `?id=` row id; safe subset for bubble hydration. |
| `/api/cmp/costing-preview` | POST | Impact + cost preview; body `{ description, ticketId?, is_demo?, tier? }`. |
| `/api/cmp/approve-build` | POST | Set stage/status to “build approved”; body `{ ticket_id }`. |

## Baserow column names (optional env)

If your table uses different labels, set:

- `BASEROW_CMP_DESCRIPTION_FIELD` (default `Description`)
- `BASEROW_CMP_STATUS_FIELD` (default `Status`)
- `BASEROW_CMP_STAGE_FIELD` (default `Stage`)
- `BASEROW_CMP_INITIAL_STATUS`, `BASEROW_CMP_INITIAL_STAGE`
- `BASEROW_CMP_BUILD_STAGE_VALUE`, `BASEROW_CMP_BUILD_STATUS_VALUE`
- `BASEROW_CMP_CLIENT_ID_FIELD`, `BASEROW_CMP_SITE_ID_FIELD` — only if those columns exist

## Floating bubble (static)

- `public/assets/cmp/bubble.js` — include with `<script src="/assets/cmp/bubble.js" defer …></script>`.
