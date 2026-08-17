/**
 * Deterministic #959 ERPNext business-critical due-diligence invariants.
 * Docs/governance only. Does not call ERPNext, Neon, or vendors. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DOC_REL = 'docs/governance/erpnext/ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1.md';

const ALLOWED_VERDICTS = [
  'ERPNext BUSINESS-CRITICAL USE APPROVED',
  'ERPNext BUSINESS-CRITICAL USE APPROVED WITH CONDITIONS',
  'ERPNext BUSINESS-CRITICAL USE LIMITED',
  'ERPNext BUSINESS-CRITICAL USE REJECTED',
];

const REQUIRED_SECTIONS = [
  'Product maturity / release / support lifecycle',
  'Market reputation / adoption signal',
  'Open-source / commercial model',
  'Accounting / commercial depth',
  'CRM / projects / support / workflow fit',
  'API / webhook / integration model',
  'Approval / audit / versioning model',
  'Security advisory history and patch expectations',
  'Backup / restore / DR model',
  'Hosting / self-hosting burden',
  'Upgrade / customization risk',
  'Partner / support ecosystem',
  'Likely cost / TCO at CorpFlowAI scale',
  'AI-operated-company fit',
  'Key conditions that must be proven',
];

const COMPARATORS = ['Odoo', 'Business Central', 'SAP Business One', 'NetSuite'];

const CONDITIONS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'];

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('#959 due-diligence file exists with sentinel and selected verdict', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, DOC_REL)), true);
  const doc = read(DOC_REL);
  assert.ok(doc.includes('<!-- ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1 -->'));
  assert.ok(doc.includes('#959'));
  assert.ok(doc.includes('#956'));
  assert.ok(doc.includes('#953'));
  assert.ok(doc.includes('NO IMPLEMENTATION AUTHORIZED'));
  assert.ok(doc.includes('ERPNext BUSINESS-CRITICAL USE APPROVED WITH CONDITIONS'));
  assert.ok(doc.includes('ERPNext BUSINESS-CRITICAL BACKUP/DR/SECURITY: NOT PROVEN'));
  assert.ok(doc.includes('must not block'));
  assert.ok(doc.includes('FACT'));
  assert.ok(doc.includes('INFERENCE'));
  assert.ok(doc.includes('AGGREGATOR'));
  assert.ok(doc.includes('CORP FLOW RECORD'));
  for (const verdict of ALLOWED_VERDICTS) {
    assert.ok(doc.includes(verdict), `missing allowed verdict string ${verdict}`);
  }
  const selected = doc.match(/\*\*ERPNext BUSINESS-CRITICAL USE [A-Z ]+\*\*/g) || [];
  assert.ok(
    selected.some((line) => line.includes('APPROVED WITH CONDITIONS')),
    'selected verdict must be APPROVED WITH CONDITIONS'
  );
  assert.doesNotMatch(
    doc,
    /\*\*ERPNext BUSINESS-CRITICAL USE APPROVED\*\*(?! WITH)/,
    'must not select unconditional APPROVED as the verdict'
  );
});

test('#959 packet covers required research sections, comparators, and conditions', () => {
  const doc = read(DOC_REL);
  for (const section of REQUIRED_SECTIONS) {
    assert.ok(doc.includes(section), `missing section ${section}`);
  }
  for (const name of COMPARATORS) {
    assert.ok(doc.includes(name), `missing comparator ${name}`);
  }
  for (const id of CONDITIONS) {
    assert.ok(doc.includes(`**${id}**`), `missing condition ${id}`);
  }
  assert.ok(doc.includes('16.29.0'));
  assert.ok(doc.includes('CVE-2026-72911'));
  assert.ok(doc.includes('Custom Odoo pricing plans') || doc.includes('Custom'));
  assert.ok(doc.includes('$80'));
  assert.ok(doc.includes('$110'));
  assert.ok(doc.includes('end of 2027'));
  assert.ok(doc.includes('end of 2029'));
  assert.ok(doc.includes('integrations@corpflowai.com'));
  assert.ok(doc.includes('MASTER_ADMIN_KEY'));
  assert.ok(doc.includes('Monitor **#14**') || doc.includes('Monitor #14'));
});

test('#959 packet does not leak secrets or vendor hostnames', () => {
  const doc = read(DOC_REL);
  assert.doesNotMatch(doc, /ERPNEXT_API_SECRET\s*[:=]\s*(?!present\b|absent\b)\S+/i);
  assert.doesNotMatch(doc, /ERPNEXT_BASE_URL\s*[:=]\s*https?:\/\//i);
  assert.doesNotMatch(doc, /POSTGRES_URL\s*[:=]\s*\S+/);
  assert.doesNotMatch(doc, /sk_live|resticpassword|AKIA[0-9A-Z]{16}/i);
  assert.doesNotMatch(doc, /[a-z0-9-]+\.frappe\.cloud/i);
  assert.doesNotMatch(doc, /[a-z0-9-]+\.erpnext\.com/i);
});

test('#959 journal, governance index, and shared-todo pointer exist', () => {
  const journal = read('docs/decisions/JOURNAL.md');
  assert.ok(journal.includes('JE-2026-08-16-1'));
  assert.ok(journal.includes('#959'));
  assert.ok(journal.includes('ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1.md'));
  assert.ok(journal.includes('APPROVED WITH CONDITIONS'));

  const index = read('docs/governance/erpnext/README.md');
  assert.ok(index.includes('ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1.md'));
  assert.ok(index.includes('#959'));

  const decisions = read('docs/decisions/README.md');
  assert.ok(decisions.includes('ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1.md'));
  assert.ok(decisions.includes('#959'));

  const todo = read('docs/CORPFLOW_SHARED_TODO.md');
  assert.ok(todo.includes('ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1.md'));
  assert.ok(todo.includes('#959'));
});
