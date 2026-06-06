# CorpFlowAI Above-the-Line Strategy Doctrine

**Status:** Mandatory strategic evaluation doctrine.

**Anchor sentinel:** `<!-- ABOVE_THE_LINE_STRATEGY_DOCTRINE_V1 -->`

<!-- ABOVE_THE_LINE_STRATEGY_DOCTRINE_V1 -->

## Applies to

- CorpFlowAI product strategy
- AI Lead Rescue
- Managed services
- Automation work
- Marketing offers
- Client proposals
- Technical discovery
- Roadmap decisions
- Future productized services

## Core decision

CorpFlowAI must **not** compete as a generic AI wrapper company.

Generic agents, generic chatbots, prompt-to-app prototypes, simple content generators, generic dashboards, and basic automation wrappers are expected to become cheaper, bundled, or free inside platforms from Google, OpenAI, Microsoft, Apple, Meta, and others.

CorpFlowAI uses those commodity layers as **leverage**. CorpFlowAI does not build its strategy around reselling those layers as the moat.

## The line

### Below the line (commoditized — do not build the company here)

- Generic AI chatbot
- Generic AI agent
- Generic content generator
- Generic prompt-to-app wrapper
- Generic dashboard builder
- Generic email summarizer
- Generic social post generator
- Generic workflow glue without domain context

### Above the line (defensible — build the company here)

- Vertical workflows inside a specific industry
- Managed client operations where CorpFlowAI owns the outcome discipline
- Proprietary client context and business-process knowledge
- Trust-heavy workflows where mistakes are expensive
- Secure system-to-system automation for sensitive data
- Human-in-the-loop delivery with audit trail and accountability
- Distribution and relationships CorpFlowAI owns directly
- A strong point of view that generic models cannot average their way into

## Mandatory evaluation test

Before approving a new offer, feature, marketing claim, or technical build, ask:

> **“If Google, Microsoft, OpenAI, Apple, Meta, or another platform shipped a free decent version of this tomorrow, would CorpFlowAI still have customers?”**

### If the answer is **no**

- Reframe.
- Narrow.
- Attach to a managed outcome.
- Embed into a vertical workflow.
- Or deprioritize.

### If the answer is **yes**

Document **why**, referencing at least one of:

- Industry-specific workflow depth.
- Proprietary client context.
- Managed operations / accountability.
- Trust, compliance, or security sensitivity.
- Integration into real business systems.
- Owned distribution or relationship advantage.
- Measurable business outcome rather than AI novelty.

This justification should land in the originating decision artifact (a packet under `docs/execution/`, a JOURNAL row under `docs/decisions/`, a doctrine PR, or an Operator Bridge DECISION block) — not only in chat.

## AI Lead Rescue under this doctrine

AI Lead Rescue is a **wedge**, not the whole company.

It exists because it is the first simple productized offer we can get to market from the CorpFlowAI stack.

It proves:

- Lead capture.
- Operator notification.
- Follow-up visibility.
- Setup discipline.
- Daily operating summary.
- Paid pilot delivery.
- Managed monitoring potential.

### AI Lead Rescue stays above the line when sold and delivered as

- A **managed lead-response operating workflow**.
- A **48-hour setup with human review and accountability**.
- A **follow-up visibility system**.
- A **business outcome service** for specific niches.
- A **wedge into deeper managed operations**.

### AI Lead Rescue falls below the line if it becomes merely

- A generic chatbot.
- A generic lead form.
- A generic CRM board.
- A generic automation demo.
- A generic AI agent.

The brand, the landing page, the intake, the invoice, and the delivery checklist must all consistently frame Lead Rescue as a managed operating workflow with human accountability — not as “our AI agent.”

## Strategic product lines

These are the categories CorpFlowAI may develop offers within. Each must independently pass the **Mandatory evaluation test**.

### 1. Lead and Growth Operations

- AI Lead Rescue
- Managed follow-up desk
- CRM-lite for property agents and contractors
- Review / referral follow-up
- Restaurant marketing operations
- Property enquiry operations
- Clinic / admin enquiry operations

### 2. Business Operating Dashboards

- Spreadsheet-to-operations dashboard
- Quote pipeline dashboard
- Daily founder / operator briefing
- Invoice and payment follow-up visibility
- ERPNext-connected operational summaries
- Internal tools built around the client’s real process

