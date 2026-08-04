# Lux #752 — Jan test package (Viewing by Invitation)

**Surface:** Lux `corpflow_test` — `https://lux.corpflowai.com`  
**Operator desk:** `https://lux.corpflowai.com/change` → LEADS · LuxeMaurice CRM → **Viewing by Invitation** (after Confidential Presentation)  
**Constraint:** synthetic / fictional data only — no real private client details.

> **Delivery note:** Merge + Production deploy are required before live verification. This package is prepared for Jan feedback after Anton approves merge. Agents do not merge or deploy from this PR alone.

---

## What was delivered (test only this)

**Qualified / shortlisted lead + Confidential Presentation → Viewing by Invitation draft → manual invitation readiness.**

1. Select a **synthetic** qualified/shortlisted test lead.
2. Confirm **Confidential Presentation** is present (notes and/or Viewing by Invitation next step).
3. Move the lead to **invited** (or leave invitation-ready via Confidential Presentation next step).
4. Open **Viewing by Invitation** (below Confidential Presentation).
5. Add or review viewing format, proposed date/time, and access/concierge notes.
6. Review the on-screen invitation draft.
7. Confirm it feels **private, selective, and Rare & Exclusive** — not an open house or generic property email.
8. Confirm UI shows **Send disabled — manual only** (no email / WhatsApp / SMS).
9. Use the in-panel Jan test prompt ticks and record what is unclear, missing, or not usable.

Buyer journey shown in panel:  
`Discover → Express Interest → Private Conversation → Confidential Presentation → Viewing by Invitation → Purchase`

Current step label:  
`Confidential Presentation → Viewing by Invitation → Purchase`

---

## Out of scope for this test (do not expect)

- Live email, WhatsApp, or SMS send  
- Calendar booking integration  
- Public Lux site redesign  
- Language options  
- Payment, secrets, DNS, or schema changes  
- Client production hosts (this is CorpFlowAI `corpflow_test` only)

---

## Feedback asked of Jan

| Check | Pass / Fail | Notes |
|-------|-------------|-------|
| Viewing by Invitation panel visible after Confidential Presentation | | |
| Checklist uses real lead / qual / shortlist / presentation data | | |
| Draft voice feels Rare & Exclusive / invitation-only | | |
| Proposed date/time + access notes can be captured | | |
| Send remains disabled / manual only | | |
| What is unclear / missing / not usable | | |

---

## Storage note (operators / Anton)

Viewing format, proposed date/time, and access/concierge notes persist in existing `leads.qualification_json.private_client_viewing` — no new DB table or migration.
