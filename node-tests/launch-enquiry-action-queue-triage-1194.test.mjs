/**
 * #1194 — Launch enquiry → Action Queue triage.
 *
 * Uses existing proof fixtures only (syn-1171-lr-enquiry, syn-1171-wr-enquiry).
 * No live enquiry submit, send, payment, schema, or production write.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppActionQueue,
  handleAppPipeline,
  handleAppProspectDetail,
  handleAppWorkbench,
} from '../lib/app/handlers.js';
import {
  filterProspectsForActionQueue,
  fixtureProspectLeadRows,
  projectProspectDetail,
  projectProspectLeadRows,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import {
  AI_LEAD_RESCUE_DEFAULT_NEXT_ACTION,
  AI_LEAD_RESCUE_PRODUCT,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../lib/cmp/_lib/rapid-delivery-operator.js';
import { classifyDueDate } from '../lib/cmp/_lib/prospect-operations-view-model.js';
import { recommendedMarketEnquiryNextAction } from '../lib/public/corpflow-market-service-paths.js';

const NOW = new Date('2026-08-27T12:00:00.000Z');
const LR_ID = 'syn-1171-lr-enquiry';
const WR_ID = 'syn-1171-wr-enquiry';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

describe('#1194 launch enquiry → Action Queue triage', { concurrency: false }, () => {
  it('Lead Rescue and Website Rescue fixtures keep one id from queue to shared detail', () => {
    const projected = projectProspectLeadRows(fixtureProspectLeadRows(NOW), NOW);
    assert.equal(projected.filter((row) => row.id === LR_ID).length, 1);
    assert.equal(projected.filter((row) => row.id === WR_ID).length, 1);

    const queue = filterProspectsForActionQueue(projected, 'needs_action', NOW);
    const lr = queue.find((row) => row.id === LR_ID);
    const wr = queue.find((row) => row.id === WR_ID);
    assert.ok(lr);
    assert.ok(wr);

    assert.equal(lr.product, AI_LEAD_RESCUE_PRODUCT);
    assert.equal(lr.source, '/contact?offer=ai-lead-rescue');
    assert.equal(lr.consent_contact, true);
    assert.equal(lr.urgency, 'this-month');
    assert.equal(lr.next_action, AI_LEAD_RESCUE_DEFAULT_NEXT_ACTION);
    assert.equal(lr.owner, null);
    assert.ok(lr.exception_signals.includes('missing_owner'));
    assert.ok(lr.exception_signals.includes('new_unreviewed'));
    assert.ok(!lr.exception_signals.includes('no_next_action'));
    assert.equal(classifyDueDate(lr.next_action_due, NOW), 'none');
    assert.equal(lr.shared_detail_path, `/app/prospects/${LR_ID}`);
    assert.equal(lr.source_surfaces.action_queue, '/app/queue');
    assert.ok(lr.last_meaningful_activity_at);

    const expectedWrNext = recommendedMarketEnquiryNextAction({
      service_path: 'website-digital',
      offer_slug: 'premium-landing-page-rescue',
      urgency: 'asap',
      operator_status: 'new_intake',
    });
    assert.equal(wr.product, RAPID_DELIVERY_PRODUCT);
    assert.equal(wr.source, '/website-rescue');
    assert.equal(wr.consent_contact, true);
    assert.equal(wr.urgency, 'asap');
    assert.equal(wr.next_action, expectedWrNext);
    assert.equal(wr.owner, null);
    assert.ok(wr.exception_signals.includes('missing_owner'));
    assert.ok(wr.exception_signals.includes('high_urgency'));
    assert.ok(!wr.exception_signals.includes('no_next_action'));
    assert.equal(classifyDueDate(wr.next_action_due, NOW), 'none');
    assert.equal(wr.shared_detail_path, `/app/prospects/${WR_ID}`);

    const lrDetail = projectProspectDetail(rowById(LR_ID), NOW);
    const wrDetail = projectProspectDetail(rowById(WR_ID), NOW);
    assert.equal(lrDetail.id, LR_ID);
    assert.equal(wrDetail.id, WR_ID);
    assert.equal(lrDetail.current_blocker, 'Missing owner');
    assert.equal(wrDetail.current_blocker, 'Missing owner');
    assert.equal(lrDetail.external_send, false);
    assert.equal(wrDetail.external_send, false);
  });

  it('no active synthetic prospect is silently actionable without owner or next action', () => {
    const queue = filterProspectsForActionQueue(
      projectProspectLeadRows(fixtureProspectLeadRows(NOW), NOW),
      'needs_action',
      NOW,
    );
    const silent = queue.filter((row) => {
      const stage = String(row.canonical_stage || '');
      const closed = stage === 'won' || stage === 'lost' || stage === 'not_fit' || stage === 'delivery';
      if (closed) return false;
      const signals = Array.isArray(row.exception_signals) ? row.exception_signals : [];
      const owner = row.owner != null ? String(row.owner).trim() : '';
      const nextAction = row.next_action != null ? String(row.next_action).trim() : '';
      if (!owner && !signals.includes('missing_owner')) return true;
      if (!nextAction && !signals.includes('no_next_action')) return true;
      return false;
    });
    assert.deepEqual(
      silent.map((row) => row.id),
      [],
    );
  });

  it('handlers: queue, detail, workbench and pipeline share the same launch ids', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    resetProspectFixtureStore();
    try {
      const queueRes = mockRes();
      await handleAppActionQueue(
        { method: 'GET', url: '/api/app/queue?proof=1&env=core&filter=needs_action', headers: {} },
        queueRes,
      );
      assert.equal(queueRes.state.statusCode, 200);
      assert.equal(queueRes.state.body.path, '/app/queue');
      assert.equal(queueRes.state.body.external_send, false);
      const queueIds = queueRes.state.body.prospects.map((row) => row.id);
      assert.equal(queueIds.filter((id) => id === LR_ID).length, 1);
      assert.equal(queueIds.filter((id) => id === WR_ID).length, 1);
      const lrQ = queueRes.state.body.prospects.find((row) => row.id === LR_ID);
      const wrQ = queueRes.state.body.prospects.find((row) => row.id === WR_ID);
      assert.equal(lrQ.product, AI_LEAD_RESCUE_PRODUCT);
      assert.equal(wrQ.product, RAPID_DELIVERY_PRODUCT);
      assert.ok(lrQ.exception_signals.includes('missing_owner'));
      assert.ok(wrQ.exception_signals.includes('missing_owner'));
      assert.equal(lrQ.shared_detail_path, `/app/prospects/${LR_ID}`);
      assert.equal(wrQ.shared_detail_path, `/app/prospects/${WR_ID}`);

      for (const id of [LR_ID, WR_ID]) {
        const detailRes = mockRes();
        await handleAppProspectDetail(
          { method: 'GET', url: `/api/app/prospect?proof=1&env=core&id=${id}`, headers: {} },
          detailRes,
        );
        assert.equal(detailRes.state.statusCode, 200);
        assert.equal(detailRes.state.body.prospect.id, id);
        assert.equal(detailRes.state.body.prospect.current_blocker, 'Missing owner');
        assert.equal(detailRes.state.body.external_send, false);
        assert.equal(Object.prototype.hasOwnProperty.call(detailRes.state.body.prospect, 'qualificationJson'), false);
      }

      const wbRes = mockRes();
      await handleAppWorkbench(
        { method: 'GET', url: '/api/app/workbench?proof=1&env=core&filter=all', headers: {} },
        wbRes,
      );
      assert.equal(wbRes.state.statusCode, 200);
      const wbIds = wbRes.state.body.prospects.map((row) => row.id);
      assert.equal(wbIds.filter((id) => id === LR_ID).length, 1);
      assert.equal(wbIds.filter((id) => id === WR_ID).length, 1);

      const pipeRes = mockRes();
      await handleAppPipeline(
        { method: 'GET', url: '/api/app/pipeline?proof=1&env=core', headers: {} },
        pipeRes,
      );
      assert.equal(pipeRes.state.statusCode, 200);
      const pipeIds = pipeRes.state.body.prospects.map((row) => row.id);
      assert.equal(pipeIds.filter((id) => id === LR_ID).length, 1);
      assert.equal(pipeIds.filter((id) => id === WR_ID).length, 1);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      resetProspectFixtureStore();
    }
  });

  it('tenant sessions cannot load Action Queue or shared Prospect detail', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const tenantQueue = mockRes();
      await handleAppActionQueue(
        {
          method: 'GET',
          url: '/api/app/queue?env=core',
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        tenantQueue,
      );
      assert.equal(tenantQueue.state.statusCode, 403);
      assert.equal(tenantQueue.state.body.error, 'core_access_denied');

      const tenantSession = actorFromSessionPayload({
        typ: 'tenant',
        tenant_id: REFERENCE_TENANT_ID,
        username: 'tenant-user',
      });
      const tenantDetail = mockRes();
      await handleAppProspectDetail(
        {
          method: 'GET',
          url: `/api/app/prospect?env=core&id=${LR_ID}`,
          headers: {},
          __testAppActor: tenantSession,
        },
        tenantDetail,
      );
      assert.equal(tenantDetail.state.statusCode, 403);
      assert.equal(tenantDetail.state.body.error, 'core_access_denied');
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  it('Action Queue and shared detail surfaces label Unassigned instead of a silent dash', () => {
    const queueUi = readFileSync(join(ROOT, 'components/app/ProspectActionQueue.js'), 'utf8');
    const detailUi = readFileSync(join(ROOT, 'components/app/ProspectDetailPanel.js'), 'utf8');
    const page = readFileSync(join(ROOT, 'pages/app/queue.js'), 'utf8');
    assert.ok(queueUi.includes('Unassigned'));
    assert.ok(queueUi.includes('data-exception-signals'));
    assert.ok(queueUi.includes('/app/prospects/'));
    assert.ok(detailUi.includes('prospect-detail-owner'));
    assert.ok(detailUi.includes('Unassigned'));
    assert.ok(page.includes('/api/app/queue'));
    assert.ok(!queueUi.includes("row.owner || '—'"));
  });
});
