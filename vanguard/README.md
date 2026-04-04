# Vanguard — CMP audit trail (repository)

This tree holds the **durable technical record** for CorpFlow Change Management: structured JSON, optional Markdown mirrors, and policy rubrics. **Operational workflow state** for CMP lives in **Postgres** (`cmp_tickets`, `tenants`, …); Vanguard is the immutable **what / why / how** history alongside the code.

## Layout

| Path | Purpose |
|------|---------|
| `schema/` | Versioned JSON Schemas for payloads written under `audit-trail/`. |
| `audit-trail/*.jsonl` | **Local-only** append-only sinks (`telemetry-v1.jsonl`, `token_debits.jsonl`, …). Written by `lib/cmp/_lib/telemetry.js` and similar at runtime — **gitignored**; do not commit. |
| `audit-trail/{ticket_id}/` | Per-ticket artifacts (created by automation after Phase 1). |
| `policies/` | Optional encoded rubrics (e.g. costing); add when promoted from CMP. |

## Rules

1. **Full market value** in dollars must always be stored in cost artifacts, even when `is_demo` is true.
2. **Never** put secrets, tokens, or raw PII in committed files; use IDs and redacted summaries. **Never** commit `*.jsonl` under `audit-trail/` (operational logs, not product source).
3. Narrative sign-off documents also live under `docs/audit-trail/{client_id}/{ticket_id}.md` (separate from this folder).

## Related

- API orchestration: `api/factory_router.js` → `lib/cmp/router.js`
- Primary datastore: Postgres via Prisma (`prisma/schema.prisma`)
