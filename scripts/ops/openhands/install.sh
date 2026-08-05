#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — install entry point
#
# STATUS: INACTIVE package (issue #743). This is the single entry point for
# this package's lifecycle. The default mode is --check (read-only). The
# --install mode is HARD-GATED and refuses to run unless ALL of:
#   1. OPENHANDS_INSTALL_APPROVED=YES is set in the environment, AND
#   2. --i-understand-protected-action is passed on the command line, AND
#   3. (security follow-up for PR #747 — dedicated Docker isolation design,
#      see docs/operations/OPENHANDS_DOCKER_ISOLATION.md) preflight.sh
#      --install passes, which additionally requires the DEDICATED rootless
#      daemon to already be running, reachable at OPENHANDS_DOCKER_SOCK, and
#      NOT pointed at the primary host socket.
#
# Even with all gates satisfied, this script does not itself constitute
# authorization — per ops/openhands/README.md, installation additionally
# requires a new named § 5.5-style carve-out ADR (see
# docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md) which
# does not exist yet for OpenHands. The gates exist to prevent ACCIDENTAL
# execution (e.g. a copy-pasted command run on the wrong host), not to
# replace human authorization.
#
# Note on the dedicated daemon itself: this script does NOT start the
# dedicated rootless dockerd unit (scripts/ops/systemd/corpflowai-openhands-dockerd.service)
# on the operator's behalf. Starting that daemon is documented as a manual,
# separate install-runbook step (see ops/openhands/daemon/README.md) —
# preferring dry documentation over this script silently starting a systemd
# --user service, especially when run from a workstation/agent context that
# is not the target server. `--install` here only ever runs `docker compose
# up -d` for the OpenHands APP container against an ALREADY-RUNNING
# dedicated daemon.
#
# Modes:
#   --check     (default) — run preflight.sh --check + the four verify-*.sh
#                scripts (including verify-dedicated-daemon.sh). Also
#                confirms the isolation design files under
#                ops/openhands/daemon/ and scripts/ops/systemd/ are present
#                and that compose.yaml forbids the primary socket. Read-only.
#                Safe to run anywhere, anytime.
#   --install   — gated as described above (now including a preflight.sh
#                --install pass). Runs docker compose up -d against
#                ops/openhands/compose.yaml on the DEDICATED daemon only,
#                then re-runs --check.
#   --verify    — alias for re-running the same checks as --check against a
#                (possibly) running install; same read-only behavior.
#   --rollback  — delegates to rollback.sh (still requires --confirm, passed
#                through).
#
# Usage:
#   bash scripts/ops/openhands/install.sh
#   bash scripts/ops/openhands/install.sh --check
#   bash scripts/ops/openhands/install.sh --verify
#   OPENHANDS_INSTALL_APPROVED=YES bash scripts/ops/openhands/install.sh --install --i-understand-protected-action
#   bash scripts/ops/openhands/install.sh --rollback --confirm
#
# Exit codes:
#   0 — mode completed successfully
#   1 — mode completed with failures (checks failed, or install/rollback step failed)
#   2 — usage error, or --install attempted without all required gates

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"
COMPOSE_FILE="${REPO_ROOT}/ops/openhands/compose.yaml"

MODE="check"
I_UNDERSTAND_PROTECTED_ACTION=0
CONFIRM_PASSTHROUGH=()

usage() {
  cat <<'USAGE'
Usage: install.sh [--check|--install|--verify|--rollback] [options]

Modes:
  --check      (default) Read-only preflight + boundary checks. Never
               installs or starts anything.
  --install    HARD-GATED. Requires OPENHANDS_INSTALL_APPROVED=YES in the
               environment AND --i-understand-protected-action on the
               command line. Even then, this script alone is not
               authorization — see ops/openhands/README.md "Path to
               authorization".
  --verify     Re-runs the same read-only checks as --check.
  --rollback   Delegates to rollback.sh. Requires --confirm (passed through).

Options:
  --i-understand-protected-action   Required (with the env gate) for --install.
  --confirm                         Passed through to rollback.sh for --rollback.
  --help                            Show this message.
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
    --verify)
      MODE="verify"
      shift
      ;;
    --rollback)
      MODE="rollback"
      shift
      ;;
    --i-understand-protected-action)
      I_UNDERSTAND_PROTECTED_ACTION=1
      shift
      ;;
    --confirm)
      CONFIRM_PASSTHROUGH+=("--confirm")
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      warn "unexpected argument: $1"
      usage
      exit 2
      ;;
  esac
done

