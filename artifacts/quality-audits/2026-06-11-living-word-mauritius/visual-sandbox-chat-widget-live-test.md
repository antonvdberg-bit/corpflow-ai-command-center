# Living Word visual sandbox — chat widget live test (controlled window)

**Date:** 2026-06-17  
**Tenant:** `living-word-mauritius`  
**Host / route:** `https://living-word-mauritius.corpflowai.com/site-preview`  
**Mode:** controlled sandbox test window only — temporarily enabled `chat_widget_configs.enabled = true`, exercised the widget against Production, then restored `enabled = false` in a `finally` block.

---

## 1. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: N/A (operational test only; no code merge in this packet)
- Merged to main: N/A
- Production deployment ID: N/A (no new Vercel deploy — exercised existing Production chat widget on existing sandbox page)
- Commit deployed: unchanged (sandbox v1 refinement remains 82f24868 on Production)
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview (200, ribbon present, loader script present)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js (disabled stub pre/post; active bundle during window)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/start + /step (POST, Origin: living-word-mauritius.corpflowai.com)
- Expected vs actual: all required brief checks pass after follow-up completion for Youth / Business Network paths
- Client-facing flow usable: N/A (operator-internal sandbox; widget disabled again after test)
- Final verdict: COMPLETE (controlled test objective met; widget kill-switch restored)
```

## 2. Scope and hard limits honoured

| Allowed | Not touched |
|---|---|
| Temporary flip `chat_widget_configs.enabled` for `living-word-mauritius` only | `livingwordmauritius.com` |
| HTTP probes + API walk on `living-word-mauritius.corpflowai.com` | `network.livingwordmauritius.com` |
| Create test `chat_widget_threads` / `chat_widget_messages` / one new `automation_events` row | GoHighLevel |
| Clear `chat_widget_rate_limits` rows for this tenant (test hygiene between partial runs) | DNS |
| Retain all new test rows as audit evidence | DB schema / migrations |
| | AI / LLM integration |
| | Dynamic scheduling |
| | Luxe / `lux_listings` |
| | Multi-tenant operator switching |

## 3. Pre-check (before enable)

| Check | Expected | Actual | Result |
|---|---|---|:---:|
| `tenant_id` | `living-word-mauritius` | `living-word-mauritius` | ✓ |
| `enabled` | `false` | `false` | ✓ |
| `flow_version` | `2` | `2` | ✓ |
| `allowed_origins` | includes `https://living-word-mauritius.corpflowai.com` | present in allow-list | ✓ |
| Welcome menu | 8 starter options | 8 options | ✓ |
| Loader (pre-enable) | disabled stub | `x-corpflow-chat-widget: disabled` | ✓ |
| `/site-preview` | 200 + ribbon + `noindex,nofollow` | 200; ribbon text `TEST ENVIRONMENT — Not the live Living Word Mauritius website`; `noindex,nofollow` meta present | ✓ |

**Baseline row counts (pre-enable):** `chat_widget_threads` = 12 · `chat_widget_messages` = 88 · `automation_events` (LWM chat submit) = 1 · non-LWM threads = 0.

## 4. Enable window

- Set `chat_widget_configs.enabled = true` for `living-word-mauritius` only.
- Cleared 2 stale `chat_widget_rate_limits` rows for this tenant (prior partial run hygiene).
- Loader returned `x-corpflow-chat-widget: enabled` and the active widget bundle (not the no-op disabled stub).
- Orange test-environment ribbon remained visible on `/site-preview` throughout the window.
- Loader `<script src="/api/chat-widget/loader.js">` present on the sandbox page (bubble can mount when enabled).
- `POST /api/chat-widget/start` returned `thread_id` + welcome `menu` with 8 options — confirms chat panel API opens.

## 5. Path walk (8 starter options)

