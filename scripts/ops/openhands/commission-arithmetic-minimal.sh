#!/usr/bin/env bash
# OpenHands minimal arithmetic commissioning harness (#743).
#
# MUST run on corpflow-exec-01-u69678 with the dedicated OpenHands daemon.
# Cursor web cloud agents without SSH will stop at HOST_MISMATCH.
#
# Explicit non-actions: no PR merge, no dispatcher enable, no GitHub creds,
# no CorpFlow clone into sandbox, no paid models, no secret printing.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
# shellcheck source=scripts/ops/openhands/lib/common.sh
source scripts/ops/openhands/lib/common.sh

HOSTNAME_NOW="$(hostname -f 2>/dev/null || hostname || true)"
if [[ "${HOSTNAME_NOW}" != *'corpflow-exec-01'* ]]; then
  cat <<EOF
STOPPED — CURSOR WEB CANNOT ACCESS SERVER

hostname=${HOSTNAME_NOW:-unknown}
expected=corpflow-exec-01-u69678
ssh_probe=this harness refuses to invent L3 results from the cloud pod

Package prepared on PR #747:
  - docs/execution/OPENHANDS_COMMISSIONING_PROFILE_V1.md
  - runtime overrides (browser/MCP/skills gates)
  - estimate + this harness

Resume from Cursor Desktop / operator SSH that already has anton@exec-01 access:
  git fetch && git checkout ops/openhands-private-worker-package
  ./scripts/ops/openhands/commission-arithmetic-minimal.sh
EOF
  exit 78
fi

openhands_assert_isolation_context
export DOCKER_HOST="${OPENHANDS_DOCKER_HOST}"

RUN_ID="commission-$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE="/tmp/openhands-commission-evidence-${RUN_ID}.txt"
APPROVED_MODEL='groq/openai/gpt-oss-20b'
TPM_LIMIT=8000
TPM_BUDGET=$((TPM_LIMIT * 70 / 100))
# Absolute stop from completion-cap packet (combined input + reserved output).
WIRE_HARD_STOP=7000
WIRE_SOFT_TARGET=5000
OUTPUT_CAP=1024
OPENHANDS_HOME_DIR="${OPENHANDS_HOME:-$HOME/corpflowai-openhands}"
LLM_HOST_FILE="${OPENHANDS_HOME_DIR}/.env.openhands-llm"
COMPOSE_DIR="$(cd ops/openhands && pwd)"
CLEANED=0

log() { say "$*"; }

find_workspace_files() {
  local sb="$1"
  for root in /workspace/project /workspace; do
    if openhands_docker exec "${sb}" test -f "${root}/arithmetic.py" 2>/dev/null \
      && openhands_docker exec "${sb}" test -f "${root}/test_arithmetic.py" 2>/dev/null; then
      echo "${root}"
      return 0
    fi
  done
  return 1
}

cleanup() {
  local rc=$?
  if [[ "${CLEANED}" -eq 1 ]]; then
    exit "${rc}"
  fi
  CLEANED=1
  log "=== CLEANUP begin rc=${rc} ==="
  # Remove agent-server sandboxes
  for n in $(openhands_docker ps -a --format '{{.Names}}' | grep -E '^oh-agent-server-' || true); do
    openhands_docker rm -f "${n}" >/dev/null 2>&1 || true
    log "removed_sandbox=${n}"
  done
  # Scrub runtime LLM settings (presence-only checks after)
  curl -fsS -m 30 -X POST http://127.0.0.1:3000/api/v1/settings \
    -H 'Content-Type: application/json' \
    -d '{"agent_settings_diff":{"llm":{"api_key":null,"model":null}}}' >/dev/null 2>&1 || true
  # Best-effort: unset key via empty provider fields if API shape differs
  SETTINGS_AFTER="$(curl -fsS http://127.0.0.1:3000/api/v1/settings 2>/dev/null || echo '{}')"
  echo "${SETTINGS_AFTER}" | python3 -c 'import json,sys
try:
 d=json.load(sys.stdin); print("llm_api_key_set_after=", d.get("llm_api_key_set"))
except Exception as e:
 print("settings_parse_error", e)
' || true
  if [[ -f "${LLM_HOST_FILE}" ]]; then
    log "host_llm_mode=$(stat -c '%a' "${LLM_HOST_FILE}")"
  fi
  curl -fsS http://127.0.0.1:3000/health >/dev/null && log "control_plane=healthy" || log "control_plane=UNHEALTHY"
  PRIMARY_AFTER="$(docker -H unix:///var/run/docker.sock ps -q 2>/dev/null | wc -l | tr -d ' ' || echo 0)"
  log "PRIMARY_AFTER=${PRIMARY_AFTER} PRIMARY_BEFORE=${PRIMARY_BEFORE:-?}"
  log "dispatcher=SKIP_OPENHANDS_NOT_ENABLED (unchanged by this harness)"
  log "pilot=INSTALLED — INACTIVE"
  log "=== CLEANUP end ==="
  exit "${rc}"
}
trap cleanup EXIT

