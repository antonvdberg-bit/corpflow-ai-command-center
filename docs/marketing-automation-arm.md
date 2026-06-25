# CorpFlowAI Marketing Automation Arm — operating playbook (v1)

> **Status:** REFERENCE / OPERATING PLAYBOOK — docs-only capture.
> **NO IMPLEMENTATION AUTHORIZED** beyond this document. This file changes no
> runtime code, dependencies, env vars, database schema/data, Vercel config,
> GitHub settings, routes, deployment settings, analytics, `tenant_id`
> handling, secrets, or production behavior.

This playbook captures the first US medspa revenue-machine workflow for the
CorpFlowAI Marketing Automation Arm as an operating standard. It describes how
people and tools work together on the **operating surface** (Google Workspace +
n8n reminders); it does **not** authorize building new app surfaces.

Related canonical docs (read alongside, do not duplicate):

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand / conversion doctrine.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — Hook / Proof / Depth doctrine.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — above-the-line lens.
- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — bounds on Google AI tooling.
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — AI Lead Rescue commercial launch pack.

---

## 1. Purpose

Define a single, repeatable operating playbook for the CorpFlowAI Marketing
Automation Arm: how the team discovers prospects, audits their web/enquiry
experience, scores fit, drafts personalized outreach, gets Anton's approval,
and tracks sends and follow-ups through to a booked call or intake — using the
Google Workspace operating surface and n8n as a reminder/notification spine.

The Marketing Automation Arm is an **operating workflow**, not a software
product. Nothing in this playbook implies new production code or a second app.

---

## 2. Product A wedge

**Product A** is the commercial wedge: AI-ready website rebuild / website
migration **+** lead capture **+** Lead Rescue for medspas, aesthetic clinics,
and elective clinics.

The wedge sells a managed outcome (an AI-ready, conversion-shaped web presence
with reliable lead capture and Lead Rescue follow-up), not a generic AI tool.
This keeps Product A above the commodity line per the Above-the-Line strategy
doctrine.

---

## 3. First market

- **Geography:** United States first.
- **Buyer profile:** established small-to-medium medspas, aesthetic clinics,
  and elective clinics.
- **Explicitly not:** enterprise accounts, hospital systems, or large chains.

Established SMB clinics already have demand and revenue; the wedge improves
capture and follow-up rather than creating demand from scratch.

---

## 4. Revenue workflow

The end-to-end revenue motion is a single ordered pipeline:

1. **Prospect discovery** — identify candidate clinics in the target market.
2. **Website / enquiry audit** — evaluate the prospect's public web and
   enquiry experience against the audit rubric (§7).
3. **Fit score** — derive a fit signal from the rubric scores.
4. **Personalized outreach draft** — AI-assisted draft tailored to the prospect.
5. **Anton approval** — human review and approval before anything is sent.
6. **Tracked send / follow-up** — approved outreach is sent and follow-ups are
   scheduled, with status tracked.
7. **Booked call / intake** — the outcome that closes the loop.

Each prospect moves left-to-right through these stages, with status recorded on
the operating surface (§5–§6).

---

## 5. Google Workspace operating surface

Google Workspace is the operating surface for the arm. **Google Sheets** is the
system of record for the working pipeline and holds:

