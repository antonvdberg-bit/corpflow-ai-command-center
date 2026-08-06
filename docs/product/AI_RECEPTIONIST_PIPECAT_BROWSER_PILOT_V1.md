# AI receptionist — Pipecat browser pilot capture (v1) — SUPERSEDED

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Status:** **`SUPERSEDED` (2026-08-05)** / `REFERENCE-ONLY` — build-pilot closed; prototype code removed

**Active direction:** `docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md` (ElevenLabs website voice chat — still **`NO ACTIVATION AUTHORIZED`** without a separate Anton packet)

**Telephony / production / paid realtime:** **`NO IMPLEMENTATION AUTHORIZED`**

**Owner:** Anton (operator); Cursor (historical capture for #726; supersession 2026-08-05)

**Date (UTC):** 2026-08-03 (superseded 2026-08-05)

**Linked issue:** [#726](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/726)

**Related:**

- Active pilot: `docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md`
- Historical runbook (superseded): `docs/runbooks/AI_RECEPTIONIST_BROWSER_VOICE_PILOT_V1.md`
- Prior research: `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md`
- Website chat tooling note: `docs/product/WEBSITE_AI_CHAT_AGENT_TOOL_DECISION_NOTE_V1.md`
- Server boundary: `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5

---

## Verdict (updated)

**Do not continue the synthetic browser-voice / Pipecat-first build path for client-facing voice.**
Prototype code under `prototypes/ai-receptionist-browser-voice/` has been **removed**. Prefer **bought ElevenLabs Agents website voice chat** on CorpFlowAI-owned pages, gated and disabled by default.

Issue #726 authorized a bounded prototype. Acceptance showed handoff UX was useful but browser STT/TTS was not client-facing. Buy-over-build is the active direction.

---

## Historical note — what the prototype demonstrated

(Decision history only — runtime deleted.)

| Piece (removed) | Role |
| --------------- | ---- |
| Conversation engine / escalation / handoff libs | Deterministic enquiry capture + draft handoff |
| Mock STT/TTS + localhost demo | CI-safe / operator demo |
| CorpFlowAI general enquiry profile | Service-interest paths |

**Contract ideas to preserve in ElevenLabs agent instructions:** human review, no silent external sends, service_interest taxonomy, protected-action refusals.

**Still not:** telephony, production marketing claims, CRM/email/WhatsApp automation without separate approval.

---

## Historical appendix (obsolete follow-ups)

The former “what shipped under prototypes/”, Pipecat runtime follow-up, and “try the localhost demo” recommendations are **obsolete**. Prototype runtime is deleted. Do **not** fund Pipecat-first or browser Web Speech continuation for this workstream. Use the ElevenLabs website voice-chat pilot docs instead.
