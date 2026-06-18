# Living Word Mauritius — AI + dynamic scheduling design (v1 architecture)

**Tenant:** `living-word-mauritius`  
**Sandbox host / route:** `https://living-word-mauritius.corpflowai.com/site-preview`  
**Date:** 2026-06-17  
**Mode:** design / architecture / implementation plan only — **no code, no DB, no env, no widget enablement, no external-site changes in this packet.**

This document defines the next-stage architecture for **retrieval-assisted AI** and **dynamic scheduling** on the existing CorpFlow-native chat widget, while preserving tenant isolation, cost control, safeguarding, and human handoff. It builds on verified delivery artifacts and the static schedule shape already in-repo.

**Canonical upstream artifacts (verified baseline):**

| Artifact | What it proves |
|---|---|
| `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-v1-live-verification.md` | Sandbox v1 live on Production; ribbon, host gate, `noindex` |
| `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-chat-widget-live-test.md` | Guided chatbot tested on `/site-preview`; widget restored to `enabled=false` |
| `artifacts/quality-audits/2026-06-11-living-word-mauritius/chatbot-v0-delivery-plan.md` | Widget architecture, flow model, automation event contract |
| `lib/sandbox/living-word-schedule-shape.js` | Proposed `ScheduleEntry` JSDoc shape (placeholder fixtures only today) |

---

## 1. Current verified baseline

| Surface | State today |
|---|---|
| Visual sandbox | **Live** on Production at `https://living-word-mauritius.corpflowai.com/site-preview` (sandbox v1 refinement, merge `82f24868`) |
| Guided chatbot | **Tested successfully** on the sandbox (2026-06-17 controlled window); all 8 starter paths, prayer disclaimer, youth posture, Business Network neutrality verified |
| Widget kill switch | **`chat_widget_configs.enabled = false`** — loader serves no-op disabled stub |
| AI / LLM | **Not enabled** — no `groq-client` import in `lib/server/chat-widget/`; `ai_budget_monthly_usd = 0` |
| Dynamic schedule | **Not connected** — `lib/sandbox/living-word-schedule-shape.js` is a static module; all 5 entries are `approved: false`, `source: 'placeholder'` |
| External WordPress | **Untouched** — no embed on `livingwordmauritius.com` / `network.livingwordmauritius.com`; GHL unchanged |
| Notifications | `chat_widget.lead.submitted` → `automation_events` (working; sandbox test event `cmqhytjco00dele04ifq33krd`) |
| Tenant isolation | Host → `tenant_id` via `tenant_hostnames`; all chat widget queries filter by `tenant_id` (verified: zero cross-tenant threads in sandbox test) |

**What exists in schema today (relevant placeholders):**

- `chat_widget_configs.ai_budget_monthly_usd`, `ai_budget_spent_usd`, `ai_budget_month_yyyymm` — reserved, unused in v0
- No `ai_enabled` column yet — **recommended** as a separate flag from `enabled` (guided widget) in a future migration packet
- No schedule table yet — shape is JSDoc-only in `living-word-schedule-shape.js`

---

## 2. Definition of done for AI v1

AI v1 is **operationally complete** when all of the following hold on the **CorpFlow sandbox** (`living-word-mauritius.corpflowai.com`), with church-owner sign-off on knowledge content, and **before** any external WordPress embed:

| # | Criterion | Acceptance test |
|---|---|---|
| 1 | AI answers **only** from approved Living Word knowledge atoms | Every AI response cites ≥1 `knowledge_atom_id` from tenant-scoped retrieval; no atom → refusal or menu fallback |
| 2 | AI refuses or safely routes sensitive topics | Emergency, counselling/crisis, prayer detail, youth/children PII, medical/legal/financial, business endorsement — see §7 |
| 3 | AI never invents facts | No hallucinated service times, addresses, phones, event dates, staff names, ministry details, or Business Network claims |
| 4 | Uncertainty → guided menu fallback | Low retrieval confidence or policy hit → show fixed refusal copy + offer the 8-option menu (existing flow) |
| 5 | AI usage logged by `tenant_id` | Every model call writes `chat_widget_ai_usage` (or equivalent) row: tenant, thread, tokens, cost estimate, atom ids, outcome |
| 6 | Strict per-tenant and per-session limits | Monthly USD cap + per-thread message cap + existing IP rate limit; breach → AI off for session/tenant |
| 7 | AI independently disableable | `ai_enabled=false` (or `ai_budget_monthly_usd=0`) disables AI path while guided flow may remain on |
| 8 | Sandbox-only live verification recorded | Artifact mirrors `visual-sandbox-chat-widget-live-test.md` pattern; widget/AI disabled after test unless explicitly authorised |

