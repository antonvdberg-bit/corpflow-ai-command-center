#!/usr/bin/env bash
# CorpFlowAI — Cursor Cloud → ERPNext sandbox SSH local-port-forward helper (#893).
#
# Reuses the existing loopback-only sandbox path (corpflow-exec-01 :8080).
# Never prints secret values. Never opens a public ERPNext endpoint.
#
# Required Cursor Cloud secret (Secrets tab / environment secrets):
#   CORPFLOW_EXEC01_SSH_PRIVATE_KEY  — PEM private key or base64(PEM)
#
# Optional overrides (non-secret):
#   CORPFLOW_EXEC01_SSH_HOST   default 5.78.213.185
#   CORPFLOW_EXEC01_SSH_USER   default anton
#   CORPFLOW_EXEC01_SSH_PORT   default 22
#   CORPFLOW_ERPNEXT_LOCAL_PORT default 8080
#   CORPFLOW_ERPNEXT_REMOTE_PORT default 8080
#
# Usage:
#   scripts/erpnext/cursor-cloud-sandbox-tunnel.sh start
#   scripts/erpnext/cursor-cloud-sandbox-tunnel.sh status
#   scripts/erpnext/cursor-cloud-sandbox-tunnel.sh stop
#   scripts/erpnext/cursor-cloud-sandbox-tunnel.sh ssh -- <remote command...>

set -euo pipefail

HOST="${CORPFLOW_EXEC01_SSH_HOST:-5.78.213.185}"
USER_NAME="${CORPFLOW_EXEC01_SSH_USER:-anton}"
SSH_PORT="${CORPFLOW_EXEC01_SSH_PORT:-22}"
LOCAL_PORT="${CORPFLOW_ERPNEXT_LOCAL_PORT:-8080}"
REMOTE_PORT="${CORPFLOW_ERPNEXT_REMOTE_PORT:-8080}"

STATE_DIR="${CORPFLOW_ERPNEXT_TUNNEL_STATE_DIR:-${TMPDIR:-/tmp}/corpflow-erpnext-tunnel}"
KEY_FILE="${STATE_DIR}/id_ed25519"
PID_FILE="${STATE_DIR}/ssh.pid"
CONTROL_SOCKET="${STATE_DIR}/ssh.sock"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

require_secret_present() {
  if [[ -z "${CORPFLOW_EXEC01_SSH_PRIVATE_KEY:-}" ]]; then
    die "CORPFLOW_EXEC01_SSH_PRIVATE_KEY is not set in this Cursor Cloud run (secure path not configured)."
  fi
}

materialize_key() {
  require_secret_present
  mkdir -p "${STATE_DIR}"
  chmod 700 "${STATE_DIR}"
  # Accept PEM as-is, or base64-encoded PEM (single line).
  local raw="${CORPFLOW_EXEC01_SSH_PRIVATE_KEY}"
  if [[ "${raw}" == *"BEGIN "* ]]; then
    printf '%s\n' "${raw}" >"${KEY_FILE}"
  else
    if ! printf '%s' "${raw}" | base64 -d >"${KEY_FILE}" 2>/dev/null; then
      die "CORPFLOW_EXEC01_SSH_PRIVATE_KEY is neither PEM nor base64(PEM)."
    fi
    if ! grep -q 'BEGIN ' "${KEY_FILE}" 2>/dev/null; then
      die "Decoded CORPFLOW_EXEC01_SSH_PRIVATE_KEY does not look like a PEM key."
    fi
  fi
  # Normalize Windows newlines if present.
  sed -i 's/\r$//' "${KEY_FILE}"
  chmod 600 "${KEY_FILE}"
}

ssh_base() {
  # -n: no stdin; BatchMode: never prompt; IdentitiesOnly: only this key.
  ssh \
    -i "${KEY_FILE}" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new \
    -o UserKnownHostsFile="${STATE_DIR}/known_hosts" \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -p "${SSH_PORT}" \
    "${USER_NAME}@${HOST}" \
    "$@"
}

