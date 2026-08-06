#!/usr/bin/env bash
# CorpFlowAI — non-model dynamic OpenHands sandbox spawn isolation probe
#
# Uses the same OpenHands control-plane path as live work:
#   POST /api/v1/sandboxes  → DockerSandboxService.start_sandbox()
# No Groq credential. No model call. One disposable sandbox. Full cleanup.
#
# Pass criteria (fail closed if ambiguous):
#   - NetworkMode / Networks == corpflowai-openhands-net only
#   - ExtraHosts == []
#   - no host-gateway / host.docker.internal
#   - no published host ports
#   - Memory=512m NanoCpus=5e8 PidsLimit=256
#   - control-plane can GET http://{sandbox}:8000/health (callback path)
#   - sandbox can resolve corpflowai-openhands-app and GET /health
#   - primary Docker container count unchanged
#   - sandbox removed; pilot left inactive
#
# Usage (on corpflow-exec-01, from repo root):
#   bash scripts/ops/openhands/probe-sandbox-spawn-isolation.sh
#
# Exit: 0 pass, 1 fail, 2 usage/tooling

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"
COMPOSE_FILE="${REPO_ROOT}/ops/openhands/compose.yaml"
EVIDENCE_DIR="${TMPDIR:-/tmp}/openhands-spawn-probe-$$"
mkdir -p "${EVIDENCE_DIR}"

say() { printf '[corpflowai-openhands-probe] %s\n' "$*"; }
fail() { say "FAIL: $*"; exit 1; }

cleanup_sandbox() {
  local name="${1:-}"
  [[ -z "${name}" ]] && return 0
  openhands_docker rm -f "${name}" >/dev/null 2>&1 || true
}

openhands_assert_isolation_context

PRIMARY_BEFORE="$(docker ps -q 2>/dev/null | wc -l | tr -d ' ')"
say "PRIMARY_BEFORE=${PRIMARY_BEFORE}"

if ! openhands_docker inspect "${OPENHANDS_PROJECT}-app" >/dev/null 2>&1; then
  fail "control plane ${OPENHANDS_PROJECT}-app not running"
fi

# Ensure override is mounted (recreate if operator pulled repo but did not recreate).
if ! openhands_docker inspect -f '{{range .Mounts}}{{println .Destination}}{{end}}' "${OPENHANDS_PROJECT}-app" \
  | grep -Fq '/app/openhands/app_server/sandbox/docker_sandbox_service.py'; then
  say "spawn override not mounted — recreating control plane from compose"
  openhands_docker compose -p "${OPENHANDS_PROJECT}" -f "${COMPOSE_FILE}" up -d --force-recreate "${OPENHANDS_PROJECT}-app"
  sleep 8
fi

# Confirm override markers inside the running module
if ! openhands_docker exec "${OPENHANDS_PROJECT}-app" grep -q 'CORPFLOWAI BOUNDARY OVERRIDE' \
  /app/openhands/app_server/sandbox/docker_sandbox_service.py; then
  fail "running module lacks CORPFLOWAI BOUNDARY OVERRIDE marker"
fi

# Confirm Groq / LLM key not loaded into runtime for this probe
LLM_SET="$(curl -fsS -m 5 http://127.0.0.1:3000/api/v1/settings 2>/dev/null \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("llm_api_key_set") or d.get("LLM_API_KEY_SET") or False)' 2>/dev/null || echo unknown)"
say "LLM_API_KEY_SET=${LLM_SET}"
if [[ "${LLM_SET}" == "True" || "${LLM_SET}" == "true" ]]; then
  fail "LLM API key is loaded — refuse probe (do not load Groq for this packet)"
fi

# Health before
curl -fsS -m 5 http://127.0.0.1:3000/health >/dev/null || fail "control plane /health failed"

# Start one disposable sandbox via OpenHands API (dynamic spawn path)
START_HTTP="$(curl -sS -m 120 -o "${EVIDENCE_DIR}/start.json" -w '%{http_code}' \
  -X POST http://127.0.0.1:3000/api/v1/sandboxes \
  -H 'Content-Type: application/json' \
  -d '{}')"
say "START_HTTP=${START_HTTP}"
cat "${EVIDENCE_DIR}/start.json" || true
if [[ "${START_HTTP}" != "200" && "${START_HTTP}" != "201" ]]; then
  fail "POST /api/v1/sandboxes returned ${START_HTTP}"
fi

