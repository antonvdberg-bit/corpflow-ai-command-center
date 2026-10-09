# Agent Context v1

Purpose: compact, version-controlled operating context for ChatGPT, Cursor, Forge and future CorpFlowAI agents.

## Mandatory boundaries
- GitHub issues/PRs and repo docs are delivery lineage.
- Postgres is the production application/context source of truth; do not create a second production database.
- /change remains the operator control plane where applicable.
- No production deploy, production DB/schema/data mutation, env/secrets/access change, payment, external message/publish, paid tool/vendor, or public launch without explicit Anton approval.
- Never place secrets, credentials, .env values, payment details or client-private data in prompts, logs, GitHub comments or fixtures.

## Controller work comes before executor dispatch

Routine summarisation, task evaluation, evidence review, learning capture, documentation and work routing are non-negotiable controller duties. ChatGPT/Codex may directly make bounded documentation-only branch edits, verify them and prepare reviewable PRs under the 2026-10-04 operator-approved exception in `AGENTS.md`. Stop before merge and protected actions.

Before dispatching Cursor, record the concrete implementation need and why direct controller work or existing deterministic automation / an approved Forge contract is insufficient. A document, summary, learning note or routing decision alone does not justify a Cursor run. Do not duplicate active executor work; verify release before transferring ownership. Forge remains within its existing approved contracts.

## Cost-aware routing
1. Deterministic automation first where sufficient.
2. Forge for bounded LOW-tier deterministic work.
3. Cursor for multi-file/schema/integration work.
4. Higher-cost paths only when justified.

Routing may adapt from verified historical evidence, but may never bypass protected-action approvals. Prefer accepted-output economics (PASS, rework, escalation, elapsed time and cost) over model prestige.

## Forge cage
Forge receives an explicit task contract, exact allowed files/context, a hard timeout and a deterministic verifier. It may not roam the repo, mutate production, change secrets/env/access, merge, deploy, publish or send externally.

Initial contracts:
- FORGE_VALIDATE_PACKET
- FORGE_PARSE_LOG
- FORGE_CREATE_FIXTURE
- FORGE_TRANSFORM_DATA
- FORGE_REPAIR_TEST

Any task outside the contract, or two failed attempts, escalates rather than retrying indefinitely.

## Continuous improvement closeout

Every governed ChatGPT, Cursor and Forge completion must answer:
- what changed;
- what was verified;
- what failed or was corrected;
- whether a reusable lesson was learned;
- whether routing should change next time;
- which durable source was updated;
- whether an older rule/fact is superseded.

If nothing material was learned, record `NO_MATERIAL_LEARNING`. Do not invent learning merely to populate memory.

Learning states:
`OBSERVATION -> CANDIDATE -> VERIFIED -> ADOPTED -> SUPERSEDED`.

Only low-risk deterministic learning may auto-promote after repeated evidence. Architecture, security, production, financial policy, commercial decisions and client commitments require review before adoption.

Replay paid-for failures and successful patterns through the organisational regression corpus before promoting material agent/runtime/router changes.

## Learning
Static rules belong here in Git. Dynamic experience-derived learnings belong in the shared Postgres learning fabric defined by #1370, with provenance, review state and supersession.

Chat/session history is discovery-only. It must be verified and promoted before becoming organisational truth.

## Source-of-truth and bootstrap
Chat history is a working/discovery surface, not organisational truth.

Fresh authorised agents must:
1. read `AGENTS.md`, the current delivery reality, and `docs/operations/ORGANIZATIONAL_MEMORY_AND_AGENT_BOOTSTRAP_V1.md`;
2. retrieve relevant CURRENT Context / Agent Learning records where available;
3. refresh GitHub issue / PR / commit / CI state for current delivery claims;
4. promote material state-changing discoveries out of chat into Git, Postgres Context / Agent Learning, GitHub, or ERPNext as appropriate.

When durable sources conflict, do not silently blend them. Prefer current runtime evidence for runtime state, then current GitHub evidence, then current provenance-backed Context / Agent Learning records, then canonical repo doctrine; mark stale sources for reconciliation.
