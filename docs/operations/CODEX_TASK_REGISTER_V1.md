# Codex Task Register v1 — research request/return log

**Status:** Docs/process only. Authorizes no runtime change, no outreach, no production action.
**Owner:** Anton (operator).
**Executor (this doc):** Cursor.
**Created:** 2026-06-29.
**Implements:** part of [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) (parallel execution board).
**Anchor sentinel:** `<!-- CODEX_TASK_REGISTER_V1 -->`

<!-- CODEX_TASK_REGISTER_V1 -->

## 1. Purpose

The Parallel Execution Board (`PARALLEL_EXECUTION_BOARD_V1.md`) lets lanes use **Codex**
as a research/data/script worker (Lane B especially). This register is the **single log**
of every Codex task: what was asked, what came back, whether the return was transfer-safe,
and who imported it. It exists so Codex throughput is visible and so no research artifact is
lost or silently consumed.

Codex remains a **research/data/script worker only** — it never owns PRs, never writes the
Sheet, never sends, never approves. The binding output rules live in
`docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md`; this register does not change them, it
tracks their use.

## 2. Hard rules (carried from the Codex contract)

- Codex returns **only** transfer-safe formats: A markdown / B CSV / C patch / D JSON
  manifest (`CODEX_INTEGRATION_CONTRACT_V1.md` §2), pasted in full — **no local-only
  branch/SHA** as the handoff.
- Codex **does not own PRs.** Cursor imports the artifact in a normal Cursor PR.
- Codex **does not** edit the Sheet, send email/WhatsApp, approve outreach, change
  business state, touch env/secrets/DB/`POSTGRES_URL`, or imply contact was made.
- A returned `Audit Update Queue` CSV must pass **every** validation rule in the contract
  §5 before import (exact headers, no approval/send fields, no formulas, no private data,
  every row keyed by `business_name` + `website_url`).
- **WIP limit:** at most **2** Codex research packets in flight at once
  (`PARALLEL_EXECUTION_BOARD_V1.md` §4).

## 3. Task lifecycle (states)

```
REQUESTED → RETURNED → VALIDATED → IMPORTED → CLOSED
                   ↘ REJECTED (fails contract §5; re-request)
```

- **REQUESTED** — Cursor (or Anton) posted a standard Codex request prompt; awaiting return.
- **RETURNED** — Codex pasted a transfer-safe artifact in full.
- **VALIDATED** — Cursor checked it against `CODEX_INTEGRATION_CONTRACT_V1.md` §5; passes.
- **REJECTED** — fails a contract rule; re-request with the failing rule named.
- **IMPORTED** — Cursor opened a PR importing the artifact as bounded research/input.
- **CLOSED** — PR merged (Anton) and artifact recorded; or task abandoned (note why).

## 4. Register format

Append-only, **newest first**. One row per Codex task. Keep prose out of the table; put
detail in the linked PR or `artifacts/`.

| Task ID | Date requested | Lane | Task (one line) | Format(s) | State | PR (import) | Owner of result | Notes |
|---|---|---|---|---|---|---|---|---|
| `CDX-2026-06-29-1` | 2026-06-29 | B | *(example)* Audit next 5 medspa prospects → `Audit Update Queue` CSV | B (CSV) + D (manifest) | REQUESTED | — | Anton | Draft-only; no outreach. First task under this register. |

**Task ID scheme:** `CDX-YYYY-MM-DD-N` (N = nth Codex task that day). Never reuse an ID.

## 5. Standard Codex request prompt (template)

Copy from `CODEX_INTEGRATION_CONTRACT_V1.md` §7 — reproduced here for convenience. Fill the
angle-bracket fields and record the new Task ID in §4 with state `REQUESTED`.

```text
Codex, produce a transfer-safe artifact per docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md.

Task: <what you want audited / drafted / scripted>
Required output format(s): <A markdown | B CSV | C patch | D JSON manifest>
Destination: <repo path OR "Audit Update Queue" for the US Medspa Sheet>

Rules (hard):
- Paste full content inline. No local-only branch/SHA as the handoff.
- CSV uses exactly the §4.1 headers; audit_status in {Audited, Outreach drafted} only.
- No approval/send/follow-up fields. No formulas. No secrets. No private data.
- Draft-only. Codex does not own PRs, does not write the Sheet, does not send.
- Every CSV row keyed by business_name + website_url.
```

## 6. Return / import checklist (Cursor)

When Codex returns an artifact, before moving the task to `IMPORTED`:

- [ ] Artifact is one of the §2 formats and is **self-contained** (no branch/SHA pointer).
- [ ] If CSV: passes all `CODEX_INTEGRATION_CONTRACT_V1.md` §5 rules.
- [ ] No secrets, no private/PHI data, no smart-quote/CSV-breaking characters.
- [ ] Nothing implies a send, approval, or business-state change.
- [ ] Intended destination/owner is clear; if Sheet-bound, it stays a **staging queue**
      (human applies values — Codex/Cursor do not write the master tab).
- [ ] Cursor opens a normal Cursor PR importing it as **bounded research/input**; the PR
      body states `NO IMPLEMENTATION AUTHORIZED` and names the source task ID.
- [ ] Register row updated to `IMPORTED` with the PR link; `CLOSED` after Anton merges.

If any box fails → state `REJECTED`, name the failing rule, re-request.

## 7. Cross-references

- `docs/operations/CODEX_INTEGRATION_CONTRACT_V1.md` — binding output formats + validation.
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` — lanes, WIP limits, gates.
- `docs/operations/CURSOR_DISPATCHER_CHECKLIST_V1.md` — when Cursor issues/imports Codex work.
- `docs/operations/OPERATOR_DISPATCH_ROUTER.md` §7.1 — Codex boundary.
- `docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_AUDIT_WORKFLOW_V0.md` — Sheet/audit flow.

## 8. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/process only.
- **Implementation:** none. No runtime, no Sheet automation, no outreach, no env/secrets/DB.
- **Verdict:** PARTIAL by design — the register is documented; Codex tasks become trackable
  and import-safe under the existing Codex contract and gates.
