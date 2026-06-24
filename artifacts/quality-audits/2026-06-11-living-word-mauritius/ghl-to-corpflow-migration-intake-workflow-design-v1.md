# Living Word — GHL-to-CorpFlow migration + intake workflow design (v1)

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**Mode:** research / architecture / migration design only — **no code, no DB, no external changes**

This document answers Anton’s five questions and defines a safe path from GoHighLevel (GHL) / LeadConnector to CorpFlow-hosted intake, member records, and operator workflows — building on the Living Word sandbox already live on CorpFlow.

**Hard constraints (this packet):** no changes to `livingwordmauritius.com`, `www.livingwordmauritius.com`, `network.livingwordmauritius.com`, GHL configuration, DNS, chatbot enabled state, workflow ingestion code, or outbound messaging.

---

## Executive answers (Anton’s five questions)

| # | Question | Short answer |
|---|----------|--------------|
| 1 | Is live-site chat aligned with CorpFlow chatbot? | **No — not yet.** Live apex uses **GHL LeadConnector**; CorpFlow chatbot is **sandbox-only** on `living-word-mauritius.corpflowai.com`. They are parallel systems until a deliberate cutover. |
| 2 | Single-language or multi-language? | **English-only today** on public sites and CorpFlow sandbox flows. Recommend **English-only for demo/production v1**; language selector or auto-detect **later**, with per-language approved knowledge atoms — never AI-translate unapproved content. |
| 3 | How to migrate from GHL to CorpFlow? | **Phased:** inventory/export → map GHL assets to CorpFlow tables/events → sandbox parity → owner-approved embed → selective workflow migration → retire duplicate GHL surfaces. |
| 4 | Embedded forms on non-CorpFlow sites? | **CorpFlow-hosted intake API** (mirror chat-widget security): embed script or hosted form → raw submission store → deduped member/contact → `automation_events` → `workflow_runs`. |
| 5 | Member lists / onboarding / groups / events? | **Tenant-scoped member CRM layer** (new tables, design §5) + **workflow_definitions** per intake type; schedules in `tenant_schedule_entries`; operator inbox for follow-up — **manual outbound** until Phase 5. |

---

## 1. Current chat / form inventory (public observation only)

**Method:** Public GET of homepages + HTML string scan (2026-06-19). No GHL admin access, no login, no configuration changes.

### 1.1 `https://livingwordmauritius.com` (and `www` alias)

| Surface | Observed | Notes |
|---------|----------|--------|
| **Chat widget** | **GoHighLevel / LeadConnector** | Script: `https://widgets.leadconnectorhq.com/loader.js` with `data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"`. |
| **CorpFlow chatbot** | **Not present** on apex/www HTML scan (`corpflow` string absent). | CorpFlow widget loader pattern is `/api/chat-widget/loader.js` on tenant host — not embedded on live WordPress yet. |
| **CMS / builder** | WordPress + **Elementor** (strings in HTML). | Consistent with prior `chatbot-options-assessment.md`. |
| **Forms** | **Formidable** (strings in HTML). | Likely prayer, contact, volunteer, event sign-up pages — exact form IDs not inventoried in this packet (would need page-by-page public crawl or owner export). |
| **Events calendar** | **Modern Events Calendar** (per prior assessment; events listed on homepage). | Public events: Sunday Service, WordGroups youth programmes, Bloom Ladies Fellowship, Golf Day, etc. — **not** yet in CorpFlow `tenant_schedule_entries` except seeded Sunday Service. |
| **Language** | **English** page copy, menus, event titles. | No `hreflang`, no FR/Kreol toggle observed on homepage fetch. |
| **Contact (public)** | info@livingwordmauritius.com, +230 5538 2181, Grand Baie address | Matches approved knowledge atoms on CorpFlow sandbox. |

**Conclusion:** The **official live chat/intake bubble on the real church site is still GHL**, not the CorpFlow chatbot built in sandbox.

### 1.2 `https://network.livingwordmauritius.com`

