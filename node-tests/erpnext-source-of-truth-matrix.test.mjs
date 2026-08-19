/**
 * Deterministic #918 ERPNext-first source-of-truth matrix invariants.
 * Docs/config only. Does not call ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_VERDICT,
  CLASSIFICATIONS,
  NEEDS_BRIDGE_FIELDS,
  firstBridgeCandidate,
  listDuplicateStopExpanding,
  listImplementationSequence,
  listMatrixRows,
  listNeedsBridgeRows,
  loadSourceOfTruthMatrix,
  resetSourceOfTruthMatrixCache,
  validateSourceOfTruthMatrix,
} from '../lib/erpnext/source-of-truth-matrix.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DOC_REL = 'docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md';
const CONFIG_REL = 'config/erpnext-source-of-truth-matrix.v1.json';
const SECRETISH = /sk_live|POSTGRES_URL\s*[:=]\s*\S+|ERPNEXT_API_SECRET\s*[:=]\s*\S+|eyJhbGci/;

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('#918 matrix doc exists with sentinel, verdict, and no secret values', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, DOC_REL)), true);
  const doc = read(DOC_REL);
  assert.ok(doc.includes('<!-- CORPFLOWAI_ERP_SOURCE_OF_TRUTH_MATRIX_V1 -->'));
  assert.ok(doc.includes('#918'));
  assert.ok(doc.includes('#967'));
  assert.ok(doc.includes('#880'));
  assert.ok(doc.includes('#881'));
  assert.ok(doc.includes('#882'));
  assert.ok(doc.includes('#920'));
  assert.ok(doc.includes('#701'));
  assert.ok(doc.includes('NO IMPLEMENTATION AUTHORIZED'));
  assert.ok(doc.includes(CANONICAL_VERDICT));
  assert.ok(doc.includes('qualified_customer_identity'));
  assert.ok(doc.includes('ANTON ACTION: NONE'));
  assert.ok(doc.includes('must not be blocked'));
  assert.ok(doc.includes('ERPNext authoritative'));
  assert.ok(doc.includes('CorpFlowAI execution + ERPNext authoritative outcome'));
  assert.ok(doc.includes('CorpFlowAI authoritative'));
  assert.ok(doc.includes('Duplicate/retire') || doc.includes('duplicate/retire'));
  assert.ok(doc.includes('Needs bridge') || doc.includes('needs bridge'));
  assert.ok(doc.includes('Operating model version: 2026-08-13-v1'));
  assert.doesNotMatch(doc, SECRETISH);
  assert.ok(!doc.includes('client_production') || doc.includes('Do **not** treat CorpFlowAI-hosted ERPNext as `client_production`'));
});

test('#918 needs-bridge rows document key, direction, idempotency, conflict, retry, and audit', () => {
  const doc = read(DOC_REL);
  for (const heading of [
    'qualified_customer_identity',
    'lead_opportunity_promotion',
    'quotation_invoice',
    'payment_evidence',
    'project_task_timesheet',
    'issue_support',
  ]) {
    assert.ok(doc.includes(heading), `missing bridge heading ${heading}`);
  }
  assert.ok(doc.includes('CorpFlowAI key'));
  assert.ok(doc.includes('Idempotency'));
  assert.ok(doc.includes('Conflict'));
  assert.ok(doc.includes('Retry / failure'));
  assert.ok(doc.includes('Audit'));
  assert.ok(doc.includes('Blocked'));
  assert.ok(doc.includes('GrowthCompany'));
  assert.ok(doc.includes('PaymentRecord'));
  assert.ok(doc.includes('custom DocTypes'));
});

test('#918 machine contract validates and selects Customer identity as first bridge', () => {
  resetSourceOfTruthMatrixCache();
  assert.equal(existsSync(path.join(REPO_ROOT, CONFIG_REL)), true);
  const cfg = loadSourceOfTruthMatrix(REPO_ROOT);
  assert.equal(cfg.schema, 'corpflow.erpnext.source_of_truth_matrix.v1');
  assert.equal(cfg.issue, 918);
  assert.equal(cfg.verdict, CANONICAL_VERDICT);
  assert.equal(cfg.no_automated_sync_authorized, true);
  assert.equal(cfg.no_postgres_migration, true);
  assert.equal(cfg.no_custom_doctypes, true);
  assert.equal(cfg.no_second_database, true);
  assert.equal(cfg.first_bridge_candidate_id, 'qualified_customer_identity');
  assert.deepEqual(cfg.classifications, [...CLASSIFICATIONS]);

  const rows = listMatrixRows(REPO_ROOT);
  assert.ok(rows.length >= 12);
  const used = new Set(rows.map((row) => row.classification));
  for (const classification of CLASSIFICATIONS) {
    assert.ok(used.has(classification), `unused classification ${classification}`);
  }

  const bridges = listNeedsBridgeRows(REPO_ROOT);
  assert.ok(bridges.length >= 5);
  for (const row of bridges) {
    for (const field of NEEDS_BRIDGE_FIELDS) {
      assert.ok(String(row[field] || '').trim(), `${row.id} missing ${field}`);
    }
  }

  const first = firstBridgeCandidate(REPO_ROOT);
  assert.ok(first);
  assert.equal(first.id, 'qualified_customer_identity');
  assert.equal(first.classification, 'needs_bridge');
  assert.match(first.corpflow_key, /leads\.id/);
  assert.match(first.erpnext_doctype, /Customer/);

  const sequence = listImplementationSequence(REPO_ROOT);
  assert.equal(sequence[0].id, 'this_matrix');
  assert.ok(sequence.some((step) => step.id === 'qualified_customer_identity'));

  const stop = listDuplicateStopExpanding(REPO_ROOT);
  assert.ok(stop.some((item) => item.id === 'second_crm'));
  assert.ok(stop.some((item) => item.id === 'paymentrecord_as_gl'));
  assert.ok(stop.some((item) => item.id === 'custom_doctypes'));

  const result = validateSourceOfTruthMatrix(REPO_ROOT);
  assert.equal(result.ok, true, result.blockers.join(','));
  assert.equal(result.automated_write_authorized, false);
  assert.doesNotMatch(read(CONFIG_REL), SECRETISH);
});

test('#918 indexes and CRM baseline point at the matrix without authorizing sync', () => {
  const readme = read('docs/governance/erpnext/README.md');
  assert.ok(readme.includes('SOURCE_OF_TRUTH_MATRIX_V1.md'));
  assert.ok(readme.includes('#918'));

  const evidence = read('docs/governance/erpnext/IMPLEMENTATION_EVIDENCE_INDEX.md');
  assert.ok(evidence.includes('SOURCE_OF_TRUTH_MATRIX_V1.md'));

  const bridge = read('docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md');
  assert.ok(bridge.includes('SOURCE_OF_TRUTH_MATRIX_V1.md'));

  const crm = read('docs/operations/CRM_OPERATING_BASELINE_V1.md');
  assert.ok(crm.includes('SOURCE_OF_TRUTH_MATRIX_V1.md'));

  const todo = read('docs/CORPFLOW_SHARED_TODO.md');
  assert.ok(todo.includes('SOURCE_OF_TRUTH_MATRIX_V1.md'));
  assert.ok(todo.includes('ERPNext-FIRST RECONCILIATION READY FOR IMPLEMENTATION'));

  const vision = read('docs/governance/erpnext/VISION_AND_INTENDED_USE.md');
  assert.ok(vision.includes('SOURCE_OF_TRUTH_MATRIX_V1.md'));
  assert.match(vision, /\*\*Status:\*\*\s*`APPROVED — VERSION 2`/);
});
