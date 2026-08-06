#!/usr/bin/env bash
# OpenHands wire-payload dry capture — NO Groq credential, NO provider send.
# Builds the real agent-server completion request and intercepts it on a
# control-plane capture proxy (corpflowai-openhands-app:3901).
#
# Gate: combined_requested (input_est + reserved_output) < 7000 (prefer <= 5000);
# reserved_output must be <= 1024 (LiteLLM otherwise defaults to 32768).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
# shellcheck source=scripts/ops/openhands/lib/common.sh
source scripts/ops/openhands/lib/common.sh

HOSTNAME_NOW="$(hostname -f 2>/dev/null || hostname || true)"
if [[ "${HOSTNAME_NOW}" != *'corpflow-exec-01'* ]]; then
  echo "STOPPED — HOST_MISMATCH (need corpflow-exec-01)"
  exit 78
fi

openhands_assert_isolation_context
export DOCKER_HOST="${OPENHANDS_DOCKER_HOST}"

RUN_ID="wire-dry-$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE="/tmp/openhands-wire-dry-${RUN_ID}.txt"
CAPTURE_HOST="/tmp/corpflowai-wire-capture-${RUN_ID}.json"
CAPTURE_IN_APP="/tmp/corpflowai-wire-capture.json"
HARD_STOP=7000
SOFT_TARGET=5000
OUTPUT_CAP=1024
COMPOSE_DIR="$(cd ops/openhands && pwd)"
PROXY_STARTED=0
CLEANED=0

log() { say "$*"; }

cleanup() {
  local rc=$?
  [[ "${CLEANED}" -eq 1 ]] && exit "${rc}"
  CLEANED=1
  log "=== CLEANUP begin rc=${rc} ==="
  openhands_docker exec corpflowai-openhands-app \
    pkill -f wire_capture_proxy.py >/dev/null 2>&1 || true
  for n in $(openhands_docker ps -a --format '{{.Names}}' | grep -E '^oh-agent-server-' || true); do
    openhands_docker rm -f "${n}" >/dev/null 2>&1 || true
    log "removed_sandbox=${n}"
  done
  # OpenHands rejects model="" — scrub key with a non-empty placeholder.
  curl -fsS -m 30 -X POST http://127.0.0.1:3000/api/v1/settings \
    -H 'Content-Type: application/json' \
    -d '{"agent_settings_diff":{"llm":{"api_key":null,"model":"gpt-5.5","base_url":null}}}' >/dev/null 2>&1 || true
  curl -fsS http://127.0.0.1:3000/health >/dev/null && log "control_plane=healthy" || log "control_plane=UNHEALTHY"
  log "=== CLEANUP end ==="
  exit "${rc}"
}
trap cleanup EXIT

exec > >(tee -a "${EVIDENCE}") 2>&1
log "=== WIRE DRY CAPTURE START run=${RUN_ID} ==="
log "head=$(git rev-parse HEAD)"

# Recreate control plane so short-prompt env/overrides are live
(
  cd "${COMPOSE_DIR}"
  openhands_docker compose -f compose.yaml up -d --force-recreate corpflowai-openhands-app
)
for _ in $(seq 1 60); do
  curl -fsS -m 3 http://127.0.0.1:3000/health >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS http://127.0.0.1:3000/health
echo

ENV_DUMP="$(openhands_docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' corpflowai-openhands-app)"
echo "${ENV_DUMP}" | grep -E '^CORPFLOWAI_(SHORT_SYSTEM_PROMPT|DISABLE_DEFAULT_BUILTIN_TOOLS|MINIMAL_TOOLS|SKIP_WEB_HOST_SUFFIX|MAX_OUTPUT_TOKENS)=' || true
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_SHORT_SYSTEM_PROMPT=1$' || die "SHORT_SYSTEM_PROMPT!=1"
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_MINIMAL_TOOLS=1$' || die "MINIMAL_TOOLS!=1"
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_DISABLE_DEFAULT_BUILTIN_TOOLS=1$' || die "DISABLE_DEFAULT_BUILTIN_TOOLS!=1"
echo "${ENV_DUMP}" | grep -q '^CORPFLOWAI_MAX_OUTPUT_TOKENS=1024$' || die "MAX_OUTPUT_TOKENS!=1024"

