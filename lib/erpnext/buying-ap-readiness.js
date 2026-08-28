/**
 * ERPNext Buying / AP readiness (#1098) and current-main landing (#1213).
 *
 * Mapping + duplicate/approval rules for the standard-ERPNext-first
 * Supplier -> expense category -> draft Purchase Invoice path.
 *
 * No live ERPNext calls. No secrets. No custom fields.
 * Payment Entry, bank credentials, and Purchase Invoice submit remain
 * separately protected. #1213 inspects hosted ERPNext GET/read-only.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
export const CONFIG_REL = 'config/erpnext-buying-ap-readiness.v1.json';

export const CANONICAL_VERDICT =
  'ERPNext BUYING / AP READINESS READY FOR ACCOUNTANT CONFIGURATION';
export const CURRENT_MAIN_VERDICT =
  'ERPNext BUYING/AP CURRENT-MAIN READY FOR ACCOUNTANT CONFIGURATION';
export const PURCHASE_ORDER_VERDICT = 'DEFER';
export const PAYMENT_SEGREGATION_RULE = 'INVOICE_EXISTENCE_NEVER_AUTHORIZES_PAYMENT';
export const SOURCE_PROOF_ISSUE = 1098;
export const CURRENT_MAIN_ISSUE = 1213;

/** @type {Record<string, unknown> | null} */
let cachedConfig = null;

function asTrimmedString(value) {
  return value == null ? '' : String(value).trim();
}

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

/**
 * @param {string} [repoRoot]
 */
export function loadBuyingApReadinessConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetBuyingApReadinessConfigCache() {
  cachedConfig = null;
}

/**
 * @param {string} name
 */
export function normalizeSupplierName(name) {
  return asTrimmedString(name).replace(/\s+/g, ' ');
}

/**
 * @param {unknown} value
 */
export function normalizeEmail(value) {
  return asTrimmedString(value).toLowerCase();
}

/**
 * @param {Array<Record<string, unknown>>} index
 * @param {{ supplier_name?: string, email?: string }} candidate
 */
export function findSupplierDuplicateMatches(index, candidate) {
  const wantedName = normalizeSupplierName(candidate.supplier_name).toLowerCase();
  const wantedEmail = normalizeEmail(candidate.email);
  const hits = [];
  for (const row of Array.isArray(index) ? index : []) {
    const rowName = normalizeSupplierName(row.supplier_name || row.name).toLowerCase();
    const rowEmail = normalizeEmail(row.email);
    const reasons = [];
    if (wantedName && rowName === wantedName) reasons.push('supplier_name');
    if (wantedEmail && rowEmail && rowEmail === wantedEmail) reasons.push('email');
    if (reasons.length) hits.push({ ...row, match_reasons: reasons });
  }
  return hits;
}

/**
 * @param {Array<Record<string, unknown>>} matches
 */
export function resolveSupplierDuplicateAction(matches) {
  if (!matches || matches.length === 0) return { action: 'create', reason: 'no_match' };
  return {
    action: 'reuse',
    reason: Array.isArray(matches[0].match_reasons)
      ? matches[0].match_reasons.join(',')
      : 'name_or_email_match',
    existing: matches[0],
  };
}

/**
 * Operator convention until Accounts Settings.check_supplier_invoice_uniqueness is enabled.
 * @param {Array<Record<string, unknown>>} index
 * @param {{ supplier?: string, bill_no?: string }} candidate
 */
export function findPurchaseInvoiceDuplicates(index, candidate) {
  const wantedSupplier = normalizeSupplierName(candidate.supplier).toLowerCase();
  const wantedBill = asTrimmedString(candidate.bill_no).toLowerCase();
  const hits = [];
  if (!wantedSupplier || !wantedBill) return hits;
  for (const row of Array.isArray(index) ? index : []) {
    const rowSupplier = normalizeSupplierName(row.supplier || row.supplier_name).toLowerCase();
    const rowBill = asTrimmedString(row.bill_no).toLowerCase();
    if (rowSupplier === wantedSupplier && rowBill === wantedBill) {
      hits.push({ ...row, match_reasons: ['supplier', 'bill_no'] });
    }
  }
  return hits;
}

