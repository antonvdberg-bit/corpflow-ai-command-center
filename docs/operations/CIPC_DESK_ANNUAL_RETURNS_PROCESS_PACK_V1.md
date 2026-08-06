# CIPC Desk — Annual Returns Process Pack v1

**Status:** Research / specialist-validation draft for **#750** (parent coordination **#640**; research parent **#740**).  
**Tenant / working name:** `cipc-desk` / **CIPC Desk** (internal working name only — not final public brand).  
**Subject-matter owner:** Sarah Fourie.  
**Evidence date of official-source review:** 2026-08-05.  
**Verdict:** `NO IMPLEMENTATION AUTHORIZED` — documentation and specialist validation only. No runtime, schema, CRM, auth, customer-facing publication, CIPC filing, or paid tooling from this pack.

<!-- CIPC_DESK_ANNUAL_RETURNS_PROCESS_PACK_V1 -->

---

## How to read this pack

Every substantive statement is tagged so Sarah can review without needing technical knowledge:

| Tag | Meaning |
|-----|---------|
| **OFFICIAL** | Stated on current CIPC public material cited below. |
| **PRACTICAL** | Operating recommendation grounded in Sarah’s confirmed direction (#740 business decision) and ordinary CIPC Desk handling — not a substitute for statute. |
| **PROVISIONAL** | Reasonable working assumption until Sarah confirms or a newer CIPC notice supersedes it. |
| **SARAH CONFIRM** | Explicitly open; do not publish or hard-code until Sarah answers. |

**Non-affiliation (PRACTICAL / Sarah-confirmed brand posture):** CIPC Desk is an independent support service. It is **not** CIPC, is **not** endorsed by CIPC, and must never imply official affiliation.

**Guarantee ban (Sarah-confirmed):** Never guarantee CIPC turnaround times, approval dates, processing periods, or successful filing outcomes. Any estimate must stay subject to CIPC processing times, system availability, submission quality, additional-information requests, and manual review.

**Data rule:** This pack uses **no real client or company data**, no identity-document images, and no private filings.

---

## Source list (official)

Reviewed for this draft (public CIPC / CIPC-hosted material only):

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

**OFFICIAL — related but separate:** Annual Compliance Checklist obligations (CIPC notice for Inc., (Pty) Ltd, Ltd, SOC, NPC categories) are **not** identical to Annual Return filing. Treat checklist support as a separate routing decision (**SARAH CONFIRM** whether it is in or out of the paid Annual Returns service).

---

# Layer 1 — Customer explanation

*Audience: client or referring professional. Plain English. Not legal advice.*

### What an Annual Return is

**OFFICIAL / plain-English paraphrase:** An Annual Return is a yearly filing with CIPC that confirms your company or close corporation still exists on the register and updates key information CIPC uses to keep the public company record current. It is **not** a SARS tax return.

### What the CIPC Desk Annual Returns service covers

**PRACTICAL (service framing — pending public copy approval):**

- Helping the client understand what CIPC requires for the Annual Return cycle for their entity type.
- Collecting the facts and supporting items needed for a complete filing attempt.
- Checking whether Beneficial Ownership and AFS/FAS prerequisites appear complete before submission.
- Preparing and submitting the Annual Return through CIPC e-Services / the Annual Returns system **when authority and information are complete**.
- Capturing proof of filing (confirmation / certificate) and telling the client what was filed.
- Escalating to specialist review when the matter is outside a standard filing.

**What the service does *not* automatically include (PROVISIONAL until Sarah confirms packaging):**

- Preparing full Annual Financial Statements or performing an audit / independent review.
- Fixing historical registry errors, restorations, deregistrations, or MOI/share restructures.
- Guaranteeing that CIPC will accept, process, or complete any filing by a stated date.
- Acting as CIPC or giving formal legal opinions.

### What the client must provide

**PRACTICAL — typical inputs (conditional; not every item for every company):**

- Company / CC registration number and registered name.
- Confirmation of entity type (e.g. (Pty) Ltd, CC, NPC, external company — as applicable).
- Financial year information and the anniversary / incorporation date if known.
- Latest annual turnover figure for the filing year(s) being lodged.
- Current contact details for the instructing person and, where needed, directors/members for OTP or verification.
- Confirmation whether Beneficial Ownership is already filed and current; if not, BO information and supporting registers/evidence as required for that structure.
- Confirmation whether FAS or AFS (iXBRL) applies, and the ready FAS answers or AFS package.
- Written authority / mandate for CIPC Desk (or the named filer) to act.
- Payment arrangement for CIPC fees and Desk service fees (**SARAH CONFIRM** commercial packaging).

### What CIPC Desk cannot guarantee

**PRACTICAL / Sarah-confirmed wording posture:**

- CIPC processing time or “Immediate” completion for the client’s matter.
- Approval dates, acceptance dates, or registry status change dates.
- That a filing will succeed on first attempt.
- That penalties, deregistration risk, or enforcement will not arise from past non-compliance.
- That BO, AFS/FAS, or Compliance Checklist issues outside the Annual Return itself will be resolved as part of a standard AR fee.

Any timing estimate must be qualified as subject to:

- CIPC processing times;
- system availability;
- submission quality;
- additional information requests;
- manual review.

### When specialist review may be required

**PRACTICAL / Sarah-confirmed specialist triggers (adapted to Annual Returns):**

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
| A3 | Signed mandate / power of attorney / board or members’ resolution authorising filing | When CIPC Desk (or non-director filer) will lodge | OFFICIAL materials repeatedly require mandates for agent filing; exact form **SARAH CONFIRM** |
| A4 | Confirmation Desk may use / access the relevant CIPC customer code | When filing electronically | PRACTICAL / **SARAH CONFIRM** whether Desk uses client code vs Desk code |
| A5 | Billing contact and fee acceptance | Always before paid work | PRACTICAL |

### B. Company registration details

| # | Item | When required | Notes |
|---|------|---------------|-------|
| B1 | Enterprise / registration number | Always | OFFICIAL — validated in AR system |
| B2 | Registered name as on CIPC record | Always | PRACTICAL cross-check |
| B3 | Entity type (Pty Ltd, Inc, Ltd, SOC, NPC, CC, external company, other) | Always | Determines BO/AFS/checklist routing; **conditional** |
| B4 | Incorporation / registration anniversary date | Always if known | OFFICIAL window language uses anniversary of incorporation |
| B5 | Current CIPC status (in business, AR deregistration process, final deregistered, etc.) | Always | PRACTICAL — status may block AR filing (guide: validation message → enquiry) |
| B6 | Registered office and postal address on record | If client reports changes or mismatch | Address change is a **separate** service if updates needed |
| B7 | Latest disclosure / COR documents available to client | Conditional — useful when records conflict | PRACTICAL; do not store ID images in Git |

### C. Financial-year and turnover

| # | Item | When required | Notes |
|---|------|---------------|-------|
| C1 | Financial year-end | Always | PRACTICAL; links to AFS preparation timing (OFFICIAL six-month AFS preparation rule) |
| C2 | Filing year(s) to be lodged (current and any arrears) | Always | PRACTICAL |
| C3 | Annual turnover for each outstanding year | Always for fee calculation | OFFICIAL — turnover entered in AR calculator |
| C4 | Whether entity is dormant / not trading | Conditional disclosure | PRACTICAL — dormancy does not automatically remove AR duty (**SARAH CONFIRM** client wording) |
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
| E1 | Is entity a co-operative? | Always filter | OFFICIAL — co-operatives excepted from BO Register |
| E2 | Has latest BO declaration been filed for the relevant calendar/filing year? | Companies, external companies, CCs | OFFICIAL hard-stop |
| E3 | Securities register and/or beneficial interest register available | When BO filing required | OFFICIAL anniversary package language |
| E4 | Ownership structure summary (natural persons only vs trusts / companies / foreign) | When BO not already complete | Complex structures → specialist review |
| E5 | Affected vs non-affected company classification (as used in CIPC BO guides) | When filing BO | OFFICIAL guide variants exist on Step-by-Step hub — **SARAH CONFIRM** intake questions |

### F. AFS / FAS / XBRL dependencies

| # | Item | When required | Notes |
|---|------|---------------|-------|
| F1 | Does client / accountant say AFS (audit or independent review) is required this year? | Always ask | OFFICIAL hard-stop requires AFS **or** FAS |
| F2 | If FAS route: client ready to answer FAS prompts | When FAS applies | OFFICIAL guide path |
| F3 | If AFS route: iXBRL package ready / accountant appointed | When AFS must be filed to CIPC | OFFICIAL XBRL manuals on guides hub |
| F4 | Public Interest Score / MOI audit clause known? | When AFS vs FAS uncertain | PROVISIONAL intake flag → specialist or accountant |
| F5 | External company exception awareness | External companies | OFFICIAL comprehensive guides note external-company differences for AFS/FAS — **SARAH CONFIRM** Desk handling |

### G. Proof-of-authority and missing-information checks

| # | Item | When required | Notes |
|---|------|---------------|-------|
| G1 | Mandate / resolution on file and signed by authorised person(s) | Agent filing | PRACTICAL |
| G2 | Missing-information list issued to client in plain English | When any A–F gap exists | PRACTICAL |
| G3 | Client acknowledges AR ≠ tax return and AR ≠ Compliance Checklist | Always | PRACTICAL education |
| G4 | Client acknowledges no timing/outcome guarantee | Always before submission | Sarah-confirmed |

**Missing-information rule (PRACTICAL):** If B1–B3, C2–C3, A3 (when agent filing), E2, or F1 are unanswered, status stays **information incomplete** — do not mark ready for submission.

---

# Layer 3 — Operator checklist

*Internal. Complete in order. Record evidence in the operator work record (not in Git).*

### 1) Authority / mandate confirmation

- [ ] Instructing party identified.
- [ ] Mandate / resolution / POA present when filer is not the sole authorised director/member (**conditional**).
- [ ] Scope of authority covers Annual Return year(s) requested.
- [ ] Customer-code access path agreed (**SARAH CONFIRM** operating rule).
- [ ] If authority unclear → **specialist review** / do not submit.

### 2) Company-record verification

- [ ] Enterprise number validated in CIPC Annual Returns / e-Services.
- [ ] Name and entity type match client instruction.
- [ ] Entity status allows AR filing; if validation blocks filing, log CIPC message and route to exception path.
- [ ] Outstanding AR years listed (paid vs outstanding).
- [ ] Obvious registry mismatches flagged (directors, addresses, FYE) without attempting out-of-scope fixes.

### 3) Completeness review

- [ ] Turnover captured per outstanding year.
- [ ] Contact details usable for CIPC notices / OTP.
- [ ] Client fee and CIPC fee funding path confirmed before cart payment.
- [ ] Client has received plain-English “what we still need” if incomplete.

### 4) BO dependency check

- [ ] Confirm whether BO applies (not a co-operative).
- [ ] Confirm latest BO declaration status for the filing year (OFFICIAL: latest filing associated with same calendar year logic in step-by-step guide).
- [ ] If BO outstanding or rejected → do not treat AR as submission-ready; open BO path or escalate.
- [ ] Complex ownership → specialist review before BO filing.

### 5) AFS / FAS / XBRL dependency check

- [ ] Determine FAS vs AFS route for each filing year (**conditional**).
- [ ] FAS: complete prompts only with client-confirmed answers.
- [ ] AFS: confirm iXBRL / disclosure path readiness; do not invent financials.
- [ ] If AFS already filed: check turnover/revenue consistency note from official guide.
- [ ] Uncertain audit / review / exemption position → specialist or client’s accountant; do not guess.

### 6) Exception detection

- [ ] Scan Layer 6 triggers (below).
- [ ] If any red trigger present → set status **specialist review** or **further action required**; notify client in plain language without promising CIPC outcomes.

### 7) Submission-readiness decision

Mark **ready for submission** only when all are true:

- Authority complete for the filing method.
- Entity validates and status allows filing.
- Turnover present for years being filed.
- BO dependency satisfied or concurrently completable under Desk authority.
- AFS/FAS dependency satisfied or concurrently completable under Desk authority.
- No unresolved specialist red flag.
- Client informed that CIPC outcome/timing is not guaranteed.

### 8) Completion evidence and proof-of-filing capture

After external submission:

- [ ] Payment/filing confirmation retained.
- [ ] Annual Return filing certificate / confirmation saved to the matter record.
- [ ] Note customer-code email destination for CIPC’s copy.
- [ ] Record years filed, fees paid (CIPC), and any BO/FAS/AFS reference numbers available.
- [ ] Client update sent: what was submitted, what proof is attached, and that CIPC remains responsible for registry processing.
- [ ] If CIPC later requests more information → reopen as **further action required**.

---

# Layer 4 — Specialist validation note

*For Sarah Fourie. This section lists what the draft treats as open or sensitive.*

### Rules requiring Sarah’s confirmation

1. **Customer-code model:** Does Desk file under the client’s customer code, a Desk-controlled code, or either depending on mandate?
2. **Mandate instrument:** Preferred template (CIPC-style mandate vs firm letter of engagement + resolution) for Annual Returns only.
3. **Commercial packaging:** What is included in a standard AR fee vs billed as BO-only, AFS coordination, arrears, or Compliance Checklist?
4. **FAS answers:** May operators capture FAS from client email answers, or must Sarah / an accountant approve FAS content?
5. **AFS / XBRL:** Is Desk in-scope to upload client-supplied iXBRL only, or also to coordinate accountants? Never prepare AFS in-house unless Sarah says otherwise.
6. **Compliance Checklist:** In-scope add-on during AR season, separate service, or out of scope for v1?
7. **Dormant entities:** Exact client wording Sarah wants (still usually must file until properly deregistered — confirm).
8. **Multi-year arrears threshold:** When does Desk decline and send to specialist/restoration path immediately?
9. **External companies and NPCs:** Practical differences Sarah sees vs published guides.
10. **Fee figures in client materials:** Confirm whether any rand amounts may appear in customer explanation; this pack intentionally **omits fee tables** pending Sarah + current CIPC Forms & Fees check at time of filing.

### Practical variations by company type (PROVISIONAL map)

| Entity | AR generally applies? | BO hard-stop relevant? | AFS/FAS note | Desk caution |
|--------|----------------------|------------------------|--------------|--------------|
| Private company (Pty) Ltd | Yes (OFFICIAL: companies) | Yes | FAS or AFS by obligation | Most common Desk path |
| Close corporation | Yes | Yes | FAS or AFS by obligation | Member vs director language |
| NPC | Yes | Yes (not a co-op) | Often special AFS/audit analysis | Specialist sooner |
| Public company / SOC | Yes | Yes | AFS / audit route more likely | Specialist |
| External company | Yes (guide references) | Yes (guide: companies, external companies, CCs) | Official guides note differences | **SARAH CONFIRM** |
| Co-operative | Different AR regime | BO Register exception (OFFICIAL) | Separate co-op guides exist | Out of this pack unless Sarah expands scope |

### Historical-record discrepancies

**PRACTICAL escalation examples:**

- CIPC name/status/director data ≠ client understanding.
- Prior AR marked paid but certificate missing.
- BO filed but Annual Return still blocked (calendar-year “latest filing” rule in official guide).
- Turnover rejected because AFS revenue differs.
- Entity in AR deregistration / final deregistered — may be reinstatement territory, not standard AR.

### Cases where CIPC practice may differ from published guidance

**PROVISIONAL — flag for Sarah; do not publish as fact:**

- Intermittent e-Services / Annual Returns portal behaviour vs step-by-step screenshots.
- Enquiry unit split: Service Standards note AR enquiries exclude BO/FAS/AFS (other units).
- Hard-stop messaging that cites BO and AFS/FAS together, while operational fixes may need separate tickets.
- Compliance Checklist enforcement communications that clients confuse with Annual Returns.

### Wording that should remain provisional

- Any numeric fee.
- Any promised Desk turnaround (internal targets may exist later; not client guarantees).
- “We will get you reinstated” / “CIPC will approve within X days”.
- Statements that dormant companies need not file.
- Brand name “CIPC Desk” as final public brand.
- Any claim of CIPC accreditation or partnership.

---

# Layer 5 — Customer status workflow

*Minimum statuses for Annual Returns matters. Email-first client updates; durable record in operator control plane when implemented later.*

| Status | Meaning | Typical next action |
|--------|---------|---------------------|
| **received** | Instruction accepted; intake not yet complete | Run intake checklist |
| **information incomplete** | Missing facts/docs/authority | Send plain-English missing-info list |
| **specialist review** | Outside standard path or legal/registry ambiguity | Sarah (or designated specialist) decides |
| **ready for submission** | Operator checklist green | Submit via CIPC when payment/authority final |
| **submitted externally** | Lodged/paid on CIPC systems | Capture proof; monitor for CIPC notices |
| **awaiting CIPC** | Dependent on CIPC processing, review, or system | No false urgency promises; periodic check |
| **completed** | Filing confirmation/certificate on matter record and client informed | Close AR year(s) in scope |
| **further action required** | CIPC query, rejection, dependency failure, or new discrepancy | Re-open checklist / escalate |

**Status rules (PRACTICAL):**

- Do not jump to **completed** on payment alone — need filing confirmation/certificate (OFFICIAL proof step).
- **awaiting CIPC** is honest when BO/AFS units or back-office must act; still not a timing promise.
- If reinstatement/deregistration discovered, keep AR matter as **further action required** or split a new matter — do not hide the dependency.

---

# Layer 6 — Exceptions and Escalations

*Sixth layer approved by Sarah (#740). Matters here require specialist assessment before proceeding.*

| Exception | Why it matters | Immediate operator action |
|-----------|----------------|---------------------------|
| Unclear company type | Wrong BO/AFS/checklist route | Specialist review; pause submission |
| Historical filing discrepancies | Prior years, missing certificates, conflicting paid/outstanding flags | Specialist review; gather CIPC screenshots/export notes |
| Outstanding BO compliance | OFFICIAL hard-stop blocks AR finalisation | BO path or specialist; status not ready for submission |
| Unresolved AFS/FAS/XBRL dependency | OFFICIAL financials hard-stop | Accountant/specialist; do not invent figures |
| Manual CIPC intervention required | Validation blocks, system errors, back-office only fixes | Log enquiry path; awaiting CIPC / further action required |
| Conflicting company records | Directors, addresses, FYE, name mismatches | Separate corrective service; do not “force” AR |
| Statutory interpretation required | Audit vs review vs exemption; MOI clauses; external company nuances | Specialist review — Sarah-confirmed mandatory class |
| Entity in deregistration / final deregistered | May need reinstatement workflow (separate CIPC process) | Stop standard AR; escalate |
| Trust / deceased estate / foreign complex ownership | Sarah specialist-mandatory class | Specialist review before BO/AR |
| Suspected false or unverifiable information | OFFICIAL: false BO info is an offence | Refuse filing; escalate to Sarah |

**Escalation tone to clients (PRACTICAL):** explain that a specialist must review before any filing attempt; list what is blocked; restate that CIPC Desk cannot guarantee CIPC outcomes.

---

## Focused questions for Sarah (send only these)

Please confirm or correct:

1. **Customer code:** Client code, Desk code, or case-by-case?
2. **Standard AR package:** What is included vs excluded (BO filing, FAS capture, AFS upload only, Compliance Checklist, arrears years)?
3. **Mandate form:** Which template must clients sign before Desk lodges?
4. **FAS content approval:** Operator-from-client answers OK, or specialist/accountant approval required every time?
5. **Entity types in v1:** Confirm Pty Ltd + CC as standard; NPC / external / public as specialist-only?
6. **Dormant-company client wording:** Approve a single plain-English sentence?
7. **Any published fee or turnaround numbers:** Confirm **none** in customer materials for now?
8. **Compliance Checklist:** in AR pack, separate pack, or later?

No other decisions are required from Sarah to keep this draft in review. Anton is **not** needed for routine validation of this research pack.

---

## Explicit non-actions

This pack does **not** authorise:

- customer-facing publication of these checklists or explanations;
- runtime `/change`, CRM, auth, schema, or infrastructure work;
- real CIPC submissions;
- collection or storage of identity documents in the repository;
- starting #751 (Director Changes) until #750 is review-ready;
- merge/deploy claims of operational completion.

Later implementation requires a **separate** focused issue, branch, and PR.

---

## Document control

| Field | Value |
|-------|-------|
| Controlling issue | #750 |
| Parents | #640 (coordination), #740 (research) |
| Pack version | v1 draft for specialist validation |
| Next step | Sarah answers focused questions → revise pack → only then consider implementation issue |
| Implementation | **NO IMPLEMENTATION AUTHORIZED** |
