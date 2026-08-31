#!/usr/bin/env bash
# CorpFlowAI — GET-only ERPNext opening / cutover metadata inspect (#1245).
#
# Never prints secret values, ERPNEXT_BASE_URL, hostnames, bank account
# numbers, taxpayer identifiers, or real financial amounts.
# Never creates, updates, submits, cancels, imports, or posts.
#
# Usage:
#   bash scripts/erpnext/opening-cutover-inspect.sh
#
# Exit codes:
#   0 = inspect completed (auth PASS; metadata recorded)
#   1 = secrets missing or authentication failed
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
host = (urlparse(u).hostname or "").lower()
if host.endswith(".frappe.cloud") or host.endswith(".erpnext.com"):
    print("vendor_hosted_frappe_family")
elif host in ("127.0.0.1", "localhost"):
    print("loopback")
elif host:
    print("other")
else:
    print("unparseable")
PY
}

log "ERPNext opening/cutover inspect (read-only) #1245"
log "mutation: forbidden (GET-only)"
log "journal_entry_create: forbidden"
log "opening_invoice_create: forbidden"
log "gl_posting: forbidden"
log "data_import: forbidden"
log "coa_mutation: forbidden"
log "ERPNEXT_BASE_URL: $(require_secret_present ERPNEXT_BASE_URL)"
log "ERPNEXT_API_KEY: $(require_secret_present ERPNEXT_API_KEY)"
log "ERPNEXT_API_SECRET: $(require_secret_present ERPNEXT_API_SECRET)"
log "MASTER_ADMIN_KEY: $(require_secret_present MASTER_ADMIN_KEY) (incidental presence only; #899 not reopened)"
log "erpnext_host_family: $(erpnext_host_family)"
log "ERPNEXT_BASE_URL_value: not_printed"
log "auth_uses_master_admin_key: no"
log "runtime_bridge_ssh: no"
log "runtime_bridge_infisical: no"
log "amounts_printed: no"
log "bank_account_numbers_printed: no"

