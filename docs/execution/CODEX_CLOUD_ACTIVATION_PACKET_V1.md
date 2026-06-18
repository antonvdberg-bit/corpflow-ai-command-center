# Codex Cloud activation packet v1

**Packet ID:** `Codex-Cloud-Activation-1`

**Status:** `ACTIVATED FOR BOUNDED DOCS PACKETS` — protocol on `main`; Codex Cloud is acting as L2 executor #2 for `codex/*` docs/audit packets; runtime/server/secret authority remains forbidden.

**Verdict:** `ACTIVATION CAPTURED — NO RUNTIME CHANGE — CODEX DOCS PACKETS ACTIVE`

**Owner:** Approver = Anton. Executor (this packet) = Cursor (docs only). Current live Codex executor packets = **Codex Cloud** on `codex/*` branches after Packet 7.2 activation.

**Captured:** 2026-06-18.

**Companion runbooks (read together):**

- `docs/execution/DELIVERY_ACCELERATION_V1.md` — multi-executor protocol (canonical rules)
- `docs/runbooks/CODEX_CLOUD_INSTALL.md` — click-by-click install sequence (Packet 7.2)
- `docs/operations/OPERATOR_BRIDGE_V1.md` — bridge #249 STATUS schemas
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1/L2/L3 map
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — §2 allowed / §3 gated actions

