# CMP API (`api/cmp`)

Change Management Process backend: Baserow sync, costing, webhooks, and (later) GitHub dispatch for branch/preview/merge.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BASEROW_URL` | Yes | Your Baserow API origin (set in Vercel; do not hardcode tenant URLs in git) |
| `BASEROW_TOKEN` | Yes | Baserow database token |
| `BASEROW_CMP_TABLE_ID` | Recommended | Change Requests table ID (falls back to `BASEROW_TABLE_ID`) |

Optional per-tenant overrides can pass `tableId` into client methods.

## Layout

- `router.js` — **Single** Vercel function; dispatches by `action` (path rewrite or `?action=`).
- `_lib/baserow.js` — HTTP wrapper for row CRUD against Baserow (underscore dir = not a separate route).
- `_lib/costing-engine.js` — Market value ($) from complexity × risk × tier; demo display rule.
- `_lib/cmp-fields.js` — Baserow **user field names** for Description / Status / Stage (env overrides).
- `_lib/preview-heuristics.js` — Text heuristics for impact preview until a model is wired.
- `_lib/ai-interview.js` — Clarification question templates from inferred complexity.

## HTTP routes (Vercel)

All paths below rewrite to `router.js` with the same URL path; `action` is derived from the first segment after `/api/cmp/`.

| Route | Method | Role |
|-------|--------|------|
| `/api/cmp/ticket-create` | POST | Create Baserow row; body `{ description, client_id?, site_id? }`. |
| `/api/cmp/ticket-get` | GET | `?id=` row id; safe subset for bubble hydration. |
| `/api/cmp/costing-preview` | POST | Impact + cost preview; body `{ description, ticketId?, is_demo?, tier? }`. |
| `/api/cmp/ai-interview` | POST | Clarification questions; body `{ description }`. |
| `/api/cmp/approve-build` | POST | Set stage/status to “build approved”; body `{ ticket_id }`. |
| `/api/cmp/sandbox-start` | POST | Reserved (501) until GitHub workflow callback is wired. |

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
