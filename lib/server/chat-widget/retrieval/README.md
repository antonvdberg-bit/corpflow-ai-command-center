# Chat widget retrieval AI v1

Sandbox-only retrieval-assisted answers for tenant chatbots.

## Provider

- **Groq** first — `GROQ_API_KEY` + `GROQ_MODEL_NAME` (see `.env.template`, `lib/server/groq-client.js`)
- **Not** xAI Grok
- Without `GROQ_API_KEY`: `retrieval_preview` mode (approved context excerpt, no LLM)

## Gates

- `chat_widget_configs.enabled` — whole widget
- `chat_widget_configs.ai_enabled` — AI path only
- Per-session cap: `ai_session_message_cap` (default 5)
- Monthly budget placeholder: `ai_budget_monthly_usd` / `ai_budget_spent_usd`

## Endpoints

- `POST /api/chat-widget/ask` — `{ thread_id, question }`

## Living Word enable

```bash
node scripts/update-chat-widget-flow-lwm-v4-ai.mjs
node scripts/enable-chat-widget-ai-living-word.mjs
```

Requires `GROQ_API_KEY` in Vercel Production for `groq_llm` mode.

## Response delay (Ask a question only)

- `lib/server/chat-widget/retrieval/response-delay.js` — 2.0–2.5s minimum on successful `/ask` responses
- Widget shows: “Looking through approved church information…”
- Validation/rate-limit errors return immediately (no delay)
- Tests: `CORPFLOW_CHAT_WIDGET_AI_DELAY_DISABLED=1` or `skipDelay` — see `node-tests/chat-widget-ai-response-delay.test.mjs`

## Usage logs

Table `chat_widget_ai_usage_logs` — question, answer, mode, provider, model, context atom/schedule IDs, safety route.
