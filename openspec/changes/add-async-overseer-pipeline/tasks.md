## 1. Implementation
- [ ] 1.1 Define “qualifying” criteria for oversight (status/stage/flags).
- [ ] 1.2 Add a persistent overseer report store (Postgres): either in `cmp_tickets.console_json` or a dedicated column/table.
- [ ] 1.3 Add server endpoint to run one “overseer sweep” (idempotent) over qualifying tickets.
- [ ] 1.4 Add scheduler trigger (Vercel Cron or equivalent) to call the sweep endpoint.
- [ ] 1.5 Update Change Console to poll and render latest overseer report per ticket.

## 2. Test Plan
- [ ] 2.1 Seed a ticket with `cmp/<ticket_id>` branch changes; verify sweep writes report.
- [ ] 2.2 Verify console shows report without manual “Overseer view” clicks.
- [ ] 2.3 Verify non-admin tenants never receive operator-only fields beyond safe metadata.

