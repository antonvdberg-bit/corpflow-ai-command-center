# Prospect nurturing setup contract v1

Status: PREPARED FOR REVIEW — no live configuration or recipient enrolment verified.
Owner: ChatGPT/controller for setup review; existing authorised Frappe operator for site execution.
Lineage: #1415, #1252, merged PR #1414; Anton's 2026-10-07 instruction to start establishing the environment.
Architecture: [Frappe Commercial Estate Migration v1](FRAPPE_COMMERCIAL_ESTATE_MIGRATION_V1.md).

## 1. Rules to apply together

The merged architecture governs record ownership:
- Unselected research candidates remain Growth/research staging.
- Selected operational prospects belong in Frappe CRM after cutover, even before reply.
- Frappe CRM owns pre-sales identity, activities, Lead/Deal and nurture state.
- ERPNext owns Customer, pricing, quotation, transactions and finance.
- Existing Growth and ERPNext Lead/Opportunity records remain transitional evidence until reconciliation. No new long-lived legacy CRM features.

The approved nurture rule independently governs marketing eligibility:
- A genuine human reply is engagement; delivery receipts, bounces and automated replies do not establish a relationship.
- An acknowledgement alone does not grant marketing permission.
- Recurring nurture requires an affirmative agreement to occasional CorpFlowAI updates, with source evidence.
- Silence, selected-prospect status, a customer record or an import never creates permission.
- Apply the same explicit-permission standard to Mauritius, South Africa, Australia, US, UK and EU.
- Maximum four planned nurture updates in a rolling twelve months; no extra event-led sends under this contract.
- Active sales pauses quarterly nurture. Opt-out overrides consent and permanently suppresses marketing unless a separate reviewed re-consent process is approved.
- Marketing permission does not authorise a particular external send, initial cold outreach or WhatsApp contact.

This supersedes reply-based CRM admission interpretations in older #1252/#1412 notes. It preserves the stricter explicit-permission nurture rule. No customer-exception or jurisdictional bypass is used for this initial cohort.

## 2. Minimum information and native mapping

Inspect actual installed DocType metadata before choosing fields. This table defines required information, not a new schema.

| Information | Minimum evidence | Preferred native home |
|---|---|---|
| Identity | Reconciled CRM reference and contact route | CRM Lead/Contact/organization |
| Engagement | Human interaction date and source reference | Linked communication/activity/note |
| Permission | NOT_GRANTED / GRANTED / REVOKED; scope and date | Existing native field or structured CRM note |
| Permission provenance | Actual affirmative wording and private source reference | Restricted linked communication/note |
| Country | Recipient jurisdiction where known | Standard address/contact field |
| Sales state | ACTIVE_SALES / NOT_NOW / CLOSED / CUSTOMER | Standard Lead/Deal state/task |
| Suppression | Opt-out date, scope, source; identity aliases | Verified native shared suppression |
| Cadence | Last nurture send and twelve-month send count | Native campaign/communication history |
| Next action | Owner and due date | CRM task |

Use standard fields, activities, tags and notes first. If these cannot make consent/suppression reliably reviewable, return the exact gap before proposing custom fields or code. Private correspondence and contact data stay in the commercial estate; GitHub holds redacted evidence only.

## 3. Setup sequence

1. Complete #1415 read-only inventory: current apps/versions, hosting/install capability, backup coverage and safe non-production target.
2. Prove the approved CRM + ERPNext same-site pair on that target. Keep every outbound queue/account/schedule disabled; do not restore real outbound settings into an active clone.
3. Map the information above to actual native fields/notes. Record exact DocType and field names in the evidence packet.
4. Configure a synthetic cohort only on the verified non-production site using the existing authorised execution path. No real addresses; no email/WhatsApp sends.
5. Prove native CRM activities/history and ERPNext Newsletter/Email Group/Email Campaign membership behavior where available. Native ERPNext delivery may support the CRM relationship without becoming another commercial master.
6. Verify a single authoritative permission/suppression source can be consulted by every proposed send route. Email Group membership alone is not permission evidence.
7. Produce deduplicated dry-run migration decisions for current selected prospects and real relationships; backfill #1418 interaction history. Separate CRM migration candidates from nurture-eligible contacts.
8. Return exact production app/config/data changes and rollback evidence for Anton's protected-action approval.
9. Only after approved writes and read-back, prepare a real eligible cohort of up to 10–20 contacts. Sending remains a separate approval.

