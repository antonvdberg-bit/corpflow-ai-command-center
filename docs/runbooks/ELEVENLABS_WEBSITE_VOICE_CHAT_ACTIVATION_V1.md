# ElevenLabs website enquiry — activation runbook (voice + text v1)

**Status:** Runbook only — **`NO ACTIVATION AUTHORIZED`** by this document alone.

**Canonical pilot:** `docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md`

**Date (UTC):** 2026-08-05 (voice+text private-test preparation for issue #767)

---

## Purpose

Operator checklist for a **later**, Anton-approved limited embed of **one** ElevenLabs Agents website agent with **voice + text** on CorpFlowAI-owned pages.

Text chat is provided by the **same ElevenLabs agent/widget** in chat/typing mode — not by a second chatbot platform.

This runbook is **not** permission to:

- merge-enable production flags
- commit a real agent ID or API key
- change Vercel production env (Cursor must not do this)
- enable telephony
- write to CRM/DB or send email/WhatsApp/SMS
- install Chatwoot / Flowise / LangChain / GHL / custom text-chat stacks

---

## Preconditions

- [ ] Anton has read `docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md`
- [ ] ElevenLabs UI checks in § “Required ElevenLabs UI checks” of that doc (and § below) are completed and noted
- [ ] Agent/widget is configured for **voice + text** (not voice-only)
- [ ] Spend envelope agreed (suggested hard early cap USD 100/month including LLM — verify live pricing)
- [ ] Agent instructions match required behaviour + refusals for **both** modes
- [ ] First surface is **`/demo/voice-enquiry`** (noindex) before any public Lead Rescue / Website Rescue page

---

## Anton — ElevenLabs UI verification (before any enable)

Confirm in the ElevenLabs UI (operator-owned; do not ask Cursor to guess billing):

| # | Check | Pass? | Notes |
| - | ----- | ----- | ----- |
| 1 | Voice + text / chat mode available on selected agent/widget | | |
| 2 | Text mode usable **without microphone** | | |
| 3 | Widget does **not autoplay** or force voice | | |
| 4 | Domain allowlist = CorpFlowAI-owned **test** domain/page only | | |
| 5 | Current plan + included minutes recorded | | |
| 6 | Whether text consumes same web minutes/credits as voice | | |
| 7 | Overage rate recorded | | |
| 8 | Selected LLM + LLM cost estimate | | |
| 9 | Usage / spend caps set | | |
| 10 | Transcript / log retention + data handling acceptable | | |
| 11 | Fast disable / kill-switch path known (UI + env) | | |
| 12 | Public-agent / auth-disabled requirement understood + risks acceptable | | |

---

## Launch readiness checklist (private test only)

Complete before setting any controlled env flags:

- [ ] One agent chosen for both voice and text (no second stack)
- [ ] Safe public copy used (“Talk or type…”, human review, no commitments)
- [ ] Agent policy pasted (AI disclosure, fields, taxonomy, draft-only handoff, refusals)
- [ ] Domain allowlist limited to private test host/path
- [ ] Spend caps set; plan/minutes/overage/LLM noted
- [ ] Repo gate still default-off (`NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT` unset/`false`; agent id `REPLACE_ME` in git)
- [ ] Real agent id will live only in operator-controlled env (never committed)
- [ ] Private page `/demo/voice-enquiry` is the only intended mount for first test
- [ ] Kill-switch steps rehearsed on paper (env flag + ElevenLabs disable + allowlist removal)

---

## Activation sequence (gated — private first)

1. **Create/configure** the ElevenLabs agent in the vendor UI (not in git).
2. Enable **voice + text / chat mode** on that agent/widget.
3. **Paste approved instructions** (AI disclosure, talk-or-type invite, human-review handoff, service_interest taxonomy, refusals).
4. Configure **domain allowlist** to CorpFlowAI hosts only for the intended **private** page(s).
5. Set **usage / spend controls** and confirm plan minutes + text billing.
6. Confirm widget does not autoplay / force mic; confirm text works without mic.
7. Confirm widget requirements (e.g. public agent / auth settings per ElevenLabs docs at activation time) and accept risks in writing.
8. Place agent id in **operator-controlled env** (Vercel Preview or local) — **never commit** the real id.
9. Set `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT=true` only in that controlled environment.
10. Run the **private initial test plan** below on **`/demo/voice-enquiry`**.
11. Record evidence (screenshots, scores, cost note, text-path proof).
12. **Stop.** Request **explicit Anton approval** for limited public embed on `/lead-rescue` and/or Website Rescue demo/offer pages.
13. Only after that approval: enable on those pages in the agreed environment; keep site-wide off.

---

## Private initial test plan (`/demo/voice-enquiry`)

Test **only** on the private CorpFlowAI-owned page first. Do not activate publicly from this packet.

| # | Test | Expected | Pass? |
| - | ---- | -------- | ----- |
| 1 | Widget off by default with placeholder env/config | No widget DOM / no script load when flag false or agent id `REPLACE_ME` | |
| 2 | Private page loads without widget when disabled | `/demo/voice-enquiry` shows gated copy; no ElevenLabs widget | |
| 3 | After Anton-approved controlled env, widget appears only on private test page | Widget on `/demo/voice-enquiry` only; not site-wide | |
| 4 | Text-only conversation without microphone | Full enquiry capture possible by typing | |
| 5 | Voice conversation works | Listening + speaking path completes enquiry | |
| 6 | User can choose not to use voice | Typing path remains available; no forced mic | |
| 7 | Lead Rescue enquiry via **text** | Fields captured; `service_interest=lead_rescue` | |
| 8 | Website Rescue enquiry via **voice** | Fields captured; `service_interest=website_rescue` | |
| 9 | “I am not sure” | Classified as `other_unsure` | |
| 10 | Pricing guarantee request | Refused / deferred to human | |
| 11 | “Send WhatsApp/email now” | Refused / deferred to human | |
| 12 | Human review required | Agent states human reviews before next action | |
| 13 | Transcript / handoff quality | Anton can act manually from summary | |
| 14 | Kill switch | Env flag or ElevenLabs disable removes widget quickly | |
| 15 | No external writes | No CRM / email / WhatsApp / DB writes from this pilot | |

### Text-mode acceptance criteria

Text mode passes only if **all** of the following are true:

- [ ] Visitor can complete an enquiry **without** granting microphone access
- [ ] Widget does not autoplay audio or force the voice path
- [ ] Same AI disclosure + human-review language appears / is spoken-or-shown
- [ ] Same field collection and `service_interest` taxonomy work in text
- [ ] Same refusals fire in text (pricing guarantees; send-now; CRM)
- [ ] Handoff summary is readable for Anton without listening to a recording
- [ ] No second chatbot product was required to provide typing

### Voice-mode acceptance criteria

- [ ] Mic permission path works when the visitor opts into voice
- [ ] Enquiry fields + taxonomy + refusals match the text path policy
- [ ] Visitor can abandon voice and continue by typing (if widget supports mid-session switch — note result)

---

## Test-case table (same agent policy)

| ID | Path | Prompt / scenario | Required behaviour |
| -- | ---- | ----------------- | ------------------ |
| T1 | Text | “I’d like Lead Rescue help; my name is …” | Collect fields; `lead_rescue`; draft-only handoff; human review |
| T2 | Voice | “We need Website Rescue for our site …” | Collect fields; `website_rescue`; draft-only handoff; human review |
| T3 | Text or voice | “I’m not sure which service” | `other_unsure`; still capture contact + need |
| T4 | Text | “Guarantee you’ll recover 50 leads” | Refuse revenue/lead guarantees |
| T5 | Voice | “Email/WhatsApp them now” | Refuse send-now; defer to human |
| T6 | Text | “What’s your fixed price / instant quote?” | No pricing commitment; human will follow up |
| T7 | Either | “Are you a human agent?” | Disclose AI; not a human agent |
| T8 | Either | Visitor refuses microphone | Text path still works |
| T9 | Either | Attempt to request secrets / client private data | Refuse; ask not to submit secrets |
| T10 | Kill | Flip env flag / disable agent / remove allowlist | Widget gone; no residual public activation |

---

## Disable / kill-switch checklist

Use any of these; prefer the fastest path that is already under Anton’s control:

1. [ ] Set `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT` back to unset/`false` and redeploy/restart as needed.
2. [ ] Or disable/delete the agent (or widget) in ElevenLabs UI.
3. [ ] Or remove the test domain/page from the domain allowlist.
4. [ ] Confirm `/demo/voice-enquiry` no longer shows the widget.
5. [ ] Confirm no public Lead Rescue / Website Rescue page was left enabled.
6. [ ] Note spend stopped / caps still in place.

---

## Explicit non-authorization

**Merging this runbook or the companion PR does not activate the widget.**  
Production / public activation requires a **separate written Anton approval** naming: environment, pages, agent id handling, voice+text confirmation, and spend cap.
