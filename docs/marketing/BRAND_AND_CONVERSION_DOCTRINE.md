# CorpFlowAI Brand and Conversion Doctrine

**Status:** Mandatory operating doctrine.  
**Applies to:** CorpFlowAI, AI Lead Rescue, productized services, marketing pages, landing pages, intake pages, sales pages, public demos, and buyer-facing copy.  
**Audience:** AI agents, developers, designers, marketers, contractors, and operators.

## Companion execution standards

This doctrine governs **the offer** — how CorpFlowAI's products are positioned, priced, and routed. The companion documents in `docs/marketing/` govern **how the offer is communicated** across every prospect-facing and client-facing surface. Read both before producing external-facing work:

- **`docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`** — Hook / Proof / Depth doctrine, dual-asset pattern, aesthetic standard, copy standard, decision-stage rules, final test.
- **`docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`** — required output header + channel-specific content structure for every external-facing agent response, plus the Agent quality-gate self-check.
- **`docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md`** — attention / validation asset pairing, video and visual rules, scannability rules, proof density by funnel stage, content reuse model.
- **`docs/marketing/03_CONTENT_ATOM_SCHEMA.md`** — reusable structured units of marketing/sales truth for AI retrieval.
- **`docs/marketing/04_DELIVERY_QUALITY_GATE.md`** — preflight checklist + 12/14 scoring model + mandatory handoff format.
- **`docs/marketing/05_AGENT_COMPULSION_MECHANISM.md`** — four-layer enforcement (source-of-truth, prompt preamble, PR checklist, automated check at `scripts/check-marketing-quality-gate.mjs`).

The auto-applied rule **`.cursor/rules/brand-conversion-doctrine.mdc`** treats this doctrine and the six companion standards as a single canonical set. Future decisions may supersede individual sections; they may not silently contradict the set.

## Non-negotiable rule

CorpFlowAI marketing work must optimize for the buyer action first and visual polish second.

A page is not done because it looks good. A page is done only when the intended buyer understands the offer, trusts the path, and knows exactly what to do next.

**Effectiveness beats decoration. Clarity beats cleverness. Conversion beats completeness.**

## Strategic guardrail — Above-the-Line Doctrine

Marketing positioning must be consistent with the **`docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`** strategic evaluation doctrine. That doctrine is mandatory; this section names the marketing implications.

- **Marketing must not position CorpFlowAI as a generic AI wrapper / chatbot / agent company.** Generic AI chatbots, generic AI agents, generic content generators, generic prompt-to-app wrappers, generic dashboard builders, and generic workflow glue are commoditised by major platforms; CorpFlowAI does not compete in that layer.
- **AI Lead Rescue is a wedge into managed lead / growth operations** — not the full company, not "our AI agent." Buyer-facing copy must frame Lead Rescue as a managed lead-response operating workflow with human review and accountability, not as a generic chatbot, generic lead form, generic CRM board, or generic automation demo.
- **Buyer-facing claims must emphasise managed outcomes, accountability, workflow depth, and trust** — not novelty of AI. Allowed-claims rules in § *Copy rules* still apply.
- **The chatbot, where present, is positioned as a narrow concierge and routing aid only** — not as the strategic moat.
- **Marketing surfaces that drift below the line** (e.g. lead with "AI agent for your business," promise generic AI-powered everything, sell a generic dashboard, or use generic-tool framing as the headline value) are **PARTIAL**, not complete, even when the page looks attractive.

A marketing surface passes this guardrail when the intended buyer can see a managed outcome they want, understand who is accountable for delivering it, and recognise that CorpFlowAI's value is the running function — not a generic AI tool reskinned.

## Definition of done

A marketing or intake surface is complete only when all of these are true:

1. One primary conversion goal is obvious.
2. The buyer can understand the offer within five seconds.
3. The primary CTA describes the buyer action, not an internal process.
4. Route, payment, and operational complexity appear only after buyer intent is established.
5. The page explains the outcome, what happens next, who it is for, and why it is credible.
6. The page handles core objections without hype or defensiveness.
7. The page avoids unsupported revenue guarantees and exaggerated AI claims.
8. Mobile scanning is clean and action-oriented.
9. Any buyer-facing copy, CTA, pricing, intake, or route-selection change is checked against this doctrine before merge.

