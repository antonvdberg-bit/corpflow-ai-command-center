#!/usr/bin/env bash
# CorpFlowAI — read-only WP6 identity / roles / 2FA / least-privilege probe (#1019).
#
# GET-only. Never prints secret values, ERPNEXT_BASE_URL, hostnames, other
# users' emails, tokens, cookies, or private user data.
# Does not create users, change roles, enable 2FA, reset credentials, or send.
#
# Usage:
#   bash scripts/erpnext/wp6-access-control-probe.sh
#
# Exit codes:
#   0 = probe completed (ERPNext auth PASS)
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

log "ERPNext WP6 access-control probe (read-only) #1019"
log "mutation: forbidden (GET-only)"
log "role_or_permission_mutation: forbidden"
log "user_create_or_disable: forbidden"
log "credential_reset: forbidden"
log "two_factor_enablement: forbidden"
log "ERPNEXT_BASE_URL: $(require_secret_present ERPNEXT_BASE_URL)"
log "ERPNEXT_API_KEY: $(require_secret_present ERPNEXT_API_KEY)"
log "ERPNEXT_API_SECRET: $(require_secret_present ERPNEXT_API_SECRET)"
log "MASTER_ADMIN_KEY: $(require_secret_present MASTER_ADMIN_KEY) (incidental presence only; reopen #899 only on regression)"
log "ADMIN_PIN: $(require_secret_present ADMIN_PIN)"
log "erpnext_host_family: $(erpnext_host_family)"
log "ERPNEXT_BASE_URL_value: not_printed"
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
if [[ "${AUTH_USER}" != "integrations@corpflowai.com" ]]; then
  log "identity_match_expected: no"
else
  log "identity_match_expected: yes"
fi

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

# Own User document — role profile + roles. Never print api_key / otp / last_ip.
OWN_USER_PATH="/api/resource/User/$(python3 -c 'import urllib.parse; print(urllib.parse.quote("integrations@corpflowai.com", safe=""))')"
OWN_STATUS="$(api_get "$OWN_USER_PATH")"
log "own_user_doc: HTTP ${OWN_STATUS}"
if [[ "$OWN_STATUS" == "200" ]]; then
  python3 - "$TMP_BODY" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
row = d.get("data") if isinstance(d, dict) else None
if not isinstance(row, dict):
    print("own_user_parse: fail")
    raise SystemExit(0)
enabled = row.get("enabled")
user_type = row.get("user_type") or ""
profile = row.get("role_profile_name") or ""
roles = []
for child in row.get("roles") or []:
    if isinstance(child, dict) and child.get("role"):
        roles.append(str(child["role"]))
roles = sorted(set(roles))
privileged = [r for r in roles if r in ("Administrator", "System Manager")]
print(f"own_user_enabled: {enabled}")
print(f"own_user_type: {user_type}")
print(f"own_role_profile: {profile or 'none'}")
print("own_roles:", ",".join(roles) if roles else "none")
print("own_holds_administrator: yes" if "Administrator" in roles else "own_holds_administrator: no")
print("own_holds_system_manager: yes" if "System Manager" in roles else "own_holds_system_manager: no")
print("own_privileged_roles:", ",".join(privileged) if privileged else "none")
PY
fi

# get_roles as GET (read). Write methods are not used — this packet is GET-only.
ROLES_GET="$(api_get '/api/method/frappe.core.doctype.user.user.get_roles')"
log "get_roles_get: HTTP ${ROLES_GET}"
if [[ "$ROLES_GET" == "200" ]]; then
  python3 - "$TMP_BODY" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
msg = d.get("message")
if isinstance(msg, list):
    roles = sorted({str(x) for x in msg if x})
    print("get_roles_list:", ",".join(roles) if roles else "none")
    print("get_roles_holds_system_manager:", "yes" if "System Manager" in roles else "no")
    print("get_roles_holds_administrator:", "yes" if "Administrator" in roles else "no")
else:
    print("get_roles_list: unread")
PY
fi

probe_resource() {
  local label="$1"
  local path="$2"
  local code
  code="$(api_get "$path")"
  log "control_probe ${label}: HTTP ${code}"
}

