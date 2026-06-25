# Operator Dispatch Router — lightweight dispatch layer around #249

**Status:** Proposal / architecture documentation only. **No implementation authorised.** No n8n workflow built, no credentials issued, no automation live.
**Owner:** Anton (operator).
**Drafted:** 2026-06-25.
**Source decision:** GitHub issue [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) comment *"Operator / ChatGPT decision — Dispatch layer for Cursor, Codex, NotebookLM, and Workspace tools"*.
**Anchor sentinel:** `<!-- OPERATOR_DISPATCH_ROUTER_ANCHOR -->`

<!-- OPERATOR_DISPATCH_ROUTER_ANCHOR -->

## 1. Purpose

Anton currently copies instructions by hand between ChatGPT, Cursor, Codex, NotebookLM, Workspace tools, and GitHub. That friction causes approved packets to stall **even after they are posted to #249**.

This document specifies a **lightweight dispatch mechanism**, not a new platform:

- **#249 stays the command ledger** (single source of truth for operator decisions and executor packets).
- A thin **notification/dispatch layer** (n8n) watches #249, detects structured dispatch blocks, and routes a notification/task to the correct owner.
- The dispatch layer **never executes code, never merges PRs, never sends outreach.** It only notices and routes.

The goal is one-click handoffs, not an autonomous AI-to-AI loop.

This doc supplements and does **not** replace the canonical execution rules. If any conflict arises, **those rules win**:

- `.cursor/rules/delivery-reality.mdc`
- `.cursor/rules/predeploy-decision-checks.mdc`
- `.cursor/rules/commit-push-doc-constraints.mdc`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md`
- `docs/execution/DELIVERY_ACCELERATION_V1.md`

This is the dispatch counterpart to **`docs/operations/OPERATOR_BRIDGE_V1.md`**: the Operator Bridge defines *how status and decisions are recorded* on #249; this router defines *how a posted decision gets noticed and routed to the right worker*.

## 2. Command ledger rule (non-negotiable)

**GitHub issue #249 remains the canonical command ledger.**

- Operator decisions, executor packets, and dispatch blocks are authored as **comments on #249**.
- The dispatch layer is downstream of #249; it **reads** #249 and **notifies**. It is never the source of truth.
- `main` (the repo) remains the durable source of truth for architecture and closure records. Issue comments are coordination chatter.
- A dispatch block being routed is **not** authorization to act beyond what the packet and the canonical rules already allow.

## 3. Recommended architecture

1. **#249** — canonical command ledger for operator decisions and executor-facing packets.
2. **n8n** — the dispatch layer. It watches #249 comments, detects structured dispatch markers, notifies the correct human/operator channel, optionally creates a Workspace task, and **never** executes code or merges PRs.
3. **Cursor** — repo/docs/code executor and PR owner.
4. **Codex** — research/data/script worker only; **no PR ownership**.
5. **NotebookLM** — reading/briefing/summarization layer over canonical docs and client-safe collateral only; **not an execution layer**.
6. **Workspace Studio** — may be piloted for Workspace-native flow prototypes as a Workspace-side candidate, but **n8n remains the governed workflow spine** unless a later architecture decision changes that.

```text
#249 comment (operator/ChatGPT)
   │  contains DISPATCH_TO_<OWNER> block
   ▼
n8n Operator Dispatch Router  ── notify only, no execution ──▶ correct owner channel
   │
   └─ log dispatch status: Posted → Routed → Acknowledged → Completed