**Explicit non-goals for AI v1:** open-ended chat without retrieval; training on visitor messages; scraping the live WordPress site at answer time; pastor-facing auto-send without review queue (defer to v2 optional mode).

---

## 3. AI capability model

Four modes compared for Living Word:

| Mode | Description | Pros | Cons | Risk |
|---|---|---|---|---|
| **A. Guided flow only** | Current v0 — deterministic menu / collect / submit | Zero hallucination; lowest cost; safeguarding copy is fixed | Cannot answer free-text "when is service?" | Low |
| **B. Retrieval-assisted AI** | User may type a question; system retrieves approved knowledge atoms; LLM composes answer **only** from retrieved snippets + system policy | Handles natural language within approved corpus; auditable sources | Requires curated knowledge + confidence thresholds | Medium (mitigated by retrieval-only) |
| **C. AI answer preview (operator approval)** | Mode B generates draft; operator approves before visitor sees it | Highest safety for early pilots | Not real-time; poor UX for public widget | Low operational, high friction |
| **D. Fully automated AI within guardrails** | Mode B with automatic send when confidence ≥ threshold and policy clean | Best UX when corpus is mature | Highest hallucination / tone / outdated-data risk | High until corpus proven |

### Recommendation — safest first implementation

**Ship Mode B (retrieval-assisted AI) on the sandbox only**, with:

- **Hard retrieval-only prompt** — model instructed it may use only provided snippets; empty retrieval → refusal template
- **Confidence gate** — if top atom score below threshold, skip LLM entirely → guided menu
- **Policy pre-classifier** (rules-first, optional small model later) — sensitive intents never reach retrieval/LLM
- **Separate `ai_enabled` flag** — guided widget can be on while AI is off
- **Mode C as an optional operator tool** on `/site-preview` or `/change` for pastor copy review — **not** in the visitor hot path for v1

Defer **Mode D** until ≥30 days of sandbox telemetry with zero safeguarding violations and owner sign-off on knowledge corpus.

---

## 4. Knowledge-source model

Knowledge is stored as **versioned, tenant-scoped atoms** (future table `chat_widget_knowledge_atoms` or JSONB bundle with approval metadata — implementation packet decides). Each atom maps to one or more chatbot paths.

| Category | Source of truth | Owner | Update frequency | AI may answer directly? | Must route to human? | Confidence requirement |
|---|---|---|---|---|---|---|
| **Approved static church information** | Pastor-approved content packet (derived from public site + owner sign-off) | Church lead / pastor | Quarterly or on change | Yes — high-confidence atoms only | No — unless user asks pastoral opinion | ≥0.85 retrieval score |
| **Service information** | Approved schedule entries (`category: service`) + static service summary atom | Church admin + CorpFlow operator | Weekly minimum review | Yes — **only** if `approved=true` and not expired | If schedule empty/stale → "check website" + menu | ≥0.90 for times |
| **Events and scheduling** | Approved `ScheduleEntry` rows (`category: event|special`) | Church admin | Weekly during active seasons | Yes — list only approved upcoming occurrences | Registration/commitment questions → guided contact path | ≥0.90; must include `last_reviewed_at` |
| **WordGroups** | Approved atoms + optional schedule rows (`category: wordgroup`) | WordGroups coordinator | Monthly | General info yes; specific group assignment no | Join / match-me → contact collect path | ≥0.85 general; routing for specifics |
| **Volunteer / serve** | Guided flow copy + short approved role summary atoms | Volunteer coordinator | Quarterly | Role overview yes | Sign-up / background checks → volunteer submit path | ≥0.85 |
| **Youth / Children** | Approved programme summary atoms (age bands only) | Youth pastor | Quarterly | Programme existence and age bands yes | **Never** collect child names/PII via AI; always → youth guided path | ≥0.90; AI must not paraphrase into child-data prompts |
| **Business Network** | Approved neutral description atom + link to network site | Church admin | Quarterly | What it is yes | Introductions, endorsements, vetting → contact path | ≥0.85; **no endorsement language** |
| **Contact and handoff** | Approved contact atom (public phone/email/address — owner signed) | Church admin | On change | Repeat public contact facts yes | Personal staff availability → contact path | Exact match to atom text for phone/address |
| **Pastoral / safeguarding escalation** | Fixed template atoms (non-LLM strings) | CorpFlow + church safeguarding lead | Static unless policy changes | **No LLM composition** — serve verbatim | Always for crisis/emergency | N/A — rule-triggered templates |

