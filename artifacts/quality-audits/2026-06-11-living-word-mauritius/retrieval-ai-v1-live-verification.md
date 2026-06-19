# Living Word retrieval AI v1 — live production verification

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**Mode:** sandbox-only Groq-backed retrieval AI (provider-agnostic adapter shape)

---

## Provider selection notes

| Decision | Choice |
|----------|--------|
| Provider inspected | **Groq** via existing `lib/server/groq-client.js` |
| Not used | xAI Grok — no repo integration found |
| Env vars (existing) | `GROQ_API_KEY`, `GROQ_MODEL_NAME` (default `llama-3.3-70b-versatile`) |
| Fallback without key | `retrieval_preview` mode — approved context text, no LLM |
| AI kill-switch | `chat_widget_configs.ai_enabled` separate from `enabled` |
| Future providers | Adapter under `lib/server/chat-widget/retrieval/providers/` |

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: PENDING
- Production deployment ID: PENDING
- Commit deployed: PENDING
- Live URLs tested: PENDING
- Final verdict: PENDING
```

---

## Scope confirmed unchanged

- No external WordPress / GHL / DNS
- No outbound email / WhatsApp / SMS
- Guided menu paths + contact UX + workflow ingestion intact
- Luxe / lux_listings untouched

---

## Rollback

1. Set `ai_enabled=false` on `chat_widget_configs` for `living-word-mauritius`.
2. Revert flow to v3 (remove Ask a question option) via prior flow update script.
3. Code revert on `main`; usage logs retained for audit.
