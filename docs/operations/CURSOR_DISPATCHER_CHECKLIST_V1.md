# Cursor Dispatcher Checklist v1 — per-dispatch routine

**Status:** Docs/process only. Authorizes no runtime change, no deploy, no secret/DB action.
**Owner:** Anton (operator).
**Executor (this doc):** Cursor.
**Created:** 2026-06-29.
**Implements:** part of [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) (parallel execution board).
**Anchor sentinel:** `<!-- CURSOR_DISPATCHER_CHECKLIST_V1 -->`

<!-- CURSOR_DISPATCHER_CHECKLIST_V1 -->

## 1. Purpose

The dispatcher is the role Cursor plays when running the Parallel Execution Board: pick the
right lane, do the smallest safe next step, stay inside WIP limits and boundaries, and report.
This checklist makes that loop repeatable so concurrency stays safe and visible.

Run this checklist **at the start of each work session** and **before opening each PR**.

## 2. Pick the next lane (dispatch)

- [ ] Read `PARALLEL_EXECUTION_BOARD_V1.md` §3.1 (active lane table) and the latest
      `#249` decisions.
- [ ] Choose the **highest-priority** lane that is: not `Blocked`, owner = Cursor (or
      Cursor's part of a shared lane), and under WIP limits (§3 below).
- [ ] Confirm the lane's **next action** is still accurate; if reality moved, update the
      board row first (docs-only edit).
- [ ] Confirm the next step is **pre-approved** (`PARALLEL_EXECUTION_BOARD_V1.md` §6). If it
      is **hard-gated** (§7), do **not** start — post `AWAITING_OPERATOR` instead.

## 3. WIP + anti-conflict pre-check

- [ ] Open Cursor PRs ≤ **2** (board §4). If at cap, finish/merge one before opening more.
- [ ] Lane has ≤ **1** packet `IN_PROGRESS`.
- [ ] Codex packets in flight ≤ **2** (if this dispatch issues a Codex task).
- [ ] No other open PR/lane is editing the same files (board §5 rule 1). If overlap exists,
      sequence — do not branch concurrently off the same file.
- [ ] If the change touches **governance/doctrine** files (`.cursor/rules/*`, `AGENTS.md`,
      AAP, packet standard, the boards), confirm explicit Anton approval naming the file;
      otherwise HOLD.

## 4. Branch + scope

- [ ] Branch name matches Cursor namespace and names the lane:
      `docs/<lane>-<slug>`, `chore/...`, `feat/...`, `fix/...`, `refactor/...`.
- [ ] One packet → one branch → one PR (board §5 rule 3). No omnibus branches.
- [ ] Stage **only** the files this packet owns. Do **not** sweep unrelated uncommitted
      working-tree changes into the commit (`git add` named paths, never `git add -A` when
      the tree is dirty with other lanes' WIP).

## 5. Boundary self-check (must all be true to proceed without Anton)

- [ ] Docs/process or read-only only — **no runtime code path changed**.
- [ ] No production deploy / promote / rollback.
- [ ] No env vars / secrets touched; no `.env*` edit introducing a secret name.
- [ ] No `POSTGRES_URL` change; no DB schema change; no destructive DB action.
- [ ] No DNS / domain change.
- [ ] No email send runtime; no WhatsApp/SMS runtime; no payment work.
- [ ] No external outreach.
- [ ] No package install; no new vendor dependency; no new container/self-hosted tool.
- [ ] Not reopening the parked forward-secret rotation.
- [ ] Not creating a second app or second database.
- [ ] Not self-merging.

If **any** box is false, the next step is hard-gated → post `AWAITING_OPERATOR` with the
`ANTON TO-DO` block and stop.

## 6. Build / verify (before marking READY)

- [ ] For docs-only: confirm no code changed; linters/links sane. (No `npm test` required
      for pure docs, but run `npm run build`/`npm test` if any non-docs file was touched.)
- [ ] For code: `npm test` and `npm run build` green; fix any lints introduced.
- [ ] PR body includes scope, the lane, boundaries honoured, and (for docs-only governance)
      a status block / Delivery Reality note.

## 7. Open PR + report

- [ ] Push branch; open PR against `main` with a lane-tagged title
      (e.g. `docs(ops): [Lane C] server safety baseline`).
- [ ] **Do not merge.** Anton owns every merge.
- [ ] Post a STATUS comment on `#249` per `OPERATOR_BRIDGE_V1.md` §5.1 + the human-summary
      block (`docs/runbooks/OPERATOR_BRIDGE.md` §4). For parallel-execution items, also
      reference `#493`.
- [ ] On the 2–3×/day cadence, post the **Dispatcher Digest**
      (`OPERATOR_PROGRESS_DIGEST_V1.md`).

## 8. Close (after Anton merges)

- [ ] Post the closure note (`OPERATOR_BRIDGE_V1.md` §5.3) with merge SHA.
- [ ] Mirror a one-line closure to `artifacts/chat_history.md`.
- [ ] For any customer-facing surface: live-verify per `.cursor/rules/delivery-reality.mdc`
      before claiming `COMPLETE`. Docs-only closes as `PARTIAL`/record-only (no live surface).
- [ ] Update the lane row's **next action** and the throughput metrics for the next digest.

## 9. When in doubt

- Docs-only + inside the lane → **proceed and report**.
- Hits any §5 boundary → **HOLD, post `AWAITING_OPERATOR`**.
- Two executors/lanes collide → both HOLD; ask Anton on #249 to re-assign (board §5 rule 7).
- Cannot proceed → return the blocker explicitly (repo access / branch conflict / missing
  path / CI failure / unclear ownership / approval required). Never wait silently.

## 10. Cross-references

- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` — lanes, WIP, anti-conflict, gates.
- `docs/operations/CODEX_TASK_REGISTER_V1.md` — issuing/importing Codex research.
- `docs/operations/OPERATOR_PROGRESS_DIGEST_V1.md` — digest cadence + format.
- `docs/operations/OPERATOR_BRIDGE_V1.md`, `docs/runbooks/OPERATOR_BRIDGE.md` — STATUS schemas.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — §2 allowed / §3 Anton-only.
- `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`.

## 11. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/process only.
- **Implementation:** none. No runtime, env, secrets, DB, deploy.
- **Verdict:** PARTIAL by design — the dispatch routine is documented; execution stays under
  existing gates.
