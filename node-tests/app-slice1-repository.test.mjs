import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  SECOND_REQUEST_ID,
} from '../lib/app/constants.js';
import {
  normalizeCmpTicketRow,
  normalizeCmpTicketRowDetailed,
} from '../lib/app/request-normalize.js';
import {
  createFixtureRequestRepository,
} from '../lib/app/request-repository-fixture.js';
import {
  createPrismaRequestRepository,
} from '../lib/app/request-repository-prisma.js';
import {
  resolveRequestDataSource,
  getRequestRepository,
} from '../lib/app/request-repository-select.js';
import { projectTenantRequest } from '../lib/app/project.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  handleAppComponentReview,
  handleAppRequestDetail,
} from '../lib/app/handlers.js';
import { buildProofTenantActor } from '../lib/app/access.js';

beforeEach(() => {
  resetRequestStore();
});

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function createMockPrisma(rows) {
  const store = rows.map((r) => ({ ...r }));
  return {
    cmpTicket: {
      async findMany({ where = {} } = {}) {
        let out = store.slice();
        if (where.tenantId != null && typeof where.tenantId === 'string') {
          out = out.filter((r) => r.tenantId === where.tenantId);
        } else if (where.tenantId && where.tenantId.not === null) {
          out = out.filter((r) => r.tenantId != null && String(r.tenantId).trim() !== '');
        }
        if (where.status && where.status.equals) {
          const s = String(where.status.equals).toLowerCase();
          out = out.filter((r) => String(r.status || '').toLowerCase() === s);
        }
        if (where.id && where.id.in) {
          const set = new Set(where.id.in);
          out = out.filter((r) => set.has(r.id));
        }
        return out;
      },
      async findUnique({ where = {} } = {}) {
        return store.find((r) => r.id === where.id) || null;
      },
      async findFirst({ where = {} } = {}) {
        return (
          store.find((r) => r.id === where.id && r.tenantId === where.tenantId) || null
        );
      },
      async update() {
        throw new Error('write_not_allowed_in_mock');
      },
      async create() {
        throw new Error('write_not_allowed_in_mock');
      },
    },
  };
}

const MOCK_ROWS = [
  {
    id: 'db_req_corpflowai_a',
    tenantId: REFERENCE_TENANT_ID,
    status: 'Approved',
    stage: 'Build',
    title: 'DB-shaped request A',
    description: 'DB-shaped request A',
    consoleJson: {
      client_view: {
        workflow_state: 'in_review',
        progress_message: 'Review ready',
        components: [
          {
            key: 'landing',
            title: 'Landing',
            milestone: 'client_review',
            exposed_for_client_review: true,
            client_safe_summary: 'Copy',
            client_safe_status: 'Ready',
            attention_required: true,
            reviews: [],
          },
        ],
      },
    },
    updatedAt: new Date('2026-08-06T12:00:00.000Z'),
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
  },
  {
    id: 'db_req_corpflowai_b',
    tenantId: REFERENCE_TENANT_ID,
    status: 'Draft',
    stage: 'Intake',
    title: 'DB-shaped request B',
    description: 'DB-shaped request B',
    consoleJson: {
      client_view: { workflow_state: 'intake', progress_message: 'Intake' },
    },
    updatedAt: new Date('2026-08-05T12:00:00.000Z'),
    createdAt: new Date('2026-08-02T12:00:00.000Z'),
  },
  {
    id: 'db_req_other',
    tenantId: OTHER_TENANT_ID,
    status: 'Open',
    stage: 'Intake',
    title: 'Other tenant',
    description: 'Other tenant',
    consoleJson: { client_view: { workflow_state: 'intake' } },
    updatedAt: new Date('2026-08-04T12:00:00.000Z'),
    createdAt: new Date('2026-08-03T12:00:00.000Z'),
  },
  {
    id: 'db_req_missing_tenant',
    tenantId: null,
    status: 'Open',
    stage: 'Intake',
    title: 'Orphan',
    description: 'Orphan missing tenant',
    consoleJson: { client_view: { workflow_state: 'intake' } },
    updatedAt: new Date('2026-08-03T12:00:00.000Z'),
    createdAt: new Date('2026-08-03T12:00:00.000Z'),
  },
];

test('missing tenant ID fails closed and does not become CorpFlowAI', () => {
  const detailed = normalizeCmpTicketRowDetailed({
    id: 'orphan_1',
    tenantId: null,
    status: 'Open',
    stage: 'Intake',
    description: 'no tenant',
    consoleJson: {},
  });
  assert.equal(detailed.ok, false);
  assert.equal(detailed.error, 'missing_tenant_id');
  assert.equal(normalizeCmpTicketRow({ id: 'orphan_1', tenant_id: '' }), null);
  assert.equal(normalizeCmpTicketRow({ id: 'orphan_1' }), null);
  const ok = normalizeCmpTicketRow({
    id: 'ok_1',
    tenantId: REFERENCE_TENANT_ID,
    status: 'Draft',
    description: 'ok',
  });
  assert.ok(ok);
  assert.equal(ok.tenant_id, REFERENCE_TENANT_ID);
});

test('fixture and Prisma repositories normalize through the same adapter', async () => {
  const fixtureRepo = createFixtureRequestRepository();
  const prismaRepo = createPrismaRequestRepository(createMockPrisma(MOCK_ROWS));

  const fixtureListed = await fixtureRepo.listForCore({ tenantFilter: REFERENCE_TENANT_ID });
  assert.ok(fixtureListed.requests.length >= 2);
  assert.equal(fixtureListed.data_source, 'fixture');

  const dbListed = await prismaRepo.listForCore({ tenantFilter: REFERENCE_TENANT_ID });
  assert.equal(dbListed.requests.length, 2);
  assert.equal(dbListed.data_source, 'cmp_tickets_read');
  assert.ok(dbListed.requests.every((r) => r.tenant_id === REFERENCE_TENANT_ID));

  const a = await prismaRepo.getForCore('db_req_corpflowai_a');
  const tenant = projectTenantRequest(a.request);
  assert.equal(tenant.request_id, a.request.id);
  assert.equal(JSON.stringify(tenant).includes('github'), false);
});

