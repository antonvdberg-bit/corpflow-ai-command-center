# #1098 / #1213 Buying / AP readiness evidence (synthetic)

Hosted ERPNext test. Identity `integrations@corpflowai.com`. No secrets. No Payment Entry. Do not submit Purchase Invoice. Do not pay.

| File | What it shows |
| --- | --- |
| `apply-log.json` | #1098 write-path proof: Supplier LIST 200; Supplier CREATE HTTP 403; synthetic Item `CF-AP-SYNTHETIC-OPEX` reused; PI submit not attempted |
| `get-only-log-1213.json` | #1213 current-main GET: Supplier still count=0; Item reuse; `po_required=No`; uniqueness=0; PI/PO/PE count=0 |

Live names:

- Item `CF-AP-SYNTHETIC-OPEX` (`is_purchase_item=1`, non-stock)
- Planned Supplier `CF1098 Synthetic Operating Supplier Ltd` (not created)

Canonical write-up: `docs/erpnext/ERPNEXT_BUYING_AP_READINESS_V1.md`.

**Source proof: ERPNext BUYING / AP READINESS READY FOR ACCOUNTANT CONFIGURATION.**  
**Current-main: ERPNext BUYING/AP CURRENT-MAIN READY FOR ACCOUNTANT CONFIGURATION.**
