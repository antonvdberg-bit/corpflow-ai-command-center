# Pipecat readiness note (local copy)

Canonical product capture: `docs/product/AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md`
Operator runbook: `docs/runbooks/AI_RECEPTIONIST_BROWSER_VOICE_PILOT_V1.md`

## Decision in #726

**Pipecat is not installed in this PR.** The conversation engine + mock STT/TTS + browser demo prove the receptionist **experience and draft handoff** without Python media deps, secrets, or telephony.

## Swap-in sketch

| Layer today | Future Pipecat slot |
| ----------- | ------------------- |
| Text / optional Web Speech | `SmallWebRTCTransport` (browser) |
| `mockStt` / `mockTts` | Deepgram / Cartesia / etc. (secret-gated) |
| `conversation-engine.mjs` | Keep as policy core or mirror rules in bot processor |
| `buildDraftHandoff` | Unchanged contract |

## Do not do from this folder

- `pip install pipecat-ai` into production CI without a packet
- Bind `serve-demo.mjs` to `0.0.0.0` or deploy it
- Add Twilio/Telnyx “just to try a call”
