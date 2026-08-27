# WhatsApp Tier 1 — manual contact (operator / test note)

**Status:** Reusable capability in repo. **Not attached** to a public or client production surface in this packet.  
**Issues:** [#1214](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1214) (this packet; supersedes stale [#1137](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1137) / closed PR #1138), parent [#702](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/702) / [#492](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/492).  
**Decision:** `docs/decisions/20260629-whatsapp-tier1-tier2-capability.md`  
**Environment:** `corpflow_test` / repo only.  
**Machine contract:** `config/whatsapp-tier1.v1.json` · `lib/whatsapp/tier1.js` · `lib/whatsapp/qr-svg.js` · `components/whatsapp/WhatsAppTier1Contact.js`

<!-- WHATSAPP_TIER1_MANUAL_CONTACT -->

## What this is

A visitor taps **Message us on WhatsApp** (or scans the QR). Their own WhatsApp app / WhatsApp Web opens a chat with the **configured business number** and a **prefilled message**. They choose whether to send it. A person in the business replies from that WhatsApp account.

**There is no WhatsApp API, webhook, token, automation, chatbot, or send runtime in this packet.** CorpFlowAI does not transmit the message. Nothing is stored from the tap.

## Reuse evidence (this packet)

- Existing `wa.me` helper: `cafeInternationalWhatsAppHref` in `lib/website-rescue/cafe-international-preview.js`. It now calls shared `buildWhatsAppMeHref`.
- No existing QR library or paid QR helper in the repo. Local ECC-M SVG encoder: `lib/whatsapp/qr-svg.js`.
- Published business numbers only: CorpFlowAI uses `CUSTOMER_SERVICE_PHONE` (`+230 5901 4284`); Café International uses the already-public fixture `+230 5765 8735`.
- Twilio/exec env names (`EXEC_WHATSAPP_NUMBER`, `ADMIN_WHATSAPP_NUMBER`, `WHATSAPP_FROM`) are **not** reused.
- Scope and tests reuse closed PR #1138 / issue #1137; this packet lands that capability on current `main` as #1214.

## Operator response flow (manual)

1. Confirm the tenant/product row in `config/whatsapp-tier1.v1.json` has the correct **business** number (never a personal number) and a safe prefill.
2. Set `enabled` to `true` on the **tenant** row, and also on the **product** overlay if one is used, only when a later delivery approval attaches the component to a named surface. A product overlay cannot turn WhatsApp on while the tenant stays disabled.
3. On that surface, resolve the model and render `WhatsAppTier1Contact` (see consumption snippet below). Do not add env vars or schema.
4. When a visitor sends the WhatsApp, answer from the business WhatsApp app as a person. No CorpFlow queue, alert, or auto-reply exists at Tier 1.
5. Leave `enabled` false (and do not import the component) until that surface approval exists.

## Runtime confirmation (non-negotiable)

| Capability | This packet |
|------------|-------------|
| Meta / WhatsApp Cloud API | **No** |
| Webhook / inbound receive | **No** |
| Token, secret, or new env var | **No** |
| Automation / chatbot reply | **No** |
| Live send from CorpFlowAI | **No** |
| DB / Prisma schema | **No** |
| Paid QR or BSP dependency | **No** |
| `wa.me` deep link + local QR SVG | **Yes** |

Existing `.env.template` names `EXEC_WHATSAPP_NUMBER`, `ADMIN_WHATSAPP_NUMBER`, and `WHATSAPP_FROM` are Twilio-sandbox / exec leftovers. **Do not reuse them for Tier 1.**

## How to consume later (after delivery approval)

```js
import WhatsAppTier1Contact from '../components/whatsapp/WhatsAppTier1Contact.js';
import { resolveWhatsAppTier1Contact } from '../lib/whatsapp/tier1.js';
import catalog from '../config/whatsapp-tier1.v1.json';

const contact = resolveWhatsAppTier1Contact({
  tenantId: 'cafe-international',
  catalog,
});

<WhatsAppTier1Contact contact={contact} />
```

`enabled` stays `false` in the catalog until that approval. The helper fail-closes (accessible unavailable copy, no `wa.me` link).

## Exact existing surfaces (not attached in this packet)

These already exist and are the later consumers after the relevant delivery approval. This packet does **not** import the component there.

| Surface | Host / path | Why it is a later consumer |
|---------|-------------|----------------------------|
| Café International takeaway | `/demo/cafe-international/takeaway` | Already uses `cafeInternationalWhatsAppHref` → `wa.me` |
| Café International contact | `/demo/cafe-international/contact` | Same takeaway WhatsApp / phone split |
| Café International menu | `/demo/cafe-international/menu` | Per-category WhatsApp order links |
| CorpFlowAI contact | `https://corpflowai.com/contact` (`pages/contact.js`, apex) | Public discovery form; optional WhatsApp CTA after marketing-doctrine review |
| Lux / Rare & Exclusive contact | `https://lux.corpflowai.com/contact` (same page, `luxMode`) | Tenant contact path; separate approval |
| AI Lead Rescue landing | `/lead-rescue` and `/contact?offer=ai-lead-rescue` | Product overlay `ai-lead-rescue` in the catalog; not enabled |

**Not a consumer until Stage 5 + Living Word privacy/pilot gates:** Living Word member / church WhatsApp. The catalog has no `living-word` tenant on purpose.

Café International’s existing `wa.me` helper now calls the shared `buildWhatsAppMeHref` primitive. That is reuse of the URL builder, **not** publication of `WhatsAppTier1Contact`.

## Test checklist (no live send)

1. `node --test node-tests/whatsapp-tier1.test.mjs`
2. Confirm catalog tenants stay `enabled: false`.
3. Confirm public pages do not import `WhatsAppTier1Contact`.
4. Confirm `.env.template` gained no WhatsApp names.
5. After a later attach PR: live-verify the named URL (Delivery Reality). This packet is **PARTIAL** for operational delivery because it is intentionally not on a customer-facing route.

ANTON ACTION: NONE until merge of this PR, or a later request to attach the component to a named surface (that attach is a separate packet).
