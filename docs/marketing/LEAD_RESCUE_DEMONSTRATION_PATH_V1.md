# Lead Rescue — Demonstration Path v1

**Status:** Verification record for #653. Read-only GET evidence + operator demo script.
**Anchor sentinel:** `<!-- LEAD_RESCUE_DEMONSTRATION_PATH_V1 -->`

<!-- LEAD_RESCUE_DEMONSTRATION_PATH_V1 -->

**Parent pack:** `docs/marketing/LEAD_RESCUE_PRODUCT_PACK_V1.md`  
**Issue:** [#653](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/653)

## Live GET checks (2026-07-28 UTC — Agent 2 refresh)

| URL | HTTP | Notes |
|-----|------|-------|
| `https://corpflowai.com/lead-rescue` | **200** | Primary sellable surface + intake |
| `https://aileadrescue.corpflowai.com/` | **200** | Alias host |
| `https://corpflowai.com/lead-rescue/property-mauritius` | **200** | Mauritius property vertical |
| `https://corpflowai.com/offers/ai-lead-rescue` | **200** | MUR sprint — separate offer path |
| `https://core.corpflowai.com/admin/lead-rescue` | **200** | Operator cockpit (auth required for pipeline) |

## Buyer → operator path (logical)

```text
Buyer opens /lead-rescue
  → CTA "Start my 48-hour setup" (#intake)
  → POST /api/tenant/intake (ai-lead-rescue)
  → Operator opens /admin/lead-rescue/[id]
  → Qualify → pro-forma (manual) → wire clear
  → 48h setup checklist → hand-over → 7-day monitoring
```

## What this packet did **not** do

- Did not POST a real intake (avoid test-lead pollution; #548 already covered test-intake cleanup).  
- Did not access authenticated admin session.  
- Did not send WhatsApp/email/SMS.
