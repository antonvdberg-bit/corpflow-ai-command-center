import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  assertBranchName,
  OPENHANDS_BRANCH_PREFIX,
  REQUIRED_FIELDS,
  validateOpenHandsWorkPacket,
} from '../lib/openhands/work-packet.js';

const workPacketSchemaPath = 'config/openhands/work-packet.schema.json';

/**
 * @param {Record<string, unknown>} overrides
 */
function validPacket(overrides = {}) {
  return {
    packet_id: 'openhands-743-doc-fix-01',
    parent_issue: 743,
    objective: 'Fix a stale link in docs/operations/OPENHANDS_AGENT_HANDOFF.md',
    business_value: 'Keeps handoff doc accurate for the next agent.',
    allowed_files: ['docs/operations/OPENHANDS_AGENT_HANDOFF.md'],
    excluded_files: ['lib/', 'api/', 'prisma/'],
    acceptance_tests: ['npm test'],
    expected_evidence: ['diff', 'PR link'],
    protected_gates: ['production_deploy', 'auth_or_session_logic_change'],
    maximum_attempts: 2,
    escalation_condition: 'Escalate to Cursor after 2 failed attempts.',
    branch_name: 'openhands/743-doc-fix-01',
    intended_agent_owner: 'openhands',
    collision_sensitive_paths: ['docs/operations/OPENHANDS_AGENT_HANDOFF.md'],
    model_class: 'low_cost',
    cost_risk_cap: 5,
    timeout_seconds: 1800,
    real_client_data_permitted: false,
    production_mutation_permitted: false,
    external_action_permitted: false,
    ...overrides,
  };
}

describe('openhands work-packet schema', () => {
  it('accepts a fully-formed valid packet', () => {
    const result = validateOpenHandsWorkPacket(validPacket());
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.deepEqual(result.errors, []);
    assert.equal(result.packet?.packet_id, 'openhands-743-doc-fix-01');
    assert.equal(result.packet?.intended_agent_owner, 'openhands');
  });

  it('rejects a non-object input', () => {
    const result = validateOpenHandsWorkPacket('not a packet');
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
  });

  it('rejects when required fields are missing', () => {
    const packet = validPacket();
    delete packet.objective;
    delete packet.acceptance_tests;

    const result = validateOpenHandsWorkPacket(packet);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('objective')));
    assert.ok(result.errors.some((e) => e.includes('acceptance_tests')));
  });

  it('every REQUIRED_FIELDS entry triggers a missing-field error when absent', () => {
    for (const field of REQUIRED_FIELDS) {
      const packet = validPacket();
      delete packet[field];
      const result = validateOpenHandsWorkPacket(packet);

      // real_client_data_permitted / production_mutation_permitted /
      // external_action_permitted / intended_agent_owner have safe defaults
      // and should NOT fail when omitted — everything else must fail.
      const hasDefault = [
        'real_client_data_permitted',
        'production_mutation_permitted',
        'external_action_permitted',
        'intended_agent_owner',
      ].includes(field);

      if (hasDefault) {
        assert.equal(result.ok, true, `expected default to cover omitted "${field}"`);
      } else {
        assert.equal(result.ok, false, `expected missing "${field}" to fail validation`);
        assert.ok(
          result.errors.some((e) => e.includes(field)),
          `expected an error mentioning "${field}", got: ${JSON.stringify(result.errors)}`,
        );
      }
    }
  });

  it('defaults protected-action flags to false when omitted', () => {
    const packet = validPacket();
    delete packet.real_client_data_permitted;
    delete packet.production_mutation_permitted;
    delete packet.external_action_permitted;

    const result = validateOpenHandsWorkPacket(packet);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.packet?.real_client_data_permitted, false);
    assert.equal(result.packet?.production_mutation_permitted, false);
    assert.equal(result.packet?.external_action_permitted, false);
  });

  it('defaults intended_agent_owner to openhands when omitted', () => {
    const packet = validPacket();
    delete packet.intended_agent_owner;

    const result = validateOpenHandsWorkPacket(packet);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.packet?.intended_agent_owner, 'openhands');
  });

  it('does not silently override an explicit wrong owner with the default', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ intended_agent_owner: 'cursor' }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('intended_agent_owner')));
  });

  it('rejects an explicit true protected-action flag being merely present (still valid, but not defaulted away)', () => {
    // Explicit true is a valid boolean value — this packet stays structurally
    // valid (schema does not forbid true), it just is no longer "fail closed"
    // for that one flag. This test documents that we validate the *shape*,
    // not authorize the *action* — authorization is a separate, human gate.
    const result = validateOpenHandsWorkPacket(validPacket({ real_client_data_permitted: true }));
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.packet?.real_client_data_permitted, true);
  });

  it('rejects a branch_name outside the openhands/ namespace', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ branch_name: 'cursor/743-doc-fix-01' }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes(OPENHANDS_BRANCH_PREFIX)));
  });

  it('rejects non-array acceptance_tests', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ acceptance_tests: 'npm test' }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('acceptance_tests')));
  });

  it('rejects a non-positive-integer maximum_attempts', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ maximum_attempts: 0 }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('maximum_attempts')));
  });

  it('rejects a non-positive-integer timeout_seconds', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ timeout_seconds: -5 }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('timeout_seconds')));
  });

  it('rejects an unknown model_class', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ model_class: 'super_expensive' }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('model_class')));
  });

  it('rejects a non-positive cost_risk_cap', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ cost_risk_cap: 0 }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('cost_risk_cap')));
  });

  it('rejects maximum_attempts above the 10-attempt ceiling', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ maximum_attempts: 11 }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('maximum_attempts')));
  });

  it('rejects an empty acceptance_tests array', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ acceptance_tests: [] }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('acceptance_tests')));
  });

  it('rejects a non-integer parent_issue', () => {
    const result = validateOpenHandsWorkPacket(validPacket({ parent_issue: 'issue-743' }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('parent_issue')));
  });
});