run_checks() {
  local preflight_flag="${1:---check}"
  local rc=0
  say "=== preflight.sh ${preflight_flag} ==="
  bash "${SCRIPT_DIR}/preflight.sh" "${preflight_flag}" || rc=1
  say "=== verify-private-bind.sh ==="
  bash "${SCRIPT_DIR}/verify-private-bind.sh" || rc=1
  say "=== verify-sandbox-boundary.sh ==="
  bash "${SCRIPT_DIR}/verify-sandbox-boundary.sh" || rc=1
  say "=== verify-no-production-access.sh ==="
  bash "${SCRIPT_DIR}/verify-no-production-access.sh" || rc=1
  say "=== verify-dedicated-daemon.sh ==="
  bash "${SCRIPT_DIR}/verify-dedicated-daemon.sh" || rc=1
  say "=== verify-cgroup-placement.sh ==="
  # Fail closed: missing dedicated socket → this script exits non-zero.
  # In --check mode before daemon start, treat "socket missing" as skip via
  # a soft wrapper only when socket absent; once daemon is up, hard-require.
  if [[ -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    bash "${SCRIPT_DIR}/verify-cgroup-placement.sh" || rc=1
  else
    say "SKIP verify-cgroup-placement.sh — dedicated socket not present (expected pre-daemon)"
  fi
  return "${rc}"
}

do_check() {
  say "mode=check (read-only; nothing will be installed or started)"
  if run_checks --check; then
    say "OK — all checks passed. This is NOT authorization to install. Also confirms: isolation design files present under ops/openhands/daemon/ and scripts/ops/systemd/, and compose.yaml forbids the primary socket (see preflight.sh output above)."
    return 0
  fi
  say "FAIL — one or more checks failed. See output above."
  return 1
}

do_install() {
  say "mode=install (HARD-GATED)"

  if [[ "${OPENHANDS_INSTALL_APPROVED:-}" != "YES" ]]; then
    die "refusing to install: OPENHANDS_INSTALL_APPROVED is not 'YES'. This gate exists to prevent accidental install. Human authorization (Anton + a new § 5.5-style carve-out ADR) is required BEFORE setting this — see ops/openhands/README.md."
  fi
  if [[ "${I_UNDERSTAND_PROTECTED_ACTION}" -ne 1 ]]; then
    die "refusing to install: --i-understand-protected-action was not supplied."
  fi

  warn "Both env/flag install gates satisfied. This script itself is still NOT authorization — proceeding only because the operator asserted both gates. If this run was not explicitly authorized by Anton with a corresponding § 5.5-style carve-out ADR, STOP NOW (Ctrl+C)."

  # Security follow-up for PR #747 (dedicated Docker isolation design): a
  # THIRD gate — the dedicated rootless daemon must already be running and
  # verified isolated BEFORE `docker compose up -d` is ever issued. This
  # script does not start that daemon itself (see header comment) — an
  # operator/runbook step must have already brought it up per
  # ops/openhands/daemon/README.md and
  # scripts/ops/systemd/corpflowai-openhands-dockerd.service.
  say "running dedicated-daemon preflight (required before --install may proceed)"
  if ! bash "${SCRIPT_DIR}/preflight.sh" --install; then
    die "refusing to install: preflight.sh --install failed. The dedicated rootless daemon must be running, reachable at OPENHANDS_DOCKER_SOCK, and NOT the primary socket, before this script will run 'docker compose up -d'. See docs/operations/OPENHANDS_DOCKER_ISOLATION.md and ops/openhands/daemon/README.md."
  fi
  if ! bash "${SCRIPT_DIR}/verify-dedicated-daemon.sh"; then
    die "refusing to install: verify-dedicated-daemon.sh failed. See output above and docs/operations/OPENHANDS_DOCKER_ISOLATION.md."
  fi
  if ! bash "${SCRIPT_DIR}/verify-cgroup-placement.sh"; then
    die "refusing to install: verify-cgroup-placement.sh failed — containers are not under the approved OpenHands cgroup parent, or ancestor limits are unproven. Do not weaken to dockerd-only. See docs/operations/OPENHANDS_DOCKER_ISOLATION.md."
  fi

  if ! confirm "Proceed with docker compose up -d (against the DEDICATED daemon) for project '${OPENHANDS_PROJECT}'?"; then
    die "confirmation declined — aborting install"
  fi

  require_cmd docker
  if ! docker compose version >/dev/null 2>&1; then
    die "docker compose plugin not available"
  fi
  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    die "compose file not found: ${COMPOSE_FILE}"
  fi

  say "running: docker compose -p ${OPENHANDS_PROJECT} -f ${COMPOSE_FILE} up -d (DOCKER_HOST=dedicated daemon)"
  openhands_docker compose -p "${OPENHANDS_PROJECT}" -f "${COMPOSE_FILE}" up -d

  say "install command issued — re-running checks to confirm boundary compliance"
  run_checks --check
}

do_verify() {
  say "mode=verify (read-only)"
  run_checks --check
}

do_rollback() {
  say "mode=rollback (delegating to rollback.sh)"
  bash "${SCRIPT_DIR}/rollback.sh" "${CONFIRM_PASSTHROUGH[@]}"
}

main() {
  case "${MODE}" in
    check)
      do_check
      ;;
    install)
      do_install
      ;;
    verify)
      do_verify
      ;;
    rollback)
      do_rollback
      ;;
    *)
      die "unknown mode: ${MODE}"
      ;;
  esac
}

main
