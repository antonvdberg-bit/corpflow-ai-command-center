# Factory pilot 1/3 — scheduled pickup + bounded CI correction

**Status:** bounded CI repair applied — awaiting Agent CI green  
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
| `node-tests/factory-pilot-1-scheduled-pickup.test.mjs` | Isolated node:test. Isolation + corrected-green invariant + durable red→green evidence |
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

| Step | Expected | Recorded |
|------|----------|----------|
| 1. First PR head | `phase: intentional-red`; Agent CI fails only the bounded-correction assertion | YES — `3136260dc9e93e6373588149c60ff270d8ddfd8a` |
| 2. Agent CI failure run | Isolated `AssertionError` in `node-tests/factory-pilot-1-scheduled-pickup.test.mjs` | YES — [32439384899](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32439384899) (`actual 'intentional-red'` / `expected 'corrected-green'`) |
| 3. CI supervisor repair | Same workstream / same PR `#1030`; change `phase` to `corrected-green` only | YES — this commit |
| 4. Agent CI green | Isolation test + corrected-green assertion both pass | pending on this repair head |
| 5. Operator review | No merge | stop here |

## Protected actions

None. This packet is docs + isolated test fixtures only.

## Final verdict

`PILOT 1 READY FOR REVIEW` once Agent CI is green on this repair head. No merge. No protected action crossed.