- the **prospect tracker** (one row per prospect, fields in §6),
- the **audit rubric** scoring (§7),
- **outreach drafts** (first email, follow-ups, social note),
- **approval tracking** (Anton's approve/hold/reject),
- **Google Vids links** for any video assets used (§10),
- **follow-up status** (dates, replies, booked calls).

No prospect data is moved into the production app or its database. The sheet
stays inside Google Workspace.

---

## 6. Prospect tracker fields

The prospect tracker (Google Sheet) uses exactly these columns:

| Field | Notes |
|-------|-------|
| `business_name` | Clinic / business name. |
| `website_url` | Primary website. |
| `city` | City. |
| `state` | US state. |
| `category` | Medspa / aesthetic clinic / elective clinic. |
| `contact_page_url` | Public contact page. |
| `booking_url` | Public booking page, if any. |
| `public_email_if_visible` | Only if publicly visible. |
| `phone_if_visible` | Only if publicly visible. |
| `source_url` | Where the prospect was found. |
| `cta_score` | Above-the-fold CTA clarity score. |
| `booking_friction_score` | Booking / contact path friction. |
| `mobile_impression_score` | Mobile trust / speed impression. |
| `treatment_clarity_score` | Treatment / service clarity. |
| `lead_capture_score` | Follow-up / lead capture quality. |
| `lead_rescue_fit` | Lead Rescue opportunity signal. |
| `initial_fit_reason` | Short rationale for the fit signal. |
| `outreach_angle` | The angle to lead with. |
| `first_email_draft` | First outreach email draft. |
| `follow_up_1_draft` | First follow-up draft. |
| `social_note_draft` | Optional social touch draft. |
| `approval_status` | Anton's decision (pending / approved / hold / rejected). |
| `workflow_status` | Pipeline stage from §4. |
| `sent_date` | Date first outreach sent. |
| `follow_up_1_date` | Date follow-up 1 sent. |
| `follow_up_2_date` | Date follow-up 2 sent. |
| `reply_status` | Reply state. |
| `booked_call` | Whether a call/intake was booked. |
| `do_not_contact` | Suppression flag. |
| `vids_asset_needed` | Whether a Google Vids asset is needed. |
| `vids_script_status` | Script status for the Vids asset. |
| `vids_link` | Link to the Google Vids asset. |
| `vids_approved` | Whether the Vids asset is approved. |
| `video_used_in_outreach` | Whether a video was used in outreach. |

---

## 7. Audit rubric

Each prospect's public web / enquiry experience is scored on these dimensions:

1. **Above-the-fold CTA clarity** — is the primary action obvious immediately?
2. **Booking / contact path** — how easily can a visitor book or contact?
3. **Mobile trust / speed impression** — does the mobile experience feel fast
   and trustworthy?
4. **Treatment / service clarity** — are treatments / services clearly explained?
5. **Follow-up / lead capture quality** — is there a real lead-capture and
   follow-up mechanism, or do enquiries leak?
6. **Lead Rescue opportunity** — is there an obvious gap where Lead Rescue would
   recover lost or unanswered enquiries?

Scores map to the corresponding tracker fields in §6 and feed the fit score (§4).

---

## 8. Outreach approval policy

Outreach is **AI-assisted and human-approved only.**

- AI may draft outreach; a human (Anton) must approve before anything is sent.
- **No fully automated cold outreach** until explicitly approved by Anton.
- The `approval_status` field gates the transition from "drafted" to "sent".

This policy is binding for the arm and is not relaxed by tooling convenience.

---

## 9. n8n workflow boundary

n8n is a **reminder / notification spine** for this arm. It **may**:

- watch Sheet statuses,
- notify Anton,
- create approval reminders,
- create draft / send **tasks** (work items for a human),
- schedule follow-up reminders.

n8n **must not** automatically send cold outreach. Sending remains a
human-approved action consistent with §8 and with the automation framework's
non-negotiables (no silent widening of trust; high-impact actions stay gated).

---

## 10. Google Vids pilot

**Google Vids** is adopted as a Google Workspace-side **pilot** for:

- Product A explainers,
- prospect audit walkthroughs,
- client onboarding videos,
- internal SOPs,
- monthly client recap videos.

Google Vids is **not a production app dependency**. It is a communication /
video-asset tool on the operating surface only, consistent with the Google
Acceleration Lane (internal acceleration; no sensitive client data without a
separate security / privacy review).

---

## 11. Marketing / brand hub requirement

Standardize a single Google Workspace folder hub named
**"CorpFlowAI - Marketing & Brand Hub"** with these subfolders:

```text
CorpFlowAI - Marketing & Brand Hub/
  01 Brand Assets
  02 Product A - Website + Lead Rescue
  03 Prospect Audits
  04 Google Vids Scripts and Exports
  05 Outreach Templates
  06 Case Studies and Proof
  07 Client Onboarding Assets
  08 Approved Logos and Visual Standards
```

This is the canonical location for marketing/brand working assets on the
operating surface. It is organizational only; it introduces no app/runtime
dependency.

---

## 12. Tool ownership

| Tool | Role |
|------|------|
| ChatGPT / OpenAI | Technical director and reviewer. |
| Cursor | Repo / docs executor and PR implementer. |
| Codex | Bounded research / data / script worker only. |
| n8n | Workflow spine (reminders / notifications, per §9). |
| Google Workspace | Operating surface (system of record for the pipeline). |
| Google Vids | Communication / video-asset pilot (per §10). |
| GoHighLevel (GHL) | Available tactically, **not** the strategic system of record. |

**Codex is never assigned PR ownership.** Cursor owns repo/docs PR implementation.

---

## 13. What not to build yet

The arm explicitly does **not** build, in this phase:

- no custom CRM,
- no second production app,
- no second database,
- no public prospect dashboard,
- no automated cold outreach,
- no uncontrolled AI-to-AI loops,
- no scraping platform,
- no deep GoHighLevel dependency.

These are deliberate non-goals to keep the arm lean and above the line. Any
proposal to change one of these must update this playbook first.

---

## 14. Week-one success criteria

Week one of the arm is successful when:

- **25–50 prospects** captured in the tracker,
- **10–15** of them audited against the rubric,
- **5–10 outreach drafts** approved by Anton,
- the **n8n reminder workflow** defined (not necessarily fully live),
- the **first Google Vids assets** planned.

These are operating-surface outcomes; none require production changes.

---

## 15. Approved research inputs (capture status)

Codex may supply **research / data / script artifacts** that inform this arm.
Such artifacts are **approved research / input material**, not doctrine: they are
inputs to be reviewed against this playbook and the canonical doctrines, and they
**do not override** anything in §1–§14 or in
`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` unless Anton explicitly
promotes a specific finding after review.

| Artifact | Intended path | Source | Capture status |
|----------|---------------|--------|----------------|
| US medspa revenue-machine inputs | `docs/marketing/research/us-medspa-revenue-machine-inputs.md` | Codex (local workspace); recovered 2026-06-25 via operator-supplied transfer-safe text (original branch `work` / SHA `5a216e35…` never reached GitHub) | **CAPTURED** — bounded research/input material; **Anton review required before outreach** |

The artifact contains prospect rows, audit rubric, Google Sheets template fields,
outreach template starters, and Google Vids script drafts. It is **research /
input material**, not doctrine — review against this playbook and the canonical
doctrines before any outreach or collateral use. Capturing it does **not**
authorize outreach, build, CRM, or production change.

Boundaries (carried from §12–§13 and the Operator Dispatch Router):

- **Codex remains a research / data / script worker only** and **never owns PRs**
  (`docs/operations/OPERATOR_DISPATCH_ROUTER.md` §7.1). Cursor owns repo/docs PRs.
- Captured research is **input**, not authorization. It does not, by itself,
  trigger any build, outreach, or production change.
- Outreach stays **AI-assisted and human-approved** per §8; no automated cold
  outreach.
- No new app, no second database, no `POSTGRES_URL` change, no env vars, no
  `.env.template` edits, no secrets are implied by capturing research.
