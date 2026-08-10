# Event-driven dispatch Phase A proof (#847 / PR #848)

Synthetic companion issue: #849 (docs-only; no new agent requested).

## Latency (issue #847 first activation)

| Milestone | UTC timestamp | Evidence |
|-----------|---------------|----------|
| `dispatch:cursor-ready` added | 2026-08-10T06:03:10Z | issue timeline (antonvdberg-bit) |
| Cursor ready wake-up start | 2026-08-10T06:03:12Z | Actions run 31360570254 |
| Factory dispatcher activate start | 2026-08-10T06:03:18Z | Actions run 31360576412 |
| Cursor agent started | 2026-08-10T06:03:45Z | issue comment “Cursor activation finished” |
| Cursor run ID | run-1b2a4629-cd72-4fc0-bc27-487b833f992c | DISPATCH ACTIVATED / origin metadata |

**Measured latency (label → agent started): ~35 seconds**

## Duplicate / replay

- Durable claim generation 1 + origin metadata present on #847 after first activation.
- Unit tests in `node-tests/cursor-ready-event-dispatch.test.mjs` prove claimed/completed skips and generation-safe `CURSOR REQUEUE`.
- Cloud agent GitHub token could not mutate labels/comments on #847 (issues:write denied); live remove+re-add replay was therefore not re-fired from the agent session.

## Consolidated path (this PR)

- `issues:labeled` exact `dispatch:cursor-ready` owned by `factory-dispatcher-activate.yml`
- Thin `cursor-ready-wakeup.yml` removed (no second dispatcher)
- 30-minute schedule retained as fallback
- Event path does not bypass WIP/protected gates

```text
EVENT-DRIVEN DISPATCH PHASE A PASS — ~35s (label→agent)
```
