# ElevenLabs website voice + text enquiry pilot (v1)

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Status:** `SERIOUS-CANDIDATE / EVALUATE-FIRST` — structure + gated placeholder only

**Verdict:** **`NO IMPLEMENTATION AUTHORIZED`** / **`NO ACTIVATION AUTHORIZED`** by this document or its companion PR. Public embed requires a **separate Anton-approved activation packet**.

**Owner:** Anton (operator decision + ElevenLabs UI); Cursor (repo structure)

**Date (UTC):** 2026-08-05

**Related:**

- Activation runbook + private test checklists: `docs/runbooks/ELEVENLABS_WEBSITE_VOICE_CHAT_ACTIVATION_V1.md`
- Gated placeholder: `components/ElevenLabsWebsiteVoiceChat.js` + `lib/public/elevenlabs-voice-chat.js`
- Private demo mount (disabled by default): `pages/demo/voice-enquiry.js`
- Superseded browser-voice build pilot: `docs/product/AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md`
- Superseded browser-voice runbook: `docs/runbooks/AI_RECEPTIONIST_BROWSER_VOICE_PILOT_V1.md`
- Brand / conversion: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`
- Above the line: `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`
- Issue: [#767](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/767) (voice + text preparation); prior structure [#756](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/756)

---

## 1. Purpose

Bounded **website enquiry** pilot for **CorpFlowAI-owned pages** only:

- Uses **one ElevenLabs website agent** as the bought interaction layer for **both voice and text**.
- Framed as an **AI enquiry assistant** that captures Lead Rescue / Website Rescue (and related) enquiries for **human review**.
- CorpFlowAI owns offer framing, trust, follow-up, and any next commercial action.

This is **not** a generic chatbot product, not a phone receptionist, not a second chatbot stack, and not a white-label multi-client platform.

---

## 2. Decision — one agent for voice + text (v1)

**v1 requires voice + text mode on the same ElevenLabs website agent.**

| Mode | Role |
| ---- | ---- |
| Voice | Premium interaction (talk) |
| Text / typing | Accessible fallback (type without microphone) |

**Do not** create a separate chatbot stack for v1. No Chatwoot, Flowise, LangChain, GHL, CRM widget, or custom text-chat service in this pilot packet.

Rationale:

- Not everyone is comfortable with voice chat.
- Text is needed in offices, public places, slow connections, mobile contexts, non-native speech contexts, or when the visitor declines microphone access.
- One agent policy is safer than two independent bots.
- Voice remains the premium path; text is the accessible fallback.
- Human review remains the trust layer.

ElevenLabs UI settings for voice + text **must be verified by Anton** before enabling anything (see §4). This document does not assume vendor UI labels stay identical over time — Anton confirms what the console shows at activation time.

---

## 3. Why the previous implementation was removed

| Previous path | Why removed from the repo |
| ------------- | ------------------------- |
| `prototypes/ai-receptionist-browser-voice/` + npm prototype scripts + Node tests | Browser Web Speech STT/TTS was **not client-facing quality** (robotic voices; weak natural-speech / dialect listening). |
| DIY voice-engine continuation (Pipecat-first, custom STT+LLM+TTS glue) | **Poor ROI** at low expected minutes. |
| Maintaining two competing chatbot/voice prototypes | Creates confusion; buy path won on quality (Anton live trial of ElevenLabs Agents). |

Useful **decision history** is retained in superseded docs (marked clearly). The draft handoff *ideas* (service interest, human review, refusals) are preserved as **policy** below — not as a local STT/TTS runtime.

---

## 4. Required ElevenLabs UI checks (Anton — before any activation)

Verify in the ElevenLabs console before enabling env flags. Do not treat blog/docs numbers as billing truth. Cursor must not change Vercel production env.

1. **Voice + text / chat mode** is available on the selected agent/widget.
2. **Text mode** can be used **without microphone access**.
3. The widget does **not autoplay** or **force voice**.
4. **Domain allowlist** is configured for the CorpFlowAI-owned **test** domain/page only (start with private `/demo/voice-enquiry`).
5. Current **plan** and **included** minutes.
6. Whether **text chat** consumes the same web minutes/credits as voice.
7. **Overage** rate.
8. Selected **LLM** and LLM cost estimate.
9. **Usage / spend caps** (set a hard early envelope).
10. **Transcript / log retention** and data-handling settings.
11. Fast **disable / kill switch** path in the ElevenLabs UI.
12. Whether the widget requires a **public agent / auth-disabled** configuration and what risks that creates.

Suggested early envelope (verify live): target **under ~USD 25–50/month**; hard early cap **USD 100/month** including LLM. No Scale/Business plan without evidence. Do **not** hardcode vendor prices as fact in runtime.

Also confirm widget branding / customization supports the safe public copy in §8.

---

## 5. Recommended first surface

| Include (CorpFlowAI-owned) | Exclude for v1 |
| -------------------------- | -------------- |
| Private/non-indexed `/demo/voice-enquiry` **first** | Client / tenant sites (`lux.*`, etc.) |
| `/lead-rescue` (only when activation approved) | Site-wide default on every CorpFlowAI page |
| Website Rescue demo / offer pages (only when activation approved) | Phone / DID / telephony |
| Optional contact-style page later | Retell / Synthflow / Vapi / Bland / DIY stacks |
| | Second chatbot platforms (Chatwoot / Flowise / LangChain / GHL widget / custom text service) |

**First live test shape:** private/noindex demo page → then limited public Lead Rescue / Website Rescue embeds only after Anton approval.

---

## 6. Required agent behaviour / policy (voice and text)

The **same policy** must apply to both modes. Paste-equivalent instructions into ElevenLabs (operator UI — not committed as a live agent ID):

1. Disclose it is **AI**.
2. State it **captures enquiries for human review** (not a live production phone receptionist).
3. Invite the visitor to either **talk or type**.
4. Collect minimal fields:
   - name
   - company
   - contact method
   - contact value
   - service interest
   - need / problem
   - urgency
   - preferred follow-up
5. Classify `service_interest` as one of:
   - `lead_rescue`
   - `website_rescue`
   - `workflow_admin_improvement`
   - `ai_receptionist_chatbot`
   - `other_unsure`
6. End with **draft-only** handoff language for human review (`requires_human_review: true` language).
7. Explicitly say **no commitments** are made by the assistant.
8. Refuse protected actions (section 7) in **both** voice and text.

---

## 7. Required refusals (voice and text)

Refuse or defer (human must handle):

- Pricing commitments / quotes as fact
- Revenue or lead-volume **guarantees**
- Live availability promises (e.g. “24/7 AI receptionist”)
- “Send email / WhatsApp / SMS / call **now**”
- CRM / DB updates
- Contracts / payments
- Legal / tax / medical / financial advice
- Secrets, passwords, or API keys
- Tenant / client private data lookups
- Deployment / production promises
- Unsupported claims about client results or outcomes

---

## 8. Public / test copy guidance

**Preferred**

```text
Talk or type to our AI enquiry assistant.
It captures your enquiry for human review.
No commitments are made by the assistant.
A CorpFlowAI human will review before any next action.
Please do not submit passwords, secrets, financial records, medical details, or confidential client data.
```

**Avoid**

```text
24/7 AI receptionist
Guaranteed lead recovery
Fully automated sales agent
Instant quote
We will call/send/CRM-update immediately
Human agent
```

---

## 9. Text-mode acceptance criteria

Text mode is acceptable for the private pilot only if **all** of the following hold:

| # | Criterion |
| - | --------- |
| T1 | Visitor can start and complete an enquiry by typing without granting microphone access |
| T2 | Widget does not force voice or autoplay audio on open |
| T3 | Same AI disclosure + human-review language appears (or is spoken/shown) as for voice |
| T4 | Same enquiry fields can be collected via text |
| T5 | Same `service_interest` taxonomy works via text |
| T6 | Same refusals fire for pricing guarantees and “send WhatsApp/email now” |
| T7 | Draft handoff / transcript is good enough for Anton to act manually |
| T8 | No CRM / email / WhatsApp / DB / Neon writes occur |

If text path is unavailable or unusable, **do not activate** — see kill criteria (§11).

---

## 10. Success metrics (later live testing)

Pilot succeeds only if:

- Voice path and text path both work on the same agent policy
- 10–20 warm/manual conversations are tested (mix of talk and type)
- Handoff summaries are accurate enough for Anton
- No false claims or protected-action failures
- At least 2 warm prospects say it improves credibility/interest
- Cost stays within the pilot envelope
- Anton is comfortable demoing it live

**Preparation success** (this issue / PR) is narrower: docs require voice + text; private test checklist ready; gates explicit; disabled-by-default tested; no activation happened.

---

## 11. Kill criteria

Pause/kill the pilot if:

- Text path is unavailable or unusable
- Agent forces microphone access
- Agent makes false claims
- Contact details are not captured cleanly
- Visitors find it creepy/confusing
- Costs are unclear or uncontrolled
- Domain allowlist / public-agent settings cannot be made safe
- It distracts from selling Lead Rescue / Website Rescue

---

## 12. Cost posture

- Low-volume assumptions only
- Verify plan + minutes + LLM + **text vs voice billing** in ElevenLabs UI before paying
- No client resale pricing until real minutes per qualified lead are known

---

## 13. White-label honesty

v1 = **CorpFlowAI-owned website widget** only.  
Not a true multi-client white-label platform. Client pilots need a **separate** issue/packet.

---

## 14. Repo safety (this PR)

| Control | Behaviour |
| ------- | ---------- |
| `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT` | Must be `true` to render; default off / unset = **nothing** |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | Placeholder `REPLACE_ME` only in template; real ID **not** committed |
| Component | Renders `null` unless flag on **and** agent id is a non-placeholder string |
| Telephony / CRM / email / WhatsApp / DB writes | **None** in this packet |
| Second chatbot stack | **None** — text is ElevenLabs widget text mode on the same agent |

**This document does not authorize activation.**