```

## 4. Dispatch marker syntax

Dispatch blocks are **machine-readable fenced blocks** inside #249 comments. The router keys off the literal prefix `DISPATCH_TO_` and the `END_DISPATCH` terminator.

### 4.1 Cursor

```text
DISPATCH_TO_CURSOR
Owner: Cursor
Priority: P1
Action: Read latest #249 operator decision and execute docs-only <packet> work.
Repo: antonvdberg-bit/corpflow-ai-command-center
Hard limits: no runtime code, no DB, no env vars, no secrets, no deployment, no automated outreach.
END_DISPATCH
```

### 4.2 Codex

```text
DISPATCH_TO_CODEX
Owner: Codex
Priority: P1
Action: Produce research/data/script artifact only. Do not open PRs.
Output: paste artifact or provide branch/full SHA for Cursor import.
END_DISPATCH
```

### 4.3 NotebookLM

```text
DISPATCH_TO_NOTEBOOKLM
Owner: Anton / Workspace operator
Priority: P2
Action: Create a NotebookLM source set from canonical repo docs for briefing/summarization only.
Data rule: no secrets, credentials, sensitive client data, medical records, bank data, or private client documents.
END_DISPATCH
```

### 4.4 Field conventions

| Field | Meaning |
|---|---|
| `Owner` | One of `Cursor`, `Codex`, `NotebookLM`, `Workspace`, `Anton`. Drives routing. |
| `Priority` | `P0`–`P2`. Advisory; does not change safety limits. |
| `Action` | Human-readable instruction for the owner. |
| `Repo` / `Output` / `Data rule` / `Hard limits` | Owner-specific context and constraints. |

## 5. n8n workflow shape — Operator Dispatch Router

**Definition of done (for a future, separately authorised build):** n8n can watch #249 for new dispatch blocks, route a notification/task to the right owner, and record that the dispatch was noticed. It must **not** execute repo changes or send cold outreach.

1. **Trigger** — GitHub issue comment created on #249.
2. **Filter** — comment body contains `DISPATCH_TO_`.
3. **Parse owner** — `Cursor`, `Codex`, `NotebookLM`, `Workspace`, `Anton`.
4. **Route** (see §6).
5. **Log** — append dispatch to a Google Sheet or internal ops note with status: `Posted` / `Routed` / `Acknowledged` / `Completed`.
6. **Stop** — no automatic PRs, no merges, no app changes, no outreach.

This describes the **shape only**. No workflow JSON, credentials, webhook secrets, or env vars are defined or authorised here.

## 6. Owner routing table

| Owner | Route (notification target) | What is sent | Never |
|---|---|---|---|
| **Cursor** | Anton / Cursor execution channel | Full packet + #249 link | Auto-execute, auto-merge |
| **Codex** | Anton | Copy-ready Codex prompt | Open PRs, own delivery |
| **NotebookLM** | Anton / Workspace operator | Source list + data-safety rules | Ingest sensitive/private data |
| **Workspace / Drive** | Anton (only if manual browser access required) | Manual action note | Replace n8n as the governed spine |
| **Anton** | Anton | Decision/acknowledgement reminder | — |

## 7. Executor boundaries

### 7.1 Codex boundary

- **Scope:** research, data gathering, and script artifacts only.
- **No PR ownership.** Output is pasted into #249, or delivered as a branch / full Git SHA for **Cursor** to import and own.
- Codex does not merge, deploy, touch secrets/env, or send outreach. (See `docs/execution/DELIVERY_ACCELERATION_V1.md` for executor latitude.)

### 7.2 NotebookLM boundary

- **Scope:** reading/briefing/summarization over **canonical repo docs and client-safe collateral only**.
- **Not an execution layer** — it produces briefings, never code, PRs, or deployments.
- **Data rule:** never ingest secrets, credentials, sensitive client data, medical records, bank data, or private client documents. When in doubt, do not load it.

### 7.3 Workspace Studio boundary

- **Status:** Workspace-side **candidate**, pilot-only for Workspace-native flow prototypes.
- **n8n remains the governed workflow spine.** Workspace Studio does not become the production workflow engine without a separate architecture decision recorded in `docs/decisions/`.
- Treated as reference/experimental until such a decision exists.

## 8. Hard safety limits

The dispatch layer and this proposal are bound by the following. These are non-negotiable absent a separate, explicit operator decision:

- **Docs-only** for this proposal. No app/runtime code, no DB/schema changes, no migrations.
- **No workflow credentials**, no webhook secrets, no API keys.
- **No env vars** added or referenced as configuration.
- **No production deployment.**
- **No automated outreach** of any kind (no cold email, no bulk send, no client-facing automated messages).
- The router **notifies and logs only** — it never executes repo changes, never merges PRs, never deploys, never touches client data.
- Routing a dispatch block does **not** widen any executor's authority beyond the canonical rules in §1.

## 9. Manual actions required from Anton

This document does **not** trigger any of these. They are listed so the operator owns the sequence if/when a build is later authorised:

1. **Authorise the build** — decide whether to implement the n8n Operator Dispatch Router (separate packet; not authorised by this doc).
2. **n8n GitHub access** — provide n8n with read access to #249 (operator-owned credential placement; out of scope here).
3. **Notification channel** — choose the target channel (e.g. Telegram, Gmail, Google Chat) and own its credentials.
4. **Dispatch log** — create the Google Sheet / ops note used for `Posted → Routed → Acknowledged → Completed` tracking.
5. **Merge** — review and merge this docs PR. **Do not auto-merge.**

## 10. Future path (if a real worker API becomes available)

Today the loop is **notify Anton → Anton clicks**. If governed, authenticated worker APIs become available later (e.g. a Cursor/Codex programmatic execution endpoint under operator control), the router could evolve from *notify-only* to *queue-a-task-for-a-supervised-worker* — **only** behind:

- a separate architecture decision in `docs/decisions/`,
- preserved operator-owned merges and the delivery-reality discipline,
- explicit scope limits per executor (still no auto-merge, no auto-deploy, no outreach),
- the same hard safety limits in §8 unless a decision explicitly relaxes a named one.

Until then, the router stays a **lightweight notification/dispatch layer** around #249.

## 11. Status block

- **Delivery state:** Local only (this doc) → intended **Merged** after operator review. **Not deployed, not live** (nothing to deploy; docs-only).
- **Implementation:** none. No n8n workflow, no credentials, no env, no app code, no DB, no deployment.
- **Verdict:** PARTIAL by design — proposal documented; build deliberately unauthorised and deferred to a future packet.
