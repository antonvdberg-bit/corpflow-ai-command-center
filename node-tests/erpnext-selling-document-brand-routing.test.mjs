import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  classifyQuotationBrand,
  isClientReadyQuotationBrand,
} from '../templates/erpnext/quotation/quotation-brand-routing.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatePaths = [
  'templates/erpnext/sales-invoice/corpflowai-professional-sales-invoice.html',
  'templates/erpnext/sales-order/corpflowai-professional-sales-order.html',
];

const LIVE_ITEM_GROUP_PARENTS = Object.freeze({
  'CF Website Rescue': 'CorpFlowAI Services',
  'BAD Administration': 'Business Admin Desk Services',
  Services: 'All Item Groups',
});

function parentResolver(itemGroup) {
  return LIVE_ITEM_GROUP_PARENTS[itemGroup] || null;
}

describe('Product-driven ERPNext selling document branding', () => {
  test('live leaf groups route CorpFlowAI and Business Admin Desk independently', () => {
    assert.equal(
      classifyQuotationBrand(['CF Website Rescue'], parentResolver),
      'corpflowai',
    );
    assert.equal(
      classifyQuotationBrand(['BAD Administration'], parentResolver),
      'business_admin_desk',
    );
  });

  test('mixed and unknown product sets fail closed', () => {
    assert.equal(
      classifyQuotationBrand(
        ['CF Website Rescue', 'BAD Administration'],
        parentResolver,
      ),
      'mixed',
    );
    assert.equal(classifyQuotationBrand(['Services'], parentResolver), 'unknown');
    assert.equal(isClientReadyQuotationBrand('mixed'), false);
    assert.equal(isClientReadyQuotationBrand('unknown'), false);
  });

  for (const relativePath of templatePaths) {
    test(`${relativePath} contains bounded ancestry routing and fail-closed rendering`, () => {
      const template = readFileSync(join(root, relativePath), 'utf8');
      assert.match(template, /range\(8\)/);
      assert.match(
        template,
        /frappe\.db\.get_value\("Item Group", row\.current_group, "parent_item_group"\)/,
      );
      assert.match(template, /CorpFlowAI Services/);
      assert.match(template, /Business Admin Desk Services/);
      assert.match(template, /routing\.has_corpflowai/);
      assert.match(template, /routing\.has_business_admin_desk/);
      assert.match(template, /if not brand_ready/);
      assert.match(template, /BRAND CLASSIFICATION ERROR \/ NOT CLIENT-READY/);
      assert.match(template, /businessadmindesk\.co\.za/);
      assert.doesNotMatch(template, /\.startswith\(/);
      assert.doesNotMatch(template, /@gmail\.com/);
    });
  }
});