**Companion policy on `main`:** `docs/execution/CODEX_UTILIZATION_PLAN_V1.md` ([PR #394](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/394), merged) — Plus-first entitlement, evaluation rubric, server CLI not authorized.

---

## 1. Confirmed posture (non-negotiable)

| Layer | Role | Codex |
| ----- | ---- | ----- |
| **L1 — Laptop brain** | **Cursor = primary in-repo executor** | Anton may explore Codex web/CLI personally; that is not CorpFlow infrastructure |
| **L2 — Cloud hands** | Vercel, GHA, Neon, n8n, monitors | **Codex Cloud = bounded executor #2** — runs in **OpenAI infrastructure** |
| **L3 — Box hands** | `corpflow-exec-01-u69678` — operator SSH only | **No Codex CLI, daemon, MCP server, or agent on the box** |

**Also confirmed:**

- **No fourth execution layer** — Codex Cloud is an L2 sub-surface, not L4.
- **Anton** remains merge / secrets / DNS / billing / production authority.
- **Codex gets no autonomous merge authority** — `.github/workflows/cmp-product-automerge.yml` remains `cmp/*` only; Anton merges all `codex/*` PRs.
- **No runtime behavior change** from this packet — docs and operator clicks only.

---

## 2. Current activation state (verified 2026-06-18)

Evidence gathered read-only from repo + GitHub (no install actions by Cursor).

| Item | State | Evidence |
| ---- | ----- | -------- |
| Delivery Acceleration protocol on `main` | **DONE** | `docs/execution/DELIVERY_ACCELERATION_V1.md` |
| Operator Bridge #249 | **OPEN** | [Issue #249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) — *Operator Bridge — Active Work Queue* |
| Codex Cloud install runbook | **DONE** | `docs/runbooks/CODEX_CLOUD_INSTALL.md` |
| Server boundary doc (Codex not on box) | **DONE** | `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` §4.1, §6 |
| Goal 7 Packet 7.1 (protocol docs) | **COMPLETE** | `WEEKEND_EXECUTION_QUEUE.md` |
| Goal 7 Packet 7.2 (install + first packet) | **COMPLETE ENOUGH FOR CODEX DOCS PACKETS** | Codex Cloud is now executing `codex/*` Packet 7.3/7.4 docs work |
| Remote `codex/*` branches | **PRESENT / ACTIVE** | First Codex docs packet branch observed by Packet 7.4 context |
| Codex Cloud GitHub App installed | **ACTIVE FOR DOCS PACKETS** | Codex Cloud is acting as L2 executor #2; bot username may still require doc capture if not recorded elsewhere |
| Codex bot username recorded | **NOT DONE** | `DELIVERY_ACCELERATION_V1.md` §4.1 still generic |
| First Codex packet assigned | **DONE** | Packet 7.3 audit completed; Packet 7.4 remediation in progress |
| Codex `IN_PROGRESS` STATUS on #249 | **ENV-DEPENDENT** | Codex should post when GitHub App permissions/remotes allow; Packet 7.3 noted local posting was unavailable in that checkout |
| Utilization plan on `main` | **MERGED** | [PR #394](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/394) merged |

**Summary:** CorpFlow is **Codex Cloud activated for bounded docs/audit packets**. Remaining work is limited to doc state cleanup, bot-username capture if still missing, and Anton review/merge of `codex/*` PRs; no runtime, server, secret, DNS, billing, or autonomous-merge authority is added.

---

## 3. Today's activation checklist (Anton / operator)

Complete in order. Post a short STATUS comment on [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) when each major step finishes. **Cursor must not perform install clicks or handle secrets.**

### Pre-flight (confirm before any third-party UI)

- [ ] **Confirm Operator Bridge issue #249 exists** and is `OPEN` — [https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249)
- [ ] Confirm `docs/execution/DELIVERY_ACCELERATION_V1.md` is on `main`
- [ ] Confirm no existing `codex/*` branches: `git ls-remote --heads origin 'codex/*'` → empty
- [ ] Confirm AAP §3 hard gates unchanged (`CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`)

### OpenAI / Codex sign-in

- [ ] **Open Codex from Anton's ChatGPT / OpenAI account** (ChatGPT Plus sign-in preferred for cloud tasks + GitHub integration within subscription limits)
- [ ] Do **not** paste credentials into Cursor, repo, `#249`, or PR text
- [ ] API key creation is **fallback only** if Plus sign-in cannot complete cloud + GitHub setup — see `CODEX_CLOUD_INSTALL.md` §2b

### GitHub connection

- [ ] **Connect GitHub** in Codex Cloud setup flow
- [ ] **Scope GitHub App to `antonvdberg-bit/corpflow-ai-command-center` only** — *Only select repositories*, never org-wide
- [ ] Configure permissions per `DELIVERY_ACCELERATION_V1.md` §4.1:

| Permission | Required setting |
| ---------- | ---------------- |
| Contents | Read + write (**non-`main` branches only** if GitHub offers that granularity) |
| Pull requests | Read + write |
| Issues | Read + write |
| Metadata | Read |
| Actions | **Denied** |
| Secrets | **Denied** |
| Environments | **Denied** |
| Administration | **Denied** |
| Webhooks (write) | **Denied** |
| Workflows (write) | **Denied** |

### Branch protection sanity (before first real packet)

- [ ] Confirm `main` requires PR + Anton merge; Codex App identity is **not** in bypass list (`CODEX_CLOUD_INSTALL.md` §5)
- [ ] Confirm `CMP_AUTO_MERGE` / `cmp-product-automerge.yml` does **not** match `codex/*`

### Record identity + assign first packet

- [ ] After first Codex push, **record Codex bot username** in a **follow-up docs-only PR** (update `DELIVERY_ACCELERATION_V1.md` §4.1 with literal `@username`)
- [ ] Confirm **first branch uses `codex/*` prefix** — never shared with Cursor
- [ ] Assign **first packet** (§4) with `Owner: Executor = Codex Cloud`
- [ ] Codex posts first `IN_PROGRESS` STATUS to #249 with `**Executor:** Codex Cloud`

### Explicit prohibitions (activation must not do)

- [ ] **Do not** install Codex CLI / daemon / MCP on `corpflow-exec-01-u69678`
- [ ] **Do not** add env vars, GitHub secrets, or Vercel env for Codex
- [ ] **Do not** grant Codex autonomous merge
- [ ] **Do not** assign runtime / `lib/server/` / first packet outside `artifacts/audits/`

---

## 4. First packet to assign (after activation)

Assign only **after** GitHub App install + branch-protection sanity pass.

| Field | Value |
| ----- | ----- |
| **Packet name** | `Codex Cloud docs consistency audit` |
| **Packet ID** | `Codex-Cloud-Docs-Consistency-Audit-1` |
| **Owner: Executor** | Codex Cloud |
| **Owner: Approver** | Anton |
| **Branch** | `codex/docs-consistency-audit-v1` |
| **Goal** | Verify every path in `AGENTS.md` Must-read table resolves on disk |
| **Allowed output** | `artifacts/audits/<YYYY-MM-DD>-docs-consistency.md` **only** |
| **Forbidden** | Any path outside `artifacts/audits/`; secrets; runtime edits; merge by Codex |
| **STATUS** | `#249` at `IN_PROGRESS` → `AWAITING_APPROVAL` with `**Executor:** Codex Cloud` |
| **Merge** | Anton only, after CI green + diff review |

**Packet text for `WEEKEND_EXECUTION_QUEUE.md` Goal 7:**

```text
### Packet 7.3 — Codex Cloud docs consistency audit (first live packet)

- **Goal:** Codex Cloud produces artifacts/audits/<YYYY-MM-DD>-docs-consistency.md verifying AGENTS.md Must-read paths exist on disk.
- **Owner:** Approver = Anton. Executor = Codex Cloud. Reviewer = Anton.
- **Branch:** codex/docs-consistency-audit-v1
- **Allowed paths:** read entire repo; write only artifacts/audits/<YYYY-MM-DD>-docs-consistency.md
- **Forbidden:** all runtime paths; no secrets; no merge by Codex
- **Status:** COMPLETE / AWAITING REVIEW; Packet 7.4 is the follow-up P2 docs-only remediation packet
- **Bridge:** STATUS posts to #249 with **Executor:** Codex Cloud
```

---

## 5. Remaining operator steps (ordered summary)

1. **Merge [PR #394](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/394)** (Codex utilization plan) when satisfied — optional before install but recommended.
2. **Merge this activation packet PR** when satisfied.
3. **Run §3 Today's activation checklist** — Anton clicks only; follow `CODEX_CLOUD_INSTALL.md` for detail.
4. **Review Packet 7.3 / Packet 7.4 PRs**; Anton remains the only merge authority.
5. **Codex executes** assigned docs packet → PR → Anton review → Anton merge.
6. **Follow-up docs PR** — record Codex bot username in `DELIVERY_ACCELERATION_V1.md` §4.1.
7. **One-week evaluation** — per utilization plan rubric after first merge (when PR #394 on `main`).

---

## 6. What Cursor / Codex must not do in this activation phase

| Actor | Forbidden |
| ----- | --------- |
| **Cursor** | Install GitHub App; handle OpenAI keys; run L3/server commands; merge Codex PRs without Anton |
| **Codex Cloud** (once live) | Merge own PRs; touch forbidden paths; push to `main`; share branches with Cursor; read repo secrets |
| **Anyone** | Install Codex on `corpflow-exec-01`; add fourth execution layer; change n8n / env / runtime |

---

## 7. Activation complete when (definition of done)

Activation is **operationally complete** (not just protocol on `main`) when **all** hold:

1. Codex Cloud GitHub App visible under repo **Settings → Integrations** (this repo only).
2. Codex bot username recorded in repo docs.
3. First `codex/*` PR opened for Packet 7.3; diff ⊆ `artifacts/audits/`.
4. First `**Executor:** Codex Cloud` STATUS on #249.
5. Anton merges first Codex PR (or closes with documented reason).
6. No secrets in PR text, commits, or artifacts.
7. `corpflow-exec-01` unchanged — no Codex CLI/daemon installed.

**Delivery Reality:** activation does not require production URL checks; it requires **observable GitHub + #249 evidence** above.

---

## 8. Rollback

1. GitHub → Settings → Integrations → Codex Cloud App → **Uninstall**.
2. Revoke OpenAI key if API-key path was used.
3. Close open `codex/*` PRs without merge.
4. Post `HOLDING` on #249.
5. Cursor continues as sole in-repo executor until re-activation.

---

## 9. Cross-references

| Doc | Role |
| --- | ---- |
| `docs/execution/DELIVERY_ACCELERATION_V1.md` | Canonical multi-executor rules |
| `docs/runbooks/CODEX_CLOUD_INSTALL.md` | Detailed install clicks |
| `docs/runbooks/OPERATOR_BRIDGE.md` | STATUS comment examples |
| `docs/execution/WEEKEND_EXECUTION_QUEUE.md` | Goal 7 packets 7.2 / 7.3 |
| `docs/decisions/JOURNAL.md` | `JE-2026-05-28-2` — Codex Cloud runtime decision |

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-18 | Initial activation packet — state snapshot + operator checklist + first packet assignment. |
