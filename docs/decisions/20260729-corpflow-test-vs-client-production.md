# CorpFlowAI-hosted surfaces are test; client production is separate

**Date:** 2026-07-29  
**Status:** accepted  
**Issue:** [#679](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/679)

## Context

Operators and classifiers sometimes treated CorpFlowAI-hosted live URLs (`core.corpflowai.com`, `lux.corpflowai.com`, CIPC Desk hosts, other `*.corpflowai.com` tenant surfaces) as **client production** because they are public and served by Vercel’s Production channel. That conflated:

- infrastructure “Production” (Vercel non-Preview deploy),
- merge approval,
- and true **client production** cutover.

It also encouraged redundant local → preview → staging chains and false `approval:production` / Anton Decision Inbox gates for ordinary tenant test publishing.

## Decision

1. All current CorpFlowAI-controlled tenant/client hosts are business environment **`corpflow_test`**.
2. **`client_production`** is reserved for a separately governed client-owned or client-approved production target, with stronger controls and explicit Anton + client approval.
3. Normal tenant UI/content work publishes to the relevant CorpFlowAI test surface after approved merge + CI; live test URL validation remains mandatory; Preview/staging is optional, not a forced chain.
4. Heartbeat / Decision Inbox must not page Anton merely for `corpflow_test` publish.

Canonical doc: `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md`.

## Consequences

- Positive: unambiguous language for Lux / CIPC Desk / Core; fewer false production gates; faster safe tenant test throughput.
- Negative / follow-ups: existing docs that say “production” for Vercel channel or live CorpFlowAI hosts should prefer `corpflow_test` / “live test URL” when meaning business environment; legacy enum value `production` maps to `client_production` for gates/WIP only.
- No second app, no second database, no client-production deploy authorised by this ADR.

## Links

- Canonical: `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md`
- Code: `lib/server/environment-classification.js`, `lib/server/cursor-issue-dispatch-lifecycle.js`, `lib/server/operator-review-handoff.js`
- Related: `docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md`