/**
 * @param {Array<Record<string, unknown>>} matches
 */
export function resolvePurchaseInvoiceDuplicateAction(matches) {
  if (!matches || matches.length === 0) return { action: 'create', reason: 'no_match' };
  return {
    action: 'reuse_or_stop',
    reason: 'supplier_and_bill_no',
    existing: matches[0],
  };
}

/**
 * Supplier CREATE 403 is a Role Permission gap, not an accountant CoA decision.
 * @param {{ supplierCreateHttp?: number, accountantFoundationOpen?: boolean }} input
 */
export function distinguishPermissionFromAccountantBlocker(input = {}) {
  const supplierCreateBlocked = Number(input.supplierCreateHttp) === 403;
  const accountantOpen = input.accountantFoundationOpen !== false;
  return {
    supplier_create: supplierCreateBlocked ? 'permission_blocked' : 'writable_or_unproven',
    accountant_defaults: accountantOpen ? 'blocked_by_#1055' : 'approved',
    distinct: true,
    payment_authority: 'never_from_invoice_existence',
  };
}

/**
 * @param {Record<string, unknown>} intake
 * @param {Record<string, unknown>} [config]
 */
export function buildSupplierPayload(intake, config = loadBuyingApReadinessConfig()) {
  const defaults = /** @type {Record<string, string>} */ (config.defaults || {});
  const synthetic = /** @type {Record<string, string>} */ (config.synthetic || {});
  const name =
    normalizeSupplierName(intake.supplier_name) ||
    normalizeSupplierName(intake.legal_name) ||
    normalizeSupplierName(synthetic.supplier_name);
  const accountantApprovedTax = intake.accountant_approved_tax === true;
  const details = [
    'corpflow.buying_ap_readiness.v1',
    intake.synthetic ? 'synthetic=true' : null,
    `issue=${intake.issue || 1098}`,
    'do_not_approve_for_payment=true',
    'do_not_store_bank_credentials=true',
  ]
    .filter(Boolean)
    .join(' | ');

  const payload = {
    doctype: 'Supplier',
    supplier_name: name,
    supplier_type: asTrimmedString(intake.supplier_type) || defaults.supplier_type_company,
    supplier_group: asTrimmedString(intake.supplier_group) || defaults.supplier_group,
    country: asTrimmedString(intake.country) || defaults.country,
    default_currency: asTrimmedString(intake.default_currency) || defaults.default_currency,
    default_price_list: asTrimmedString(intake.default_price_list) || defaults.buying_price_list,
    disabled: 0,
    supplier_details: details,
  };

  if (accountantApprovedTax && asTrimmedString(intake.tax_id)) {
    payload.tax_id = asTrimmedString(intake.tax_id);
  }

  return payload;
}

/**
 * @param {Record<string, unknown>} intake
 * @param {string} supplierName
 * @param {Record<string, unknown>} [config]
 */
export function buildSupplierContactPayload(
  intake,
  supplierName,
  config = loadBuyingApReadinessConfig()
) {
  const defaults = /** @type {Record<string, string>} */ (config.defaults || {});
  const synthetic = /** @type {Record<string, string>} */ (config.synthetic || {});
  const firstName =
    asTrimmedString(intake.contact_first_name) || synthetic.contact_first_name || 'Supplier';
  const lastName = asTrimmedString(intake.contact_last_name) || synthetic.contact_last_name || undefined;
  const email = asTrimmedString(intake.contact_email) || asTrimmedString(intake.working_email);
  return {
    doctype: 'Contact',
    first_name: firstName,
    last_name: lastName,
    company_name: supplierName,
    status: defaults.contact_status,
    is_primary_contact: 1,
    email_id: email || undefined,
    email_ids: email ? [{ email_id: email, is_primary: 1 }] : [],
    links: [{ link_doctype: 'Supplier', link_name: supplierName }],
  };
}

