# CorpFlowAI OpenHands Agent Handoff

Use this document when a new ChatGPT, Cursor, OpenHands, Codex, or other approved agent resumes the OpenHands workstream.

## Executive decision

Anton has decided that CorpFlowAI will implement OpenHands as a permanent internal delivery engine.

This is not a bake-off. The strategic model is:

- ChatGPT orchestrates and governs work;
- OpenHands handles routine, repetitive, operational, documentation, evidence, and low-risk implementation work;
- Cursor remains the specialist for difficult, architecture-sensitive, production-critical, and OpenHands-recovery work;
- GitHub remains the durable source of truth;
- OpenHands runs privately on the CorpFlowAI server;
- clients never access OpenHands directly.

## Why this decision was made

The current Cursor-based issue dispatcher repeatedly failed to create sustained flow. Monitoring and issue comments did not reliably become fresh agent runs, branches, PRs, or continuous queue movement.

Anton does not want to remain the human courier or the person constantly asking why work has stopped.

The server is healthy and underutilised. The goal is to use it as a persistent internal agent host while keeping model choice and costs flexible.

The team is intended to remain AI-only for as long as practical. Future growth should increase tools and compute before adding human developers or operators.

## What must not be misunderstood

OpenHands does not replace or remove Cursor.

Cursor may prepare the installation and remains available after OpenHands is operational.

OpenHands is expected to become the default lower-cost worker. Cursor becomes the premium specialist.

Installing OpenHands alone does not automatically create CorpFlowAI priorities, routing, protected gates, or reliable continuous delivery. These must be configured using the smallest practical layer around OpenHands' existing capabilities.

Do not respond to this by proposing a large custom controller before OpenHands' native issue, PR, automation, API, and SDK capabilities have been used and verified.

## Current recommended execution posture

Use Cursor Desktop on Anton's laptop as the initial implementation cockpit because the online dispatcher has been unreliable.

Cursor Desktop should inspect the repository, prepare the deployment/configuration PR, tests, server commands, verification, and rollback.

OpenHands must ultimately run on the server and continue independently when Anton's laptop is off.

No server installation occurs until a reviewed PR exists and Anton explicitly approves installation.

## System boundaries

Repository:

`antonvdberg-bit/corpflow-ai-command-center`

Production Core:

`https://core.corpflowai.com`

Rules:

- keep Core, CorpFlowAI business systems, and client tenant surfaces separate;
- keep Postgres as the production data source of truth;
- do not create a second production app or database;
- do not expose OpenHands publicly;
- do not give clients access;
- do not place secrets or client-private data into prompts, issues, PRs, docs, screenshots, or repository files.

## Initial worker split

OpenHands first:

- docs and runbooks;
- repository checks;
- backup verification;
- health checks;
- dependencies;
- lint/formatting;
- deterministic test repair;
- fixtures;
- issue preparation;
- evidence packets;
- low-risk bounded changes;
- draft PRs and routine review repair.

Cursor first:

- auth and cross-tenant boundaries;
- complex DB/state/concurrency work;
- large refactors;
- production incidents;
- OpenHands platform changes;
- work OpenHands fails twice;
- high-risk or urgent engineering.

## Initial cost and model posture

Initial OpenHands model ceiling: USD 25 monthly, no automatic top-up.

Use external inference initially unless server hardware proves that a suitable local coding model can run reliably.

Investigate current providers, current prices, and whether Anton's ChatGPT Team entitlement supports valid Codex use through OpenHands. Do not assume it does.

Record model, attempts, outcome, and approximate cost for each packet.

## Mandatory protected gates

Anton approval is required before:

- server installation or activation;
- GitHub app/token authorisation;
- OAuth or model-provider authorisation;
- paid subscription or spend;
- env/secrets;
- production deploy;
- DB/schema;
- DNS/firewall/public access;
- external sends;
- payments;
- public/client-facing launch;
- auto-merge.

## Definition of progress

Count only:

- current run ID;
- branch;
- commit;
- PR;
- tests;
- runtime/health evidence;
- verified artifact;
- completed review repair;
- approved activation or deployment.

Do not count plans, comments, labels, or old runs as delivery.

## Required first action for a new agent

1. Read:
   - `OPENHANDS_OPERATING_CHARTER.md`
   - `OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md`
   - this handoff document.
2. Inspect the latest issue/PR state for the OpenHands implementation.
3. Verify current official OpenHands requirements before relying on model names, pricing, installation commands, or feature claims.
4. State:
   - what is already implemented;
   - what is only documented;
   - current blocker;
   - next bounded PR or approval;
   - exact Anton involvement required.
5. Continue from evidence. Do not restart the design conversation from scratch.

## Current expected implementation sequence

1. Phase 0 current-state inspection.
2. Cursor Desktop installation-package PR.
3. Review and security verification.
4. Anton installation approval.
5. Private server installation.
6. GitHub and model authorisation.
7. Synthetic issue-to-PR proof.
8. CorpFlowAI work-routing configuration.
9. Routine operational tasks.
10. Controlled expansion into low-risk implementation.

## Reporting format

What moved:
What is blocked:
What is next:
Owner:
Anton needed:
Evidence:

If Anton is required, provide one compact action packet with exact steps and expected time. Do not make Anton diagnose or implement the technical work.
