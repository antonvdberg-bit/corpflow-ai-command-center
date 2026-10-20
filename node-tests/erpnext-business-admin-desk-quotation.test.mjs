import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  classifyQuotationBrand,
  isClientReadyQuotationBrand,
  resolveQuotationGroupBrand,
  QUOTATION_BRAND_ROOTS,
} from '../templates/erpnext/quotation/quotation-brand-routing.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = join(
  root,
  'templates/erpnext/quotation/corpflowai-professional-quotation.html',
);

const LIVE_ITEM_GROUP_PARENTS = Object.freeze({
  'CF Website Rescue': 'CorpFlowAI Services',
  'BAD Administration': 'Business Admin Desk Services',
  Services: 'All Item Groups',
});

function parentResolver(itemGroup) {
  return LIVE_ITEM_GROUP_PARENTS[itemGroup] || null;
}

describe('Product-driven ERPNext quotation branding', () => {
  test('CorpFlowAI-only product sets route to CorpFlowAI', () => {
    assert.equal(
      classifyQuotationBrand(['CF Website Rescue'], parentResolver),
      'corpflowai',
    );
    assert.equal(
      resolveQuotationGroupBrand('CF Website Rescue', parentResolver),
      'corpflowai',
    );
    assert.equal(isClientReadyQuotationBrand('corpflowai'), true);
  });

  test('Business Admin Desk-only product sets route to Business Admin Desk', () => {
    assert.equal(
      classifyQuotationBrand(['BAD Administration'], parentResolver),
      'business_admin_desk',
    );
    assert.equal(
      resolveQuotationGroupBrand('BAD Administration', parentResolver),
      'business_admin_desk',
    );
    assert.equal(isClientReadyQuotationBrand('business_admin_desk'), true);
  });

  test('mixed product sets fail closed', () => {
    assert.equal(
      classifyQuotationBrand([
        'CF Website Rescue',
        'BAD Administration',
      ], parentResolver),
      'mixed',
    );
    assert.equal(isClientReadyQuotationBrand('mixed'), false);
  });

  test('unknown and unclassified product sets fail closed', () => {
    assert.equal(classifyQuotationBrand(['Services'], parentResolver), 'unknown');
    assert.equal(resolveQuotationGroupBrand('Services', parentResolver), null);
    assert.equal(classifyQuotationBrand(['Consulting'], parentResolver), 'unknown');
    assert.equal(classifyQuotationBrand([], parentResolver), 'unknown');
    assert.equal(isClientReadyQuotationBrand('unknown'), false);
  });

  test('the canonical Jinja format routes both identities from item_group', () => {
    const template = readFileSync(templatePath, 'utf8');
    assert.match(template, /range\(8\)/);
    assert.match(template, /frappe\.db\.get_value\("Item Group", row\.current_group, "parent_item_group"\)/);
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
    assert.doesNotMatch(template, /\.startswith\(/);
  });

  test('the canonical Jinja format has no manual format-selection branch', () => {
    const template = readFileSync(templatePath, 'utf8');
    assert.doesNotMatch(template, /Business Admin Desk Professional Quotation/);
    assert.doesNotMatch(template, /Choose.*Print Format/i);
  });
});
