# Temporal real-production prove-or-remove pilot

**Date:** 2026-08-27  
**Status:** accepted for repo packet / activation-prepared; live pilot not started  
**Issue:** [#1130](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1130)

## Context

Anton approved a serious prove-or-remove trial for Temporal. Infrastructure viability is already a historical fact. The business question is whether Temporal materially improves **real production throughput**. PR #1034 is obsolete against current main.

## Decision

Rebuild the smallest Temporal-shaped supervisor on current main:

- GitHub remains durable work/evidence truth.
- CorpFlowAI Cursor Factory Handoff remains the only Cursor wake.
- Cloud Agents API v1 stays inside Handoff.
- WIP=3, current-generation claim / `work_request_id` / `bc-*` / `run-*`, `CURSOR REQUEUE`, review-ready zero-WIP, and protected gates are first-class.
- Overlapping supervisors stay live during the 72-hour pilot.
- Live activation is one GitHub-native packet (approval comment + repository variable + Run workflow). No SSH, no new secret.

## Consequences

- Positive: current-main review-ready packet; restart/idempotency proofs; measurable 72-hour metrics; exact FAIL→remove path.
- Negative / follow-ups: live throughput proof still requires the activation packet after merge. #1034 must not be merged.

## Links

- Canonical: `docs/operations/TEMPORAL_FACTORY_REAL_PRODUCTION_PILOT_V1.md`
- Activation: `docs/runbooks/TEMPORAL_FACTORY_PILOT_ACTIVATION.md`
- Rollback: `docs/runbooks/TEMPORAL_FACTORY_PILOT_ROLLBACK.md`
- Code: `lib/server/factory-temporal-pilot.js`
