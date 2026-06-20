# Product A — intake webhook payload

**Route:** `POST /api/product-a/intake`  
**Landing page:** `/product-a/us-clinics`  
**n8n workflow name:** `product-a-us-clinic-intake-v1`  
**Implementation plan:** `docs/product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md`

**Companion (Codex — Sheets/n8n ops, not site code):** `docs/product/PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md` — CSV templates under `docs/product/product-a-csv-templates/`. Wire n8n using this doc or the intake webhook spec below; do not duplicate ops packet content in site PRs.

---

## Delivery paths

| Path | When | Shape |
| ---- | ---- | ----- |
| **Automation forward** | `CORPFLOW_AUTOMATION_FORWARD_URL` set (production default) | `corpflow.automation.envelope.v1` with `event_type: intake.product_a.us_clinic.v1` |
| **Direct n8n webhook** | `N8N_PRODUCT_A_INTAKE_WEBHOOK_URL` set | Flat JSON below (`corpflow.product_a.intake.v1`) |
| **Stub (dev)** | Neither URL set | API returns 200; logs warning; payload not forwarded |

No outbound email, SMS, or CRM platform calls from this handler.

---

## Request (browser → API)

**Method:** `POST`  
**Content-Type:** `application/json`  
**Auth:** none (public intake)

```json
{
  "clinic_name": "Radiance Medspa Austin",
  "website": "https://radiancemedspa.example.com",
  "contact_name": "Jordan Lee",
  "email": "jordan@radiancemedspa.example.com",
  "phone": "+1 512 555 0100",
  "city_state": "Austin, TX",
  "biggest_problem": "Website form submissions sit in a shared inbox and weekend enquiries wait until Monday."
}
```

| Field | Required | Notes |
| ----- | -------- | ----- |
| `clinic_name` | yes | |
| `website` | yes | `https://` added server-side if omitted |
| `contact_name` | yes | |
| `email` | yes | lowercased server-side |
| `phone` | no | omitted or empty → `null` in outbound payload |
| `city_state` | yes | |
| `biggest_problem` | yes | |

---

## Response (success)

**HTTP 200**

```json
{
  "ok": true,
  "message": "Audit request received. We will review within 2 business days.",
  "delivery": {
    "automation_event": true,
    "automation_deduped": false,
    "n8n_direct": false,
    "n8n_direct_configured": false
  }
}
```

`delivery` is for operator debugging; the public page shows only the success message.

---

## Response (validation error)

**HTTP 400**

```json
{
  "error": "Clinic name is required",
  "field": "clinic_name"
}
```

---

## Flat payload (`N8N_PRODUCT_A_INTAKE_WEBHOOK_URL`)

Posted as JSON body to the configured webhook URL:

```json
{
  "schema": "corpflow.product_a.intake.v1",
  "event_type": "intake.product_a.us_clinic.v1",
  "received_at": "2026-06-20T14:30:00.000Z",
  "status": "new",
  "clinic_name": "Radiance Medspa Austin",
  "website": "https://radiancemedspa.example.com",
  "contact_name": "Jordan Lee",
  "email": "jordan@radiancemedspa.example.com",
  "phone": "+1 512 555 0100",
  "city_state": "Austin, TX",
  "biggest_problem": "Website form submissions sit in a shared inbox and weekend enquiries wait until Monday.",
  "source": "product-a-landing",
  "page": "/product-a/us-clinics",
  "host": "corpflowai.com"
}
```

Map these fields to the Google Sheet columns in the implementation plan § 7.

**Idempotency (automation_events):** `product-a:intake:{email}:{clinic-slug}:{YYYY-MM-DD}`

---

## Automation envelope (`CORPFLOW_AUTOMATION_FORWARD_URL`)

When the automation event is recorded, n8n receives:

```json
{
  "schema": "corpflow.automation.envelope.v1",
  "id": "…",
  "occurred_at": "2026-06-20T14:30:00.000Z",
  "tenant_id": "root",
  "tenant_scope": "global",
  "event_type": "intake.product_a.us_clinic.v1",
  "correlation_id": "product-a:intake:jordan@radiancemedspa.example.com:radiance-medspa-austin:2026-06-20",
  "risk_tier": "low",
  "source": "api/product-a/intake",
  "payload": {
    "schema": "corpflow.product_a.intake.v1",
    "event_type": "intake.product_a.us_clinic.v1",
    "received_at": "2026-06-20T14:30:00.000Z",
    "status": "new",
    "clinic_name": "Radiance Medspa Austin",
    "website": "https://radiancemedspa.example.com",
    "contact_name": "Jordan Lee",
    "email": "jordan@radiancemedspa.example.com",
    "phone": "+1 512 555 0100",
    "city_state": "Austin, TX",
    "biggest_problem": "Website form submissions sit in a shared inbox and weekend enquiries wait until Monday.",
    "source": "product-a-landing",
    "page": "/product-a/us-clinics",
    "host": "corpflowai.com"
  }
}
```

Branch in n8n on `event_type === intake.product_a.us_clinic.v1`. See `docs/n8n/automation-forward-recipe.md`.

---

## Environment variables

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `N8N_PRODUCT_A_INTAKE_WEBHOOK_URL` | no | Direct flat JSON POST to dedicated n8n workflow |
| `CORPFLOW_AUTOMATION_FORWARD_URL` | no (recommended prod) | Automation envelope forward after Postgres write |
| `CORPFLOW_AUTOMATION_FORWARD_SECRET` | no | Header `x-corpflow-automation-forward-secret` on forward POST |
| `POSTGRES_URL` | yes (prod) | `automation_events` audit row |

Placeholders in `.env.template`.

---

## Operator deployment checklist (Phase 1 closeout)

Use this after merge to Production. n8n Sheet workflow setup is a separate Codex track — not required to merge this PR.

1. **Deploy** the merged branch to Vercel Production (auto-deploy on `main` merge).
2. **Automation path (recommended):** ensure `CORPFLOW_AUTOMATION_FORWARD_URL` (+ optional `CORPFLOW_AUTOMATION_FORWARD_SECRET`) are already set on Production. Add an n8n branch on `event_type === intake.product_a.us_clinic.v1` in the existing automation-forward workflow (`docs/n8n/automation-forward-recipe.md`).
3. **Direct webhook (optional):** set `N8N_PRODUCT_A_INTAKE_WEBHOOK_URL` **only** if using a dedicated flat-JSON n8n ingest instead of (or in addition to) the automation-forward branch.
4. **Live test:** submit one audit request from [https://corpflowai.com/product-a/us-clinics](https://corpflowai.com/product-a/us-clinics) with a clearly labelled test clinic name.
5. **Confirm Postgres:** factory-only `GET /api/automation/events` (or DB query) shows a row with `event_type: intake.product_a.us_clinic.v1`.
6. **Confirm n8n:** if automation-forward or direct webhook is configured, verify the execution received the payload (envelope or flat JSON per path above).
7. **Confirm visitor UX:** success message appears; form is replaced by the thank-you state; no payment or external CRM redirect.

**Local dev caveat:** `next dev` does not apply `vercel.json` API rewrites — `/api/product-a/intake` 404s locally unless you use `vercel dev`. Production and Preview use `factory_router` correctly.

---

## Code references

| File | Role |
| ---- | ---- |
| `pages/product-a/us-clinics.js` | Public route |
| `components/ProductAUsClinicLanding.js` | Landing + form UX |
| `lib/server/product-a-intake.js` | API handler |
| `lib/server/product-a-intake-payload.js` | Validation + payload builder |
| `api/factory_router.js` | Routes `product-a/intake` |
