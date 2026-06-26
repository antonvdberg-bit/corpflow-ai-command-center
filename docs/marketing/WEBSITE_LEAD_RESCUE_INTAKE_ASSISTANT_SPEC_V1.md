# Website & Lead Rescue Intake Assistant — specification v1

> **Status:** SPECIFICATION ONLY. **NO IMPLEMENTATION AUTHORIZED.**
> This document changes no runtime code, dependencies, env vars, `.env.template`,
> database schema/data, `POSTGRES_URL`, Vercel config, GitHub settings, routes,
> deployment, secrets, payment flow, or n8n automation. It defines a proposed
> assistant; building it requires a separate, explicitly approved packet.

**Owner:** Anton (operator). **Author:** Cursor (docs).
**Created:** 2026-06-25.
**Anchor sentinel:** `<!-- INTAKE_ASSISTANT_SPEC_V1 -->`

<!-- INTAKE_ASSISTANT_SPEC_V1 -->

## 1. Purpose

A conversion-focused chatbot / intake assistant for the Product A landing surface
`/product-a/us-clinics`, and later for lead-rescue and service pages. Its job is to
**improve enquiry capture and qualification** for US medspas, aesthetic clinics,
and elective clinics — guiding a visitor toward an audit request or contact,
without medical advice, pricing guarantees, or any automated outreach.

This is a **specification**, not a build. It exists so that, if and when an
implementation packet is approved, the behaviour, boundaries, and governance are
already settled.

## 2. Governance and canonical alignment

This assistant is governed by, and must not contradict, the following canonical
docs (they win on any conflict):

- `docs/marketing-automation-arm.md` — Marketing Automation Arm operating playbook
  (outreach is **AI-assisted and human-approved only**; n8n is notify-only; no
  automated cold outreach).
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md` — workstream #6
  (chatbot/intake assistant: spec first, human-approved intake/follow-up only).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — single offer, route after
  intent, buyer-action CTAs.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` and
  `docs/marketing/04_DELIVERY_QUALITY_GATE.md` — communication + quality standards.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — not a generic chatbot; a
  vertical, managed-outcome capture aid for a specific buyer.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — required before any
  implementation that touches data handling.

It must also respect the existing intake contract in
`docs/product/PRODUCT_A_INTAKE_WEBHOOK.md` (route `POST /api/product-a/intake`,
payload `corpflow.product_a.intake.v1`) — the assistant **proposes** an intake; it
does not invent a parallel one.

## 3. Business goal

Improve enquiry capture and qualification for US medspas / aesthetic / elective
clinics:

- **Capture:** reduce silent abandonment on `/product-a/us-clinics` by answering
  the visitor's immediate questions and lowering friction to the audit request.
- **Qualify:** collect non-sensitive qualification context (clinic type, website,
  the biggest follow-up gap) so a human follow-up starts warm, not cold.
- **Route after intent:** once the visitor signals intent, guide them to the
  existing audit request / contact path — not a payment flow, not a hard sell.

Success is measured by enquiry quality and completion of the existing intake form,
not by message volume or "engagement" for its own sake.

## 4. User journeys

### 4.1 Clinic owner / admin exploring the audit
- Lands on `/product-a/us-clinics`, unsure what "audit" means for them.
- Assistant explains the audit in plain language, answers service questions, and
  guides them to the audit request form with their context pre-summarised.

### 4.2 Abandoned visitor
- Reads part of the page, hesitates, starts to leave.
- Assistant offers a single, low-friction prompt ("Want a quick summary of what
  the audit checks?") and, on intent, routes to the audit request — never nags,
  never blocks the page, never auto-messages later without approval.

### 4.3 Returning prospect
- Has visited before / arrived from a follow-up.
- Assistant picks up the thread using only non-sensitive context the visitor
  re-provides in-session, confirms the audit/contact next step, and hands off to a
  human-approved follow-up. No hidden profile of the person is built or stored.

## 5. Allowed assistant behaviour

- Answer **service questions** about Product A (website rebuild / lead capture /
  Lead Rescue) using approved copy and the canonical docs.
- **Guide to the audit request** and to contact — route after intent, per the
  brand/conversion doctrine.
- **Collect non-sensitive qualification info** aligned to the existing intake
  fields: clinic name, website, contact name, email, city/state, and the biggest
  follow-up/enquiry problem (`docs/product/PRODUCT_A_INTAKE_WEBHOOK.md`).
- **Encourage booking / contact** with a clear, buyer-action next step.
- Be transparent that it is an assistant and that a human handles follow-up.

## 6. Prohibited behaviour

- **No medical advice or diagnosis** of any kind — it is a marketing/intake aid,
  not a clinical tool. Decline and redirect medical questions.
- **No pricing guarantees** or revenue guarantees; no exaggerated AI claims.
- **No autonomous cold outreach** — it never initiates contact with anyone.
- **No automatic sending without approval** — it does not email, SMS, message, or
  push to any external system on its own; every follow-up is human-approved.
- **No storing sensitive patient data** — never collect or retain PHI, patient
  records, health conditions, payment-instrument data, or credentials. If a
  visitor volunteers sensitive data, do not persist it.
- **No payment flow**, no checkout, no card capture.
- **No second app, no second database, no CRM build** — it composes with the
  existing app, the existing intake route, and (later) approved notify-only n8n.

## 7. Handoff path

Human-approved follow-up only:

1. Visitor signals intent and submits the existing audit request / intake.
2. The intake follows the existing contract (`POST /api/product-a/intake`).
3. A human reviews and approves any follow-up before it is sent, consistent with
   `docs/marketing-automation-arm.md` §8 (approval gates) and §9 (n8n notify-only).
4. The assistant never closes the loop autonomously; it prepares, a human sends.

## 8. Future integration candidates (not authorized here)

Listed so a future implementation packet is small and obvious. None is approved by
this spec:

- **Existing intake form / route** — `POST /api/product-a/intake`
  (`corpflow.product_a.intake.v1`); the assistant pre-fills/guides, the form
  remains the system of record for the submission.
- **Email notification** — operator notification on a new qualified intake, via
  the existing communications path only (`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`),
  human-approved, no auto cold send.
- **Google Sheet / Drive intake log** — append qualified, non-sensitive intake
  context to the Marketing & Brand Hub working log
  (`docs/marketing/MARKETING_COLLATERAL_INVENTORY.md`), as working collateral, not
  a production datastore.
- **Later n8n notify-only flow** — reminders/notifications for human follow-up
  per `docs/marketing-automation-arm.md` §9; never automated cold outreach.

Each candidate is a separate, gated decision; some touch the security review
checklist and would require Anton approval before any build.

## 9. Open questions for the implementation packet

- Which LLM / runtime, and how is prompt-injection and off-topic handling bounded?
- Where (if anywhere) is transient conversation state held, and for how long —
  with the data-minimisation and no-sensitive-data rules in §6 as hard limits?
- Exact UI placement on `/product-a/us-clinics` without harming LCP/CLS, mobile,
  or the existing beauty-layer presentation.
- Analytics events (Plausible) for capture/qualification, respecting the existing
  analytics allow/deny lists.

## 10. Constraints (carried forward)

Specification only. No app code, no implementation, no autonomous outreach, no CRM
build, no second app, no second database, no production DB changes, no
`POSTGRES_URL` changes, no env vars, no `.env.template` edits, no payment flow, no
secrets, no n8n automation yet. Implementation requires a separate, explicitly
approved packet under `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`.

## 11. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs-only.
- **Implementation:** none.
- **Verdict:** PARTIAL by design — specification documented; build deliberately
  unauthorised and deferred to a future, separately approved packet.