| Surface | Observed | Notes |
|---------|----------|--------|
| **Purpose** | Living Word **Business Network** directory | Listings, categories (Services, Events, Classifieds), Sign In / Register. |
| **Chat** | No LeadConnector loader observed on homepage fetch (unlike apex). | Intake is listing-centric + account registration, not church pastoral chat. |
| **Forms / auth** | Login, Register, “Guest / Owner”, privacy policy checkbox | Member/business **directory** model — separate from church pastoral CRM. |
| **GHL** | Not confirmed on public homepage HTML in this scan | May still use GHL/WordPress/WooCommerce elsewhere — **owner inventory required** before migration. |
| **CorpFlow** | Not observed | Keep **neutral** posture; Business Network enquiries route through church contact workflow, not endorsement. |

### 1.3 CorpFlow sandbox (reference baseline — not live church site)

| Surface | URL | State |
|---------|-----|--------|
| Visual sandbox | `https://living-word-mauritius.corpflowai.com/site-preview` | Live; TEST ribbon; schedule + knowledge debug |
| Chatbot | Same host `/api/chat-widget/loader.js` | **Enabled** for demo; flow v4 with Ask a question + retrieval AI |
| Operator inbox | `https://core.corpflowai.com/factory/living-word-workflows` | Chatbot lead follow-up steps |
| Data spine | `chat_widget_*`, `automation_events`, `workflow_*`, `tenant_knowledge_atoms`, `tenant_schedule_entries` | Tenant-scoped |

---

## 2. CorpFlow chatbot alignment

### 2.1 Comparison

| Dimension | GHL LeadConnector (live apex) | CorpFlow chatbot (sandbox) |
|-----------|------------------------------|----------------------------|
| Host | `widgets.leadconnectorhq.com` | `living-word-mauritius.corpflowai.com` |
| Data store | GHL CRM (vendor) | CorpFlow Postgres (`chat_widget_threads`, `automation_events`) |
| Flow model | GHL-configured (structured intake per prior assessment) | JSON flow v4: 8 guided paths + Ask a question |
| AI | GHL-native (if enabled in GHL — **not verified**) | Groq retrieval AI — **approved atoms/schedules only** |
| Workflows | GHL automations | `workflow_runs` / `workflow_steps` (v1: chatbot lead follow-up) |
| Outbound | GHL email/SMS if configured | **None** in v1 — operator manual |
| Embed | Already on WordPress | Ready via script tag; **not on apex yet** |

### 2.2 Functional overlap (intended parity)

Both systems support visitor paths such as: service visit, prayer, contact, volunteer, WordGroups/youth, Business Network (neutral), giving (GHL may have; CorpFlow flow can add or link out).

CorpFlow **adds** (sandbox): contact UX v0.1 (first/surname, WhatsApp, preferred method), retrieval AI with delay, knowledge/schedule-backed answers, operator workflow inbox.

### 2.3 Recommendation — official chat/intake layer

| Phase | Recommendation |
|-------|----------------|
| **Now → cutover** | **Coexist temporarily:** GHL remains on live WordPress; CorpFlow sandbox is the **reference implementation** for owner review. |
| **After owner sign-off** | **Replace** GHL chat widget on apex with CorpFlow embed (`/api/chat-widget/loader.js` on tenant host or CNAME). |
| **GHL forms** | **Do not replace all at once.** Migrate form-by-form after CorpFlow form intake foundation exists (§6). Some forms may remain WordPress/Formidable until mapped. |
| **GHL CRM** | **Migrate contacts** via export → CorpFlow member model (§5); keep GHL read-only until parity verified. |
| **Business Network site** | **Separate** intake streams; link to church contact workflow; no CorpFlow chat embed required on network site in v1 unless owner requests. |

**Alignment verdict:** CorpFlow chatbot is the **intended successor** to GHL chat for pastoral intake, but **live site is not aligned yet** — by design (sandbox-first delivery).

---

## 3. Language strategy

### 3.1 Current state

- **Public websites:** English copy on fetched pages (menus, events, welcome text).
- **CorpFlow sandbox:** English prompts only in `living-word-flow-v3.js` and knowledge atom seeds.
- **Mauritius context:** French and Mauritian Creole (Kreol) are socially relevant; **not implemented** on live site or CorpFlow today.