| Starter path | First node reached | Safeguard / posture checks | Result |
|---|---|---|:---:|
| Service times | `service-times` | Neutral routing copy (no invented times) | ✓ |
| Find us | `location` | Neutral routing copy (no invented address) | ✓ |
| Prayer request | `prayer-disclaimer` | Counselling / crisis / emergency disclaimer present | ✓ |
| Contact the church | `contact-name` | Adult name collection only at entry | ✓ |
| Volunteer / Serve | `volunteer-name` | Adult name collection only at entry | ✓ |
| WordGroups | `wordgroups-info` | Neutral follow-up wording | ✓ |
| Youth / Children | `youth-name` → age-band menu | Collects **parent/guardian name** only; age-band menu explicitly says not to enter a child's name; fixed-choice bands (`Children (under 12)`, `Youth (13–18)`, `Young adults (19–25)`) | ✓ |
| Business Network | `network-info` | Neutral wording; no endorsement / verification / payment / membership-approval claims | ✓ |

**Note:** the main automated driver hit transient `fetch failed` / rate-limit waits on the Youth age-band and Business Network steps during the long first run (30/32 checks). A short follow-up script (same enable/disable discipline) completed those two paths successfully; results merged into this artifact.

## 6. Test lead submission

One safe contact-path submission from `/site-preview`:

| Field | Value |
|---|---|
| Path | Contact the church |
| Name | `Sandbox Widget Test` |
| Email | `sandbox.widget.test@corpflow-test.invalid` |
| Message | `CorpFlow sandbox site-preview chat widget live test — safe to ignore.` |
| `thread_id` | `cmqhyt36n00crle04eyufklup` |
| `request_type` | `contact` |
| `completed` | `true` |

**Automation event emitted:**

| Field | Value |
|---|---|
| Event id | `cmqhytjco00dele04ifq33krd` |
| `occurred_at` | `2026-06-17T11:06:00.889Z` |
| Schema | `corpflow.chat_widget.lead.submitted.v1` (via `chat_widget.lead.submitted`) |
| Lead email | `sandbox.widget.test@corpflow-test.invalid` |

## 7. Post-disable verification

| Check | Result |
|---|---|:---:|
| `enabled` restored to `false` in DB | ✓ |
| Loader returns disabled stub again | `x-corpflow-chat-widget: disabled` ✓ |
| Ribbon still visible on `/site-preview` | ✓ |
| Non-LWM thread count unchanged | 0 → 0 ✓ |
| LWM thread count increased (expected test traffic) | 12 → 21 (+ follow-up threads) ✓ |
| LWM automation submit events | 1 → 2 ✓ |

## 8. Test evidence retained

Per brief: **retain new test rows** unless separately instructed to scrub.

| Table | Approximate delta this packet |
|---|---|
| `chat_widget_threads` | +9 (main run) + follow-up threads |
| `chat_widget_messages` | +129 (main run) + follow-up messages |
| `automation_events` | +1 new `chat_widget.lead.submitted` for sandbox contact test |
| `chat_widget_rate_limits` | transient rows during test; cleared at enable for hygiene |

Prior demo test rows from `chatbot-v0` CorpFlow demo verification remain untouched.

## 9. Operator scripts used (local, untracked)

| Script | Purpose |
|---|---|
| `.git/sandbox-chat-widget-live-test.mjs` | Full enable → walk → submit → disable driver |
| `.git/sandbox-chat-widget-followup.mjs` | Youth age-band + Business Network completion after transient failures |
| `.git/sandbox-chat-widget-live-test-results.json` | Machine-readable check log (local only, not committed) |

## 10. Verdict

**COMPLETE** for the controlled sandbox chatbot enablement test.

The Living Word chat widget works on the Production CorpFlow sandbox at `/site-preview` when temporarily enabled: ribbon stays visible, loader serves the active bundle, the chat API opens with 8 starter paths, safeguarding copy holds on prayer and youth paths, Business Network stays neutral, no cross-tenant rows were created, and a sandbox contact test lead emitted the expected automation event. **`enabled` is `false` again** — the sandbox page loads the loader script but serves the disabled no-op stub until a future operator authorisation.
