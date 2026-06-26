# Codex Integration Contract v1

> **Status:** OPERATING CONTRACT (v1) — docs-only. **NO IMPLEMENTATION AUTHORIZED**
> beyond this document. No app code, CRM, second app, second database,
> `POSTGRES_URL` change, env vars, `.env.template` edits, production DB change,
> Google Workspace write automation, or n8n automation. **No automated outreach.**
> All outreach stays human-approved.
> **Owner:** Anton (operator). **Author:** Cursor (docs).
> **Created:** 2026-06-26.
> **Anchor sentinel:** `<!-- CODEX_INTEGRATION_CONTRACT_V1 -->`

<!-- CODEX_INTEGRATION_CONTRACT_V1 -->

## 0. Problem this contract fixes

Codex produces useful research, data, and script output, but the **handoff** has
been unreliable:

- We already had **one local-only Codex artifact** where the branch / Git SHA
  could not be fetched by GitHub or Cursor (the US medspa research artifact —
  original branch `work` / SHA `5a216e35…` never reached GitHub; it was only
  recovered via operator-supplied transfer-safe text, imported by Cursor in
  PR #462). A local-only branch/SHA is **not a transfer-safe handoff**.
- Sheet updates from Codex are now creating **manual friction**: output that
  cannot be consumed without a human interpreting and reshaping it.

This contract makes Codex output **transfer-safe** (no dependency on a workspace
nobody else can read), **import-safe** (Cursor/the Sheet process can consume it
without interpretation), **owner-routed** (every artifact names its destination
and owner), and **approval-safe** (nothing implies a send or a business-state
change).

This doc supplements and does **not** replace the canonical execution rules. If
any conflict arises, **those rules win**:

- `.cursor/rules/delivery-reality.mdc`
- `.cursor/rules/predeploy-decision-checks.mdc`
- `.cursor/rules/commit-push-doc-constraints.mdc`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `docs/operations/OPERATOR_DISPATCH_ROUTER.md` (§7.1 Codex boundary)
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md`
- `docs/marketing-automation-arm.md` (§8 outreach approval, §9 n8n boundary, §12 tool ownership)
- `docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_AUDIT_WORKFLOW_V0.md`

## 1. Codex role

Codex is a **research / data / script worker only**. It is an input source, not
an owner of delivery or business state.

- Codex is a **research / data / script worker only**.
- Codex **does not own PRs.** (Cursor owns repo/docs PR execution.)
- Codex **does not operate Google Workspace directly** (no Sheet edits, no Drive
  writes, no Docs edits).
- Codex **does not send email or outreach.**
- Codex **does not approve outreach.**
- **Cursor owns repo/docs PR execution.**
- **Anton / the operator owns approval and business-state changes.**

| Actor | Owns | Never |
|---|---|---|
| **Codex** | Research, data, scripts, draft artifacts (text only) | PRs, Sheet/Drive writes, sending, approvals, production changes |
| **Cursor** | Repo/docs PR execution, importing Codex artifacts into the repo | Self-merge, deploy without operator, outreach |
| **Anton / operator** | Approval, business-state changes, sends, secrets, DNS, billing | — |

Codex output is **input to be reviewed**, never a standing instruction or an
authorization to act.

## 2. Approved Codex output formats

Codex may return **only** the transfer-safe formats below unless Anton explicitly
asks for something else. Each format must be a **self-contained block pasted in
full** — never a pointer to a workspace, branch, or SHA that only Codex can read.

### A. Markdown artifact

A complete document, ready for Cursor to import.

- **Full file content** (the entire file, not a summary or a diff narrative).
- **Intended repo path** (e.g. `docs/marketing/research/<name>.md`).
- **Status header** (e.g. `BOUNDED RESEARCH / INPUT MATERIAL — NO IMPLEMENTATION AUTHORIZED`).
- **Provenance** (who produced it, when, and that Codex does not own PRs).
- **Boundaries** (what the artifact does and does not authorize).
- **No secrets** — no tokens, keys, credentials, private URLs, chat IDs, or
  Infisical paths.

### B. CSV block

A clean table for the Sheet process or for Cursor to import.

- **One table / one tab per block** (do not merge multiple tabs into one block).
- **Exact headers** (column names match the destination schema exactly — see §4).
- **Import-safe ASCII where needed** (avoid smart quotes / characters that break
  CSV import; quote fields that contain commas).
- **No prose inside the CSV block** (no commentary, no notes between rows).
- **No hidden formulas** unless explicitly approved (values only — see §5).

### C. Patch block

A Git diff for Cursor to apply — Codex still does not own the PR.

- **`git diff` only** (unified diff format).
- **Specific file paths only** (name every file touched).
- **No PR creation.**
- **No remote configuration** (no `git remote`, no push instructions, no branch
  setup that assumes Codex's workspace).
- **No unrelated files** (the diff touches only what the task names).

### D. JSON manifest

A machine-readable descriptor that routes the artifact to an owner and a gate.

```json
{
  "artifact_name": "us-medspa-audit-update-queue",
  "intended_destination": "Google Sheet: CorpFlowAI - US Medspa Revenue Machine (Audit Update Queue)",
  "owner": "Anton (operator)",
  "source_context": "Codex research/audit pass over public medspa pages",
  "status": "DRAFT — pending Anton approval",
  "allowed_use": "Operator may review and, if approved, copy values into the working Sheet",
  "prohibited_use": "No sending, no approval, no contact, no production change, no Sheet write by Codex",
  "required_approval_gate": "Anton approval in the Sheet before any send",
  "generated_at": "2026-06-26T00:00:00Z"
}
```

Required keys: `artifact_name`, `intended_destination`, `owner`,
`source_context`, `status`, `allowed_use`, `prohibited_use`,
`required_approval_gate`, `generated_at`.

## 3. Forbidden Codex outputs / actions

Codex output is **invalid** (and must be rejected / re-requested) if it does, or
implies, any of the following:

- **No local-only branch/SHA as the sole handoff.** A branch name or Git SHA that
  GitHub/Cursor cannot fetch is not a handoff. Paste full content or a patch.
- **No "I created it in my workspace"** without the full content or a patch block.
- **No PR ownership** (Codex never opens, owns, or merges PRs).
- **No secrets** (tokens, keys, credentials, private URLs, chat IDs, passwords,
  Infisical paths).
- **No app / production changes.**
- **No DB changes.**
- **No `POSTGRES_URL` changes.**
- **No env vars** unless explicitly requested **and** documented in the artifact.
- **No Google Sheet direct edits** (Codex proposes values; a human applies them).
- **No Gmail / email sending.**
- **No automated outreach** of any kind.
- **No approval / status changes that imply sending** (e.g. setting a status to
  `Sent`, `Approved`, `Follow-up due`, or anything that reads as contact made).

## 4. Codex-to-Sheet contract — `Audit Update Queue`

For the **US Medspa Revenue Machine**, Codex Sheet input flows through a single
standard CSV schema: the **`Audit Update Queue`**. This is a **staging queue of
proposed values**, not a write into the master `Prospects` tab. A human (operator)
reviews the queue and copies approved values into the working Sheet per
`docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_AUDIT_WORKFLOW_V0.md`.

### 4.1 Allowed update fields (exact headers)

```text
business_name,website_url,audit_status,cta_clarity_score_1_5,booking_path_score_1_5,mobile_trust_speed_score_1_5,service_clarity_score_1_5,lead_capture_score_1_5,lead_rescue_rating,personalized_angle,draft_outreach_subject,draft_outreach_body,last_reviewed_date,owner
```

| Field | Meaning |
|---|---|
| `business_name` | Clinic / business name (must match the master row). |
| `website_url` | Primary website (must match the master row). |
| `audit_status` | **`Audited`** or **`Outreach drafted`** only (see §4.2). |
| `cta_clarity_score_1_5` | Above-the-fold CTA clarity, 1–5. |
| `booking_path_score_1_5` | Booking / contact path clarity, 1–5. |
| `mobile_trust_speed_score_1_5` | Mobile trust / speed impression, 1–5. |
| `service_clarity_score_1_5` | Treatment / service clarity, 1–5. |
| `lead_capture_score_1_5` | Lead capture / follow-up quality, 1–5. |
| `lead_rescue_rating` | `High` / `Medium` / `Low`. |
| `personalized_angle` | One-line audit-based angle (public observations only). |
| `draft_outreach_subject` | Draft subject line (draft only — nothing sent). |
| `draft_outreach_body` | Draft body (draft only — nothing sent). |
| `last_reviewed_date` | Date Codex performed the audit pass (`YYYY-MM-DD`). |
| `owner` | Who owns this prospect's review (operator-assigned). |

### 4.2 Required fixed values

- `audit_status` may be **`Audited`** or **`Outreach drafted`** — nothing else.
- `anton_approval_status` **must not be included** in this queue.
- `approved_send_channel` **must not be included** in this queue.
- **Any send / approval / follow-up fields must not be included** (e.g. `Sent`,
  `Follow-up due`, `next_action_date`, `reply_status`, `sent_date`,
  `do_not_contact`).

Rationale: approval and business-state fields live with **Anton in the master
Sheet**, behind the §5 gate of the Sheet/Audit workflow. The queue carries only
**research + draft** values; it can never advance a prospect toward contact.

## 5. Validation rules

A Codex Sheet update is **invalid** (reject and re-request) if **any** of the
following is true:

1. It **includes approval fields** (e.g. `anton_approval_status`).
2. It **includes send-channel fields** (e.g. `approved_send_channel`).
3. It **includes** `Sent`, `Follow-up due`, or anything implying contact was or
   will be made.
4. It **changes original business / contact / source fields** (it must not edit
   `city`, `state`, `category`, `contact_page_url`, `booking_url`,
   `public_email_if_visible`, `phone_if_visible`, `source_url`, or
   `initial_fit_reason`; those stay as captured).
5. It **contains private data** (PHI, patient data, health conditions, payment
   instruments, credentials, or any non-public information).
6. It **contains formulas** (any cell beginning with `=`, `+`, `@`, or a
   spreadsheet function — values only).
7. It has **rows without both `business_name` and `website_url`** (every row must
   be keyed to a real, identifiable prospect).

A valid update is: exact headers from §4.1, `audit_status` in the §4.2 set, no
forbidden fields, plain values, every row keyed by `business_name` +
`website_url`, public observations only, draft-only.

## 6. Test case — first 5 medspa audit rows

Use the **first five prospects** from
`docs/marketing/research/us-medspa-revenue-machine-inputs.md` as the example test
payload. All output is **draft-only and pending Anton approval** — the queue
carries no approval or send fields, so it cannot imply contact.

**Manifest (Format D):**

```json
{
  "artifact_name": "us-medspa-audit-update-queue-first5",
  "intended_destination": "Google Sheet: CorpFlowAI - US Medspa Revenue Machine (Audit Update Queue staging)",
  "owner": "Anton (operator)",
  "source_context": "Codex first-pass audit over the first 5 prospect rows (public pages only)",
  "status": "DRAFT — pending Anton approval",
  "allowed_use": "Operator reviews and, if approved, copies values into the master Prospects tab",
  "prohibited_use": "No sending, no approval, no contact, no Sheet write by Codex, no production change",
  "required_approval_gate": "Anton approval in the master Sheet before any send",
  "generated_at": "2026-06-26T00:00:00Z"
}
```

**CSV (Format B) — illustrative shape; scores/angles/drafts are placeholders the
operator confirms, never finals:**

```csv
business_name,website_url,audit_status,cta_clarity_score_1_5,booking_path_score_1_5,mobile_trust_speed_score_1_5,service_clarity_score_1_5,lead_capture_score_1_5,lead_rescue_rating,personalized_angle,draft_outreach_subject,draft_outreach_body,last_reviewed_date,owner
"SculptME Med Spa","https://sculptmemedspa.com/","Audited",3,2,3,4,2,"Medium","Strong injectables content; confirm mobile booking prominence and form follow-up speed.","","","2026-06-26","Anton"
"B.TOX.BAR.","https://www.btoxbar.com/","Audited",3,3,3,4,2,"Medium","Premium injectables buyer likely expects one-tap booking; CTA consistency across service pages.","","","2026-06-26","Anton"
"Be You Medical","https://beyouthful.com/pages/sacramento","Audited",2,2,3,3,2,"Medium","Location, contact, and booking paths may compete; clarify single next action.","","","2026-06-26","Anton"
"Rejuvify Med Spa","https://www.rejuvifymedspa.com/med-spa-in-los-angeles","Audited",4,4,3,4,3,"Medium","Strong booking + phone paths; angle is response-time / missed-call capture, not a rebuild.","","","2026-06-26","Anton"
"The Botox Spot","https://www.thebotoxspot.com/","Audited",3,3,3,3,2,"Medium","Mobile vs in-spa appointment choice should be obvious on mobile; clean enquiry routing.","","","2026-06-26","Anton"
```

Notes on the test payload:

- `audit_status` is `Audited` (not `Outreach drafted`) because subjects/bodies are
  left blank — drafting outreach is the next step, still pre-approval.
- No `anton_approval_status`, no `approved_send_channel`, no send/follow-up fields
  appear — passes §5.
- Every row has both `business_name` and `website_url` — passes §5 rule 7.
- Public observations only; no private data; no formulas — passes §5.

## 7. Definition of done

After this doc lands, Anton can give Codex a **standard prompt** and receive a
clean artifact (CSV / manifest / patch / markdown) that **Cursor or the Sheet
update process can consume without interpretation**.

**Standard Codex request prompt (template):**

```text
Codex, produce a transfer-safe artifact per docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md.

Task: <what you want audited / drafted / scripted>
Required output format(s): <A markdown | B CSV | C patch | D JSON manifest>
Destination: <repo path OR "Audit Update Queue" for the US Medspa Sheet>

Rules (hard):
- Paste full content inline. No local-only branch/SHA as the handoff.
- CSV uses exactly the §4.1 headers; audit_status in {Audited, Outreach drafted} only.
- No approval/send/follow-up fields (§4.2, §5). No formulas. No secrets. No private data.
- Draft-only. Codex does not own PRs, does not write the Sheet, does not send.
- Every CSV row keyed by business_name + website_url.
```

**Done when:**

- Codex returns one of the §2 formats, self-contained, with no local-only
  branch/SHA dependency.
- A returned `Audit Update Queue` CSV passes every §5 validation rule.
- Cursor can import a markdown/patch artifact, or the operator can copy CSV values
  into the Sheet, **without reshaping or interpreting** the output.
- Nothing in the artifact implies a send, an approval, or a business-state change.

## 8. Scope boundaries (carried forward, non-negotiable)

- **Docs-only.**
- **No app code.**
- **No production DB.**
- **No second app.**
- **No second database.**
- **No `POSTGRES_URL`.**
- **No env vars.**
- **No `.env.template`.**
- **No secrets.**
- **No Google Workspace write automation yet** (humans apply Sheet changes).
- **No n8n automation.**
- **No outreach sending.**

## 9. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs-only;
  nothing to deploy.
- **Implementation:** none. No runtime code, no env, no secrets, no DB, no Sheet
  automation, no n8n.
- **Verdict:** PARTIAL by design — contract documented; Codex handoffs become
  transfer-safe / import-safe / owner-routed / approval-safe through operator and
  Cursor use of this contract, under existing gates.
