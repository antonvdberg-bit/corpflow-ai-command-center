# Living Word demo-ready sandbox activation

**Date:** 2026-06-18  
**Tenant:** `living-word-mauritius`  
**Purpose:** show-don't-tell demo environment for church owner + WordPress provider  
**Live demo URL:** https://living-word-mauritius.corpflowai.com/site-preview  
**Mode:** production sandbox demo enablement — CorpFlow-hosted only. No external WordPress, GHL, or DNS changes.

---

## 1. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: N/A (operational enablement + verification; no app code merge required)
- Merged to main: N/A (this packet is DB flip + verification artifact only)
- Production deployment ID: unchanged (schedule-source v1 remains 5116638001 / commit 58b9d3ad)
- Commit deployed: 65411b42 on main (includes schedule-source verification artifact; no new app deploy required for widget enable)
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview (200 — ribbon, approved schedule, loader script)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js (200, x-corpflow-chat-widget=enabled, active bundle)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/start + /step (POST, Origin: living-word-mauritius.corpflowai.com)
  - https://lux.corpflowai.com/site-preview (404 host gate)
  - https://core.corpflowai.com/site-preview (404 host gate)
- Expected vs actual: all required pre-checks and path walks pass; widget left enabled for demo
- Client-facing flow usable: YES for sandbox demo (guided chatbot + approved schedule on test host)
- Final verdict: COMPLETE
```

---

## 2. What is demonstrable now

| Capability | State |
|---|---|
| Visual sandbox v1 | Live — recognisable Living Word facsimile on CorpFlow test host |
| Orange TEST ENVIRONMENT ribbon | Fixed, non-dismissible, always visible |
| Approved schedule (DB-backed) | **1 row** — Sunday Service, weekly 09:30, Grand Baie (`tenant_schedule_entries`, `approved=true`) |
| Guided chatbot v0 (`flow_version=2`) | **Enabled** on `living-word-mauritius.corpflowai.com` only (via origin allow-list + tenant config) |
| Eight starter paths | All reachable (Service times, Find us, Prayer, Contact, Volunteer, WordGroups, Youth/Children, Business Network) |
| Lead pipeline | Previously verified (2026-06-17 controlled test); not re-submitted in this packet |

---

## 3. What is intentionally NOT live on external WordPress

- No script installed on `livingwordmauritius.com` or `www.livingwordmauritius.com`
- No changes to `network.livingwordmauritius.com`
- GoHighLevel chat widget untouched
- DNS unchanged
- No unrestricted AI chatbot — flow is deterministic guided paths only (`ai_budget_monthly_usd = 0`)

**Promotion path:** after owner/provider demo approval, a separate packet covers WordPress embed + owner copy sign-off. This demo proves the CorpFlow sandbox first.

---

## 4. Current widget state (explicit)

| Field | Before activation | After activation (demo posture) |
|---|---|---|
| `tenant_id` | `living-word-mauritius` | `living-word-mauritius` |
| `enabled` | **`false`** | **`true`** ← left on for demo |
| `flow_version` | `2` | `2` |
| `allowed_origins` | includes `https://living-word-mauritius.corpflowai.com` | unchanged |
| Loader header | `disabled` (no-op stub) | **`enabled`** (active bundle with bubble) |
| `ai_budget_monthly_usd` | `0` | `0` (no LLM calls) |

**Activation method:** `chat_widget_configs.enabled = true` for `living-word-mauritius` only (Production Neon, 2026-06-18T23:45:20Z).

**Note:** loader.js is cached up to 60 seconds at the edge. After enabling, allow ~1 minute before the loader header flips from `disabled` to `enabled`.

---

## 5. Current schedule-source state

| Metric | Value |
|---|---|
| Approved rows for LWM | **1** (`lwm-schedule-v1-sunday-service`) |
| Unapproved fixture rows in DB | 4 (not rendered on `/site-preview`) |
| `/site-preview` schedule source | `database` |
| Footer line | `1 approved schedule entry (database)` |

Only approved, non-expired rows render. Unapproved fixtures remain in DB for future operator approval workflows.

---

## 6. Safety controls preserved

| Control | Status |
|---|---|
| Host gate (`/site-preview` LWM host only) | ✓ Lux + core return 404 |
| `noindex,nofollow` | ✓ present |
| Orange ribbon (exact text) | ✓ `TEST ENVIRONMENT — Not the live Living Word Mauritius website` |
| Tenant-scoped widget config | ✓ single row for `living-word-mauritius` |
| Origin allow-list CORS | ✓ only seeded church origins + CorpFlow sandbox host |
| Rate limiting | ✓ 30 events / 5 min / IP / tenant |
| Prayer disclaimer | ✓ counselling / crisis / emergency wording present |
| Youth path | ✓ parent/guardian name only; age-band menu warns not to enter child's name |
| Business Network path | ✓ neutral routing copy; no endorsement / payment / verification claims |
| Cross-tenant isolation | ✓ `non_lwm_threads = 0` (no threads created under other tenants) |
| Kill switch | ✓ revert via `enabled=false` (see rollback) |

