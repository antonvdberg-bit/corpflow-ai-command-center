# Codex utilization plan v1

**Status:** Execution policy capture — **awaiting Anton review before treating as live operator policy.**

**Verdict:** `NO IMPLEMENTATION AUTHORIZED` by this document alone. Installing Codex Cloud, creating keys, or assigning runtime packets still requires Anton per `docs/runbooks/CODEX_CLOUD_INSTALL.md` (Packet 7.2, currently **PENDING**).

**Owner:** Anton (approver / merger / entitlement holder).

**Captured:** 2026-06-18.

**Supersedes nothing.** Refines and operationalizes:

- `docs/execution/DELIVERY_ACCELERATION_V1.md`
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`
- `docs/runbooks/CODEX_CLOUD_INSTALL.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md`

If any conflict, **those canonical docs win** until Anton merges this plan and any downstream amendments.

---

## 1. Purpose

Decide **how CorpFlow should utilize OpenAI Codex** as a second bounded in-repo executor **without**:

- disrupting the three-layer execution model (L1 / L2 / L3);
- introducing a fourth execution layer;
- putting production credentials on `corpflow-exec-01-u69678`;
- granting Codex autonomous merge authority;
- using Codex for L3/server commands.

This plan compares the **May 2026 repo protocol** against **June 2026 OpenAI Codex product reality** and records the intended posture through a one-week evaluation window.

---

## 2. OpenAI Codex product reality (June 2026) vs repo plan

### 2.1 What OpenAI ships today

OpenAI Codex is a **unified coding-agent product** available across multiple surfaces (see [Codex manual](https://developers.openai.com/codex/codex-manual), [Codex pricing](https://developers.openai.com/codex/pricing)):

| Surface | Where it runs | CorpFlow relevance |
| ------- | ------------- | ---------------- |
| **Codex Cloud** | OpenAI-managed isolated environments; GitHub-connected cloud tasks | **Intended CorpFlow L2 executor #2** — matches `DELIVERY_ACCELERATION_V1.md` §4.3 |
| **Codex web** | Browser (`chatgpt.com/codex`) | Anton exploration / packet drafting; **not** a CorpFlow execution layer |
| **Codex CLI** | Local terminal on operator machine (`codex`, `codex cloud …`) | Personal operator tool only; **not** on `corpflow-exec-01` (see §8) |
| **IDE extension / iOS** | Local / device | Out of scope for CorpFlow infra |

**Entitlement paths (material change since May 2026 protocol draft):**

| Path | Cloud tasks + GitHub integration | Typical billing |
| ---- | -------------------------------- | --------------- |
| **ChatGPT Plus (and higher) sign-in** | **Yes** — Codex web, CLI, IDE, **cloud tasks**, GitHub code review integrations included within plan limits | Subscription (Anton already holds Plus) |
| **OpenAI API key only** | **No cloud features** — CLI/SDK local only; pay per token | API usage meter |

Shared **rolling usage limits** apply across local messages and cloud tasks (documented five-hour windows on OpenAI's pricing pages). Treat Plus entitlement as **limited / scarce** — not unlimited parallel executor capacity.

### 2.2 Repo plan alignment (evidence check)

| Repo decision (May–Jun 2026) | Current product reality | Verdict |
| ---------------------------- | ----------------------- | ------- |
| Codex Cloud = hosted worker, not laptop CLI as primary executor | Cloud tasks + GitHub App integration are first-class; CLI can *launch* cloud tasks but CorpFlow uses Cloud + GitHub directly | **Still correct** |
| Codex Cloud runs in OpenAI infra, not on `corpflow-exec-01` | Unchanged | **Still correct** |
| Least-privilege GitHub App on this repo only | Still required; Codex plugins (Slack, Figma, etc.) exist but CorpFlow should enable **GitHub only** | **Still correct — tighten plugin scope at install** |
| OpenAI API key pasted only into Codex setup | **Refined:** prefer **ChatGPT Plus sign-in** for Codex Cloud so cloud tasks + GitHub integration work inside subscription limits; API key path is fallback for API-only local use **without** cloud/GitHub features | **Update install runbook** (see §6) |
| `codex/*` branch namespace; no shared branches with Cursor | Unchanged | **Still correct** |
| Anton merges; no autonomous Codex merge | Unchanged; `.github/workflows/cmp-product-automerge.yml` remains `cmp/*` only | **Still correct** |
| Packet 7.2 install **PENDING** | Codex Cloud not yet installed (`git ls-remote --heads origin 'codex/*'` expected empty) | **Unchanged — no drift** |

**Conclusion (unless future evidence contradicts):** Use **Codex Cloud as L2 executor #2**. Do **not** install Codex CLI or any Codex daemon on `corpflow-exec-01`. Do **not** introduce a fourth execution layer.

---

## 3. Confirmed execution posture

| Layer | CorpFlow role | Codex involvement |
| ----- | ------------- | ----------------- |
| **L1 — Laptop brain** | **Cursor = primary in-repo executor.** Authors code/docs, runs local `npm test` / `git` / `gh`, opens PRs, posts bridge STATUS. | Anton may personally use Codex web/CLI on the laptop for exploration — that is **not** a CorpFlow executor and does **not** author `codex/*` branches unless routed through Codex Cloud per packet assignment. |
| **L2 — Cloud hands** | Vercel, GitHub Actions, Neon, n8n, factory monitors. | **Codex Cloud = bounded second in-repo executor.** Authors `codex/*` branches + PRs + #249 STATUS only. Holds **no** CorpFlow production credentials. |
| **L3 — Box hands** | `corpflow-exec-01-u69678` — operator-driven SSH; Anton pastes commands. | **None.** Codex must never SSH, never run `docker`/`bench` on the box, never hold box credentials. |

**Three layers only.** Codex Cloud is a sub-surface of L2, not L4.

---

## 4. What Codex is allowed to do first (v1 bounded list)

All items require an approved packet with `Owner: Executor = Codex Cloud`, branch under `codex/*`, and STATUS posts to Operator Bridge **#249** with `**Executor:** Codex Cloud`.

Priority order for the **first live week**:

| # | Task | Typical output path | Notes |
| - | ---- | ------------------- | ----- |
| 1 | **Docs consistency audit** | `artifacts/audits/<date>-docs-consistency.md` | Compare `AGENTS.md` Must-read vs files on disk |
| 2 | **Broken-reference audit** | `artifacts/audits/<date>-broken-references.md` | Scan `docs/` for dead internal links / missing paths |
| 3 | **Queue summarization** | `artifacts/<date>-queue-summary.md` | Read `WEEKEND_EXECUTION_QUEUE.md` + #249 |
| 4 | **Candidate & Reference Library cleanup** | `docs/product/**`, index row in `docs/product/README.md` | CorpFlow Candidate & Reference Library captures only |
| 5 | **Lead Rescue article outlines** | `docs/marketing/drafts/` | Doctrine review before any publish |
| 6 | **Delivery checklist generation** | Packet doc or `artifacts/` | DoD + Delivery Reality Audit shell |
| 7 | **PR review comments** | GitHub PR review only | Read-only; no merge |
| 8 | **Test generation** | `core/engine/tests/` or `node-tests/` only | PR-only; no production paths |

**First live packet (recommended):** `Codex Cloud docs consistency audit` on branch `codex/docs-consistency-audit-v1` (see §9).

---

## 5. What Codex is not allowed to do (v1)

Non-negotiable for Codex Cloud (and for any agent acting as Codex):

| Forbidden | Reason |
| --------- | ------ |
| App/runtime implementation until **separately assigned** in an approved packet | v1 is parallel docs / audit acceleration only |
| Secrets — values, env writes, credential broadening | AAP §3.2 |
| Env changes — Vercel, GitHub Actions secrets, Infisical, `.env*` | AAP §3.2 |
| Production deploys, DNS, billing, tenant identity | AAP §3 |
| DB writes, schema changes, `prisma/` edits | AAP §3.5 + `DELIVERY_ACCELERATION_V1.md` v1 forbidden paths |
| Vercel / GitHub **settings** changes | AAP §3 |
| **L3 / server commands** on `corpflow-exec-01` or any host | `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` |
| **Server install** — Codex CLI, Codex daemon, Docker agent, MCP servers on the box | §8 |
| **Autonomous merge** | Anton merges all PRs |
| **Shared branches with Cursor** | `codex/*` Codex-only; other prefixes Cursor-only |
| `lib/server/`, `lib/cmp/`, `api/`, `middleware.*`, `prisma/`, `.env*`, `.github/workflows/`, `vercel.json` in v1 | `DELIVERY_ACCELERATION_V1.md` tightened path list |

**Credential rule:** Codex Cloud must **not** receive OpenAI API keys, ChatGPT session tokens, GitHub tokens, Vercel tokens, DB URLs, or production credentials on **`corpflow-exec-01`** or in the repo. Anton holds entitlements; Cursor must not handle OpenAI keys per install runbook.

---

## 6. Entitlement strategy — ChatGPT Plus first

**Plan:** Use Anton's existing **ChatGPT Plus** Codex entitlement as the **first** funding path for Codex Cloud evaluation.

| Principle | Detail |
| --------- | ------ |
| **Plus-first** | Sign in to Codex Cloud with ChatGPT (Plus) so **cloud tasks** and GitHub integration consume **subscription-included limits**, not a separate API meter, until limits prove insufficient. |
| **Scarce usage** | Local messages and cloud tasks share rolling limits (OpenAI documented five-hour windows). Run **one Codex packet at a time** during evaluation week. |
| **API key fallback** | Create `corpflow-codex-cloud-<date>` API key **only if** Plus limits block cloud tasks **and** Anton explicitly approves API spend. API-key-only path **does not** include cloud/GitHub features per OpenAI docs — not suitable as primary CorpFlow Cloud executor path. |
| **No Cursor key handling** | Cursor agents must not ask for, paste, or store OpenAI keys. Install steps are Anton-only (`CODEX_CLOUD_INSTALL.md`). |
| **Spend visibility** | Anton monitors Plus usage exhaustion during evaluation week (§7). Upgrade to Pro / purchased credits only after rubric review. |

**Install runbook change:** `docs/runbooks/CODEX_CLOUD_INSTALL.md` §2 now lists Plus sign-in as **preferred** over API-key-first setup.

---

## 7. One-week evaluation rubric

Run after the **first Codex Cloud packet** (`codex/docs-consistency-audit-v1`) and any follow-on §4 tasks Anton assigns within seven calendar days of install.

| Metric | What to measure | Pass signal | Fail / pause signal |
| ------ | --------------- | ----------- | ------------------- |
| **Tasks completed** | Packets moved `APPROVED → IN_PROGRESS → AWAITING_APPROVAL` | ≥1 meaningful audit artifact merged | Zero completed artifacts |
| **Useful PR rate** | Merged PRs that Anton would have paid for in time saved | ≥1 merge Anton rates "worth repeating" | PRs mostly noise / require full rewrite |
| **Token / usage exhaustion** | Plus cloud-task limits hit mid-week | Limits sufficient for 2–3 bounded packets | Hard stop before second packet completes |
| **Review burden** | Anton minutes per Codex PR | ≤15 min review on docs-only PR | >30 min or repeated secret/near-miss paths |
| **Branch collisions** | Mixed-author or wrong-prefix branches | Zero collisions | Any `codex/*` commit on Cursor branch or vice versa |
| **CI reliability** | Agent CI + vercel-env on Codex PRs | Same green rate as Cursor docs PRs | Systematic CI failures tied to App identity |
| **Higher plan / API spend justified?** | Rubric synthesis | Clear yes/no recommendation with evidence | Ambiguous — extend evaluation one week, don't spend yet |

**Output:** One closure comment on #249 + optional `artifacts/audits/<date>-codex-evaluation-week.md`. **No automatic upgrade** to Pro/API spend from rubric alone — Anton decides.

---

## 8. Server-side Codex CLI

**Status:** `NOT AUTHORIZED / FUTURE EVALUATION ONLY`

| Question | Answer |
| -------- | ------ |
| Install Codex CLI on `corpflow-exec-01-u69678`? | **No** — not authorized; no ADR; no packet |
| Install Codex daemon / MCP / `codex mcp` server on the box? | **No** |
| Run `codex cloud exec` from the box? | **No** — L3 is operator-driven ERPNext/monitoring only |
| Codex CLI on Anton's laptop? | Personal operator tool only; **not** a CorpFlow execution layer and **not** a substitute for Codex Cloud in-repo work |

**Rationale:** A box-hosted CLI would imply a **fourth execution layer**, violate §5.3 hard rules (no new daemons without ADR), and tempt credential placement on a less-trusted host. Codex Cloud already provides hosted execution on L2.

Future re-evaluation requires: ADR + authorization packet + §10 gate in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — same bar as Uptime Kuma carve-out.

**Canonical absence:** `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` §6 now lists Codex CLI/daemon on the box explicitly.

---

## 9. First live packet (recommended)

| Field | Value |
| ----- | ----- |
| **Packet name** | `Codex Cloud docs consistency audit` |
| **Branch** | `codex/docs-consistency-audit-v1` |
| **Owner: Executor** | Codex Cloud |
| **Owner: Approver** | Anton |
| **Goal** | Produce `artifacts/audits/<date>-docs-consistency.md` verifying every path in `AGENTS.md` Must-read resolves on disk |
| **Allowed writes** | `artifacts/audits/` only in this packet |
| **Forbidden** | All runtime paths; no secrets; no merge by Codex |
| **STATUS** | Post to #249 at `IN_PROGRESS` and `AWAITING_APPROVAL` with `**Executor:** Codex Cloud` |
| **Prerequisite** | Packet 7.2 install complete (`CODEX_CLOUD_INSTALL.md`) |

Draft packet text lives in `docs/runbooks/CODEX_CLOUD_INSTALL.md` §6 and `docs/execution/WEEKEND_EXECUTION_QUEUE.md` Goal 7 Packet 7.2/7.3.

---

## 10. Relationship to Delivery Acceleration v1

This plan **does not replace** `DELIVERY_ACCELERATION_V1.md`. It adds:

- June 2026 product-reality alignment (Plus-first entitlement).
- Explicit first-task priority list and evaluation rubric.
- Hard **NOT AUTHORIZED** stance on server-side Codex CLI.
- Named first packet branch `codex/docs-consistency-audit-v1`.

Future amendments to executor boundaries still require Anton merge and may require `policy:` PR per AAP §6.

---

## 11. Cross-references

| Doc | Role |
| --- | ---- |
| `docs/execution/DELIVERY_ACCELERATION_V1.md` | Multi-executor protocol (canonical rules) |
| `docs/runbooks/CODEX_CLOUD_INSTALL.md` | Operator install sequence (Packet 7.2) |
| `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` | L1/L2/L3 map; Codex-not-on-box |
| `docs/operations/OPERATOR_BRIDGE_V1.md` | #249 coordination + STATUS schema |
| `docs/runbooks/OPERATOR_BRIDGE.md` | Day-to-day STATUS examples |
| `docs/execution/WEEKEND_EXECUTION_QUEUE.md` | Goal 7 packets |
| `docs/product/README.md` | CorpFlow Candidate & Reference Library (Codex cleanup task #4) |

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-18 | Initial utilization plan — product reality sync, Plus-first entitlement, evaluation rubric, server CLI not authorized. |
