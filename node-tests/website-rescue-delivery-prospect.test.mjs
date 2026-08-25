/**
 * #716 Website Rescue onboarding/delivery on Prospect detail — focused tests.
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
import { assertWebsiteRescueDeliveryPatchSafe } from '../lib/website-rescue/onboarding-delivery-record.js';
import { createEmptyWebsiteRescueIntake } from '../lib/website-rescue/onboarding-delivery.js';

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

function completeOnePageIntake() {
  const intake = createEmptyWebsiteRescueIntake('one_page');
  return {
    ...intake,
    business_display_name: 'Wren Workshop',
    primary_contact_name: 'Wren Cleared',
    working_email: 'wren@example.com',
    working_phone: '+2305161616',
    case_type: 'one_page',
    tier: 'T1',
    current_site_url: 'https://wren-workshop.example',
    domain_hostname: 'wren-workshop.example',
    hosting_facts_summary: 'Shared host; operator manages preview. No passwords stored.',
    brand_assets_status: 'wordmark_ok',
    pages_in_scope: ['home'],
    services_or_products_summary: 'Workshop booking enquiry only.',
    content_ownership: 'Owner owns offer wording; operator owns layout and CTA.',
    enquiry_destination: 'wren@example.com',
    design_preferences: 'Guided direction A — clear enquiry path.',
    revision_authority: 'Wren Cleared',
    named_approver: 'Wren Cleared',
    review_cadence: 'Preview feedback within 2 business days.',
  };
}

function allSharedChecklist() {
  return {
    'shared.business_identity': true,
    'shared.primary_contact': true,
    'shared.financial_approval': true,
    'shared.named_approver': true,
    'shared.client_responsibilities_ack': true,
    'shared.exclusions_ack': true,
    'shared.acceptance_measures': true,
    'shared.review_cadence': true,
  };
}

afterEach(() => {
  resetProspectFixtureStore();
});

describe('#716 Website Rescue delivery on prospect JSON', { concurrency: false }, () => {
  it('Bea is visible but not cleared and cannot start build', () => {
    const bea = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-rd-bea');
    const detail = projectProspectDetail(bea);
    assert.equal(detail.product, RAPID_DELIVERY_PRODUCT);
    assert.equal(detail.website_rescue_delivery.applicable, true);
    assert.equal(detail.website_rescue_delivery.commercially_cleared, false);
    assert.equal(detail.website_rescue_delivery.can_start_build, false);
    assert.ok(detail.website_rescue_delivery.blockers.includes('MISSING_FINANCIAL_APPROVAL'));
    assert.equal(detail.website_rescue_delivery.real_dns_cutover_executed, false);
    assert.equal(Object.prototype.hasOwnProperty.call(detail, 'qualificationJson'), false);
  });

  it('Wren proof fixture is commercially cleared and waiting on onboarding', () => {
    const wren = fixtureProspectLeadRows().find((row) => row.id === 'syn-716-wr-cleared');
    const detail = projectProspectDetail(wren);
    assert.equal(detail.commercial_clearance.commercially_cleared, true);
    assert.equal(detail.website_rescue_delivery.financially_approved, true);
    assert.equal(detail.website_rescue_delivery.delivery_state, 'approved_to_onboard');
    assert.equal(detail.website_rescue_delivery.can_start_build, false);
    assert.ok(detail.website_rescue_delivery.blockers.includes('MISSING_REQUIRED_CLIENT_INPUTS'));
  });

  it('Ada Lead Rescue does not expose a Website Rescue delivery panel payload', () => {
    const ada = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-lr-ada');
    const detail = projectProspectDetail(ada);
    assert.equal(detail.website_rescue_delivery == null, true);
  });

  it('complete intake + flags unlocks build_started on a cleared Website Rescue row', () => {
    const wren = fixtureProspectLeadRows().find((row) => row.id === 'syn-716-wr-cleared');
    const intake = completeOnePageIntake();
    const first = applySharedProspectOperatorPatch(
      wren,
      {
        website_rescue_delivery: {
          ...intake,
          content_assets_ready: true,
          approved_access_confirmed: true,
          shared_checklist: allSharedChecklist(),
          requested_delivery_state: 'onboarding_in_progress',
        },
      },
      { actorLabel: 'anton', nowIso: '2026-08-24T23:20:00.000Z' },
    );
    assert.equal(first.ok, true);
    const second = applySharedProspectOperatorPatch(
      first.row,
      { website_rescue_delivery: { requested_delivery_state: 'onboarding_complete' } },
      { actorLabel: 'anton', nowIso: '2026-08-24T23:21:00.000Z' },
    );
    assert.equal(second.ok, true);
    const third = applySharedProspectOperatorPatch(
      second.row,
      { website_rescue_delivery: { requested_delivery_state: 'build_started' } },
      { actorLabel: 'anton', nowIso: '2026-08-24T23:22:00.000Z' },
    );
    assert.equal(third.ok, true);
    const detail = projectProspectDetail(third.row);
    assert.equal(detail.website_rescue_delivery.delivery_state, 'build_started');
    assert.equal(detail.website_rescue_delivery.can_start_build, true);
    assert.equal(detail.website_rescue_delivery.intake.domain_hostname, 'wren-workshop.example');
    assert.equal(detail.website_rescue_delivery.real_client_production_deploy, false);
  });

  it('missing financial approval still blocks build_started even with complete intake', () => {
    const bea = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-rd-bea');
    const intake = completeOnePageIntake();
    const first = applySharedProspectOperatorPatch(
      bea,
      {
        website_rescue_delivery: {
          ...intake,
          content_assets_ready: true,
          approved_access_confirmed: true,
          requested_delivery_state: 'onboarding_in_progress',
        },
      },
      { actorLabel: 'anton', nowIso: '2026-08-24T23:23:00.000Z' },
    );
    assert.equal(first.ok, true);
    const complete = applySharedProspectOperatorPatch(
      first.row,
      { website_rescue_delivery: { requested_delivery_state: 'onboarding_complete' } },
      { actorLabel: 'anton', nowIso: '2026-08-24T23:24:00.000Z' },
    );
    assert.equal(complete.ok, true);
    const blocked = applySharedProspectOperatorPatch(
      complete.row,
      { website_rescue_delivery: { requested_delivery_state: 'build_started' } },
      { actorLabel: 'anton', nowIso: '2026-08-24T23:25:00.000Z' },
    );
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, 'BUILD_GATE_BLOCKED');
    assert.equal(blocked.gate.reason, 'MISSING_FINANCIAL_APPROVAL');
  });

  it('rejects credentials and real cutover flags', () => {
    assert.equal(assertProspectPatchNotProtected({ real_dns_cutover_executed: true }).ok, false);
    assert.equal(
      assertWebsiteRescueDeliveryPatchSafe({ hosting_password: 'x' }).error,
      'FORBIDDEN_SENSITIVE_FIELD',
    );
    assert.equal(
      assertWebsiteRescueDeliveryPatchSafe({ real_client_production_deploy: true }).error,
      'PROTECTED_ACTION_BLOCKED',
    );
    const wren = fixtureProspectLeadRows().find((row) => row.id === 'syn-716-wr-cleared');
    const blocked = applySharedProspectOperatorPatch(wren, {
      website_rescue_delivery: { dns_password: 'secret' },
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, 'FORBIDDEN_SENSITIVE_FIELD');
  });

  it('Lead Rescue cannot store a Website Rescue delivery namespace', () => {
    const ada = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-lr-ada');
    const blocked = applySharedProspectOperatorPatch(ada, {
      website_rescue_delivery: { case_type: 'one_page' },
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, 'website_rescue_delivery_not_applicable');
  });

  it('proof GET exposes Wren delivery without leaking qualificationJson', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    try {
      const res = mockRes();
      await handleAppProspectDetail(
        { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=syn-716-wr-cleared', headers: {} },
        res,
      );
      assert.equal(res.state.statusCode, 200);
      assert.equal(res.state.body.prospect.website_rescue_delivery.financially_approved, true);
      assert.equal(res.state.body.prospect.website_rescue_delivery.delivery_state, 'approved_to_onboard');
      assert.equal(JSON.stringify(res.state.body).includes('qualificationJson'), false);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  });

  it('proof PATCH records preview evidence and advances onboarding', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    try {
      const patchRes = mockRes();
      await handleAppProspectDetail(
        {
          method: 'PATCH',
          url: '/api/app/prospect?proof=1&env=core&id=syn-716-wr-cleared',
          headers: {},
          body: {
            id: 'syn-716-wr-cleared',
            website_rescue_delivery: {
              ...completeOnePageIntake(),
              content_assets_ready: true,
              approved_access_confirmed: true,
              requested_delivery_state: 'onboarding_in_progress',
              evidence: {
                preview: {
                  preview_url_or_artefact: '/demo/cafe-international',
                  captured_at: '2026-08-24T23:26:00.000Z',
                  operator_note: 'Synthetic preview path recorded.',
                },
              },
            },
          },
        },
        patchRes,
      );
      assert.equal(patchRes.state.statusCode, 200);
      assert.equal(patchRes.state.body.prospect.website_rescue_delivery.delivery_state, 'onboarding_in_progress');
      assert.equal(
        patchRes.state.body.prospect.website_rescue_delivery.evidence.preview.preview_url_or_artefact,
        '/demo/cafe-international',
      );
      assert.equal(patchRes.state.body.external_send, false);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  });

  it('Prospect detail UI includes the Website Rescue delivery panel', () => {
    const panel = readFileSync(new URL('../components/app/ProspectDetailPanel.js', import.meta.url), 'utf8');
    const form = readFileSync(new URL('../components/app/WebsiteRescueDeliveryPanel.js', import.meta.url), 'utf8');
    assert.match(panel, /WebsiteRescueDeliveryPanel/);
    assert.match(form, /data-testid="website-rescue-delivery"/);
    assert.match(form, /Save onboarding and delivery/);
    assert.doesNotMatch(form, /hosting_password/);
    assert.doesNotMatch(form, /real_dns_cutover_executed/);
  });
});
