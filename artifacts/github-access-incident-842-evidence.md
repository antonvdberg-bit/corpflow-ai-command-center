# #842 GitHub access incident — evidence pack

**As of:** 2026-08-10T05:28Z UTC  
**Executor:** Cursor Cloud `bc-004a5cd5-12f4-4103-94cb-f612a071fe5e`  
**Branch:** `cursor/dispatcher-issue-842-8eb4`  
**Probe identity:** `cursor[bot]` / GitHub App `cursor` (installation token `ghs_*` — value never recorded)

## Verdict

```text
BLOCKED — Anton: open GitHub → Settings → Integrations → GitHub Apps → Cursor → Repository access for antonvdberg-bit/corpflow-ai-command-center → set Issues = Read and write and Pull requests = Read and write → Save / re-authorize. Then close accidental probe issue #843 (not_planned). Optional immediate unblock without App change: ChatGPT GitHub connector (already working) apply dispatch:cursor-ready to the next Café International execution packet (#797 or a fresh child of #760).
```

## Exact failure mode

**Layer:** Cursor GitHub App installation permissions for Cloud agent `gh` / REST writes — **not** ChatGPT connector, **not** factory dispatcher activation, **not** missing local PAT.

| Path | Status | Evidence |
|------|--------|----------|
| ChatGPT GitHub connector read/write | Working (operator-stated on #842) | Issue body comparison baseline |
| Cursor Cloud issue-dispatch activation | Working | #840 + #842 activated (`factory-dispatcher-activate` runs 31358220840 / 31358538111) |
| Cursor Cloud `gh` issues **read** | Working | `gh issue view 760` → title/state/body fetched |
| Cursor Cloud **git push** (contents) | Working | `git push --dry-run` + branch push to `cursor/dispatcher-issue-842-8eb4` |
| Cursor platform PR open (`ManagePullRequest`) | Working (observed on peers) | #840 → PR #841 authored via platform path |
| Cursor Cloud `gh` issues **comment / edit / close / label** | **FAIL 403** | `Resource not accessible by integration`; header `X-Accepted-Github-Permissions: issues=write; pull_requests=write` |
| Cursor Cloud `gh` pulls **create** | **FAIL 403** | Same fingerprint; header `X-Accepted-Github-Permissions: pull_requests=write` |
| Cursor Cloud `gh` workflow_dispatch | **FAIL 403** | Same fingerprint (known since `artifacts/track-a-live-dispatch-661-evidence.md`) |

Fingerprint (safe, no secrets):

```text
HTTP 403
message: Resource not accessible by integration
X-Accepted-Github-Permissions: issues=write; pull_requests=write
actor: cursor[bot]
```

## Previously blocked workstream proof (#760)

| Check | Result |
|-------|--------|
| Fetch issue #760 | **PASS** — `Client Migration — Café International \| Website Rescue Pilot 01` (OPEN, body length 4708) |
| Related open packets visible | **PASS** — #764, #784, #785 (unlabelled); #797 (`dispatch:operator-review`); draft PR #798 |
| Create durable evidence from this agent | **PASS** — this artifact + PR on branch `cursor/dispatcher-issue-842-8eb4` |
| Enter automatic Cursor dispatch from this agent | **BLOCKED** — cannot apply `dispatch:cursor-ready` / claim labels via `gh` (403); programme issues #760/#764/#784/#785 currently have **zero** dispatch labels |

## Working paths to use until App permissions are fixed

1. **Durable code/docs evidence:** git push + Cursor `ManagePullRequest` (do not rely on `gh pr create`).
2. **Issue comments / labels / close:** ChatGPT GitHub connector (standing authorization already recorded) **or** GitHub Actions `GITHUB_TOKEN` workflows — not Cursor Cloud `gh`.
3. **Do not** ask Anton to paste a PAT into chat/issues/agent env for this incident.

## Accidental probe issue

Diagnosis created **#843** (`probe-do-not-keep`) via `issues.create` (unexpectedly allowed). Close/edit/comment on it from this agent → **403**. Operator or ChatGPT connector must close #843 as `not_planned`.

## What this is not

- Not ChatGPT connector outage (connector stated working).
- Not factory dispatcher inability to activate Cursor (#840/#842 prove activation).
- Not a request to build a second dispatcher/bridge.
- Not an env/secrets/DB/deploy change.

## Unblock checklist (operator)

1. Re-authorize **Cursor** GitHub App on this repo with **Issues: Read and write** and **Pull requests: Read and write**.
2. Close **#843**.
3. Apply `dispatch:cursor-ready` to the next Café International / tester execution packet that should run (recommend starting from #797 or a scoped child of #760 — not the whole programme issue unless intended).
4. Re-run one Cursor Cloud agent and confirm: `gh api -X POST .../issues/<n>/comments` returns **201** (body can be a one-line ping).