exec > >(tee -a "${EVIDENCE}") 2>&1
log "=== COMMISSIONING START run=${RUN_ID} host=${HOSTNAME_NOW} ==="
log "evidence=${EVIDENCE}"

HEAD="$(git rev-parse HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log "branch=${BRANCH} head=${HEAD}"

if command -v gh >/dev/null 2>&1 && [[ "${OPENHANDS_PR747_DRAFT_VERIFIED:-}" != "YES" ]]; then
  PR_JSON="$(gh pr view 747 --json isDraft,state 2>/dev/null || true)"
  log "pr747=${PR_JSON}"
  echo "${PR_JSON}" | grep -q '"isDraft":true' || die "PR #747 must remain draft"
  echo "${PR_JSON}" | grep -q '"state":"OPEN"' || die "PR #747 must be OPEN/unmerged"
elif [[ "${OPENHANDS_PR747_DRAFT_VERIFIED:-}" == "YES" ]]; then
  log "pr747=OPENHANDS_PR747_DRAFT_VERIFIED=YES (Desktop verified)"
fi

[[ -f "${LLM_HOST_FILE}" ]] || die "missing ${LLM_HOST_FILE}"
MODE="$(stat -c '%a' "${LLM_HOST_FILE}")"
[[ "${MODE}" == "600" ]] || die "LLM host file mode must be 600 (got ${MODE})"
awk -F= '
  /^LLM_PROVIDER=/{print}
  /^LLM_MODEL=/{print}
  /^LLM_API_KEY=/{ if ($2=="" || $2 ~ /REPLACE|ENTER|</) print "LLM_API_KEY=EMPTY"; else print "LLM_API_KEY=SET_NONPLACEHOLDER" }
' "${LLM_HOST_FILE}"
grep -q '^LLM_MODEL=groq/openai/gpt-oss-20b$' "${LLM_HOST_FILE}" \
  || die "host model must remain ${APPROVED_MODEL}"
grep -q '^LLM_PROVIDER=groq$' "${LLM_HOST_FILE}" || die "LLM_PROVIDER must be groq"

# Ensure compose commissioning mounts are live (recreate if env missing)
curl -fsS http://127.0.0.1:3000/health >/dev/null
ENV_DUMP="$(openhands_docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' corpflowai-openhands-app)"
if ! echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_ENABLE_BROWSER=0$'; then
  log "recreating control plane to pick up commissioning overrides"
  (
    cd "${COMPOSE_DIR}"
    openhands_docker compose -f compose.yaml up -d --force-recreate corpflowai-openhands-app
  )
  for _ in $(seq 1 60); do
    curl -fsS http://127.0.0.1:3000/health >/dev/null 2>&1 && break
    sleep 2
  done
  ENV_DUMP="$(openhands_docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' corpflowai-openhands-app)"
