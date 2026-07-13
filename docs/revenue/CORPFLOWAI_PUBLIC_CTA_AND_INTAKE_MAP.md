# CorpFlowAI public CTA and intake map

**Status:** Operator verification register · **Updated:** 2026-07-13  
**Anchor:** `<!-- CORPFLOWAI_PUBLIC_CTA_INTAKE_MAP_V1 -->`

<!-- CORPFLOWAI_PUBLIC_CTA_INTAKE_MAP_V1 -->

Traces every primary public CTA on priority routes. **No new email/WhatsApp/SMS runtime, payment, or DB/schema changes in this PR.**

---

## Priority routes (P0 slice)

### `/` — homepage

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/` hero | Book a discovery conversation | `/contact` | — | — | Contact page loads | 404 if route broken | Anton reads email / ERPNext when configured | — | **Working** |
| `/` hero | View delivery sprints | `#offers` | — | — | In-page scroll | — | — | — | **Working** |
| `/` offer cards | View sprint → | `/offers/{slug}` | — | — | Offer page loads | — | — | — | **Working** |

### `/offers/*` — rapid delivery sprints

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/offers/{slug}` | Request Discovery Call | `mailto:support@corpflowai.com` | User mail client | Operator inbox / ERPNext | Mail compose opens | No mail client | Discovery → quote | `revenue_offer_cta_click` | **Working** |
| `/offers/{slug}` | Book discovery conversation | `/contact` | — | — | Contact page | — | mailto on contact | `revenue_offer_cta_click` | **Working** |

### `/contact`

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/contact` | Email to book discovery | `mailto:support@corpflowai.com` | User mail client | Operator inbox | Compose opens | — | Discovery call | — | **Working** |
| `/contact` | Go to AI Lead Rescue intake | `/lead-rescue` | — | — | Intake page | — | `POST /api/tenant/intake` | — | **Working** |

### `/lead-rescue` (specialist — not redesigned in this PR)

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/lead-rescue` | Intake submit | `POST /api/tenant/intake` | `lib/server/tenant-intake.js` | `leads` table | JSON success | Validation error | `/admin/lead-rescue` | `tenant.lead.captured` | **Working** |

---

## Forbidden public destinations (verified by test)

- No public page should link primary CTAs to `/change`.
- No public page should expose Core admin URLs.

---

## ERPNext-first operator path (manual)

```text
mailto / contact → discovery → quote → deposit → manual verification →
approval → delivery → preview → release → invoice
```

Authoritative records: **ERPNext**. CorpFlowAI: public pages + `/change/revenue` checklist only.
