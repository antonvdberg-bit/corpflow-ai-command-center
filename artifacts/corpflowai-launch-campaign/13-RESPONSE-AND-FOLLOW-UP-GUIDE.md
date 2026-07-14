# Response and Follow-Up Guide

**Status:** DRAFT ONLY · **Owner:** Anton  
**Companion:** `docs/revenue/MAURITIUS_DISCOVERY_AND_FOLLOW_UP_SEQUENCE_V1.md`, `docs/revenue/templates/`

---

## Response SLAs (operator)

| Event | SLA |
| ----- | --- |
| Discovery form submitted (CF-…) | Acknowledge within **24 hours** |
| Warm outreach reply (interested) | Reply same business day |
| Discovery call completed | Written quote within **24 hours** |
| Quote sent | Follow up once at **3 business days** if silent |
| Deposit requested | Follow up once at **5 business days** if silent |
| Preview sent | Client feedback within **2 business days** (playbook) |

---

## Inbound reply types

### "Tell me more" / "Send info"

> **DRAFT ONLY — EXTERNAL OUTREACH REQUIRES ANTON APPROVAL**

Thanks for getting back. Best starting point is the offer page — it shows scope, price, and timeline:

[Matched offer URL from 02-OFFER-MESSAGE-MATRIX.md]

If it looks relevant, submit discovery on that page (you'll get a reference number) and we'll book 15 minutes. No slides.

---

### "How much?" (before discovery)

> **DRAFT ONLY — EXTERNAL OUTREACH REQUIRES ANTON APPROVAL**

Starting prices are on the offer page — Lead Rescue from MUR 35,000, Landing Page and Recovery from MUR 45,000. All sprints: 50% deposit, first visible output in 24–72 hours after deposit clearance.

Final quote depends on your channels and scope — that's what the 15-min discovery call is for. No revenue guarantees.

[Offer URL]

---

### "Not now"

> **DRAFT ONLY — EXTERNAL OUTREACH REQUIRES ANTON APPROVAL**

Understood — I'll note not now. If enquiry follow-up becomes urgent, Lead Rescue sprint is here:

https://corpflowai.com/offers/ai-lead-rescue

Wishing you a strong month.

---

### "We already have a CRM"

> **DRAFT ONLY — EXTERNAL OUTREACH REQUIRES ANTON APPROVAL**

Good — we're not replacing your CRM. Lead Rescue connects one priority source and gives a visible follow-up board your team uses immediately. Bounded sprint, handover doc, typically five business days.

Worth 15 min to see if it fills the gap?

---

### "Can you guarantee more leads?"

> **DRAFT ONLY — EXTERNAL OUTREACH REQUIRES ANTON APPROVAL**

No — we don't guarantee revenue or lead volume. We deliver visible workflow output in 24–72 hours: captured enquiries, alerts, and a follow-up path you can operate. Structural delivery, not hype.

---

### "We want AI / chatbot on the website"

> **DRAFT ONLY — EXTERNAL OUTREACH REQUIRES ANTON APPROVAL**

CorpFlowAI focuses on managed follow-up workflows with human accountability — not generic chatbots. If the pain is missed enquiries, Lead Rescue sprint is the fit. If you need a credible enquiry path on the site, Landing Page Rescue.

Happy to decline if the fit isn't there.

---

### "Can we pay in USD?"

> **DRAFT ONLY — EXTERNAL OUTREACH REQUIRES ANTON APPROVAL**

Mauritius delivery sprints are quoted and invoiced in **MUR** (manual bank transfer). USD banking for that path is not yet available.

Separately, we have a USD 150 Lead Rescue pilot at corpflowai.com/lead-rescue — different scope and path. I can clarify on a quick call which fits.

---

## Follow-up sequence (no reply to outreach)

| Touch | Timing | Channel | Draft |
| ----- | ------ | ------- | ----- |
| 1 | Initial | Email or WhatsApp | EM-01 / WA-01 |
| 2 | +7 days | Same channel | WA-06 / short bump |
| 3 | +14 days | Email | EM-07 re-intro |
| Stop | After 3 | — | Mark "paused" in metrics |

**Max 3 touches in 30 days** unless prospect re-engages.

---

## Post-discovery follow-up (no quote reply)

> **DRAFT ONLY — EXTERNAL OUTREACH REQUIRES ANTON APPROVAL**

**Subject:** Re: Quote — [Business name]

Hi [First name],

Checking whether the [sprint name] quote reached you and if questions came up.

Happy to adjust scope in writing if something didn't fit. Otherwise I'll assume timing isn't right and won't chase.

Anton

---

## Post-deposit follow-up

Use templates in `docs/revenue/templates/`:

- `deposit-request.md` — initial ask
- `deposit-received-manual-verification.md` — after cleared funds
- `approval-to-proceed.md` — starts delivery clock

**Never start build before cleared deposit** (playbook §7).

---

## Negative public comment (social)

1. Do not argue publicly
2. Acknowledge briefly if appropriate: "Thanks for the feedback — happy to discuss directly"
3. Move to DM or email
4. Escalate to Anton if legal/reputation risk

---

## Handoff to delivery

When deposit cleared + approval to proceed sent:

1. Create ERPNext project/opportunity when live
2. Track on `/change/revenue` checklist
3. Delivery per sprint scope in `lib/public/rapid-delivery-offers.js`
4. Preview → `preview-feedback-request.md` template
5. Production → `production-release-approval.md` template
6. Close with Delivery Reality Audit per `.cursor/rules/delivery-reality.mdc`

---

## Objection quick reference

| Objection | Key response |
| --------- | ------------ |
| Too expensive | One lost job / bad review week vs sprint cost; 50% deposit |
| Too fast / sceptical | Preview before production; documented handover |
| Need to think | Offer 15-min call; no pressure; send offer link |
| Competitor / DIY | Bounded accountable delivery vs open-ended project |
| Privacy / data | No sensitive data in marketing tools; security review for regulated verticals |

Full discovery script: `docs/revenue/templates/discovery-call-script.md`