**Ingestion discipline (future packets):**

- No atom goes live without `approved_by`, `approved_at`, `source`, and `expires_at` (where time-sensitive)
- Public website may inform drafting but **does not** auto-sync into AI corpus without owner approval packet
- Atoms carry `chatbot_answer_eligible: boolean` per §6

---

## 5. Dynamic scheduling model

How the chatbot accesses current schedule data:

| Approach | Description | Pros | Cons | Fit for LWM |
|---|---|---|---|---|
| **Static JSON/config** | Manually edited file or `chat_widget_configs` JSON blob | Simple; no migration | No expiry; no operator UI; drift | v0 placeholder only — **insufficient for AI** |
| **DB-backed schedule table** | `schedule_entries` per tenant, Prisma-backed | Tenant-scoped queries; approval flags; expiry; auditable | Requires migration + editor | **Recommended v1** |
| **Website scrape/import** | Pull from `livingwordmauritius.com` events | Always fresh on paper | Fragile; copyright; no approval gate; breaks sandbox isolation | **No-go for v1** |
| **Calendar feed (iCal/Google)** | Subscribe to church calendar URL | Real-time | Feed quality varies; timezone; approval still needed | **Recommended v2** after manual v1 proves shape |
| **Admin/operator schedule editor** | CMP or lightweight `/change` panel for LWM operator | Owner-visible; review workflow | Build cost | **v1.1** alongside DB table |
| **Hybrid** | DB canonical + optional calendar import → staging → approval | Best long-term | Complexity | **Target v2 architecture** |

### Recommendation

| Phase | Path |
|---|---|
| **v1** | **DB-backed `schedule_entries`** seeded from pastor-approved CSV/JSON (manual packet); sandbox + chatbot read via tenant-scoped server function; only `approved=true` and `expires_at > now()` rows eligible for AI or bot info nodes |
| **v1.1** | Operator schedule editor (factory or tenant-scoped) with approval workflow |
| **v2** | Calendar feed importer writes to **staging** rows; operator approves before `approved=true`; optional sync job off-laptop |

Until v1 schedule data exists, the guided flow **continues** to use neutral routing copy ("check the website") — **do not** wire AI to answer schedule questions.

---

## 6. Proposed schedule data shape

Extends `lib/sandbox/living-word-schedule-shape.js` `ScheduleEntry` for DB persistence and AI eligibility.

### Core fields (existing + additions)

| Field | Type | Purpose |
|---|---|---|
| `id` | string (cuid) | Stable key |
| `tenantId` | string | Tenant isolation |
| `category` | `service` \| `event` \| `youth` \| `wordgroup` \| `special` | Routing + UI grouping |
| `title` | string | Display + retrieval |
| `description` | string? | Short public-safe blurb |
| `startsAt` | ISO datetime? | One-off / next occurrence anchor |
| `endsAt` | ISO datetime? | Duration end |
| `recurrence` | `once` \| `weekly` \| `monthly` \| `custom` | Recurrence rule |
| `weeklyDayOfWeek` | 0–6? | Weekly pattern |
| `weeklyTime` | string? | e.g. `09:30` (timezone documented separately) |
| `location` | `{ name, mapUrl? }` | Venue |
| `ageBand` | `all` \| `children` \| `youth` \| `adults` | Audience filter |
| `visibility` | `public` \| `unlisted` \| `private` | Chatbot may only use `public` + `unlisted` if approved |
| `registration` | `{ required, url?, deadline? }` | Event signup — AI links only, never implies booking |
| `contact` | `{ role, email?, phone? }` | Internal routing — **not** for AI direct answer unless approved contact atom exists |
| `approved` | boolean | **Must be true** for chatbot/AI use |
| `approvedBy` | string? | Owner or operator id |
| `approvedAt` | ISO datetime? | Audit |
| `source` | `church-input` \| `chatbot-followup` \| `imported` \| `placeholder` | Provenance |
| `lastReviewedAt` | ISO datetime? | **New** — stale if > review SLA |
| `expiresAt` | ISO datetime? | **New** — auto-ineligible after date |
| `chatbotAnswerEligible` | boolean | **New** — explicit opt-in per row |
| `notes` | string? | Operator-only |
| `createdAt` / `updatedAt` | ISO datetime | Audit |

