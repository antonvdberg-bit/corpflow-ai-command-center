# Living Word — GoHighLevel API data inventory + sync design (v1)

**Date:** 2026-06-23  
**Tenant:** `living-word-mauritius`  
**Mode:** research / architecture / API capability audit only — **no code, no DB, no external changes**

**Goal:** Before building CorpFlow member/contact intake forms, determine what Living Word data can be pulled from GoHighLevel (GHL) via API v2, how to stage and map it, and how to import into a tenant CRM/member layer without assuming credentials or access exist today.

**Hard constraints (this packet):** no production code changes; no schema/migrations; no CorpFlow intake forms; no real GHL data import; no real secrets; no GHL configuration changes; no changes to `livingwordmauritius.com`, `www.livingwordmauritius.com`, `network.livingwordmauritius.com`, DNS, chatbot/workflow/AI behavior, Luxe/`lux_listings`, or multi-tenant operator switching.

**Sources:** Official HighLevel developer docs at [marketplace.gohighlevel.com/docs](https://marketplace.gohighlevel.com/docs/) (API v2, 2023-02-21 doc set); [Private Integrations](https://marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken/index.html); [Webhook Integration Guide](https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html); [HighLevel API support article](https://help.gohighlevel.com/support/solutions/articles/48001060529-highlevel-api-documentation) (v1 EOL 2025-12-31); prior in-repo artefacts `ghl-to-corpflow-migration-intake-workflow-design-v1.md`, `chatbot-options-assessment.md`.

**Access assumption:** **None.** This design documents capability and placeholders only. Anton or the church GHL admin must create credentials in a later, explicitly approved operator step.

---

## Executive summary

| Topic | Recommendation |
|-------|----------------|
| **Auth for one Living Word sub-account** | **Private Integration Token (PIT)** scoped to the church location — simplest, read-only scopes for Phase 0–3 |
| **OAuth 2.0** | Defer unless CorpFlow ships a Marketplace app or needs multi-location/agency-wide access |
| **First data to pull** | Location metadata → custom field definitions → tags (on contacts) → contacts (paginated search) → form definitions + submissions |
| **Defer / gate** | Conversation message bodies, notes with pastoral content, call recordings — **explicit privacy decision** |
| **Ongoing sync** | Phase 5: prefer **signed webhooks** via Marketplace OAuth app; **fallback: scheduled read-only poll** if PIT-only |
| **CorpFlow pattern** | Raw GHL JSON in **tenant-scoped staging tables** → mapping report → dry-run import → operator approval → canonical `tenant_members` |
| **Next implementation packet** | **Living Word GHL Read-Only Sync Probe v1** — counts + schema sample only, sandbox/factory, no apex changes |

---

## 1. Authentication

### 1.1 Methods (official)

HighLevel API **v2** supports two primary auth models ([Authorization overview](https://marketplace.gohighlevel.com/docs/Authorization/authorization_doc/index.html)):

| Method | What it is | Token lifetime | Best for |
|--------|------------|----------------|----------|
| **Private Integration Token (PIT)** | UI-generated bearer token with **selectable scopes** | Static until rotated in GHL UI | Internal tools, **single sub-account**, server-to-server read/sync |
| **OAuth 2.0** | Authorization code + refresh token flow | Access token ~daily refresh | Marketplace apps, **multi-location**, user-approved installs |

**Deprecated:** API v1 keys — end-of-support **2025-12-31** per HighLevel support. CorpFlow must use **v2 only**.

**Request conventions (all v2 calls):**

```http
GET https://services.leadconnectorhq.com/<resource>
Authorization: Bearer <TOKEN>
Version: 2021-07-28
Accept: application/json
Content-Type: application/json
```

Official example host: `services.leadconnectorhq.com` ([Private Integrations doc](https://marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken/index.html)).

### 1.2 Recommendation — Living Word (one sub-account)

**Use a location-scoped Private Integration Token** created in the church’s GHL sub-account (or agency admin with sub-account permission):

| Criterion | PIT | OAuth 2.0 |
|-----------|-----|-----------|
| Single church location | **Yes** | Overkill |
| No Marketplace app | **Yes** | Requires app registration |
| Scoped read-only | **Yes** — pick scopes in UI | Yes — scope list on app |
| Token rotation | Manual in GHL UI (90-day rotation recommended by vendor) | Refresh token flow |
| Webhook subscription | **Unclear for PIT alone** — see §3 webhooks | **Yes** — Marketplace app webhook config |

**OAuth 2.0** becomes appropriate if CorpFlow later offers a **reusable GHL connector** for multiple tenants from one Marketplace app.

### 1.3 Scopes / permissions (minimum for inventory + read sync)

Generate PIT with **least privilege**. Suggested **read** scopes for Phase 0–3 (exact scope names follow GHL UI labels at token creation — verify against current checklist in Settings → Private Integrations):

| Scope area | Needed for | Phase |
|------------|------------|-------|
| Locations / sub-account | Confirm `locationId`, timezone, business name | 0–1 |
| Contacts (+ search) | Contact backfill | 1–3 |
| Custom fields (location + contact) | Field mapping report | 1–2 |
| Forms (+ submissions) | Prayer/contact form history | 1–3 |
| Opportunities / pipelines | Optional lead stage context | 2 (stage only) |
| Calendars / appointments | Booking metadata (not WordPress events) | 2 (optional) |
| Tags | Via contact payloads + tag endpoints | 1 |
| Users | Assignee mapping for tasks/opportunities | 2 |
| Tasks | Operator follow-up history | 2 (metadata) |
| Notes | **Restricted** — pastoral sensitivity | 3+ only with approval |
| Conversations / messages | **Restricted** — chat/SMS/email bodies | **Do not import** without explicit decision |
| Workflows | Definition metadata only | 2 (ignore logic) |
| Webhooks | If OAuth app path | 5 |

**Do not** grant write/send scopes (SMS, email send, contact delete) until a separate implementation packet approves bidirectional sync.

### 1.4 Token storage — CorpFlow conventions (design only)

Follow existing patterns: secrets in **Vercel / operator vault only**, never client or `artifacts/`, documented in **`.env.template` placeholders** when implemented ([`SECURITY_REVIEW_CHECKLIST.md`](../../../docs/operations/SECURITY_REVIEW_CHECKLIST.md) §4).

**Phase 1 probe (single tenant):**

| Placeholder env var | Purpose |
|---------------------|---------|
| `CORPFLOW_GHL_LIVING_WORD_MAURITIUS_LOCATION_ID` | GHL sub-account id (non-secret identifier) |
| `CORPFLOW_GHL_LIVING_WORD_MAURITIUS_PIT` | Private Integration bearer token — **factory/cron only** |

**Longer-term (multi-tenant):** prefer a `tenant_ghl_connections` table (design) with `tenant_id`, `ghl_location_id`, `token_ciphertext` or external secret reference, `scopes_json`, `last_rotated_at`, `enabled` — **not** per-tenant env vars on Vercel. Factory master APIs gate read/write; tokens never returned in API responses.

**Rotation:** Operator rotates in GHL UI → update Vercel/Infisical → run probe script → log `ghl_sync_runs` success. Compromise: rotate immediately per vendor “expire now” flow.

**Logging:** Log `sync_run_id`, `ghl_location_id`, HTTP status, rate-limit headers — **never** log token or full contact payloads in application logs.

---

## 2. Data domain inventory

**Legend — import posture:**

| Posture | Meaning |
|---------|---------|
| **Import now** | Target Phase 1–3 backfill into staging, then canonical members |
| **Stage only** | Pull raw JSON for mapping report; defer canonical import |
| **Ignore** | Out of scope or duplicate of CorpFlow-native data |
| **Gate** | Requires explicit privacy/owner decision |

**Base URL:** `https://services.leadconnectorhq.com`  
**Pagination:** Most list endpoints use cursor/`startAfter`/`limit` — implement cursor resume in `ghl_sync_runs.checkpoint_json` (implementation packet).

### 2.1 Domain matrix

| Domain | API category / endpoints (v2) | Data available (per docs) | Import posture | Privacy risk | CorpFlow mapping target | Webhook ongoing? | One-time backfill? | Limitations / unknowns |
|--------|------------------------------|---------------------------|----------------|--------------|-------------------------|------------------|-------------------|------------------------|
| **Location / sub-account** | `GET /locations/:locationId` ([Get Sub-Account](https://marketplace.gohighlevel.com/docs/ghl/locations/get-location/index.html)) | Name, address, timezone, settings flags | **Stage only** (Phase 0) | Low | `ghl_location_id` on sync rows; tenant config validation | `LocationCreate` / `LocationUpdate` ([webhook guide](https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html)) | Single GET | Need owner to confirm `locationId` from GHL UI |
| **Contacts** | `POST /contacts/search` ([Search Contacts](https://marketplace.gohighlevel.com/docs/ghl/contacts/search/index.html)); `GET /contacts/:id`; `POST /contacts/upsert` (write — defer) | Name, email, phone, address, tags, custom fields, source, dateAdded | **Import now** (staging → members) | **Medium** — PII | `ghl_raw_contacts` → `tenant_members` + `tenant_member_identities` | `ContactCreate`, `ContactUpdate`, `ContactDelete`, tag change events | Yes — search pagination | `GET /contacts/` list is **deprecated** — use search only |
| **Custom fields** | Location custom fields + contact field definitions (Contacts API custom field group; `GET` location custom-field endpoints per docs index) | Field id, key, name, type, options | **Stage only** → mapping report | Low–medium if field labels reveal pastoral categories | `ghl_raw_custom_fields` → mapping manifest | Unknown for definition changes | Yes | Exact path varies by object type — probe packet must enumerate |
| **Tags** | `POST` add tags / `DELETE` remove ([Tags API](https://marketplace.gohighlevel.com/docs/ghl/contacts/tags/index.html)); also on contact record | Tag strings | **Import now** (via contacts) | Low–medium | `tenant_member_tags` / `tenant_member_interests` | Contact tag change webhooks | Via contact export | PUT contact **replaces** entire tag array — merge carefully on any write-back |
| **Forms** | `GET` forms ([Forms API](https://marketplace.gohighlevel.com/docs/ghl/forms/forms/index.html)) | Form id, name, fields | **Stage only** | Low | `ghl_raw_forms` → `form_key` mapping | Unknown | Yes | Map to CorpFlow `tenant_intake_configs` later |
| **Form submissions** | `GET` forms submissions ([Get Forms Submissions](https://marketplace.gohighlevel.com/docs/ghl/forms/forms/index.html)) | Submitted field values, contact link, timestamps | **Import now** (raw evidence) | **Medium–high** — prayer/free text | `ghl_raw_form_submissions` → `tenant_form_submissions` | Unknown — verify with probe | Yes | Field shape per form; need per-form mapping table |
| **Surveys** | Surveys API (docs index — verify in probe) | Survey responses | **Stage only** | Medium | Same as form submissions | Unknown | Likely | **Unknown** until probe — may overlap forms |
| **Funnels / pages** | Funnels section partial ([knowledge-base](https://marketplace.gohighlevel.com/docs/ghl/knowledge-base/update-knowledge-base/) separate) | Redirects, funnel metadata | **Ignore** v1 | Low | N/A — WordPress remains canonical for public pages | Unlikely needed | No | 404 on some funnel doc paths — low value for church CRM |
| **Chat widget / conversations** | Conversations API ([Conversations](https://marketplace.gohighlevel.com/docs/ghl/conversations/conversations/index.html)); Messages ([Messages](https://marketplace.gohighlevel.com/docs/ghl/conversations/messages/index.html)) | Threads, SMS/email/chat bodies, attachments | **Gate** — default **do not import** | **High** — pastoral, counselling | Archive JSON in staging **only if approved** | Conversation events exist | Yes — export messages by location | CorpFlow sandbox chat is separate system — do not merge blindly |
| **Opportunities / pipelines** | Opportunities CRUD ([Opportunities](https://marketplace.gohighlevel.com/docs/ghl/opportunities/opportunities/index.html)); `GET` pipelines ([Pipelines](https://marketplace.gohighlevel.com/docs/ghl/opportunities/pipelines/index.html)) | Deal stage, value, contact link | **Stage only** | Medium | `ghl_raw_opportunities` → simplify to `workflow_run.status` | Opportunity lifecycle webhooks | Yes | Church may not use pipelines heavily — inventory first |
| **Calendars** | Calendars API ([Calendars](https://marketplace.gohighlevel.com/docs/ghl/calendars/calendars/index.html)) | Calendar id, name, staff | **Stage only** | Low | Reference for appointments | Appointment webhooks | Yes | Not the same as WordPress Modern Events Calendar |
| **Appointments** | Appointments under Calendars API (docs index) | Scheduled slots, contact, status | **Stage only** | Medium | Link to `tenant_schedule_entries` only after manual review | Appointment events | Yes | **Unknown** slot fields until probe |
| **Tasks** | Contacts → Tasks API (docs index) | Title, due date, assignee, completed | **Stage only** | Low–medium | Map to `workflow_steps` metadata or ignore | Task webhooks | Yes | Historical tasks optional |
| **Notes** | Notes API ([Notes](https://marketplace.gohighlevel.com/docs/ghl/contacts/notes/index.html)) | Free-text notes on contact | **Gate** — default **stage only, no canonical** | **High** — pastoral | `ghl_raw_notes` encrypted operator-only | Unknown | Yes | Do not surface to AI retrieval |
| **Workflows** | `GET` workflow ([Workflows](https://marketplace.gohighlevel.com/docs/ghl/workflows/workflows/index.html)) | Workflow name, id — not full graph via API | **Ignore** logic | Low | Rebuild in `workflow_definitions` manually | N/A | Partial metadata | Cannot import GHL automation graph — rebuild in CorpFlow |
| **Users** | Users API ([Users](https://marketplace.gohighlevel.com/docs/ghl/users/users/index.html)); `GET /users/search` | Staff name, email, role | **Stage only** | Low | Operator assignee map | User events | Yes | For assignee display only — not church members |
| **Webhooks** | Marketplace OAuth app + [Webhook Guide](https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html) | Event delivery to CorpFlow | **Phase 5** | Medium | `automation_events` ingest | N/A | N/A | Verify `X-GHL-Signature` (Ed25519); legacy `X-WH-Signature` deprecated **2026-07-01** |
| **Knowledge base** | `PUT /knowledge-bases/:id`, crawler train endpoints | GHL AI KB articles | **Ignore** for CRM v1 | Medium | CorpFlow uses `tenant_knowledge_atoms` — separate corpus | Unknown | Maybe | Do not auto-merge into approved atoms without review |

---

## 3. Per-domain notes (import usefulness)

### Contacts (highest priority)

- **Search** supports advanced filters ([Search Contacts](https://marketplace.gohighlevel.com/docs/ghl/contacts/search/index.html)) — use for paginated backfill instead of deprecated `GET /contacts/`.
- **Upsert** respects location “Allow Duplicate Contact” setting ([Upsert Contact](https://marketplace.gohighlevel.com/docs/ghl/contacts/contacts/index.html)) — important for dedupe alignment with GHL.
- **Duplicate lookup:** `GET` duplicate contact endpoint documents email-first vs phone-first priority when duplicates disallowed.

### Forms + submissions

- Submissions are the closest GHL equivalent to future `tenant_form_submissions` — preserve **immutable** `raw_json` plus `source_channel=ghl_form`.
- Upload-to-custom-field endpoint on Forms API supports files (PDF/images) — store file URLs in staging; **do not** pull binary into Postgres without size/policy review.

### Conversations (explicit gate)

Default policy: **import contact record + tags + form submissions; do not import message bodies** into CorpFlow tables accessible to AI or tenant marketing surfaces. If church requests history migration, limit to **encrypted archive** with factory-master-only access and exclude from `tenant_knowledge_atoms` and retrieval AI context.

### Workflows

Treat GHL workflows as **reference documentation** for rebuilding CorpFlow `workflow_definitions` — not machine-importable. Operator workshop maps “prayer follow-up” → `tenant.intake.submitted` + steps.

---

## 4. Recommended CorpFlow staging design

**Design-only tables** — additive to Postgres when implementation is approved. All rows **tenant-scoped**.

### 4.1 `ghl_sync_runs`

| Column | Purpose |
|--------|---------|
| `id` | UUID |
| `tenant_id` | `living-word-mauritius` |
| `ghl_location_id` | Sub-account id |
| `sync_type` | `probe`, `full_backfill`, `incremental`, `webhook_batch` |
| `domain` | `contacts`, `forms`, `all`, … |
| `status` | `running`, `completed`, `failed`, `partial` |
| `started_at`, `finished_at` | Timing |
| `checkpoint_json` | Cursor, page token, last `ghl_object_id` |
| `stats_json` | `{ "fetched": N, "errors": M, "skipped": K }` |
| `error_json` | Top-level failure |
| `triggered_by` | `factory_cron`, `factory_manual`, `webhook` |

### 4.2 `ghl_raw_*` tables (shared row shape)

Proposed tables:

- `ghl_raw_contacts`
- `ghl_raw_custom_fields`
- `ghl_raw_tags` (optional — may denormalize from contacts)
- `ghl_raw_forms`
- `ghl_raw_form_submissions`
- `ghl_raw_opportunities`
- `ghl_raw_calendars`
- `ghl_raw_appointments`
- `ghl_raw_workflows`
- `ghl_raw_tasks`
- `ghl_raw_notes`

**Shared columns (every staging row):**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Surrogate key |
| `tenant_id` | string | Tenant isolation |
| `ghl_location_id` | string | Sub-account |
| `ghl_object_type` | string | e.g. `contact`, `form_submission` |
| `ghl_object_id` | string | Vendor id |
| `raw_json` | JSONB | Unmodified API payload |
| `source_hash` | string | SHA-256 of canonical JSON — change detection |
| `pulled_at` | timestamptz | Ingest time |
| `sync_run_id` | UUID FK | → `ghl_sync_runs` |
| `mapping_status` | enum | `pending`, `mapped`, `skipped`, `conflict`, `error` |
| `error_json` | JSONB nullable | Parse/validation errors |

**Indexes (implementation):**

- Unique `(tenant_id, ghl_object_type, ghl_object_id)` — latest row wins or version column if history needed
- `(tenant_id, mapping_status)` for operator queues
- `(sync_run_id)` for audit

**Event spine (optional):** emit `automation_events` `ghl.sync.run.completed.v1` with counts only — no PII in payload ([`automation-framework.md`](../../../docs/automation-framework.md)).

---

## 5. Recommended canonical model (CorpFlow)

Extends §5 of [`ghl-to-corpflow-migration-intake-workflow-design-v1.md`](./ghl-to-corpflow-migration-intake-workflow-design-v1.md). GHL is **one source** among `chat_widget`, `embed_form`, `ghl_import`.

### 5.1 Core tables

| Table | Role | Key GHL mappings |
|-------|------|------------------|
| `tenant_members` | Deduped person | `firstName`/`lastName`, `email`, `phone`, `ghl_contact_id`, `onboarding_status` |
| `tenant_member_identities` | Extra emails/phones | GHL alternate fields if present |
| `tenant_member_source_links` | Lineage | `{ "source": "ghl", "ghl_contact_id", "ghl_location_id", "imported_at", "sync_run_id" }` |
| `tenant_form_submissions` | Immutable evidence | GHL form submissions + future CorpFlow forms |
| `tenant_member_tags` | Segmentation | GHL tags → tags or interest flags |
| `tenant_member_interests` | wordgroup, volunteer, youth_parent, event_rsvp | From tags + custom fields + forms |
| `tenant_member_consents` | GDPR-style | `sms_opt_in`, `email_opt_in` from GHL DND/marketing fields — **verify field names in probe** |
| `tenant_member_workflow_links` | Join to `workflow_runs` | New intakes only — not historical GHL automations |

### 5.2 Field mapping (initial hypotheses — confirm in Phase 2)

| GHL (typical) | CorpFlow `tenant_members` |
|---------------|---------------------------|
| `id` | `ghl_contact_id` + `tenant_member_source_links` |
| `firstName`, `lastName` | `first_name`, `surname` |
| `email`, `phone` | `primary_email`, `primary_phone` (normalized) |
| `tags[]` | `tenant_member_tags` + interest inference rules |
| `customFields[]` | Mapped per `ghl_raw_custom_fields` manifest |
| `source` | `consent_source` / provenance metadata |
| `dateAdded` | `created_at` floor (do not overwrite newer CorpFlow edits) |

### 5.3 Do not auto-map to knowledge atoms

GHL custom values, notes, conversation exports, and crawled KB **must not** flow into `tenant_knowledge_atoms` without church approval ([`public-website-knowledge-intake-design.md`](./public-website-knowledge-intake-design.md)).

---

## 6. Deduplication strategy

### 6.1 Within GHL (vendor)

- Location setting **Allow Duplicate Contact** controls upsert/search priority ([Upsert](https://marketplace.gohighlevel.com/docs/ghl/contacts/contacts/index.html), [Get Duplicate](https://marketplace.gohighlevel.com/docs/ghl/contacts/search/index.html)).
- Probe packet must record this setting — CorpFlow dry-run should mirror the same priority (email-first vs phone-first).

### 6.2 GHL → CorpFlow

| Step | Rule |
|------|------|
| 1. Primary match | `ghl_contact_id` on `tenant_member_source_links` |
| 2. Secondary match | Normalized `primary_email` (lowercase trim) |
| 3. Tertiary match | E.164 `primary_phone` |
| 4. Conflict | Same email, different GHL ids → `mapping_status=conflict`, operator queue |
| 5. Merge | Set `merged_into_member_id`; retain all `tenant_member_source_links` |

### 6.3 Avoid blank overwrites

**Last-writer-wins is forbidden** for canonical members.

| Rule | Behavior |
|------|----------|
| Empty GHL field | Skip — do not null CorpFlow value |
| CorpFlow `updated_at` newer than sync | Skip field unless operator approves |
| Sandbox chatbot lead exists | Merge into same member if email/phone match; keep both submission records |
| Tags | Union merge on import; document in mapping report |
| Custom fields | Map only vetted keys; unknown keys stay in `raw_json` staging only |

### 6.4 Operator review queue

Factory view (future): `mapping_status=conflict` with side-by-side GHL vs CorpFlow snapshot — no auto-merge.

---

## 7. Migration phases

Aligned with [`ghl-to-corpflow-migration-intake-workflow-design-v1.md`](./ghl-to-corpflow-migration-intake-workflow-design-v1.md) but **API-first** before intake forms.

| Phase | Name | Scope | Exit criteria |
|-------|------|-------|---------------|
| **0** | API capability + field inventory | PIT created by owner; probe script; counts + custom field manifest | This design + probe artifact; owner signs field list |
| **1** | Read-only GHL sync → staging | Pull contacts, forms, submissions, tags, custom field defs | `ghl_sync_runs` completed; raw rows in staging |
| **2** | Field mapping report | CSV/MD: GHL field → CorpFlow column; sensitivity flags | Anton + church admin approve mappings |
| **3** | Dry-run import | Transform staging → `tenant_members` in **sandbox** or flagged rows | No production member writes; diff report |
| **4** | Operator review + approval | Resolve conflicts; merge duplicates | Sign-off before canonical promotion |
| **5** | Webhook ongoing sync | OAuth app or approved poll cron | Verified signature; idempotent ingest |
| **6** | Replace selected GHL forms/workflows | CorpFlow intake + workflows for prayer/contact | Parity checklist; GHL forms disabled selectively |
| **7** | Owner-approved public cutover | Apex embed; retire LeadConnector script | Live URL verification per delivery-reality |

**Current position:** Phase **0** (this document). CorpFlow sandbox has chatbot/workflow/knowledge — **no GHL API connection yet**.

---

## 8. Security and privacy

| Topic | Control |
|-------|---------|
| **Sensitive conversations** | Default **no import** of prayer/counselling/SMS bodies; gate with written church decision |
| **Children / youth** | No child PII in canonical members; age band only; youth data stays in submissions with restricted access |
| **Consent** | Map GHL marketing/DND flags to `tenant_member_consents`; do not enable outbound until Phase 5+ with approval |
| **Audit trail** | `ghl_sync_runs` + `automation_events` counts; member upserts → `tenant.member.upserted` (future) |
| **Token handling** | Vercel/Infisical only; factory cron auth; rotate 90 days |
| **Webhook verification** | Prefer `X-GHL-Signature` Ed25519; reject unsigned; idempotent `webhookId` ([webhook guide](https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html)) |
| **Rate limits** | **100 requests / 10 seconds / location** burst; **~200k/day** — honor `X-RateLimit-*` headers; exponential backoff on 429 |
| **Retries** | Idempotent staging upsert by `(tenant_id, ghl_object_type, ghl_object_id)`; resume from `checkpoint_json` |
| **Rollback** | Disable sync cron + webhook; staging rows remain; canonical import reversible only before cutover — prefer `status=inactive` over delete |
| **SSRF** | GHL client allowlists host `services.leadconnectorhq.com` only |
| **Data map** | Update [`DATA_MAP_AND_SUBPROCESSORS.md`](../../../docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md) before production import |

---

## 9. Recommended next implementation packet

### **Living Word GHL Read-Only Sync Probe v1**

| Attribute | Value |
|-----------|--------|
| **Goal** | Prove API access and produce **counts + sample schemas** without canonical import |
| **Environment** | Factory script + sandbox tenant context only |
| **Gates** | Owner creates PIT with read scopes; Anton adds placeholders to Vercel **factory** env |
| **Allowed** | `GET /locations/:id`; custom field list; `POST /contacts/search` with `limit=5`; form list; submission count if API supports |
| **Forbidden** | Write to GHL; import to `tenant_members`; apex/DNS/GHL UI changes; conversation message download |
| **Outputs** | Verification MD under `artifacts/quality-audits/2026-06-11-living-word-mauritius/`; optional JSON samples with **redacted PII** |
| **DoD** | `ghl_sync_runs` row or standalone report with: location name match, contact count estimate, custom field inventory, form list, rate-limit observation, auth rotation notes |

**Explicitly after probe:** Phase 1 staging tables migration packet (separate approval).

**Relationship to Member/Contact Intake Foundation v1:** Intake foundation can proceed in parallel on sandbox **without** GHL data; probe informs mapping before Phase 3 dry-run import.

---

## 10. API rate limits and client behavior (implementation guidance)

Per vendor/community documentation aligned with HighLevel v2 OAuth limits:

| Limit | Value |
|-------|-------|
| Burst | ~100 requests per 10 seconds per location |
| Daily | ~200,000 requests per day per location |
| Response headers | `X-RateLimit-Remaining`, `X-RateLimit-Daily-Remaining`, `X-RateLimit-Max`, `X-RateLimit-Interval-Milliseconds` |

**Client rules:**

1. Sequential pagination with ~100–150ms delay between pages.
2. On `429`, exponential backoff + resume checkpoint.
3. Cache custom field definitions for entire run (single fetch).
4. Probe v1 uses minimal calls (&lt;20) to validate auth.

---

## 11. Open unknowns (resolve in probe v1)

| Unknown | Resolution |
|---------|------------|
| Exact Living Word `locationId` | Owner reads from GHL sub-account settings |
| PIT scope label names at token creation | Screenshot checklist in probe artifact |
| Webhooks without Marketplace OAuth app | Test whether sub-account supports workflow outbound webhooks only |
| Survey API coverage | Hit docs index + one GET in probe |
| GHL plan tier (API access) | Owner confirms Agency Pro / Advanced API if needed |
| Which forms map to prayer vs contact | Owner labels + submission field scan |
| `Allow Duplicate Contact` setting | `GET /locations/:id` or UI screenshot |
| Formidable vs GHL form overlap | WordPress inventory — separate from API |

---

## Verification (this packet)

| Check | Result |
|-------|:------:|
| Design-only — no code changes | ✓ |
| No DB/schema/migrations | ✓ |
| No real GHL data import | ✓ |
| No secrets requested or stored | ✓ |
| No external site / GHL / DNS changes | ✓ |
| Official API docs referenced | ✓ |
| Staging + canonical + dedupe + phases documented | ✓ |
| Next packet named | ✓ |

**Delivery state:** **COMPLETE** (design artifact only — no production deployment).

---

## References (in-repo)

- [`ghl-to-corpflow-migration-intake-workflow-design-v1.md`](./ghl-to-corpflow-migration-intake-workflow-design-v1.md)
- [`chatbot-options-assessment.md`](./chatbot-options-assessment.md)
- [`public-website-knowledge-intake-design.md`](./public-website-knowledge-intake-design.md)
- [`docs/automation-framework.md`](../../../docs/automation-framework.md)
- [`docs/operations/SECURITY_REVIEW_CHECKLIST.md`](../../../docs/operations/SECURITY_REVIEW_CHECKLIST.md)
- [`lib/server/tenant-workflow/README.md`](../../../lib/server/tenant-workflow/README.md)

## References (external)

- [HighLevel API docs](https://marketplace.gohighlevel.com/docs/)
- [Private Integrations](https://marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken/index.html)
- [Webhook Integration Guide](https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html)
- [HighLevel API support — v1 EOL](https://help.gohighlevel.com/support/solutions/articles/48001060529-highlevel-api-documentation)
