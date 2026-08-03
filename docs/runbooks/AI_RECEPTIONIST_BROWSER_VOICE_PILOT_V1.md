# AI receptionist — synthetic browser-voice pilot (v1)

**Issue:** [#726](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/726)
**Date (UTC):** 2026-08-03
**Owner:** Anton (decision); Cursor (scaffold)
**Recommendation:** **pilot** the browser experience — **do not adopt** telephony, paid realtime providers, or production deployment from this packet alone.

---

## 1. How to run locally

From the repo root:

```bash
# Text fixture walkthrough (recommended first)
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs

# Other fixtures
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=missing-contact
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=pricing-refusal
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

## 2. Is Pipecat used?

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

## 3. What is mocked

- **STT** — `lib/mocks/stt-tts.mjs` (`mockStt`); browser demo treats typed text (or optional Web Speech transcript) as the transcript.
- **TTS** — `mockTts` returns a deterministic utterance id; browser may optionally use `speechSynthesis` (local, no CorpFlow secret).
- **LLM / NLU** — none. Field collection and escalation are deterministic rules.
- **CRM / DB / email / WhatsApp / SMS / phone** — not called; handoff always sets `external_actions_executed: []`.
- **Tenant data** — fixtures use synthetic names (`Alex Rivera`, `alex.rivera@example.com`, etc.).

---

## 4. What is explicitly not implemented

- Phone number provisioning
- Twilio / Telnyx / any telephony provider
- WhatsApp, SMS, email, live chat inbox install
- CRM / GHL write, Postgres write, CMP ticket create
- Production or Preview **app route** for the receptionist (isolated under `prototypes/`)
- Secrets / new required env vars
- Paid model, STT, TTS, or realtime API calls in default CI
- Chatwoot, Flowise, Langfuse, LiteLLM, AgentSpan, OpenJarvis, Postiz, new CRM
- Promptfoo integration (issue #725 still open — keep this prototype independently testable)

---

## 5. Before any real phone / telephony pilot

Required separate decisions (Anton):

1. **Authorization packet** — telephony + provider + spend + which host may run the bot.
2. **Consent / recording notice** — scripted disclosure at call start; retention policy.
3. **Identity & tenancy** — how inbound DID maps to `tenant_id`; never cross-tenant lookup.
4. **Protected actions** — same doctrine as `/change`: draft/recommend only; no deploy/pay/CRM write without human gate.
5. **Intake path** — sanctioned write is still `POST /api/tenant/intake` (or a future explicitly approved equivalent), not a side-channel DB write.
6. **Secrets** — provider keys in Infisical/Vercel only after env template + security checklist.
7. **Pipecat (or alternative) runtime packet** — Python service location, STUN/TURN, HTTPS, CI strategy for non-flaky tests.

---

## 6. Consent / privacy (future voice)

When real microphone or call audio is introduced:

- Disclose that the visitor is speaking with an AI assistant and that a human may review the draft.
- Obtain consent before recording or retaining audio; prefer transcript retention with clear TTL if audio is not required.
- Do not send audio or transcripts containing client PII to unpaid/unreviewed third-party tools.
- Keep synthetic demos on `example.com` / fixture data only.
- Do not market “24/7 AI receptionist” on public Lead Rescue pages until brand doctrine and live verification allow it.

---

## 7. Known server requirements if Pipecat is introduced later

- Python 3.10+ environment with `pipecat-ai` and chosen transport extras
- Local or authorized host process for the bot + signaling (SmallWebRTC or Daily)
- HTTPS for browser mic in non-localhost environments
- Optional STUN/TURN for NAT
- Separate secrets for STT/TTS/LLM — never committed
- **Not** on `corpflow-exec-01` without ADR + authorization packet

---

## 8. Recommended next step for Anton

1. Run the localhost browser demo and one escalating fixture (`pricing-refusal`).
2. Decide whether the **draft handoff JSON** shape is good enough to wire later into intake (still human-gated).
3. Separately approve (or reject) a **Pipecat runtime evaluation packet** — still browser-only, still no telephony.
4. Keep August revenue/test gates unblocked; treat this PR as experience proof only.

**Library posture:** prove the experience and handoff first; telephony / paid realtime / client-facing use need separate approval.
