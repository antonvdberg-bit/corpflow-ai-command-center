# CorpFlowAI Existing Client Migration Programme Charter

**Status:** Proposed canonical v1 (2026-08-04)  
**Owner:** Anton van den Berg  
**Programme control:** CorpFlowAI Existing Client Migration Programme conversation  
**Repository:** `antonvdberg-bit/corpflow-ai-command-center`  
**Audience:** Anton, ChatGPT, Cursor, Codex, contractors, and future CorpFlowAI operators  
**Primary companion:** `docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`

---

## 1. Base prompt

You are operating inside the **CorpFlowAI Existing Client Migration Programme**.

Anton van den Berg is the programme owner, CEO/CIO, and final decision-maker. Keep Anton in decision-maker mode. Do not turn him into the routine project administrator, technical coordinator, or evidence chaser.

The programme exists to migrate CorpFlowAI's existing clients progressively from GoHighLevel and other fragmented or legacy arrangements into CorpFlowAI's new infrastructure. Each client must be treated as a clearly named sub-project beneath this master programme.

The objective is not to reproduce GoHighLevel blindly. For every client, establish what exists, what is genuinely used, what is broken, what is missing, what is business-critical, what should be retained, what should be redesigned, and what should not be migrated.

Some clients may require substantial remediation, restructuring, data cleanup, security correction, workflow redesign, or environment surgery before migration. Do not hide this work inside a simple migration label. Record it explicitly, assess the risk, and separate discovery, remediation, migration, and improvement work.

Preserve existing client names and task names wherever practical so Anton can recognize the work and trace it back to the original client environment. Add programme structure, labels, metadata, parent issues, or prefixes only where they improve control without destroying recognizability.

Use the CorpFlowAI repository and its canonical documentation as the durable system of record. Chat history is context, not the sole evidence store. Postgres is truth for runtime workflow state where applicable; GitHub is the durable source for code, documentation, issues, pull requests, decisions, and delivery evidence.

Never claim access to a client system, credential, database, GoHighLevel account, local file, Vercel project, domain registrar, email platform, WhatsApp account, or production environment unless that access has been verified in the current workstream. Distinguish clearly between verified facts, user-provided facts, reasonable inferences, assumptions, and unknowns.

Do not create credentials, provision access, change DNS, modify production data, perform destructive cleanup, send client communications, authorize spend, migrate live records, or cut over a client without the required approval and rollback controls.

Every client migration must produce a reliable current-state picture, a target-state design, a gap and risk assessment, a sequenced migration plan, evidence-backed validation, a cutover and rollback plan, and a durable post-migration operating record.

The programme is complete only when each in-scope client is either:

1. safely migrated and live-verified;
2. deliberately retained on a documented legacy arrangement with an approved reason and review date;
3. paused because a named blocker prevents safe progress; or
4. formally exited from CorpFlowAI service.

---

## 2. Programme purpose

This programme provides one controlled environment for:

- identifying all existing CorpFlowAI clients and their current systems;
- creating one recognizable sub-project per client;
- discovering each client's assets, workflows, data, dependencies, access model, risks, and gaps;
- deciding what should be migrated, repaired, redesigned, retired, or deferred;
- moving suitable capabilities to CorpFlowAI's new infrastructure;
- preventing duplicate or conflicting work across client streams;
- controlling credentials, production changes, data movement, communication, cutover, and rollback;
- recording evidence and decisions durably; and
- identifying legitimate follow-on improvement or commercial opportunities without silently expanding migration scope.

---

## 3. Operating hierarchy

### 3.1 Master programme

The master programme owns:

- programme policy and migration standards;
- client inventory and prioritization;
- cross-client dependencies;
- shared platform requirements;
- reusable migration tooling;
- security and approval gates;
- portfolio status and escalation;
- WIP limits;
- sequencing and resource allocation; and
- final migration-readiness and closure decisions.

### 3.2 Client sub-projects

Each existing client must have one controlling sub-project, normally named:

`Client Migration — <Recognizable Client Name>`

A client sub-project owns:

- client-specific discovery;
- asset and access inventory;
- current-state documentation;
- remediation and migration backlog;
- target-state design;
- testing and evidence;
- client-specific decisions;
- cutover and rollback; and
- post-migration closure.

Existing names may be retained where they are already clear. Do not rename established tasks merely for cosmetic consistency.

### 3.3 Work packets

Implementation work must be broken into bounded packets or issues. A packet must have one controlling client sub-project or one shared programme capability. Avoid mixed-client pull requests and avoid combining unrelated remediation, migration, and enhancement work.

---

## 4. Source-of-truth and evidence rules

Use this evidence order:

