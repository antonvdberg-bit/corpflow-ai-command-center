/**
 * Deterministic #966 ERP governance programme invariants.
 * Does not call live ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  evaluateGovernanceProgrammeReadiness,
  listGovernanceRegisterPaths,
  listProgrammeTasks,
  loadGovernanceProgrammeConfig,
  programmeProjectName,
  resetGovernanceProgrammeConfigCache,
  searchBeforeCreateProject,
  visionTaskSubject,
} from '../lib/erpnext/governance-programme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(REPO_ROOT, 'scripts', 'erpnext', 'apply-governance-programme.sh');
const MARKS = ['PROVEN', 'PARTIAL', 'NOT PROVEN', 'REQUIRES DECISION'];
const REGISTERS = [
  'docs/governance/erpnext/DECISION_REGISTER.md',
  'docs/governance/erpnext/IMPLEMENTATION_EVIDENCE_INDEX.md',
  'docs/governance/erpnext/RISK_REGISTER.md',
  'docs/governance/erpnext/CONTROL_REGISTER.md',
];

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('#966 governance registers exist with sentinels and no secret values', () => {
  for (const rel of REGISTERS) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    const doc = read(rel);
    assert.ok(/<!-- CORPFLOWAI_ERP_[A-Z_]+_V1 -->/.test(doc), `${rel} missing sentinel`);
    assert.ok(doc.includes('#966'));
    assert.ok(doc.includes('#954'));
    assert.ok(!/sk_live|POSTGRES_URL\s*[:=]\s*\S+|ERPNEXT_API_SECRET\s*[:=]\s*\S+/.test(doc));
    assert.doesNotMatch(doc, /eyJhbGci/);
  }
  const readme = read('docs/governance/erpnext/README.md');
  assert.ok(readme.includes('DECISION_REGISTER.md'));
  assert.ok(readme.includes('IMPLEMENTATION_EVIDENCE_INDEX.md'));
  assert.ok(readme.includes('RISK_REGISTER.md'));
  assert.ok(readme.includes('CONTROL_REGISTER.md'));
  assert.ok(readme.includes('APPROVED — VERSION 2'));
  assert.ok(!readme.includes('Those artefacts are **not** created by #955'));
  assert.equal(listGovernanceRegisterPaths().length, 4);
});

test('#966 decision register is append/supersede and lists required fields', () => {
  const doc = read('docs/governance/erpnext/DECISION_REGISTER.md');
  assert.ok(doc.includes('Append or supersede'));
  assert.ok(doc.includes('ERP-D-2026-08-14-1'));
  assert.ok(doc.includes('APPROVED — VERSION 2') || doc.includes('Approved'));
  for (const field of [
    'Decision ID',
    'Status',
    'Question / requirement',
    'Options considered',
    'Evidence reviewed',
    'Approver',
    'GitHub implementation',
    'ERPNext Project / Task',
    'Supersedes / superseded-by',
  ]) {
    assert.ok(doc.includes(field), `missing field ${field}`);
  }
});

test('#966 risk and control registers use the required marks', () => {
  const risk = read('docs/governance/erpnext/RISK_REGISTER.md');
  const control = read('docs/governance/erpnext/CONTROL_REGISTER.md');
  const evidence = read('docs/governance/erpnext/IMPLEMENTATION_EVIDENCE_INDEX.md');
  for (const mark of MARKS) {
    assert.ok(risk.includes(`**${mark}**`), `risk missing ${mark}`);
    assert.ok(control.includes(`**${mark}**`), `control missing ${mark}`);
    assert.ok(evidence.includes(`**${mark}**`), `evidence missing ${mark}`);
  }
  assert.ok(risk.includes('R-ERP-01'));
  assert.ok(control.includes('C-BK-01'));
  assert.ok(evidence.includes('Phase 0 — Programme charter'));
  assert.ok(evidence.includes('Phase 10 — Post-go-live control'));
  assert.ok(evidence.includes('ERP Vision and Intended Use — Executive Statement'));
});

test('#966 programme config covers Vision + Phases 0–10 and forbids protected actions', () => {
  resetGovernanceProgrammeConfigCache();
  const cfg = loadGovernanceProgrammeConfig(REPO_ROOT);
  assert.equal(cfg.issue, 966);
  assert.equal(programmeProjectName(REPO_ROOT), 'CorpFlowAI ERPNext Business-Critical Adoption Programme');
  assert.equal(visionTaskSubject(REPO_ROOT), 'ERP Vision and Intended Use — Executive Statement');
  const tasks = listProgrammeTasks(REPO_ROOT);
  assert.equal(tasks.length, 12);
  assert.equal(tasks[0].id, 'vision');
  assert.equal(tasks[0].target_status, 'Completed');
  assert.equal(tasks[1].phase, 0);
  assert.equal(tasks[11].phase, 10);
  assert.equal(cfg.project.customer, null);
  assert.equal(cfg.project.collect_progress, 0);
  assert.equal(cfg.forbidden.custom_doctype, true);
  assert.equal(cfg.forbidden.external_send, true);
  assert.equal(cfg.forbidden.accounting_tax_bank_mutation, true);
  assert.equal(cfg.live_proof.project, 'PROJ-0002');
  assert.equal(cfg.live_proof.vision_task, 'TASK-2026-00025');
  assert.equal(cfg.live_proof.version_blocker, 'VERSION_TRAIL_UNREADABLE');
});

test('#966 search-before-create reuses the internal Project', () => {
  const reuse = searchBeforeCreateProject(
    { projects: [{ name: 'PROJ-0099', project_name: 'CorpFlowAI ERPNext Business-Critical Adoption Programme' }] },
    'CorpFlowAI ERPNext Business-Critical Adoption Programme',
  );
  assert.equal(reuse.action, 'REUSE');
  assert.equal(reuse.name, 'PROJ-0099');
  const create = searchBeforeCreateProject({ projects: [] }, 'CorpFlowAI ERPNext Business-Critical Adoption Programme');
  assert.equal(create.action, 'CREATE');
});

test('#966 readiness requires live Project/Task/version proof, not repo-only files', () => {
  const blocked = evaluateGovernanceProgrammeReadiness({ registers_present: true }, REPO_ROOT);
  assert.equal(blocked.ready, false);
  assert.match(blocked.verdict, /NOT READY — /);

  const denied = evaluateGovernanceProgrammeReadiness(
    { registers_present: true, project_http: 403, task_http: 403 },
    REPO_ROOT,
  );
  assert.equal(denied.ready, false);
  assert.match(denied.verdict, /PROJECT_TASK_WRITE_DENIED/);
  assert.equal(denied.anton_required, true);

  const ready = evaluateGovernanceProgrammeReadiness(
    {
      registers_present: true,
      project_http: 200,
      task_http: 200,
      project_id: 'PROJ-TEST',
      task_count: 12,
      vision_task_id: 'TASK-TEST',
      vision_task_status: 'Completed',
      version_proof: false,
      version_blocker: 'VERSION_TRAIL_UNREADABLE',
      portal_or_email_enabled: false,
    },
    REPO_ROOT,
  );
  assert.equal(ready.ready, true);
  assert.equal(ready.verdict, 'ERP GOVERNANCE RECORD ENVIRONMENT READY');
  assert.deepEqual(ready.recorded_gaps, ['VERSION_TRAIL_UNREADABLE']);
});

test('#966 live apply-log captures Project/Task IDs and no secret values', () => {
  const rel = 'artifacts/erpnext/governance-programme-966/apply-log.json';
  assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
  const log = JSON.parse(read(rel));
  const cfg = loadGovernanceProgrammeConfig(REPO_ROOT);
  assert.equal(log.issue, 966);
  assert.equal(log.secrets_printed, false);
  assert.equal(log.identity, 'integrations@corpflowai.com');
  assert.equal(log.readback.project_id, 'PROJ-0002');
  assert.equal(log.readback.project_id, cfg.live_proof.project);
  assert.equal(log.readback.task_count, 12);
  assert.equal(log.readback.vision_task_id, 'TASK-2026-00025');
  assert.equal(log.readback.vision_task_status, 'Completed');
  assert.equal(log.readback.collect_progress, 0);
  assert.equal(log.readback.project_customer, null);
  assert.equal(log.readback.version_http, 403);
  assert.equal(log.readback.version_blocker, 'VERSION_TRAIL_UNREADABLE');
  const blob = JSON.stringify(log);
  assert.doesNotMatch(blob, /sk_live|eyJhbGci|postgres:\/\//i);
  assert.doesNotMatch(blob, /ERPNEXT_API_SECRET":\s*"[^"]+"/);
});

test('#966 apply script dry-run does not call ERPNext and forbids secret fallbacks', () => {
  assert.equal(existsSync(APPLY), true);
  const src = read('scripts/erpnext/apply-governance-programme.sh');
  assert.match(src, /ERPNEXT_BASE_URL/);
  assert.match(src, /Do NOT require MASTER_ADMIN_KEY/);
  assert.match(src, /CorpFlowAI ERPNext Business-Critical Adoption Programme/);
  assert.doesNotMatch(src, /Authorization:.*MASTER_ADMIN_KEY/);
  const result = spawnSync('bash', [APPLY, '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /DRY-RUN/);
  assert.match(result.stdout, /CorpFlowAI ERPNext Business-Critical Adoption Programme/);
  assert.doesNotMatch(result.stdout, /sk_live|eyJhbGci/);
});
