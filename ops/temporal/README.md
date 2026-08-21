# Temporal ops (Phase 1)

Supervisory wrapper for the existing GitHub → Cursor Factory Handoff loop.

- Canonical packet: `docs/operations/TEMPORAL_FACTORY_PHASE1_V1.md`
- Live activation (Anton L3 only): `docs/runbooks/TEMPORAL_FACTORY_PHASE1_LIVE_ACTIVATION.md`
- Worker: `ops/temporal/phase1-worker.mjs` (dry-run). `--live` is fail-closed from Cursor Cloud.
- Do not expose Temporal publicly. Do not reuse CorpFlow production Postgres.
- Do not `workflow_dispatch` Handoff from Cursor Cloud (loop risk).

Live worker start on `corpflow-exec-01` is operator-paste L3. This directory does not SSH or mint tokens.
