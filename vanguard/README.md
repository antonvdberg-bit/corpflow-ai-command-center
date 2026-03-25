# Vanguard — CMP audit trail (repository)

This tree holds the **durable technical record** for CorpFlow Change Management: structured JSON, optional Markdown mirrors, and policy rubrics. **Baserow** remains the system of record for workflow state; Vanguard is the immutable **what / why / how** history alongside the code.

## Layout

| Path | Purpose |
|------|---------|
| `schema/` | Versioned JSON Schemas for payloads written under `audit-trail/`. |
| `audit-trail/{ticket_id}/` | Per-ticket artifacts (created by automation after Phase 1). |
| `policies/` | Optional encoded rubrics (e.g. costing); add when promoted from CMP. |

## Rules

1. **Full market value** in dollars must always be stored in cost artifacts, even when `is_demo` is true.
2. **Never** put secrets, tokens, or raw PII in committed files; use IDs and redacted summaries.
3. Narrative sign-off documents also live under `docs/audit-trail/{client_id}/{ticket_id}.md` (separate from this folder).

## Related

- API orchestration: `api/cmp/`
- CRM: `https://crm.corpflowai.com` (Baserow)
