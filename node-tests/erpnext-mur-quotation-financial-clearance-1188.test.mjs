/**
 * #1188 — ERPNext MUR quotation → financial-clearance operator journey.
 *
 * Reuses the existing CF1018 synthetic MUR Quotation SAL-QTN-2026-00005.
 * Proof / fixture only. No ERPNext write, no Postgres mutation, no send, no payment.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
import {
  loadCommercialQuotationEvidence,
  loadCommercialQuotationPdf,
  quotationNameFromCommercialRow,
} from '../lib/app/commercial-quotation-evidence.js';
import { fixtureCommercialRecords } from '../lib/app/commercial-summary.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppCommercial,
  handleAppCommercialQuotation,
  handleAppCommercialQuotationPdf,
  handleAppProspectDetail,
} from '../lib/app/handlers.js';
import {
  applySharedProspectOperatorPatch,
} from '../lib/app/prospect-operations-detail.js';
import {
  fixtureProspectLeadRows,
  projectProspectDetail,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import { RAPID_DELIVERY_PRODUCT } from '../lib/cmp/_lib/rapid-delivery-operator.js';
import {
  invoiceDoesNotGrantProceedApproved,
  loadSellingQuoteToCashConfig,
} from '../lib/erpnext/selling-quote-to-cash.js';
import { evaluateFinancialApprovalGate } from '../lib/revenue/commercial-approval.js';
import { readCommercialApprovalFromQualification } from '../lib/revenue/commercial-approval-record.js';

const NOW = new Date('2026-08-27T16:00:00.000Z');
const CF1018_ID = 'cf1018-synthetic-sales-lifecycle';
const MUR_QUOTATION = 'SAL-QTN-2026-00005';
const PIA_ID = 'syn-1151-wr-tenant-progress';
const EXPECTED_MISSING = [
  'MISSING_ACCEPTANCE',
  'MISSING_PAYMENT_EVIDENCE',
  'MISSING_FINANCIAL_APPROVER',
  'MISSING_APPROVAL_TIMESTAMP',
];

function mockRes() {
  /** @type {{ statusCode: number, body: any, headers: Record<string, string> }} */
  const state = { statusCode: 0, body: null, headers: {} };
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
    setHeader(name, value) {
      state.headers[String(name).toLowerCase()] = String(value);
      return this;
    },
    end(buf) {
      state.body = buf;
      return this;
    },
  };
}

afterEach(() => {
  resetProspectFixtureStore();
});