SANDBOX_ID="$(python3 -c 'import json; print(json.load(open("'"${EVIDENCE_DIR}"'/start.json")).get("id") or "")')"
say "SANDBOX_ID=${SANDBOX_ID}"
[[ -n "${SANDBOX_ID}" ]] || fail "no sandbox id in start response"

# Wait briefly for agent-server health
STATUS="STARTING"
for i in $(seq 1 60); do
  curl -fsS -m 5 "http://127.0.0.1:3000/api/v1/sandboxes?id=${SANDBOX_ID}" \
    -o "${EVIDENCE_DIR}/status.json" || true
  STATUS="$(python3 -c 'import json; d=json.load(open("'"${EVIDENCE_DIR}"'/status.json")); x=d[0] if isinstance(d,list) else d; print((x or {}).get("status") or "missing")' 2>/dev/null || echo missing)"
  say "poll ${i} status=${STATUS}"
  if [[ "${STATUS}" == "RUNNING" || "${STATUS}" == "ERROR" ]]; then
    break
  fi
  sleep 2
done

openhands_docker inspect "${SANDBOX_ID}" > "${EVIDENCE_DIR}/inspect.json" 2>/dev/null \
  || fail "cannot inspect sandbox ${SANDBOX_ID}"

# docker inspect returns a JSON array
py_inspect() {
  local expr="$1"
  python3 -c "import json; d=json.load(open('${EVIDENCE_DIR}/inspect.json')); x=d[0] if isinstance(d,list) else d; ${expr}"
}

NETWORK_MODE="$(py_inspect 'print(x["HostConfig"]["NetworkMode"])')"
EXTRA_HOSTS="$(py_inspect 'print(json.dumps(x["HostConfig"].get("ExtraHosts")))')"
PORT_BINDINGS="$(py_inspect 'print(json.dumps(x["HostConfig"].get("PortBindings")))')"
MEMORY="$(py_inspect 'print(x["HostConfig"].get("Memory"))')"
NANO="$(py_inspect 'print(x["HostConfig"].get("NanoCpus"))')"
PIDS="$(py_inspect 'print(x["HostConfig"].get("PidsLimit"))')"
NETWORKS="$(py_inspect 'print(" ".join(x["NetworkSettings"]["Networks"].keys()))')"
CID="$(py_inspect 'print(x["Id"])')"