bash scripts/ops/openhands/verify-private-bind.sh
bash scripts/ops/openhands/verify-sandbox-boundary.sh

# Install analyzer + proxy into control-plane container (no Groq key)
openhands_docker cp ops/openhands/runtime-overrides/commissioning_prompt.py \
  corpflowai-openhands-app:/tmp/commissioning_prompt.py
openhands_docker cp ops/openhands/runtime-overrides/wire_capture_proxy.py \
  corpflowai-openhands-app:/tmp/wire_capture_proxy.py
openhands_docker exec corpflowai-openhands-app \
  pkill -f wire_capture_proxy.py >/dev/null 2>&1 || true
openhands_docker exec -d -e CORPFLOWAI_WIRE_CAPTURE_PATH="${CAPTURE_IN_APP}" \
  corpflowai-openhands-app \
  python3 /tmp/wire_capture_proxy.py
PROXY_STARTED=1
for _ in $(seq 1 30); do
  openhands_docker exec corpflowai-openhands-app \
    curl -fsS -m 2 http://127.0.0.1:3901/health >/dev/null 2>&1 && break
  sleep 1
done
openhands_docker exec corpflowai-openhands-app curl -fsS http://127.0.0.1:3901/health
echo

# Point settings at capture proxy with a non-secret placeholder key (never Groq)
# Mirror production commissioning LLM knobs (no huge reasoning budget / condenser).
python3 - <<'PY'
import json, urllib.request
payload = {
  "agent_settings_diff": {
    "llm": {
      "model": "groq/openai/gpt-oss-20b",
      "api_key": "corpflowai-wire-capture-dry-key",
      "base_url": "http://corpflowai-openhands-app:3901/v1",
      # Belt-and-suspenders with live_status commissioning override.
      "max_output_tokens": 1024,
      "reasoning_effort": "low",
      "extended_thinking_budget": 0,
      "enable_encrypted_reasoning": False,
    },
    "condenser": {"enabled": False},
    "enable_switch_llm_tool": False,
  },
  "conversation_settings_diff": {"max_iterations": 2},
}
req = urllib.request.Request(
  "http://127.0.0.1:3000/api/v1/settings",
  data=json.dumps(payload).encode(),
  headers={"Content-Type": "application/json"},
  method="POST",
)
with urllib.request.urlopen(req, timeout=60) as resp:
  print("settings_store_status", resp.status)
PY

INSTRUCTION='Create arithmetic.py containing:
def add(a: int, b: int) -> int:
    return a + b
Create test_arithmetic.py with tests for positive integers, negative integers, and zero.
Run the tests with local Python only (unittest). Do not install packages. Do not use the browser. Do not access GitHub or the internet except the model API. Report the test result.'

START_PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({
  "initial_message": {
    "role": "user",
    "content": [{"type":"text","text": sys.argv[1]}],
    "run": True
  }
}))' "${INSTRUCTION}")"

log "starting conversation (run=true) against wire-capture proxy"
CONV_RESP="$(curl -fsS -m 180 -X POST http://127.0.0.1:3000/api/v1/app-conversations \
  -H 'Content-Type: application/json' \
  -d "${START_PAYLOAD}" || true)"
echo "conv_resp_chars=${#CONV_RESP}"
echo "${CONV_RESP}" | python3 -c 'import json,sys
try:
 d=json.load(sys.stdin)
 print("keys", sorted(d.keys())[:20])
 print("id", d.get("id") or d.get("conversation_id") or d.get("app_conversation_id"))
except Exception as e:
 print("parse_err", e); print(sys.stdin.read()[:500] if False else "")
' || true

# Wait for capture file
for _ in $(seq 1 90); do
  if openhands_docker exec corpflowai-openhands-app test -s "${CAPTURE_IN_APP}"; then
    break
  fi
  sleep 2
done

openhands_docker cp "corpflowai-openhands-app:${CAPTURE_IN_APP}" "${CAPTURE_HOST}" || true
if [[ ! -s "${CAPTURE_HOST}" ]]; then
  log "NO_CAPTURE — dumping recent sandbox logs"
  SB="$(openhands_docker ps -a --format '{{.Names}}' | grep oh-agent-server | head -1 || true)"
  [[ -n "${SB}" ]] && openhands_docker logs --tail 80 "${SB}" || true
  die "wire capture file missing — agent never reached completion proxy"
fi

