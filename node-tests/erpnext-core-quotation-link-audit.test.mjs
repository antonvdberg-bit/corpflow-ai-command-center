import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LINK_CLASSIFICATIONS,
  auditCoreQuotationLinks,
} from '../scripts/erpnext/audit-core-quotation-links.mjs';

function readerFrom(rows, options = {}) {
  return async (_doctype, query) => {
    if (options.error) return { ok: false, http: 403, error: options.error };
    if (options.partial) return { ok: true, rows, hasMore: true };
    return {
      ok: true,
      rows: query.limitStart ? [] : rows,
      hasMore: false,
    };
  };
}

function erpClientFrom(rows, options = {}) {
  return {
    async list(_doctype, query) {
      if (options.error) return { ok: false, http: 403, error: options.error };
      if (options.partial) return { ok: true, rows, hasMore: true };
      return { ok: true, rows: query.limitStart ? [] : rows, hasMore: false };
    },
    async create() {
      throw new Error('audit must never create');
    },
    async update() {
      throw new Error('audit must never update');
    },
  };
}

test('durable stable pointer resolves without fuzzy name matching', async () => {
  const result = await auditCoreQuotationLinks({
    leadReader: readerFrom([
      {
        id: 'core-real-001',
        qualification_json: {
          erpnext: {
            schema: 'corpflow.qualification.erpnext.v1',
            bridge: 'quotation_invoice',
            lead_id: 'core-real-001',
            erpnext_quotation: 'SAL-QTN-2026-00111',
          },
        },
      },
    ]),
    erpClient: erpClientFrom([
      {
        name: 'SAL-QTN-2026-00111',
        title: 'Approved quote | lead=core-real-001',
        party_name: 'Client One',
        docstatus: 0,
      },
    ]),
  });
  assert.equal(result.ok, true);
  assert.equal(result.counts.VERIFIED_EXISTING_LINK, 1);
  assert.equal(result.private_artifact.proposed_link_tuples[0].erpnext_quotation, 'SAL-QTN-2026-00111');
});

test('invalid, dangling, conflicting, synthetic, and ERP-only records never pass', async () => {
  const result = await auditCoreQuotationLinks({
    leadReader: readerFrom([
      {
        id: 'core-dangling',
        qualification_json: { erpnext: { lead_id: 'core-dangling', erpnext_quotation: 'SAL-QTN-2026-00112' } },
      },
      {
        id: 'core-invalid',
        qualification_json: { erpnext: { erpnext_quotation: 'not safe' } },
      },
      {
        id: 'core-conflict',
        qualification_json: { erpnext: { lead_id: 'different-lead', erpnext_quotation: 'SAL-QTN-2026-00113' } },
      },
    ]),
    erpClient: erpClientFrom([
      { name: 'SAL-QTN-2026-00113', title: 'quote | lead=core-conflict' },
      { name: 'SAL-QTN-2026-00114', title: 'TEST-ONLY DO NOT SEND | lead=cf1018-synthetic-sales-lifecycle' },
      { name: 'SAL-QTN-2026-00115', title: 'quote for an ERP-only customer' },
    ]),
  });
  assert.equal(result.ok, true);
  assert.ok(result.counts.DANGLING_REFERENCE >= 1);
  assert.ok(result.counts.CORE_REFERENCE_WITHOUT_ERP_RECORD >= 1);
  assert.ok(result.counts.CONFLICTING_REFERENCE >= 1);
  assert.ok(result.counts.TEST_ONLY_REFERENCE >= 1);
  assert.ok(result.counts.ERP_RECORD_WITHOUT_CORE_LINK >= 1);
  assert.equal(result.counts.VERIFIED_EXISTING_LINK, 0);
});

test('read access failure is explicit and never writes', async () => {
  const result = await auditCoreQuotationLinks({
    leadReader: readerFrom([], { error: 'CORE_FORBIDDEN' }),
    erpClient: erpClientFrom([]),
  });
  assert.equal(result.ok, false);
  assert.equal(result.classifications[0].classification, 'ACCESS_BLOCKED');
});

test('exhausted page limits are PARTIAL, not PASS', async () => {
  const result = await auditCoreQuotationLinks({
    leadReader: readerFrom([{ id: 'core-real-001' }], { partial: true }),
    erpClient: erpClientFrom([], { partial: true }),
    limits: { corePageSize: 1, erpPageSize: 1, maxPages: 1 },
  });
  assert.equal(result.ok, false);
  assert.equal(result.counts.PARTIAL_SCAN, 1);
  assert.ok(LINK_CLASSIFICATIONS.includes('PARTIAL_SCAN'));
});
