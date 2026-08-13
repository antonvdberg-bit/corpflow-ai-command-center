# Prestige Procurement — open questions and Anton decisions

**Status:** Negotiation list for #919. External send remains blocked until the Anton list is cleared.
**Anchor sentinel:** `<!-- PRESTIGE_PROCUREMENT_OPEN_QUESTIONS_V1 -->`

<!-- PRESTIGE_PROCUREMENT_OPEN_QUESTIONS_V1 -->

---

## A. Questions to ask Prestige (do not guess in the meeting)

| # | Question | Why it matters | If unanswered |
|---|----------|----------------|---------------|
| Q1 | What is the **legal entity name** for the quotation? | ERPNext Customer + quotation | Use trading name “Prestige Procurement” as a placeholder only inside this repo; do not issue |
| Q2 | Who is the **single named approver**? | Revision rounds and acceptance | Do not start design |
| Q3 | Is there a **current website URL** and must it be redirected? | Migration effort | Assume greenfield brochure until told |
| Q4 | Which pages are non-negotiable? | Locks the eight-page base | Keep base sitemap |
| Q5 | Do buyers need a **public product catalogue** (no checkout)? | OPTIONAL add-on MUR 45,000–90,000 | Keep catalogue **out** of base |
| Q6 | Will Prestige **write the copy**, or buy copywriting? | Schedule + optional MUR 25,000–45,000 | Assume they supply facts; we structure |
| Q7 | English only, or **EN+FR**? | Optional MUR 35,000–60,000 | English base |
| Q8 | Preferred **host** (or “advise us”)? | Independence; client-paid | CorpFlowAI proposes 2 hosts; Prestige signs up |
| Q9 | Who controls the **domain** today? | DNS cutover | Client must own it; we will not register in our name |
| Q10 | Where should **enquiries** arrive (mailbox)? | Forms | Blocked at form setup, not at quoting |
| Q11 | Any **brand files** (logo, colours, photos)? | Design speed | Guided palette if missing |
| Q12 | Target go-live **window** (month), not a fake date? | Sets expectations | Quote 8–12 weeks from mobilisation, not a calendar day |
| Q13 | Is a **shop / payments / login** actually required? | Out of scope if yes | Stop and re-quote; do not fold into 285,000 |

---

## B. Negotiation points (use these levers)

| If they say | You do |
|-------------|--------|
| “Too expensive” | Move to **Option B MUR 165,000** (theme + brand), or cut pages — do not discount Option A below MUR 245,000 without Anton |
| “We need it in four weeks” | Reduce to five pages + Prestige-supplied copy + Option B; custom design + eight pages will not honestly fit |
| “Just host it for us” | Separate hosting conversation; warn that it recreates dependence and a monthly cost |
| “50% now, 50% at the end” | Decline as default; explain five gates; fallback three invoices 30/40/30 if they hate five payments |
| “Can you also do SEO every month?” | No in this offer; optional later retainer — would be a recurring fee they said they do not want |
| “We want WordPress / we hate WordPress” | WordPress is default for independence; Webflow is Option C if they accept vendor hosting |
| “Add a catalogue quickly” | Price the add-on; do not “include it” inside 285,000 |

---

## C. Exact decisions Anton must make **before external send**

Protected gates apply only to the exact action. Preparation is done. **Do not send** until:

| ID | Decision | Recommended default |
|----|----------|---------------------|
| **A1** | Approve the **MUR figure** to print (285,000 / 165,000 / 225,000 / other) | **MUR 285,000** Option A |
| **A2** | Approve **five-milestone** percents (or the 30/40/30 fallback) | 20/20/25/20/15 |
| **A3** | Confirm **WordPress + client-paid host** vs Webflow | WordPress |
| **A4** | Authorise creating ERPNext **Customer + draft Quotation** (and later the `CF-WS-CUSTOM-PROJECT` Item) | Yes, after A1 |
| **A5** | Authorise the **exact external send** (email/WhatsApp/other) of the ERPNext quotation | **Not authorised by #919** — separate yes |
| **A6** | Merge of this planning PR | Human merge; this packet does not self-merge |

Still **not** authorised by clearing A1–A4: production DNS, paying a host, taking payment, schema customization, env/secrets, public launch.

---

## D. What is already decided (do not re-open in the room)

- Currency: MUR.
- Commercial model: one-off CorpFlowAI fee; no CorpFlowAI retainer in the base.
- Independence after handover is a requirement, not a slogan.
- Hosting is client-selected and client-paid unless Anton later includes it in writing.
- Payment is milestone-based, not a default 50/50.
- Dates stay as ranges until Prestige agrees scope.
- Live ERPNext PDF quality stays with #882.
- Markdown in this folder is not the signed commercial original.

---

## E. Ready / not-ready

| Audience | State |
|----------|--------|
| Anton, in a Prestige meeting, with this pack | **READY FOR CLIENT REVIEW** |
| Official quotation in the client’s inbox | **NOT READY** until A1–A5 |
| Live website on Prestige’s domain | **NOT READY** — that is delivery after acceptance, not this issue |

Exact remaining protected action: **Anton approves price (A1) and later authorises the exact quotation send (A5).**
