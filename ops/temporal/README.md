# Temporal ops (Phase 1)

Repo-only supervisory wrapper for the existing GitHub → Cursor Factory Handoff loop.

- Canonical packet: `docs/operations/TEMPORAL_FACTORY_PHASE1_V1.md`
- Worker: `ops/temporal/phase1-worker.mjs` (dry-run). `--live` is fail-closed.
- Do not expose Temporal publicly. Do not reuse CorpFlow production Postgres.

Live worker start on `corpflow-exec-01` is an Anton L3 / credential action. This directory does not perform it.
