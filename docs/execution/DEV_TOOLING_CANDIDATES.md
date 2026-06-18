# Development tooling candidates — CorpFlow Candidate & Reference Library

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Purpose:** Capture **serious candidates** for tools that improve Cursor / Codex **implementation quality** — research, dependency context, and agent acceleration — without authorizing install or production dependency.

**Default verdict on every entry:** `NO IMPLEMENTATION AUTHORIZED` unless Anton separately approves evaluation or install.

**Captured:** 2026-06-18 (index file created with GitHits as first entry).

---

## Index

| Entry | Status | Captured |
| ----- | ------ | -------- |
| [GitHits](#githits--open-source-implementation-context-for-ai-coding-agents) | `SERIOUS-CANDIDATE / DEV-CAPABILITY ACCELERATOR` | 2026-06-18 |

---

## GitHits — open-source implementation context for AI coding agents

**Status:** `SERIOUS-CANDIDATE / DEV-CAPABILITY ACCELERATOR`

**Verdict:** `GITHITS CAPTURED AS DEV TOOLING CANDIDATE — NO INSTALLATION AUTHORIZED`

**URL:** https://githits.com/

**NO IMPLEMENTATION AUTHORIZED** by this capture alone.

### Why Anton added it

- Could reduce Cursor / Codex **retry loops** when agents guess at third-party APIs.
- Could help agents use **real open-source implementation examples** instead of hallucinated patterns.
- Could speed delivery by letting agents inspect **package / source / doc patterns** before coding.
- Could support CorpFlow's broader goal of **faster orchestration and implementation packet delivery** (Operator Bridge, burn-down packets, multi-executor model).

### Claimed capabilities (vendor — verify during evaluation)

| Capability | Notes |
| ---------- | ----- |
| Real implementation examples from public open-source repositories | Primary value proposition |
| Dependency source inspection | Inspect how libraries are actually implemented |
| Documentation and package metadata access | README, registry metadata |
| Version-aware retrieval | Match dependency version context |
| Code search / grep / exact file range reading | Narrow context for agents |
| Package vulnerabilities / changelogs / release notes | Supply-chain awareness |
| MCP-style agent integration | Cursor / IDE agent tooling path |

*Treat vendor claims as **hypotheses** until verified in a bounded operator-side evaluation.*

### Potential CorpFlow use cases

| Use case | Executor |
| -------- | -------- |
| Reduce hallucinated API usage | Cursor (implementation packets) |
| Research SDK / framework patterns before implementation | Cursor |
| Support Cursor packets involving third-party libraries | Cursor |
| Support Codex docs / audit / research packets | Codex Cloud |
| Compare ecosystem implementation patterns before writing code | Cursor or Codex |

**Out of scope for default use:** production runtime, client data in third-party tools without security review, required CI dependency.

### Evaluation plan (ordered — none authorized by this PR)

1. **Docs capture only** — this section (complete).
2. **Local / operator-side evaluation only** — Anton or Cursor on laptop; no CorpFlow production touch.
3. **No production / runtime install** on Vercel, Postgres, or tenant surfaces.
4. **No server / L3 install** on `corpflow-exec-01` or any box.
5. **No GitHub Actions install** — do not add to workflows or repo secrets.
6. **No secrets** — no CorpFlow env vars, tokens, or `MASTER_ADMIN_KEY` passed to GitHits.
7. **One safe dependency / research task** — e.g. read-only pattern lookup for a public npm package used in an approved packet.
8. **Decision gate** — Anton decides whether to permit **local Cursor MCP use** only; separate authorization packet required.

### Risks / questions

| Risk | Mitigation |
| ---- | ---------- |
| GitHub auth scope must be reviewed | Least-privilege; public repos only until scope documented |
| Private repo access claims | **Verify with Anton** before any private-repo token |
| Third-party MCP / tooling must not receive secrets | No `.env`, no production URLs with auth, no client data |
| Agent output still requires review | Normal Cursor / Codex PR + merge discipline unchanged |
| Do not make it a required production dependency | Optional L1 accelerator only |

### Guardrails (this capture PR)

- No installation in this PR.
- No `npx githits@latest init` in this PR.
- No MCP config change in this PR.
- No workflow changes.
- No runtime code.
- No env vars or secrets.
- No server / L3 commands.
- No n8n changes.
- No autonomous merge of implementation work.

### Related canonical docs

- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — third-party AI acceleration bounds.
- `docs/execution/DELIVERY_ACCELERATION_V1.md` — Cursor + Codex executor model.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1 laptop vs L2 vs L3.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — tooling is leverage, not the moat.

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-18 | Index created; GitHits first entry. |
