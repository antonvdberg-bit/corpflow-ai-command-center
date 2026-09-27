# Weekly GitHub Delivery Health Digest v1

**Status:** Proposed canonical digest format  
**Controller:** #1351  
**Source of truth:** GitHub issues/PRs and linked runtime evidence

## Purpose

Give the operator one short weekly view of whether CorpFlowAI is converting work into client-reviewable, client-approved and live-validated outcomes.

This is not an activity report. It is a delivery-health report.

## Data to inspect

Each digest should inspect:
- all open issues;
- open PRs;
- issues labelled delivery, revenue, priority:P0, priority:P1;
- issues marked blocked/paused/operator-review;
- issues with no update in 30+ days;
- client/prospect controlling issues;
- linked preview/live/browser evidence where available;
- protected decisions waiting on Anton.

## Core metrics

Report:
- open issues total;
- open PRs total;
- P0 open;
- P1 open;
- blocked count;
- paused count;
- stale >30 days;
- stale >60 days;
- client-review-ready items;
- live-validation-ready items;
- revenue work with no visible next deliverable.

Metrics are indicators, not performance scores.

## Mandatory sections

### WHAT MOVED
Only include changes with evidence:
- preview created;
- browser verification completed;
- client review requested/received;
- approval recorded;
- PR merged;
- production deployment approved/executed;
- live validation completed;
- blocker cleared;
- quotation/invoice/commercial milestone reached.

Do not count new architecture/docs alone as movement unless the deliverable itself is the required product.

### CLIENT / REVENUE PIPELINE
For each active client/opportunity:
`Client | stage | next visible deliverable | commercial significance | blocker | owner | Anton needed?`

### BLOCKED / WAITING
State the exact missing dependency:
- client decision;
- provider/access;
- protected gate;
- missing evidence;
- implementation required;
- commercial decision.

### STALE / DUPLICATE CANDIDATES
Flag issues that:
- have had no meaningful update for 30+ days;
- are superseded by a newer controller;
- duplicate a surviving workstream;
- remain P0 despite no current execution path;
- contain historic execution detail better retained as closed history.

Do not auto-close ambiguous live obligations.

### APPLICATION CONSOLIDATION
Report:
- new standalone/fragmented surfaces created this week: expected zero unless explicitly justified;
- routes classified CANONICAL / REUSE / MIGRATE / TEMPORARY / RETIRE;
- progress toward Operating Workspace + Tenant Workspace;
- any duplicate data/auth/control plane risk.

### NEXT 7 DAYS
List at most five outcomes, ordered:
1. revenue/client protection;
2. client review/approval;
3. cutover/live validation;
4. unblock P0/P1;
5. background consolidation.

Each must have one owner and a visible finish condition.

### ANTON DECISIONS
List only decisions that truly require operator authority. Each item must include:
- exact decision;
- recommended smallest safe option;
- consequence of deferring;
- protected action involved, if any.

### SYSTEMS TO KEEP OPEN / CLOSED
Tell Anton what he needs open during the coming week. Default closed unless a concrete action requires it.

## Staleness rules

- **Fresh:** meaningful evidence/update within 7 days.
- **Aging:** 8–30 days without meaningful progress.
- **Stale:** >30 days.
- **Deep stale:** >60 days.

A comment that merely restates status does not reset staleness. Meaningful progress changes evidence, blocker, owner, decision or deliverable.

## Duplicate-control rule

Prefer one surviving controller per outcome.

When overlap is detected:
1. identify canonical issue;
2. move current next action/evidence there;
3. close/supersede the duplicate only where evidence is clear;
4. preserve history;
5. leave ambiguous obligations open and mark NEEDS_REFRESH.

## Example compact digest

```text
WEEKLY DELIVERY HEALTH — YYYY-MM-DD

Estate:
53 open issues | 0 open PRs | 22 P0 | 5 P1 | 1 blocked
13 stale >30d | 2 deep stale >60d

WHAT MOVED
- Client A preview PASS; client review next.
- Client B cutover reconciled; live validation PASS.

BLOCKED
- Client C — provider access; owner client.
- Payment gateway — operator/protected action.

STALE / DUPLICATE
- #xxx likely superseded by #yyy — evidence...
- #zzz needs refresh; obligation unclear.

NEXT 7 DAYS
1. ...
2. ...

ANTON NEEDED?
Only for ...

OPEN
ChatGPT; browser profile only during portal review.

CLOSED
Server SSH, DB console, payment portal unless explicitly required.
```

## Automation posture

The digest can later be scheduled through n8n/ChatGPT automation, but the first implementation should remain a simple GitHub-read workflow. Do not build another dashboard or production data store for it.
