# AI receptionist — synthetic browser-voice pilot (v1)

**Issues:** [#726](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/726) (baseline), [#731](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/731) (voice UX + CorpFlowAI enquiry profile)
**Date (UTC):** 2026-08-04
**Owner:** Anton (decision); Cursor (scaffold)
**Recommendation:** **pilot** the browser experience — **do not adopt** telephony, paid realtime providers, or production deployment from this packet alone.

**Current profile:** **CorpFlowAI general enquiry** (`prototypes/ai-receptionist-browser-voice/profiles/corpflowai-general.json`)

---

## 1. How to run locally

From the repo root:

```bash
# Text fixture walkthrough (recommended first)
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs

# Other fixtures
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=missing-contact
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=pricing-refusal
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=lead-rescue-path
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=website-rescue-path
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=workflow-admin-path
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=ai-receptionist-path
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=protected-action-refusal
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=tenant-boundary-refusal

# Interactive text REPL
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --interactive

# Browser UI (localhost only — not a public service)
node prototypes/ai-receptionist-browser-voice/cli/serve-demo.mjs
# Open http://127.0.0.1:8765/demo/
```

Optional npm aliases (same commands):

```bash
npm run prototype:ai-receptionist
npm run prototype:ai-receptionist:serve
```

Tests:

```bash
node --test node-tests/ai-receptionist-browser-voice.test.mjs
# or
npm test
```

---

## 2. Demo UX notes (after #731)

### Voice quality and browser dependence

- Spoken replies use the browser’s local `speechSynthesis` API only — **no paid TTS**.
- Voice quality is **browser/OS dependent** and often sounds robotic. That is expected for this prototype.
- Use the **voice dropdown**, **rate**, and **pitch** controls in the demo UI, then **Test voice**, to pick a less harsh local voice when the browser exposes more than one.
- If no voices are available (or the browser blocks speech), replies still appear on screen; text remains usable.

### Speech recognition accuracy

- Optional hold-to-talk uses browser `SpeechRecognition` / `webkitSpeechRecognition` when present.
- Accuracy varies widely by browser, microphone, and accent. Mishears are common.
- **Text input remains the most reliable demo mode.**

### Transcript preview / edit (recommended safe flow)

When speech recognition produces text, the demo **does not auto-submit** it.

Instead you see:

1. **I heard:** editable text  
2. **Confirm** — only then is the text sent to the conversation engine  
3. **Retry** — clear and speak again  
4. **Cancel** — discard without submitting  

This is the recommended safe voice flow for demos.

### Captured-details panel and final review

- A side panel shows draft fields (name, company, contact, service interest, need, urgency, follow-up, notes/risk flags).
- Edit fields there and click **Apply field edits**, or type commands such as `edit name to Pat Example`.
- After all fields are collected, the assistant shows a **final review** summary. Confirm in the UI or say `confirm` before the draft handoff is finalised.
- Final handoff always includes `requires_human_review: true` and `external_actions_executed: []`.

### Changing voice / rate / pitch

1. Open the localhost demo.  
2. Choose a voice from the dropdown (`speechSynthesis.getVoices()`).  
3. Adjust **Rate** (0.5–2) and **Pitch** (0–2).  
4. Click **Test voice**.  
5. Continue the enquiry; assistant replies use the selected settings.

### Changing or adding a profile / script

Profiles live under `prototypes/ai-receptionist-browser-voice/profiles/`.

Default: `corpflowai-general.json` (**CorpFlowAI general enquiry**).

A profile defines:

- greeting  
- service/product focus (`supported_service_areas`)  
- field order, prompts, required/optional fields  
- `service_interest` allowed values  
- escalation language and safe disclaimers  
- final-review prompt  
- optional per-service caveats (e.g. AI receptionist = prototype/pilot, not live phone)

To add another profile later: create `profiles/<id>.json` using the same shape, then load it via `createSession({ profileId: '<id>' })` (CLI/browser wiring can be extended). The browser demo loads the default CorpFlowAI profile today.

---

## 3. CorpFlowAI general enquiry focus

The default script guides toward current CorpFlowAI paths **without overclaiming**:

| Service interest | Intent |
| ---------------- | ------ |
| `lead_rescue` | Capture/qualify inbound-lead problems; draft/recommend only |
| `website_rescue` | Capture website/digital-presence or migration needs |
| `workflow_admin_improvement` | Capture repetitive admin/process/follow-up problems |
| `ai_receptionist_chatbot` | Capture interest; state this is a **prototype/pilot**, not live phone |
| `other_unsure` | Capture problem; human review |

Do **not** expect pricing, guarantees, live availability, testimonials, or client-result claims from this assistant — those escalate or refuse.

### Handoff schema note

Schema id remains `corpflow.ai_receptionist.draft_handoff.v1` with an **additive** field:

- `service_interest` — one of the values above (or `null` if missing)

Older consumers may ignore unknown keys. `schema_notes` documents the additive field.

---

## 4. Is Pipecat used?

**No — deferred.**

This PR ships a **Pipecat-compatible conversation shape** (turn-based capture → draft handoff → escalation) with **mocked STT/TTS**. It does **not** add the `pipecat-ai` Python package, WebRTC signaling server, Daily/Twilio transport, or provider credentials.

**Why deferred (blockers for a safe Pipecat runtime in this bounded PR):**

| Blocker | Detail |
| ------- | ------ |
| Runtime stack | Pipecat is Python + async media pipeline; this app’s CI spine is Node/Next. Adding Python Pipecat would expand CI/runtime surface before August revenue gates. |
| Paid / external services | Practical STT/TTS/LLM transports usually need Deepgram, Cartesia, OpenAI Realtime, Daily, etc. — secrets + spend — forbidden for default CI and this issue. |
| Server install | Running Pipecat on `corpflow-exec-01-u69678` needs a separate § 5.5 authorization packet (only Uptime Kuma is carved out today). |
| Telephony creep risk | Easy to accidentally couple SmallWebRTC demos to phone providers; this issue forbids phone numbers and telephony. |

Architecture note / follow-up gates: `docs/product/AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md`.

---

## 5. What is mocked

- **STT** — `lib/mocks/stt-tts.mjs` (`mockStt`); browser demo treats typed text (or **confirmed** Web Speech transcript) as the transcript.
- **TTS** — `mockTts` returns a deterministic utterance id; browser may optionally use `speechSynthesis` (local, no CorpFlow secret) with selectable voice/rate/pitch.
- **LLM / NLU** — none. Field collection and escalation are deterministic rules driven by the profile JSON.
- **CRM / DB / email / WhatsApp / SMS / phone** — not called; handoff always sets `external_actions_executed: []`.
- **Tenant data** — fixtures use synthetic names (`Alex Rivera`, `alex.rivera@example.com`, etc.).

---

## 6. What is explicitly not implemented

- Phone number provisioning
- Twilio / Telnyx / any telephony provider
- WhatsApp, SMS, email, live chat inbox install
- CRM / GHL write, Postgres write, CMP ticket create
- Production or Preview **app route** for the receptionist (isolated under `prototypes/`)
- Secrets / new required env vars
- Paid model, STT, TTS, or realtime API calls in default CI
- Chatwoot, Flowise, Langfuse, LiteLLM, AgentSpan, OpenJarvis, Postiz, new CRM
- Real Pipecat runtime
- Making Promptfoo a required GitHub Actions check (manual `npm run eval:ai` only)

---

## 7. Before any real phone / telephony pilot

Required separate decisions (Anton):

1. **Authorization packet** — telephony + provider + spend + which host may run the bot.
2. **Consent / recording notice** — scripted disclosure at call start; retention policy.
3. **Identity & tenancy** — how inbound DID maps to `tenant_id`; never cross-tenant lookup.
4. **Protected actions** — same doctrine as `/change`: draft/recommend only; no deploy/pay/CRM write without human gate.
5. **Intake path** — sanctioned write is still `POST /api/tenant/intake` (or a future explicitly approved equivalent), not a side-channel DB write.
6. **Secrets** — provider keys in Infisical/Vercel only after env template + security checklist.
7. **Pipecat (or alternative) runtime packet** — Python service location, STUN/TURN, HTTPS, CI strategy for non-flaky tests.
8. **Paid STT/TTS** — only if browser voice remains insufficient after UX hardening.

---

## 8. Consent / privacy (future voice)

When real microphone or call audio is introduced:

- Disclose that the visitor is speaking with an AI assistant and that a human may review the draft.
- Obtain consent before recording or retaining audio; prefer transcript retention with clear TTL if audio is not required.
- Do not send audio or transcripts containing client PII to unpaid/unreviewed third-party tools.
- Keep synthetic demos on `example.com` / fixture data only.
- Do not market “24/7 AI receptionist” on public Lead Rescue pages until brand doctrine and live verification allow it.

---

## 9. Known server requirements if Pipecat is introduced later

- Python 3.10+ environment with `pipecat-ai` and chosen transport extras
- Local or authorized host process for the bot + signaling (SmallWebRTC or Daily)
- HTTPS for browser mic in non-localhost environments
- Optional STUN/TURN for NAT
- Separate secrets for STT/TTS/LLM — never committed
- **Not** on `corpflow-exec-01` without ADR + authorization packet

---

## 10. Recommended next step for Anton

1. Run the localhost browser demo: try text path, then optional voice with transcript preview/edit.
2. Walk Lead Rescue and Website Rescue fixtures; confirm the draft handoff JSON shape (including `service_interest`).
3. Decide whether browser TTS/STT quality is “good enough to assess the enquiry flow” before any paid STT/TTS or Pipecat spend.
4. Separately approve (or reject) a **Pipecat runtime evaluation packet** — still browser-only, still no telephony.
5. Keep August revenue/test gates unblocked; treat this PR as experience proof only.

**Still not:** production, telephony, Pipecat runtime, or a live client service.

**Library posture:** prove the experience and handoff first; telephony / paid realtime / client-facing use need separate approval.
