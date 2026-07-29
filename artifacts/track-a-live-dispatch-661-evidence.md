# Track A — Live dispatcher validation evidence (#661)

**Generated:** 2026-07-29T00:32:00Z  
**Branch:** `cursor/track-a-live-dispatch-661-1e9e`  
**Verdict:** PARTIAL — repairs applied; full live `cursor_live` cycle blocked on operator secrets + workflow dispatch permission

## Discovery / classification (local scan with `GITHUB_TOKEN`)

```json
{
  "readyCount": 4,
  "readyIssueNumbers": [653, 654, 658, 661],
  "claimedCount": 0,
  "eligibleIssueNumbers": [653, 658, 661],
  "claimIssueNumbers": [653, 658],
  "activationTargetIssue": 653
}
```

- **#653** — claim (lead-rescue product stream)
- **#654** — discover_only (sibling product hold vs #653)
- **#658** — claim (ops lane; parallel with #653)
- **#661** — eligible after repair (was blocked by secrets/payment false positives from Protected gates prohibition list)

## Scheduled scan handoff simulation (post-repair)

```bash
DISPATCHER_ACTIVATION_MODE=dry_run \
DISPATCHER_ACTIVATION_EVENT_NAME=schedule \
DISPATCHER_ACTIVATION_TARGET_SOURCE=issue_scan \
DISPATCHER_ACTIVATION_TARGET_ISSUE=653 \
node scripts/dispatcher-agent-activation.mjs --fetch --activate
```

**Result:** `Direct-issue activation: #653` — `WOULD_ACTIVATE_CURSOR_CLOUD_API` (no `scheduled_run_forbidden` throw).

## GitHub Actions

| Item | Value |
|------|-------|
| Latest scheduled run | `30406962357` (2026-07-28T23:07:23Z) |
| Mode observed | `dry_run` — `CURSOR_LIVE_ENABLED` **not set** in repo (logs show empty) |
| Manual `gh workflow run` | **403** Resource not accessible by integration (Cursor cloud agent token) |
| Post-#655 merge run | **Pending** — no scheduled run after 00:15Z merge at time of writing |

## Defects found and repaired (this branch)

1. **Scheduled scan handoff blocked** — `validateDirectIssueActivationContext` rejected all `target_issue` on `schedule`, breaking issue-scan → activator path. Fixed via `issueScanHandoff` + `DISPATCHER_ACTIVATION_TARGET_SOURCE=issue_scan`.
2. **#661 protected-gate false positives** — Prohibition-list text (`env/secret change`, `payment`, … `without Anton approval`) misclassified as active gates. Fixed with `forbidsSecretsChange` + protected-gates prohibition override.
3. **Ops gap (not code)** — Context said `CURSOR_LIVE_ENABLED` enabled; production logs prove it is **unset**. Scheduled runs remain `dry_run` until repo variable/secret is set.

## Operator steps to complete live cycle (after PR merge)

1. Set repository variable `CURSOR_LIVE_ENABLED=true` (Settings → Secrets and variables → Actions → Variables).
2. Confirm `CURSOR_API_KEY` secret is present.
3. Manually run **Factory dispatcher activate** on `main` with `activation_mode=cursor_live` (do **not** force `target_issue` — auto-select #653).
4. Verify artifact `dispatcher-activation-result`: real Cursor run ID, claim labels on source issue, no duplicate on second run.

## Tests

```bash
node --test node-tests/cursor-issue-dispatch-lifecycle.test.mjs \
  node-tests/dispatcher-direct-issue-activation.test.mjs \
  node-tests/dispatcher-agent-activation.test.mjs \
  node-tests/dispatcher-cursor-activation.test.mjs
# 57 pass / 0 fail
```

## Delivery Reality Audit

```
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO (repair PR pending)
- Production deployment ID: n/a (dispatcher workflow only)
- Commit deployed: n/a
- Live URLs tested: n/a (control-loop validation)
- Expected vs actual result: scan/classify OK; cursor_live activation not yet executed
- Client-facing flow usable: n/a
- Final verdict: PARTIAL
```