python3 - "${CAPTURE_HOST}" "${HARD_STOP}" "${SOFT_TARGET}" "${OUTPUT_CAP}" <<'PY'
import json, sys
path, hard, soft, out_cap = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
d = json.load(open(path, encoding="utf-8"))
tok = int(d.get("total_tokens_est") or d.get("input_tokens_est") or 0)
reserved = d.get("reserved_output_tokens")
try:
    reserved_i = int(reserved) if reserved is not None else None
except (TypeError, ValueError):
    reserved_i = None
combined = int(d.get("combined_requested_tokens_est") or (tok + (reserved_i or 0)))
print("CAPTURE_SUMMARY")
print("model", d.get("model"))
print("input_tokens_est", tok)
print("total_serialized_chars", d.get("total_serialized_chars"))
print("message_count", d.get("message_count"))
print("tool_count", d.get("tool_count"))
print("tool_names", d.get("tool_names"))
print("tool_schema_tokens_est", d.get("tool_schema_tokens_est"))
print("max_completion_tokens", d.get("max_completion_tokens"))
print("max_tokens", d.get("max_tokens"))
print("max_output_tokens", d.get("max_output_tokens"))
print("reasoning_effort", d.get("reasoning_effort"))
print("reserved_output_tokens", reserved_i)
print("combined_requested_tokens_est", combined)
print("output_cap_ok", d.get("output_cap_ok"))
print("duplicated_system_block", d.get("duplicated_system_block"))
print("duplicate_blocks", d.get("duplicate_blocks"))
print("under_hard_stop", combined < hard, "hard", hard)
print("under_soft_target", combined <= soft, "soft", soft)
largest = d.get("largest_message") or {}
print("largest_message_role", largest.get("role"), "tokens", largest.get("tokens_est"), "component", largest.get("component_guess"))
for m in d.get("messages") or []:
    print(f"msg[{m.get('index')}] role={m.get('role')} tok={m.get('tokens_est')} component={m.get('component_guess')} sha={m.get('sha16')}")
# Provider-bound completion cap must be present and <= 1024
if reserved_i is None:
    print("GATE=FAIL missing reserved_output_tokens (LiteLLM may still use 32768)")
    sys.exit(47)
if reserved_i > out_cap:
    print("GATE=FAIL output reservation overridden", reserved_i, ">", out_cap)
    sys.exit(48)
# Detect a second larger field overriding the intended cap
fields = {
    "max_completion_tokens": d.get("max_completion_tokens"),
    "max_tokens": d.get("max_tokens"),
    "max_output_tokens": d.get("max_output_tokens"),
}
oversized = []
for name, val in fields.items():
    if val is None:
        continue
    try:
        iv = int(val)
    except (TypeError, ValueError):
        continue
    if iv > out_cap:
        oversized.append((name, iv))
if oversized:
    print("GATE=FAIL second field overrides cap", oversized)
    sys.exit(48)
if combined >= hard:
    print("GATE=FAIL combined_requested >= hard stop")
    sys.exit(42)
# Extra gates from packet
tools = d.get("tool_names") or []
if len(tools) > 4:
    print("GATE=FAIL too many tools", tools)
    sys.exit(43)
banned = [t for t in tools if any(x in t.lower() for x in ("browser", "navigate", "create_pr", "task_tracker"))]
if banned:
    print("GATE=FAIL banned tools", banned)
    sys.exit(44)
if d.get("duplicated_system_block"):
    print("GATE=FAIL duplicated system")
    sys.exit(45)
if largest.get("tokens_est", 0) > 2000:
    print("GATE=FAIL largest message > 2000")
    sys.exit(46)
print("GATE=PASS")
PY
GATE_RC=$?
log "evidence=${EVIDENCE} capture=${CAPTURE_HOST}"
if [[ "${GATE_RC}" -eq 42 ]]; then
  log "STOPPED — COMPLETION CAP NOT SUFFICIENT"
  exit 42
fi
if [[ "${GATE_RC}" -eq 47 || "${GATE_RC}" -eq 48 ]]; then
  log "STOPPED — OUTPUT CAP OVERRIDDEN"
  exit "${GATE_RC}"
fi
[[ "${GATE_RC}" -eq 0 ]] || die "wire-size gate failed rc=${GATE_RC}"
log "WIRE_SIZE_GATE=PASS"
exit 0
