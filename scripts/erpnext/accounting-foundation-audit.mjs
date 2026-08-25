#!/usr/bin/env node
/**
 * Read-only ERPNext Company & Accounting Foundation audit (#1055).
 *
 * GET-only. Never prints secret values, ERPNEXT_BASE_URL, hostnames,
 * bank account numbers, IBANs, SWIFT codes, or tokens.
 * Does not create, update, submit, delete, or configure accounts.
 *
 * Usage:
 *   node scripts/erpnext/accounting-foundation-audit.mjs
 *
 * Exit codes:
 *   0 = probe completed (auth PASS) and snapshot written
 *   1 = secrets missing or authentication failed
 *   2 = unexpected script error
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { frappeClientFromEnv } from '../../lib/erpnext/frappe-rest-client.js';
import {
  classifyChartOfAccounts,
  evaluateAccountingFoundationReadiness,
  markOnboardingSteps,
  redactEvidenceText,
  sanitizeAccountingSnapshot,
} from '../../lib/erpnext/accounting-foundation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(REPO_ROOT, 'artifacts', 'erpnext', 'accounting-foundation-1055');

function present(name) {
  return process.env[name] ? 'present' : 'absent';
}

function log(line) {
  process.stdout.write(`${line}\n`);
}

function pick(row, keys) {
  if (!row || typeof row !== 'object') return null;
  const out = {};
  for (const key of keys) {
    if (row[key] !== undefined) out[key] = row[key];
  }
  return out;
}

const COMPANY_SAFE_KEYS = [
  'name',
  'company_name',
  'abbr',
  'country',
  'default_currency',
  'tax_id',
  'registration_details',
  'email',
  'phone_no',
  'website',
  'date_of_establishment',
  'date_of_incorporation',
  'default_letter_head',
  'default_holiday_list',
  'cost_center',
  'default_finance_book',
  'default_receivable_account',
  'default_payable_account',
  'default_income_account',
  'default_expense_account',
  'default_cash_account',
  'default_bank_account',
  'round_off_account',
  'write_off_account',
  'accumulated_depreciation_account',
  'depreciation_expense_account',
  'default_payroll_payable_account',
  'exchange_gain_loss_account',
  'unrealized_exchange_gain_loss_account',
];

const ACCOUNT_FIELDS = [
  'name',
  'account_name',
  'parent_account',
  'root_type',
  'account_type',
  'is_group',
  'disabled',
  'company',
  'account_currency',
];

async function methodGet(clientBase, pathSuffix) {
  const baseUrl = String(process.env.ERPNEXT_BASE_URL || '').replace(/\/+$/, '');
  const apiKey = String(process.env.ERPNEXT_API_KEY || '');
  const apiSecret = String(process.env.ERPNEXT_API_SECRET || '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${baseUrl}${pathSuffix}`, {
      method: 'GET',
      headers: {
        Authorization: `token ${apiKey}:${apiSecret}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
    return { http: res.status, ok: res.status >= 200 && res.status < 300, data };
  } catch (err) {
    const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : 'Error';
    return { http: 0, ok: false, data: {}, error: name === 'AbortError' ? 'TIMEOUT' : redactEvidenceText(name) };
  } finally {
    clearTimeout(timer);
  }
}

function summarizeVersions(data) {
  const msg = data && typeof data === 'object' ? data.message || {} : {};
  const parts = [];
  for (const app of ['frappe', 'erpnext']) {
    const info = msg[app] && typeof msg[app] === 'object' ? msg[app] : {};
    const ver = info.version || info.branch || '';
    if (ver) parts.push(`${app}=${ver}`);
  }
  return parts.join(', ') || 'unread';
}

async function main() {
  log('ERPNext accounting-foundation audit (read-only) #1055');
  log('mutation: forbidden (GET-only)');
  log('account_create_or_rename: forbidden');
  log('tax_or_bank_configuration: forbidden');
  log('opening_balance_posting: forbidden');
  log('ERPNEXT_BASE_URL: ' + present('ERPNEXT_BASE_URL'));
  log('ERPNEXT_API_KEY: ' + present('ERPNEXT_API_KEY'));
  log('ERPNEXT_API_SECRET: ' + present('ERPNEXT_API_SECRET'));
  log('MASTER_ADMIN_KEY: ' + present('MASTER_ADMIN_KEY') + ' (must stay unused)');
  log('ERPNEXT_BASE_URL_value: not_printed');
  log('auth_uses_master_admin_key: no');
  log('runtime_bridge_ssh: no');
  log('runtime_bridge_infisical: no');

  const missing = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].filter(
    (name) => !process.env[name],
  );
  if (missing.length) {
    log('ERPNext access: FAIL');
    log('exact_blocker: missing injected secrets: ' + missing.join(' '));
    process.exit(1);
  }

  const client = frappeClientFromEnv();
  const auth = await client.getLoggedUser();
  if (!auth.ok) {
    log('ERPNext access: FAIL');
    log('http_auth_status: ' + auth.http);
    log('exact_blocker: authentication failed');
    process.exit(1);
  }
  log('authenticated_user: ' + (auth.user || 'empty'));
  log('http_auth_status: ' + auth.http);

  const versions = await methodGet(client, '/api/method/frappe.utils.change_log.get_versions');
  log('versions_http: ' + versions.http);
  log('site_version_metadata: ' + summarizeVersions(versions.data));

  const companyList = await client.list('Company', {
    fields: ['name', 'abbr', 'country', 'default_currency'],
    limit: 20,
  });
  log('doctype Company: HTTP ' + companyList.http + ' rows=' + companyList.rows.length);

  const companies = [];
  for (const row of companyList.rows) {
    const detail = await client.get('Company', row.name);
    log('company_doc ' + String(row.name).replace(/\s+/g, '_') + ': HTTP ' + detail.http);
    if (detail.row) companies.push(pick(detail.row, COMPANY_SAFE_KEYS));
  }

  const accountList = await client.list('Account', {
    fields: ACCOUNT_FIELDS,
    limit: 500,
  });
  log('doctype Account: HTTP ' + accountList.http + ' rows=' + accountList.rows.length);
  const classified = classifyChartOfAccounts(accountList.rows);
  log('coa_total: ' + classified.total);
  log('coa_root_groups: ' + classified.root_group_count);
  log('coa_groups: ' + classified.group_count);
  log('coa_child_accounts: ' + classified.child_account_count);
  log('coa_skeleton_only: ' + (classified.skeleton_only ? 'yes' : 'no'));

  const fiscal = await client.list('Fiscal Year', {
    fields: ['name', 'year_start_date', 'year_end_date', 'disabled'],
    limit: 20,
  });
  log('doctype Fiscal Year: HTTP ' + fiscal.http + ' rows=' + fiscal.rows.length);

  const costCenters = await client.list('Cost Center', {
    fields: ['name', 'cost_center_name', 'parent_cost_center', 'is_group', 'company', 'disabled'],
    limit: 100,
  });
  log('doctype Cost Center: HTTP ' + costCenters.http + ' rows=' + costCenters.rows.length);

  const letterHeads = await client.list('Letter Head', {
    fields: ['name', 'is_default', 'disabled'],
    limit: 20,
  });
  log('doctype Letter Head: HTTP ' + letterHeads.http + ' rows=' + letterHeads.rows.length);

  const addresses = await client.list('Address', {
    fields: ['name', 'address_title', 'address_type', 'city', 'country', 'pincode'],
    filters: [['Address', 'is_your_company_address', '=', 1]],
    limit: 20,
  });
  log('doctype Address company: HTTP ' + addresses.http + ' rows=' + addresses.rows.length);

  const salesTax = await client.list('Sales Taxes and Charges Template', {
    fields: ['name', 'title', 'is_default', 'disabled', 'company'],
    limit: 50,
  });
  log('doctype Sales Taxes and Charges Template: HTTP ' + salesTax.http + ' rows=' + salesTax.rows.length);

  const purchaseTax = await client.list('Purchase Taxes and Charges Template', {
    fields: ['name', 'title', 'is_default', 'disabled', 'company'],
    limit: 50,
  });
  log('doctype Purchase Taxes and Charges Template: HTTP ' + purchaseTax.http + ' rows=' + purchaseTax.rows.length);

  const taxCategory = await client.list('Tax Category', {
    fields: ['name', 'disabled'],
    limit: 20,
  });
  log('doctype Tax Category: HTTP ' + taxCategory.http + ' rows=' + taxCategory.rows.length);

  const bankAccounts = await client.list('Bank Account', {
    fields: ['name', 'account_name', 'bank', 'account_type', 'is_company_account', 'company', 'disabled'],
    limit: 20,
  });
  log('doctype Bank Account: HTTP ' + bankAccounts.http + ' rows=' + bankAccounts.rows.length);

  const accountsSettings = await client.list('Accounts Settings', {
    fields: ['name'],
    limit: 1,
  });
  log('doctype Accounts Settings: HTTP ' + accountsSettings.http);

  const onboardingMods = await client.list('Module Onboarding', {
    fields: ['name', 'title', 'module', 'is_complete'],
    limit: 50,
  });
  log('doctype Module Onboarding: HTTP ' + onboardingMods.http + ' rows=' + onboardingMods.rows.length);

  const accountOnboarding =
    onboardingMods.rows.find((row) => /account/i.test(String(row.name || '')) || /account/i.test(String(row.module || ''))) ||
    null;
  let onboardingDetail = null;
  if (accountOnboarding) {
    const detail = await client.get('Module Onboarding', accountOnboarding.name);
    log('module_onboarding_doc: HTTP ' + detail.http + ' name=' + String(accountOnboarding.name));
    onboardingDetail = detail.row
      ? {
          name: detail.row.name,
          title: detail.row.title,
          module: detail.row.module,
          is_complete: detail.row.is_complete,
          steps: Array.isArray(detail.row.steps)
            ? detail.row.steps.map((step) => ({
                idx: step.idx,
                step: step.step,
              }))
            : [],
        }
      : null;
  } else {
    log('module_onboarding_doc: not_found_in_list');
  }

  const onboardingSteps = await client.list('Onboarding Step', {
    fields: ['name', 'title', 'reference_document', 'is_complete', 'intro_video_url'],
    limit: 100,
  });
  log('doctype Onboarding Step: HTTP ' + onboardingSteps.http + ' rows=' + onboardingSteps.rows.length);

  const naming = await client.list('Document Naming Settings', {
    fields: ['name'],
    limit: 5,
  });
  log('doctype Document Naming Settings: HTTP ' + naming.http + ' rows=' + naming.rows.length);

  const customers = await client.list('Customer', {
    fields: ['name'],
    limit: 5,
  });
  log('doctype Customer: HTTP ' + customers.http + ' rows=' + customers.rows.length);

  const items = await client.list('Item', {
    fields: ['name'],
    limit: 5,
  });
  log('doctype Item: HTTP ' + items.http + ' rows=' + items.rows.length);

  const journal = await client.list('Journal Entry', {
    fields: ['name', 'voucher_type', 'docstatus'],
    filters: [['Journal Entry', 'voucher_type', 'in', ['Opening Entry', 'Opening Invoice']]],
    limit: 5,
  });
  log('doctype Journal Entry opening: HTTP ' + journal.http + ' rows=' + journal.rows.length);

  const company = companies[0] || null;
  const marked = markOnboardingSteps({
    companyPresent: Boolean(company && company.name),
    childAccountCount: classified.child_account_count,
    taxTemplateCount: salesTax.rows.length + purchaseTax.rows.length,
    openingBalancePresent: journal.rows.length > 0,
    itemPresent: items.rows.length > 0,
    customerPresent: customers.rows.length > 0,
  });
  for (const step of marked) {
    log('onboarding_step ' + step.id + ': ' + step.mark);
  }

  const readiness = evaluateAccountingFoundationReadiness({
    company,
    accounts: classified.accounts,
    fiscal_years: fiscal.rows,
    onboarding: onboardingMods.rows,
    probe_ok: true,
  });
  log('audit_verdict: ' + readiness.verdict);
  log('protected_phase_2: blocked_until_accountant_and_anton');

  const snapshot = sanitizeAccountingSnapshot({
    schema: 'corpflow.erpnext.accounting_foundation_snapshot.v1',
    issue: 1055,
    generated_at_utc: new Date().toISOString(),
    mutation: 'none',
    identity: auth.user || '',
    versions: summarizeVersions(versions.data),
    company,
    companies,
    chart_of_accounts: {
      total: classified.total,
      root_group_count: classified.root_group_count,
      group_count: classified.group_count,
      child_account_count: classified.child_account_count,
      skeleton_only: classified.skeleton_only,
      usable_operating_coa: classified.usable_operating_coa,
      accounts: classified.accounts,
    },
    fiscal_years: fiscal.rows,
    cost_centers: costCenters.rows,
    letter_heads: letterHeads.rows,
    company_addresses: addresses.rows.map((row) =>
      pick(row, ['name', 'address_title', 'address_type', 'city', 'country', 'pincode']),
    ),
    sales_tax_templates: salesTax.rows,
    purchase_tax_templates: purchaseTax.rows,
    tax_categories: taxCategory.rows,
    bank_accounts_safe: bankAccounts.rows,
    module_onboarding: onboardingMods.rows,
    accounts_module_onboarding: onboardingDetail,
    onboarding_steps_raw: onboardingSteps.rows.map((row) =>
      pick(row, ['name', 'title', 'reference_document', 'is_complete']),
    ),
    onboarding_marks: marked,
    naming_settings_readable: naming.ok,
    customer_count_sample: customers.rows.length,
    item_count_sample: items.rows.length,
    opening_journal_sample: journal.rows,
    verdict: readiness.verdict,
    blockers: readiness.blockers,
  });

  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(path.join(ARTIFACT_DIR, 'coa-skeleton.json'), JSON.stringify(snapshot, null, 2) + '\n');
  log('snapshot_path: artifacts/erpnext/accounting-foundation-1055/coa-skeleton.json');
  log('secret_values_printed: no');
  log('ERPNext access: PASS');
}

main().catch((err) => {
  log('ERPNext access: FAIL');
  log('exact_blocker: ' + redactEvidenceText(err && err.message ? err.message : err));
  process.exit(2);
});