### Query helpers (server-side, future)

- `getUpcomingForTenant(tenantId, { category?, from?, limit? })` — only `approved && chatbotAnswerEligible && (expiresAt null || expiresAt > now())`
- `getNextOccurrence(entry)` — expand recurrence in **church timezone** (Mauritius: `Indian/Mauritius`) — implementation packet must fix TZ once

### v0 → v1 migration note

Existing `PLACEHOLDER_SCHEDULE` entries remain `approved: false`; sandbox UI continues to label them as fixtures until pastor approval packet lands.

---

## 7. Safety and refusal rules

Rules are evaluated **before** retrieval and **before** any LLM call. Hits serve **fixed template text** (no model paraphrase for high-risk classes).

| Trigger | Detection (v1) | Response | Logged |
|---|---|---|---|
| **Emergency / immediate danger** | Keywords: suicide, kill myself, abused now, someone hurt, emergency, ambulance, police now | Verbatim: not a crisis service; call local emergency services (Mauritius: 999 / 114); offer prayer menu if appropriate | `ai.refusal.emergency` |
| **Counselling / crisis** | Grief, depression, marriage crisis, addiction help | Route to prayer path disclaimer + human follow-up; no AI counselling | `ai.refusal.counselling` |
| **Prayer requests** | User shares prayer need in free text | Do not store in AI log beyond thread; route to **prayer guided path** | `ai.route.prayer` |
| **Youth / children** | Child name, school, age of specific child, photos | Refuse collection; parent/guardian contact via youth path only | `ai.refusal.youth_pii` |
| **Medical / legal / financial advice** | Diagnosis, lawsuit, investment, tax | Refuse; suggest qualified professional + contact church | `ai.refusal.professional_advice` |
| **Business endorsement** | "Is X business good?", "recommend a plumber" | Neutral: network is not endorsed; offer introduction request path | `ai.refusal.endorsement` |
| **Unclear or outdated information** | Low retrieval score; `expiresAt` passed; `lastReviewedAt` stale | "I'm not sure — here are the menu options" + show menu | `ai.refusal.low_confidence` |
| **Private / internal church data** | Staff salaries, member lists, discipline, finances | Refuse; contact church directly | `ai.refusal.internal` |
| **Not in approved sources** | Empty retrieval set | Refuse + menu fallback; never guess | `ai.refusal.no_source` |

**LLM system prompt constraints (when Mode B runs):**

- Use only provided `CONTEXT` blocks
- Max 120 words
- No new facts, names, times, or phone numbers not in context
- If context insufficient, output exactly `ROUTE:MENU`

---

## 8. Cost-control model

Builds on existing `chat_widget_configs` budget columns + new per-session counters.

| Control | Recommended v1 default (LWM sandbox) | Enforcement |
|---|---|---|
| **Per-tenant monthly budget** | `ai_budget_monthly_usd = 5.00` (sandbox pilot); `0` = AI off | Increment `ai_budget_spent_usd` per call; at cap set `ai_enabled=false` + alert |
| **Per-session message cap** | 6 AI turns per `thread_id` | After cap → guided menu only |
| **Per-user cooldown** | Existing `rate_limit_per_window=30` / 300s per IP hash | Keep; add AI-specific stricter cap: 10 AI calls / IP / hour |
| **Maximum answer length** | 120 words / 500 tokens output | Truncate server-side; widget displays full text |
| **Model / provider options** | **Groq** via existing `lib/server/groq-client.js` pattern; model `llama-3.3-70b-versatile` or smaller for classify-only subcalls | Provider key in Vercel env only; never client-side |
| **Logging required** | Every call: tenant, thread, model, input tokens, output tokens, USD estimate, atom ids, refusal reason | `chat_widget_ai_usage` table or `telemetry_events` |
| **Automatic disable threshold** | 100% monthly budget → `ai_enabled=false` until operator reset | Idempotent automation event `chat_widget.ai.budget_exhausted` |
| **Operator warning threshold** | 80% monthly budget | Telegram or automation event; no visitor impact |

