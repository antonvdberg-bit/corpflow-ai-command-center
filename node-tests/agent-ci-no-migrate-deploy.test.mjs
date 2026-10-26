/**
 * Agent CI must not apply Prisma migrations or other production DDL.
 * No live database. No Infisical values.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  AGENT_CI_WORKFLOW_RELATIVE_PATH,
  inspectAgentCiWorkflow,
  inspectAgentCiWorkflowFile,
} from '../scripts/inspect-agent-ci-workflow.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Agent CI must not run implicit production DDL', () => {
  it('keeps tests, audit, build, and Infisical OIDC, and forbids migrate deploy', () => {
    const yaml = readFileSync(path.join(ROOT, AGENT_CI_WORKFLOW_RELATIVE_PATH), 'utf8');
    const inspection = inspectAgentCiWorkflow(yaml);
    assert.equal(inspection.ok, true, inspection.failures.join(','));
    assert.equal(inspectAgentCiWorkflowFile(ROOT).ok, true);
    assert.match(yaml, /npm test/);
    assert.match(yaml, /npm run build/);
    assert.match(yaml, /method:\s*"oidc"/);
    assert.doesNotMatch(yaml, /npx prisma migrate deploy/);
    assert.doesNotMatch(yaml, /npx prisma db push/);
    assert.doesNotMatch(yaml, /npx prisma migrate reset/);
    assert.doesNotMatch(yaml, /continue-on-error:\s*true/);
  });

  it('fails closed when a migrate deploy step is reintroduced', () => {
    const yaml = readFileSync(path.join(ROOT, AGENT_CI_WORKFLOW_RELATIVE_PATH), 'utf8');
    const withDeploy = `${yaml}\n    - name: Prisma migrate deploy (optional)\n      continue-on-error: true\n      run: npx prisma migrate deploy\n`;
    const inspection = inspectAgentCiWorkflow(withDeploy);
    assert.equal(inspection.ok, false);
    assert.ok(inspection.failures.includes('contains_migrate_deploy'));
    assert.ok(inspection.failures.includes('contains_migrate_deploy_step_name'));
  });
});
