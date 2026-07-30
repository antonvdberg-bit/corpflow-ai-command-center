# CIPC Desk — research packet v1

**Status:** `REFERENCE-ONLY` / `CANDIDATE-CAPTURED` / **`NO IMPLEMENTATION AUTHORIZED`**  
**Date:** 2026-07-30  
**Related:** GitHub issue #640 · tenant `cipc-desk` · corpflow_test hosts `cipc.corpflowai.com` / `cipc-desk.corpflowai.com`  
**Audience:** Anton (gate), Serah (subject-matter), Cursor/ChatGPT (ops framing)

This packet informs brand, positioning, and route design. It does **not** authorize domain purchase, paid tools, production launch, payments, live email/WhatsApp/SMS, or use of real CIPC client data.

---

## 1. Brand / domain options (beyond provisional “CIPC Desk”)

Provisional name stays **CIPC Desk** until Serah + Anton choose. Short options to evaluate (availability not checked here — do not purchase without Anton approval):

| Working name | Domain sketch | Notes |
|--------------|---------------|--------|
| CIPC Desk | `cipcdesk.co.za` / `cipcdesk.com` | Clear; “CIPC” may imply affiliation — disclaimer required |
| Filing Desk SA | `filingdesk.co.za` | Descriptive; less CIPC-trademark tension |
| Company Desk SA | `companydesk.co.za` | Broad; may dilute CIPC focus |
| Statute Desk | `statutedesk.co.za` | Professional tone; may feel legalistic |
| Return & File | `returnandfile.co.za` | SME-friendly; weaker partner-channel signal |
| Serah CIPC Desk | `serahcipc.co.za` | Personal brand; good for trust, weaker scale signal |

**Recommendation:** keep **CIPC Desk** on CorpFlow hosts for corpflow_test; decide commercial brand only after Serah validates catalogue + disclaimers. Prefer a name that does **not** claim to be CIPC.

---

## 2. Competitor positioning and public pricing language

Public market (South Africa, observed 2025–2026 language; fees change — treat as orientation only):

| Channel | Positioning language | Price signals (public) |
|---------|----------------------|------------------------|
| **BizPortal / CIPC direct** | DIY government portal | Official Pty Ltd fees often cited ~R125–R175 (+ name reservation ~R50) |
| **Volume online registrars** (e.g. Govchain, SwiftReg-class, Uminathi-class) | “Register online”, packages, SARS/BEE add-ons, speed claims | Bundled packages commonly marketed ~R450–R1,550 once-off |
| **Accountant / CS firms** | Compliance retainer, annual returns, director changes | Often quote-led; less public menu pricing |
| **“Accredited” marketing** | “CIPC accredited” claims appear in ads | Always verify; CorpFlowAI must **not** claim CIPC accreditation unless Serah confirms a real status |

**Positioning implication for CIPC Desk**

- Do **not** compete primarily on “cheapest Pty registration” against volume portals.
- Compete on **remote reliability**, **partner desk**, **email-first clarity**, and **managed follow-through** (above the commodity line).
- Separate **government fees** (pass-through / disclosed) from **professional service fee** (Serah sets).
- Avoid guaranteed turnaround and “CIPC official” wording.

---

## 3. Direct-SME vs professional-partner routes

| | Direct SME | Professional partner |
|--|------------|----------------------|
| Buyer | Owner / director | Accountant, tax practitioner, CS / firm |
| Trigger | One-off matter (reg, director, address, returns) | Recurring client-matter pipeline |
| Intake | Matter + identifiers + deadline | Firm contact + client matter pack + billing who |
| Pricing posture | Transactional quote | Partner rate / volume desk (later) |
| Risk | Expects “done for me” | Expects predictable handoff + status |
| Shared OS | Same catalogue, checklist, `/change`, email drafts | Same |

**Operating rule (v1):** one shared desk; route is a field on the matter, not a second product.

---

## 4. Reusable free / open-source components (safe reuse)

Already reusable inside CorpFlowAI (preferred — no new vendors):

| Capability | Existing pattern | CIPC Desk use |
|------------|------------------|---------------|
| Tenant host routing | `host-tenant-context`, `tenant_hostnames` | `cipc*` → `cipc-desk` |
| Lead capture | `/api/tenant/intake` | Enquiry with `meta.client_route` |
| Operator control plane | `/change` + CMP tickets | Serah queue, checklist, reply draft |
| Client guided steps | `/client/change-decisions` magic link | Status + decisions |
| Email-first interpret | `/api/cipc-desk/email-intake` | Fictional inbound paste → ticket |
| Catalogue constants | `lib/server/cipc-desk-catalogue.js` | Landing + mailto builders |

External OSS / free tools **candidates only** (evaluate later — **NO IMPLEMENTATION AUTHORIZED**):

- Template / checklist packs for company secretarial workflows (document lists only).
- Open PDF form fillers for client packs (never store real CIPC credentials in third-party SaaS without security review).
- Self-hosted form spam protection only if needed; prefer existing intake.

Do **not** add Chatwoot / Open WebUI / Coolify / generic chatbot stacks for this slice.

---

## 5. Conflict-of-interest safeguards (external launch)

Before any external (non-test) client is served:

1. **Affiliation disclaimer** on every public surface: CorpFlowAI / CIPC Desk is not CIPC and not a law firm.
2. **No accreditation claim** unless Serah documents a real, current status.
3. **Family / owner venture transparency** to Anton for commercial conflicts with other CorpFlow clients.
4. **Partner channel firewall:** if a partner refers clients, define whether Serah may solicit that partner’s end-clients directly.
5. **Data boundary:** fictional/test data on corpflow_test; real client/CIPC data requires Anton approval + security review.
6. **No live outreach automation** until Anton unlocks messaging gates.
7. **Quote language:** never promise government outcomes CorpFlow cannot control.

---

## 6. Reuse inventory (CorpFlow / Lux — safe vs avoid)

| Pattern | Reuse? | Note |
|---------|--------|------|
| Dedicated host landing component (Lead Rescue style) | **Yes** | `CipcDeskLanding` |
| `/api/tenant/intake` + meta | **Yes** | No schema change |
| `/change` operator panels | **Yes** | Already CIPC-specific panel |
| Magic-link client decisions | **Yes** | Prefer standing host base URL |
| Lux HNW budget/region enquire form | **No** | Wrong buyer |
| Lux ivory / property media | **No** | Wrong brand |
| Lead Rescue payment / Telegram expansion | **No** | Out of scope |
| Preview-only ceremony as delivery proof | **No** | Standing corpflow_test URL is the evidence surface |

---

## 7. Explicit non-actions

- No domain purchase or DNS change from this packet alone  
- No DB/schema migration  
- No env/secrets change  
- No payment activation  
- No live email / WhatsApp / SMS / external outreach  
- No claim of COMPLETE for client_production  

**NO IMPLEMENTATION AUTHORIZED** for new vendors, domains, or messaging channels.
