# Workspace: `C:\Users\anton` vs `C:\CorpFlow\corpflow-ai-command-center`

This note records a **safe consolidation**: one canonical repo, one Cursor root, no duplicate “shadow” copies.

## What we compared (summary)

| Location | Role |
|----------|------|
| **`C:\CorpFlow\corpflow-ai-command-center`** | **Canonical Git repo** — this is the real codebase, `origin/main`, Vercel deploys from here. **Work here.** |
| **`C:\Users\anton`** | **Windows user profile** — not a project folder. Cursor sometimes opens it as **“empty window”** / home; that makes tools, paths, and rules confusing. **Do not treat home as the repo root.** |
| **`C:\Users\anton\.cursor\projects\...`** | Cursor cache: transcripts, terminals, MCP config. **Not your source code.** Safe to leave; optional cleanup below. |

There is **no requirement** to keep a second clone of the app under `C:\Users\anton` for normal work.

## Decisions (locked in)

1. **Single place for code:** `C:\CorpFlow\corpflow-ai-command-center`
2. **Secrets / env:** Keep **one** `.env` (or Vercel env) for the app — **inside the repo folder** (gitignored). Avoid duplicating `.env` on the user profile root.
3. **Cursor:** Open the **folder** `C:\CorpFlow\corpflow-ai-command-center` (File → Open Folder), not `C:\Users\anton`.

## What to do in Cursor (you)

1. **File → Open Folder…** → `C:\CorpFlow\corpflow-ai-command-center`
2. Close any window whose root is only **`C:\Users\anton`** (the “empty” / home workspace), once you’re done with that chat if you still need it.
3. Optional: **Pin** the CorpFlow folder to **Recent** / taskbar so you always land there.

## Optional cleanup (only if you want less noise)

- **`…\.cursor\projects\empty-window`** — Cursor data for the home workspace. You can delete **after** you no longer need old chats tied to that window. **Not urgent.**
- **`…\.cursor\projects\c-Users-anton-OneDrive-Documents-Visibili-t-CorpFlowAI-cursor`** — Old project path. Same rule: delete only if you’ve confirmed nothing you need in those transcripts.
- **Do not** delete the whole **`C:\Users\anton\.cursor`** tree unless you understand you’ll lose local Cursor history for all projects.

## Operational command (from the repo)

```bash
npm run ci:report
```

Human-readable GitHub Actions status (needs `gh auth login` or `GITHUB_TOKEN`).

## Agent / automation note

For AI sessions that should edit this repo, the workspace root should be **`C:\CorpFlow\corpflow-ai-command-center`** so git, terminals, and file tools align with production.
