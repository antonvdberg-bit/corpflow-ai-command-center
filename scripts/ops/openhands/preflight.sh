#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — preflight checks
#
# STATUS: INACTIVE package (issue #743). READ-ONLY — never installs, starts,
# or modifies anything. Intended to be run before any future authorized
# install to confirm the host and repo are in a sane state.
#
# Security follow-up for PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md): this script now ALSO
# enforces the dedicated-daemon design at the package level, independent of
# whether a daemon is actually running yet:
#   - FAILS if ops/openhands/compose.yaml references the primary socket
#     (/var/run/docker.sock) outside of documentation comments.
#   - FAILS if ops/openhands/compose.yaml references host.docker.internal
#     outside of documentation comments (extra_hosts must be REMOVED, not
#     merely unused).
#   - FAILS if OPENHANDS_DOCKER_HOST / OPENHANDS_DOCKER_SOCK (from
#     scripts/ops/openhands/lib/common.sh, env-overridable) resolve to the
#     primary socket.
#   - FAILS (--install mode only) if the dedicated socket file does not
#     exist yet — the dedicated daemon must be running before --install.
#     WARNS only (--check mode, the default) since "daemon not installed
#     yet" is the expected, safe state for this INACTIVE package.
#   - FAILS if MAX_CONCURRENT_CONVERSATIONS: "1" is missing from
#     ops/openhands/compose.yaml (the concurrency ceiling is a hard rule).
#
# Other checks (unchanged from the original package):
#   - docker + docker compose plugin present and responsive
#   - ops/openhands/compose.yaml exists and parses
#   - ops/openhands/.env.example placeholders are NOT filled with what looks
#     like a real secret, and the file is not accidentally tracked with real
#     values in git
#   - loopback port 127.0.0.1:3000 (from OPENHANDS_PORT, default 3000) is free
#   - disk headroom on the filesystem backing the DEDICATED daemon's data-root
#
# Never prints secret values. Only reports pass/fail + short reasons.
#
# Usage:
#   bash scripts/ops/openhands/preflight.sh
#   bash scripts/ops/openhands/preflight.sh --check     (default, same as no flag)
#   bash scripts/ops/openhands/preflight.sh --install   (stricter: dedicated socket MUST exist)
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
MODE="check"

usage() {
  cat <<'USAGE'
Usage: preflight.sh [--check|--install] [--help]

Read-only preflight checks for an eventual, separately authorized OpenHands
install. Never installs or starts anything. Exits non-zero if any check
fails.

  --check    (default) Dedicated-daemon-socket-missing is a WARNING, not a
             failure — the expected state before any install.
  --install  Stricter: dedicated-daemon-socket-missing is a FAILURE — the
             dedicated rootless daemon must already be running before an
             actual --install proceeds.
USAGE
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --check)
      MODE="check"
      shift
      ;;
    --install)
      MODE="install"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      warn "unexpected argument(s): $*"
      usage
      exit 2
      ;;
  esac
done

FAILURES=()

fail() {
  FAILURES+=("$1")
  say "FAIL: $1"
}

pass() {
  say "PASS: $1"
}

# Strips full-line comments (leading '#' after optional whitespace) so
# "forbidden string" checks below only ever flag an ACTIVE line, never a
# documentation comment that deliberately explains why something is
# forbidden (e.g. this file's own header, or compose.yaml's "DOCKER
# ISOLATION DESIGN" block).
noncomment_lines() {
  grep -Ev '^[[:space:]]*#' "$1" 2>/dev/null || true
}