**Defence in depth:** if `ai_budget_monthly_usd === 0`, handler must not call provider (already specified in `chatbot-v0-delivery-plan.md` §2.7).

---

## 9. Tenant isolation and audit model

| Requirement | Implementation |
|---|---|
| All AI requests carry `tenant_id` | From `req.corpflowContext` — same as guided widget; reject if missing |
| Knowledge retrieval tenant-scoped | `WHERE tenant_id = $1 AND approved = true` on every atom/schedule query |
| Schedule retrieval tenant-scoped | Same; no shared corpus across tenants |
| No cross-tenant answer material | Retrieval results tagged with `tenant_id`; assert match before prompt build |
| Log AI usage + source references | Usage row + atom ids in `evidence_json` |
| Log escalations / refusals | `telemetry_events` or `automation_events` with `chat_widget.ai.refusal.v1` schema |
| Retain audit without excess PII | Store hashes/excerpts only; full prayer/youth text stays on `chat_widget_messages` with retention policy; AI logs exclude prayer body |

**Audit retention:** align with `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` when AI goes live; subprocessors list must include Groq (or chosen provider) before production AI enablement.

---

## 10. Human handoff model

Decision tree for each visitor turn (when AI is enabled):

```
User message
  → Policy classifier (§7)
      → EMERGENCY / COUNSELLING / YOUTH_PII / ENDORSEMENT → fixed template + optional menu
  → Retrieval (tenant-scoped, approved atoms + schedule)
      → score < threshold → "not sure" + guided menu
  → LLM compose (retrieval-only)
      → ROUTE:MENU in output → show menu
      → else → show answer + source label ("Based on church information")
```

| Situation | Action |
|---|---|
| Factual answer in approved corpus | Answer directly + cite source category |
| Public info with canonical URL | Answer + show approved link (e.g. livingwordmauritius.com — **link only**, no scrape) |
| Ambiguous intent | One clarifying question (counts toward session cap) OR menu |
| Low confidence | Route to guided menu |
| Lead-worthy intent (volunteer, prayer, contact, network intro) | Offer relevant guided path button |
| Submit path completed | `automation_events` `chat_widget.lead.submitted` (existing) |
| Future ticket/task | v2: `cmp_tickets` stub row — **out of scope v1** |
| Emergency | Advise immediate local emergency services — **no collection** |

---

## 11. Business-process roadmap

Staged process support on top of guided flow (unchanged v0 paths) + future AI routing.

| Process | Data collected (v1) | Owner | Notification | Approval required | Safeguarding |
|---|---|---|---|---|---|
| **Prayer request** | Adult name, email (opt), message | Pastoral team | `automation_events` → n8n consumer (future) | Pastor aware of disclaimer copy | Not crisis service; emergency template |
| **Volunteer interest** | Name, email, serve area message | Volunteer coordinator | automation event | Coordinator follow-up | Adults only |
| **WordGroup enquiry** | Via contact path or AI → contact | WordGroups lead | automation event | Coordinator assigns group | No home addresses in chatbot v1 |
| **Event enquiry** | Name, email, event interest | Church admin | automation event | Manual reply | Schedule atoms must be approved |
| **Business Network introduction** | Name, email, short intent | Church admin | automation event | **No auto-intro**; human discretion | No endorsement claims |
| **Contact / admin follow-up** | Name, email, message | Church office | automation event | Standard | PII minimal |
| **Future internal ticket** | Thread id + type + snapshot | CorpFlow operator | CMP ticket (v2) | Operator | Audit trail |

AI v1 **does not** replace these submit paths — it may **route into** them.

---

## 12. Implementation packets

Safe sequence with estimated durations (operator + Cursor, excluding owner wait time):