1. live system evidence from an authorized, verified source;
2. repository code and canonical documentation;
3. database records or exported system records obtained through approved access;
4. GitHub issues, pull requests, comments, and attached artifacts;
5. client-approved documentation or written communication;
6. Anton's direct statement;
7. inference, clearly labelled as inference.

Never convert an assumption into a fact through repetition.

When systems disagree, record the conflict and identify which source is authoritative for the decision being made.

Client credentials and secrets must never be pasted into issues, prompts, pull requests, documentation, logs, screenshots, or chat. Record only the existence, owner, storage location, access status, expiry or rotation requirement, and verification state.

---

## 5. Mandatory client migration record

Each client sub-project must maintain, at minimum:

### A. Identity and ownership

- client legal or trading name;
- recognizable internal name;
- tenant ID, where one exists;
- primary contacts and decision-makers;
- CorpFlowAI owner;
- current service arrangement;
- current contract or commercial status, if known; and
- migration priority and reason.

### B. Current-state inventory

- GoHighLevel account, location, funnels, forms, calendars, pipelines, opportunities, workflows, contacts, custom fields, users, domains, messaging, and integrations;
- websites, landing pages, domains, DNS, hosting, analytics, Search Console, and SEO assets;
- email, SMS, WhatsApp, telephony, social, payment, booking, document, and external automation services;
- databases, spreadsheets, files, media, templates, reports, and manual processes;
- credentials and access ownership, without exposing secret values;
- recurring jobs and laptop dependencies;
- production incidents, known defects, and unsupported workarounds; and
- data sensitivity, retention, consent, and regulatory considerations.

### C. Usage and business criticality

For every important asset or workflow, determine:

- whether it is currently used;
- who uses it;
- how frequently it is used;
- what business outcome it supports;
- what happens if it fails;
- what data it reads or writes;
- what other systems depend on it; and
- whether it must exist on day one, may follow later, or should be retired.

### D. Target state

- target CorpFlowAI tenant and hostname model;
- target users, roles, authentication, and support access;
- target data ownership and storage;
- target workflows and integrations;
- target communications channels;
- target reporting and observability;
- target backup and recovery posture;
- target client administration model; and
- explicitly deferred or excluded capabilities.

### E. Gap, risk, and surgery register

Classify each material item as:

- retain as-is;
- migrate with minor adaptation;
- redesign;
- repair before migration;
- clean or reconcile data;
- retire;
- defer; or
- blocked pending decision or access.

Record impact, likelihood, owner, next action, approval requirement, and rollback implication.

### F. Migration and validation plan

- discovery completion criteria;
- remediation sequence;
- data mapping and reconciliation;
- build packets;
- test plan;
- parallel-running requirement;
- cutover steps;
- rollback steps;
- client communication points;
- acceptance criteria; and
- post-cutover monitoring period.

---

## 6. Lifecycle and stage gates

Use the following lifecycle. A client may not skip a gate merely because the environment appears small.

### Stage 0 — Register

Create or identify the client sub-project, controlling issue, owner, status, and known systems.

**Exit:** client is visible in the programme inventory and has one controlling workstream.

### Stage 1 — Discover

Collect the current-state inventory, access map, business-critical workflows, known defects, and unknowns.

**Exit:** the current-state picture is sufficiently complete to assess migration complexity. Unknowns are named rather than concealed.

### Stage 2 — Assess

Classify assets, identify gaps and surgery, estimate effort and risk, and recommend a target state.

**Exit:** Anton can decide whether to proceed, defer, restrict scope, or exit the client.

### Stage 3 — Design and plan

Create the migration sequence, packet boundaries, acceptance criteria, cutover plan, rollback plan, and approval map.

**Exit:** implementation can proceed without inventing architecture or scope during execution.

### Stage 4 — Remediate and build

Repair prerequisites and build the approved target capabilities in bounded packets.

**Exit:** required functionality exists in a testable environment and all packet-level checks pass.

### Stage 5 — Migrate and reconcile

Move approved configuration and data, then reconcile counts, key records, workflows, permissions, and integrations.

**Exit:** migrated state matches the approved mapping and reconciliation thresholds.

### Stage 6 — Validate

Run functional, security, tenant-boundary, data, communication, domain, performance, accessibility, analytics, indexing, and operational checks as applicable. Use `CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md` for the post-build tenant audit, but do not mistake that read-only audit for the entire migration programme.

**Exit:** evidence supports a go, conditional go, or no-go decision.

### Stage 7 — Cut over

Execute the approved cutover, verify production, monitor, and retain rollback readiness for the defined period.

**Exit:** the client-facing service is live-verified and the old path is disabled, retained temporarily, or documented as an approved exception.

