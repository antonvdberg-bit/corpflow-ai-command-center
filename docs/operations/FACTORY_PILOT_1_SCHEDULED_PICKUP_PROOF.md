# Factory pilot 1/3 — scheduled pickup + bounded CI correction

**Status:** first PR state — intentional isolated red  
**Source issue:** [#1026](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1026)  
**Controller:** [#1023](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1023)  
**Environment:** `n/a` (synthetic repository-only proof)

<!-- FACTORY_PILOT_1_SCHEDULED_PICKUP_PROOF -->

## What this proves

1. Eligible GitHub work can start without `workflow_dispatch` and without Anton reopening Cursor Desktop.
2. Exactly one isolated proof test fails on the first PR head (deterministic assertion mismatch).
3. The existing **CI failure Cursor supervisor** returns to the **same** Cursor workstream and corrects only that fixture/assertion.
4. No protected consequence is crossed.

## Isolated fixture

| Path | Role |
|------|------|
| `node-tests/factory-pilot-1.status.json` | Harmless phase fixture (`intentional-red` → `corrected-green`) |
| `node-tests/factory-pilot-1-scheduled-pickup.test.mjs` | Isolated node:test. One passing isolation check; one intentional first-PR AssertionError |
| `docs/operations/FACTORY_PILOT_1_SCHEDULED_PICKUP_PROOF.md` | This evidence note |

Do **not** change application/runtime code, secrets, schema, deploy, messaging, payment, or outreach to complete this pilot.

## Pickup evidence (this wake)

| Field | Value |
|-------|--------|
| Handoff workflow | CorpFlowAI Cursor Factory Handoff |
| Handoff run | [32439128478](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32439128478) |
| Event | `issues` / `priority_changed` / `event_priority_ready` |
| Scheduled reconciliation run that selected this issue | n/a — this wake was the event-driven Handoff path (primary). The 10-minute `#1023` wrapper remains fallback only. |
| Cursor agent | `bc-c20da76e-de96-4fa5-b01f-eca1a9042483` |
| Cursor agent URL | https://cursor.com/agents/bc-c20da76e-de96-4fa5-b01f-eca1a9042483 |
| Branch | `cursor/corpflowai-worker-protocol-1ffb` |

## Sequence

| Step | Expected | Recorded in this commit |
|------|----------|-------------------------|
| 1. First PR head | `phase: intentional-red`; Agent CI fails only the bounded-correction assertion | YES — opening state |
| 2. Agent CI failure run | Isolated `AssertionError` in `node-tests/factory-pilot-1-scheduled-pickup.test.mjs` | pending (this opening commit must stay red) |
| 3. CI supervisor repair | Same workstream; change `phase` to `corrected-green` only | pending |
| 4. Agent CI green | Isolation test + corrected-green assertion both pass | pending |
| 5. Operator review | No merge | stop here |

## Protected actions

None. This packet is docs + isolated test fixtures only.

## Final verdict (after green CI)

Fill after the supervisor correction:

`PILOT 1 READY FOR REVIEW` or `PILOT 1 BLOCKED — <one exact blocker>`