describe('openhands work-packet schema — cross-check against config/openhands/work-packet.schema.json', () => {
  it('optionally validates a sample packet against the JSON Schema file, if present', async () => {
    if (!fs.existsSync(workPacketSchemaPath)) {
      // Schema file not present in this checkout — this module's embedded
      // checks are the source of truth (see work-packet.js header comment).
      return;
    }

    const schema = JSON.parse(fs.readFileSync(workPacketSchemaPath, 'utf8'));
    const { default: Ajv } = await import('ajv');
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);

    const sample = validPacket();
    const ajvOk = validate(sample);
    assert.equal(ajvOk, true, JSON.stringify(validate.errors));

    // The embedded validator must agree with the JSON Schema on the same
    // sample — this is the drift check the header comment promises.
    const embeddedResult = validateOpenHandsWorkPacket(sample);
    assert.equal(embeddedResult.ok, true, JSON.stringify(embeddedResult.errors));
  });

  it('optionally rejects the same invalid sample under both the embedded validator and ajv', async () => {
    if (!fs.existsSync(workPacketSchemaPath)) return;

    const schema = JSON.parse(fs.readFileSync(workPacketSchemaPath, 'utf8'));
    const { default: Ajv } = await import('ajv');
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);

    const badSample = validPacket({ intended_agent_owner: 'cursor' });
    assert.equal(validate(badSample), false);
    assert.equal(validateOpenHandsWorkPacket(badSample).ok, false);
  });
});

describe('assertBranchName', () => {
  it('returns the branch name when prefixed correctly', () => {
    assert.equal(assertBranchName('openhands/743-fix'), 'openhands/743-fix');
  });

  it('throws when the branch is not under the openhands/ namespace', () => {
    assert.throws(() => assertBranchName('codex/743-fix'), /openhands\//);
  });

  it('throws on a blank branch name', () => {
    assert.throws(() => assertBranchName(''), /openhands\//);
  });
});
