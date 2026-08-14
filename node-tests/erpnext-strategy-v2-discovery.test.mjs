/**
 * #955 ERP Strategy v2 — canonical draft exists and agent-context surfaces point to it.
 * Docs/governance only. Does not call ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

const CANONICAL = 'docs/governance/erpnext/VISION_AND_INTENDED_USE.md';
const POINTER_SURFACES = [
  'AGENTS.md',
  '.cursor/rules/erpnext-strategy.mdc',
  '.context/system_prompt.md',
  'docs/operations/OPERATOR_BRIDGE_V1.md',
  'docs/governance/erpnext/README.md',
];

test('#955 canonical ERP Strategy v2 draft exists with required status and topics', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, CANONICAL)), true, `missing ${CANONICAL}`);
  const doc = read(CANONICAL);
  assert.ok(doc.includes('<!-- CORPFLOWAI_ERP_VISION_AND_INTENDED_USE_V2 -->'));
  assert.ok(doc.includes('DRAFT FOR ANTON APPROVAL'));
  assert.ok(!/Status:\s*`?APPROVED/i.test(doc), 'draft must not be marked APPROVED');
  assert.match(doc, /minimum viable ERP, correctly founded/i);
  assert.match(doc, /authoritative for financial\/corporate/i);
  assert.match(doc, /reconcile rather than duplicate|reconcile into ERPNext rather than/i);
  assert.match(doc, /Zero default/i);
  assert.match(doc, /cannot approve suppliers/i);
  assert.match(doc, /external quotation\/proposal requires Anton approval/i);
  assert.match(doc, /Draft → Review → Reject \/ Amend \/ Approve → Submit → Externally Share/);
  assert.match(doc, /Anton’s time is a real delivery cost|Anton's time is a real delivery cost/);
  assert.match(doc, /value-based/i);
  assert.match(doc, /Chart of Accounts/);
  assert.match(doc, /Quotation \/ Selling/);
  assert.match(doc, /ERPNext-first/);
  assert.match(doc, /AI-operated company/);
  assert.match(doc, /financial-control \/ due-diligence|AI financial review/i);
  assert.match(doc, /Monthly is the minimum expected financial close/);
  assert.match(doc, /Incapacity \/ key-person resilience is a strategic design requirement/);
  assert.match(doc, /move quickly, but preserve enough evidence/);
  assert.match(doc, /Backup is not DR/);
  assert.match(doc, /must not block this revenue deliverable/);
  assert.ok(doc.includes('#953'));
  assert.ok(doc.includes('#954'));
  assert.ok(doc.includes('#955'));
  assert.ok(doc.includes('Not posted as a standalone #954 comment'));
  assert.ok(!/sk_live|POSTGRES_URL\s*[:=]\s*\S+|ERPNEXT_API_SECRET\s*[:=]\s*\S+/.test(doc));
});

test('#955 agent-context surfaces point to the canonical ERP strategy without duplicating it', () => {
  for (const rel of POINTER_SURFACES) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    const text = read(rel);
    assert.ok(
      text.includes('docs/governance/erpnext/VISION_AND_INTENDED_USE.md'),
      `${rel} must point to the canonical ERP strategy`
    );
    assert.ok(text.includes('DRAFT FOR ANTON APPROVAL'), `${rel} must state draft status`);
    assert.ok(
      !text.includes('<!-- CORPFLOWAI_ERP_VISION_AND_INTENDED_USE_V2 -->'),
      `${rel} must not duplicate the canonical sentinel`
    );
  }
  const agents = read('AGENTS.md');
  assert.ok(agents.includes('reconcile-don’t-duplicate') || agents.includes('reconcile rather than duplicate') || agents.includes('Do not paste the full doctrine'));
});
