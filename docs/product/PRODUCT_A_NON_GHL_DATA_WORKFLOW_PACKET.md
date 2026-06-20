# Product A — non-GHL data workflow packet (v1)

**Status:** Operator docs + CSV templates — **Sheets / n8n / manual follow-up only**. No production runtime in this packet.

**Anchor sentinel:** `<!-- PRODUCT_A_NON_GHL_DATA_WORKFLOW_V1 -->`

<!-- PRODUCT_A_NON_GHL_DATA_WORKFLOW_V1 -->

**Scope:** Google Sheets CRM schema, CSV import templates, audit rubric, n8n wiring specs, Florida sample prospect batch. **Not** site code — Phase 1 intake lives in `docs/product/PRODUCT_A_INTAKE_WEBHOOK.md`.

**Hard rule:** No external CRM platform, no auto-send email, no SMS, no LLM lead enrichment.

---

## 1. Related docs

| Doc | Role |
| --- | ---- |
| [PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md](./PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md) | Canonical plan |
| [PRODUCT_A_INTAKE_WEBHOOK.md](./PRODUCT_A_INTAKE_WEBHOOK.md) | `POST /api/product-a/intake` payload + deploy checklist |
| [../marketing/PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY.md](../marketing/PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY.md) | Operator prompts — audit, Gmail drafts, follow-up, reply classification |
| [../n8n/automation-forward-recipe.md](../n8n/automation-forward-recipe.md) | Automation envelope forward |

---

## 2. Google Sheet — operator CRM

**Sheet name:** `Product A — US Clinic Leads`

**Import header:** use [product-a-csv-templates/product-a-us-clinic-leads-template.csv](./product-a-csv-templates/product-a-us-clinic-leads-template.csv)

| Column | Written by | Notes |
| ------ | ---------- | ----- |
| `received_at` | n8n | ISO timestamp from intake |
| `status` | n8n → operator | `new` on ingest; operator updates |
| `clinic_name` | intake | |
| `website` | intake | |
| `contact_name` | intake | |
| `email` | intake | lowercased |
| `phone` | intake | optional |
| `city_state` | intake | |
| `biggest_problem` | intake | |
| `source` | intake | default `product-a-landing` |
| `audit_call_at` | operator | after booking |
| `notes` | operator | free text |
| `next_action` | operator | e.g. *Send audit recap* |

**Status values:** `new` · `reviewing` · `audit_scheduled` · `audit_done` · `proposal_sent` · `won` · `lost` · `nurture`

**Rules:** Sheet is the only pre-sale pipeline. Do not mirror to Command Center until buyer is active/paying.

---

## 3. n8n workflow — `product-a-us-clinic-intake-v1`

### 3.1 Trigger options (pick one)

| Option | When |
| ------ | ---- |
| **A — Automation forward (recommended)** | `CORPFLOW_AUTOMATION_FORWARD_URL` already set; branch on `event_type === intake.product_a.us_clinic.v1` |
| **B — Direct webhook** | `N8N_PRODUCT_A_INTAKE_WEBHOOK_URL` set; receives flat `corpflow.product_a.intake.v1` JSON |

Payload shapes: `docs/product/PRODUCT_A_INTAKE_WEBHOOK.md`.

### 3.2 Steps

1. **Validate** — required fields: `clinic_name`, `website`, `contact_name`, `email`, `city_state`, `biggest_problem`.
2. **Dedupe** — skip append if same `email` + `clinic_name` within 24h (match idempotency key in intake doc).
3. **Append Google Sheet row** — map to § 2 columns; set `status=new`, `source=product-a-landing` unless payload overrides.
4. **Notify operator** — Telegram and/or email (best-effort). Reuse existing ops-alert patterns; no auto-send to prospect.
5. **Gmail draft (optional, off by default)** — acknowledgement draft only; operator sends manually.

### 3.3 Explicitly out of scope

- Auto-send email to prospect
- CRM deal/pipeline creation
- SMS / WhatsApp outbound
- Payment links
- LLM enrichment of lead records

---

## 4. Website & Lead Rescue audit rubric

Score each area **Red / Amber / Green** during the audit call. Notes go in Sheet `notes`.

