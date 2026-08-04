# AI receptionist — synthetic browser-voice pilot (v1)

**Issues:** [#726](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/726) (baseline), [#731](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/731) (voice UX + CorpFlowAI profile)
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
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=lead-rescue
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=website-rescue
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=workflow-admin
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=ai-receptionist-chatbot
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=pricing-refusal
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=field-edit-before-handoff

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

## 2. Demo UX notes (important after #731)

### Text is the reliable path

**Typed input remains the recommended reliable demo mode.** Browser speech recognition quality varies by OS, browser, microphone, and accent. Mishears are common.

### Transcript preview before submit

When optional browser speech recognition produces text, the demo does **not** auto-submit it.

You will see:

- **I heard:** — editable transcript
- **Confirm** — submit the (possibly edited) text to the conversation engine
- **Retry** — clear and listen again
- **Cancel** — discard without submitting

Only confirmed or edited text may enter the enquiry flow.

### Captured-details panel

The browser UI shows a live panel of draft fields (name, company, contact, service interest, need, urgency, follow-up, risk flags). You can **Save** corrections on each field before final handoff. Spoken/typed commands also work, for example:

- `edit name to …`
- `edit company to …`
- `edit contact to …`
- `edit service interest to Lead Rescue`
- `edit need to …`
- `edit urgency to high`
- `edit follow-up to …`

### Final review

After fields are collected, the assistant shows a summary and asks you to **confirm** (or edit). The draft handoff is only finalized after confirmation (or on escalation).

### Voice selection and tuning (browser TTS)

Browser TTS uses the OS/browser `speechSynthesis` voices — **no paid TTS providers**.

In the demo sidebar:

1. Choose a **Voice** from the dropdown (`speechSynthesis.getVoices()`).
2. Adjust **Rate** and **Pitch**.
3. Click **Test voice**.

If no voices are available or the browser blocks speech, the UI shows a clear fallback message. **Assistant text still appears**; continue with typed input.

**Expectation:** any voice is better than silence for a demo, but browser voices often sound robotic. That is a platform limitation, not a CorpFlowAI production voice.

### Configurable profile / script

Prompts and service focus live in a profile, not hard-coded one-off strings:

| File | Role |
| ---- | ---- |
| `prototypes/ai-receptionist-browser-voice/profiles/corpflowai-general.json` | Canonical editable profile |
| `prototypes/ai-receptionist-browser-voice/profiles/corpflowai-general.mjs` | Runtime import twin (tests assert parity) |

Profile defines: greeting, service/product focus, field order, field prompts, required/optional fields, escalation language, safe disclaimers, supported service areas.

**Default profile:** CorpFlowAI general enquiry — guides toward:

- **Lead Rescue** — capture/qualify/hand off inbound leads (draft/recommend only)
- **Website Rescue** — capture website/digital-presence problems; safe next action only
- **Workflow / admin improvement** — capture repetitive admin/process/follow-up problems
- **AI receptionist / chatbot** — capture interest with an explicit prototype/pilot caveat (not a live phone service)
- **Other / unsure** — capture problem; human review

To add another profile later: copy the JSON under `profiles/`, keep the same shape, and pass it into `createSession({ profile })` (or extend the CLI). Do not invent pricing, guarantees, live availability, testimonials, or unsupported claims in profile copy.

---

## 3. Is Pipecat used?

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

## 4. What is mocked

- **STT** — `lib/mocks/stt-tts.mjs` (`mockStt`); browser demo treats typed text as the transcript; optional Web Speech recognition feeds the **preview** only until confirm.
- **TTS** — `mockTts` returns a deterministic utterance id; browser may optionally use `speechSynthesis` with selectable voice/rate/pitch (local, no CorpFlow secret).
- **LLM / NLU** — none. Field collection and escalation are deterministic rules driven by the profile.
- **CRM / DB / email / WhatsApp / SMS / phone** — not called; handoff always sets `external_actions_executed: []`.
- **Tenant data** — fixtures use synthetic names (`Alex Rivera`, `alex.rivera@example.com`, etc.).

---

## 5. Handoff schema notes

Schema id remains `corpflow.ai_receptionist.draft_handoff.v1`.

**Additive field:** `service_interest` — one of:

- `lead_rescue`
- `website_rescue`
- `workflow_admin_improvement`
- `ai_receptionist_chatbot`
- `other_unsure`

Also included when available: `profile_id`, `notes`. Existing consumers that ignore unknown fields remain compatible; tests assert the new field on happy-path fixtures.

Every completed or escalated handoff still includes:

- `requires_human_review: true`
- `external_actions_executed: []`
- disclaimer that no email, WhatsApp, SMS, phone call, CRM update, DB write, or external action occurred

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
- Promptfoo as a **required** CI check (manual `npm run eval:ai` still available)

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
8. **Paid STT/TTS** — only if browser voice quality is insufficient for the assessment goal.

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

1. Run the localhost browser demo: confirm transcript preview, field edits, voice dropdown, and CorpFlowAI service paths.
2. Prefer **text input** when judging enquiry capture quality; use voice as optional colour.
3. Decide whether the **draft handoff JSON** (including `service_interest`) is good enough to wire later into intake (still human-gated).
4. Separately approve (or reject) a **Pipecat runtime evaluation packet** — still browser-only, still no telephony — and/or paid STT/TTS only if needed.
5. Keep August revenue/test gates unblocked; treat this PR as experience proof only.

**Library posture:** prove the experience and handoff first; telephony / paid realtime / client-facing use need separate approval.

**Still not:** production, telephony, Pipecat runtime, or a live client service.
