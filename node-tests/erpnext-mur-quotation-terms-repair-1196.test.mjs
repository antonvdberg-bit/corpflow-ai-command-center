import assert from 'node:assert/strict';
import test from 'node:test';

import {
  QUOTATION_NAME,
  TERMS_NAME,
  assess1196Repair,
} from '../lib/erpnext/mur-quotation-terms-repair-1196.js';

test('#1196 identifies missing quotation terms and prepares one-field repair payload', () => {
  const result = assess1196Repair({
    quotation: {
      name: QUOTATION_NAME,
      docstatus: 0,
      tc_name: TERMS_NAME,
      terms: null,
    },
    termsMaster: {
      name: TERMS_NAME,
      terms: '<p>Approved terms</p>',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.already_repaired, false);
  assert.deepEqual(result.repair_payload, { terms: '<p>Approved terms</p>' });
});

test('#1196 becomes idempotent when quotation terms already match the approved master', () => {
  const result = assess1196Repair({
    quotation: {
      name: QUOTATION_NAME,
      docstatus: 0,
      tc_name: TERMS_NAME,
      terms: '<p>Approved terms</p>',
    },
    termsMaster: {
      name: TERMS_NAME,
      terms: '<p>Approved terms</p>',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.already_repaired, true);
});

test('#1196 fails closed for wrong quotation, submitted document, wrong terms master name, or empty master body', () => {
  for (const input of [
    {
      quotation: { name: 'OTHER', docstatus: 0, tc_name: TERMS_NAME, terms: null },
      termsMaster: { terms: '<p>Approved terms</p>' },
    },
    {
      quotation: { name: QUOTATION_NAME, docstatus: 1, tc_name: TERMS_NAME, terms: null },
      termsMaster: { terms: '<p>Approved terms</p>' },
    },
    {
      quotation: { name: QUOTATION_NAME, docstatus: 0, tc_name: 'OTHER', terms: null },
      termsMaster: { terms: '<p>Approved terms</p>' },
    },
    {
      quotation: { name: QUOTATION_NAME, docstatus: 0, tc_name: TERMS_NAME, terms: null },
      termsMaster: { terms: '' },
    },
  ]) {
    const result = assess1196Repair(input);
    assert.equal(result.ok, false);
    assert.equal(result.repair_payload, null);
  }
});
