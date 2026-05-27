# CorpFlow Website Quality System v2 (canonical v0)

**Status:** v0 stub. Owner packet: the future v2-cutover packet referenced in `docs/quality/QUALITY_SCORE_EVOLUTION_V2.md` § 11.6. This file exists to satisfy the canonical-reference graph; the full system description lands when the v2 cutover ships.

**Anchor sentinel:** `<!-- WEBSITE_QUALITY_SYSTEM_V2_V0_STUB -->`

<!-- WEBSITE_QUALITY_SYSTEM_V2_V0_STUB -->

## Why this stub

`docs/quality/QUALITY_SCORE_EVOLUTION_V2.md` § 11.6 names this doc as one of the cutover deliverables. Packet 6.11 added this v0 stub so cross-references resolve.

## Relationship to v1

v1 is canonical today: `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`. When v2 ships, this stub will be replaced with the full v2 system description and v1 will be **marked archival** (not deleted).

## Scope when the v2 cutover ships

Per `docs/quality/QUALITY_SCORE_EVOLUTION_V2.md` § 11.6, the full version will document:

- v2 scoring formula and tenant-overridable weights (`config/tenant-quality/*.json`).
- Per-dimension v2 measurement model (conversion, performance, accessibility, SEO, trust).
- Drift / reconciliation rules between v1 and v2 scores during the transition window.
- `AGENTS.md` must-read row updates.
- `MONITORING_ARCHITECTURE.md` § 11.2 future-packet row updates.
- Client-facing reporting format remains unchanged (per `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` §3.5).

## Cross-references (current)

- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — currently canonical scoring system.
- `docs/quality/QUALITY_SCORE_EVOLUTION_V2.md` — v2 design + cutover plan.
- `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` — client-facing reporting format.
- `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md` — cadence, thresholds, wording.

## Until the v2 cutover ships

v1 scoring is canonical. Do **not** treat this stub as scoring authority.
