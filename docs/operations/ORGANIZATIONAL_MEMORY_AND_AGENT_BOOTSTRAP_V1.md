# CorpFlowAI — organisational memory and agent bootstrap v1

**Status:** canonical governance/bootstrap proposal for #1379.  
**Owner:** Anton (operator).  
**Purpose:** prevent CorpFlowAI material state from depending on chat/session memory.

## 1. Core rule

**Chat history is a working/discovery surface, not organisational truth.**

A material fact is not durable merely because ChatGPT, Cursor, Forge, Codex, or an operator discussed it in a prior session.

Material state must be promoted into the appropriate durable system with provenance and supersession where relevant.

## 2. Durable truth classes

| Truth class | Durable home | Examples |
|---|---|---|
| Slow-moving doctrine / architecture / runbooks | Git + repo docs | execution boundaries, source-of-truth rules, routing doctrine, security constraints |
| Transactional organisational memory | existing Postgres Context / Agent Learning fabric | decisions, observations, execution experience, reusable learnings, confidence, status, supersession |
| Work / delivery lineage | GitHub | issues, PRs, commits, checks, evidence packets, blockers, acceptance |
| Commercial / financial truth | ERPNext | external-party interaction history, CRM activities, quotations, invoices, payments, accounting records, supplier/client transactions |

Do not create a second memory database.

External evidence such as Gmail, meeting notes, vendor documents, runtime logs, screenshots, or archived chats is evidence. It becomes organisational truth only when captured in one of the durable homes above with sufficient provenance.

## 3. Transactional learning model

The shared learning substrate is #1370 and reuses the context/provenance primitives from #1365 / merged PR #1371.

Dynamic facts and experiences should be represented as events/records, not silently overwritten prose.

Minimum semantics:
- source/provenance;
- scope;
- current status;
- confidence/verification state;
- created/observed time;
- supersedes/superseded-by relationship where applicable;
- reviewer/authority where required.

Learning states should remain explicit. Candidate observations are not trusted organisational truth until the governing promotion rule accepts them.

## 4. Forge — current LOW-tier worker identity

**Forge** is the durable worker identity for bounded LOW-tier work. Forge is not the name of one permanently fixed model.

Current verified runtime from #1367:
- host: `corpflow-exec-01-u69678`;
- runtime: Ollama 0.34.4 in container `corpflow-local-llm`;
- current selected model: `qwen2.5-coder:7b-instruct-q2_K`;
- memory cap: 4 GiB;
- CPU cap: 3 cores;
- private endpoint only;
- persistent model volume;
- deterministic task contract + verifier;
- fail closed and escalate rather than roam/retry indefinitely.

Approved routing:
`deterministic automation -> Forge -> Cursor -> higher-cost path only when justified`

Forge may not merge, deploy, mutate production DB/schema/data, change env/secrets/access, initiate payment, or perform external sends/publishing.

## 5. Fresh-session bootstrap contract

A fresh authorised ChatGPT, Cursor, Forge, Codex, or future agent must be able to reconstruct material current state without old chat history.

### A. Read slow-moving doctrine
At minimum:
1. `AGENTS.md`
2. `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md`
3. this document
4. `agent-context/README.md`
5. topic-specific canonical docs for the task

### B. Retrieve relevant transactional memory
Where available, query the existing Context / Agent Learning service for:
- current learnings;
- relevant experience;
- golden examples;
- known failure modes;
- routing implications;
- provenance.

### C. Refresh work lineage
Check current GitHub issue / PR / commit / CI state before giving progress, dispatch, blocker, executor, or completion advice.

### D. Use chat only for discovery
Archived or current chat may identify a candidate fact, decision, or missing state. It must then be reconciled against durable evidence and promoted if still material.

## 6. Promotion rule — chat to organisation

Before a workstream is knowledge-complete, any material state-changing item discovered in chat must leave chat if it remains relevant.

Examples:
- installation / activation / retirement of a runtime or executor;
- architecture or routing decision;
- client fact or commitment;
- restriction / approval / protected gate;
- successful or failed execution pattern;
- workaround;
- research conclusion;
- material unknown;
- source-of-truth or authority change;
- reusable product/IP decision.

Promotion destination:
- slow rule/doctrine -> Git;
- dynamic internal fact/decision/experience -> Postgres Context / Agent Learning;
- implementation/evidence -> GitHub;
- external-party business interaction or financial/commercial transaction -> ERPNext.

**ERPNext interaction completeness rule:** cold prospect research/enrichment and unanswered one-way outreach remain outside ERPNext. After the defined commercial-engagement gate, business-relevant interactions with prospects, clients, suppliers, partners and other external parties must be captured in ERPNext against the appropriate CRM/Selling/Buying/Project/Support record, including material contacts, decisions, commitments, follow-ups and status changes. See `docs/governance/erpnext/PROSPECT_TO_COMMERCIAL_RECORD_BOUNDARY_V1.md`. Source channels such as email, WhatsApp, meetings or documents may be linked or summarized with provenance; they are evidence, not the durable commercial ledger. Avoid copying unnecessary sensitive personal detail. If the write path is unavailable, closeout must state the persistence gap and next owner.

## 7. Runtime / executor documentation completion gate

An approved installation, activation, removal, or material reconfiguration of an AI executor, model runtime, dispatcher, or server service is not documentation-complete until the same work packet or a linked follow-up reconciles:

1. canonical executor inventory;
2. canonical server/runtime inventory;
3. routing hierarchy;
4. AGENTS/bootstrap instructions;
5. contradictory active docs;
6. GitHub source/evidence links;
7. a transactional experience/learning record where appropriate.

#1367 is the reference failure: the runtime was correctly implemented and evidenced in GitHub but not promoted into top-level operating docs, allowing a fresh session to conclude incorrectly that no local AI existed.

## 8. End-of-workstream closeout

Closeout should capture:
- what changed;
- what was verified;
- what failed or was corrected;
- unresolved items;
- ownership / next action;
- reusable learning or explicit `NO_MATERIAL_LEARNING`;
- durable source updated;
- what is superseded;
- evidence links.

## 9. Reading precedence when sources disagree

Use this order unless a narrower authoritative contract explicitly overrides it:

1. live/runtime evidence for current runtime state;
2. current GitHub work/evidence lineage;
3. current Postgres Context / Agent Learning records with provenance;
4. canonical repo doctrine/runbooks;
5. archived source evidence;
6. model/chat recollection.

A disagreement is not silently blended. Record it as contradiction/staleness and reconcile the stale durable source.

## 10. Acceptance question

Before calling a workstream knowledge-complete, ask:

> Could a fresh authorised agent, with no chat history, reconstruct the material current state, explain why it is true, identify what is superseded, and state what remains unknown?

If not, the workstream is not knowledge-complete.