# Host-side cgroup path (in-container /proc/1/cgroup is often just 0::/ with private cgroupns)
CGROUP_HOST="$(
  # rootless: look under user slice for docker-<cid>.scope
  find "${XDG_RUNTIME_DIR:-/run/user/$(id -u)}" /sys/fs/cgroup -path "*corpflowai-openhands*" -name "docker-${CID}*.scope" 2>/dev/null | head -1 || true
)"
if [[ -z "${CGROUP_HOST}" ]]; then
  CGROUP_HOST="$(
    grep -l "${CID}" /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/corpflowai.slice/corpflowai-openhands.slice/corpflowai-openhands-containers.slice/*/cgroup.procs 2>/dev/null | head -1 || true
  )"
fi
# Fallback: read host cgroup from container PID
CPID="$(openhands_docker inspect -f '{{.State.Pid}}' "${SANDBOX_ID}" 2>/dev/null || echo 0)"
if [[ "${CPID}" != "0" && -r "/proc/${CPID}/cgroup" ]]; then
  CGROUP_PROC="$(tr '\n' ' ' < "/proc/${CPID}/cgroup")"
else
  CGROUP_PROC=""
fi

say "Probe network: NetworkMode=${NETWORK_MODE} Networks=${NETWORKS}"
say "Probe ExtraHosts: ${EXTRA_HOSTS}"
say "Probe PortBindings: ${PORT_BINDINGS}"
say "Probe limits: Memory=${MEMORY} NanoCpus=${NANO} PidsLimit=${PIDS}"
say "Probe cgroup: host_path=${CGROUP_HOST:-none} proc=${CGROUP_PROC}"

VIOLATIONS=0
[[ "${NETWORK_MODE}" == "corpflowai-openhands-net" ]] || { say "bad NetworkMode"; VIOLATIONS=$((VIOLATIONS+1)); }
[[ "${NETWORKS}" == "corpflowai-openhands-net" ]] || { say "bad Networks list"; VIOLATIONS=$((VIOLATIONS+1)); }
[[ "${EXTRA_HOSTS}" == "null" || "${EXTRA_HOSTS}" == "[]" ]] || { say "bad ExtraHosts"; VIOLATIONS=$((VIOLATIONS+1)); }
printf '%s' "${EXTRA_HOSTS}" | grep -Eqi 'host\.docker\.internal|host-gateway' && { say "host-gateway present"; VIOLATIONS=$((VIOLATIONS+1)); } || true
[[ "${PORT_BINDINGS}" == "null" || "${PORT_BINDINGS}" == "{}" || "${PORT_BINDINGS}" == "map[]" ]] || { say "published ports"; VIOLATIONS=$((VIOLATIONS+1)); }
[[ "${MEMORY}" == "536870912" ]] || { say "bad Memory"; VIOLATIONS=$((VIOLATIONS+1)); }
[[ "${NANO}" == "500000000" ]] || { say "bad NanoCpus"; VIOLATIONS=$((VIOLATIONS+1)); }
[[ "${PIDS}" == "256" ]] || { say "bad PidsLimit"; VIOLATIONS=$((VIOLATIONS+1)); }
if ! printf '%s%s' "${CGROUP_HOST}" "${CGROUP_PROC}" | grep -Fq 'corpflowai-openhands'; then
  say "cgroup missing corpflowai-openhands slice marker (host_path/proc)"
  VIOLATIONS=$((VIOLATIONS+1))
fi

# Callback: control plane → sandbox /health via Docker DNS (same path as override)
CB_APP_TO_SB="$(openhands_docker exec "${OPENHANDS_PROJECT}-app" \
  curl -fsS -m 5 "http://${SANDBOX_ID}:8000/health" 2>&1 || echo '__FAIL__')"
say "Probe callback app→sandbox: ${CB_APP_TO_SB}"
if [[ "${CB_APP_TO_SB}" == *__FAIL__* ]]; then
  say "app→sandbox health failed: ${CB_APP_TO_SB}"
  VIOLATIONS=$((VIOLATIONS+1))
fi

# Sandbox → control plane /health (webhook base reachability)
CB_SB_TO_APP="$(openhands_docker exec "${SANDBOX_ID}" \
  curl -fsS -m 5 http://corpflowai-openhands-app:3000/health 2>&1 || echo '__FAIL__')"
say "Probe callback sandbox→app: ${CB_SB_TO_APP}"
if [[ "${CB_SB_TO_APP}" == *__FAIL__* ]]; then
  say "sandbox→app health failed"
  VIOLATIONS=$((VIOLATIONS+1))
fi

# Mounts — no docker.sock
MOUNTS="$(openhands_docker inspect -f '{{range .Mounts}}{{.Source}} {{end}}' "${SANDBOX_ID}" 2>/dev/null || true)"
say "Probe mounts: ${MOUNTS}"
printf '%s' "${MOUNTS}" | grep -Fq 'docker.sock' && { say "docker.sock mount"; VIOLATIONS=$((VIOLATIONS+1)); } || true

# OpenHands status should be RUNNING (not ERROR) after health succeeds
if [[ "${STATUS}" == "ERROR" ]]; then
  say "OpenHands reported sandbox ERROR despite spawn"
  VIOLATIONS=$((VIOLATIONS+1))
fi

# Cleanup via API then force rm
DEL_HTTP="$(curl -sS -m 30 -o /dev/null -w '%{http_code}' -X DELETE \
  "http://127.0.0.1:3000/api/v1/sandboxes/${SANDBOX_ID}" || echo 000)"
say "DELETE_HTTP=${DEL_HTTP}"
cleanup_sandbox "${SANDBOX_ID}"

PRIMARY_AFTER="$(docker ps -q 2>/dev/null | wc -l | tr -d ' ')"
say "PRIMARY_AFTER=${PRIMARY_AFTER}"
[[ "${PRIMARY_AFTER}" == "${PRIMARY_BEFORE}" ]] || { say "primary Docker container count changed"; VIOLATIONS=$((VIOLATIONS+1)); }

# Confirm no leftover oh-agent-server
LEFT="$(openhands_docker ps -a --format '{{.Names}}' | grep -E '^oh-agent-server-' || true)"
[[ -z "${LEFT}" ]] || { say "leftover sandboxes: ${LEFT}"; VIOLATIONS=$((VIOLATIONS+1)); cleanup_sandbox "${LEFT}"; }

say "evidence dir: ${EVIDENCE_DIR}"
if [[ "${VIOLATIONS}" -ne 0 ]]; then
  fail "probe failed with ${VIOLATIONS} violation(s)"
fi

say "PASS — SANDBOX SPAWN ISOLATION VERIFIED (non-model probe)"
exit 0
