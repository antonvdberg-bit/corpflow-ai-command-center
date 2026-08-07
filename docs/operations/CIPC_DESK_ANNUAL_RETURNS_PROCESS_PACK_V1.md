# CIPC Desk — Annual Returns Process Pack v1

**Status:** Specialist-approved v1 boundaries applied 2026-08-07 (**#791**). Research/validation basis: **#750** / PR **#758**; test-site surface: **#761** / PR **#763**. Parent coordination **#640**.  
**Tenant / working name:** `cipc-desk` / **CIPC Desk** (internal working name only — not final public brand; brand work tracks **#751**).  
**Subject-matter owner:** Sarah Fourie.  
**Evidence date of official-source review:** 2026-08-05.  
**Sarah v1 decisions recorded:** 2026-08-07.  
**Scope of this pack:** Operating documentation for the Annual Returns v1 service boundaries and the standing corpflow_test review page. Does **not** authorise public launch, CIPC submission automation, schema/env/secrets changes, CRM, payment, or email-send runtime.

<!-- CIPC_DESK_ANNUAL_RETURNS_PROCESS_PACK_V1 -->

---

## How to read this pack

Every substantive statement is tagged so operators and reviewers can see the confidence level:

| Tag | Meaning |
|-----|---------|
| **OFFICIAL** | Stated on current CIPC public material cited below. |
| **PRACTICAL** | Operating recommendation grounded in Sarah’s confirmed direction (#740 / #791) and ordinary CIPC Desk handling — not a substitute for statute. |
| **SARAH-APPROVED (v1)** | Explicitly decided by Sarah Fourie on 2026-08-07 (#791). Treat as the v1 service boundary. |
| **PROVISIONAL** | Reasonable working assumption until a newer CIPC notice supersedes it or Sarah expands scope. |
| **LATER PHASE** | Explicitly out of v1 standard service; may return in a later pack. |

**Non-affiliation (PRACTICAL / Sarah-confirmed brand posture):** CIPC Desk is an independent support service. It is **not** CIPC, is **not** endorsed by CIPC, and must never imply official affiliation.

**Guarantee ban (Sarah-confirmed):** Never guarantee CIPC turnaround times, approval dates, processing periods, or successful filing outcomes. Any estimate must stay subject to CIPC processing times, system availability, submission quality, additional-information requests, and manual review.

**Data rule:** This pack uses **no real client or company data**, no identity-document images, and no private filings.

---

## Sarah-approved v1 decisions (2026-08-07)

Recorded from Sarah Fourie’s final Annual Returns v1 reply and applied under **#791**:

1. **Customer-code model — SARAH-APPROVED (v1):** Support both models. **Default** to the client’s own CIPC customer code unless the client authorises an authorised practitioner code.
2. **Standard service scope — SARAH-APPROVED (v1):** The standard Annual Returns service includes **Annual Return filing only**. Beneficial Ownership (BO) and AFS/FAS prerequisites are **identified and referred** to the client for completion, or quoted separately — they are not automatic inclusions in the standard AR service.
3. **Authority before filing — SARAH-APPROVED (v1):** Require a **signed engagement/mandate** confirming authority to act **before** filing.
4. **FAS / AFS boundary — SARAH-APPROVED (v1):** **Check whether** FAS/AFS requirements are met only. **Do not prepare FAS.** Refer accounting matters to an accountant.
5. **Entity scope — SARAH-APPROVED (v1):** Private companies (**(Pty) Ltd**) and **close corporations** only. NPCs and other entity types are **later-phase**, not v1 standard service.
6. **Dormant / non-trading wording — SARAH-APPROVED (v1):** Use exactly:  
   `Even if your company is dormant or not trading, Annual Return filing and other statutory obligations may still apply.`
7. **Pricing — SARAH-APPROVED (v1):** Keep **all** service-fee / pricing wording out until the commercial pricing model is approved. Do not invent rand amounts or Desk fee tables.
8. **Annual Compliance Checklist — SARAH-APPROVED (v1):** The **client completes and takes ownership** of Annual Compliance Checklists. Not part of the standard Annual Returns service.

No further Annual Returns v1 clarification is required from Sarah unless implementation reveals a genuinely new ambiguity.

---

## Source list (official)

Reviewed for the research draft (public CIPC / CIPC-hosted material only):

1. **CIPC Annual Return Filing System** — https://annualreturns.cipc.co.za/  
   Public workflow: login/register → enterprise number + turnover → BO filing → AFS upload or FAS → file and pay Annual Returns → save proof of filing.
2. **CIPC Step-by-Step Guide: Calculating Annual Returns and Filing Annual Returns** (v4.0, on Annual Returns portal) — https://annualreturns.cipc.co.za/docs/Step_by_step_guide_AR_v2_2.pdf  
   Also listed from the Step-by-Step Guides hub: https://www.cipc.co.za/?page_id=4447
3. **CIPC Beneficial Ownership information page** — https://www.cipc.co.za/?page_id=16055  
   Includes BO hard-stop language from 1 July 2024 and anniversary filing window wording.
4. **CIPC notice: Mandatory submission of financials when filing Annual Returns (“Hard-stop”)** — https://www.cipc.co.za/?p=14837  
   FAS or AFS together with Annual Returns from 4 March 2019 (Section 30 Companies Act).
5. **CIPC notice: Preparation and approval of annual financial statements** — https://www.cipc.co.za/?p=20882  
   Section 30(1) preparation/approval within six months after financial year-end; audit / independent-review / exemption distinctions.
6. **CIPC Service Standards / turnaround and escalation** — https://www.cipc.co.za/?page_id=4635  
   Lists Company and Close Corporation Annual Returns service turnaround as **Immediate**, with separate enquiry escalation contacts. **Do not present CIPC’s published turnaround as a CIPC Desk promise.**
7. **CIPC Step-by-Step Guides hub** — https://www.cipc.co.za/?page_id=4447  
   BO filing variants, XBRL / AFS manuals, mandate / securities-register materials, Annual Returns guides.
8. **CIPC notice: Non-Compliance with submission of the annual compliance checklist** — https://www.cipc.co.za/?p=24055  
   Compliance Checklist is a **related but separate** annual obligation for listed company categories — not the same as the Annual Return itself.
9. **CIPC FAQs hub** — https://www.cipc.co.za/?page_id=4160  
   Includes Annual Returns FAQ entry point (accordion content may load dynamically; operators should open the live FAQ when answering client questions).
10. **CIPC eServices catalogue** (login surface) — https://eservices.cipc.co.za/  
    Service catalogue context for Annual Returns among other e-Services.

**Primary statute references named in official CIPC material (not reproduced in full here):** Companies Act 71 of 2008 (esp. Sections 30 and 33); Companies Regulations 2011 (esp. Regulations 28–30 where AFS/FAS routing is discussed in CIPC guidance).

**Out of scope for citation strength:** Third-party blogs, accountants’ marketing pages, and unpaid secondary summaries. They may be used only as discovery pointers, never as authority.

---

## Official process backbone (confirmed from CIPC)

**OFFICIAL — who must file.** CIPC’s Annual Return Filing System states that **all companies and close corporations** must file Annual Returns with CIPC within a certain period each year. CIPC uses the filing to keep registry information current and to assess whether the entity is conducting business activities.

**OFFICIAL — public filing sequence** (Annual Returns portal home + step-by-step guide):

1. Customer login / registration (valid CIPC customer code).
2. Enter enterprise number; validate entity; enter turnover; calculate outstanding Annual Return fee.
3. Beneficial Ownership (BO) filing — system will not allow continuation if BO is not up to date for the filing year.
4. Upload AFS via iXBRL **or** submit FAS, as applicable for that entity/year.
5. File and pay the Annual Return.
6. Print/save the Annual Return filing confirmation and certificate as proof of filing (also emailed to the customer-code email; re-print available in e-Services).

**OFFICIAL — BO dependency.** CIPC BO page: from **1 July 2024**, a hard-stop requires companies and close corporations to submit Beneficial Ownership Declarations alongside Annual Returns. Entities that are BO non-compliant cannot finalise Annual Return submission. BO Register applies to corporate entities registered with CIPC **except co-operatives**. Newly incorporated entities must file BO within **10 business days** of incorporation; amendments within **10 business days** of BO changes.

**OFFICIAL — AFS / FAS dependency.** From **4 March 2019**, customers must file FAS or AFS together with Annual Returns (CIPC hard-stop notice; Section 30). The step-by-step guide states continuation is available only when BO and AFS/FAS are up to date for that Annual Return filing year. Where AFS were submitted, turnover on the Annual Return is validated against revenue in the AFS (ignore decimals; mismatch requires AFS review).

**OFFICIAL — timing language to handle carefully.** The BO information page states entities must file Annual Returns, BO declarations, and a securities register and/or beneficial interest register each year within **30 business days following the anniversary date of incorporation**. CIPC Service Standards list the Annual Returns **service** turnaround as **Immediate**, while BO / FAS / AFS enquiries are administered by other CIPC units. **CIPC Desk must not convert those into client guarantees.**

**OFFICIAL — proof of filing.** After filing, save/print the confirmation and certificate. Certificates are emailed to the customer-code profile email; re-print is available under e-Services.

**OFFICIAL — related but separate / SARAH-APPROVED (v1) ownership:** Annual Compliance Checklist obligations (CIPC notice for Inc., (Pty) Ltd, Ltd, SOC, NPC categories) are **not** identical to Annual Return filing. **The client completes and takes ownership of Annual Compliance Checklists.** Checklist work is outside the standard Annual Returns service.

---

# Layer 1 — Customer explanation

*Audience: client or referring professional. Plain English. Not legal advice.*

### What an Annual Return is

**OFFICIAL / plain-English paraphrase:** An Annual Return is a yearly filing with CIPC that confirms your company or close corporation still exists on the register and updates key information CIPC uses to keep the public company record current. It is **not** a SARS tax return.

### Who this v1 service is for

**SARAH-APPROVED (v1):** Standard Annual Returns service is for **private companies ((Pty) Ltd)** and **close corporations** only. NPCs and other entity types are later-phase and must not be presented as v1 standard service.

### Dormant / non-trading entities

**SARAH-APPROVED (v1) client wording (use this sentence):**

> Even if your company is dormant or not trading, Annual Return filing and other statutory obligations may still apply.

### What the CIPC Desk Annual Returns service covers

**SARAH-APPROVED (v1) / PRACTICAL:**

- Helping the client understand what CIPC requires for the Annual Return cycle for a private company or close corporation.
- Collecting the facts and supporting items needed for a complete **Annual Return filing** attempt.
- **Identifying** whether Beneficial Ownership and AFS/FAS prerequisites appear complete; if not, **referring** the client to complete them (or quoting that work separately).
- Checking whether FAS/AFS requirements appear met — **without preparing FAS** and without preparing AFS.
- Preparing and submitting the **Annual Return** through CIPC e-Services / the Annual Returns system **when a signed engagement/mandate and required information are complete**.
- Defaulting to the **client’s own CIPC customer code**, unless the client authorises an authorised practitioner code.
- Capturing proof of filing (confirmation / certificate) and telling the client what was filed.
- Escalating to specialist review when the matter is outside a standard filing.

### What the service does *not* include (v1)

**SARAH-APPROVED (v1):**

- Beneficial Ownership filing as an automatic part of the standard Annual Returns service (identify + refer, or quote separately).
- Preparing FAS, preparing AFS, performing an audit / independent review, or giving accounting advice (refer accounting matters to an accountant).
- Completing Annual Compliance Checklists for the client (client owns and completes them).
- NPCs or other non-(Pty) Ltd / non-CC entities as v1 standard service.
- Any Desk service-fee / pricing figures until the commercial pricing model is approved.
- Fixing historical registry errors, restorations, deregistrations, or MOI/share restructures.
- Guaranteeing that CIPC will accept, process, or complete any filing by a stated date.
- Acting as CIPC or giving formal legal opinions.

### What the client must provide

**PRACTICAL — typical inputs (conditional; not every item for every company):**

- Company / CC registration number and registered name.
- Confirmation that the entity is a private company ((Pty) Ltd) or close corporation (v1 scope).
- Financial year information and the anniversary / incorporation date if known.
- Latest annual turnover figure for the filing year(s) being lodged.
- Current contact details for the instructing person and, where needed, directors/members for OTP or verification.
- Confirmation whether Beneficial Ownership is already filed and current; if not, client completes BO (or separately quoted path).
- Confirmation whether FAS or AFS (iXBRL) requirements are met; if not, client / accountant completes them — Desk does not prepare FAS.
- **Signed engagement/mandate** confirming authority to act (**required before filing** — SARAH-APPROVED (v1)).
- Confirmation of customer-code path: client’s own code by default, or authorised practitioner code if the client authorises it.
- Arrangement for **CIPC statutory fees** only as charged by CIPC at filing time — **no Desk service-fee wording** until pricing is approved (SARAH-APPROVED (v1)).
- Client ownership of any Annual Compliance Checklist obligation.

### What CIPC Desk cannot guarantee

**PRACTICAL / Sarah-confirmed wording posture:**

- CIPC processing time or “Immediate” completion for the client’s matter.
- Approval dates, acceptance dates, or registry status change dates.
- That a filing will succeed on first attempt.
- That penalties, deregistration risk, or enforcement will not arise from past non-compliance.
- That BO, AFS/FAS, or Compliance Checklist issues outside the Annual Return itself will be resolved as part of a standard AR engagement.

Any timing estimate must be qualified as subject to:

- CIPC processing times;
- system availability;
- submission quality;
- additional information requests;
- manual review.

### When specialist review may be required

**PRACTICAL / Sarah-confirmed specialist triggers (adapted to Annual Returns):**

- Entity type outside v1 scope (NPC, external company, public company, SOC, co-operative, other).
- Unclear company type or conflicting CIPC records.
- Multi-year arrears, penalty disputes, or deregistration / reinstatement overlap.
- Outstanding or complex Beneficial Ownership (trusts, juristic persons, foreign owners, deceased estates).
- Unresolved AFS / FAS / XBRL dependency or Public Interest Score / audit-route uncertainty.
- Historical corrections, statutory interpretation, or CIPC back-office / manual intervention.
- Any matter Sarah classifies as specialist-only under the #740 decision (MOI, share restructures, restorations, deregistrations, etc.) even if discovered during an AR intake.

---

# Layer 2 — Client intake checklist

*Use as a guided intake. Mark each row N/A when it does not apply. Do not assume every item applies to every company type.*

### A. Instructing party and authority

| # | Item | When required | Notes |
|---|------|---------------|-------|
| A1 | Instructing person full name, email, phone | Always | PRACTICAL |
| A2 | Relationship to entity (director / member / accountant / authorised agent) | Always | PRACTICAL |
| A3 | Signed engagement/mandate confirming authority to act | Always before filing | **SARAH-APPROVED (v1)** — required before filing |
| A4 | Customer-code path: client’s own CIPC customer code (default) or authorised practitioner code if client authorises | When filing electronically | **SARAH-APPROVED (v1)** — both models supported; default client code |
| A5 | Billing contact for CIPC statutory fees; no Desk fee quote until pricing approved | Always before paid CIPC lodging | **SARAH-APPROVED (v1)** — no invented Desk pricing |

### B. Company registration details

| # | Item | When required | Notes |
|---|------|---------------|-------|
| B1 | Enterprise / registration number | Always | OFFICIAL — validated in AR system |
| B2 | Registered name as on CIPC record | Always | PRACTICAL cross-check |
| B3 | Entity type is (Pty) Ltd or CC | Always for v1 standard path | **SARAH-APPROVED (v1)** — NPC / other = later-phase / specialist |
| B4 | Incorporation / registration anniversary date | Always if known | OFFICIAL window language uses anniversary of incorporation |
| B5 | Current CIPC status (in business, AR deregistration process, final deregistered, etc.) | Always | PRACTICAL — status may block AR filing (guide: validation message → enquiry) |
| B6 | Registered office and postal address on record | If client reports changes or mismatch | Address change is a **separate** service if updates needed |
| B7 | Latest disclosure / COR documents available to client | Conditional — useful when records conflict | PRACTICAL; do not store ID images in Git |

### C. Financial-year and turnover

| # | Item | When required | Notes |
|---|------|---------------|-------|
| C1 | Financial year-end | Always | PRACTICAL; links to AFS preparation timing (OFFICIAL six-month AFS preparation rule) |
| C2 | Filing year(s) to be lodged (current and any arrears) | Always | PRACTICAL |
| C3 | Annual turnover for each outstanding year | Always for fee calculation | OFFICIAL — turnover entered in AR calculator (CIPC fee, not Desk fee) |
| C4 | Whether entity is dormant / not trading | Conditional disclosure | **SARAH-APPROVED (v1)** wording: “Even if your company is dormant or not trading, Annual Return filing and other statutory obligations may still apply.” |
| C5 | Whether AFS revenue figure already filed (for turnover match) | When AFS already submitted | OFFICIAL — turnover validated against AFS revenue |

### D. Contact and director / member details

| # | Item | When required | Notes |
|---|------|---------------|-------|
| D1 | Current director / member list as client believes it stands | Always for completeness review | PRACTICAL |
| D2 | Director/member mobile and email for OTP / verification | When CIPC or BO process requires OTP | PRACTICAL; common in e-Services flows |
| D3 | Confirmation director/member CIPC records are correct | Always | If incorrect → may need Director Changes pack (#751 queued), not silent AR patch |
| D4 | Foreign director / beneficial owner present? | Conditional | May trigger Foreigner Assurance path (OFFICIAL BO page integration note) |

### E. Beneficial Ownership status / dependencies

| # | Item | When required | Notes |
|---|------|---------------|-------|
| E1 | Is entity a co-operative? | Always filter | OFFICIAL — co-operatives excepted from BO Register; also outside v1 AR standard scope |
| E2 | Has latest BO declaration been filed for the relevant calendar/filing year? | Companies and CCs in v1 | OFFICIAL hard-stop; **SARAH-APPROVED (v1):** identify + refer (or quote separately) — not automatic AR inclusion |
| E3 | Securities register and/or beneficial interest register available | When BO filing required | OFFICIAL anniversary package language; client / separate path |
| E4 | Ownership structure summary (natural persons only vs trusts / companies / foreign) | When BO not already complete | Complex structures → specialist review |
| E5 | Affected vs non-affected company classification (as used in CIPC BO guides) | When filing BO on a separate path | OFFICIAL guide variants exist on Step-by-Step hub — intake detail **PROVISIONAL** for BO-only work |

### F. AFS / FAS / XBRL dependencies

| # | Item | When required | Notes |
|---|------|---------------|-------|
| F1 | Does client / accountant say AFS (audit or independent review) is required this year? | Always ask | OFFICIAL hard-stop requires AFS **or** FAS |
| F2 | FAS / AFS requirements met? | Always before AR submission-ready | **SARAH-APPROVED (v1):** check only; do **not** prepare FAS; refer accounting to an accountant |
| F3 | If AFS route: iXBRL package ready / accountant appointed | When AFS must be filed to CIPC | OFFICIAL XBRL manuals on guides hub; Desk does not prepare AFS |
| F4 | Public Interest Score / MOI audit clause known? | When AFS vs FAS uncertain | Refer to accountant / specialist — do not guess |
| F5 | Entity outside v1 ((NPC, external, public, etc.) | If presented | **SARAH-APPROVED (v1):** later-phase — do not treat as standard AR |

### G. Proof-of-authority and missing-information checks

| # | Item | When required | Notes |
|---|------|---------------|-------|
| G1 | Signed engagement/mandate on file | Always before filing | **SARAH-APPROVED (v1)** |
| G2 | Missing-information list issued to client in plain English | When any A–F gap exists | PRACTICAL |
| G3 | Client acknowledges AR ≠ tax return and AR ≠ Compliance Checklist; client owns Compliance Checklist | Always | **SARAH-APPROVED (v1)** for checklist ownership |
| G4 | Client acknowledges no timing/outcome guarantee | Always before submission | Sarah-confirmed |

**Missing-information rule (PRACTICAL):** If B1–B3, C2–C3, A3, E2 (when BO blocks filing), or F2 are unanswered, status stays **information incomplete** — do not mark ready for submission.

---

# Layer 3 — Operator checklist

*Internal. Complete in order. Record evidence in the operator work record (not in Git).*

### 1) Authority / mandate confirmation

- [ ] Instructing party identified.
- [ ] **Signed engagement/mandate** confirming authority to act is on file (**SARAH-APPROVED (v1)** — required before filing).
- [ ] Scope of authority covers Annual Return year(s) requested.
- [ ] Customer-code path agreed: **client’s own code by default**, or authorised practitioner code if client authorises (**SARAH-APPROVED (v1)**).
- [ ] If authority unclear → **specialist review** / do not submit.

### 2) Company-record verification

- [ ] Enterprise number validated in CIPC Annual Returns / e-Services.
- [ ] Name matches client instruction.
- [ ] Entity type is **(Pty) Ltd or CC**; if NPC / other → later-phase / specialist (**SARAH-APPROVED (v1)**).
- [ ] Entity status allows AR filing; if validation blocks filing, log CIPC message and route to exception path.
- [ ] Outstanding AR years listed (paid vs outstanding).
- [ ] Obvious registry mismatches flagged (directors, addresses, FYE) without attempting out-of-scope fixes.

### 3) Completeness review

- [ ] Turnover captured per outstanding year.
- [ ] Contact details usable for CIPC notices / OTP.
- [ ] CIPC statutory fee funding path confirmed before cart payment; **no Desk service-fee quote** until pricing approved (**SARAH-APPROVED (v1)**).
- [ ] Client has received plain-English “what we still need” if incomplete.
- [ ] If dormant / not trading disclosed, client has received the approved wording above.

### 4) BO dependency check

- [ ] Confirm whether BO applies (not a co-operative).
- [ ] Confirm latest BO declaration status for the filing year (OFFICIAL: latest filing associated with same calendar year logic in step-by-step guide).
- [ ] If BO outstanding or rejected → **identify and refer** to client (or quote separately); do not treat AR as submission-ready under the standard package (**SARAH-APPROVED (v1)**).
- [ ] Complex ownership → specialist review before any BO path.

### 5) AFS / FAS / XBRL dependency check

- [ ] Determine whether FAS or AFS requirements appear met for each filing year (**conditional**).
- [ ] **Check only** — do **not** prepare FAS; do **not** prepare AFS (**SARAH-APPROVED (v1)**).
- [ ] Accounting uncertainty → refer to the client’s accountant.
- [ ] If AFS already filed: check turnover/revenue consistency note from official guide.
- [ ] Uncertain audit / review / exemption position → specialist or client’s accountant; do not guess.

### 6) Exception detection

- [ ] Scan Layer 6 triggers (below).
- [ ] If any red trigger present → set status **specialist review** or **further action required**; notify client in plain language without promising CIPC outcomes.

### 7) Submission-readiness decision

Mark **ready for submission** only when all are true:

- Signed engagement/mandate complete.
- Entity is (Pty) Ltd or CC and validates; status allows filing.
- Turnover present for years being filed.
- Customer-code path agreed (client default or authorised practitioner).
- BO dependency satisfied by client / separate path (or concurrently completable under separate authority — not assumed in standard AR fee).
- AFS/FAS requirements checked as met (Desk did not prepare FAS/AFS).
- No unresolved specialist red flag.
- Client informed that CIPC outcome/timing is not guaranteed.
- No Desk pricing invented in client materials.

### 8) Completion evidence and proof-of-filing capture

After external submission:

- [ ] Payment/filing confirmation retained (CIPC statutory fees).
- [ ] Annual Return filing certificate / confirmation saved to the matter record.
- [ ] Note customer-code email destination for CIPC’s copy.
- [ ] Record years filed, CIPC fees paid, and any BO/FAS/AFS reference numbers available from the client’s separate completions.
- [ ] Client update sent: what was submitted, what proof is attached, and that CIPC remains responsible for registry processing.
- [ ] Remind client that Annual Compliance Checklist (if applicable) remains **their** responsibility.
- [ ] If CIPC later requests more information → reopen as **further action required**.

---

# Layer 4 — Specialist validation note

*For Sarah Fourie and operators. v1 decisions below are closed; remaining items are later-phase or provisional operating detail.*

### Sarah-approved v1 decisions (closed — #791)

1. **Customer-code model:** Both supported; default client’s own CIPC customer code unless authorised practitioner code is authorised.
2. **Standard AR package:** Annual Return filing only; BO and AFS/FAS prerequisites identified and referred (or quoted separately).
3. **Mandate:** Signed engagement/mandate required before filing.
4. **FAS / AFS:** Check whether requirements are met only; do not prepare FAS; refer accounting to an accountant.
5. **Entity types in v1:** Private companies and close corporations only; NPC / other = later-phase.
6. **Dormant wording:** Approved sentence in Layer 1.
7. **Fees in client materials:** None until commercial pricing model approved.
8. **Compliance Checklist:** Client completes and owns; out of standard AR service.

### Remaining open / later-phase (not blocking v1 AR copy)

1. **Multi-year arrears threshold:** When Desk declines standard path and sends immediately to specialist/restoration (**PROVISIONAL** operating detail).
2. **BO-only intake depth:** Affected vs non-affected classification questions when BO is handled on a separately quoted path (**PROVISIONAL**).
3. **Exact engagement/mandate template file:** Requirement is decided; which template file operators attach may still be refined operationally without changing the v1 rule.
4. **NPC / external / public / SOC / co-op packs:** Later-phase — do not present as v1 standard.
5. **Commercial pricing model:** Separate approval before any Desk fee figures appear.
6. **Public brand name:** “CIPC Desk” remains internal working name pending #751 brand work.

### Practical variations by company type (v1 map)

| Entity | v1 standard AR service? | BO hard-stop relevant? | AFS/FAS note | Desk caution |
|--------|-------------------------|------------------------|--------------|--------------|
| Private company (Pty) Ltd | Yes — **SARAH-APPROVED (v1)** | Yes (identify + refer) | Check met only; no FAS prep | Most common Desk path |
| Close corporation | Yes — **SARAH-APPROVED (v1)** | Yes (identify + refer) | Check met only; no FAS prep | Member vs director language |
| NPC | No — **LATER PHASE** | Yes (not a co-op) | Often special AFS/audit analysis | Do not sell as v1 standard |
| Public company / SOC | No — **LATER PHASE** | Yes | AFS / audit route more likely | Specialist / later |
| External company | No — **LATER PHASE** | Yes (guide references) | Official guides note differences | Specialist / later |
| Co-operative | No — out of this pack | BO Register exception (OFFICIAL) | Separate co-op guides exist | Out of scope unless Sarah expands |

### Historical-record discrepancies

**PRACTICAL escalation examples:**

- CIPC name/status/director data ≠ client understanding.
- Prior AR marked paid but certificate missing.
- BO filed but Annual Return still blocked (calendar-year “latest filing” rule in official guide).
- Turnover rejected because AFS revenue differs.
- Entity in AR deregistration / final deregistered — may be reinstatement territory, not standard AR.

### Cases where CIPC practice may differ from published guidance

**PROVISIONAL — flag for specialist; do not publish as fact:**

- Intermittent e-Services / Annual Returns portal behaviour vs step-by-step screenshots.
- Enquiry unit split: Service Standards note AR enquiries exclude BO/FAS/AFS (other units).
- Hard-stop messaging that cites BO and AFS/FAS together, while operational fixes may need separate tickets.
- Compliance Checklist enforcement communications that clients confuse with Annual Returns.

### Wording that must not appear

- Any Desk service-fee / pricing figure (until commercial model approved).
- Any promised Desk turnaround (internal targets may exist later; not client guarantees).
- “We will get you reinstated” / “CIPC will approve within X days”.
- Statements that dormant companies need not file (use the approved dormant wording instead).
- Brand name “CIPC Desk” as final public brand.
- Any claim of CIPC accreditation or partnership.
- FAS preparation or AFS preparation as part of the standard AR service.
- NPC / other entity types as v1 standard Annual Returns service.
- Desk ownership of the Annual Compliance Checklist.

---

# Layer 5 — Customer status workflow

*Minimum statuses for Annual Returns matters. Email-first client updates; durable record in operator control plane when implemented later.*

| Status | Meaning | Typical next action |
|--------|---------|---------------------|
| **received** | Instruction accepted; intake not yet complete | Run intake checklist |
| **information incomplete** | Missing facts/docs/authority | Send plain-English missing-info list |
| **specialist review** | Outside standard path or legal/registry ambiguity | Sarah (or designated specialist) decides |
| **ready for submission** | Operator checklist green | Submit via CIPC when CIPC fee funding and signed mandate final |
| **submitted externally** | Lodged/paid on CIPC systems | Capture proof; monitor for CIPC notices |
| **awaiting CIPC** | Dependent on CIPC processing, review, or system | No false urgency promises; periodic check |
| **completed** | Filing confirmation/certificate on matter record and client informed | Close AR year(s) in scope |
| **further action required** | CIPC query, rejection, dependency failure, or new discrepancy | Re-open checklist / escalate |

**Status rules (PRACTICAL):**

- Do not jump to **completed** on payment alone — need filing confirmation/certificate (OFFICIAL proof step).
- **awaiting CIPC** is honest when BO/AFS units or back-office must act; still not a timing promise.
- If reinstatement/deregistration discovered, keep AR matter as **further action required** or split a new matter — do not hide the dependency.
- If BO or AFS/FAS is incomplete, keep **information incomplete** (or separately quoted work) — standard AR does not absorb those completions.

---

# Layer 6 — Exceptions and Escalations

*Sixth layer approved by Sarah (#740). Matters here require specialist assessment before proceeding.*

| Exception | Why it matters | Immediate operator action |
|-----------|----------------|---------------------------|
| Entity outside v1 ((NPC, external, public, SOC, co-op, other) | Not v1 standard AR service | Specialist / later-phase; do not present as standard |
| Unclear company type | Wrong BO/AFS/checklist route | Specialist review; pause submission |
| Historical filing discrepancies | Prior years, missing certificates, conflicting paid/outstanding flags | Specialist review; gather CIPC screenshots/export notes |
| Outstanding BO compliance | OFFICIAL hard-stop blocks AR finalisation | Identify + refer to client or quote separately; status not ready for standard AR submission |
| Unresolved AFS/FAS/XBRL dependency | OFFICIAL financials hard-stop | Refer to accountant; do not prepare FAS/AFS; do not invent figures |
| Manual CIPC intervention required | Validation blocks, system errors, back-office only fixes | Log enquiry path; awaiting CIPC / further action required |
| Conflicting company records | Directors, addresses, FYE, name mismatches | Separate corrective service; do not “force” AR |
| Statutory interpretation required | Audit vs review vs exemption; MOI clauses; external company nuances | Specialist review — Sarah-confirmed mandatory class |
| Entity in deregistration / final deregistered | May need reinstatement workflow (separate CIPC process) | Stop standard AR; escalate |
| Trust / deceased estate / foreign complex ownership | Sarah specialist-mandatory class | Specialist review before BO/AR |
| Suspected false or unverifiable information | OFFICIAL: false BO info is an offence | Refuse filing; escalate to Sarah |
| Client asks Desk to complete Compliance Checklist | Client-owned under v1 | Decline as standard AR inclusion; client owns checklist |

**Escalation tone to clients (PRACTICAL):** explain that a specialist must review before any filing attempt; list what is blocked; restate that CIPC Desk cannot guarantee CIPC outcomes.

---

## Explicit non-actions

This pack does **not** authorise:

- public launch of Annual Returns as a marketed product (corpflow_test review page only until separately approved);
- inventing Desk service fees or publishing pricing;
- preparing FAS or AFS;
- treating NPC / other entities as v1 standard service;
- Desk completion of Annual Compliance Checklists;
- runtime `/change`, CRM, auth, schema, or infrastructure work beyond the existing standing review page;
- real automated CIPC submissions from this repository;
- collection or storage of identity documents in the repository;
- any claim of CIPC affiliation, endorsement, or guaranteed outcomes.

---

## Document control

| Field | Value |
|-------|-------|
| Controlling issue (decisions applied) | #791 |
| Research / pack origin | #750 / PR #758 |
| Test-site origin | #761 / PR #763 |
| Parents | #640 (coordination), #740 (research) |
| Pack version | v1 — Sarah-approved boundaries 2026-08-07 |
| Next step | Keep docs + corpflow_test page aligned; ChatGPT verifies standing URL after merge |
| Public launch | **Not authorised** by this pack |
| Anton needed | No for routine application of these decided boundaries |
