# CorpFlowAI OpenHands Implementation and Operations Runbook

## Objective

Install and operationalise OpenHands as a private, server-hosted internal AI worker for CorpFlowAI without exposing production secrets, client data, Core, tenant surfaces, or Postgres production access.

## Implementation cockpit

Use Cursor Desktop on Anton's laptop as the initial implementation cockpit because the current online dispatcher is unreliable. Cursor Desktop prepares repository changes, deployment files, tests, verification steps, and rollback. OpenHands itself must run permanently on the CorpFlowAI server and continue when Anton's laptop is off.

## Phases

### Phase 0 — current-state inspection

Inspect before changing anything:

- server OS, CPU, RAM, disk, Docker availability, and current utilisation;
- existing deployment and reverse-proxy conventions;
- existing monitoring and backup mechanisms;
- GitHub Actions and repository permissions;
- existing Cursor dispatcher and agent-control documentation;
- current official OpenHands self-hosted requirements, licensing, GitHub integration, model support, and automation capabilities.

Return:

- verified target architecture;
- exact files to create or modify;
- resource allocation proposal;
- security boundaries;
- model-provider options and cost caps;
- required Anton approvals;
- rollback plan;
- first three synthetic validation packets.

No installation or access grant occurs in Phase 0.

### Phase 1 — installation package PR

Prepare a bounded PR containing:

- pinned supported OpenHands version;
- Docker Compose or equivalent deployment definition;
- private bind or approved private-access path;
- persistent storage;
- sandbox configuration;
- CPU, RAM, task-count, timeout, and disk controls;
- health checks and restart policy;
- log rotation;
- non-secret environment template;
- secret-entry procedure without values;
- GitHub least-privilege configuration;
- model-provider configuration structure;
- safe update, rollback, and uninstall procedures;
- backup treatment;
- verification scripts or checks;
- operator runbook.

The PR must not contain secrets, production credentials, client data, or authority to deploy.

### Phase 2 — private installation

Requires explicit Anton approval.

After approval:

1. Install the reviewed package on the server.
2. Confirm no public unauthenticated exposure.
3. Verify container health and restart behaviour.
4. Verify persistent storage across restart.
5. Verify resource limits.
6. Connect one model through secure authorisation.
7. Connect only the approved GitHub repository with least privilege.
8. Run one synthetic task in an isolated sandbox.
9. Capture logs, cost evidence, branch, tests, and draft PR.
10. Confirm rollback remains executable.

### Phase 3 — CorpFlowAI worker configuration

Implement:

- repository-specific OpenHands instructions;
- work-packet template;
- branch naming convention;
- OpenHands/Cursor ownership checks;
- model-routing policy;
- maximum attempts and timeout policy;
- cost recording;
- PR evidence format;
- failure and Cursor-escalation policy;
- protected-action refusal rules.

### Phase 4 — routine automation

Enable only proven task classes initially:

- documentation maintenance;
- repository health checks;
- backup-verification checks that do not mutate backups;
- dependency reports;
- deterministic test execution and bounded repair;
- issue and evidence preparation.

Do not enable production deployment, external sends, DB/schema work, DNS, payments, or auto-merge.

### Phase 5 — controlled expansion

Expand OpenHands ownership only where repeated evidence shows reliable completion, bounded cost, safe failure, and no collision with Cursor.

## Access model

Initial GitHub access must be limited to `antonvdberg-bit/corpflow-ai-command-center`.

Required permissions should be limited to:

- read repository and issue content;
- create its own branches;
- commit to those branches;
- open draft pull requests;
- read CI results;
- post bounded issue/PR comments;
- respond to review feedback.

Do not grant:

- direct push to `main`;
- automatic merge;
- repository-secret read access;
- deployment authority;
- broad organisation administration;
- unrelated repository access.

## Model configuration

The preferred initial architecture is server-hosted OpenHands with external model inference.

Investigate current supported providers and pricing at implementation time. Do not rely on stale model names or prices.

Model routing:

- low-cost tier for documentation, inventory, routine checks, and formatting;
- stronger coding tier for implementation and test/CI repair;
- Cursor for difficult or production-sensitive work.

Initial model-spend ceiling: USD 25 monthly, no automatic top-up.

Investigate whether Anton's current ChatGPT Team entitlement supports valid Codex authorisation through OpenHands. Do not assume Team, Plus, and Pro entitlements are equivalent.

## Task lifecycle

Recommended states:

`READY -> RESERVED -> RUNNING -> BRANCH_ACTIVE -> PR_OPEN -> CI_OR_REVIEW -> REPAIR -> REVIEW_READY -> DISPOSITIONED -> COMPLETE`

Recovery:

`STALE -> ONE_FOLLOW_UP -> REQUEUED_OR_ESCALATED`

A task must not be marked RUNNING without a real run ID and branch.

After two failed attempts, or earlier where risk warrants, escalate to Cursor with a compact failure packet containing:

- objective;
- attempts;
- commands and tests;
- errors;
- changed files;
- branch/commit evidence;
- model and approximate cost;
- recommended specialist next step.

## Initial synthetic validation packets

1. Documentation correction
   - bounded useful documentation change;
   - branch, formatting checks, and draft PR.

2. Deterministic test repair
   - synthetic or deliberately isolated failing test;
   - focused repair, broader relevant tests, and draft PR.

3. Review-repair cycle
   - low-risk multi-file change;
   - draft PR;
   - one review correction;
   - updated tests and evidence.

Optional later validation:

- dead-link/stale-reference audit;
- backup-verification simulation with no production mutation.

## Acceptance criteria

Installation readiness:

- reviewed installation PR;
- documented resources and access;
- no secret leakage;
- health, rollback, and uninstall defined.

Private runtime success:

- service healthy;
- private access verified;
- persistence verified;
- isolated sandbox created;
- one model connected;
- synthetic task completed;
- draft PR opened;
- cost and logs captured.

Useful-worker success:

- at least three successful packets;
- one review-repair cycle;
- no duplicate work with Cursor;
- safe failure and escalation;
- Anton not acting as courier;
- operation continues with Anton's laptop off.

## Anton gates

### Gate 1 — design approval

Review architecture, access, resources, cost cap, and first PR boundary.

Expected Anton effort: 10–20 minutes.

### Gate 2 — installation approval

Approve the reviewed private server installation and resource allocation.

Expected Anton effort: about 5 minutes.

### Gate 3 — GitHub authorisation

Approve selected-repository, least-privilege access through the provider interface.

Expected Anton effort: 5–15 minutes.

### Gate 4 — model authorisation

Complete OAuth or secure provider-key entry and confirm spending limit.

Expected Anton effort: 5–15 minutes.

### Gate 5 — activation approval

Review runtime evidence, synthetic PR, cost, security boundary, and rollback readiness.

Expected Anton effort: 10–20 minutes.

When Anton is needed, use:

## ANTON ACTION REQUIRED

Decision:
Recommended action:
Reason:
Exact steps:
Expected time:
Risk:
What happens next:

## Progress reporting

Every progress update must state:

- What moved
- What is blocked
- What is next
- Owner
- Anton needed
- Evidence

Be explicit when nothing moved. Do not count comments, labels, plans, or old run IDs as implementation progress.
