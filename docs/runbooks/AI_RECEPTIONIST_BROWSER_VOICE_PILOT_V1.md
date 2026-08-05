# AI receptionist — synthetic browser-voice pilot (v1) — SUPERSEDED

**Status:** **`SUPERSEDED` (2026-08-05)** — browser-voice prototype **removed** from the repo.

**Active direction:** `docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md`
**Activation (gated):** `docs/runbooks/ELEVENLABS_WEBSITE_VOICE_CHAT_ACTIVATION_V1.md`

**Why superseded:** Browser Web Speech STT/TTS was not client-facing quality. DIY voice-engine ROI is poor at low volume. Anton’s live ElevenLabs Agents trial was commercially impressive. First surface is **website voice chat** on CorpFlowAI-owned pages (buy), not local browser speech (build).

**Historical context (kept for decision trail):**

- Issues [#726](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/726), [#731](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/731), PR #738 improved enquiry handoff UX on a local prototype.
- Prototype path was `prototypes/ai-receptionist-browser-voice/` (deleted).
- npm scripts `prototype:ai-receptionist` / `prototype:ai-receptionist:serve` removed.
- Useful policy retained in the ElevenLabs pilot: human-reviewed draft handoff, service_interest taxonomy, protected-action refusals.

**Still not authorized by this historical note:** telephony, production receptionist claims, CRM/email/WhatsApp automation.
