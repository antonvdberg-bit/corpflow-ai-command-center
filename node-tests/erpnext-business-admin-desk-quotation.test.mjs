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
  'templates/erpnext/quotation/corpflowai-professional-quotation.html',
);

describe('Product-driven ERPNext quotation branding', () => {
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

  test('the canonical Jinja format routes both identities from item_group', () => {
    const template = readFileSync(templatePath, 'utf8');
    assert.match(template, /CorpFlowAI Services \/"/);
    assert.match(template, new RegExp(QUOTATION_BRAND_ROOTS.businessAdminDesk));
    assert.match(template, /routing\.has_corpflowai/);
    assert.match(template, /routing\.has_business_admin_desk/);
    assert.match(template, /set business_admin_desk =/);
    assert.match(template, /if not brand_ready/);
    assert.match(template, /brand_logo_url/);
    assert.match(template, /brand_name/);
    assert.match(template, /BRAND CLASSIFICATION ERROR \/ NOT CLIENT-READY/);
    assert.match(template, /businessadmindesk\.co\.za/);
    assert.match(template, /finance@corpflowai\.com/);
    assert.doesNotMatch(template, /@gmail\.com/);
  });

  test('the canonical Jinja format has no manual format-selection branch', () => {
    const template = readFileSync(templatePath, 'utf8');
    assert.doesNotMatch(template, /Business Admin Desk Professional Quotation/);
    assert.doesNotMatch(template, /Choose.*Print Format/i);
  });
});
