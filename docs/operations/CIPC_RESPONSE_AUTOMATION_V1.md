# CIPC response automation — market-ready lead and client communications

**Status:** Operator control-flow pack for GitHub **#987**. Parent **#984** / **#640**.  
**Tenant:** `cipc-desk` / CIPC Desk (internal working name).  
**Environment:** `corpflow_test`. **Not a public launch.** **Not `client_production`.**  
**Machine contract:** `lib/cipc-desk/response-automation.js`  
**Reuse:** existing `POST /api/cipc-desk/email-intake`, `cmp_tickets.console_json.cipc_response`, `leads.qualification_json.cipc_response`, campaign MVP (#985), service-factory (#988), `/partners` (#986), `/company` (#1183), `/change`. No second CRM.

<!-- CIPC_RESPONSE_AUTOMATION_V1 -->

**ANTON ACTION:** none to start ordinary work. Anton is required only for **live email / WhatsApp / SMS send**, commercial quotation, payment, CIPC filing/submission, schema, secrets, public launch, or `client_production`.

---

## What is true when this pack is in use

A website or campaign CIPC enquiry is captured onto the existing tenant queue, classified, de-duplicated, given a deterministic acknowledgement or discovery draft, and shown on `/change` for approve / reject / do-not-contact. Follow-up due dates are machine-readable for later n8n use. Replies with a stable thread or message id link back to the same matter. **Nothing is sent.**

```text
enquiry captured → classified → draft ready → operator review
  → approved / rejected / do-not-contact
  → ready_to_send (blocked) → follow-up due dates
  → reply linked to the same record
```

This packet stops at **ready_to_send**. Live send is a protected consequence.

## Overlay shape (`cipc_response`)

Stored inside existing JSON only:

| Field | Meaning |
| ----- | ------- |
| `source` | `partner_web` / `direct_sme_web` / `campaign` / `existing_client` / `unknown` |
| `classification` | `professional_partner` / `direct_sme` / `existing_client` / `spam_unusable` / `unclear_manual_review` |
| `service_id` | inferred service, or null when unscoped |
| `dedupe_keys` | email, company, website host, thread id, message id |
| `draft` / `drafts` | acknowledgement, partner discovery, SME next-step, incomplete, specialist holding, follow-ups 1–3 |
| `approval_state` | `pending` / `operator_approved` / `rejected` |
| `send_state` | `not_sent` / `ready_to_send` / `blocked` / `send_simulated` |
| `response_state` | `none` / `replied` / `question_or_condition` / `closed` |
| `next_action` / `next_action_due` | operator or n8n follow-up |
| `do_not_contact` | permanently blocks campaign follow-up and send |
| `specialist_escalation` / `escalation_flags` | legal/complex/service exceptions |
| `ticket_id` / `lead_id` / `campaign_prospect_id` | existing record linkage |
| `public_reference` | buyer-facing `CD-…` reference |
| `replies[]` | linked inbound metadata; never treated as yes/no approval |

Unrelated JSON namespaces are preserved.

## Operator surface

| Need | Where it lives |
| ---- | -------------- |
| Response queue | `/change` on `https://cipc.corpflowai.com/change` (logged-in CIPC Desk session) |
| List API | `GET /api/cmp/router?action=cipc-response-list` |
| Approve / reject / do-not-contact | `POST /api/cmp/router?action=cipc-response-operator-patch` |
| Link a reply | `POST /api/cmp/router?action=cipc-response-link-reply` |
| Capture | existing `POST /api/cipc-desk/email-intake` |
| Buyer confirmation | `https://cipc.corpflowai.com/company` (direct SME) and `https://cipc.corpflowai.com/partners` (accounting-practice partners), plus `public_reference` |

## Safety gates

- `intent=send` / `live_send` / `mark_sent` → `PROTECTED_SEND_BLOCKED`
- quotation / commitment / payment / CIPC submit → same fail-closed pattern
- do-not-contact / unsubscribe permanently blocks follow-up and send
- duplicate sender/company/thread reuses the first matter
- replies with `?` or conditions are `question_or_condition`, not approvals
- #992 campaign send block is unchanged

## Explicit non-actions

- No live external contact
- No first-10 campaign send
- No public launch or indexing change
- No new DB/schema/CRM
- No new paid tooling
- No secrets/env changes
- No CIPC filing/payment

## Marketing / Sales Quality Gate

Definition of done: a new enquiry can be captured, classified, drafted, and held behind a human send gate.  
Audience: accounting/advisory partners and direct SME company-secretarial enquiries.  
Stage: first response / discovery.  
Commercial outcome: operator-approved draft, not a send.  
Primary asset: `/change` response queue + deterministic drafts.  
Validation asset: `/company` and `/partners`.
Proof status: partial — drafts are operator-held; no live send.

Quality-gate target: **12/14** (visual 1/2 because these are operator drafts plus the existing partner confirmation, not a new landing page).

## Delivery Reality

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO (PR only)
- Production deployment ID: n/a until merge + Vercel Production Ready
- Commit deployed: n/a
- Live URLs tested: n/a until publish — expected `/change` response queue and `/partners` confirmation after corpflow_test deploy
- Expected vs actual result: classification + drafts + approval gate in tests; send blocked
- Client-facing flow usable: n/a until merge/deploy (buyer confirmation copy already exists; reference is additive)
- Final verdict: PARTIAL (awaiting merge, deploy, live /change and /partners check)
```

Environment: **corpflow_test**. This is not client production.
