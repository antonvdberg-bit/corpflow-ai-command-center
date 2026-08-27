/**
 * #1197 — Prospect commercial clearance → Commercial status → Delivery gate.
 *
 * Synthetic / proof fixtures only. No payment, ERPNext write, schema, send, or env change.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
import {
  fixtureCommercialRecords,
  projectCommercialRowsFromLeads,
} from '../lib/app/commercial-summary.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  applyCommercialClearanceToDeliveryItem,
  projectDeliveryItems,
  projectProspectToDeliveryItem,
} from '../lib/app/delivery-workspace.js';
import {
  handleAppCommercial,
  handleAppDelivery,
  handleAppProspectDetail,
} from '../lib/app/handlers.js';
import { loadClientsList } from '../lib/app/clients-list.js';
import {
  fixtureProspectLeadRows,
  projectProspectDetail,
  projectProspectLeadRows,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import { canStartBuild as canStartLeadRescueBuild } from '../lib/lead-rescue/onboarding-delivery.js';
import {
  evaluateFinancialApprovalGate,
  toOnboardingHandoff,
} from '../lib/revenue/commercial-approval.js';
import { readCommercialApprovalFromQualification } from '../lib/revenue/commercial-approval-record.js';
import { canStartBuild as canStartWebsiteRescueBuild } from '../lib/website-rescue/onboarding-delivery.js';

const NOW = new Date('2026-08-27T12:00:00.000Z');
const ADA_ID = 'syn-772-lr-ada';
const WREN_ID = 'syn-716-wr-cleared';
const BEA_ID = 'syn-772-rd-bea';

const ROUTE_SEQUENCE = Object.freeze([
  `/app/prospects/${ADA_ID}`,
  `/app/commercial`,
  `/app/delivery`,
  `/app/prospects/${WREN_ID}`,
]);

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

describe('#1197 commercial clearance → delivery gate', { concurrency: false }, () => {
  it('Ada is fail-closed on Prospect, Commercial, Delivery, and the #714/#715 build gate', () => {
    const adaLead = rowById(ADA_ID);
    const rail = readCommercialApprovalFromQualification(adaLead.qualificationJson);
    const gate = evaluateFinancialApprovalGate(rail);
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.includes('MISSING_PAYMENT_EVIDENCE'));
    assert.equal(gate.blockers.includes('MISSING_ACCEPTANCE'), false);
    assert.equal(gate.blockers.includes('MISSING_PROPOSAL'), false);

    const detail = projectProspectDetail(adaLead, NOW);
    assert.equal(detail.id, ADA_ID);
    assert.equal(detail.commercial_clearance.commercially_cleared, false);
    assert.equal(detail.commercial_clearance.clearance_label, 'NOT CLEARED');
    assert.ok(detail.commercial_clearance.blockers.includes('MISSING_PAYMENT_EVIDENCE'));
    assert.equal(detail.commercial_clearance.proposal.erpnext_quotation, 'SAL-QTN-2026-00001');
    assert.equal(detail.website_rescue_delivery == null, true);

    const commercial = fixtureCommercialRecords(NOW).find((row) => row.prospect_id === ADA_ID);
    assert.equal(commercial.financially_approved, false);
    assert.equal(commercial.commercial_state, 'payment_evidence_pending');
    assert.equal(commercial.shared_detail_path, `/app/prospects/${ADA_ID}`);
    assert.equal(commercial.company_master_id, 'cmp_ada_spa_synthetic');
    assert.equal(commercial.erpnext.mutated, false);
    assert.equal(commercial.payment_processed, false);

    const handoff = toOnboardingHandoff(rail);
    assert.equal(handoff.financially_approved, false);
    assert.equal(canStartLeadRescueBuild(handoff).ok, false);
    assert.equal(canStartLeadRescueBuild(handoff).reason, 'MISSING_FINANCIAL_APPROVAL');

    const delivery = projectProspectToDeliveryItem(
      projectProspectLeadRows([adaLead], NOW)[0],
      NOW,
      [],
      commercial,
    );
    assert.equal(delivery.source_id, ADA_ID);
    assert.equal(delivery.links.prospect, `/app/prospects/${ADA_ID}`);
    assert.equal(delivery.links.commercial, '/app/commercial');
    assert.equal(delivery.commercially_cleared, false);
    assert.equal(delivery.financially_approved, false);
    assert.ok(delivery.commercial_blockers.includes('MISSING_PAYMENT_EVIDENCE'));
    assert.equal(delivery.primary_exception, 'blocked');
    assert.equal(delivery.review_approval_state, 'Commercial clearance required');
    assert.match(String(delivery.next_action), /payment evidence/i);
    assert.equal(delivery.erpnext, undefined);
    assert.equal(delivery.quotation, undefined);
    assert.equal(JSON.stringify(delivery).includes('PAY-EV-'), false);
  });

  it('Wren stays commercially cleared and Delivery shows the recorded onboarding next action', () => {
    const wrenLead = rowById(WREN_ID);
    const rail = readCommercialApprovalFromQualification(wrenLead.qualificationJson);
    const gate = evaluateFinancialApprovalGate(rail);
    assert.equal(gate.ok, true);
    assert.deepEqual(gate.blockers, []);

    const detail = projectProspectDetail(wrenLead, NOW);
    assert.equal(detail.id, WREN_ID);
    assert.equal(detail.commercial_clearance.commercially_cleared, true);
    assert.equal(detail.commercial_clearance.clearance_label, 'CLEARED TO BUILD');
    assert.equal(detail.website_rescue_delivery.financially_approved, true);
    assert.equal(detail.website_rescue_delivery.can_start_build, false);
    assert.ok(detail.website_rescue_delivery.blockers.includes('MISSING_REQUIRED_CLIENT_INPUTS'));
    assert.equal(detail.website_rescue_delivery.delivery_state, 'approved_to_onboard');

    const commercial = fixtureCommercialRecords(NOW).find((row) => row.prospect_id === WREN_ID);
    assert.equal(commercial.financially_approved, true);
    assert.equal(commercial.commercial_state, 'financially_approved');
    assert.equal(commercial.next_action, 'Proceed to onboarding / delivery (financial gate open)');
    assert.equal(commercial.shared_detail_path, `/app/prospects/${WREN_ID}`);
    assert.equal(commercial.erpnext.quotation, 'SAL-QTN-2026-00004');

    const handoff = toOnboardingHandoff(rail);
    assert.equal(handoff.financially_approved, true);
    assert.equal(
      canStartWebsiteRescueBuild({ financially_approved: handoff.financially_approved }).reason,
      'MISSING_REQUIRED_CLIENT_INPUTS',
    );

    const delivery = projectProspectToDeliveryItem(
      projectProspectLeadRows([wrenLead], NOW)[0],
      NOW,
      [],
      commercial,
    );
    assert.equal(delivery.source_id, WREN_ID);
    assert.equal(delivery.commercially_cleared, true);
    assert.equal(delivery.financially_approved, true);
    assert.deepEqual(delivery.commercial_blockers, []);
    assert.equal(delivery.next_action, 'Collect Website Rescue intake');
    assert.notEqual(delivery.next_action, commercial.next_action);
    assert.equal(delivery.links.prospect, `/app/prospects/${WREN_ID}`);
    assert.equal(delivery.links.commercial, '/app/commercial');
    assert.equal(delivery.erpnext, undefined);
  });

  it('Bea quote-not-prepared cannot start Website Rescue build; missing commercial lookup stays fail-closed', () => {
    const beaLead = rowById(BEA_ID);
    const detail = projectProspectDetail(beaLead, NOW);
    assert.equal(detail.commercial_clearance.commercially_cleared, false);
    assert.ok(detail.commercial_clearance.blockers.includes('MISSING_PROPOSAL'));
    assert.equal(detail.website_rescue_delivery.can_start_build, false);
    assert.ok(detail.website_rescue_delivery.blockers.includes('MISSING_FINANCIAL_APPROVAL'));

    const item = projectProspectToDeliveryItem(
      {
        id: BEA_ID,
        product: beaLead.qualificationJson.intake_meta.product,
        organisation_name: 'Bea Boutique',
        next_action: 'Invent a build start',
        qualification_complete: true,
      },
      NOW,
      [],
      null,
    );
    assert.equal(item.commercially_cleared, false);
    assert.equal(item.financially_approved, false);
    assert.equal(item.review_approval_state, 'Commercial clearance required');
    assert.equal(item.next_action, 'Record commercial clearance before build.');
  });

  it('protected commercial hold stays labelled protected and is still not cleared to build', () => {
    const item = applyCommercialClearanceToDeliveryItem(
      {
        source_id: 'syn-995-lr-prot',
        protected_gate: true,
        primary_exception: 'protected_deploy_approval_required',
        next_action: 'Hold for Anton commercial approval',
        current_blocker: 'Waiting on protected approval',
        review_approval_state: 'Protected approval required',
      },
      {
        financially_approved: false,
        commercial_state: 'quote_not_prepared',
        blockers: ['MISSING_PROPOSAL'],
        next_action: 'Prepare quotation from the existing commercial template',
      },
    );
    assert.equal(item.commercially_cleared, false);
    assert.equal(item.protected_gate, true);
    assert.equal(item.primary_exception, 'protected_deploy_approval_required');
    assert.equal(item.next_action, 'Hold for Anton commercial approval');
  });

  it('operator handlers walk Prospect → Commercial → Delivery without duplicating commercial truth', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    resetProspectFixtureStore();
    try {
      const adaRes = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: `/api/app/prospect?proof=1&env=core&id=${ADA_ID}`, headers: {} },
        adaRes,
      );
      assert.equal(adaRes.state.statusCode, 200);
      assert.equal(adaRes.state.body.prospect.id, ADA_ID);
      assert.equal(adaRes.state.body.prospect.commercial_clearance.commercially_cleared, false);
      assert.ok(adaRes.state.body.prospect.commercial_clearance.blockers.includes('MISSING_PAYMENT_EVIDENCE'));

      const wrenRes = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: `/api/app/prospect?proof=1&env=core&id=${WREN_ID}`, headers: {} },
        wrenRes,
      );
      assert.equal(wrenRes.state.statusCode, 200);
      assert.equal(wrenRes.state.body.prospect.id, WREN_ID);
      assert.equal(wrenRes.state.body.prospect.commercial_clearance.commercially_cleared, true);
      assert.equal(wrenRes.state.body.prospect.website_rescue_delivery.can_start_build, false);

      const commercialRes = mockRes();
      await handleAppCommercial(
        { method: 'GET', url: '/api/app/commercial?proof=1&env=core&filter=all', headers: {} },
        commercialRes,
      );
      assert.equal(commercialRes.state.statusCode, 200);
      const adaCommercial = commercialRes.state.body.rows.find((row) => row.prospect_id === ADA_ID);
      const wrenCommercial = commercialRes.state.body.rows.find((row) => row.prospect_id === WREN_ID);
      assert.equal(adaCommercial.financially_approved, false);
      assert.equal(wrenCommercial.financially_approved, true);
      assert.equal(commercialRes.state.body.erpnext_mutated, false);
      assert.equal(commercialRes.state.body.payment_processed, false);

      const deliveryRes = mockRes();
      await handleAppDelivery(
        { method: 'GET', url: '/api/app/delivery?proof=1&env=core', headers: {} },
        deliveryRes,
      );
      assert.equal(deliveryRes.state.statusCode, 200);
      const adaDelivery = deliveryRes.state.body.items.find((row) => row.source_id === ADA_ID);
      const wrenDelivery = deliveryRes.state.body.items.find((row) => row.source_id === WREN_ID);
      assert.equal(adaDelivery.commercially_cleared, false);
      assert.equal(adaDelivery.links.prospect, adaCommercial.shared_detail_path);
      assert.equal(adaDelivery.links.clients, adaCommercial.clients_path);
      assert.equal(wrenDelivery.commercially_cleared, true);
      assert.equal(wrenDelivery.links.prospect, wrenCommercial.shared_detail_path);
      assert.equal(wrenDelivery.next_action, 'Collect Website Rescue intake');
      assert.equal(JSON.stringify(deliveryRes.state.body).includes('SAL-QTN-2026-00004'), false);
      assert.equal(JSON.stringify(deliveryRes.state.body).includes('PAY-EV-SYN-716-WREN'), false);
      assert.deepEqual(ROUTE_SEQUENCE, [
        `/app/prospects/${ADA_ID}`,
        `/app/commercial`,
        `/app/delivery`,
        `/app/prospects/${WREN_ID}`,
      ]);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      resetProspectFixtureStore();
    }
  });

  it('tenant sessions cannot load staff Commercial or Delivery oversight', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const tenantProspect = mockRes();
      await handleAppProspectDetail(
        {
          method: 'GET',
          url: `/api/app/prospect?env=tenant&id=${ADA_ID}`,
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        tenantProspect,
      );
      assert.equal(tenantProspect.state.statusCode, 403);
      assert.equal(tenantProspect.state.body.error, 'core_access_denied');

      const tenantActor = actorFromSessionPayload({
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
          __testAppActor: tenantActor,
        },
        tenantCommercial,
      );
      assert.equal(tenantCommercial.state.statusCode, 403);

      const tenantDelivery = mockRes();
      await handleAppDelivery(
        {
          method: 'GET',
          url: '/api/app/delivery?env=core',
          headers: {},
          __testAppActor: tenantActor,
        },
        tenantDelivery,
      );
      assert.equal(tenantDelivery.state.statusCode, 403);
      assert.equal(tenantDelivery.state.body.error, 'core_access_denied');
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  it('joined Delivery items keep prospect/client ids from the commercial rail', async () => {
    const clientsLoaded = await loadClientsList({ proofMode: true });
    const items = projectDeliveryItems({
      prospects: projectProspectLeadRows(fixtureProspectLeadRows(NOW), NOW),
      requests: [],
      clients: clientsLoaded.ok ? clientsLoaded.clients : [],
      commercialRows: projectCommercialRowsFromLeads(fixtureProspectLeadRows(NOW), NOW),
      now: NOW,
    });
    const ada = items.find((row) => row.source_id === ADA_ID);
    const wren = items.find((row) => row.source_id === WREN_ID);
    assert.equal(ada.client_id, 'cmp_ada_spa_synthetic');
    assert.equal(ada.commercially_cleared, false);
    assert.equal(wren.commercially_cleared, true);
    assert.equal(wren.client_id, null);
  });
});