---

## 7. Pre-check evidence (all pass)

| # | Check | Result |
|---|---|:---:|
| 1 | `/site-preview` 200 on LWM host | ✓ |
| 2 | Orange ribbon exact text | ✓ |
| 3 | `noindex,nofollow` | ✓ |
| 4 | Non-LWM hosts 404 | ✓ Lux, ✓ core |
| 5 | Approved schedule row(s) in DB | ✓ 1 row |
| 6 | Only approved rows render | ✓ no placeholder fixture text on page |
| 7 | Config: `tenant_id`, `flow_version=2`, origin includes sandbox host | ✓ |
| 8 | Config `enabled` before change | ✓ recorded as `false` |

---

## 8. Chatbot verification evidence

| Check | Result |
|---|---|
| Loader active on LWM host | ✓ header `enabled`, active bundle body |
| `POST /start` opens panel API | ✓ returns `thread_id` + welcome menu with **8 options** |
| Service times → `service-times` | ✓ neutral calendar copy (no invented times in flow v2) |
| Find us → `location` | ✓ neutral routing to public website |
| Prayer → `prayer-disclaimer` | ✓ crisis / counselling disclaimer |
| Contact → `contact-name` | ✓ adult name collection |
| Volunteer → `volunteer-name` | ✓ adult name collection |
| WordGroups → `wordgroups-info` | ✓ neutral follow-up wording |
| Youth → `youth-name` → age band | ✓ parent/guardian prompt; band menu includes “do not enter a child's name” |
| Business Network → `network-info` | ✓ neutral Business Network routing copy |
| Cross-tenant rows | ✓ 0 non-LWM threads |

**Prior lead pipeline proof (not re-run):** thread `cmqhyt36n00crle04eyufklup`, automation event `cmqhytjco00dele04ifq33krd` — see `visual-sandbox-chat-widget-live-test.md`.

---

## 9. Demo script for Anton

Use this order in a screen-share or in-person demo:

1. **Open** https://living-word-mauritius.corpflowai.com/site-preview
2. **Point out** the orange banner at the top: *“TEST ENVIRONMENT — Not the live Living Word Mauritius website.”*
3. **Explain** the page resembles the Living Word site visually but runs on CorpFlow's sandbox — not WordPress, not the live domain.
4. **Scroll to** the **Approved schedule** section — show the Sunday Service entry from church records (DB-backed, one approved row).
5. **Open the chatbot** — click the bubble (bottom-right). Panel opens with eight starter options.
6. **Walk through** (pick each from the menu):
   - **Service times** — guided routing; times come from approved records / public site, not invented AI answers
   - **Prayer request** — show the pastoral / crisis disclaimer before any data collection
   - **Youth / Children** — show parent/guardian name + age band; note child-name safeguard
   - **Business Network** — neutral information routing
   - **Contact** — show how a enquiry would be captured (optional: mention prior test lead proof)
7. **Explain AI posture:** this is **guided chatbot v0** — deterministic paths, no unrestricted AI. The next controlled layer adds retrieval from approved schedule/knowledge atoms with budget caps; that is **not** live yet.
8. **Explain promotion:** if they like what they see, a **later step** installs the script on WordPress after owner copy sign-off — not during this demo.

---

## 10. Rollback plan

If anything looks wrong before or after the owner demo:

```sql
-- Production Neon (operator)
UPDATE chat_widget_configs SET enabled = false WHERE tenant_id = 'living-word-mauritius';
```

Then verify:

- `GET https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js` → header `x-corpflow-chat-widget: disabled`, no-op stub body (allow up to 60s cache)
- `/site-preview` remains available as visual sandbox + approved schedule (schedule does not depend on widget enable)

No schema rollback required. Schedule rows can remain.

---

## 11. Next steps after owner/provider demo

1. **Owner feedback** — confirm flow copy (especially service times / WordGroups / Business Network placeholder→approved wording).
2. **Schedule expansion** — pastor-approved rows only; never approve unverified fixtures.
3. **Knowledge atoms packet** — per `ai-dynamic-scheduling-design.md` build order step 2.
4. **WordPress embed packet** — separate authorisation; script tag on external site only after sign-off.
5. **Disable demo widget** when demo window closes if church is not ready for ongoing sandbox traffic — flip `enabled=false`.

---

## 12. Scope honoured (not touched)

- livingwordmauritius.com / www / network
- GoHighLevel
- DNS
- Luxe / `lux_listings`
- Multi-tenant operator switching
- DB schema / migrations
- AI / LLM integration
