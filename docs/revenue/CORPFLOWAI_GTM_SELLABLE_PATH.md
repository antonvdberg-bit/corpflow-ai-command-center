# CorpFlowAI GTM — sellable revenue path (P0)

**Status:** Operator map · **Updated:** 2026-07-14  
**Anchor:** `<!-- CORPFLOWAI_GTM_SELLABLE_PATH_V1 -->`

<!-- CORPFLOWAI_GTM_SELLABLE_PATH_V1 -->

Smallest complete path from public offer → operator desk → proposal-ready summary. **No visual system expansion.** **No automated outreach** (email/WhatsApp/SMS) without separate Anton approval.

## Prospect path

```text
Choose offer (/ or /offers/{slug})
→ Submit DiscoveryIntakeForm (#discovery on /contact or offer page)
→ On-screen CF-… reference
→ Row in leads (product = corpflow-rapid-delivery)
→ Operator: /admin/rapid-delivery (also linked from /change/revenue)
→ Qualify status + copy proposal summary
→ Demonstrate delivery proof (offer page + /standards + /process links in summary)
→ Send outreach only after Anton approval
→ ERPNext for authoritative commercial state
```

## Surfaces

| Who | Where |
| --- | ----- |
| Prospect | `/`, `/offers/*`, `/contact#discovery` |
| Operator list / qualify / proposal | `/admin/rapid-delivery` (admin session) |
| Revenue checklist + desk link | `/change/revenue` |
| USD wedge (unchanged) | `/lead-rescue` → `/admin/lead-rescue` |

## APIs

- `POST /api/tenant/intake` with `meta.product = corpflow-rapid-delivery` (+ business_name, enquiry_channels, primary_pain, offer_slug)
- `GET /api/factory/rapid-delivery/list|get|proposal`
- `PATCH /api/factory/rapid-delivery/patch`

## Explicit non-actions

- No second CRM or new database
- No payment / WhatsApp / SMS runtime on this path
- No automatic send of proposal or outreach
- No visual redesign beyond wiring the form into existing pages
