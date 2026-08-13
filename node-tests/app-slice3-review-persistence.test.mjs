/**
 * #883 Slice 3 — expose-for-review / comment / approve persistence.
 * Proves repository-backed console_json writes (fixture + mock Prisma),
 * tenant isolation, non-exposed gate, and tenant projection hygiene.
 */
import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

import { buildProofCoreActor, buildProofTenantActor } from '../lib/app/access.js';
import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
} from '../lib/app/constants.js';
import {
  applyComponentReviewWithRepo,
  componentReviewState,
  setComponentExposureWithRepo,
} from '../lib/app/component-review.js';
import {
  handleAppComponentExpose,
  handleAppComponentReview,
  handleAppRequestDetail,
} from '../lib/app/handlers.js';
import { projectTenantRequest } from '../lib/app/project.js';
import { createFixtureRequestRepository } from '../lib/app/request-repository-fixture.js';
import { createPrismaRequestRepository } from '../lib/app/request-repository-prisma.js';
import { resetRequestStore } from '../lib/app/request-store.js';

beforeEach(() => {
  resetRequestStore();
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

function createMockPrisma(rows) {
  const store = rows.map((r) => structuredClone(r));
  return {
    cmpTicket: {
      async findMany() {
        return store.map((r) => structuredClone(r));
      },
      async findUnique({ where = {} } = {}) {
        const found = store.find((r) => r.id === where.id) || null;
        return found ? structuredClone(found) : null;
      },
      async findFirst({ where = {} } = {}) {
        const found =
          store.find((r) => r.id === where.id && r.tenantId === where.tenantId) || null;
        return found ? structuredClone(found) : null;
      },
      async update({ where = {}, data = {} } = {}) {
        const idx = store.findIndex((r) => r.id === where.id);
        if (idx < 0) throw new Error('mock_not_found');
        if (data.consoleJson !== undefined) {
          store[idx].consoleJson = structuredClone(data.consoleJson);
        }
        if (data.description !== undefined) store[idx].description = data.description;
        return { id: store[idx].id };
      },
    },
  };
}

const DB_ROWS = [
  {
    id: 'db_slice3_corpflowai',
    tenantId: REFERENCE_TENANT_ID,
    status: 'Approved',
    stage: 'Build',
    title: 'Slice 3 persistence request',
    description: 'Slice 3 persistence request',
    consoleJson: {
      client_view: {
        workflow_state: 'building',
        progress_message: 'Build in progress',
        components: [
          {
            key: 'landing_copy',
            title: 'Landing copy',
            milestone: 'in_progress',
            exposed_for_client_review: false,
            client_safe_summary: 'Headline for review',
            client_safe_status: 'In progress',
            attention_required: false,
            internal_task_ref: 'task_db_1',
            internal_note: 'Core only note',
            github: { pr_number: 883, commit_sha: 'abc123slice3', ci: 'pending' },
            reviews: [],
          },
          {
            key: 'internal_wiring',
            title: 'Internal wiring',
            milestone: 'in_progress',
            exposed_for_client_review: false,
            client_safe_summary: 'Background work',
            client_safe_status: 'In progress',
            attention_required: false,
            internal_task_ref: 'task_db_2',
            internal_note: 'Never expose',
            github: { pr_number: 874, commit_sha: 'def456', ci: 'open' },
            reviews: [],
          },
        ],
      },
      promotion: { pr_number: 883, merged: false, head_sha: 'abc123slice3' },
      technical_lead: { summary: 'Internal TL' },
    },
  },
  {
    id: 'db_slice3_other',
    tenantId: OTHER_TENANT_ID,
    status: 'Draft',
    stage: 'Intake',
    title: 'Other tenant',
    description: 'Other tenant',
    consoleJson: {
      client_view: {
        workflow_state: 'intake',
        components: [
          {
            key: 'foil',
            title: 'Foil',
            milestone: 'defined',
            exposed_for_client_review: true,
            client_safe_summary: 'Must not leak',
            client_safe_status: 'Defined',
            attention_required: true,
            reviews: [],
          },
        ],
      },
    },
  },
];

test('review_state maps expose/approve/amend cleanly', () => {
  assert.equal(
    componentReviewState({ milestone: 'in_progress', exposed_for_client_review: false }),
    'internal',
  );
  assert.equal(
    componentReviewState({ milestone: 'client_review', exposed_for_client_review: true }),
    'awaiting_client',
  );
  assert.equal(
    componentReviewState({ milestone: 'preview_ready', exposed_for_client_review: true }),
    'review_ready',
  );
  assert.equal(
    componentReviewState({ milestone: 'approved', exposed_for_client_review: true }),
    'approved',
  );
  assert.equal(
    componentReviewState({ milestone: 'changes_requested', exposed_for_client_review: true }),
    'changes_requested',
  );
});

test('fixture repo: Core expose → Tenant amend → Core sees decision', async () => {
  const repo = createFixtureRequestRepository();

  const hide = await setComponentExposureWithRepo({
    repo,
    requestId: CANONICAL_REQUEST_ID,
    componentKey: 'landing_copy',
    exposed: false,
  });
  assert.equal(hide.ok, true);
  assert.equal(hide.persistence, 'console_json');

  const blocked = await applyComponentReviewWithRepo({
    repo,
    requestId: CANONICAL_REQUEST_ID,
    tenantId: REFERENCE_TENANT_ID,
    componentKey: 'landing_copy',
    decision: 'approve',
  });
  assert.equal(blocked.error, 'component_not_exposed');

  const expose = await setComponentExposureWithRepo({
    repo,
    requestId: CANONICAL_REQUEST_ID,
    componentKey: 'landing_copy',
    exposed: true,
  });
  assert.equal(expose.ok, true);
  const exposedComp = expose.request.console_json.client_view.components.find(
    (c) => c.key === 'landing_copy',
  );
  assert.equal(exposedComp.exposed_for_client_review, true);
  assert.equal(componentReviewState(exposedComp), 'awaiting_client');

  const amend = await applyComponentReviewWithRepo({
    repo,
    requestId: CANONICAL_REQUEST_ID,
    tenantId: REFERENCE_TENANT_ID,
    componentKey: 'landing_copy',
    decision: 'amend',
    comment: 'Please shorten the headline for mobile.',
    byRole: 'tenant_member',
    nowIso: '2026-08-11T05:30:00.000Z',
  });
  assert.equal(amend.ok, true);
  assert.equal(amend.external_send, false);

  const coreGot = await repo.getForCore(CANONICAL_REQUEST_ID);
  const landing = coreGot.request.console_json.client_view.components.find(
    (c) => c.key === 'landing_copy',
  );
  assert.equal(landing.milestone, 'changes_requested');
  assert.equal(landing.reviews.at(-1).comment, 'Please shorten the headline for mobile.');
  assert.equal(landing.reviews.at(-1).by_role, 'tenant_member');
  assert.equal(
    coreGot.request.console_json.client_view.preview_review.decision,
    'request_changes',
  );

  const internal = coreGot.request.console_json.client_view.components.find(
    (c) => c.key === 'internal_wiring',
  );
  assert.equal(internal.exposed_for_client_review, false);

  const tenantProj = projectTenantRequest(coreGot.request);
  assert.equal(tenantProj.components.find((c) => c.key === 'landing_copy').review_enabled, true);
  assert.equal(tenantProj.components.find((c) => c.key === 'internal_wiring').view_only, true);
  assert.equal(
    tenantProj.components.find((c) => c.key === 'landing_copy').review_state,
    'changes_requested',
  );
});

test('Prisma mock: expose + approve persists; non-exposed stays view-only; cross-tenant fails', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const repo = createPrismaRequestRepository(createMockPrisma(DB_ROWS));
    assert.equal(repo.supportsMutations, true);
    assert.equal(repo.persistencePath, 'cmp_tickets.console_json');

    const exposeRes = mockRes();
    await handleAppComponentExpose(
      {
        method: 'POST',
        url: '/api/app/component-expose',
        headers: {},
        __testAppActor: buildProofCoreActor(),
        __testAppRepository: repo,
        body: {
          request_id: 'db_slice3_corpflowai',
          component_key: 'landing_copy',
          exposed: true,
          env: 'core',
        },
      },
      exposeRes,
    );
    assert.equal(exposeRes.state.statusCode, 200);
    assert.equal(exposeRes.state.body.exposed, true);
    assert.equal(exposeRes.state.body.persistence_path, 'cmp_tickets.console_json');
    assert.equal(
      exposeRes.state.body.request.components.find((c) => c.key === 'landing_copy')
        .review_state,
      'awaiting_client',
    );

    const tenantDetail = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=db_slice3_corpflowai`,
        headers: {},
        __testAppActor: buildProofTenantActor(),
        __testAppRepository: repo,
      },
      tenantDetail,
    );
    assert.equal(tenantDetail.state.statusCode, 200);
    const comps = tenantDetail.state.body.request.components;
    const landing = comps.find((c) => c.key === 'landing_copy');
    const internal = comps.find((c) => c.key === 'internal_wiring');
    assert.equal(landing.review_enabled, true);
    assert.equal(internal.view_only, true);
    const leaked = JSON.stringify(tenantDetail.state.body.request);
    assert.equal(leaked.includes('"github"'), false);
    assert.equal(leaked.includes('internal_note'), false);
    assert.equal(leaked.includes('commit_sha'), false);
    assert.equal(leaked.includes('technical_lead'), false);

    const reviewRes = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: {},
        __testAppActor: buildProofTenantActor(),
        __testAppRepository: repo,
        body: {
          request_id: 'db_slice3_corpflowai',
          component_key: 'landing_copy',
          decision: 'approve',
          comment: 'Looks good for Slice 3.',
          tenant_id: REFERENCE_TENANT_ID,
        },
      },
      reviewRes,
    );
    assert.equal(reviewRes.state.statusCode, 200);
    assert.equal(reviewRes.state.body.decision, 'approve');
    assert.equal(reviewRes.state.body.external_send, false);

    // Non-exposed internal cannot be reviewed
    const blocked = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: {},
        __testAppActor: buildProofTenantActor(),
        __testAppRepository: repo,
        body: {
          request_id: 'db_slice3_corpflowai',
          component_key: 'internal_wiring',
          decision: 'approve',
          tenant_id: REFERENCE_TENANT_ID,
        },
      },
      blocked,
    );
    assert.equal(blocked.state.statusCode, 403);
    assert.equal(blocked.state.body.error, 'component_not_exposed');

    // Cross-tenant review fails closed
    const xtenant = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: {},
        __testAppActor: buildProofTenantActor(),
        __testAppRepository: repo,
        body: {
          request_id: 'db_slice3_other',
          component_key: 'foil',
          decision: 'approve',
          tenant_id: REFERENCE_TENANT_ID,
        },
      },
      xtenant,
    );
    assert.equal(xtenant.state.statusCode, 404);

    // Core sees client decision evidence
    const coreDetail = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=core&id=db_slice3_corpflowai`,
        headers: {},
        __testAppActor: buildProofCoreActor(),
        __testAppRepository: repo,
      },
      coreDetail,
    );
    assert.equal(coreDetail.state.statusCode, 200);
    const coreLanding = coreDetail.state.body.request.components.find(
      (c) => c.key === 'landing_copy',
    );
    assert.equal(coreLanding.review_state, 'approved');
    assert.equal(coreLanding.latest_client_decision.decision, 'approve');
    assert.ok(String(coreLanding.latest_client_decision.comment).includes('Slice 3'));
    assert.ok(coreLanding.github);
    assert.ok(coreLanding.internal_note);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('fixture handler: other-tenant request remains invisible to CorpFlowAI tenant', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const res = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${OTHER_TENANT_REQUEST_ID}`,
        headers: {},
        __testAppActor: buildProofTenantActor(),
      },
      res,
    );
    assert.equal(res.state.statusCode, 404);
  } finally {
    process.env.NODE_ENV = prev;
  }
});
