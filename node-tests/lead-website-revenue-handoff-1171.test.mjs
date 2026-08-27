/**
 * #1171 — Lead Rescue / Website Rescue enquiry → Prospect → Commercial continuity.
 *
 * Synthetic / proof fixtures only. No live enquiry, send, payment, schema, or ERPNext write.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
import { fixtureCommercialRecords } from '../lib/app/commercial-summary.js';
import { quotationNameFromCommercialRow } from '../lib/app/commercial-quotation-evidence.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppActionQueue,
  handleAppCommercial,
  handleAppProspectDetail,
  handleAppWorkbench,
} from '../lib/app/handlers.js';
import {
  filterProspectsForActionQueue,
  fixtureProspectLeadRows,
  projectProspectDetail,
  projectProspectLeadRows,
  projectProspectWorkbenchRows,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import {
  AI_LEAD_RESCUE_DEFAULT_NEXT_ACTION,
  AI_LEAD_RESCUE_PRODUCT,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../lib/cmp/_lib/rapid-delivery-operator.js';
import {
  detectProspectProduct,
  isLabelledLeadRescueEnquiry,
  leadRowToProspectViewModel,
  matchesWorkbenchFilter,
} from '../lib/cmp/_lib/prospect-operations-view-model.js';
import { recommendedMarketEnquiryNextAction } from '../lib/public/corpflow-market-service-paths.js';
import { productForCommercialRail } from '../lib/revenue/commercial-approval-record.js';

const NOW = new Date('2026-08-27T12:00:00.000Z');
const LR_ID = 'syn-1171-lr-enquiry';
const WR_ID = 'syn-1171-wr-enquiry';
const ADA_ID = 'syn-772-lr-ada';
const WREN_ID = 'syn-716-wr-cleared';

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

function rowById(id) {
  return fixtureProspectLeadRows(NOW).find((row) => row.id === id);
}

afterEach(() => {
  resetProspectFixtureStore();
});

describe('#1171 labelled enquiry → canonical Prospect identity', () => {
  it('Lead Rescue locked-offer fixture maps source, product, consent, urgency, next action', () => {
    const row = rowById(LR_ID);
    assert.ok(row);
    assert.equal(row.qualificationJson.intake_meta.product, RAPID_DELIVERY_PRODUCT);
    assert.equal(isLabelledLeadRescueEnquiry(row.qualificationJson), true);
    assert.equal(detectProspectProduct(row.qualificationJson), AI_LEAD_RESCUE_PRODUCT);

    const vm = leadRowToProspectViewModel(row, NOW);
    assert.equal(vm.id, LR_ID);
    assert.equal(vm.product, AI_LEAD_RESCUE_PRODUCT);
    assert.equal(vm.offer_slug, 'ai-lead-rescue');
    assert.equal(vm.product_service_path, 'ai-lead-rescue');
    assert.equal(vm.source, '/contact?offer=ai-lead-rescue');
    assert.equal(vm.consent_contact, true);
    assert.equal(vm.urgency, 'this-month');
    assert.equal(vm.next_action, AI_LEAD_RESCUE_DEFAULT_NEXT_ACTION);
    assert.equal(vm.organisation_name, 'Luca Lagoon Desk');
    assert.equal(vm.shared_detail_path, `/app/prospects/${LR_ID}`);
    assert.equal(vm.source_surfaces.action_queue, '/app/queue');
    assert.equal(matchesWorkbenchFilter(vm, 'lead_rescue', NOW), true);
    assert.equal(matchesWorkbenchFilter(vm, 'website_rescue', NOW), false);
    assert.equal(productForCommercialRail(vm.product), 'lead-rescue');
  });

  it('Website Rescue named-path fixture maps source, product, consent, urgency, next action', () => {
    const row = rowById(WR_ID);
    assert.ok(row);
    assert.equal(detectProspectProduct(row.qualificationJson), RAPID_DELIVERY_PRODUCT);
    assert.equal(isLabelledLeadRescueEnquiry(row.qualificationJson), false);

    const vm = leadRowToProspectViewModel(row, NOW);
    const expectedNext = recommendedMarketEnquiryNextAction({
      service_path: 'website-digital',
      offer_slug: 'premium-landing-page-rescue',
      urgency: 'asap',
      operator_status: 'new_intake',
    });
    assert.equal(vm.id, WR_ID);
    assert.equal(vm.product, RAPID_DELIVERY_PRODUCT);
    assert.equal(vm.offer_slug, 'premium-landing-page-rescue');
    assert.equal(vm.source, '/website-rescue');
    assert.equal(vm.consent_contact, true);
    assert.equal(vm.urgency, 'asap');
    assert.equal(vm.next_action, expectedNext);
    assert.equal(vm.organisation_name, 'Mira Pages Studio');
    assert.equal(vm.shared_detail_path, `/app/prospects/${WR_ID}`);
    assert.equal(matchesWorkbenchFilter(vm, 'website_rescue', NOW), true);
    assert.equal(matchesWorkbenchFilter(vm, 'lead_rescue', NOW), false);
    assert.equal(productForCommercialRail(vm.product), 'website-rescue');
  });
});

describe('#1171 Action Queue / Prospect detail / Commercial continuity', { concurrency: false }, () => {
  it('both fixtures open from Action Queue and Prospect detail without duplicate records', () => {
    const projected = projectProspectLeadRows(fixtureProspectLeadRows(NOW), NOW);
    const lrHits = projected.filter((row) => row.id === LR_ID);
    const wrHits = projected.filter((row) => row.id === WR_ID);
    assert.equal(lrHits.length, 1);
    assert.equal(wrHits.length, 1);

    const queue = filterProspectsForActionQueue(projected, 'needs_action', NOW);
    assert.equal(queue.filter((row) => row.id === LR_ID).length, 1);
    assert.equal(queue.filter((row) => row.id === WR_ID).length, 1);

    const workbench = projectProspectWorkbenchRows(fixtureProspectLeadRows(NOW), NOW);
    assert.equal(workbench.filter((row) => row.id === LR_ID).length, 1);
    assert.equal(workbench.filter((row) => row.id === WR_ID).length, 1);

    const lrDetail = projectProspectDetail(rowById(LR_ID), NOW);
    const wrDetail = projectProspectDetail(rowById(WR_ID), NOW);
    assert.equal(lrDetail.id, LR_ID);
    assert.equal(lrDetail.product, AI_LEAD_RESCUE_PRODUCT);
    assert.equal(lrDetail.consent_contact, true);
    assert.equal(lrDetail.commercial_clearance.commercially_cleared, false);
    assert.ok(lrDetail.commercial_clearance.blockers.includes('MISSING_PROPOSAL'));
    assert.equal(wrDetail.id, WR_ID);
    assert.equal(wrDetail.product, RAPID_DELIVERY_PRODUCT);
    assert.equal(wrDetail.consent_contact, true);
    assert.equal(wrDetail.commercial_clearance.commercially_cleared, false);
    assert.ok(wrDetail.commercial_clearance.blockers.includes('MISSING_PROPOSAL'));
    assert.equal(Object.prototype.hasOwnProperty.call(lrDetail, 'qualificationJson'), false);
  });

  it('Prospect → Commercial uses existing records; missing finance stays fail-closed; quotation refs stay visible', () => {
    const commercial = fixtureCommercialRecords(NOW);
    const lr = commercial.filter((row) => row.id === LR_ID || row.prospect_id === LR_ID);
    const wr = commercial.filter((row) => row.id === WR_ID || row.prospect_id === WR_ID);
    assert.equal(lr.length, 1);
    assert.equal(wr.length, 1);
    assert.equal(lr[0].product, 'lead-rescue');
    assert.equal(wr[0].product, 'website-rescue');
    assert.equal(lr[0].shared_detail_path, `/app/prospects/${LR_ID}`);
    assert.equal(wr[0].shared_detail_path, `/app/prospects/${WR_ID}`);
    assert.equal(lr[0].financially_approved, false);
    assert.equal(wr[0].financially_approved, false);
    assert.equal(lr[0].erpnext.quotation, null);
    assert.equal(wr[0].erpnext.quotation, null);
    assert.equal(lr[0].quotation_evidence_path, null);
    assert.ok(lr[0].blockers.includes('MISSING_PROPOSAL'));
    assert.ok(wr[0].blockers.includes('MISSING_PROPOSAL'));
    assert.equal(lr[0].erpnext.mutated, false);
    assert.equal(wr[0].payment_processed, false);
    assert.equal(wr[0].external_send, false);

    const ada = commercial.find((row) => row.id === ADA_ID);
    const wren = commercial.find((row) => row.id === WREN_ID);
    assert.equal(quotationNameFromCommercialRow(ada), 'SAL-QTN-2026-00001');
    assert.equal(ada.quotation_evidence_path, `/app/commercial/${ADA_ID}`);
    assert.equal(ada.product, 'lead-rescue');
    assert.equal(quotationNameFromCommercialRow(wren), 'SAL-QTN-2026-00004');
    assert.equal(wren.quotation_evidence_path, `/app/commercial/${WREN_ID}`);
    assert.equal(wren.product, 'website-rescue');
  });

  it('operator handlers expose the same ids on queue, detail, and commercial', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    resetProspectFixtureStore();
    try {
      const queueRes = mockRes();
      await handleAppActionQueue(
        { method: 'GET', url: '/api/app/queue?proof=1&env=core&filter=all', headers: {} },
        queueRes,
      );
      assert.equal(queueRes.state.statusCode, 200);
      const queueIds = queueRes.state.body.prospects.map((row) => row.id);
      assert.equal(queueIds.filter((id) => id === LR_ID).length, 1);
      assert.equal(queueIds.filter((id) => id === WR_ID).length, 1);

      const lrRes = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: `/api/app/prospect?proof=1&env=core&id=${LR_ID}`, headers: {} },
        lrRes,
      );
      assert.equal(lrRes.state.statusCode, 200);
      assert.equal(lrRes.state.body.prospect.id, LR_ID);
      assert.equal(lrRes.state.body.prospect.product, AI_LEAD_RESCUE_PRODUCT);
      assert.equal(lrRes.state.body.prospect.consent_contact, true);
      assert.equal(lrRes.state.body.external_send, false);

      const wrRes = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: `/api/app/prospect?proof=1&env=core&id=${WR_ID}`, headers: {} },
        wrRes,
      );
      assert.equal(wrRes.state.statusCode, 200);
      assert.equal(wrRes.state.body.prospect.id, WR_ID);
      assert.equal(wrRes.state.body.prospect.product, RAPID_DELIVERY_PRODUCT);

      const commercialRes = mockRes();
      await handleAppCommercial(
        { method: 'GET', url: '/api/app/commercial?proof=1&env=core&filter=all', headers: {} },
        commercialRes,
      );
      assert.equal(commercialRes.state.statusCode, 200);
      const commercialIds = commercialRes.state.body.rows.map((row) => row.prospect_id || row.id);
      assert.equal(commercialIds.filter((id) => id === LR_ID).length, 1);
      assert.equal(commercialIds.filter((id) => id === WR_ID).length, 1);
      const lrCommercial = commercialRes.state.body.rows.find((row) => row.prospect_id === LR_ID);
      const wrCommercial = commercialRes.state.body.rows.find((row) => row.prospect_id === WR_ID);
      assert.equal(lrCommercial.product, 'lead-rescue');
      assert.equal(wrCommercial.product, 'website-rescue');
      assert.equal(commercialRes.state.body.erpnext_mutated, false);
      assert.equal(commercialRes.state.body.payment_processed, false);

      const workbenchRes = mockRes();
      await handleAppWorkbench(
        { method: 'GET', url: '/api/app/workbench?proof=1&env=core&filter=lead_rescue', headers: {} },
        workbenchRes,
      );
      assert.equal(workbenchRes.state.statusCode, 200);
      const wbIds = workbenchRes.state.body.prospects.map((row) => row.id);
      assert.ok(wbIds.includes(LR_ID));
      assert.equal(wbIds.includes(WR_ID), false);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      resetProspectFixtureStore();
    }
  });

  it('tenant and cross-client access stay fail-closed on Prospect and Commercial', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const tenantRes = mockRes();
      await handleAppProspectDetail(
        {
          method: 'GET',
          url: `/api/app/prospect?env=tenant&id=${LR_ID}`,
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        tenantRes,
      );
      assert.equal(tenantRes.state.statusCode, 403);
      assert.equal(tenantRes.state.body.error, 'core_access_denied');

      const tenantSession = actorFromSessionPayload({
        typ: 'tenant',
        tenant_id: REFERENCE_TENANT_ID,
        username: 'tenant-user',
      });
      const tenantCommercial = mockRes();
      await handleAppCommercial(
        {
          method: 'GET',
          url: '/api/app/commercial?env=core&filter=all',
          headers: {},
          __testAppActor: tenantSession,
        },
        tenantCommercial,
      );
      assert.equal(tenantCommercial.state.statusCode, 403);
      assert.equal(tenantCommercial.state.body.error, 'core_access_denied');
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});
