# Synthetic browser-voice AI receptionist (prototype)

**Issues:** [#726](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/726), [#731](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/731)
**Status:** Local / operator **handoff reference** only — **not** production, **not** telephony, **not** the preferred voice-engine path
**Default profile:** CorpFlowAI general enquiry
**Voice-engine direction (2026-08-04):** **buy-platform evaluation** — see `docs/product/AI_RECEPTIONIST_VOICE_PLATFORM_BUY_EVALUATION_V1.md`. Browser Web Speech / DIY STT+TTS polish is **stopped** for client-facing value.
**Pipecat:** Deferred — not the preferred next spend at low volume
**Verdict for sellable phone receptionist:** **do not build the voice stack here** — evaluate Synthflow / Retell / ElevenLabs Agents; telephony still separately gated

## What this is

A bounded prototype that demonstrated greeting → CorpFlowAI service-interest discovery → draft intake handoff → escalation rules, using **synthetic data** and **mocked STT/TTS**. Keep it as the **handoff/guardrail contract** reference when testing bought platforms.

- **Text input** is the recommended reliable demo path.
- Optional browser Web Speech is **not** considered client-facing quality (acceptance 2026-08-04).
- Browser TTS may sound robotic; do not treat voice dropdowns as a product path.
- Captured fields / final review remain the useful UX patterns to require from a vendor.

## Quick start

```bash
# Deterministic fixture demo (no browser)
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=lead-rescue
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --interactive

# Browser UI on localhost only
node prototypes/ai-receptionist-browser-voice/cli/serve-demo.mjs
# then open http://127.0.0.1:8765/demo/
```

Tests (also covered by `npm test`):

```bash
node --test node-tests/ai-receptionist-browser-voice.test.mjs
```

## Profile

- `profiles/corpflowai-general.json` — editable CorpFlowAI general enquiry profile
- `profiles/corpflowai-general.mjs` — runtime twin (keep in sync; tests assert parity)

## Canonical docs

- **Active:** buy-platform bake-off — `docs/product/AI_RECEPTIONIST_VOICE_PLATFORM_BUY_EVALUATION_V1.md`
- Runbook: `docs/runbooks/AI_RECEPTIONIST_BROWSER_VOICE_PILOT_V1.md`
- Build-pilot capture (closed for voice R&D): `docs/product/AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md`

## Hard non-actions

No phone numbers, Twilio/Telnyx, WhatsApp/SMS/email sends, CRM/DB writes, production deploy, secrets, or paid realtime APIs in default CI.
