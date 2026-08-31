/**
 * ERPNext opening-balance / cutover preparation (#1245).
 *
 * Docs + placeholder validation only. No live ERPNext calls. No posting.
 * No secrets. No real financial amounts.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-opening-balance-cutover.v1.json';

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

export const CANONICAL_VERDICT = 'ERPNext OPENING/CUTOVER PACK READY FOR ACCOUNTANT DECISION';
export const POINTER_SCHEMA = 'corpflow.opening_cutover.erpnext.v1';

const MONEY_LIKE = /^-?[0-9]+([.,][0-9]{1,2})?$/;
const BANKISH = /\b(\d{8,}|IBAN|SWIFT|BIC)\b/i;
const SECRETISH = /sk_live|ERPNEXT_API_SECRET\s*[:=]\s*\S+|POSTGRES_URL\s*[:=]\s*\S+|eyJhbGci/i;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadOpeningCutoverConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetOpeningCutoverConfigCache() {
  cachedConfig = null;
}

function asString(v) {
  return v == null ? '' : String(v).trim();
}

function isPlaceholder(value) {
  const text = asString(value);
  if (!text) return false;
  if (text.startsWith('[') && text.endsWith(']')) return true;
  return /^(SYNTHETIC_|PLACEHOLDER_|EVIDENCE_)/.test(text);
}

/**
 * Reject real-looking money, bank identifiers, and secrets in template fields.
 * @param {unknown} value
 */
export function looksLikeForbiddenFinancialLiteral(value) {
  const text = asString(value);
  if (!text) return false;
  if (isPlaceholder(value)) return false;
  if (MONEY_LIKE.test(text)) return true;
  if (BANKISH.test(text)) return true;
  if (SECRETISH.test(text)) return true;
  return false;
}

export function requiredTemplateInputIds(repoRoot = REPO_ROOT) {
  return loadOpeningCutoverConfig(repoRoot).template_inputs.map((row) => row.id);
}

export function accountantDecisionIds(repoRoot = REPO_ROOT) {
  return [...loadOpeningCutoverConfig(repoRoot).accountant_decisions];
}

export function migrationMethods(repoRoot = REPO_ROOT) {
  const methods = loadOpeningCutoverConfig(repoRoot).migration_methods || {};
  return {
    A: methods.A || null,
    B: methods.B || null,
  };
}

/**
 * This packet must present both methods and must not pick one.
 * @param {string} [repoRoot]
 */
export function assertMethodsUnchosen(repoRoot = REPO_ROOT) {
  const { A, B } = migrationMethods(repoRoot);
  if (!A || !B) {
    return { ok: false, reason: 'both_methods_required' };
  }
  if (A.choose === true || B.choose === true) {
    return { ok: false, reason: 'packet_must_not_choose_method' };
  }
  if (A.id === B.id) {
    return { ok: false, reason: 'methods_must_be_distinct' };
  }
  return { ok: true, reason: 'unchosen_pair_present', methods: { A: A.id, B: B.id } };
}

/**
 * Validate the machine template uses placeholders only.
 * @param {string} [repoRoot]
 */
export function validateOpeningTemplate(repoRoot = REPO_ROOT) {
  const cfg = loadOpeningCutoverConfig(repoRoot);
  const missing = [];
  const forbidden = [];
  for (const row of cfg.template_inputs || []) {
    for (const key of ['id', 'label', 'placeholder', 'owner', 'source_evidence', 'method_a', 'method_b']) {
      if (!asString(row[key])) missing.push(`${row.id || '?'}.${key}`);
    }
    for (const key of ['placeholder', 'source_evidence']) {
      const value = row[key];
      if (looksLikeForbiddenFinancialLiteral(value)) {
        forbidden.push(`${row.id}.${key}`);
      }
    }
    if (row.placeholder && !isPlaceholder(row.placeholder)) {
      forbidden.push(`${row.id}.placeholder_not_token`);
    }
  }
  return {
    ok: missing.length === 0 && forbidden.length === 0,
    missing,
    forbidden,
  };
}