fi
echo "${ENV_DUMP}" | grep -E '^CORPFLOWAI_(ENABLE_BROWSER|INJECT_DEFAULT_MCP|LOAD_PUBLIC_SKILLS|OH_WEB_URL)=' || true
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_ENABLE_BROWSER=0$' || die "CORPFLOWAI_ENABLE_BROWSER!=0"
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_INJECT_DEFAULT_MCP=0$' || die "CORPFLOWAI_INJECT_DEFAULT_MCP!=0"
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_MINIMAL_TOOLS=1$' || die "CORPFLOWAI_MINIMAL_TOOLS!=1"
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_SHORT_SYSTEM_PROMPT=1$' || die "CORPFLOWAI_SHORT_SYSTEM_PROMPT!=1"
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_DISABLE_DEFAULT_BUILTIN_TOOLS=1$' || die "CORPFLOWAI_DISABLE_DEFAULT_BUILTIN_TOOLS!=1"
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_MAX_OUTPUT_TOKENS=1024$' || die "CORPFLOWAI_MAX_OUTPUT_TOKENS!=1024"
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_LOAD_PUBLIC_SKILLS=0$' || die "CORPFLOWAI_LOAD_PUBLIC_SKILLS!=0"
echo "${ENV_DUMP}" | grep -q '^OH_WEB_URL=http://corpflowai-openhands-app:3000$' || die "OH_WEB_URL wrong"

PRIMARY_BEFORE="$(docker -H unix:///var/run/docker.sock ps -q 2>/dev/null | wc -l | tr -d ' ' || echo 0)"
log "PRIMARY_BEFORE=${PRIMARY_BEFORE}"

# Offline estimate (warn-only)
bash scripts/ops/openhands/estimate-first-request-context.sh || true
log "tpm_budget=${TPM_BUDGET} (70% of ${TPM_LIMIT})"

# Scrub any leftover dry-capture proxy settings before loading the host key.
# OpenHands rejects model="" — keep a non-empty placeholder without a key.
curl -fsS -m 30 -X POST http://127.0.0.1:3000/api/v1/settings \
  -H 'Content-Type: application/json' \
  -d '{"agent_settings_diff":{"llm":{"api_key":null,"model":"gpt-5.5","base_url":null},"enable_switch_llm_tool":false},"conversation_settings_diff":{"max_iterations":8}}' >/dev/null 2>&1 || true
openhands_docker exec -i corpflowai-openhands-app python3 - <<'PY' >/dev/null 2>&1 || true
import json
from pathlib import Path
p = Path('/.openhands/settings.json')
if p.exists():
    try:
        d = json.loads(p.read_text())
    except Exception:
        d = {}
    agent = d.setdefault('agent_settings', {})
    llm = agent.setdefault('llm', {})
    if isinstance(llm, dict):
        llm['api_key'] = None
        # Empty model crashes Settings validation on next GET.
        if not llm.get('model'):
            llm['model'] = 'gpt-5.5'
        llm['base_url'] = None
        llm['reasoning_effort'] = 'low'
        llm['extended_thinking_budget'] = 0
        llm['enable_encrypted_reasoning'] = False
        llm['max_output_tokens'] = 1024
    agent['enable_switch_llm_tool'] = False
    if isinstance(agent.get('condenser'), dict):
        agent['condenser']['enabled'] = False
    p.write_text(json.dumps(d))
    print('settings_scrubbed')
PY

# Confirm settings readable after scrub
SETTINGS="$(curl -fsS http://127.0.0.1:3000/api/v1/settings || echo '{}')"
echo "${SETTINGS}" | python3 -c 'import json,sys
raw=sys.stdin.read()
try:
 d=json.loads(raw)
except Exception as e:
 print("settings_parse_error", e); raise SystemExit(0)
print("llm_api_key_set_before_load", d.get("llm_api_key_set"))
llm=((d.get("agent_settings") or {}).get("llm") or {})
print("base_url", llm.get("base_url"))
print("reasoning_effort", llm.get("reasoning_effort"))
print("extended_thinking_budget", llm.get("extended_thinking_budget"))
' || true

