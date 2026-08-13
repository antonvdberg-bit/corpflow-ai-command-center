#!/usr/bin/env bash
# CorpFlowAI — apply canonical ERPNext Item Price / Price List rows (#881).
#
# Canonical path: direct Frappe token auth using Cursor Cloud–injected secrets
# (names only; never logs values):
#   ERPNEXT_BASE_URL
#   ERPNEXT_API_KEY
#   ERPNEXT_API_SECRET
#
# Do NOT require MASTER_ADMIN_KEY, SSH, or Infisical at runtime.
# Authenticate as the CorpFlowAI Integration API identity
# (integrations@corpflowai.com).
#
# Writes only standard Price List + Item Price rows from
# config/erpnext-product-catalogue.v1.json where authority=canonical.
# Does not invent rates. Does not write operator-quote / reserved / T2/T3.
# Does not submit quotations, send documents, take payment, or change schema.
#
# Usage:
#   bash scripts/erpnext/apply-product-catalogue-prices.sh --dry-run
#   bash scripts/erpnext/apply-product-catalogue-prices.sh
#
# Exit codes:
#   0 = dry-run OK, or live apply READY (canonical Item Price rows readable)
#   1 = FAIL / NOT READY (missing secrets, 403, or apply incomplete)
#   2 = unexpected script error

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CATALOGUE="${ROOT}/config/erpnext-product-catalogue.v1.json"
DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

log() { printf '%s\n' "$*"; }

require_secret_present() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "absent"
  else
    echo "present"
  fi
}

list_injected_secret_names() {
  python3 - <<'PY'
import os
wanted = [
    "ERPNEXT_BASE_URL",
    "ERPNEXT_API_KEY",
    "ERPNEXT_API_SECRET",
    "MASTER_ADMIN_KEY",
    "ADMIN_PIN",
]
present = [n for n in wanted if os.environ.get(n)]
print(",".join(present) if present else "none")
PY
}

CLICK_PATH=$(cat <<'EOF'
Smallest Anton click path (UI-only; no secrets, no schema):
1. ERPNext Desk as Administrator.
2. Home → Users → Role Permissions Manager.
3. DocType = Item Price. Add role Item Manager: Read, Create, Write (permlevel 0).
4. DocType = Price List. For role Item Manager enable Create and Write (Read already exists for Sales User).
5. Save. Do not change the shared Accounts Role Profile. Do not assign Sales Master Manager onto that shared profile.
6. Re-run: bash scripts/erpnext/apply-product-catalogue-prices.sh
Why: standard Item Price perms exist only on Sales Master Manager / Purchase Master Manager. integrations@corpflowai.com has Item Manager via Role Profile Accounts, and cannot mutate Role / Custom DocPerm / permission_manager (HTTP 403).
EOF
)

print_header() {
  log "ERPNext product catalogue price-master apply (#881)"
  log "access_path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)"
  log "expected_identity: integrations@corpflowai.com (CorpFlowAI Integration)"
  log "ERPNEXT_BASE_URL: $(require_secret_present ERPNEXT_BASE_URL)"
  log "ERPNEXT_API_KEY: $(require_secret_present ERPNEXT_API_KEY)"
  log "ERPNEXT_API_SECRET: $(require_secret_present ERPNEXT_API_SECRET)"
  log "MASTER_ADMIN_KEY: $(require_secret_present MASTER_ADMIN_KEY) (must not be used as ERPNext auth)"
  log "injected_secret_names_checked: $(list_injected_secret_names)"
  log "auth_fallback_master_admin_key: forbidden"
  log "auth_fallback_admin_pin: forbidden"
  log "runtime_bridge_ssh: no"
  log "runtime_bridge_infisical: no"
  log "ERPNEXT_BASE_URL_value: not_printed"
  log "dry_run: ${DRY_RUN}"
}

print_planned() {
  python3 - "$CATALOGUE" <<'PY'
import json, sys
cat = json.load(open(sys.argv[1], encoding="utf-8"))
print("planned_price_lists:")
needed = {}
rows = []
for item in cat.get("items") or []:
    if item.get("erpnext_insert") is not True:
        continue
    for price in item.get("prices") or []:
        if price.get("authority") != "canonical":
            continue
        if price.get("rate") is None:
            continue
        needed[price["price_list"]] = price["currency"]
        rows.append({
            "item_code": item["item_code"],
            "price_list": price["price_list"],
            "currency": price["currency"],
            "rate": price["rate"],
            "uom": price.get("uom") or item.get("stock_uom"),
        })
for name, currency in needed.items():
    print(f"  - {name} currency={currency} selling=1")
print("planned_item_prices:")
for row in rows:
    print("  - {item_code} {price_list} {currency} {rate} / {uom}".format(**row))
print("skipped_operator_quote: CF-WR-REC-MUR-MAINT")
print("skipped_reserved: CF-WR-SETUP-MUR-T2 CF-WR-SETUP-MUR-T3 CF-RD-REPUTATION-RECOVERY")
print(f"canonical_row_count: {len(rows)}")
PY
}