No new platform, database, paid capacity or custom CRM-to-ERP bridge. Do not dispatch Cursor solely to apply this document. Cursor is needed only for a demonstrated integration/helper deficiency with a bounded implementation contract.

## 4. Eligibility decision before each proposed send

Include only when ALL are verified:
- One reconciled contact identity with a valid route.
- Explicit affirmative permission for occasional CorpFlowAI updates with provenance.
- No global marketing opt-out, do-not-contact or invalid-address block.
- Not in active sales.
- No nurture send in the preceding three months.
- Fewer than four nurture updates in the preceding twelve months.
- Content relevant to the relationship and current permission scope.
- Actual campaign/cohort approved for external release.

Unknown evidence fails closed. Manual review of a small native cohort is acceptable; unattended scheduling is not required.

## 5. Synthetic acceptance cases

| Case | Expected result |
|---|---|
| Selected cold prospect, no reply | CRM migration candidate; excluded from nurture |
| Human acknowledgement only | Engagement history preserved; excluded from nurture |
| Explicit keep-me-updated response, NOT_NOW | Eligible subject to all other gates |
| Autoreply or delivery acknowledgement | Does not create engagement or consent |
| Explicit permission but active Deal | Excluded while active sales continues |
| Opt-out after prior consent | Excluded from all marketing paths |
| Re-import opted-out identity or alias | Suppression remains; no re-enrolment |
| New Newsletter group or Email Campaign | Same suppression decision |
| Unknown consent source or conflicting identity | Excluded; review required |
| Send less than three months ago or four sends in twelve months | Excluded |
| Marketing unsubscribe with legitimate service transaction | Marketing blocked; service contact evaluated separately |

Prove Newsletter and Email Campaign behavior independently; do not assume one unsubscribe link suppresses all routes. If native global suppression is insufficient, hold nurture sending and return one exact deficiency. No custom implementation is authorised merely by discovering a gap.

## 6. Evidence and completion

Return site/environment identification, current versions, installed apps, native field mapping, redacted test results, zero-send proof, suppression behavior, backup/rollback evidence, migration counts and exact unresolved blockers.

Allowed verdicts:
- SETUP CONTRACT PREPARED — document only.
- NON_PRODUCTION_NURTURE_SETUP_PASS — synthetic configuration and acceptance cases proven.
- PRODUCTION_CONFIGURATION_VERIFIED — approved live setup read back.
- PILOT_READY_FOR_SEND_APPROVAL — real cohort eligibility and routing proven; no send yet.

Do not call the environment operational from a document, issue label or merged PR.

Controller checkpoint 2026-10-07:
- PR #1414 merge and #1415 Phase 0 authority verified.
- No current executor claim was found in #1415.
- Frappe Cloud dashboard redirects this browser to login; site inspection is blocked by authentication.
- No direct ERPNext/Postgres/Context service connector or remote laptop tool is exposed in this session.
- Production installation, schema/data writes, outbound configuration and sends remain unperformed.
- Reusable learning: commercial-record admission and marketing admission are separate gates; apply current architecture without weakening consent.
- Durable home: this repo contract and linked #1415/#1252 evidence. Dynamic Context/Learning persistence remains unavailable; no write receipt claimed.
- Next owner: controller resumes read-only site inspection through secure authentication, then existing authorised Frappe operator executes the synthetic setup. Anton is needed only for sign-in and later exact protected actions.