### 3. Secure Workflow Automation

- Bank-statement-to-system automation
- Document-to-ERP workflows
- Accounting reconciliation workflows
- Finance / admin exception queues
- Legal or compliance document intake
- Healthcare / admin document workflows **where clinical decision-making is out of scope**
- System-to-system secure transfer with audit trail

## Done-for-you business function model

CorpFlowAI may sell **managed business functions** where the client does not want to build the function internally. The offer is the running function, not the tool.

Examples:

| Vertical | Managed function |
|---|---|
| Restaurant | Managed local marketing, offers, review follow-up, booking follow-up. |
| Property agent | Managed lead response, viewing follow-up, CRM-lite, owner reporting. |
| Contractor | Quote follow-up, job pipeline visibility, review requests. |
| Clinic / admin practice | Appointment-enquiry follow-up and admin visibility. **Not medical advice or clinical triage.** |
| Finance / admin firm | Secure document extraction, reconciliation, exception reporting. |

A done-for-you function offer must always specify:

- Who runs it day-to-day.
- What the client receives weekly / monthly.
- How errors are caught and corrected.
- How the engagement scales up or winds down without harming the client.

## Build-order doctrine

CorpFlowAI builds new offers in this order. Skipping steps is how commodity drift happens.

1. **Narrow paid wedge** — one offer, one buyer profile, one price.
2. **Operator cockpit** — the internal surface the human running it actually uses.
3. **Delivery checklist** — repeatable, auditable, handover-ready.
4. **Evidence and monitoring** — proof the function is actually running.
5. **Quote / handover templates** — so a second operator can deliver.
6. **Managed monthly service** — the running function, not the project.
7. **Niche expansion** — same shape, adjacent vertical.
8. **Secure vertical workflow automation** — system-to-system, audit-trail-bound.
9. **Industry operating system** — the long-arc destination, never the starting product.

## Commodity tools policy

CorpFlowAI **should** use commodity AI tools internally for:

- Research.
- Drafting.
- Code acceleration.
- Workflow design.
- Prototype generation.
- Content repurposing.
- Market monitoring.
- Document summarization.

External offers must be framed around **installed business systems and managed outcomes**, not around the underlying commodity tools.

**Rule:**

> **Commodity AI is fuel. It is not the moat.**

## Immediate implication

The current priority remains:

1. Finish **AI Lead Rescue production verification**.
2. **Fix login / autofill friction** that blocks operator confidence.
3. Use AI Lead Rescue as the **first wedge into managed lead / growth operations**.
4. **Avoid delaying first revenue** for generic chatbot, bulk email, SMS, or social scheduler builds.
5. **Capture custom secure automation opportunities** (such as bank-statement-to-system transfer) as **paid discovery candidates**.
6. Treat the chatbot as a **narrow concierge and routing aid only**, **not** the strategic moat.

## Enforcement

This file is canonical for strategic evaluation of CorpFlowAI offers, features, marketing claims, and technical builds. If a branch, chat, packet, design, or implementation conflicts with this doctrine, this doctrine wins unless a newer in-repo decision explicitly supersedes it.

- Marketing surfaces must not contradict this doctrine (`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *Strategic guardrail — Above-the-Line Doctrine* cross-references this file).
- New packets under `docs/execution/` should reference this doctrine in their **Goal** or **Scope** when proposing a new offer, feature, or external claim.
- Strategy source captures under `docs/strategy/sources/` may **propose** updates to this doctrine; they do not modify it directly. Doctrine changes always land in a separate PR.

## Cross-references

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand and conversion doctrine (single-offer rule, route-after-intent, AI Lead Rescue specifics). Carries a strategic-guardrail section cross-linked to this file.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — Hook / Proof / Depth doctrine and the dual-asset pattern.
- `docs/marketing/04_DELIVERY_QUALITY_GATE.md` — quality gate that buyer-facing work must pass before handoff.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — production bar (reliable, secure, observable).
- `docs/strategy/sources/README.md` — strategy source captures index; captures **propose**, doctrine **decides**.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape; new offers should justify themselves against this doctrine in their Goal / Scope.
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md` — current approved queue; reflects the immediate-implication ordering above.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`; this doctrine governs **what** to build, delivery-reality governs **when it counts as shipped**.
