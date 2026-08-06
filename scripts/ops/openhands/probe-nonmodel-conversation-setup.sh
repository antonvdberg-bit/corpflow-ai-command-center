#!/usr/bin/env bash
# Non-model conversation setup probe (issue #743).
# No Groq key. No arithmetic task. Expect READY (or equivalent pre-model success).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
# shellcheck source=scripts/ops/openhands/lib/common.sh
source scripts/ops/openhands/lib/common.sh
openhands_assert_isolation_context
export DOCKER_HOST="${OPENHANDS_DOCKER_HOST}"

PRIMARY_BEFORE="$(docker -H unix:///var/run/docker.sock ps -q 2>/dev/null | wc -l | tr -d ' ' || echo 0)"
say "PRIMARY_BEFORE=${PRIMARY_BEFORE}"

# Confirm no LLM key loaded
SETTINGS="$(curl -fsS http://127.0.0.1:3000/api/v1/settings)"
echo "${SETTINGS}" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("llm_api_key_set") is False, d; print("llm_api_key_set=false OK")'

# OH_WEB_URL must be present
ENV_DUMP="$(openhands_docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' corpflowai-openhands-app)"
echo "${ENV_DUMP}" | grep -E '^OH_WEB_URL=http://corpflowai-openhands-app:3000$' >/dev/null \
  || die "OH_WEB_URL missing or wrong on control plane"

# Cleanup prior sandboxes
for n in $(openhands_docker ps -a --format '{{.Names}}' | grep '^oh-agent-server-' || true); do
  openhands_docker rm -f "${n}" >/dev/null || true
done

START="$(curl -fsS -m 60 -X POST http://127.0.0.1:3000/api/v1/app-conversations \
  -H 'Content-Type: application/json' \
  -d '{"initial_message":{"role":"user","content":[{"type":"text","text":"non-model conversation setup probe only"}]}}')"
TASK_HEX="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"${START}")"
TASK_UUID="$(python3 -c 'import uuid; print(str(uuid.UUID("'"${TASK_HEX}"'")))')"
say "TASK=${TASK_UUID}"

STATUS=""
DETAIL=""
SB=""
for i in $(seq 1 90); do
  POLL="$(curl -fsS -m 15 "http://127.0.0.1:3000/api/v1/app-conversations/start-tasks?ids=${TASK_UUID}")"
  read -r STATUS SB DETAIL < <(python3 -c '
import json,sys
d=json.load(sys.stdin)
x=next((i for i in d if i), {})
print((x.get("status") or ""), (x.get("sandbox_id") or "-"), (x.get("detail") or "").replace("\n"," ")[:200])
' <<<"${POLL}")
  say "poll ${i} status=${STATUS} sandbox=${SB}"
  if [[ "${STATUS}" == "ERROR" || "${STATUS}" == "READY" ]]; then
    break
  fi
  sleep 2
done

if [[ -n "${SB}" && "${SB}" != "-" ]]; then
  openhands_docker inspect -f 'NetworkMode={{.HostConfig.NetworkMode}} ExtraHosts={{json .HostConfig.ExtraHosts}} Memory={{.HostConfig.Memory}} NanoCpus={{.HostConfig.NanoCpus}} PidsLimit={{.HostConfig.PidsLimit}} PortBindings={{json .HostConfig.PortBindings}}' "${SB}"
fi

PRIMARY_AFTER="$(docker -H unix:///var/run/docker.sock ps -q 2>/dev/null | wc -l | tr -d ' ' || echo 0)"
say "PRIMARY_AFTER=${PRIMARY_AFTER}"

# Cleanup sandbox after probe
if [[ -n "${SB}" && "${SB}" != "-" ]]; then
  openhands_docker rm -f "${SB}" >/dev/null || true
fi

if [[ "${STATUS}" != "READY" ]]; then
  die "non-model conversation probe failed status=${STATUS} detail=${DETAIL}"
fi
if [[ "${PRIMARY_BEFORE}" != "${PRIMARY_AFTER}" ]]; then
  die "primary Docker container count changed ${PRIMARY_BEFORE} -> ${PRIMARY_AFTER}"
fi
say "NON_MODEL_CONVERSATION_PROBE_PASS status=READY"
