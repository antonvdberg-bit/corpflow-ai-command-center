# Ready-to-paste GitHub comments

`gh` issue comment is blocked for this cloud integration (`Resource not accessible by integration`). Paste manually if desired.

---

## Issue #791 (Sarah Annual Returns)

```text
## DELIVERY ACCEL STATUS — 2026-08-07

Canonical PR: #792 (draft, MERGEABLE, CI green) on `cursor/dispatcher-issue-791-94ae`.

Duplicate branch `cursor/dispatcher-issue-791-d259` has no PR — recommend delete/ignore (same Sarah decisions; do not dual-track).

Live corpflow_test today: https://cipc.corpflowai.com/annual-returns → 200 but still shows `SARAH CONFIRM` / missing `cipc-desk-ar-review-v1.1-sarah-2026-08-07`.

Client-handable output blocked until Anton: mark #792 ready → merge → Production deploy → re-verify page → send Sarah the URL.

Anton required: YES (merge/deploy). No secrets/DB/schema in #792.
```

---

## Issue #249 (Operator Bridge)

```text
## STATUS — delivery acceleration 2026-08-07 (cloud)

Moved:
- Outstanding-work board + Anton decision pack: `artifacts/delivery-acceleration-2026-08-07/`
- Jan v15.3.1 RC evidence: FAIL/BLOCKED — RC archive not in repo/cloud (see packet)
- LR/WR unit-gate 7 Aug: PASS (175/175 focused tests; system-proof ok; live market URLs 200)
- CIPC/Sarah: #792 ready to mark-ready+merge (live still pre-Sarah content)

Paused: Core/Tenant architecture PRs (#780/#779/#773*), lifecycle synthetic PRs (#788/#789), voice duplicates (#768/#769)

Anton actions (priority):
1) Supply Jan v15.3.1 RC archive + SHA256 OR accept RC verification blocked
2) Merge #792 (Sarah) then verify cipc annual-returns
3) Merge #794 (revenue deep-link) when ready
4) Close duplicate/superseded PRs per decision pack
5) Dispatcher SKIP_GATED — unlock or stop activation noise

Need Anton: YES for merges/deploys/archive. Evidence PR opened on delivery-acceleration branch.
```

---

## Issue #715 / #716

```text
## UNIT GATE RE-RUN — 2026-08-07

Lead Rescue (#715) + Website Rescue (#716) deterministic unit/system gates re-run on main `33e2aff8`:

- Focused tests: 175 pass / 0 fail
- `node scripts/lead-rescue-system-proof.mjs` → ok true → acceptance_ready (no messaging)
- `node scripts/website-rescue-system-proof.mjs` → ok true → acceptance_ready (no real DNS/deploy)
- Live: /lead-rescue and WR offer HTTP 200; no “Choose payment path”

Evidence: `artifacts/delivery-acceleration-2026-08-07/UNIT_GATE_LR_WR_2026-08-07.md`

Release blockers on this lane: none. No code fix required tonight.
Anton required: NO for this verification packet.
```

---

## Issue #651 (Lux / Jan)

```text
## JAN v15.3.1 RC — verification result 2026-08-07

Requested RC offline/Upstash/Supabase/SHA256 packet: FAIL/BLOCKED.
RC archive not present in GitHub/cloud workspace; Upstash/Supabase env correctly unset.

Known defect recorded (not fixed): migrate:test checks `escalations` while migration creates `lead_escalations` — release blocker for RC green claim only.

CorpFlow Lux corpflow_test live floor still PASS (home/concierge Email+Telephone/Private curator).

Packet: `artifacts/delivery-acceleration-2026-08-07/JAN_V15_3_1_RC_EVIDENCE_PACKET.md`
One Anton action: provide RC archive + SHA256 for cloud re-run. No merge/tag/release/prod integration performed.
```

---

## PR #792 comment

```text
## Operator disposition — canonical for #791

Recommend: mark Ready for review → Anton merge → Production deploy → live verify annual-returns.

Sibling branch `cursor/dispatcher-issue-791-d259` is a duplicate path with no PR — supersede/delete; do not repair into this PR tonight.

Live pre-merge baseline still shows SARAH CONFIRM (expected). Post-merge must clear that string and show dormant wording + content version `cipc-desk-ar-review-v1.1-sarah-2026-08-07`.
```

---

## PR #794 comment

```text
## Revenue merge recommendation

Narrow #699 deep-link remainder. CI green / MERGEABLE.
Recommend mark ready + merge after Anton skim of buyer-facing copy.
Does not require schema/secrets/send. Live verify `/contact?path=…#discovery` after Production deploy.
```

---

## PR #780 comment

```text
## Pause recommendation (tonight)

Non-draft and mergeable, but shared Core/Tenant risk. Does not unblock Sarah (#792), LR/WR unit gate (already PASS), or Jan RC.
Recommend Anton review on a dedicated pass — do not let this displace client/revenue merges tonight.
Duplicate draft #779 should be closed as superseded by this PR.
```
