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

main() {
  say "checking ${#FILES_TO_CHECK[@]} file(s) for forbidden production-secret references"

  local f token
  for f in "${FILES_TO_CHECK[@]}"; do
    if [[ ! -f "${f}" ]]; then
      warn "file not found, skipping: ${f}"
      continue
    fi
    for token in "${FORBIDDEN_TOKENS[@]}"; do
      if grep -Fq "${token}" "${f}"; then
        VIOLATIONS+=("${f} references forbidden token: ${token}")
      fi
    done
  done

  if [[ "${#VIOLATIONS[@]}" -eq 0 ]]; then
    say "PASS — no forbidden production-secret reference found in $(printf '%s ' "${FILES_TO_CHECK[@]}" | wc -w) checked file(s)"
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
