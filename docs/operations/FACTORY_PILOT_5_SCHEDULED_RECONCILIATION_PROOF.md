# Factory pilot 5 — clean scheduled reconciliation after trigger drain

**Status:** synthetic proof recorded — awaiting Agent CI green, then operator review  
**Source issue:** [#1037](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1037)  
**Controller:** [#1023](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1023)  
**Repair that made this wake possible:** [#1041](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1041) / merged PR [#1042](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1042)  
**Environment:** `n/a` (synthetic repository-only proof)

<!-- FACTORY_PILOT_5_SCHEDULED_RECONCILIATION_PROOF -->

## What this proves

The 10-minute `CorpFlowAI Factory Queue Reconcile` fallback was the **selecting wake** for `#1037` after every creation-time event-triggered Handoff run drained while `dispatch:operator-review` was still present.

Pilot 4 (`#1035`) recorded the opposite: a creation-time `priority:P0` Handoff was still running when operator-review was removed ~5 seconds later, so that event path selected the issue. Pilot 5 kept the gate in place long enough for those event runs to finish, then removed **only** `dispatch:operator-review`. Handoff does not select on that unlabeled event. The next selecting wake was the scheduled Queue Reconcile `workflow_call` with `wake_reason=scheduled_reconciliation`.

## Isolated fixture

| Path | Role |
|------|------|
| `node-tests/factory-pilot-5.status.json` | Harmless recorded-evidence fixture |
| `node-tests/factory-pilot-5-scheduled-reconciliation.test.mjs` | Isolated always-green node:test exercising existing helpers |
| `docs/operations/FACTORY_PILOT_5_SCHEDULED_RECONCILIATION_PROOF.md` | This evidence note |

Do **not** change application/runtime code, secrets, schema, deploy, messaging, payment, or outreach to complete this pilot. Do **not** merge.

## Corrected test design (#1037)

Phase A — setup only:

1. Create the issue with `priority:P0` + `dispatch:cursor-ready` + `dispatch:operator-review`.
2. Keep `dispatch:operator-review` until every creation/label-triggered Handoff run finishes while the issue remains ineligible.
3. Do not remove the gate in the same control turn.

Phase B — release only after trigger drain is verified:

1. Remove **only** `dispatch:operator-review`.
2. Do not add/remove `dispatch:cursor-ready`.
3. Do not change priority.
4. Do not remove `execution:paused` (not used).
5. Do not use `workflow_dispatch`.
6. Do not post an authorization marker that Handoff listens to.

Because Handoff does not select on removal of `dispatch:operator-review`, the next selecting wake must be `workflow_call` from `factory-queue-reconcile.yml` with wake reason `scheduled_reconciliation`.

## Phase A — setup labels and creation-time drain

| Field | Value |
|-------|--------|
| Issue created | `2026-08-22T01:46:51Z` |
| Initial labels | `priority:P0` at `2026-08-22T01:46:52Z`; `dispatch:cursor-ready` and `dispatch:operator-review` at `2026-08-22T01:46:53Z` |
| Isolated helper while gated | `planCursorIssueClaims` → `activationTargetIssue = null`, reason includes `operator-review` |
| Isolated reconcile while gated | `resolveFactoryQueueReconcileDecision` → `should_wake_handoff = 0` |

Creation-time `priority:P0` started Handoff run [32544413585](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32544413585) at `2026-08-22T01:46:54Z` while `dispatch:operator-review` was still present. That event-driven run **did not select `#1037`**. Artifact `factory-cursor-handoff.json` (`generatedAt` `2026-08-22T01:47:14.770Z`):

- `wakeReason` = `priority_changed`
- `wakePath` = `event_priority_ready`
- `requireExactEventIssue` = true (preferred `#1037`)
- `shouldSucceed` = false
- `has_handoff` = 0
- `source_issue` = null
- `reason` = `no_eligible_source_issue`
- `suppressReason` = `event issue #1037 held; scan selected #1032 instead — event path activates only the preferred issue`
- `commentPosted` = false

Sibling issues-event runs [32544413794](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32544413794) (`skipped`) and [32544413836](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32544413836) (`cancelled`) drained in the same minute. No Handoff comment was posted on `#1037`.

## Phase B — unlabeled operator-review is not a selecting path

| Field | Value |
|-------|--------|
| `dispatch:operator-review` removed | `2026-08-22T01:51:45Z` (owner `antonvdberg-bit`; no GitHub App; ~4m52s after creation) |
| Labels left unchanged | `priority:P0`, `dispatch:cursor-ready` |
| Handoff run for that unlabeled event | [32544641984](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32544641984) |
| Conclusion | `skipped` — workflow `if` wakes unlabeled only for `execution:paused` |
| Isolated helper | `resolveFactoryDispatcherRunPlan` for `issues` + `unlabeled` + `dispatch:operator-review` → `shouldRun false`, path `event_label_ignored`, reason `lifecycle_label_non_wake` |

This part of the design holds. Removing operator-review is **not** itself the selecting wake. Creation-time event runs had already finished before the gate was removed.

## Actual selecting wake (scheduled reconciliation)

| Field | Value |
|-------|--------|
| Selecting wrapper | CorpFlowAI Factory Queue Reconcile |
| Wrapper event | `schedule` |
| Queue Reconcile / Handoff parent run | [32609642234](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32609642234) |
| Wrapper created | `2026-08-23T01:08:46Z` |
| Scan job | success (`2026-08-23T01:08:48Z`–`01:09:07Z`) |
| Reusable Handoff job | `wake_factory_handoff / handoff` success (`2026-08-23T01:09:10Z`–`01:09:31Z`) |
| Reconcile artifact | `factory-queue-reconcile.json` (`generatedAt` `2026-08-23T01:09:05.354Z`) |
| Reconcile decision | `should_wake_handoff = 1`, `reason = eligible_ready_work`, `source_issue = 1037` |
| Handoff artifact | `factory-cursor-handoff.json` (`generatedAt` `2026-08-23T01:09:27.100Z`) |
| Handoff wake reason | `scheduled_reconciliation` |
| Handoff wake path | `schedule_fallback` |
| Handoff `source_issue` | `1037` |
| Handoff `reason` | `eligible_handoff` |
| Handoff comment | [issue comment 5383518667](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1037#issuecomment-5383518667) |
| Verified active Cursor runs | 0 |
| Available WIP slots | 2 |
| Next eligible | `#1037` |
| Cursor agent | `bc-56159618-9766-4e61-a58c-f793f207a523` |
| Cursor agent URL | https://cursor.com/agents/bc-56159618-9766-4e61-a58c-f793f207a523 |
| Branch | `cursor/corpflowai-worker-protocol-dade` |
| Head SHA at wake | `8295fe410df9183b962bde03eec02b41f3b23930` (`main` after PR `#1042`) |

Capacity packet recorded on `#1037` at handoff:

```text
CURSOR CAPACITY: 0/2 active
Slot 1: FREE
Slot 2: FREE
Next eligible: #1037
Paused: NONE
Reconciled stale states: 0
```

Isolated helper check: `isInheritedScheduledReconcileWake('scheduled_reconciliation', 'schedule')` is true, and `resolveFactoryDispatcherRunPlan` for inherited `schedule` + `scheduled_reconciliation` + `target_issue=1037` → `shouldRun true`, `wakeReason scheduled_reconciliation`, `path schedule_fallback`.

## No alternate event path selected this issue

| Check | Result |
|-------|--------|
| Creation-time `issues` / `priority_changed` Handoff `32544413585` | ran and **fail-closed**; `#1037` held; no comment |
| Unlabeled `dispatch:operator-review` Handoff `32544641984` | `skipped` |
| Handoff comments on `#1037` before the scheduled wake | **none** (only comment is `5383518667` at `2026-08-23T01:09:27Z`) |
| `workflow_dispatch` selected `#1037` | **NO** |
| `execution:paused` unlabeled | **not used** |
| Authorization marker comment | **none** |
| Selecting wake | `schedule` Queue Reconcile `32609642234` → reusable Handoff with `scheduled_reconciliation` |

Between Phase B release (`2026-08-22T01:51:45Z`) and this selecting wake, scheduled Queue Reconcile scans could classify `#1037` as eligible, but reusable Handoff skipped while it still required `event_name=workflow_call`. Merged PR `#1042` (`2026-08-23T00:08:23Z`) lets Handoff accept the inherited caller `event_name=schedule` when `inputs.wake_reason == scheduled_reconciliation`. `#1037` was left untouched as the acceptance case. The first genuine scheduled pass after that repair is run `32609642234`.

## Sequence

| Step | Expected | Recorded |
|------|----------|----------|
| 1. Issue created with operator-review; keep gate until event Handoff drains | Create/label events must not select `#1037` | YES — `32544413585` fail-closed (`#1037` held); siblings skipped/cancelled; no comment |
| 2. Remove only operator-review after drain | Handoff must not select on that unlabeled event | YES — unlabeled run `32544641984` skipped |
| 3. Next selecting wake | Queue Reconcile `workflow_call` / inherited `schedule` with `scheduled_reconciliation` | YES — run `32609642234` |
| 4. Cursor executes exactly this issue | One isolated proof PR, normal CI, no merge | this packet |
| 5. Operator review | Stop; no self-merge | stop here |

## Protected actions

None. This packet is docs + isolated test fixtures only. No production/client runtime change, deploy, DB/schema, env/secrets, payment, messaging, external outreach, paid tool, or public launch.

## Final verdict

`SCHEDULED RECONCILIATION PROVEN`

No merge. No protected action crossed. Exact remaining operator decision: merge this evidence PR when Agent CI is green, if `#1037` is given explicit merge authority.
