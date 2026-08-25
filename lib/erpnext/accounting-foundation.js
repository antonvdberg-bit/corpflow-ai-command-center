/**
 * ERPNext Company & Accounting Foundation audit (#1055).
 *
 * Classification + snapshot sanitization only. The live probe uses GET.
 * This module never mutates ERPNext, never invents a Chart of Accounts,
 * and never stores bank credentials or secret values.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-accounting-foundation.v1.json';

export const CANONICAL_VERDICT = 'ACCOUNTING FOUNDATION READY FOR ACCOUNTANT REVIEW';
export const NOT_READY_PREFIX = 'NOT READY —';

export const ONBOARDING_MARKS = Object.freeze([
  'DONE',
  'NOT DONE',
  'REQUIRES ACCOUNTANT',
  'REQUIRES ANTON',
]);

export const FORBIDDEN_SNAPSHOT_KEYS = Object.freeze([
  'bank_account_no',
  'iban',
  'swift_number',
  'swift_code',
  'branch_code',
  'account_number',
  'password',
  'api_key',
  'api_secret',
  'secret',
]);

const SECRETISH =
  /token\s+[A-Za-z0-9_\-:]{8,}|ERPNEXT_API_(?:KEY|SECRET)\s*[:=]\s*\S+|POSTGRES_URL\s*[:=]\s*\S+|eyJhbGci[A-Za-z0-9._\-]+/gi;

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadAccountingFoundationConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetAccountingFoundationConfigCache() {
  cachedConfig = null;
}

function asString(v) {
  return v == null ? '' : String(v).trim();
}

function asBool(v) {
  return v === true || v === 1 || v === '1';
}

export function redactEvidenceText(value, max = 240) {
  let text = value == null ? '' : String(value);
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(SECRETISH, '[redacted]');
  text = text.replace(/https?:\/\/[^\s"'\\]+/gi, '[url]');
  return text.slice(0, max);
}

export function listOnboardingSteps(repoRoot = REPO_ROOT) {
  const cfg = loadAccountingFoundationConfig(repoRoot);
  return Array.isArray(cfg.onboarding_steps) ? cfg.onboarding_steps : [];
}

export function listAccountantDecisions(repoRoot = REPO_ROOT) {
  const cfg = loadAccountingFoundationConfig(repoRoot);
  return Array.isArray(cfg.accountant_decisions) ? cfg.accountant_decisions : [];
}

export function listErpnextMappings(repoRoot = REPO_ROOT) {
  const cfg = loadAccountingFoundationConfig(repoRoot);
  return Array.isArray(cfg.erpnext_mappings) ? cfg.erpnext_mappings : [];
}

/**
 * Classify Chart of Accounts rows without inventing accounts.
 *
 * @param {Array<Record<string, unknown>>} accounts
 */
export function classifyChartOfAccounts(accounts) {
  const rows = Array.isArray(accounts) ? accounts : [];
  const safe = rows.map((row) => ({
    name: asString(row.name),
    account_name: asString(row.account_name || row.name),
    parent_account: asString(row.parent_account),
    root_type: asString(row.root_type),
    account_type: asString(row.account_type),
    is_group: asBool(row.is_group) ? 1 : 0,
    disabled: asBool(row.disabled) ? 1 : 0,
    company: asString(row.company),
    account_currency: asString(row.account_currency),
  }));
  const roots = safe.filter((row) => row.is_group === 1 && !row.parent_account);
  const groups = safe.filter((row) => row.is_group === 1);
  const children = safe.filter((row) => row.is_group === 0);
  return {
    total: safe.length,
    root_group_count: roots.length,
    group_count: groups.length,
    child_account_count: children.length,
    skeleton_only: safe.length > 0 && children.length === 0,
    usable_operating_coa: children.length > 0,
    accounts: safe,
    root_groups: roots,
    child_accounts: children,
  };
}

/**
 * Drop bank credentials and secret-like keys from a snapshot object.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
export function sanitizeAccountingSnapshot(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAccountingSnapshot(item));
  }
  if (!value || typeof value !== 'object') return value;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_SNAPSHOT_KEYS.includes(lower)) {
      out[key] = raw == null || raw === '' ? null : '[redacted-present]';
      continue;
    }
    if (typeof raw === 'string' && SECRETISH.test(raw)) {
      SECRETISH.lastIndex = 0;
      out[key] = redactEvidenceText(raw);
      continue;
    }
    SECRETISH.lastIndex = 0;
    out[key] = sanitizeAccountingSnapshot(raw);
  }
  return out;
}

/**
 * @param {{
 *   company?: Record<string, unknown> | null,
 *   accounts?: Array<Record<string, unknown>>,
 *   fiscal_years?: Array<Record<string, unknown>>,
 *   onboarding?: Array<Record<string, unknown>>,
 *   probe_ok?: boolean,
 * }} evidence
 * @param {string} [repoRoot]
 */
