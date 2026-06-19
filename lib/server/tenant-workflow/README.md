# Tenant workflow foundation v1

Reusable, tenant-scoped workflow runtime for operator follow-up tasks driven by `automation_events`.

## Tables

| Table | Purpose |
|-------|---------|
| `workflow_definitions` | Versioned workflow config per tenant (`workflow_key`, `trigger_event_type`, `definition_json`) |
| `workflow_runs` | One idempotent run per source automation event |
| `workflow_steps` | Operator tasks/steps within a run |

## First workflow

- **Tenant:** `living-word-mauritius`
- **Key:** `living_word_chatbot_lead_followup` v1
- **Trigger:** `chat_widget.lead.submitted`
- **Initial step:** `follow_up_contact_request` (`operator_follow_up`)

## Processing

1. **Inline (live submits):** After `emitChatWidgetSubmitted` in `lib/server/chat-widget/handlers.js`, `tryProcessAutomationEventForWorkflows` runs best-effort.
2. **Backfill:** `node scripts/process-lwm-chatbot-lead-workflows.mjs`
3. **Seed definition:** `node scripts/seed-workflow-lwm-chatbot-lead-v1.mjs`

## Operator visibility (read-only + inbox UI)

Factory master on Core host:

- `GET /api/factory/tenant-workflows/runs?tenant_id=living-word-mauritius&status=open`
- `GET /api/factory/tenant-workflows/steps?tenant_id=living-word-mauritius&status=open`
- `PATCH /api/factory/tenant-workflows/step-update` — mark step `completed` or `cancelled` (tenant-scoped)

**Operator page (admin session):** `/factory/living-word-workflows` — Living Word chatbot follow-up inbox (no outbound send).

## Rollback

- Mark runs/steps `cancelled` — do not delete `automation_events` or chat widget rows.
- Code revert + optional migration rollback per `prisma/migrations/20260620000000_tenant_workflow_foundation_v1/migration.sql` header.

## Out of scope (v1)

- External email / WhatsApp / SMS send
- Visual workflow designer
- CMP ticket creation
