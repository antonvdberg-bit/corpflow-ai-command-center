/**
 * ERP governance programme (#966).
 *
 * Pure mapping + readiness rules for the internal ERPNext implementation
 * Project and the GitHub governance registers. No live ERPNext calls.
 * No secrets. No payments.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-governance-programme.v1.json';

const REGISTER_RELS = [
  'docs/governance/erpnext/DECISION_REGISTER.md',
  'docs/governance/erpnext/IMPLEMENTATION_EVIDENCE_INDEX.md',
  'docs/governance/erpnext/RISK_REGISTER.md',
  'docs/governance/erpnext/CONTROL_REGISTER.md',
];

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadGovernanceProgrammeConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetGovernanceProgrammeConfigCache() {
  cachedConfig = null;
}

function asString(v) {
  return v == null ? '' : String(v).trim();
}

export function listGovernanceRegisterPaths() {
  return REGISTER_RELS.slice();
}

export function listProgrammeTasks(repoRoot = REPO_ROOT) {
  const cfg = loadGovernanceProgrammeConfig(repoRoot);
  return Array.isArray(cfg.tasks) ? cfg.tasks : [];
}

export function programmeProjectName(repoRoot = REPO_ROOT) {
  return asString(loadGovernanceProgrammeConfig(repoRoot).project?.project_name);
}

export function visionTaskSubject(repoRoot = REPO_ROOT) {
  return asString(loadGovernanceProgrammeConfig(repoRoot).vision_task_subject);
}

/**
 * @param {{ projects?: Array<Record<string, unknown>> }} existing
 * @param {string} projectName
 */
export function searchBeforeCreateProject(existing, projectName) {
  const want = asString(projectName).toLowerCase();
  const projects = Array.isArray(existing.projects) ? existing.projects : [];
  const hit = projects.find((row) => {
    const name = asString(row.project_name || row.name).toLowerCase();
    return want && name === want;
  });
  if (hit) {
    return {
      action: 'REUSE',
      doctype: 'Project',
      name: asString(hit.name || hit.project_name),
    };
  }
  return { action: 'CREATE', doctype: 'Project', name: null };
}

/**
 * Live HTTP evidence from the apply script. Repo-only config is never READY.
 *
 * @param {{
 *   registers_present?: boolean,
 *   project_http?: number | null,
 *   task_http?: number | null,
 *   project_id?: string | null,
 *   task_count?: number | null,
 *   vision_task_id?: string | null,
 *   vision_task_status?: string | null,
 *   version_proof?: boolean,
 *   version_blocker?: string | null,
 *   portal_or_email_enabled?: boolean,
 * }} evidence
 * @param {string} [repoRoot]
 */
export function evaluateGovernanceProgrammeReadiness(evidence = {}, repoRoot = REPO_ROOT) {
  const cfg = loadGovernanceProgrammeConfig(repoRoot);
  const expectedTasks = listProgrammeTasks(repoRoot).length;
  const blockers = [];

  if (!evidence.registers_present) blockers.push('GOVERNANCE_REGISTERS_MISSING');
  if (evidence.project_http === 403 || evidence.task_http === 403) {
    blockers.push('PROJECT_TASK_WRITE_DENIED');
  }
  if (!evidence.project_http || evidence.project_http !== 200) {
    if (!blockers.includes('PROJECT_TASK_WRITE_DENIED')) blockers.push('PROJECT_NOT_VERIFIED');
  }
  if (!asString(evidence.project_id)) {
    if (!blockers.includes('PROJECT_TASK_WRITE_DENIED') && !blockers.includes('PROJECT_NOT_VERIFIED')) {
      blockers.push('PROJECT_NOT_VERIFIED');
    }
  }
  if (Number(evidence.task_count || 0) < expectedTasks) {
    if (!blockers.includes('PROJECT_TASK_WRITE_DENIED')) blockers.push('PROGRAMME_TASKS_INCOMPLETE');
  }
  if (!asString(evidence.vision_task_id)) {
    if (!blockers.includes('PROJECT_TASK_WRITE_DENIED')) blockers.push('VISION_TASK_MISSING');
  }
  const visionStatus = asString(evidence.vision_task_status).toLowerCase();
  if (asString(evidence.vision_task_id) && visionStatus && visionStatus !== 'completed') {
    blockers.push('VISION_TASK_NOT_COMPLETED');
  }
  if (evidence.portal_or_email_enabled) blockers.push('PORTAL_OR_EMAIL_ENABLED');
  if (evidence.version_proof !== true) {
    blockers.push(asString(evidence.version_blocker) || 'VERSION_TRAIL_UNREADABLE');
  }

  if (blockers.includes('PROJECT_TASK_WRITE_DENIED')) {
    return {
      ready: false,
      verdict: `${cfg.verdict_not_ready_prefix}PROJECT_TASK_WRITE_DENIED`,
      blockers,
      anton_required: true,
    };
  }

  if (blockers.length) {
    return {
      ready: false,
      verdict: `${cfg.verdict_not_ready_prefix}${blockers[0]}`,
      blockers,
      anton_required: false,
    };
  }

  return {
    ready: true,
    verdict: cfg.verdict_ready,
    blockers: [],
    anton_required: false,
  };
}
