# AI receptionist — Pipecat browser pilot capture (v1)

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Status:** `CANDIDATE-CAPTURED` / `SERIOUS-CANDIDATE / EVALUATE-FIRST` (browser synthetic pilot scaffold exists; Pipecat runtime not selected)

**Telephony / production / paid realtime:** **`NO IMPLEMENTATION AUTHORIZED`**

**Owner:** Anton (operator); Cursor (prototype scaffold for #726)

**Date (UTC):** 2026-08-03

**Linked issue:** [#726](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/726)

**Related:**

- Runbook: `docs/runbooks/AI_RECEPTIONIST_BROWSER_VOICE_PILOT_V1.md`
- Prototype code: `prototypes/ai-receptionist-browser-voice/`
- Prior research: `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md`
- Website chat tooling note: `docs/product/WEBSITE_AI_CHAT_AGENT_TOOL_DECISION_NOTE_V1.md`
- Server boundary: `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5

---

## Verdict

**Pilot the synthetic browser experience. Do not adopt Pipecat, telephony, or production voice yet.**

Issue #726 authorized a **bounded prototype**. Runtime Pipecat was investigated and **deferred** because safe introduction requires Python media stack, provider secrets, and (for anything beyond laptop localhost) a server authorization path that would risk August gates and standing self-hosted holds.

---

## What shipped under `prototypes/`

| Piece | Role |
| ----- | ---- |
| `lib/conversation-engine.mjs` | Deterministic greeting → field capture → summary → draft handoff |
| `lib/escalation.mjs` | Pricing/guarantee, regulated advice, safety, protected actions, tenant boundary, secrets probes |
| `lib/handoff.mjs` | Structured draft with `requires_human_review: true` and empty `external_actions_executed` |
| `lib/mocks/stt-tts.mjs` | Mock STT/TTS — CI-safe |
| `demo/` | Localhost browser UI (text + optional Web Speech) |
| `cli/run-demo.mjs` / `serve-demo.mjs` | Operator demos |
| `fixtures/*.json` | Synthetic dialogues |

**Integration path chosen:** isolated local-only demo under `prototypes/` — does not add Next.js routes, API handlers, middleware, env vars, or DB schema.

---

## Pipecat-ready architecture (follow-up)

When Anton authorizes a runtime evaluation packet, map as follows:

```text
Browser mic/speakers
    → (future) Pipecat SmallWebRTCTransport or DailyTransport
        → STT service (provider TBD, secret-gated)
        → Conversation / LLM layer
              TODAY: prototypes/.../conversation-engine.mjs (rules)
              FUTURE: optional LLM with same escalation + handoff contract
        → TTS service (provider TBD, secret-gated)
    → UI shows draft handoff JSON
    → Human operator reviews
    → Only then: sanctioned intake / CRM path (separate approval)
```

**Contract to preserve when swapping in Pipecat:**

1. Same handoff schema (`corpflow.ai_receptionist.draft_handoff.v1`).
2. Same escalation reasons and protected-action refusal.
3. Default tests remain text/fixture — no mic in CI.
4. No silent external sends; `external_actions_executed` stays honest.

**Exact follow-up to enable real Pipecat runtime:**

1. Anton approves evaluation packet (browser-only, no telephony).
2. Choose host (laptop vs authorized disposable VPS — **not** exec-01 by default).
3. Pin `pipecat-ai` + transport extras; document Python version.
4. Add **optional** local-only env placeholders (never required for `npm test`).
5. Wire STT/TTS providers behind explicit flags; keep mock path default.
6. Reuse `conversation-engine` escalation + `buildDraftHandoff` as the policy core (or port rules 1:1).
7. Security review checklist + consent copy before any non-synthetic audio retention.

---

## Hard boundaries (still in force)

- No phone numbers / Twilio / Telnyx
- No WhatsApp / SMS / email automation from this prototype
- No Chatwoot / Flowise / Langfuse / LiteLLM / AgentSpan / OpenJarvis / Postiz / new CRM in this track without separate authorization
- No production marketing claim of “AI receptionist” until doctrine + live verification allow it
- Preserve `/change` doctrine: draft/recommend ≠ execute

---

## Recommendation for Anton

1. Try the localhost demo.
2. Confirm the draft handoff fields match how operators want Lead Rescue / onboarding intake to look.
3. Decide later whether to fund a **Pipecat browser runtime** packet — still separate from telephony.
4. Keep recommendation at **pilot**, not **adopt**, until a real provider + consent + tenancy design is approved.
