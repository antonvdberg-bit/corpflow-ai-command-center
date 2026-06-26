# CorpFlowAI Operator Control Board v1

**Status:** Docs-only governance proposal. Authorizes no runtime change by itself.
**Owner:** Anton (operator).
**Created:** 2026-06-25.
**Anchor sentinel:** `<!-- OPERATOR_CONTROL_BOARD_V1 -->`

<!-- OPERATOR_CONTROL_BOARD_V1 -->

## 1. Purpose

Anton runs several CorpFlowAI workstreams in parallel. This board gives a single,
lightweight **priority + dispatch structure** so parallel work happens without
duplicated effort, contradictory decisions, or unsafe execution.

This is a **thin coordination surface**, not a new platform and not a second
backlog. It sits *above* the packet-level queue and *beside* the coordination
protocol:

- **Priority + active workstreams** (this doc) — the top-level "what matters now
  and who owns it" view.
- **Command ledger** — GitHub issue
  [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249),
  the source of truth for operator decisions and dispatch packets.
- **Packet-level queue** — `docs/execution/WEEKEND_EXECUTION_QUEUE.md`, the live
  list of approved/pending packets with Definition of Done and evidence.

If this board and a canonical doc disagree, **the canonical doc wins** (see §5).

## 2. Canonical operating model

The board operates strictly within the existing, canonical operating model. None
of the following is changed by this document.

| Element | Rule | Canonical reference |
|---|---|---|
| Operator chat | Anton uses one command/operator chat to make decisions and receive action lists. | `docs/operations/OPERATOR_BRIDGE_V1.md` |
| Command ledger | GitHub issue **#249** is the command ledger / source of truth for operator decisions and dispatch packets. | #249, `docs/operations/OPERATOR_DISPATCH_ROUTER.md` §2 |
| Doctrine | Repo docs remain canonical doctrine. | `AGENTS.md`, `.cursor/rules/*` |
| Cursor | Owns repo/docs/code **PR execution**. | `docs/operations/OPERATOR_DISPATCH_ROUTER.md` §3 |
| Codex | Research/data/script worker only; **never owns PRs**. Handoffs must be transfer-safe (no local-only branch/SHA). | `docs/operations/OPERATOR_DISPATCH_ROUTER.md` §7.1, `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` |
| n8n | Future **notify-only** workflow spine first; no automated cold outreach. | `docs/marketing-automation-arm.md` §9, `docs/operations/OPERATOR_DISPATCH_ROUTER.md` §5 |
| Google Drive Brand Hub | Working collateral library (human-facing copies). | `docs/marketing/MARKETING_COLLATERAL_INVENTORY.md` |
| NotebookLM | Briefing/summarization only; not an execution layer. | `docs/operations/OPERATOR_DISPATCH_ROUTER.md` §7.2 |
| Workspace Studio | Workspace-side **candidate/prototype only**; n8n stays the governed spine. | `docs/strategy/GOOGLE_ACCELERATION_LANE.md`, `docs/operations/OPERATOR_DISPATCH_ROUTER.md` §7.3 |

**Hard boundaries (carried forward, non-negotiable):**

- One production app. One production Postgres via `POSTGRES_URL`.
- No second app. No second database.
- No secrets in docs, chat, logs, or screenshots.
- No production DB changes unless separately approved.
- No automated cold outreach (outreach stays human-approved).
- No uncontrolled AI-to-AI loops.

## 3. Priority model

A small, fixed set of priority labels. Priority is **advisory for sequencing**; it
never changes a safety gate (an Anton-only gate stays Anton-only regardless of
priority).

| Label | Meaning |
|---|---|
| **P0** | Urgent / blocking revenue, compliance, or go-live. |
| **P1** | Required before market push. |
| **P2** | Useful but not blocking. |
| **Blocked** | Important but waiting on an external/manual dependency (named). |
| **Deferred** | Explicitly not now. |

State vocabulary used in the workstream table: `Active`, `Active but gated`,
`Candidate`, `Blocked`, `Waiting for capacity`, `Later`, `Deferred`.

## 4. Active workstream table

Initial streams. Each row names a priority, an owner, a state, and any guardrail
beyond the §2 hard boundaries. Owner naming follows the dispatch router: **Anton**
for operator-only physical/secret/DNS/billing actions, **Cursor** for repo/docs/code
PRs, **Codex** for research inputs only.

