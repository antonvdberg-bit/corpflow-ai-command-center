# ElevenLabs website enquiry pilot — voice + text (v1)

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Status:** `SERIOUS-CANDIDATE / EVALUATE-FIRST` — structure + gated placeholder only

**Verdict:** **`NO IMPLEMENTATION AUTHORIZED`** / **`NO ACTIVATION AUTHORIZED`** by this document or its companion PR. Public embed requires a **separate Anton-approved activation packet**.

**Owner:** Anton (operator decision + ElevenLabs UI); Cursor (repo structure)

**Date (UTC):** 2026-08-05 (voice+text requirements clarified for issue #767)

**Related:**

- Activation runbook + private test checklists: `docs/runbooks/ELEVENLABS_WEBSITE_VOICE_CHAT_ACTIVATION_V1.md`
- Gated placeholder: `components/ElevenLabsWebsiteVoiceChat.js` + `lib/public/elevenlabs-voice-chat.js`
- Private demo mount (disabled by default): `pages/demo/voice-enquiry.js`
- Superseded browser-voice build pilot: `docs/product/AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md`
- Superseded browser-voice runbook: `docs/runbooks/AI_RECEPTIONIST_BROWSER_VOICE_PILOT_V1.md`
- Brand / conversion: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`
- Above the line: `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`

---

## 1. Purpose

Bounded **website enquiry** pilot for **CorpFlowAI-owned pages** only:

- Uses **one ElevenLabs Agents website agent** as the bought interaction layer for **both voice and text**.
- Framed as an **AI enquiry assistant** that captures Lead Rescue / Website Rescue (and related) enquiries for **human review**.
- CorpFlowAI owns offer framing, trust, follow-up, and any next commercial action.

This is **not** a generic chatbot product, not a phone receptionist, and not a white-label multi-client platform.

---

## 2. Decision — one agent for voice + text (v1)

**Required for v1:** configure the selected ElevenLabs website agent/widget in **voice + text / chat mode**.

| Mode | Role |
| ---- | ---- |
| Voice | Premium interaction (talk) |
| Text / typing | Accessible fallback (type) — same agent, same policy |

**Do not** create a second chatbot stack for v1. Explicitly out of scope for this packet:

- Chatwoot, Flowise, LangChain, GHL chat widgets
- Custom text-chat services or separate CRM chatbots
- Phone / DID / telephony
- Client site installs

**Rationale:**

- Not everyone is comfortable with voice chat.
- Text is needed in offices, public places, slow connections, mobile contexts, non-native speech contexts, or when the visitor will not grant microphone access.
- One agent policy is safer than two independent bots.
- Voice remains the premium interaction; text is the accessible fallback.
- Human review remains the trust layer.

---

## 3. Why the previous implementation was removed

| Previous path | Why removed from the repo |
| ------------- | ------------------------- |
| `prototypes/ai-receptionist-browser-voice/` + npm prototype scripts + Node tests | Browser Web Speech STT/TTS was **not client-facing quality** (robotic voices; weak natural-speech / dialect listening). |
| DIY voice-engine continuation (Pipecat-first, custom STT+LLM+TTS glue) | **Poor ROI** at low expected minutes. |
| Maintaining two competing chatbot/voice prototypes | Creates confusion; buy path won on quality (Anton live trial of ElevenLabs Agents). |

Useful **decision history** is retained in superseded docs (marked clearly). The draft handoff *ideas* (service interest, human review, refusals) are preserved as **policy** below — not as a local STT/TTS runtime.

---

## 4. Recommended first surface

| Include (CorpFlowAI-owned) | Exclude for v1 |
| -------------------------- | -------------- |
| Private/non-indexed `/demo/voice-enquiry` **first** | Client / tenant sites (`lux.*`, etc.) |
| `/lead-rescue` (only when activation approved) | Site-wide default on every CorpFlowAI page |
| Website Rescue demo / offer pages (only when activation approved) | Phone / DID / telephony |
| Optional contact-style page later | Retell / Synthflow / Vapi / Bland / DIY stacks / second chatbot platforms |

**First live test shape:** private/noindex demo page → then limited public Lead Rescue / Website Rescue embeds only after Anton approval.

---

## 5. Required ElevenLabs UI checks (Anton — before any activation)

Verify in the **ElevenLabs console** before enabling anything. Do not treat blog/docs numbers as billing truth. Cursor must not change Vercel production env.

1. **Voice + text / chat mode** is available on the selected agent/widget.
2. **Text mode** can be used **without microphone access**.
3. The widget does **not autoplay** or **force voice**.
4. **Domain allowlist** is configured for the CorpFlowAI-owned test domain/page only (start with `/demo/voice-enquiry`).
5. Current **plan** and **included minutes**.
6. Whether **text chat** consumes the same web minutes/credits as **voice**.
7. **Overage** rate.
8. Selected **LLM** and LLM cost estimate.
9. **Usage / spend caps**.
10. **Transcript / log retention** and data-handling settings.
11. Fast **disable / kill-switch** path (vendor UI + repo env flag).
12. Whether the widget requires a **public agent / auth-disabled** configuration — and what risks that creates.

Suggested early envelope (verify live): target **under ~USD 25–50/month**; hard early cap **USD 100/month** including LLM. No Scale/Business plan without evidence. Do **not** hardcode vendor prices as fact in runtime.

---

## 6. Required agent behaviour / policy (voice and text)

The **same policy** must apply to both modes. Paste-equivalent instructions into ElevenLabs (operator UI — not committed as a live agent ID):

1. Disclose it is **AI**.
2. State it **captures enquiries for human review** (not a live production phone receptionist; not a human agent).
3. Invite the visitor to **talk or type**.
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
8. Require **human review before any next action**.
9. Refuse protected actions (section 7).

---

## 7. Required refusals (voice and text)

Refuse or defer (human must handle) — identical in both modes:

- Pricing commitments / quotes as fact
- Revenue or lead-volume **guarantees**
- Live availability promises (“24/7 receptionist”, immediate response guarantees)
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

**Preferred (safe)**

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

## 9. Private initial test (summary)

Full checklist lives in `docs/runbooks/ELEVENLABS_WEBSITE_VOICE_CHAT_ACTIVATION_V1.md`.

Minimum proof before any wider activation:

1. Widget remains **off by default** with placeholder env/config.
2. Private test page loads **without** widget when disabled.
3. After Anton-approved controlled env setting, widget appears **only** on the private test page.
4. **Text-only** conversation works without microphone access.
5. **Voice** conversation works.
6. User can choose **not** to use voice.
7. Lead Rescue enquiry captured via **text**.
8. Website Rescue enquiry captured via **voice**.
9. “I am not sure” → `other_unsure`.
10. Pricing guarantee request **refused**.
11. “Send WhatsApp/email now” **refused**.
12. Agent states **human review** is required.
13. Transcript/handoff is good enough for Anton to act on manually.
14. Kill switch disables widget quickly.
15. No CRM / email / WhatsApp / DB writes occur.

---

## 10. Success metrics (later live testing)

Pilot succeeds only if:

- Voice **and** text paths are usable with the same agent policy
- 10–20 warm/manual conversations are tested across both modes
- Handoff summaries are accurate enough for Anton
- No false claims or protected-action failures
- At least 2 warm prospects say it improves credibility/interest
- Cost stays within the pilot envelope
- Anton is comfortable demoing it live

---

## 11. Kill criteria

Pause/kill if:

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
- Verify plan + minutes + text-vs-voice billing + LLM in ElevenLabs UI before paying
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
| Second chatbot stack | **None** — text is the ElevenLabs widget’s chat mode on the same agent |

**This document does not authorize activation.**
