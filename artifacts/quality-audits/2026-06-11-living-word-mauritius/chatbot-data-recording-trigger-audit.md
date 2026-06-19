# Living Word chatbot — data recording and trigger-marker audit

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**Demo URL:** https://living-word-mauritius.corpflowai.com/site-preview  
**Flow version:** 3  
**Mode:** read-only audit + one safe reproducibility test lead. No code, schema, migration, or widget-state changes.

---

## 1. Executive summary

When a user completes a **contact** submission through the Living Word guided chatbot, CorpFlow records data in **three Postgres tables**:

1. **`chat_widget_threads`** — session + lead snapshot (canonical full message, all contact fields).
2. **`chat_widget_messages`** — append-only step transcript (bot prompts + user inputs).
3. **`automation_events`** — one **trigger marker** row per submission (`event_type = chat_widget.lead.submitted`).

There is **no** `cmp_tickets` row, **no** outbound email, and **no** GHL/WhatsApp send in v0. The automation event is the routing hook for a future operator queue / n8n / ticketing layer.

All inspected rows are **tenant-scoped** to `living-word-mauritius`. Cross-tenant counts were **0 before and after** the audit test lead.

**Widget state:** `chat_widget_configs.enabled = true` before and after (unchanged).

---

## 2. Tables inspected

| Table | Role on submit |
|-------|----------------|
| `chat_widget_threads` | Created on `/start`; lead fields updated on each `/step`; `notified_at` set after automation event |
| `chat_widget_messages` | One row per bot prompt and user response (full transcript) |
| `chat_widget_configs` | Config only (`enabled`, `flow_version`, `notify_via`); counter `messages_this_month` incremented |
| `automation_events` | **Trigger marker** — append-only event spine row |
| `chat_widget_rate_limits` | Rate-limit counters only (not lead data) |

**Not written on submit (v0):** `cmp_tickets`, outbound email, external CRM/GHL.

**Secondary internal signal:** `recordTrustedAutomationEvent` also emits a `telemetry_events` row (`event_type: automation.internal`) — operator observability only, not the lead payload.

---

## 3. Latest known lead event evidence

From contact UX v0.1 verification (2026-06-19):

| Field | Value |
|-------|--------|
| Thread id | `cmqk6lggx002lky0429vwvmwz` |
| Automation event id | `cmqk6lipx003sky04jld3w1em` |
| Message count | 19 |
| `notified_at` | 2026-06-19T00:19:16.136Z |
| `notify_error` | null |
| `ticket_id` | null |

**Thread row (`chat_widget_threads`):**

| Column | Value |
|--------|--------|
| `tenant_id` | living-word-mauritius |
| `source_host` | living-word-mauritius.corpflowai.com |
| `source_path` | /site-preview |
| `lead_name` (first name) | Sandbox |
| `lead_surname` | ContactUX |
| `lead_email` | contact.ux.v01@corpflow-test.invalid |
| `lead_phone` (WhatsApp/mobile) | +230 5000 0101 |
| `preferred_contact_method` | whatsapp |
| `request_type` | contact |
| `lead_message` (full) | CorpFlow contact UX v0.1 safe test lead — safe to ignore. |
| `status` | active (post-submit UX v0.1 keeps thread active for menu) |
| `flow_version` | 3 |

**Automation event row:**

| Column | Value |
|--------|--------|
| `event_type` | chat_widget.lead.submitted |
| `source` | chat-widget |
| `tenant_id` | living-word-mauritius |
| `tenant_scope` | living-word-mauritius |
| `idempotency_key` | chat-widget-thread:cmqk6lggx002lky0429vwvmwz |
| `risk_tier` | low |
| `status` | accepted |
| `occurred_at` | 2026-06-19T00:19:16.101Z |
| `correlation_id` | null |

**Payload schema:** `corpflow.chat_widget.lead.submitted.v1` (top-level `schema` field inside `payload_json`).

**Payload `lead` block (verified):**

