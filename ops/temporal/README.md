# CorpFlowAI Temporal factory supervisor

Repo-only Temporal-shaped supervisor for the #1130 72-hour real-production
pilot. GitHub remains the work source of truth. **CorpFlowAI Cursor Factory
Handoff** remains the only Cursor wake path.

- Dry-run: `node ops/temporal/pilot-worker.mjs`
- `--live` from Cursor Cloud / CI is fail-closed (exit 2). It must not
  `workflow_dispatch` Handoff from this process.
- Live activation is the exact Anton packet in
  `docs/runbooks/TEMPORAL_FACTORY_PILOT_ACTIVATION.md`. No SSH, no new secret,
  no overlapping-supervisor disable.

Do not add a second dispatcher, a second task database, or a Cursor API caller
here.
