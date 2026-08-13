import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

const PACKET_FILES = [
  'docs/sales/prestige-procurement/README.md',
  'docs/sales/prestige-procurement/SCOPE_MATRIX.md',
  'docs/sales/prestige-procurement/ARCHITECTURE_AND_INDEPENDENCE.md',
  'docs/sales/prestige-procurement/PROJECT_PLAN_AND_SCHEDULE.md',
  'docs/sales/prestige-procurement/PRICING_PACKET.md',
  'docs/sales/prestige-procurement/ERPNEXT_PROJECT_MAPPING.md',
  'docs/sales/prestige-procurement/QUOTATION_DRAFT.md',
  'docs/sales/prestige-procurement/CLIENT_PRESENTATION.md',
  'docs/sales/prestige-procurement/OPEN_QUESTIONS_AND_DECISIONS.md',
];

const SENTINELS = [
  '<!-- PRESTIGE_PROCUREMENT_PROPOSAL_PACKET_V1 -->',
  '<!-- PRESTIGE_PROCUREMENT_SCOPE_MATRIX_V1 -->',
  '<!-- PRESTIGE_PROCUREMENT_ARCHITECTURE_V1 -->',
  '<!-- PRESTIGE_PROCUREMENT_PROJECT_PLAN_V1 -->',
  '<!-- PRESTIGE_PROCUREMENT_PRICING_PACKET_V1 -->',
  '<!-- PRESTIGE_PROCUREMENT_ERPNEXT_MAPPING_V1 -->',
  '<!-- PRESTIGE_PROCUREMENT_QUOTATION_DRAFT_V1 -->',
  '<!-- PRESTIGE_PROCUREMENT_CLIENT_PRESENTATION_V1 -->',
  '<!-- PRESTIGE_PROCUREMENT_OPEN_QUESTIONS_V1 -->',
];

const SECRET_LIKE =
  /(POSTGRES_URL\s*=\s*\S+)|sk-[A-Za-z0-9]{16,}|api[_-]?secret\s*[:=]\s*['\"][^'\"]+['\"]|BEGIN (RSA |OPENSSH )?PRIVATE KEY/i;

describe('Prestige Procurement proposal packet #919', () => {
  it('ships every required deliverable file', () => {
    for (const rel of PACKET_FILES) {
      assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
      assert.ok(read(rel).length > 800, `${rel} too short`);
      assert.ok(read(rel).includes('#919') || read(rel).includes('919'), `${rel} must cite #919`);
    }
  });

  it('keeps stable sentinels for each artefact', () => {
    const joined = PACKET_FILES.map(read).join('\n');
    for (const sentinel of SENTINELS) {
      assert.ok(joined.includes(sentinel), `missing ${sentinel}`);
    }
  });

  it('is a MUR one-off independent-hosting package, not Website Rescue T1', () => {
    const readme = read('docs/sales/prestige-procurement/README.md');
    const pricing = read('docs/sales/prestige-procurement/PRICING_PACKET.md');
    const quote = read('docs/sales/prestige-procurement/QUOTATION_DRAFT.md');
    assert.ok(readme.includes('PRESTIGE PROCUREMENT PROPOSAL READY FOR CLIENT REVIEW'));
    assert.ok(readme.includes('MUR 285,000'));
    assert.ok(pricing.includes('MUR 1,250 / hour'));
    assert.ok(pricing.includes('218'));
    assert.ok(quote.includes('285,000'));
    assert.ok(!quote.includes('CF-RD-LANDING-RESCUE'));
    assert.ok(readme.includes('no recurring CorpFlowAI fee'));
  });

  it('classifies scope instead of assuming every capability', () => {
    const scope = read('docs/sales/prestige-procurement/SCOPE_MATRIX.md');
    for (const label of ['REQUIRED', 'OPTIONAL', 'OUT OF SCOPE', 'CLIENT DECISION']) {
      assert.ok(scope.includes(label), `scope matrix missing ${label}`);
    }
  });

  it('recommends maintained WordPress and rejects a CorpFlowAI-hosted live site', () => {
    const arch = read('docs/sales/prestige-procurement/ARCHITECTURE_AND_INDEPENDENCE.md');
    assert.ok(/WordPress/i.test(arch));
    assert.ok(arch.includes('Avoid building a custom CMS') || arch.includes('Do not build a custom CMS'));
    assert.ok(arch.includes('*.corpflowai.com') || arch.includes('corpflowai.com'));
    assert.ok(arch.includes('Prestige owns or controls hosting'));
    assert.ok(arch.includes('No hidden CorpFlowAI runtime dependency') || arch.includes('no hidden CorpFlowAI runtime'));
  });

  it('uses milestone payments instead of a 50/50 default', () => {
    const pricing = read('docs/sales/prestige-procurement/PRICING_PACKET.md');
    const quote = read('docs/sales/prestige-procurement/QUOTATION_DRAFT.md');
    assert.ok(pricing.includes('20%'));
    assert.ok(pricing.includes('25%'));
    assert.ok(pricing.includes('15%'));
    assert.ok(/not 50\/50/i.test(pricing));
    assert.ok(/NOT 50\/50/i.test(quote));
    assert.ok(quote.includes('MUR 57,000'));
    assert.ok(quote.includes('MUR 71,250'));
    assert.ok(quote.includes('MUR 42,750'));
  });

  it('maps standard ERPNext objects without schema customization', () => {
    const mapping = read('docs/sales/prestige-procurement/ERPNEXT_PROJECT_MAPPING.md');
    assert.ok(mapping.includes('Customer'));
    assert.ok(mapping.includes('Quotation'));
    assert.ok(mapping.includes('Project'));
    assert.ok(mapping.includes('Tasks'));
    assert.ok(mapping.includes('CF-WS-CUSTOM-PROJECT'));
    assert.ok(mapping.includes('#882'));
    assert.ok(/No schema customization/i.test(mapping));
  });

  it('keeps quotation and presentation send-gated with no result guarantees', () => {
    const quote = read('docs/sales/prestige-procurement/QUOTATION_DRAFT.md');
    const presentation = read('docs/sales/prestige-procurement/CLIENT_PRESENTATION.md');
    const decisions = read('docs/sales/prestige-procurement/OPEN_QUESTIONS_AND_DECISIONS.md');
    assert.ok(/not sent/i.test(quote));
    assert.ok(/No revenue/i.test(quote));
    assert.ok(quote.includes('VAT/tax treatment pending accountant confirmation'));
    assert.ok(presentation.includes('Definition of done:'));
    assert.ok(presentation.includes('Hook'));
    assert.ok(decisions.includes('A5'));
    assert.ok(/exact external send/i.test(decisions));
  });

  it('does not embed secret values or payment routing details', () => {
    const joined = PACKET_FILES.map(read).join('\n');
    assert.equal(SECRET_LIKE.test(joined), false, 'packet must not contain secret-like strings');
    assert.ok(!/IBAN|SWIFT|account number/i.test(joined) || joined.includes('bank details'));
    assert.doesNotMatch(joined, /\b[0-9]{8,18}\b.*(?:SWIFT|IBAN)/i);
  });
});
