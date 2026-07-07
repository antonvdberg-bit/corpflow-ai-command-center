# CorpFlowAI Business Survival Operating Doctrine

**Status:** Canonical operating doctrine. Docs/process only — authorizes no runtime change, no deploy, no secret/DB action.
**Owner:** Anton (operator / final approver).
**Created:** 2026-07-08.
**Anchor sentinel:** `<!-- CORPFLOWAI_BUSINESS_SURVIVAL_OPERATING_DOCTRINE_V1 -->`

<!-- CORPFLOWAI_BUSINESS_SURVIVAL_OPERATING_DOCTRINE_V1 -->

This doctrine is **mandatory reading** for every agent (Cursor, Codex Cloud, ChatGPT-authored packets, n8n-triggered work) and every operator workflow that creates, prioritises, executes, reviews, or closes CorpFlowAI work. It sits alongside — and does not replace — `.cursor/rules/delivery-reality.mdc`, `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`, and `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`. If those rules conflict with this doc on safety or approval gates, those rules win; on **what counts as business progress**, this doc wins.

---

## 1. Purpose

CorpFlowAI is a **delivery business**. It survives only by producing **repeatable, client-visible outcomes**: websites clients can review, leads clients can act on, changes clients can see live, invoices clients pay.

**Tooling activity is not progress.** A new workflow, monitor, dispatcher, checklist, or docs PR counts as progress **only** if it demonstrably improves at least one of:

1. **Delivery throughput** — more client-visible work reaching preview/production per week.
2. **Revenue** — pilots sold, invoices paid, renewals enabled.
3. **Quality** — fewer defects reaching clients, faster detection when they do.
4. **Operator leverage** — Anton doing less mechanical work per unit of delivery.

The operational failure mode this doctrine exists to eliminate: **Anton as courier** between ChatGPT, Cursor, GitHub Actions, `/change`, n8n, PRs, Vercel previews, and client delivery. When Anton hand-carries prompts, statuses, and links between tools, the business has ad hoc prompts instead of a delivery system. Repeatable systems, not ad hoc prompts, are the survival requirement.

---

## 2. Four required business systems

### 2.1 Operations system

CorpFlowAI needs **repeatable SOPs**, not per-session invention.

All work must flow through **one standard path**:

```text
create work → prioritise → build → preview → review → approve → deploy → validate
```

The standard system must cover **all** of these surfaces — they are stations on one line, not separate worlds:

- `/change` tickets (CMP)
- GitHub issues
- Cursor work (IDE and Cloud Agents)
- Codex packets
- n8n heartbeat / hosted automation
- Pull requests
- Vercel previews
- Client callbacks and client review loops
- Validation evidence (preview URLs, live URLs, probes, screenshots, test output)

**Agents and tools must not invent their own way of working.** If an agent finds itself creating a novel workflow to move a piece of work, that is a defect in the operations system: stop, use the standard path, and if the standard path genuinely cannot carry the work, propose a change to the SOP docs — do not route around them.

### 2.2 Growth / OKR system

Every workstream must have a **clear objective** and at least one **measurable key result**. Work without an objective attached is unprioritised backlog, not active work.

**Immediate objective:** restore client-visible delivery throughput.

**Immediate key results:**

1. **LuxMaurice has a client-reviewable recovery slice** — a URL the client can open and give feedback on.
2. **Every active client-facing workstream** has: a named **owner**, a stated **next action**, an **evidence requirement**, and a **stale threshold**.
3. **Runtime / client-visible work is separated from docs-only / internal work** in queues, PRs, and reporting — never conflated.
4. **Anton spends his time on priorities, approvals, and client decisions** — not on mechanical dispatch, prompt relay, or status stitching.

### 2.3 Numbers and metrics system

CorpFlowAI must be able to answer "how is the business doing today?" from a **minimum daily dashboard**, not from memory or chat scrollback:

| # | Metric | Why it matters |
|---|--------|----------------|
| 1 | Active client workstreams | What the business is actually delivering |
| 2 | Open P0/P1 issues | What threatens delivery or revenue right now |
| 3 | Active Cursor/agent streams | Execution capacity in use (and collision risk) |
| 4 | PRs opened in last 24 hours | Raw throughput |
| 5 | Runtime/client-visible PRs vs docs-only PRs | Whether throughput is real delivery or internal paper |
| 6 | Preview URLs ready | Work waiting on review, not on build |
| 7 | Production / live validation status | Delivery-reality state of shipped work |
| 8 | Stale items over threshold | Work silently dying |
| 9 | Anton-needed gates | Exactly where the operator is the next click |
| 10 | Estimated spend/burn vs delivery output | Whether agent/tooling spend is buying delivery |

The dashboard must produce **business insight, not just raw data**: each daily report should say what changed, what is at risk, and what the single most valuable operator action is — not merely list counts.

### 2.4 Founder 10/80/10 system

The intended operating split for every packet of work:

