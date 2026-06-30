# Mauritius outreach + ERPNext + manual POP operating flow (v1)

**Status:** Docs/operating-packet only. **No runtime, no deploy, no DB/schema, no env/secrets, no payment integration, no automated sends, no external outreach execution, no public launch.**
**Owner:** Anton (operator) — all approvals, all outreach, all payment verification.
**Author:** Cursor (docs).
**Created:** 2026-06-30.
**Operates under:** [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) parallel execution board + the Operator Bridge rules.
**Anchor sentinel:** `<!-- MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1 -->`

<!-- MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1 -->

## 0. Why this packet exists (the adjustment)

Anton confirmed: **international funding / card collection with SBM remains unresolved.**
Therefore CorpFlowAI **does not** have an online card-payment path and must not imply one.

But **Mauritius-first, warm-network outreach can still proceed** using:

- existing CorpFlowAI documentation (the AI Lead Rescue commercial canon + the ERPNext
  documentation set), and
- a **manual proof-of-payment (POP) workflow** — the client pays locally, sends proof, the
  operator verifies funds by hand, and **work starts only after verification.**

This packet **sequences existing canon** into one operating flow. It does not re-invent the
offer, the pro-forma wording, or the ERPNext setup — it points to them and adds the
Mauritius-first POP operating semantics. Where this packet and a canonical doc disagree, the
**canonical doc wins** (see §7).

**Canonical inputs (read alongside; do not duplicate):**

- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — single offer (USD 150 launch pilot), Mauritius-first, warm-network, no-guarantee posture.
- `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` — manual pro-forma template + **verbatim wording W1–W5** + sensitive-data exclusion list.
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` + `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1.md` — outreach copy.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — operator runbook (intake → setup).
- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` + `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` — ERPNext environment (sandbox-first; production-shell is separate and gated).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — offer/claims/CTA rules.

## 1. Mauritius outreach operating flow

### 1.1 Who we can approach

- **Warm-network Mauritius businesses only** — owner-operators reachable through a real
  referral or existing relationship, in the niches already defined in the First Paid Pilots
  pack §2 (property/real-estate first; contractors/trades and clinics/wellness as appointment-
  enquiry follow-up only — never clinical scope).
- **Strong-fit profile** per First Paid Pilots §3.1: 1–20 staff, multi-channel enquiries,
  buyer-language "we lose enquiries" pain, authority to approve a USD 150 invoice.
- **Do NOT approach** (First Paid Pilots §3.2): cold international prospects, cold-scraped
  lists, enterprise procurement cycles, regulated-data verticals needing a signed DPA first,
  or anyone wanting a "full CRM / AI agent / guaranteed leads" — decline the misframed offer.

### 1.2 What offer can be made

- **The single existing offer only:** `AI Lead Rescue Setup — USD 150 launch pilot`
  (48-hour setup target, 7-day pilot monitoring) exactly as the canon states. No new offer,
  no bundle, no discount tier invented here.
- Positioned as a **managed lead-response operating workflow with a human operator** — not a
  chatbot, CRM, or generic AI agent (above-the-line doctrine).

### 1.3 How outreach stays human-approved

- **Every** message is written and sent **manually, 1:1, by Anton** (or an operator Anton
  authorises) from a personal/business inbox or WhatsApp. **No automated send of any kind.**
- No bulk send, no sequence tool, no mail-merge, no auto-WhatsApp, no n8n send. n8n stays
  **notify-only** and is **not** used for outreach in v1.
- Cursor/ChatGPT may **draft** copy from the existing outreach pack; a human reviews and sends.
  A draft is not a send and must never imply contact was made.

### 1.4 What must NOT be promised while SBM international collection is unresolved

These are hard "do-not-say" items until Anton confirms otherwise in writing:

- ❌ Online card payment, "Pay now", instant checkout, hosted-checkout link, or any acquirer
  (Stripe/PayPal/Wise/Peach/SBM gateway) being "live".