test('Core repository returns multiple normalized cmp_tickets-shaped rows + filters', async () => {
  const repo = createPrismaRequestRepository(createMockPrisma(MOCK_ROWS));
  const global = await repo.listForCore({});
  assert.ok(global.requests.length >= 3);
  assert.equal(
    global.requests.some((r) => !r.tenant_id),
    false,
  );

  const byTenant = await repo.listForCore({ tenantFilter: OTHER_TENANT_ID });
  assert.equal(byTenant.requests.length, 1);
  assert.equal(byTenant.requests[0].id, 'db_req_other');

  const byStatus = await repo.listForCore({
    tenantFilter: REFERENCE_TENANT_ID,
    statusFilter: 'Draft',
  });
  assert.equal(byStatus.requests.length, 1);
  assert.equal(byStatus.requests[0].id, 'db_req_corpflowai_b');
});

test('Tenant repository read includes tenant constraint; cross-tenant ID fails', async () => {
  const repo = createPrismaRequestRepository(createMockPrisma(MOCK_ROWS));
  const listed = await repo.listForTenant(REFERENCE_TENANT_ID);
  assert.equal(listed.requests.length, 2);
  assert.ok(listed.requests.every((r) => r.tenant_id === REFERENCE_TENANT_ID));

  const denied = await repo.getForTenant('db_req_other', REFERENCE_TENANT_ID);
  assert.equal(denied.request, null);

  const ok = await repo.getForTenant('db_req_corpflowai_a', REFERENCE_TENANT_ID);
  assert.ok(ok.request);
  assert.equal(ok.request.id, 'db_req_corpflowai_a');
});

test('Core get of missing-tenant row reports data quality; Tenant never receives it', async () => {
  const repo = createPrismaRequestRepository(createMockPrisma(MOCK_ROWS));
  const core = await repo.getForCore('db_req_missing_tenant');
  assert.equal(core.request, null);
  assert.equal(core.data_quality, 'missing_tenant_id');

  const tenant = await repo.getForTenant('db_req_missing_tenant', REFERENCE_TENANT_ID);
  assert.equal(tenant.request, null);
});

test('same canonical identity across fixture Core/Tenant paths', async () => {
  const repo = createFixtureRequestRepository();
  const core = await repo.getForCore(CANONICAL_REQUEST_ID);
  const tenant = await repo.getForTenant(CANONICAL_REQUEST_ID, REFERENCE_TENANT_ID);
  assert.equal(core.request.id, tenant.request.id);
  assert.equal(core.request.id, CANONICAL_REQUEST_ID);
  assert.notEqual(SECOND_REQUEST_ID, OTHER_TENANT_REQUEST_ID);
});

test('DB-backed read path performs NO writes', async () => {
  const repo = createPrismaRequestRepository(createMockPrisma(MOCK_ROWS));
  assert.equal(repo.supportsMutations, false);
  await repo.listForCore({});
  await repo.listForTenant(REFERENCE_TENANT_ID);
  await repo.getForCore('db_req_corpflowai_a');
  await repo.getForTenant('db_req_corpflowai_a', REFERENCE_TENANT_ID);
  const updated = await repo.updateRequest('db_req_corpflowai_a', () => {});
  assert.equal(updated, null);
  assert.equal(repo.getWriteAttemptCount(), 1);
});

test('selector: proof/test/no-db → fixture; forceCmpTicketsRead with prisma mock', () => {
  assert.equal(resolveRequestDataSource({ nodeEnv: 'test' }), 'fixture');
  assert.equal(resolveRequestDataSource({ proofMode: true, nodeEnv: 'development' }), 'fixture');
  assert.equal(
    resolveRequestDataSource({ forceCmpTicketsRead: true, nodeEnv: 'development' }),
    'cmp_tickets_read',
  );
  const repo = getRequestRepository({
    forceCmpTicketsRead: true,
    prisma: createMockPrisma(MOCK_ROWS),
  });
  assert.equal(repo.dataSource, 'cmp_tickets_read');
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

test('handler: DB-backed review is unavailable (read-only); no external send', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const repo = createPrismaRequestRepository(createMockPrisma(MOCK_ROWS));
    const res = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: {},
        __testAppActor: buildProofTenantActor(),
        __testAppRepository: repo,
        body: {
          request_id: 'db_req_corpflowai_a',
          component_key: 'landing',
          decision: 'approve',
          tenant_id: REFERENCE_TENANT_ID,
        },
      },
      res,
    );
    assert.equal(res.state.statusCode, 409);
    assert.equal(res.state.body.error, 'persistence_unavailable');
    assert.equal(res.state.body.external_send, false);
    assert.equal(res.state.body.data_source, 'cmp_tickets_read');
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('handler: Tenant cannot retrieve another tenant request via repository', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const repo = createPrismaRequestRepository(createMockPrisma(MOCK_ROWS));
    const res = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=db_req_other`,
        headers: {},
        __testAppActor: buildProofTenantActor(),
        __testAppRepository: repo,
      },
      res,
    );
    assert.equal(res.state.statusCode, 404);
  } finally {
    process.env.NODE_ENV = prev;
  }
});
