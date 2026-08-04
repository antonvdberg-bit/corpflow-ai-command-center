# OpenHands — version pin record

**Status:** INACTIVE — record only, nothing installed. Controlling issue: [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743).

**Date checked:** 2026-08-04

## Selected versions

| Component | Image | Tag pinned | Notes |
|---|---|---|---|
| OpenHands app / control plane | `docker.openhands.dev/openhands/openhands` | `1.8` | UI + orchestrator; serves on container port `3000` |
| Agent server (sandbox runtime image) | `ghcr.io/openhands/agent-server` | `1.26.0-python` | Referenced via `AGENT_SERVER_IMAGE_REPOSITORY` / `AGENT_SERVER_IMAGE_TAG` env vars, not pulled directly by the control-plane compose file — the app pulls it at sandbox-spawn time |

No `latest` tag is used anywhere in this package. Both tags above are exact, reproducible pins as of the date
checked.

## Reasons for these pins

- `1.8` is the most recent tagged OpenHands app release documented on `docs.openhands.dev` as of 2026-08-04 that
  publishes the standard web UI on port `3000` and supports the split app/agent-server image model.
- `1.26.0-python` is the matching agent-server tag documented as compatible with app `1.8` in the same official
  docs pass. The `-python` variant is the general-purpose sandbox runtime (vs. minimal/other language variants)
  and is the default recommended by upstream for mixed-language repositories such as this one (JS/TS + Python
  under `core/engine/`).
- Pinning both images independently (rather than trusting `latest`/`main`) is required by
  `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` (idempotency, reproducibility) and by this package's own
  constraint set (no `latest`).

## Sources (official docs, checked 2026-08-04)

- `docs.openhands.dev` — installation / Docker deployment guide (app image tag `1.8`, UI port `3000`).
- `docs.openhands.dev` — agent-server / runtime image reference (`ghcr.io/openhands/agent-server:1.26.0-python`).
- `docs.openhands.dev` — Docker-socket requirement for sandbox container spawning (control plane spawns sibling
  containers per task using the host Docker daemon).

No third-party mirrors, blog posts, or unofficial registries were used to select these pins.

## Compatibility assumptions

- Host: `corpflow-exec-01-u69678` (Ubuntu server, x86_64). This package assumes a Docker Engine + Docker Compose
  v2 plugin already present (verified read-only by `scripts/ops/openhands/preflight.sh`, never installed by
  this package).
- The app image `1.8` is assumed compatible with the agent-server tag `1.26.0-python` per the same-dated docs
  pass. If upstream docs are re-checked at install time and show a different recommended agent-server tag for
  app `1.8` (or a newer app release), this file must be updated **before** any install, and the new pins must go
  through the same review as this package.
- No GPU is assumed or required.
- Outbound network access to the operator's chosen LLM API provider is assumed necessary for the app to
  function; this package does not select a provider (see `.env.example` and `config/openhands/config.example.toml`
  placeholders).

## Known limitations (as of this pin, 2026-08-04)

- The control plane requires a Docker-socket mount (`/var/run/docker.sock`) to spawn sandbox containers. This is
  an upstream architectural requirement, not a misconfiguration in this package. See the `RISK` comments in
  `compose.yaml` and the boundary checks in `scripts/ops/openhands/verify-sandbox-boundary.sh`.
- Resource use of spawned sandbox containers is **not** enforced by the app itself in this pinned version; this
  package documents a resource envelope (control ~1 CPU / 2 GiB; sandbox guidance 2 CPU / 4 GiB, hard max 6 GiB;
  concurrency 1; total ceiling ~8 GiB) as **operator policy**, not as an upstream-enforced hard limit. Any future
  install runbook must translate this into actual Docker resource flags on spawned sandbox containers if the
  app does not expose a native setting for it in `1.8`.
- No production-grade auth/session hardening is assumed out of the box; loopback-only binding is this package's
  substitute control until (and unless) a proper auth layer is reviewed separately.
- This package has not been run end-to-end (no install has happened); version compatibility is based on reading
  official docs only, not on a live smoke test. Any install runbook must re-verify against a real pull + boot
  before being marked reviewed.

## Pin policy

- Patch-level bumps within `1.8.x` (app) or `1.26.0-x` (agent-server, if such point releases exist) may be
  reviewed and applied at the next authorized install review without re-opening the full ADR, provided the
  official docs for that patch do not change the Docker-socket requirement, the port, or the security posture
  described here.
- Minor or major version bumps (e.g. `1.8` → `1.9` or `1.26.0-python` → `1.27.x-python`) require re-reading the
  official `docs.openhands.dev` pages for that release and updating this file's "Sources" and "Compatibility
  assumptions" sections before the new pin is used anywhere in this package.
- `latest`, `main`, `nightly`, or any floating tag must never appear in `compose.yaml`, `compose.override.example.yaml`,
  `.env.example`, or any script in this package.
