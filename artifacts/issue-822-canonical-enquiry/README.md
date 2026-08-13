# #822 local verification — canonical enquiry

**Canonical Lead Rescue CTA URL:** `/contact?offer=ai-lead-rescue#discovery`

Local `next start` (port 3099) after `npm run build`, 2026-08-13.

| Route | HTTP | Forms | Locked product context | Buyer-need select | CTA hrefs |
| ----- | ---- | ----- | ---------------------- | ----------------- | --------- |
| `/lead-rescue` | 200 | 0 | 0 | 0 | 3 × `/contact?offer=ai-lead-rescue#discovery` |
| `/contact?offer=ai-lead-rescue#discovery` | 200 | 1 | 1 (`data-locked-offer-slug=ai-lead-rescue`) | 0 | — |
| `/contact#discovery` | 200 | 1 | 0 | 1 | — |

Contact headings after cleanup: `Request a qualified conversation`, `Support`. Absent: `AI Lead Rescue intake (USD pilot)`, `Related product pages`, `Customer support and complaints`.

Locked copy observed: “You are requesting discovery for AI Lead Rescue. Tell us about the problem and timing — you do not need to re-classify the product.”

Screenshots (this directory) were captured for the PR; they are local review evidence, not a production Delivery Reality Audit.

```text
npm test: PASS
npm run build: PASS
npm run eval:ai: NOT APPLICABLE — no AI prompt, drafting, chatbot, routing-model, or protected-action behaviour changed
```
