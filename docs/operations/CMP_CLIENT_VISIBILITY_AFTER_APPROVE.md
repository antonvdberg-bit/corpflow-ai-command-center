# What clients see after **Approve build** (Lux / Change Console)

## Same app, different surfaces

- **`https://lux.corpflowai.com/change`** — Change Console (ticket, estimate, approve, progress). It reads **Postgres + GitHub-derived fields** in `console_json`.
- **`https://lux.corpflowai.com/`** (and other tenant pages) — **Public site**. It only changes when **merged code** actually edits those pages (or shared assets) and **Vercel production** has deployed.

So: **approving a build does not, by itself, change the public homepage.** It starts (or continues) **factory + GitHub** work.

## Empty sandbox PR = no visible site change

CMP automation often creates a sandbox branch with an **empty commit** so a pull request can exist **before** engineers land real edits. If that PR is merged with **zero file changes** vs `main`, **production looks the same** — that is **expected**, not a failed deploy.

To see **what** shipped, use the **pull request** on GitHub (“Files changed”) or the **Compare** link in Change Console when present.

## Automation in GitHub (no laptop required)

After approve-build, **CMP Sandbox Branch** (GitHub Actions) should:

1. Create or update **`cmp/<ticket_id>`** and open a PR to **`main`**.
2. **Merge `main` into the sandbox branch** so the PR stays mergeable when `main` moves.
3. **Dispatch** **Agent CI** and **Vercel env check** on that branch so required checks appear (GitHub often does not run those automatically when the only actor is `GITHUB_TOKEN` in the same repo).

Configure optional **callback** secrets (`CMP_AUTOMATION_CALLBACK_URL` + `CMP_AUTOMATION_CALLBACK_SECRET`) so PR metadata can be written back into Postgres for the Change Console.

## Verify production actually updated

1. Vercel → **Production** deployment → commit matches **`main`** after the PR merged.
2. GitHub → merged PR → **Files changed** count &gt; 0 if you expect a visual change.
3. Change Console → **Refresh from server** under Ticket ID.

---

*Last updated: 2026-04-10 — aligns with `.github/workflows/cmp-branch.yml` and tenant Build status copy on `/change`.*
