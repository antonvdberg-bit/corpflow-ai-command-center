#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — collect sanitised evidence
#
# STATUS: INACTIVE package (issue #743). READ-ONLY. Gathers host capacity
# output, a redacted view of the effective compose config, and a health
# summary into a single markdown file suitable for pasting into a PR or
# issue comment (e.g. issue #743) as review evidence. Never modifies
# anything and never prints secret values.
#
# Security follow-up for PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md): the "effective compose
# config" section below resolves ${OPENHANDS_DOCKER_SOCK}-shaped variables
# from the ALREADY-EXPORTED environment (lib/common.sh) — it does not
# contact any daemon (primary or dedicated) to do so. The health/preflight/
# boundary sections it shells out to (health-check.sh, preflight.sh,
# verify-*.sh) already enforce dedicated-daemon-only access themselves.
#
# Redaction approach for `docker compose config`: the rendered config can
# include resolved environment variable VALUES if a real .env is present on
# the host. This script strips any line matching a KEY=VALUE pattern for a
# name containing TOKEN, KEY, SECRET, PASSWORD, or CREDENTIAL, replacing the
# value with "***REDACTED***" — regardless of whether the value looks
# sensitive, to fail closed.
#
# Usage:
#   bash scripts/ops/openhands/collect-sanitized-evidence.sh
#   bash scripts/ops/openhands/collect-sanitized-evidence.sh --out FILE.md
#
# Exit codes:
#   0 — evidence file written
#   1 — a collection step failed
#   2 — usage error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"
COMPOSE_FILE="${REPO_ROOT}/ops/openhands/compose.yaml"
OUT_FILE="${OPENHANDS_EVIDENCE_OUT_FILE:-corpflowai-openhands-evidence-$(date -u +%Y%m%dT%H%M%SZ).md}"

usage() {
  cat <<'USAGE'
Usage: collect-sanitized-evidence.sh [--out FILE.md] [--help]

Writes a single markdown file combining host capacity, redacted effective
compose config, and health summary — suitable for a PR/issue comment.
Read-only; redacts any KEY/TOKEN/SECRET/PASSWORD/CREDENTIAL-named value.
USAGE
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --out)
      [[ "$#" -ge 2 ]] || die "--out requires a value"
      OUT_FILE="$2"
      shift 2
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

redact_env_like_values() {
  # Redacts VALUE in lines shaped like NAME=VALUE or "  NAME: VALUE" when
  # NAME contains one of the sensitive substrings, case-insensitively.
  awk '
    BEGIN { IGNORECASE = 1 }
    /(TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL)[[:space:]]*[:=]/ {
      sub(/[:=][[:space:]]*.*/, ": ***REDACTED***")
    }
    { print }
  '
}

main() {
  say "collecting sanitised evidence -> ${OUT_FILE}"

  {
    printf '# OpenHands sanitised evidence (INACTIVE package, issue #743)\n'
    printf '\nGenerated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'Host: %s\n' "$(hostname 2>/dev/null || echo unknown)"
    printf '\n_This package is INACTIVE. This evidence file does not imply OpenHands is installed or running._\n'

    printf '\n## Host capacity\n\n'
    bash "${SCRIPT_DIR}/inspect-host-capacity.sh" 2>&1 || printf '(inspect-host-capacity.sh failed — see script output above)\n'

    printf '\n## Effective compose config (redacted)\n\n'
    if [[ -f "${COMPOSE_FILE}" ]] && command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
      printf '```yaml\n'
      docker compose -f "${COMPOSE_FILE}" config 2>&1 | redact_env_like_values || printf '(docker compose config failed)\n'
      printf '```\n'
    else
      printf '(docker compose unavailable or compose file missing — skipped)\n'
    fi

    printf '\n## Health summary\n\n'
    printf '```\n'
    bash "${SCRIPT_DIR}/health-check.sh" 2>&1 || true
    printf '```\n'

    printf '\n## Preflight summary\n\n'
    printf '```\n'
    bash "${SCRIPT_DIR}/preflight.sh" 2>&1 || true
    printf '```\n'

    printf '\n## Boundary checks\n\n'
    printf '```\n'
    bash "${SCRIPT_DIR}/verify-private-bind.sh" 2>&1 || true
    bash "${SCRIPT_DIR}/verify-sandbox-boundary.sh" 2>&1 || true
    bash "${SCRIPT_DIR}/verify-no-production-access.sh" 2>&1 || true
    printf '```\n'

    printf '\n## Dedicated Docker daemon verification\n\n'
    printf '```\n'
    bash "${SCRIPT_DIR}/verify-dedicated-daemon.sh" 2>&1 || true
    printf '```\n'
  } > "${OUT_FILE}"

  say "ok: wrote ${OUT_FILE}"
}

main
