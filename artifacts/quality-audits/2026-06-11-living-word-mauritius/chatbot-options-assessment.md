# Chatbot replacement — options assessment for Living Word Mauritius

**Mode:** read-only. No code, no DB writes, no DNS changes, no Vercel changes, no edits to `livingwordmauritius.com`, no edits to `network.livingwordmauritius.com`, no Lux changes, no multi-tenant operator switching work, no `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` modification.

**Date:** 2026-06-15 (Monday, UTC+4).

**Scope of this artefact:** evaluate six text-chatbot options for replacing the GoHighLevel (LeadConnector) widget on `https://livingwordmauritius.com/`, against the Living Word v0 brief (text-only, structured paths, no LLM by default, tenant-scoped storage, script-tag embed, optional later AI behind tenant budget caps). Conclude with a single recommendation.

**Stream-purity reminder:** this assessment lives in the Living Word stream. The CorpFlow-native option is described in tenant-pure language and runs on the **current** CorpFlow tenant model (`tenant_id`, `tenant_hostnames`, per-tenant `auth_users`). It does **not** depend on, wait for, or imply the multi-tenant operator credential platform work in `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`.

**Companion artefacts in this folder:**

- `estate-map.md` — what's on `livingwordmauritius.com` today (GoHighLevel widget + WordPress + Modern Events Calendar + Formidable / Elementor Pro Forms + WooCommerce on `network.`).
- `migration-scope.md` — owner direction confirmed: GHL widget replacement, then later FOSS CRM.
- `tenant-onboarding-scope.md` — registration moment (T1 already executed 2026-06-12; gates closing on `living-word-mauritius.corpflowai.com`).
- `provider-handoff.md` — third-party hosting + chatbot script-tag embed expectations.
- `t1-onboarding-delivery-reality-audit.md` — current execution state (PARTIAL, awaiting Anton's manual sign-in).

**Doctrine alignment:**

- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — production-grade bar applies to the v0 widget the moment it's customer-visible.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — buyer-facing surfaces (the church visitor) must clearly know what action they're taking; "AI assistant that may waffle" violates this. Structured paths win.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — sell managed outcomes / vertical workflows, not generic AI wrappers. A church-specific deterministic flow is "above the line"; a generic LLM widget is "below the line".
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — chatbot capture is a PII surface. Triggers checklist on any embed code path.
- `.cursor/rules/delivery-reality.mdc` — implementation work, when authorised, must close at live-verified production, not at "merged".

---

## 0. Brief recap

Living Word Mauritius operates a chatbot-first lead-capture surface on `https://livingwordmauritius.com/`. The current implementation is a GoHighLevel (LeadConnector) widget whose ongoing fee is the primary driver of the GHL subscription Living Word currently pays. Replacement target = parity with that widget for the church's actual use, **not** advanced AI:

1. Visitor arrives on the apex / interior pages.
2. Widget surfaces (bottom-right bubble or auto-open).
3. Visitor enters a question or selects a path (e.g. "I want to visit a service", "I have a prayer request", "I want to give").
4. Widget collects name + email (and optionally phone) and routes the visitor to the right next step (page link, calendar, form, or human follow-up).
5. The conversation + lead lands somewhere the church can act on (email, simple admin UI, or eventually a FOSS CRM).

Out of scope for the chatbot v0 (per owner direction):

- Live agent chat (no agents on staff).
- Real-time AI Q&A (waffle risk; cost risk).
- WhatsApp / Messenger / multi-channel inbox.
- Voice.
- Sentiment / analytics dashboards.

What "v0" must do well:

- Render fast, clean, on mobile and desktop.
- Be embeddable on WordPress with one `<script>` tag (or iframe) without breaking Elementor.
- Store conversations + leads on CorpFlow infrastructure (so the church does not lose data on hosting moves).
- Notify the church (email today; CMP ticket later) within seconds.
- Cost predictably and bound runaway risk (no per-message LLM bill).

The text-only v0 is a **chatbot replacement**, not an AI agent. AI may be added later as an optional behaviour behind a tenant budget cap, but the design defaults must work without any LLM call in the hot path.

---

## 1. Evaluation rubric

Each option is scored on twelve dimensions. The scoring is qualitative (high / medium / low) — this is a fit assessment, not a benchmark. The order of dimensions matches the user spec.

| # | Dimension | Why it matters |
|---|---|---|
| 1 | What it is | Honest characterisation of the project. |
| 2 | Self-host | Avoids vendor lock-in and per-message billing. |
| 3 | Website embed | Required for `livingwordmauritius.com` and future tenants. |
| 4 | Tenant-scoped (CorpFlow) | Storage, audit, billing, and isolation must live in CorpFlow's `tenant_id` model. |
| 5 | No-AI / deterministic flows | Match the "no waffle, no runaway bill" requirement. |
| 6 | Human handoff / notification | Email or CMP ticket so the church actually responds. |
| 7 | Cost risks | Operational cost + variable cost (LLM tokens, support tier, scaling). |
| 8 | Infrastructure complexity | Operational surface that has to live somewhere off the laptop. |
| 9 | Licensing concerns | Whether the licence allows embed + per-tenant SaaS use. |
| 10 | Fit for Living Word v0 | First-tenant suitability (overkill ≠ good). |
| 11 | Fit as future CorpFlow Core Capability | Will it scale across tenants without becoming the second product to operate? |
| 12 | Recommendation | use / defer / reject, with the reason. |

A v0 fit means: ships in days, costs <USD 50 / month all-in, replaces GHL parity, does not require new vendor accounts the church has to manage.

A Core Capability fit means: scales to 10+ tenants without becoming a separate Ops surface; can be productized as a CorpFlow offering above the commodity line.

---

## 2. Option 1 — CorpFlow-native text widget (recommended)

### 2.1 What it is

A small JavaScript widget served from `corpflowai.com` (or a tenant subdomain), embeddable on any third-party site (WordPress, etc.) via one `<script>` tag. The widget posts conversation steps to a CorpFlow API on `*.corpflowai.com` that:

- Resolves `tenant_id` from the embedding host (or from a `data-tenant-id` attribute on the `<script>`).
- Walks a tenant-scoped JSON flow ("intake tree") loaded from a Postgres row keyed by `tenant_id` + `flow_slug`.
- Captures lead fields (name, email, optional phone, optional message, plus the path the visitor took).
- Writes the conversation thread + lead into Postgres tables under the tenant_id boundary (re-using the same `tenant_id` column convention already in `cmp_tickets`, `automation_events`, `tenant_personas`, etc.).
- Fires an outbound notification (email v0; CMP ticket creation v1) on completion.
- Optionally calls an LLM **only** at explicit "AI step" nodes in the flow — gated by a per-tenant budget cap.

The widget UI is a small floating bubble + a panel that opens with predefined option chips ("Visit a service", "Prayer request", "Give", "Talk to someone"). Free-text is accepted but the default UX is structured choices, exactly matching the GHL widget's effective behaviour for Living Word today (per `estate-map.md` — GHL is configured as a structured intake, not a true conversational AI).

### 2.2 Twelve-dimension assessment

| Dimension | Verdict | Notes |
|---|---|---|
| **Self-host** | **YES** (already on CorpFlow infra) | Adds zero new operational surface. Runs on the existing Vercel deployment + Neon Postgres + the existing tenant model. |
| **Website embed** | **YES — primary mode** | Single `<script>` tag, async, ~10 kB compressed, no jQuery. Works on WordPress + Elementor without breaking the page. iframe fallback for hosts that block third-party `<script>` (rare). |
| **Tenant-scoped (CorpFlow)** | **YES — natively** | Widget reads `tenant_id` from `tenant_hostnames` lookup or from `data-tenant-id`. All DB writes filter by `tenant_id`. The Living Word + Lux + future-tenant containment is the same isolation that `cmp_tickets` already enforces. |
| **No-AI / deterministic flows** | **YES — default** | Flow is a JSON tree stored in `chat_flows.flow_json` keyed by `(tenant_id, flow_slug)`. Each node is a `prompt_user` / `collect_field` / `branch_on_choice` / `link_out` / `submit` step. No LLM call unless an explicit `ai_step` node is added (see optional AI tier below). |
| **Human handoff / notification** | **YES** | v0: SMTP email to a configured tenant inbox on `submit`. v1: also creates a `cmp_tickets` row in stage `Intake`, leveraging the existing CorpFlow CMP routing. v2: optional outbound webhook for tenant-specific integration (e.g. ChurchCRM later). |
| **Cost risks** | **VERY LOW** | No third-party token or per-message billing. Marginal cost is one Postgres row + one Vercel function invocation per visitor step (sub-cent per conversation). LLM costs only appear if a tenant explicitly enables an AI step **and** the per-tenant cap is set above zero. Cap defaults to USD 0 = no AI calls. |
| **Infrastructure complexity** | **LOW** | Adds 2–3 Prisma tables (`chat_flows`, `chat_threads`, `chat_messages`), 3–4 API routes (`/api/chat/start`, `/api/chat/step`, `/api/chat/submit`, `/api/chat/widget.js`), one widget bundle, one minimal admin UI for editing flow JSON (or YAML import). Reuses existing tenancy, auth, audit, email, and Vercel deploy pipeline. |
| **Licensing concerns** | **NONE** | Code lives in this repo; CorpFlow owns it; no third-party FOSS licence to honour beyond standard npm dependencies (e.g. tiny chat UI primitives). |
| **Fit for Living Word v0** | **HIGHEST** | Hits parity with the GHL widget on day one (visit-a-service, prayer request, give, talk-to-someone) without the GHL fee. Living Word's WordPress + Elementor stack accepts a `<script>` embed cleanly. Mauritius-resident church + CorpFlow's Neon Postgres (US/EU) data flow needs the standard PII data-flow note in `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` — same as Lux. |
| **Fit as future CorpFlow Core Capability** | **HIGHEST** | Built on CorpFlow primitives (tenant_id, CMP, automation_events, communications). Each new tenant onboards as a new flow JSON + a `chat_flows` row + a script-tag string — no per-tenant infra. Productizable as "managed church / SMB intake widget" above the commodity AI-wrapper line. |
| **Recommendation** | **USE for v0** | Default choice. Sequenced behind T1 closure and a small Prisma + API + widget packet. |

### 2.3 Implementation outline (NOT this packet — design only)

A v0 packet, when authorised, would have roughly this shape (per `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`):

1. **Schema** (Prisma migration, additive):
   - `chat_flows(tenant_id, flow_slug, flow_json, version, enabled, created_at, updated_at)` — keyed `(tenant_id, flow_slug)`.
   - `chat_threads(id, tenant_id, started_at, completed_at, lead_email, lead_name, source_host, user_agent, ip_hash)` — one row per visitor session.
   - `chat_messages(id, thread_id, tenant_id, direction ['bot' | 'user'], node_id, content, created_at)` — one row per step.
   - Optional v2: `chat_ai_budget(tenant_id, monthly_usd_cap, current_month_spend_usd)` — for the optional AI tier.
2. **APIs** (Next.js pages-router under `pages/api/chat/`):
   - `GET /api/chat/widget.js` → returns the JS bundle (minified, cache-busted via flow `version`).
   - `POST /api/chat/start` → resolves `tenant_id`, creates `chat_threads` row, returns the flow root node.
   - `POST /api/chat/step` → records user input, advances to the next node, returns it.
   - `POST /api/chat/submit` → marks thread complete, fires email notification, optionally creates a CMP ticket.
   - All endpoints rate-limited per IP + per tenant.
3. **Embed**: tenant operator pastes one `<script async src="https://<tenant>.corpflowai.com/api/chat/widget.js" data-flow="default"></script>` into the WordPress footer (via Elementor → Custom Code, or via a child theme). Optional `<div id="cf-chat"></div>` for inline placement.
4. **Admin UI** (light v0): a `/change` panel under the existing CMP for editing flow JSON. v0 = paste JSON; v1 = a small visual builder if it earns its keep.
5. **Notification**: SMTP via the existing CorpFlow communications path (`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`); from-address per tenant.
6. **Compliance**: data-flow note added to `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` — name, email, optional phone, optional message, IP hash, user agent. PII processed in CorpFlow Postgres (Neon, US/EU). Tenant policy can later opt into local-only retention.
7. **Optional AI tier** (NOT v0): an `ai_step` node type, gated by `chat_ai_budget` per tenant. Cap of USD 0 means the node degrades to a deterministic "I'll have someone follow up" handoff. Cap > 0 means a Groq / OpenAI call with a system prompt that forces church-specific scope. Budget consumption is tracked per call.
8. **Security review**: triggered by `pages/api/chat/*` (public ingest endpoint), `prisma/schema.prisma` (new tables), `lib/server/communications/*` (outbound mail). Per `.cursor/rules/security-sensitive-changes.mdc`.

This is design context, not work being authorised by this assessment.

### 2.4 Risks, honestly named

- **Schema commitment.** The Postgres tables are first-class CorpFlow data. Renaming them later is harder than not adding them in the first place. Acceptable risk: the shape mirrors `cmp_tickets` / `automation_events` and is unlikely to need radical reshape.
- **Spam ingest.** A public `<script>` endpoint is an open door. Mitigations: per-IP and per-tenant rate limits, basic content heuristics, optional Cloudflare Turnstile / hCaptcha challenge before `submit`. None are exotic; all are standard.
- **Email deliverability.** Notifications must reach the church inbox. Reuse the existing `lib/server/communications/*` send path which already handles SPF/DKIM/return-path for the CorpFlow envelope. If the church wants the from-address on `livingwordmauritius.com`, that's a DNS / SPF item for the provider-handoff packet, not a chatbot blocker.
- **WordPress / Elementor compatibility drift.** Elementor sometimes wraps content in shadow DOM containers; the widget must be robust to that. Tested on day one; failure mode is "widget doesn't render" — visible immediately, not silent corruption.
- **Tenant misconfiguration.** A flow JSON with broken branches could leave a visitor stuck. Mitigation: linter on flow JSON + a default fallback path on every node.

None of these is a blocker; all are normal SaaS-widget concerns.

---

## 3. Option 2 — Chatwoot self-hosted

### 3.1 What it is

Chatwoot is an open-source customer-support / multi-channel messaging platform. Primary use: a multi-channel agent inbox (web widget + email + WhatsApp + Facebook Messenger + Twitter + Telegram + SMS via Twilio) that surfaces every customer conversation in one shared agent dashboard. Secondary: API-driven bots that can run a flow before handing off to a human agent. Source: `chatwoot/chatwoot` on GitHub. Production architecture is Ruby on Rails + Postgres + Redis + Sidekiq workers + ActionCable websockets.

The closest comparison is "self-hosted Intercom for SMBs". The Chatwoot Bots feature is bolt-on (API-driven) rather than the product's centre of gravity; their docs steer operators toward live agent inboxes.

### 3.2 Twelve-dimension assessment

| Dimension | Verdict | Notes |
|---|---|---|
| **Self-host** | YES | Docker compose or Kubernetes. Requires Postgres, Redis, Rails web + worker, persistent storage for attachments. |
| **Website embed** | YES | `<script>` widget; clean. |
| **Tenant-scoped (CorpFlow)** | PARTIAL | Chatwoot has its own "accounts" (their multi-tenant primitive). One CorpFlow tenant = one Chatwoot account. Boundary enforced inside Chatwoot, not in our Postgres. Cross-system reconciliation (CorpFlow tenant_id ↔ Chatwoot account_id) becomes a permanent maintenance item. Storage of conversations sits in Chatwoot's Postgres, not CorpFlow's. |
| **No-AI / deterministic flows** | LIMITED | Bot flows possible via the Bot API but the toolchain is not a flow builder; it's a "your code calls our API" pattern. Easy to build, but you've then built option 1 inside Chatwoot's harness. |
| **Human handoff / notification** | EXCELLENT | This is Chatwoot's core competency. Live agent dashboard, assignment, canned responses, SLAs, multi-channel routing. |
| **Cost risks** | MEDIUM | No per-message billing (self-hosted). Significant **infrastructure** cost: Rails app + workers + Redis + Postgres separate from CorpFlow's, plus storage for attachments. Easily USD 30–80/month on a modest VPS, before any agent SaaS tooling. |
| **Infrastructure complexity** | HIGH | A whole second stack to operate: Ruby version pin, Rails app server + worker dynos, Sidekiq queue, Redis, separate Postgres, separate backups, separate upgrade cadence. Off Vercel — needs a VPS or container host. Adds an L2 or L3 host to operate. |
| **Licensing concerns** | MODERATE | Chatwoot CE was historically MIT; the project moved key features into a paid edition over time. Current LICENSE file should be re-checked at the moment of any adoption decision; specifically whether per-tenant SaaS use of self-hosted CE is permitted without a commercial agreement. Not a hard "no", but a checklist item. |
| **Fit for Living Word v0** | LOW (overkill) | The church has no agents on staff. A multi-channel inbox without operators to staff it is wasted complexity. The chatbot need is intake + notification, which Chatwoot does **a posteriori** to a richer agent UI Living Word does not need today. |
| **Fit as future CorpFlow Core Capability** | MEDIUM-LOW | If CorpFlow ever sells "managed live-agent inbox" as a product tier, Chatwoot could be the substrate. But that product duplicates much of CorpFlow's CMP / tenant model and runs on a parallel stack. Likely a wrong long-term shape: better to extend CorpFlow's own surfaces than to operate a parallel agent platform. |
| **Recommendation** | **DEFER** | Do not adopt for v0. Re-assess only if CorpFlow decides to enter the live-agent-inbox product tier. Even then, "extend CMP" is the more likely path than "stand up Chatwoot per tenant". |

### 3.3 Why DEFER and not REJECT

Chatwoot is mature, well-loved, and self-hostable. The reason it loses to option 1 is **fit**, not quality. If a future tenant explicitly needs a multi-channel agent inbox (WhatsApp + web + email all in one operator UI) and CorpFlow chooses to operate that on their behalf, Chatwoot is the strongest open-source candidate to revisit. That's a separate strategic decision, not a chatbot-replacement decision.

---

## 4. Option 3 — Typebot self-hosted

### 4.1 What it is

Typebot is an open-source visual conversational form / chatbot builder. Drag-and-drop flow canvas (very approachable for non-engineers), embed via `<script>` (chat bubble) or iframe. Stores responses, supports webhooks, conditionals, variables, and an OpenAI integration block (optional). Source: `baptisteArno/typebot.io`. Production architecture is Next.js (multi-app: builder + viewer + API) + Postgres + S3-compatible storage + Redis (for queues).

It is the closest "no-code form-bot" peer to a CorpFlow-native widget, with a richer flow editor than option 1 v0 would ship with.

### 4.2 Twelve-dimension assessment

| Dimension | Verdict | Notes |
|---|---|---|
| **Self-host** | YES | Docker compose; production-ready. Three Next.js apps (builder, viewer, API) + Postgres + storage. |
| **Website embed** | YES | Clean. Bubble or iframe. Good mobile UX. |
| **Tenant-scoped (CorpFlow)** | PARTIAL | Typebot has workspaces; one workspace per CorpFlow tenant, OR multiple flows in one workspace tagged per tenant. Storage of responses lives in Typebot's Postgres, not CorpFlow's. To get responses into CorpFlow CMP, you wire a webhook from each flow to a CorpFlow ingest endpoint — duplicates the data and adds a sync surface. |
| **No-AI / deterministic flows** | YES | Default mode is deterministic. AI is an explicit OpenAI block; not in the hot path unless added. |
| **Human handoff / notification** | LIMITED | Webhook-out to email/Slack/Discord/CorpFlow. No native agent inbox. |
| **Cost risks** | LOW–MEDIUM | Flat infra cost (3 Next.js apps + Postgres + storage on a VPS, ~USD 20–40/month). Variable cost only if AI block enabled. |
| **Infrastructure complexity** | MEDIUM | Separate stack from CorpFlow; off Vercel possible (Docker), but needs a host. Backups + upgrades + monitoring run in parallel to CorpFlow's. Webhook from Typebot to CorpFlow CMP becomes a permanent dependency. |
| **Licensing concerns** | **AGPL-3.0** | Typebot is AGPL-3.0. AGPL means: if you modify Typebot **and** offer it over a network (which any per-tenant SaaS use is), you must publish your modifications under AGPL. Embedding the unmodified upstream as a black box is fine; forking + customising for tenant branding is not without honouring AGPL. **This is the binding constraint** that pushes Typebot from "strong v0 candidate" to "deferred". |
| **Fit for Living Word v0** | MEDIUM | Technically capable. Lower operator effort to author a flow than option 1's JSON / YAML approach. But the AGPL footprint + separate stack are real costs. |
| **Fit as future CorpFlow Core Capability** | MEDIUM | Visual flow builder is appealing, **but** the AGPL constraint conflicts with CorpFlow's commercial model (CorpFlow is closed-source). Embedding upstream Typebot unmodified across tenants might be defensible; making per-tenant customisations triggers AGPL. Legal review is required before scaling Typebot across tenants commercially. |
| **Recommendation** | **DEFER** | Strong technical option held back by AGPL + separate-stack overhead. Re-assess if option 1 v0 ships and operators discover they want a visual builder; then evaluate whether to (a) build a small visual builder on top of option 1, or (b) revisit Typebot with a clear legal posture. |

### 4.3 The licensing point, expanded

AGPL-3.0 is a strong copyleft for network-served software. Practically, three usage shapes for Typebot:

1. **Use Typebot upstream, no modifications, embed the upstream-rendered flow on tenant sites.** Likely AGPL-compliant with no source-publication obligation (you're a user of the upstream binary, not a distributor). Still requires upstream attribution and the AGPL notice where appropriate.
2. **Fork Typebot, customise, and offer per-tenant.** Triggers AGPL: any user of the network service must be able to obtain the modified source. CorpFlow as a commercial provider would have to comply.
3. **Run Typebot upstream + extensions as separate processes that talk to it.** Murky; depends on whether the extension is "combined work" or "separate program" under the FSF's tests. Conservative read: assume the obligation applies to the combined system.

This is solvable with legal review. It is not solvable by "just adopt Typebot and move on". For Living Word v0 specifically, the fastest path is option 1; Typebot becomes a serious candidate only if option 1 reveals operator-authoring friction that justifies the AGPL footprint review.

---

## 5. Option 4 — Flowise

### 5.1 What it is

Flowise is an open-source, low-code, visual builder for LLM and AI-agent workflows (LangChain-style chains, vector retrieval, prompt orchestration, tool use). Source: `FlowiseAI/Flowise`. Architecture is Node + a visual canvas; ships an embed widget that surfaces a flow as a chat. The product's centre of gravity is **AI agents**, not deterministic forms.

### 5.2 Twelve-dimension assessment

| Dimension | Verdict | Notes |
|---|---|---|
| **Self-host** | YES | Docker, Node. |
| **Website embed** | YES | Embed widget exists. |
| **Tenant-scoped (CorpFlow)** | WEAK | One Flowise instance, multiple flows. Tenant boundary lives inside Flowise. Same friction as Typebot, with similar webhook-sync overhead to land data in CorpFlow CMP. |
| **No-AI / deterministic flows** | **NO — WRONG TOOL** | Flowise is built for LLM workflows. Deterministic-only flows are possible by removing every AI node, but that contradicts what the tool exists to do. You'd be paying complexity cost for AI features the brief explicitly excludes. |
| **Human handoff / notification** | WEAK | Not native; webhook-only. |
| **Cost risks** | **HIGH** | The default mode of every Flowise flow is "call an LLM". Token spend is the foreground metric. There is no native per-tenant budget cap; you'd build that yourself. The exact failure mode the brief calls out — "runaway AI/LLM bills" — is the path of least resistance with Flowise. |
| **Infrastructure complexity** | MEDIUM | Separate Node service + Postgres / SQLite for state. |
| **Licensing concerns** | LOW (currently Apache-2.0-ish, recently moved some pieces) | Re-confirm at adoption time. Less restrictive than AGPL. |
| **Fit for Living Word v0** | **VERY LOW** | Wrong tool for "no LLM by default". Living Word's intake doesn't need an AI agent, and Flowise is awkward as a deterministic form-bot. |
| **Fit as future CorpFlow Core Capability** | LOW–MEDIUM | If/when CorpFlow ships an "AI agent" tier (paid, with explicit token budgets), Flowise is a candidate **builder UI for the operator** — not a runtime. Even then, the runtime-vs-builder split should be deliberate; running Flowise as the live runtime accepts its cost-risk shape into production. |
| **Recommendation** | **REJECT for v0** | Wrong shape for the brief. Reconsider only as an internal authoring tool for an explicit AI-agent product tier (separate decision, separate packet). |

### 5.3 Why this is a clear reject

The brief's first cost discipline — "avoid runaway AI/LLM bills" — is exactly the failure mode Flowise's default behaviour walks into. Adopting it for v0 would force CorpFlow to immediately build the budget-cap and deterministic-fallback machinery that option 1 ships with by design. The juice does not justify the squeeze for Living Word's actual intake need.

---

## 6. Option 5 — Botpress

### 6.1 What it is

Botpress is a chatbot platform with two distinct product lines that share a name and confuse evaluation:

1. **Botpress v12 (legacy, fully open source).** A self-hostable Node.js chatbot framework with a visual flow builder, NLU, and channel connectors. Active development effectively wound down; security / Node-version / dependency support is best-effort.
2. **Botpress Cloud (current, vendor-hosted).** A managed AI agent platform with its own pricing tiers, usage caps, and proprietary cloud-only features. The on-premise / self-host story is sharply diminished compared to v12.

There is also "Botpress OSS" (a community fork / separate repo) of pieces of v12, but it is not the same continuity as the Cloud product.

### 6.2 Twelve-dimension assessment

| Dimension | Verdict | Notes |
|---|---|---|
| **Self-host** | v12 YES, current Cloud NO | Self-host story exists only on the legacy v12 branch. |
| **Website embed** | YES | Both versions embed via `<script>`. |
| **Tenant-scoped (CorpFlow)** | WEAK | Per-bot, not per-tenant. Multi-tenancy via instance-per-tenant or naming conventions; not ergonomic. |
| **No-AI / deterministic flows** | v12 YES, Cloud NO | v12 is a flow framework first; AI optional. Cloud has shifted decisively toward LLM-agent posture. |
| **Human handoff / notification** | YES (via integrations) | Email / webhook / agent integrations exist. |
| **Cost risks** | v12 LOW (self-host), Cloud HIGH | Cloud uses token-based pricing for AI agents — same runaway-bill risk class as Flowise. |
| **Infrastructure complexity** | v12 MEDIUM (Node + Postgres + redis-or-equivalent) | But operating an aging, lightly-maintained v12 is itself a risk: security patches, Node version drift, dependency rot. |
| **Licensing concerns** | v12 historically AGPL-style for the open-source pieces; Cloud is proprietary. Re-confirm before adoption. |
| **Fit for Living Word v0** | **LOW** | v12 is technically usable but operationally a long-term liability. Cloud doesn't fit "no LLM, predictable cost". |
| **Fit as future CorpFlow Core Capability** | **LOW** | Vendor + product-line drift. Cloud lock-in is a strategic mismatch with CorpFlow's "operate it ourselves" posture. |
| **Recommendation** | **REJECT** | Neither variant is a strong fit. v12 is aging; Cloud is wrong-shape. |

### 6.3 Why no further investigation

The brief asks for a chatbot that is **useful, predictable, low-cost, and tenant-scoped**. Botpress today does not optimise for those attributes. It optimises for "best LLM-agent platform on someone else's cloud", which is not the Living Word need.

---

## 7. Option 6 — Rasa (and other framework-only options)

### 7.1 What it is

Rasa is an open-source Python framework for building conversational AI assistants. Two parts: **Rasa NLU** (natural-language understanding — intents, entities, training data) and **Rasa Core** (dialogue management — stories, rules, policies). Production-grade, used by enterprise teams for assistants where intent classification + slot filling + multi-turn dialogue actually matter.

The brief invites this option only "if there is a strong reason". For Living Word's intake — visit / pray / give / talk-to-someone — there is no such reason.

### 7.2 Twelve-dimension assessment

| Dimension | Verdict | Notes |
|---|---|---|
| **Self-host** | YES | Python; Rasa Open Source is Apache-2.0. |
| **Website embed** | YES | REST connector + community web widgets. |
| **Tenant-scoped (CorpFlow)** | WEAK | One model per assistant; multi-tenant needs per-tenant model instances or tenant-aware routing in front of a shared model. |
| **No-AI / deterministic flows** | PARTIAL | Rules engine exists; but NLU pipeline implies training data + retraining loops even for deterministic intents. Significant overhead for "click these four buttons". |
| **Human handoff / notification** | YES via channels. |
| **Cost risks** | LOW token-wise (no per-message billing); HIGH operational (training-data curation + ML infra). |
| **Infrastructure complexity** | **VERY HIGH** | Python ML stack, training data pipelines, periodic retraining, monitoring of model performance, dataset versioning. Mismatch with CorpFlow's "ship a small thing" model. |
| **Licensing concerns** | Apache-2.0 (Rasa Open Source) — clean. Rasa Pro / X is commercial. |
| **Fit for Living Word v0** | **VERY LOW** | Building NLU intents for a four-button church intake is using a cargo ship to ferry one passenger across a pond. |
| **Fit as future CorpFlow Core Capability** | **LOW** | CorpFlow's portfolio direction is managed outcomes + vertical workflows + secure operations; running an internal ML team to keep Rasa models accurate across tenants is the wrong shape. |
| **Recommendation** | **REJECT** | No strong reason for Living Word v0 or near-term CorpFlow adoption. |

### 7.3 What about other frameworks (Botkit, Microsoft Bot Framework, Dialogflow, etc.)?

None evaluated in detail, all rejected on the same grounds:

- **Botkit** — archived / lightly maintained.
- **Microsoft Bot Framework** — Azure-coupled; vendor lock-in conflicts with CorpFlow's tenant-pure / Mauritius-resident posture.
- **Google Dialogflow** — vendor-hosted, per-message billing, GCP coupling, NLU-centric. Same shape concerns as Rasa with added vendor lock-in.

If a future tenant has a **strong** NLU need (free-text customer-support questions where intent classification genuinely matters), a re-evaluation is warranted. Living Word does not.

---

## 8. Side-by-side comparison matrix

Quick scan for cross-option comparison. Cells use S (strong fit), M (medium), W (weak), X (mismatch), or N/A.

| Dimension | 1. CorpFlow-native | 2. Chatwoot | 3. Typebot | 4. Flowise | 5. Botpress | 6. Rasa |
|---|---|---|---|---|---|---|
| Self-host | **S** | S | S | S | M (v12 only) | S |
| Website embed | **S** | S | S | S | S | S |
| Tenant-scoped (CorpFlow) | **S** | M | W | W | W | W |
| No-AI / deterministic | **S** | M | S | X | M (v12) / X (Cloud) | M (overhead) |
| Human handoff | M (v0) → S (v1 with CMP) | **S** | M | W | M | M |
| Cost risks | **S** (lowest) | M | M | **X** (highest LLM risk) | X (Cloud) | M |
| Infra complexity | **S** (lowest) | X (Rails+Redis+workers) | M | M | M | X (ML stack) |
| Licensing concerns | **S** (none) | M (CE/EE drift) | X (AGPL) | M (re-check) | M | S (Apache-2.0) |
| Fit for Living Word v0 | **S** | W | M | X | W | X |
| Fit as Core Capability | **S** | M | M | M (AI tier only) | W | W |
| Recommendation | **USE** | DEFER | DEFER | REJECT | REJECT | REJECT |

The decisive columns are tenant-scoped, cost risks, infra complexity, and licensing. Option 1 wins all four.

---

## 9. Recommendation

### 9.1 Living Word v0 — adopt option 1 (CorpFlow-native text widget)

The required shape from the brief maps exactly to option 1's defaults:

| Brief requirement | Option 1 default |
|---|---|
| Text-only | Default UI; no voice / no media in v0. |
| Structured paths | JSON flow tree with `branch_on_choice` nodes; free-text optional per node. |
| No LLM by default | No `ai_step` nodes in v0. AI tier exists in the schema as a future extension only. |
| Tenant-scoped storage | Native — every row keyed by `tenant_id`, isolated under existing CorpFlow boundary. |
| Script-tag embed | Single `<script async>` with optional `data-flow` attribute; works on WordPress + Elementor. |
| Optional later AI behind tenant budget caps | `chat_ai_budget` table + per-call decrement + degrade-to-deterministic when cap hits zero. |

Option 1 also satisfies the unwritten requirement that the v0 ship without operational drag: it rides on the Vercel + Neon + Communications stack already in production. There is no second host to operate, no Rails / Redis / Sidekiq stack to monitor, no AGPL footprint to legal-review, no LLM bill to cap.

### 9.2 Sequencing — Living Word stream stays tenant-pure

The next packet, when authorised, runs against the **current** CorpFlow tenant model:

1. **T1 closure** (already in flight) — Anton's manual Incognito-no-autofill sign-in flips the T1 DRA to **COMPLETE**. No new artefacts here, just confirmation.
2. **Schema + API + widget** packet — additive Prisma migration (3 tables), 4 API endpoints under `pages/api/chat/`, the widget bundle. Per-tenant flow JSON loaded from `chat_flows`. Tenant id = `living-word-mauritius`.
3. **Living Word flow authoring** — the four-path intake (visit / pray / give / talk-to-someone) authored as a JSON flow seeded for `tenant_id = 'living-word-mauritius'`. The owner reviews and signs off the wording.
4. **Embed on `livingwordmauritius.com`** — operator pastes the `<script>` tag into the WordPress footer (Elementor → Custom Code, or child theme). This step is on the **client side** of the line drawn in `provider-handoff.md`; CorpFlow ships the script tag, the WordPress operator (church staff or third-party provider) embeds it.
5. **GoHighLevel decommission** — once the new widget is live and delivering, remove the GHL script tag from the WordPress footer. No GHL workspace migration needed; the new widget is an additive replacement, not a sync.
6. **Compliance pass** — add the data-flow note to `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`. PII scope: name, email, optional phone, optional message, IP hash, user agent. Storage: CorpFlow Postgres (Neon, US/EU). Mauritius residency is the customer's stated preference; the data-flow note records the cross-border path explicitly so the church can disclose it.

None of these steps depends on the multi-tenant operator credential platform work. The Living Word stream stays tenant-pure throughout.

### 9.3 What we'd revisit later

| Trigger | Action |
|---|---|
| Operator authoring friction (flow JSON edits feel heavy) | Build a minimal visual flow builder on top of option 1 (1–2 packets), or revisit option 3 (Typebot) with a clean AGPL legal posture. |
| A tenant explicitly needs live multi-channel agent inbox | Re-assess option 2 (Chatwoot) as a separate product tier. Likely as a parallel surface, not as a replacement for option 1. |
| A tenant requests genuine free-text AI Q&A and accepts a billed budget cap | Add `ai_step` nodes to option 1's flow schema + plug into the existing Groq client with per-tenant budget enforcement. Re-evaluate option 4 (Flowise) only as an internal authoring tool, not as a runtime. |
| A tenant has a deep NLU intent-classification need with curated training data | Re-assess Rasa for that specific tenant, scoped narrowly. Unlikely in CorpFlow's current portfolio. |

Each of these is a future packet, with its own approval gate. None of them is implied by adopting option 1 today.

### 9.4 Cost shape — option 1, monthly

Indicative for Living Word's expected volume (church website, low hundreds of conversations per month). Reuses existing CorpFlow infrastructure; the marginal cost is tiny.

| Cost line | Option 1 | Today (GoHighLevel) |
|---|---|---|
| Subscription | none (CorpFlow internal infra) | the GHL plan covering this widget |
| Per-conversation marginal cost | ~USD 0.001 (Postgres rows + Vercel function invocations) | included in GHL plan |
| LLM tokens | USD 0 in v0 (no AI nodes); capped per tenant if added later | n/a |
| Outbound email (notifications) | reuses CorpFlow comms; effectively free for low volume | n/a |
| Net monthly cost for Living Word v0 | **<USD 5** at expected volume | the avoided GHL subscription |

The avoided GHL fee is the customer-facing benefit; the operational saving for CorpFlow is approximately the cost of authoring + maintaining the flow JSON, which is bounded.

---

## 10. Out-of-scope and explicit non-goals

This assessment does **not**:

- Implement any code. No new files in `pages/api/chat/`, `prisma/schema.prisma`, or `lib/server/`.
- Mutate any database. No `chat_flows`, `chat_threads`, or `chat_messages` rows; no Prisma migration.
- Touch `livingwordmauritius.com` or `network.livingwordmauritius.com`. No script tag added; no WordPress edit; no DNS.
- Touch GoHighLevel. No workspace login, no widget removal, no API call.
- Touch LuxeMaurice. No comparison embed, no Lux flow.
- Imply or trigger the multi-tenant operator credential platform work. Option 1 is fully shippable on the current single-tenant-credential model.
- Make a vendor or commercial commitment. The recommendation is technical; commercial decisions remain with Anton.
- Replace any existing CorpFlow doctrine doc. The doctrine references in §0 are advisory pointers, not modifications.

---

## 11. References

- `artifacts/quality-audits/2026-06-11-living-word-mauritius/estate-map.md` — the GoHighLevel widget context for Living Word today.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/migration-scope.md` — owner-confirmed direction on chatbot replacement and future FOSS CRM.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/tenant-onboarding-scope.md` — tenant registration moment scope and capabilities table.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/provider-handoff.md` — surface ownership boundary; chatbot widget is on CorpFlow's side, embed is on the WordPress provider's side.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/t1-onboarding-delivery-reality-audit.md` — current execution state and the §6.3b stream-purity boundary.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — production-grade bar.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — managed outcomes vs generic AI wrappers.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — buyer-facing surfaces must be clear and deterministic.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — triggered by any future implementation packet.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — outbound email path option 1 reuses.
- `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` — where the chatbot's PII data-flow note lands when implementation happens.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape for future implementation.
- `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` — referenced only to confirm this stream is decoupled from that platform stream.