print_header
print_planned

if [[ "$DRY_RUN" == "1" ]]; then
  log "mode: dry-run (no ERPNext call)"
  log "ERPNext Product Catalogue price apply: DRY-RUN"
  exit 0
fi

missing=()
[[ -z "${ERPNEXT_BASE_URL:-}" ]] && missing+=("ERPNEXT_BASE_URL")
[[ -z "${ERPNEXT_API_KEY:-}" ]] && missing+=("ERPNEXT_API_KEY")
[[ -z "${ERPNEXT_API_SECRET:-}" ]] && missing+=("ERPNEXT_API_SECRET")
if ((${#missing[@]} > 0)); then
  log "ERPNext Product Catalogue NOT READY — missing injected secrets: ${missing[*]}"
  log "Do not use MASTER_ADMIN_KEY as a substitute."
  exit 1
fi

set +e
python3 - "$CATALOGUE" <<'PY'
import json, os, sys, urllib.parse, urllib.request, re

catalogue_path = sys.argv[1]
base = os.environ["ERPNEXT_BASE_URL"].rstrip("/")
key = os.environ["ERPNEXT_API_KEY"]
secret = os.environ["ERPNEXT_API_SECRET"]
cat = json.load(open(catalogue_path, encoding="utf-8"))

def redact(s, n=220):
    s = (s or "").replace("\n", " ")
    s = re.sub(r"[A-Za-z0-9_\-]{20,}", "***", s)
    s = re.sub(r"https?://[^\s\"']+", "[url]", s)
    return s[:n]

def req(method, path, payload=None):
    url = base + path
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"token {key}:{secret}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8", "replace") or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"_raw": redact(body)}
        return e.code, parsed
    except Exception as e:
        return 0, {"_raw": f"err:{type(e).__name__}"}

def log(msg):
    print(msg)

code, data = req("GET", "/api/method/frappe.auth.get_logged_user")
user = data.get("message") if isinstance(data, dict) else ""
log(f"authenticated_user: {user}")
log(f"http_auth_status: {code}")
if code != 200:
    log("ERPNext Product Catalogue NOT READY — authentication failed")
    raise SystemExit(1)

roles_code, roles_data = req("POST", "/api/method/frappe.core.doctype.user.user.get_roles", {})
roles = roles_data.get("message") if isinstance(roles_data, dict) else []
log(f"roles: {', '.join(roles) if isinstance(roles, list) else 'unread'}")

ip_code, ip_data = req(
    "GET",
    "/api/resource/" + urllib.parse.quote("Item Price")
    + "?limit_page_length=50&fields="
    + urllib.parse.quote(json.dumps(["name", "item_code", "price_list", "price_list_rate", "currency", "uom", "selling"])),
)
log(f"item_price_get: HTTP {ip_code}")
if ip_code == 403:
    log("item_price_write: denied")
    log("price_list_write: denied_or_untested")
    log("ERPNext Product Catalogue NOT READY — Item Price (and Price List write) Role Permission grant is UI-only")
    log("exact_blocker: Item Price HTTP 403 for integrations@corpflowai.com; permission_manager / Custom DocPerm / Role writes also 403")
    log("standard_item_price_roles: Sales Master Manager, Purchase Master Manager")
    log("anton_required_now: YES — Role Permissions Manager click path in docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md")
    raise SystemExit(1)

if ip_code != 200:
    log(f"ERPNext Product Catalogue NOT READY — Item Price GET HTTP {ip_code} {redact(json.dumps(ip_data))}")
    raise SystemExit(1)

needed_lists = {}
canonical_rows = []
for item in cat.get("items") or []:
    if item.get("erpnext_insert") is not True:
        continue
    for price in item.get("prices") or []:
        if price.get("authority") != "canonical" or price.get("rate") is None:
            continue
        needed_lists[price["price_list"]] = price["currency"]
        canonical_rows.append({
            "item_code": item["item_code"],
            "price_list": price["price_list"],
            "currency": price["currency"],
            "rate": float(price["rate"]),
            "uom": price.get("uom") or item.get("stock_uom"),
        })

pl_code, pl_data = req(
    "GET",
    "/api/resource/" + urllib.parse.quote("Price List")
    + "?limit_page_length=50&fields="
    + urllib.parse.quote(json.dumps(["name", "currency", "selling", "buying", "enabled"])),
)
existing_lists = {
    row.get("name"): row
    for row in (pl_data.get("data") or [])
} if pl_code == 200 and isinstance(pl_data, dict) else {}
log(f"price_list_get: HTTP {pl_code} names={sorted(existing_lists)}")

for name, currency in needed_lists.items():
    if name in existing_lists:
        log(f"price_list_exists: {name} currency={existing_lists[name].get('currency')}")
        continue
    create_code, create_data = req("POST", "/api/resource/" + urllib.parse.quote("Price List"), {
        "doctype": "Price List",
        "price_list_name": name,
        "currency": currency,
        "selling": 1,
        "buying": 0,
        "enabled": 1,
    })
    if create_code in (200, 201) and isinstance(create_data.get("data"), dict):
        log(f"price_list_created: {name} currency={currency} selling=1")
        existing_lists[name] = create_data["data"]
    else:
        log(f"price_list_create_failed: {name} HTTP {create_code} {redact(json.dumps(create_data))}")
        log("ERPNext Product Catalogue NOT READY — Price List write denied or failed")
        raise SystemExit(1)

existing_prices = ip_data.get("data") or []

def find_price(item_code, price_list, uom):
    for row in existing_prices:
        if row.get("item_code") == item_code and row.get("price_list") == price_list and (not uom or row.get("uom") in (None, uom)):
            return row
    return None

applied = []
for row in canonical_rows:
    found = find_price(row["item_code"], row["price_list"], row["uom"])
    if found:
        current = float(found.get("price_list_rate") or 0)
        if current == row["rate"] and found.get("currency") == row["currency"]:
            log(f"item_price_exists: {row['item_code']} {row['price_list']} {row['currency']} {row['rate']}")
            applied.append(row)
            continue
        name = found.get("name")
        put_code, put_data = req(
            "PUT",
            "/api/resource/" + urllib.parse.quote("Item Price") + "/" + urllib.parse.quote(str(name)),
            {"price_list_rate": row["rate"], "currency": row["currency"], "uom": row["uom"], "selling": 1},
        )
        if put_code != 200:
            log(f"item_price_update_failed: {row['item_code']} HTTP {put_code} {redact(json.dumps(put_data))}")
            raise SystemExit(1)
        log(f"item_price_updated: {row['item_code']} {row['price_list']} {row['currency']} {row['rate']}")
        applied.append(row)
        continue
    post_code, post_data = req("POST", "/api/resource/" + urllib.parse.quote("Item Price"), {
        "doctype": "Item Price",
        "item_code": row["item_code"],
        "price_list": row["price_list"],
        "price_list_rate": row["rate"],
        "currency": row["currency"],
        "selling": 1,
        "buying": 0,
        "uom": row["uom"],
    })
    if post_code not in (200, 201) or not isinstance(post_data.get("data"), dict):
        log(f"item_price_create_failed: {row['item_code']} HTTP {post_code} {redact(json.dumps(post_data))}")
        log("ERPNext Product Catalogue NOT READY — Item Price write failed")
        raise SystemExit(1)
    created = post_data["data"]
    log(
        "item_price_created: {item_code} {price_list} {currency} {rate}".format(
            item_code=created.get("item_code"),
            price_list=created.get("price_list"),
            currency=created.get("currency"),
            rate=created.get("price_list_rate"),
        )
    )
    applied.append(row)

# Read-back
rb_code, rb_data = req(
    "GET",
    "/api/resource/" + urllib.parse.quote("Item Price")
    + "?limit_page_length=50&fields="
    + urllib.parse.quote(json.dumps(["name", "item_code", "price_list", "price_list_rate", "currency", "uom", "selling"])),
)
log(f"item_price_readback: HTTP {rb_code}")
read_rows = rb_data.get("data") or [] if rb_code == 200 else []
missing = []
for row in canonical_rows:
    match = next(
        (
            r for r in read_rows
            if r.get("item_code") == row["item_code"]
            and r.get("price_list") == row["price_list"]
            and float(r.get("price_list_rate") or 0) == row["rate"]
        ),
        None,
    )
    if match:
        log(f"readback_ok: {row['item_code']} {row['price_list']} {row['currency']} {row['rate']}")
    else:
        missing.append(row["item_code"])
        log(f"readback_missing: {row['item_code']} {row['price_list']}")

if missing:
    log("ERPNext Product Catalogue NOT READY — canonical Item Price read-back incomplete")
    raise SystemExit(1)

log("skipped_operator_quote: CF-WR-REC-MUR-MAINT (no approved monthly MUR list price)")
log(f"canonical_item_prices_ready: {len(canonical_rows)}")
log("ERPNext Product Catalogue READY")
log("anton_required_now: NO")
PY
apply_ec=$?
if [[ "$apply_ec" -ne 0 ]]; then
  log ""
  log "${CLICK_PATH}"
fi
exit "$apply_ec"
