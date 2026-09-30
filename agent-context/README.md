# Agent Context v1

Purpose: compact, version-controlled operating context for ChatGPT, Cursor, Forge and future CorpFlowAI agents.

## Mandatory boundaries
- GitHub issues/PRs and repo docs are delivery lineage.
- Postgres is the production application/context source of truth; do not create a second production database.
- /change remains the operator control plane where applicable.
- No production deploy, production DB/schema/data mutation, env/secrets/access change, payment, external message/publish, paid tool/vendor, or public launch without explicit Anton approval.
- Never place secrets, credentials, .env values, payment details or client-private data in prompts, logs, GitHub comments or fixtures.

## Cost-aware routing
1. Deterministic automation first where sufficient.
2. Forge for bounded LOW-tier deterministic work.
3. Cursor for multi-file/schema/integration work.
4. Higher-cost paths only when justified.

## Forge cage
Forge receives an explicit task contract, exact allowed files/context, a hard timeout and a deterministic verifier. It may not roam the repo, mutate production, change secrets/env/access, merge, deploy, publish or send externally.

Initial contracts:
- FORGE_VALIDATE_PACKET
- FORGE_PARSE_LOG
- FORGE_CREATE_FIXTURE
- FORGE_TRANSFORM_DATA
- FORGE_REPAIR_TEST

Any task outside the contract, or two failed attempts, escalates rather than retrying indefinitely.

## Learning
Static rules belong here in Git. Dynamic experience-derived learnings belong in the shared Postgres learning fabric defined by #1370, with provenance, review state and supersession.
