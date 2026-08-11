#!/usr/bin/env bash
# CorpFlowAI — read-only ERPNext API access probe for Cursor Cloud (#893).
#
# Uses Infisical-backed Cursor Cloud secrets (names only; never logs values):
#   ERPNEXT_BASE_URL
#   ERPNEXT_API_KEY
#   ERPNEXT_API_SECRET
#
# Authenticate as the configured CorpFlowAI Integration API user.
# Performs GET-only resource/list and metadata calls. Never creates, updates,
# submits, cancels, deletes, or otherwise mutates ERPNext records.
#
# Usage:
#   bash scripts/erpnext/cursor-cloud-api-probe.sh
#
# Exit codes:
#   0 = ERPNext access PASS (auth + at least one commercial DocType readable)
#   1 = FAIL (secrets missing, unreachable, auth failed, or zero DocTypes readable)
#   2 = unexpected script error

set -euo pipefail

log() { printf '%s\n' "$*"; }

redact_url() {
  # Print scheme + host (+ port) only; drop path/query/userinfo.
  local raw="$1"
  python3 - "$raw" <<'PY'
import sys
from urllib.parse import urlparse
u = urlparse(sys.argv[1].strip())
host = u.hostname or "(unknown-host)"
port = f":{u.port}" if u.port else ""
scheme = u.scheme or "http"
print(f"{scheme}://{host}{port}")
PY
}

require_secret_present() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "absent"
  else
    echo "present"
  fi
}

DOCTYPES=(
  Customer
  Lead
  Opportunity
  Contact
  Address
  Item
  "Item Price"
  "Price List"
  Quotation
  "Sales Invoice"
  Company
  Currency
)

REACHABLE=()
DENIED=()
AUTH_USER=""
SITE_META=""
HTTP_AUTH_STATUS=""
OVERALL="FAIL"

print_header() {
  log "ERPNext Cursor Cloud API probe (read-only)"
  log "access_path: Infisical-backed Cursor Cloud secrets → Frappe token auth"
  log "expected_identity: CorpFlowAI Integration"
  log "ERPNEXT_BASE_URL: $(require_secret_present ERPNEXT_BASE_URL)"
  log "ERPNEXT_API_KEY: $(require_secret_present ERPNEXT_API_KEY)"
  log "ERPNEXT_API_SECRET: $(require_secret_present ERPNEXT_API_SECRET)"
  log "injected_secret_names: ${CLOUD_AGENT_INJECTED_SECRET_NAMES:-none}"
  log "mutation: forbidden (GET-only)"
}

fail_closed() {
  local blocker="$1"
  log ""
  log "ERPNext access: FAIL"
  log "authenticated_user: ${AUTH_USER:-not_obtained}"
  log "site_version_metadata: ${SITE_META:-not_reached}"
  log "reachable_doctypes: ${REACHABLE[*]:-none}"
  log "denied_doctypes: ${DENIED[*]:-none}"
  log "http_auth_status: ${HTTP_AUTH_STATUS:-n/a}"
  log "exact_blocker: ${blocker}"
  log "#880_#881_can_proceed: NO"
  exit 1
}

api_get() {
  # args: path → writes body to $TMP_BODY, prints http_code
  local path="$1"
  local url="${ERPNEXT_BASE_URL%/}${path}"
  curl -sS \
    -o "$TMP_BODY" \
    -w '%{http_code}' \
    --connect-timeout 10 \
    --max-time 30 \
    -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "$url" 2>"$TMP_ERR" || {
      local ec=$?
      printf 'curl_exit_%s' "$ec"
    }
}

