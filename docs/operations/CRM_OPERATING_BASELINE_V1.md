# CorpFlowAI CRM operating baseline v1

**Status:** Operator pack for GitHub **#701**. Documentation + configuration mapping only.
**Controller:** [#710](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/710) (August revenue activation).
**Machine contract:** `config/crm-operating-baseline.v1.json` · `lib/prospects/crm-operating-baseline.js`
**Reuse (do not replace):** `docs/operations/PROSPECT_OPERATIONS_V1.md` (#721), `docs/operations/PROSPECT_MATURATION_AND_NURTURE_V1.md` (#713).
**Templates:** `docs/operations/templates/crm-operating-templates.md`

**ANTON ACTION: NONE.** No schema, env, secret, payment, or live-send change is required to use this baseline.

<!-- CRM_OPERATING_BASELINE_V1 -->

## What is true when this pack is in use

CorpFlowAI markets, qualifies, quotes, and follows up on **one Postgres `leads` table** plus existing `qualification_json` fields. Operators use **one stage language** (below) that maps onto the stages already in the prospect view-model. There is **no second CRM**, no second database, and no automated message send.

---

## 0. First-response packet (#701)

| Question | Answer now |
| -------- | ---------- |
| Existing CRM assets | Postgres `leads`; `qualification_json` product namespaces; `/admin/lead-rescue`; `/admin/rapid-delivery`; `/change` (tickets + Lux tenant CRM slice); `/change/revenue` (localStorage only — not canonical); maturation config + draft-only templates (#713); Lead Rescue / Website Rescue sales packs |
| Missing documentation (this pack) | One operator CRM guide, field/status map, qualification templates for managed workflow + future products, daily/weekly runbook, gap matrix, copy-ready note templates |
| Existing field/status support | See §3 and §9. Canonical stages already exist. Product-native statuses remain what is written to the database |
| Configuration-only opportunities | Stage overlay; Rapid Delivery `owner` / `next_action` / `next_action_due` JSON keys; `consent_contact` on intake meta; `related_refs` for quote/delivery issue numbers; keep drafts in existing JSON |
| True blockers | **None to start.** Schema is **not** required. Anton is **not** required unless someone later wants new tables, a paid CRM, env/secrets, or live send |
| Branch / PR plan | This docs+config PR against `main`. No merge by the factory worker |
| Anton required now? | **No** |

---

## 1. CRM purpose and boundaries

| Lane | What it is | What it is not |
| ---- | ---------- | -------------- |
| **CorpFlowAI business CRM** (this pack) | Our own pipeline: enquiry → qualification → quotation → win/lose → delivery handoff | A client’s customer database |
| **Core / factory** | Operator desks, `/change` factory oversight, CMP tickets for **our** delivery work | Tenant marketing sites |
| **Tenant workflows** | Lux concierge CRM (`qualification_json.lux_operator_workflow`), CIPC Desk, other tenant `/change` tickets | CorpFlowAI’s sales pipeline |
| **ERPNext** | Invoicing / customer identity **after** commercial approval (#551 / #880+). Full ownership matrix: [`docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`](../governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md) (#918) | Daily prospect kanban |

**Data ownership**

- CorpFlowAI prospect rows live in **our** Postgres (`leads`), tenant-scoped when the intake is tenant-hosted.
- Client-private data from a **client’s** customers does **not** belong in this pack, in docs, in tests, or in screenshots.
- Redact phone numbers, personal emails, and message bodies in any shared evidence.

**Privacy**

- Record consent/contact preference when known (`intake_meta.consent_contact` or a one-line note).
- Do not paste CRM exports, ID documents, or health data into GitHub.

**Hard boundary:** Postgres remains the production data source of truth. `/change` remains the canonical operator control surface **where it already applies**. Product desks remain the working UI until Prospect Operations views are unified (#721 / #772).

---

## 2. Lead lifecycle (operator language → existing stages)

Issue #701 asked for everyday names. Those names **overlay** the canonical stages already used in code. Persistence stays product-native (`Lead.status` / Rapid Delivery JSON status).

| Operator stage | Maps to canonical stage(s) | Enter when | Leave when | Required next action |
| -------------- | -------------------------- | ---------- | ---------- | -------------------- |
| **New** | `new` | Intake or enquiry created a `leads` row | Owner assigned; acknowledgement draft ready | Review within **24 hours**; assign owner |
| **Contacted** | `qualifying` | First response sent by the operator | Qualification done or not-a-fit | Qualification questions; **owner + next action + due date** |
| **Qualified** | `discovery_booked` | Product gate passed; discovery booked | Discovery complete | Hold the call; capture notes |
| **Proposal / quotation prepared** | `proposal_ready` | Scope and price taken from the pricing guide | Copy-ready to send; #551 handoff started | Assemble quote; **do not auto-send** |
| **Awaiting decision** | `proposal_sent` or `awaiting_payment` | Operator sent proposal or payment instruction | Won, lost, or nurture | Follow-up days **1 / 3 / 7 / 14** |
| **Won** | `won` | Payment/acceptance **confirmed by the operator** (protected — not auto) | Delivery issue opened | Handoff to **#550** (Lead Rescue) or **#654** (Website Rescue) |
| **Lost** | `lost` | Decline or cadence exhausted + `closure_reason` | Reactivation signal | Stop chasing; record reason |
| **Nurture / follow-up** | `stalled` | Timing wrong; relationship still open | Reactivate or close | Value-first check-in from **draft** templates only |
| **Closed** | `lost` / `not_fit` (and delivery-complete tickets) | Terminal outcome recorded | Genuine reactivation only | None |

Full arrays: `config/crm-operating-baseline.v1.json` § `business_stages`.
Entry/exit for the canonical keys: `config/prospect-maturation.v1.json`.

**Cadence (already in maturation — do not invent a second clock)**

- First response: **24 hours**
- Stale: **7 days** without meaningful activity
- Follow-up: days **1, 3, 7, 14**
- After **4** unanswered follow-ups → nurture (`stalled`) then **lost** if nothing returns
- Reactivation window: **90 days**

---

## 3. Minimum lead record

Every active CorpFlowAI prospect must be describable with the fields below. All of them **already fit** on `leads` columns or `qualification_json`. **No new Prisma column.**

| Need | Where it already lives |
| ---- | ---------------------- |
| Contact + business identity | `leads.name`, `email`, `phone`, `contact`; `intake_meta.business_name` |
| Source | `intake_meta.source` / `page` / `host`; `leads.intent` |
| Product / service interest | `intake_meta.product` (`ai-lead-rescue` or `corpflow-rapid-delivery`); offer slug / service path |
| Problem / outcome sought | `leads.message`; operator notes |
| Urgency / timing | `intake_meta.urgency`; optional `expected_close_date` in JSON |
| Qualification summary | Product notes JSON |
| Current stage | Native status → canonical stage via the view-model |
| Next action + due date | Lead Rescue operator JSON + activity dates |
| Owner | Lead Rescue `owner` JSON |
| Notes / history | Lead Rescue `activity[]`; Rapid Delivery `notes` |
| Consent / contact preference | `intake_meta.consent_contact` when present; else a dated note |
| Quote / delivery references | JSON `related_refs` (GitHub issue numbers only) |

**Owner / next-action / due-date rule**

On every **active** row after first review: **owner**, **next action**, and **due date** are mandatory. Enforced in `validateActiveProspectRequiredFields`. If Rapid Delivery rows lack owner/due keys, write them into `qualification_json.rapid_delivery_operator` using the **same names** — do not add database columns.

---

## 4. Product qualification guides

Copy-ready question lists: `docs/operations/templates/crm-operating-templates.md` § Qualification.

| Product | Pass when | Fail when | Next action |
| ------- | --------- | --------- | ----------- |
| **Lead Rescue** | Business name, email, enquiry source/region, timing; buyer can decide on the USD 150 launch pilot | No commercial operation; wants guaranteed leads/revenue; will not name one leaky source | Discovery script → proposal via **#551** |
| **Website Rescue** | Business name, email, current URL or description, offer slug | No website intent; shop/multi-site in week one; ranking/sales guarantees | Discovery → Website Rescue pack quotation |
| **Managed workflow / admin improvement** | Named broken workflow + 30-day outcome; CorpFlow operates the outcome | Generic chatbot/agent; unauthorised new self-hosted tool; storing another org’s customers in a second CRM | Qualify as a managed outcome; **Anton** before a new SKU promise |
| **Future product** | Named pain + closest existing SKU | Duplicate SKU rename; needs send/payment/schema just to qualify | Stay on the same `leads` row; review weekly |

Lead Rescue and Website Rescue **gates already exist** in `config/prospect-maturation.v1.json`. Managed workflow and future-product guides in this pack are **operator procedure** until a later config slice adds matching gate keys (not required to start).

---

## 5. Sales and delivery handoff

```text
Enquiry  →  Qualification  →  Quotation (#551)  →  Won  →  Delivery issue (#550 / #654)
                ↓                                         ↓
              Not a fit                                 Support / maintenance on that issue
                ↓
         Lost or nurture (#713 drafts)
```

| Step | Operator does | Must not |
| ---- | ------------- | -------- |
| Enquiry → qualification | Own the row within 24h; fill the minimum record | Dump cold names into the Lead Rescue cockpit (#715 delivery surface) |
| Qualification → quotation | Use the product pricing guide; start **#551** evidence path | Invent a price or auto-send the quote |
| Accepted quote → delivery | Confirm payment (Anton/operator; protected); open a **delivery issue**; link `related_refs` | Keep “selling” on the prospect row; skip onboarding intake |
| Delivery complete → support | Note the maintenance path on the delivery issue | Open a second CRM “account” object |
| Lost / nurture | `closure_reason` + draft close or value-share | Automated chase sequences |

Pre-intake cold prospects may still live in the Lead Rescue **spreadsheet** (`docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md`). Once they submit intake, **this** baseline applies on the `leads` row.

---

## 6. Operator procedures (daily / weekly)

### Daily (target: 08:00 UTC review, ~15 minutes)

1. Run the mental (or later UI) equivalent of `computeDailyOperatorSummary`: overdue, due today, new unreviewed, missing owner, missing next action.
2. **New** rows older than 24 hours without an owner are P0.
3. Prepare acknowledgement / follow-up **drafts** from `config/prospect-draft-assets.v1.json`. **Send only from your own logged-in channel after you have read the draft.**
4. Update next action + due date before leaving the row.
5. Escalate to Anton **only** for: price exceptions, payment confirmation, live send automation, schema/env, or a commitment CorpFlow cannot keep with an existing SKU.

### Weekly (Monday)

1. `computeWeeklyPipelineSummary` — counts by stage, stale actives, health.
2. Report **only numbers the rows support**. If value is unknown, write “unknown” — never fill with a guess.
3. Decide nurture vs lost for stale rows past the 90-day window.
4. Confirm every **won** row has a delivery issue (#550 or #654 / #715 / #716).

### Stale leads

No meaningful activity for 7 days → set a dated next action or move to **nurture** with a reason. After four follow-ups with no reply → **lost**.

### Duplicate detection

Same **email + product** is a duplicate. Keep one row; note the duplicate id in history. Do **not** auto-merge. Do **not** need a new table.

### Note-writing standard

- Dated, named actor, channel (WhatsApp / email / call).
- Facts first; no client-private dumps.
- Every note ends with **next action + due date** or an explicit terminal reason.

### Privacy / redaction

Redact personal data in GitHub, tests, and screenshots. Synthetic `@example` domains only in fixtures.

### No live send without approval

Drafts are `send: false`. This pack does **not** authorise email, WhatsApp, or SMS dispatch. Internal reminders and copy-ready drafts **are** allowed.

---

## 7. Templates

Use `docs/operations/templates/crm-operating-templates.md` for:

- Lead summary
- Qualification summary
- Discovery call notes
- Follow-up draft
- Quotation handoff (#551)
- Won / lost reason
- Delivery handoff (#550 / #654)
- Weekly pipeline summary

Message drafts that already exist (acknowledgement, nurture, objection, lost-close) stay in `config/prospect-draft-assets.v1.json` so we do not duplicate a second template store.

---

## 8. Reporting baseline

| Metric | How to count | Fabricate? |
| ------ | ------------ | ---------- |
| New enquiries | Canonical `new` (or native new intake) | **No** |
| Qualified opportunities | `discovery_booked` and later **active** stages | **No** |
| Quotations issued | `proposal_ready` + `proposal_sent` | **No** |
| Wins / losses | `won` / `lost`+`not_fit` after operator-marked outcomes | **No** |
| Value by stage | Sum `estimated_value` **only when present** | **No** |
| Overdue next actions | `computeDailyOperatorSummary.overdue` | **No** |
| Source / product conversion | Group by `intake_meta.product` and `source` when both exist | **No** |

If a cell cannot be produced from rows, leave it blank or write **unknown**. Empty pipeline ≠ zero revenue invented for a slide.

---

## 9. Configuration audit / gap matrix

### Already present (reuse)

| Surface | What exists |
| ------- | ----------- |
| Prisma `Lead` | `id`, `tenantId`, `name`, `email`, `contact`, `message`, `phone`, `intent`, `market`, `listing`, `status`, `qualificationJson`, `score`, timestamps |
| Lead Rescue desk | `/admin/lead-rescue` — owner, next action, activity, commercial fields |
| Rapid Delivery desk | `/admin/rapid-delivery` — operator status, proposal **copy** (no send) |
| `/change` | CMP tickets; Lux tenant CRM in `lux_operator_workflow` (tenant lane — not this pack) |
| `/change/revenue` | Manual cards in **browser localStorage** — **not** the same records |
| Maturation | Stages, gates, drafts, daily/weekly summaries, tests |

### Configure / map (this PR — no schema)

| Item | Action |
| ---- | ------ |
| #701 stage names | Overlay in `config/crm-operating-baseline.v1.json` |
| Rapid Delivery owner / due | Document JSON key adoption |
| Quote + delivery issue numbers | `related_refs` in JSON |
| Reporting | Count from existing summary helpers |

### Code later, still no schema

| Gap | Why it is not a blocker for this issue |
| --- | -------------------------------------- |
| `/change/revenue` not on Postgres | Operators can use product desks today |
| No unified Prospect Workbench | Desks already process the same `leads` |
| Rapid Delivery missing owner/due in UI | JSON can be written; UI can follow |
| Duplicate warning in UI | Manual email check is enough to start |

### Stop for Anton (schema / vendor / send)

| Request | Verdict |
| ------- | ------- |
| New CRM tables or second database | **Blocked** |
| New `leads` columns for owner/stage/due/consent | **Not needed** — JSON is enough |
| Paid CRM (Twenty, HubSpot, Espo, etc.) | **Blocked** |
| Automated WhatsApp/email/SMS from this pack | **Blocked** (drafts only) |

---

## 10. Verification

```bash
node --test node-tests/crm-operating-baseline.test.mjs
node --test node-tests/prospect-maturation.test.mjs node-tests/prospect-operations-view-model.test.mjs
git diff --check
```

Promptfoo / AI eval: **NOT APPLICABLE** — this pack does not change AI behaviour, prompts, model routing, Lead Rescue drafting runtime, or protected-action handling. Qualification copy is static operator text.

---

## 11. Delivery Reality

```text
Delivery Reality Audit:
- Local fix exists: YES (docs + config + mapping module + tests)
- Merged to main: NO (PR only)
- Production deployment ID: n/a — operator docs/config; no client-facing runtime change
- Commit deployed: n/a
- Live URLs tested: n/a — docs/config pack; desks unchanged
- Expected vs actual result: stage map validated against existing canonical stages; no schema; no send
- Client-facing flow usable: n/a (operator pack)
- Final verdict: PARTIAL (pack usable after merge; live desk unification remains #721/#772)
```

Environment: **n/a** (docs/config). CorpFlowAI-hosted desks remain **corpflow_test** when those UIs are later wired; this PR does not publish a new public surface.
