# Commercial acceptance record

**Rail:** #714 · `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md`  
**Use:** One record per accepted proposal version. Synthetic placeholders only.

<!-- COMMERCIAL_ACCEPTANCE_RECORD_V1 -->

| Field | Value |
|---|---|
| Acceptance record ref | `<ACCEPTANCE_RECORD_REF>` |
| Opportunity ref | `<OPPORTUNITY_REF>` |
| Product | ☐ lead-rescue · ☐ website-rescue |
| Proposal ref | `<PROPOSAL_REF>` |
| Proposal version | `<VERSION>` |
| Accepted scope (summary) | `<SCOPE_SUMMARY>` |
| Accepted exclusions (summary or link) | `<EXCLUSIONS_REF>` |
| Accepted price (setup) | `<SETUP_PRICE>` |
| Accepted recurring (if any) | `<RECURRING_PRICE or n/a>` |
| Accepted currency | `<CURRENCY>` |
| Accepted payment terms | `<PAYMENT_TERMS>` |
| Offer kind | ☐ pilot · ☐ standard |
| Authorised client representative | `<CLIENT_NAME>` |
| Acceptance method | ☐ signed_pdf · ☐ email_confirmation · ☐ whatsapp_confirmation · ☐ in_person_recorded · ☐ other_written |
| Acceptance date/time (ISO) | `<ACCEPTANCE_TIMESTAMP>` |
| Recorded by (operator) | `<OPERATOR_NAME>` |
| Amendments / exceptions | `<NONE or LIST>` |
| Related evidence reference | `<EMAIL_MSG_ID / PDF_PATH_REF / TICKET_REF>` |
| Acceptance status | ☐ accepted · ☐ rejected · ☐ withdrawn |

**Notes (non-classifying):** `<OPTIONAL_NOTE>`

If **rejected**: set opportunity `won_lost_status=lost` and a vocabulary `won_lost_reason` (required). Rejected records **cannot** be financially approved.
