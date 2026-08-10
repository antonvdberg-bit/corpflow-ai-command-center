# Discovery / qualification summary

**Rail:** #714 · `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md`  
**Use:** Capture the outcome of discovery/qualification **before** assembling a proposal. One summary per opportunity. Synthetic placeholders only.  
**Does not:** send email/WhatsApp, create ERPNext records, or redesign Prospect Ops UI (#721).

<!-- DISCOVERY_QUALIFICATION_SUMMARY_V1 -->

---

| Field | Value |
|---|---|
| Qualification summary ref | `<QUAL_SUMMARY_REF>` |
| Opportunity ref | `<OPPORTUNITY_REF>` |
| Prospect ref (if any) | `<PROSPECT_REF or n/a>` |
| Product | ☐ lead-rescue · ☐ website-rescue |
| Qualified by (operator) | `<OPERATOR_NAME>` |
| Qualified at (ISO) | `<QUALIFIED_AT>` |
| Discovery channel | ☐ call · ☐ in_person · ☐ whatsapp · ☐ email · ☐ other |
| Proposal ready? | ☐ yes · ☐ no · ☐ needs_follow_up |

## 1. Business and contact

| Field | Value |
|---|---|
| Business name | `<BUSINESS_NAME>` |
| Primary contact | `<CONTACT_NAME>` |
| Working email | `<EMAIL>` |
| Working WhatsApp / phone | `<CHANNEL>` |
| Region / market | `<REGION>` |
| Decision-maker confirmed? | ☐ yes · ☐ no · ☐ unclear |

## 2. Problem and desired outcome

**Problem today:** `<ONE_OR_TWO_SENTENCES>`  

**Desired outcome:** `<WHAT SUCCESS LOOKS LIKE FOR THE BUYER>`  

**Urgency / timeline:** `<e.g. this month / after peak season / unknown>`

## 3. Product-specific fit notes

### Lead Rescue (if product = lead-rescue)

| Field | Value |
|---|---|
| Primary leaky enquiry source (candidate) | `<website_form / whatsapp / facebook / other>` |
| Current response process | `<HOW THEY HANDLE ENQUIRIES TODAY>` |
| Pilot vs standard lean | ☐ pilot · ☐ standard · ☐ unclear |
| Messaging runtime requested? | ☐ no (default) · ☐ yes (separate authorisation later) |

### Website Rescue (if product = website-rescue)

| Field | Value |
|---|---|
| Case type lean | ☐ upgrade · ☐ rebuild · ☐ one-page · ☐ small-catalogue · ☐ unclear |
| Current site / URL (public only) | `<URL or none>` |
| Content readiness | ☐ client has assets · ☐ needs copy help · ☐ unknown |
| Hosting / DNS sensitivity noted? | ☐ yes · ☐ no |

## 4. Commercial lean (recommendation only)

| Field | Value |
|---|---|
| Recommended offer kind | ☐ pilot · ☐ standard |
| Recommended currency | ☐ USD · ☐ MUR |
| Price band pointer | See `docs/revenue/PRICING_RECOMMENDATION_PACKET.md` — **not** a live commitment |
| Estimated setup (operator note) | `<AMOUNT or band — recommendation>` |
| Payment-term lean | ☐ pilot_full_upfront · ☐ deposit_50_balance_before_production · ☐ other |
| Budget signal | ☐ comfortable · ☐ price-sensitive · ☐ unknown |

## 5. Fit assessment

| Field | Value |
|---|---|
| Fit | ☐ qualified · ☐ not_fit · ☐ needs_more_info |
| Disqualifier (if any) | `<from prospect maturation gates or none>` |
| Scope risks | `<LIST or none>` |
| Next action | ☐ assemble_proposal · ☐ follow_up_discovery · ☐ mark_not_fit · ☐ mark_lost |

## 6. Links (existing systems only)

| Artifact | Opaque ref / path |
|---|---|
| Prospect record | `<PROSPECT_REF>` |
| Discovery notes / call log | `<NOTE_REF>` |
| Related GitHub / CMP ticket | `<TICKET_REF or n/a>` |
| Storage map | `docs/revenue/templates/COMMERCIAL_STORAGE_AND_LINKING.md` |

**Notes (non-classifying):** `<OPTIONAL>`

---

### Gate note

A complete qualification summary is **required for proposal-ready** completeness in this rail. It does **not** by itself authorize financial approval or build. Next step: product proposal template → acceptance → payment evidence → `canMarkFinanciallyApproved`.