json_field() {
  local field="$1"
  python3 - "$TMP_BODY" "$field" <<'PY'
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

encode_doctype_path() {
  python3 - "$1" <<'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
}

print_header

missing=()
[[ -z "${ERPNEXT_BASE_URL:-}" ]] && missing+=("ERPNEXT_BASE_URL")
[[ -z "${ERPNEXT_API_KEY:-}" ]] && missing+=("ERPNEXT_API_KEY")
[[ -z "${ERPNEXT_API_SECRET:-}" ]] && missing+=("ERPNEXT_API_SECRET")

if ((${#missing[@]} > 0)); then
  fail_closed "Cursor Cloud run missing injected secrets: ${missing[*]} (present in Infisical per #893 operator note, but not injected into this agent; CLOUD_AGENT_INJECTED_SECRET_NAMES=${CLOUD_AGENT_INJECTED_SECRET_NAMES:-none}). Smallest operator action: Cursor Dashboard → Cloud Agents → Secrets → add ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET from Infisical UI (do not paste into chat/GitHub), then re-run this probe."
fi

log "base_url_safe: $(redact_url "$ERPNEXT_BASE_URL")"

TMP_BODY="$(mktemp)"
TMP_ERR="$(mktemp)"
trap 'rm -f "$TMP_BODY" "$TMP_ERR"' EXIT

# 1) Authenticated identity (safe)
HTTP_AUTH_STATUS="$(api_get '/api/method/frappe.auth.get_logged_user')"
if [[ "$HTTP_AUTH_STATUS" != "200" ]]; then
  err_snip="$(tr '\n' ' ' <"$TMP_ERR" | cut -c1-160)"
  body_snip="$(tr '\n' ' ' <"$TMP_BODY" | cut -c1-160)"
  # Strip anything that looks like a token just in case
  body_snip="$(printf '%s' "$body_snip" | sed -E 's/[A-Za-z0-9_-]{20,}/***/g')"
  fail_closed "authentication failed HTTP ${HTTP_AUTH_STATUS}; curl_err='${err_snip:-none}'; body='${body_snip:-empty}'"
fi

AUTH_USER="$(json_field message)"
if [[ -z "$AUTH_USER" ]]; then
  AUTH_USER="(http_200_but_empty_message)"
fi
log "authenticated_user: ${AUTH_USER}"

# 2) Safe version / site metadata (best-effort; never fail solely on missing versions)
VER_STATUS="$(api_get '/api/method/frappe.utils.change_log.get_versions')"
if [[ "$VER_STATUS" == "200" ]]; then
  SITE_META="frappe/erpnext versions endpoint HTTP 200 (details omitted to keep evidence compact)"
  # Pull a couple of safe version strings if present
  FRAPPE_V="$(python3 - "$TMP_BODY" <<'PY'
import json,sys
try:
  d=json.load(open(sys.argv[1],encoding='utf-8'))
  msg=d.get('message') or {}
  parts=[]
  for app in ('frappe','erpnext'):
    info=msg.get(app) or {}
    ver=info.get('version') or info.get('branch') or ''
    if ver: parts.append(f"{app}={ver}")
  print(', '.join(parts)[:180])
except Exception:
  print('')
PY
)"
  if [[ -n "$FRAPPE_V" ]]; then
    SITE_META="$FRAPPE_V"
  fi
else
  SITE_META="versions endpoint HTTP ${VER_STATUS} (non-fatal)"
fi
log "site_version_metadata: ${SITE_META}"

# 3) Read-only DocType list probes (limit_page_length=1)
for dt in "${DOCTYPES[@]}"; do
  enc="$(encode_doctype_path "$dt")"
  code="$(api_get "/api/resource/${enc}?limit_page_length=1&fields=%5B%22name%22%5D")"
  if [[ "$code" == "200" ]]; then
    REACHABLE+=("$dt")
    log "doctype ${dt}: REACHABLE HTTP 200"
  else
    DENIED+=("${dt}:HTTP_${code}")
    body_snip="$(tr '\n' ' ' <"$TMP_BODY" | sed -E 's/[A-Za-z0-9_-]{20,}/***/g' | cut -c1-120)"
    log "doctype ${dt}: DENIED HTTP ${code} body='${body_snip:-empty}'"
  fi
done

if ((${#REACHABLE[@]} > 0)); then
  OVERALL="PASS"
fi

log ""
log "ERPNext access: ${OVERALL}"
log "authenticated_user: ${AUTH_USER}"
log "site_version_metadata: ${SITE_META}"
log "reachable_doctypes: ${REACHABLE[*]:-none}"
log "denied_doctypes: ${DENIED[*]:-none}"
log "http_auth_status: ${HTTP_AUTH_STATUS}"

if [[ "$OVERALL" == "PASS" ]]; then
  log "exact_blocker: NONE"
  if ((${#DENIED[@]} == 0)); then
    log "#880_#881_can_proceed: YES (read access verified for all listed commercial DocTypes; write capability not tested this probe)"
  else
    log "#880_#881_can_proceed: CONDITIONAL — readable=${#REACHABLE[@]} denied=${#DENIED[@]}; review denied list before master writes"
  fi
  exit 0
fi

fail_closed "authenticated but zero listed commercial DocTypes returned HTTP 200"