check_docker() {
  # Deliberately client-side only (no daemon contact): `docker --version` and
  # `docker compose version` do not require ANY daemon (primary or
  # dedicated) to be reachable. This avoids conflating "is the docker CLI +
  # compose plugin installed" with "is a specific daemon up" — the latter is
  # checked separately by check_dedicated_socket_present() /
  # scripts/ops/openhands/verify-dedicated-daemon.sh, never against the
  # ambient/primary daemon here.
  if ! command -v docker >/dev/null 2>&1; then
    fail "docker binary not found on PATH"
    return
  fi
  if ! docker --version >/dev/null 2>&1; then
    fail "docker binary present but 'docker --version' failed"
    return
  fi
  pass "docker CLI present"

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
    # `compose config` renders/validates the file and resolves ${VAR}
    # substitutions from the ALREADY-EXPORTED OPENHANDS_DOCKER_SOCK (set by
    # lib/common.sh) — it does not open a daemon connection at all, so this
    # deliberately does NOT go through openhands_docker() (which fails
    # closed/exits on a bad isolation context; preflight.sh instead
    # aggregates failures via check_dedicated_docker_host_env() below and
    # must keep running the remaining checks either way).
    if docker compose -f "${COMPOSE_FILE}" config >/dev/null 2>/tmp/corpflowai-openhands-preflight-compose.err; then
      pass "compose file parses cleanly"
    else
      fail "compose file failed to parse (see /tmp/corpflowai-openhands-preflight-compose.err) — note: parsing does not require the dedicated daemon to be running, but WILL require OPENHANDS_DOCKER_SOCK / OPENHANDS_DOCKER_SOCK_IN_CONTAINER to be set for variable substitution to resolve cleanly"
    fi
  else
    warn "skipping compose parse check — docker compose unavailable"
  fi
}

check_compose_forbids_primary_socket() {
  local matches
  matches="$(noncomment_lines "${COMPOSE_FILE}" | grep -F '/var/run/docker.sock' || true)"
  if [[ -n "${matches}" ]]; then
    fail "compose file references the FORBIDDEN primary socket /var/run/docker.sock outside of a documentation comment — see docs/operations/OPENHANDS_DOCKER_ISOLATION.md"
  else
    pass "compose file does not reference /var/run/docker.sock outside of documentation comments"
  fi
}

check_compose_forbids_host_docker_internal() {
  local matches
  matches="$(noncomment_lines "${COMPOSE_FILE}" | grep -F 'host.docker.internal' || true)"
  if [[ -n "${matches}" ]]; then
    fail "compose file references host.docker.internal outside of a documentation comment — extra_hosts must be REMOVED, not merely unused"
  else
    pass "compose file does not reference host.docker.internal outside of documentation comments"
  fi
}

check_max_concurrent_conversations() {
  if grep -Eq '^[[:space:]]*MAX_CONCURRENT_CONVERSATIONS:[[:space:]]*"?1"?[[:space:]]*$' "${COMPOSE_FILE}" 2>/dev/null; then
    pass "compose file sets MAX_CONCURRENT_CONVERSATIONS: \"1\""
  else
    fail "compose file does not set MAX_CONCURRENT_CONVERSATIONS: \"1\" — the one-concurrent-task ceiling is a hard rule (docs/operations/OPENHANDS_DOCKER_ISOLATION.md, ops/openhands/VERSIONS.md)"
  fi

  if [[ -f "${ENV_EXAMPLE_FILE}" ]] && grep -Eq '^[[:space:]]*MAX_CONCURRENT_CONVERSATIONS=' "${ENV_EXAMPLE_FILE}" 2>/dev/null; then
    if grep -Eq '^[[:space:]]*MAX_CONCURRENT_CONVERSATIONS=1[[:space:]]*$' "${ENV_EXAMPLE_FILE}" 2>/dev/null; then
      pass ".env.example documents MAX_CONCURRENT_CONVERSATIONS=1"
    else
      fail ".env.example sets MAX_CONCURRENT_CONVERSATIONS to something other than 1"
    fi
  fi
}