missing=()
[[ -z "${ERPNEXT_BASE_URL:-}" ]] && missing+=("ERPNEXT_BASE_URL")
[[ -z "${ERPNEXT_API_KEY:-}" ]] && missing+=("ERPNEXT_API_KEY")
[[ -z "${ERPNEXT_API_SECRET:-}" ]] && missing+=("ERPNEXT_API_SECRET")
if ((${#missing[@]} > 0)); then
  log "ERPNext access: FAIL"
  log "exact_blocker: missing injected secrets: ${missing[*]}"
  exit 1
fi

python3 - <<'PY'
import json, os, urllib.parse, urllib.request

BASE = os.environ["ERPNEXT_BASE_URL"].rstrip("/")
KEY = os.environ["ERPNEXT_API_KEY"]
SECRET = os.environ["ERPNEXT_API_SECRET"]

def api_get(path):
    req = urllib.request.Request(
        BASE + path,
        headers={
            "Authorization": f"token {KEY}:{SECRET}",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8", "replace") or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(raw or "{}")
        except Exception:
            parsed = {}
        return e.code, parsed
    except Exception as exc:
        return 0, {"error": type(exc).__name__}

def enc(name):
    return urllib.parse.quote(name, safe="")

def fields_q(fields):
    return urllib.parse.quote(json.dumps(fields))

def log(msg):
    print(msg)

code, data = api_get("/api/method/frappe.auth.get_logged_user")
if code != 200:
    log(f"ERPNext access: FAIL")
    log(f"http_auth_status: {code}")
    log("exact_blocker: authentication failed")
    raise SystemExit(1)
user = data.get("message") or ""
log(f"authenticated_user: {user}")
log(f"http_auth_status: {code}")
log(f"identity_match_expected: {'yes' if user == 'integrations@corpflowai.com' else 'no'}")

code, data = api_get("/api/method/frappe.utils.change_log.get_versions")
log(f"versions_http: {code}")
if code == 200:
    msg = data.get("message") or {}
    for app in ("frappe", "erpnext"):
        info = msg.get(app) or {}
        ver = info.get("version") or info.get("branch") or "unread"
        log(f"app {app} version={ver}")

code, data = api_get(f"/api/resource/Company/{enc('CorpFlowAI LTD')}")
log(f"company_get_http: {code}")
if code == 200:
    row = data.get("data") or {}
    log(f"company_name: {row.get('name')}")
    log(f"company_abbr: {row.get('abbr')}")
    log(f"company_currency: {row.get('default_currency')}")
    log(f"company_country: {row.get('country')}")
    log(f"company_chart_of_accounts: {row.get('chart_of_accounts')}")
    log(f"company_coa_source: {row.get('create_chart_of_accounts_based_on')}")
    log(f"default_receivable_account: {row.get('default_receivable_account')}")
    log(f"default_payable_account: {row.get('default_payable_account')}")
    log(f"default_income_account: {row.get('default_income_account')}")
    log(f"default_expense_account: {row.get('default_expense_account')}")
    log(f"default_cash_account: {row.get('default_cash_account')}")
    log(f"default_bank_account: {row.get('default_bank_account') or 'null'}")
    log(f"cost_center: {row.get('cost_center')}")
    log(f"default_letter_head: {row.get('default_letter_head')}")
    log(f"accumulated_depreciation_account: {row.get('accumulated_depreciation_account')}")
    log(f"depreciation_expense_account: {row.get('depreciation_expense_account')}")
    log(f"exchange_gain_loss_account: {row.get('exchange_gain_loss_account')}")

code, data = api_get(f"/api/resource/Fiscal%20Year?limit_page_length=20&fields={fields_q(['name','year_start_date','year_end_date','disabled'])}")
log(f"fiscal_year_http: {code}")
if code == 200:
    for row in data.get("data") or []:
        log(
            "fiscal_year "
            f"name={row.get('name')} start={row.get('year_start_date')} "
            f"end={row.get('year_end_date')} disabled={row.get('disabled')}"
        )

acct_fields = ["name", "account_type", "root_type", "is_group", "parent_account", "account_currency"]
code, data = api_get(f"/api/resource/Account?limit_page_length=500&fields={fields_q(acct_fields)}")
log(f"account_http: {code}")
accounts = data.get("data") or [] if code == 200 else []
groups = [a for a in accounts if a.get("is_group") in (1, True, "1")]
children = [a for a in accounts if a.get("is_group") not in (1, True, "1")]
log(f"account_total: {len(accounts)}")
log(f"account_groups: {len(groups)}")
log(f"account_children: {len(children)}")
by_root = {}
for a in accounts:
    rt = a.get("root_type") or "(none)"
    by_root[rt] = by_root.get(rt, 0) + 1
log("account_by_root_type: " + ",".join(f"{k}={v}" for k, v in sorted(by_root.items())))

named = [
    "Temporary Opening - CFAI",
    "Opening Balance Equity - CFAI",
    "Retained Earnings - CFAI",
    "Capital Stock - CFAI",
    "Unsecured Loans - CFAI",
    "Secured Loans - CFAI",
    "Bank Overdraft Account - CFAI",
    "Debtors - CFAI",
    "Debtors USD - CFAI",
    "Creditors - CFAI",
    "Cash - CFAI",
    "VAT - CFAI",
    "Payroll Payable - CFAI",
    "Accumulated Depreciation - CFAI",
]
present = {a.get("name") for a in accounts}
for name in named:
    row = next((a for a in accounts if a.get("name") == name), None)
    if row:
        log(
            f"account_present name={name} type={row.get('account_type') or 'none'} "
            f"root={row.get('root_type')} group={row.get('is_group')} "
            f"ccy={row.get('account_currency') or 'none'}"
        )
    else:
        log(f"account_absent name={name}")

bank_children = [a.get("name") for a in accounts if a.get("parent_account") == "Bank Accounts - CFAI"]
log(f"bank_gl_children_under_Bank_Accounts: {len(bank_children)}")
log("bank_gl_child_names: " + (",".join(bank_children) if bank_children else "none"))

code, data = api_get(f"/api/resource/Cost%20Center?limit_page_length=20&fields={fields_q(['name','is_group','parent_cost_center'])}")
log(f"cost_center_http: {code}")
if code == 200:
    for row in data.get("data") or []:
        log(f"cost_center name={row.get('name')} group={row.get('is_group')}")

code, data = api_get("/api/resource/Module%20Onboarding/Accounting%20Onboarding")
log(f"accounting_onboarding_http: {code}")
if code == 200:
    row = data.get("data") or {}
    steps = [s.get("step") for s in (row.get("steps") or [])]
    log(f"accounting_onboarding_is_complete: {row.get('is_complete')}")
    log(f"accounting_onboarding_step_count: {len(steps)}")
    log("accounting_onboarding_steps: " + ",".join(steps))

onboarding_needed = [
    "Chart of Accounts",
    "Setup Sales taxes",
    "Create Sales Invoice",
    "Create Payment Entry",
    "View Balance Sheet",
    "Review Accounts Settings",
]
code, data = api_get(f"/api/resource/Onboarding%20Step?limit_page_length=80&fields={fields_q(['name','title','is_complete','is_skipped'])}")
log(f"onboarding_step_http: {code}")
done = 0
if code == 200:
    rows = {r.get("name"): r for r in (data.get("data") or [])}
    for name in onboarding_needed:
        row = rows.get(name) or {}
        complete = int(row.get("is_complete") or 0)
        skipped = int(row.get("is_skipped") or 0)
        done += 1 if complete else 0
        log(f"onboarding_step name={name} complete={complete} skipped={skipped}")
log(f"accounting_onboarding_complete_count: {done}/{len(onboarding_needed)}")

probes = [
    "Journal Entry",
    "Opening Invoice Creation Tool",
    "Period Closing Voucher",
    "Accounting Period",
    "Account Closing Balance",
    "Bank Account",
    "Asset",
    "Asset Category",
    "Currency Exchange",
    "Data Import",
    "Payment Entry",
    "Sales Invoice",
    "Purchase Invoice",
    "GL Entry",
    "Chart of Accounts Importer",
]
for dt in probes:
    code, data = api_get(f"/api/resource/{enc(dt)}?limit_page_length=5&fields=%5B%22name%22%5D")
    count = len(data.get("data") or []) if code == 200 else 0
    log(f"doctype_probe {dt.replace(' ', '_')}: HTTP {code} listed={count}")

code, data = api_get("/api/resource/Journal%20Entry?limit_page_length=20&fields=%5B%22name%22%2C%22voucher_type%22%2C%22docstatus%22%5D")
log(f"journal_entry_http: {code}")
if code == 200:
    rows = data.get("data") or []
    opening = sum(1 for r in rows if r.get("voucher_type") == "Opening Entry")
    log(f"journal_entry_listed: {len(rows)}")
    log(f"journal_entry_opening_entry_listed: {opening}")

code, data = api_get("/api/resource/Sales%20Invoice?limit_page_length=20&fields=%5B%22name%22%2C%22is_opening%22%2C%22docstatus%22%5D")
log(f"sales_invoice_http: {code}")
if code == 200:
    rows = data.get("data") or []
    opening = sum(1 for r in rows if str(r.get("is_opening") or "").lower() in ("yes", "1", "true"))
    submitted = sum(1 for r in rows if str(r.get("docstatus")) == "1")
    log(f"sales_invoice_listed: {len(rows)}")
    log(f"sales_invoice_is_opening_yes: {opening}")
    log(f"sales_invoice_submitted: {submitted}")
    log("sales_invoice_names: " + ",".join(r.get("name") or "" for r in rows))

code, data = api_get("/api/resource/Purchase%20Invoice?limit_page_length=10&fields=%5B%22name%22%2C%22is_opening%22%2C%22docstatus%22%5D")
log(f"purchase_invoice_http: {code}")
if code == 200:
    rows = data.get("data") or []
    opening = sum(1 for r in rows if str(r.get("is_opening") or "").lower() in ("yes", "1", "true"))
    log(f"purchase_invoice_listed: {len(rows)}")
    log(f"purchase_invoice_is_opening_yes: {opening}")

code, data = api_get("/api/resource/GL%20Entry?limit_page_length=5&fields=%5B%22name%22%2C%22is_opening%22%2C%22voucher_type%22%5D")
log(f"gl_entry_http: {code}")
if code == 200:
    log(f"gl_entry_listed: {len(data.get('data') or [])}")

code, data = api_get("/api/resource/Bank%20Account?limit_page_length=10&fields=%5B%22name%22%2C%22company%22%2C%22is_company_account%22%5D")
log(f"bank_account_http: {code}")
if code == 200:
    log(f"bank_account_listed: {len(data.get('data') or [])}")

code, data = api_get("/api/resource/Asset?limit_page_length=5&fields=%5B%22name%22%2C%22docstatus%22%5D")
log(f"asset_http: {code}")
if code == 200:
    log(f"asset_listed: {len(data.get('data') or [])}")

code, data = api_get("/api/resource/Period%20Closing%20Voucher?limit_page_length=5&fields=%5B%22name%22%2C%22docstatus%22%5D")
log(f"period_closing_http: {code}")
if code == 200:
    log(f"period_closing_listed: {len(data.get('data') or [])}")

code, data = api_get("/api/resource/Accounting%20Period?limit_page_length=5&fields=%5B%22name%22%5D")
log(f"accounting_period_http: {code}")
if code == 200:
    log(f"accounting_period_listed: {len(data.get('data') or [])}")

code, data = api_get("/api/resource/Currency%20Exchange?limit_page_length=10&fields=%5B%22name%22%2C%22from_currency%22%2C%22to_currency%22%5D")
log(f"currency_exchange_http: {code}")
if code == 200:
    pairs = [f"{r.get('from_currency')}-{r.get('to_currency')}" for r in (data.get("data") or [])]
    log("currency_exchange_pairs: " + (",".join(pairs) if pairs else "none"))
    log("currency_exchange_rates: not_printed")

code, data = api_get("/api/resource/Sales%20Taxes%20and%20Charges%20Template?limit_page_length=10&fields=%5B%22name%22%2C%22is_default%22%5D")
log(f"sales_tax_template_http: {code}")
if code == 200:
    log("sales_tax_templates: " + ",".join((r.get("name") or "") for r in (data.get("data") or [])))

code, data = api_get("/api/resource/Mode%20of%20Payment?limit_page_length=20&fields=%5B%22name%22%2C%22type%22%5D")
log(f"mode_of_payment_http: {code}")
if code == 200:
    log("modes_of_payment: " + ",".join((r.get("name") or "") for r in (data.get("data") or [])))

log("posting_attempted: no")
log("import_attempted: no")
log("coa_mutated: no")
log("secret_values_printed: no")
log("ERPNext access: PASS")
log("inspect_verdict: OPENING_CUTOVER_METADATA_READ_NO_POSTING")
PY
