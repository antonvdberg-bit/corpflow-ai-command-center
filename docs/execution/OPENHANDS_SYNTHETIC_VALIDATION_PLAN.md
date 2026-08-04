# OpenHands synthetic validation plan (Phase 1 — prepared, not executed)

**Status:** DRAFT. Five validation packets are **prepared** below. **None have been executed.** They cannot be
executed until installation is authorized (`docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md`) and
completed (`docs/operations/OPENHANDS_INSTALL_RUNBOOK.md`). **Controlling issue:**
[#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)

**Companion docs:**

- `docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md` § "Initial synthetic validation packets" — the original 3-packet list this doc extends to 5 and formalizes with an explicit gate.
- `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` § 14 — where packet 1 is run as the install-time synthetic task.
- `docs/execution/OPENHANDS_WORK_PACKET_TEMPLATE.md` — the shape each packet below should be filed as, once install is authorized.
- `docs/operations/OPENHANDS_OPERATING_CHARTER.md` § "Success definition" — the operational-success bar these packets exist to prove against.

---

## 1. The gate

**Operational (Phase 2 → Phase 3) success requires at least 3 of the 5 packets below to complete successfully**
— matching the Charter's "Useful-worker success" bar ("at least three successful packets… one review-repair
cycle") and `docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md`'s acceptance criteria. Packet 3
(review-repair cycle) **must** be one of the 3 successes — a bare count of 3 that skips the review-feedback loop
does not satisfy the Charter's bar, because review-repair is the one capability that proves OpenHands can
respond to human feedback, not just complete a first-pass task.

**Until this gate is met, OpenHands remains Phase 2 (private installation) at most — it does not advance to
Phase 4 (routine automation) or Phase 5 (controlled expansion).**

## 2. The five packets

### Packet 1 — Documentation correction (lowest risk; recommended first run)

- **Objective:** make a small, real, useful documentation fix (e.g. a stale cross-reference, a broken relative
  link, a wording inconsistency already known in the repo) — not a fabricated no-op change.
- **Allowed files:** one or two `docs/**` files, explicitly named in the packet.
- **Acceptance test:** the fix is correct, the link/reference resolves, no unrelated content changes.
- **Evidence:** branch (`openhands/synth-1-docs-fix`), commit, draft PR, CI green.
- **Escalation trigger:** any attempt to touch a file outside the named allowlist.

### Packet 2 — Deterministic test repair

- **Objective:** given a synthetic or deliberately isolated failing test (prepared by the operator/Cursor ahead
  of time — not a real production test broken by chance), produce a focused repair.
- **Allowed files:** the single test file + the minimal source file it exercises, explicitly named.
- **Acceptance test:** `npm test` passes locally and in CI after the fix; no other test's pass/fail status
  changes.
- **Evidence:** branch (`openhands/synth-2-test-repair`), commit, draft PR, before/after `npm test` output.
- **Escalation trigger:** two failed repair attempts, or any repair that requires touching more than the two
  named files.

### Packet 3 — Review-repair cycle (must be one of the 3 successes per § 1)

- **Objective:** a low-risk, multi-file change (e.g. packet 1 or 2's shape, but slightly broader) that
  deliberately receives **one** human review correction after the first draft PR, and OpenHands must respond to
  that feedback with an updated commit — proving it can act on review comments, not just produce a first draft.
- **Allowed files:** explicitly named, 2–4 files.
- **Acceptance test:** the first draft PR is intentionally imperfect in one named, minor way (e.g. a comment
  should be removed, a variable name should be adjusted) that the operator/Cursor flags in review; the
  follow-up commit correctly addresses exactly that feedback.
- **Evidence:** branch, first commit, review comment (recorded verbatim, no secrets), follow-up commit, updated
  tests if applicable, final draft PR state.
- **Escalation trigger:** the follow-up commit does not address the review comment correctly, or introduces an
  unrelated change.

### Packet 4 — Dead-link / stale-reference audit (read-mostly, low risk)

- **Objective:** scan a bounded subset of `docs/**` for dead relative links or references to files that no
  longer exist, and produce either a report or a minimal corrective PR (operator's choice at dispatch time).
- **Allowed files:** read access to the bounded `docs/**` subset named in the packet; write access only to the
  specific files needing correction, if any are found.
- **Acceptance test:** every flagged link/reference is verified to be actually broken (no false positives); any
  correction made resolves the link without changing unrelated content.
- **Evidence:** branch (`openhands/synth-4-link-audit`), the audit output itself (as a PR body or a small
  report file), any corrective commits, draft PR if corrections were made.
- **Escalation trigger:** the audit surfaces something that looks like it needs a judgment call beyond a
  mechanical link fix (e.g. a doc that is entirely obsolete) — that goes to Cursor/Anton, not a unilateral
  OpenHands decision to delete content.

### Packet 5 — Backup-verification simulation (read-only; no production mutation)

- **Objective:** simulate the *shape* of a backup-verification check (e.g. confirm a script's read-only logic
  behaves correctly against a synthetic/fixture backup manifest) **without** touching the real restic → R2
  backup jobs described in `docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md` or `docs/operations/BACKUP_HEALTH_MONITOR.md`.
- **Allowed files:** a synthetic fixture file created for this packet only, plus test code exercising it.
- **Acceptance test:** the simulated check correctly identifies a healthy vs. an unhealthy synthetic fixture;
  zero commands are run against the real restic repository, real R2 credentials, or the real
  `corpflowai-ops-backup-health.timer`.
- **Evidence:** branch (`openhands/synth-5-backup-sim`), commit, draft PR, test output proving both the healthy
  and unhealthy fixture cases are handled correctly.
- **Escalation trigger:** any attempt (even accidental) to reference a real backup credential name, the real
  restic repository path, or any command that would mutate backup state — treat as an immediate stop and
  incident-style review, not a routine escalation.

## 3. What happens after the gate

- **3 of 5 successful, including packet 3:** Phase 3 (worker configuration) work — branch convention, routing
  policy, PR-evidence format — is considered validated in practice, not just on paper. This does **not**
  automatically authorize Phase 4 (routine automation) — that remains a separate Anton approval per
  `docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md`.
- **Fewer than 3 successful, or packet 3 not among the successes:** stay in Phase 2. Do not expand scope, do not
  raise the concurrency ceiling, do not enable alerting beyond health-check failure. Escalate the failure
  pattern to Cursor for review before re-attempting.
- **Any packet that trips a protected-action boundary** (touches a file outside its allowlist, attempts a
  merge, attempts to read a production secret): treat as a security-relevant finding, not just a failed test —
  review `docs/operations/OPENHANDS_SECURITY_MODEL.md` before re-running anything.

## 4. Change log

- **2026-08-04** — Initial five-packet plan authored alongside the Phase 1 documentation set for #743, extending
  the original 3-packet list in `OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md` with packets 4 and 5 (both
  already named there as "optional later validation") and formalizing the explicit 3-of-5 gate. No packet has
  been executed.
