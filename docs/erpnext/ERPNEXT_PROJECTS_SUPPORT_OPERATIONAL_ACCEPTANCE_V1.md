# ERPNext Projects / Support operational acceptance v1

**Status:** Live hosted-test GET/read-only acceptance. **ERPNext PROJECTS / SUPPORT OPERATIONALLY USABLE.**
**Issue:** [#1202](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1202)
**Parents:** [#1134](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1134) / merged [PR #1144](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1144), [#1097](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1097), [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920)
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`) — `corpflow_test`
**Machine contract:** `config/erpnext-projects-support-ops.v1.json`
**Helper:** `lib/erpnext/projects-support-ops.js` → `inspectProjectsSupportOps`
**Inspect:** `node scripts/erpnext/inspect-projects-support-ops.mjs`
**Evidence:** `artifacts/erpnext/projects-support-ops-1202/inspect-log.json`
**#918 rows used:** `project_task_timesheet`, `issue_support`

**Anchor:** `<!-- ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_ACCEPTANCE_V1 -->`

<!-- ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_ACCEPTANCE_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1202
```

## Verdict

```text
ERPNext PROJECTS / SUPPORT OPERATIONALLY USABLE
```

Standard ERPNext Project / Task / Issue records already adopted by CorpFlowAI are usable for day-to-day service delivery. One Project with Tasks and one Issue expose current owner, status, and next-action evidence. A second project or helpdesk system is **not** required.

This packet is GET/read-only. It did **not** re-run the mutating #1097 apply. Close/reopen remains proven by the existing #1097 contract plus the current Open Issue read-back.

Anton required now: **NO** except human merge of this PR. No schema, send, payment, Timesheet submit, Chart of Accounts mutation, or `client_production`.

---

## Required return

```text
Cursor agent/run ID: bc-e4e34aeb-0f33-4d56-890e-dfee35df00e9
Cursor run: run-86427c98-b03b-4be2-80eb-48b7b17496cd
Handoff run: 33111142586
Work request: cfai-wr-e4e34aeb-0f33-4d56-890e-dfee35df00e9

Current-main SHA inspected: b731411734edb01b7dbb8d7e20247c5a7805983a

Exact ERPNext identifiers (GET 2026-08-27T20:05:02Z as integrations@corpflowai.com):
- Customer CF920 Synthetic Website Project Ltd
- Opportunity CRM-OPP-2026-00001 (CRM pointer only; not a Project field)
- Project Template CF920 Independent Website 12-phase
- Project PROJ-0001
- Tasks TASK-2026-00013..00024
- Timesheet TS-2026-00001
- Issue Type CF920 Website Support
- Issue ISS-2026-00001

Project PROJ-0001 read-back:
status=Open; owner=integrations@corpflowai.com; customer=CF920 Synthetic Website Project Ltd;
expected_start_date=2026-08-14; expected_end_date=2026-10-13;
percent_complete_method=Task Completion; template applied.
Project.project_manager is not present on this site's Project GET.

Task set / next-action:
12 Tasks. Next action TASK-2026-00013 status=Overdue progress=10 owner=integrations@corpflowai.com
(ToDo count 1). Overdue is the standard date-derived status after the #1097 Working stamp;
the convention still prefers Working then Overdue then Open. depends_on chain intact.
parent_task unused.

Timesheet TS-2026-00001:
Draft docstatus=0 status=Draft is_billable=0 parent_project=PROJ-0001 — DEFER
Not submitted. Not accounting-bearing.

Issue ISS-2026-00001:
status=Open; priority=Medium; type=CF920 Website Support;
customer+contact Alex Synthetic+project linked; owner=integrations@corpflowai.com;
via_customer_portal=0; description trail CF1097-OPS.
Close/reopen this run: not_attempted.
Contract (#1097 apply-log): Closed → Open proven=true.

Duplicate/idempotency:
Project search-before-create REUSE count=1
Issue search-before-create REUSE count=1
created_on_replay=false
No second Project or Issue created.

CorpFlowAI pointer:
qualification_json.erpnext.delivery references ERPNext names only
postgres_persist=not_written
No Project/Issue/Timesheet Prisma model. /change stays the execution surface.

Non-blocking gaps (same as #1097; do not block USABLE):
- Version list HTTP 403 — VERSION_TRAIL_UNREADABLE
- SLA / Assignment Rule HTTP 403 — DEFERRED
- Project.project_manager absent

Anton required: NO
Packet verdict: ERPNext PROJECTS / SUPPORT OPERATIONALLY USABLE
```

---

## 1. What this packet verified (GET only)

| Object | Identifier | This packet |
|--------|------------|-------------|
| Project | `PROJ-0001` | GET identity, customer, status, dates, owner |
| Project Tasks | `TASK-2026-00013`–`00024` | GET set; next-action derived from standard status |
| Timesheet | `TS-2026-00001` | GET draft / non-billable; **DEFER**; not submitted |
| Issue | `ISS-2026-00001` | GET customer, contact, priority, status, owner, description trail |
| Close/reopen | same Issue | Supported by #1097 contract; not re-closed this run |
| Search-before-create | Project + Issue | REUSE counts 1/1 |
| Pointer | `qualification_json.erpnext.delivery` | In-memory ERPNext IDs only |

Do **not** create another synthetic website Project or a second helpdesk Issue.

---

## 2. Why a GET-only inspector was added

The #1097 helper `proveProjectsSupportOps` can write Task status, ToDos, Issue description, and close/reopen. Day-to-day acceptance must not mutate ERPNext. `inspectProjectsSupportOps` wraps the Frappe client as read-only and fails closed if a write is attempted.

That is the only code defect this packet fixed. It does not change accounting, schema, or hosted records.

---

## 3. Timesheet remains DEFER

Draft non-billable `TS-2026-00001` is still the operational path. Daily owner/status/next-action uses Project + Task + Issue. Billing-bearing submit stays blocked until accounting foundation (#1054 packet A / #1055).

---

## 4. CorpFlowAI does not copy project/support truth

No second project or helpdesk application. No Prisma Project/Issue table. The pointer stores ERPNext names (`PROJ-0001`, `ISS-2026-00001`, `TS-2026-00001`) on `qualification_json.erpnext.delivery` and records `postgres_persist=not_written`. `/change` remains the execution surface.

---

## Non-actions honoured

- No ERPNext write / Timesheet submit
- No custom DocTypes / custom fields / schema
- No CorpFlowAI production Postgres mutation
- No external email / WhatsApp / SMS
- No accounting / tax / bank mutation
- No second project or helpdesk application
- No `client_production`

---

## Cross-references

- Operating proof: [`ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md`](./ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md)
- #920 foundation: [`ERPNEXT_PRESTIGE_FOUNDATION_V1.md`](./ERPNEXT_PRESTIGE_FOUNDATION_V1.md)
- #918 matrix: [`../governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`](../governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md)
- Bridge contract: [`ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`](./ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md)
- Decision: [`../decisions/20260827-erpnext-projects-support-ops-acceptance.md`](../decisions/20260827-erpnext-projects-support-ops-acceptance.md)
