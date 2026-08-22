/**
 * ERPNext-first source-of-truth matrix (#918).
 *
 * Mapping + classification rules only. No live ERPNext calls.
 * No secrets. No payments. No automated sync.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-source-of-truth-matrix.v1.json';

export const CLASSIFICATIONS = Object.freeze([
  'erpnext_authoritative',
  'corpflow_execution_erpnext_outcome',
  'corpflow_authoritative',
  'duplicate_retire',
  'needs_bridge',
]);

export const NEEDS_BRIDGE_FIELDS = Object.freeze([
  'corpflow_key',
  'erpnext_doctype',
  'erpnext_key',
  'direction',
  'idempotency',
  'conflict_rule',
  'retry_failure',
  'audit_evidence',
]);

export const CANONICAL_VERDICT = 'ERPNext-FIRST RECONCILIATION READY FOR IMPLEMENTATION';

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadSourceOfTruthMatrix(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetSourceOfTruthMatrixCache() {
  cachedConfig = null;
}

function asString(v) {
  return v == null ? '' : String(v).trim();
}

export function listMatrixRows(repoRoot = REPO_ROOT) {
  const cfg = loadSourceOfTruthMatrix(repoRoot);
  return Array.isArray(cfg.rows) ? cfg.rows : [];
}

export function listNeedsBridgeRows(repoRoot = REPO_ROOT) {
  return listMatrixRows(repoRoot).filter((row) => row.classification === 'needs_bridge');
}

export function firstBridgeCandidate(repoRoot = REPO_ROOT) {
  const cfg = loadSourceOfTruthMatrix(repoRoot);
  const id = asString(cfg.first_bridge_candidate_id);
  return listNeedsBridgeRows(repoRoot).find((row) => asString(row.id) === id) || null;
}

export function listDuplicateStopExpanding(repoRoot = REPO_ROOT) {
  const cfg = loadSourceOfTruthMatrix(repoRoot);
  return Array.isArray(cfg.duplicate_stop_expanding) ? cfg.duplicate_stop_expanding : [];
}

export function listImplementationSequence(repoRoot = REPO_ROOT) {
  const cfg = loadSourceOfTruthMatrix(repoRoot);
  return Array.isArray(cfg.implementation_sequence) ? cfg.implementation_sequence : [];
}

/**
 * Mapping-only completeness check. Repo config never authorizes live writes.
 *
 * @param {string} [repoRoot]
 */
export function validateSourceOfTruthMatrix(repoRoot = REPO_ROOT) {
  const cfg = loadSourceOfTruthMatrix(repoRoot);
  const blockers = [];

  if (asString(cfg.schema) !== 'corpflow.erpnext.source_of_truth_matrix.v1') {
    blockers.push('SCHEMA_MISMATCH');
  }
  if (asString(cfg.verdict) !== CANONICAL_VERDICT) {
    blockers.push('VERDICT_MISMATCH');
  }
  if (cfg.no_automated_sync_authorized !== true) {
    blockers.push('AUTOMATED_SYNC_NOT_DENIED');
  }
  if (cfg.no_postgres_migration !== true) {
    blockers.push('POSTGRES_MIGRATION_NOT_DENIED');
  }
  if (cfg.no_custom_doctypes !== true) {
    blockers.push('CUSTOM_DOCTYPES_NOT_DENIED');
  }
  if (cfg.no_second_database !== true) {
    blockers.push('SECOND_DATABASE_NOT_DENIED');
  }
  if (Number(cfg.issue) !== 918) {
    blockers.push('SOURCE_ISSUE_MISMATCH');
  }

  const rows = listMatrixRows(repoRoot);
  if (rows.length < 8) blockers.push('MATRIX_TOO_SMALL');

  const seen = new Set();
  const usedClassifications = new Set();
  for (const row of rows) {
    const id = asString(row.id);
    if (!id) blockers.push('ROW_MISSING_ID');
    else if (seen.has(id)) blockers.push(`DUPLICATE_ROW:${id}`);
    else seen.add(id);

    const classification = asString(row.classification);
    usedClassifications.add(classification);
    if (!CLASSIFICATIONS.includes(classification)) {
      blockers.push(`UNKNOWN_CLASSIFICATION:${id || '?'}`);
    }
    if (!asString(row.domain)) blockers.push(`ROW_MISSING_DOMAIN:${id || '?'}`);

    if (classification === 'needs_bridge') {
      for (const field of NEEDS_BRIDGE_FIELDS) {
        if (!asString(row[field])) blockers.push(`BRIDGE_MISSING_${field.toUpperCase()}:${id || '?'}`);
      }
    }
  }

  for (const required of CLASSIFICATIONS) {
    if (!usedClassifications.has(required)) {
      blockers.push(`CLASSIFICATION_UNUSED:${required}`);
    }
  }

  const first = firstBridgeCandidate(repoRoot);
  if (!first) blockers.push('FIRST_BRIDGE_CANDIDATE_MISSING');
  else if (asString(first.id) !== 'qualified_customer_identity') {
    blockers.push('FIRST_BRIDGE_CANDIDATE_NOT_CUSTOMER_IDENTITY');
  }

  const sequence = listImplementationSequence(repoRoot);
  if (!sequence.length || asString(sequence[0]?.id) !== 'this_matrix') {
    blockers.push('SEQUENCE_MUST_START_WITH_MATRIX');
  }
  if (!sequence.some((step) => asString(step.id) === 'qualified_customer_identity')) {
    blockers.push('SEQUENCE_MISSING_FIRST_BRIDGE');
  }

  const unique = [...new Set(blockers)];
  return {
    ok: unique.length === 0,
    blockers: unique,
    automated_write_authorized: false,
  };
}
