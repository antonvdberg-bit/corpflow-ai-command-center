# Lux #717 — Jan test package (Confidential Presentation)

**Surface:** Lux `corpflow_test` — `https://lux.corpflowai.com`  
**Operator desk:** `https://lux.corpflowai.com/change` → LEADS · LuxeMaurice CRM → **Confidential Presentation**  
**Constraint:** synthetic / fictional data only — no real private client details.

> **Delivery note:** Merge + Production deploy are required before live verification. This package is prepared for Jan feedback after Anton approves merge. Agents do not merge or deploy from this PR alone.

---

## What was delivered (test only this)

**Qualified lead + curated shortlist → confidential presentation packet → Viewing by Invitation readiness.**

1. Submit or select a **synthetic** enquiry (existing `/concierge` path is unchanged).
2. On `/change`, move the lead to **qualified** (or invited).
3. Complete private-client qualification fields (existing panel).
4. Add at least one shortlisted residence (existing Curated Shortlist panel).
5. Open **Confidential Presentation** (below shortlist).
6. Confirm the presentation-readiness checklist updates as you add notes and select **Viewing by Invitation**.
7. Confirm the on-screen draft reads like **Rare & Exclusive** (private, invitation-only) — not a generic property blast.
8. Confirm UI shows **Send disabled — manual only** (no email / WhatsApp / SMS).
9. Use the in-panel Jan test prompt ticks and record what is unclear, missing, or not usable.

Journey label shown in panel:  
`Private Conversation → Confidential Presentation → Viewing by Invitation`

---

## Out of scope for this test (do not expect)

- Live email, WhatsApp, or SMS send  
- Public Lux site redesign  
- Language options  
- Payment, secrets, DNS, or schema changes  
- Client production hosts (this is CorpFlowAI `corpflow_test` only)

---

## Feedback asked of Jan

| Check | Pass / Fail | Notes |
|-------|-------------|-------|
| Presentation panel visible after shortlist | | |
| Checklist uses real lead / qual / shortlist data | | |
| Draft voice feels Rare & Exclusive | | |
| Next action = Viewing by Invitation | | |
| Send remains disabled / manual only | | |
| What is unclear / missing / not usable | | |

---

## Storage note (operators / Anton)

Presentation notes and viewing next-step selection persist in existing `leads.qualification_json.private_client_presentation` — no new DB table or migration.
