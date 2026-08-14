import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AI_LEAD_RESCUE_PRODUCT } from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../lib/cmp/_lib/rapid-delivery-operator.js';
import {
  assertProspectOperationsAccess,
  buildProspectOperationsPayload,
  fixtureProspectLeadRows,
  projectProspectLeadRows,
  publicProspectListItem,
  resolveProspectOperationsDataSource,
} from '../lib/app/prospect-operations-workspace.js';

const NOW = new Date('2026-08-03T12:00:00.000Z');

describe('prospect-operations-workspace — projection', () => {
  it('projects fixture Lead Rescue and Rapid Delivery rows through the #721 view-model', () => {
    const list = projectProspectLeadRows(fixtureProspectLeadRows(), NOW);
    assert.equal(list.length, 2);
    const products = list.map((row) => row.product).sort();
    assert.deepEqual(products, [AI_LEAD_RESCUE_PRODUCT, RAPID_DELIVERY_PRODUCT].sort());
    assert.ok(list.every((row) => Array.isArray(row.exception_signals)));
    assert.ok(list.every((row) => row.email == null));
    assert.ok(list.every((row) => row.phone == null));
    assert.ok(list.every((row) => !Object.prototype.hasOwnProperty.call(row, 'qualificationJson')));
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

  it('omits contact fields from the public list item', () => {
    const publicItem = publicProspectListItem({
      id: 'x',
      email: 'hidden@example.com',
      phone: '+230',
      person_name: 'Ada',
      qualificationJson: { secret: true },
    });
    assert.equal(publicItem.email, undefined);
    assert.equal(publicItem.phone, undefined);
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

  it('builds a staff-only payload without send flags', () => {
    const payload = buildProspectOperationsPayload({
      prospects: [{ id: 'a' }],
      data_source: 'fixture',
      proof_mode: true,
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.workspace, 'operating');
    assert.equal(payload.path, '/app/prospects');
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