If these are not true, the work is **PARTIAL**, even when tests pass and the page looks attractive.

## Brand position

CorpFlowAI builds practical operating systems for businesses that need work captured, routed, followed up, and made visible.

Core promise:

**Make business work visible, trackable, and easier to act on.**

Plain-language promise:

**We help businesses stop losing work between messages, forms, people, and follow-ups.**

The brand should feel practical, calm, capable, modern, trustworthy, systems-minded, human-operated where needed, and outcome-driven.

The brand should not feel gimmicky, crypto-like, overly futuristic, like a generic AI agency, SaaS-bro, over-automated, over-designed, cold, or intimidating.

## Tone of voice

Sound like a sharp operations partner, not a hype-driven AI vendor.

Use short sentences, concrete outcomes, operational language, calm confidence, realistic scope, and defensible claims.

Avoid: revolutionary, game-changing, 10x your business, fully autonomous, guaranteed revenue, replace your team, AI-powered everything.

Preferred words: capture, alert, log, route, follow up, review, summary, visibility, workflow, owner/operator, simple board, daily view, 48-hour setup, pilot, monitoring.

## Conversion philosophy

Every page needs one job.

Preferred order:

1. Problem
2. Outcome
3. Offer
4. How it works
5. Who it is for
6. Trust/reassurance
7. Price or starting point
8. Primary CTA

## CTA rules

Primary CTAs must describe the buyer's desired action.

Use:

- Start my 48-hour setup
- Request pilot setup
- Start intake
- Book a setup call
- See how it works
- Get my lead rescue setup

Avoid:

- Choose payment path
- Submit form
- Learn more
- Click here
- Begin workflow
- Continue routing

If a page requires routes such as Mauritius vs International, do not make the route the first conversion decision. Buyer intent comes first; routing and payment come later.

Correct flow:

1. Buyer decides they want the outcome.
2. Buyer clicks the primary CTA.
3. Buyer selects region/path inside intake or a later route selector.
4. Payment or invoice route appears after intake review or after region selection.

## Visual direction

CorpFlowAI should look like a premium operations command center, not a generic AI startup page.

Use clean dark or deep-neutral bases, crisp light content surfaces, subtle gradients, strong typography, clear spacing, high-contrast CTAs, minimal animation, interface-like cards, and system diagrams where useful.

Use references from control rooms, operating dashboards, workflow boards, clean enterprise software, logistics systems, and professional service delivery.

Avoid robots, brain icons, neon AI swirls, abstract cyberspace art, random 3D shapes, overused chat bubbles, and stock handshake imagery.

Design keywords: focused, premium, structured, operational, calm, precise, high-trust, minimal, action-oriented.

## Color direction

Use a restrained color system with one strong action color.

Suggested values:

| Role | Value | Use |
|---|---:|---|
| Deep navy / ink | `#07111F` | Primary dark background |
| Midnight blue | `#0B1728` | Section background |
| Slate | `#1E293B` | Cards, borders, secondary surfaces |
| Soft off-white | `#F8FAFC` | Light backgrounds, text on dark |
| Muted gray | `#94A3B8` | Secondary text |
| Signal blue | `#2563EB` | Primary CTA |
| Electric cyan | `#22D3EE` | Highlights and system signals |
| Success green | `#22C55E` | Confirmation/status only |
| Warning amber | `#F59E0B` | Urgency/status only |

> **Superseded 2026-05-29 (Anton, Operator Bridge `#249`):** the canonical CorpFlowAI accent / primary CTA is **teal `#2dd4bf`**, ratifying the colour already shipping on `corpflowai.com`, `corpflowai.com/lead-rescue`, and `aileadrescue.corpflowai.com`. The signal-blue value above is retained for historical context; it was never implemented in the runtime. The full canonical v1 palette (named tokens for background, text, accent, status pairs, etc.) and its scope (apex CorpFlowAI surfaces; tenant brands such as Lux, Concierge, France remain separate by design; `/change` operator surface remains slate / sky-400 by design) lives in **`docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`**.

