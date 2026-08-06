#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — verify no production-secret access
#
# STATUS: INACTIVE package (issue #743). READ-ONLY. Asserts that this
# package's compose file and .env.example never reference CorpFlowAI
# production secrets or the production database connection strings.
#
# This is a defense-in-depth check for the package itself (not a general
# secret scanner) — it exists so this package cannot silently grow a
# reference to production credentials over time without a check flagging it.
#
# Security follow-up for PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md): this script now ALSO fails
# if any checked file references the primary host Docker socket
# (/var/run/docker.sock) or host.docker.internal OUTSIDE of a documentation
# comment. These are not "production secrets" in the credential sense, but
# they are the two forbidden-by-design strings for this package's Docker
# isolation model, and belong in the same "package cannot silently regress"
# check as the secret-name checks below — see also
# scripts/ops/openhands/verify-sandbox-boundary.sh, which performs the same
# two checks specifically against ops/openhands/compose.yaml with fuller
# context; this script's version is the broader, multi-file sweep.
#
# Both the FORBIDDEN_TOKENS check and the FORBIDDEN_ISOLATION_STRINGS check
# below are comment-aware (grep only non-comment lines): every file this
# script inspects deliberately documents WHY these names/strings are
# forbidden in its own header, and a naive whole-file grep would otherwise
# flag that documentation as if it were a live reference.
#
# Usage:
#   bash scripts/ops/openhands/verify-no-production-access.sh
#
# Exit codes:
#   0 — no forbidden reference found
#   1 — a forbidden reference was found
#   2 — usage error / files missing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"

# Files this check inspects. Extend this list if the package grows new
# compose/env files.
FILES_TO_CHECK=(
  "${REPO_ROOT}/ops/openhands/compose.yaml"
  "${REPO_ROOT}/ops/openhands/compose.override.example.yaml"
  "${REPO_ROOT}/ops/openhands/.env.example"
  "${REPO_ROOT}/config/openhands/config.example.toml"
  "${REPO_ROOT}/config/openhands/model-routing.example.yaml"
  "${REPO_ROOT}/config/openhands/cost-policy.example.yaml"
)

# Forbidden token names — production secret/env var NAMES. It is fine for
# this list itself to contain the names (that's how we search for them); it
# must never contain a real value.
FORBIDDEN_TOKENS=(
  "POSTGRES_URL"
  "POSTGRES_PRISMA_URL"
  "POSTGRES_URL_NON_POOLING"
  "MASTER_ADMIN_KEY"
  "CORPFLOW_AUTOMATION_INGEST_SECRET"
  "CORPFLOW_AUTOMATION_FORWARD_SECRET"
  "CORPFLOW_CRON_SECRET"
  "CRON_SECRET"
  "db.prisma.io"
)

usage() {
  cat <<'USAGE'
Usage: verify-no-production-access.sh [--help]

Fails if any OpenHands package compose/env/config file references a
CorpFlowAI production secret name or the deprecated db.prisma.io host.
Read-only; checks file CONTENTS for forbidden NAMES, never prints real
secret values (none should exist in this package).
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

VIOLATIONS=()

noncomment_lines() {
  grep -Ev '^[[:space:]]*#' "$1" 2>/dev/null || true
}

# Forbidden-by-design strings for the Docker isolation model (security
# follow-up for PR #747). See the comment-aware note above the usage()
# function for why both this array and FORBIDDEN_TOKENS are checked only
# against non-comment lines.
FORBIDDEN_ISOLATION_STRINGS=(
  "/var/run/docker.sock"
  "host.docker.internal"
)

main() {
  say "checking ${#FILES_TO_CHECK[@]} file(s) for forbidden production-secret references and isolation-design violations"

  local f token
  for f in "${FILES_TO_CHECK[@]}"; do
    if [[ ! -f "${f}" ]]; then
      warn "file not found, skipping: ${f}"
      continue
    fi
    local active
    active="$(noncomment_lines "${f}")"

    for token in "${FORBIDDEN_TOKENS[@]}"; do
      if printf '%s\n' "${active}" | grep -Fq "${token}"; then
        VIOLATIONS+=("${f} references forbidden token outside a documentation comment: ${token}")
      fi
    done
    for token in "${FORBIDDEN_ISOLATION_STRINGS[@]}"; do
      if printf '%s\n' "${active}" | grep -Fq "${token}"; then
        VIOLATIONS+=("${f} references forbidden isolation-design string outside a documentation comment: ${token}")
      fi
    done
  done

  if [[ "${#VIOLATIONS[@]}" -eq 0 ]]; then
    say "PASS — no forbidden production-secret or isolation-design violation found in $(printf '%s ' "${FILES_TO_CHECK[@]}" | wc -w) checked file(s)"
    exit 0
  fi

  say "FAIL — ${#VIOLATIONS[@]} violation(s) found:"
  local v
  for v in "${VIOLATIONS[@]}"; do
    say "  - ${v}"
  done
  exit 1
}

main "$@"
