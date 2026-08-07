# ElevenLabs website voice + text enquiry — activation runbook (v1)

**Status:** Runbook only — **`NO ACTIVATION AUTHORIZED`** by this document alone.

**Canonical pilot:** `docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md`

**Date (UTC):** 2026-08-05

**Related issue:** [#767](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/767)

---

## Purpose

Operator checklist for a **later**, Anton-approved limited embed of **one** ElevenLabs Agents website widget with **voice + text** on CorpFlowAI-owned pages.

This runbook is **not** permission to:

- merge-enable production flags
- commit a real agent ID or API key
- change Vercel production env (Cursor must not do this)
- enable telephony
- write to CRM/DB or send email/WhatsApp/SMS
- install a second chatbot stack (Chatwoot, Flowise, LangChain, GHL widget, custom text service)

Text chat for v1 is provided **only** through the same ElevenLabs agent/widget text mode — not a separate bot.

---

## Preconditions

- [ ] Anton has read `docs/product/ELEVENLABS_WEBSITE_VOICE_CHAT_PILOT_V1.md`
- [ ] ElevenLabs UI checks in §4 of that doc are completed and noted (including voice + text, no mic force, text billing)
- [ ] Spend envelope agreed (suggested hard early cap USD 100/month including LLM — verify live pricing)
- [ ] Agent instructions match required behaviour + refusals for **both** voice and text
- [ ] First surface is **`/demo/voice-enquiry`** (noindex) before any public Lead Rescue / Website Rescue page
- [ ] No real agent ID or API key is committed to git

---

## Launch readiness checklist (before any env enable)

Complete before setting `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT=true` in any environment.

| # | Check | Owner | Done |
| - | ----- | ----- | ---- |
| L1 | Voice + text mode confirmed in ElevenLabs UI on the selected agent/widget | Anton | [ ] |
| L2 | Text works without microphone; widget does not autoplay or force voice | Anton | [ ] |
| L3 | Domain allowlist limited to CorpFlowAI-owned **test** host/page only | Anton | [ ] |
| L4 | Plan, included minutes, text vs voice credit behaviour, overage noted | Anton | [ ] |
| L5 | LLM selection + cost estimate + usage/spend caps set | Anton | [ ] |
| L6 | Transcript/log retention and data-handling settings reviewed | Anton | [ ] |
| L7 | Public-agent / auth-disabled risks understood and accepted (or mitigated) | Anton | [ ] |
| L8 | Kill-switch path documented (env flag + ElevenLabs UI + allowlist) | Anton | [ ] |
| L9 | Agent policy pasted: AI disclosure, talk-or-type invite, field capture, taxonomy, draft handoff, no commitments | Anton | [ ] |
| L10 | Refusal policy pasted (pricing, guarantees, send-now, CRM, secrets, etc.) | Anton | [ ] |
| L11 | Safe public copy used (see pilot doc §8) — no “24/7 receptionist” / guarantees | Anton | [ ] |
| L12 | Real agent ID stored only in operator-controlled env (never git) | Anton | [ ] |
| L13 | First enable environment is Preview or local — **not** production public | Anton | [ ] |
| L14 | Explicit written Anton approval for the controlled private test | Anton | [ ] |

---

## Activation sequence (gated — private test first)

1. **Create/configure** the ElevenLabs agent in the vendor UI (not in git).
2. Enable **voice + text / chat** mode on that **one** agent (verify in UI).
3. **Paste approved instructions** (AI disclosure, talk-or-type invite, human-review handoff, service_interest taxonomy, refusals).
4. Configure **domain allowlist** to CorpFlowAI test host/page only for `/demo/voice-enquiry`.
5. Set **usage / spend controls** and confirm plan minutes + text billing behaviour.
6. Set **widget branding** (safe public copy only — “Talk or type…”).
7. Confirm widget requirements (e.g. public agent / auth settings per ElevenLabs docs at activation time) and accept risks.
8. Place agent id in **operator-controlled env** (Vercel Preview or local) — **never commit** the real id.
9. Set `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT=true` only in that controlled environment.
10. Run the **private initial test plan** below on **`/demo/voice-enquiry`**.
11. Record evidence (screenshots, scores, cost note, voice + text results).
12. **Stop.** Request **explicit Anton approval** for limited public embed on `/lead-rescue` and/or Website Rescue demo/offer pages.
13. Only after that approval: enable on those pages in the agreed environment; keep site-wide off.

---

## Private initial test plan (`/demo/voice-enquiry`)

Test only on the private CorpFlowAI-owned noindex page first. Do not expand to public Lead Rescue / Website Rescue until this table passes.

| # | Test | Path | Expected |
| - | ---- | ---- | -------- |
| 1 | Widget remains off by default with placeholder env/config | Gate | No widget; `shouldRenderElevenLabsVoiceChat({}) === false` (repo test) |
| 2 | Private test page loads without widget when disabled | Page | `/demo/voice-enquiry` loads; no `elevenlabs-convai` / no widget UI |
| 3 | After Anton-approved controlled env setting, widget appears only on the private test page | Page | Widget visible on demo; not treated as public launch |
| 4 | Text-only conversation works without microphone access | Text | Full enquiry typed; mic never granted |
| 5 | Voice conversation works | Voice | Full enquiry spoken |
| 6 | User can choose not to use voice | Text | No force-mic / no autoplay voice |
| 7 | Agent captures Lead Rescue enquiry through text | Text | Fields + `service_interest=lead_rescue` |
| 8 | Agent captures Website Rescue enquiry through voice | Voice | Fields + `service_interest=website_rescue` |
| 9 | Agent handles “I am not sure” as `other_unsure` | Either | Classification `other_unsure` |
| 10 | Agent refuses pricing guarantee request | Either | Refusal / defer to human |
| 11 | Agent refuses “send WhatsApp/email now” | Either | Refusal / defer to human |
| 12 | Agent tells user human review is required | Either | Explicit human-review language |
| 13 | Transcript/handoff good enough for Anton to act manually | Either | Actionable draft summary |
| 14 | Kill switch disables widget quickly | Gate | Flag off or UI disable → widget gone |
| 15 | No CRM/email/WhatsApp/DB writes occur | Ops | No outbound integrations fired |

### Voice vs text test-case matrix (same agent policy)

| Case | Voice | Text | Same policy expected |
| ---- | ----- | ---- | -------------------- |
| AI disclosure | [ ] | [ ] | Must disclose AI |
| Talk-or-type invite | [ ] | [ ] | Invite both modes |
| Capture: name, company, contact method/value | [ ] | [ ] | Minimal fields |
| Capture: need, urgency, preferred follow-up | [ ] | [ ] | Minimal fields |
| Classify `lead_rescue` | [ ] | [ ] | Taxonomy |
| Classify `website_rescue` | [ ] | [ ] | Taxonomy |
| Classify `other_unsure` | [ ] | [ ] | Taxonomy |
| Draft-only handoff + human review | [ ] | [ ] | No commitments |
| Refuse pricing / revenue guarantee | [ ] | [ ] | Protected action |
| Refuse send email/WhatsApp/SMS/call now | [ ] | [ ] | Protected action |
| Refuse secrets / private client data | [ ] | [ ] | Protected action |
| No CRM / DB / external send | [ ] | [ ] | No integration |

---

## Kill-switch checklist

Use any of these to pause quickly. Prefer the env flag first for CorpFlowAI pages.

| Step | Action | Done |
| ---- | ------ | ---- |
| K1 | Set `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT` to unset/`false` and redeploy/restart as needed | [ ] |
| K2 | Confirm `/demo/voice-enquiry` (and any other mount) no longer shows the widget | [ ] |
| K3 | Disable or pause the agent in the ElevenLabs UI | [ ] |
| K4 | Remove CorpFlowAI domain(s) from the widget allowlist | [ ] |
| K5 | If spend is the trigger: confirm usage/spend caps or freeze the plan path in ElevenLabs | [ ] |
| K6 | Record why the pilot was paused (false claims, cost, text path broken, creepiness, etc.) | [ ] |

---

## Disable / kill switch (summary)

1. Set `NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT` back to unset/`false` and redeploy/restart as needed.
2. Or disable/delete the agent in ElevenLabs UI.
3. Or remove domain from allowlist.

---

## Explicit non-authorization

**Merging this runbook or the companion PR does not activate the widget.**  
Production / public activation requires a **separate written Anton approval** naming: environment, pages, agent id handling, voice + text confirmation, and spend cap.

Cursor must **not** set Vercel production env for this pilot as part of the preparation packet.
