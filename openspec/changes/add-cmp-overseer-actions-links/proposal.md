# Change: Add CMP overseer view + GitHub Actions run links

## Why
Operators approving builds need immediate, reliable visibility into what automation did (workflow run link + audited diff view) to ensure the Change Console does not drift from intended designs.

## What Changes
- Return a **best-effort GitHub Actions run link** after CMP sandbox dispatch.
- Add an **Overseer view** in the Change Console to show what automation changed (commits + files) for a ticket’s sandbox branch.
- Keep the existing CMP approve flow working against Postgres-backed tickets.

## Impact
- Affected surfaces: CMP API (`approve-build` / sandbox dispatch), Change Console UI (`public/change.html`)
- External dependency: GitHub REST API (read-only calls for runs/compare)
- Security: GitHub token used only server-side; UI receives links + metadata only (no secrets)

