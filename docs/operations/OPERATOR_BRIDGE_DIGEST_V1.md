# Operator Bridge Digest v1

**Status:** `BRIDGE DIGEST PLAN CAPTURED — NO AUTOMATION IMPLEMENTED`

**Owner:** Anton (operator / final authority).

**Executor scope:** Cursor and Codex Cloud may use this doc to draft or post read-only digest comments when assigned a packet. This doc does not authorize automation, workflow files, settings changes, secrets, runtime implementation, server/L3 commands, or autonomous merge.

**Canonical live inbox:** GitHub Issue **#249** — `Operator Bridge — Active Work Queue`.

**Companion docs:**

- `docs/operations/OPERATOR_BRIDGE_V1.md`
- `docs/runbooks/OPERATOR_BRIDGE.md`
- `docs/execution/DELIVERY_ACCELERATION_V1.md`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md`
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`

---

## 1. Problem statement

Anton is still doing too much manual communication between ChatGPT, Cursor, and Codex Cloud. The current model has the right authority boundaries, but the operator still has to translate status, blockers, branch names, PR states, and decisions across several surfaces.

The constraints are deliberate:

- **ChatGPT is not 24/7.** It can draft strategy, decisions, and packet language through Anton, but it is not a live execution bus and must not become a direct pipe to Cursor or Codex Cloud.
- **Cursor depends on Anton's laptop.** Cursor remains the L1 primary in-repo executor, but its availability and local context are tied to the laptop session.
- **Codex Cloud can work in the cloud.** Codex Cloud is useful as a bounded L2 second executor, but it needs precise packet ownership, branch, PR, and state coordination to avoid collisions or accidental scope expansion.
- **Documentation is durable but too slow/noisy for live coordination.** Repo docs are the source of truth, but editing docs for every state transition creates churn and still leaves Anton scanning multiple files for the next required action.

The gap: Anton needs one live operational inbox that summarizes active work, blockers, PRs, stale items, and required Anton actions without relaxing any existing hard gate.

---

## 2. Destination model

The destination model is a hybrid coordination system:

| Surface | Role | Source-of-truth rule |
| --- | --- | --- |
| GitHub Issue **#249** | **Live operational inbox** for packet state, blockers, digest comments, and next actions. | Live coordination only; issue comments do not override `main`. |
| `main` / repo docs | Durable protocol, policy, packet definitions, runbooks, and closure evidence. | **Durable truth.** If issue comments disagree with `main`, `main` wins. |
| PRs | Work product: docs, code, artifacts, tests, evidence, and review threads. | PRs are proposed changes until Anton merges. |
| ChatGPT through Anton | Strategy, decision drafts, packet framing, and operator judgment support. | No direct ChatGPT-to-Cursor/Codex pipe; Anton relays and approves. |
| Cursor | L1 primary executor for named packets on approved branches. | No autonomous merge; no secrets/DNS/billing/production authority. |
| Codex Cloud | L2 bounded second executor for named packets, normally `codex/*` branches. | No server/L3 commands; no Codex CLI/server install on `corpflow-exec-01`; no autonomous merge. |
| Anton | Merge, secrets, DNS, billing, production, external accounts, and final verdict authority. | Final human gate. |
| Slack / Telegram mirrors | Optional future notification mirrors. | May mirror notifications later; must not become source of truth. |

**Non-goal:** This digest does not create autonomous AI-to-AI execution, direct ChatGPT-to-Cursor routing, or an always-on agent loop. It only defines a safer summary format and phased path toward read-only digest automation.

---

## 3. Digest format

A digest is a single comment in GitHub Issue #249. It may be posted manually in Phase 1, or by a future read-only GitHub Actions job in Phase 2 after a separate approval packet.

### 3.1 Manual digest comment template

