import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  analyzeCustomerPurchasing,
  reportToCsv,
} from '../lib/orixhealth/customer-purchasing-analysis.js';

const fixture = JSON.parse(await readFile(
  path.join(process.cwd(), 'fixtures/orixhealth/customer-purchasing-analysis.synthetic.json'),
  'utf8',
));

const config = { asOfDate: '2026-06-01', includedStatuses: ['paid', 'sent'], dormancyDays: 45 };

test('synthetic report groups invoice lines once, orders dates, and preserves currency totals', () => {
  const report = analyzeCustomerPurchasing(fixture, config);
  const blue = report.customer_items.find((row) => row.key === 'customer-a|item-blue');
  assert.deepEqual(blue.observed_evidence.invoice_ids, ['SYN-INV-001', 'SYN-INV-003']);
  assert.equal(blue.distinct_invoice_count, 2);
  assert.deepEqual(blue.observed_repeat_intervals_days, [59]);
  assert.equal(blue.totals_by_currency.MUR.gross, 300);
  assert.equal(blue.totals_by_currency.MUR.credits, 25);
  assert.equal(blue.totals_by_currency.MUR.net, 275);
  assert.deepEqual(report.customers.find((row) => row.key === 'customer-a').totals_by_currency, {
    MUR: { gross: 450, credits: 25, net: 425 },
  });
  assert.deepEqual(report.customers.find((row) => row.key === 'customer-b').totals_by_currency, {
    EUR: { gross: 50, credits: 0, net: 50 },
  });
});

test('synthetic report excludes draft and future as-of rows and records credit lineage', () => {
  const report = analyzeCustomerPurchasing(fixture, config);
  assert.deepEqual(report.excluded_statuses, ['draft']);
  assert.deepEqual(report.credit_note_lineage, [{
    credit_note_id: 'SYN-CN-001',
    invoice_id: 'SYN-INV-003',
    applied_as_of: true,
  }]);
  assert.equal(report.customer_items.some((row) => row.key === 'customer-a|item-blue' && row.distinct_invoice_count === 3), false);
});

test('insufficient repeat history is explicitly unknown and does not become a candidate', () => {
  const report = analyzeCustomerPurchasing({
    invoices: [{
      invoice_id: 'ONE',
      customer_key: 'c',
      invoice_date: '2026-01-01',
      status: 'paid',
      currency: 'USD',
      item_key: 'i',
      quantity: 1,
      net_amount: 10,
    }],
  }, { asOfDate: '2026-02-01', includedStatuses: ['paid'], dormancyDays: 90 });
  assert.equal(report.reorder_candidates[0].reorder_candidate, false);
  assert.equal(report.reorder_candidates[0].status, 'unknown_insufficient_history');
  assert.equal(report.customer_items[0].dormant, false);
});

test('malformed or ambiguous data is rejected rather than defaulted', () => {
  assert.throws(
    () => analyzeCustomerPurchasing({ invoices: [{ ...fixture.invoices[0], net_amount: undefined }] }, config),
    /invoices\[0\]\.net_amount/,
  );
  assert.throws(
    () => analyzeCustomerPurchasing(fixture, { includedStatuses: ['paid'], dormancyDays: 90 }),
    /config\.asOfDate/,
  );
  assert.throws(
    () => analyzeCustomerPurchasing({
      invoices: fixture.invoices,
      credit_notes: [{ ...fixture.credit_notes[0], item_key: 'not-on-invoice' }],
    }, config),
    /lineage/,
  );
  assert.throws(
    () => analyzeCustomerPurchasing({
      invoices: [{ ...fixture.invoices[0], invoice_date: '2026-02-29' }],
    }, config),
    /invoices\[0\]\.invoice_date/,
  );
  assert.throws(
    () => analyzeCustomerPurchasing(fixture, { asOfDate: '2026-06-01', dormancyDays: 45 }),
    /config\.includedStatuses/,
  );
  assert.throws(
    () => analyzeCustomerPurchasing(fixture, { asOfDate: '2026-06-01', includedStatuses: ['paid'] }),
    /config\.dormancyDays/,
  );
});

test('CSV output is small and readable without performing an external action', () => {
  const csv = reportToCsv(analyzeCustomerPurchasing(fixture, config));
  assert.match(csv, /^"customer_key","item_key"/);
  assert.match(csv, /"customer-a","item-blue"/);
  assert.doesNotMatch(csv, /https?:\/\//);
});
