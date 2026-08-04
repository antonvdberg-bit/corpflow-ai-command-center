# Synthetic browser-voice AI receptionist (prototype)

**Issues:** [#726](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/726), [#731](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/731)  
**Status:** Local / operator demo only — **not** production, **not** telephony  
**Default profile:** CorpFlowAI general enquiry (`profiles/corpflowai-general.json`)  
**Pipecat:** Deferred (architecture note included) — this scaffold is Pipecat-ready in shape only  
**Verdict for sellable phone receptionist:** **pilot experience only** — do not adopt telephony yet

## What this is

A bounded prototype that demonstrates greeting → discovery → field correction → final review → draft intake handoff → escalation rules, using **synthetic data** and **mocked STT/TTS**. Default path is **text**; optional browser Web Speech when available (with **transcript preview before submit**).

Focus areas: Lead Rescue, Website Rescue, workflow/admin improvement, AI receptionist/chatbot interest (prototype caveat), other/unsure.

## Quick start

```bash
# Deterministic fixture demo (no browser)
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=lead-rescue-path
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --fixture=pricing-refusal
node prototypes/ai-receptionist-browser-voice/cli/run-demo.mjs --interactive

# Browser UI on localhost only
node prototypes/ai-receptionist-browser-voice/cli/serve-demo.mjs
# then open http://127.0.0.1:8765/demo/
```

Tests (also covered by `npm test`):

```bash
node --test node-tests/ai-receptionist-browser-voice.test.mjs
```

## UX highlights (#731)

- Speech recognition opens an editable **“I heard”** preview (Confirm / Retry / Cancel) — never auto-submits
- Captured-details panel for correcting fields before handoff
- Browser TTS voice / rate / pitch controls (local `speechSynthesis` only)
- Configurable profile JSON (default CorpFlowAI general enquiry)
- Final review confirmation before draft handoff
- Handoff includes additive `service_interest` and always `external_actions_executed: []`

## Canonical docs

- Runbook: `docs/runbooks/AI_RECEPTIONIST_BROWSER_VOICE_PILOT_V1.md`
- Pipecat architecture: `docs/product/AI_RECEPTIONIST_PIPECAT_BROWSER_PILOT_V1.md`

## Hard non-actions

No phone numbers, Twilio/Telnyx, WhatsApp/SMS/email sends, CRM/DB writes, production deploy, secrets, or paid realtime APIs in default CI.
