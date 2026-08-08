# CorpFlowAI OpenHands Operating Charter

Status: Adopted strategic direction; package/install progress tracked under [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743).

> **Executor posture override:** `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md` is current proven reality. **Cursor** is the automatic primary execution worker; **OpenHands** is an **optional** operational worker and must not sit on the critical path or overlap another executor claim merely because it exists. Sections below that still describe OpenHands as the "default routine worker" are destination-shape / charter intent — they do **not** override current delivery reality until Anton explicitly re-authorizes that routing.

**Phase 1 package (2026-08-04):** a reviewed OpenHands package exists at `ops/openhands/`,
`config/openhands/`, and `scripts/ops/openhands/` (controlling issue [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)). Treat OpenHands as **available when separately assigned**, not as automatic dispatch. Recommended branch prefix for future OpenHands-authored work (once opening its own PRs) is `openhands/*`. See
`docs/operations/OPENHANDS_ARCHITECTURE.md` and
`docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md`. Installation/ops bounds remain in
`docs/decisions/20260804-openhands-on-exec01.md` and `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md`.

## Purpose

OpenHands is being introduced as a permanent internal delivery capability for CorpFlowAI. It is intended to reduce operator dependency, lower routine agent cost, use the underutilised CorpFlowAI server productively, and create a continuously active AI-only delivery environment.

OpenHands is not a client-facing product. Clients must continue to interact through CorpFlowAI business and tenant surfaces, not through OpenHands.

## Permanent operating model

- Anton van den Berg: CEO/CIO/operator. Owns business decisions and protected approvals only.
- ChatGPT: work orchestration, prioritisation, packet definition, acceptance review, escalation, and operating-system governance.
- OpenHands: default routine, repetitive, operational, maintenance, evidence, and low-risk implementation worker.
- Cursor: premium specialist engineering worker for complex, architecture-sensitive, production-critical, and OpenHands-recovery work.
- GitHub: durable source of truth for issues, work packets, branches, pull requests, evidence, and operating documentation.
- CorpFlowAI server: permanent OpenHands host and task-sandbox host.
- Postgres: production data source of truth. OpenHands must not create a second production database.

OpenHands does not replace Cursor. The two systems coexist under explicit work ownership rules.

## Work routing

OpenHands should normally own:

- documentation and runbook maintenance;
- repository inventory and consistency checks;
- backup verification and health checks;
- stale-reference, dead-link, lint, and formatting work;
- dependency review;
- deterministic test execution and bounded repair;
- synthetic fixture preparation;
- issue and evidence-packet preparation;
- routine CI failure analysis and repair;
- low-risk bounded code changes;
- draft pull request creation;
- review-feedback repair loops;
- scheduled operational checks;
- preparation of specialist packets for Cursor.

Cursor should normally own:

- authentication and authorisation architecture;
- database-sensitive and cross-tenant behaviour;
- complex state, concurrency, and recovery work;
- large refactors;
- production-critical changes;
- urgent incident repair;
- OpenHands platform installation, upgrades, and difficult failures;
- packets OpenHands has failed twice;
- work where reliability is more important than agent cost.

Neither OpenHands nor Cursor may independently execute protected actions.

## Protected actions

Explicit Anton approval is required before:

- production or externally visible deployment;
- environment, secret, credential, or OAuth changes;
- database or schema changes;
- DNS, firewall, reverse-proxy, or public-network changes;
- payments or paid-tool activation;
- external email, WhatsApp, SMS, or other outbound communication;
- public launch;
- destructive cleanup;
- broad GitHub organisation access;
- automatic merge or production deployment.

Secrets must never appear in chat, prompts, GitHub issues, pull requests, documentation, screenshots, or repository files.

## Work packet contract

Every executable task must have:

- packet ID distinct from the parent issue number;
- parent issue and business objective;
- expected value and priority;
- allowed files and explicit exclusions;
- acceptance tests and evidence requirements;
- maximum attempts;
- model tier or worker assignment;
- spend or iteration ceiling;
- protected gates;
- escalation condition;
- branch naming convention;
- expected PR boundary.

A task is active only when there is a real run ID, branch, and current activity evidence. Comments and labels alone do not constitute active work.

## Collision prevention

OpenHands and Cursor must not concurrently own the same packet, branch, or files.

Before starting work, verify:

- no active worker owns the packet;
- no active branch owns overlapping files;
- the packet remains executable and current;
- all required non-protected prerequisites are available.

Duplicate claims must be rejected or converted into review work.

## Delivery sequence

Normal delivery follows:

build -> test -> preview or local evidence -> verify -> review -> approve where required -> deploy where approved -> validate.

Do not call work complete without concrete evidence such as a commit, PR, tests, runtime verification, logs, health evidence, or a verified artifact.

Plans, issue comments, labels, status messages, and architecture notes are not delivery when implementation is required.

## Model policy

OpenHands may use multiple model tiers.

- inexpensive model: documentation, inventory, checks, formatting, routine reports;
- stronger coding model: bounded implementation, test repair, CI repair, multi-file reasoning;
- Cursor: difficult or high-risk engineering.

Use the cheapest model that reliably completes the class of work. Repeated cheap failures are not economical.

Initial OpenHands model-spend ceiling: USD 25 per month, with no automatic top-up, until Anton approves a different ceiling.

Every task should record model used, attempts, result, approximate cost where available, and escalation outcome.

## Server posture

The CorpFlowAI server is currently underutilised and is a viable OpenHands host.

OpenHands should run privately on the server using isolated task sandboxes. It must remain separate from Core, tenant surfaces, Postgres production data, and client-facing runtime.

The initial design should use external model inference unless server hardware evidence proves a suitable local coding model can run reliably.

## Success definition

OpenHands is not operational merely because its UI loads.

Operational success requires:

- private service health and persistence;
- isolated sandbox creation;
- GitHub issue-to-branch-to-draft-PR execution;
- tests and evidence;
- review-feedback repair;
- no collision with Cursor;
- cost and attempt visibility;
- safe failure and escalation;
- routine tasks continuing while Anton's laptop is off;
- Anton not acting as courier between agents.

## Governance principle

OpenHands must shorten the CorpFlowAI learning curve, not create another opaque automation layer. Every durable rule, failure mode, routing decision, and proven operating pattern must be recorded in repository documentation so future agents can resume from evidence rather than reconstructing conversations.
