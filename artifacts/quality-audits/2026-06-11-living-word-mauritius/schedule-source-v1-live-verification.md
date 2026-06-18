# Living Word schedule-source v1 — live production verification

**Date:** 2026-06-18  
**Tenant:** `living-word-mauritius`  
**Live URL verified:** `https://living-word-mauritius.corpflowai.com/site-preview`  
**Mode:** post-merge migration + seed + read-only live verification. No AI, no chatbot enable, no external site changes.

---

## 1. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES
- Production deployment ID: 5116638001 (GitHub Production) / Vercel alias corpflow-ai-command-center-q9v0161c3-corpflowai.vercel.app
- Commit deployed: 58b9d3ad54c03f1e710a487ed9ff23c7bc754517
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview (200 — DB-backed approved schedule section)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js?tenant_id=living-word-mauritius (200, x-corpflow-chat-widget=disabled)
  - https://core.corpflowai.com/api/factory/health (200, ok:true)
- Expected vs actual:
  - Events section shows "Approved schedule" / "Upcoming from church records" with ONE approved row (Sunday Service, weekly 09:30, Grand Baie)
  - Footer shows "1 approved schedule entry (database)"
  - Static placeholder fixture list NOT shown when approved DB row present
  - Chat widget remains disabled (no-op stub)
- Client-facing flow usable: N/A (operator-internal sandbox; schedule block now DB-backed for approved facts)
- Final verdict: COMPLETE
```

---

## 2. Source PR + delivery chain

| Field | Value |
|---|---|
| Branch | `feat/living-word-schedule-source-v1` |
| PR | [#409 — feat(schedule): Living Word schedule-source v1](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/409) |
| Merge type | Squash + delete branch |
| Merge SHA on `main` | `58b9d3ad54c03f1e710a487ed9ff23c7bc754517` |
| GitHub Production deployment ID | `5116638001` |
| Vercel deployment alias | `corpflow-ai-command-center-q9v0161c3-corpflowai.vercel.app` |
| Design source | `artifacts/quality-audits/2026-06-11-living-word-mauritius/ai-dynamic-scheduling-design.md` |

---

## 3. Schema + seed (Production Neon)

| Step | Method | Result |
|---|---|---|
| Migration `20260617000000_tenant_schedule_v1` | `npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260617000000_tenant_schedule_v1/migration.sql` (P3009 on `lux_listings` blocks plain `migrate deploy`) | Table `tenant_schedule_entries` created |
| Mark migration applied | `npx prisma migrate resolve --applied 20260617000000_tenant_schedule_v1` | Recorded in `_prisma_migrations` |
| Seed | `node scripts/seed-schedule-living-word.mjs` | 5 rows upserted; `approved_count=1` (Sunday Service only) |

**Approved seed row (public fact mirror):**

- `id`: `lwm-schedule-v1-sunday-service`
- `title`: Sunday Service
- `recurrence`: weekly, Sunday (`weekly_day_of_week=0`), `09:30`
- `location_name`: Living Word Church, Grand Baie
- `approved`: true
- `chatbot_answer_eligible`: true (for future chatbot layer; widget still disabled)
- `source`: church-input

**Unapproved fixtures (4 rows):** special event, youth, wordgroup, special programme — `approved=false`, not rendered on `/site-preview`.

---

## 4. Live verification checks

| # | Check | Evidence | Result |
|---|---|---|:---:|
| 1 | `/site-preview` returns 200 on LWM host | HTTP 200 | ✓ |
| 2 | Approved DB schedule renders | HTML contains `Approved schedule`, `Sunday Service`, `approved schedule entry` | ✓ |
| 3 | Footer reflects database source | HTML contains `1 approved schedule entry (database)` | ✓ |
| 4 | Placeholder fallback not shown when DB has approved rows | No `placeholder fixture (not a real listing)` in response; no `Schedule fixtures` eyebrow | ✓ |
| 5 | Chat widget still disabled | Loader 200 + header `x-corpflow-chat-widget: disabled` | ✓ |
| 6 | Factory health | `https://core.corpflowai.com/api/factory/health` → 200 `ok:true` | ✓ |
| 7 | No external site changes | No requests to livingwordmauritius.com, network.livingwordmauritius.com, GHL, or DNS in this packet | ✓ |
| 8 | No AI / LLM integration added | Code review: read-only Prisma helpers + static render only | ✓ |

---

## 5. Rollback plan

1. **Code:** revert merge commit on `main` and redeploy Production — `/site-preview` falls back to static `PLACEHOLDER_SCHEDULE` when no approved rows or on query error.
2. **Data (optional):** `DROP TABLE IF EXISTS tenant_schedule_entries;` then `npx prisma migrate resolve --rolled-back 20260617000000_tenant_schedule_v1`.
3. **Seed only:** delete rows where `tenant_id='living-word-mauritius'` or set all `approved=false` — page reverts to placeholder mode immediately.

---

## 6. Out of scope (confirmed unchanged)

- Chatbot AI answers — not added
- `chat_widget_configs.enabled` — remains `false` for `living-word-mauritius`
- livingwordmauritius.com / network.livingwordmauritius.com / GoHighLevel / DNS
- Luxe / `lux_listings` / multi-tenant operator switching

---

## 7. Next packet (per design doc)

1. Knowledge atoms for Living Word (approved facts beyond schedule)
2. AI infra + cost controls
3. Sandbox-only retrieval-assisted AI test (widget enable still gated separately)