/**
 * Structural debit/credit pairing for placeholder units. No real amounts.
 * @param {string} [repoRoot]
 */
export function evaluateSyntheticReconciliation(repoRoot = REPO_ROOT) {
  const cfg = loadOpeningCutoverConfig(repoRoot);
  const inputIds = new Set(requiredTemplateInputIds(repoRoot));
  const units = cfg.synthetic_reconciliation_pairs || [];
  const seen = new Set();
  const problems = [];
  for (const pair of units) {
    const unit = asString(pair.unit);
    if (!unit.startsWith('SYNTHETIC_UNIT_')) {
      problems.push(`unit_not_synthetic:${unit || 'missing'}`);
    }
    if (seen.has(unit)) problems.push(`duplicate_unit:${unit}`);
    seen.add(unit);
    if (!inputIds.has(pair.debit)) problems.push(`unknown_debit:${pair.debit}`);
    if (!inputIds.has(pair.credit)) problems.push(`unknown_credit:${pair.credit}`);
    if (looksLikeForbiddenFinancialLiteral(pair.note)) {
      problems.push(`literal_in_note:${unit}`);
    }
  }
  const requiredUnits = [
    'SYNTHETIC_UNIT_BANK',
    'SYNTHETIC_UNIT_PRE_REVENUE',
    'SYNTHETIC_UNIT_AR',
    'SYNTHETIC_UNIT_AP',
  ];
  for (const unit of requiredUnits) {
    if (!seen.has(unit)) problems.push(`missing_required_unit:${unit}`);
  }
  return {
    ok: problems.length === 0,
    pair_count: units.length,
    problems,
    balances: problems.length === 0,
  };
}

/**
 * Always refuse posting / import from this packet.
 * @param {string} [action]
 * @param {string} [repoRoot]
 */
export function refusePosting(action, repoRoot = REPO_ROOT) {
  const forbidden = new Set(loadOpeningCutoverConfig(repoRoot).forbidden_actions || []);
  const name = asString(action) || 'unspecified';
  return {
    allowed: false,
    action: name,
    reason: forbidden.has(name) ? 'protected_cutover_action' : 'opening_packet_is_prepare_only',
    next: 'Wait for accountant decisions on #1055/#1245, then a separate Anton-approved posting packet.',
  };
}

export function dryRunRollbackGates() {
  return {
    before_anton_approves_posting: [
      'accountant_signed_coa',
      'accountant_signed_cutover_date',
      'accountant_signed_method_a_or_b',
      'accountant_signed_opening_totals',
      'funding_classification_recorded',
      'redacted_source_pack_attached',
      'draft_trial_balance_matches_source_totals',
      'temporary_opening_nets_to_zero_in_draft',
      'vendor_backup_or_named_restore_point',
    ],
    dry_run: [
      'create_drafts_only',
      'do_not_submit',
      'do_not_import_real_rows',
      'compare_draft_tb_to_placeholders_replaced_offline',
    ],
    rollback: [
      'cancel_submitted_vouchers_if_any',
      'do_not_delete_audit_trail',
      'restore_named_backup_if_submit_corrupted_books',
      'reopen_#1245_correction_packet',
    ],
  };
}

export function evaluatePackReadiness(repoRoot = REPO_ROOT) {
  const cfg = loadOpeningCutoverConfig(repoRoot);
  const template = validateOpeningTemplate(repoRoot);
  const methods = assertMethodsUnchosen(repoRoot);
  const recon = evaluateSyntheticReconciliation(repoRoot);
  const posting = refusePosting('create_journal_entry', repoRoot);
  const ok =
    cfg.verdict === CANONICAL_VERDICT &&
    cfg.no_posting === true &&
    cfg.does_not_choose_migration_method === true &&
    template.ok &&
    methods.ok &&
    recon.ok &&
    posting.allowed === false;
  return {
    ok,
    verdict: ok ? CANONICAL_VERDICT : 'NOT READY — opening pack invariants failed',
    template,
    methods,
    recon,
    posting_forbidden: posting.allowed === false,
  };
}
