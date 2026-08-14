/**
 * ERPNext Prestige operating foundation (#920).
 *
 * Pure mapping + readiness rules for standard CRM, project, support, and
 * CorpFlowAI bridge contracts. No live ERPNext calls. No secrets. No payments.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-prestige-foundation.v1.json';

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadPrestigeFoundationConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetPrestigeFoundationConfigCache() {
  cachedConfig = null;
}

function asString(v) {
  return v == null ? '' : String(v).trim();
}

export function listProjectTemplateTasks(repoRoot = REPO_ROOT) {
  const cfg = loadPrestigeFoundationConfig(repoRoot);
  return Array.isArray(cfg.project_template_tasks) ? cfg.project_template_tasks : [];
}

export function prestigeItemCode(repoRoot = REPO_ROOT) {
  return asString(loadPrestigeFoundationConfig(repoRoot).item?.item_code);
}

/**
 * Prestige / custom website work must not reuse sprint SKUs.
 * @param {string} itemCode
 * @param {string} [repoRoot]
 */
export function itemIsForbiddenForPrestige(itemCode, repoRoot = REPO_ROOT) {
  const forbidden = loadPrestigeFoundationConfig(repoRoot).forbidden_item_codes_for_prestige || [];
  return forbidden.includes(asString(itemCode));
}

/**
 * Real Prestige legal/trading name is not a synthetic foundation customer.
 * @param {string} customerName
 * @param {string} [repoRoot]
 */
export function customerNameIsForbiddenLiveClient(customerName, repoRoot = REPO_ROOT) {
  const forbidden = loadPrestigeFoundationConfig(repoRoot).forbidden_customer_names || [];
  const want = asString(customerName).toLowerCase();
  return forbidden.some((name) => asString(name).toLowerCase() === want);
}

/**
 * @param {Record<string, unknown>} doc
 */
export function syntheticDocumentMustStayDraft(doc) {
  const status = Number(doc?.docstatus);
  if (status !== 0) {
    return { ok: false, blockers: ['DOCUMENT_NOT_DRAFT'] };
  }
  return { ok: true, blockers: [] };
}

/**
 * @param {{ customers?: Array<Record<string, unknown>>, leads?: Array<Record<string, unknown>> }} existing
 * @param {{ customer_name: string, email?: string }} candidate
 */
export function searchBeforeCreate(existing, candidate) {
  const wantName = asString(candidate.customer_name).toLowerCase();
  const wantEmail = asString(candidate.email).toLowerCase();
  const customers = Array.isArray(existing.customers) ? existing.customers : [];
  const leads = Array.isArray(existing.leads) ? existing.leads : [];

  const customerHit = customers.find((row) => {
    const name = asString(row.customer_name || row.name).toLowerCase();
    return wantName && name === wantName && !row.disabled;
  });
  if (customerHit) {
    return {
      action: 'REUSE',
      doctype: 'Customer',
      name: asString(customerHit.name || customerHit.customer_name),
    };
  }

  const leadHit = leads.find((row) => {
    const email = asString(row.email_id || row.email).toLowerCase();
    const company = asString(row.company_name || row.lead_name).toLowerCase();
    return (wantEmail && email === wantEmail) || (wantName && company === wantName);
  });
  if (leadHit) {
    return { action: 'REUSE', doctype: 'Lead', name: asString(leadHit.name) };
  }

  return { action: 'CREATE', doctype: null, name: null };
}

export function listBridgeRows(repoRoot = REPO_ROOT) {
  const cfg = loadPrestigeFoundationConfig(repoRoot);
  return Array.isArray(cfg.bridge?.rows) ? cfg.bridge.rows : [];
}

/**
 * @param {string} id
 * @param {string} [repoRoot]
 */
export function getBridgeRow(id, repoRoot = REPO_ROOT) {
  return listBridgeRows(repoRoot).find((row) => row.id === id) || null;
}

/**
 * Live HTTP evidence from the apply script. Repo-only config is never READY.
 *
 * @param {{
 *   crm_ok?: boolean,
 *   quotation_draft?: boolean,
 *   item_ok?: boolean,
 *   mur_price_list_ok?: boolean,
 *   usd_price_list_ok?: boolean,
 *   company_currency_mur?: boolean,
 *   project_http?: number | null,
 *   project_template_http?: number | null,
 *   task_http?: number | null,
 *   issue_http?: number | null,
 *   timesheet_create_http?: number | null,
 * }} evidence
 * @param {string} [repoRoot]
 */
export function evaluateFoundationReadiness(evidence = {}, repoRoot = REPO_ROOT) {
  const cfg = loadPrestigeFoundationConfig(repoRoot);
  const blockers = [];

  if (!evidence.company_currency_mur) blockers.push('COMPANY_CURRENCY_NOT_MUR');
  if (!evidence.mur_price_list_ok) blockers.push('MUR_SELLING_PRICE_LIST_MISSING');
  if (!evidence.usd_price_list_ok) blockers.push('USD_SELLING_PRICE_LIST_MISSING');
  if (!evidence.item_ok) blockers.push('CUSTOM_WEBSITE_ITEM_MISSING');
  if (!evidence.crm_ok) blockers.push('CRM_SYNTHETIC_PATH_INCOMPLETE');
  if (!evidence.quotation_draft) blockers.push('MUR_QUOTATION_DRAFT_MISSING');

  const projectDenied = [evidence.project_http, evidence.project_template_http, evidence.task_http].some(
    (code) => code === 403,
  );
  const issueDenied = evidence.issue_http === 403;

  if (projectDenied) blockers.push('PROJECT_TASK_WRITE_DENIED');
  if (issueDenied) blockers.push('ISSUE_WRITE_DENIED');
  if (!evidence.project_http || evidence.project_http !== 200) {
    if (!blockers.includes('PROJECT_TASK_WRITE_DENIED')) blockers.push('PROJECT_NOT_VERIFIED');
  }
  if (!evidence.issue_http || evidence.issue_http !== 200) {
    if (!blockers.includes('ISSUE_WRITE_DENIED')) blockers.push('ISSUE_NOT_VERIFIED');
  }

  if (blockers.includes('PROJECT_TASK_WRITE_DENIED') || blockers.includes('ISSUE_WRITE_DENIED')) {
    return {
      ready: false,
      verdict: 'NOT READY — Project/Task/Issue Role Permission grant is UI-only',
      blockers,
      anton_required: true,
      grant_onto_existing_role: cfg.permission_grant?.grant_onto_existing_role || 'Sales Manager',
    };
  }

  if (blockers.length) {
    return {
      ready: false,
      verdict: `NOT READY — ${blockers[0]}`,
      blockers,
      anton_required: blockers.some((b) => b.includes('DENIED')),
      grant_onto_existing_role: cfg.permission_grant?.grant_onto_existing_role,
    };
  }

  return {
    ready: true,
    verdict: 'ERPNext PRESTIGE FOUNDATION READY',
    blockers: [],
    anton_required: false,
    grant_onto_existing_role: null,
  };
}

export function changeConsoleRemainsExecutionSurface() {
  return {
    corpflow_change: 'execution_and_evidence',
    erpnext_issue: 'durable_support_business_ticket',
    mirror: 'optional later; do not replace /change with ERPNext desk for factory execution',
  };
}
