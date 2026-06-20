# Product A — US Clinics n8n implementation pack (v1)

**Status:** Operator runbook — **docs-only**. Step-by-step n8n build guide for Product A intake workflows.

**Audience:** Anton (operator) or authorized implementer wiring n8n on the CorpFlow operator instance.

**Anchor sentinel:** `<!-- PRODUCT_A_US_CLINICS_N8N_IMPLEMENTATION_V1 -->`

<!-- PRODUCT_A_US_CLINICS_N8N_IMPLEMENTATION_V1 -->

**Purpose:** Detailed n8n workflow construction for Product A US clinic intake. **Complements** — does **not** replace — [`docs/product/PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md`](../product/PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md) (Sheet schema, audit rubric, verification rules).

**Canonical event contract (#431):** `intake.product_a.us_clinic.v1`

**Hard rule:** No GoHighLevel. No external CRM. No SMS. No auto-send email to prospects. **Gmail drafts only** (optional branch, off by default). **Human approval gates remain mandatory** — see ops packet § 6 (First 10 Verification Status Rules).

---

## 1. Related docs

| Doc | Role |
| --- | ---- |
| [../product/PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md](../product/PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md) | Sheet schema, CSV templates, audit rubric, verification gates |
| [../product/PRODUCT_A_INTAKE_WEBHOOK.md](../product/PRODUCT_A_INTAKE_WEBHOOK.md) | `POST /api/product-a/intake` payload, env vars, deploy checklist |
| [automation-forward-recipe.md](./automation-forward-recipe.md) | Shared automation envelope forward |
| [../marketing/PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY.md](../marketing/PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY.md) | Operator prompts for audit / draft / follow-up (manual use) |

---

## 2. What you are building

| Workflow name | Trigger | Outcome |
| ------------- | ------- | ------- |
| **`product-a-us-clinic-intake-v1`** | `intake.product_a.us_clinic.v1` | Validate → dedupe → Google Sheet append → operator alert → optional Gmail **draft** |

**Two trigger paths (pick one primary):**

| Path | Env | n8n receives |
| ---- | --- | ------------ |
| **A — Automation forward (recommended)** | `CORPFLOW_AUTOMATION_FORWARD_URL` | `corpflow.automation.envelope.v1`; branch on `event_type` |
| **B — Direct webhook** | `N8N_PRODUCT_A_INTAKE_WEBHOOK_URL` | Flat `corpflow.product_a.intake.v1` JSON |

Do **not** run both paths into duplicate Sheet appends unless you add explicit dedupe (§ 5).

---

## 3. Prerequisites

### 3.1 Google Sheet

1. Create sheet **`Product A — US Clinic Leads`** from [product-a-us-clinic-leads-template.csv](../product/product-a-csv-templates/product-a-us-clinic-leads-template.csv).
2. Confirm header row matches ops packet § 2 column list.
3. Connect n8n **Google Sheets** credential (OAuth) with append access to that spreadsheet.

### 3.2 CorpFlow Production env

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `POSTGRES_URL` | yes (prod) | `automation_events` row on each intake |
| `CORPFLOW_AUTOMATION_FORWARD_URL` | recommended | Envelope forward to n8n |
| `CORPFLOW_AUTOMATION_FORWARD_SECRET` | optional | Header `x-corpflow-automation-forward-secret` |
| `N8N_PRODUCT_A_INTAKE_WEBHOOK_URL` | optional | Direct flat JSON path only |

See [PRODUCT_A_INTAKE_WEBHOOK.md](../product/PRODUCT_A_INTAKE_WEBHOOK.md) § Environment variables.

### 3.3 n8n credentials

- **Google Sheets** — append to operator CRM sheet.
- **Gmail** (optional) — **Create Draft** only; never **Send Email** on prospect-facing copy in v1.
- **Telegram** and/or **SMTP** — operator notification (reuse existing ops-alert patterns).

---

## 4. Event contract — `intake.product_a.us_clinic.v1`

### 4.1 Automation envelope (Path A)

Branch when `{{ $json.body.event_type }}` or `{{ $json.event_type }}` equals **`intake.product_a.us_clinic.v1`** (preview pane decides wrapping).

Intake fields live in **`payload`**:

```json
{
  "schema": "corpflow.automation.envelope.v1",
  "event_type": "intake.product_a.us_clinic.v1",
  "correlation_id": "product-a:intake:jordan@example.com:radiance-medspa-austin:2026-06-20",
  "source": "api/product-a/intake",
  "payload": {
    "schema": "corpflow.product_a.intake.v1",
    "event_type": "intake.product_a.us_clinic.v1",
    "received_at": "2026-06-20T14:30:00.000Z",
    "status": "new",
    "clinic_name": "Radiance Medspa Austin",
    "website": "https://radiancemedspa.example.com",
    "contact_name": "Jordan Lee",
    "email": "jordan@example.com",
    "phone": "+1 512 555 0100",
    "city_state": "Austin, TX",
    "biggest_problem": "Weekend form submissions wait until Monday.",
    "source": "product-a-landing",
    "page": "/product-a/us-clinics",
    "host": "corpflowai.com"
  }
}
```

**n8n expression tip:** after the IF branch, use a **Set** node to normalize:

- `intake` ← `{{ $json.payload ?? $json.body.payload ?? $json }}`

### 4.2 Flat payload (Path B)

Direct webhook body is the inner `payload` object above (no envelope wrapper). Same field names.

### 4.3 Idempotency

**Automation_events key:** `product-a:intake:{email}:{clinic-slug}:{YYYY-MM-DD}`

In n8n, before Sheet append:

1. Read `correlation_id` from envelope when present.
2. Or compute the same key from `email` + slugified `clinic_name` + UTC date.
3. **IF** matching row appended in last 24h → stop (no duplicate alert, no duplicate draft).

---

## 5. Workflow build — `product-a-us-clinic-intake-v1`

### 5.1 Path A — branch on automation forward (recommended)

Add to the **existing** automation-forward workflow ([automation-forward-recipe.md](./automation-forward-recipe.md)):

1. **IF** — `event_type === intake.product_a.us_clinic.v1`
2. **Set** — normalize `intake` object (§ 4.1)
3. **IF** — validate required fields: `clinic_name`, `website`, `contact_name`, `email`, `city_state`, `biggest_problem`
4. **Function / IF** — dedupe check (§ 4.3)
5. **Google Sheets → Append** — map to Sheet columns (§ 6)
6. **Operator notify** — Telegram and/or email to Anton (§ 7)
7. **Gmail → Create Draft** (optional, **disabled by default**) — § 8

On validation failure: log + operator alert only; **do not** append partial rows.

### 5.2 Path B — dedicated direct webhook

1. **Webhook** — `POST`, path e.g. `product-a-us-clinic-intake`
2. **IF** — optional shared-secret header check (mirror `CORPFLOW_AUTOMATION_FORWARD_SECRET` pattern if you add a Product-A-specific secret later; v1 may rely on unlisted URL + HTTPS only)
3. Continue from step 3 in § 5.1 (validate → dedupe → sheet → notify → optional draft)

Set `N8N_PRODUCT_A_INTAKE_WEBHOOK_URL` to this webhook **Production URL** on Vercel.

---

## 6. Google Sheet column mapping

Map **`intake.*`** → Sheet columns (ops packet § 2):

| Sheet column | Source field | Default |
| ------------ | ------------ | ------- |
| `received_at` | `intake.received_at` | ISO from payload |
| `status` | literal | `new` |
| `clinic_name` | `intake.clinic_name` | |
| `website` | `intake.website` | |
| `contact_name` | `intake.contact_name` | |
| `email` | `intake.email` | lowercased |
| `phone` | `intake.phone` | empty → blank |
| `city_state` | `intake.city_state` | |
| `biggest_problem` | `intake.biggest_problem` | |
| `source` | `intake.source` | `product-a-landing` |
| `audit_call_at` | — | leave empty |
| `notes` | — | leave empty |
| `next_action` | literal | `Review intake within 2 business days` |

**Florida / cold prospect sheet** (ops packet § 5) is **separate** — do not auto-merge prospect CSV rows on intake.

---

## 7. Operator notification (mandatory)

Send a **best-effort** alert to Anton on every **new** (non-deduped) intake:

**Minimum fields in alert text:**

- `clinic_name`, `contact_name`, `email`, `city_state`
- one-line `biggest_problem`
- link: `https://corpflowai.com/product-a/us-clinics` (source page)
- Sheet row reference or `correlation_id`

**Pattern:** reuse Telegram / email ops-alert nodes from existing CorpFlow n8n workflows. This is **operator-only** — not a prospect email.

---

## 8. Gmail draft branch (optional — off by default)

**v1 rule:** create **draft only**; Anton reviews and sends manually. **Never** wire **Gmail Send Email** to the prospect for Product A intake acknowledgement in v1.

When enabled:

1. Gate on operator flag or workflow setting (`PRODUCT_A_ACK_DRAFT_ENABLED=true` in n8n static data — not CorpFlow env).
2. Use prompt library entry `product-a-intake-ack-gmail-draft` ([PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY.md](../marketing/PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY.md)) for copy — human review before send.
3. **Gmail → Create Draft** to `intake.email` with acknowledgement + audit booking link.
4. Log draft created in Sheet `notes` (manual or Set node append).

**Blocked until:** ops packet § 6 drafting gates satisfied for **cold** prospects; **live intake rows** may use ack draft after operator review without auto-send.

---

## 9. Human approval gates (mandatory)

These gates are **not** enforced by n8n automation in v1 — operator maintains them in Sheet columns (`fit_score`, `pipeline_stage`, `outreach_status`, `anton_approval`, `drafting_allowed`).

| Gate | Rule |
| ---- | ---- |
| **Verification** | Fit score + First 10 rules in ops packet § 6 |
| **Anton Approval** | Stays **No** until real audit drafted and reviewed |
| **Drafting allowed** | **No** until verification complete, audit drafted, stage **Approved for draft**, approval **Yes** |
| **Disqualifier** | Override → Do not contact / Lost; no outreach |

n8n must **not** auto-advance pipeline stages or set `anton_approval=Yes`.

---

## 10. Explicitly out of scope

- GoHighLevel or any external CRM pipeline
- SMS / WhatsApp outbound to prospects
- Auto-send email to prospects
- LLM enrichment of lead records in n8n
- Payment links or invoice automation
- Bi-directional calendar ↔ CRM sync
- Merging Florida prospect CSV into live intake sheet

---

## 11. Verification checklist

Run after wiring Production:

1. **Submit test intake** at `https://corpflowai.com/product-a/us-clinics` (label clinic name `TEST — delete me`).
2. **Postgres:** `automation_events` row with `event_type: intake.product_a.us_clinic.v1`.
3. **n8n:** execution on Product A branch; no error on validate/dedupe/append.
4. **Sheet:** new row within 60s; `status=new`, `source=product-a-landing`.
5. **Operator alert:** received within 2 minutes.
6. **Dedupe:** repeat same email + clinic within 24h → no second row / no duplicate alert.
7. **Prospect email:** confirm **no** auto-send (only draft if branch enabled).
8. **Visitor UX:** 200 response + thank-you state on landing page.

**Local dev caveat:** `next dev` does not serve `/api/product-a/intake` without `vercel dev` — test on Preview or Production.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------- | --- |
| No n8n execution | `CORPFLOW_AUTOMATION_FORWARD_URL` unset or wrong | Set env + redeploy; confirm forward recipe webhook URL |
| Wrong branch | `event_type` path mismatch | Check `$json.body.event_type` vs `$json.event_type` in preview |
| 404 on intake API locally | `vercel.json` rewrites missing in dev | Use `vercel dev` or test Preview/Prod |
| Duplicate Sheet rows | Dedupe disabled or key mismatch | Align key with § 4.3 / intake doc |
| Prospect got email automatically | Send Email node wired | Replace with Create Draft; remove Send branch |
| Missing columns in Sheet | Header drift | Re-import [leads template](../product/product-a-csv-templates/product-a-us-clinic-leads-template.csv) |

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-20 | Initial implementation pack — `intake.product_a.us_clinic.v1`, Path A/B, Sheet mapping, approval gates |

**Codex source note:** Branch `work` / commit `0407e20` was not on `origin`; this runbook was authored in-repo from Product A ops + intake docs and n8n recipe conventions. Reconcile with Codex export if wording diverges.
