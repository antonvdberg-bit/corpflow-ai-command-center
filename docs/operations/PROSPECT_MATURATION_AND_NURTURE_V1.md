# Prospect Maturation and Nurture v1 (#713)

**Status:** Slice 1 — unit gate complete. **No schema. No env. No deploy. No external send.**

**Issue:** #713 · WS2 Prospect maturation and nurture · Parent programme #710–#716 · Foundation PR #733 (#721)

**Machine contract:** `lib/prospects/maturation.js`  
**Lifecycle config:** `config/prospect-maturation.v1.json`  
**Draft assets (no-send):** `config/prospect-draft-assets.v1.json`  
**Fixtures:** `fixtures/prospect-maturation/` (8 synthetic scenarios)  
**Unit tests:** `node-tests/prospect-maturation.test.mjs`  
**Foundation contract:** `lib/cmp/_lib/prospect-operations-view-model.js`

**ANTON ACTION:** NONE for Slice 1. No schema, no env, no external send. Operator procedure below is manual-only.

---

## 0. Executive summary

This package adds a **bounded maturation/nurture unit gate** to the existing Prospect Operations foundation. It does not create a second CRM, does not add a Prisma schema column, and does not add any external send runtime (no email, WhatsApp, or SMS dispatch).

| What it adds | How |
|---|---|
| Entry/exit criteria for every lifecycle stage | Config JSON, no DB |
| Required-field validation (owner, next_action, due) | Pure JS function |
| Lead Rescue + Website Rescue qualification gates | Config JSON |
| Draft-only message templates (send=false) | Config JSON, operator manually sends |
| Overdue, stale, reactivation-due detection | Wraps existing view-model helpers |
| Daily operator summary + weekly pipeline health | Pure JS, no external call |
| Stage transition guard with entry-criteria checks | Pure JS |
| 8 synthetic test scenarios | Fixtures JSON |
| 78-test unit gate | Node test runner |

---

## 1. Lifecycle stages — entry/exit criteria

All stages map to existing `PROSPECT_CANONICAL_STAGES` in `lib/cmp/_lib/prospect-operations-view-model.js`. No new stage keys.

### Active stages (SLA and operator attention apply)

| Stage | Operator SLA | Entry summary | Exit summary |
|---|---|---|---|
| `new` | 24 h | Intake submitted | Owner assigned, qualifying started |
| `qualifying` | 48 h | Owner assigned; acknowledgement sent | Qualification criteria met or not-fit |
| `discovery_booked` | 72 h | Qualification met; discovery confirmed | Discovery call completed |
| `proposal_ready` | 24 h | Discovery done; scope + price confirmed | Proposal reviewed and sent |
| `proposal_sent` | 48 h | Proposal approved and sent | Prospect accepts, declines, or goes stalled |
| `awaiting_payment` | 24 h | Prospect accepted; payment details sent | Payment confirmed (protected action) |

Full entry/exit criteria arrays: `config/prospect-maturation.v1.json` § `lifecycle_stages`.

### Non-active stages

| Stage | Notes |
|---|---|
| `won` | Payment confirmed. Onboarding in progress. |
| `delivery` | Active client in pilot/delivery. |
| `stalled` | No activity; operator sets closure_reason + reactivation target. |
| `lost` | Terminal. Full follow-up cadence exhausted or explicit decline. |
| `not_fit` | Terminal. Does not meet qualification criteria. |

---

## 2. Required fields for active prospects

Every prospect in an active stage (`new`, `qualifying`, `discovery_booked`, `proposal_ready`, `proposal_sent`, `awaiting_payment`) **must have**:

1. **`owner`** — string, non-empty
2. **`next_action`** — string, non-empty
3. **`next_action_due`** — ISO date string, resolvable from `next_action_due`, `next_action_date`, or activity entries

Validation function: `validateActiveProspectRequiredFields(prospect)` — returns `{ valid: true }` or `{ valid: false, missing: string[] }`.

Closure stages (`lost`, `stalled`, `not_fit`, and other closure outcomes) **require `closure_reason`** — see `validateClosureReason(prospect)`.

Use `validateProspect(prospect)` for a combined check returning `{ valid, errors }`.

---

## 3. Qualification guidance

### AI Lead Rescue

Gate key: `ai_lead_rescue` in `config/prospect-maturation.v1.json` § `qualification_gates`.

Minimum to advance from `qualifying` to `discovery_booked`:

