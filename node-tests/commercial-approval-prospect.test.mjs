/**
 * #551 commercial clearance on Prospect detail — focused tests.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { handleAppProspectDetail } from '../lib/app/handlers.js';
import {
  applySharedProspectOperatorPatch,
  assertProspectPatchNotProtected,
} from '../lib/app/prospect-operations-detail.js';
import {
  fixtureProspectLeadRows,
  projectProspectDetail,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import { RAPID_DELIVERY_PRODUCT } from '../lib/cmp/_lib/rapid-delivery-operator.js';
import {
  applyCommercialEvidencePatch,
  assertCommercialApprovalPatchSafe,
  projectCommercialClearanceFromQualification,
} from '../lib/revenue/commercial-approval-record.js';
import { evaluateFinancialApprovalGate } from '../lib/revenue/commercial-approval.js';

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

afterEach(() => {
  resetProspectFixtureStore();
});

describe('#551 commercial clearance on prospect JSON', { concurrency: false }, () => {
  it('Ada proof fixture is quote-accepted but not commercially cleared', () => {
    const ada = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-lr-ada');
    const detail = projectProspectDetail(ada);
    assert.equal(detail.commercial_clearance.commercially_cleared, false);
    assert.equal(detail.commercial_clearance.clearance_label, 'NOT CLEARED');
    assert.equal(detail.commercial_clearance.proposal.erpnext_quotation, 'SAL-QTN-2026-00001');
    assert.equal(detail.commercial_clearance.acceptance.status, 'accepted');
    assert.ok(detail.commercial_clearance.blockers.includes('MISSING_PAYMENT_EVIDENCE'));
    assert.equal(detail.commercial_clearance.payment_executed, false);
    assert.equal(Object.prototype.hasOwnProperty.call(detail, 'qualificationJson'), false);
  });

  it('Website Rescue empty rail is visible and not fabricated as paid', () => {
    const bea = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-rd-bea');
    const detail = projectProspectDetail(bea);
    assert.equal(bea.qualificationJson.commercial_approval == null, true);
    assert.equal(detail.commercial_clearance.commercially_cleared, false);
    assert.ok(detail.commercial_clearance.blockers.includes('MISSING_PROPOSAL'));
    assert.equal(detail.commercial_clearance.payment_evidence.evidence_ref, null);
  });

  it('recording payment evidence + named approver clears the #714 gate', () => {
    const ada = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-lr-ada');
    const applied = applySharedProspectOperatorPatch(
      ada,
      {
        commercial_approval: {
          payment_evidence_status: 'verified',
          payment_evidence_type: 'bank_transfer_reference',
          payment_evidence_ref: 'PAY-EV-SYN-551-ADA',
          payment_evidence_amount: 150,
          payment_evidence_currency: 'USD',
          record_financial_approval: true,
          approved_by: 'Anton (operator financial approver)',
        },
      },
      { actorLabel: 'anton', nowIso: '2026-08-24T09:30:00.000Z' },
    );
    assert.equal(applied.ok, true);
    const record = applied.row.qualificationJson.commercial_approval;
    const gate = evaluateFinancialApprovalGate(record);
    assert.equal(gate.ok, true);
    assert.equal(record.financially_approved, true);
    assert.equal(record.payment_executed, false);
    const detail = projectProspectDetail(applied.row);
    assert.equal(detail.commercial_clearance.commercially_cleared, true);
    assert.equal(detail.commercial_clearance.clearance_label, 'CLEARED TO BUILD');
    assert.equal(detail.commercial_clearance.payment_evidence.evidence_ref, 'PAY-EV-SYN-551-ADA');
    assert.equal(detail.owner, 'anton');
  });

  it('does not fabricate financially_approved when payment evidence is missing', () => {
    const ada = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-lr-ada');
    const applied = applySharedProspectOperatorPatch(
      ada,
      {
        commercial_approval: {
          financially_approved: true,
          record_financial_approval: true,
          approved_by: 'Anton',
        },
      },
      { actorLabel: 'anton', nowIso: '2026-08-24T09:31:00.000Z' },
    );
    assert.equal(applied.ok, true);
    const record = applied.row.qualificationJson.commercial_approval;
    assert.equal(record.financially_approved, false);
    assert.ok(evaluateFinancialApprovalGate(record).blockers.includes('MISSING_PAYMENT_EVIDENCE'));
  });

  it('rejects payment execution and secret-like fields', () => {
    assert.equal(assertProspectPatchNotProtected({ payment_execute: true }).ok, false);
    assert.equal(assertCommercialApprovalPatchSafe({ payment_execute: true }).error, 'PROTECTED_ACTION_BLOCKED');
    assert.equal(
      assertCommercialApprovalPatchSafe({ bank_account_number: '123456' }).error,
      'FORBIDDEN_SENSITIVE_FIELD',
    );
    const ada = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-lr-ada');
    const blocked = applySharedProspectOperatorPatch(ada, {
      commercial_approval: { send_invoice: true, payment_evidence_ref: 'x' },
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, 'PROTECTED_ACTION_BLOCKED');
  });

  it('Website Rescue can record ERPNext quotation refs onto empty JSON', () => {
    const bea = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-rd-bea');
    const applied = applySharedProspectOperatorPatch(
      bea,
      {
        commercial_approval: {
          erpnext_quotation: 'SAL-QTN-2026-00003',
          erpnext_sales_invoice: 'ACC-SINV-2026-00001',
          proposal_status: 'draft',
          quoted_currency: 'MUR',
          setup_price: 45000,
          payment_terms: 'full_upfront',
          scope_summary: 'Website Rescue landing-page rescue. Synthetic proof only.',
        },
      },
      { actorLabel: 'anton', nowIso: '2026-08-24T09:32:00.000Z' },
    );
    assert.equal(applied.ok, true);
    const detail = projectProspectDetail(applied.row);
    assert.equal(detail.product, RAPID_DELIVERY_PRODUCT);
    assert.equal(detail.commercial_clearance.product, 'website-rescue');
    assert.equal(detail.commercial_clearance.proposal.erpnext_quotation, 'SAL-QTN-2026-00003');
    assert.equal(detail.commercial_clearance.proposal.version, 'SAL-QTN-2026-00003');
    assert.equal(detail.commercial_clearance.commercially_cleared, false);
  });

  it('proof GET exposes clearance without leaking qualificationJson', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    try {
      const res = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada', headers: {} },
        res,
      );
      assert.equal(res.state.statusCode, 200);
      assert.equal(res.state.body.prospect.commercial_clearance.commercially_cleared, false);
      assert.equal(res.state.body.prospect.commercial_clearance.proposal.erpnext_quotation, 'SAL-QTN-2026-00001');
      assert.equal(JSON.stringify(res.state.body).includes('qualificationJson'), false);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  });

  it('proof PATCH records payment evidence and returns CLEARED TO BUILD', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    try {
      const patchRes = mockRes();
      await handleAppProspectDetail(
        {
          method: 'PATCH',
          url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada',
          headers: {},
          body: {
            id: 'syn-772-lr-ada',
            commercial_approval: {
              payment_evidence_status: 'recorded',
              payment_evidence_type: 'proforma_marked_paid_operator',
              payment_evidence_ref: 'PAY-EV-SYN-551-PROOF',
              payment_evidence_amount: 150,
              record_financial_approval: true,
              approved_by: 'Anton (operator financial approver)',
            },
          },
        },
        patchRes,
      );
      assert.equal(patchRes.state.statusCode, 200);
      assert.equal(patchRes.state.body.prospect.commercial_clearance.commercially_cleared, true);
      assert.equal(patchRes.state.body.prospect.commercial_clearance.clearance_label, 'CLEARED TO BUILD');
      assert.equal(patchRes.state.body.external_send, false);

      const getRes = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada', headers: {} },
        getRes,
      );
      assert.equal(getRes.state.body.prospect.commercial_clearance.payment_evidence.evidence_ref, 'PAY-EV-SYN-551-PROOF');
      assert.equal(getRes.state.body.prospect.commercial_clearance.commercially_cleared, true);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  });

  it('ERPNext quotation stub never flips financially_approved by itself', () => {
    const record = applyCommercialEvidencePatch(null, {
      product: 'lead-rescue',
      erpnext_quotation: 'SAL-QTN-2026-00001',
      proposal_status: 'draft',
      quoted_currency: 'USD',
      setup_price: 150,
      payment_terms: 'pilot_full_upfront',
      scope_summary: 'Pilot',
    });
    assert.equal(record.proposal_version, 'SAL-QTN-2026-00001');
    assert.equal(record.financially_approved, false);
    const projected = projectCommercialClearanceFromQualification(
      { commercial_approval: record },
      { product: 'ai-lead-rescue' },
    );
    assert.equal(projected.commercially_cleared, false);
  });

  it('Prospect detail UI includes the commercial clearance panel', () => {
    const panel = readFileSync(new URL('../components/app/ProspectDetailPanel.js', import.meta.url), 'utf8');
    const form = readFileSync(new URL('../components/app/CommercialClearancePanel.js', import.meta.url), 'utf8');
    assert.match(panel, /CommercialClearancePanel/);
    assert.match(form, /data-testid="commercial-clearance"/);
    assert.match(form, /Save commercial evidence/);
    assert.doesNotMatch(form, /payment_execute/);
  });
});
