# Temporal Factory Phase 1 — wrap, do not replace, the GitHub/Cursor loop

**Date:** 2026-08-21  
**Status:** accepted for repo wrapper; live L3 worker still not started (Anton authorized 2026-08-22; Cursor Cloud HOST_MISMATCH)  
**Issue:** [#1032](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1032)

## Context

CorpFlowAI already has a proven Cursor factory path: GitHub is durable truth, **CorpFlowAI Cursor Factory Handoff** is the sole Cursor wake, and #1023 is a 10-minute missed-event fallback. Self-hosted Temporal was requested as durable wait/resume — not as a second dispatcher or work database.

## Decision

Phase 1 introduces a Temporal-shaped supervisory workflow **in repo** that can only choose allow-listed ordinary actions and may only request the existing Handoff. Live worker start on `corpflow-exec-01` is an exact protected L3 action and is not performed here. The GitHub 10-minute reconciler stays until a live Temporal timer is proven.

## Consequences

- Positive: one documented spine; synthetic A–J proofs; no second Cursor wake path.
- Negative / follow-ups: production missed-event recovery still depends on #1023 until L3; #1025 live-host evidence is not re-probed from Cursor Cloud.

## Links

- Canonical: `docs/operations/TEMPORAL_FACTORY_PHASE1_V1.md`
- Code: `lib/server/factory-temporal-phase1.js`
- Tests: `node-tests/factory-temporal-phase1.test.mjs`
