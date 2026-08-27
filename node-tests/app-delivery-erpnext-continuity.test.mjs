/**
 * #1156 Delivery Workspace ↔ ERPNext Project/Issue continuity.
 * Deterministic. No live ERPNext write. No secrets printed.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  actorFromSessionPayload,
  buildProofTenantActor,
} from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  attachErpnextBlock,
  projectDeliveryItems,
  projectExistingErpnextDeliveryItem,
  projectProspectToDeliveryItem,
} from '../lib/app/delivery-workspace.js';
import { handleAppDelivery } from '../lib/app/handlers.js';
import { AI_LEAD_RESCUE_PRODUCT } from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import {
  asReadOnlyFrappeClient,
  existingReferenceBlocker,
  extractExistingDeliveryPointer,
  fetchBoundedErpnextStatus,
  loadExistingDeliveryErpnextContract,
  pointerMatchesExistingContract,
} from '../lib/erpnext/delivery-continuity.js';
import { POINTER_SCHEMA as OPS_POINTER_SCHEMA } from '../lib/erpnext/projects-support-ops.js';

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

test('existing contract reuses #920/#1097 Project and Issue names', () => {
  const contract = loadExistingDeliveryErpnextContract();
  assert.equal(existingReferenceBlocker(contract), null);
  assert.equal(contract.schema, OPS_POINTER_SCHEMA);
  assert.equal(contract.delivery_ref, 'cf1097-synthetic-delivery');
  assert.equal(contract.cmp_ticket_id, 'cf1097-synthetic-support');
  assert.equal(contract.project, 'PROJ-0001');
  assert.equal(contract.issue_name, 'ISS-2026-00001');
  assert.equal(contract.customer, 'CF920 Synthetic Website Project Ltd');
  assert.equal(contract.postgres_persist, 'not_written');
});

test('pointer match uses existing contract keys only — no organisation-name join', () => {
  const contract = loadExistingDeliveryErpnextContract();
  assert.equal(
    pointerMatchesExistingContract(
      { project: 'PROJ-0001', issue_name: '', delivery_ref: '', cmp_ticket_id: '', customer: '', project_name: '' },
      contract,
    ),
    true,
  );
  assert.equal(
    pointerMatchesExistingContract(
      {
        project: '',
        issue_name: '',
        delivery_ref: '',
        cmp_ticket_id: '',
        customer: 'Ada Spa Ltd',
        project_name: 'Ada Spa website',
      },
      contract,
    ),
    false,
  );
  assert.equal(
    extractExistingDeliveryPointer({
      organisation_name: 'CF920 Synthetic Website Project Ltd',
      qualificationJson: { erpnext: { customer: 'CF920 Synthetic Website Project Ltd' } },
    }),
    null,
  );
});

test('synthetic delivery item projects identifier and bounded status without copying tasks', () => {
  const contract = loadExistingDeliveryErpnextContract();
  const item = projectExistingErpnextDeliveryItem(contract, {
    status_source: 'recorded_1097_readback',
    mutated: false,
    project: { name: 'PROJ-0001', project_name: contract.project_name, status: 'Open', customer: contract.customer },
    issue: { name: 'ISS-2026-00001', status: 'Open' },
  });
  assert.equal(item?.id, 'erpnext:cf1097-synthetic-delivery');
  assert.equal(item?.fabricated, false);
  assert.equal(item?.erpnext.linked, true);
  assert.equal(item?.erpnext.mutated, false);
  assert.equal(item?.erpnext.task_history_copied, false);
  assert.equal(item?.erpnext.project.name, 'PROJ-0001');
  assert.equal(item?.erpnext.project.status, 'Open');
  assert.equal(item?.erpnext.issue.name, 'ISS-2026-00001');
  assert.equal(item?.erpnext.issue.status, 'Open');
  assert.equal(item?.links.change, '/change');
  assert.equal(item?.links.clients, '/app/clients');
  const blob = JSON.stringify(item);
  assert.equal(blob.includes('TASK-2026-00013'), false);
  assert.equal(blob.includes('CF1097-OPS'), false);
});

test('Lead Rescue rows stay unlinked unless an existing delivery pointer is present', () => {
  const contract = loadExistingDeliveryErpnextContract();
  const lr = projectProspectToDeliveryItem({
    id: 'syn-772-lr-ada',
    product: AI_LEAD_RESCUE_PRODUCT,
    organisation_name: 'Ada Spa',
    canonical_stage: 'qualifying',
    native_status: 'QUALIFYING',
  });
  assert.equal(lr?.erpnext.linked, false);
  const items = projectDeliveryItems({
    prospects: [
      {
        id: 'syn-772-lr-ada',
        product: AI_LEAD_RESCUE_PRODUCT,
        organisation_name: 'Ada Spa',
        canonical_stage: 'qualifying',
        native_status: 'QUALIFYING',
      },
    ],
    requests: [],
    contract,
    erpnextStatus: {
      status_source: 'recorded_1097_readback',
      project: { name: 'PROJ-0001', status: 'Open' },
      issue: { name: 'ISS-2026-00001', status: 'Open' },
    },
  });
  const ada = items.find((row) => row.source_id === 'syn-772-lr-ada');
  const synthetic = items.find((row) => row.id === 'erpnext:cf1097-synthetic-delivery');
  assert.equal(ada?.erpnext.linked, false);
  assert.equal(synthetic?.erpnext.project.name, 'PROJ-0001');
});

test('existing qualification_json.erpnext.delivery pointer is projected', () => {
  const contract = loadExistingDeliveryErpnextContract();
  const record = {
    id: 'cf1097-synthetic-delivery',
    product: 'corpflow-rapid-delivery',
    organisation_name: 'CF920 Synthetic Website Project Ltd',
    canonical_stage: 'onboarding',
    native_status: 'QUALIFYING',
    qualificationJson: {
      intake_meta: { product: 'corpflow-rapid-delivery' },
      erpnext: {
        delivery: {
          schema: 'corpflow.delivery.erpnext.v1',
          delivery_ref: 'cf1097-synthetic-delivery',
          project: 'PROJ-0001',
          issue_name: 'ISS-2026-00001',
        },
      },
    },
  };
  const block = attachErpnextBlock(record, contract, {
    status_source: 'erpnext_get',
    project: { name: 'PROJ-0001', status: 'Open' },
    issue: { name: 'ISS-2026-00001', status: 'Open' },
  });
  assert.equal(block.linked, true);
  assert.equal(block.project.name, 'PROJ-0001');
  assert.equal(block.status_source, 'erpnext_get');
});

test('read-only Frappe wrapper forbids create/update', async () => {
  const readonly = asReadOnlyFrappeClient({
    async get() {
      return { ok: true, http: 200, row: { name: 'PROJ-0001', status: 'Open' } };
    },
  });
  await assert.rejects(() => readonly.create('Project', {}), /ERPNEXT_WRITE_FORBIDDEN/);
  await assert.rejects(() => readonly.update('Project', 'PROJ-0001', { status: 'Completed' }), /ERPNEXT_WRITE_FORBIDDEN/);
});

test('bounded GET copies identifier and status only', async () => {
  const client = {
    async get(doctype, name) {
      if (doctype === 'Project') {
        return {
          ok: true,
          http: 200,
          row: {
            name,
            project_name: 'CF920 Synthetic independent website',
            status: 'Open',
            customer: 'CF920 Synthetic Website Project Ltd',
            description: 'must-not-leak',
          },
        };
      }
      return {
        ok: true,
        http: 200,
        row: { name, status: 'Open', description: 'must-not-leak-issue' },
      };
    },
    async create() {
      throw new Error('should-not-create');
    },
    async update() {
      throw new Error('should-not-update');
    },
  };
  const status = await fetchBoundedErpnextStatus(client, {
    project: 'PROJ-0001',
    issue_name: 'ISS-2026-00001',
  });
  assert.equal(status.status_source, 'erpnext_get');
  assert.equal(status.project.name, 'PROJ-0001');
  assert.equal(status.project.status, 'Open');
  assert.equal(status.issue.name, 'ISS-2026-00001');
  const blob = JSON.stringify(status);
  assert.equal(blob.includes('must-not-leak'), false);
});

test('handler: proof Delivery includes existing ERPNext Project/Issue and keeps Tenant fail-closed', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppDelivery(
      {
        method: 'GET',
        url: '/api/app/delivery?proof=1&env=core&item=erpnext%3Acf1097-synthetic-delivery',
        headers: {},
      },
      res,
    );
    assert.equal(res.state.statusCode, 200);
    assert.equal(res.state.body.erpnext.mutated, false);
    assert.equal(res.state.body.erpnext.write, false);
    const synthetic = res.state.body.items.find((row) => row.id === 'erpnext:cf1097-synthetic-delivery');
    assert.equal(synthetic?.erpnext.project.name, 'PROJ-0001');
    assert.equal(synthetic?.erpnext.issue.name, 'ISS-2026-00001');
    assert.equal(synthetic?.erpnext.mutated, false);
    assert.ok(['Open', null, undefined].includes(synthetic?.erpnext.project.status) || typeof synthetic?.erpnext.project.status === 'string');
    const ada = res.state.body.items.find((row) => row.source_id === 'syn-772-lr-ada');
    assert.equal(ada?.erpnext.linked, false);
    assert.equal(res.state.body.selected?.id, 'erpnext:cf1097-synthetic-delivery');
    const blob = JSON.stringify(res.state.body);
    assert.equal(blob.includes('TASK-2026-00013'), false);
    assert.equal(blob.includes('ERPNEXT_API_SECRET'), false);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }

  const prevNodeTenant = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    const tenant = mockRes();
    await handleAppDelivery(
      {
        method: 'GET',
        url: '/api/app/delivery?env=core',
        headers: {},
        __testAppActor: buildProofTenantActor(),
      },
      tenant,
    );
    assert.equal(tenant.state.statusCode, 403);
    assert.equal(JSON.stringify(tenant.state.body).includes('PROJ-0001'), false);

    const tenantSession = mockRes();
    await handleAppDelivery(
      {
        method: 'GET',
        url: '/api/app/delivery?env=core',
        headers: {},
        __testAppActor: actorFromSessionPayload({
          typ: 'tenant',
          tenant_id: REFERENCE_TENANT_ID,
          username: 'tenant-user',
        }),
      },
      tenantSession,
    );
    assert.equal(tenantSession.state.statusCode, 403);
  } finally {
    process.env.NODE_ENV = prevNodeTenant;
  }
});
