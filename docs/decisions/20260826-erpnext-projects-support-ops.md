# ERPNext Projects / Support operational proof reuses standard #920 records

**Date:** 2026-08-26 (current-main landing 2026-08-27)
**Status:** accepted for synthetic/test ERPNext Project / Task / Issue operations (#1097); current-main landing (#1134)
**Issue:** [#1097](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1097) / current-main [#1134](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1134)

## Context

Parent completion controller [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054) packet E required operational proof that standard ERPNext can support CorpFlowAI’s minimum internal delivery and support model without a second project-management or helpdesk system. [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920) already created the synthetic Project, Tasks, Timesheet, and Issue.

## Decision

- Reuse `PROJ-0001`, `TASK-2026-00013`–`00024`, `TS-2026-00001`, and `ISS-2026-00001`. Do not create a duplicate Project or Issue.
- Prove owner, status, dates, Task next-action, Issue contact/trail/close-reopen, and search-before-create on those standard records. On this hosted site, Project owner is `Project.owner` plus ToDo; `project_manager` is not a readable Project field.
- **Timesheet verdict: DEFER.** Keep the draft non-billable path. Do not submit. Billing-bearing submit waits on accounting foundation.
- **SLA / Assignment Rule: DEFERRED.** Manual owner + ToDo is enough for initial onboarding.
- Map CorpFlowAI delivery/support refs onto existing ERPNext names using the #918 `project_task_timesheet` and `issue_support` rules. No new table or custom DocType. No live Postgres write.
- [#1134](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1134) lands this same packet onto current `main`. Do not merge stale [PR #1102](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1102). Do not redo the live apply.

## Consequences

- Positive: staff can run delivery and support on standard ERPNext without a second app.
- Negative / follow-ups: named Employee timesheets and SLA automation remain later work; Chart of Accounts is still packet A.

## Links

- Canonical: `docs/erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md`
- Reused foundation: `docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md`
- Mapping: `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`