Primary CTAs must stand out immediately. Do not overuse accent colors.

## Typography direction

Use modern, legible, professional typography.

Recommended fonts: Inter, Geist, Manrope, IBM Plex Sans, DM Sans.

> **Status note 2026-05-29:** `Inter` is the chosen face for CorpFlowAI v1 and is declared in inline `font-family` strings on every apex public component, but **Inter has never been loaded** (no `next/font`, `<link rel="preload">`, `@font-face`, or Google Fonts CDN reference in the runtime). Effective body type today falls through to the OS system sans (`ui-sans-serif` / `system-ui`). Self-hosting Inter Variable is queued as `LR-Brand-Identity-2 step 2` per `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` § 6 Phase B, and will be approved and shipped as its own gated runtime PR.

H1s must be outcome-led, not feature-led.

Good H1 examples:

- Stop losing leads because follow-up is too slow.
- Make every new enquiry visible.
- Capture, route, and follow up business work without another heavy CRM.

Weak H1 examples:

- AI workflows for the future of business.
- Unlock your operational potential.
- The all-in-one AI platform for everything.

## Productized service page template

Use this structure for AI Lead Rescue and future offers:

1. Hero
2. Offer block
3. Who this is for
4. What happens in the setup period
5. Region/path selector, if needed
6. Not another CRM / not another heavy system reassurance
7. Payment and trust details
8. Final CTA
9. Disclaimer/footer

## Copy rules

Write for busy owners. Assume the buyer is distracted, skeptical, and short on time.

Use one idea per sentence, clear nouns and verbs, specific outputs, and low-friction action.

Avoid dense paragraphs, abstract transformation language, overuse of AI, long feature lists, and internal terminology.

Allowed claims:

- Designed to reduce missed enquiries
- Helps make follow-up visible
- Built for faster response
- Simple 48-hour setup

Avoid claims:

- Guaranteed more sales
- Never miss a lead again, unless carefully qualified
- Fully automated revenue machine
- Replaces your sales team

Preferred trust line:

**We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.**

## AI Lead Rescue doctrine

Primary conversion goal: get the visitor to start intake for a 48-hour pilot setup.

Best hero CTA: **Start my 48-hour setup**

Best secondary CTA: **See how it works**

Best hero message: **Stop losing leads because follow-up is too slow.**

Supporting copy:

**AI Lead Rescue captures new enquiries, alerts the owner/operator, logs every lead in a simple follow-up board, and sends a daily summary - without rebuilding your website or forcing you into a CRM.**

Required payment trust copy:

**Payment is handled after intake review. You do not enter card or banking details on this page. We send a USD invoice through the agreed route after we confirm scope.**

Required no-guarantee copy:

**We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.**

Single offer rule:

The public landing page advertises **one** offer: **AI Lead Rescue Setup — USD 150 launch pilot**. Currency, invoice route, and payment provider are **operator decisions** made after intake review and communicated to the buyer on the invoice — not buyer decisions on the landing page.

The page must not ask the buyer to pick a region, currency, or payment route before submitting intake. Mauritius, EUR, GBP, or any other operator-side currency arrangements are recorded on the Commercial card on `/admin/lead-rescue/[id]` after qualification — they do not appear in the public-facing offer.

Do not use **Choose payment path**, **Choose your region**, **Start intake — Mauritius**, **Start intake — International**, or any equivalent route-as-CTA wording.

Preferred global CTA:

- Start my 48-hour setup

### AI Lead Rescue assistant on the page (chatbot)

Activated under packet `AI-Lead-Rescue-Chatbot-V1-Build-1` (see `JE-2026-06-05-10`).
Canonical research + design: `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md`.

Posture (locked at audit time, enforced in code by the six-layer guardrail floor in `lib/server/lead-rescue-bot/`):

