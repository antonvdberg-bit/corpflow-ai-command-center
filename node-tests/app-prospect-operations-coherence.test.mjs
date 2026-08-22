import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { buildProofTenantActor } from '../lib/app/access.js';
import {
  handleAppActionQueue,
  handleAppPipeline,
  handleAppProspectDetail,
  handleAppToday,
  handleAppWorkbench,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

const TRACE_ID = 'syn-772-lr-ada';

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

async function getJson(handler, url) {
  const res = mockRes();
  await handler({ method: 'GET', url, headers: {} }, res);
  return res.state;
}

afterEach(() => {
  resetProspectFixtureStore();
});

describe('Prospect Operations production-coherence #1040', { concurrency: false }, () => {
  test('one synthetic prospect is consistent across Today, Queue, Workbench, Pipeline and shared detail', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    resetProspectFixtureStore();
    try {
      const today = await getJson(handleAppToday, '/api/app/today?proof=1&env=core');
      const queue = await getJson(handleAppActionQueue, '/api/app/queue?proof=1&env=core&filter=all');
      const workbench = await getJson(handleAppWorkbench, '/api/app/workbench?proof=1&env=core&filter=all');
      const pipeline = await getJson(handleAppPipeline, '/api/app/pipeline?proof=1&env=core');
      const detail = await getJson(
        handleAppProspectDetail,
        `/api/app/prospect?proof=1&env=core&id=${TRACE_ID}`,
      );

      assert.equal(today.statusCode, 200);
      assert.equal(queue.statusCode, 200);
      assert.equal(workbench.statusCode, 200);
      assert.equal(pipeline.statusCode, 200);
      assert.equal(detail.statusCode, 200);

      const todayRow = today.body.prospects.find((row) => row.id === TRACE_ID);
      const queueRow = queue.body.prospects.find((row) => row.id === TRACE_ID);
      const workbenchRow = workbench.body.prospects.find((row) => row.id === TRACE_ID);
      const pipelineRow = pipeline.body.prospects.find((row) => row.id === TRACE_ID);
      assert.ok(todayRow, 'Today / My Work must show the overdue Ada prospect');
      assert.ok(queueRow, 'Action Queue must include Ada');
      assert.ok(workbenchRow, 'Workbench must include Ada');
      assert.ok(pipelineRow, 'Pipeline must include Ada');
      assert.equal(detail.body.prospect.id, TRACE_ID);

      for (const row of [todayRow, queueRow, workbenchRow, pipelineRow, detail.body.prospect]) {
        assert.equal(row.shared_detail_path, `/app/prospects/${TRACE_ID}`);
        assert.equal(row.canonical_stage, 'qualifying');
        assert.equal(row.owner, 'anton');
      }

      const save = mockRes();
      await handleAppProspectDetail(
        {
          method: 'PATCH',
          url: `/api/app/prospect?proof=1&env=core&id=${TRACE_ID}`,
          headers: {},
          body: {
            owner: 'coherence-ops',
            next_action: 'Book discovery from Workbench',
            note_append: 'Edited once for #1040 cross-view proof',
          },
        },
        save,
      );
      assert.equal(save.state.statusCode, 200);
      assert.equal(save.state.body.prospect.owner, 'coherence-ops');

      const invalid = mockRes();
      await handleAppProspectDetail(
        {
          method: 'PATCH',
          url: `/api/app/prospect?proof=1&env=core&id=${TRACE_ID}`,
          headers: {},
          body: { canonical_stage: 'won' },
        },
        invalid,
      );
      assert.equal(invalid.state.statusCode, 400);
      assert.equal(invalid.state.body.error, 'invalid_stage_transition');

      const move = mockRes();
      await handleAppProspectDetail(
        {
          method: 'PATCH',
          url: `/api/app/prospect?proof=1&env=core&id=${TRACE_ID}`,
          headers: {},
          body: { canonical_stage: 'discovery_booked' },
        },
        move,
      );
      assert.equal(move.state.statusCode, 200);
      assert.equal(move.state.body.prospect.canonical_stage, 'discovery_booked');

      const today2 = await getJson(handleAppToday, '/api/app/today?proof=1&env=core');
      const queue2 = await getJson(handleAppActionQueue, '/api/app/queue?proof=1&env=core&filter=all');
      const workbench2 = await getJson(handleAppWorkbench, '/api/app/workbench?proof=1&env=core&filter=all');
      const pipeline2 = await getJson(handleAppPipeline, '/api/app/pipeline?proof=1&env=core');
      const detail2 = await getJson(
        handleAppProspectDetail,
        `/api/app/prospect?proof=1&env=core&id=${TRACE_ID}`,
      );

      const refreshed = [
        today2.body.prospects.find((row) => row.id === TRACE_ID),
        queue2.body.prospects.find((row) => row.id === TRACE_ID),
        workbench2.body.prospects.find((row) => row.id === TRACE_ID),
        pipeline2.body.prospects.find((row) => row.id === TRACE_ID),
        detail2.body.prospect,
      ];
      for (const row of refreshed) {
        assert.ok(row);
        assert.equal(row.owner, 'coherence-ops');
        assert.equal(row.next_action, 'Book discovery from Workbench');
        assert.equal(row.canonical_stage, 'discovery_booked');
        assert.equal(row.shared_detail_path, `/app/prospects/${TRACE_ID}`);
      }

      const adaCount = pipeline2.body.prospects.filter((row) => row.id === TRACE_ID).length;
      assert.equal(adaCount, 1);
      assert.equal(queue2.body.external_send, false);
      assert.equal(detail2.body.email_sent, false);
      assert.equal(detail2.body.payment_processed, false);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
      resetProspectFixtureStore();
    }
  });

  test('Tenant Workspace cannot access staff-only Prospect Operations APIs', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const tenant = buildProofTenantActor();
      const urls = [
        [handleAppToday, '/api/app/today?env=tenant'],
        [handleAppActionQueue, '/api/app/queue?env=tenant'],
        [handleAppWorkbench, '/api/app/workbench?env=tenant'],
        [handleAppPipeline, '/api/app/pipeline?env=tenant'],
        [handleAppProspectDetail, `/api/app/prospect?env=tenant&id=${TRACE_ID}`],
      ];
      for (const [handler, url] of urls) {
        const res = mockRes();
        await handler({ method: 'GET', url, headers: {}, __testAppActor: tenant }, res);
        assert.equal(res.state.statusCode, 403, url);
        assert.equal(res.state.body.error, 'core_access_denied', url);
      }
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});
