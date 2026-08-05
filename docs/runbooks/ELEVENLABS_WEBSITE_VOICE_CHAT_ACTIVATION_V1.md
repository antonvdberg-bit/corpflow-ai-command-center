# ElevenLabs website voice-chat — activation runbook (v1)

**Status:** Runbook only — **`NO ACTIVATION AUTHORIZED`** by this document alone.

**Canonical pilot:** `docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md`

**Date (UTC):** 2026-08-05

---

## Purpose

Operator checklist for a **later**, Anton-approved limited embed of an ElevenLabs Agents **website voice chat** on CorpFlowAI-owned pages.

This runbook is **not** permission to:

- merge-enable production flags
- commit a real agent ID or API key
- enable telephony
- write to CRM/DB or send email/WhatsApp/SMS

---

## Preconditions

- [ ] Anton has read `docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md`
- [ ] ElevenLabs UI checks in §4 of that doc are completed and noted
- [ ] Spend envelope agreed (suggested hard early cap USD 100/month including LLM — verify live pricing)
- [ ] Agent instructions match required behaviour + refusals
- [ ] First surface is **`/demo/voice-enquiry`** (noindex) before any public Lead Rescue / Website Rescue page

---

## Activation sequence (gated)

1. **Create/configure** the ElevenLabs agent in the vendor UI (not in git).
2. **Paste approved instructions** (AI disclosure, human-review handoff, service_interest taxonomy, refusals).
3. Configure **domain allowlist** to CorpFlowAI hosts only for the intended page(s).
4. Set **usage / spend controls** and confirm plan minutes.
5. Set **voice + widget branding** (safe public copy only).
6. Confirm widget requirements (e.g. public agent / auth settings per ElevenLabs docs at activation time).
7. Place agent id in **operator-controlled env** (Vercel Preview or local) — **never commit** the real id.
8. Set `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT=true` only in that controlled environment.
9. Test on **`/demo/voice-enquiry`** (private/non-indexed):
   - mic permission
   - transcript / summary quality
   - T4/T5-style refusals (guarantees; “email now”)
   - disable flag → widget gone
10. Record evidence (screenshots, scores, cost note).
11. **Stop.** Request **explicit Anton approval** for limited public embed on `/lead-rescue` and/or Website Rescue demo/offer pages.
12. Only after that approval: enable on those pages in the agreed environment; keep site-wide off.

---

## Disable / kill switch

1. Set `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT` back to unset/`false` and redeploy/restart as needed.
2. Or disable/delete the agent in ElevenLabs UI.
3. Or remove domain from allowlist.

---

## Explicit non-authorization

**Merging this runbook or the companion PR does not activate the widget.**  
Production / public activation requires a **separate written Anton approval** naming: environment, pages, agent id handling, and spend cap.
