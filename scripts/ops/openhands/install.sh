#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — install entry point
#
# STATUS: INACTIVE package (issue #743). This is the single entry point for
# this package's lifecycle. The default mode is --check (read-only). The
# --install mode is HARD-GATED and refuses to run unless BOTH:
#   1. OPENHANDS_INSTALL_APPROVED=YES is set in the environment, AND
#   2. --i-understand-protected-action is passed on the command line.
#
# Even with both gates satisfied, this script does not itself constitute
# authorization — per ops/openhands/README.md, installation additionally
# requires a new named § 5.5-style carve-out ADR (see
# docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md) which
# does not exist yet for OpenHands. The two env/flag gates exist to prevent
# ACCIDENTAL execution (e.g. a copy-pasted command run on the wrong host),
# not to replace human authorization.
#
# Modes:
#   --check     (default) — run preflight.sh + the three verify-*.sh scripts.
#                Read-only. Safe to run anywhere, anytime.
#   --install   — gated as described above. Runs docker compose up -d against
#                ops/openhands/compose.yaml, then re-runs --check.
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
#   2 — usage error, or --install attempted without both required gates

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
  local rc=0
  say "=== preflight.sh ==="
  bash "${SCRIPT_DIR}/preflight.sh" || rc=1
  say "=== verify-private-bind.sh ==="
  bash "${SCRIPT_DIR}/verify-private-bind.sh" || rc=1
  say "=== verify-sandbox-boundary.sh ==="
  bash "${SCRIPT_DIR}/verify-sandbox-boundary.sh" || rc=1
  say "=== verify-no-production-access.sh ==="
  bash "${SCRIPT_DIR}/verify-no-production-access.sh" || rc=1
  return "${rc}"
}

do_check() {
  say "mode=check (read-only; nothing will be installed or started)"
  if run_checks; then
    say "OK — all checks passed. This is NOT authorization to install."
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

  warn "Both install gates satisfied. This script itself is still NOT authorization — proceeding only because the operator asserted both gates. If this run was not explicitly authorized by Anton with a corresponding § 5.5-style carve-out ADR, STOP NOW (Ctrl+C)."

  if ! confirm "Proceed with docker compose up -d for project '${OPENHANDS_PROJECT}'?"; then
    die "confirmation declined — aborting install"
  fi

  require_cmd docker
  if ! docker compose version >/dev/null 2>&1; then
    die "docker compose plugin not available"
  fi
  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    die "compose file not found: ${COMPOSE_FILE}"
  fi

  say "running: docker compose -p ${OPENHANDS_PROJECT} -f ${COMPOSE_FILE} up -d"
  docker compose -p "${OPENHANDS_PROJECT}" -f "${COMPOSE_FILE}" up -d

  say "install command issued — re-running checks to confirm boundary compliance"
  run_checks
}

do_verify() {
  say "mode=verify (read-only)"
  run_checks
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
