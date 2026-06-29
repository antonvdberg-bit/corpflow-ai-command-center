# CorpFlowAI WhatsApp capability — Tier 1 / Tier 2 / Tier 3 decision

**Date:** 2026-06-29
**Status:** accepted (planning only — no runtime authorization)
**Linked JOURNAL row:** `JE-2026-06-29-1`
**Companion docs:**
- Action plan + Stage gates: `docs/execution/CORPFLOWAI_WHATSAPP_INBOUND_RESPONSE_ENGINE_ACTION_PLAN_V1.md`
- Tier 2 technical design: `docs/product/CORPFLOWAI_WHATSAPP_TIER2_RESPONSE_ENGINE_DESIGN_V1.md`

**Canonical references (do not contradict):**
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — WhatsApp is an **adapter / managed-outcome channel**, not a generic chatbot product.
- `docs/product/CHAT_DESTINATION_REFERENCE_SOCIAL_INTENTS.md` — WhatsApp listed as a future optional adapter channel; CorpFlow inbox stays canonical.
- `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` § 9 — WhatsApp explicitly deferred from the Lead Rescue 30-day window ("different consent / Meta-approval surface").
- `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc` — customer-visible WhatsApp surfaces require live production verification when eventually built.
- `.cursor/rules/security-sensitive-changes.mdc`, `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — any webhook / secret / inbound message handling is security-sensitive.

---

## Context

CorpFlowAI needs a defensible, staged path to WhatsApp capability for clients (starting conceptually with the Living Word Mauritius tenant and AI Lead Rescue prospects) **without** the common failure modes: unofficial WhatsApp Web automation, premature broadcast marketing, secret leakage, or a paid vendor dependency adopted before the basics are proven.

Today the repo only contains **manual / Twilio-sandbox** WhatsApp references (`EXEC_WHATSAPP_NUMBER`, `ADMIN_WHATSAPP_NUMBER`, `WHATSAPP_FROM` in `.env.template`) — none of which are an official WhatsApp Business Platform integration, and none of which Tier 2 will reuse. There is no inbound WhatsApp capture, no tenant routing for WhatsApp, and no operator queue for WhatsApp messages.

We need a decision that (a) lets us start delivering value immediately with zero integration risk, and (b) defines the gated path to a real inbound response engine, while keeping outbound/marketing firmly deferred.

## Decision

CorpFlowAI adopts a **three-tier WhatsApp capability model**. Tier 1 is available now; Tier 2 is authorized only to the **planning/design** stage by this decision; Tier 3 is deferred.

### Tier 1 — Manual WhatsApp entry (available now, no integration)

- WhatsApp **website button** ("Message us on WhatsApp").
- **QR code** (e.g. on print / signage / a page).
- **Prefilled `wa.me` / `https://wa.me/<number>?text=` link** (deep link only — no API).
- **Manual operator response** from the business's own phone / WhatsApp app.
- **No API integration, no webhook, no stored conversation, no automation.**

Tier 1 is pure marketing/contact deep-linking. It is the default and is **not** gated by this decision beyond normal marketing-doctrine review when it appears on a buyer-facing surface.

### Tier 2 — Inbound WhatsApp Response Engine (planning authorized; runtime gated)

- **Official WhatsApp Business Platform / Cloud API or an official BSP only.** No unofficial WhatsApp Web automation, ever.
- **CorpFlowAI test/business number first** — never a client/church number until a separate migration approval (Stage 5).
- **Inbound webhook capture** (verification endpoint + message events).
- **Tenant-aware routing** of inbound messages.
- **Operator review queue** inside CorpFlow (not a third-party shared inbox).
- **Internal alerting** to the existing notification spine.
- **Manual or operator-approved response only.**
- **No marketing broadcasts. No outbound templates** until separately approved (Stage 4).

### Tier 3 — Deferred (no work authorized)

- Campaigns / broadcasts.
- Shared-inbox SaaS.
- Marketing automation.
- Advanced analytics.
- Multi-agent routing.

### Vendor route

- **Approved direction:** official **WhatsApp Business Platform (Cloud API)** hosted by Meta, **or** an **official Meta Business Solution Provider (BSP)**.
- **Forbidden:** unofficial WhatsApp Web automation, browser-puppeteering libraries, or any "free" reverse-engineered WhatsApp client.
- **No paid vendor dependency may be adopted in this planning phase.** Final vendor selection (Cloud API direct vs a specific BSP) is a **Stage 0** output requiring its own approval; this decision does not select or contract a vendor.

## Standing constraints (this planning phase)

The following must **not** happen as a side effect of this decision or the planning PR it authorizes:

1. No live WhatsApp sending or receiving; no webhook wired to a real number.
2. No secrets, tokens, verification codes, Meta app credentials, WhatsApp credentials, or phone-number verification codes requested, exposed, hardcoded, or committed.
3. No unofficial WhatsApp Web automation.
4. No migration of any church/client number.
5. No paid vendor dependency added.
6. No Tier 3 (campaign / inbox SaaS / marketing-automation) work.
7. No new env var **values**; only **names** proposed as placeholders (see the Tier 2 design doc), ratified later by the runtime packet's security review.
8. No DB/Prisma migration; no GHL calls/writes/import; no WordPress/DNS/outbound messaging/public cutover.

## Living Word Mauritius — protections preserved

All protections from PR #482 remain in force and are **not** weakened by this decision:

- Tenant `living-word-mauritius`; current route `/living-word-member-update.html`.
- Admin-gated, non-public, `noindex`, test-bannered.
- Synthetic records only; in-memory persistence only.
- `review_required: true`; `canonical_write: false`.
- Blank-overwrite protection verified; excluded-field rejection verified.
- No DB/Prisma migration; no GHL calls/writes/import; no WordPress/DNS/outbound messaging/public cutover.

Tier 2 will **not** route to, write to, or message any Living Word member or number during planning, and any future Living Word WhatsApp use inherits these gates plus `GATE-PRIVACY` and `GATE-PILOT`.

## Consequences

- **Positive:** clients can use WhatsApp contact (Tier 1) immediately; a credible, auditable path to inbound automation exists without integration risk; outbound/marketing is explicitly fenced off; vendor lock-in is avoided until a deliberate Stage 0 choice.
- **Negative / follow-ups:** Tier 2 still requires a separate, security-reviewed runtime packet per stage; a test number and (eventually) Meta Business verification are operator tasks; 24-hour customer-care window and template-approval rules add real operational discipline before any outbound.

## Links

- Related code paths (future, not created here): `lib/server/whatsapp/*`, an inbound webhook route via the factory/API router, `automation_events` for alerting.
- Pre-existing (unrelated) env names: `EXEC_WHATSAPP_NUMBER`, `ADMIN_WHATSAPP_NUMBER`, `WHATSAPP_FROM` — Twilio-sandbox/manual only; **not** reused by Tier 2.
- Docs created in the same PR: action plan + Stage gates; Tier 2 technical design; this ADR; JOURNAL row; `artifacts/chat_history.md` bullet.
