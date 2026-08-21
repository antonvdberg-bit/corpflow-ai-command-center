import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AI_LEAD_RESCUE_PRODUCT } from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../lib/cmp/_lib/rapid-delivery-operator.js';
import {
  assertProspectOperationsAccess,
  buildProspectOperationsPayload,
  filterProspectsForMyWorkToday,
  fixtureProspectLeadRows,
  projectProspectLeadRows,
  projectProspectWorkbenchRows,
  publicProspectListItem,
  resolveProspectOperationsDataSource,
} from '../lib/app/prospect-operations-workspace.js';

const NOW = new Date('2026-08-03T12:00:00.000Z');

describe('prospect-operations-workspace — projection', () => {
  it('projects fixture Lead Rescue and Rapid Delivery rows through the #721 view-model', () => {
    const list = projectProspectLeadRows(fixtureProspectLeadRows(), NOW);
    assert.equal(list.length, 3);
    const products = [...new Set(list.map((row) => row.product))].sort();
    assert.deepEqual(products, [AI_LEAD_RESCUE_PRODUCT, RAPID_DELIVERY_PRODUCT].sort());
    assert.ok(list.every((row) => Array.isArray(row.exception_signals)));
    assert.ok(list.some((row) => row.email));
    assert.ok(list.some((row) => row.phone));
    const bea = list.find((row) => row.id === 'syn-772-rd-bea');
    assert.ok(bea);
    assert.equal(bea.problem_summary, 'Weak enquiry path on the existing site');
    assert.ok(bea.response_draft);
    assert.equal(bea.source_surfaces.kanban, '/app/prospects');
    assert.ok(list.every((row) => !Object.prototype.hasOwnProperty.call(row, 'qualificationJson')));
  });

  it('projects Workbench rows including general market enquiries', () => {
    const list = projectProspectWorkbenchRows(fixtureProspectLeadRows(), NOW);
    const ids = list.map((row) => row.id);
    assert.ok(ids.includes('syn-772-lr-ada'));
    assert.ok(ids.includes('syn-772-rd-bea'));
    assert.ok(ids.includes('syn-996-gen-dee'));
    const dee = list.find((row) => row.id === 'syn-996-gen-dee');
    assert.equal(dee.product, 'unknown');
    assert.equal(dee.organisation_name, 'Dee Advisory');
    assert.equal(dee.shared_detail_path, '/app/prospects/syn-996-gen-dee');
  });

  it('sorts overdue Action Queue items first', () => {
    const list = projectProspectLeadRows(fixtureProspectLeadRows(), NOW);
    assert.equal(list[0].id, 'syn-772-lr-ada');
    assert.ok(list[0].exception_signals.includes('overdue_action'));
  });

  it('ignores unknown product rows', () => {
    const list = projectProspectLeadRows(
      [
        {
          id: 'other',
          tenantId: 'corpflowai',
          name: 'Ignore',
          qualificationJson: { intake_meta: { product: 'something-else' } },
        },
      ],
      NOW,
    );
    assert.equal(list.length, 0);
  });

  it('includes staff contact and enquiry-handoff fields; omits raw qualificationJson', () => {
    const publicItem = publicProspectListItem({
      id: 'x',
      email: 'ada@example.com',
      phone: '+230',
      person_name: 'Ada',
      problem_summary: 'Lost enquiries',
      response_draft: 'Hi Ada',
      qualificationJson: { secret: true },
    });
    assert.equal(publicItem.email, 'ada@example.com');
    assert.equal(publicItem.phone, '+230');
    assert.equal(publicItem.problem_summary, 'Lost enquiries');
    assert.equal(publicItem.response_draft, 'Hi Ada');
    assert.equal(publicItem.qualificationJson, undefined);
    assert.equal(publicItem.person_name, 'Ada');
  });
});

describe('prospect-operations-workspace — access and payload', () => {
  it('denies Tenant actors and allows Core actors', () => {
    assert.equal(assertProspectOperationsAccess(null).http_status, 401);
    assert.equal(
      assertProspectOperationsAccess({
        can_core: false,
        environment: 'tenant',
      }).error,
      'core_access_denied',
    );
    assert.equal(
      assertProspectOperationsAccess({
        can_core: true,
        environment: 'core',
      }).ok,
      true,
    );
  });

  it('filters Today / My Work to overdue, due today, missing next action, or awaiting operator', () => {
    const list = projectProspectLeadRows(fixtureProspectLeadRows(), NOW);
    const today = filterProspectsForMyWorkToday(list, NOW);
    const ids = today.map((row) => row.id);
    assert.ok(ids.includes('syn-772-lr-ada'));
    assert.equal(ids.includes('syn-772-lr-cal'), false);
    assert.ok(today.length < list.length);
  });

  it('builds a staff-only payload without send flags', () => {
    const payload = buildProspectOperationsPayload({
      prospects: [{ id: 'a' }],
      data_source: 'fixture',
      proof_mode: true,
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.workspace, 'operating');
    assert.equal(payload.path, '/app/prospects');
    assert.equal(payload.canonical_operator_surface, '/app/prospects');
    assert.equal(payload.temporary_source_surfaces.kanban, '/app/prospects');
    assert.equal(payload.temporary_source_surfaces.workbench, '/app/workbench');
    assert.equal(payload.external_send, false);
    assert.equal(payload.count, 1);
  });

  it('uses fixture data source in test / proof / no-db modes', () => {
    assert.equal(resolveProspectOperationsDataSource({ nodeEnv: 'test' }), 'fixture');
    assert.equal(resolveProspectOperationsDataSource({ proofMode: true, nodeEnv: 'production' }), 'fixture');
    assert.equal(
      resolveProspectOperationsDataSource({ forceFixture: true, nodeEnv: 'production' }),
      'fixture',
    );
  });
});
