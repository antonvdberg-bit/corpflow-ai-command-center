/**
 * #1177 Commercial Workspace → ERPNext quotation evidence live usability.
 * Deterministic. No live ERPNext write. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  actorFromSessionPayload,
  buildProofTenantActor,
  isProofModeAllowed,
} from '../lib/app/access.js';
import {
  loadCommercialQuotationEvidence,
  quotationNameFromCommercialRow,
} from '../lib/app/commercial-quotation-evidence.js';
import { projectCommercialRowsFromLeads } from '../lib/app/commercial-summary.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import { handleAppCommercialQuotation } from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { isStableQuotationName } from '../lib/erpnext/quotation-evidence.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function mockRes() {
  /** @type {{ statusCode: number, body: any }} */
  const state = { statusCode: 0, body: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
  };
}

describe('Commercial quotation evidence acceptance #1177', { concurrency: false }, () => {
  test('Ada proof row is the recorded quotation used for this packet', async () => {
    resetProspectFixtureStore();
    const loaded = await loadCommercialQuotationEvidence({ id: 'syn-772-lr-ada', proofMode: true });
    assert.equal(loaded.ok, true);
    assert.equal(loaded.evidence.name, 'SAL-QTN-2026-00001');
    assert.equal(loaded.evidence.docstatus, 0);
    assert.equal(loaded.evidence.status, 'Draft');
    assert.equal(loaded.evidence.mutated, false);
    assert.equal(loaded.evidence.copied_to_postgres, false);
    resetProspectFixtureStore();
  });

  test('missing and invented commercial rows never fabricate an ERPNext id', async () => {
    resetProspectFixtureStore();
    const bea = await loadCommercialQuotationEvidence({ id: 'syn-772-rd-bea', proofMode: true });
    assert.equal(bea.ok, false);
    assert.equal(bea.error, 'quotation_reference_missing');
    assert.equal(bea.evidence, undefined);

    const missing = await loadCommercialQuotationEvidence({
      id: 'invented-commercial-row',
      proofMode: true,
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, 'commercial_row_not_found');

    const emptyLeads = projectCommercialRowsFromLeads([
      { id: 'live-lead-without-quote', organisation_name: 'No Quote Ltd', qualificationJson: {} },
    ]);
    assert.equal(quotationNameFromCommercialRow(emptyLeads[0]), '');
    assert.equal(emptyLeads[0].quotation_evidence_path, null);
    assert.equal(isStableQuotationName('../Quotation'), false);
    resetProspectFixtureStore();
  });

  test('Tenant remains fail-closed on quotation evidence', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const res = mockRes();
      await handleAppCommercialQuotation(
        {
          method: 'GET',
          url: '/api/app/commercial-quotation?env=core&id=syn-772-lr-ada',
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        res,
      );
      assert.equal(res.state.statusCode, 403);
      assert.equal(res.state.body.error, 'core_access_denied');

      const liveTenant = mockRes();
      await handleAppCommercialQuotation(
        {
          method: 'GET',
          url: '/api/app/commercial-quotation?env=core&id=syn-772-lr-ada',
          headers: {},
          __testAppActor: actorFromSessionPayload({
            typ: 'tenant',
            tenant_id: REFERENCE_TENANT_ID,
            username: 'tenant-user',
          }),
        },
        liveTenant,
      );
      assert.equal(liveTenant.state.statusCode, 403);
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  test('Production spine rejects the proof harness', () => {
    assert.equal(isProofModeAllowed({ vercelEnv: 'production', nodeEnv: 'production' }), false);
  });

  test('acceptance doc names the live pointer blocker and non-actions', () => {
    const doc = readFileSync(
      join(root, 'docs/erpnext/ERPNEXT_COMMERCIAL_QUOTATION_EVIDENCE_ACCEPTANCE_1177.md'),
      'utf8',
    );
    assert.match(doc, /SAL-QTN-2026-00001/);
    assert.match(doc, /\/app\/commercial\/syn-772-lr-ada/);
    assert.match(doc, /b731411734edb01b7dbb8d7e20247c5a7805983a/);
    assert.match(doc, /no recorded ERPNext Quotation id/);
    assert.match(doc, /No ERPNext write/);
    assert.equal(doc.includes('ERPNEXT_API_SECRET'), false);
  });
});
