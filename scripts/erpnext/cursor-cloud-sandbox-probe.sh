#!/usr/bin/env bash
# CorpFlowAI — safe ERPNext sandbox reachability / capability probe for Cursor Cloud (#893 / #879 / #886).
#
# Prints ONLY non-secret evidence. Never logs keys, passwords, cookies, or tokens.
#
# Preferred path: SSH remote read-only checks against loopback ERPNext on corpflow-exec-01
# (credentials remain on the box; Cursor Cloud only needs the SSH private key secret).
#
# Usage:
#   scripts/erpnext/cursor-cloud-sandbox-probe.sh
#
# Exit codes:
#   0 = ERPNext reachability PASS (safe metadata collected)
#   1 = FAIL (secure path missing or sandbox unreachable)
#   2 = usage / unexpected script error

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TUNNEL_SH="${ROOT_DIR}/scripts/erpnext/cursor-cloud-sandbox-tunnel.sh"

SITE_HOST="${CORPFLOW_ERPNEXT_SANDBOX_SITE_HOST:-corpflowai-sandbox.localhost}"
COMPOSE_PROJECT="${CORPFLOW_ERPNEXT_SANDBOX_COMPOSE_PROJECT:-corpflowai-sandbox}"
REMOTE_PORT="${CORPFLOW_ERPNEXT_REMOTE_PORT:-8080}"

log() { printf '%s\n' "$*"; }

print_header() {
  log "ERPNext Cursor Cloud sandbox probe"
  log "secure_path_type: cursor_cloud_secrets_ssh_tunnel"
  log "secure_path_secret_present: $([[ -n "${CORPFLOW_EXEC01_SSH_PRIVATE_KEY:-}" ]] && echo configured || echo not_configured)"
  log "injected_secret_names: ${CLOUD_AGENT_INJECTED_SECRET_NAMES:-none}"
  log "site_host_expected: ${SITE_HOST}"
  log "compose_project_expected: ${COMPOSE_PROJECT}"
}

fail() {
  log "ERPNext reachability: FAIL"
  log "exact_blocker: $*"
  exit 1
}

require_secret() {
  if [[ -z "${CORPFLOW_EXEC01_SSH_PRIVATE_KEY:-}" ]]; then
    fail "CORPFLOW_EXEC01_SSH_PRIVATE_KEY missing in Cursor Cloud secrets (UI-only wiring still required)."
  fi
}

remote() {
  "${TUNNEL_SH}" ssh -- "$@"
}

safe_http_code() {
  # Remote curl against loopback only; Host header selects the Frappe site.
  remote bash -lc "curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 -H 'Host: ${SITE_HOST}' http://127.0.0.1:${REMOTE_PORT}/login" \
    | tr -d '\r'
}

safe_login_title() {
  remote bash -lc "curl -sS --connect-timeout 5 -H 'Host: ${SITE_HOST}' http://127.0.0.1:${REMOTE_PORT}/login | tr '\\n' ' ' | sed -n 's/.*<title>\\([^<]*\\)<\\/title>.*/\\1/p' | head -c 120" \
    | tr -d '\r'
}

safe_compose_ps() {
  remote bash -lc "docker compose -p '${COMPOSE_PROJECT}' ps --format '{{.Service}} {{.Status}}' 2>/dev/null | head -20" \
    | tr -d '\r' || true
}

safe_object_capability() {
  # Read-only: list whether standard DocTypes resolve (counts only; no row payloads).
  # Uses bench/frappe on the box so Cursor never needs ERPNext API secrets.
  remote bash -lc "docker compose -p '${COMPOSE_PROJECT}' exec -T backend bench --site '${SITE_HOST}' execute frappe.client.get_count --kwargs \"{'doctype':'Customer'}\" 2>/dev/null | tail -1" \
    | tr -d '\r' || echo 'unavailable'
}

safe_item_count() {
  remote bash -lc "docker compose -p '${COMPOSE_PROJECT}' exec -T backend bench --site '${SITE_HOST}' execute frappe.client.get_count --kwargs \"{'doctype':'Item'}\" 2>/dev/null | tail -1" \
    | tr -d '\r' || echo 'unavailable'
}

safe_company_count() {
  remote bash -lc "docker compose -p '${COMPOSE_PROJECT}' exec -T backend bench --site '${SITE_HOST}' execute frappe.client.get_count --kwargs \"{'doctype':'Company'}\" 2>/dev/null | tail -1" \
    | tr -d '\r' || echo 'unavailable'
}

safe_version_snippet() {
  # Best-effort version string from installed apps; never dump full site_config.
  remote bash -lc "docker compose -p '${COMPOSE_PROJECT}' exec -T backend bench --site '${SITE_HOST}' version 2>/dev/null | head -20" \
    | tr -d '\r' || true
}

main() {
  print_header
  require_secret

  log "step: ssh_auth_check"
  if ! remote 'echo ssh_ok' | grep -qx 'ssh_ok'; then
    fail "SSH BatchMode to corpflow-exec-01 failed (key rejected or host unreachable)."
  fi
  log "ssh_auth: PASS"

  log "step: loopback_http_login"
  local code
  code="$(safe_http_code || true)"
  log "login_http_code: ${code:-none}"
  if [[ "${code}" != "200" && "${code}" != "302" ]]; then
    fail "loopback ERPNext /login returned HTTP ${code:-none} (expected 200/302)."
  fi

  local title
  title="$(safe_login_title || true)"
  log "login_title: ${title:-unknown}"

  log "step: compose_ps"
  local ps
  ps="$(safe_compose_ps)"
  if [[ -n "${ps}" ]]; then
    log "compose_services:"
    printf '%s\n' "${ps}" | sed 's/^/  /'
  else
    log "compose_services: unavailable"
  fi

  log "step: version"
  local ver
  ver="$(safe_version_snippet)"
  if [[ -n "${ver}" ]]; then
    log "bench_version:"
    printf '%s\n' "${ver}" | sed 's/^/  /'
  else
    log "bench_version: unavailable"
  fi

  log "step: object_capability_counts"
  local customer_count item_count company_count
  customer_count="$(safe_object_capability)"
  item_count="$(safe_item_count)"
  company_count="$(safe_company_count)"
  log "object_capability_summary:"
  log "  Company.count: ${company_count}"
  log "  Customer.count: ${customer_count}"
  log "  Item.count: ${item_count}"

  log "ERPNext reachability: PASS"
  log "exact_blocker: none"
  exit 0
}

main "$@"
