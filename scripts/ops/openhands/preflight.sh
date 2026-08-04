#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — preflight checks
#
# STATUS: INACTIVE package (issue #743). READ-ONLY — never installs, starts,
# or modifies anything. Intended to be run before any future authorized
# install to confirm the host and repo are in a sane state.
#
# Checks:
#   - docker + docker compose plugin present and responsive
#   - ops/openhands/compose.yaml exists and parses
#   - ops/openhands/.env.example placeholders are NOT filled with what looks
#     like a real secret, and the file is not accidentally tracked with real
#     values in git
#   - loopback port 127.0.0.1:3000 (from OPENHANDS_PORT, default 3000) is free
#   - disk headroom on the filesystem backing Docker's data root
#
# Never prints secret values. Only reports pass/fail + short reasons.
#
# Usage:
#   bash scripts/ops/openhands/preflight.sh
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed
#   2 — usage / local precondition error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"
COMPOSE_FILE="${REPO_ROOT}/ops/openhands/compose.yaml"
ENV_EXAMPLE_FILE="${REPO_ROOT}/ops/openhands/.env.example"
OPENHANDS_PORT="${OPENHANDS_PORT:-3000}"
MIN_FREE_DISK_GIB="${OPENHANDS_PREFLIGHT_MIN_FREE_DISK_GIB:-10}"

usage() {
  cat <<'USAGE'
Usage: preflight.sh [--help]

Read-only preflight checks for an eventual, separately authorized OpenHands
install. Never installs or starts anything. Exits non-zero if any check
fails.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ "$#" -gt 0 ]]; then
  warn "unexpected argument(s): $*"
  usage
  exit 2
fi

FAILURES=()

fail() {
  FAILURES+=("$1")
  say "FAIL: $1"
}

pass() {
  say "PASS: $1"
}

check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    fail "docker binary not found on PATH"
    return
  fi
  if ! docker version >/dev/null 2>&1; then
    fail "docker daemon not responding (docker version failed)"
    return
  fi
  pass "docker present and responsive"

  if ! docker compose version >/dev/null 2>&1; then
    fail "docker compose plugin not available (docker compose version failed)"
    return
  fi
  pass "docker compose plugin available"
}

check_compose_file() {
  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    fail "compose file missing: ${COMPOSE_FILE}"
    return
  fi
  pass "compose file present: ${COMPOSE_FILE}"

  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    if docker compose -f "${COMPOSE_FILE}" config >/dev/null 2>/tmp/corpflowai-openhands-preflight-compose.err; then
      pass "compose file parses cleanly"
    else
      fail "compose file failed to parse (see /tmp/corpflowai-openhands-preflight-compose.err)"
    fi
  else
    warn "skipping compose parse check — docker compose unavailable"
  fi
}

check_env_example_placeholders() {
  if [[ ! -f "${ENV_EXAMPLE_FILE}" ]]; then
    fail ".env.example missing: ${ENV_EXAMPLE_FILE}"
    return
  fi

  # Look for lines that assign a value that does NOT look like one of our
  # documented placeholder patterns and does NOT look like a safe default
  # (digits, 0/1, empty). This is a heuristic, not a secret scanner —
  # it exists to catch an accidental paste of a real key into the example
  # file, not to replace a real secret-scanning tool.
  local suspicious
  suspicious="$(grep -E '^[A-Z_][A-Z0-9_]*=' "${ENV_EXAMPLE_FILE}" \
    | grep -vE '=(<ENTER_DIRECTLY_IN_APPROVED_SECRET_STORE>|[0-9]+|)$' \
    || true)"
  if [[ -n "${suspicious}" ]]; then
    fail ".env.example contains non-placeholder-looking value(s) — review manually (values not printed here)"
    # Print only the variable NAMES, never the values.
    printf '%s\n' "${suspicious}" | awk -F= '{print "  suspicious var name: " $1}'
  else
    pass ".env.example placeholders look clean (no unexpected literal values)"
  fi

  if git -C "${REPO_ROOT}" check-ignore -q "ops/openhands/.env" 2>/dev/null; then
    pass "ops/openhands/.env is git-ignored (safe if a real file is created later)"
  else
    warn "ops/openhands/.env is NOT confirmed git-ignored — verify .gitignore before creating a real .env"
  fi
}

check_port_free() {
  local port="${OPENHANDS_PORT}"
  local in_use=0
  if command -v ss >/dev/null 2>&1; then
    if ss -Hltn "( sport = :${port} )" 2>/dev/null | grep -q ":${port}"; then
      in_use=1
    fi
  elif command -v netstat >/dev/null 2>&1; then
    if netstat -ltn 2>/dev/null | grep -q ":${port} "; then
      in_use=1
    fi
  else
    warn "neither ss nor netstat available — cannot verify port ${port} is free"
    return
  fi

  if [[ "${in_use}" -eq 1 ]]; then
    fail "loopback port ${port} appears to be in use already"
  else
    pass "loopback port ${port} appears free"
  fi
}

check_disk_headroom() {
  local docker_root="/var/lib/docker"
  local target="${docker_root}"
  if [[ ! -d "${target}" ]]; then
    target="/"
  fi
  if ! command -v df >/dev/null 2>&1; then
    warn "df unavailable — cannot verify disk headroom"
    return
  fi
  local avail_kib
  avail_kib="$(df -Pk "${target}" 2>/dev/null | awk 'NR==2 {print $4}')"
  if [[ -z "${avail_kib}" ]]; then
    warn "could not parse df output for ${target} — skipping disk headroom check"
    return
  fi
  local avail_gib=$((avail_kib / 1024 / 1024))
  if [[ "${avail_gib}" -lt "${MIN_FREE_DISK_GIB}" ]]; then
    fail "only ${avail_gib} GiB free on $(df -P "${target}" | awk 'NR==2{print $NF}') — below minimum ${MIN_FREE_DISK_GIB} GiB"
  else
    pass "${avail_gib} GiB free on $(df -P "${target}" | awk 'NR==2{print $NF}') (minimum ${MIN_FREE_DISK_GIB} GiB)"
  fi
}

main() {
  say "start (read-only preflight — nothing will be installed or started)"

  check_docker
  check_compose_file
  check_env_example_placeholders
  check_port_free
  check_disk_headroom

  if [[ "${#FAILURES[@]}" -eq 0 ]]; then
    say "OK — all preflight checks passed. This is NOT authorization to install."
    exit 0
  fi

  say "FAIL — ${#FAILURES[@]} preflight check(s) failed"
  exit 1
}

main "$@"