### 3.2 Options evaluated

| Option | Pros | Cons | v1 recommendation |
|--------|------|------|-------------------|
| **English-only** | Simplest; matches current content; one knowledge corpus | Excludes Kreol/French visitors who prefer native language | **Yes — demo and first production embed** |
| **Language selector** | User control; no auto-detect errors | Duplicate atoms/flows per language; operator approval burden | **Phase 2+** after English corpus stable |
| **Auto-detect** | Frictionless | Wrong-language AI answers; unapproved translation risk | **Defer** — only with approved per-language atoms, never machine-translate crawl text into answers |

### 3.3 Multilingual knowledge atoms (future)

- One `atom_key` per fact per language, e.g. `location.grand_baie_church.en` / `.fr` — or `locale` column on `tenant_knowledge_atoms`.
- `ai_answer_eligible` per locale; retrieval filters by session language.
- **Schedule entries:** title/description may get locale variants; times/dates stay structured (locale-agnostic).

### 3.4 AI translation risks (do not allow in v1)

- Groq must **not** translate unapproved HTML or GHL export text into visitor answers.
- Kreol/French answers must come from **approved atoms** written/reviewed by church team — not runtime translation of English atoms.
- Exception: UI chrome (button labels) via static i18n JSON — not LLM.

**Recommendation:** Ship **English-only** for Member/Contact Intake Foundation v1; document FR/Kreol as Phase 2 with duplicate approved atoms.

---

## 4. GHL migration inventory

**Source:** Prior assessments + standard GHL asset types. **Owner must confirm** actual GHL sub-account contents via export/screenshot audit (Phase 0).

### 4.1 Likely GHL assets → CorpFlow destination

| GHL asset | Likely Living Word use | CorpFlow destination | Migration notes |
|-----------|------------------------|----------------------|-----------------|
| **Contacts** | Visitors, members, leads | `tenant_members` / `tenant_contacts` (§5) | CSV export; dedupe on email/phone; `source=ghl_import` |
| **Forms** | Prayer, contact, interest | `tenant_form_submissions` (raw) → member upsert → workflow | Map fields per form; do not auto-create approved knowledge |
| **Chat widget** | Apex bubble | **Replace** with CorpFlow `chat_widget` embed | Cutover + disable GHL script |
| **Chat conversations** | Historical threads | `chat_widget_messages` **or** archive JSON in `tenant_import_batches` | Historical optional; PII review |
| **Workflows / automations** | Email/SMS follow-ups | `workflow_definitions` + optional n8n (Phase 5) | Rebuild — do not blindly import GHL logic |
| **Pipelines** | Lead stages | `workflow_run.status` + step types | Simplify to open/completed/cancelled v1 |
| **Calendars** | Appointments | `tenant_schedule_entries` + future booking module | Events ≠ GHL calendar slots — map carefully |
| **Funnels / landing pages** | Campaign pages | Stay on WordPress/GHL until replaced | Out of v1 scope |
| **Tags** | Segmentation | `tenant_member_tags` or JSON on member row | Map tag → interest flags |
| **Email/SMS templates** | Follow-up copy | `docs/` or `tenant_message_templates` (future) | Manual outbound only until Phase 5 |
| **Campaigns / broadcasts** | Bulk send | **Not migrated** to auto-send in v1 | Policy: no bulk without consent review |

### 4.2 Already on CorpFlow (do not re-migrate)

| Asset | CorpFlow location |
|-------|-------------------|
| Sandbox chatbot leads | `chat_widget_threads`, `automation_events` (`chat_widget.lead.submitted`) |
| Operator tasks | `workflow_runs`, `workflow_steps` |
| Approved facts | `tenant_knowledge_atoms` |
| Approved schedule | `tenant_schedule_entries` |

### 4.3 WordPress / non-GHL assets (parallel track)

