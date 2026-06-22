# Product A — US medspa prompt library (v1)

**Status:** Canonical operator prompt source — **docs-only**. Human-reviewed outputs only; no production runtime in this file.

**Audience:** Anton (operator) and authorized assistants drafting Product A sales motion copy, audit prep, follow-up, and reply handling for US medspas, aesthetic clinics, and elective clinics.

**Anchor sentinel:** `<!-- PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY_V1 -->`

<!-- PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY_V1 -->

**Surface:** `product-a` — `/product-a/us-clinics` intake and manual Google Sheets + n8n follow-up (see Product A implementation plan).

**Hard rule:** No GoHighLevel, no external CRM, no auto-send email, no SMS, no LLM enrichment of lead records. Prompts produce **draft text for operator review** — paste into Gmail drafts or notes; operator sends manually.

---

## 1. Related docs

| Doc | Role |
| --- | ---- |
| [../product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md](../product/PRODUCT_A_REVENUE_MACHINE_IMPLEMENTATION_PLAN.md) | Canonical plan — offer, stack, phases |
| [../product/PRODUCT_A_INTAKE_WEBHOOK.md](../product/PRODUCT_A_INTAKE_WEBHOOK.md) | Intake API payload + deploy checklist |
| [../product/PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md](../product/PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md) | Sheets schema, n8n specs, audit rubric |
| [BRAND_AND_CONVERSION_DOCTRINE.md](./BRAND_AND_CONVERSION_DOCTRINE.md) | No-guarantee language, CTA discipline |
| [00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md](./00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md) | Voice + compliance floor |
| [CORPFLOW_PROMPT_LIBRARY.md](./CORPFLOW_PROMPT_LIBRARY.md) | CorpFlow-wide visual asset prompts (separate from this operator library) |

---

## 2. How to use this library

1. Pick a **`prompt_id`** below for the workflow step (audit prep, draft, follow-up, reply classification).
2. Fill **input variables** from the Google Sheet row or audit notes — never invent clinic facts.
3. Run the prompt in your chosen assistant; **review every line** before saving a Gmail draft or updating Sheet `notes`.
4. Record which `prompt_id` and version you used in Sheet `notes` when the output materially shaped outreach (traceability).
5. If no entry fits, propose a new `prompt_id` in this file in the same PR — do not keep ad-hoc prompts only in chat history.

**Workflows covered (v1):**

| Workflow | Prompt IDs |
| -------- | ----------- |
| **Audit prep** | `product-a-audit-prep-brief` |
| **Draft (Gmail)** | `product-a-intake-ack-gmail-draft`, `product-a-audit-recap-gmail-draft`, `product-a-proposal-scope-email-draft` |
| **Follow-up** | `product-a-follow-up-no-reply`, `product-a-follow-up-post-audit-nurture` |
| **Reply classification** | `product-a-reply-classifier`, `product-a-reply-response-draft` |

---

## 3. Global voice constraints (every prompt)

Append this block to every generation request:

```
Product A voice constraints:
- US medspa / aesthetic / elective clinic context — professional, calm, operator-respectful.
- Lead with enquiry capture, follow-up visibility, and website clarity — not "AI automation".
- Primary CTA: Request a Website & Lead Rescue Audit (or book the audit call if already in thread).
- No revenue guarantees, no "never miss a lead again", no "10x" language.
- No third-party CRM names, no GoHighLevel, no drip/SMS/chatbot pitch on the sales motion.
- No fabricated metrics, testimonials, or client names.
- Plain English; short paragraphs; one clear next step.
- Sign-off: Anton, CorpFlowAI (adjust if sending from a clinic-specific alias is authorized).
```

**Standing negative instructions:**

```
Do NOT: auto-send language, payment links in first touch, urgency manipulation, HIPAA claims we
cannot support, medical outcome promises, discount tiers not in the plan, or copy that implies
fully automated sales.
```

---

## 4. Prompts (v1)

Each entry is the **source of truth**. Edit-in-place requires brand-doctrine review and a document history row.

### `product-a-audit-prep-brief`

- **Use case:** Before the audit call — structure research and call agenda from Sheet row + public website skim.
- **Workflow:** Audit prep.
- **Output:** Operator brief (not sent to prospect).

**Input variables:** `{clinic_name}`, `{website}`, `{city_state}`, `{biggest_problem}`, `{contact_name}`, optional `{notes}`.

Prompt:

