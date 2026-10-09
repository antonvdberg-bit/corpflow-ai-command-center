/**
 * Deterministic Domestic/International commercial-document controls for #1435.
 * Pure helpers only: no ERPNext calls, secrets, bank values, payments, or sends.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONFIG_PATH = 'config/erpnext-commercial-document-families.v1.json';

function text(value) {
  return value == null ? '' : String(value).trim();
}

export function loadCommercialDocumentFamilies(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_PATH), 'utf8'));
}

export function selectCommercialDocumentFamily(transaction = {}, config = loadCommercialDocumentFamilies()) {
  const domestic = config.families.DOMESTIC.condition;
  const isDomestic =
    text(transaction.company) === domestic.company &&
    text(transaction.currency).toUpperCase() === domestic.currency &&
    text(transaction.billing_country).toLowerCase() === domestic.billing_country.toLowerCase();
  return isDomestic ? 'DOMESTIC' : 'INTERNATIONAL';
}

export function selectVerifiedBankAccount(transaction = {}, bankAccounts = []) {
  const currency = text(transaction.currency).toUpperCase();
  const candidates = bankAccounts.filter(
    (account) =>
      text(account.company) === 'CorpFlowAI LTD' &&
      text(account.currency).toUpperCase() === currency &&
      account.is_verified === true &&
      text(account.bank_account_no),
  );
  if (candidates.length !== 1) {
    return {
      ok: false,
      code: 'FAIL_CLOSED_OPERATOR_REVIEW',
      reason: candidates.length === 0 ? 'MISSING_VERIFIED_CURRENCY_ACCOUNT' : 'AMBIGUOUS_VERIFIED_CURRENCY_ACCOUNT',
    };
  }
  return { ok: true, account: candidates[0] };
}

export function validateBankFieldSources(fields = {}) {
  const forbidden = ['email', 'phone', 'company_email', 'address', 'contact', 'free_text'];
  const violations = Object.entries(fields)
    .filter(([field]) => ['bank_name', 'account_holder', 'account_name', 'bank_account_no', 'iban', 'swift'].includes(field))
    .filter(([, source]) => forbidden.includes(text(source).toLowerCase()) || text(source).toLowerCase().includes('iban_fallback'))
    .map(([field]) => field);
  return { ok: violations.length === 0, violations };
}
