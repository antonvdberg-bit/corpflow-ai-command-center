# CMP sandbox PRs: no empty merge to `main`

## How you verify “no new product code” (logic check)

Use **any one** of these — they should agree:

1. **GitHub → open the merged PR → tab “Files changed”**  
   If it says **0 files** (or only shows nothing substantive), **no product diff** reached `main`.

2. **Compare on GitHub**  
   `https://github.com/<org>/<repo>/compare/main@{before-merge}...main@{after-merge}`  
   Or compare **`main`** to the **merge commit’s parent** before squash — **empty squash ⇒ no file list**.

3. **API (authoritative for automation)**  
   `GET /repos/{owner}/{repo}/pulls/{number}/files` — if the list is **empty**, the PR introduced **no file changes** vs base.

4. **Local** (full clone):  
   `git fetch origin && git diff origin/main...origin/cmp/<ticket_id> --stat`  
   Empty stat ⇒ no code delta on that branch vs `main`.

**Note:** An **empty commit** (sandbox bootstrap) has the **same tree** as its parent, so the **PR diff vs `main` is still empty** until someone adds commits that touch files.

## What we enforce in CI (factory default)

Workflow **`.github/workflows/cmp-pr-delivery-gate.yml`** runs on pull requests **into `main`** whose **head branch** is **`cmp/*`**.

- If the PR has **zero** entries in **`pulls/listFiles`**, the check **`cmp-delivery-files`** **fails**.
- That **blocks merge** (once you add this check to **branch protection** as required).

**Draft PRs** are skipped so you can open a draft without failing the gate until you mark it ready.

## “Circular tests until deliverables are met”

**Makes sense** as a **product goal**: don’t treat “merge” as done until **evidence** matches the request (outcomes, checks, preview, Technical Lead gaps, etc.).

**Why it was not implemented earlier**

1. **Different scope** — Prior work focused on **unblocking** merges (CI not firing), **explaining** why Lux looked unchanged, and **wiring** sandbox automation. A **merge policy** (what may land on `main`) is a separate product decision.
2. **Sandbox design** — **`cmp-branch.yml`** deliberately adds an **empty** commit so GitHub allows a PR when head/base would otherwise be identical. That’s useful for **reserving** a branch, but it **should not** end in a **merge to `main`** until real files exist — that’s what the new gate fixes.
3. **“Deliverables met” is not one boolean** — File count is **necessary** but not **sufficient**. A fuller loop needs agreed rules: **completion scorecard**, **Technical Lead** gaps, **UAT**, **tenant signoff**, etc. Those hook into existing pieces (`/change` checklist, `technical-lead-*`, Postgres) but need **explicit policy** (what blocks merge, who overrides).

## What you should do in GitHub

1. Merge the workflow to **`main`** and let Vercel deploy.  
2. **Settings → Branches → Branch protection** on **`main`** → **Require status checks** → enable **`cmp-delivery-files`** (exact name from Actions UI after first run).  
3. Optional: keep **`CMP_AUTO_MERGE`** off until you trust gates; or leave it on — it won’t merge if **`cmp-delivery-files`** fails.

---

*Last updated: 2026-04-10.*