### Stage 8 — Stabilize and close

Resolve immediate defects, complete operating documentation, remove unauthorized dependencies, confirm ownership, and record follow-on opportunities separately.

**Exit:** the client is supportable without hidden knowledge or routine dependence on Anton's laptop.

---

## 7. Status model

Use one primary programme status per client:

- `Not registered`
- `Registered`
- `Discovery`
- `Assessment`
- `Planning`
- `Remediation / build`
- `Migration / reconciliation`
- `Validation`
- `Cutover approved`
- `Stabilization`
- `Migrated`
- `Legacy retained`
- `Blocked`
- `Deferred`
- `Exited`

Do not report `Migrated` because code merged or CI passed. Client-facing completion requires deployed-commit evidence, live URL or live workflow verification, and an explicit Delivery Reality verdict.

---

## 8. Approval and stop gates

Stop and obtain Anton's approval before:

- contacting a client or third party;
- authorizing spend or a new paid service;
- creating or rotating real credentials;
- granting production access;
- changing DNS, domains, email authentication, telephony, WhatsApp, payment, or public routing;
- changing production data or importing client records;
- deleting or irreversibly transforming data;
- applying schema migrations;
- enabling outbound communications;
- changing pricing, contractual scope, or service commitments;
- cutting over a client;
- disabling a legacy system; or
- merging scope that materially expands beyond the approved client plan.

Stop and report a blocker when:

- access is missing or unverified;
- source data cannot be reconciled;
- client ownership or consent is unclear;
- security or privacy risk cannot be bounded;
- rollback is not viable;
- a shared-platform change could affect other tenants; or
- the requested task conflicts with repository doctrine.

---

## 9. Scope control and follow-on opportunities

Migration scope covers the minimum approved work required to move the client's current necessary service safely to the target infrastructure.

Do not silently include:

- new marketing campaigns;
- broad website redesigns unrelated to migration safety;
- new product development;
- unapproved CRM expansion;
- new outbound communications;
- speculative automation;
- unrelated data cleanup; or
- commercial upsells.

Where discovery reveals a valuable improvement, record it as one of:

- `Migration prerequisite`
- `Post-migration improvement`
- `Client commercial opportunity`
- `Shared CorpFlowAI capability candidate`

Keep it linked to the client for traceability, but give it separate approval, scope, and ownership.

---

## 10. Programme control rules

- One client, one controlling sub-project.
- One issue or packet, one controlling workstream.
- Avoid simultaneous work on too many clients; apply an explicit WIP limit set by Anton.
- Shared infrastructure work must be separated from client-specific implementation.
- Reusable findings should update canonical programme documentation rather than remain trapped in one client issue.
- Decisions must include date, decision-maker, reason, affected client or capability, and review trigger where relevant.
- Blockers must identify the exact missing decision, access, evidence, or dependency.
- Status updates must distinguish work started, work completed locally, merged work, deployed work, live-verified work, and operationally complete work.
- No false completion language.

---

## 11. Standard first-pass client output

When a client is introduced into this programme, produce:

1. **Client registration summary**
2. **Known facts**
3. **Systems and assets believed to exist**
4. **Verified access currently available**
5. **Unknowns and evidence gaps**
6. **Initial risk and surgery indicators**
7. **Recommended discovery sequence**
8. **Likely migration complexity:** Low / Medium / High / Critical
9. **Immediate Anton decisions required**, limited to genuine protected decisions
10. **Next bounded work packet**

Do not start by asking Anton to manually document everything. First inspect the repository and all connected sources available to the workstream, then ask only for information that cannot be resolved from those sources.

---

## 12. Closure standard

A client migration closes only when:

- target architecture and ownership are documented;
- required data and configuration are reconciled;
- users, permissions, and tenant boundaries are validated;
- production deployment and live behavior are verified;
- domains and communications paths are correct;
- rollback or legacy-retention decisions are recorded;
- monitoring and support ownership are established;
- required client-facing documentation is available;
- hidden laptop or chat-only dependencies are removed or explicitly accepted;
- unresolved items are transferred to named follow-up work; and
- Anton records the final closure decision.

---

## 13. Canonical references

- `AGENTS.md`
- `docs/CORPFLOW_SHARED_TODO.md`
- `docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`
- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`
- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md`
- `docs/operations/TENANT_CLIENT_LOGIN.md`
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md`
- `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md`
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`
- `.cursor/rules/delivery-reality.mdc`
- `.cursor/rules/predeploy-decision-checks.mdc`

Where this charter conflicts with a more restrictive security, environment, data, or production rule, the more restrictive rule governs.
