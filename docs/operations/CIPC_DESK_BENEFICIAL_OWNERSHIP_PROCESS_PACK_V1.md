# CIPC Desk — Beneficial Ownership Process Pack v1

**Status:** Review-ready six-layer pack for Sarah Fourie. Research base **#740**; parent coordination **#640**. Standing corpflow_test review surface **#981**. Annual Returns pattern/baseline **#750 / #758 / #761 / #763 / #791 / #792**.  
**Tenant / working name:** `cipc-desk` / **CIPC Desk** (internal working name only — not final public brand).  
**Subject-matter owner:** Sarah Fourie.  
**Evidence date of official-source review:** 2026-08-18.  
**Verdict:** Common/standard Beneficial Ownership administration path drafted for specialist review. **Not Sarah-approved operating boundaries yet.** **Not a public launch.** No schema, CRM, auth, payment, email-send runtime, or live CIPC submission authorised by this pack.

<!-- CIPC_DESK_BENEFICIAL_OWNERSHIP_PROCESS_PACK_V1 -->

---

## How to read this pack

Every substantive statement is tagged so operators and reviewers can see evidence strength:

| Tag | Meaning |
|-----|---------|
| **OFFICIAL** | Stated on current CIPC public material cited below. |
| **PRACTICAL** | Operating recommendation grounded in Sarah’s confirmed direction (#740) and ordinary CIPC Desk handling — not a substitute for statute. |
| **PROVISIONAL** | Reasonable working assumption until a newer CIPC notice or a Sarah decision supersedes it. |
| **SARAH CONFIRM** | Explicitly still open; do not publish as final public copy or hard-code as approved Desk policy until Sarah answers. |

**Non-affiliation (PRACTICAL / Sarah-confirmed brand posture from Annual Returns):** CIPC Desk is an independent support service. It is **not** CIPC, is **not** endorsed by CIPC, and must never imply official affiliation.

**Guarantee ban (Sarah-confirmed):** Never guarantee CIPC turnaround times, approval dates, processing periods, beneficial-owner determinations, or successful filing outcomes. Any estimate must stay subject to CIPC processing times, system availability, submission quality, additional-information requests, reviewer queries, and manual review.

**Pricing ban (PRACTICAL / inherited from Annual Returns v1):** Do not invent or publish Desk service-fee / pricing wording until the commercial pricing model is approved. CIPC’s own statutory fees on CIPC systems are separate from Desk commercial pricing and must not be presented as Desk prices.

**Determination ban (PRACTICAL):** CIPC Desk must **not** invent who a beneficial owner is. The client (or instructing professional) declares the facts they believe to be true. Complex, layered, trust, juristic, foreign, or unclear-control cases escalate to specialist review. False or misleading BO information is an **OFFICIAL** offence.

**Data rule:** This pack uses **no real client or company data**, no identity-document images, and no private filings.

---

## Source list (official)

Reviewed for this draft (public CIPC / CIPC-hosted material only):

1. **CIPC Beneficial Ownership information page** — https://www.cipc.co.za/?page_id=16055  
   Definitions (affected / non-affected, beneficial interest, beneficial owner); Register launch; hard-stop with Annual Returns from 1 July 2024; 10-business-day new-entity and amendment windows; 30-business-day anniversary package; Foreigner Assurance integration from 16 February 2024; false-information offence; reviewer / resubmission language; enquiry address.
2. **CIPC Step-by-Step Guides hub** — https://www.cipc.co.za/?page_id=4447  
   Separate official BO guide variants: Affected Company; Non-Affected Company With Beneficial Ownership; Complex structure (juristic persons and trusts); Mandate; Beneficial Interest Register; securities register content; Securities Register Template; BO technical troubleshooting FAQ; Optimised BO Filing; discarding of draft filing.
3. **CIPC Annual Return Filing System** — https://annualreturns.cipc.co.za/  
   Public workflow places Beneficial Ownership filing before Annual Return finalisation.
4. **CIPC Service Standards** — https://www.cipc.co.za/?page_id=4635  
   Separate enquiry units; do **not** present CIPC published turnaround as a CIPC Desk promise. BO page notes service standard is dependent on payment for the transaction being made.
5. **CIPC notices named on the BO information page** (titles only; operators should open the live notice when answering a live matter):  
   Customer Notices 2023 implementation; 53 of 2023; 40 of 2023 (securities / beneficial interest register functionality); 5 of 2024; 12 of 2024; 13 of 2024 (Foreigner Assurance); 26 and 39 of 2024 (BO with Annual Returns); 54 of 2024; 58 of 2024 (non-compliance); **61 of 2024 (complex structures function)**; media releases 11 of 2023 and 4 of 2024.
6. **CIPC eServices catalogue** — https://eservices.cipc.co.za/  
   Login / filing surface context; Foreigner Assurance is an exclusively online e-Services process per the BO page.
7. **Annual Returns process pack** — `docs/operations/CIPC_DESK_ANNUAL_RETURNS_PROCESS_PACK_V1.md`  
   Sarah-approved AR v1 (2026-08-07): standard Annual Returns service does **not** include performing BO filing; BO gaps are identified and referred or quoted separately. This BO pack is the separate service path.

**Primary statute references named in official CIPC material (not reproduced in full here):** Companies Act 71 of 2008 as amended by the General Laws (Anti-Money Laundering and Combatting Terrorism Financing) Amendment Act 22 of 2022.

**Official enquiry contact named by CIPC (not a Desk inbox):** beneficialownershipenq@cipc.co.za

**Out of scope for citation strength:** Third-party blogs, accountants’ marketing pages, and unpaid secondary summaries. They may be used only as discovery pointers, never as authority.

---

## Official process backbone (confirmed from CIPC)

**OFFICIAL — what Beneficial Ownership means.** CIPC states that Beneficial Ownership refers to the **individuals** who ultimately own or control a company or legal entity, regardless of whether they are listed in the official records. A beneficial owner is an individual who, directly or indirectly, ultimately owns the company or exercises effective control, including through beneficial interests in securities, voting rights, the right to appoint or remove directors, chains of ownership or control of a holding company or other juristic person, a partnership, a trust agreement, or the ability to otherwise materially influence management.

**OFFICIAL — who must file.** The Beneficial Ownership Register, launched 1 April 2023, requires **all corporate entities registered with CIPC except co-operatives** to submit beneficial ownership information (effective from 24 May 2023).

**OFFICIAL — affected vs non-affected.** CIPC defines:

- **Affected company:** any regulated company including all public companies (including listed public companies); state-owned companies; any private company regulated by the Takeover Regulations that experienced a transfer of more than 10% of its securities as a result of an amalgamation or merger during the previous 24 months; and any subsidiary of an affected company.
- **Non-affected company:** any company that is not classified as an affected company.

CIPC publishes **separate** step-by-step guides for Affected Company filing and for Non-Affected Company With Beneficial Ownership. Operators must not collapse those routes.

**OFFICIAL — beneficial interest.** The right or entitlement of a person, through ownership, agreement, relationship or otherwise, alone or together with another person, to receive or participate in any distribution in respect of the company’s securities; exercise or cause to be exercised, in the ordinary course, any or all of the rights attaching to the company’s securities; or dispose or direct the disposition of the company’s securities, or any part of a distribution in respect of the securities.

**OFFICIAL — timing windows (handle carefully; never convert into Desk promises):**

- Newly incorporated entities must file BO information within **10 business days** of incorporation.
- Amended BO declarations must be filed within **10 business days** of any change to BO information.
- Entities must file Annual Returns, Beneficial Ownership Declarations, and a **securities register and/or beneficial interest register** each year within **30 business days** following the anniversary date of incorporation.

**OFFICIAL — Annual Return hard-stop.** From **1 July 2024**, companies and close corporations must submit Beneficial Ownership Declarations alongside Annual Returns. Entities that are BO non-compliant cannot continue and finalise Annual Return submission. CIPC warns this can result in penalty fees for late Annual Return submission or ultimately deregistration.

**OFFICIAL — accuracy and false information.** Every entity is responsible for submitting accurate, complete and verified beneficial ownership information. Providing false or misleading information is an offence under the amended Companies Act. CIPC allows immediate amendment and resubmission to correct incorrect or incomplete information, and operates a reviewer system. Alerts for necessary re-submissions are communicated via email.

**OFFICIAL — Foreigner Assurance.** Effective 16 February 2024, the Foreigner Assurance process was integrated with the beneficial ownership submission system. Foreign nationals electronically submit information, accompanied by a **certified passport or foreign identity document**, for verification before engaging with CIPC platforms. BO declarations by foreign nationals are cross-verified with the Foreigner Assurance database.

**OFFICIAL — complex structures.** CIPC publishes a dedicated step-by-step guide for Beneficial Ownership filing of **complex structures — juristic persons and trusts**, and Customer Notice 61 of 2024 names an additional function on the Beneficial Ownership Declaration service for complex structures. These are **not** the common/standard v1 path.

**OFFICIAL — mandate and registers.** CIPC publishes separate guidance on the required contents of the **Mandate**, the **Securities Register**, and the **Beneficial Interest Register**, plus a securities-register template, from the Step-by-Step Guides hub.

**PRACTICAL — Desk v1 scope (not yet Sarah-approved):** Standard CIPC Desk Beneficial Ownership v1 covers only the **common / standard administration path** for a typical private company or close corporation where ownership/control is declared as natural persons and the affected/non-affected route is clear. Trusts, juristic-person owners, foreign ownership, layered/chain control, deceased estates, unclear control, and affected-company edge cases are **specialist-review / escalation** paths — not automated and not guessed.

**PRACTICAL — relationship to Annual Returns (Sarah-approved on the AR pack, 2026-08-07):** Standard Annual Returns service identifies BO gaps and refers them for completion or quotes them separately. This pack is that separate BO path. Do not silently bundle BO filing into a standard Annual Returns engagement.

---

# Layer 1 — Customer explanation

*Audience: client or referring professional. Plain English. Not legal advice. Not a beneficial-owner determination.*

### What Beneficial Ownership filing is

**OFFICIAL / plain-English paraphrase:** Beneficial Ownership filing tells CIPC which **natural persons** ultimately own or control the company, even if those people are not the names printed on every share certificate or register line. It is a transparency filing. It is **not** an Annual Return, **not** a SARS tax return, and **not** a CIPC Desk decision about who owns the company.

### What the CIPC Desk Beneficial Ownership v1 service is intended to cover

**PRACTICAL / PROVISIONAL (standard path only — SARAH CONFIRM package boundary):**

- Helping the client understand, in plain English, that CIPC requires current beneficial-ownership information for corporate entities other than co-operatives.
- Collecting the facts and supporting items needed for a **complete standard-path filing attempt**, when the ownership/control picture is a common natural-person pattern and the affected/non-affected route is clear.
- Routing the matter to the correct CIPC guide family: **affected** vs **non-affected**, or escalating if that classification is unclear.
- Checking whether a mandate and the securities register and/or beneficial interest register appear available before any filing attempt.
- Preparing and submitting a **standard-path** Beneficial Ownership declaration through CIPC e-Services **only when** a signed engagement/mandate and required information are complete, and no Layer 6 trigger is present (**SARAH CONFIRM** whether Desk files or only prepares/refers).
- Capturing proof / confirmation of what was filed and telling the client what was submitted.
- Escalating immediately when the matter is a trust, juristic person, foreign owner, layered ownership, unclear control, historical inconsistency, or any other specialist class.

**What the service does *not* include (PRACTICAL / PROVISIONAL exclusions):**

- Deciding or certifying who a beneficial owner is.
- Filing or “solving” complex ownership structures (trusts, juristic persons, layered chains, unclear control).
- Treating affected-company edge cases (public / SOC / takeover-regulated private companies and their subsidiaries) as the standard v1 path.
- Co-operatives (OFFICIAL exception from the BO Register).
- Performing Annual Return filing as part of this service (that is the Annual Returns pack).
- Preparing FAS, AFS, or tax filings.
- Storing identity-document images in Git or inventing a new document vault.
- Guaranteeing that CIPC will accept, process, or complete any filing by a stated date.
- Acting as CIPC or giving formal legal opinions.
- Any Desk service-fee or pricing figures until the commercial pricing model is approved.

### What the client must typically provide

**PRACTICAL — typical inputs (conditional; not every item for every company; document list is not a legal conclusion):**

- Company / CC registration number and registered name.
- Confirmation of entity type and that the entity is not a co-operative.
- Facts needed to route **affected** vs **non-affected** (see Layer 2). If those facts are incomplete or disputed → specialist review.
- A plain-English ownership / control picture as the client understands it, including whether any owner or controller is a trust, company, other juristic person, partnership, foreign person, or deceased estate.
- Beneficial-owner personal information the client declares for each **natural person** on the standard path (identity particulars, contact details, nature of ownership or control) — **client-declared**, not Desk-determined.
- Mandate / authority to act (**SARAH CONFIRM** exact template; PRACTICAL: signed engagement/mandate before any filing attempt, matching Annual Returns v1).
- Securities register and/or beneficial interest register where the anniversary / filing package requires them (**OFFICIAL** package language).
- For any foreign national involved in the CIPC / BO path: Foreigner Assurance status and the certified passport or foreign identity document CIPC requires (**OFFICIAL**). Desk does not store those images in the repository.
- CIPC customer-code path (**SARAH CONFIRM**; PROVISIONAL inherited default: client’s own CIPC customer code unless the client authorises an authorised practitioner code).
- Billing contact for **CIPC filing-fee funding** only — no Desk service-fee wording until commercial pricing is approved.

### What CIPC Desk cannot guarantee

**PRACTICAL / Sarah-confirmed wording posture:**

- CIPC processing time or reviewer-clearance dates.
- That a filing will succeed on first attempt.
- That a named person is or is not a beneficial owner.
- That penalties, investigation, compliance notices, or deregistration risk will not arise from past non-compliance.
- That Annual Return hard-stop issues will disappear on a promised date.

Any timing estimate must be qualified as subject to:

- CIPC processing times;
- system availability;
- submission quality;
- additional information or reviewer requests;
- manual review.

### When specialist review is required

**PRACTICAL / Sarah-confirmed specialist class from #740, applied to BO:**

- Trusts, juristic-person owners, partnerships acting for others, or a person acting under a trust agreement.
- Layered / chain ownership or control, or CIPC “complex structure” filing.
- Foreign ownership or Foreigner Assurance not complete / not understood.
- Unclear control, disputed ownership, or historical/inconsistent registers.
- Affected-company classification unclear or the entity appears to be an affected company / subsidiary of an affected company.
- Entity type outside the common private-company / close-corporation path, or a co-operative presented as if BO Register filing applied.
- Suspected false, incomplete, or unverifiable information.
- Any statutory interpretation about who must be declared.

---

# Layer 2 — Client intake checklist

*Use as a guided intake. Mark each row N/A when it does not apply. Do not assume every item applies to every company. Do not treat a completed checklist as a beneficial-owner determination.*

### A. Instructing party and authority

| # | Item | When required | Notes |
|---|------|---------------|-------|
| A1 | Instructing person full name, email, phone | Always | PRACTICAL |
| A2 | Relationship to entity (director / member / accountant / authorised agent) | Always | PRACTICAL |
| A3 | Signed engagement / mandate confirming authority to act | **Before filing** | PRACTICAL inherited from AR v1; exact template **SARAH CONFIRM** |
| A4 | CIPC customer-code path agreed | When filing electronically | PROVISIONAL: default client’s own code; **SARAH CONFIRM** for BO |
| A5 | Billing contact for CIPC filing-fee funding | Before CIPC payment step | PRACTICAL — **no Desk service-fee / pricing wording** |

### B. Company registration details

| # | Item | When required | Notes |
|---|------|---------------|-------|
| B1 | Enterprise / registration number | Always | PRACTICAL / OFFICIAL filing identifier |
| B2 | Registered name as on CIPC record | Always | PRACTICAL cross-check |
| B3 | Entity type | Always | PROVISIONAL v1 common path: **(Pty) Ltd** or **CC**; other types → specialist / later-phase (**SARAH CONFIRM**) |
| B4 | Is the entity a co-operative? | Always filter | OFFICIAL — co-operatives excepted from BO Register |
| B5 | Incorporation / registration anniversary date | Always if known | OFFICIAL 30-business-day anniversary window |
| B6 | Current CIPC status and any known BO / AR non-compliance notice | Always | PRACTICAL; CIPC publishes a non-compliant BO list |
| B7 | Filing occasion: new incorporation / annual package / amendment after a change | Always | OFFICIAL 10-business-day vs 30-business-day windows — not Desk promises |

### C. Affected vs non-affected routing

| # | Item | When required | Notes |
|---|------|---------------|-------|
| C1 | Is the entity a public company (including listed)? | Always | OFFICIAL affected definition |
| C2 | Is the entity a state-owned company? | Always | OFFICIAL affected definition |
| C3 | Is the entity a private company that, in the previous 24 months, transferred more than 10% of its securities because of an amalgamation or merger and is regulated by the Takeover Regulations? | Always for private companies | OFFICIAL affected definition — if unknown → specialist review |
| C4 | Is the entity a subsidiary of an affected company? | Always | OFFICIAL affected definition — if unknown → specialist review |
| C5 | If all C1–C4 are clearly no: treat as **non-affected** for guide selection | When facts are complete and undisputed | OFFICIAL complementary definition |
| C6 | If any C1–C4 is yes or unclear | Immediately | **Not** standard v1 automation; specialist review / correct official guide |

### D. Ownership / control structure (escalation screen)

| # | Item | When required | Notes |
|---|------|---------------|-------|
| D1 | Does any owner or controller appear to be a **trust** or a person acting under a trust agreement? | Always | OFFICIAL beneficial-owner definition includes trust agreements → escalate |
| D2 | Does any owner or controller appear to be a **juristic person** (company, CC, other body) rather than a natural person? | Always | OFFICIAL complex-structure guide → escalate |
| D3 | Is there a **chain / layered** ownership or control picture? | Always | OFFICIAL “chain of ownership or control” language → escalate if more than a simple natural-person picture |
| D4 | Is any owner or controller a **foreign** person? | Always | OFFICIAL Foreigner Assurance path; escalate if incomplete |
| D5 | Is control unclear, disputed, or “we are not sure who decides”? | Always | Escalate — do not guess |
| D6 | Deceased estate, partnership acting for others, or nominee / unexplained intermediary? | Conditional | PRACTICAL specialist class from #740 |
| D7 | If D1–D6 are all clearly no: continue standard natural-person path | When facts are complete | PROVISIONAL v1 common path |

### E. Beneficial owner information (standard natural-person path only)

| # | Item | When required | Notes |
|---|------|---------------|-------|
| E1 | Full name of each declared natural-person beneficial owner | Standard path | Client-declared; Desk does not determine |
| E2 | Identity particulars the client can evidence (SA ID or foreign identity / passport reference) | Standard path | **OFFICIAL** foreign path uses certified passport / foreign ID via Foreigner Assurance. Exact SA-ID pack **SARAH CONFIRM**. Do not store images in Git. |
| E3 | Residential / postal contact details and email / mobile for OTP where CIPC requires them | When CIPC / e-Services requires | PRACTICAL |
| E4 | Nature of ownership or control as the client understands it (securities / voting / appoint-remove directors / other material influence) | Standard path | OFFICIAL definition categories — capture the client’s description; do not re-characterise |
| E5 | Date the ownership or control position started or last changed | When known | OFFICIAL amendment window is 10 business days after change |
| E6 | Whether the latest BO declaration is already filed for the current year | Always | PRACTICAL / OFFICIAL AR hard-stop dependency |

### F. Mandate, registers, and supporting documents

| # | Item | When required | Notes |
|---|------|---------------|-------|
| F1 | Mandate / authority document available | Before filing | OFFICIAL separate Mandate guide exists; contents **not invented here** — follow current CIPC Mandate guidance and Sarah’s template (**SARAH CONFIRM**) |
| F2 | Securities register available | When CIPC package requires it | OFFICIAL anniversary package + dedicated guide / template |
| F3 | Beneficial interest register available | When CIPC package requires it | OFFICIAL dedicated guide |
| F4 | Latest disclosure / COR documents if records conflict | Conditional | PRACTICAL; do not store ID images in Git |
| F5 | Foreigner Assurance already completed for each foreign person | When foreign persons are involved | OFFICIAL integration from 16 February 2024 |
| F6 | Historical / inconsistent prior BO filings or reviewer emails | When present | PRACTICAL → specialist review |

### G. Missing-information and acknowledgements

| # | Item | When required | Notes |
|---|------|---------------|-------|
| G1 | Signed engagement / mandate on file | Before filing | PRACTICAL hard gate pending Sarah confirmation of template |
| G2 | Missing-information list issued in plain English | When any A–F gap exists | PRACTICAL |
| G3 | Client acknowledges Desk does not determine beneficial owners | Always | PRACTICAL |
| G4 | Client acknowledges no timing / outcome / determination guarantee | Always before submission | PRACTICAL |
| G5 | Client acknowledges false or misleading BO information is an offence | Always | OFFICIAL |

**Missing-information rule (PRACTICAL):** If B1–B4, C1–C4, D1–D5, A3, or F1 is unanswered, status stays **information incomplete**. If any D1–D6 escalation flag is yes or unknown, status is **specialist review** — do not mark ready for standard submission.

---

# Layer 3 — Operator checklist

*Internal. Complete in order. Record evidence in the operator work record (not in Git). Do not invent a beneficial-owner finding.*

### 1) Authority / mandate confirmation

- [ ] Instructing party identified.
- [ ] **Signed engagement/mandate** confirming authority to act is on file (**required before filing** — PRACTICAL; template **SARAH CONFIRM**).
- [ ] Scope of authority covers the BO filing occasion (new / annual / amendment).
- [ ] Customer-code access path agreed (**SARAH CONFIRM**; do not invent a second model).
- [ ] If authority unclear → **specialist review** / do not submit.

### 2) Company-record verification

- [ ] Enterprise number and name match the client instruction.
- [ ] Entity is not a co-operative (OFFICIAL exception).
- [ ] Entity type recorded; if not the common (Pty) Ltd / CC path → specialist / later-phase (**SARAH CONFIRM**).
- [ ] Filing occasion recorded (new 10-business-day / anniversary 30-business-day / amendment 10-business-day) without promising those dates as Desk SLAs.
- [ ] Known CIPC BO / AR non-compliance or reviewer emails logged.

### 3) Affected vs non-affected routing

- [ ] C1–C4 answered from client facts — not guessed.
- [ ] If any affected fact is yes → stop standard v1 path; use specialist review and the official Affected Company guide family.
- [ ] If any affected fact is unknown → specialist review.
- [ ] If all affected facts are clearly no → Non-Affected official guide family.
- [ ] Do not invent a hybrid route.

### 4) Complexity / escalation screen

- [ ] Trust / trust-agreement flag checked.
- [ ] Juristic-person owner flag checked.
- [ ] Layered / chain control flag checked.
- [ ] Foreign-owner / Foreigner Assurance flag checked.
- [ ] Unclear or disputed control flag checked.
- [ ] Any yes or unknown → **specialist review**. Do not use the CIPC complex-structure function without specialist direction.

### 5) Completeness review (standard path only)

- [ ] Each declared natural-person owner/controller has client-declared identity and control-nature notes.
- [ ] Mandate and required register(s) appear available.
- [ ] Foreigner Assurance complete where a foreign person is involved, or the matter is escalated.
- [ ] No identity-document images stored in Git or chat history.
- [ ] Client has received a plain-English “what we still need” list if incomplete.
- [ ] CIPC fee funding path confirmed before any cart payment (**no Desk price quoted**).

### 6) Exception detection

- [ ] Scan Layer 6 triggers.
- [ ] If any red trigger present → set status **specialist review** or **further action required**; notify the client in plain language without promising CIPC outcomes or naming a beneficial owner.

### 7) Submission-readiness decision (standard path only)

Mark **ready for submission** only when all are true:

- Signed engagement/mandate complete for the filing method.
- Entity is on the common path and is not a co-operative.
- Affected vs non-affected route is clear and is the non-affected common path, **or** Sarah has expressly directed an affected-company filing as in-scope (**currently not v1 standard**).
- No trust / juristic / layered / foreign-incomplete / unclear-control flag.
- Client-declared BO particulars and required registers / mandate are present.
- Client informed that CIPC outcome, timing, and beneficial-owner determinations are not guaranteed.
- No Desk service-fee / pricing figures used.
- No suspected false or unverifiable information.

### 8) Completion evidence and proof capture

After external submission (only if filing is in the approved package):

- [ ] Payment/filing confirmation retained on the matter record.
- [ ] Any CIPC reviewer / resubmission email noted.
- [ ] Client update sent: what was submitted, what proof is attached, and that CIPC remains responsible for register processing.
- [ ] If CIPC later requests more information → reopen as **further action required**.
- [ ] Do not mark completed on payment alone.

---

# Layer 4 — Specialist validation note

*For Sarah Fourie. Beneficial Ownership v1 decisions are **not** closed. This section lists what official sources already settle and what Sarah must still confirm.*

### Already settled by official CIPC material (do not re-litigate)

1. BO concerns **individuals** who ultimately own or control, including through chains, trusts, partnerships, and other material influence.
2. Co-operatives are excepted from the BO Register.
3. Affected vs non-affected is an official CIPC classification with published definitions and **separate** filing guides.
4. Annual package language includes BO declaration plus securities and/or beneficial interest register within 30 business days of the incorporation anniversary.
5. New entities: 10 business days from incorporation; amendments: 10 business days from change.
6. From 1 July 2024, BO non-compliance hard-stops Annual Return finalisation for companies and close corporations.
7. False or misleading BO information is an offence.
8. Foreigner Assurance is integrated with BO submissions from 16 February 2024.
9. Complex structures (juristic persons and trusts) have a dedicated official guide and a named CIPC function (Notice 61 of 2024).
10. CIPC, not CIPC Desk, reviews and may require resubmission.

### Open questions for Sarah (blocking final public / operating wording)

1. **v1 entity scope:** Confirm standard BO Desk service is private companies and close corporations only, with NPC / public / SOC / external as later-phase or specialist — matching Annual Returns v1. **SARAH CONFIRM**
2. **Filing vs referral:** Does standard BO v1 include Desk submitting the e-Services declaration, or only intake, completeness check, and client/practitioner submission? **SARAH CONFIRM**
3. **Customer-code model:** Same as Annual Returns (default client’s own code; authorised practitioner code only if the client authorises it)? **SARAH CONFIRM**
4. **Mandate template:** Which exact mandate / engagement document must be on file before a BO filing attempt? **SARAH CONFIRM**
5. **Identity-document handling:** What does Desk collect versus what the client uploads directly to CIPC / Foreigner Assurance? Confirm Desk must never keep ID images in Git or a second vault. **SARAH CONFIRM**
6. **Affected-company work:** Are affected companies and subsidiaries always specialist, or is there a later-phase Desk path? **SARAH CONFIRM**
7. **Determination posture:** Confirm Desk never determines beneficial owners and only records client-declared facts plus specialist direction. **SARAH CONFIRM**
8. **New-incorporation 10-day filings:** In or out of v1 standard service, versus annual / amendment filings only? **SARAH CONFIRM**
9. **Commercial pricing:** Keep all Desk service-fee wording out until the commercial model is approved? (PROVISIONAL yes.) **SARAH CONFIRM**
10. **Annual Returns handoff:** Confirm the existing AR rule remains: AR identifies BO gaps; this pack is the separate quote / completion path. **SARAH CONFIRM**

### Practical variations by company type (v1 vs escalation)

| Entity / pattern | BO Register generally applies (OFFICIAL)? | Desk v1 standard path? | Notes |
|------------------|-------------------------------------------|------------------------|-------|
| Private company with clear natural-person owners, non-affected | Yes | **PROVISIONAL yes** | Most common path — **SARAH CONFIRM** |
| Close corporation with clear natural-person members/controllers, non-affected | Yes | **PROVISIONAL yes** | Member vs director language — **SARAH CONFIRM** |
| Affected company or subsidiary of an affected company | Yes | **No — specialist / later-phase** | Separate official guide |
| Trust or person acting under a trust agreement | Yes (as control path) | **No — escalate** | Official complex-structure guide |
| Juristic-person owner / layered chain | Yes | **No — escalate** | Official complex-structure guide + Notice 61 of 2024 |
| Foreign owner / controller | Yes | **Escalate unless Foreigner Assurance is already complete and Sarah directs standard handling** | OFFICIAL Foreigner Assurance |
| Unclear or disputed control | Yes | **No — escalate** | Do not guess |
| Co-operative | No (OFFICIAL exception) | Out of this pack | Do not file on the BO Register path |
| NPC / public / SOC / external | Usually yes if not a co-op | **Later-phase / specialist** | **SARAH CONFIRM** |

### Historical-record discrepancies

**PRACTICAL escalation examples:**

- Client ownership story ≠ CIPC disclosure / prior BO filing.
- BO marked filed but Annual Return still hard-stopped.
- Reviewer email outstanding; draft filing discarded; resubmission requested.
- Securities register or beneficial interest register missing, unsigned, or inconsistent.
- Foreigner Assurance rejected or not started for a foreign person named in the structure.

### Cases where CIPC practice may differ from published guidance

**PROVISIONAL — operational caution; do not publish as Desk promises:**

- Intermittent e-Services behaviour vs step-by-step screenshots.
- Enquiry unit split (BO enquiries vs Annual Returns enquiries).
- Hard-stop messaging that cites BO together with AFS/FAS while operational fixes need separate tickets.
- Complex-structure function availability / screens that change after Notice 61 of 2024.

### Wording that must not appear

- Any Desk service-fee / pricing figure (until commercial model approved).
- Any promised Desk turnaround or “CIPC will approve within X days”.
- “We have determined that X is the beneficial owner.”
- “This structure is simple enough to file without specialist review” when any Layer 6 flag is present.
- Statements that dormant / non-trading companies need not file BO or Annual Returns.
- Brand name “CIPC Desk” as final public brand.
- Any claim of CIPC accreditation or partnership.
- Identity-document uploads into Git, chat, or a new database.
- Public-launch or client_production language.

---

# Layer 5 — Customer status workflow

*Minimum statuses for Beneficial Ownership matters. Email-first client updates; durable record in the existing operator control plane (`/change` / existing email-intake ticket). No new workflow product.*

| Status | Meaning | Typical next action |
|--------|---------|---------------------|
| **received** | Instruction accepted; intake not yet complete | Run intake checklist |
| **information incomplete** | Missing facts, authority, registers, or routing answers | Send plain-English missing-info list |
| **specialist review** | Trust / juristic / foreign / layered / unclear / affected / disputed / interpretation | Sarah (or designated specialist) decides; do not file the standard path |
| **ready for submission** | Signed mandate + operator checklist green; no Layer 6 flag | Submit via CIPC only if filing is in the approved package and CIPC fee funding/authority are final |
| **submitted externally** | Lodged on CIPC systems | Capture proof; watch for reviewer / resubmission notices |
| **awaiting CIPC** | Dependent on CIPC processing, reviewer, or Foreigner Assurance | No false urgency promises |
| **completed** | Filing confirmation on the matter record and client informed | Close the filing occasion in scope |
| **further action required** | CIPC query, rejection, hard-stop still blocking AR, or new discrepancy | Re-open checklist / escalate |

**Status rules (PRACTICAL):**

- Do not jump to **completed** on payment alone — need filing confirmation and a client update.
- Do not mark **ready for submission** if any complexity flag is yes or unknown.
- Do not mark **ready for submission** without a signed engagement/mandate.
- If Annual Return remains hard-stopped after a BO attempt, keep **further action required** — do not claim the AR path is cleared.

---

# Layer 6 — Exceptions and Escalations

*Sixth layer required by #740 / #981. Matters here require specialist assessment. Do not automate or guess.*

| Exception | Why it matters | Immediate operator action |
|-----------|----------------|---------------------------|
| Co-operative presented as BO Register work | OFFICIAL exception | Stop; explain BO Register does not apply; do not file |
| Affected company or subsidiary, or classification unknown | Separate official guide; not standard v1 | Specialist review; do not use the non-affected guide |
| Trust / person acting under a trust agreement | OFFICIAL beneficial-owner / complex-structure class | Specialist review; use official complex-structure materials only under specialist direction |
| Juristic-person owner | Official complex-structure guide | Specialist review |
| Layered / chain ownership or control | OFFICIAL definition + Notice 61 of 2024 | Specialist review; do not flatten the chain into a guessed natural person |
| Foreign owner / incomplete Foreigner Assurance | OFFICIAL integration; certified passport / foreign ID | Specialist review until Assurance status is clear |
| Unclear, disputed, or nominee / unexplained control | False-information offence risk | Specialist review; do not file |
| Historical / inconsistent registers or prior BO filings | Wrong filing can be an offence | Specialist review; gather CIPC screenshots / export notes (no ID images in Git) |
| CIPC reviewer / resubmission / discarded draft | Official reviewer path | Log notices; further action required or specialist review |
| Entity in deregistration / final deregistered | May need a different CIPC process | Stop standard BO; escalate |
| Suspected false or unverifiable information | OFFICIAL offence | Refuse filing; escalate to Sarah |
| Statutory interpretation of who must be declared | Legal / specialist class | Specialist review — do not invent a determination |
| Annual Return still hard-stopped after BO work | OFFICIAL AR dependency | Further action required; do not promise AR clearance |

**Escalation tone to clients (PRACTICAL):** explain that a specialist must review before any filing attempt; list what is blocked; restate that CIPC Desk cannot determine beneficial owners and cannot guarantee CIPC outcomes.

---

## Focused questions for Sarah — still open for v1

The ten questions in Layer 4 are **open**. This pack is review-ready so Sarah can answer them on the standing test page without GitHub or Vercel access.

**How Sarah reviews (after merge/deploy to the CorpFlowAI test spine):**

1. Open **https://cipc.corpflowai.com/beneficial-ownership** (optional alias: `https://cipc-desk.corpflowai.com/beneficial-ownership`).
2. Read the plain-English explanation, checklists, status flow, and escalation list.
3. Submit structured feedback at the bottom of the page (correctness, missing documents, confusing wording, specialist boundaries, inclusions/exclusions, anything unsafe to publish, overall readiness).
4. Feedback uses the **existing** `POST /api/cipc-desk/email-intake` path and creates a synthetic `cipc-desk` CMP ticket. **No live email is sent. Do not attach real identity documents.**

Anton is **not** needed for this review-surface PR. Anton is needed later only for merge (unless a later issue gives exact merge authority) and for any unexpected protected dependency.

---

## Explicit non-actions

This pack does **not** authorise:

- public launch of Beneficial Ownership as a marketed live service beyond the standing corpflow_test review URL;
- runtime `/change`, CRM, auth, schema, or infrastructure work beyond existing review-surface content updates;
- real CIPC submissions from documentation alone;
- collection or storage of identity documents in the repository;
- inventing Desk service fees, turnaround guarantees, or beneficial-owner determinations;
- treating trusts, juristic persons, foreign incomplete paths, or layered ownership as standard automation;
- merge/deploy claims of operational completion without live verification on `https://cipc.corpflowai.com/beneficial-ownership`.

---

## Document control

| Field | Value |
|-------|-------|
| Controlling issue | #981 |
| Research parent | #740 |
| Coordination parent | #640 |
| Pattern baseline | Annual Returns #750 / #758 / #761 / #763 / #791 / #792 |
| Pack version | v1 — review-ready 2026-08-18; Sarah decisions still open |
| Standing test URL | https://cipc.corpflowai.com/beneficial-ownership |
| Feedback path | Existing `POST /api/cipc-desk/email-intake` (subject cue: Beneficial Ownership review feedback) |
| Next step | Merge #981 PR → verify standing test URL returns 200 → Sarah reviews on that URL |
| Public launch | **Not authorised by this pack** |
