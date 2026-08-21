# Factory pilot 2/3 — capacity release → next eligible item

**Status:** synthetic pickup proof recorded — awaiting Agent CI green, then operator review  
**Source issue:** [#1027](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1027)  
**Controller:** [#1023](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1023)  
**Environment:** `n/a` (synthetic repository-only proof)

<!-- FACTORY_PILOT_2_CAPACITY_RELEASE_PROOF -->

## What this proves

After factory **pilot 1/3** reached a terminal **operator-review** state and released genuine Cursor WIP, the factory selected the next eligible item (**this issue**) without Anton re-prompting Cursor Desktop or manually dispatching work.

Pilot **3/3** (`#1028`) remained paused and was not selected.

## Isolated fixture

| Path | Role |
|------|------|
| `node-tests/factory-pilot-2.status.json` | Harmless pickup fixture (`pickedAfterCapacityRelease: true`) |
| `node-tests/factory-pilot-2-capacity-release.test.mjs` | Isolated always-green node:test |
| `docs/operations/FACTORY_PILOT_2_CAPACITY_RELEASE_PROOF.md` | This evidence note |

Do **not** change application/runtime code, secrets, schema, deploy, messaging, payment, or outreach to complete this pilot.

## Prior-pilot capacity-release evidence

| Field | Value |
|-------|--------|
| Prior pilot | [#1026](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1026) Factory pilot 1/3 |
| Prior PR | [#1030](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1030) (open; do not merge from this packet) |
| Prior PR head | `9f7509dd046a1c902eb8c58e7eaa4ab261366b26` |
| Prior Cursor agent | `bc-c20da76e-de96-4fa5-b01f-eca1a9042483` (IDLE — not genuine execution WIP) |
| Durable GitHub state at this wake | `dispatch:operator-review` on `#1026` |
| Meaning | Operator review is a terminal state for that Cursor run. It does **not** occupy a genuine WIP slot. |

## Pickup evidence (this wake)

| Field | Value |
|-------|--------|
| Handoff workflow | CorpFlowAI Cursor Factory Handoff |
| Handoff run | [32465439603](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32465439603) |
| Wake reason | `execution_unpaused` |
| Wake path | `event_execution_unpaused` |
| Webhook schema | `corpflow.factory_cursor_webhook.v1` |
| Handoff verified active Cursor runs | 0 |
| Handoff available WIP slots | 2 |
| Next eligible (handoff) | `#1027` |
| Still paused (handoff) | `#1028` |
| 10-minute reconciler | not the selecting path for this wake (event-driven unpause is primary) |
| Cursor agent | `bc-cee1b9a5-a080-4951-a4fa-007876fe4b06` |
| Cursor agent URL | https://cursor.com/agents/bc-cee1b9a5-a080-4951-a4fa-007876fe4b06 |
| Branch | `cursor/corpflowai-worker-protocol-f918` |

Capacity packet recorded on `#1027` at handoff:

```text
CURSOR CAPACITY: 0/2 active
Slot 1: FREE
Slot 2: FREE
Next eligible: #1027
Paused: #1028
```

## Sequence

| Step | Expected | Recorded |
|------|----------|----------|
| 1. Pilot 1 reaches operator-review | Genuine Cursor WIP released; `#1026` not re-executed | YES — `#1026` `dispatch:operator-review`; prior agent IDLE; PR `#1030` open |
| 2. Factory selects next eligible | `#1027` only; `#1028` stays paused | YES — Handoff `32465439603` `event_execution_unpaused` |
| 3. Cursor executes exactly that issue | One isolated proof PR, normal CI, no merge | this packet |
| 4. Operator review | Stop; no self-merge | stop here |

## Protected actions

None. This packet is docs + isolated test fixtures only.

## Final verdict

`PILOT 2 READY FOR REVIEW` once Agent CI is green on this head. No merge. No protected action crossed.