```json
{
  "name": "Sandbox ContactUX",
  "first_name": "Sandbox",
  "surname": "ContactUX",
  "email": "contact.ux.v01@corpflow-test.invalid",
  "phone": "+230 5000 0101",
  "whatsapp_or_mobile": "+230 5000 0101",
  "preferred_contact_method": "whatsapp",
  "request_type": "contact",
  "message_excerpt": "CorpFlow contact UX v0.1 safe test lead — safe to ignore."
}
```

**Payload `origin` block:**

```json
{
  "source_host": "living-word-mauritius.corpflowai.com",
  "source_path": "/site-preview"
}
```

**Note:** Full message is **not** duplicated in the automation payload — only `message_excerpt` (max 280 chars). Full text lives on `chat_widget_threads.lead_message` and in `chat_widget_messages`.

---

## 4. New safe test lead evidence (reproducibility)

Submitted 2026-06-19 via live `/api/chat-widget/*` on the sandbox host:

| Field | Value |
|-------|--------|
| First name | CorpFlow |
| Surname | Data Audit |
| Email | sandbox.data.audit@corpflow-test.invalid |
| WhatsApp/mobile | +230 5000 0202 |
| Preferred method | WhatsApp |
| Message | Data recording audit test — safe to ignore |

| Result | Value |
|--------|--------|
| Thread id | `cmqka5rty002el2040ab91mgk` |
| Message count | 17 |
| Automation event id | `cmqka5uao003ll204ozwkcmlg` |
| Event type | chat_widget.lead.submitted |
| Idempotency key | chat-widget-thread:cmqka5rty002el2040ab91mgk |
| Payload schema | corpflow.chat_widget.lead.submitted.v1 |
| `notified_at` | 2026-06-19T01:59:03.110Z |

Payload lead block matched thread row field-for-field (including `whatsapp_or_mobile` and `preferred_contact_method: whatsapp`).

---

## 5. Field-by-field storage map

| Logical field | `chat_widget_threads` | `chat_widget_messages` | `automation_events.payload` |
|---------------|----------------------|------------------------|----------------------------|
| first_name | `lead_name` | user step at `contact-first-name` | `lead.first_name` |
| surname | `lead_surname` | user step at `contact-surname` | `lead.surname` |
| full name | derived (`lead_name` + `lead_surname`) | — | `lead.name` (combined) |
| email | `lead_email` | user step at `contact-email` | `lead.email` |
| whatsapp_or_mobile | `lead_phone` | user step at `contact-whatsapp` | `lead.whatsapp_or_mobile` + `lead.phone` |
| preferred_contact_method | `preferred_contact_method` | user menu label at `contact-preferred-method` | `lead.preferred_contact_method` |
| message (full) | `lead_message` | user step at `contact-message` | **not full** — `lead.message_excerpt` only |
| request type | `request_type` | — | `lead.request_type` |
| tenant_id | `tenant_id` | `tenant_id` on each message | `tenant_id` (payload) + row `tenant_id` |
| source_host | `source_host` | — | `origin.source_host` |
| source_path | `source_path` | — | `origin.source_path` |
| thread_id | `id` (PK) | `thread_id` (FK) | `thread_id` (payload) |

---

## 6. Trigger / action marker map

| Marker | When | Type / key | Purpose today |
|--------|------|------------|---------------|
| **`automation_events` row** | On submit node | `event_type = chat_widget.lead.submitted` | Canonical trigger for downstream routing |
| **Idempotency** | Same thread resubmit blocked | `idempotency_key = chat-widget-thread:{thread_id}` | Dedupes retries |
| **Payload schema** | Inside JSON | `corpflow.chat_widget.lead.submitted.v1` | Versioned contract for consumers |
| **Source** | Row column | `source = chat-widget` | Provenance |
| **Risk tier** | Row column | `low` | Automation spine classification |
| **Thread notification** | Thread columns | `notified_at` / `notify_error` | Confirms event write succeeded |
| **Telemetry (internal)** | Side effect | `telemetry_events` `automation.internal` | Factory observability only |
| **n8n forward envelope** | Optional async | `corpflow.automation.envelope.v1` | May forward if env configured — not verified in this audit |