```
You are preparing an operator brief for a 30-minute "Website & Lead Rescue Audit" with a US
medspa/aesthetic/elective clinic.

Inputs:
- Clinic: {clinic_name}
- Website: {website}
- Location: {city_state}
- Contact: {contact_name}
- They said their biggest problem is: {biggest_problem}
- Prior operator notes: {notes}

Using ONLY the inputs and what is reasonable to infer from a public medspa website (do not invent
private data), produce:

1. **Call agenda (30 min)** — 5 timed sections including intro, website walkthrough, enquiry
   capture path, follow-up visibility, and recommended next step.
2. **Discovery questions (8–10)** — specific to {biggest_problem} and medspa booking patterns.
3. **Audit rubric pre-score hypothesis** — for each area (enquiry capture, website clarity,
   follow-up visibility, booking path, Lead Rescue fit) suggest Red/Amber/Green with one-line
   rationale each. Mark as hypothesis — to be confirmed on the call.
4. **Risks / disqualifiers** — bullet list (e.g. no decision-maker, full agency rebuild RFP only).
5. **Recommended scope sketch** — 3 bullets max for website hardening vs capture fix vs Lead
   Rescue pilot — no pricing, no guarantees.

[Append Product A voice constraints]
```

---

### `product-a-intake-ack-gmail-draft`

- **Use case:** First human-approved email after a new `/product-a/us-clinics` intake row lands in the Sheet.
- **Workflow:** Draft (Gmail) — operator sends manually.
- **Output:** Gmail draft body (plain text).

**Input variables:** `{contact_name}`, `{clinic_name}`, `{biggest_problem}`, `{audit_booking_url}`.

Prompt:

```
Write a plain-text Gmail draft to {contact_name} at {clinic_name} acknowledging their audit request
via corpflowai.com/product-a/us-clinics.

They said: {biggest_problem}

Include:
- Thank them for the specific detail they shared (paraphrase {biggest_problem} — do not exaggerate).
- Confirm the offer: Website & Lead Rescue Audit — we review how enquiries arrive and whether
  follow-up is visible, not a generic SEO pitch.
- One scheduling CTA using this link: {audit_booking_url}
- Set expectation: Anton reviews intakes within 2 business days; audit is ~30 minutes.
- No invoice, no payment link, no attachment.

Length: 120–180 words.

[Append Product A voice constraints]
```

---

### `product-a-audit-recap-gmail-draft`

- **Use case:** After the audit call — recap and proposed scope email (human sends).
- **Workflow:** Draft (Gmail).
- **Output:** Gmail draft with 3-bullet audit summary per ops rubric.

**Input variables:** `{contact_name}`, `{clinic_name}`, `{audit_notes}`, `{rubric_scores}`, `{recommended_scope}`, `{audit_booking_url}` (optional if re-booking).

Prompt:

```
Write a plain-text Gmail recap to {contact_name} at {clinic_name} after their Website & Lead
Rescue Audit.

Operator audit notes:
{audit_notes}

Rubric scores (Red/Amber/Green):
{rubric_scores}

Recommended scope (operator-approved):
{recommended_scope}

Structure:
1. Opening — thank them; reference one specific thing from the call (from audit notes only).
2. **Audit summary — exactly 3 bullets** using the rubric areas (enquiry capture, website/follow-up
   visibility, booking path). Use honest Red/Amber/Green language; no invented fixes already delivered.
3. **Recommended scope** — restate {recommended_scope} in buyer language (website hardening, capture
   fix, Lead Rescue pilot — pick what notes support).
4. **Next step** — one CTA: reply to confirm scope for a written proposal, or book a short
   follow-up if noted in scope. Optional link: {audit_booking_url}

Forbidden: revenue guarantees, "we'll 2x your leads", naming other clients.

Length: 180–260 words.

[Append Product A voice constraints]
```

---

### `product-a-proposal-scope-email-draft`

- **Use case:** Formal scope email after recap accepted — still manual send, no auto-invoice.
- **Workflow:** Draft (Gmail).
- **Output:** Scope outline email (pricing left to operator unless `{price_note}` provided).

**Input variables:** `{contact_name}`, `{clinic_name}`, `{scope_bullets}`, `{timeline_note}`, `{price_note}`.

Prompt:

```
Write a plain-text scope email to {contact_name} at {clinic_name}.

Approved scope bullets:
{scope_bullets}

Timeline note (operator): {timeline_note}

Pricing note (operator — if empty, say "I'll send a separate invoice after you confirm scope"):
{price_note}

Include: brief context line, numbered deliverables from scope bullets, what we need from them
(access, brand assets, one point of contact), timeline, single reply CTA to confirm.

No CRM migration pitch. No chatbot-first Lead Rescue framing — managed workflow + visibility.

[Append Product A voice constraints]
```

---

### `product-a-follow-up-no-reply`

- **Use case:** No reply 3–5 business days after acknowledgement or recap.
- **Workflow:** Follow-up.
- **Output:** Short follow-up Gmail draft.

