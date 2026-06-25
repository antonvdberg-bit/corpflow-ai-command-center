# US Medspa Revenue-Machine Inputs — capture status

> **Status:** NOT YET CAPTURED — capture-status / pointer note only.
> **This file is NOT the Codex artifact.** It contains no Codex research content.
> It records the reference to a Codex-produced artifact that **could not be
> imported**, plus the exact next action required to capture it.
> **NO IMPLEMENTATION AUTHORIZED.** No runtime code, dependencies, env vars,
> DB schema/data, Vercel config, GitHub settings, routes, deployment, secrets,
> analytics, or `tenant_id` handling are changed by this file.

Authorized by Operator Bridge issue
[#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249)
(`DISPATCH_TO_CURSOR` — marketing automation / collateral / Google tooling docs
update after PR #459). Governed by the dispatch / executor boundaries in
`docs/operations/OPERATOR_DISPATCH_ROUTER.md` (merged via PR #459): **Codex is a
research / data / script worker only and never owns PRs**; Cursor imports a Codex
artifact only from a verifiable branch / full Git SHA.

---

## 1. What this artifact is supposed to be

A Codex-produced research artifact capturing the **inputs** to the first US
medspa "revenue machine" workflow — the prospect-discovery / audit / fit-score /
outreach-draft pipeline already described as an operating standard in
`docs/marketing-automation-arm.md`. It is intended as **reference research**, not
new collateral, and must not duplicate the canonical playbook.

This note exists so the artifact has a single, canonical capture-status home and
so the inventory in `docs/marketing/MARKETING_COLLATERAL_INVENTORY.md` can point
here instead of carrying a stale reference.

## 2. Reference supplied by the operator dispatch

| Field | Value |
|-------|-------|
| Intended repo path | `docs/marketing/research/us-medspa-revenue-machine-inputs.md` |
| Source repo | `antonvdberg-bit/corpflow-ai-command-center` |
| Source branch | `work` |
| Full commit SHA | `5a216e35da4795b998749cb8aae574154f317bf1` |

## 3. Import verification (2026-06-25)

Cursor attempted to fetch the artifact from the supplied references. **All
lookups failed**, so the artifact **cannot be imported**:

| Check | Command | Result |
|-------|---------|--------|
| Commit object present locally | `git cat-file -t 5a216e35…` | `fatal: could not get object info` (not present) |
| File at SHA via GitHub API | `gh api .../contents/…?ref=5a216e35…` | HTTP **404** — `No commit found for the ref 5a216e35…` |
| Branch `work` via GitHub API | `gh api .../branches/work` | HTTP **404** — `Branch not found` |
| Branch `work` on origin | `git ls-remote --heads origin work` | empty (no such branch) |

Conclusion: the commit `5a216e35…` and the branch `work` are **not reachable on
`antonvdberg-bit/corpflow-ai-command-center`**. Importing now would mean
fabricating content, which is prohibited. Therefore the artifact stays
**NOT YET CAPTURED**.

## 4. Exact next action (to make this importable)

Pick **one**, then Cursor imports it in a separate docs-only PR:

1. **Push the branch to the source repo.** Codex / operator pushes branch `work`
   (containing the file at commit `5a216e35da4795b998749cb8aae574154f317bf1`) to
   `antonvdberg-bit/corpflow-ai-command-center`. Once
   `gh api repos/antonvdberg-bit/corpflow-ai-command-center/branches/work`
   returns **200**, Cursor imports the file as-is.
2. **Provide a reachable full SHA or PR.** Supply a commit SHA that resolves on
   the repo (or open a Codex-authored branch/PR for Cursor to import from), and
   Cursor verifies + imports.
3. **Paste the artifact into #249.** Codex pastes the full artifact body into a
   `#249` comment; Cursor imports the pasted content into this path in a
   docs-only PR.

Until one of these is satisfied, this file remains a status note and must not be
treated as captured research.

## 5. Guardrails

- Docs-only. No runtime code, DB migrations, env vars, secrets, Vercel/GitHub
  settings, dependency changes, or production deployment.
- Does **not** duplicate canonical collateral. The revenue workflow is canonical
  in `docs/marketing-automation-arm.md`; the inventory is in
  `docs/marketing/MARKETING_COLLATERAL_INVENTORY.md`; Google-tool bounds are in
  `docs/strategy/GOOGLE_ACCELERATION_LANE.md`.
- **Codex does not own PRs.** Cursor owns repo/docs PR implementation per
  `docs/operations/OPERATOR_DISPATCH_ROUTER.md`.
- No second app, no second database, no CRM, no automated cold outreach.
