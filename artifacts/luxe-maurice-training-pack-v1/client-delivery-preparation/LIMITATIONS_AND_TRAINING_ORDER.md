# Limitations and suggested training order

**Audience:** Jan / LuxeMaurice (after Anton send approval)  
**Live site:** `https://lux.corpflowai.com/client/luxe-maurice-ai`

---

## Current limitations (truthful)

| Topic | Current state |
|-------|----------------|
| Private Access Request submit + on-screen `LM-REQ-…` | Live |
| Advisor Pipeline (signed-in review of persisted requests) | Live — **read-only** for stage / notes |
| Operator stage, owner, next action, notes in Change Console | Live |
| Focused selected-lead list + OPERATOR ACTIONS below | Live |
| Outbound email from the platform | **Not live** |
| Outbound WhatsApp from the platform | **Not live** |
| Outbound SMS from the platform | **Not live** |
| Automated confirmation to the guest after submit | **Not live** |
| Automated advisor notifications | **Not live** |
| Follow-up after a request is submitted | **Human-led** by your team |
| General self-service CMS for every page/content type | **Not available** |
| Property/listing text + visibility | Existing protected `/properties/admin` editor |
| Image/video/PDF upload + review | Existing governed `/change` attachment workflow |
| Public images and galleries | Explicitly reviewed, linked, and published `image/*` only |
| Public PDF download or video player | **Not implemented** — placement/hosting surface must be prepared and approved |

Do not expect the platform to send messages on your behalf today. Discreet follow-up is handled by advisors and operators using the contact details provided on the request.

---

## Suggested training order

1. **Client journey (live practice + guide + graphics 01–04)**  
   Landing → Access catalogue → Private Access Request → on-screen reference.  
   Use the training identity: **LuxeMaurice Training User** / `training@example.invalid`.

2. **Advisor journey (guide + graphics 05–07)**  
   Sign in → Advisor Pipeline → read **Received for advisor review** → understand Demonstration records vs live rows → confirm signed-out privacy posture.

3. **Operator workflow (guide + graphic 08)**  
   Open `/change` → LEADS → select training lead → confirm focus + OPERATOR ACTIONS → practise stage / next-action updates → use Show all leads / Clear selection / Focus list on this lead.

4. **Website content workflow (graphics 09–11)**
   `/properties/admin` listing text/visibility → `/change` Upload content → attachment review → image link/publish → verify live page.

5. **Live practice round**
   Submit one training request, review it in Advisor Pipeline, update it in Change Console, then agree how your team will handle real human-led follow-up.

**Videos:** Not required for this pack. Optional scripts remain in `scripts/` if you later want to record walkthroughs.

---

## Source detail

Full technical status: [`status/BACKEND_STATUS_AND_LIMITATIONS.md`](./status/BACKEND_STATUS_AND_LIMITATIONS.md)
