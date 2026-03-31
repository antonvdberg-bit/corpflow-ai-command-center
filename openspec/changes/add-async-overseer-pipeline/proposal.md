# Change: Add asynchronous Overseer pipeline (multi-ticket)

## Why
Overseer review cannot be synchronous or tied to a single UI request. It must continuously review qualifying changes and push oversight results back into the Change Console for refinement/deployment decisions without requiring an operator laptop to stay on.

## What Changes
- Add an **asynchronous overseer pipeline** that:
  - discovers tickets that qualify for oversight (e.g., approved + build stage)
  - fetches GitHub compare/commits/files for each ticket’s sandbox branch
  - writes a durable “overseer report” back to the ticket record
- Change Console reads and renders the latest overseer report automatically.

## Impact
- Affected surfaces: CMP API + Postgres ticket persistence (`cmp_tickets.console_json` or a dedicated field)
- New runtime component: scheduled job (Vercel Cron or equivalent) or webhook-driven updater
- Security: GitHub token is used server-side only; reports contain links + filenames + commit metadata only

