/**
 * Static checks for Agent CI (`.github/workflows/test.yml`).
 * Proves the workflow cannot run implicit production DDL.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AGENT_CI_WORKFLOW_RELATIVE_PATH = '.github/workflows/test.yml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function inspectAgentCiWorkflow(yamlText) {
  const yaml = String(yamlText || '');
  const failures = [];
  const requireMatch = (re, label) => {
    if (!re.test(yaml)) failures.push(label);
  };
  const forbidMatch = (re, label) => {
    if (re.test(yaml)) failures.push(label);
  };

  requireMatch(/name:\s*Agent CI/, 'missing_agent_ci_name');
  requireMatch(/npm test/, 'missing_npm_test');
  requireMatch(/npm run build/, 'missing_npm_build');
  requireMatch(/npm audit/, 'missing_npm_audit');
  requireMatch(/method:\s*"oidc"/, 'missing_infisical_oidc');
  requireMatch(/id-token:\s*write/, 'missing_oidc_permission');
  requireMatch(/Retired product cleanliness guard/, 'missing_retired_product_guard');
  requireMatch(/Marketing standards integrity check/, 'missing_marketing_gate');
  forbidMatch(/npx prisma migrate deploy/, 'contains_migrate_deploy');
  forbidMatch(/npx prisma db push/, 'contains_db_push');
  forbidMatch(/npx prisma migrate reset/, 'contains_migrate_reset');
  forbidMatch(/npx prisma migrate resolve/, 'contains_migrate_resolve');
  forbidMatch(/npx prisma db execute/, 'contains_db_execute');
  forbidMatch(/apply-ensure-schema-build/, 'contains_ensure_schema_apply');
  forbidMatch(/name:\s*Prisma migrate deploy/, 'contains_migrate_deploy_step_name');
  return { ok: failures.length === 0, failures };
}

export function inspectAgentCiWorkflowFile(root = ROOT) {
  const filePath = path.join(root, AGENT_CI_WORKFLOW_RELATIVE_PATH);
  return inspectAgentCiWorkflow(readFileSync(filePath, 'utf8'));
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const inspection = inspectAgentCiWorkflowFile();
  console.log(JSON.stringify({ ok: inspection.ok, workflow: inspection }, null, 2));
  if (!inspection.ok) process.exit(1);
}