```markdown
### Operator Bridge digest — <YYYY-MM-DD HH:MM UTC>

**Digest state:** IN_PROGRESS | BLOCKED | AWAITING_ANTON | READY_TO_MERGE | MERGED_PENDING_VERIFICATION | COMPLETE | STALE
**Digest author:** Anton | Cursor | Codex Cloud | GitHub Actions (future)
**Scope window:** <since last digest timestamp or "current issue + open PRs">
**Source:** Issue #249 comments + open PRs + repo docs on current branch/main

## Active packets

| Packet | Executor | Branch / PR | Current state | Blocker | Next Anton action | Next executor action |
| --- | --- | --- | --- | --- | --- | --- |
| <packet> | Cursor / Codex Cloud / Anton | <branch or PR> | <state> | <blocker or none> | <one action or none> | <one action or none> |

## Stale items

| Item | Last signal | Why stale | Proposed disposition |
| --- | --- | --- | --- |
| <item> | <date/comment/PR> | <reason> | keep / close / ask Anton / move to docs |

## Recently merged

| PR | Packet | Merge state | Verification state | Remaining Anton action |
| --- | --- | --- | --- | --- |
| #<n> | <packet> | merged / not merged | n/a docs-only / pending / complete | <action or none> |

## Required Anton actions

1. <highest-priority click/decision>
2. <next click/decision>
3. <none if no operator action required>

## Notes / guardrails

- No autonomous merge.
- No secrets, env vars, DNS, billing, production deploys, workflow changes, or server/L3 commands are authorized by this digest.
- If this digest conflicts with `main`, repo docs on `main` win.
```

### 3.2 Required fields

Every digest must include:

- **Active packets** — packet name or PR number for work that is open, blocked, waiting, or recently advanced.
- **Executor** — `Anton`, `Cursor`, `Codex Cloud`, or future explicitly approved executor name.
- **Branch / PR** — branch name, PR URL/number, or `n/a` if the item is operator-only.
- **Current state** — one digest state from §4.
- **Blocker** — one sentence, or `none`.
- **Next Anton action** — one sentence, or `none`.
- **Next executor action** — one sentence, or `none`.
- **Stale items** — items with no recent signal, unclear ownership, or obsolete state.
- **Recently merged** — PRs that merged since the last digest and still need verification, closure, or no action.

---

## 4. Digest states

Use one of these states for each active packet and for the overall digest.

| State | Meaning | Typical next action |
| --- | --- | --- |
| `IN_PROGRESS` | Executor is actively working inside an approved packet. | Executor posts next evidence or PR. |
| `BLOCKED` | Work cannot continue because evidence, access, scope, tests, or a hard gate blocks it. | Anton or executor resolves the named blocker. |
| `AWAITING_ANTON` | The next step is Anton-only: merge, approve, decide, set a secret, DNS, billing, production, or external account action. | Anton takes or rejects the action. |
| `READY_TO_MERGE` | PR is ready for Anton review/merge from the executor's perspective. | Anton reviews and merges or requests changes. |
| `MERGED_PENDING_VERIFICATION` | PR merged, but delivery-reality verification or closure evidence remains. | Executor or Anton records required verification. |
| `COMPLETE` | Work is closed for the packet's defined scope. Docs-only work may be complete at merge; runtime work needs live verification. | No action unless a follow-up is named. |
| `STALE` | Item has not changed recently, has unclear ownership, or may be obsolete. | Anton decides keep, close, reassign, or move to docs. |

**State discipline:** The digest state summarizes; it does not override packet status, PR review state, or Delivery Reality Audit requirements.

---

## 5. Proposed phases

### Phase 0 — docs-only protocol

Capture this digest protocol in `docs/operations/OPERATOR_BRIDGE_DIGEST_V1.md`.

- No workflow file.
- No GitHub settings change.
- No labels created.
- No app/runtime/env/server change.
- Expected verdict: `BRIDGE DIGEST PLAN CAPTURED — NO AUTOMATION IMPLEMENTED`.

### Phase 1 — manual digest comment template in #249

Cursor, Codex Cloud, or Anton may manually post a digest comment to issue #249 using §3.1 when a packet asks for it.