| Field | Why |
|---|---|
| `business_name` | Cannot personalise rescue without business context |
| `email` | Required for proposal and onboarding |
| Region or lead source context | Needed to assess rescue feasibility |
| Urgency / timeline signal | Discovery call prioritisation |

Disqualifiers: no identifiable commercial operation, no budget discussion, already engaged with conflicting provider.

Pilot pricing: **USD 150 launch pilot** — see `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`.

Use `checkQualificationGate(prospect, 'ai_lead_rescue')` to check programmatically.

### Website Rescue / Rapid Delivery

Gate key: `website_rescue` in config.

Minimum to advance from `qualifying` to `discovery_booked`:

| Field | Why |
|---|---|
| `business_name` | Required to scope rescue |
| `email` | Required for proposal and onboarding |
| Website URL or description | Cannot assess rescue scope otherwise |
| Service path / offer slug confirmed | Determines which rescue package applies |

Disqualifiers: no website intent, scope exceeds rapid delivery (escalate to full project), competitor research only.

Use `checkQualificationGate(prospect, 'website_rescue')` to check programmatically.

---

## 4. Draft-only message templates

**ALL draft assets are marked `send: false` and `protected: true`.** Operators must manually review, personalise, and send via their own authenticated channel (WhatsApp, email, LinkedIn — operator chooses). This system **never** triggers any external send.

Config: `config/prospect-draft-assets.v1.json`.

| Asset ID | Stage trigger | Purpose |
|---|---|---|
| `acknowledgement` | `new` | First response within 24 h of intake |
| `qualification_outreach` | `qualifying` | Gather qualification fields when incomplete |
| `discovery_invite` | `qualifying` | Book discovery call after qualification met |
| `follow_up_no_response` | `qualifying` | Day 3, 7, 14 follow-up when no response |
| `nurture_value_share` | `stalled` | Value-first re-engagement (not a pitch) |
| `objection_response` | `proposal_sent` | Handle common objections (price, timing, ROI) |
| `proposal_handoff` | `proposal_ready` | Send proposal to prospect |
| `lost_close` | `lost` | Graceful close maintaining relationship |
| `stalled_check_in` | `stalled` | 30-day check-ins during stalled period |
| `reactivation` | `stalled` | Re-engage after 90-day reactivation window |

**API:**

```js
import { getDraftAsset, getDraftAssetsForStage } from '../lib/prospects/maturation.js';

const asset = getDraftAsset('acknowledgement');
// asset.send is always false regardless of config
// asset.body_template contains the draft with {{variable}} placeholders

const qualifying = getDraftAssetsForStage('qualifying');
// Returns all assets with stage_trigger === 'qualifying'
```

No-send assertion for tests: `assertDraftAssetConfigNoSend()` — returns `{ safe: true }` if all assets have `send=false`.

---

## 5. Overdue, stale, and reactivation detection

All functions are pure JS — no DB queries, no external calls.

| Function | What it detects |
|---|---|
| `isProspectOverdue(prospect, now)` | Active stage + `next_action_due` is in the past |
| `isProspectStale(prospect, now, staleDays)` | No meaningful activity within `stale_days_threshold` (default 7 days) |
| `isReactivationDue(prospect, now)` | Stalled + last activity > `reactivation_window_days` (default 90 days) ago |

These wrap the existing `computeProspectExceptionSignals`, `isStaleActivity`, and `resolveNextActionDue` helpers from `lib/cmp/_lib/prospect-operations-view-model.js`.

---

## 6. Daily operator procedure

**Run daily (recommended 08:00 operator local time):**

1. Open `/admin/rapid-delivery` and `/admin/lead-rescue`.
2. Use `computeDailyOperatorSummary(prospects, now)` to see:
   - `overdue` — act today (call or follow-up)
   - `due_today` — act today
   - `missing_owner` — assign owner immediately
   - `missing_next_action` — set next action + due date
   - `new_unreviewed` — review and move to qualifying or not_fit
   - `action_required_ids` — ordered list of IDs needing attention

3. For each action-required prospect:
   - Check `canonical_stage` and `exception_signals`
   - Use `getDraftAssetsForStage(stage)` to retrieve the appropriate draft template
   - Personalise the draft; **do not send directly from the system**
   - Send manually via your authenticated WhatsApp or email channel
   - Record the activity in the lead's activity log
   - Set new `next_action` and `next_action_due`

---

## 7. Weekly pipeline procedure

**Run weekly (recommended Monday morning):**

1. Use `computeWeeklyPipelineSummary(prospects, now)` to see:
   - `by_stage` — distribution across all 11 canonical stages
   - `stale_active` — active prospects with no activity in > 7 days
   - `health` — `healthy` / `attention` / `critical`