# Load Groq key from host file into settings (never echo key)
# shellcheck disable=SC1090
set -a
# parse only LLM_* lines without sourcing whole file into logs
LLM_PROVIDER="$(awk -F= '/^LLM_PROVIDER=/{print substr($0,index($0,"=")+1); exit}' "${LLM_HOST_FILE}")"
LLM_MODEL="$(awk -F= '/^LLM_MODEL=/{print substr($0,index($0,"=")+1); exit}' "${LLM_HOST_FILE}")"
LLM_API_KEY="$(awk -F= '/^LLM_API_KEY=/{print substr($0,index($0,"=")+1); exit}' "${LLM_HOST_FILE}")"
set +a
[[ -n "${LLM_API_KEY}" ]] || die "LLM_API_KEY empty"
[[ "${LLM_MODEL}" == "${APPROVED_MODEL}" ]] || die "model mismatch"

python3 - "${LLM_MODEL}" "${LLM_API_KEY}" <<'PY'
import json, sys, urllib.error, urllib.request
model, key = sys.argv[1], sys.argv[2]
payload = {
  "agent_settings_diff": {
    "llm": {
      "model": model,
      "api_key": key,
      "base_url": "https://api.groq.com/openai/v1",
      # gpt-oss defaults otherwise inject huge reasoning budgets into TPM.
      "max_output_tokens": 1024,
      "reasoning_effort": "low",
      "extended_thinking_budget": 0,
      "enable_encrypted_reasoning": False,
    },
    "enable_switch_llm_tool": False,
  },
  "conversation_settings_diff": {
    "max_iterations": 8,
  },
}
# Condenser disable is best-effort (schema may reject unknown shapes)
payload["agent_settings_diff"]["condenser"] = {"enabled": False}
req = urllib.request.Request(
  "http://127.0.0.1:3000/api/v1/settings",
  data=json.dumps(payload).encode(),
  headers={"Content-Type": "application/json"},
  method="POST",
)
try:
  with urllib.request.urlopen(req, timeout=60) as resp:
    print("settings_store_status", resp.status)
except urllib.error.HTTPError as e:
  body = e.read().decode("utf-8", "replace")[:500]
  print("settings_store_http_error", e.code, body)
  # Retry without condenser field
  payload["agent_settings_diff"].pop("condenser", None)
  req = urllib.request.Request(
    "http://127.0.0.1:3000/api/v1/settings",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
  )
  with urllib.request.urlopen(req, timeout=60) as resp:
    print("settings_store_status_retry", resp.status)
PY
# Wipe key from shell env
unset LLM_API_KEY
SETTINGS="$(curl -fsS http://127.0.0.1:3000/api/v1/settings)"
echo "${SETTINGS}" | python3 -c 'import json,sys
d=json.load(sys.stdin)
assert d.get("llm_api_key_set") is True
llm=((d.get("agent_settings") or {}).get("llm") or {})
print("llm_api_key_set=true OK")
print("model", llm.get("model"))
print("base_url", llm.get("base_url"))
print("reasoning_effort", llm.get("reasoning_effort"))
print("extended_thinking_budget", llm.get("extended_thinking_budget"))
print("max_output_tokens", llm.get("max_output_tokens"))
base=str(llm.get("base_url") or "")
assert "3901" not in base, base
# Groq models may keep base_url null and rely on litellm provider routing.
assert (not base) or ("groq.com" in base), base
assert str(llm.get("model") or "").startswith("groq/"), llm.get("model")
mot = llm.get("max_output_tokens")
assert mot is None or int(mot) == 1024, mot
'

INSTRUCTION='Create arithmetic.py containing:
def add(a: int, b: int) -> int:
    return a + b
Create test_arithmetic.py with tests for positive integers, negative integers, and zero.
Run the tests with local Python only (unittest). Do not install packages. Do not use the browser. Do not access GitHub or the internet except the model API. Report the test result.'

