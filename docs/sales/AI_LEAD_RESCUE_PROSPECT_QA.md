# AI Lead Rescue — Prospect Q&A guide

**Audience:** the operator on a discovery call, in a WhatsApp thread, or in an email reply, when a prospect asks one of the standard questions below.

**Status:** Sales-side answer guide. Docs-only — no runtime, no schema, no env vars.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_PROSPECT_QA_V1 -->`

<!-- AI_LEAD_RESCUE_PROSPECT_QA_V1 -->

## How to use this guide

Each question below comes with **two answers**:

1. **Short answer** — the one-liner you say first (on a call) or write first (in a DM / email). Owner-friendly. Non-technical. Honest.
2. **Extended answer** — what you say only if the prospect asks for more detail. Still owner-friendly. Still honest.

Use *"we can start with…"* and *"for the first pilot…"* language. Avoid over-promising integrations. Avoid jargon (CRM, API, webhook, schema, automation, AI agent — replace with operational verbs the owner already uses).

If a question is not in this guide, **do not invent an answer**. Tell the prospect: *"Good question — give me until tomorrow and I'll come back to you with a clear yes / no."* Then check the capability matrix (`docs/sales/AI_LEAD_RESCUE_CAPABILITY_MATRIX.md`), log the gap in the prospect-list spreadsheet (or cockpit Activity Log if a lead row exists), and update this guide in a follow-up docs PR if the question is likely to come up again.

## The questions

### *"Can you connect to WhatsApp?"*

**Short:** *"Yes — we can monitor your WhatsApp Business inbox manually during the pilot, and we'll surface every new enquiry into your daily lead list. We don't replace WhatsApp; we connect it."*

**Extended:** *"For the first pilot we don't run anything inside WhatsApp Cloud API — that's a separate engagement because Meta requires verification, a phone number, message templates, and compliance review. For the 48-hour setup we either share your WhatsApp Business inbox between you and me, or you forward new chats to me on a labelled inbox. Either way, the goal is the same — every new WhatsApp enquiry appears in your daily lead list, and you get one summary per day on the channels you actually read."*

### *"Can you reply to leads for me?"*

**Short:** *"For the first pilot, replies stay with you — I review every enquiry and surface it on your daily list, but I don't auto-send messages to your customers. That's by design."*

**Extended:** *"The pilot is a managed lead-response operating workflow with a human operator, not an AI that closes leads for you. Automated client-facing replies are something we don't promise — partly because tone and judgement matter, and partly because the legal and brand risk of auto-replying to enquiries on your behalf is too high for a 48-hour pilot. We help you reply faster by making sure nothing slips through. If you want a different shape — like first-touch acknowledgements drafted for your review — we can scope that as a custom add-on after the pilot."*

### *"Can this work with my website?"*

**Short:** *"Yes — we don't rebuild your website. We connect whatever enquiry channel your site already has (contact form, email button, WhatsApp link) into your daily lead list."*

**Extended:** *"We don't touch your design, your hosting, or your CMS. If your website already has a contact form, we add our operator inbox as a recipient on it so we see every submission. If your website uses an email button, we set up a forward. If your website sends people to WhatsApp, we wire that into the daily list too. The 48-hour setup is on our side — you don't have to change anything on yours."*

### *"Can this work if I only use Facebook?"*

**Short:** *"Yes — Facebook DMs are one of the channels we connect during the pilot. We monitor them manually for the week, and every new DM lands in your daily lead list."*

**Extended:** *"For the pilot we use Meta Business Suite — either we share the inbox between you and me, or you set Meta Business Suite to email new DMs to me. Same approach works for Instagram if you use both. We don't replace your Facebook page, and we don't auto-reply to your DMs — every reply still comes from you with my support."*

### *"Can this handle multiple languages?"*

**Short:** *"Yes — your daily summary can be in English, French, or Creole. We draft non-English summaries with translation tools and operator-review before send. Automated replies to your customers in any language are not part of the pilot."*

**Extended:** *"For the operator side — your daily summary, your internal notes — we can work in English, French, or Mauritian Creole. We use translation tools to draft, and I personally review before anything reaches you. For the customer-facing side — replies to your customers — those stay with you. We don't auto-translate-and-send to your customers, because nuance and tone in any language carry real risk. If multilingual customer-facing replies become a need after the pilot, we'll scope it as a separate custom build with the right review process."*

### *"Can I get SMS instead of Telegram?"*

**Short:** *"Telegram is the default for the operator side and WhatsApp + email is the default for you. SMS is feasible as a paid add-on, but it's not the first-pilot default — there's an SMS provider cost and an opt-in compliance step."*

**Extended:** *"Telegram is the operator-side alert — that's me, not you. For your side, the default is WhatsApp + email, because that's what owners actually read. SMS is technically feasible as an add-on (we'd wire a provider like Twilio or a local Mauritius SMS gateway), but it adds a per-message cost and an opt-in / unsubscribe compliance step, so it's not in the first pilot's USD 150 scope. If SMS matters to your customers, we can quote it as a paid add-on after the pilot. Most owners we speak to are fine with WhatsApp + email once they see the daily summary land."*

### *"Can you integrate with my CRM?"*

**Short:** *"For the pilot, no — and that's deliberate. AI Lead Rescue is a managed lead-response workflow, not a CRM. If you already have a CRM that works, the pilot sits alongside it. If you ever want a CRM integration later, that's a separate scope."*

**Extended:** *"We are not a CRM. The pilot doesn't migrate CRM data, doesn't ask you to leave your CRM, and doesn't try to be a CRM. The reason is honesty: a 48-hour setup that promises CRM integration is overpromising. CRM integrations are real engagements — they need scope discovery, field mapping, sandbox testing, and a security review. If you want one, we can quote it as a custom build after the pilot — but the pilot itself works with or without your CRM. Most owners find that for the first month, the daily lead list and the follow-up board already cover what they actually needed from a CRM."*

### *"Can you build me a small app?"*

**Short:** *"Yes — custom apps are something we can scope, but they're not part of the first pilot. The pilot is a 48-hour managed workflow; an app is a multi-week engagement with a separate quote."*

**Extended:** *"Building a small app is feasible — we've sketched a few patterns (a forwarding app on an owner-phone, a buyer-side dashboard, a custom inbox view). But these are separate from the pilot for two reasons: (1) they take multiple weeks and need their own quote, and (2) the right shape depends on what we learn from your pilot. If after the 7-day window you say *'I'd really like a small app that does X'*, we can scope that as a paid discovery engagement first. The discovery sets the scope and price; the build follows after you approve."*

### *"Can this run on my Android phone?"*

**Short:** *"Not as part of the pilot. We've considered a small forwarding app for owner-phones — it's feasible but it's a custom build with its own privacy review."*

**Extended:** *"The pilot doesn't install anything on your phone. You receive WhatsApp + email summaries on whatever phone you already use. We've sketched a forwarding-app concept — a small Android app that would relay SMS, missed calls, or WhatsApp notifications from an owner-phone into your daily lead list. It's technically feasible, but it requires permission to read notifications, which Google Play restricts, and it requires a privacy review because forwarding personal-phone notifications is a sensitive data flow. So it's not part of the pilot. If it becomes a real need after the pilot, we'd quote it as a custom build with the right consent and review steps."*

### *"Can you handle medical enquiries?"*

**Short:** *"We handle **appointment-enquiry follow-up** for clinics — *new-enquiry response, not patient records or medical data*. We do not handle clinical decisions, medical advice, or patient records."*

**Extended:** *"To be clear about scope: the pilot for clinics is for **new appointment enquiries** — someone messages your page asking about an appointment, and we make sure that enquiry is captured, alerted, and tracked daily. We do not touch patient records, medical notes, clinical decisions, or anything that involves health information. That's by design — it's not the right shape for AI Lead Rescue, and it would require a separate engagement with a security and privacy review. Every clinic conversation we have starts with this distinction, so you and I are aligned from message one."*

### *"Can you guarantee more sales?"*

**Short:** *"No — we never guarantee revenue. The pilot helps make sure existing enquiries are captured, visible, and followed up. Whether more of them convert is a function of your follow-up and your offer, not the pilot."*

**Extended:** *"This is the most important question to be honest about. We do not guarantee new revenue. We do not promise X new clients or Y% growth. What we do is make your existing enquiries visible — every enquiry captured, every alert fired, every follow-up tracked daily. Whether that turns into more sales depends on what you do with the daily list. If you need a revenue-guarantee product, AI Lead Rescue isn't the right offer for you, and I'd rather tell you that now than three months from now. If you want fewer enquiries slipping through and a Monday-morning view of where you stand — that's exactly what the pilot delivers."*

### *"What happens in the first 48 hours?"*

**Short:** *"You wire the USD 150, I confirm receipt, and the 48-hour setup window starts. Across those 48 hours I connect your most-leaky enquiry channel, set up your daily lead list, wire your alerts, and send a hand-over message at the end."*

**Extended:** *"Once the wire clears my SBM account, the clock starts. In the first 24 hours I confirm your channel choice, build your Google Sheet, and connect the lead source. In the second 24 hours I run a test enquiry end-to-end, send your first daily summary, and write you a short hand-over message — what's live, when summaries arrive, and how to reach me. Then we run a 7-day monitoring window. You'll see me on WhatsApp during those 7 days. At the end of day 7, we have a short recap conversation about whether monthly monitoring makes sense — nothing auto-renews."*

### *"What do you need from me?"*

**Short:** *"Three things: which channel is most leaky, a working WhatsApp number and email for daily summaries, and your availability to answer two or three short questions over WhatsApp during setup. That's it."*

**Extended:** *"To run the 48-hour window cleanly I need: (1) the **one channel** we'll connect for the pilot — usually your website form, your Facebook page, or your WhatsApp Business inbox; (2) a **working WhatsApp number** and a **working email** where you want daily summaries; (3) **your availability for ~3 short questions over WhatsApp** during the setup window (about format, timing, and what you want to see). I don't need access to your CRM. I don't need access to your bank. I don't need passwords. I don't need any customer data you don't want to share."*

### *"How much work will this create for me?"*

**Short:** *"Roughly 30 minutes during the setup window, then 5 minutes a day reading your summary. The point of the pilot is to take work off your plate, not add to it."*

**Extended:** *"During the 48-hour setup you'll get two or three short WhatsApp messages from me asking for confirmations — *'is 17:00 fine for the daily summary?'*, *'is this the WhatsApp number for alerts?'* — each takes a minute or two. After setup, the daily summary is one message you read in the morning or evening — under five minutes. If you want to act on a follow-up, that's normal sales work, but the pilot doesn't add admin to it. The 7-day monitoring window is designed to remove work, not create it. If at any point you feel the pilot is creating more work than it removes, tell me — we'd want to know."*

### *"Is this AI spam?"*

**Short:** *"No. I personally review every intake and every daily summary. AI tools speed up capture and drafting on my side, but every customer-facing message is reviewed by a human — me."*

**Extended:** *"Fair question, and the doctrine answer is short: AI tools are used internally on the operator side — capturing the enquiry, drafting the summary, organising the daily view. The customer-facing side is human-reviewed. I read every intake. I write or review every daily summary. Nothing is auto-sent to your customers without me looking at it. We also don't run bulk outbound on your behalf — no bulk email, no bulk WhatsApp, no scraped lead lists. The pilot is for enquiries that are already coming in to you. If at any point something doesn't pass the *'would a human actually say this?'* test, that's on me to fix."*

### *"Are you replacing my receptionist?"*

**Short:** *"No. The pilot complements whoever already handles enquiries — it doesn't replace them. We make the work visible so your receptionist or admin can act on it faster."*

**Extended:** *"If you have a receptionist or admin handling enquiries today, the pilot makes their job easier — they see a single daily list instead of jumping between WhatsApp, Facebook, email, and the website form. We don't take work away from them, and we don't try to be them. If you don't have a receptionist and you're handling enquiries yourself, the pilot is the daily list and the alerts; the human in the loop is me during the 7-day window. Either way, this is not a *replace your staff* offer. The owners we talk to typically tell us the opposite — that the pilot helps their existing team do less of the *'where did that enquiry go?'* work."*

### *"Do I need to change my website?"*

**Short:** *"No. We don't touch your website. We connect whatever enquiry channel it already has."*

**Extended:** *"The 48-hour setup happens on our side. If your website has a contact form, we add our operator inbox as a recipient — that's it. If your website uses an email button, we set up a forward. We don't change your design, your wording, your hosting, your CMS, or your existing email setup. If your website is fine, we work with what's there. If your website is broken or missing a contact form, we'll tell you — but fixing it is a separate conversation, not the pilot."*

### *"What happens if it doesn't work?"*

**Short:** *"Honest answer: if the pilot doesn't deliver what we agreed, I refund proportionally and we close the pilot honestly. No auto-renewal, no lock-in, no awkward conversation."*

**Extended:** *"The pilot has a clean failure mode by design. If at any point during the 48-hour setup something I committed to in your intake review doesn't actually work — your enquiries aren't landing in the sheet, alerts aren't firing, the daily summary isn't useful — I tell you, and I refund the part of the pilot that didn't deliver. We close the pilot honestly: a one-paragraph email summary of what was set up, what wasn't, and where we landed. The pilot doesn't auto-convert into monthly monitoring; you decide actively at day 7. So the worst case is: you've paid USD 150, you've seen one operator try to make your enquiry workflow visible, and you've decided it's not for you. No subscription to cancel, no contract to exit, no data to migrate back."*

## Hard rules

These apply to every answer in this guide and every conversation a prospect has with the operator:

- **No guaranteed revenue.** Allowed framing: *"existing enquiries get captured, alerted, and tracked"*. Forbidden framing: *"you'll get X new clients"* / *"Y% growth"*.
- **No generic AI agency positioning.** AI Lead Rescue is a managed lead-response operating workflow, not a chatbot, AI agent, or sales-team replacement.
- **No bulk outbound positioning.** Warm-network only for first 4 pilots.
- **No regulated-data scope without separate review.** Medical, financial, legal, minor-data adjacencies all stop at *"new-enquiry response, not records / advice / triage"*.
- **No fake testimonials, fake logos, or fake screenshots** in any conversation. Pre-proof window.
- **No customer-facing automated replies** without operator review. Translation tools, drafting tools, AI tools are operator-side acceleration only.

If the prospect's question or expectation crosses any of these lines, the right answer is *"this isn't the right offer for you"* — see the discovery-call script § 9 *Soft close patterns*.

## Cross-references

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — single-offer rule, allowed claims, no-guarantee copy.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — managed-workflow framing.
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — first-paid-pilots playbook (§ 9 objection handling).
- `docs/sales/AI_LEAD_RESCUE_CAPABILITY_MATRIX.md` — full capability matrix (companion to this guide).
- `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` — paste-ready scripts + objection handling.
- `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` — 15-minute discovery flow.
- `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` — pricing detail + no-guarantee language.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — operator cockpit runbook.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — security review triggers.
