# Temporal POC scaffold (#1025)

**Status:** example only. **Not installed. Not authorized to start on exec-01** until a live preflight in `docs/runbooks/TEMPORAL_SELF_HOSTED_POC_PREFLIGHT.md` proves capacity.

Canonical evidence: `docs/operations/TEMPORAL_HOST_FEASIBILITY_EVIDENCE_1025.md`

## What this folder is

A lean, loopback-only Docker Compose example for a later Temporal proof of concept:

- Temporal Server (`temporalio/auto-setup:1.27.2`)
- Dedicated Postgres (`postgres:16.6-alpine`) — **not** Neon / `POSTGRES_URL`
- Temporal UI on `127.0.0.1:8233`
- gRPC on `127.0.0.1:7233`
- CPU/RAM limits on every service

## What this folder is not

- Not a Kubernetes cluster, HA setup, Grafana/Prometheus stack, or second dispatcher.
- Not a production workflow engine.
- Not a public service.
- Not an instruction to `docker compose up` from CI or Cursor Cloud.

## Rollback (only after something was actually started)

```bash
docker compose -p corpflowai-temporal -f compose.example.yml down
# full removal including the dedicated volume:
docker compose -p corpflowai-temporal -f compose.example.yml down -v
```

UI access, if ever started: `ssh -L 8233:localhost:8233 anton@<host>` then browse `http://127.0.0.1:8233`.