| Asset | Tool | CorpFlow relationship |
|-------|------|------------------------|
| Event calendar | Modern Events Calendar | Export/sync → **schedule entry candidates** (`approved=false`) |
| Forms | Formidable | Webhook or embed replacement → form submission API (§6) |
| Business directory | network site | Separate member type: `business_listing` — not pastoral member v1 |

---

## 5. CorpFlow member / CRM data model proposal

**Design-only.** New tables — **not** reusing `growth_contacts` (ABM/sales) or raw `chat_widget_threads` (session evidence).

### 5.1 Layered model

```text
tenant_form_submissions     ← immutable raw evidence (every embed/API post)
tenant_members              ← deduped person (church pastoral CRM)
tenant_member_identities    ← optional linked emails/phones (normalized)
tenant_households           ← optional future: family grouping
tenant_member_interests     ← volunteer, wordgroup, youth parent, etc.
tenant_member_tags          ← lightweight segmentation
tenant_member_consents      ← consent basis, timestamp, source
tenant_member_workflow_links ← join to workflow_runs
```

### 5.2 `tenant_form_submissions` (raw evidence)

| Field | Purpose |
|-------|---------|
| `id`, `tenant_id` | Scope |
| `source_channel` | `embed_form`, `hosted_form`, `chat_widget`, `ghl_import`, `api` |
| `source_host`, `source_path`, `form_key` | Provenance |
| `idempotency_key` | Dedupe retries |
| `payload_json` | Full submitted fields (immutable) |
| `ip_hash` | Abuse trace (no raw IP) |
| `created_at` | Audit |

### 5.3 `tenant_members` (deduped contact)

| Field | Purpose |
|-------|---------|
| `id`, `tenant_id` | Scope |
| `status` | `prospect`, `active`, `inactive`, `merged` |
| `first_name`, `surname`, `display_name` | Identity |
| `primary_email`, `primary_phone` | Dedupe keys (nullable) |
| `preferred_contact_method` | email / whatsapp / phone_call / sms |
| `communication_preferences_json` | Opt-in flags |
| `consent_basis`, `consent_recorded_at`, `consent_source` | GDPR-style metadata |
| `onboarding_status` | `none`, `enquired`, `connected`, `member` (church-defined) |
| `sensitivity_flags_json` | prayer, youth_parent, safeguarding notes **metadata only** — not pastoral content in clear text for AI |
| `ghl_contact_id` | Migration lineage (nullable) |
| `merged_into_member_id` | Dedup merges |
| `created_at`, `updated_at` | Audit |

**Dedupe rule:** `(tenant_id, normalized_email)` and/or `(tenant_id, normalized_phone)` unique partial indexes.

### 5.4 Groups / WordGroups / volunteer / events

| Concept | Storage |
|---------|---------|
| WordGroup interest | `tenant_member_interests` (`interest_type=wordgroup`) + workflow |
| Volunteer | `interest_type=volunteer` + message in submission |
| Youth (parent) | `interest_type=youth_parent`; **no child PII** in chat/forms |
| Event attendance | Link submission to `tenant_schedule_entry_id` + `interest_type=event_rsvp` |
| Business Network | `interest_type=business_network` — **neutral**; no endorsement fields |

### 5.5 Pastoral / prayer boundaries

- Prayer **message text** stays in `tenant_form_submissions.payload_json` and operator-only views — **not** `ai_answer_eligible` knowledge.
- `tenant_members.sensitivity_flags_json` may mark `prayer_history=true` without storing request body on member row.
- Counselling/crisis: workflow step type `safeguarding_review` — no AI summarization of crisis content in v1.

### 5.6 Audit trail

- Every upsert from submission → `automation_events` (`tenant.member.upserted` or reuse intake event types).
- Operator view: submission id → member id → workflow runs (existing inbox pattern).

### 5.7 Relationship to existing tables

| Existing | Role after member layer |
|----------|-------------------------|
| `chat_widget_threads` | Session transcript; on submit also writes `tenant_form_submissions` + member upsert (future packet) |
| `automation_events` | Event spine — unchanged contract |
| `workflow_*` | Triggered from new event types per form/request type |