/**
 * @param {Record<string, unknown>} intake
 * @param {string} supplierName
 * @param {Record<string, unknown>} [config]
 */
export function buildSupplierAddressPayload(
  intake,
  supplierName,
  config = loadBuyingApReadinessConfig()
) {
  const defaults = /** @type {Record<string, string>} */ (config.defaults || {});
  const synthetic = /** @type {Record<string, string>} */ (config.synthetic || {});
  return {
    doctype: 'Address',
    address_title: supplierName,
    address_type: asTrimmedString(intake.address_type) || defaults.address_type,
    address_line1:
      asTrimmedString(intake.address_line1) ||
      synthetic.address_line1 ||
      'Address required',
    city: asTrimmedString(intake.city) || synthetic.city || 'Port Louis',
    country: asTrimmedString(intake.country) || defaults.country,
    is_primary_address: 1,
    is_shipping_address: 1,
    links: [{ link_doctype: 'Supplier', link_name: supplierName }],
  };
}

/**
 * @param {Record<string, unknown>} [config]
 */
export function buildSyntheticPurchaseItemPayload(config = loadBuyingApReadinessConfig()) {
  const synthetic = /** @type {Record<string, string>} */ (config.synthetic || {});
  return {
    doctype: 'Item',
    item_code: synthetic.item_code,
    item_name: synthetic.item_name,
    item_group: synthetic.item_group || 'Services',
    stock_uom: 'Nos',
    is_stock_item: 0,
    is_sales_item: 0,
    is_purchase_item: 1,
    include_item_in_manufacturing: 0,
    description:
      'CF1098 synthetic=true. Placeholder purchase expense item for AP mapping. Do not use on real supplier invoices. Not accountant-approved.',
  };
}

/**
 * @param {Record<string, unknown>} [config]
 */
export function evaluatePurchaseOrderNeed(config = loadBuyingApReadinessConfig()) {
  const settings = /** @type {Record<string, unknown>} */ (config.buying_settings_readback || {});
  const poRequired = asTrimmedString(settings.po_required).toLowerCase();
  return {
    verdict: PURCHASE_ORDER_VERDICT,
    po_required: settings.po_required || 'No',
    use_now: false,
    reason:
      poRequired === 'no'
        ? 'Buying Settings po_required=No and CorpFlowAI initial operations are invoice-first operating costs, not stock procurement.'
        : 'Purchase Order remains deferred until a proven three-way-match need exists.',
  };
}

/**
 * Fail-closed gate for accounting-bearing Purchase Invoice submit/post.
 *
 * @param {{
 *   accountantApproved?: boolean,
 *   payableAccountApproved?: boolean,
 *   expenseAccountApproved?: boolean,
 *   taxVatApproved?: boolean,
 *   costCentreApproved?: boolean,
 *   docstatus?: number,
 * }} input
 */
export function evaluatePurchaseInvoiceSubmitGate(input = {}) {
  const missing = [];
  if (input.accountantApproved !== true) missing.push('accountant_foundation_#1055');
  if (input.payableAccountApproved !== true) missing.push('payable_account');
  if (input.expenseAccountApproved !== true) missing.push('expense_account');
  if (input.taxVatApproved !== true) missing.push('tax_vat');
  if (input.costCentreApproved !== true) missing.push('cost_centre');
  const allowed = missing.length === 0;
  return {
    allowed,
    must_remain_draft: !allowed,
    missing,
    rule: PAYMENT_SEGREGATION_RULE,
    note: allowed
      ? 'Submit still does not authorize Payment Entry.'
      : 'Keep Draft/read-only mapping until #1055 accountant-approved defaults exist.',
  };
}

