# Grok 4.6 is an optional Cursor executor model, not a control-plane

**Date:** 2026-08-22  
**Status:** accepted — factory pilot recommendation  
**Implements:** GitHub issue [#1038](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1038)  
**Journal:** `JE-2026-08-22-1`

## Context

CorpFlowAI already has a durable factory path: GitHub is the work source of truth, Temporal may supervise, **CorpFlowAI Cursor Factory Handoff** is the only Cursor wake, and Cursor executes. Cursor Grok 4.6 is already in the paid Cursor model pool. The question was whether that model adds value for long-horizon factory work without buying Ultra, launching Grok Bot, or creating a second orchestrator.

## Decision

Keep Grok 4.6 as an **executor/reviewer model inside Cursor**. Use it selectively for long-horizon or high-complexity factory work. Do not change ownership. Do not implement Grok Bot. Do not treat this pilot as spend, merge, or production authority.

Canonical record: `docs/operations/GROK_46_FACTORY_PILOT_V1.md`.

## Consequences

- Positive: Factory Automation can keep using a model that is already included and already appearing as the current factory default (`cursor-grok-4.6-high-fast`) without a new paid plan.
- Negative / follow-ups: This packet did not run a duplicate paid Composer comparison. Browser/UI verification was out of scope. Grok Bot remains unauthorized even if public vendor pages later include it on Pro+.

## Links

- Related code: `lib/server/grok-46-factory-pilot.js`, `config/grok-46-factory-pilot.v1.json`, `node-tests/grok-46-factory-pilot.test.mjs`
- Docs: `docs/operations/GROK_46_FACTORY_PILOT_V1.md`
