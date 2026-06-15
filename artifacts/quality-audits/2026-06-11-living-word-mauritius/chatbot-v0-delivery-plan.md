# Living Word chatbot v0 — delivery plan (CorpFlow-native text widget prototype)

**Mode:** implementation prototype on the working tree. Does not commit, push, deploy, mutate live Postgres, or apply Prisma migrations. Production deploy + migration apply require Anton's explicit approval per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.

**Date:** 2026-06-15 (Monday, UTC+4).

**Tenant scope:** `tenant_id = living-word-mauritius`. Test host: `https://living-word-mauritius.corpflowai.com`. Widget embed on the external WordPress site (`https://livingwordmauritius.com`) is **out of scope** for this packet — we hand the embed string to Anton when v0 is verified on the test host.

**Stream-purity:** runs entirely on the **current** CorpFlow tenant model (`tenants`, `tenant_hostnames`, `tenant_personas`, the existing `auth_users`-bound session). Does not depend on or trigger the multi-tenant operator credential platform stream (`docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`).

**Decision basis:** `chatbot-options-assessment.md` (this folder, §9.1) recommends **Option 1 — CorpFlow-native text widget**. This packet implements that option for v0.

---

## 1. Scope (what v0 does)

### 1.1 Included (this packet)

1. **Embeddable script tag** served from CorpFlow at `https://<tenant-host>/api/chat-widget/loader.js`.
2. **Text-only widget**: floating bubble bottom-right, expandable panel, no media, no voice.
3. **Tenant-scoped configuration** in a new Postgres table `chat_widget_configs` (one row per tenant). Includes branding (name, accent colour, logo URL), greeting, a JSON flow tree, notify settings, a per-tenant kill switch, and a per-tenant monthly message counter.
4. **Living Word branding** seeded into the config (placeholder content; church owner reviews and confirms before any external embed).
5. **Eight deterministic starter options:** Service times · Find us / Location · Prayer request (with safeguarding note) · Contact the church · Volunteer / Serve · WordGroups · Youth / Children · Business Network.
6. **No open-ended AI** in the hot path. The flow advances by `branch_on_choice`, `info`, `collect_field`, and `submit` nodes only.
7. **Field collection only when needed**: name, email or phone, request type, message. Sensitive fields (financial info, age data beyond a coarse band, government IDs, passwords, credentials) are explicitly excluded.
8. **Prayer-request safeguarding note** with explicit no-crisis-counselling disclaimer rendered before any prayer-request collection.
9. **Tenant-scoped storage**: every row in `chat_widget_threads`, `chat_widget_messages`, `chat_widget_rate_limits` carries `tenant_id`; queries filter by it; no fallback default.
10. **Notification stub**: on submit, write an `automation_events` row via the existing `recordTrustedAutomationEvent` primitive. Optionally write a `cmp_tickets` row in v1 (deferred).
11. **Rate limiting**: per-IP-hash + per-tenant token-bucket sliding window stored in `chat_widget_rate_limits`. Default cap: 30 messages per IP per 5 minutes per tenant; configurable per-tenant.
12. **Kill switch**: `chat_widget_configs.enabled = false` causes start/step/submit endpoints to return `403 WIDGET_DISABLED` and the loader to serve a no-op stub. Toggleable via a factory-only admin endpoint.
13. **Monthly message counter** (placeholder for future budget): `messages_this_month` + `messages_month_yyyymm` columns on `chat_widget_configs`. v0 only counts; v1 enforces caps.
14. **Test page** at `/chat-widget-demo` on the tenant host, demonstrating the script-tag embed in a static page.

### 1.2 Out of scope (explicit non-goals for v0)

- No LLM / AI calls. The schema reserves `ai_budget_*` columns for future use; v0 does not call any model.
- No edits to `livingwordmauritius.com` or `network.livingwordmauritius.com` — no script tag added, no WordPress edit, no DNS change.
- No GoHighLevel changes — no API call, no widget removal, no workspace touch.
- No CMP ticket creation in v0 — `automation_events` stub is sufficient. CMP integration is a v1 follow-up.
- No multi-channel surfaces (WhatsApp, email, SMS, voice).
- No live agent / human-in-the-loop chat. Pure form-bot.
- No multi-tenant operator switching code. The widget is anonymous-public; there is no operator session involved at runtime.
- No commit / push / merge / deploy from this packet. Anton authorises that on review.
- No `prisma migrate deploy` against production. Anton authorises migration apply.

### 1.3 Operator gates (required before v0 ships live)

