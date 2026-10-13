/**
 * Repository-only package validation for #1435 Print Format sources.
 * It deliberately has no ERPNext client and cannot apply a live Print Format.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONFIG_PATH = 'config/erpnext-commercial-print-formats.v1.json';
const REQUIRED_BANK_MAP_KEYS = ['company', 'currency', 'is_verified', 'bank_account_no', 'account_holder', 'iban', 'swift'];
const FORBIDDEN_BANK_MAP_SOURCES = ['email', 'phone', 'company_email', 'address', 'contact', 'free_text'];

export function loadCommercialPrintFormatPackage(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_PATH), 'utf8'));
}

export function validateCommercialPrintFormatPackage(
  formatPackage = loadCommercialPrintFormatPackage(),
  repoRoot = REPO_ROOT,
) {
  const errors = [];
  const names = new Set();

  for (const format of formatPackage.formats || []) {
    if (!format.name || names.has(format.name)) errors.push(`DUPLICATE_OR_MISSING_NAME:${format.name || 'UNKNOWN'}`);
    names.add(format.name);
    if (!['DOMESTIC', 'INTERNATIONAL'].includes(format.family)) errors.push(`INVALID_FAMILY:${format.name}`);
    if (!['Quotation', 'Sales Order', 'Payment Request', 'Sales Invoice'].includes(format.doctype)) {
      errors.push(`INVALID_DOCTYPE:${format.name}`);
    }
    if (!format.template || !existsSync(path.join(repoRoot, format.template))) {
      errors.push(`MISSING_TEMPLATE:${format.name}`);
    }
  }

  if (names.size !== 8) errors.push(`EXPECTED_EIGHT_FORMATS_GOT:${names.size}`);
  return { ok: errors.length === 0, errors };
}

export function readCommercialPrintFormatSources(
  formatPackage = loadCommercialPrintFormatPackage(),
  repoRoot = REPO_ROOT,
) {
  return formatPackage.formats.map((format) => ({
    ...format,
    source: readFileSync(path.join(repoRoot, format.template), 'utf8'),
  }));
}

/**
 * Validates an operator-supplied mapping before a guarded live apply step.
 * It validates only mapping shape; it never reads ERPNext or accepts values.
 */
export function validateOperatorBankFieldMap(fieldMap = {}) {
  const errors = [];
  for (const key of REQUIRED_BANK_MAP_KEYS) {
    const source = String(fieldMap[key] || '').trim();
    if (!source) {
      errors.push(`MISSING_MAP:${key}`);
      continue;
    }
    if (FORBIDDEN_BANK_MAP_SOURCES.includes(source.toLowerCase())) {
      errors.push(`FORBIDDEN_MAP_SOURCE:${key}`);
    }
  }
  if (String(fieldMap.is_verified || '').trim() !== 'is_verified') {
    errors.push('VERIFICATION_SEMANTIC_MUST_MAP_TO_IS_VERIFIED');
  }
  return { ok: errors.length === 0, errors };
}