---

## 6. Embedded form intake architecture

For forms on **WordPress or any non-CorpFlow host** (not only chat widget).

### 6.1 Intake channels

| Channel | Description |
|---------|-------------|
| **A. Embed script** | `<script src="https://living-word-mauritius.corpflowai.com/api/tenant-intake/embed.js" data-form="prayer">` |
| **B. Hosted CorpFlow form** | `https://living-word-mauritius.corpflowai.com/forms/prayer` — iframe or redirect |
| **C. Webhook/API** | `POST /api/tenant-intake/submit` with signed secret or public origin allowlist |

*Routes are illustrative — not implemented in this packet.*

### 6.2 Request flow

```text
Browser (any allowed origin)
  → POST /api/tenant-intake/submit
      → tenant resolved (host / form_key / explicit tenant_id in signed token)
      → origin allowlist check (like chat_widget_configs.allowed_origins)
      → rate limit (IP hash per tenant)
      → optional Turnstile/hCaptcha (future)
      → idempotency_key dedupe
      → INSERT tenant_form_submissions (raw)
      → UPSERT tenant_members (dedupe)
      → recordTrustedAutomationEvent (tenant.intake.submitted.v1)
      → tryProcessAutomationEventForWorkflows
      → 200 { submission_id, member_id }
```

### 6.3 Security controls (mirror chat widget)

| Control | Implementation pattern |
|---------|------------------------|
| Tenant scoping | Every query `tenant_id`; resolve from `tenant_hostnames` or form config row |
| Origin allowlist | Per-tenant `allowed_origins_json` on `tenant_intake_configs` |
| CSRF | JSON POST + Origin check; for API keys use `Authorization: Bearer` server-to-server |
| Spam | Rate limits; honeypot field; optional captcha |
| Idempotency | Client or server generates `idempotency_key`; unique `(tenant_id, idempotency_key)` |
| PII | No secrets in logs; payload in Postgres only |

### 6.4 Operator visibility

- Factory page: `/factory/living-word-intake` (future) — lists submissions + member link + workflow steps.
- Extend existing `/factory/living-word-workflows` with filters by `request_type` / `form_key`.

### 6.5 Rollback

- Disable form via `tenant_intake_configs.enabled=false` — embed returns 403.
- Submissions retained; mark members `inactive` rather than delete.

---

## 7. Initial workflows to support

Built on `workflow_definitions` + `automation_events` trigger pattern (same as chatbot lead v1).

| Workflow | Trigger event | Required fields | Steps (operator) | Outbound |
|----------|---------------|-----------------|------------------|----------|
| **New member enquiry** | `tenant.intake.submitted` (`request_type=new_member`) | name, email or phone, message | Acknowledge → assign connector → schedule welcome | **Manual** |
| **Contact request** | `chat_widget.lead.submitted` / intake (`contact`) | first, surname, email, phone, preferred method, message | Follow-up contact (exists v1) | **Manual** |
| **Prayer request** | intake (`prayer`) | name, optional email, message | Safeguarding skim → pastoral assign → pray | **Manual** — no auto email to requester |
| **Volunteer interest** | intake (`volunteer`) | name, email, area | Coordinator match | **Manual** |
| **WordGroup interest** | intake (`wordgroup`) | parent/guardian contact, age band | Coordinator assign group | **Manual** |
| **Event attendance / follow-up** | intake (`event_rsvp`) + `schedule_entry_id` | name, email, event ref | Confirm attendance / send details | **Manual** until template approval |
| **Business Network enquiry** | intake (`business_network`) | name, email, message | Neutral intro — **no endorsement** | **Manual** |

**CRM profile updates:** Each completed workflow step may append `tenant_member_interests` and `onboarding_status` — never auto-write unverified facts to `tenant_knowledge_atoms`.

---

## 8. Migration phases

