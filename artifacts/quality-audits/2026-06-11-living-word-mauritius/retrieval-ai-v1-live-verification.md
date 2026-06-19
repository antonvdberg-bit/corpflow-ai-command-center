# Living Word retrieval AI v1 — live production verification

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**Mode:** sandbox-only Groq-backed retrieval AI (provider-agnostic adapter shape)

---

## Provider selection notes

| Decision | Choice |
|----------|--------|
| Repo inspection | **Groq** in `lib/server/groq-client.js`; **no xAI Grok** integration found |
| Env vars (existing, not invented) | `GROQ_API_KEY`, `GROQ_MODEL_NAME` (default `llama-3.3-70b-versatile`) |
| Single provider this packet | Groq only via `lib/server/chat-widget/retrieval/providers/groq.js` |
| Fallback without key | `retrieval_preview` — approved context excerpt, no LLM |
| AI kill-switch | `chat_widget_configs.ai_enabled` (separate from `enabled`) |
| Future providers | Add adapters under `retrieval/providers/` without rewriting chatbot logic |

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES
- Production deployment ID: 5120442528
- Commit deployed: bc21c4ecb7ca
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview (200)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js (200, enabled)
  - POST /api/chat-widget/start — 9 menu options incl. Ask a question
  - POST /api/chat-widget/ask — location (groq_llm), unknown (groq_llm), emergency (safety_refusal)
  - https://core.corpflowai.com/factory/living-word-workflows (307 login — route intact)
- Expected vs actual: retrieval from approved atoms/schedules; safety refusals; usage logged (3 rows smoke thread)
- Client-facing flow usable: YES (sandbox demo)
- Final verdict: COMPLETE
```

---

## Source PR + delivery chain

| Field | Value |
|---|---|
| PR | [#425 — feat(chatbot): Living Word sandbox retrieval AI v1 (Groq)](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/425) |
| Merge SHA | `bc21c4ecb7ca` |
| GitHub Production deployment ID | `5120442528` |

---

## Schema + config (Production Neon)

| Step | Result |
|---|---|
| Migration `20260622000000_chat_widget_retrieval_ai_v1` | `ai_enabled`, `ai_session_message_cap`, `chat_widget_ai_usage_logs` |
| Flow v4 | `node scripts/update-chat-widget-flow-lwm-v4-ai.mjs` — Ask a question option |
| AI enable | `node scripts/enable-chat-widget-ai-living-word.mjs` — `ai_enabled=true`, cap 5, budget $5 |

---

## Live verification checks

| # | Check | Result |
|---|--------|:------:|
| 1 | `/site-preview` 200 | ✓ |
| 2 | Chatbot enabled | ✓ |
| 3 | Ask a question on welcome menu | ✓ (9 options) |
| 4 | Approved location question | ✓ (`groq_llm`, answer from context) |
| 5 | Unknown question safe response | ✓ (`groq_llm` with uncertainty / fallback wording) |
| 6 | Emergency safety refusal | ✓ (`safety_refusal`, route `emergency`) |
| 7 | Usage logged | ✓ (`chat_widget_ai_usage_logs` rows created) |
| 8 | No external WP/GHL/DNS | ✓ |
| 9 | No outbound messages | ✓ |
| 10 | Workflow inbox | ✓ (307 login gate) |
| 11 | Eight guided paths intact | ✓ (tests + flow validation) |

Smoke script: `node scripts/verify-retrieval-ai-living-word.mjs`

---

## Rollback

1. `ai_enabled=false` on `chat_widget_configs` for `living-word-mauritius`.
2. Revert flow to v3 (remove Ask a question).
3. Code revert on `main`; retain usage logs for audit.

---

## Out of scope (confirmed unchanged)

- livingwordmauritius.com / network / GHL / DNS
- Luxe / lux_listings
- CMP tickets from AI
- Embeddings / vector DB
