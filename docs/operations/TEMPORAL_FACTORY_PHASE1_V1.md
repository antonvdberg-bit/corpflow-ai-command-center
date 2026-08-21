# Temporal Factory Phase 1 — controlled operating pilot

**Status:** Repo-only control-plane packet ready for operator review.  
**Issue:** [#1032](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1032)  
**Owner:** Cursor (repo audit, implementation, synthetic proof, PR); Anton (L3 worker / credential only).  
**Operating model:** `2026-08-13-v1`  
**Environment:** `local` (docs + deterministic tests; no live CorpFlowAI host change)  
**Anchor:** `<!-- TEMPORAL_FACTORY_PHASE1_V1 -->`

<!-- TEMPORAL_FACTORY_PHASE1_V1 -->

## Verdict

`AUTONOMOUS DELIVERY PHASE 1 PASS — CONTROLLED OPERATING PILOT READY`

This packet proves the **control-plane design and synthetic loop** in GitHub/CI. It does **not** start Temporal on `corpflow-exec-01`.

Exact remaining protected action (not performed):

> L3 Temporal worker start on corpflow-exec-01 with a least-privilege GitHub token that can only `workflow_dispatch` **CorpFlowAI Cursor Factory Handoff**

## 1. Current-state factory / orchestrator map

| Path | What it does today | Class |
|------|--------------------|-------|
| `CorpFlowAI Cursor Factory Handoff` | Event/capacity wake → one eligible issue → Cursor Automation | **Primary Cursor wake** |
| `CorpFlowAI Factory Queue Reconcile` (#1023) | 10-minute GitHub scan; `workflow_call`s Handoff only when eligible + WIP | Scheduled fallback |
| `Cursor agent lifecycle status` | Polls claimed Cursor runs; capacity backfill via Handoff | Claimed-run supervisor |
| `CI Cursor repair supervisor` | Bounded Agent CI repair on the same PR | CI correction |
| `factory-dispatcher-activate.yml` | Legacy Background Agents API | Diagnostic only |
| Factory control loop / housekeeping | Drift + stale CMP sandbox cleanup | Not work selection |
| n8n GitHub Heartbeat Checker | Exception-only notify | Must not schedule work |

GitHub issues/PRs/comments remain the durable work and evidence store. There is no second work database.

## 2. Target single spine

```text
GitHub durable state/event
  → Temporal supervisory workflow (wait / signal / timer / resume)
    → allow-listed next action
      → existing CorpFlowAI Cursor Factory Handoff (only Cursor wake)
        → Cursor run → branch / PR / CI / evidence
          → GitHub state
            → Temporal reconcile / wait / resume
```

- **GitHub** decides *what work exists* and *whether it is eligible*.
- **Temporal** remembers *that we are waiting* and retries missed events.
- **Cursor** implements one bounded item when Handoff wakes it.
- **n8n** pages Anton only for real exceptions.

Rule: GitHub schedule + n8n + Temporal must **not** all independently choose what to execute. Only Handoff may wake Cursor.

## 3. Retain / demote / retire

| Component | Phase 1 | Later |
|-----------|---------|--------|
| Cursor Factory Handoff | **Retain — primary** | Keep forever as sole Cursor wake |
| Factory Queue Reconcile (#1023) | **Retain fallback** | Demote/remove schedule after live Temporal timer is proven |
| Lifecycle status poller | **Retain** | Keep until GitHub evidence can replace Cursor API polling |
| CI repair supervisor | **Retain** | Phase 1 *requests* this path; does not replace it |
| Legacy API dispatcher | **Retain diagnostic** | Do not re-enable as production |
| n8n heartbeat | **Retain exception-notify** | Do not duplicate Temporal timers |
| Temporal Phase 1 supervisor | **Introduce repo-only** | Live worker is the L3 gate below |

## 4. Temporal workflow / worker responsibilities

Workflow id: `corpflow-factory-phase1:<issue>`  
Task queue: `corpflow-factory-phase1`  
Code: `lib/server/factory-temporal-phase1.js`

**May do:** inspect GitHub state; rank with existing eligibility/WIP helpers; no-op/wait; request canonical Handoff; detect CI; request the existing CI repair supervisor; wait for operator/protected gates; release stale synthetic claims; post non-secret status.

**Must not do:** become source of truth; call `factory-dispatcher-activate.yml`; deploy; mutate DB/schema; change env/secrets; pay; send messages; outreach; merge without existing exact authority; expose Temporal publicly; reuse CorpFlow production Postgres.

## 5. Synthetic proofs (repo / CI)

Proofs A–J run in `node-tests/factory-temporal-phase1.test.mjs` using an in-process durable snapshot (Temporal-shaped wait/signal/resume). No client data. Reuses the same eligibility helpers as #1023/#1026/#1028 rather than duplicating those pilots.

| Id | Proof | Result |
|----|--------|--------|
| A | Eligible issue → one Handoff request | CI |
| B | No eligible work → silent wait | CI |
| C | WIP full → no second worker | CI |
| D | CI red → existing repair path → green | CI |
| E | Operator/protected gate → STOP | CI |
| F | Durable `APPROVAL:` marker → resume | CI |
| G | Worker kill during wait → restore, no duplicate Handoff | CI |
| H | Missed event → timer self-heal once | CI |
| I | Replayed event → idempotent | CI |
| J | Issue → workflow id → Handoff → Cursor run → PR → CI → terminal | CI |

## 6. Resource snapshot

This packet adds **zero** live Temporal load. Cursor Cloud has no SSH (`hostname` is not `corpflow-exec-01`). Host capacity numbers stay with #1025. #1029 may still be open as the earlier STOP note; this Phase 1 packet does not re-run L3 and does not merge #1029.

## 7. Security / credential boundary

- No secrets in GitHub, tests, or worker stdout.
- No `.env.template` Temporal keys added (do not invent app env names).
- Fail-closed: `ops/temporal/phase1-worker.mjs` dry-run only; `--live` exits `2`.
- Smallest later credential if Anton approves L3: a **least-privilege GitHub token** that can `workflow_dispatch` Handoff only. Store it on the box, not in this repo. Do not reuse production Postgres or Cursor webhook secrets inside Temporal.

## 8. Rollback

See `docs/runbooks/TEMPORAL_FACTORY_PHASE1_ROLLBACK.md`. Revert this PR. Do not start the worker. #1023 Handoff fallback stays in place.

## 9. Phase 2 recommendation

After Anton approves and proves the L3 worker:

1. Keep Handoff as the only Cursor wake.
2. Let Temporal own missed-event timers.
3. Then demote the GitHub 10-minute queue reconcile schedule.
4. Keep n8n exception-only.
5. Do not promote to `client_production` autonomy; do not widen allow-list.

Until that L3 proof exists, GitHub event-driven Handoff + #1023 remain the production loop. This packet is the reversible wrapper, not a cutover.