| Phase | Name | Scope | Exit criteria |
|-------|------|-------|---------------|
| **0** | Audit / inventory | GHL export, form list, tag map, WordPress plugin list; public site embed confirmation | Inventory doc signed by owner |
| **1** | CorpFlow sandbox intake + member prototype | Tables + API + operator UI on sandbox only; import **test** CSV | Submit form on sandbox → member row → workflow |
| **2** | Owner-approved test embed | Single form or chat on **non-public** or sandbox page | Live submit → CorpFlow DB; GHL unchanged on apex |
| **3** | Migrate selected GHL forms/workflows | Prayer + contact first; contact CSV import | Parity checklist; operator inbox used daily |
| **4** | External site embed after approval | Replace GHL chat script on apex; optional Formidable webhook bridge | GHL chat disabled; CorpFlow verified 2 weeks |
| **5** | Optional n8n outbound | Gmail draft / WhatsApp template — **human approval gate** | No auto-send without operator action |
| **6** | Retire duplicate GHL assets | Cancel GHL subscription when CRM parity proven | Owner sign-off; rollback plan archived |

**Current position:** End of Phase 0 for chat (GHL confirmed on apex); CorpFlow sandbox past Phase 1 for **chatbot-only** intake — **member table and embed forms not built yet**.

---

## 9. Risks and controls

| Risk | Control |
|------|---------|
| **Duplicate records** | Dedupe keys; `merged_into_member_id`; import batch idempotency |
| **Privacy / consent** | `consent_basis` on member; raw submission immutable; data map update before production |
| **Children / youth PII** | No child name fields in public forms; age band only; safeguarding workflow step |
| **Prayer / counselling** | No AI on prayer body; crisis → safety refusal (already in retrieval AI); manual pastoral only |
| **Multilingual accuracy** | English-only v1; no LLM translation into answers |
| **GHL export limits** | Plan export windows; manual CSV; accept partial history migration |
| **External embed abuse** | Origin allowlist + rate limits + captcha option |
| **Webhook spam** | HMAC secret + IP rate limit + idempotency |
| **Ownership / approval** | No apex embed without written owner approval; Anton gates Phase 4+ |
| **Schedule drift** | Events from WordPress calendar → schedule **candidates** only; operator approves |
| **Business Network endorsement** | Neutral copy only; separate site; no “verified business” atoms |

---

## 10. Recommendation — next build packet

### Next packet: **Living Word Member/Contact Intake Foundation v1** (CorpFlow sandbox only)

**Goal:** First tenant-scoped **member + raw submission** layer and **one** non-chat intake path (hosted form or API), reusing workflow foundation — **no GHL changes, no apex embed**.

**Definition of done:**

1. Prisma tables: `tenant_form_submissions`, `tenant_members` (minimal columns §5.2–5.3).
2. `POST /api/tenant-intake/submit` with tenant + origin gates (pattern from chat widget).
3. Event type `tenant.intake.submitted` → workflow definition for at least **contact** and **prayer**.
4. Operator factory page: list submissions + link to member + workflow steps.
5. Seed **no** GHL import in v1 — manual test submissions only.
6. English-only.
7. Verification artifact + sandbox live test — **no** `livingwordmauritius.com` changes.

**Explicitly defer:** GHL CSV import UI, apex embed, Formidable webhook, n8n outbound, multilingual, Business Network site integration.

**After v1:** Phase 0 GHL inventory workshop with church owner → Phase 3 selective migration.

---

## Verification (this packet)

| Check | Result |
|-------|:------:|
| Design-only — no code changes | ✓ |
| No DB/schema/migrations | ✓ |
| No external site changes | ✓ |
| No GHL/DNS changes | ✓ |
| No outbound messages | ✓ |
| Public observation documented (LeadConnector on apex) | ✓ |
| CorpFlow sandbox baseline referenced | ✓ |

**Delivery state:** **COMPLETE** (design artifact only — no production deployment for implementation).

---

## References (in-repo)

- `artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-options-assessment.md`
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-data-recording-trigger-audit.md`
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/public-website-knowledge-intake-design.md`
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/retrieval-ai-v1-live-verification.md`
- `lib/server/tenant-workflow/README.md`
- `lib/server/chat-widget/notify.js` — `corpflow.chat_widget.lead.submitted.v1`
