# ERPNext Projects / Support operational proof v1

**Status:** Live hosted-test proof. **ERPNext PROJECTS / SUPPORT OPERATIONAL PROOF READY.** Current-main landing: **ERPNext PROJECTS / SUPPORT CURRENT-MAIN READY FOR REVIEW.**
**Current-main landing:** [#1134](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1134) — brings the already-proven #1097 / [PR #1102](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1102) packet onto current `main`. Do not merge #1102.
**Source proof:** [#1097](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1097)
**Parents:** [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953), [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918)  
**Reuse baseline:** [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920) / merged [PR #946](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/946)  
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`) — `corpflow_test`  
**Machine contract:** `config/erpnext-projects-support-ops.v1.json`  
**Helper:** `lib/erpnext/projects-support-ops.js`  
**Apply:** `node scripts/erpnext/apply-projects-support-ops.mjs`  
**Evidence:** `artifacts/erpnext/projects-support-ops-1097/` (reused; live apply not redone for #1134)
**#918 rows used:** `project_task_timesheet`, `issue_support`

**Anchor:** `<!-- ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1 -->`

<!-- ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1134
Prior proof: #1097 / PR #1102
```

## Verdict

```text
ERPNext PROJECTS / SUPPORT OPERATIONAL PROOF READY
ERPNext PROJECTS / SUPPORT CURRENT-MAIN READY FOR REVIEW
```

#1134 does **not** redesign the operating model. It lands the already-proven #1097 helper, conventions, and 2026-08-26 synthetic read-back onto current `main`. Live apply was **not** redone.

Standard ERPNext can run CorpFlowAI’s minimum internal delivery and support model:

`Customer/Opportunity -> Project -> Task -> Timesheet where useful -> delivery status/evidence -> Issue/support lifecycle`

No second project-management or helpdesk application is required.

Anton required now: **NO**. Merge of this PR is still a human decision. No schema, send, payment, Timesheet submit, Chart of Accounts mutation, or `client_production`.

---

## Required return

```text
Cursor agent/run ID: bc-fa26c187-9600-4098-86df-c8172b40d9f8
Cursor run: run-1f7b766b-c240-488c-b94a-84579b5405e0
Handoff run: 32928746328
Work request: cfai-wr-fa26c187-9600-4098-86df-c8172b40d9f8

Current-main landing (#1134):
Cursor agent/run ID: bc-2204bf5f-6330-43d2-9ab2-99276deb6952
Cursor run: run-8335aefd-6bdb-4f7e-8346-a0e7ccfd98cb
Handoff run: 33043905122
Work request: cfai-wr-2204bf5f-6330-43d2-9ab2-99276deb6952

Reused #920 evidence (not redone):
- Customer CF920 Synthetic Website Project Ltd
- Opportunity CRM-OPP-2026-00001
- Project Template CF920 Independent Website 12-phase
- Project PROJ-0001
- Tasks TASK-2026-00013..00024 (depends_on chain; four milestones)
- Timesheet TS-2026-00001 draft, non-billable
- Issue Type CF920 Website Support
- Issue ISS-2026-00001

Synthetic Project identifier: PROJ-0001
Read-back: status=Open; owner=integrations@corpflowai.com; expected_start_date=2026-08-14; expected_end_date=2026-10-13; customer=CF920 Synthetic Website Project Ltd; template applied; percent_complete_method=Task Completion. Project.project_manager is not present on this site's Project GET.

Task identifiers/status/owner: TASK-2026-00013 Working progress=10 (next action, ToDo 01ap84a0h1 assigned to integrations@corpflowai.com); remaining Open or Overdue; owner=integrations@corpflowai.com; depends_on sequence reused; parent_task unused

Timesheet verdict: DEFER

Synthetic Issue identifier: ISS-2026-00001
Lifecycle read-back: Open → Closed → Open; priority=Medium; type=CF920 Website Support; customer+contact Alex Synthetic+project linked; Communication create HTTP 403 so trail is Issue.description (`CF1097-OPS`); ToDo 21bfc34hd2 assigned; via_customer_portal=0

Duplicate/idempotency: Project search-before-create REUSE count=1; Issue search-before-create REUSE count=1; created_on_replay=false

Exact ERPNext standard DocTypes/statuses used:
- Project: Open (owner field)
- Task: Open / Working / Overdue
- Timesheet: Draft (docstatus=0)
- Issue: Open / Closed
- ToDo: Open
- Issue.description for communication trail (Comment and Communication writes 403)

Standard capability gaps (non-blocking):
- Project.project_manager is not on the hosted v16 Project GET; Project User child write did not persist
- Comment DocType HTTP 403; Communication create HTTP 403 — trail uses Issue.description
- SLA / Assignment Rule / Notification / Workflow / Employee / Activity Type HTTP 403 — deferred
- Project has no standard Opportunity link field; Customer + existing Opportunity name are the map
- Timesheet billing submit blocked until accounting foundation (#1054 packet A)

Anton required: NO
Source proof verdict: ERPNext PROJECTS / SUPPORT OPERATIONAL PROOF READY
Current-main packet verdict: ERPNext PROJECTS / SUPPORT CURRENT-MAIN READY FOR REVIEW
```

---

## 1. What was reused from #920 (not redone)

| Object | Identifier | This packet |
|--------|------------|-------------|
| Project Template | `CF920 Independent Website 12-phase` | Reused |
| Project | `PROJ-0001` | Reused; owner/status/dates proved |
| Project Tasks | `TASK-2026-00013`–`00024` | Reused; first Task marked Working + ToDo |
| Timesheet | `TS-2026-00001` | GET-only; still draft / not billable |
| Issue Type | `CF920 Website Support` | Reused |
| Issue | `ISS-2026-00001` | Reused; contact, trail, close/reopen proved |
| Customer | `CF920 Synthetic Website Project Ltd` | Reused |
| Opportunity | `CRM-OPP-2026-00001` | Reused as CRM pointer; not rewritten onto Project |

Do **not** create another synthetic website Project or a second helpdesk Issue for this packet.

---

## 2. Operating conventions

These use standard fields only.

| Record | Owner | Status | Next action | Closure |
|--------|-------|--------|-------------|---------|
| **Project** | `owner` (User). `project_manager` is not present on this hosted Project GET. Named next person uses ToDo. | `Open` while live; `Completed` when the last milestone Task is done; `Cancelled` if abandoned. | First incomplete Task preferring `Working` then `Overdue` then `Open`. | Complete remaining Tasks, then set Project `Completed`. Keep GitHub `/change` evidence in CorpFlowAI. |
| **Task** | Document `owner` plus ToDo assignee when a named person is required. Employee is not required. | `Open` / `Working` / `Overdue` (date-derived) / `Completed`. | The `Working` Task, else the earliest incomplete Task. Use `depends_on` for sequence. Do not use `parent_task` unless a real subtree is needed. | `Completed` at 100% progress. |
| **Timesheet** | **DEFER** for daily ops. | Keep `Draft`. Never submit in this packet. | Not used for next-action. | Do not close via submit until accounting foundation exists. |
| **Issue** | Document `owner`; working assignee on ToDo. | `Open` needs action; `Closed` is done; reopen to `Open`. | Open Issue with a ToDo. | Close when the durable support case is finished. `/change` stays the execution surface. |

Do **not** enable customer portal (`via_customer_portal=0`). Do **not** send client email from ERPNext.

---

## 3. Timesheet verdict

**`DEFER`**

Why this is not `USE NOW`: CorpFlowAI’s current delivery loop is Project + Task status + `/change` evidence. Hours are not required to see owner, status, or next action.

Why this is not `BLOCKED BY ACCOUNTING FOUNDATION` as the operating verdict: the draft non-billable path already works (`TS-2026-00001`, `docstatus=0`, `is_billable=0`). Billing-bearing submit is a **later** dependency on packet A (Chart of Accounts) and is recorded as blocked if anyone tries to submit or mark billable.

Employee / Activity Type remain HTTP 403. Named-person timesheets are not required for this proof.

---

## 4. SLA / Assignment Rule

**`DEFERRED`**

SLA and Assignment Rule GET HTTP 403 to `integrations@corpflowai.com`. They are not needed for a one-human plus AI company. Manual `project_manager`, Task/Issue `owner`, and ToDo assignment are enough for initial onboarding. Do not configure speculative SLA complexity now.

---

## 5. CorpFlowAI → ERPNext mapping (#918 rules)

No new database table. No custom DocType. Pointer shape only, on `qualification_json.erpnext.delivery` of the **reference** event. Live Postgres is **not** written.

| CorpFlowAI ref | ERPNext | Idempotency |
|----------------|---------|-------------|
| Accepted customer engagement / `cf1097-synthetic-delivery` | Project `PROJ-0001` | Search `project_name` + customer; one Project per engagement |
| `/change` durable support / `cf1097-synthetic-support` | Issue `ISS-2026-00001` | Search Issue subject; create once |
| `leads.id` already promoted | Customer + Opportunity `CRM-OPP-2026-00001` | Existing WP1/WP2 bridges |
| Execution evidence | stays in `cmp_tickets` / GitHub | ERPNext is not the factory log |

Conflict: ERPNext Project/Issue win as the commercial delivery/support record. CorpFlowAI keeps `/change` execution, Technical Lead audits, and preview URLs.

---

## 6. Standard gaps that do **not** block READY

1. **Project.project_manager** is not returned on this hosted ERPNext v16 Project GET. Project User child write returned HTTP 200 but did not persist. Document `owner` + ToDo is the working owner model.
2. **Comment** DocType HTTP 403 and **Communication create** HTTP 403 — internal trail uses Issue.description with a `CF1097-OPS` sentinel. No email was sent.
3. **SLA / Assignment Rule / Notification / Workflow** HTTP 403 — deferred; no email enabled.
4. **Employee / Activity Type** HTTP 403 — Timesheets stay draft and non-billable.
5. **Opportunity** is not a standard field on Project — map via Customer + documented Opportunity name.
6. **No custom DocType gap.** Standard Project, Task, Timesheet, Issue, and ToDo were sufficient.

---

## 7. Live proof (2026-08-26 UTC)

Ran as `integrations@corpflowai.com` via `node scripts/erpnext/apply-projects-support-ops.mjs`. Secret values not printed. Postgres not written. Timesheet not submitted. No client send.

| Check | Result |
|-------|--------|
| Auth | HTTP 200, `integrations@corpflowai.com` |
| Project search/reuse | **REUSE** `PROJ-0001` (count 1) |
| Project GET | Open; owner `integrations@corpflowai.com`; dates 2026-08-14 → 2026-10-13; customer linked |
| Task GET | 12 tasks; `TASK-2026-00013` **Working** progress 10; ToDo assigned |
| Timesheet GET | `TS-2026-00001` Draft `docstatus=0` `is_billable=0` — **DEFER** |
| Issue reuse | **REUSE** `ISS-2026-00001` (count 1) |
| Issue contact | `Alex Synthetic` |
| Issue trail | Communication create HTTP 403; description stamp `CF1097-OPS` |
| Issue lifecycle | Closed then Open |
| SLA / Assignment Rule | HTTP 403 — **DEFERRED** |
| Replay | created_on_replay=false |

Artifact: `artifacts/erpnext/projects-support-ops-1097/apply-log.json`.

#1134 reused this artifact. It did not create a second Project, Task, Timesheet, or Issue, and it did not re-run the mutating apply.

---

## Non-actions honoured

- No custom DocTypes / custom fields / schema
- No CorpFlowAI production Postgres mutation
- No external email / WhatsApp / SMS
- No real client data migration
- No accounting / tax / bank mutation or invoice posting
- No Timesheet submit
- No second project or helpdesk application
- No `client_production`

---

## Cross-references

- #920 foundation: [`ERPNEXT_PRESTIGE_FOUNDATION_V1.md`](./ERPNEXT_PRESTIGE_FOUNDATION_V1.md)
- #918 matrix: [`../governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`](../governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md)
- Bridge contract: [`ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`](./ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md)
- Decision: [`../decisions/20260826-erpnext-projects-support-ops.md`](../decisions/20260826-erpnext-projects-support-ops.md)
