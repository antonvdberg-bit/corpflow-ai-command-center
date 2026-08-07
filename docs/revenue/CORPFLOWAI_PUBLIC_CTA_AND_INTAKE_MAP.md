# CorpFlowAI public CTA and intake map

**Status:** Operator verification register · **Updated:** 2026-08-07 (#699 path-prefill)
**Anchor:** `<!-- CORPFLOWAI_PUBLIC_CTA_INTAKE_MAP_V1 -->`

<!-- CORPFLOWAI_PUBLIC_CTA_INTAKE_MAP_V1 -->

Traces every primary public CTA on priority routes. Qualified market enquiries and MUR sprint discovery persist via `POST /api/tenant/intake` (`meta.product = corpflow-rapid-delivery`) into the existing `leads` table. Homepage service paths deep-link to `/contact?path={id}#discovery` (mapped to buyer-need). Operator desk: `/admin/rapid-delivery` (+ cockpit link on `/change/revenue`). **No automated outreach** without separate Anton approval.

---

## Priority routes (P0 slice)

### `/` — homepage

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/` hero | Request a qualified conversation | `/contact#discovery` | form | `leads` | Reference on screen | Validation / tenant context | `/admin/rapid-delivery` | — | **Working** |
| `/` hero | See how we help | `#service-paths` | — | — | In-page scroll | — | — | — | **Working** |
| `/` service path cards | Enquire about this path → | `/contact?path={id}#discovery` | form | `leads` | Reference on screen | Validation | `/admin/rapid-delivery` | — | **Working** |
| `/` offer cards (secondary) | View sprint → | `/offers/{slug}` | — | — | Offer page loads | — | — | — | **Working** |

### `/offers/*` — rapid delivery sprints

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/offers/{slug}` | Request discovery | `#discovery` form | `POST /api/tenant/intake` | `leads` (`corpflow-rapid-delivery`) | On-screen `CF-…` reference | Validation | `/admin/rapid-delivery` | `revenue_offer_cta_click` | **Working** |
| `/offers/{slug}` | Email fallback | `mailto:support@corpflowai.com` | mail client | Inbox only | Compose opens | No mail client | Manual | — | **Working** |

### `/contact`

| Source route | Button text | Destination | Form/API | Persistence | Success | Failure | Operator follow-up | Analytics | Current result |
| ------------ | ----------- | ----------- | -------- | ----------- | ------- | ------- | ------------------ | --------- | -------------- |
| `/contact` | Submit enquiry | `POST /api/tenant/intake` | form (`buyer_need` / `?path=` prefill) | `leads` | On-screen reference | Validation | `/admin/rapid-delivery` | — | **Working** |
| `/contact` | Email fallback | `mailto:support@corpflowai.com` | mail client | Inbox only | Compose opens | — | Manual | — | **Working** |
| `/contact` | Go to AI Lead Rescue intake | `/lead-rescue` | — | — | Intake page | — | `/admin/lead-rescue` | — | **Working** |

### `/lead-rescue` (specialist — USD wedge; unchanged)

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
structured form (/contact or /offers/*)
→ CF- reference on screen
→ /admin/rapid-delivery (qualify + proposal summary)
→ discovery call + delivery proof (/offers/*, /standards)
→ quote email only after Anton approval
→ deposit → verify → deliver → ERPNext invoice
```

Authoritative records: **ERPNext**. CorpFlowAI holds public capture + operator desk (`/admin/rapid-delivery`, `/change/revenue`).
