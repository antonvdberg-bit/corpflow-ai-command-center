import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
} from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppPipeline,
  handleAppProspectDetail,
  handleAppProspects,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import {
  buildProspectPipelinePayload,
  enrichPipelineCard,
  filterPipelineProspects,
  groupProspectsByCanonicalStage,
  pipelineStageAgeDays,
} from '../lib/app/prospect-operations-pipeline.js';
import {
  fixtureProspectLeadRows,
  projectProspectLeadRows,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import { PROSPECT_PIPELINE_PATH } from '../lib/app/workspace-context.js';
import { PROSPECT_CANONICAL_STAGES } from '../lib/cmp/_lib/prospect-operations-view-model.js';

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

describe('Prospect Pipeline #997', { concurrency: false }, () => {
  test('groups shared prospects into canonical stage lanes', () => {
    const now = new Date('2026-08-19T12:00:00.000Z');
    const prospects = projectProspectLeadRows(fixtureProspectLeadRows(), now);
    const lanes = groupProspectsByCanonicalStage(prospects);
    assert.equal(lanes.length, PROSPECT_CANONICAL_STAGES.length);
    const newLane = lanes.find((lane) => lane.stage === 'new');
    const qualifying = lanes.find((lane) => lane.stage === 'qualifying');
    assert.ok(newLane.prospects.some((row) => row.id === 'syn-772-rd-bea'));
    assert.ok(qualifying.prospects.some((row) => row.id === 'syn-772-lr-ada'));
    assert.ok(qualifying.prospects.some((row) => row.id === 'syn-772-lr-cal'));
  });

  test('filters by owner, product and urgency without inventing a second model', () => {
    const now = new Date('2026-08-19T12:00:00.000Z');
    const prospects = projectProspectLeadRows(fixtureProspectLeadRows(), now);
    const byOwner = filterPipelineProspects(prospects, { owner: 'anton' });
    assert.ok(byOwner.every((row) => String(row.owner).toLowerCase() === 'anton'));
    assert.ok(byOwner.some((row) => row.id === 'syn-772-lr-ada'));
    assert.equal(
      byOwner.some((row) => row.id === 'syn-772-rd-bea'),
      false,
    );
    const byProduct = filterPipelineProspects(prospects, { product: 'corpflow-rapid-delivery' });
    assert.ok(byProduct.every((row) => row.product === 'corpflow-rapid-delivery'));
    assert.ok(byProduct.some((row) => row.id === 'syn-772-rd-bea'));
    assert.ok(byProduct.some((row) => row.id === 'syn-716-wr-cleared'));
    const byUrgency = filterPipelineProspects(prospects, { urgency: 'asap' });
    assert.ok(byUrgency.every((row) => String(row.urgency).toLowerCase() === 'asap'));
    assert.ok(byUrgency.some((row) => row.id === 'syn-772-rd-bea'));
    assert.ok(byUrgency.some((row) => row.id === 'syn-1171-wr-enquiry'));
  });

  test('stage-age uses existing timestamps and marks stale cards', () => {
    const now = new Date('2026-08-19T12:00:00.000Z');
    const card = enrichPipelineCard(
      {
        id: 'x',
        canonical_stage: 'qualifying',
        last_meaningful_activity_at: '2026-08-01T00:00:00.000Z',
        exception_signals: ['stalled_no_activity'],
      },
      now,
    );
    assert.equal(pipelineStageAgeDays(card, now), 18);
    assert.equal(card.stale, true);
    assert.ok(card.allowed_canonical_stages.includes('discovery_booked'));
    assert.equal(card.allowed_canonical_stages.includes('qualifying'), false);
    assert.equal(card.shared_detail_path, '/app/prospects/x');
  });

  test('payload is Operating Workspace canonical and not localStorage', () => {
    const now = new Date('2026-08-19T12:00:00.000Z');
    const payload = buildProspectPipelinePayload({
      prospects: projectProspectLeadRows(fixtureProspectLeadRows(), now),
      data_source: 'fixture',
      proof_mode: true,
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.path, PROSPECT_PIPELINE_PATH);
    assert.equal(payload.view, 'pipeline');
    assert.equal(payload.canonical, true);
    assert.equal(payload.localStorage_canonical, false);
    assert.equal(payload.legacy_checklist, '/change/revenue');
    assert.equal(payload.external_send, false);
    assert.equal(payload.temporary_source_surfaces.kanban, '/app/pipeline');
    assert.ok(payload.prospects.every((row) => String(row.shared_detail_path).startsWith('/app/prospects/')));
    assert.equal(JSON.stringify(payload).includes('qualificationJson'), false);
  });

  test('pipeline page and board do not use localStorage', () => {
    const page = readFileSync(fileURLToPath(new URL('../pages/app/pipeline.js', import.meta.url)), 'utf8');
    const board = readFileSync(
      fileURLToPath(new URL('../components/app/ProspectPipelineBoard.js', import.meta.url)),
      'utf8',
    );
    const revenue = readFileSync(fileURLToPath(new URL('../pages/change/revenue.js', import.meta.url)), 'utf8');
    assert.match(page, /\/api\/app\/pipeline/);
    assert.match(page, /\/api\/app\/prospect/);
    assert.doesNotMatch(page, /localStorage/);
    assert.match(board, /pipeline-detail-/);
    assert.match(board, /Persist stage/);
    assert.doesNotMatch(board, /localStorage/);
    assert.match(revenue, /\/app\/pipeline/);
    assert.match(revenue, /optional personal checklist/i);
  });

  test('handler: Core proof loads synthetic prospects in Pipeline lanes', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    try {
      const res = mockRes();
      await handleAppPipeline(
        { method: 'GET', url: '/api/app/pipeline?proof=1&env=core', headers: {} },
        res,
      );
      assert.equal(res.state.statusCode, 200);
      assert.equal(res.state.body.ok, true);
      assert.equal(res.state.body.workspace, 'operating');
      assert.equal(res.state.body.path, '/app/pipeline');
      assert.equal(res.state.body.data_source, 'fixture');
      assert.equal(res.state.body.localStorage_canonical, false);
      const ids = res.state.body.prospects.map((row) => row.id);
      assert.ok(ids.includes('syn-772-lr-ada'));
      assert.ok(ids.includes('syn-772-rd-bea'));
      const qualifying = res.state.body.lanes.find((lane) => lane.stage === 'qualifying');
      assert.ok(qualifying.prospects.some((row) => row.id === 'syn-772-lr-ada'));
      assert.ok(res.state.body.prospects.every((row) => row.shared_detail_path));
      assert.equal(JSON.stringify(res.state.body).includes('qualificationJson'), false);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  });

  test('handler: Tenant actor cannot load Pipeline', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const res = mockRes();
      await handleAppPipeline(
        {
          method: 'GET',
          url: '/api/app/pipeline?env=tenant',
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        res,
      );
      assert.equal(res.state.statusCode, 403);
      assert.equal(res.state.body.error, 'core_access_denied');

      const tenantActor = actorFromSessionPayload({
        typ: 'tenant',
        tenant_id: REFERENCE_TENANT_ID,
        username: 'tenant-user',
      });
      const res2 = mockRes();
      await handleAppPipeline(
        {
          method: 'GET',
          url: '/api/app/pipeline?env=core',
          headers: {},
          __testAppActor: tenantActor,
        },
        res2,
      );
      assert.equal(res2.state.statusCode, 403);
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  test('cross-view: persisted stage move is visible in Pipeline and Prospect Operations', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    try {
      const patchRes = mockRes();
      await handleAppProspectDetail(
        {
          method: 'PATCH',
          url: '/api/app/prospect?proof=1&env=core&id=syn-772-rd-bea',
          headers: {},
          body: {
            id: 'syn-772-rd-bea',
            canonical_stage: 'qualifying',
            intervention: 'change_stage',
          },
        },
        patchRes,
      );
      assert.equal(patchRes.state.statusCode, 200);
      assert.equal(patchRes.state.body.prospect.canonical_stage, 'qualifying');

      const pipelineRes = mockRes();
      await handleAppPipeline(
        { method: 'GET', url: '/api/app/pipeline?proof=1&env=core', headers: {} },
        pipelineRes,
      );
      assert.equal(pipelineRes.state.statusCode, 200);
      const beaCard = pipelineRes.state.body.prospects.find((row) => row.id === 'syn-772-rd-bea');
      assert.equal(beaCard.canonical_stage, 'qualifying');
      const qualifying = pipelineRes.state.body.lanes.find((lane) => lane.stage === 'qualifying');
      assert.ok(qualifying.prospects.some((row) => row.id === 'syn-772-rd-bea'));

      const listRes = mockRes();
      await handleAppProspects(
        { method: 'GET', url: '/api/app/prospects?proof=1&env=core', headers: {} },
        listRes,
      );
      const beaList = listRes.state.body.prospects.find((row) => row.id === 'syn-772-rd-bea');
      assert.equal(beaList.canonical_stage, 'qualifying');
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  });

  test('invalid stage transitions fail safely and do not move the card', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    try {
      const patchRes = mockRes();
      await handleAppProspectDetail(
        {
          method: 'PATCH',
          url: '/api/app/prospect?proof=1&env=core&id=syn-772-rd-bea',
          headers: {},
          body: {
            id: 'syn-772-rd-bea',
            canonical_stage: 'won',
            intervention: 'change_stage',
          },
        },
        patchRes,
      );
      assert.equal(patchRes.state.statusCode, 400);
      assert.equal(patchRes.state.body.error, 'invalid_stage_transition');

      const pipelineRes = mockRes();
      await handleAppPipeline(
        { method: 'GET', url: '/api/app/pipeline?proof=1&env=core', headers: {} },
        pipelineRes,
      );
      const beaCard = pipelineRes.state.body.prospects.find((row) => row.id === 'syn-772-rd-bea');
      assert.equal(beaCard.canonical_stage, 'new');
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  });

  test('tryHandleAppApi routes app/pipeline', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const res = mockRes();
      const handled = await tryHandleAppApi(
        {
          method: 'GET',
          url: '/api/app/pipeline',
          headers: {},
          __testAppActor: buildProofCoreActor(),
        },
        res,
        'app/pipeline',
      );
      assert.equal(handled, true);
      assert.equal(res.state.statusCode, 200);
      assert.equal(res.state.body.path, '/app/pipeline');
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});
