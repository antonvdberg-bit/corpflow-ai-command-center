# Git: default branch `main` vs a file named `main`

## What went wrong (fixed in-repo)

This repository once had a **tracked, empty file** at the **repository root** literally named **`main`** (no extension). Git then reported:

`fatal: ambiguous argument 'main': both revision and filename`

because `main` matched **both** the default branch and that path.

**Permanent fix:** do **not** keep a tracked file or directory named `main` at the repo root. The stray file was removed; keep it out going forward.

## How this affects you (GitHub / Vercel / access)

| Area | Impact |
|------|--------|
| **GitHub** | **None.** Your default branch stays **`main`**. No permission or setting change is required. |
| **Vercel** | **None.** Production branch and deploy hooks are unchanged. |
| **Your laptop / CI** | **Local Git only.** Commands like `git log main` or `git diff main` could confuse Git **if** a root-level `main` file ever reappears. |

You do **not** need to update GitHub or Vercel access for this fix.

## If ambiguity ever comes back

Prefer an unambiguous ref:

```powershell
git log refs/heads/main -5 --oneline
git diff refs/heads/main -- path/to/file
```

Or rename/remove the conflicting path (never commit `main` as a filename at the root).

## For assistants / scripts

- Prefer **`refs/heads/main`** in automation when passing a revision to Git on Windows-heavy repos.
- After `git checkout` or `git switch`, using **`HEAD`** is often enough and avoids the ambiguity entirely.
