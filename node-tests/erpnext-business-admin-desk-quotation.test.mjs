import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  classifyQuotationBrand,
  isClientReadyQuotationBrand,
  QUOTATION_BRAND_ROOTS,
} from '../templates/erpnext/quotation/quotation-brand-routing.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(
  root,
  'templates/erpnext/quotation/business-admin-desk-professional-quotation.html',
);

describe('Business Admin Desk ERPNext quotation branding', () => {
  test('CorpFlowAI-only product sets route to CorpFlowAI', () => {
    assert.equal(
      classifyQuotationBrand([
        'CorpFlowAI Services / CF Lead Rescue',
        'CorpFlowAI Services / CF Support',
      ]),
      'corpflowai',
    );
    assert.equal(isClientReadyQuotationBrand('corpflowai'), true);
  });

  test('Business Admin Desk-only product sets route to Business Admin Desk', () => {
    assert.equal(
      classifyQuotationBrand([
        'Business Admin Desk Services',
        'Business Admin Desk Services / Administration',
      ]),
      'business_admin_desk',
    );
    assert.equal(isClientReadyQuotationBrand('business_admin_desk'), true);
  });

  test('mixed product sets fail closed', () => {
    assert.equal(
      classifyQuotationBrand([
        'CorpFlowAI Services / CF Website Projects',
        'Business Admin Desk Services / Administration',
      ]),
      'mixed',
    );
    assert.equal(isClientReadyQuotationBrand('mixed'), false);
  });

  test('unknown and unclassified product sets fail closed', () => {
    assert.equal(classifyQuotationBrand(['Consulting']), 'unknown');
    assert.equal(classifyQuotationBrand([]), 'unknown');
    assert.equal(isClientReadyQuotationBrand('unknown'), false);
  });

  test('the Jinja format is a Business Admin Desk-only, no-email template', () => {
    const template = readFileSync(templatePath, 'utf8');
    assert.match(template, new RegExp(QUOTATION_BRAND_ROOTS.businessAdminDesk));
    assert.match(template, /BRAND CLASSIFICATION ERROR \/ NOT CLIENT-READY/);
    assert.match(template, /businessadmindesk\.co\.za/);
    assert.doesNotMatch(template, /@gmail\.com/);
    assert.match(template, /not ns\.has_corpflowai and not ns\.has_bad_group/);
  });
});
