import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const TEMPLATE_DIR = path.join(process.cwd(), 'docs/product/product-a-csv-templates');

const LEADS_HEADERS = [
  'received_at',
  'status',
  'clinic_name',
  'website',
  'contact_name',
  'email',
  'phone',
  'city_state',
  'biggest_problem',
  'source',
  'audit_call_at',
  'notes',
  'next_action',
];

const PROSPECT_HEADERS = [
  'clinic_name',
  'website',
  'city_state',
  'contact_name',
  'email',
  'phone',
  'biggest_problem',
  'prospect_status',
  'source',
  'notes',
  'next_action',
];

function parseCsvHeader(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  const firstLine = raw.split(/\r?\n/)[0];
  return firstLine.split(',').map((h) => h.trim());
}

describe('Product A CSV templates', () => {
  it('leads template has canonical header row', () => {
    const headers = parseCsvHeader(path.join(TEMPLATE_DIR, 'product-a-us-clinic-leads-template.csv'));
    assert.deepEqual(headers, LEADS_HEADERS);
  });

  it('Florida prospect batch sample has canonical header row', () => {
    const headers = parseCsvHeader(path.join(TEMPLATE_DIR, 'product-a-florida-prospect-batch-sample.csv'));
    assert.deepEqual(headers, PROSPECT_HEADERS);
  });

  it('Florida sample uses example.invalid domains only', () => {
    const raw = fs.readFileSync(path.join(TEMPLATE_DIR, 'product-a-florida-prospect-batch-sample.csv'), 'utf8');
    assert.match(raw, /example\.invalid/);
    assert.doesNotMatch(raw, /@gmail\.com|@yahoo\.com/);
  });
});
