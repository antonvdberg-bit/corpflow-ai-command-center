# Rare & Exclusive — Visual Communication Pack for Jan (v1)

**Audience:** Jan du Plessis (Rare & Exclusive / LuxeMaurice)  
**Owner for delivery:** Anton  
**Alignment anchor:** GitHub issue [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773) — centralized CorpFlowAI **Core / Tenant** application  
**Visual pack (open in browser):** `artifacts/lux-jan-visual-comm-pack-v1/index.html`  
**Status:** Communication concepts — **`NO IMPLEMENTATION AUTHORIZED`** from this document alone  

---

## Why this pack exists

Jan is visually driven and impatient. Long specifications and piecemeal workflow testing are no longer the preferred communication mode.

This pack shifts to:

1. **Process visuals**
2. **Screen mockup visuals**
3. **Short supporting text** (this document)

Anton can walk Jan through the HTML pack screen-by-screen without a long verbal brief.

---

## One-sentence summary

**Public website brings the right enquiry in; Private Client Desk keeps the client informed privately; Admin / Application Layer is how the team runs follow-up and invitations — all on one CorpFlowAI platform, branded Rare & Exclusive.**

---

## A. Process: three layers

| Layer | What it is (business language) | What it is *not* |
|-------|--------------------------------|------------------|
| **1. Public Website** | First impression; curated opportunities; request private access | A mass listings portal |
| **2. Private Client Desk** | Invitation-only space for active clients: status, next step, private materials | Engineering tickets, GitHub, CI, internal debates |
| **3. Admin / Application Layer** | Where the team qualifies, schedules next actions, prepares invitations, tracks deal progress | A second CRM or second database |

### How this maps to #773 (for Anton / operators)

| Pack language | CorpFlowAI application direction (#773) |
|---------------|------------------------------------------|
| Public Website | **Tenant** public marketing surface |
| Private Client Desk | **Tenant** operating environment — client-safe progress / desk (direction in #773) |
| Admin / Application Layer | **Tenant** operator tools + **Core** (CorpFlow builds, manages, releases) — same auth, same Postgres |

Lux remains a **tenant-specific expression** of the shared platform. This pack does **not** invent a one-off Lux architecture.

Standalone diagram: `artifacts/lux-jan-visual-comm-pack-v1/visuals/process-layers.svg`

---

## B. Business flow: five steps

| Step | Name | Plain meaning |
|------|------|---------------|
| 01 | **New Enquiry** | Website / concierge captures name, email, telephone, intent |
| 02 | **Client Review / Active Client** | Qualify; shortlist; stage advances (new → contacted → qualified) |
| 03 | **Next Action** | Clear owner and due moment — call, prepare pack, invite |
| 04 | **Private Draft / Invitation** | Confidential presentation or viewing invitation drafted on the desk |
| 05 | **Viewing / Deal Progress** | Invitation-only viewing, then forward progress toward decision |

This is the **same journey** already exercised in pieces on the Lux test desk (concierge → CRM stages → qualification / shortlist → confidential presentation → viewing by invitation). The pack shows it as **one path**, not five separate product pitches.

Standalone diagram: `artifacts/lux-jan-visual-comm-pack-v1/visuals/business-flow.svg`

---

## C. Screen concepts (what Jan sees in the pack)

| # | Screen | What to say in one line |
|---|--------|-------------------------|
| 1 | **Enquiry intake** | “This is how interest arrives — quiet, private access, email + phone.” |
| 2 | **Private Client Desk** | “This is how a serious client stays informed — status and next step only.” |
| 3 | **Client detail / status** | “This is one client at a glance for the team.” |
| 4 | **Next action / follow-up** | “This is the daily list so nothing sits still.” |
| 5 | **Private invitation / draft** | “This is the selective draft — send stays manual until we enable messaging on purpose.” |

Synthetic names only (e.g. A. Moreau). No real client data.

---

## What Jan should review first

1. **Three layers** — Does Public → Private Desk → Admin match how he wants the business to run?  
2. **Business flow** — Does Enquiry → Review → Next Action → Invitation → Viewing feel right?  
3. **Private Client Desk** mockup — Quiet, private, next-step clear?  
4. **Next Action** mockup — Useful day to day?  
5. **Invitation draft** — Tone feel Rare & Exclusive (not open-house / portal)?

Ask Jan for: **Approve / Amend / Reject** per item + **one priority** for the next build slice.

---

## How Lux aligns with broader GTM / application direction

- **GTM / product posture:** Rare & Exclusive is the luxury private-advisory wedge; CorpFlowAI remains the operating platform (not a generic property portal or a bolted-on second CRM).  
- **#773:** One authentication foundation, one production app, one Postgres; Core vs Tenant scopes differ in navigation and density — Lux uses Tenant scope with Rare & Exclusive branding.  
- **Already shipped pieces (corpflow_test):** public surfaces, concierge enquiry, operator CRM on `/change`, qualification, shortlist, confidential presentation, viewing-by-invitation drafts (manual send).  
- **This pack:** Communication and alignment only. It does not authorize schema, secrets, payments, live messaging, or production deploy.

Related internal references (operators, not for Jan):

- `docs/LUX/LUXEMAURICE_REPOSITIONING_2026_06_11.md`
- `docs/LUX/LUX_PHASE3_FIRST_CRM_SLICE.md`
- Issue #773 audit packet (route/capability matrix) when merged / accepted

---

## Explicit non-actions

- Do not treat mockups as final UI chrome or merge-ready product screens.  
- Do not create a second app, second database, or Lux-only architecture that contradicts #773.  
- Do not deploy production changes from this pack.  
- Do not enable email / WhatsApp / SMS send, payments, DNS, or schema from this pack.  
- Do not use real private client data in demos.

---

## Success criteria (this pack)

| Criterion | Met when |
|-----------|----------|
| Jan understands the operating model from visuals | He can explain the three layers without a long brief |
| Anton can communicate without long text | Walkthrough uses `index.html` + this short guide |
| Lux stays aligned | Conversation stays on shared Core/Tenant direction (#773) |
| Clear next review | Jan marks Approve / Amend / Reject on the five review points |

---

## Delivery Reality note

```text
Delivery Reality Audit:
- Local fix exists: YES (docs + visual artifacts)
- Merged to main: pending PR
- Production deployment ID: n/a — communication pack only
- Commit deployed: n/a
- Live URLs tested: n/a for new product surface
- Expected vs actual result: Anton can open index.html and brief Jan visually
- Client-facing flow usable: N/A (concepts; not a shipped client product change)
- Final verdict: PARTIAL (pack complete for review; no runtime product slice claimed)
```
