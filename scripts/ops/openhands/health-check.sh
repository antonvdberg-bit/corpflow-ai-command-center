#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — health check
#
# STATUS: INACTIVE package (issue #743). Checks container health status (on
# the DEDICATED daemon) plus a loopback HTTP probe against the OpenHands
# official health endpoint. Passes cleanly (and stays silent beyond a single
# log line) when OpenHands is not installed at all — absence is not treated
# as unhealthy by this script (that decision belongs to whatever schedules
# it, e.g. a not-yet-enabled systemd timer).
#
# Security follow-up for PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md):
#   - Container status is checked via openhands_docker() (lib/common.sh)
#     against the DEDICATED daemon only — never the primary daemon.
#   - The HTTP probe now hits the official `/health` endpoint, not the bare
#     `/`. Residual caveat (documented, not fixed by this script): `/health`
#     reflects PROCESS liveness of the control plane, not full sandbox
#     readiness (e.g. whether the dedicated daemon itself, or a specific
#     sandbox spawn, is healthy) — see
#     docs/operations/OPENHANDS_DOCKER_ISOLATION.md "Health".
#
# Success is silent (single log line). Failure is noisy (multiple log lines)
# and, ONLY if OPENHANDS_ALERTS_ENABLED=1 (default 0/off), attempts a
# Telegram alert using the same TELEGRAM_BOT_TOKEN / TELEGRAM_ALERT_CHAT_ID
# convention as lib/server/ops-alerts.js and scripts/ops/backup-health-check.sh.
# Never prints token/chat id values, only presence.
#
# Usage:
#   bash scripts/ops/openhands/health-check.sh
#   OPENHANDS_ALERTS_ENABLED=1 bash scripts/ops/openhands/health-check.sh
#
# Exit codes:
#   0 — healthy, OR not installed (absence is not failure)
#   1 — installed but unhealthy (container unhealthy/stopped, or HTTP probe failed)
#   2 — usage / tooling error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

OPENHANDS_PORT="${OPENHANDS_PORT:-3000}"
ALERTS_ENABLED="${OPENHANDS_ALERTS_ENABLED:-0}"
CONTAINER_NAME="${OPENHANDS_PROJECT}-app"

usage() {
  cat <<'USAGE'
Usage: health-check.sh [--help]

Checks the corpflowai-openhands-app container health (via the DEDICATED
daemon only) plus a loopback HTTP probe against /health. Not-installed is
treated as a safe pass, not a failure. Alerts via Telegram only when
OPENHANDS_ALERTS_ENABLED=1 (default off).
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

send_telegram_if_enabled() {
  local text="$1"
  if [[ "${ALERTS_ENABLED}" != "1" ]]; then
    say "alerts disabled (OPENHANDS_ALERTS_ENABLED!=1) — not sending Telegram"
    return 0
  fi
  local token="${TELEGRAM_BOT_TOKEN:-}"
  local chat="${TELEGRAM_ALERT_CHAT_ID:-}"
  say "telegram presence: TELEGRAM_BOT_TOKEN=$(presence TELEGRAM_BOT_TOKEN) TELEGRAM_ALERT_CHAT_ID=$(presence TELEGRAM_ALERT_CHAT_ID)"
  if [[ -z "${token}" || -z "${chat}" ]]; then
    say "telegram: SKIPPED — TELEGRAM_BOT_TOKEN or TELEGRAM_ALERT_CHAT_ID unset"
    return 1
  fi
  if ! command -v curl >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
    say "telegram: SKIPPED — curl and python3 both required"
    return 1
  fi
  local payload http
  payload="$(python3 -c '
import json, sys
print(json.dumps({"chat_id": sys.argv[1], "text": sys.argv[2]}))
' "${chat}" "${text:0:3500}")"
  http="$(curl -sS -o /tmp/corpflowai-openhands-health-tg.out -w '%{http_code}' \
    -X POST "https://api.telegram.org/bot${token}/sendMessage" \
    -H 'Content-Type: application/json' \
    --data-binary "${payload}")" || true
  if [[ "${http}" == "200" ]]; then
    say "telegram: ok http=200"
    return 0
  fi
  say "telegram: FAILED http=${http:-?} (body not logged)"
  return 1
}

main() {
  if ! command -v docker >/dev/null 2>&1; then
    say "ok (not-applicable): docker not present on this host — OpenHands is not installed"
    exit 0
  fi

  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    say "ok (not-applicable): dedicated Docker socket not present — OpenHands is not installed (dedicated daemon not running)"
    exit 0
  fi

  if ! openhands_docker inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
    say "ok (not-applicable): container ${CONTAINER_NAME} does not exist on the dedicated daemon — OpenHands is not installed"
    exit 0
  fi

  local state health
  state="$(openhands_docker inspect -f '{{.State.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "unknown")"
  health="$(openhands_docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${CONTAINER_NAME}" 2>/dev/null || echo "unknown")"

  if [[ "${state}" != "running" ]]; then
    FAILURES+=("container state is '${state}', expected 'running'")
  fi
  if [[ "${health}" != "healthy" && "${health}" != "none" ]]; then
    FAILURES+=("container health is '${health}', expected 'healthy'")
  fi

  if command -v curl >/dev/null 2>&1; then
    # Official OpenHands health endpoint (docs.openhands.dev, checked
    # 2026-08-04) — NOT the bare "/". See docs/operations/
    # OPENHANDS_DOCKER_ISOLATION.md "Health" for the residual caveat that
    # this reflects process liveness, not full sandbox readiness.
    if ! curl -fsS --max-time 5 "http://127.0.0.1:${OPENHANDS_PORT}/health" >/dev/null 2>&1; then
      FAILURES+=("loopback HTTP probe to 127.0.0.1:${OPENHANDS_PORT}/health failed")
    fi
  else
    FAILURES+=("curl not available — cannot run loopback HTTP probe (fail-closed)")
  fi

  if [[ "${#FAILURES[@]}" -eq 0 ]]; then
    say "ok state=${state} health=${health} http=ok"
    exit 0
  fi

  say "FAIL count=${#FAILURES[@]} state=${state} health=${health}"
  local f
  for f in "${FAILURES[@]}"; do
    say "  - ${f}"
  done

  local alert_text="CorpFlowAI alert: OpenHands health check FAILED on $(hostname 2>/dev/null || echo unknown-host)."
  alert_text+=$'\n'"Failures: ${FAILURES[*]}"
  alert_text+=$'\n'"Note: OpenHands is an INACTIVE/evaluation package (issue #743) — this alert firing implies it was installed without the expected authorization gate. Investigate."
  send_telegram_if_enabled "${alert_text}" || true

  exit 1
}

main
