# Client Delivery Operating Kit v1

**Status:** Proposed canonical reusable delivery kit  
**Controllers:** #1350 and #1351  
**Architecture controller:** #772  
**Purpose:** convert discovery into a coherent application journey, reviewable evidence, approval, cutover and validated handover without creating client-specific mini-products.

## 1. Governing product rule

Every client delivery starts from the assumption that CorpFlowAI is **one application** with:
- one production Postgres;
- one authentication model;
- CorpFlowAI Operating Workspace;
- Tenant Workspace;
- ERPNext as authoritative commercial system where applicable;
- GitHub as durable delivery/decision record.

Client-specific routes are allowed only as bounded tenant/workspace views inside the consolidated application. Do not create a standalone app, second CRM, second database, second control plane or chain of dependent pages merely because a client has unique needs.

When reviewing an existing route, classify it:
- **CANONICAL** — belongs in the target application;
- **REUSE** — component/data/action contract should be reused;
- **MIGRATE** — capability belongs in a canonical workspace route;
- **TEMPORARY** — retain during transition with a stated reason;
- **RETIRE** — duplicate/prototype/obsolete after replacement is live verified.

## 2. Delivery lifecycle

Use:
`discover -> verify -> classify -> scope -> map application journey -> quote -> preview -> verify -> approve -> cutover -> reconcile -> validate -> handover`

Production delivery still follows:
`build -> preview -> verify -> callback -> approve -> deploy -> validate`

## 3. Client Delivery Pack

Maintain one pack per client/sub-project.

### A. Client identity and business outcome

Capture:
- client/trading name;
- tenant ID if applicable;
- decision-maker(s);
- operator owner;
- desired business outcome;
- measurable acceptance criteria;
- commercial status;
- target date/decision point.

Do not begin with technology. State the business result first.

### B. Source-system inventory

For each relevant system capture:
- system/platform;
- business purpose;
- owner/operator;
- authoritative data held;
- access available now? YES/NO/PARTIAL;
- integration/export options;
- business criticality;
- retention/migration decision.

Never record passwords, MFA codes, tokens, API keys, bank/payment data or sensitive client/private data in the pack.

### C. Discovery evidence method

Ask only what is easy to access.
- Prefer screenshots over lengthy explanations.
- If an answer takes more than a few minutes, mark **Unknown / No access** and continue.
- Route inaccessible questions to the system owner.
- Where discovery already supplied an answer, the live session verifies rather than asks again.

### D. Gap classification

Classify every material requirement:
- **Native** — existing platform/application capability meets it;
- **Configure** — existing capability needs settings/workflow changes;
- **Extension** — existing extension/app/plugin solves it;
- **Partner** — external specialist/product is preferable;
- **Custom** — genuine custom implementation is justified;
- **Unknown** — evidence insufficient.

Custom is last, not first.

Also classify existing client surfaces against #772:
CANONICAL / REUSE / MIGRATE / TEMPORARY / RETIRE.

### E. Application journey map

Describe the target as an end-to-end user journey, not a page inventory.

For each step capture:
`Actor -> intent -> workspace/system -> action -> authoritative record -> human decision -> next step`

Required questions:
- Does this step belong in Operating Workspace, Tenant Workspace or an external/native system?
- Which source of truth owns the record?
- Can an existing application capability be reused?
- Does this reduce fragmentation?
- Is a client-specific view genuinely necessary?

### F. Scope and quotation handoff

For each scoped item:
`Requirement -> evidence -> classification -> included/excluded -> implementation method -> acceptance criterion -> dependency -> price basis`

Quotation readiness requires:
- verified current-state evidence;
- named unknowns;
- explicit assumptions/exclusions;
- scope boundary;
- acceptance criteria;
- client responsibilities;
- protected actions identified;
- commercial system handoff to ERPNext where formal quote/invoice handling is required.

### G. Preview approval packet

Before review:
- preview URL;
- exact SHA/deployment;
- Browser Verification Harness result;
- screenshots/evidence;
- expected journey;
- known exceptions;
- what is fictional/test data;
- what is not yet connected;
- explicit client/operator questions.

Technical PASS does not equal commercial or visual approval.

### H. Cutover packet

Cutover checklist must state:
- source system/function;
- replacement/retained destination;
- data to migrate/reconcile;
- freeze window if any;
- access/ownership;
- DNS/domain impact;
- messaging/payment impact;
- rollback path;
- approval owner;
- post-cutover evidence.

No protected action occurs merely because the checklist exists.

### I. Validation and handover

Validate:
- intended user journey works;
- authoritative records are reconciled;
- old path is intentionally retained/retired;
- tenant/auth boundaries are correct;
- browser evidence is PASS or accepted WARN;
- operator/client knows where to work;
- support/escalation path is documented;
- no hidden laptop/chat-only dependency remains.

## 4. Platform-agnostic migration/cutover template

Use this table for GHL, Zoho, legacy websites, spreadsheets, CRM/ERP, portals and other platforms.

| Function / data | Source | Current use | Business critical? | Target owner/system | Gap class | Migration method | Reconcile how? | Cutover requirement | Rollback | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|

Stages:
1. inventory;
2. map;
3. classify;
4. prove target path;
5. prepare migration packet;
6. approve;
7. controlled migration;
8. reconcile;
9. browser/runtime verification;
10. cutover approval;
11. post-migration validation.

Do not replace a platform wholesale when only a subset of functions actually needs replacement.

## 5. Lightweight regression set

Default core regression set is 24 checks. Use only applicable cases, but do not silently omit critical boundaries.