- The on-page assistant is a **pre-sale qualifier**. It is not a customer-support agent, not a payment system, not a CRM, and not a general-purpose AI. It does not contradict the `O7` SUPPORT hold in `docs/operations/SUPPORT_SYSTEM_FEASIBILITY_V1.md` (no automated reply, no AI-deflection claim).
- It may ONLY discuss the single AI Lead Rescue offer (USD 150 launch pilot) and what we need from the visitor to start intake. It may not discuss other CorpFlow products, internal architecture, tenant names, ERPNext, CMP, JOURNAL, or factory operations.
- It has exactly two tools, both client-side:
  1. `scroll_to_intake()` — moves the page to the intake form.
  2. `prefill_intake_form({ ... })` — populates the existing intake form fields. **NEVER submits the form.** The visitor still clicks **Request AI Lead Rescue setup** themselves.
- It must never offer or imply: revenue / lead-volume / conversion guarantees, discounts, free trials, scope changes, banking instructions (cards, IBAN, SWIFT, MCB account, Stripe links), 24/7 AI support, AI replacement of a human team, hype vocabulary (revolutionary, game-changing, 10x, fully autonomous, AI-powered everything).
- If a visitor pastes banking-class data into the chat, the input is replaced with `[REDACTED]` before any LLM call. The bot returns a canonical refusal and offers the intake form. No banking data is ever sent to OpenAI or persisted in CorpFlow.
- Two kill-switch envs (`NEXT_PUBLIC_LR_BOT_ENABLED` for the UI bundle, `CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED` for the API endpoint) default to OFF. Production stays OFF until preview verification has passed and the security review block has been re-signed.

The locked system prompt floor lives verbatim in `lib/server/lead-rescue-bot/system-prompt.js` and is itself a copy of the audit doc § 7. Changes to either must be made in the same change set and reference a new JOURNAL row authorising the change. The runtime PR cannot weaken the doctrine prompt without an explicit doctrine-change packet.

## AI Lead Rescue visual reference

AI Lead Rescue should feel like a fast-response operations desk for small businesses.

Visual cues: lead cards, alert states, simple timeline, follow-up statuses, daily summary card, owner/operator notification.

Suggested hero visual: new enquiry submitted -> Telegram alert sent -> lead logged -> follow-up status updated -> daily summary generated.

Avoid generic AI robot imagery, complex dashboards, dense analytics charts, fake enterprise UI that does not match the pilot, and stock photos.

## Mandatory review checklist

Before publishing, confirm:

- Is there one clear conversion goal?
- Is the offer obvious within five seconds?
- Is the target customer obvious?
- Is the CTA action-oriented?
- Does the H1 describe a real buyer problem?
- Does the subheading describe the outcome?
- Are internal terms removed?
- Are objections handled?
- Are claims realistic and defensible?
- Is the page easy to scan?
- Does the primary CTA stand out?
- Is route/payment complexity delayed until after interest?
- Is the form/intake easy to start?
- Is payment explained clearly?
- Is the buyer reassured this is not a heavy CRM migration?

## Reusable copy blocks

Problem block:

Most small businesses do not lose leads because they lack a website. They lose leads because enquiries arrive in different places and follow-up depends on memory.

Outcome block:

CorpFlowAI makes the work visible: capture the enquiry, alert the right person, log the record, track the next step, and summarize what still needs attention.

Trust block:

No full CRM migration. No unnecessary rebuild. No unrealistic revenue claims. We start with the smallest workflow that makes the problem visible and actionable.

CTA block:

Start with a focused pilot. We review your intake, confirm the right setup path, and route payment after the scope is clear.

## Enforcement

This file is canonical for marketing and conversion work. If a branch, chat, task, design, or implementation conflicts with this doctrine, this doctrine wins unless a newer in-repo decision explicitly supersedes it.

Do not bury marketing strategy changes only in chat. If the doctrine changes, update this file in the same change set and reference the decision in branch/PR notes.

Cite this document in handoffs whenever work touches landing pages, public marketing pages, intake pages, pricing presentation, CTA wording, productized service offers, AI Lead Rescue, buyer-facing copy, or buyer-facing visual design.
