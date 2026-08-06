# OpenHands runtime overrides (CorpFlowAI)
#
# STATUS: INACTIVE package — overrides apply only when this directory is
# bind-mounted by `ops/openhands/compose.yaml` into a separately authorized
# install on the dedicated OpenHands daemon.
#
# `docker_sandbox_service.py` is a **bounded patch** of the upstream module from
# `docker.openhands.dev/openhands/openhands:1.8`
# (`/app/openhands/app_server/sandbox/docker_sandbox_service.py`).
#
# Why a patch (Option D): OpenHands app 1.8 / app_server Docker path has no
# supported env/config that:
#   - attaches dynamically spawned sandboxes to a named network, or
#   - clears ExtraHosts / host-gateway, or
#   - stops publishing sandbox ports on the host, or
#   - sets per-sandbox mem/cpu/pids HostConfig limits.
#
# `SANDBOX_ADDITIONAL_NETWORKS` is a **V0 runtime** knob (docs.openhands.dev
# v0/runtimes) — it does **not** appear in this app_server code path.
# `SANDBOX_LOCAL_RUNTIME_URL` is similarly unread by this SDK version.
#
# Hard outcomes this override enforces on every `containers.run` sandbox:
#   - network = corpflowai-openhands-net only (not default bridge, not host)
#   - ExtraHosts = [] / no host.docker.internal / no host-gateway
#   - no published host ports
#   - webhook callback = http://corpflowai-openhands-app:3000/api/v1/webhooks
#   - health URL = http://{sandbox-container}:8000/health (Docker DNS)
#   - mem_limit=512m, nano_cpus=5e8 (0.5 CPU), pids_limit=256
#   - refuse docker.sock mounts and KVM passthrough
#
# Compose also sets OH_WEB_URL=http://corpflowai-openhands-app:3000 so the
# control plane does not fall back to host.docker.internal for MCP
# ({web_url}/mcp/mcp) during conversation start. See compose.yaml comment on
# OH_WEB_URL and issue #743 conversation-500 diagnosis.
#
# Additional overrides (commissioning context reduction — same Option D pattern):
#   - live_status_app_conversation_service.py
#       Gates enable_browser / default MCP injection / builtin agents via
#       CORPFLOWAI_ENABLE_BROWSER, CORPFLOWAI_INJECT_DEFAULT_MCP,
#       CORPFLOWAI_ENABLE_BUILTIN_AGENTS (default 0), CORPFLOWAI_MINIMAL_TOOLS (default 1).
#   - app_conversation_service_base.py
#       Gates skill sources via CORPFLOWAI_LOAD_{PUBLIC,USER,PROJECT,ORG}_SKILLS
#       (all default 0).
#
# Why: OpenHands 1.8 hardcodes browser tools + default MCP + public skills on
# the conversation start path. First Groq free-tier completion was rejected
# at ~33k–47k tokens vs 8k TPM (gpt-oss-20b). No Settings API field turns
# those off. See docs/execution/OPENHANDS_COMMISSIONING_PROFILE_V1.md.
#
# Controlling issue: #743. Remediation on PR #747.
