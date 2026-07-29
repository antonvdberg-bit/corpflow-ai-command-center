# Cursor dispatch lifecycle — comment drafts for #653 / #654
#
# Cloud Agent GitHub token is issues:read only, so these comments cannot be
# posted from the agent session. After the dispatcher PR merges, the scheduled
# Factory dispatcher activate job (issues:write) posts equivalent comments once.
# Operator may also paste these into the issues for immediate visibility.

## Linked PRs (this run)

| Workstream | Branch | PR |
|------------|--------|-----|
| Dispatcher lifecycle | `cursor/ops-segregated-dispatch-lifecycle-1e9e` | https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/655 |
| #653 Lead Rescue | `cursor/lead-rescue-productise-653-1e9e` | https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/656 |
| #654 Website Rescue | `cursor/website-rescue-productise-654-1e9e` | https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/657 |

## Agent / run

- Started: 2026-07-28T07:42:00Z (approx)
- Cloud Agent GitHub token: `issues:read` only — cannot post issue comments or create labels from this session.

## Concurrency decision

- Start #653 first (Lead Rescue).
- #654 Website Rescue: discover + classify only until #653 claim advances; sibling products sequential by default.
- Separate branches/PRs required for both.
- Dispatcher lifecycle PR is a separate ops workstream (no product coupling).

---

## Issue #653 — paste block

### Discovery

```text
CURSOR DISPATCH DISCOVERED

Issue: #653
Priority: priority:P0
Classification complete: Yes
Eligible to claim: Yes
Reason: Labelled dispatch:cursor-ready; CorpFlowAI business-system productisation of Lead Rescue; protected gate none for docs/preview packaging slice; existing /lead-rescue + intake + admin cockpit reusable.
Next action: Claim on branch cursor/lead-rescue-653-1e9e; open separate PR; do not combine with #654.
```

### Classification

```text
WORK CLASSIFICATION

Issue: #653
System boundary:
- CorpFlowAI business system

Tenant or client:
- N/A

Environment:
- preview

Work type:
- documentation / ui / validation

Protected gate:
- none

Execution isolation:
- separate branch required: yes
- separate PR required: yes
- may run concurrently with other work: no
- reason: Sibling of Website Rescue (#654) — sequential by default.

Product workstream: lead-rescue (must not merge with sibling product streams)
```

### Claim

```text
CURSOR WORK CLAIMED

Issue: #653
Execution owner: Cursor
Agent/run identifier: bc-a4c5a692-3f2f-42ea-9c44-fea955071e9e
Branch: cursor/lead-rescue-productise-653-1e9e
Workstream: lead-rescue
Tenant/client: N/A
Environment: preview
Started: 2026-07-28T07:42:00Z
Protected gate encountered: No
Expected outputs:
- consolidated product / quotation / delivery pack
- linked PR
- tests/build evidence where code touched
- demonstration path evidence against existing /lead-rescue surfaces
```

---

## Issue #654 — paste block

### Discovery

```text
CURSOR DISPATCH DISCOVERED

Issue: #654
Priority: priority:P0
Classification complete: Yes
Eligible to claim: No (WIP / sibling-product hold behind #653)
Reason: Eligible product workstream but segregation rules require Lead Rescue (#653) to start first; separate branch/PR when claimed.
Next action: Hold claim; re-scan after #653 claim advances or Anton authorises safe parallel file areas.
```

### Classification

```text
WORK CLASSIFICATION

Issue: #654
System boundary:
- CorpFlowAI business system

Tenant or client:
- N/A

Environment:
- preview

Work type:
- documentation / ui / validation

Protected gate:
- none

Execution isolation:
- separate branch required: yes
- separate PR required: yes
- may run concurrently with other work: no
- reason: Sibling of Lead Rescue (#653) — sequential by default; no shared-file coupling without a shared-system issue.

Product workstream: website-rescue (must not merge with sibling product streams)
```