| # | Workstream | Priority | Owner | State | Guardrail (beyond §2) |
|---|---|---|---|---|---|
| 1 | SBM banking/payment readiness | **P0** | Anton physical action first, then Cursor only after bank resolution | **Blocked** until bank visit | No payment production switch; resolution is an operator physical action. |
| 2 | Product A market-readiness | **P0** | Cursor + Anton QA | **Active** | Buyer-facing work follows the brand/conversion doctrine + delivery-reality verification. |
| 3 | Marketing Automation Arm / US medspa revenue machine | **P0** | Cursor for docs, Codex for research inputs only | **Active** | Codex research artifact CAPTURED (PR #462) as bounded research/input — Anton review required before outreach; next step is the Sheet + Audit Workflow v0 packet. Codex research is input, not authorization; outreach stays human-approved. |
| 4 | Cloudflare R2 + Infisical + restic backups | **P1** | Infrastructure workstream / Cursor as needed | **Active but gated** | Do **not** back up the production DB yet; do **not** touch `POSTGRES_URL`; do **not** integrate R2 into the production app yet. |
| 5 | Website-wide beauty layer rollout | **P1** | Cursor | **Active** after governed rollout plan | Per-surface gated PRs; photo licence verified before any governed hero ships `published` (`docs/marketing/CORPFLOW_BEAUTY_LAYER_ROLLOUT_PLAN_V1.md`). |
| 6 | Chatbot / marketing-site intake assistant | **P1** | Specification first, then Cursor | **Candidate** | Spec only first (`docs/marketing/WEBSITE_LEAD_RESCUE_INTAKE_ASSISTANT_SPEC_V1.md`); no implementation without separate approval. No autonomous sales outreach; human-approved intake/follow-up only. |
| 7 | SBM payment integration preparation | **P1** | Docs/spec first, then Cursor | **Candidate** | No real secrets; no payment production switch until approved. |
| 8 | ERP documentation cleanup | **P2** | Cursor / docs | **Waiting for capacity** | Docs-only; no ERPNext production setup implied. |
| 9 | NotebookLM source sets | **P2** | Anton / Workspace | **Later**, once approved docs stabilize | Briefing/summarization only; no sensitive client data (`docs/operations/OPERATOR_DISPATCH_ROUTER.md` §7.2). |

This table is a **snapshot**. Authoritative status for any individual packet lives
in `docs/execution/WEEKEND_EXECUTION_QUEUE.md` and the decision lives on #249.

## 5. How the board is used

1. **Decide on #249.** Anton posts a decision or a `DISPATCH_TO_<OWNER>` packet on
   #249 (the command ledger). Priority and owner come from this board.
2. **Sequence by priority.** When choosing the next thing to do, pick the highest
   non-Blocked priority whose owner is free. P0 before P1 before P2; `Blocked` and
   `Deferred` are skipped until unblocked / reactivated.
3. **Execute under existing rules.** Cursor executes repo/docs/code via PRs; Codex
   produces research only; neither self-merges. Safety gates in
   `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3 and
   `.cursor/rules/delivery-reality.mdc` are unchanged by this board.
4. **Record progress where it belongs.** Packet-level status → the execution queue;
   coordination/STATUS → #249 per `docs/runbooks/OPERATOR_BRIDGE.md`; closure
   summaries → `artifacts/chat_history.md`.

**Source-of-truth order:** canonical repo docs and `.cursor/rules/*` > #249
decisions > this board. The board never overrides a doctrine doc or a safety gate;
if they conflict, update the canonical doc first, then this board.

## 6. Updating the board

- Changes to priorities, owners, states, or streams are **docs-only** edits to this
  table, normally landed via a small Cursor PR after an Anton decision on #249.
- Adding a new workstream that implies runtime, secrets, DNS, billing, DB, or a new
  surface requires the relevant canonical doc / packet first — the board row is a
  pointer, not an authorization.
- Keep it short. If the board grows into a backlog, the detail belongs in
  `docs/execution/WEEKEND_EXECUTION_QUEUE.md`, not here.

## 7. Cross-references

- `docs/operations/OPERATOR_BRIDGE_V1.md` — coordination protocol (how decisions/STATUS are recorded on #249).
- `docs/runbooks/OPERATOR_BRIDGE.md` — day-to-day STATUS runbook.
- `docs/operations/OPERATOR_DISPATCH_ROUTER.md` — dispatch mechanism + executor boundaries.
- `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` — Codex handoff contract (transfer-safe output formats, forbidden actions, `Audit Update Queue` Sheet schema, validation rules).
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md` — packet-level live queue.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet structure.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — what may run without further approval vs. Anton-only gates.
- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — bounds on Google AI tooling (NotebookLM, Workspace Studio, etc.).
- `docs/marketing-automation-arm.md` — Marketing Automation Arm operating playbook (n8n boundary, outreach approval).
- `docs/marketing/CORPFLOW_BEAUTY_LAYER_ROLLOUT_PLAN_V1.md` — governed beauty-layer rollout.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`.

## 8. Recent governance decisions (ledger)

Append-only, newest first. Each row is an operator decision recorded on #249 and
reflected here. This is a lightweight ledger, not a replacement for #249 or the
execution queue.

| Date | Decision | PR | State |
|---|---|---|---|
| 2026-06-25 | **Operator Control Board v1 adopted** as the active operating structure (this doc). | [#463](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/463) | **Merged / active.** |
| 2026-06-25 | **Workspace Studio = candidate/prototype layer only**; n8n remains the governed workflow spine. | [#460](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/460) | **Merged.** |
| 2026-06-25 | **Codex US-medspa artifact CAPTURED.** Recovered via operator-supplied transfer-safe text (original branch `work` / SHA `5a216e35…` never reached GitHub); imported as **bounded research/input material, not doctrine**. Anton review required before outreach. Capture authorizes **no** outreach/build/CRM/n8n/production change. | [#462](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/462) | **Merged** (commit `db092eb3`). |
| 2026-06-25 | **US Medspa Revenue Machine — Google Sheet + Audit Workflow v0** packet: turn the captured artifact into a controlled human-run process (Sheet structure, audit-status flow, Anton approval gate, manual send/follow-up states). Process-only; all outreach human-approved. | [#467](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/467) | **Open — docs-only.** No automated outreach; no app/CRM/DB/n8n. |

## 9. Status block

- **Delivery state:** v1 doc **Merged** (PR #463); this ledger update is an incremental docs-only edit. Docs-only; nothing to deploy.
- **Implementation:** none. No runtime code, no env, no secrets, no DB, no second app/database.
- **Verdict:** PARTIAL by design — governance documented; execution continues to flow through #249 + the execution queue under existing gates.