- **First 10% — direction (Anton + ChatGPT):** set the commercial outcome, priority, acceptance criteria, and approval gates. This is where judgment lives.
- **Middle 80% — execution (Cursor, Codex, n8n, GitHub Actions, delivery queue):** execute bounded work packets, produce PRs and evidence, post status to the agreed surfaces. This is where machines and systems live.
- **Final 10% — judgment again (Anton + ChatGPT):** review, approve/reject, validate quality, and decide deploy / client send / payment / external gates.

**Anton must not be pulled into the middle 80%.** Specifically, Anton is **not**:

- a **prompt courier** carrying instructions between ChatGPT and Cursor,
- a **GitHub Actions operator** manually triggering and babysitting workflow runs as routine dispatch,
- a **status stitcher** assembling "where are we?" from PRs, previews, issues, and chats by hand.

Any process that requires Anton to do those things as a standing duty violates this doctrine and must be flagged as a defect, even if each individual step seems small.

---

## 3. Delivery Queue v1 — required system

Delivery Queue v1 is a **required operating system component, not optional automation**. Until it exists, every agent must behave as if its rules were already enforced. The queue must:

1. **Source work** from `/change` tickets and/or GitHub issues — not from ad hoc chat.
2. **Classify every packet** as: `runtime`, `docs`, `research`, `ops`, and `client-visible` or `internal-only`.
3. **Block docs-only output for runtime / client-visible packets** — a runtime packet answered with a docs PR is a failed packet, not a completed one.
4. **Keep one active stream per client/workstream** unless explicitly escalated by the operator.
5. **Apply stale thresholds** — packets and streams past threshold are surfaced, not left to rot.
6. **Produce PR/evidence automatically** — evidence capture is the queue's job, not the operator's.
7. **Report daily metrics with insight** (the §2.3 dashboard).
8. **Keep Anton focused on the first 10% and final 10%** decisions only.

**Implementation reference:** Delivery Queue v1 must be implemented as the **next operating-system improvement after the urgent LuxMaurice runtime slice is moving**. Track it as a bounded implementation issue/packet per `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` (sourced from `/change` or a GitHub issue, per this section). It is sequenced **after** the LuxMaurice client-reviewable recovery slice (§2.2 key result 1) — client-visible delivery first, then the system that keeps it flowing.

---

## 4. Immediate operating rules

These apply **now**, before any new tooling exists:

1. **Client-visible delivery outranks tooling polish.** When choosing between the two, always choose the client-visible item.
2. **No delivery movement means no progress.** A day of green CI, merged docs, and healthy monitors with zero client-visible movement is a zero-progress day.
3. **A PR without runtime evidence does not satisfy a runtime packet.** Preview URL, live URL, endpoint result, screenshot, or test output against the actual surface is required.
4. **Docs-only output cannot close runtime / client-visible work.** It may be a step; it is never the closure.
5. **Broad parent issues must not be used as execution packets.** Execution requires a bounded packet with its own scope, evidence requirement, and gates — carve one out of the parent first.
6. **Every Cursor packet must state:** output type (runtime/docs/research/ops), surface affected, evidence required, stale threshold, and approval gates. A packet missing any of these is not ready to execute.

---

## 5. CorpFlowAI survival test

Before starting (or dispatching) any piece of work, run this checklist. If the answers are weak, the work is probably tooling gravity, not business survival:

- [ ] Is this work **client-visible or revenue-enabling**?
- [ ] Does it **reduce Anton as bottleneck**?
- [ ] Does it **produce evidence** (URL, probe, screenshot, test, paid invoice)?
- [ ] Does it **move a P0/P1 workstream**?
- [ ] Is the **expected output type clear** (runtime / docs / research / ops)?
- [ ] Is there a **stale threshold**?
- [ ] **Who owns the next action?**
- [ ] Is **Anton needed now**, or only at approval/review?

Work that fails most of these should not be started without an explicit operator decision that names why it is worth doing anyway.

---

## 6. Cross-references

- `.cursor/rules/delivery-reality.mdc` — live production = done; verdict discipline.
- `.cursor/rules/predeploy-decision-checks.mdc` — pre/post-deploy checks.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — what runs without approval, what stops.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet structure (§4 rule 6 fields map onto it).
- `docs/CORPFLOW_OPERATING_PLAYBOOK.md` — business model, priority rules, delivery rules.
- `docs/CHANGE_WORKFLOW.md` — canonical `/change` stages.
- `docs/operations/OPERATOR_BRIDGE_V1.md` — coordination protocol (#249).
- `docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md` — dispatcher → executor activation (throughput packet gate).
- `docs/runbooks/BUSINESS_OPERATIONS_DISPATCHER_V1.md` — routing rules per finding.

## 7. Status block

- **Delivery state:** docs/process only; intended Merged after operator review. No runtime, env, secrets, DB, deploy, external sends, or paid tools.
- **Verdict:** PARTIAL by design until merged — doctrine is documentation; enforcement lives in the linked systems and future Delivery Queue v1 packet.
