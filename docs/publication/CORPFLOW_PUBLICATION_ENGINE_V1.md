# CorpFlow Publication Engine v1 (canonical v0)

**Status:** v0 stub. Owner packet: the future publication-engine packet referenced in `docs/execution/WEEKEND_EXECUTION_QUEUE.md:638`. This file exists to satisfy the canonical-reference graph; the full design lands when that packet ships.

**Anchor sentinel:** `<!-- PUBLICATION_ENGINE_V1_V0_STUB -->`

<!-- PUBLICATION_ENGINE_V1_V0_STUB -->

## Why this stub

`docs/execution/WEEKEND_EXECUTION_QUEUE.md:638` names this doc as the canonical home for the publication state machine. Packet 6.11 added this v0 stub so cross-references resolve. Publication behaviour today is governed by the per-flow surfaces named in `docs/EXECUTION_BRAIN_VS_HANDS.md` and the change-console flow under `lib/cmp/`.

## Scope when the publication-engine packet ships

Per the DoD at `docs/execution/WEEKEND_EXECUTION_QUEUE.md:638`, the full version will contain:

- **§1 Purpose.**
- **§2 States** — the explicit list of publication states a tenant artifact moves through.
- **§3 State-machine diagram** — visual + textual.
- **§4 Inputs per state** — what triggers each transition.
- **§5 Who-decides per state** — operator / tenant / automation.
- **§6 SLA per state** — expected time-in-state.
- **§7 Evidence shape per transition** — links to `docs/execution/EVIDENCE_FORMAT.md` once that ships.
- **§8 Failure modes.**
- **§9 Per-tenant overrides.**
- **§10 v2 candidates.**
- **§11 Cross-references.**
- **§12 Status block.**

## Cross-references (current)

- `docs/execution/WEEKEND_EXECUTION_QUEUE.md` — DoD this doc must satisfy.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape this doc must follow.
- `docs/CORPFLOW_SHARED_TODO.md` — execution priorities.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — brain/hands boundary that publication touches.
- `lib/cmp/README.md` — current change-console flow (de facto today).

## Until the publication-engine packet ships

Do **not** treat this stub as authoritative on publication-engine behaviour. Use `lib/cmp/README.md` + `docs/EXECUTION_BRAIN_VS_HANDS.md` for current-state truth.