# Start conversation with run=true
START_PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({
  "initial_message": {
    "role": "user",
    "content": [{"type":"text","text": sys.argv[1]}],
    "run": True
  }
}))' "${INSTRUCTION}")"
log "initial_message.run=true confirmed in payload"
START="$(curl -fsS -m 90 -X POST http://127.0.0.1:3000/api/v1/app-conversations \
  -H 'Content-Type: application/json' \
  -d "${START_PAYLOAD}")"
TASK_HEX="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"${START}")"
TASK_UUID="$(python3 -c 'import uuid; print(str(uuid.UUID("'"${TASK_HEX}"'")))')"
log "TASK=${TASK_UUID}"

STATUS=""
DETAIL=""
SB=""
READY_SEEN=0
ERROR_SEEN=0
DEADLINE=$((SECONDS + 2700)) # 45 min wall
while (( SECONDS < DEADLINE )); do
  POLL="$(curl -fsS -m 20 "http://127.0.0.1:3000/api/v1/app-conversations/start-tasks?ids=${TASK_UUID}" || echo '[]')"
  read -r STATUS SB DETAIL < <(python3 -c '
import json,sys
d=json.load(sys.stdin)
x=next((i for i in d if i), {})
print((x.get("status") or ""), (x.get("sandbox_id") or "-"), (x.get("detail") or "").replace("\n"," ")[:240])
' <<<"${POLL}")
  log "poll status=${STATUS} sandbox=${SB}"
  if [[ -n "${SB}" && "${SB}" != "-" ]]; then
    openhands_docker inspect -f 'NetworkMode={{.HostConfig.NetworkMode}} ExtraHosts={{json .HostConfig.ExtraHosts}} Memory={{.HostConfig.Memory}} NanoCpus={{.HostConfig.NanoCpus}} PidsLimit={{.HostConfig.PidsLimit}} PortBindings={{json .HostConfig.PortBindings}}' "${SB}" || true
  fi
  case "${STATUS}" in
    READY) READY_SEEN=1 ;;
    ERROR) ERROR_SEEN=1; break ;;
  esac
  # After READY, look for arithmetic files via docker exec if sandbox still up
  if [[ "${READY_SEEN}" -eq 1 && -n "${SB}" && "${SB}" != "-" ]]; then
    WS_ROOT="$(find_workspace_files "${SB}" || true)"
    if [[ -n "${WS_ROOT}" ]]; then
      log "FOUND arithmetic files under ${WS_ROOT}"
      openhands_docker exec "${SB}" sh -c "ls -la '${WS_ROOT}/arithmetic.py' '${WS_ROOT}/test_arithmetic.py'; cd '${WS_ROOT}' && python -m unittest test_arithmetic.py" || true
      break
    fi
  fi
  # Detect rate limit in detail without looping forever
  if echo "${DETAIL}" | grep -qiE 'rate_limit|413|tokens per minute|Request too large'; then
    log "GROQ_RATE_LIMIT_OR_OVERSIZE detail=${DETAIL}"
    die "STOPPED — CONTEXT CANNOT FIT GROQ FREE LIMIT (live)"
  fi
  sleep 5
done

if [[ "${ERROR_SEEN}" -eq 1 ]]; then
  die "STOPPED — GROQ MODEL RESPONSE FAILED OR AGENT ERROR status=${STATUS} detail=${DETAIL}"
fi

WS_ROOT="$(find_workspace_files "${SB}" || true)"
if [[ -n "${WS_ROOT}" ]]; then
  log "FILES_OK root=${WS_ROOT}"
  if openhands_docker exec "${SB}" sh -c "cd '${WS_ROOT}' && python -m unittest test_arithmetic.py"; then
    log "TESTS_OK"
    log "FUNCTIONAL COMMISSIONING VERIFIED (pending cleanup confirmation)"
  else
    die "STOPPED — AGENT TOOL EXECUTION FAILED (tests)"
  fi
else
  die "STOPPED — AGENT TOOL EXECUTION FAILED (files missing) status=${STATUS}"
fi
