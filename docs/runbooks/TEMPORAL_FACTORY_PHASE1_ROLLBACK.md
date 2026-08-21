# Temporal Factory Phase 1 — rollback

**Issue:** [#1032](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1032)  
**Use when:** this packet must be taken out without changing the live factory loop.

## What this packet changed

Repo docs, a Temporal-shaped supervisor module, dry-run worker entry, and deterministic tests. It did **not** start Temporal, change DNS, add secrets, or replace Handoff.

## Rollback

1. Revert the merged commit / close the unmerged PR.
2. Confirm `.github/workflows/factory-cursor-handoff.yml` is still the sole Cursor wake.
3. Confirm `.github/workflows/factory-queue-reconcile.yml` still owns the 10-minute fallback.
4. Do **not** start `ops/temporal/phase1-worker.mjs --live`.
5. If an L3 worker was later started via `docs/runbooks/TEMPORAL_FACTORY_PHASE1_LIVE_ACTIVATION.md`: stop that process only under the same Anton L3 authority that started it. Delete the box-local token file if it must not remain. Do not print the token.

## What stays

GitHub issues/PRs, Handoff, #1023 reconcile, lifecycle poller, CI repair supervisor, n8n exception-only notify.