# Privileged / settings surfaces (expected 403 for least-privilege).
probe_resource "System_Settings_list" "/api/resource/System%20Settings"
probe_resource "System_Settings_doc" "/api/resource/System%20Settings/System%20Settings"
probe_resource "Role" "/api/resource/Role?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "Has_Role" "/api/resource/Has%20Role?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "DocPerm" "/api/resource/DocPerm?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "Custom_DocPerm" "/api/resource/Custom%20DocPerm?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "Role_Profile" "/api/resource/Role%20Profile?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "User_Permission" "/api/resource/User%20Permission?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "Activity_Log" "/api/resource/Activity%20Log?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "Error_Log" "/api/resource/Error%20Log?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "Version" "/api/resource/Version?limit_page_length=1&fields=%5B%22name%22%5D"
probe_resource "Scheduled_Job_Type" "/api/resource/Scheduled%20Job%20Type?limit_page_length=1&fields=%5B%22name%22%5D"

# User list: count only. Never print name/email of other users.
USER_LIST_STATUS="$(api_get '/api/resource/User?limit_page_length=100&fields=%5B%22name%22%2C%22user_type%22%2C%22enabled%22%5D')"
log "user_list: HTTP ${USER_LIST_STATUS}"
if [[ "$USER_LIST_STATUS" == "200" ]]; then
  python3 - "$TMP_BODY" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
rows = d.get("data") if isinstance(d, dict) else None
if not isinstance(rows, list):
    print("user_list_parse: fail")
    raise SystemExit(0)
expected = "integrations@corpflowai.com"
enabled = [r for r in rows if isinstance(r, dict) and r.get("enabled") in (1, "1", True)]
system_users = [r for r in enabled if (r.get("user_type") or "") == "System User"]
website_users = [r for r in enabled if (r.get("user_type") or "") == "Website User"]
self_visible = any((r.get("name") or "") == expected for r in rows if isinstance(r, dict))
print(f"user_list_row_count: {len(rows)}")
print(f"user_list_enabled_count: {len(enabled)}")
print(f"user_list_enabled_system_user_count: {len(system_users)}")
print(f"user_list_enabled_website_user_count: {len(website_users)}")
print("user_list_includes_integration_identity:", "yes" if self_visible else "no")
print("user_list_other_usernames: not_printed")
PY
else
  log "user_list_other_usernames: not_printed"
  log "privileged_account_inventory: unread_by_integration_identity"
fi

# Has Role for System Manager / Administrator — count only, never print parent.
HAS_SM="$(api_get '/api/resource/Has%20Role?limit_page_length=100&filters=%5B%5B%22role%22%2C%22%3D%22%2C%22System%20Manager%22%5D%5D&fields=%5B%22parent%22%2C%22role%22%5D')"
log "has_role_system_manager: HTTP ${HAS_SM}"
if [[ "$HAS_SM" == "200" ]]; then
  python3 - "$TMP_BODY" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
rows = d.get("data") if isinstance(d, dict) else []
parents = {str(r.get("parent")) for r in rows if isinstance(r, dict) and r.get("parent")}
self_hold = "integrations@corpflowai.com" in parents
print(f"system_manager_holder_count: {len(parents)}")
print("system_manager_includes_integration_identity:", "yes" if self_hold else "no")
print("system_manager_holder_names: not_printed")
PY
fi

HAS_ADMIN="$(api_get '/api/resource/Has%20Role?limit_page_length=100&filters=%5B%5B%22role%22%2C%22%3D%22%2C%22Administrator%22%5D%5D&fields=%5B%22parent%22%2C%22role%22%5D')"
log "has_role_administrator: HTTP ${HAS_ADMIN}"
if [[ "$HAS_ADMIN" == "200" ]]; then
  python3 - "$TMP_BODY" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
rows = d.get("data") if isinstance(d, dict) else []
parents = {str(r.get("parent")) for r in rows if isinstance(r, dict) and r.get("parent")}
self_hold = "integrations@corpflowai.com" in parents
print(f"administrator_holder_count: {len(parents)}")
print("administrator_includes_integration_identity:", "yes" if self_hold else "no")
print("administrator_holder_names: not_printed")
PY
fi

# Commercial DocTypes required by #1019.
COMMERCIAL=(
  Customer
  Contact
  Address
  Lead
  Opportunity
  Item
  "Item Price"
  "Price List"
  Quotation
  Project
  Task
  Issue
  "Payment Terms"
)

for dt in "${COMMERCIAL[@]}"; do
  enc="$(python3 - "$dt" <<'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
)"
  code="$(api_get "/api/resource/${enc}?limit_page_length=1&fields=%5B%22name%22%5D")"
  log "doctype ${dt}: HTTP ${code}"
done

log "ERPNext access: PASS"
log "role_mutation_attempted: no"
log "user_mutation_attempted: no"
log "two_factor_mutation_attempted: no"
log "secret_values_printed: no"
log "other_usernames_printed: no"
exit 0
