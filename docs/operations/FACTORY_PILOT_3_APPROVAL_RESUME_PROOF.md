# Factory pilot 3/3 — durable approval stop/resume + stale-state recovery

**Status:** synthetic proof recorded — awaiting Agent CI green, then operator review  
**Source issue:** [#1028](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1028)  
**Controller:** [#1023](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1023)  
**Environment:** `n/a` (synthetic repository-only proof)

<!-- FACTORY_PILOT_3_APPROVAL_RESUME_PROOF -->

## What this proves

Two remaining control-loop properties, without touching production:

1. Work **stops** at a durable operator-approval boundary (`execution:paused` + `dispatch:operator-review`) and **resumes only** after the exact durable approval marker is present and those gates are removed.
2. A **deliberately stale synthetic claim** does not hold genuine Cursor WIP forever. Existing reconciliation classifies it as `stale_claimed_deferred_to_lifecycle` and verified active count stays `0`.

## Isolated fixture

| Path | Role |
|------|------|
| `node-tests/factory-pilot-3.status.json` | Harmless recorded-evidence fixture |
| `node-tests/factory-pilot-3-approval-resume.test.mjs` | Isolated always-green node:test exercising existing helpers |
| `docs/operations/FACTORY_PILOT_3_APPROVAL_RESUME_PROOF.md` | This evidence note |

Do **not** change application/runtime code, secrets, schema, deploy, messaging, payment, or outreach to complete this pilot. Do **not** mutate real worker claims.

## Pre-approval blocked / non-selection evidence

| Field | Value |
|-------|--------|
| Initial labels (2026-08-21 02:14:20Z) | `priority:P0`, `dispatch:cursor-ready`, `dispatch:operator-review`, `execution:paused` |
| Meaning | Intentionally non-runnable at creation. Must not be selected while the gate is present. |
| Pilot 2 handoff that skipped this issue | [32465439603](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32465439603) |
| Recorded paused sibling | `#1028` |
| Isolated helper check | `planCursorIssueClaims` with those labels → `activationTargetIssue = null`, reason `execution:paused` |

## Exact durable approval marker used

| Field | Value |
|-------|--------|
| Marker | `APPROVAL: PILOT 3` |
| Author | `antonvdberg-bit` (owner) |
| Comment | [issue comment](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1028#issuecomment-5369596067) at `2026-08-21T12:06:44Z` |
| `execution:paused` removed | `2026-08-21T12:06:50Z` |
| `dispatch:operator-review` removed | `2026-08-21T12:06:55Z` |
| Authorized after this marker | isolated docs/test proof only; stop at operator review; **no merge** |

## Resumed wake reason / path

| Field | Value |
|-------|--------|
| Handoff workflow | CorpFlowAI Cursor Factory Handoff |
| Handoff run | [32480334189](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32480334189) |
| Wake reason | `execution_unpaused` |
| Wake path | `event_execution_unpaused` |
| Webhook schema | `corpflow.factory_cursor_webhook.v1` |
| Handoff verified active Cursor runs | 0 |
| Handoff available WIP slots | 2 |
| Next eligible (handoff) | `#1028` |
| Still paused (handoff) | NONE |
| Reconciled stale states (handoff) | 0 |
| Cursor agent | `bc-cfdd3711-eb2a-4aee-9232-7231d2f5668d` |
| Cursor agent URL | https://cursor.com/agents/bc-cfdd3711-eb2a-4aee-9232-7231d2f5668d |
| Branch | `cursor/corpflowai-worker-protocol-875b` |

Capacity packet recorded on `#1028` at handoff:

```text
CURSOR CAPACITY: 0/2 active
Slot 1: FREE
Slot 2: FREE
Next eligible: #1028
Paused: NONE
Reconciled stale states: 0
```

Isolated helper check: `resolveFactoryDispatcherRunPlan` for `issues` + `unlabeled` + `execution:paused` on open `#1028` → `shouldRun true`, `wakeReason execution_unpaused`, `path event_execution_unpaused`. After the gates are removed, `planCursorIssueClaims` selects `#1028`.

## Synthetic stale / orphan recovery evidence

This packet does **not** change real worker claims. It uses synthetic issue **`10280`** (not a GitHub work item) with `dispatch:cursor-claimed`, no live activation comments, and `updatedAt` older than `DEFAULT_STALE_CLAIM_HOURS` (12).

| Check | Result |
|-------|--------|
| `isClaimStale(synthetic 10280)` | `true` |
| `planCursorIssueClaims` verified active count | `0` (stale label does not occupy a genuine WIP slot) |
| Available slots | `2` |
| `resolveFactoryQueueReconcileDecision` | `should_wake_handoff = 0`, reason `stale_claimed_deferred_to_lifecycle`, `staleClaimedCount = 1` |

Meaning: an abandoned claimed label cannot hold factory capacity forever. Recovery stays on the existing lifecycle / reconciliation path. No second dispatcher. No mutation of live claims for `#1025`, `#1026`, `#1027`, or this run.

## Sequence

| Step | Expected | Recorded |
|------|----------|----------|
| 1. Issue created paused + operator-review | Factory must not select `#1028` | YES — labels at 02:14:20Z; Pilot 2 handoff `32465439603` recorded paused `#1028` |
| 2. Exact durable approval | Resume only after `APPROVAL: PILOT 3` and gate removal | YES — owner comment 12:06:44Z; unlabeled 12:06:50Z / 12:06:55Z |
| 3. Factory resumes through existing path | One Handoff wake, one Cursor run | YES — Handoff `32480334189` `event_execution_unpaused` |
| 4. Cursor executes exactly this issue | One isolated proof PR, normal CI, no merge | this packet |
| 5. Stale/orphan synthetic recovery | Existing reconcile logic; no real claim mutation | YES — synthetic `10280` → `stale_claimed_deferred_to_lifecycle` |
| 6. Operator review | Stop; no self-merge | stop here |

## Protected actions

None. This packet is docs + isolated test fixtures only. No production/client runtime change, deploy, DB/schema, env/secrets, payment, messaging, external outreach, paid tool, or public launch.

## Final verdict

`PILOT 3 READY FOR REVIEW` once Agent CI is green on this head. No merge. No protected action crossed.
