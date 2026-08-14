/**
 * Deterministic #956 backup / DR / security audit invariants.
 * Does not call live ERPNext, Neon, R2, or SSH. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const AUDIT_REL = 'docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md';
const MARKS = [
  'PROVEN',
  'PARTIAL',
  'NOT PROVEN',
  'NOT PRESENT',
  'REQUIRES DECISION',
];
const CONTROL_IDS = [
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'B6',
  'B7',
  'B8',
  'B9',
  'B10',
  'D1',
  'D2',
  'D3',
  'D4',
  'D5',
  'D6',
  'S1',
  'S2',
  'S3',
  'S4',
  'S5',
  'S6',
  'S7',
  'S8',
  'S9',
  'S10',
  'S11',
  'S12',
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
];

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('#956 audit file exists with sentinel and honest verdict', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, AUDIT_REL)), true);
  const doc = read(AUDIT_REL);
  assert.ok(doc.includes('<!-- ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1 -->'));
  assert.ok(doc.includes('#956'));
  assert.ok(doc.includes('ERPNext BUSINESS-CRITICAL BACKUP/DR/SECURITY: NOT PROVEN'));
  assert.ok(doc.includes('NO IMPLEMENTATION AUTHORIZED'));
  assert.ok(doc.includes('vendor_hosted_frappe_family'));
  assert.ok(doc.includes('frappe=16.25.0'));
  assert.ok(doc.includes('erpnext=16.26.2'));
  assert.ok(doc.includes('MASTER_ADMIN_KEY'));
  assert.ok(doc.includes('Monitor #14'));
  assert.doesNotMatch(doc, /ERPNext BUSINESS-CRITICAL USE APPROVED(?! WITH)/);
});

test('#956 audit marks every required control and uses only allowed marks', () => {
  const doc = read(AUDIT_REL);
  for (const mark of MARKS) {
    assert.ok(doc.includes(`**${mark}**`) || doc.includes(mark), `missing mark ${mark}`);
  }
  for (const id of CONTROL_IDS) {
    const re = new RegExp(`\\*\\*${id}\\*\\*`);
    assert.ok(re.test(doc), `missing control ${id}`);
  }
});

test('#956 audit does not leak secret values or vendor hostnames', () => {
  const doc = read(AUDIT_REL);
  assert.doesNotMatch(doc, /ERPNEXT_API_SECRET\s*[:=]\s*(?!present\b|absent\b)\S+/i);
  assert.doesNotMatch(doc, /ERPNEXT_BASE_URL\s*[:=]\s*https?:\/\//i);
  assert.doesNotMatch(doc, /POSTGRES_URL\s*[:=]\s*\S+/);
  assert.doesNotMatch(doc, /sk_live|resticpassword|AKIA[0-9A-Z]{16}/i);
  assert.doesNotMatch(doc, /[a-z0-9-]+\.frappe\.cloud/i);
  assert.doesNotMatch(doc, /[a-z0-9-]+\.erpnext\.com/i);
});

test('#956 journal row and shared-todo pointer exist', () => {
  const journal = read('docs/decisions/JOURNAL.md');
  assert.ok(journal.includes('JE-2026-08-14-3'));
  assert.ok(journal.includes('#956'));
  assert.ok(journal.includes('ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md'));
  const todo = read('docs/CORPFLOW_SHARED_TODO.md');
  assert.ok(todo.includes('ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md'));
  assert.ok(todo.includes('#956'));
});
