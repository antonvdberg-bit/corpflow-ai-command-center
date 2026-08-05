# Lux — Jan test package (Purchase Readiness)

**Surface:** Lux `corpflow_test` — `https://lux.corpflowai.com`  
**Operator desk:** `https://lux.corpflowai.com/change` → LEADS · LuxeMaurice CRM → **Purchase Readiness** (after Viewing by Invitation)  
**Constraint:** synthetic / fictional data only — no real private client details.

> **Delivery note:** Merge + Production deploy are required before live verification. This package is prepared for Jan feedback after Anton approves merge. Agents do not merge or deploy from this PR alone.

---

## What was delivered (test only this)

**Viewing by Invitation lead → Purchase Readiness → Private Purchase Discussion draft → manual next step.**

1. Select a lead that has reached **Viewing by Invitation**.
2. Confirm the viewing details are present.
3. Capture the **viewing outcome**.
4. Select **buyer intent / purchase readiness**.
5. Add **next manual action**.
6. Review the **Private Purchase Discussion** draft.
7. Confirm it feels **Rare & Exclusive** and suitable for a private client.
8. Confirm UI shows **Send disabled — manual only** (no email / WhatsApp / SMS / payment / contract).
9. Use the in-panel Jan test prompt ticks and record what is unclear, missing, or not usable.

Buyer journey shown in panel:  
`Discover → Express Interest → Private Conversation → Confidential Presentation → Viewing by Invitation → Purchase`

Current step label:  
`Viewing by Invitation → Purchase`

---

## Out of scope for this test (do not expect)

- Live email, WhatsApp, or SMS send  
- Payment, contract, conveyancing, banking, tax, immigration, KYC/AML, or legal workflow  
- Calendar booking integration  
- Public Lux site redesign  
- Language options  
- Secrets, DNS, or schema changes  
- Client production hosts (this is CorpFlowAI `corpflow_test` only)

---

## Feedback asked of Jan

| Check | Pass / Fail | Notes |
|-------|-------------|-------|
| Purchase Readiness panel visible after Viewing by Invitation | | |
| Checklist uses lead / viewing / shortlist / presentation data | | |
| Viewing outcome + readiness + next action can be captured | | |
| Draft voice feels Rare & Exclusive / private-client suitable | | |
| Draft does **not** sound like a generic sales email or payment ask | | |
| Send remains disabled / manual only | | |
| What is unclear / missing / not usable | | |

---

## Storage note (operators / Anton)

Purchase readiness fields persist in existing `leads.qualification_json.private_client_purchase_readiness` — no new DB table or migration.