- Reads issue #249 and open PRs manually.
- Posts one human-readable digest comment.
- Does not mutate repo state except through a separately reviewed PR.
- Does not create labels, secrets, workflows, or automation.

### Phase 2 — GitHub Actions read-only digest job

Future automation candidate, requiring a separate explicit PR and approval.

- Scheduled GitHub Actions job reads issue #249 comments and open PRs.
- It computes a digest from public/repo metadata available to GitHub Actions.
- It posts one digest comment back to issue #249.
- It must not read secrets beyond the default GitHub token needed to read repo metadata and write an issue comment.
- It must not change labels, branches, PR state, code, workflow settings, deployments, env vars, or external systems unless separately approved.

### Phase 3 — optional Telegram/Slack notification mirror

Optional future notification mirror after Phase 2 proves useful.

- Mirrors a short notification that a new digest exists.
- Links back to issue #249.
- Must not become source of truth.
- Must not include secrets, tokens, session data, client-private data, or full issue bodies if those could contain sensitive content.
- Requires separate communications/security review before implementation.

### Phase 4 — optional labels

Optional labels may be introduced later, for example:

- `bridge:needs-anton`
- `bridge:blocked`
- `bridge:ready-to-merge`
- `bridge:stale`
- `bridge:complete`

Labels are advisory only. The digest comment and repo docs remain the authoritative coordination record. Creating labels is a GitHub settings/repo-management action and requires explicit Anton approval in a separate packet.

---

## 6. First automation candidate

The first automation candidate is a **GitHub Actions scheduled read-only digest job**.

Proposed behavior for a future packet:

1. Run on a schedule, for example once or twice per day.
2. Read issue #249 comments.
3. Read open PRs, PR authors, branches, labels, checks, and merge state.
4. Identify active packets, blockers, stale items, recently merged PRs, and required Anton actions.
5. Post one digest comment back to issue #249.

Hard constraints for that future automation:

- It is **read-only with respect to repo work product** except for posting the digest comment.
- It does **not** write code, edit docs, change labels, merge PRs, update branches, rerun workflows, deploy, or close issues.
- It does **not** touch env vars, secrets, OpenAI keys, GitHub settings, Vercel settings, n8n, restic, containers, databases, DNS, billing, or `corpflow-exec-01`.
- It does **not** create autonomous AI-to-AI execution or a direct ChatGPT-to-Cursor/Codex pipe.

**This PR does not implement Phase 2.** It only captures the plan and the digest format.

---

## 7. Guardrails

This digest protocol inherits all guardrails from `OPERATOR_BRIDGE_V1.md`, `DELIVERY_ACCELERATION_V1.md`, `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`, and `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`.

Non-negotiables for this packet:

- Docs only.
- No app code.
- No runtime behavior change.
- No env vars.
- No secrets.
- No OpenAI key handling.
- No GitHub settings changes.
- No server/L3 commands.
- No n8n changes.
- No restic.
- No containers.
- No workflow changes in this PR.
- No Slack implementation yet.
- No autonomous AI-to-AI execution.
- No direct ChatGPT-to-Cursor pipe.
- No autonomous merge.
- Stop at PR creation / awaiting Anton review.

---

## 8. Review checklist for this docs-only packet

Before merge, confirm:

- [ ] The only intended new file is `docs/operations/OPERATOR_BRIDGE_DIGEST_V1.md`.
- [ ] The verdict remains `BRIDGE DIGEST PLAN CAPTURED — NO AUTOMATION IMPLEMENTED`.
- [ ] No workflow, app, runtime, env, secret, server/L3, n8n, restic, container, Slack, Telegram, or GitHub settings implementation is included.
- [ ] The digest format includes active packets, executor, branch/PR, current state, blocker, next Anton action, next executor action, stale items, and recently merged.
- [ ] Digest states are limited to `IN_PROGRESS`, `BLOCKED`, `AWAITING_ANTON`, `READY_TO_MERGE`, `MERGED_PENDING_VERIFICATION`, `COMPLETE`, and `STALE`.
- [ ] Phase 2+ automation remains explicitly future-gated.