cmd_status() {
  local tunnel_up=0
  local loopback_up=0
  if [[ -f "${PID_FILE}" ]] && kill -0 "$(cat "${PID_FILE}")" 2>/dev/null; then
    tunnel_up=1
  fi
  if timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/${LOCAL_PORT}" 2>/dev/null; then
    loopback_up=1
  fi
  log "secure_path_secret_present: $([[ -n "${CORPFLOW_EXEC01_SSH_PRIVATE_KEY:-}" ]] && echo yes || echo no)"
  log "ssh_host: ${USER_NAME}@${HOST}:${SSH_PORT}"
  log "forward: 127.0.0.1:${LOCAL_PORT} -> remote 127.0.0.1:${REMOTE_PORT}"
  log "tunnel_process: $([[ "${tunnel_up}" -eq 1 ]] && echo up || echo down)"
  log "local_loopback_${LOCAL_PORT}: $([[ "${loopback_up}" -eq 1 ]] && echo open || echo closed)"
  if [[ "${tunnel_up}" -eq 1 && "${loopback_up}" -eq 1 ]]; then
    log "tunnel_status: PASS"
    return 0
  fi
  log "tunnel_status: FAIL"
  return 1
}

cmd_stop() {
  if [[ -f "${PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PID_FILE}")"
    if kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
      wait "${pid}" 2>/dev/null || true
    fi
    rm -f "${PID_FILE}"
  fi
  if [[ -S "${CONTROL_SOCKET}" ]]; then
    ssh -S "${CONTROL_SOCKET}" -O exit "${USER_NAME}@${HOST}" 2>/dev/null || true
    rm -f "${CONTROL_SOCKET}"
  fi
  # Keep known_hosts; remove key material from disk.
  rm -f "${KEY_FILE}"
  log "tunnel_stopped: yes"
}

cmd_start() {
  if cmd_status >/dev/null 2>&1; then
    log "tunnel_already_up: yes"
    cmd_status
    return 0
  fi
  materialize_key
  # Background local forward only (no remote shell hold via -f -N).
  ssh \
    -i "${KEY_FILE}" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new \
    -o UserKnownHostsFile="${STATE_DIR}/known_hosts" \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o ControlMaster=yes \
    -o ControlPath="${CONTROL_SOCKET}" \
    -o ControlPersist=10m \
    -f -N \
    -L "127.0.0.1:${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
    -p "${SSH_PORT}" \
    "${USER_NAME}@${HOST}"
  # Best-effort PID capture from ControlPath master is awkward; use pgrep on forward.
  pgrep -f "ssh .*${HOST}.*-L 127.0.0.1:${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" | head -1 >"${PID_FILE}" || true
  # Brief wait for bind.
  for _ in 1 2 3 4 5; do
    if timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/${LOCAL_PORT}" 2>/dev/null; then
      break
    fi
    sleep 0.4
  done
  # Remove key from disk after SSH has loaded it (agent keeps process-held key).
  rm -f "${KEY_FILE}"
  cmd_status
}

cmd_ssh() {
  materialize_key
  trap 'rm -f "${KEY_FILE}"' EXIT
  set +e
  # shellcheck disable=SC2068
  ssh_base "$@"
  local rc=$?
  set -e
  rm -f "${KEY_FILE}"
  trap - EXIT
  return "${rc}"
}

usage() {
  cat <<'EOF'
Usage: cursor-cloud-sandbox-tunnel.sh <start|status|stop|ssh> [-- remote-args...]
EOF
}

main() {
  local action="${1:-}"
  shift || true
  case "${action}" in
    start) cmd_start ;;
    status) cmd_status ;;
    stop) cmd_stop ;;
    ssh)
      if [[ "${1:-}" == "--" ]]; then shift; fi
      cmd_ssh "$@"
      ;;
    *) usage; exit 2 ;;
  esac
}

main "$@"