- ❌ International card collection working, or any implication a foreign client can pay by card.
- ❌ Same-day / instant payment confirmation (verification is manual — see §3).
- ❌ Any revenue, lead-volume, or conversion-outcome guarantee (verbatim **W4**: *"No revenue,
  lead volume, or conversion outcome is guaranteed."*).
- ❌ A fixed VAT/tax treatment (verbatim **W5**: *"VAT/tax treatment pending accountant
  confirmation."*).
- ✅ What may be said: *payment instructions are sent separately after intake approval*
  (verbatim **W1**), and *setup begins after payment confirmation* (verbatim **W2/W3**).

## 2. ERPNext basic setup documentation (minimum to run a Mauritius pilot)

This is the **minimum** ERPNext configuration to track a pilot from lead to paid. Use the
**sandbox** environment first (`ERPNEXT_SANDBOX_PLAN_V1.md`); the production shell is a
separate, gated packet and is **not** authorised here. **No real banking details, SWIFT/IBAN,
payment links, or KYC data are entered into any repo-committed artifact** (pro-forma template
§0 exclusion list applies).

### 2.1 Leads / customers

- **Lead** (optional) → **Customer** record: business legal name, contact person, email,
  WhatsApp/phone, country = Mauritius, referral source, niche.
- Keep it minimal: only the fields needed to invoice and deliver. No PHI, no patient data, no
  card/bank-instrument data on the customer record.

### 2.2 Items / services

- One **Item** (service, non-stock): `AI Lead Rescue Setup — Launch Pilot`, rate USD 150
  (record the MUR equivalent in notes if invoicing in MUR locally — confirm currency with the
  accountant).
- Optionally a second placeholder Item for future monthly monitoring — **not sold yet**, kept
  inactive until separately authorised.

### 2.3 Quotations / invoices (pro-forma first)

- Issue a **pro-forma / quotation** from the manual template
  (`AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md`) — verbatim **W1–W5** must appear.
- Convert to a **Sales Invoice** in ERPNext for record-keeping. Payment instructions are sent
  **separately** (W1) — never embedded as a live payment link.

### 2.4 Payment status tracking

- Track each pilot through a simple status: `Lead → Intake approved → Pro-forma issued →
  POP received → POP verified → Paid → Setup started → Pilot monitoring → Closed`.
- ERPNext payment status moves to **Paid only after the operator manually verifies funds**
  (§3). Do not mark Paid on POP receipt alone.

### 2.5 Notes / evidence fields

- A notes/attachment field per customer/invoice for: referral context, intake summary, POP
  reference (see §3), verification note, and setup-completion note.
- **No sensitive data**: no full bank statements with account numbers, no card data, no
  KYC-grade personal data committed to the repo. Evidence is retained per §3.5.

### 2.6 Operator checklist (per pilot)

- [ ] Customer record created (minimal fields).
- [ ] Service Item selected (`AI Lead Rescue Setup — Launch Pilot`).
- [ ] Pro-forma issued with verbatim W1–W5.
- [ ] Payment instructions sent **separately** (not a live link).
- [ ] POP received and logged (reference only).
- [ ] Funds **manually verified** before any work.
- [ ] ERPNext status → Paid; Sales Invoice updated.
- [ ] Setup started only after verification; completion noted.
- [ ] Evidence retained safely (§3.5); nothing sensitive committed to the repo.

## 3. POP / proof-of-payment workflow

The core control: **no work starts until funds are verified by a human.**

1. **Invoice issued** — operator issues the pro-forma/quotation (verbatim W1–W5); payment
   instructions are sent **separately** after intake approval (W1).
2. **Client sends proof of payment** — bank transfer confirmation / deposit slip / screenshot.
   This is **proof of a claim**, not proof of cleared funds.
3. **Operator verifies funds / POP manually** — Anton confirms the money is actually
   received/cleared in the CorpFlowAI account (bank app / statement), independent of the
   client's screenshot. A POP screenshot alone is **never** sufficient.
4. **Service start approved only after verification** — setup work (W2/W3: *begins after
   payment confirmation*) starts **only** once step 3 passes. Until then, status stays
   `POP received` (not `Paid`).
5. **Record updated in ERPNext** — mark the Sales Invoice Paid, set status to `Setup started`,
   and add the verification note (date verified, method, who verified — no account numbers).
6. **Evidence retained safely** — POP and verification evidence are kept **outside the repo**
   in the operator's controlled storage. **No bank account numbers, SWIFT/IBAN, card data, or
   client KYC documents are committed to this repository** (pro-forma §0 exclusion list).

### 3.1 Anti-fraud minimum (manual)

- Verify the **amount** and **sender** match the invoice and the agreed payer.
- Treat **reversible** methods with caution; prefer confirmation of cleared funds.
- If anything is ambiguous, **hold** — do not start work; ask Anton.

## 4. Roles and gates

| Actor | May do | Must NOT do |
|---|---|---|
| **Anton / operator** | Approve who to approach; approve each outreach message; send 1:1 manually; verify funds/POP; approve service start; update ERPNext; merge PRs. | Delegate payment verification to a tool; mark Paid on screenshot alone; promise card/online payment. |
| **Cursor** | Draft docs/copy; open docs-only PRs; maintain this packet + cross-links. | Send outreach; own a merge; write ERPNext production; touch runtime/secrets/DB. |
| **ChatGPT (operator chat)** | Help Anton draft/decide; relay decisions to #249. | Execute sends; authorise payment; change business state. |
| **Codex** | Bounded research/review only (e.g., prospect audits) returned transfer-safe; lands via a Cursor import PR. | Own PRs; write the Sheet/ERPNext; send; set approval/payment fields. |

### 4.1 Approval points (Anton-only gates)

- Who to approach → **Anton approves.**
- Each outreach message → **Anton approves + sends.**
- Funds/POP verification → **Anton verifies manually.**
- Service start → **Anton approves after verification.**

### 4.2 What stays manual (v1)

- Outreach send, payment collection, POP verification, service-start decision, ERPNext data
  entry, evidence retention. All human, all 1:1.

### 4.3 What must NOT be automated yet

- No automated outreach (email/WhatsApp/SMS), no payment integration/gateway, no auto-status
  changes from POP, no n8n send, no CRM auto-sequences, no AI-to-AI loops. n8n stays
  notify-only and is not wired into this flow in v1.

## 5. Boundaries

- No runtime code. No production deploy. No DB/schema changes. No env/secrets.
- No payment integration / gateway / live checkout / card collection.
- No automated email/WhatsApp/SMS sends. No external outreach execution by any tool.
- No client-facing public launch. No paid tools/vendors. No second app/second database.
- One production app, one Postgres via `POSTGRES_URL` — unchanged.
- No real banking details, SWIFT/IBAN, payment links, or KYC data in the repo.
- No revenue/lead-volume/conversion guarantees. No "online/card payment is live" claims.
- SBM **international** collection remains **unresolved**; this packet does not change that and
  does not imply it is resolved.
- Cursor does not self-merge; Anton owns the merge.

## 6. Relationship to the US Medspa lane

- **No conflict.** US Medspa is US-prospect research/audit pipeline (human-approved outreach,
  research via Codex). This packet is **Mauritius warm-network + local POP collection**.
- They are **different geographies, different payment realities, and different pipelines.**
  This adjustment does not pause, redirect, or alter the US Medspa lane; it adds a parallel,
  lower-payment-risk Mauritius lane that can collect locally while SBM international remains
  unresolved.

## 7. Source-of-truth order

Canonical repo docs + `.cursor/rules/*` > #249 decisions > this packet. If this packet
conflicts with the First Paid Pilots pack, the manual pro-forma template (esp. W1–W5 and the
§0 exclusion list), or the brand/conversion doctrine, **the canonical doc wins** — update the
canonical doc first, then this packet.

## 8. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/operating-packet only.
- **Implementation:** none. No runtime, no env, no secrets, no DB, no payment integration, no
  automated sends, no second app/database. ERPNext steps are sandbox-first and operator-run.
- **Verdict:** PARTIAL by design — the Mauritius-first POP operating flow is documented; every
  outreach, payment verification, and service-start action remains a manual, Anton-gated step.

## 9. Cross-references

- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — commercial playbook (single offer, Mauritius-first).
- `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` — pro-forma template + verbatim W1–W5 + §0 exclusions.
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md`, `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1.md` — outreach copy.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — operator runbook.
- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md`, `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` — ERPNext environment (sandbox-first; production gated).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — offer/claims/CTA rules.
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md` — workstream priorities (SBM banking P0/Blocked; this lane proceeds locally).
