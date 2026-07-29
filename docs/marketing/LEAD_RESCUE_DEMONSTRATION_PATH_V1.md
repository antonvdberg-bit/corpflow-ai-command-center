# Lead Rescue — Demonstration Path v1

**Status:** Verification record for #653. Read-only GET evidence + operator demo script + enquiry→cockpit path.
**Anchor sentinel:** `<!-- LEAD_RESCUE_DEMONSTRATION_PATH_V1 -->`

<!-- LEAD_RESCUE_DEMONSTRATION_PATH_V1 -->

**Parent pack:** `docs/marketing/LEAD_RESCUE_PRODUCT_PACK_V1.md`  
**Issue:** [#653](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/653)

## Live GET checks (2026-07-29 UTC — runnable slice refresh)

| URL | HTTP | Notes |
|-----|------|-------|
| `https://corpflowai.com/lead-rescue` | **200** | Primary sellable surface + intake + FAQ |
| `https://aileadrescue.corpflowai.com/` | **200** | Alias host |
| `https://corpflowai.com/lead-rescue/property-mauritius` | **200** | Mauritius property vertical |
| `https://corpflowai.com/offers/ai-lead-rescue` | **200** | MUR sprint — separate offer path |
| `https://core.corpflowai.com/admin/lead-rescue` | **307** → login (unauth) / **200** with session | Operator cockpit (auth required for pipeline) |

## Buyer → operator path (logical)

```text
Buyer opens /lead-rescue
  → CTA "Start my 48-hour setup" (#intake)
  → Reads FAQ (#faq) if needed
  → POST /api/tenant/intake (ai-lead-rescue)
  → On-screen confirmation with lead_id reference (no window.alert)
  → Operator opens /admin/lead-rescue/[id]
  → Operator pack panel → quote / pro-forma / onboarding links
  → Qualify → pro-forma (manual) → wire clear
  → 48h setup checklist → hand-over → 7-day monitoring
```

## Sales-call demo script (no private data)

1. Open `/lead-rescue` — show single USD 150 offer + CTA **Start my 48-hour setup**.
2. Scroll **How it works** + **What you see every morning** (representational disclaimer).
3. Open **FAQ** — CRM / no-guarantee / what happens after intake.
4. Submit a **marked test intake** (business name prefix `TEST-` / email you control) **only on Preview or with cleanup tooling** — show on-screen **Reference: {lead_id}**.
5. Open `/admin/lead-rescue` (factory session) → find the row → open detail.
6. Show **Operator pack** links + status pipeline + (if `PAID_SETUP+`) setup checklist.
7. Close/cleanup test intakes via existing `#548` tooling — do not leave demo pollution.

## What this packet did **not** do

- Did not POST a real intake from CI against Production (avoid test-lead pollution; #548 covers cleanup).
- Did not access authenticated admin session from CI.
- Did not send WhatsApp/email/SMS.
- Did not deploy or change payment runtime.