check_dedicated_docker_host_env() {
  if [[ -z "${OPENHANDS_DOCKER_SOCK:-}" || -z "${OPENHANDS_DOCKER_HOST:-}" ]]; then
    fail "OPENHANDS_DOCKER_SOCK / OPENHANDS_DOCKER_HOST are unexpectedly unset after sourcing lib/common.sh"
    return
  fi
  if is_primary_docker_socket_path "${OPENHANDS_DOCKER_SOCK}"; then
    fail "OPENHANDS_DOCKER_SOCK resolves to the PRIMARY host socket — forbidden. See docs/operations/OPENHANDS_DOCKER_ISOLATION.md."
    return
  fi
  if docker_host_targets_primary_socket "${OPENHANDS_DOCKER_HOST}"; then
    fail "OPENHANDS_DOCKER_HOST resolves to the PRIMARY host socket — forbidden. See docs/operations/OPENHANDS_DOCKER_ISOLATION.md."
    return
  fi
  pass "OPENHANDS_DOCKER_HOST / OPENHANDS_DOCKER_SOCK resolve to a dedicated (non-primary) path"
}

check_dedicated_socket_present() {
  if [[ -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    pass "dedicated Docker socket exists and is a socket file"
    return
  fi
  if [[ "${MODE}" == "install" ]]; then
    fail "dedicated Docker socket not found at OPENHANDS_DOCKER_SOCK — the dedicated rootless daemon (scripts/ops/systemd/corpflowai-openhands-dockerd.service) must be running before --install"
  else
    warn "dedicated Docker socket not found — expected until the dedicated rootless daemon is installed and started (ops/openhands/daemon/README.md); not a --check failure"
  fi
}

check_isolation_design_files_present() {
  local required=(
    "${REPO_ROOT}/ops/openhands/daemon/README.md"
    "${REPO_ROOT}/ops/openhands/daemon/daemon.json.example"
    "${REPO_ROOT}/ops/openhands/daemon/daemon.env.example"
    "${REPO_ROOT}/ops/openhands/daemon/dockerd-rootless.service.example"
    "${REPO_ROOT}/scripts/ops/systemd/corpflowai-openhands.slice"
    "${REPO_ROOT}/scripts/ops/systemd/corpflowai-openhands-dockerd.service"
    "${REPO_ROOT}/scripts/ops/openhands/verify-dedicated-daemon.sh"
    "${REPO_ROOT}/docs/operations/OPENHANDS_DOCKER_ISOLATION.md"
  )
  local missing=0
  local f
  for f in "${required[@]}"; do
    if [[ ! -f "${f}" ]]; then
      fail "isolation design file missing: ${f#"${REPO_ROOT}/"}"
      missing=1
    fi
  done
  if [[ "${missing}" -eq 0 ]]; then
    pass "all dedicated-daemon isolation design files are present"
  fi
}

# Soft fail helper: FAIL in --install mode, WARN in --check (inactive package
# may be evaluated on a laptop without rootless packages installed).
rootless_req() {
  local msg="$1"
  if [[ "${MODE}" == "install" ]]; then
    fail "${msg}"
  else
    warn "${msg} (warn-only in --check; becomes a hard failure under --install)"
  fi
}

check_rootless_prerequisites() {
  # Never print secret values. Only tool presence + mapping-range shape.
  local bin
  for bin in dockerd-rootless.sh rootlesskit newuidmap newgidmap; do
    if command -v "${bin}" >/dev/null 2>&1; then
      pass "rootless prerequisite binary present: ${bin}"
    else
      rootless_req "rootless prerequisite binary missing: ${bin}"
    fi
  done

  # Networking helper: slirp4netns is the common default; pasta is an
  # alternate on newer stacks. At least one should exist before install.
  if command -v slirp4netns >/dev/null 2>&1; then
    pass "rootless networking helper present: slirp4netns"
  elif command -v pasta >/dev/null 2>&1; then
    pass "rootless networking helper present: pasta"
  else
    rootless_req "neither slirp4netns nor pasta found (rootless container networking)"
  fi

  local user_name
  user_name="$(id -un 2>/dev/null || true)"
  if [[ -z "${user_name}" ]]; then
    rootless_req "could not resolve invoking username for /etc/subuid|/etc/subgid checks"
  else
    if [[ -r /etc/subuid ]] && grep -E "^${user_name}:" /etc/subuid >/dev/null 2>&1; then
      # Range size not printed (avoid leaking host mapping layout into logs
      # beyond presence). Require count >= 65536 when parseable.
      local subuid_line count
      subuid_line="$(grep -E "^${user_name}:" /etc/subuid | head -n1)"
      count="$(printf '%s' "${subuid_line}" | awk -F: '{print $3}')"
      if [[ "${count}" =~ ^[0-9]+$ ]] && [[ "${count}" -ge 65536 ]]; then
        pass "/etc/subuid has a valid >=65536 range for invoking user"
      else
        rootless_req "/etc/subuid entry for invoking user missing or range < 65536"
      fi
    else
      rootless_req "/etc/subuid has no readable entry for invoking user"
    fi
    if [[ -r /etc/subgid ]] && grep -E "^${user_name}:" /etc/subgid >/dev/null 2>&1; then
      local subgid_line gcount
      subgid_line="$(grep -E "^${user_name}:" /etc/subgid | head -n1)"
      gcount="$(printf '%s' "${subgid_line}" | awk -F: '{print $3}')"
      if [[ "${gcount}" =~ ^[0-9]+$ ]] && [[ "${gcount}" -ge 65536 ]]; then
        pass "/etc/subgid has a valid >=65536 range for invoking user"
      else
        rootless_req "/etc/subgid entry for invoking user missing or range < 65536"
      fi
    else
      rootless_req "/etc/subgid has no readable entry for invoking user"
    fi
  fi

  if [[ -f /sys/fs/cgroup/cgroup.controllers ]] || [[ -f /sys/fs/cgroup/cgroup.subtree_control ]]; then
    pass "cgroup v2 appears available"
  else
    rootless_req "cgroup v2 not detected (needed for reliable slice/Delegate resource control)"
  fi

  if command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
    pass "systemd user manager appears available"
  else
    rootless_req "systemd user manager not available (systemctl --user)"
  fi

  # Linger is required for user services to survive logout — presence-only.
  if command -v loginctl >/dev/null 2>&1; then
    local linger_state
    linger_state="$(loginctl show-user "${user_name}" -p Linger --value 2>/dev/null || echo unknown)"
    if [[ "${linger_state}" == "yes" ]]; then
      pass "loginctl Linger=yes for invoking user"
    else
      rootless_req "loginctl Linger is not yes for invoking user (needed for user dockerd after logout); state=${linger_state}"
    fi
  else
    warn "loginctl unavailable — cannot verify Linger (warn-only)"
  fi

  # Path ownership / forbidden primary paths (no secret values).
  if is_primary_docker_socket_path "${OPENHANDS_DOCKER_SOCK}"; then
    fail "dedicated socket path equals primary /var/run/docker.sock — forbidden"
  else
    pass "dedicated socket path is not the primary Docker socket"
  fi
  if [[ "${OPENHANDS_DOCKER_DATA_ROOT}" == "/var/lib/docker" ]] || [[ "${OPENHANDS_DOCKER_DATA_ROOT}" == /var/lib/docker/* ]]; then
    fail "dedicated data-root must not be /var/lib/docker (primary daemon)"
  else
    pass "dedicated data-root is not /var/lib/docker"
  fi

  if [[ -d "${OPENHANDS_HOME}" ]]; then
    if [[ -O "${OPENHANDS_HOME}" ]]; then
      pass "OPENHANDS_HOME exists and is owned by invoking user"
    else
      rootless_req "OPENHANDS_HOME exists but is not owned by invoking user"
    fi
  else
    warn "OPENHANDS_HOME directory does not exist yet (expected pre-install); create with invoking-user ownership at install gate"
  fi

  # Dockerd unit must not reference application .env (secret separation).
  local dockerd_unit="${REPO_ROOT}/scripts/ops/systemd/corpflowai-openhands-dockerd.service"
  if [[ -f "${dockerd_unit}" ]]; then
    if grep -E '^[[:space:]]*EnvironmentFile=.*ops/openhands/\.env' "${dockerd_unit}" >/dev/null 2>&1; then
      fail "dockerd unit must not EnvironmentFile= ops/openhands/.env (application secrets)"
    else
      pass "dockerd unit does not EnvironmentFile= ops/openhands/.env"
    fi
    if grep -E '^[[:space:]]*NoNewPrivileges=yes' "${dockerd_unit}" >/dev/null 2>&1; then
      fail "dockerd unit must not set NoNewPrivileges=yes (incompatible with stock rootless newuidmap/newgidmap)"
    else
      pass "dockerd unit does not set NoNewPrivileges=yes"
    fi
  fi
}

check_env_example_placeholders() {
  if [[ ! -f "${ENV_EXAMPLE_FILE}" ]]; then
    fail ".env.example missing: ${ENV_EXAMPLE_FILE}"
    return
  fi

  # Look for lines that assign a value that does NOT look like one of our
  # documented placeholder patterns and does NOT look like a safe default
  # (empty, digits, true/false, a <REPLACE_ME_...> / <ENTER_...> placeholder,
  # or a dedicated corpflowai-openhands path/socket URL). Uses bash glob
  # matching (not a fragile regex) so each case is explicit and readable.
  # This is a heuristic, not a secret scanner — it exists to catch an
  # accidental paste of a real key into the example file, not to replace a
  # real secret-scanning tool.
  local candidates line name value
  local suspicious=""
  candidates="$(grep -E '^[A-Z_][A-Z0-9_]*=' "${ENV_EXAMPLE_FILE}" || true)"
  while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    name="${line%%=*}"
    value="${line#*=}"
    case "${value}" in
      '')
        continue
        ;;
      '<ENTER_DIRECTLY_IN_APPROVED_SECRET_STORE>')
        continue
        ;;
      '<REPLACE_ME_'*'>')
        continue
        ;;
      [0-9]*)
        continue
        ;;
      true|false)
        continue
        ;;
      *corpflowai-openhands*)
        continue
        ;;
      *)
        suspicious+="  suspicious var name: ${name}"$'\n'
        ;;
    esac
  done <<< "${candidates}"

  if [[ -n "${suspicious}" ]]; then
    fail ".env.example contains non-placeholder-looking value(s) — review manually (values not printed here)"
    # Print only the variable NAMES, never the values.
    printf '%s' "${suspicious}"
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
  # Checks headroom on the filesystem backing the DEDICATED daemon's
  # data-root, not /var/lib/docker (the primary daemon) — the dedicated
  # daemon's images/containers/volumes live entirely under OPENHANDS_HOME.
  local target="${OPENHANDS_DOCKER_DATA_ROOT}"
  if [[ ! -d "${target}" ]]; then
    # Data-root directory does not exist yet (expected pre-install) — check
    # the parent (OPENHANDS_HOME, or its own parent) so the report is still
    # meaningful before the dedicated daemon has ever started.
    target="${OPENHANDS_HOME}"
    [[ -d "${target}" ]] || target="$(dirname "${target}")"
    [[ -d "${target}" ]] || target="/"
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
    fail "only ${avail_gib} GiB free on $(df -P "${target}" | awk 'NR==2{print $NF}') (backing OPENHANDS_DOCKER_DATA_ROOT) — below minimum ${MIN_FREE_DISK_GIB} GiB"
  else
    pass "${avail_gib} GiB free on $(df -P "${target}" | awk 'NR==2{print $NF}') (backing OPENHANDS_DOCKER_DATA_ROOT; minimum ${MIN_FREE_DISK_GIB} GiB)"
  fi
}

main() {
  say "start (read-only preflight, mode=${MODE} — nothing will be installed or started)"

  check_docker
  check_compose_file
  check_compose_forbids_primary_socket
  check_compose_forbids_host_docker_internal
  check_max_concurrent_conversations
  check_dedicated_docker_host_env
  check_dedicated_socket_present
  check_isolation_design_files_present
  check_rootless_prerequisites
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

main
