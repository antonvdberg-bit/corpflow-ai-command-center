# Synthetic browser-voice AI receptionist (prototype)

**Issues:** [#726](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/726), [#731](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/731)
**Status:** Local / operator demo only — **not** production, **not** telephony
**Default profile:** CorpFlowAI general enquiry
**Pipecat:** Deferred (architecture note included) — this scaffold is Pipecat-ready in shape only
**Verdict for sellable phone receptionist:** **pilot experience only** — do not adopt telephony yet

## What this is

A bounded prototype that demonstrates greeting → CorpFlowAI service-interest discovery → draft intake handoff → escalation rules, using **synthetic data** and **mocked STT/TTS**.

- **Text input** is the recommended reliable demo path.
- Optional browser Web Speech recognition shows an **“I heard” preview** (edit / confirm / retry / cancel) — never auto-submits.
- Browser TTS voice/rate/pitch are selectable when the OS exposes voices.
- Captured fields are editable before final confirm.

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

- Runbook: `docs/runbooks/AI_RECEPTIONIST_BROWSER_VOICE_PILOT_V1.md`
- Pipecat architecture: `docs/product/AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md`

## Hard non-actions

No phone numbers, Twilio/Telnyx, WhatsApp/SMS/email sends, CRM/DB writes, production deploy, secrets, or paid realtime APIs in default CI.