describe('#1188 MUR quotation → financial-clearance journey', { concurrency: false }, () => {
  test('CF1018 is the unique Commercial row for the existing MUR quotation', () => {
    const cfg = loadSellingQuoteToCashConfig();
    assert.equal(cfg.live_proof.erpnext_quotation, MUR_QUOTATION);
    assert.equal(cfg.live_proof.currency, 'MUR');
    assert.equal(cfg.live_proof.grand_total, 45000);

    const commercial = fixtureCommercialRecords(NOW);
    const owners = commercial.filter((row) => quotationNameFromCommercialRow(row) === MUR_QUOTATION);
    assert.equal(owners.length, 1);
    assert.equal(owners[0].id, CF1018_ID);
    assert.equal(owners[0].prospect_id, CF1018_ID);
    assert.equal(owners[0].product, 'website-rescue');
    assert.equal(owners[0].quotation_evidence_path, `/app/commercial/${CF1018_ID}`);
    assert.equal(owners[0].shared_detail_path, `/app/prospects/${CF1018_ID}`);
    assert.equal(owners[0].financially_approved, false);
    assert.equal(owners[0].commercial_state, 'awaiting_acceptance');
    assert.equal(owners[0].erpnext.sales_invoice, null);
    assert.equal(owners[0].erpnext.mutated, false);
    assert.equal(owners[0].payment_processed, false);
    assert.equal(owners[0].external_send, false);
    for (const code of EXPECTED_MISSING) {
      assert.ok(owners[0].blockers.includes(code), `missing ${code}`);
    }
    assert.equal(owners[0].blockers.includes('MISSING_PROPOSAL'), false);

    const pia = commercial.find((row) => row.id === PIA_ID);
    assert.ok(pia);
    assert.notEqual(quotationNameFromCommercialRow(pia), MUR_QUOTATION);
    assert.equal(pia.quotation_evidence_path, null);
  });

  test('Prospect commercial clearance shows exact missing financial evidence and does not infer payment', () => {
    const lead = fixtureProspectLeadRows(NOW).find((row) => row.id === CF1018_ID);
    assert.ok(lead);
    assert.equal(lead.qualificationJson.erpnext.erpnext_quotation, MUR_QUOTATION);
    assert.equal(lead.qualificationJson.erpnext.quotation_idempotency_key, `corpflow.selling_q2c.v1:lead=${CF1018_ID}`);

    const detail = projectProspectDetail(lead, NOW);
    assert.equal(detail.product, RAPID_DELIVERY_PRODUCT);
    const clearance = detail.commercial_clearance;
    assert.equal(clearance.commercially_cleared, false);
    assert.equal(clearance.financially_approved, false);
    assert.equal(clearance.clearance_label, 'NOT CLEARED');
    assert.equal(clearance.proposal.erpnext_quotation, MUR_QUOTATION);
    assert.equal(clearance.proposal.currency, 'MUR');
    assert.equal(clearance.proposal.setup_price, 45000);
    assert.equal(clearance.proposal.erpnext_sales_invoice, null);
    assert.equal(clearance.acceptance.status, 'pending');
    assert.equal(clearance.payment_evidence.status, 'pending');
    assert.equal(clearance.payment_evidence.evidence_ref, null);
    assert.equal(clearance.financial_approval.approved_by, null);
    assert.equal(clearance.payment_executed, false);
    assert.equal(clearance.protected_actions_executed, false);
    assert.match(String(clearance.next_required), /accepted|acceptance/i);
    for (const code of EXPECTED_MISSING) {
      assert.ok(clearance.blockers.includes(code), `clearance missing ${code}`);
    }

    const rail = evaluateFinancialApprovalGate(readCommercialApprovalFromQualification(lead.qualificationJson));
    assert.equal(rail.ok, false);
    assert.equal(rail.financially_approved, false);
  });

  test('proof quotation evidence/status/PDF replay the same MUR reference without mutation', async () => {
    resetProspectFixtureStore();
    const first = await loadCommercialQuotationEvidence({ id: CF1018_ID, proofMode: true });
    const second = await loadCommercialQuotationEvidence({ id: CF1018_ID, proofMode: true });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(first.evidence.name, MUR_QUOTATION);
    assert.equal(second.evidence.name, MUR_QUOTATION);
    assert.equal(first.evidence.currency, 'MUR');
    assert.equal(first.evidence.grand_total, 45000);
    assert.equal(first.evidence.docstatus, 0);
    assert.equal(first.evidence.status, 'Draft');
    assert.equal(first.evidence.customer, 'CF1018 Synthetic Sales Lifecycle Ltd');
    assert.equal(first.evidence.mutated, false);
    assert.equal(first.evidence.copied_to_postgres, false);
    assert.equal(first.row.quotation_evidence_path, `/app/commercial/${CF1018_ID}`);
    assert.equal(first.row.shared_detail_path, `/app/prospects/${CF1018_ID}`);

    const pdfFirst = await loadCommercialQuotationPdf({ id: CF1018_ID, proofMode: true });
    const pdfSecond = await loadCommercialQuotationPdf({ id: CF1018_ID, proofMode: true });
    assert.equal(pdfFirst.ok, true);
    assert.equal(pdfSecond.ok, true);
    assert.equal(pdfFirst.quotation, MUR_QUOTATION);
    assert.equal(pdfSecond.quotation, MUR_QUOTATION);
    assert.equal(pdfFirst.isPdf, true);
    assert.equal(pdfFirst.bytes.subarray(0, 5).toString('utf8'), '%PDF-');
  });

  test('Proceed Approved stays fail-closed even if a draft invoice name is present', () => {
    const lead = fixtureProspectLeadRows(NOW).find((row) => row.id === CF1018_ID);
    const applied = applySharedProspectOperatorPatch(
      lead,
      {
        commercial_approval: {
          erpnext_sales_invoice: 'ACC-SINV-2026-00001',
          record_financial_approval: true,
          approved_by: 'Anton',
        },
      },
      { actorLabel: 'anton', nowIso: '2026-08-27T16:05:00.000Z' },
    );
    assert.equal(applied.ok, true);
    const record = applied.row.qualificationJson.commercial_approval;
    assert.equal(record.erpnext_quotation, MUR_QUOTATION);
    assert.equal(record.financially_approved, false);
    const gate = evaluateFinancialApprovalGate(record);
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.includes('MISSING_ACCEPTANCE'));
    assert.ok(gate.blockers.includes('MISSING_PAYMENT_EVIDENCE'));

    const invoiceGate = invoiceDoesNotGrantProceedApproved(
      { name: 'ACC-SINV-2026-00001', docstatus: 0, currency: 'MUR', grand_total: 45000 },
      { product: 'website-rescue' },
    );
    assert.equal(invoiceGate.ok, true);
    assert.equal(invoiceGate.financially_approved, false);
    assert.equal(invoiceGate.erpnext_never_sets_financially_approved, true);
  });

  test('handlers expose the exact route sequence and keep Tenant fail-closed', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    resetProspectFixtureStore();
    try {
      const listRes = mockRes();
      await handleAppCommercial(
        { method: 'GET', url: '/api/app/commercial?proof=1&env=core&filter=all', headers: {} },
        listRes,
      );
      assert.equal(listRes.state.statusCode, 200);
      const row = listRes.state.body.rows.find((item) => item.id === CF1018_ID);
      assert.ok(row);
      assert.equal(row.erpnext.quotation, MUR_QUOTATION);
      assert.equal(row.quotation_evidence_path, `/app/commercial/${CF1018_ID}`);
      assert.equal(row.shared_detail_path, `/app/prospects/${CF1018_ID}`);
      assert.equal(row.financially_approved, false);
      assert.equal(listRes.state.body.erpnext_mutated, false);
      assert.equal(listRes.state.body.payment_processed, false);

      const qtnRes = mockRes();
      await handleAppCommercialQuotation(
        {
          method: 'GET',
          url: `/api/app/commercial-quotation?proof=1&env=core&id=${CF1018_ID}`,
          headers: {},
        },
        qtnRes,
      );
      assert.equal(qtnRes.state.statusCode, 200);
      assert.equal(qtnRes.state.body.quotation.name, MUR_QUOTATION);
      assert.equal(qtnRes.state.body.quotation.currency, 'MUR');
      assert.equal(qtnRes.state.body.back.prospect, `/app/prospects/${CF1018_ID}?proof=1`);
      assert.equal(qtnRes.state.body.erpnext_mutated, false);

      const pdfRes = mockRes();
      await handleAppCommercialQuotationPdf(
        {
          method: 'GET',
          url: `/api/app/commercial-quotation-pdf?proof=1&env=core&id=${CF1018_ID}`,
          headers: {},
        },
        pdfRes,
      );
      assert.equal(pdfRes.state.statusCode, 200);
      assert.equal(pdfRes.state.headers['content-type'], 'application/pdf');

      const prospectRes = mockRes();
      await handleAppProspectDetail(
        {
          method: 'GET',
          url: `/api/app/prospect?proof=1&env=core&id=${CF1018_ID}`,
          headers: {},
        },
        prospectRes,
      );
      assert.equal(prospectRes.state.statusCode, 200);
      assert.equal(prospectRes.state.body.prospect.commercial_clearance.clearance_label, 'NOT CLEARED');
      assert.equal(prospectRes.state.body.prospect.commercial_clearance.proposal.erpnext_quotation, MUR_QUOTATION);
      assert.equal(JSON.stringify(prospectRes.state.body).includes('qualificationJson'), false);

      process.env.NODE_ENV = 'test';
      const tenantList = mockRes();
      await handleAppCommercial(
        {
          method: 'GET',
          url: `/api/app/commercial?env=core&filter=all`,
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        tenantList,
      );
      assert.equal(tenantList.state.statusCode, 403);
      assert.equal(tenantList.state.body.error, 'core_access_denied');

      const tenantQtn = mockRes();
      await handleAppCommercialQuotation(
        {
          method: 'GET',
          url: `/api/app/commercial-quotation?env=core&id=${CF1018_ID}`,
          headers: {},
          __testAppActor: actorFromSessionPayload({
            typ: 'tenant',
            tenant_id: REFERENCE_TENANT_ID,
            username: 'tenant-user',
          }),
        },
        tenantQtn,
      );
      assert.equal(tenantQtn.state.statusCode, 403);
      assert.equal(tenantQtn.state.body.error, 'core_access_denied');
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      resetProspectFixtureStore();
    }
  });
});
