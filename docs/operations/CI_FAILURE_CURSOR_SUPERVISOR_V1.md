# CI failure → Cursor repair supervisor (v1)

**Status:** Implemented in-repo. Live follow-up requires `CURSOR_API_KEY` in Actions secrets (already used by Factory dispatcher activate).

**Control issue:** #661  
**Related:** #653 lifecycle claim labels; PR #665 incident proof

## What it does

When **Agent CI** completes on a pull_request:

| Conclusion | Action |
|------------|--------|
| `failure` | Map PR → Cursor agent/run via origin metadata → sanitised failure packet → `POST /v1/agents/{id}/runs` follow-up (same agent) or one PR-bound repair agent → label `dispatch:ci-repair` |
| `success` | If PR is Cursor-lifecycle, post **OPERATOR REVIEW REQUIRED** packet (no auto-merge) → label `dispatch:operator-review` |

## Guards

- Open PR only
- Known Cursor origin (agent id and/or run id from PR body / origin metadata comment)
- Max **2** automatic repair attempts per PR
- Fingerprint dedupe (same failure not re-sent)
- Cooldown between attempts
- File-backed cost/dedupe state (`.ci-repair-state/`, Actions cache) — **no second DB**
- Escalation comment when exhausted

## Origin metadata

Marker comment on the source issue (written after follow-up / claim):

`<!-- corpflow.cursor_origin_metadata.v1 {...} -->`

Also heuristically parses `bc-…` / `run-…` from PR body (Cursor PR footer) and activation comments.

## Lifecycle labels

Auto-created if missing:

- `dispatch:cursor-claimed`
- `status:in-progress`
- `dispatch:blocked`
- `needs:anton`
- `dispatch:ci-repair`
- `dispatch:operator-review`

Claim still requires a **real Cursor run ID** (`finalizeIssueClaimAfterActivation`).

## Manual recovery

```bash
# Dry-run packet for a failed Agent CI run
CI_SUPERVISOR_WORKFLOW_RUN_ID=30417364180 \
CI_SUPERVISOR_CONCLUSION=failure \
CI_SUPERVISOR_DRY_RUN=1 \
GITHUB_TOKEN=… \
node scripts/ci-failure-cursor-supervisor.mjs --mode failure

# Ensure labels + claim #653 after a known run id
# (workflow_dispatch mode=labels on CI Cursor repair supervisor)
```

## Explicit non-actions

No merge, no production deploy, no secret rotation, no DB/schema, no payment/messaging/outreach.
