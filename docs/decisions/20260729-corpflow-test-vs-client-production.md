# CorpFlowAI-hosted surfaces are corpflow_test (not client_production)

**Date:** 2026-07-29  
**Status:** accepted  
**Implements:** GitHub issue [#679](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/679)  
**Journal:** `JE-2026-07-29-1`

## Context

Dispatchers, docs, and delivery language often treated publicly reachable CorpFlowAI hosts (`core.corpflowai.com`, `lux.corpflowai.com`, CIPC Desk, etc.) as “production” solely because they are live. That false classification blocked normal tenant test publishing behind production gates and conflated merge approval with client-production approval.

## Decision

All tenant/client surfaces currently hosted under CorpFlowAI-controlled domains are **test environments** (`corpflow_test`; dispatcher enum `test`). Platform “Vercel Production” is the spine that serves those hosts — it is not business `client_production`. Future client-owned/approved production targets require a separate, stronger release process and explicit Anton/client approval. Canonical doctrine: `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md`.

## Consequences

- Positive: Normal tenant UI/content can publish to CorpFlowAI test hosts after merge + CI without a false `protectedGate: production` / redundant staging chain; live test URL validation remains mandatory.
- Negative / follow-ups: Operators must keep distinguishing Vercel Production (platform) from client_production (business); historical docs may still say “production site” until gradually aligned.

## Links

- Related code: `lib/server/cursor-issue-dispatch-lifecycle.js`, `lib/server/operator-review-handoff.js`, `lib/server/operator-checkpoint-alert.js`
- Docs: `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md`
