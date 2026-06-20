# Living Word AI UX delay + knowledge intake design v1 — verification

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**Packet:** Part A implementation (response delay) + Part B/C design only

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES
- Production deployment ID: 5121657589
- Commit deployed: ad4e56ed
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview (200)
  - POST /api/chat-widget/ask — elapsed_ms 2733, delay_ok true, thinking_message present
  - Emergency safety_refusal still works
- Final verdict: COMPLETE
```

---

## Part A — AI response delay (implementation)

| Requirement | Implementation |
|-------------|----------------|
| Min delay 2.0–2.5s | `response-delay.js` — random in range on successful `/ask` |
| Ask a question only | `handlers-ask.js` only; `/step` unchanged |
| Thinking message | Widget + API `thinking_message` field |
| Errors not delayed | 400/403/404/429 return before delay |
| Configurable | Constants + `CORPFLOW_CHAT_WIDGET_AI_DELAY_DISABLED=1` for tests |
| Tests fast | `skipDelay` in unit tests |

**Files:** `lib/server/chat-widget/retrieval/response-delay.js`, `handlers-ask.js`, `widget-bundle.js`

---

## Part B — Public website knowledge intake (design only)

| Check | Result |
|-------|:------:|
| Design artifact created | ✓ `public-website-knowledge-intake-design.md` |
| No live crawl / scrape | ✓ |
| No auto-approval | ✓ |
| No raw pages AI-answerable | ✓ (architecture forbids) |
| External WP/GHL/DNS untouched | ✓ |

---

## Part C — Schedule/date strategy

Documented in design artifact §12 — structured `tenant_schedule_entries` as canonical for dates/events; atoms for policy only.

---

## Live checks (post-deploy)

| # | Check | Result |
|---|--------|:------:|
| 1 | `/site-preview` 200 | ✓ |
| 2 | Chatbot enabled | ✓ |
| 3 | Ask a question works | ✓ |
| 4 | Response ≥ ~2s on `/ask` success | ✓ (2733ms) |
| 5 | Thinking message visible | ✓ (API field + widget copy) |
| 6 | AI still approved atoms/schedules only | ✓ (no crawl code added) |
| 7 | No outbound messages | ✓ |
| 8 | Workflow inbox intact | ✓ (unchanged) |

---

## Rollback

- Revert code on `main` — delay removed; ask path immediate again
- Design docs are read-only — no rollback needed
