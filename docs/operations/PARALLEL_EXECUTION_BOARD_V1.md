# Parallel Execution Board v1 — concurrent lane dispatch

**Status:** Docs/process only. Authorizes no runtime change, no deploy, no secret, no DB change by itself.
**Owner:** Anton (operator).
**Executor (this doc):** Cursor.
**Created:** 2026-06-29.
**Implements:** GitHub issue [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) — *Action Plan: Parallel execution board + agent throughput cadence*.
**Anchor sentinel:** `<!-- PARALLEL_EXECUTION_BOARD_V1 -->`

<!-- PARALLEL_EXECUTION_BOARD_V1 -->

## 1. Purpose

Anton has approved the throughput model and wants **visible movement**, not more
strategy. CorpFlowAI already has a priority board (`CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md`),
a command ledger (#249), and a packet queue (`WEEKEND_EXECUTION_QUEUE.md`). What was
missing is a **concurrency layer**: a way to run several workstreams *at the same time*
without duplicated effort, contradictory decisions, or unsafe execution.

This board is that concurrency layer. It:

- names the **active lanes** that may run in parallel,
- assigns one **owner** and one **next action** per lane,
- states each lane's **blocker** and whether **Anton is needed**,
- enforces **WIP limits** so no executor over-commits,
- enforces **anti-conflict rules** so two lanes never fight over the same files,
- separates **pre-approved work** (proceed now) from **hard-gated work** (stop and ask),
- routes Codex via the **Codex Task Register** and Cursor via the **Dispatcher Checklist**,
- is reported on a **2–3×/day digest cadence** (Telegram-ready).

This is a **thin coordination surface**, not a new platform, not a second backlog,
and not an authorization mechanism. A lane row is a *pointer*; the authorization for
any runtime/secret/DB/DNS/billing action still comes from Anton through #249 under the
existing gates.

## 2. Where this board sits (source-of-truth order)

```
.cursor/rules/* and AGENTS.md doctrine     ← always wins
  > #249 operator decisions (command ledger)
    > CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md (priority + workstreams)
      > PARALLEL_EXECUTION_BOARD_V1.md (this doc — concurrency/lanes)
        > WEEKEND_EXECUTION_QUEUE.md (packet-level Definition of Done + evidence)
```

If this board disagrees with a canonical doc or a safety gate, **the canonical doc /
gate wins**. Update the canonical doc first, then this board.

This doc supplements and does **not** replace:

- `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`,
  `.cursor/rules/commit-push-doc-constraints.mdc`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` (what may run without approval vs Anton-only gates)
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md` and `docs/runbooks/OPERATOR_BRIDGE.md`
- `docs/operations/OPERATOR_DISPATCH_ROUTER.md`, `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md`
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md`

## 3. Lane model

A **lane** is a long-running theme of work that can progress independently of the
other lanes. Each lane has exactly one **owner-executor** at a time and a single
**next action**. Lanes are stable; the packets inside them rotate.

**Owner vocabulary** (from the dispatch router / control board):

- **Anton** — operator-only physical/secret/DNS/billing/merge/approval actions.
- **Cursor** — repo/docs/code PR execution. Never self-merges.
- **Codex** — research/data/script worker only. **Never owns PRs**; output is imported
  by Cursor per `CODEX_INTEGRATION_CONTRACT_V1.md`.

**Lane state vocabulary:** `Active`, `Active but gated`, `Candidate`, `Blocked`,
`Waiting for capacity`, `Deferred`.

### 3.1 Active lane table

| Lane | Theme | Priority | Owner (executor) | State | Next action | Blocked? | Anton needed? | Issues |
|---|---|---|---|---|---|---|---|---|
| **A** | Revenue / Product A / pilot delivery | **P0** | Cursor (docs/QA) + Anton (QA/decisions) | **Active** | Confirm the current Product-A market-readiness packet's Definition of Done + live-verification checklist against `delivery-reality.mdc`; draft the next buyer-facing surface PR under the brand/conversion doctrine. | No | Only at merge + live-verify | #249 ledger; control board stream 2 |
| **B** | Medspa revenue machine / Codex research packets | **P0** | Cursor (docs) + Codex (research input only) | **Active** | Issue the next Codex research packet via the **Codex Task Register** (audit-queue CSV per `CODEX_INTEGRATION_CONTRACT_V1.md` §4); Cursor imports as bounded research. **No outreach.** | No | At outreach approval only | [#467](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/467); control board stream 3 |
| **C** | Server safety / backups / monitoring / Chatwoot gate | **P1** | Cursor (docs/spec) + Anton (server/secret actions) | **Active but gated** | Draft the server-safety baseline checklist + Chatwoot decision/pilot-gate doc (decision-only). Do **not** install Chatwoot; do **not** back up the production DB; do **not** touch `POSTGRES_URL`. | No (docs); Yes for any install | Yes — any new self-hosted tool / backup target | [#487](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/487) |
| **D** | Cloud-first agent operations / laptop dependency removal | **P1** | Cursor (docs/spec) + Anton (infra/secret actions) | **Active but gated** | Extend the off-laptop migration audit: name each recurring laptop-bound job, its target host, and its migration packet. Plan-only; no execution on `corpflow-exec-01` without a named packet. | No (docs) | Yes — any L3 box action / secret placement | [#485](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/485) |
| **E** | Communications automation / email + WhatsApp planning | **P1** | Cursor (docs/design) + Anton (provider/secret/send approval) | **Active but gated** | Continue email + WhatsApp **design** docs (inbound/outbound flow, human approval gates). **No send runtime, no provider keys, no WhatsApp/SMS runtime.** | No (design) | Yes — any provider setup / first send | [#486](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/486), [#492](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/492) |
| **F** | Living Word controlled tenant work | **P2** | Cursor (docs/code, tenant-scoped) + Anton (tenant/DNS/approval) | **Active but gated** | Capture the controlled scope for Living Word tenant work (surfaces in play, what is read-only, what needs tenant data). Tenant-scoped PRs only; no cross-tenant change; no real customer-data write without approval. | No (scoping) | Yes — anything touching real tenant data / DNS | tenant-scoped; ledger #249 |

This table is a **snapshot**. The authoritative status for any packet lives in
`WEEKEND_EXECUTION_QUEUE.md`; the authoritative decision lives on #249.

### 3.2 Reading a lane row

- **Owner (executor)** — who is allowed to move the lane *right now*. If the lane row
  says Cursor, Codex must not open work in it; if it says Codex (research), Cursor only
  imports the output.
- **Next action** — the single smallest next step. One lane, one next action.
- **Blocked?** — `Yes` means an external/manual dependency is named and the lane is
  parked until it clears.
- **Anton needed?** — whether the *next* movement requires an operator-only action. A
  lane can be `Active` (Cursor can draft) and still be `Anton needed: at merge`.

## 4. WIP limits (work-in-progress)

WIP limits keep throughput honest: more open work is not more delivery.

| Scope | WIP limit | Rule |
|---|---|---|
| **Open PRs per executor** | **2** | Cursor may have at most 2 open PRs awaiting merge at once. A 3rd waits until one merges or is closed. |
| **In-progress packets per lane** | **1** | Each lane has at most one packet in `IN_PROGRESS`. A lane's next packet does not start until the current one is `READY_TO_MERGE` or parked. |
| **Codex research packets in flight** | **2** | At most 2 outstanding Codex research requests at a time (avoids unreviewable import backlog). |
| **Lanes simultaneously `Active`/`Active but gated`** | **6** (all) | All six lanes may be active, but only within the per-executor PR cap above — concurrency of *themes*, not unbounded concurrency of *open diffs*. |
| **Anton approval queue depth** | **soft 5** | If more than 5 items are waiting on Anton, the dispatcher digest must lead with the approval queue and stop opening new gated work until the queue drains. |

If a limit would be exceeded, the executor **HOLDS** and reports it in the next digest
rather than opening more work.

## 5. Anti-conflict rules

To run lanes in parallel without collisions:

1. **One owner per file area per lane.** A lane "owns" its doc/code paths while a packet
   is in progress. Two lanes must not edit the same file in overlapping PRs. If two lanes
   need the same file, sequence them (one merges first) — do not branch both off the same
   file concurrently.
2. **Branch namespace by executor.** Cursor: `docs/*`, `chore/*`, `feat/*`, `fix/*`,
   `refactor/*`. Codex never owns a branch (research-only; output imported by Cursor).
   See `docs/runbooks/OPERATOR_BRIDGE.md` §5.
3. **One packet → one branch → one PR.** No omnibus branches mixing lanes. A PR's title
   names its lane (e.g. `docs(ops): [Lane C] server safety baseline`).
4. **Rebase before merge, never force-push shared history.** If `main` moved, update the
   branch; resolve conflicts in the lane that opened last.
5. **Governance/doctrine files are serialized.** `.cursor/rules/*`, `AGENTS.md`, AAP,
   packet standard, this board, the control board — only one open PR may touch any of
   these at a time, and only with explicit Anton approval naming the file.
6. **Shared coordination files append-only.** `artifacts/chat_history.md`,
   `docs/decisions/JOURNAL.md` are append-only newest-first; never rewrite another
   lane's entry.
7. **No lane crosses its hard boundary** (see §7) to "help" another lane. Cross-lane
   needs are raised on #249, not solved by widening scope.

## 6. Pre-approved work — proceeds without Anton

Per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2, the following may proceed
in **any** lane without a fresh Anton approval, as long as it stays inside the lane's
file area and the §7 boundaries:

- Read-only inspection of repo, issues, PRs, public production URLs.
- Drafting/updating **docs** on an approved branch.
- Creating branches; opening **draft or ready PRs** against `main` (Anton still merges).
- Running `npm test`, `npm run build`, `npm audit`, linters — non-production.
- Preview deploys (Vercel preview) and evidence capture.
- Codex **research/data/script** output that is draft-only and transfer-safe
  (`CODEX_INTEGRATION_CONTRACT_V1.md`), imported by Cursor as bounded research.
- Posting STATUS / digest comments on #249 / #493.

**Default posture:** if it is docs-only or read-only and inside the lane, **proceed and
report**; do not wait for a click.

## 7. Hard-gated work — requires Anton

Per AAP §3 and the bridge HOLD rules, the following **stop and ask** every time,
regardless of lane or priority:

- Merging any PR (Anton owns every merge).
- Any **production deploy / promote / rollback**.
- Any **secret / env var** change (Vercel, GitHub, Neon, n8n, Telegram, providers).
- Any **`POSTGRES_URL`** change, DB schema change, or destructive DB action.
- **DNS / domain** changes.
- **Billing / payment** work.
- **Email send runtime**, **WhatsApp/SMS runtime**, or any first real send (Lane E).
- Installing any **new self-hosted tool / new vendor dependency / new container**
  (Lane C Chatwoot, any backup target, any monitoring tool beyond the authorized
  Uptime Kuma carve-out).
- Any **L3 box action** on `corpflow-exec-01` not covered by a named, approved packet (Lane D).
- Any write to **real tenant/customer data** (Lane F).
- **External outreach** of any kind (Lane B outreach stays human-approved).
- Editing **governance/doctrine** files (§5 rule 5).
- Standing holds that stay parked: **forward-secret rotation** (do not reopen),
  **second app / second database** (never), package installs, new vendor deps.

When any of these is the next step, the lane goes `AWAITING_OPERATOR`, posts the
human-readable `ANTON TO-DO` block, and waits.

## 8. Throughput / utilisation metrics (lightweight)

Reported in each digest (definitions live in `OPERATOR_PROGRESS_DIGEST_V1.md` §5):

| Metric | Definition | Healthy signal |
|---|---|---|
| **Lanes moved today** | Count of lanes with a recorded movement since the last digest. | ≥ 3 of 6 on an active day. |
| **PRs opened / merged today** | Opened by Cursor / merged by Anton. | Merged keeps pace with opened (WIP not ballooning). |
| **Open-PR age (oldest)** | Hours the oldest open PR has waited. | < 24h for docs-only. |
| **Anton approval queue depth** | Items waiting on an operator-only action. | ≤ 5 (soft cap, §4). |
| **Codex packets: issued vs imported** | Research requests out vs imported by Cursor. | Imported keeps pace; ≤ 2 in flight. |
| **Blocked lanes** | Lanes in `Blocked` with a named dependency. | Each has an owner + unblock action. |

These are **operator-glance** metrics, not analytics. No tracking code, no DB, no
external service — they are counted by reading GitHub state at digest time.

## 9. How the board runs (daily loop)

1. **Dispatch.** Cursor reads this board + #249, picks the highest-priority non-blocked
   lane whose owner is free and is under WIP limits, and runs the **Dispatcher Checklist**
   (`CURSOR_DISPATCHER_CHECKLIST_V1.md`).
2. **Execute.** Cursor drafts on a lane-named branch and opens a PR; Codex (if used)
   returns transfer-safe research via the **Codex Task Register**
   (`CODEX_TASK_REGISTER_V1.md`).
3. **Report.** 2–3×/day, Cursor posts the **Dispatcher Digest**
   (`OPERATOR_PROGRESS_DIGEST_V1.md`) on #249 (and #493 for parallel-execution items).
4. **Gate.** Anything in §7 → `AWAITING_OPERATOR`; Anton acts; lane resumes.
5. **Close.** On merge, Cursor posts the closure note (bridge §5.3) and mirrors to
   `artifacts/chat_history.md`. Live-verify per `delivery-reality.mdc` before `COMPLETE`.

## 10. Cross-references

- `docs/operations/CODEX_TASK_REGISTER_V1.md` — Codex request/return register + format.
- `docs/operations/CURSOR_DISPATCHER_CHECKLIST_V1.md` — per-dispatch checklist.
- `docs/operations/OPERATOR_PROGRESS_DIGEST_V1.md` — digest + Telegram-ready format + metrics.
- `docs/operations/OPERATOR_BRIDGE_V1.md` — coordination protocol + STATUS schemas (#249).
- `docs/runbooks/OPERATOR_BRIDGE.md` — day-to-day STATUS runbook + human-summary rule.
- `docs/operations/CORPFLOW_OPERATOR_CONTROL_BOARD_V1.md` — priority + workstream board.
- `docs/operations/OPERATOR_DISPATCH_ROUTER.md` — dispatch mechanism + executor boundaries.
- `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` — Codex transfer-safe output contract.
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md` — packet-level live queue.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — §2 allowed / §3 Anton-only.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`.

## 11. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/process only;
  nothing to deploy, nothing to live-verify (no customer-facing surface changed).
- **Implementation:** none. No runtime code, no env, no secrets, no DB, no `POSTGRES_URL`,
  no DNS, no second app/database, no package installs, no new vendor dependency.
- **Scope honoured:** docs/process only; activates lanes A–F as coordination, authorizes
  no runtime/secret/DB/deploy action; forward-secret rotation remains parked.
- **Verdict:** PARTIAL by design — the concurrency layer is documented and activated as a
  coordination surface; all execution continues through #249 + the queue under existing gates.
- **Decision provenance:** implements #493; activated 2026-06-29. (No `docs/decisions/JOURNAL.md`
  entry was bundled into this PR to avoid mixing in unrelated uncommitted working-tree edits;
  this status block is the in-repo decision record. A JOURNAL row may be added by a follow-up
  if Anton wants the formal ledger line.)
