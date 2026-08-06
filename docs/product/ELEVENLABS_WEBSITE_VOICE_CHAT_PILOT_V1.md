# ElevenLabs website voice-chat pilot (v1)

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Status:** `SERIOUS-CANDIDATE / EVALUATE-FIRST` — structure + gated placeholder only

**Verdict:** **`NO IMPLEMENTATION AUTHORIZED`** / **`NO ACTIVATION AUTHORIZED`** by this document or its companion PR. Public embed requires a **separate Anton-approved activation packet**.

**Owner:** Anton (operator decision + ElevenLabs UI); Cursor (repo structure)

**Date (UTC):** 2026-08-05

**Related:**

- Activation runbook: `docs/runbooks/ELEVENLABS_WEBSITE_VOICE_CHAT_ACTIVATION_V1.md`
- Gated placeholder: `components/ElevenLabsWebsiteVoiceChat.js` + `lib/public/elevenlabs-voice-chat.js`
- Private demo mount (disabled by default): `pages/demo/voice-enquiry.js`
- Superseded browser-voice build pilot: `docs/product/AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md`
- Superseded browser-voice runbook: `docs/runbooks/AI_RECEPTIONIST_BROWSER_VOICE_PILOT_V1.md`
- Brand / conversion: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`
- Above the line: `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`

---

## 1. Purpose

Bounded **website voice-chat** pilot for **CorpFlowAI-owned pages** only:

- Uses **ElevenLabs Agents** as the bought voice layer (listening + speaking).
- Framed as an **AI voice enquiry assistant** that captures Lead Rescue / Website Rescue (and related) enquiries for **human review**.
- CorpFlowAI owns offer framing, trust, follow-up, and any next commercial action.

This is **not** a generic chatbot product, not a phone receptionist, and not a white-label multi-client platform.

---

## 2. Why the previous implementation was removed

| Previous path | Why removed from the repo |
| ------------- | ------------------------- |
| `prototypes/ai-receptionist-browser-voice/` + npm prototype scripts + Node tests | Browser Web Speech STT/TTS was **not client-facing quality** (robotic voices; weak natural-speech / dialect listening). |
| DIY voice-engine continuation (Pipecat-first, custom STT+LLM+TTS glue) | **Poor ROI** at low expected minutes. |
| Maintaining two competing chatbot/voice prototypes | Creates confusion; buy path won on quality (Anton live trial of ElevenLabs Agents). |

Useful **decision history** is retained in superseded docs (marked clearly). The draft handoff *ideas* (service interest, human review, refusals) are preserved as **policy** below — not as a local STT/TTS runtime.

---

## 3. Recommended first surface

| Include (CorpFlowAI-owned) | Exclude for v1 |
| -------------------------- | -------------- |
| `/lead-rescue` (when activation approved) | Client / tenant sites (`lux.*`, etc.) |
| Website Rescue demo / offer pages (when activation approved) | Site-wide default on every CorpFlowAI page |
| Private/non-indexed `/demo/voice-enquiry` **first** | Phone / DID / telephony |
| Optional contact-style page later | Retell / Synthflow / Vapi / Bland / DIY stacks |

**First live test shape:** private/noindex demo page → then limited public Lead Rescue / Website Rescue embeds only after Anton approval.

---

## 4. Required ElevenLabs UI checks (Anton — before any activation)

Verify in the ElevenLabs console (do not treat blog/docs numbers as billing truth):

1. Selected **plan**
2. **Included** call minutes
3. **Overage** rate for extra minutes
4. Whether **web/widget** minutes are billed the same as phone (if phone is ever considered later)
5. Selected **LLM** and estimated LLM cost
6. **Usage / spend caps** (set a hard early envelope)
7. Widget mode: **voice only** vs voice + text
8. Widget **branding** / customization
9. **Domain allowlist** (CorpFlowAI hosts only)
10. Whether **public agent / auth-disabled** is required for the widget embed
11. **Transcript / log retention** and data-handling settings
12. Ability to **disable quickly** (kill switch)

Suggested early envelope (verify live): target **under ~USD 25–50/month**; hard early cap **USD 100/month** including LLM. No Scale/Business plan without evidence. Do **not** hardcode vendor prices as fact in runtime.

---

## 5. Required agent behaviour / policy

Paste-equivalent instructions into ElevenLabs (operator UI — not committed as a live agent ID):

1. Disclose it is **AI**.
2. State it **captures enquiries for human review** (not a live production phone receptionist).
3. Collect minimal fields:
   - name
   - company
   - contact method
   - contact value
   - service interest
   - need / problem
   - urgency
   - preferred follow-up
4. Classify `service_interest` as one of:
   - `lead_rescue`
   - `website_rescue`
   - `workflow_admin_improvement`
   - `ai_receptionist_chatbot`
   - `other_unsure`
5. End with a **draft-only** summary for human review (`requires_human_review: true` language).
6. Refuse protected actions (section 6).

---

## 6. Required refusals

Refuse or defer (human must handle):

- Pricing commitments / quotes as fact
- Revenue or lead-volume **guarantees**
- “Send email / WhatsApp / SMS / call **now**”
- CRM / DB updates
- Contracts / payments
- Legal / tax / medical / financial advice
- Secrets or credential requests
- Tenant / client private data lookups
- Deployment / production promises
- Unsupported claims about 24/7 availability or outcomes

---

## 7. Public copy guidance

**Safe**

- “Talk to our AI enquiry assistant”
- “Captures your enquiry for human review”
- “No commitments are made by the assistant”
- “A CorpFlowAI human will review before any next action”

**Avoid**

- “24/7 receptionist”
- “Guaranteed lead recovery”
- “Fully automated sales”
- “We will call / send / quote immediately”

---

## 8. Success metrics

Pilot succeeds only if:

- 10–20 warm/manual conversations are tested
- Handoff summaries are accurate enough for Anton
- No false claims or protected-action failures
- At least 2 warm prospects say it improves credibility/interest
- Cost stays within the pilot envelope
- Anton is comfortable demoing it live

---

## 9. Kill criteria

Pause/kill if:

- Agent makes false claims
- Contact details are not captured cleanly
- Visitors find it creepy/confusing
- Cost runs away
- No useful enquiries result
- Domain allowlist / public-agent settings cannot be made safe
- It distracts from selling Lead Rescue / Website Rescue

---

## 10. Cost posture

- Low-volume assumptions only
- Verify plan + minutes + LLM in ElevenLabs UI before paying
- No client resale pricing until real minutes per qualified lead are known

---

## 11. White-label honesty

v1 = **CorpFlowAI-owned website widget** only.  
Not a true multi-client white-label platform. Client pilots need a **separate** issue/packet.

---

## 12. Repo safety (this PR)

| Control | Behaviour |
| ------- | ---------- |
| `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT` | Must be `true` to render; default off / unset = **nothing** |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | Placeholder `REPLACE_ME` only in template; real ID **not** committed |
| Component | Renders `null` unless flag on **and** agent id is a non-placeholder string |
| Telephony / CRM / email / WhatsApp / DB writes | **None** in this packet |

**This document does not authorize activation.**
