# Factory pilot 4 — scheduled reconciliation as the selecting wake path

**Status:** synthetic proof recorded — awaiting Agent CI green, then operator review  
**Source issue:** [#1035](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1035)  
**Controller:** [#1023](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1023)  
**Environment:** `n/a` (synthetic repository-only proof)

<!-- FACTORY_PILOT_4_SCHEDULED_RECONCILIATION_PROOF -->

## What this proves

The 10-minute `CorpFlowAI Factory Queue Reconcile` fallback is the **intended** selecting wake after `dispatch:operator-review` is removed, because Handoff does not treat that unlabeled event as a wake. This packet records that **this run was not selected that way**.

The actual selecting wake was the event-driven Handoff path started by creation-time `priority:P0` on an already-ready issue.

## Isolated fixture

| Path | Role |
|------|------|
| `node-tests/factory-pilot-4.status.json` | Harmless recorded-evidence fixture |
| `node-tests/factory-pilot-4-scheduled-reconciliation.test.mjs` | Isolated always-green node:test exercising existing helpers |
| `docs/operations/FACTORY_PILOT_4_SCHEDULED_RECONCILIATION_PROOF.md` | This evidence note |

Do **not** change application/runtime code, secrets, schema, deploy, messaging, payment, or outreach to complete this pilot. Do **not** merge.

## Intended test design (#1035)

1. Create the issue with `priority:P0` + `dispatch:cursor-ready` + `dispatch:operator-review` so create/label events must not select it.
2. After setup is verified, remove **only** `dispatch:operator-review`.
3. Handoff must not select on that unlabeled event.
4. The next selecting wake must be `workflow_call` from `factory-queue-reconcile.yml` with wake reason `scheduled_reconciliation`.

## Pre-release / operator-review gate evidence

| Field | Value |
|-------|--------|
| Issue created | `2026-08-21T12:51:55Z` |
| Initial labels | `priority:P0`, `dispatch:cursor-ready`, `dispatch:operator-review` at `2026-08-21T12:51:56Z` |
| Isolated helper while gated | `planCursorIssueClaims` → `activationTargetIssue = null`, reason includes `operator-review` |
| Isolated reconcile while gated | `resolveFactoryQueueReconcileDecision` → `should_wake_handoff = 0` |

Creation-time `priority:P0` + `dispatch:cursor-ready` **did** start Handoff run [32483944130](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32483944130) at `2026-08-21T12:51:58Z` while `dispatch:operator-review` was still present. That is an event-driven wake, not a scheduled reconcile. Sibling issues-event runs [32483944439](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32483944439) and [32483945041](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32483945041) were cancelled.

## Unlabeled operator-review is not a selecting path

| Field | Value |
|-------|--------|
| `dispatch:operator-review` removed | `2026-08-21T12:52:01Z` (owner `antonvdberg-bit`; no GitHub App) |
| Handoff run for that unlabeled event | [32483949978](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32483949978) |
| Conclusion | `skipped` — workflow `if` wakes unlabeled only for `execution:paused` |
| Isolated helper | `resolveFactoryDispatcherRunPlan` for `issues` + `unlabeled` + `dispatch:operator-review` → `shouldRun false`, path `event_label_ignored`, reason `lifecycle_label_non_wake` |

This part of the design holds. Removing operator-review is **not** itself the selecting wake.

## Actual selecting wake (blocker)

| Field | Value |
|-------|--------|
| Handoff workflow | CorpFlowAI Cursor Factory Handoff |
| Handoff run | [32483944130](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32483944130) |
| Event | `issues` |
| Wake reason | `priority_changed` |
| Wake path | `event_priority_ready` |
| Artifact generated | `2026-08-21T12:52:27.239Z` |
| Handoff comment | [issue comment](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1035#issuecomment-5370025449) |
| Verified active Cursor runs | 0 |
| Available WIP slots | 2 |
| Next eligible | `#1035` |
| Cursor agent | `bc-40323463-2402-4ed8-ba7e-e14ff19a1b52` |
| Cursor agent URL | https://cursor.com/agents/bc-40323463-2402-4ed8-ba7e-e14ff19a1b52 |
| Branch | `cursor/corpflowai-worker-protocol-75a6` |

Race: operator-review was removed at `12:52:01Z`, the selecting job started at `12:52:01Z`, and eligibility scan ran `12:52:19Z`–`12:52:27Z`. By scan time the gate was gone, so the already-running `priority_changed` Handoff selected `#1035`.

Capacity packet recorded on `#1035` at handoff:

```text
CURSOR CAPACITY: 0/2 active
Slot 1: FREE
Slot 2: FREE
Next eligible: #1035
Paused: NONE
Reconciled stale states: 0
```

Isolated helper check: `resolveFactoryDispatcherRunPlan` for `issues` + `labeled` + `priority:P0` on an issue that already has `dispatch:cursor-ready` → `shouldRun true`, `wakeReason priority_changed`, `path event_priority_ready`.

## Scheduled reconciliation did not select this issue

| Field | Value |
|-------|--------|
| Expected selecting workflow | CorpFlowAI Factory Queue Reconcile |
| Expected Handoff wake reason | `scheduled_reconciliation` |
| Expected Handoff wake path | `schedule_fallback` |
| Last scheduled reconcile before `#1035` existed | [32479630886](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32479630886) at `2026-08-21T11:58:03Z` |
| Scheduled reconcile selected `#1035` | **NO** |
| Isolated helper after gate removal | `resolveFactoryQueueReconcileDecision` **would** wake (`eligible_ready_work`, `source_issue = 1035`, `wakeReason scheduled_reconciliation`) if no event-driven Handoff had already selected it |

Confirmation: no alternate *scheduled* path selected the issue. An alternate **event** path did: `issues` / `priority_changed` / `event_priority_ready`.

No `workflow_dispatch`, no `execution:paused` removal, and no authorization comment selected this issue.

## Sequence

| Step | Expected | Recorded |
|------|----------|----------|
| 1. Issue created with operator-review | Create/label events must not select `#1035` | PARTIAL — labels at 12:51:56Z gated eligibility, but `priority:P0` still started Handoff `32483944130` at 12:51:58Z |
| 2. Remove only operator-review | Handoff must not select on that unlabeled event | YES — unlabeled run `32483949978` skipped |
| 3. Next selecting wake | `workflow_call` `scheduled_reconciliation` from Queue Reconcile | **NO** — selecting wake was `issues` / `priority_changed` |
| 4. Cursor executes exactly this issue | One isolated proof PR, normal CI, no merge | this packet |
| 5. Operator review | Stop; no self-merge | stop here |

## Protected actions

None. This packet is docs + isolated test fixtures only. No production/client runtime change, deploy, DB/schema, env/secrets, payment, messaging, external outreach, paid tool, or public launch.

## Final verdict

`SCHEDULED RECONCILIATION BLOCKED — selecting wake was issues/priority_changed (event_priority_ready) on Handoff run 32483944130, not workflow_call scheduled_reconciliation`

No merge. No protected action crossed. Exact remaining operator decision: whether to re-run the scheduled-path proof with P0 applied only after operator-review is removed, or to treat creation-time priority labeling as an accepted event-driven primary path.