**Input variables:** `{contact_name}`, `{clinic_name}`, `{prior_subject}`, `{days_since}`, `{audit_booking_url}`.

Prompt:

```
Write a short plain-text follow-up to {contact_name} at {clinic_name}.

Context: no reply after {days_since} business days to our email about "{prior_subject}".

Rules:
- Assume they're busy running the clinic — no guilt, no "just circling back" filler.
- Restate the single value: making enquiries visible and follow-up traceable.
- One CTA: reply yes/no OR use {audit_booking_url} if audit not yet booked.
- Max 90 words.

[Append Product A voice constraints]
```

---

### `product-a-follow-up-post-audit-nurture`

- **Use case:** Prospect said "not now" or went quiet after audit — nurture without drip automation.
- **Workflow:** Follow-up.
- **Output:** Single nurture email draft; operator sends manually when `{nurture_trigger}` is true.

**Input variables:** `{contact_name}`, `{clinic_name}`, `{nurture_trigger}`, `{helpful_resource}`, `{intake_url}`.

Prompt:

```
Write a one-touch nurture email to {contact_name} at {clinic_name}.

Trigger (from operator): {nurture_trigger}

Offer one useful resource or observation (operator-provided, no fabrication):
{helpful_resource}

Include soft CTA to {intake_url} only if they want to re-open the audit conversation later.
No monthly newsletter tone. No "limited time offer".

Max 110 words.

[Append Product A voice constraints]
```

---

### `product-a-reply-classifier`

- **Use case:** Classify an inbound reply so the operator updates Sheet `status` and `next_action`.
- **Workflow:** Reply classification.
- **Output:** Structured JSON only (operator copies into notes).

**Input variables:** `{inbound_reply_text}`, `{current_status}`, `{clinic_name}`.

Prompt:

```
Classify this inbound reply for Product A US clinic outreach.

Clinic: {clinic_name}
Current Sheet status: {current_status}

Reply text:
"""
{inbound_reply_text}
"""

Return ONLY valid JSON with these keys:
{
  "classification": one of [
    "book_audit", "needs_info", "not_now", "wrong_contact", "not_fit", "ready_for_proposal",
    "accepted_scope", "declined", "unclear"
  ],
  "confidence": "high" | "medium" | "low",
  "suggested_sheet_status": one of [
    "new", "reviewing", "audit_scheduled", "audit_done", "proposal_sent", "won", "lost", "nurture"
  ],
  "suggested_next_action": "string, imperative, max 12 words",
  "summary_one_line": "string",
  "do_not_auto_send": true
}

Rules:
- Never suggest auto-send or CRM sync.
- If medical/legal/compliance question, classification "needs_info" and next_action "escalate to Anton".
- If hostile or unsubscribe, "declined" and status "lost".
```

---

### `product-a-reply-response-draft`

- **Use case:** After classification — draft operator reply matching the classification.
- **Workflow:** Reply classification → draft.
- **Output:** Gmail draft plain text.

**Input variables:** `{contact_name}`, `{clinic_name}`, `{classification}`, `{summary_one_line}`, `{audit_booking_url}`, `{intake_url}`.

Prompt:

```
Write a plain-text reply to {contact_name} at {clinic_name}.

Classification: {classification}
Thread summary: {summary_one_line}

Routing rules:
- book_audit → offer {audit_booking_url}, confirm 30 min audit agenda.
- needs_info → answer only what we can from public Product A offer; defer unknowns to Anton follow-up.
- not_now → gracious close; optional {intake_url} for later; suggest status nurture.
- wrong_contact → ask for owner/office manager referral; no pitch.
- not_fit → polite decline; no argument.
- ready_for_proposal / accepted_scope → confirm next step is written scope email from Anton.
- declined → brief thanks; no re-pitch.
- unclear → one clarifying question only.

Max 120 words unless needs_info requires two short paragraphs.

[Append Product A voice constraints]
```

---

## 5. Operator checklist (prompt traceability)

1. New intake row → `product-a-intake-ack-gmail-draft` → Gmail draft → manual send → Sheet `status=reviewing`.
2. Before audit → `product-a-audit-prep-brief` → paste brief into Drive or Sheet `notes`.
3. After audit → `product-a-audit-recap-gmail-draft` → manual send → `status=audit_done`.
4. Inbound reply → `product-a-reply-classifier` → update Sheet → `product-a-reply-response-draft` if needed.
5. No reply → `product-a-follow-up-no-reply` once; second touch only with explicit operator decision.

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-20 | Initial library — audit, draft, follow-up, reply-classification prompts for Product A US medspa motion |
