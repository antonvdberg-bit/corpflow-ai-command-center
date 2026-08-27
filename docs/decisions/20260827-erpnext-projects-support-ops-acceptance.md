# ERPNext Projects / Support operational acceptance reuses standard records GET-only

**Date:** 2026-08-27
**Status:** accepted for synthetic/test ERPNext Project / Task / Issue day-to-day delivery (#1202)
**Issue:** [#1202](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1202)

## Context

[#1134](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1134) / merged [PR #1144](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1144) landed the #1097 operating proof on current `main`. #1202 is production **acceptance**: prove those same synthetic records are still operationally usable without a second project/helpdesk system and without another mutating apply.

## Decision

- GET/read-only inspect of `PROJ-0001`, `TASK-2026-00013`–`00024`, `TS-2026-00001`, and `ISS-2026-00001`.
- Add `inspectProjectsSupportOps` so acceptance cannot write ERPNext. Close/reopen stays on the #1097 contract.
- **Timesheet verdict remains DEFER.** Draft, non-billable, not submitted.
- CorpFlowAI continues to store ERPNext names only (`qualification_json.erpnext.delivery`); `/change` stays the execution surface.
- Verdict: **ERPNext PROJECTS / SUPPORT OPERATIONALLY USABLE.**

## Consequences

- Positive: staff can run delivery/support on standard ERPNext IDs already in use; Temporal pilot may use this as an incremental ERP/DELIVERY lane.
- Negative / follow-ups: named Employee timesheets, SLA automation, and Frappe Version trail remain later work; real-client Project/Issue is still separately gated.

## Links

- Canonical: `docs/erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_ACCEPTANCE_V1.md`
- Proof: `docs/erpnext/ERPNEXT_PROJECTS_SUPPORT_OPERATIONAL_PROOF_V1.md`
