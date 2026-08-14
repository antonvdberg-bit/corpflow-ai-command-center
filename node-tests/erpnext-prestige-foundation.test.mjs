/**
 * Deterministic #920 Prestige foundation invariants.
 * Does not call live ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  changeConsoleRemainsExecutionSurface,
  customerNameIsForbiddenLiveClient,
  evaluateFoundationReadiness,
  getBridgeRow,
  itemIsForbiddenForPrestige,
  listBridgeRows,
  listProjectTemplateTasks,
  loadPrestigeFoundationConfig,
  prestigeItemCode,
  resetPrestigeFoundationConfigCache,
  searchBeforeCreate,
  syntheticDocumentMustStayDraft,
} from '../lib/erpnext/prestige-foundation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(REPO_ROOT, 'scripts', 'erpnext', 'apply-prestige-foundation.sh');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('foundation config names synthetic masters and forbids live Prestige', () => {
  resetPrestigeFoundationConfigCache();
  const cfg = loadPrestigeFoundationConfig(REPO_ROOT);
  assert.equal(cfg.issue, 920);
  assert.equal(cfg.company.default_currency, 'MUR');
  assert.equal(cfg.synthetic.customer, 'CF920 Synthetic Website Project Ltd');
  assert.equal(cfg.item.item_code, 'CF-WS-CUSTOM-PROJECT');
  assert.equal(cfg.item.list_price, null);
  assert.equal(cfg.synthetic.quotation_rate_mur, 1000);
  assert.ok(cfg.forbidden_customer_names.includes('Prestige Procurement'));
  assert.ok(cfg.forbidden_item_codes_for_prestige.includes('CF-RD-LANDING-RESCUE'));
  assert.equal(cfg.bridge.no_postgres_migration, true);
  assert.match(String(cfg.verdict), /NOT READY/);
  assert.equal(cfg.live_proof.quotation, 'SAL-QTN-2026-00004');
  const files = [
    'docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md',
    'docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md',
    'docs/decisions/20260814-erpnext-prestige-foundation.md',
  ];
  for (const rel of files) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
  }
  const doc = read('docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md');
  assert.ok(doc.includes('<!-- ERPNEXT_PRESTIGE_FOUNDATION_V1 -->'));
  assert.ok(doc.includes('SAL-QTN-2026-00004'));
  assert.ok(doc.includes('Project/Task/Issue Role Permission grant is UI-only'));
  assert.ok(!/sk_live|ERPNEXT_API_SECRET\s*[:=]\s*\S+/.test(doc));
});

test('twelve standard project-template tasks cover the Prestige WBS', () => {
  const tasks = listProjectTemplateTasks(REPO_ROOT);
  assert.equal(tasks.length, 12);
  assert.equal(tasks[0].subject, 'Discovery & requirements confirmation');
  assert.equal(tasks[11].subject, 'Acceptance / warranty closeout');
  assert.equal(tasks.filter((t) => t.milestone).length, 4);
  assert.equal(prestigeItemCode(REPO_ROOT), 'CF-WS-CUSTOM-PROJECT');
  assert.equal(itemIsForbiddenForPrestige('CF-RD-LANDING-RESCUE'), true);
  assert.equal(itemIsForbiddenForPrestige('CF-WS-CUSTOM-PROJECT'), false);
  assert.equal(customerNameIsForbiddenLiveClient('Prestige Procurement'), true);
  assert.equal(customerNameIsForbiddenLiveClient('CF920 Synthetic Website Project Ltd'), false);
});

test('bridge contract covers Lead, Growth, CmpTicket, PaymentRecord, Project', () => {
  const ids = listBridgeRows(REPO_ROOT).map((row) => row.id);
  for (const id of [
    'lead_intake',
    'growth_company',
    'company_master',
    'cmp_ticket',
    'payment_record',
    'delivery_project',
  ]) {
    assert.ok(ids.includes(id), `missing bridge row ${id}`);
  }
  const ticket = getBridgeRow('cmp_ticket', REPO_ROOT);
  assert.match(ticket.erpnext, /Issue/);
  assert.match(ticket.conflict_authority, /\/change/);
  const pay = getBridgeRow('payment_record', REPO_ROOT);
  assert.match(pay.direction, /financial-rail approval/);
  const surfaces = changeConsoleRemainsExecutionSurface();
  assert.equal(surfaces.corpflow_change, 'execution_and_evidence');
  assert.equal(surfaces.erpnext_issue, 'durable_support_business_ticket');
});

test('search-before-create reuses customer and refuses silent duplicates', () => {
  const reuse = searchBeforeCreate(
    { customers: [{ name: 'CF920 Synthetic Website Project Ltd', customer_name: 'CF920 Synthetic Website Project Ltd' }] },
    { customer_name: 'CF920 Synthetic Website Project Ltd' },
  );
  assert.equal(reuse.action, 'REUSE');
  const create = searchBeforeCreate({ customers: [], leads: [] }, { customer_name: 'New Co' });
  assert.equal(create.action, 'CREATE');
});

test('synthetic quotations must remain draft; 403 evidence is NOT READY', () => {
  assert.equal(syntheticDocumentMustStayDraft({ docstatus: 0 }).ok, true);
  assert.equal(syntheticDocumentMustStayDraft({ docstatus: 1 }).ok, false);
  const blocked = evaluateFoundationReadiness(
    {
      company_currency_mur: true,
      mur_price_list_ok: true,
      usd_price_list_ok: true,
      item_ok: true,
      crm_ok: true,
      quotation_draft: true,
      project_http: 403,
      project_template_http: 403,
      task_http: 403,
      issue_http: 403,
    },
    REPO_ROOT,
  );
  assert.equal(blocked.ready, false);
  assert.match(blocked.verdict, /Project\/Task\/Issue Role Permission grant is UI-only/);
  assert.equal(blocked.anton_required, true);
  assert.equal(blocked.grant_onto_existing_role, 'Sales Manager');

  const ready = evaluateFoundationReadiness(
    {
      company_currency_mur: true,
      mur_price_list_ok: true,
      usd_price_list_ok: true,
      item_ok: true,
      crm_ok: true,
      quotation_draft: true,
      project_http: 200,
      project_template_http: 200,
      task_http: 200,
      issue_http: 200,
    },
    REPO_ROOT,
  );
  assert.equal(ready.ready, true);
  assert.equal(ready.verdict, 'ERPNext PRESTIGE FOUNDATION READY');
});

test('live apply-log captures synthetic IDs and no secret values', () => {
  const rel = 'artifacts/erpnext/prestige-foundation-920/apply-log.json';
  assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
  const log = JSON.parse(read(rel));
  const cfg = loadPrestigeFoundationConfig(REPO_ROOT);
  assert.equal(log.issue, 920);
  assert.equal(log.secrets_printed, false);
  assert.equal(log.readback.ids.quotation, cfg.live_proof.quotation);
  assert.equal(log.readback.ids.customer, cfg.live_proof.customer);
  assert.equal(log.readback.project_http, 403);
  assert.equal(log.readback.issue_http, 403);
  const blob = JSON.stringify(log);
  assert.doesNotMatch(blob, /sk_live|eyJhbGci|postgres:\/\//i);
  assert.doesNotMatch(blob, /ERPNEXT_API_SECRET":\s*"[^"]+"/);
});

test('apply script dry-run does not call ERPNext and forbids secret fallbacks', () => {
  assert.equal(existsSync(APPLY), true);
  const src = read('scripts/erpnext/apply-prestige-foundation.sh');
  assert.match(src, /ERPNEXT_BASE_URL/);
  assert.match(src, /Do NOT require MASTER_ADMIN_KEY/);
  assert.match(src, /Prestige Procurement/);
  assert.doesNotMatch(src, /Authorization:.*MASTER_ADMIN_KEY/);
  const result = spawnSync('bash', [APPLY, '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /DRY-RUN/);
  assert.match(result.stdout, /CF920 Synthetic Website Project Ltd/);
  assert.doesNotMatch(result.stdout, /sk_live|eyJhbGci/);
});