| # | Packet | Scope | Duration | Gates |
|---|---|---|---|---|
| 1 | **AI design approval** | Review this document; Anton + church lead acknowledge safeguarding model | 0.5 day | Anton |
| 2 | **Knowledge-base seed / approved content** | Pastor-approved atoms JSON; seed script; no LLM | 2–3 days | **Church owner** sign-off on every atom |
| 3 | **Schedule-source v1** | Migration `schedule_entries`; seed approved rows; server read API internal | 2–3 days | Anton + owner approval of initial rows |
| 4 | **AI provider + cost-control** | `ai_enabled` column; usage logging; budget enforcement; Groq wiring behind flag | 3–4 days | Anton (env `GROQ_API_KEY`, budget caps) |
| 5 | **AI sandbox-only test** | Enable AI on sandbox only; refusal + retrieval tests; artifact | 1–2 days | Anton controlled window |
| 6 | **Guided fallback integration** | Widget UX: free-text → AI or menu; `ROUTE:MENU` handling | 2–3 days | CI + sandbox smoke |
| 7 | **Owner review packet** | Pastor tests sandbox; copy + knowledge approval | 1–2 days owner time | **Church owner** |
| 8 | **External-site rollout** | WordPress embed; origin allow-list; GHL coexistence per handoff tracker | Separate stream | Owner + **provider** |

**Total engineering (packets 2–6):** ~10–15 days elapsed with review gates, not continuous coding.

**Explicit deferrals:** calendar feed import (v2), CMP tickets from chat (v2), operator schedule UI (v1.1), external embed (packet 8), Mode D full automation.

---

## 13. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Hallucination** | Medium if LLM unguarded | High — wrong service time | Retrieval-only; confidence gate; `ROUTE:MENU`; zero budget = no AI |
| **Outdated schedule** | Medium | High — visitor travels wrong day | `expiresAt`, `lastReviewedAt`, weekly review SLA; stale → refuse |
| **Wrong pastoral tone** | Medium | Medium — trust damage | Fixed templates for sensitive; short answers; owner review packet |
| **Sensitive youth data** | Low if guided path used | High — safeguarding | AI never prompts child PII; rules block; audit |
| **Business endorsement** | Medium | Medium — liability | Neutral atoms; refusal templates; human intro only |
| **Unexpected AI cost** | Medium | Medium — budget | Monthly cap; auto-disable; 80% warning; per-session cap |
| **Tenant leakage** | Low | Critical | Mandatory `tenant_id` on all queries; integration tests |
| **Owner/provider confusion** | Medium | Medium — premature embed | Sandbox ribbon; separate external embed packet; handoff tracker |
| **External WordPress constraints** | Unknown | Medium — CSP/block | Provider questionnaire already sent; test apex-only first |

---

## 14. Recommendation

### Build first (in order)

1. **Schedule-source v1 (DB + approved seed)** — unblocks truthful "when is service?" without scrape
2. **Knowledge-base seed packet** — pastor-approved atoms mirroring public facts already on sandbox
3. **AI provider + cost-control infrastructure** — `ai_enabled`, logging, budget, no visitor-facing UI yet
4. **Retrieval-assisted Mode B on sandbox only** — packet 5 test + artifact
5. **Guided fallback UX** — free-text box routes through policy + retrieval + menu

### Defer

- Calendar feed sync (v2)
- Fully automated Mode D
- AI-composed prayer responses
- External WordPress embed (until owner + provider replies per `chatbot-v0-handoff-response-tracker.md`)
- CMP ticket creation from chat threads

### Requires Anton approval

- Any `GROQ_API_KEY` / provider env on Production
- Any migration (`schedule_entries`, `chat_widget_knowledge_atoms`, `ai_enabled`, usage logs)
- Any sandbox window with `ai_enabled=true`
- Monthly budget amount for LWM pilot

### Requires church-owner approval

- Every knowledge atom and schedule row with `approved=true`
- AI tone/samples on sandbox before wider enablement
- Any factual claim the AI may state (service time, address, phone, ministries)
- External embed go-live (separate from AI)

### Requires provider involvement

- External-site script + CSP (existing handoff stream)
- Not required for sandbox AI/schedule work

### Next single packet to open

**`Living Word schedule-source v1 — DB + approved seed (sandbox only)`** — smallest dependency before AI can answer time/date questions safely.

---

## Verification (this packet)

| Check | Result |
|---|---|
| Design artifact exists | `artifacts/quality-audits/2026-06-11-living-word-mauritius/ai-dynamic-scheduling-design.md` |
| No code changed | ✓ (this packet is docs-only) |
| No DB changed | ✓ |
| No env vars changed | ✓ |
| Widget remains `enabled=false` | ✓ (no operational change) |
| External sites untouched | ✓ |
| Sandbox route unchanged | ✓ |
| References current verified artifacts | ✓ (§1 table) |

**Delivery verdict:** **COMPLETE** for design / architecture / implementation plan scope. Operational AI or schedule delivery requires separate approved implementation packets.
