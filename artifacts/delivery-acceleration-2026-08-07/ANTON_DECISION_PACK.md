# Anton decision pack — 2026-08-07 (tonight)

Cloud agent cannot merge/deploy/close issues (gh write blocked for issue comments). Decisions below are ready for one-pass approval.

---

## A. Client-blocking — CIPC / Sarah (#791)

| Item | Detail |
|------|--------|
| Canonical PR | **#792** `cursor/dispatcher-issue-791-94ae` (draft, MERGEABLE, CI green) |
| Duplicate branch | `cursor/dispatcher-issue-791-d259` — **no PR**; same outcome; **close/delete branch**; no unique must-keep delta vs #792 for Sarah’s eight decisions (both carry identical dormant sentence + `cipc-desk-ar-review-v1.1-sarah-2026-08-07`) |
| Live today | `https://cipc.corpflowai.com/annual-returns` **200** but still **`SARAH CONFIRM`** / missing v1.1 — **client not handable** |
| Recommendation | 1) Mark #792 **Ready for review** 2) **Merge** 3) Confirm Production deploy 4) Re-GET annual-returns until `SARAH CONFIRM` gone and dormant wording present 5) Send Sarah the corpflow_test URL |
| Anton approval | **YES** (merge + deploy) |
| Client-handable output | Sarah-usable Annual Returns review page on `cipc.corpflowai.com` |

---

## B. Revenue-facing PRs — merge recommendations

| PR | Title | Draft | Mergeable | Recommendation | Anton? | Why |
|----|-------|-------|-----------|----------------|--------|-----|
| **#792** | Sarah Annual Returns v1 | Yes | Yes | **MERGE after mark-ready** — highest client blocker tonight | YES | Unblocks Sarah |
| **#794** | #699 contact path prefill | Yes | Yes | **MERGE after mark-ready** — revenue path; CI green; narrow scope | YES | Buyer deep-link → discovery |
| **#759** | Lux purchase readiness | Yes | Yes | **MERGE when Jan next-slice authorized** — not blocker for Sarah/revenue unit gate | YES | Client journey continuity |
| #780 | Core/Tenant foundation | **No** | Yes | **PAUSE / review separately** — shared Core/Tenant risk; does not unblock Sarah or LR/WR unit gate tonight | YES if merge | Architecture — process drag if it delays client PRs |
| #771 | #766 pilot go-live docs | Yes | Yes | Pause | Docs-only | No client click-path |
| #768/#769 | ElevenLabs voice | Yes | Yes | Pause; keep **one** later | Pilot tooling | Not revenue this week |

---

## C. Duplicate consolidation (canonical → close rest)

| Outcome | Canonical | Close / supersede | Unique loss risk |
|---------|-----------|-------------------|------------------|
| Sarah Annual Returns #791 | **PR #792** (`…791-94ae`) | Branch `…791-d259` (no PR) | Low — same dormant wording/version string; do not spend time merging d259 |
| #778 Core/Tenant Slice 1 | **PR #780** (non-draft) | **PR #779** draft | #780 is superset (+screenshots/runtime). Closing #779 loses nothing material vs #780 |
| #773 route audit | Prefer **#774** (MERGEABLE) | **#775** (CONFLICTING) | #775 may have extra audit prose — if needed, cherry-pick **after** #774 only; do not repair #775 tonight |
| #787 lifecycle marker | Prefer **#788** or **#789** (pick one) | Close the other | Near-identical 3-line marker — **lifecycle-only / process drag**; consider closing **both** if #790 already on main |
| #767 voice text fallback | Prefer **#768** or **#769** (pick richer diff: **#769** has more test/docs) | Close the other | Keep #769 if any voice work resumes; else pause both |
| #696 test users | Merged **#722** | **#719** draft conflicting | Close #719 — superseded |

**Do not repair obsolete duplicates tonight.**

---

## D. Pause (architecture / tooling / internal)

Pause unless Anton explicitly re-prioritizes:

- #780 / #779 / #773 / #774 / #775 Core-Tenant architecture
- #788 / #789 / #787 synthetic lifecycle proofs
- #677 Decision Inbox (conflicting)
- #766 / #771 controlled-pilot docs rehearsal
- #767 / #768 / #769 voice pilot
- Company Master / OpenHands / Beszel / Promptfoo cloud packs
- Dispatcher `SKIP_GATED` noise on #249 — escalate unlock separately; do not spawn more lifecycle markers

---

## E. Lux / Jan hygiene (close when Anton confirms)

Delivered / Jan-accepted slices still OPEN create false “unfinished” signal:

| Issue | Suggestion |
|-------|------------|
| #619 rename | Close — shipped |
| #645 MVP | Close or re-scope to next slice only |
| #673 concierge operator | Close if #675 live accepted |
| #717 confidential presentation | Close — Jan happy 2026-08-04 noted on issue |
| #651 visual/concierge | Close remaining deltas or list only true leftovers |

---

## F. Work without Anton vs must wait

| Without Anton (done / doable in cloud) | Must wait for Anton |
|----------------------------------------|---------------------|
| Unit-gate PASS/FAIL packet (this folder) | Merge #792 / #794 / #759 / #780 |
| Duplicate map + close recommendations | Deploy Production |
| Live HTTP probes | Close GitHub issues |
| Ready-to-paste comments | Client send to Sarah / Jan |
| Mark PRs ready? (needs write) | Unlock dispatcher gate |