Per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`:

| Step | Allowed without approval | Anton's approval required |
|---|---|---|
| Code on working tree (this packet) | Yes (§2: read-only inspection + drafts) | — |
| `git commit` + push to a branch | Yes — but kept manual here per stream discipline | — |
| Open PR for review | Yes (§2: PR creation) | — |
| Vercel Preview deploy | Yes (§2: Preview deploys) | — |
| `prisma migrate deploy` against production Neon | — | **Yes** (§3: schema mutations on shared DB) |
| Merge to `main` (Production deploy) | — | **Yes** (§3: production deploy) |
| Seed Living Word config + flow row | — | **Yes** (§3: tenant data writes) |
| Live verification on `living-word-mauritius.corpflowai.com/chat-widget-demo` | Yes (§2: non-production verification + evidence capture) | — |
| Embed `<script>` on external `livingwordmauritius.com` | — | **Yes** (§3: external client systems) |

This packet stops at "code on working tree". Everything else is a follow-up gated by Anton.

---

## 2. Architecture

### 2.1 Routing

Per `vercel.json`, every `/api/*` request lands on the single serverless function `api/factory_router.js`. We add five new path prefixes there, dispatched to handlers in `lib/server/chat-widget/`:

| Path | Method | Handler | Purpose |
|---|---|---|---|
| `/api/chat-widget/loader.js` | GET | `handleChatWidgetLoader` | Returns the widget JS bundle (text/javascript). Public. CORS `*`. Reads tenant from host. |
| `/api/chat-widget/start` | POST | `handleChatWidgetStart` | Creates a `chat_widget_threads` row, returns the flow root node. Public. CORS configurable per-tenant. Rate-limited. |
| `/api/chat-widget/step` | POST | `handleChatWidgetStep` | Advances the flow: records a `chat_widget_messages` row, returns the next node. Public. Rate-limited. |
| `/api/chat-widget/submit` | POST | `handleChatWidgetSubmit` | Marks thread complete, writes the lead snapshot onto the thread, fires `recordTrustedAutomationEvent('chat_widget.lead.submitted')`. Public. Rate-limited. |
| `/api/chat-widget/admin/kill-switch` | POST | `handleChatWidgetKillSwitch` | Factory-only (`requireFactoryMasterOnly` gate). Toggles `chat_widget_configs.enabled` for a tenant. |

Anonymous-public surfaces are gated by:
- Host → `tenant_id` resolution (via the existing `tenant_hostnames` lookup, already done in `applyCorpflowHostTenantResolution` upstream of every handler).
- Per-tenant kill switch.
- Per-IP + per-tenant rate limit.
- Strict input validation + size caps.

### 2.2 Data model

Four new Prisma models, all keyed on `tenantId`. All additive. No existing column modified.

| Model | Table | Purpose |
|---|---|---|
| `ChatWidgetConfig` | `chat_widget_configs` | One row per tenant. Holds enabled flag, branding, flow JSON, notify settings, AI-budget placeholders, message counter. |
| `ChatWidgetThread` | `chat_widget_threads` | One row per visitor session. Holds collected lead fields, source host/path, IP hash, user agent, status, ticket id (if/when CMP wired). |
| `ChatWidgetMessage` | `chat_widget_messages` | One row per step. Direction (`bot` or `user`), node id, content. |
| `ChatWidgetRateLimit` | `chat_widget_rate_limits` | Per (tenant, ip_hash, window_start_minute) counter. |

Schema details in `prisma/schema.prisma` and the migration SQL in `prisma/migrations/20260615000000_chat_widget_v0/migration.sql`.

### 2.3 Flow JSON shape

Stored at `chat_widget_configs.flow_json`. Versioned via `flow_version` (integer, monotonic). Strict schema enforced server-side in `lib/server/chat-widget/flow.js`:

```text
{
  "schema_version": 1,
  "root": "welcome",
  "nodes": {
    "<node_id>": {
      "type": "menu" | "info" | "collect_field" | "submit",
      ...node-specific fields
    },
    ...
  }
}
```

Node types:

- `menu` — `prompt: string`, `options: [{ label: string, next: <node_id> }]`. Renders option chips. User clicks one → server records the choice, advances to `next`.
- `info` — `prompt: string`, `next?: <node_id>`, optional `options: [...]`. Renders text, optional next step or back-to-menu choice.
- `collect_field` — `prompt: string`, `field: "name"|"email"|"phone"|"message"|"request_type"`, `required: bool`, `next: <node_id>`. Renders the prompt + a single text input. Server stores the value on the thread row, never echoes back PII.
- `submit` — `prompt: string` (thank-you wording). Server marks thread complete, fires notification, returns the thank-you. Terminal.

Validation rules:
- `email` field is regex-validated (`/^[^@\s]+@[^@\s]+\.[^@\s]+$/`).
- `phone` field accepts digits + spaces + `+` + `-` + `()`, length 7–20.
- `name` field length 1–80.
- `message` field length 1–2000.
- `request_type` field constrained to a server-side allow-list per flow.
- All fields trimmed; HTML stripped server-side; never re-rendered as HTML.

Disallowed fields (hard server-side reject): financial info, government IDs, passwords/credentials, dates of birth (we accept coarse age band only when explicitly in the flow), addresses beyond city/region.

### 2.4 Embed shape

The embed string for any tenant follows this template:

```html
<script async src="https://<tenant-host>/api/chat-widget/loader.js"
        data-flow="default"
        data-position="bottom-right"
        data-greeting="Hi! How can we help?"></script>
```

For Living Word, the script is served from `https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js`. The bundle reads the host that served it (via `document.currentScript.src`) and uses that as the API origin for `/start`, `/step`, `/submit`. CORS on the API endpoints reflects the embed origin.

**v0 default CORS:** `Access-Control-Allow-Origin: *` for the loader.js (purely static JS, no PII). For `/start`, `/step`, `/submit`, CORS reflects the request `Origin` only if it is in `chat_widget_configs.allowed_origins[]` (a JSON array column). For Living Word v0 the array is seeded with `https://livingwordmauritius.com`, `https://www.livingwordmauritius.com`, `https://network.livingwordmauritius.com`, `https://living-word-mauritius.corpflowai.com`. Other origins are rejected with 403 `ORIGIN_NOT_ALLOWED`.

**Empty `allowed_origins[]`:** strict reject — any `/start`, `/step`, `/submit` from any origin returns 403. This is intentional: an unconfigured widget is unreachable. Operators must seed at least one origin (typically the tenant subdomain itself) before a widget can be exercised. The seed script for Living Word seeds four origins, so this only matters for future tenants where seeding has not yet run.

**OPTIONS preflight:** also gated by the per-tenant allow-list. The browser-cached preflight (Max-Age 600s) only succeeds when the `Origin` matches one of the configured entries; otherwise the response carries no `Access-Control-Allow-Origin` header, the browser fails the preflight cleanly, and the actual POST is never sent.

This is the canonical defence: even if the loader.js is fetched from a malicious page, the API endpoints will refuse to accept conversation steps from that origin. The widget can be swapped to any tenant by changing `data-flow` and the embedding host.

### 2.5 Notification stub (v0)

On `submit`, the handler calls `recordTrustedAutomationEvent(prisma, { tenantId, eventType: 'chat_widget.lead.submitted', payload: { thread_id, lead_name, lead_email, lead_phone, request_type, lead_message_excerpt, source_host, source_path, occurred_at } })`. This:

- Writes an `automation_events` row (tenant-scoped).
- Emits a telemetry row.
- Forwards via `forwardAutomationEnvelope` to n8n (if `CORPFLOW_AUTOMATION_FORWARD_URL` is configured) — the existing operator notification rail.

For v1, an additional path will create a `cmp_tickets` row in stage `Intake` keyed to the chat thread, so the lead lives inside the existing Change Console workflow.

For v0, the notification stub is sufficient and idempotent (`idempotencyKey = 'chat-widget-thread:' + thread.id`).

### 2.6 Rate limiting

Sliding-window in Postgres. Per `(tenantId, ipHash, windowStartMinute)` row. Default cap: 30 events per 5 minutes per IP per tenant. Configurable per-tenant via `chat_widget_configs.rate_limit_per_window` and `chat_widget_configs.rate_limit_window_seconds`. On exceed, return `429 RATE_LIMITED` with the standard `Retry-After` header.

`ipHash` is `sha256(ip + tenant_id + CORPFLOW_CHAT_WIDGET_IP_SALT)` — the salt is required env, not committed. We store the hash, never the IP.

This is intentionally a simple DB-backed limiter — sufficient for v0 volumes (church-website scale). If volume justifies it, v1 swaps for an in-memory or KV-backed limiter.

### 2.7 Cost shape (no LLM in v0)

Per visitor conversation: ~5–15 DB writes (1 thread + N messages + 1 rate-limit row + 1 automation_events row). Sub-cent on Vercel + Neon at expected church-website volumes. Predictable, capped by the rate limiter.

`chat_widget_configs.ai_budget_monthly_usd` defaults to `0`. In v0, even if a future `ai_step` node is somehow added to a flow, the handler refuses to call the model when the cap is zero. Defence-in-depth against accidental LLM cost.

---

## 3. Files in this packet

All paths are relative to the repo root. Files are ordered to roughly match dependency order.

| # | Path | Status | Purpose |
|---|---|---|---|
| 1 | `prisma/schema.prisma` | modified (additive) | Adds 4 models: `ChatWidgetConfig`, `ChatWidgetThread`, `ChatWidgetMessage`, `ChatWidgetRateLimit`. |
| 2 | `prisma/migrations/20260615000000_chat_widget_v0/migration.sql` | new | DDL for the 4 tables + indexes. Idempotent (`CREATE TABLE IF NOT EXISTS`) so it can be applied once via Prisma migrate or via a future `ensure-schema` path. |
| 3 | `lib/server/chat-widget/config.js` | new | Loads `chat_widget_configs` row by tenant_id; caches per-request; exposes `loadConfigForRequest(req)`. |
| 4 | `lib/server/chat-widget/flow.js` | new | Validates flow JSON shape; advances flow given current node + user input; returns next node or terminal. |
| 5 | `lib/server/chat-widget/rate-limit.js` | new | Computes ip hash; reads/writes `chat_widget_rate_limits`; returns allow/deny + retry-after. |
| 6 | `lib/server/chat-widget/notify.js` | new | Wraps `recordTrustedAutomationEvent` with the chat-widget event-type vocabulary; safe payload (excerpts, never raw PII in payload beyond what's needed for routing). |
| 7 | `lib/server/chat-widget/widget-bundle.js` | new | Exports the widget JS as a string. Vanilla, no React, no jQuery. ~250 lines. Loads from `loader.js` handler. |
| 8 | `lib/server/chat-widget/handlers.js` | new | HTTP handlers: `handleChatWidgetLoader`, `handleChatWidgetStart`, `handleChatWidgetStep`, `handleChatWidgetSubmit`, `handleChatWidgetKillSwitch`. |
| 9 | `api/factory_router.js` | modified | Adds 5 path-segment dispatches to the handlers above. |
| 10 | `pages/chat-widget-demo.js` | new | Test page on the tenant host (`https://living-word-mauritius.corpflowai.com/chat-widget-demo`). Renders `<script async src="/api/chat-widget/loader.js" data-flow="default">`. |
| 11 | `scripts/seed-chat-widget-config-living-word.mjs` | new | One-time idempotent upsert of `chat_widget_configs` row for `tenant_id=living-word-mauritius` with the eight starter options seeded. Run by Anton when DB migration is applied. |
| 12 | `artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-v0-delivery-plan.md` | new (this file) | This delivery plan. |

No file outside the table is touched. No existing column is modified. No existing model is renamed. No existing route is changed.

---

## 4. Living Word v0 flow content

Seeded by `scripts/seed-chat-widget-config-living-word.mjs`. Wording is **placeholder until the church owner reviews and confirms**. Marked with `TODO(owner)` in the seed script. Live verification on the test host can use the placeholder; the external WordPress embed waits for owner sign-off on every line.

### 4.1 Tenant config (seed values)

| Field | Value | Note |
|---|---|---|
| `enabled` | `false` | Kill switch starts OFF. Anton flips it on after seed + live verification. |
| `brand_name` | `"Living Word Mauritius"` | From `tenants.name`. |
| `brand_accent` | `"#1E3A8A"` | Placeholder dark blue; church owner picks the real one. |
| `brand_logo_url` | `null` | Owner supplies later. |
| `greeting` | `"Hi! How can we help today?"` | Owner can override. |
| `notify_via` | `"automation_event"` | v0 stub. v1 may switch to `"cmp_ticket"`. |
| `notify_email` | `null` | v1 SMTP path (out of scope here). |
| `allowed_origins` | `["https://livingwordmauritius.com", "https://www.livingwordmauritius.com", "https://living-word-mauritius.corpflowai.com"]` | CORS allow-list for `/start`, `/step`, `/submit`. |
| `rate_limit_per_window` | `30` | Default. |
| `rate_limit_window_seconds` | `300` | 5-minute window. |
| `ai_budget_monthly_usd` | `0` | No AI in v0. |
| `flow_version` | `1` | Bumps when flow changes. |
| `flow_json` | (see §4.2) | JSON tree. |

### 4.2 Flow tree (v0 — placeholder wording)

```text
welcome (menu)
  prompt: "Hi! Welcome to Living Word Mauritius. How can we help today?"
  options:
    1. "Service times"          → service-times
    2. "Find us"                → location
    3. "Prayer request"         → prayer-disclaimer
    4. "Contact the church"     → contact-name
    5. "Volunteer / Serve"      → volunteer-name
    6. "WordGroups"             → wordgroups-info
    7. "Youth / Children"       → youth-name
    8. "Business Network"       → network-info

service-times (info)
  prompt: TODO(owner): real service times. Placeholder: "Sundays 09:00 and 11:00. Tuesdays 19:00 prayer. Please confirm with the church before you visit."
  next: anything-else

location (info)
  prompt: TODO(owner): real address. Placeholder: "We meet at <address> in <area>. Find us on Google Maps: <link>."
  next: anything-else

prayer-disclaimer (info)
  prompt: "Prayer requests are read by a small pastoral team. We are not a counselling or crisis service — if you or someone you know is in immediate danger, please call your local emergency services. Continue if you'd like to share a request."
  options:
    1. "Continue with prayer request"  → prayer-name
    2. "Back to the menu"              → welcome

prayer-name (collect_field name) → prayer-email
prayer-email (collect_field email, required: false) → prayer-message
prayer-message (collect_field message, required: true) → prayer-submit

prayer-submit (submit)
  request_type: "prayer"
  prompt: "Thank you. Your request has been received and will be read by our pastoral team. May God bless you."

contact-name (collect_field name) → contact-email
contact-email (collect_field email) → contact-message
contact-message (collect_field message) → contact-submit

contact-submit (submit)
  request_type: "contact"
  prompt: "Thank you. Someone from the church will reach out within 2 working days."

volunteer-name (collect_field name) → volunteer-email
volunteer-email (collect_field email) → volunteer-area
volunteer-area (collect_field message, prompt: "Which area would you like to serve in? (e.g. welcoming, music, children, sound, hospitality)")
  → volunteer-submit

volunteer-submit (submit)
  request_type: "volunteer"
  prompt: "Thank you for offering to serve. The volunteer coordinator will follow up by email."

wordgroups-info (info)
  prompt: TODO(owner): WordGroups description. Placeholder: "WordGroups are small mid-week groups across the island that meet to share life and study the Bible. We can match you to a group near you."
  options:
    1. "I'd like to join a WordGroup"  → contact-name
    2. "Back to the menu"              → welcome

youth-name (collect_field name, prompt: "Parent or guardian name")
  → youth-email
youth-email (collect_field email) → youth-band
youth-band (menu, prompt: "Which age range?")
  options:
    1. "Children (under 12)"      → youth-message
    2. "Youth (13–18)"            → youth-message
    3. "Young adults (19–25)"     → youth-message

youth-message (collect_field message, required: false, prompt: "Anything else we should know?")
  → youth-submit

youth-submit (submit)
  request_type: "youth"
  prompt: "Thank you. The youth/children team will be in touch."

network-info (info)
  prompt: TODO(owner): Business Network description. Placeholder: "The Business Network connects Christian business owners and professionals across Mauritius for prayer, learning, and partnership."
  options:
    1. "I'd like to join the Business Network"  → contact-name
    2. "Back to the menu"                        → welcome

anything-else (menu)
  prompt: "Anything else?"
  options:
    1. "Yes, take me back to the menu"   → welcome
    2. "No, thanks"                       → goodbye

goodbye (info)
  prompt: "Thanks for visiting. May God bless you today."
  (terminal — no next, no submit, no field collection)
```

### 4.3 Field discipline

The flow above collects: name, email (sometimes optional), phone (none in v0 — added in v1 if needed), message, request_type. It does **not** collect: financial info, government IDs, passwords, full date of birth, full address. The age-band selection in `youth-band` stores a coarse band, not a date.

For prayer requests specifically, the safeguarding note in `prayer-disclaimer` is the gate. The user must explicitly tap "Continue with prayer request" before any field is collected. This matches the v0 brief requirement #9 verbatim.

---

## 5. Verification plan

This is what closes v0 from PARTIAL to COMPLETE per `.cursor/rules/delivery-reality.mdc`. Each step is owned and gated as marked.

### 5.1 Local checks (this packet, before commit)

| Check | Owner | Method |
|---|---|---|
| Prisma schema parses | Cursor | `npx prisma validate` (read-only). |
| TypeScript / ESLint passes | Cursor | `npm run build` against working tree (Cursor may run; no deploy). |
| No new unit tests required for v0 | Cursor | Documented: tests added when the v1 packet promotes the prototype. |

### 5.2 PR + Preview deploy (operator path)

1. Anton reviews the working tree (or a branch Cursor pushes after his go).
2. Anton opens a PR.
3. Vercel Preview builds. Vercel Preview shares the same Neon Postgres in v0 — meaning the Preview deploy will hit production tables. Mitigation: the migration is **not** applied yet; the Preview will fail any DB-bound chat-widget endpoint with a clear "table missing" error, which is acceptable for surface-level smoke. Loader.js + the demo page render without DB.
4. Anton confirms Preview surfaces render without a runtime crash.

### 5.3 Migration apply (Anton-only)

1. Anton runs `npx prisma migrate deploy` against the production Neon instance.
2. Cursor (read-only) verifies the four tables exist via a diagnostic script (or Anton via Neon console).
3. Anton runs `node scripts/seed-chat-widget-config-living-word.mjs` to upsert the Living Word config row + flow JSON.
4. Verify with read-only SELECT: `chat_widget_configs WHERE tenant_id = 'living-word-mauritius'` returns exactly one row, `enabled = false` (kill switch off until live verification done).

### 5.4 Production deploy (operator-merge)

1. Anton merges the PR.
2. Vercel Production builds + deploys.
3. Cursor (or Anton) re-probes the four T1 URLs to confirm no regression on routing (`/api/ui/context`, `/api/tenant/site`, `/login`, `/change`).

### 5.5 Live verification on test host (post-deploy)

| Check | URL | Expected |
|---|---|---|
| Loader serves | `GET https://living-word-mauritius.corpflowai.com/api/chat-widget/loader.js` (kill switch off) | 200 with content-type `application/javascript`; first bytes contain the no-op stub (because `enabled=false`). |
| Demo page renders | `GET https://living-word-mauritius.corpflowai.com/chat-widget-demo` | 200 HTML; the script tag references the loader. |
| Kill switch off → loader is no-op | open the demo page in a browser | Widget bubble does NOT render (kill switch off). |
| Anton enables widget | `POST .../api/chat-widget/admin/kill-switch` (factory-only auth) with body `{"tenant_id":"living-word-mauritius","enabled":true}` | 200, `{ ok: true, enabled: true }`. |
| Loader serves real widget | `GET .../api/chat-widget/loader.js` | 200, full bundle (~10 kB). |
| Widget bubble appears | reload demo page | Bubble bottom-right; click expands panel. |
| Welcome menu renders | open panel | Eight options visible in this exact order: Service times · Find us · Prayer request · Contact the church · Volunteer / Serve · WordGroups · Youth / Children · Business Network. Matches §4.2. |
| Path 1 — Service times | tap "Service times" → tap "Continue" | Info node renders the placeholder text; advancing leads to the "Anything else?" menu. No fields collected. |
| Path 2 — Find us / Location | tap "Find us" → tap "Continue" | Info node renders the placeholder location text; advances to "Anything else?". No fields collected. |
| Path 3 — Prayer request (safeguarding) | tap "Prayer request" | The §4.2 safeguarding text renders **verbatim** (no crisis-counselling claim); two options offered: "Continue with prayer request" and "Back to the menu". |
| Path 3 — Prayer flow completes | tap Continue → enter name → enter email (or skip — optional) → enter message → submit | Thank-you renders. `chat_widget_threads` row for this tenant has `request_type='prayer'`, `status='completed'`, `lead_name`, `lead_message` populated. `automation_events` row of type `chat_widget.lead.submitted` exists with `tenant_id=living-word-mauritius` and the `prayer` request_type. |
| Path 4 — Contact the church | tap "Contact the church" → enter name → enter email → enter message → submit | Thank-you renders. Thread row has `request_type='contact'`. Notification fires. |
| Path 5 — Volunteer / Serve | tap "Volunteer / Serve" → enter name → enter email → enter area-of-service message → submit | Thank-you renders. Thread row has `request_type='volunteer'`. Notification fires. |
| Path 6 — WordGroups | tap "WordGroups" | Info node renders the placeholder description with two follow-up options ("I'd like to join a WordGroup", "Back to the menu"). |
| Path 6 — WordGroups → contact path | tap "I'd like to join a WordGroup" → name → email → message → submit | Thread row has `request_type='contact'` (reuses the contact-collect chain). Notification fires. |
| Path 7 — Youth / Children | tap "Youth / Children" → parent name → email → tap an age band ("Children (under 12)" / "Youth (13–18)" / "Young adults (19–25)") → optional message → submit | Thank-you renders. Thread row has `request_type='youth'`. Verify only the coarse age band is stored on the thread (no DOB collected). Notification fires. |
| Path 8 — Business Network | tap "Business Network" | Info node renders the placeholder description with two follow-up options ("I'd like to join the Business Network", "Back to the menu"). |
| Path 8 — Business Network → contact path | tap "I'd like to join the Business Network" → name → email → message → submit | Thread row has `request_type='contact'`. Notification fires. |
| Anything-else loop | after any info-only path, tap "Yes, take me back to the menu" | Welcome menu re-renders with all eight options. |
| Goodbye terminal | after any info path, tap "No, thanks" | Final goodbye text renders; no further input UI; thread is terminal but stays `status='active'` (informational paths do not finalise). |
| Cross-tenant isolation | run all 8 paths under `living-word-mauritius`, then `SELECT count(*) FROM chat_widget_threads WHERE tenant_id != 'living-word-mauritius'` | No new rows under any other tenant. Specifically `tenant_id = 'luxe-maurice'` returns the same count as before the test. |
| Reverse cross-tenant | run any path under `lux.corpflowai.com` (when a Lux config is later seeded), then `SELECT count(*) FROM chat_widget_threads WHERE tenant_id = 'living-word-mauritius'` | No new Living Word rows. (For v0 only Living Word has a config; this check confirms the host-based gate when a second tenant is seeded.) |
| Disabled origin rejected | from a non-allowed origin (e.g. `https://example.com`), POST to `/start` | 403 `ORIGIN_NOT_ALLOWED`; OPTIONS preflight from the same origin returns 204 with no `Access-Control-Allow-Origin` header. |
| Rate limit kicks in | rapid-fire 31 POSTs from the same IP within 5 minutes | 31st request returns 429 `RATE_LIMITED` with `Retry-After: <seconds>`. |
| Kill switch off again | `POST .../admin/kill-switch` body `{"tenant_id":"living-word-mauritius","enabled":false}` | 200; subsequent `/start` and `/step` return 403 `WIDGET_DISABLED`; loader serves the no-op stub (≤60s after, due to the loader cache); `/admin/kill-switch` from a non-admin session returns 403 `forbidden_factory_master_only`. |
| Monthly counter increments | check `chat_widget_configs.messages_this_month` after the verification | Counter > 0; `messages_month_yyyymm` matches current month (UTC). |
| No Groq / API-token cost incurred | scan Vercel logs and Groq usage during the verification run | Zero `groq` / model-call log lines; zero token spend; `chat_widget_configs.ai_budget_spent_usd` remains 0. |

### 5.6 Living Word stream evidence capture

Every check above is captured into `artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-v0-live-verification.md` (created when verification runs). HTML / JSON / SELECT outputs included. The file is the Delivery Reality Audit shape per the canonical block.

Once §5.5 passes end-to-end, this delivery plan flips from `state = PROTOTYPE-DRAFTED` to `state = V0-LIVE-VERIFIED`.

### 5.7 External embed (separate packet, Anton-only)

The `<script async src=...>` embed line is **not pushed** to `livingwordmauritius.com` from this packet. The provider-handoff path is:

1. Anton or the third-party WordPress provider obtains the embed string (text only).
2. They paste it into the WordPress footer (Elementor → Custom Code, or child theme).
3. They confirm the bubble renders on `livingwordmauritius.com`.
4. They then remove the GoHighLevel widget script tag.

Step 4 is the GHL decommission moment. It is reversible (re-add the GHL tag) until the church owner is satisfied.

---

## 6. Risks and mitigations

### 6.1 Vercel function-count cap

vercel.json declares one function (`api/factory_router.js`). All five chat-widget paths route through it. Keeps us within the Hobby tier 12-function limit. No new function added.

### 6.2 Prisma migration drift between Preview and Production

Preview and Production share the same Neon database. Until migration is applied, chat-widget endpoints fail with "table missing"; this is acceptable for the migration apply gate. After migration apply, both Preview and Production see the new tables; Preview deploy of unrelated PRs continues to work because the new code is additive.

### 6.3 Open-redirect / origin-spoofing on the loader

The loader.js sets the API origin from `document.currentScript.src`. The script element's `src` is the URL the page actually fetched, so it resolves to the embed host. CORS on the API endpoints further restricts which origins may post conversation steps. Even so, the loader bundle does not contain any tenant-specific secret; the tenant is resolved server-side by the host that serves `/start`.

### 6.4 IP-hash salt rotation

`CORPFLOW_CHAT_WIDGET_IP_SALT` must be set in Vercel env. If rotated, existing rate-limit rows become stale (different hash for the same IP), which is fine — slight under-counting for one window, then convergence. Not a security defect.

### 6.5 PII in `automation_events` payload

The notify stub includes `lead_email`, `lead_name`, `lead_phone`, and `lead_message_excerpt` (first 280 chars) in the payload so n8n / operator workflows can act on it. This is the same shape `tenant-intake.js` already uses for tenant intake events. Documented in `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` as part of the v1 follow-up.

### 6.6 Schema commitment

The four new tables become first-class CorpFlow data. Reshape costs are non-trivial. Mitigation: the shape mirrors `cmp_tickets` / `automation_events` (tenant-scoped, row-per-event) and tracks the well-understood "form-bot conversation" pattern — unlikely to need radical reshape.

### 6.7 Spam ingest

A public `/start` endpoint is an open door. Mitigations layered: per-IP rate limit (default 30/5min), per-tenant kill switch, message size cap (2000 chars), strict field validation, optional Turnstile / hCaptcha challenge before `/submit` (v1 — not in v0; brief #12 satisfied by rate limit + kill switch + validation).

### 6.8 LLM cost runaway

`ai_budget_monthly_usd = 0` default + no `ai_step` node type implemented in v0. Even if a future flow JSON tries to use one, the handler refuses. Defence-in-depth.

### 6.9 Tenant isolation regression on add of new endpoints

Every chat-widget DB query must filter by `tenantId = effectiveTenantId` (resolved from the host via `req.corpflowContext`). No fallback default. A query that omits the filter is a defect, not a feature; verified by code review on the PR.

### 6.10 GoHighLevel decommission timing

Until the v0 widget is verified live on `livingwordmauritius.com`, the GHL widget stays. No big-bang switch. Reversal path: remove the new `<script>` tag, re-add the GHL one.

---

## 7. Security review triggers (per `.cursor/rules/security-sensitive-changes.mdc`)

This packet hits multiple triggers when it merges:

- `api/factory_router.js` — new public endpoint surface.
- `lib/server/chat-widget/*` — new server-side handlers + DB writers.
- `prisma/schema.prisma` + `prisma/migrations/...` — schema mutation.
- `.env.template` — new env var `CORPFLOW_CHAT_WIDGET_IP_SALT` (and possibly future vars).
- `pages/chat-widget-demo.js` — new public surface (operator-only by URL convention but rendered for verification).

Required walks before merge:

1. **Tenant isolation.** Every query in `lib/server/chat-widget/*` filters by `tenantId`; no fallback default; missing tenant id → reject. Walked: §2.2, §6.9.
2. **Input validation.** Field-type checks; size caps; HTML stripped server-side; never re-rendered as HTML. Walked: §2.3, §6.7.
3. **CORS.** Per-tenant allow-list on `/start`, `/step`, `/submit`. Walked: §2.4.
4. **Rate limiting.** Default cap; configurable per tenant. Walked: §2.6, §6.7.
5. **Secrets.** No new secret committed. New env `CORPFLOW_CHAT_WIDGET_IP_SALT` documented in `.env.template`. Walked: §6.4.
6. **Logging.** No PII in console.log; audit rows go to `automation_events` (already governed). Walked: §6.5.
7. **Factory-only admin.** `/admin/kill-switch` gated by `requireFactoryMasterOnly`. Walked: §2.1.
8. **No new auth/session behaviour.** Anonymous-public widget; no session cookie issued; no operator-credential model touched. Walked: stream-purity reminder above.

If the security reviewer finds a gap, the corresponding §6 risk gets a stronger mitigation before merge.

---

## 8. Future work (NOT this packet)

Listed so the v0 stays minimal.

- **CMP ticket integration** — on `submit`, also create a `cmp_tickets` row at stage `Intake`. Brings chat leads into the existing Change Console workflow.
- **Operator admin UI** — visual flow editor, branding editor, allowed-origin manager, monthly counter dashboard. v0 has `kill-switch` only; everything else is direct DB / seed-script.
- **Visual flow builder** — replace JSON-by-hand authoring; only when operator friction justifies the build.
- **Optional AI tier** — `ai_step` node type, Groq integration, per-tenant budget enforcement. Wired only when a tenant asks for it and accepts a budgeted cost.
- **Email notification path** — when `notify_via = 'email'` is set, send a structured email instead of (or in addition to) the automation event. Reuses the existing `lib/server/communications/*`.
- **Per-tenant phone collection** — currently flows can specify `field: phone`; v0 Living Word seed does not use it. v1 may add for SMS-friendly intake.
- **Turnstile / hCaptcha** — pre-`submit` challenge for higher-traffic tenants.
- **Cross-tenant analytics** — operator-only roll-up of widget conversion across tenants. Sits behind a factory-only endpoint.
- **External-host CORS hardening** — current allow-list is text. v1 may move to a regex column for `*.<tenant-domain>` cases.

Each of these is a future packet with its own approval gate and DRA.

---

## 9. References

- `artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-options-assessment.md` — option 1 selection rationale (recommended).
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/estate-map.md` — current GHL widget context on `livingwordmauritius.com`.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/migration-scope.md` — owner-confirmed direction.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/tenant-onboarding-scope.md` — tenant capabilities.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/provider-handoff.md` — surface ownership boundary; widget on CorpFlow's side, embed on the WordPress provider's side.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/t1-onboarding-delivery-reality-audit.md` — current execution state (PARTIAL pending Anton's manual sign-in for /change verification).
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape this document satisfies.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — what this packet may run vs what needs Anton.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — production-grade bar.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — buyer-facing surfaces clarity rule.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — managed outcomes vs generic AI wrappers.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — items walked in §7.
- `.cursor/rules/security-sensitive-changes.mdc` — triggers met by this packet.
- `.cursor/rules/delivery-reality.mdc` — verdict discipline applied to v0 verification.
- `.cursor/rules/predeploy-decision-checks.mdc` — pre/post-deploy live checks applied to §5.4 / §5.5.
- `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` — referenced only to confirm decoupling: chat widget v0 runs on the current single-tenant model and does not depend on the platform stream.

---

## 10. Status block

```text
Delivery Reality Audit (chat widget v0):
- State: PROTOTYPE-DRAFTED on working tree (no commit, no push, no deploy, no DB write)
- Code drafted: YES (12 files; see §3)
- Schema migration written: YES (additive)
- Schema migration applied: NO (gated on Anton)
- Branch / PR: not yet (gated on Anton)
- Preview deploy: not yet (gated on Anton's PR)
- Production deploy: not yet (gated on Anton's merge)
- Living Word config seeded: NO (gated on migration apply)
- Live verification on test host: NO (gated on production deploy + seed + kill switch flip)
- External embed on livingwordmauritius.com: NO (out of scope; later packet, Anton-only)
- Final verdict: PARTIAL — drafts ready for review; live verification gated on operator approvals listed in §1.3.
```

When §5.5 closes end-to-end, this section flips to `state = V0-LIVE-VERIFIED` with full audit evidence.

---

## 11. Hardening review (2026-06-15, pre-PR)

Operator-requested read-only audit before PR/merge/migration, against the nine areas in the brief. Every finding listed; severity assigned; minimum-scope fixes applied where useful; everything else explicitly **left as-is** with rationale. No DB mutation, no migration apply, no production deploy from this review.

### 11.1 Findings table

| ID | Area | Severity | Status | Description |
|---|---|---|---|---|
| F1 | 2 — public endpoint safety | LOW | FIXED | `/api/chat-widget/submit` previously enforced only tenant + kill-switch; missing origin allow-list and rate-limit gates. v0 widget bundle does not call `/submit`, but defensive symmetry says it should match `/start` and `/step`. Now passes through the same `gatePublicEndpoint` helper as the others. |
| F2 | 2 — public endpoint safety | LOW | FIXED | OPTIONS preflight on `/start`, `/step`, `/submit` previously emitted `Access-Control-Allow-Origin: <whatever>` for any origin. Browser preflight cleared cleanly even for rogue origins (the actual POST was still correctly rejected with 403). New `handlePreflight` helper loads the per-tenant config and only emits CORS headers when the request `Origin` is in `allowed_origins[]`; otherwise returns 204 with `Vary: Origin` and no ACAO, so the browser fails the preflight without ever sending the POST. |
| F3 | 1 — tenant containment | LOW | FIXED | Post-verify thread updates in `/step` used `prisma.chatWidgetThread.update({ where: { id } })`, relying on the prior `findFirst({ id, tenantId })` for tenant-scoping. Strictly correct, but the tenant filter was implicit. Switched both update sites to `updateMany({ where: { id, tenantId } })` so every chat-widget mutation in the file carries an explicit `tenantId` filter. Defence-in-depth. |
| F4 | 1 — tenant containment | LOW | FIXED | The post-update `findUnique` for the notify snapshot (line 319 pre-fix) read by primary key only. Switched to `findFirst({ where: { id, tenantId } })` for the same defence-in-depth reason. |
| F5 | 6 — schema/migration | LOW | FIXED | Migration SQL had a `migrate resolve --applied` note but no rollback note. Added an explicit `ROLLBACK` block listing the four `DROP TABLE IF EXISTS` statements (in dependency order: rate_limits, messages, threads, configs) plus the `migrate resolve --rolled-back` reference, gated by the §3 operator-approval rule. |
| F6 | 9 — verification plan | LOW | FIXED | §5.5 enumerated 3 of 8 menu paths explicitly (Service times, Find us, Prayer). Now lists all 8 paths with expected `request_type` values, the menu order, the safeguarding-text-verbatim check, the youth coarse-age-band-only check, and explicit no-token-cost / counter / rate-limit / kill-switch / cross-tenant-isolation rows. |
| F7 | docs | LOW | FIXED | §2.4 of this plan stated "Empty list -> only same-host (the tenant subdomain) is permitted." That did not match `isOriginAllowed`, which strictly rejects every origin when the array is empty. Plan now reads "Empty `allowed_origins[]`: strict reject"; the JSDoc on `isOriginAllowed` was corrected too. |
| F8 | code hygiene | COSMETIC | FIXED | `userText = currentNode.field === 'message' ? cleaned : cleaned;` — pointless ternary; both branches identical. Replaced with `userText = cleaned;`. |
| F9 | 3 — abuse/cost | INFORMATIONAL | NO CHANGE | `rate-limit.js` short-circuits to `{ allowed: true }` when `tenantId` or `ipHash` is empty. `hashIpForTenant` always returns a 32-char hex string regardless of inputs, so `ipHash` is never empty in real call sites. The `tenantId === ''` branch is unreachable from the public endpoints (those already 404 on missing tenant context before calling the limiter). Documented here; no code change. |
| F10 | 4 — sensitive data | INFORMATIONAL | NO CHANGE | The `automation_events` payload includes `lead.name`, `lead.email`, `lead.phone`, `lead.message_excerpt` (capped at 280 chars). Operators legitimately need name + contact + intent to follow up the lead via n8n workflow. Full `lead_message` stays on the `chat_widget_threads` row (not in the event payload). No raw IP, no `user_agent` in the payload, no internal IDs beyond `thread_id` + `tenant_id`. PII envelope is the minimum operationally useful set. |
| F11 | 5 — admin/kill switch | INFORMATIONAL | NO CHANGE | `/admin/kill-switch` accepts any admin session (`sess.payload.typ === 'admin'`); it does NOT cross-check the admin's host or membership matrix. This matches the existing `requireFactoryMasterOnly` pattern in `lib/cmp/router.js`. A future tightening to require a host-scoped admin (per the multi-tenant operator credential design in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`) is captured there as platform-stream work; not a v0 blocker. |
| F12 | 3 — abuse/cost | INFORMATIONAL | NO CHANGE | `checkAndConsume` is non-atomic: under high concurrency two requests can both pass the `findMany` summation then both `upsert` an increment, yielding a slight over-count vs the cap. At church-website volumes (Living Word v0 expected: dozens to low-hundreds of conversations/month) this is negligible. v1 may swap for an atomic `INSERT ... ON CONFLICT ... DO UPDATE SET count = count + 1 RETURNING count` if traffic justifies. |

### 11.2 Affirmative checks (no defect found)

Listed for completeness so future reviewers do not have to re-derive.

#### 11.2.1 Tenant containment (area 1)

- All four chat-widget tables carry `tenant_id` (verified in `prisma/migrations/20260615000000_chat_widget_v0/migration.sql`).
- Every `prisma.chatWidget*` call in `lib/server/chat-widget/handlers.js` filters by `tenantId` (post-fix: F3, F4 close the last two implicit cases).
- `loadConfigForRequest` returns `null` when `req.corpflowContext.surface !== 'tenant'` or `tenant_id` is empty. No fallback default tenant. Apex hosts (`core.corpflowai.com`) and unknown hosts therefore 404 every chat-widget endpoint.
- `kill-switch` admin endpoint takes `tenant_id` from the body (factory-only); it cannot read or write rows under a different tenant than the one it is told to act on.
- A request sent to `living-word-mauritius.corpflowai.com/api/chat-widget/start` cannot create a `chat_widget_threads` row under `tenant_id = 'luxe-maurice'`: the host resolves to `living-word-mauritius` via `tenant_hostnames`, the thread is created with `tenantId: cfg.tenantId`, and the read paths in `/step` filter by the same.

#### 11.2.2 Public endpoint safety (area 2)

- `/loader.js`: anonymous-public; no auth; tenant-aware via Host header; serves a no-op stub when kill-switch is OFF; serves the active bundle only when ON. Cache-Control 60s public. Generic `Access-Control-Allow-Origin: *` is correct here (purely static JS, no PII, no tenant secret in the bundle).
- `/start`, `/step`, `/submit`: anonymous-public; gated by host-to-tenant resolution + kill switch + origin allow-list + rate limit + strict input validation. Method enforced (POST only, plus OPTIONS preflight). Body cap 64 KB in `readJsonBody`.
- CORS only emits `Access-Control-Allow-Origin: <origin>` when that origin is in `chat_widget_configs.allowed_origins[]`. Preflight respects the same allow-list (post-fix F2). `Vary: Origin` is set on every response.

#### 11.2.3 Abuse / cost controls (area 3)

- No LLM call exists. `lib/server/chat-widget/` contains no import of `groq-client`, `openai`, or any model SDK. Verified by `rg -i 'groq|openai|anthropic|llm|gpt|claude|ai_step' lib/server/chat-widget/` — zero matches.
- No `ai_step` node type. `flow.js` `NODE_TYPES = new Set(['menu', 'info', 'collect_field', 'submit'])` — anything else throws `flow_invalid: node_type:...`.
- Monthly counter is tenant-scoped: `bumpMonthlyMessageCounter(tenantId, delta)` writes to `chat_widget_configs` filtered by `tenantId`. No cross-tenant aggregation.
- 429 behaviour is deterministic: `RATE_LIMITED` response body + `Retry-After: <seconds>` header where seconds is computed from the oldest live bucket, clamped to `Math.max(1, ...)`.
- Length caps: body 64 KB total; per-field caps in `sanitiseFieldInput` — name 1–80, email 5–254, phone 7–24, message 1–2000, request_type 1–40, source_host 255, source_path 500, user_agent 500. Stored `content` of every chat message is `.slice(0, 2000)`.

#### 11.2.4 Sensitive data (area 4)

- Prayer-request safeguarding wording is in the seed at `prayer-disclaimer` node, verbatim: *"Prayer requests are read by a small pastoral team. We are not a counselling or crisis service — if you or someone you know is in immediate danger, please call your local emergency services. Continue if you'd like to share a request."* Two explicit options follow: "Continue with prayer request" or "Back to the menu". The user must explicitly tap Continue before any field is collected.
- No crisis-counselling claim anywhere in the seed. Prayer-submit thank-you reads *"Thank you. Your request has been received and will be read by our pastoral team. May God bless you."* — descriptive, no promised outcome.
- Collected fields are minimal: name, email (optional for prayer), message, optional age band (coarse), optional area-of-service. **No phone collection** in the Living Word v0 seed (the schema supports it; the flow does not request it). **No DOB.** **No address.** **No financial info.** **No government ID.** **No password / credential.**
- `automation_events` payload includes only `thread_id`, `tenant_id`, `lead.name/email/phone/request_type/message_excerpt[≤280 chars]`, `origin.source_host`, `origin.source_path`, `occurred_at`. No raw IP, no `ip_hash`, no `user_agent`, no internal database IDs beyond the thread id.

#### 11.2.5 Admin / kill switch (area 5)

- `/api/chat-widget/admin/kill-switch` requires `sess.payload.typ === 'admin'` (factory-master-equivalent gate, matching the existing `requireFactoryMasterOnly` posture in `lib/cmp/router.js`).
- Tenant-client sessions have `typ === 'tenant'`; `isAdmin` is therefore `false`; tenants get 403 `forbidden_factory_master_only`. Verified by inspection of `lib/server/auth.js` and the `getSessionFromRequest` payload shape in `lib/server/session.js`.
- The endpoint is tenant-scoped (`tenant_id` from body keys the row updated). Toggling Living Word does not affect Lux.
- Disabled state behaviour: `/loader.js` serves the no-op stub; `/start`, `/step`, `/submit` all return 403 `WIDGET_DISABLED` without touching the database.

#### 11.2.6 Schema / migration (area 6)

- Additive only: every statement is `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` / FK in `DO $$ … EXCEPTION duplicate_object` block. No `ALTER`, `DROP`, or rename of any existing object.
- Rollback note now present (post-fix F5).
- Indexes:
  - `chat_widget_configs`: unique on `tenant_id` + index on `tenant_id` (config lookup by tenant — every public endpoint).
  - `chat_widget_threads`: index on `(tenant_id, started_at)` + index on `(tenant_id, status)` (operator dashboards / future reads).
  - `chat_widget_messages`: index on `(thread_id, created_at)` (transcript by thread) + `(tenant_id, created_at)` (operator audit by tenant).
  - `chat_widget_rate_limits`: unique on `(tenant_id, ip_hash, window_start)` (upsert key — drives the limiter), index on `(tenant_id, ip_hash)` (live-window summation), index on `window_start` (opportunistic prune).
- Lookup patterns covered: thread by id (PK), thread by tenant + status (index), thread by tenant + time (index), messages by thread + time (index), config by tenant (unique), rate-limit lookup (unique). No Seq Scan expected on hot paths at any reasonable volume.

#### 11.2.7 Function cap / lazy imports (area 7)

- `vercel.json` declares one function: `api/factory_router.js`. The five new chat-widget paths are `if`-branches inside that file; no new function file added. Function count remains 1; well within Hobby's 12.
- Lazy imports: `await import('../lib/server/chat-widget/handlers.js')` inside each chat-widget branch. Node ESM caches modules after the first import, so subsequent calls reuse the cached module (no per-request module load cost beyond the first). Existing routes are untouched: the lazy import only fires for `pathSeg.startsWith('chat-widget/')`. Verified by reading the dispatcher above and below the new block.
- No regression risk to existing routes: the new branches sit between the existing `chat` and `stats` branches, all with mutually exclusive `pathSeg ===` matches.

#### 11.2.8 Demo page (area 8)

- `<meta name="robots" content="noindex,nofollow" />` set in the page head.
- Wording is operator-only: titled "Chat widget — verification page"; body opens with "This is a CorpFlow internal verification surface."; closes with "Out of scope for this surface: marketing copy, conversion CTAs, brand chrome. This is a throwaway operator-only demo page."
- The page does not imply the external `livingwordmauritius.com` is live or that this widget is yet running there. It only describes the verification surface and the failure modes ("If you do not see the bubble: kill switch off, migration not applied, seed not run"). No external CTAs.

#### 11.2.9 Verification plan (area 9)

Post-fix F6, §5.5 covers, in order: disabled state (loader + start), enable transition (kill-switch flip), all eight menu paths individually with their expected `request_type`, prayer safeguarding copy verbatim, lead submission for each path, automation_events row presence, cross-tenant isolation in both directions, disabled-origin reject with preflight detail, rate-limit 429 with `Retry-After`, kill-switch off with admin-only enforcement, monthly counter increment, and no-token-cost / no-Groq-call confirmation. The full §5 also prescribes pre-deploy local checks (§5.1), PR + Preview deploy (§5.2), migration apply gate (§5.3), production deploy gate (§5.4), and external-embed packet (§5.7).

### 11.3 Files touched by this hardening review

| Path | Change |
|---|---|
| `lib/server/chat-widget/handlers.js` | Refactored gates into `handlePreflight` + `gatePublicEndpoint` helpers. Locked `/submit` behind the same gates as `/start` and `/step`. OPTIONS preflight now allow-list-aware. Two thread mutations switched from `update({where:{id}})` to `updateMany({where:{id, tenantId}})`. Cosmetic ternary cleaned up. |
| `lib/server/chat-widget/config.js` | `isOriginAllowed` JSDoc corrected (empty list = strict reject, not "same-host"). |
| `prisma/migrations/20260615000000_chat_widget_v0/migration.sql` | Added explicit `ROLLBACK` block with the four `DROP TABLE IF EXISTS` statements (in dependency order) and the `migrate resolve --rolled-back` reference. |
| `artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-v0-delivery-plan.md` | Corrected §2.4 empty-allow-list wording. Expanded §5.5 to enumerate all eight menu paths plus the no-token-cost check. Added this §11. |

No other file changed. No DB mutation. No migration apply. No production deploy. The packet remains in `state = PROTOTYPE-DRAFTED` on the working tree, now with hardening fixes applied.