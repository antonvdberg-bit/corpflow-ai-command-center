/**
 * ERPNext product catalogue invariants and synthetic quotation proof (#881).
 * Does not call live ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCatalogueInvariants,
  buildSyntheticQuotation,
  getCatalogueItem,
  leadRescueSyntheticQuotation,
  listInsertedItems,
  loadProductCatalogue,
  toQuotationLine,
  websiteRescueSyntheticQuotation,
} from '../lib/erpnext/product-catalogue.js';

test('catalogue JSON loads with Lead Rescue, Website Rescue, recurring, and template', () => {
  const catalogue = loadProductCatalogue();
  assert.equal(catalogue.version, 'v1');
  assert.equal(catalogue.issue, 881);
  const families = new Set((catalogue.items || []).map((item) => item.family));
  assert.ok(families.has('lead_rescue'));
  assert.ok(families.has('website_rescue'));
  assert.ok(catalogue.future_service_template);
  assert.ok(catalogue.item_groups.some((g) => g.name === 'CF Future Services'));
  assert.equal(catalogue.uoms.setup, 'Nos');
  assert.equal(catalogue.uoms.recurring, 'Month');
});

test('catalogue invariants: unique codes, service flags, setup vs recurring UOM', () => {
  assert.equal(assertCatalogueInvariants(), true);
});

test('USD 150 pilot is not duplicated as a MUR clone of the same SKU', () => {
  const catalogue = loadProductCatalogue();
  const codes = (catalogue.items || []).map((item) => item.item_code);
  assert.ok(codes.includes('LR-SETUP-USD-150'));
  assert.ok(codes.includes('CF-RD-LEAD-RESCUE'));
  assert.equal(
    codes.some((code) => /^LR-SETUP-MUR/i.test(code)),
    false,
    'MUR conversion of the USD 150 pilot must not be a second item master',
  );
  const pilot = getCatalogueItem('LR-SETUP-USD-150');
  const sprint = getCatalogueItem('CF-RD-LEAD-RESCUE');
  assert.notEqual(pilot.item_name, sprint.item_name);
  assert.equal(pilot.prices[0].currency, 'USD');
  assert.equal(sprint.prices[0].currency, 'MUR');
});

test('inserted masters are non-stock sales services with distinct setup/recurring codes', () => {
  const inserted = listInsertedItems();
  const codes = inserted.map((item) => item.item_code).sort();
  assert.deepEqual(codes, [
    'CF-RD-LANDING-RESCUE',
    'CF-RD-LEAD-RESCUE',
    'CF-WR-REC-MUR-MAINT',
    'LR-REC-USD-99',
    'LR-SETUP-USD-150',
  ]);
  const setup = inserted.filter((item) => item.billing_role === 'setup');
  const recurring = inserted.filter((item) => item.billing_role === 'recurring');
  assert.ok(setup.length >= 2);
  assert.ok(recurring.length >= 2);
  for (const item of inserted) {
    assert.equal(item.is_stock_item, 0);
    assert.equal(item.is_sales_item, 1);
  }
});

test('quotation lines use commercial wording only and omit internal delivery detail', () => {
  const item = getCatalogueItem('LR-SETUP-USD-150');
  const line = toQuotationLine(item);
  assert.equal(line.item_code, 'LR-SETUP-USD-150');
  assert.equal(line.item_name, 'AI Lead Rescue Setup (USD 150 launch pilot)');
  assert.match(line.description, /launch pilot/i);
  assert.match(line.description, /No revenue/);
  assert.equal(line.uom, 'Nos');
  assert.equal(line.rate, 150);
  assert.equal(line.amount, 150);
  assert.equal(line.internal_delivery_ref, undefined);
  assert.equal(line.internal_notes, undefined);
  assert.doesNotMatch(line.description, /Telegram/i);
  assert.doesNotMatch(line.description, /Google Sheet/i);
});

test('synthetic Lead Rescue quotation pulls setup + recurring commercial identity', () => {
  const quo = leadRescueSyntheticQuotation();
  assert.equal(quo.doctype, 'Quotation');
  assert.equal(quo.docstatus, 0);
  assert.equal(quo.currency, 'USD');
  assert.equal(quo.items.length, 2);
  assert.equal(quo.items[0].item_code, 'LR-SETUP-USD-150');
  assert.equal(quo.items[0].item_name, 'AI Lead Rescue Setup (USD 150 launch pilot)');
  assert.equal(quo.items[0].uom, 'Nos');
  assert.equal(quo.items[0].rate, 150);
  assert.equal(quo.items[1].item_code, 'LR-REC-USD-99');
  assert.equal(quo.items[1].item_name, 'AI Lead Rescue monthly monitoring');
  assert.equal(quo.items[1].uom, 'Month');
  assert.equal(quo.items[1].rate, 99);
  assert.equal(quo.grand_total, 249);
  assert.match(quo.customer_remarks, /DO NOT SEND/);
});

test('synthetic Website Rescue quotation pulls T1 commercial identity', () => {
  const quo = websiteRescueSyntheticQuotation();
  assert.equal(quo.currency, 'MUR');
  assert.equal(quo.items.length, 1);
  assert.equal(quo.items[0].item_code, 'CF-RD-LANDING-RESCUE');
  assert.equal(quo.items[0].item_name, 'Premium Landing Page Rescue');
  assert.match(quo.items[0].description, /Website Rescue T1/);
  assert.equal(quo.items[0].rate, 45000);
  assert.equal(quo.grand_total, 45000);
  assert.doesNotMatch(quo.items[0].description, /Telegram/i);
});

test('T2/T3 reserved codes do not duplicate the T1 master and are not inserted', () => {
  const t1 = getCatalogueItem('CF-RD-LANDING-RESCUE');
  const t2 = getCatalogueItem('CF-WR-SETUP-MUR-T2');
  const t3 = getCatalogueItem('CF-WR-SETUP-MUR-T3');
  assert.equal(t1.erpnext_insert, true);
  assert.equal(t2.erpnext_insert, false);
  assert.equal(t3.erpnext_insert, false);
  assert.notEqual(t2.item_code, t1.item_code);
  assert.notEqual(t3.item_code, t1.item_code);
});

test('mixed-currency synthetic quotation is rejected', () => {
  assert.throws(
    () =>
      buildSyntheticQuotation({
        title: 'invalid mix',
        currency: 'USD',
        item_codes: ['LR-SETUP-USD-150', 'CF-RD-LANDING-RESCUE'],
      }),
    /mixed currencies/,
  );
});

test('Website Rescue maintenance is operator-quoted and does not invent a list price', () => {
  const item = getCatalogueItem('CF-WR-REC-MUR-MAINT');
  const line = toQuotationLine(item);
  assert.equal(item.billing_role, 'recurring');
  assert.equal(item.stock_uom, 'Month');
  assert.equal(line.rate, null);
  assert.equal(item.prices[0].authority, 'operator_quote');
});
