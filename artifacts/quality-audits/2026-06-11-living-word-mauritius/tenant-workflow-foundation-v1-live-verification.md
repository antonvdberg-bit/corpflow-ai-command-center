# Tenant Workflow Foundation v1 — live verification

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**Demo URL:** https://living-word-mauritius.corpflowai.com/site-preview  
**PR:** [#418](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/418) (merged)  
**Commit:** `2679390f6b81238f96a07c058920ea6405ddd04d`

---

## 1. Executive summary

Tenant Workflow Foundation v1 adds **reusable, tenant-scoped workflow tables** and processes `chat_widget.lead.submitted` automation events into **idempotent workflow runs** with **operator follow-up steps**. CMP tickets were **not reused** (change-delivery model); the new tables are the correct abstraction for multi-step tenant ops.

Living Word sandbox: **8 existing lead events** backfilled into **8 open workflow runs** and **8 open operator steps**. **No outbound messages.** Widget remains **enabled=true**, flow **v3**. Cross-tenant workflow rows: **0**.

---

## 2. CMP / operator queue reuse decision

| Model | Suitable for workflow v1? | Reason |
|-------|---------------------------|--------|
| `cmp_tickets` | **No** | Change Console delivery queue; unstructured progress in `console_json`; wrong lifecycle for church lead follow-up |
| `automation_events` | **Reuse as trigger only** | Append-only event spine; already records `chat_widget.lead.submitted` |
| `leads.qualification_json` | **No** | Single-entity AI Lead Rescue pattern; not multi-workflow per tenant |
| **New `workflow_*` tables** | **Yes** | Versioned definitions, idempotent runs, inspectable steps |

---

## 3. Tables / models added

| Table | Prisma model | Purpose |
|-------|--------------|---------|
| `workflow_definitions` | `WorkflowDefinition` | Versioned workflow config per tenant |
| `workflow_runs` | `WorkflowRun` | One run per source automation event (idempotent) |
| `workflow_steps` | `WorkflowStep` | Operator tasks within a run |

Migration: `20260620000000_tenant_workflow_foundation_v1`

**Unchanged:** `chat_widget_threads`, `chat_widget_messages`, `automation_events` (existing data-recording path preserved; workflow layer is additive).

---

## 4. Workflow definition created

| Field | Value |
|-------|--------|
| Id | `lwm-wf-def-chatbot-lead-followup-v1` |
| `tenant_id` | living-word-mauritius |
| `workflow_key` | living_word_chatbot_lead_followup |
| `version` | 1 |
| `trigger_event_type` | chat_widget.lead.submitted |
| `status` | active |
| `definition_json.schema` | corpflow.workflow.definition.v1 |
| Initial step | `follow_up_contact_request` (`operator_follow_up`) |

Seed: `node scripts/seed-workflow-lwm-chatbot-lead-v1.mjs`

---

## 5. Automation events processed

All **Living Word** `chat_widget.lead.submitted` rows (8 total). Known audit events included:

| Event id | Thread id | Run id | Step id |
|----------|-----------|--------|---------|
| `cmqk6lipx003sky04jld3w1em` | `cmqk6lggx002lky0429vwvmwz` | `cmqkbalve000gxfnkff8mgpd3` | `cmqkbalve000hxfnki403ea7v` |
| `cmqka5uao003ll204ozwkcmlg` | `cmqka5rty002el2040ab91mgk` | `cmqkbapmw000mxfnkfnalfewf` | `cmqkbapmw000nxfnkm0os7gv8` |

Backfill script: `node scripts/process-lwm-chatbot-lead-workflows.mjs`

---

## 6. Workflow runs and operator steps

- **Runs created:** 8 (all `status=open`, `workflow_key=living_word_chatbot_lead_followup`, v1)
- **Steps created:** 8 (all `step_key=follow_up_contact_request`, `step_type=operator_follow_up`, `status=open`)
- **Idempotency key:** `chat-widget-lead-followup:{source_event_id}`

Example step `data_json` (event `cmqk6lipx003sky04jld3w1em`):

- `first_name`, `surname`, `full_name`, `email`, `whatsapp_or_mobile`
- `preferred_contact_method`, `recommended_channel` (whatsapp)
- `message_excerpt`, `source_host`, `source_path`, `thread_id`, `event_id`

---

## 7. Idempotency verification

Re-ran `process-lwm-chatbot-lead-workflows.mjs` — all 8 events returned **`deduped: true`**; counts unchanged (`lwm_runs: 8`, `lwm_steps: 8`).

---

## 8. Tenant isolation

| Metric | Value |
|--------|--------|
| Non-LWM `workflow_runs` | 0 |
| Non-LWM `workflow_steps` | 0 |

Processor only matches **active definitions** for the event's `tenant_id`.

---

## 9. Operator visibility (read-only)

Factory master on Core host:

```http
GET /api/factory/tenant-workflows/runs?tenant_id=living-word-mauritius&status=open
GET /api/factory/tenant-workflows/steps?tenant_id=living-word-mauritius&status=open
```

Implementation: `lib/server/tenant-workflow-api.js`  
Docs: `lib/server/tenant-workflow/README.md`

No workflow UI in v1 — API + scripts only.

---

## 10. Outbound / external checks

| Check | Result |
|-------|--------|
| Real WhatsApp sent | **No** |
| Real SMS sent | **No** |
| External email auto-sent | **No** |
| GHL / WordPress / DNS touched | **No** |
| `livingwordmauritius.com` touched | **No** |

---

## 11. Widget sandbox state

| Field | Value |
|-------|--------|
| `chat_widget_configs.enabled` | **true** (unchanged) |
| `flow_version` | **3** |
| Live GET `/site-preview` | **200** |

---

## 12. Rollback plan

1. **Code:** revert merge commit on `main` (disables inline processor on new submits).
2. **Workflow state:** `UPDATE workflow_runs SET status='cancelled' …` and `UPDATE workflow_steps SET status='skipped' …` — **do not delete** audit rows.
3. **Schema (only if necessary):** destructive SQL in migration header; prefer leaving tables empty/inactive over DROP in production.
4. **Preserve:** `chat_widget_threads`, `chat_widget_messages`, `automation_events` — never delete.

---

## 13. Future routing layer

Workflow steps expose `recommended_channel` for a future routing v1 consumer (n8n or factory cron). Join full message via `chat_widget_threads.lead_message` using `data_json.thread_id`. Still **no auto-send** until church approves.

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES (2679390f)
- Production deployment ID: GitHub Production deployment 5117948683 (Vercel Ready)
- Live URLs tested: https://living-word-mauritius.corpflowai.com/site-preview (200), https://core.corpflowai.com/api/factory/health (200)
- Expected vs actual: LWM lead events → workflow runs + operator steps; idempotent; tenant-scoped — MATCH
- Client-facing flow usable: YES (widget enabled, site-preview 200)
- Final verdict: COMPLETE
```
