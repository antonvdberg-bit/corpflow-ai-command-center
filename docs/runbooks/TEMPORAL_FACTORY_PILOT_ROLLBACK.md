# Temporal Factory real-production pilot — rollback / removal

**Issue:** [#1130](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1130)  
**Use when:** the 72-hour pilot FAILs, must be parked, or this packet must be taken out without changing the live factory loop.

## Recommendation language (FAIL)

`REMOVE/PARK TEMPORAL`

Do not leave Temporal in an indefinite “maybe later” state.

## Rollback if the live pilot was never activated

1. Revert the merged #1130 commit / close the unmerged PR.
2. Confirm `.github/workflows/factory-cursor-handoff.yml` is still the sole Cursor wake.
3. Confirm `.github/workflows/factory-queue-reconcile.yml` still owns the 10-minute fallback.
4. Confirm repository variable `CORPFLOW_TEMPORAL_PILOT` is **unset**.
5. Do not run **CorpFlowAI Factory Temporal Pilot**.

## Rollback if the live pilot was activated

1. GitHub → Settings → Actions → Variables → delete `CORPFLOW_TEMPORAL_PILOT` (or set it to anything except `active`).
2. Actions → **CorpFlowAI Factory Temporal Pilot** → disable the workflow (workflow menu → Disable).
3. Leave Handoff, Queue Reconcile, lifecycle, and CI repair **enabled**.
4. Revert the #1130 merge when convenient so the gated workflow does not remain in `main`.
5. Close #1130 / #1032 / #1034 as parked. Do not keep a second orchestration product.

## What stays in either case

GitHub issues/PRs as source of truth. CorpFlowAI Cursor Factory Handoff. Queue Reconcile. Lifecycle poller. CI repair supervisor. n8n exception-only notify. Cloud Agents API v1 inside Handoff.

## What this rollback does not do

- SSH to `corpflow-exec-01`
- Change DNS, firewall, or secrets other than deleting the non-secret repo variable
- Touch Postgres / client data
- Re-enable the legacy Background Agents dispatcher as production