export function purchaseInvoiceLifecycle() {
  return [
    {
      stage: 'supplier_master',
      erpnext: 'Supplier + Contact + Address',
      meaning: 'Legal/display name exists. Real suppliers require Anton approval first.',
    },
    {
      stage: 'expense_category',
      erpnext: 'Item (is_purchase_item=1, non-stock) + expense_account',
      meaning: 'What was bought. Expense account stays accountant-owned.',
    },
    {
      stage: 'capture_draft',
      erpnext: 'Purchase Invoice docstatus=0',
      meaning: 'bill_no, bill_date, qty, rate, attachment. Does not post GL. Does not authorize payment.',
    },
    {
      stage: 'review',
      erpnext: 'Draft PI + File attachment',
      meaning: 'Anton (or named reviewer) checks supplier, amount, attachment, and account coding.',
    },
    {
      stage: 'accounting_submit',
      erpnext: 'Purchase Invoice docstatus=1',
      meaning: 'Protected. Posts Dr expense / Cr payable. Blocked until #1055 accountant-approved defaults.',
    },
    {
      stage: 'payment',
      erpnext: 'Payment Entry (Pay)',
      meaning: 'Separately protected. Invoice existence never authorizes this step. Buying Settings show_pay_button is UI only.',
    },
  ];
}

/**
 * @param {Record<string, unknown>} [config]
 */
export function listAccountantDependencies(config = loadBuyingApReadinessConfig()) {
  return Array.isArray(config.accountant_dependencies) ? config.accountant_dependencies : [];
}

/**
 * @param {Record<string, unknown>} [config]
 */
export function listForbiddenBankEvidenceKeys(config = loadBuyingApReadinessConfig()) {
  const keys = config.forbidden_github_evidence_keys;
  return Array.isArray(keys) ? keys.map((k) => String(k)) : [];
}

/**
 * @param {unknown} value
 * @param {string} [pathKey]
 * @param {string[]} [acc]
 */
function collectObjectKeys(value, pathKey = '', acc = []) {
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      value.forEach((item, i) => collectObjectKeys(item, `${pathKey}[${i}]`, acc));
      return acc;
    }
    for (const [key, nested] of Object.entries(value)) {
      acc.push(key);
      collectObjectKeys(nested, key, acc);
    }
  }
  return acc;
}

/**
 * @param {unknown} payload
 * @param {Record<string, unknown>} [config]
 */
export function payloadContainsForbiddenBankEvidence(payload, config = loadBuyingApReadinessConfig()) {
  const forbidden = new Set(listForbiddenBankEvidenceKeys(config).map((k) => k.toLowerCase()));
  const keys = collectObjectKeys(payload);
  return keys.filter((key) => forbidden.has(String(key).toLowerCase()));
}

/**
 * CMP Supplier Onboarding Wizard is tenant-access scaffolding, not ERPNext Supplier.
 *
 * @param {string} surface
 */
export function isErpnextSupplierSurface(surface) {
  const value = asTrimmedString(surface).toLowerCase();
  if (!value) return false;
  if (value.includes('cmp') && value.includes('onboard')) return false;
  if (value.includes('supplier onboarding wizard')) return false;
  return value.includes('erpnext') || value === 'supplier' || value.includes('buying');
}

/**
 * @param {Record<string, unknown>} [config]
 */
export function evaluateBuyingApReadiness(config = loadBuyingApReadinessConfig()) {
  const po = evaluatePurchaseOrderNeed(config);
  const submitGate = evaluatePurchaseInvoiceSubmitGate({});
  const permission = distinguishPermissionFromAccountantBlocker({
    supplierCreateHttp: 403,
    accountantFoundationOpen: true,
  });
  return {
    verdict: CANONICAL_VERDICT,
    current_main_verdict: CURRENT_MAIN_VERDICT,
    purchase_order_verdict: po.verdict,
    payment_segregation_rule: PAYMENT_SEGREGATION_RULE,
    submit_purchase_invoice: submitGate,
    permission_vs_accountant: permission,
    ai_cannot_approve_suppliers: true,
    custom_doctypes: 'none',
  };
}
