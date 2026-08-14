# CRM operating templates

**Use with:** `docs/operations/CRM_OPERATING_BASELINE_V1.md`
**Issue:** #701
**Rule:** Synthetic or redacted details only in GitHub. No live send from these drafts.

Fill the blanks. Leave unknown fields as `unknown` — do not guess values.

---

## Lead summary

```text
Lead id:
Business:
Person:
Email / phone (redact in shared copies):
Source:
Product / path:
Stage (operator name):
Canonical stage:
Owner:
Next action:
Due:
Urgency:
Related issues:
One-line problem:
Consent / contact preference:
```

---

## Qualification summary

```text
Lead id / business:
Product: Lead Rescue / Website Rescue / managed workflow / other:
Gate passed: yes / no / unknown
Evidence present:
  - business name:
  - email:
  - source or website:
  - timing:
Disqualifiers checked: none / listed:
Fit judgement (one sentence):
Recommended next action:
Due:
Owner:
```

### Lead Rescue — qualifying questions

1. What is the business name and who owns follow-up today?
2. Where do enquiries arrive (WhatsApp, web form, Instagram, phone)?
3. What happens after an enquiry arrives — and what gets missed?
4. Is the buyer the decision-maker for a USD 150 launch pilot?
5. What timing matters in the next 14 days?

**Disqualify if:** no commercial operation; wants guaranteed leads/revenue; will not name one leaky source.

### Website Rescue — qualifying questions

1. What is the current website URL (or why is there none)?
2. What should a visitor do in one tap?
3. Landing-page rescue or larger rebuild?
4. Who approves copy/design, and how fast can they reply?
5. Does the client already own hosting/domain?

**Disqualify if:** no website intent; shop/multi-site in week one; ranking or sales guarantees.

### Managed workflow — qualifying questions

1. Which named workflow is broken?
2. Who does it today, and where does it live?
3. What does done look like in 30 days?
4. CorpFlow-operated outcome or client-owned tool install?
5. Any regulated or client-private data constraint?

**Disqualify if:** generic chatbot/agent; unauthorised new self-hosted tool; storing another organisation’s customers in a second CRM.

### Future product — qualifying questions

1. Buyer pain in one sentence?
2. Closest existing SKU?
3. What evidence of fit exists today?
4. What must not be promised?

---

## Discovery call notes

```text
Date / duration:
Attendees:
Product:
Pain (buyer words):
Current process:
Decision-maker / budget signal:
Timing:
Fit: yes / no / later
Next step:
Due:
Do not promise:
```

Lead Rescue calls: also follow `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`.

---

## Follow-up draft (operator sends manually)

Channel: WhatsApp / email / other (operator chooses)
**System send: no**

```text
Hi {first name},

Following up on {product} for {business}.

Last step: {what we sent or asked}.
If helpful, we can {one concrete next step} by {date}.

If now is not the right time, say so — I will close the loop.

{operator name}
CorpFlowAI
```

Prefer the matching asset in `config/prospect-draft-assets.v1.json` when one exists (`follow_up_no_response`, `nurture_value_share`, `stalled_check_in`).

---

## Quotation handoff (#551)

```text
Lead id:
Business:
Product / SKU / price source (guide, not invented):
Scope in one paragraph:
Price + currency (from pricing guide):
Valid until:
Payment evidence path (#551):
What the buyer receives next:
Delivery issue to open if accepted (#550 or #654):
Owner:
Operator-reviewed: yes / no
Sent by automation: no
```

---

## Won / lost reason

```text
Lead id:
Outcome: won / lost / not_fit / nurture
Date:
Reason (required):
If won: payment/acceptance confirmed by (name), evidence ref (no secrets):
If lost: decline vs silence vs not-fit:
Reactivation date (or none):
Delivery issue (won only):
```

---

## Delivery handoff

**Lead Rescue → #550 / #715**
**Website Rescue → #654 / #716**

```text
Won lead id:
Delivery GitHub issue:
Onboarding template used:
Named client approver:
Start window:
Exclusions acknowledged:
Related_refs updated on the lead: yes / no
Cockpit/intake id (if any):
```

Onboarding intake files:

- `docs/operations/templates/lead-rescue-onboarding-intake.md`
- `docs/operations/templates/website-rescue-onboarding-intake.md`

---

## Weekly pipeline summary

Week of (UTC):
Prepared by:
**No fabricated values.** Write `unknown` when the row has no number.

```text
New enquiries:
Qualified opportunities:
Quotations issued:
Wins:
Losses:
Overdue next actions:
Stale actives:
Value by stage (only where stored):
  new:
  contacted / qualifying:
  qualified / discovery:
  proposal:
  awaiting decision:
  won:
By product (Lead Rescue / Website Rescue / other):
Attention items (ids only, no private detail):
Anton needed this week (exact protected decision only, or none):
```

Counts should match `computeDailyOperatorSummary` / `computeWeeklyPipelineSummary` when those helpers are run on the same snapshot.