### Application shell and context
1. canonical public/home route loads;
2. Operating Workspace entry loads for authorised context;
3. Tenant Workspace entry loads for intended context;
4. workspace identity is visibly clear;
5. tenant/business identity is visibly clear;
6. navigation does not leak internal-only surfaces to tenant context.

### Authentication and boundaries
7. login route behaves as expected;
8. reset-password route/link is available where tenant access is requested;
9. anonymous protected action is rejected;
10. wrong-tenant access is rejected or isolated;
11. role-restricted route is unavailable to inappropriate role.

### Core journey
12. primary user journey starts successfully;
13. required record/detail view loads;
14. expected action affordance is visible;
15. validation/error state is understandable;
16. successful read/review path reaches intended outcome.

### Data/source of truth
17. displayed key identity/business data matches authoritative source;
18. no local-only duplicate is presented as canonical;
19. ERPNext/commercial link or reference is correct where applicable;
20. migration/reconciliation evidence identifies source and target.

### Runtime/quality
21. desktop Browser Verification Harness check passes;
22. mobile Browser Verification Harness check passes;
23. no material console/network failures;
24. no broken critical navigation/static asset.

Add client-specific cases only where they prove a material requirement.

Each regression case records:
`ID | target | precondition | action/read | expected | actual | evidence | verdict | owner`

Verdict: PASS / WARN / FAIL.

## 6. Client-facing evidence pack template

Client-facing evidence should be understandable without internal implementation history.

### Cover
- client;
- delivery outcome;
- review date;
- environment reviewed;
- status: Ready for review / Approved / Live validated.

### What was delivered
Describe business capabilities and user journey in plain language.

### What was verified
Include:
- preview/live URL(s);
- desktop/mobile evidence;
- key journey checks;
- known exceptions;
- what remains intentionally manual/external.

### Decisions needed
List only concrete client/operator decisions.

### Cutover/next step
State:
- what changes;
- what stays;
- when;
- who approves;
- rollback/recovery posture.

### Final validation
Record:
- live URL;
- validation date;
- acceptance result;
- follow-up owner/action.

Do not expose internal secrets, private logs, client-private data, architecture noise or unrelated issue history.

## 7. Reusable discovery questionnaire

Use this as the default OrixHealth-derived questionnaire. It is intentionally easy to answer.

### Environment and access
1. Which business systems are actively used today?
2. Which subscription/plan is used for each?
3. Who can open the admin/configuration screens during a review session?
4. Which areas are managed by another person/provider?

### Business master data
5. Where are customers, suppliers, products/services and price information maintained?
6. Which system is considered authoritative?
7. Are duplicate/manual copies maintained elsewhere?

### Operational workflow
8. What are the 3–5 recurring workflows that consume the most staff time?
9. Which steps are manual?
10. Where do delays/errors most often occur?
11. Which steps must remain human-reviewed?

### Sales/customer
12. Where do enquiries/orders arrive?
13. How are follow-ups/status tracked?
14. What customer history is useful but difficult to see today?
15. Which customer groups or dormant/reorder opportunities matter?

### Finance/admin
16. Which bank/accounting processes are still manual?
17. What reconciliations or exception checks consume time?
18. Which commercial documents are generated and from what system?

### Inventory/operations where relevant
19. Is stock tracked by location?
20. Are batch/lot/serial/expiry controls required?
21. How are receipts, landed costs, adjustments and reorder decisions handled?

### Reporting
22. Which reports are needed weekly/monthly?
23. What is difficult to answer today?
24. Which management/investor measures matter most?

### Growth/marketing
25. Which channels are actively used?
26. How are campaigns/segments managed?
27. What follow-up or attribution is missing?
28. What would constitute a commercially useful early growth result?

### Integration
29. Which systems must exchange information?
30. What should remain native/external rather than be rebuilt?

Rule: if the client cannot answer easily, capture screenshot / Unknown / owner to verify. Do not turn the questionnaire into homework.

## 8. First 10 Clients operating kit

The first 10 client method is deliberately simple.

For each client maintain one row:
`Client | outcome | controlling issue | stage | next visible deliverable | decision owner | commercial value | blocker | target review date`

Stages:
- Lead / Qualified
- Discovery
- Scope/Quote
- Preview
- Client Review
- Approved
- Cutover
- Live Validation
- Operating
- Paused/Exited

WIP rule:
- keep active implementation small enough that every active client has a visible next outcome;
- do not open new custom build streams while higher-value client review/cutover work is waiting;
- a client may remain Waiting without consuming active build WIP.

Minimum client record:
- business outcome;
- one controlling issue;
- one application journey;
- one evidence pack;
- one commercial record path;
- one blocker/owner;
- one next decision.

## 9. Commercial readiness labels

Use operational classifications, not subjective scoring:
- **SELLABLE / DELIVERY READY** — offer and delivery path are usable; no material delivery blocker.
- **CLIENT REVIEW READY** — preview/evidence exists; client decision is next.
- **NEEDS BOUNDED POLISH** — specific non-architectural work remains.
- **WAITING** — external/client/provider dependency.
- **PARK** — not commercially justified now.
- **PROTECTED GATE** — next action requires explicit protected approval.

Do not use this classification to rank political or unrelated choices; it is an internal delivery-state vocabulary.

## 10. Definition of done

A client-delivery packet is done only when the business outcome is either:
- live validated and handed over;
- waiting on a named external/client decision with no hidden internal work;
- parked with a reason;
- or explicitly closed/retained on legacy arrangements.

Documentation alone is not completion.