**Not present:** CMP ticket creation, email send, WhatsApp API call, GHL webhook.

---

## 7. Reproducibility steps

1. Open https://living-word-mauritius.corpflowai.com/site-preview (widget enabled).
2. Chat → **Contact the church** → complete all fields → submit.
3. Query Postgres:
   - `SELECT * FROM chat_widget_threads WHERE id = '<thread_id>';`
   - `SELECT COUNT(*) FROM chat_widget_messages WHERE thread_id = '<thread_id>';`
   - `SELECT * FROM automation_events WHERE idempotency_key = 'chat-widget-thread:<thread_id>';`
4. Confirm payload `schema`, `lead.*`, and `origin.*` fields.

Or run the contact path via API (same as audit script): `POST /api/chat-widget/start` then `/step` through contact flow.

---

## 8. Cross-tenant verification

| Metric | Before audit test | After audit test |
|--------|-------------------|------------------|
| Non-LWM `chat_widget_threads` | 0 | 0 |
| Non-LWM `chat_widget_messages` | 0 | 0 |
| Non-LWM `chat_widget.lead.submitted` events | 0 | 0 |

All new rows from the audit test lead carry `tenant_id = living-word-mauritius`.

---

## 9. Current gaps

| Gap | Impact |
|-----|--------|
| **No CMP ticket** | Operators cannot action leads in Change Console yet |
| **No email / WhatsApp send** | `notify_via = automation_event` only; `notify_email` unset |
| **Message truncated in event** | Routing on full message requires joining `chat_widget_threads` |
| **No operator queue UI** | Events exist but no dedicated inbox for church staff |
| **n8n routing not verified** | Forward depends on `CORPFLOW_AUTOMATION_FORWARD_*` env — not tested here |
| **Prayer / youth / volunteer paths** | Same tables + same event type; `request_type` differs |

---

## 10. Recommendation for next routing layer

**Suggested next packet (routing v1, still sandbox-only until approved):**

1. **Consumer** — n8n workflow (or factory cron) subscribed to `automation_events` where `event_type = chat_widget.lead.submitted` AND `tenant_id = living-word-mauritius`.
2. **Join rule** — always fetch full message from `chat_widget_threads.lead_message` by `payload.thread_id`.
3. **Route by** `lead.preferred_contact_method`:
   - `email` → operator email draft (not auto-send until church approves)
   - `whatsapp` → manual queue row / future WhatsApp Business API (not GHL)
   - `phone_call` / `sms` → operator task with `whatsapp_or_mobile`
4. **Optional** — create `cmp_tickets` behind feature flag for operator visibility on `/change`.
5. **Do not** widen to external WordPress or GHL until owner sign-off.

---

## Answers to audit questions (quick reference)

| # | Question | Answer |
|---|----------|--------|
| 1 | Which tables? | `chat_widget_threads`, `chat_widget_messages`, `automation_events` |
| 2 | Field storage | See §5 map |
| 3 | Automation marker? | Yes — `automation_events` |
| 4 | Marker type | `chat_widget.lead.submitted` |
| 5 | Idempotency key? | `chat-widget-thread:{thread_id}` |
| 6 | Payload schema? | `corpflow.chat_widget.lead.submitted.v1` |
| 7 | Reproducible? | Yes — new test lead `cmqka5rty002el2040ab91mgk` |
| 8 | Tenant-scoped? | Yes |
| 9 | Non-LWM rows from test? | No |
| 10 | Sufficient for future routing? | **Partially** — event + thread join is enough for queue/ticketing design; not sufficient alone for automated email/WhatsApp without next layer |

---

## Delivery note

This packet is **audit-only**. No application code, schema, migrations, widget state, or external systems were modified. One safe test lead was submitted to prove reproducibility.
