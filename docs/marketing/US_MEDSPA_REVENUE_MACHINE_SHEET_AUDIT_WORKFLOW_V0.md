# US Medspa Revenue Machine — Google Sheet + Audit Workflow v0

> **Status:** PROCESS SPECIFICATION (v0) — docs-only. **NO IMPLEMENTATION AUTHORIZED**
> beyond this document. No app code, CRM, second app, second database,
> `POSTGRES_URL` change, env vars, `.env.template` edits, production DB change, or
> n8n automation. **No automated cold outreach.** All outreach stays human-approved.
> **Owner:** Anton (operator). **Author:** Cursor (docs).
> **Created:** 2026-06-25.
> **Anchor sentinel:** `<!-- MEDSPA_SHEET_AUDIT_WORKFLOW_V0 -->`

<!-- MEDSPA_SHEET_AUDIT_WORKFLOW_V0 -->

## 1. Purpose

Turn the captured Codex research artifact
(`docs/marketing/research/us-medspa-revenue-machine-inputs.md`, imported via
PR #462 as **bounded research/input material**) into a **controlled working
process** on the Google Workspace operating surface:

- create/populate the Google Sheet structure from the artifact,
- define the audit-status flow,
- define the Anton approval gate,
- define the allowed manual send/follow-up states,
- keep **all** outreach human-approved.

This is a **process specification**, not an implementation and not an authorization
to contact anyone. It tells a human operator how to run the working sheet safely.

## 2. Governance and source of truth

| Layer | Role |
|---|---|
| **Repo docs** (`docs/**`) | Canonical doctrine + this process spec. Win on rules. |
| **Captured artifact** (`docs/marketing/research/us-medspa-revenue-machine-inputs.md`) | Bounded **research/input** material; **not doctrine**; Anton review required before outreach. |
| **Google Sheet** (`CorpFlowAI - US Medspa Revenue Machine`) | Working pipeline / system of record for the operating process. Stays inside Google Workspace; no prospect data moves into the production app or DB. |
| **n8n** | Not used in v0. Any future use is **notify-only** and **separately approved** (`docs/marketing-automation-arm.md` §9). |

Canonical references (read alongside; do not duplicate):

- `docs/marketing-automation-arm.md` — Marketing Automation Arm playbook (tracker
  fields §6, audit rubric §7, outreach approval §8, n8n boundary §9).
- `docs/marketing/research/us-medspa-revenue-machine-inputs.md` — the captured
  artifact (prospect table, rubric, Sheet template, outreach starters, Vids scripts).
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md` — workstream #3 + priority.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand/conversion rules.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — required before any data-handling
  change beyond a manual working sheet.

Rule: if the artifact and a doctrine doc disagree, **doctrine wins**. The artifact
is input to be reviewed, not a standing instruction.

## 3. Google Sheet structure (build from the artifact)

Create one Google Sheet named **`CorpFlowAI - US Medspa Revenue Machine`** with the
tabs below. Column definitions are the artifact's Sheet template (the artifact is
the source); this section adds the **operating semantics** for the workflow fields.

| Tab | Purpose | Source of columns |
|---|---|---|
| `Prospects` | One row per prospect; pipeline state, audit scores, draft outreach, approval. | Artifact § *Google Sheets template → Prospects* + Marketing Arm §6 tracker fields. |
| `Audit Rubric` | The 5-dimension scoring reference. | Artifact § *audit rubric* + Marketing Arm §7. |
| `Outreach Templates` | Reusable subject/opening/proof/offer/CTA + follow-ups + compliance notes. | Artifact § *Outreach Templates* starters. |
| `Google Vids Assets` | Script/asset tracker with doctrine-review + production status. | Artifact § *Google Vids Assets*. |
| `Follow Up Queue` | Approved follow-ups only, with stop reasons and review flags. | Artifact § *Follow Up Queue*. |

**Population step (manual, operator):** copy the artifact's CSV prospect rows into
`Prospects`, and the rubric/template/Vids rows into their tabs. This is a manual
copy into Google Workspace; no script, no import job, no app, no DB.

**Data minimisation:** only **public, non-sensitive** business info (the artifact's
fields). **No patient data, no PHI, no health conditions, no payment-instrument
data, no credentials.** If something sensitive appears, do not record it.

## 4. Audit-status flow

Each prospect moves left-to-right through `audit_status` (from the artifact's
Prospects tab). v0 states and the gate to advance:

| # | `audit_status` | Meaning | Allowed transition (who) |
|---|---|---|---|
| 1 | `Not started` | Captured, not yet audited. | → `Audited` (operator runs the §3 rubric). |
| 2 | `Audited` | Scored on all 5 rubric dimensions + Lead Rescue rating. | → `Outreach drafted` (operator drafts using a template). |
| 3 | `Outreach drafted` | Draft subject/body present; **nothing sent**. | → `Anton approved` **only via the §5 gate**. |
| 4 | `Anton approved` | Anton approved a specific channel + message. | → `Sent` (operator sends manually per §6). |
| 5 | `Sent` | First approved outreach sent manually. | → `Follow-up due` or `Closed`. |
| 6 | `Follow-up due` | An approved follow-up is scheduled. | → `Sent` (next approved touch) or `Closed`. |
| 7 | `Closed` | Loop ended (booked, not fit, or do-not-contact). | terminal. |

Rules:

- A prospect **cannot** reach `Sent` without passing through `Anton approved`.
- `do_not_contact` (artifact field) overrides everything → `Closed` with a reason.
- No status is advanced by a script or automation in v0; transitions are operator
  edits in the sheet.

## 5. Anton approval gate

The single hard gate between "drafted" and "sent". Uses the artifact's
`anton_approval_status` field.

| `anton_approval_status` | Meaning | Effect |
|---|---|---|
| `Pending` | Draft awaiting Anton. | Cannot send. Default for every new draft. |
| `Approved` | Anton approved **this** message + **this** channel. | Eligible to move to `Sent` (manual). |
| `Revise` | Anton wants changes. | Back to `Outreach drafted`; redraft. |
| `Do not contact` | Anton blocks the prospect. | → `Closed`; set `do_not_contact_reason`. |

Gate rules:

- Approval is **per message and per channel** (`approved_send_channel`), not a
  blanket "approved forever".
- No bulk approval. Each row is reviewed on its own.
- Approval is recorded in the sheet by Anton; no one else sets `Approved`.
- Changing the message after approval resets `anton_approval_status` to `Pending`.

## 6. Allowed manual send / follow-up states

Sending is **manual and human-performed** in v0. The sheet records what a human
did; it does not send anything.

- **Channels (`approved_send_channel`):** `Email`, `Contact form`,
  `Phone follow-up`, `LinkedIn`, or `None`. Only the channel Anton approved may be
  used.
- **No automated cold outreach.** No bulk email/SMS/WhatsApp/LinkedIn. No mail-merge
  send. No scheduler that sends. A person sends one message at a time, by hand.
- **Follow-ups** (`Follow Up Queue` tab) are only created for prospects with a
  prior `Anton approved` + `Sent`, and each follow-up message is itself
  `Pending → Approved` before it is sent (`anton_review_required = yes`).
- **Stop conditions:** `reply_status` of `Not now`, `Not fit`, or `Do not contact`
  → stop and `Closed` with `stop_reason`. Respect any opt-out immediately.
- **Cadence:** human-paced, warm, per the Marketing Arm. No volume targets that
  would push toward spammy behavior.

## 7. Boundaries (carried forward, non-negotiable)

- **No automated cold outreach** — outreach is human-approved and human-sent.
- **No app code, no CRM build, no second app, no second database.**
- **No `POSTGRES_URL` changes, no env vars, no `.env.template` edits, no production
  DB changes.**
- **No n8n automation in v0.** Any future n8n is **notify-only** and **separately
  approved** (watch sheet status, remind Anton, create human tasks — never send).
- **No secrets** in the sheet, docs, chat, logs, or screenshots.
- Prospect data stays in Google Workspace; it does not enter the production app/DB.
- The captured artifact is **research/input**, not doctrine; this process does not
  promote it to doctrine.

## 8. Definition of done (v0, operator-run)

- The Google Sheet exists with the five tabs and the artifact rows populated.
- Every prospect has an `audit_status`; audited prospects have all 5 scores + a
  Lead Rescue rating.
- No row is in `Sent` without a recorded `Anton approved` for that message+channel.
- The `Follow Up Queue` contains only approved, human-sent follow-ups with stop
  reasons where applicable.
- No automation, no app, no DB, no n8n exists as a result of v0.

## 9. Future candidates (not authorized here)

- **n8n notify-only reminders** (sheet-status → remind Anton) — separate approval,
  `docs/marketing-automation-arm.md` §9; never sends outreach.
- **Operator-cockpit view** of the pipeline — separate packet; would hit app/DB
  gates and the security review checklist.
- **Email notification** on a new qualified row — via existing comms only
  (`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`), human-approved.

Each is a separate, gated decision. None is enabled by this v0 spec.

## 10. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs-only.
- **Implementation:** none. The working sheet is operator-built in Google Workspace;
  this doc only specifies the process.
- **Verdict:** PARTIAL by design — process documented; execution is manual,
  human-approved, and outside the production app/DB.
