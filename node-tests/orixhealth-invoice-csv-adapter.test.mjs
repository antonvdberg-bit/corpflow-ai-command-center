import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { normalizeInvoiceCsvFiles } from '../lib/orixhealth/invoice-csv-adapter.js';

const fixtureText = await readFile(
  path.join(process.cwd(), 'fixtures/orixhealth/invoice-csv-adapter.synthetic.csv'),
  'utf8',
);

test('maps synthetic CSV lines, preserves string IDs, quoted fields, and subtotal boundaries', () => {
  const result = normalizeInvoiceCsvFiles([{ name: 'synthetic.csv', text: fixtureText }]);
  assert.equal(result.invoices.length, 3);
  assert.equal(result.invoices[0].invoice_id, 'SYN-INV-100');
  assert.equal(result.invoices[0].item_key, 'item,blue');
  assert.equal(result.invoices[2].customer_key, 'Customer\nSeven');
  assert.equal(result.invoices[0].net_amount, 200);
  assert.deepEqual(result.credit_notes, []);
  assert.match(result.adapter.notes[0], /reconciliation/);
});

test('supports explicit header mappings and CRLF/BOM exports', () => {
  const text = '\ufeffid,cust,when,state,ccy,sku,qty,amount,total,ref\n'
    + '001,0007,2026-01-02,paid,USD,SKU-1,1,10.00,10.00,row-1\r\n';
  const result = normalizeInvoiceCsvFiles([{ name: 'mapped.csv', text }], {
    headers: {
      invoiceId: 'id',
      customerId: 'cust',
      invoiceDate: 'when',
      status: 'state',
      currency: 'ccy',
      itemId: 'sku',
      quantity: 'qty',
      lineAmount: 'amount',
      invoiceSubtotal: 'total',
      sourceRecord: 'ref',
    },
  });
  assert.equal(result.invoices[0].invoice_id, '001');
  assert.equal(result.invoices[0].customer_key, '0007');
});

test('rejects overlapping records across files before producing partial output', () => {
  const first = fixtureText.split('\n').slice(0, 3).join('\n');
  const duplicate = fixtureText.split('\n').slice(0, 2).concat(fixtureText.split('\n')[2]).join('\n');
  assert.throws(
    () => normalizeInvoiceCsvFiles([
      { name: 'first.csv', text: first },
      { name: 'duplicate.csv', text: duplicate },
    ]),
    /overlapping duplicate|duplicate source record/,
  );
});

test('rejects malformed quotes, widths, dates, decimals, quantities, and reconciliation', () => {
  const cases = [
    ['malformed quote', fixtureText.replace('"item,blue"', '"item,blue')],
    ['invalid width', fixtureText.replace('SYN-100-1,SYN-LINE-1', 'SYN-100-1')],
    ['impossible date', fixtureText.replace('2026-05-01', '2026-02-29')],
    ['malformed decimal', fixtureText.replace('200.00', '2x')],
    ['negative quantity', fixtureText.replace(',2,200.00', ',-2,200.00')],
    ['subtotal mismatch', fixtureText.replace('250.00,SYN-100-1', '251.00,SYN-100-1')],
  ];
  for (const [label, text] of cases) {
    assert.throws(() => normalizeInvoiceCsvFiles([{ name: `${label}.csv`, text }]), label);
  }
});

test('rejects missing and duplicate mapped headers', () => {
  assert.throws(
    () => normalizeInvoiceCsvFiles([{ name: 'missing.csv', text: fixtureText.replace('Invoice Subtotal', 'Subtotal') }]),
    /missing required header/,
  );
  assert.throws(
    () => normalizeInvoiceCsvFiles([{ name: 'duplicate.csv', text: fixtureText }], {
      headers: { invoiceId: 'Invoice ID', customerId: 'Invoice ID' },
    }),
    /duplicate mapped header/,
  );
});