export function evaluateAccountingFoundationReadiness(evidence, repoRoot = REPO_ROOT) {
  const cfg = loadAccountingFoundationConfig(repoRoot);
  const blockers = [];
  if (asString(cfg.schema) !== 'corpflow.erpnext.accounting_foundation.v1') {
    blockers.push('SCHEMA_MISMATCH');
  }
  if (cfg.no_coa_invention !== true) {
    blockers.push('COA_INVENTION_NOT_DENIED');
  }
  if (cfg.phase_2_protected !== true) {
    blockers.push('PHASE_2_NOT_GATED');
  }
  if (evidence.probe_ok === false) {
    blockers.push('LIVE_PROBE_FAILED');
  }
  const companyName = asString(evidence.company && (evidence.company.name || evidence.company.company_name));
  if (!companyName) {
    blockers.push('COMPANY_UNREAD');
  }
  const classified = classifyChartOfAccounts(evidence.accounts || []);
  if (classified.total === 0) {
    blockers.push('COA_UNREAD');
  }
  const steps = listOnboardingSteps(repoRoot);
  if (steps.length !== 6) {
    blockers.push('ONBOARDING_STEP_COUNT');
  }
  const decisions = listAccountantDecisions(repoRoot);
  if (decisions.length < 8) {
    blockers.push('ACCOUNTANT_DECISIONS_INCOMPLETE');
  }
  const mappings = listErpnextMappings(repoRoot);
  if (mappings.length < 8) {
    blockers.push('ERPNEXT_MAPPING_INCOMPLETE');
  }

  const ready = blockers.length === 0;
  return {
    ready,
    verdict: ready ? CANONICAL_VERDICT : `${NOT_READY_PREFIX} ${blockers[0]}`,
    blockers,
    company_name: companyName,
    chart: {
      total: classified.total,
      root_group_count: classified.root_group_count,
      child_account_count: classified.child_account_count,
      skeleton_only: classified.skeleton_only,
      usable_operating_coa: classified.usable_operating_coa,
    },
    fiscal_year_count: Array.isArray(evidence.fiscal_years) ? evidence.fiscal_years.length : 0,
    onboarding_row_count: Array.isArray(evidence.onboarding) ? evidence.onboarding.length : 0,
  };
}

/**
 * Default Accounting Onboarding marks from live presence, not claimed books.
 *
 * @param {{
 *   companyPresent?: boolean,
 *   childAccountCount?: number,
 *   taxTemplateCount?: number,
 *   openingBalancePresent?: boolean,
 *   itemPresent?: boolean,
 *   customerPresent?: boolean,
 * }} observed
 */
export function markOnboardingSteps(observed, repoRoot = REPO_ROOT) {
  const childAccountCount = Number(observed.childAccountCount) || 0;
  const taxTemplateCount = Number(observed.taxTemplateCount) || 0;
  return listOnboardingSteps(repoRoot).map((step) => {
    const id = asString(step.id);
    let mark = 'NOT DONE';
    let note = asString(step.default_note);
    if (id === 'chart_of_accounts') {
      mark = childAccountCount > 0 ? 'REQUIRES ACCOUNTANT' : 'NOT DONE';
      note =
        childAccountCount > 0
          ? 'Leaf accounts exist from the hosted-test standard template. Not an accountant-approved Mauritius CoA.'
          : 'Only root groups / unread. Do not invent accounts.';
    } else if (id === 'setup_sales_taxes') {
      mark = 'REQUIRES ACCOUNTANT';
      note =
        taxTemplateCount > 0
          ? 'A tax template exists and is not the Company default. Accountant must confirm VAT posture before use.'
          : 'No tax template readable. Accountant must define VAT/tax treatment.';
    } else if (id === 'create_sales_invoice') {
      mark = 'NOT DONE';
      note =
        'Accounting Onboarding step is incomplete. Draft synthetic invoices from prior packets are not a submitted tax invoice.';
    } else if (id === 'create_payment_entry') {
      mark = 'REQUIRES ANTON';
      note = 'Wizard incomplete. Live Payment Entry posting is a protected consequence.';
    } else if (id === 'view_balance_sheet') {
      mark = observed.openingBalancePresent ? 'REQUIRES ANTON' : 'REQUIRES ACCOUNTANT';
      note = observed.openingBalancePresent
        ? 'Opening-style journals exist; posting/cutover still needs Anton approval.'
        : 'No opening Journal Entry. Accountant sets cutover date and opening balances first.';
    } else if (id === 'review_accounts_settings') {
      mark = 'REQUIRES ANTON';
    }
    return {
      id,
      label: asString(step.label),
      erpnext_object: asString(step.erpnext_object),
      mark,
      note,
    };
  });
}
