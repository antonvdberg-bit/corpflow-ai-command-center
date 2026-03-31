## 1. Implementation
- [ ] 1.1 Extend CMP GitHub dispatch to return a best-effort `run_url` (HTML) and/or `actions_url` fallback.
- [ ] 1.2 Add CMP API endpoint to fetch overseer data (commits/files) for a ticket sandbox branch.
- [ ] 1.3 Update Change Console UI to render:
  - [ ] Approve result with “View GitHub Actions run” link (when available)
  - [ ] Overseer panel with commit list + file list (guarded to admin sessions)
- [ ] 1.4 Ensure Postgres-first CMP usage has no Baserow-first copy in UI strings (keep backend fallback supported).

## 2. Test Plan
- [ ] 2.1 Local: approve-build returns `dispatch_triggered: true` and includes a link field.
- [ ] 2.2 Local: overseer endpoint returns commits/files for a known sandbox branch.
- [ ] 2.3 Vercel: approve-build shows the link; overseer view loads for admin.

