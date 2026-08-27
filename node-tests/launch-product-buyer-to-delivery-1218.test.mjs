/**
 * #1218 — Lead Rescue + Website Rescue buyer-to-delivery continuity on current main.
 *
 * Stitches already-landed hops (#1167 / #1173 / #1168 / #1169) into one path:
 * public named product → enquiry identity → Prospect/Commercial → recorded
 * ERPNext quotation (when present) → tenant-safe delivery progress.
 *
 * Synthetic / proof fixtures only. No live enquiry, send, payment, schema, or ERPNext write.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { actorFromSessionPayload, buildProofCoreActor, buildProofTenantActor } from '../lib/app/access.js';
import { fixtureCommercialRecords } from '../lib/app/commercial-summary.js';
import { quotationNameFromCommercialRow } from '../lib/app/commercial-quotation-evidence.js';
import {
  LEAD_RESCUE_TENANT_REQUEST_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  TENANT_FORBIDDEN_FIELD_KEYS,
  TENANT_NAV_ITEMS,
  WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
} from '../lib/app/constants.js';
import {
  handleAppActionQueue,
  handleAppCommercial,
  handleAppDelivery,
  handleAppProspectDetail,
  handleAppProspects,
  handleAppRequestDetail,
  handleAppRequestsList,
} from '../lib/app/handlers.js';
import { payloadContainsForbiddenTenantKeys } from '../lib/app/project.js';
import {
  filterProspectsForActionQueue,
  fixtureProspectLeadRows,
  projectProspectDetail,
  projectProspectLeadRows,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  isStaffOnlyTenantDeniedPath,
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
} from '../lib/app/tenant-journey.js';
import {
  payloadContainsForbiddenWebsiteRescueTenantKeys,
  projectTenantWebsiteRescueProgress,
} from '../lib/app/website-rescue-tenant-progress.js';
import {
  AI_LEAD_RESCUE_DEFAULT_NEXT_ACTION,
  AI_LEAD_RESCUE_PRODUCT,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../lib/cmp/_lib/rapid-delivery-operator.js';
import {
  detectProspectProduct,
  isLabelledLeadRescueEnquiry,
  leadRowToProspectViewModel,
} from '../lib/cmp/_lib/prospect-operations-view-model.js';
import { proofQuotationDocForName } from '../lib/erpnext/quotation-evidence.js';
import {
  LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID,
  LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
  LEAD_RESCUE_SERVICE_NAME,
  bindLeadRescueDeliveryIdentity,
  getLeadRescueDeliveryRecord,
  leadRescueTenantProjectionLeaks,
  projectLeadRescueDeliveryToClientView,
  resetLeadRescueDeliveryStore,
} from '../lib/lead-rescue/tenant-delivery-progress.js';
import {
  LEAD_RESCUE_ENQUIRY_HREF,
  LEAD_RESCUE_LANDING_HREF,
  WEBSITE_RESCUE_ENQUIRY_HREF,
  WEBSITE_RESCUE_LANDING_HREF,
} from '../lib/public/canonical-enquiry.js';
import { CORPflow_PUBLIC_LAUNCH_PRODUCTS, CORPflow_PUBLIC_NAV } from '../lib/public/corpflow-public-market.js';
import { productForCommercialRail } from '../lib/revenue/commercial-approval-record.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const NOW = new Date('2026-08-27T12:00:00.000Z');

const LR_ENQUIRY_ID = 'syn-1171-lr-enquiry';
const WR_ENQUIRY_ID = 'syn-1171-wr-enquiry';
const ADA_ID = 'syn-772-lr-ada';
const WREN_ID = 'syn-716-wr-cleared';
const PIA_ID = WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID;

const ADA_QUOTE = 'SAL-QTN-2026-00001';
const WREN_QUOTE = 'SAL-QTN-2026-00004';
const PIA_QUOTE = 'SAL-QTN-2026-00005';

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

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

function once(ids, id) {
  return ids.filter((item) => item === id).length === 1;
}

beforeEach(() => {
  resetRequestStore();
  resetProspectFixtureStore();
});

afterEach(() => {
  resetLeadRescueDeliveryStore();
  resetRequestStore();
  resetProspectFixtureStore();
});

describe('#1218 public named-product buyer path', () => {
  it('locks Lead Rescue and Website Rescue landings, proof, and one primary CTA each', () => {
    assert.equal(LEAD_RESCUE_LANDING_HREF, '/lead-rescue');
    assert.equal(LEAD_RESCUE_ENQUIRY_HREF, '/contact?offer=ai-lead-rescue#discovery');
    assert.equal(WEBSITE_RESCUE_LANDING_HREF, '/website-rescue');
    assert.equal(
      WEBSITE_RESCUE_ENQUIRY_HREF,
      '/contact?offer=premium-landing-page-rescue#discovery',
    );
    assert.equal(existsSync(path.join(REPO_ROOT, 'pages/lead-rescue.js')), true);
    assert.equal(existsSync(path.join(REPO_ROOT, 'pages/website-rescue.js')), true);
    assert.equal(existsSync(path.join(REPO_ROOT, 'pages/demo/website-rescue.js')), true);

    const leadNav = CORPflow_PUBLIC_NAV.find((item) => item.label === 'Lead Rescue');
    const websiteNav = CORPflow_PUBLIC_NAV.find((item) => item.label === 'Website Rescue');
    assert.equal(leadNav?.href, '/lead-rescue');
    assert.equal(websiteNav?.href, '/website-rescue');
    assert.deepEqual(
      CORPflow_PUBLIC_LAUNCH_PRODUCTS.map((item) => item.label),
      ['Lead Rescue', 'Website Rescue'],
    );
    assert.deepEqual(
      CORPflow_PUBLIC_LAUNCH_PRODUCTS.map((item) => item.href),
      ['/lead-rescue', '/website-rescue'],
    );

    const landing = read('components/AiLeadRescueLanding.js');
    assert.ok(landing.includes('Start my 48-hour setup'));
    assert.ok(landing.includes('LEAD_RESCUE_ENQUIRY_HREF'));
    assert.ok(!/Choose payment path/i.test(landing));

    const offerPage = read('components/RapidDeliveryOfferPage.js');
    assert.ok(offerPage.includes('Request discovery'));
    assert.ok(offerPage.includes('href="#discovery"'));
    assert.ok(!offerPage.includes('Starting path:'));
    assert.ok(offerPage.includes('Open the Website Rescue demo'));
  });
});

describe('#1218 enquiry → Prospect / Commercial identity', () => {
  it('preserves source, product, consent, urgency, and next action without a second CRM row', () => {
    const lr = leadRowToProspectViewModel(rowById(LR_ENQUIRY_ID), NOW);
    const wr = leadRowToProspectViewModel(rowById(WR_ENQUIRY_ID), NOW);

    assert.equal(isLabelledLeadRescueEnquiry(rowById(LR_ENQUIRY_ID).qualificationJson), true);
    assert.equal(detectProspectProduct(rowById(LR_ENQUIRY_ID).qualificationJson), AI_LEAD_RESCUE_PRODUCT);
    assert.equal(lr.id, LR_ENQUIRY_ID);
    assert.equal(lr.product, AI_LEAD_RESCUE_PRODUCT);
    assert.equal(lr.source, '/contact?offer=ai-lead-rescue');
    assert.equal(lr.consent_contact, true);
    assert.equal(lr.urgency, 'this-month');
    assert.equal(lr.next_action, AI_LEAD_RESCUE_DEFAULT_NEXT_ACTION);
    assert.equal(lr.shared_detail_path, `/app/prospects/${LR_ENQUIRY_ID}`);
    assert.equal(productForCommercialRail(lr.product), 'lead-rescue');

    assert.equal(detectProspectProduct(rowById(WR_ENQUIRY_ID).qualificationJson), RAPID_DELIVERY_PRODUCT);
    assert.equal(wr.id, WR_ENQUIRY_ID);
    assert.equal(wr.product, RAPID_DELIVERY_PRODUCT);
    assert.equal(wr.source, '/website-rescue');
    assert.equal(wr.consent_contact, true);
    assert.equal(wr.urgency, 'asap');
    assert.equal(wr.shared_detail_path, `/app/prospects/${WR_ENQUIRY_ID}`);
    assert.equal(productForCommercialRail(wr.product), 'website-rescue');

    const projected = projectProspectLeadRows(fixtureProspectLeadRows(NOW), NOW);
    const queue = filterProspectsForActionQueue(projected, 'needs_action', NOW);
    assert.equal(once(projected.map((row) => row.id), LR_ENQUIRY_ID), true);
    assert.equal(once(projected.map((row) => row.id), WR_ENQUIRY_ID), true);
    assert.equal(once(queue.map((row) => row.id), LR_ENQUIRY_ID), true);
    assert.equal(once(queue.map((row) => row.id), WR_ENQUIRY_ID), true);

    const lrDetail = projectProspectDetail(rowById(LR_ENQUIRY_ID), NOW);
    const wrDetail = projectProspectDetail(rowById(WR_ENQUIRY_ID), NOW);
    assert.equal(lrDetail.product, AI_LEAD_RESCUE_PRODUCT);
    assert.equal(wrDetail.product, RAPID_DELIVERY_PRODUCT);
    assert.ok(lrDetail.commercial_clearance.blockers.includes('MISSING_PROPOSAL'));
    assert.ok(wrDetail.commercial_clearance.blockers.includes('MISSING_PROPOSAL'));
  });

  it('does not fabricate quotations for new enquiries; recorded Ada/Wren/Pia refs stay the same', () => {
    const commercial = fixtureCommercialRecords(NOW);
    const lr = commercial.filter((row) => row.id === LR_ENQUIRY_ID || row.prospect_id === LR_ENQUIRY_ID);
    const wr = commercial.filter((row) => row.id === WR_ENQUIRY_ID || row.prospect_id === WR_ENQUIRY_ID);
    assert.equal(lr.length, 1);
    assert.equal(wr.length, 1);
    assert.equal(lr[0].product, 'lead-rescue');
    assert.equal(wr[0].product, 'website-rescue');
    assert.equal(lr[0].erpnext.quotation, null);
    assert.equal(wr[0].erpnext.quotation, null);
    assert.ok(lr[0].blockers.includes('MISSING_PROPOSAL'));
    assert.equal(lr[0].erpnext.mutated, false);
    assert.equal(wr[0].payment_processed, false);
    assert.equal(wr[0].external_send, false);

    const ada = commercial.find((row) => row.id === ADA_ID || row.prospect_id === ADA_ID);
    const wren = commercial.find((row) => row.id === WREN_ID || row.prospect_id === WREN_ID);
    const pia = commercial.find((row) => row.id === PIA_ID || row.prospect_id === PIA_ID);
    assert.equal(quotationNameFromCommercialRow(ada), ADA_QUOTE);
    assert.equal(ada.product, 'lead-rescue');
    assert.equal(ada.quotation_evidence_path, `/app/commercial/${ADA_ID}`);
    assert.equal(quotationNameFromCommercialRow(wren), WREN_QUOTE);
    assert.equal(wren.product, 'website-rescue');
    assert.equal(quotationNameFromCommercialRow(pia), PIA_QUOTE);
    assert.equal(pia.product, 'website-rescue');

    const named = commercial
      .map((row) => quotationNameFromCommercialRow(row))
      .filter(Boolean);
    assert.equal(named.filter((name) => name === ADA_QUOTE).length, 1);
    assert.equal(named.filter((name) => name === WREN_QUOTE).length, 1);
    assert.equal(named.filter((name) => name === PIA_QUOTE).length, 1);

    assert.equal(proofQuotationDocForName(ADA_QUOTE)?.name, ADA_QUOTE);
    assert.equal(proofQuotationDocForName(WREN_QUOTE)?.name, WREN_QUOTE);
    assert.equal(proofQuotationDocForName(PIA_QUOTE)?.name, PIA_QUOTE);
  });
});

describe('#1218 tenant delivery progress reuses the same identities', () => {
  it('Website Rescue tenant progress projects the same prospect ids and strips staff fields', () => {
    const pia = projectTenantWebsiteRescueProgress(rowById(PIA_ID), REFERENCE_TENANT_ID);
    const wren = projectTenantWebsiteRescueProgress(rowById(WREN_ID), REFERENCE_TENANT_ID);
    const ada = projectTenantWebsiteRescueProgress(rowById(ADA_ID), REFERENCE_TENANT_ID);
    const lrEnquiry = projectTenantWebsiteRescueProgress(rowById(LR_ENQUIRY_ID), REFERENCE_TENANT_ID);

    assert.equal(pia.request_id, PIA_ID);
    assert.equal(pia.service_name, 'Website Rescue');
    assert.equal(pia.authoritative_record, 'qualification_json.website_rescue_delivery');
    assert.equal(pia.delivery_stage, 'Preview ready');
    assert.equal(payloadContainsForbiddenWebsiteRescueTenantKeys(pia), false);
    assert.equal(JSON.stringify(pia).includes('SAL-QTN-'), false);
    assert.equal(JSON.stringify(pia).includes('financially_approved'), false);

    assert.equal(wren.request_id, WREN_ID);
    assert.equal(wren.service_name, 'Website Rescue');
    assert.equal(wren.delivery_stage, 'Getting started');
    assert.equal(ada, null);
    assert.equal(lrEnquiry, null);
  });

  it('Lead Rescue tenant progress binds the existing #715 record, not a second CRM', () => {
    const bind = bindLeadRescueDeliveryIdentity({
      tenant_id: REFERENCE_TENANT_ID,
      record_id: LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID,
    });
    assert.equal(bind.ok, true);
    assert.equal(bind.tenant_id, REFERENCE_TENANT_ID);
    assert.equal(bind.record_id, LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID);
    assert.equal(LEAD_RESCUE_TENANT_REQUEST_ID, 'syn_lr_delivery_corpflowai_001');

    const record = getLeadRescueDeliveryRecord(LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID);
    const view = projectLeadRescueDeliveryToClientView(record);
    assert.equal(view.service_name, LEAD_RESCUE_SERVICE_NAME);
    assert.equal(view.high_level_stage_label, 'Ready for your review');
    assert.equal(leadRescueTenantProjectionLeaks(view), false);
    const preview = view.components.find((c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY);
    assert.equal(preview.exposed_for_client_review, true);
    assert.equal(JSON.stringify(view).includes('operator_note'), false);
    assert.equal(JSON.stringify(view).includes('financially_approved'), false);
  });
});

describe('#1218 cross-view handlers and role boundary', { concurrency: false }, () => {
  it('operator proof surfaces expose each fixture once; tenant Requests & Progress stays tenant-safe', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    resetProspectFixtureStore();
    resetRequestStore();
    try {
      const queueRes = mockRes();
      await handleAppActionQueue(
        { method: 'GET', url: '/api/app/queue?proof=1&env=core&filter=all', headers: {} },
        queueRes,
      );
      assert.equal(queueRes.state.statusCode, 200);
      const queueIds = queueRes.state.body.prospects.map((row) => row.id);
      assert.equal(once(queueIds, LR_ENQUIRY_ID), true);
      assert.equal(once(queueIds, WR_ENQUIRY_ID), true);

      const adaRes = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: `/api/app/prospect?proof=1&env=core&id=${ADA_ID}`, headers: {} },
        adaRes,
      );
      assert.equal(adaRes.state.statusCode, 200);
      assert.equal(adaRes.state.body.prospect.id, ADA_ID);
      assert.equal(adaRes.state.body.prospect.commercial_clearance.proposal.erpnext_quotation, ADA_QUOTE);

      const wrenRes = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: `/api/app/prospect?proof=1&env=core&id=${WREN_ID}`, headers: {} },
        wrenRes,
      );
      assert.equal(wrenRes.state.statusCode, 200);
      assert.equal(
        wrenRes.state.body.prospect.commercial_clearance.proposal.erpnext_quotation,
        WREN_QUOTE,
      );

      const commercialRes = mockRes();
      await handleAppCommercial(
        { method: 'GET', url: '/api/app/commercial?proof=1&env=core&filter=all', headers: {} },
        commercialRes,
      );
      assert.equal(commercialRes.state.statusCode, 200);
      const commercialIds = commercialRes.state.body.rows.map((row) => row.prospect_id || row.id);
      assert.equal(once(commercialIds, LR_ENQUIRY_ID), true);
      assert.equal(once(commercialIds, WR_ENQUIRY_ID), true);
      assert.equal(once(commercialIds, ADA_ID), true);
      assert.equal(once(commercialIds, WREN_ID), true);
      assert.equal(once(commercialIds, PIA_ID), true);
      assert.equal(commercialRes.state.body.erpnext_mutated, false);
      assert.equal(commercialRes.state.body.payment_processed, false);

      const piaQuote = commercialRes.state.body.rows.find(
        (row) => row.prospect_id === PIA_ID || row.id === PIA_ID,
      );
      assert.equal(quotationNameFromCommercialRow(piaQuote), PIA_QUOTE);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  });

  it('Tenant sees Lead Rescue and Website Rescue progress and cannot open staff oversight', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    resetRequestStore();
    resetProspectFixtureStore();
    try {
      const actor = actorFromSessionPayload({
        typ: 'tenant',
        username: 'syn-1218-tenant',
        user_id: 'syn_user_1218_tenant',
        tenant_id: REFERENCE_TENANT_ID,
      });

      assert.deepEqual(
        TENANT_NAV_ITEMS.map((item) => item.href),
        ['/app/tenant', '/change?from=tenant-workspace'],
      );
      assert.equal(tenantChangeHandoffCreatesTicket(), false);
      assert.equal(tenantChangeHandoffHref(), '/change?from=tenant-workspace');
      for (const staffPath of ['/app/prospects', '/app/commercial', '/app/delivery']) {
        assert.equal(isStaffOnlyTenantDeniedPath(staffPath), true);
      }

      const listRes = mockRes();
      await handleAppRequestsList(
        {
          method: 'GET',
          url: `/api/app/requests?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        listRes,
      );
      assert.equal(listRes.state.statusCode, 200);
      const ids = (listRes.state.body.requests || []).map((row) => row.request_id);
      assert.equal(once(ids, LEAD_RESCUE_TENANT_REQUEST_ID), true);
      assert.equal(once(ids, PIA_ID), true);
      assert.equal(ids.includes(OTHER_TENANT_REQUEST_ID), false);
      assert.equal(ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID), false);
      assert.equal(payloadContainsForbiddenTenantKeys(listRes.state.body.requests), false);

      const lrDetail = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        lrDetail,
      );
      assert.equal(lrDetail.state.statusCode, 200);
      assert.equal(lrDetail.state.body.request.service_name, LEAD_RESCUE_SERVICE_NAME);
      assert.equal(lrDetail.state.body.request.high_level_stage_label, 'Ready for your review');
      assert.equal(leadRescueTenantProjectionLeaks(lrDetail.state.body.request), false);

      const wrDetail = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${PIA_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        wrDetail,
      );
      assert.equal(wrDetail.state.statusCode, 200);
      assert.equal(wrDetail.state.body.request.service_name, 'Website Rescue');
      assert.equal(wrDetail.state.body.request.delivery_stage, 'Preview ready');
      assert.equal(payloadContainsForbiddenWebsiteRescueTenantKeys(wrDetail.state.body.request), false);
      for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
        assert.equal(JSON.stringify(wrDetail.state.body.request).includes(`"${key}"`), false, key);
      }

      const coreActor = buildProofCoreActor();
      const tenantProof = buildProofTenantActor();
      for (const [label, handler, url] of [
        ['prospects', handleAppProspects, '/api/app/prospects?env=tenant'],
        ['commercial', handleAppCommercial, '/api/app/commercial?env=tenant&filter=all'],
        ['delivery', handleAppDelivery, '/api/app/delivery?env=tenant'],
        ['prospect-detail', handleAppProspectDetail, `/api/app/prospect?env=tenant&id=${ADA_ID}`],
      ]) {
        const denied = mockRes();
        await handler(
          { method: 'GET', url, headers: {}, __testAppActor: actor },
          denied,
        );
        assert.equal(denied.state.statusCode, 403, label);
        assert.equal(denied.state.body.error, 'core_access_denied', label);
      }

      const stillDenied = mockRes();
      await handleAppCommercial(
        {
          method: 'GET',
          url: '/api/app/commercial?env=core&filter=all',
          headers: {},
          __testAppActor: tenantProof,
        },
        stillDenied,
      );
      assert.equal(stillDenied.state.statusCode, 403);

      const coreOk = mockRes();
      await handleAppProspectDetail(
        {
          method: 'GET',
          url: `/api/app/prospect?proof=1&env=core&id=${PIA_ID}`,
          headers: {},
          __testAppActor: coreActor,
        },
        coreOk,
      );
      assert.equal(coreOk.state.statusCode, 200);
      assert.equal(coreOk.state.body.prospect.id, PIA_ID);
      assert.equal(
        coreOk.state.body.prospect.commercial_clearance.proposal.erpnext_quotation,
        PIA_QUOTE,
      );
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});
