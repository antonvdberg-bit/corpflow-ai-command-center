# Beszel utilisation pilot — example scaffold

**Status:** example only — not deployed, not live.  
**Source issue:** [#727](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/727)  
**Canonical runbook:** [`docs/operations/BESZEL_SERVER_UTILISATION_PILOT.md`](../../docs/operations/BESZEL_SERVER_UTILISATION_PILOT.md)

## Files

| File | Purpose |
|---|---|
| `compose.example.yml` | Loopback hub + same-host agent example (named `corpflowai-beszel-*`) |
| `.env.example` | Placeholder KEY/TOKEN/tags only |

## Local validation (optional)

```bash
docker compose -f ops/beszel/compose.example.yml config
```

Expect success only after substituting real image tags for `<BESZEL_HUB_TAG>` / `<BESZEL_AGENT_TAG>` **or** after a dry config that still parses placeholders depending on Compose version. Prefer validating the **copied** server `compose.yaml` after tags are pinned.

## Do not

- Auto-deploy from CI
- Commit a filled `.env`
- Bind `0.0.0.0:8090`
- Mount Docker socket on the hub
- Alter Uptime Kuma or Backup Monitor #14 stacks