2. For stale active prospects:
   - Review if `isReactivationDue` — decide reactivate or move to lost
   - If reactivating: use `reactivation` draft asset; set stage back to appropriate active stage
   - If closing: record `closure_reason`; move to `lost` or `not_fit`

3. Review `by_stage.new` — any new prospects older than 24 h without an owner are P0

4. Review pipeline velocity: `proposal_sent` and `awaiting_payment` stages should not stall beyond their SLA

---

## 8. Stage transition guard

`validateStageTransition(prospect, toStage)` enforces:

1. Target stage exists in canonical stages
2. `isCanonicalStageTransitionAllowed(from, to)` — canonical forward guard from view model
3. Entry criteria for specific transitions:
   - `new → qualifying`: owner must be assigned
   - `qualifying → discovery_booked`: owner must be assigned
4. Closure reason required when moving to `lost`, `not_fit`, or `stalled`

Returns `{ allowed: true }` or `{ allowed: false, reason: string }`.

---

## 9. Synthetic test fixtures (8 scenarios)

All fixtures use `@example` domains — no real client data.

| File | Scenario | Expected validation |
|---|---|---|
| `01-new-lead-rescue-prospect.json` | New LR intake | Fails: owner, next_action, next_action_due missing |
| `02-qualified-website-rescue-prospect.json` | Qualified WR, discovery booked | Passes |
| `03-overdue-prospect.json` | LR qualifying, past due | Passes validation, overdue=true |
| `04-stalled-prospect.json` | LR paused with closure reason | Passes, not active |
| `05-lost-prospect-with-reason.json` | LR lost, reason recorded | Passes, terminal |
| `06-reactivation-due-prospect.json` | LR stalled >90 days ago | Passes, reactivationDue=true |
| `07-active-prospect-missing-owner.json` | LR qualifying, no owner | Fails: owner missing |
| `08-active-prospect-missing-next-action.json` | LR proposal_sent, no next action | Fails: next_action, next_action_due missing |

---

## 10. Nurture cadence (config-driven)

From `config/prospect-maturation.v1.json` § `nurture_config`:

| Parameter | Value |
|---|---|
| `stale_days_threshold` | 7 days |
| `follow_up_cadence_days` | Day 1, 3, 7, 14 after no response |
| `max_follow_ups_before_lost` | 4 follow-ups |
| `reactivation_window_days` | 90 days |

Follow-up after proposal: use `follow_up_no_response` draft asset at each cadence point. After 4 follow-ups with no response, move prospect to `stalled` (with `closure_reason`) and then `lost` if no reactivation.

---

## 11. No-send proof

- `config/prospect-draft-assets.v1.json` has `"$send": false` and `"$protected": true` at root
- Every individual asset has `"send": false`
- `lib/prospects/maturation.js` has zero imports from any email, WhatsApp, or SMS sender library
- `assertDraftAssetConfigNoSend()` export for runtime/test assertion
- `PROSPECT_PROTECTED_ACTIONS` in the view model includes `external_send` (blocked in shared helper)
- Tests in R8 and R9 verify this at every CI run

---

## 12. Verification commands

```bash
node --test node-tests/prospect-maturation.test.mjs
node --test node-tests/prospect-operations-view-model.test.mjs
git diff --check
npm test
```

Promptfoo / AI eval: **NOT APPLICABLE** for Slice 1 (no AI behaviour, prompts, drafting, or model routing changed — draft asset templates are static strings in config JSON; no AI generation occurs).

---

## 13. Delivery Reality (Slice 1)

```text
Delivery Reality Audit:
- Local fix exists: YES (config + module + fixtures + tests + docs)
- Merged to main: NO (PR only)
- Production deployment ID: n/a (docs/contract; no deploy)
- Commit deployed: n/a
- Live URLs tested: n/a for Slice 1 contract
- Expected vs actual result: 78 unit tests pass; no external send; no schema change
- Client-facing flow usable: n/a (operator-only package; no public surface change)
- Final verdict: PARTIAL (Slice 1 complete; UI wiring to views not yet done)
```

---

## 14. Explicit non-goals (all slices)

- No second CRM / new DB tables without Anton approval
- No Prisma schema additions in this PR
- No frontend framework replatform
- No automated email / WhatsApp / SMS send sequences
- No forecasting analytics, payment automation, or production deploy
- Do not expand into #715/#716/#712 owned paths
- No changes to pages/, marketing, lead-rescue system-proof, or commercial-approval rail