| Area | Green | Amber | Red |
| ---- | ----- | ----- | --- |
| **Enquiry capture** | All main channels log to one visible place | Some channels logged; gaps on weekends/mobile | Enquiries lost between form, email, DMs |
| **Website clarity** | Services, location, contact obvious on mobile | Key info buried or outdated | No clear CTA or broken mobile layout |
| **Follow-up visibility** | Owner/operator sees new enquiries same day | Delays; depends on memory | No owner alert path |
| **Booking path** | Low friction to book/consult | Extra steps or broken widget | Dead ends after enquiry |
| **Lead Rescue fit** | Lightweight capture + alert + daily summary sufficient | Needs one channel fix first | Requires full rebuild before any rescue |

**Deliverable:** 3-bullet audit summary + recommended scope (website hardening, capture fix, Lead Rescue pilot) — no revenue guarantee language.

---

## 5. Florida sample prospect batch

**File:** [product-a-csv-templates/product-a-florida-prospect-batch-sample.csv](./product-a-csv-templates/product-a-florida-prospect-batch-sample.csv)

Synthetic placeholder rows only (`example.invalid`). Replace before any real outreach.

**Use:** pre-intake cold/warm prospect tracking **separate from** live intake rows. When a prospect submits `/product-a/us-clinics`, append to the **leads** sheet — do not merge prospect CSV automatically.

| Column | Purpose |
| ------ | ------- |
| `clinic_name` | Target clinic |
| `website` | Public site |
| `city_state` | FL market |
| `contact_name` | Owner / manager |
| `email` | Outreach address |
| `phone` | Optional |
| `biggest_problem` | Hypothesis from research |
| `prospect_status` | `not_contacted` / `messaged` / `replied` / `declined` |
| `source` | e.g. `cold-outreach-florida-v1` |
| `notes` | Operator research |
| `next_action` | Next manual step |

---

## 6. First 10 Verification Status Rules

**Applies to:** Florida / cold prospect rows (§ 5) and any pre-outreach verification pass. Use Sheet columns **`pipeline_stage`**, **`outreach_status`**, **`anton_approval`**, **`drafting_allowed`** (operator-maintained — not in the v1 CSV header; add manually or in a v1.1 template).

Until a row passes the drafting gate below, **no Gmail outreach draft** and **no auto-send** — operator research and audit prep only.

### 6.1 Default status by rule number (First 10)

| Rule # | Pipeline Stage | Outreach Status | Anton Approval | Drafting allowed |
| ------ | -------------- | --------------- | -------------- | ---------------- |
| 1–3 | Lost | Paused | No | No |
| 4–6 | Identified | Not started | No | No |
| 7–8 | Audit queued | Not started | No | No |
| 9–10 | Audit queued | Not started | No | No |

**Interpretation:** Rules 1–3 = disqualified or closed-out rows. Rules 4–6 = identified targets not yet audit-ready. Rules 7–10 = audit queued but verification / audit draft not yet complete — outreach remains blocked.

### 6.2 Approval rule

**Anton Approval** stays **No** until a **real audit is drafted and reviewed**. Verification alone does **not** approve outreach.

### 6.3 Drafting rule

Outreach drafting is allowed **only after all** of the following:

1. Manual verification is complete.
2. Audit is drafted.
3. **Pipeline Stage** becomes **Approved for draft**.
4. **Anton Approval** becomes **Yes**.

Until then: **Drafting allowed = No** (matches rules 1–10 defaults).

### 6.4 Disqualifier override

If **any disqualifier** is found during verification, **override score** and set:

| Field | Value |
| ----- | ----- |
| Pipeline Stage | **Do not contact** or **Lost** |
| Outreach Status | **Do not contact** |
| Anton Approval | **No** |
| Drafting allowed | **No** |

Do not resume outreach without explicit operator reset and re-verification.

---

## 7. Operator wiring checklist

1. Create Google Sheet from leads CSV template (§ 2).
2. Wire n8n workflow § 3 to Sheet + operator notification.
3. Confirm Phase 1 intake live: `https://corpflowai.com/product-a/us-clinics`.
4. Submit one test intake; confirm Sheet row within 60s.
5. Run audit using rubric § 4 on first real call.
6. Import Florida sample only as a **reference** — replace placeholders before use.

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-20 | Initial ops packet — Sheet schema, n8n spec, audit rubric, Florida CSV sample |
| v1.1 | 2026-06-20 | First 10 Verification Status Rules — pipeline/outreach/approval/drafting gates |
