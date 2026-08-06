# #778 Slice 1 — runtime evidence

**Branch:** `cursor/dispatcher-issue-778-7cf4`  
**Agent / run:** `bc-454508b6-2860-497c-b9c2-db796d038587`

## Demo URLs (synthetic only)

- Scope entry: `/app?demo=slice1`
- Tenant Requests & Progress: `/app/requests?demo=slice1`
- Core request/work: `/app/core/requests/req_slice1_corpflowai_progress_001?demo=slice1`

## Screenshots

Captured after local `next start` (or preview) against demo URLs:

- `desktop-scope.png`
- `desktop-tenant-requests.png`
- `desktop-core-request.png`
- `mobile-tenant-requests.png`
- `mobile-core-request.png`

## Limitations (honest)

- Synthetic in-memory store only (not yet persisted on `cmp_tickets.console_json`).
- Live authenticated preview requires a real session; `?demo=slice1` proves UI + same pure modules.
- No production deploy; draft PR only.
