/**
 * #1176 — Operating Workspace Prospect → Client → Commercial → Delivery journey.
 *
 * Reuses existing synthetic records (Ada Lead Rescue). No second task model.
 * No schema. No live ERPNext write.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
import { APP_WORKSPACE_SLICE_VERSION, REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppClientDetail,
  handleAppCommercial,
  handleAppCommercialQuotation,
  handleAppDelivery,
  handleAppOverview,
  handleAppProspectDetail,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { isStaffOnlyTenantDeniedPath } from '../lib/app/tenant-journey.js';
import { isOperatingWorkspaceStaffPath } from '../lib/app/tenant-workspace.js';
import { appendProofQuery } from '../lib/app/workspace-context.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ADA_PROSPECT_ID = 'syn-772-lr-ada';
const ADA_CLIENT_ID = 'cmp_ada_spa_synthetic';
const ADA_QUOTATION = 'SAL-QTN-2026-00001';
const ADA_DELIVERY_ID = `lead:${ADA_PROSPECT_ID}`;

const JOURNEY_PAGES = [
  '/app/core',
  '/app/prospects',
  `/app/prospects/${ADA_PROSPECT_ID}`,
  '/app/clients',
  `/app/clients/${ADA_CLIENT_ID}`,
  '/app/commercial',
  `/app/commercial/${ADA_PROSPECT_ID}`,
  '/app/delivery',
];

const STAFF_APIS = [
  '/api/app/overview',
  '/api/app/prospects',
  '/api/app/prospect',
  '/api/app/clients',
  '/api/app/client',
  '/api/app/commercial',
  '/api/app/commercial-quotation',
  '/api/app/delivery',
];

beforeEach(() => {
  resetProspectFixtureStore();
});

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

function coreProofReq(url) {
  return {
    method: 'GET',
    url,
    headers: {},
  };
}

function tenantReq(url) {
  return {
    method: 'GET',
    url,
    headers: {},
    __testAppActor: actorFromSessionPayload({
      typ: 'tenant',
      username: 'syn-1176-tenant',
      user_id: 'syn_user_1176_tenant',
      tenant_id: REFERENCE_TENANT_ID,
    }),
  };
}

function withDevProof(fn) {
  return async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    try {
      await fn();
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  };
}

describe('Operating Workspace current-main journey #1176', { concurrency: false }, () => {
  it('staff CoreMenu and Client/Delivery related links preserve the proof harness', () => {
    const menuSrc = readFileSync(path.join(REPO_ROOT, 'components/app/CoreMenu.js'), 'utf8');
    const clientsSrc = readFileSync(path.join(REPO_ROOT, 'components/app/ClientsSummary.js'), 'utf8');
    const deliverySrc = readFileSync(path.join(REPO_ROOT, 'components/app/DeliverySummary.js'), 'utf8');
    const coreSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/core.js'), 'utf8');
    assert.equal(menuSrc.includes('appendProofQuery'), true);
    assert.equal(menuSrc.includes('proofWanted'), true);
    assert.equal(coreSrc.includes('proofWanted={proofWanted}'), true);
    assert.equal(clientsSrc.includes("appendProofQuery('/app/prospects', proofWanted)"), true);
    assert.equal(clientsSrc.includes("appendProofQuery('/app/pipeline', proofWanted)"), true);
    assert.equal(clientsSrc.includes('appendProofQuery(delivery.existing_delivery_path'), true);
    assert.equal(deliverySrc.includes('appendProofQuery(String(link.href), proofWanted)'), true);
    assert.equal(appendProofQuery('/app/core', true), '/app/core?proof=1');
    assert.equal(APP_WORKSPACE_SLICE_VERSION, 'workspace-1176-v1');
  });

  it('tenant sessions fail closed on the staff journey pages and APIs', () => {
    for (const route of JOURNEY_PAGES) {
      assert.equal(isOperatingWorkspaceStaffPath(route), true, route);
      assert.equal(isStaffOnlyTenantDeniedPath(route), true, route);
    }
    for (const route of STAFF_APIS) {
      assert.equal(isOperatingWorkspaceStaffPath(route), true, route);
    }
    assert.equal(isOperatingWorkspaceStaffPath('/app/tenant'), false);
  });

  it(
    'proof Core actor walks Overview → Prospect → Client → Commercial quotation → Delivery on Ada',
    withDevProof(async () => {
      const overview = mockRes();
      await handleAppOverview(coreProofReq('/api/app/overview?proof=1&env=core'), overview);
      assert.equal(overview.state.statusCode, 200);
      assert.equal(overview.state.body.ok, true);
      assert.equal(overview.state.body.path, '/app/core');
      assert.equal(overview.state.body.fabricated, false);
      assert.ok(overview.state.body.counts.prospects_overdue >= 1);
      assert.ok(overview.state.body.counts.commercial_blockers >= 1);
      const overdue = overview.state.body.sections.prospects_overdue.items;
      const adaOverdue = overdue.find((item) => String(item.identity?.prospect_id) === ADA_PROSPECT_ID);
      assert.ok(adaOverdue, 'Ada should appear as an overdue prospect on the overview');
      assert.equal(adaOverdue.href, `/app/prospects/${ADA_PROSPECT_ID}`);
      assert.equal(appendProofQuery(adaOverdue.href, true), `/app/prospects/${ADA_PROSPECT_ID}?proof=1`);

      const prospect = mockRes();
      await handleAppProspectDetail(
        coreProofReq(`/api/app/prospect?proof=1&env=core&id=${ADA_PROSPECT_ID}`),
        prospect,
      );
      assert.equal(prospect.state.statusCode, 200);
      assert.equal(prospect.state.body.ok, true);
      const ada = prospect.state.body.prospect;
      assert.equal(ada.id, ADA_PROSPECT_ID);
      assert.equal(ada.owner, 'anton');
      assert.equal(String(ada.next_action || '').length > 0, true);
      assert.equal(String(ada.current_blocker || ada.recommended_next_action || '').length > 0, true);
      assert.equal(ada.shared_detail_path, `/app/prospects/${ADA_PROSPECT_ID}`);

      const client = mockRes();
      await handleAppClientDetail(
        coreProofReq(`/api/app/client?proof=1&env=core&id=${ADA_CLIENT_ID}`),
        client,
      );
      assert.equal(client.state.statusCode, 200);
      assert.equal(client.state.body.client.company_id, ADA_CLIENT_ID);
      assert.equal(client.state.body.client.record_owner, 'anton');
      const related = client.state.body.client.related_prospects || [];
      assert.ok(related.some((row) => String(row.id) === ADA_PROSPECT_ID));
      assert.equal(client.state.body.client.delivery_references.existing_delivery_path, '/app/delivery');

      const commercial = mockRes();
      await handleAppCommercial(
        coreProofReq('/api/app/commercial?proof=1&env=core&filter=all'),
        commercial,
      );
      assert.equal(commercial.state.statusCode, 200);
      const adaCommercial = (commercial.state.body.rows || []).find(
        (row) => String(row.prospect_id) === ADA_PROSPECT_ID,
      );
      assert.ok(adaCommercial, 'Ada commercial row must exist');
      assert.equal(adaCommercial.owner, 'anton');
      assert.equal(adaCommercial.erpnext.quotation, ADA_QUOTATION);
      assert.equal(adaCommercial.quotation_evidence_path, `/app/commercial/${ADA_PROSPECT_ID}`);
      assert.equal(adaCommercial.shared_detail_path, `/app/prospects/${ADA_PROSPECT_ID}`);
      assert.equal(adaCommercial.clients_path, `/app/clients/${ADA_CLIENT_ID}`);
      assert.equal(String(adaCommercial.next_action || '').length > 0, true);
      assert.ok(Array.isArray(adaCommercial.blockers));
      assert.ok(adaCommercial.blockers.includes('MISSING_PAYMENT_EVIDENCE'));

      const quotation = mockRes();
      await handleAppCommercialQuotation(
        coreProofReq(`/api/app/commercial-quotation?proof=1&env=core&id=${ADA_PROSPECT_ID}`),
        quotation,
      );
      assert.equal(quotation.state.statusCode, 200);
      assert.equal(quotation.state.body.ok, true);
      assert.equal(quotation.state.body.quotation.name, ADA_QUOTATION);
      assert.equal(quotation.state.body.related_refs.prospect, ADA_PROSPECT_ID);
      assert.equal(quotation.state.body.erpnext_mutated, false);
      assert.equal(quotation.state.body.copied_to_postgres, false);
      assert.equal(
        quotation.state.body.path,
        `/app/commercial/${ADA_PROSPECT_ID}`,
      );

      const delivery = mockRes();
      await handleAppDelivery(coreProofReq('/api/app/delivery?proof=1&env=core&filter=all'), delivery);
      assert.equal(delivery.state.statusCode, 200);
      const adaDelivery = (delivery.state.body.items || []).find((row) => String(row.id) === ADA_DELIVERY_ID);
      assert.ok(adaDelivery, 'Ada delivery item must exist');
      assert.equal(adaDelivery.owner, 'anton');
      assert.equal(adaDelivery.links.prospect, `/app/prospects/${ADA_PROSPECT_ID}`);
      assert.ok(
        String(adaDelivery.links.clients).includes(ADA_CLIENT_ID) ||
          adaDelivery.links.clients === '/app/clients',
      );
      assert.equal(String(adaDelivery.next_action || '').length > 0, true);
      assert.ok(Array.isArray(adaDelivery.evidence));
      assert.ok(adaDelivery.evidence.some((link) => String(link.href).startsWith('/app/prospects/')));
    }),
  );

  it('Tenant session cannot read overview, prospect, client, commercial, or delivery', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const urls = [
        ['/api/app/overview?env=core', handleAppOverview],
        [`/api/app/prospect?env=core&id=${ADA_PROSPECT_ID}`, handleAppProspectDetail],
        [`/api/app/client?env=core&id=${ADA_CLIENT_ID}`, handleAppClientDetail],
        ['/api/app/commercial?env=core', handleAppCommercial],
        [`/api/app/commercial-quotation?env=core&id=${ADA_PROSPECT_ID}`, handleAppCommercialQuotation],
        ['/api/app/delivery?env=core', handleAppDelivery],
        ['/api/app/shell?env=core', handleAppShell],
      ];
      for (const [url, handler] of urls) {
        const res = mockRes();
        await handler(tenantReq(url), res);
        assert.equal(res.state.statusCode, 403, url);
        assert.equal(res.state.body.error, 'core_access_denied', url);
      }

      const tenantProof = mockRes();
      await handleAppOverview(
        {
          method: 'GET',
          url: '/api/app/overview?proof=1&env=core',
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        tenantProof,
      );
      assert.equal(tenantProof.state.statusCode, 403);
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});
