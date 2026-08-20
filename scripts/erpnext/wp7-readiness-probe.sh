#!/usr/bin/env bash
# CorpFlowAI — read-only WP7 patch / backup / restore / monitoring probe (#1010).
#
# GET-only. Never prints secret values, ERPNEXT_BASE_URL, hostnames, or POSTGRES_URL.
# Does not upgrade packages, restore sites, mutate Neon, enable timers, or send messages.
#
# Usage:
#   bash scripts/erpnext/wp7-readiness-probe.sh
#
# Exit codes:
#   0 = probe completed (ERPNext auth PASS or floors recorded)
#   1 = ERPNext secrets missing or authentication failed
#   2 = unexpected script error

set -euo pipefail

log() { printf '%s\n' "$*"; }

require_secret_present() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "absent"
  else
    echo "present"
  fi
}

postgres_host_class() {
  python3 - <<'PY'
import os, urllib.parse
u = os.environ.get("POSTGRES_URL") or ""
if not u:
    print("absent")
    raise SystemExit(0)
host = urllib.parse.urlparse(u).hostname or ""
if "neon.tech" in host:
    print("neon_tech")
elif "prisma.io" in host:
    print("prisma_io_drift")
elif host:
    print("other_non_neon")
else:
    print("unparseable")
PY
}

erpnext_host_family() {
  python3 - <<'PY'
import os
from urllib.parse import urlparse
u = os.environ.get("ERPNEXT_BASE_URL") or ""
if not u:
    print("absent")
    raise SystemExit(0)
p = urlparse(u)
host = (p.hostname or "").lower()
scheme = p.scheme
if scheme != "https":
    print("non_https")
elif host.endswith("frappe.cloud") or host.endswith("erpnext.com") or "frappe.cloud" in host:
    print("vendor_hosted_frappe_family")
else:
    print("https_unclassified_family")
PY
}

log "ERPNext WP7 readiness probe (read-only) #1010"
log "mutation: forbidden (GET-only)"
log "ERPNEXT_BASE_URL: $(require_secret_present ERPNEXT_BASE_URL)"
log "ERPNEXT_API_KEY: $(require_secret_present ERPNEXT_API_KEY)"
log "ERPNEXT_API_SECRET: $(require_secret_present ERPNEXT_API_SECRET)"
log "MASTER_ADMIN_KEY: $(require_secret_present MASTER_ADMIN_KEY) (incidental presence only; #899 not reopened)"
log "NEON_API_KEY: $(require_secret_present NEON_API_KEY)"
log "postgres_url_present: $(require_secret_present POSTGRES_URL)"
log "postgres_host_class: $(postgres_host_class)"
log "erpnext_host_family: $(erpnext_host_family)"
log "ERPNEXT_BASE_URL_value: not_printed"
log "POSTGRES_URL_value: not_printed"
log "auth_uses_master_admin_key: no"
log "runtime_bridge_ssh: no"
log "runtime_bridge_infisical: no"

missing=()
[[ -z "${ERPNEXT_BASE_URL:-}" ]] && missing+=("ERPNEXT_BASE_URL")
[[ -z "${ERPNEXT_API_KEY:-}" ]] && missing+=("ERPNEXT_API_KEY")
[[ -z "${ERPNEXT_API_SECRET:-}" ]] && missing+=("ERPNEXT_API_SECRET")
if ((${#missing[@]} > 0)); then
  log "ERPNext access: FAIL"
  log "exact_blocker: missing injected secrets: ${missing[*]}"
  exit 1
fi

TMP_BODY="$(mktemp)"
TMP_ERR="$(mktemp)"
trap 'rm -f "$TMP_BODY" "$TMP_ERR"' EXIT

api_get() {
  local path="$1"
  local url="${ERPNEXT_BASE_URL%/}${path}"
  curl -sS \
    -o "$TMP_BODY" \
    -w '%{http_code}' \
    --connect-timeout 10 \
    --max-time 30 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    "$url" 2>"$TMP_ERR" || printf 'curl_exit_%s' "$?"
}

json_field() {
  python3 - "$TMP_BODY" "$1" <<'PY'
import json, sys
path = sys.argv[2].split(".")
try:
    data = json.load(open(sys.argv[1], "r", encoding="utf-8"))
except Exception:
    print("")
    raise SystemExit(0)
cur = data
for p in path:
    if isinstance(cur, dict) and p in cur:
        cur = cur[p]
    else:
        print("")
        raise SystemExit(0)
if isinstance(cur, (dict, list)):
    print("")
else:
    print(str(cur).replace("\n", " ").strip()[:200])
PY
}

AUTH_STATUS="$(api_get '/api/method/frappe.auth.get_logged_user')"
if [[ "$AUTH_STATUS" != "200" ]]; then
  log "ERPNext access: FAIL"
  log "http_auth_status: ${AUTH_STATUS}"
  log "exact_blocker: authentication failed"
  exit 1
fi
AUTH_USER="$(json_field message)"
log "authenticated_user: ${AUTH_USER:-empty}"
log "http_auth_status: ${AUTH_STATUS}"

VER_STATUS="$(api_get '/api/method/frappe.utils.change_log.get_versions')"
log "versions_http: ${VER_STATUS}"
if [[ "$VER_STATUS" == "200" ]]; then
  python3 - "$TMP_BODY" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
msg = d.get("message") or {}
for app in ("frappe", "erpnext", "email_delivery_service"):
    info = msg.get(app) or {}
    if not isinstance(info, dict):
        continue
    ver = info.get("version") or ""
    branch = info.get("branch") or ""
    print(f"app {app} version={ver} branch={branch}")
print("installed_apps:", ",".join(sorted(msg.keys())))
PY
fi

probe_resource() {
  local label="$1"
  local path="$2"
  local code
  code="$(api_get "$path")"
  log "control_probe ${label}: HTTP ${code}"
}

probe_resource "System_Settings_list" "/api/resource/System%20Settings"
probe_resource "System_Settings_doc" "/api/resource/System%20Settings/System%20Settings"
probe_resource "Scheduled_Job_Type" "/api/resource/Scheduled%20Job%20Type?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "File" "/api/resource/File?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "Error_Log" "/api/resource/Error%20Log?limit_page_length=1"

floor_get() {
  local label="$1"
  local url="$2"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 --max-time 20 "$url" || echo curlfail)"
  log "floor ${label}: HTTP ${code}"
}

log "floors: corpflow_test public monitors (no secrets)"
floor_get "factory_health" "https://core.corpflowai.com/api/factory/health"
floor_get "production_pulse" "https://core.corpflowai.com/api/factory/production-pulse/runtime"
floor_get "lux_home" "https://lux.corpflowai.com/"
floor_get "lux_change" "https://lux.corpflowai.com/change"
floor_get "apex_home" "https://corpflowai.com/"

log "ERPNext access: PASS"
log "restore_attempted: no"
log "package_upgrade_attempted: no"
log "neon_mutation_attempted: no"
log "monitor_timer_enable_attempted: no"
log "secret_values_printed: no"
exit 0
