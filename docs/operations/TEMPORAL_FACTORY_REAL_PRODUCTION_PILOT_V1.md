# Temporal Factory real-production pilot v1

**Status:** Repo packet + activation prepared. Live 72-hour pilot **not started**.  
**Issue:** [#1130](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1130)  
**Historical Phase 1:** [#1032](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1032) / obsolete PR [#1034](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1034) — **do not merge**.  
**Owner:** Cursor (repo reconciliation, tests, PR); Anton (exact GitHub activation packet only).  
**Operating model:** `2026-08-13-v1`  
**Environment:** `local` until activation; activated supervisor is `corpflow_test` factory control-plane (not client_production).  
**Anchor:** `<!-- TEMPORAL_FACTORY_REAL_PRODUCTION_PILOT_V1 -->`

<!-- TEMPORAL_FACTORY_REAL_PRODUCTION_PILOT_V1 -->

## Verdict

`TEMPORAL REAL-PRODUCTION PILOT READY FOR ACTIVATION`

This packet rebuilds Temporal supervision on **current main**. It does **not** start the live worker, change secrets, disable Queue Reconcile, or supervise production data.

Exact remaining protected action (not performed here):

See `docs/runbooks/TEMPORAL_FACTORY_PILOT_ACTIVATION.md`.

## 1. Audit of PR #1034 (reuse vs discard)

PR #1034 was 25 commits behind current main and predates WIP=3, Cloud Agents API v1, `work_request_id`, explicit `CURSOR REQUEUE` generations, Queue Reconcile / review-ready zero-WIP, and current Handoff executor routing. It is **obsolete**. This packet does not rebase it.

| Piece from #1034 | Decision | Why |
|------------------|----------|-----|
| GitHub as source of truth; Handoff as sole Cursor wake | **Reuse (idea)** | Still the required spine |
| Allow-list / forbidden protected actions | **Reuse (idea)** | Still required |
| In-process durable snapshot for kill/restore/replay proofs | **Reuse (idea)** | Still the cheapest restart proof |
| Fail-closed live worker from Cursor Cloud | **Reuse (idea)** | Still required |
| `factory-temporal-phase1.js` / Phase 1 worker / #1032 activation SSH token path | **Discard** | Assumed WIP=2, no Cloud Agents/`work_request_id`/generation contracts; asked Anton to SSH and mint a box-local token |
| Synthetic A–J as the *business* goal | **Discard as destination** | #1130 requires a 72-hour **real work** pilot after activation |
| Merge of #1034 | **Do not merge** | Conflicts with current main; would revive obsolete contracts |

## 2. Target operating role

```text
GitHub durable state/events
  → Temporal durable supervision (wait / timer / retry / resume / reconcile)
    → existing CorpFlowAI Cursor Factory Handoff
      → Cloud Agents API v1 (inside Handoff only)
        → Cursor → PR / CI / GitHub evidence
          → Temporal wait / resume / reconcile
            → next safe allow-listed action
```

Temporal **owns:** durable waits, timers/timeouts, retries/backoff, missed-event reconciliation, wait/signal/resume, crash/restart recovery, continuation after CI/review/lifecycle changes.

Temporal **does not own:** business backlog truth, independent prioritisation, direct Cursor executor calls, merge/deploy/schema/env/payment/send/public-launch authority.

## 3. Current factory contracts this packet binds to

| Contract | Current truth | Temporal behaviour |
|----------|---------------|--------------------|
| Execution WIP | **3** verified current-generation Cursor runs | Never requests Handoff when slots are full |
| Cursor wake | **CorpFlowAI Cursor Factory Handoff** only | `workflow_call` with `wake_reason=temporal_supervisory` |
| Executor | Cloud Agents API v1 selected **inside Handoff** (`CURSOR_FACTORY_EXECUTOR`) | Never calls Cursor API / webhook / legacy dispatcher |
| Request identity | `work_request_id` (`cfai-wr-…`) | Observe only; do not mint a second database |
| Claim / agent / run | current-generation claim + `bc-*` + `run-*` | Duplicate Handoff suppressed while live |
| Rework | explicit `CURSOR REQUEUE` next generation | Generation N evidence must not block N+1 |
| Review-ready | zero execution WIP | Wait; do not occupy a slot; other eligible work may proceed |
| Queue Reconcile | 10-minute missed-event fallback | **Retain during pilot** |
| Protected gates | exact-gate durable approval | STOP; do not bypass |

## 4. Retain / demote / retire (conditional on PASS)

Do **not** disable anything in this PR.

| Component | During 72-hour pilot | If PASS | If FAIL |
|-----------|----------------------|---------|---------|
| Cursor Factory Handoff | Retain — primary | Keep forever | Keep forever |
| Cloud Agents executor inside Handoff | Retain | Keep | Keep |
| Factory Queue Reconcile (#1023) | Retain fallback | Demote/remove **schedule** after Temporal timers are proven on real work | Keep |
| Lifecycle status poller | Retain | Keep until GitHub evidence can replace bc-* polling | Keep |
| CI repair supervisor | Retain | Keep | Keep |
| Legacy API dispatcher | Diagnostic only | Stay diagnostic | Stay diagnostic |
| n8n heartbeat | Exception-notify only | Do not duplicate Temporal timers | Keep |
| Temporal pilot supervisor | Prepared, fail-closed | Promote to ACTIVE | **REMOVE/PARK** using `docs/runbooks/TEMPORAL_FACTORY_PILOT_ROLLBACK.md` |

## 5. 72-hour real-production pilot plan (prepare, do not activate)

After merge **and** the exact activation packet:

1. Supervise **≥10 real** bounded work packets already in the GitHub factory queue. Do **not** create synthetic factory tickets to make Temporal look busy.
2. Cover at least:
   - CorpFlowAI application / client journey work
   - Commercial / Delivery application work
   - ERPNext / revenue / operations work
3. Duration: **72 hours** from the GitHub Actions variable flip.
4. Existing Handoff, Queue Reconcile, lifecycle, and CI repair stay live. Temporal may request Handoff; it must not race a second executor.
5. Evidence is GitHub comments (`corpflow.factory_temporal_pilot.v1`) plus workflow artifacts. No second task database.

### PASS

Temporal earns permanent ACTIVE status only if live evidence shows it **materially reduces one or more of**:

- idle Cursor capacity while eligible work exists
- manual continuation / checking
- lost / stale waiting work
- recovery delay
- repeated controller intervention

**and** does so without duplicate Cursor runs (`duplicate_activations = 0`) and without materially increasing operational complexity.

### FAIL

If it does not materially improve delivery, the recommendation is **`REMOVE/PARK TEMPORAL`** with `docs/runbooks/TEMPORAL_FACTORY_PILOT_ROLLBACK.md`. No indefinite “maybe later”.

## 6. Success / failure metrics

Recorded on each supervised issue and aggregated in the workflow artifact:

| Metric | PASS signal |
|--------|-------------|
| `eligible_to_pickup_ms` | Materially shorter than the 10-minute reconcile floor for eligible work with free WIP |
| `waiting_resume_ms` | Resume after CI/review/lifecycle without Anton courier |
| `automatic_continuation_count` | Continuations that did not need a human poke |
| `recovery_count` | Missed-event / restart recoveries that self-healed |
| `manual_controller_interventions_avoided` | Count of automatic continuations |
| `duplicate_activations` | **Must stay 0** |
| `protected_gates_respected` | Protected STOP counted; no bypass |
| `idle_capacity_with_eligible_work` | **Must stay 0** while Temporal is ACTIVE |

## 7. Code

| Path | Role |
|------|------|
| `lib/server/factory-temporal-pilot.js` | Policy, observation, allow-list, in-process durable runtime, metrics |
| `scripts/factory-temporal-pilot.mjs` | GitHub Actions runner (fail-closed until activation) |
| `ops/temporal/pilot-worker.mjs` | Dry-run / fail-closed `--live` from Cursor Cloud |
| `.github/workflows/factory-temporal-pilot.yml` | Gated wrapper; `workflow_call`s Handoff only |
| `node-tests/factory-temporal-pilot.test.mjs` | Current-main contracts + restart/idempotency + metrics |

Workflow id: `corpflow-factory-pilot:<issue>:g<generation>`  
Task queue: `corpflow-factory-pilot`

## 8. Resource doctrine

- One infrastructure lane. No additional factory product.
- No paid tool, no new VM, no Temporal Cloud, no public Temporal exposure.
- No CorpFlow production Postgres reuse as a Temporal store.
- Prefer included Cursor-native model capacity for implementation work.
- Anton is not asked to SSH or invent token scopes. Activation is GitHub UI only.

## 9. What this packet does not do

- Merge itself
- Deploy
- Change env/secrets
- Mutate schema/data
- Send externally
- Start/restart a Temporal server or worker on `corpflow-exec-01`
- Disable Queue Reconcile, lifecycle, CI repair, or n8n
- Product UI
