#!/usr/bin/env node
/**
 * GET-only ERPNext bank / reconciliation readiness audit (#1139 / current-main #1220).
 *
 * Direct Frappe token auth from Cursor Cloud–injected secrets (names only):
 *   ERPNEXT_BASE_URL
 *   ERPNEXT_API_KEY
 *   ERPNEXT_API_SECRET
 *
 * Do NOT require MASTER_ADMIN_KEY, SSH, or Infisical.
 * Never POST/PUT/DELETE. Never create Bank Account, Payment Entry, or
 * Bank Transaction. Never print host URLs, tokens, or bank credentials.
 *
 * Usage:
 *   node scripts/erpnext/audit-bank-reconciliation-readiness.mjs --dry-run
 *   node scripts/erpnext/audit-bank-reconciliation-readiness.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BANK_FEED_VERDICT,
  CANONICAL_VERDICT,
  CURRENT_MAIN_ISSUE,
  CURRENT_MAIN_SHA,
  CURRENT_MAIN_VERDICT,
  PAYMENT_SEGREGATION_RULE,
  SOURCE_PACKET_ISSUE,
  assertReadOnlyPacketAction,
  evaluateBankReconciliationReadiness,
  loadBankReconciliationReadinessConfig,
  loadSyntheticStatementFixture,
  payloadContainsForbiddenBankEvidence,
  proveSyntheticReconciliationIdempotency,
  sanitizeBankReadback,
} from '../../lib/erpnext/bank-reconciliation-readiness.js';
import { frappeClientFromEnv, redactText } from '../../lib/erpnext/frappe-rest-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'erpnext', 'bank-reconciliation-readiness-1139');
const CURRENT_MAIN_ARTIFACT_DIR = path.join(
  ROOT,
  'artifacts',
  'erpnext',
  'bank-reconciliation-readiness-1220'
);

function log(msg) {
  console.log(String(msg));
}

function asTrimmedString(value) {
  return value == null ? '' : String(value).trim();
}

function currentMainSha(cfg) {
  return asTrimmedString(cfg?.current_main_sha) || CURRENT_MAIN_SHA;
}

function presence(name) {
  const value = process.env[name];
  return value && String(value).trim() ? 'present' : 'absent';
}

function listInjectedSecretNames() {
  const wanted = [
    'ERPNEXT_BASE_URL',
    'ERPNEXT_API_KEY',
    'ERPNEXT_API_SECRET',
    'MASTER_ADMIN_KEY',
    'ADMIN_PIN',
  ];
  const present = wanted.filter((name) => process.env[name] && String(process.env[name]).trim());
  return present.length ? present.join(',') : 'none';
}

function printHeader(dryRun) {
  log('ERPNext bank / reconciliation current-main acceptance (#1220; reuses #1139)');
  log('access_path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)');
  log('expected_identity: integrations@corpflowai.com (CorpFlowAI Integration)');
  log(`ERPNEXT_BASE_URL: ${presence('ERPNEXT_BASE_URL')}`);
  log(`ERPNEXT_API_KEY: ${presence('ERPNEXT_API_KEY')}`);
  log(`ERPNEXT_API_SECRET: ${presence('ERPNEXT_API_SECRET')}`);
  log(`MASTER_ADMIN_KEY: ${presence('MASTER_ADMIN_KEY')} (must not be used as ERPNext auth)`);
  log(`injected_secret_names_checked: ${listInjectedSecretNames()}`);
  log('auth_fallback_master_admin_key: forbidden');
  log('runtime_bridge_ssh: no');
  log('runtime_bridge_infisical: no');
  log('ERPNEXT_BASE_URL_value: not_printed');
  log(`source_packet_issue: ${SOURCE_PACKET_ISSUE}`);
  log(`current_main_issue: ${CURRENT_MAIN_ISSUE}`);
  log(`current_main_verdict: ${CURRENT_MAIN_VERDICT}`);
  log(`dry_run: ${dryRun ? 1 : 0}`);
  log('mode: GET-only');
  log('bank_account_create: forbidden');
  log('payment_entry_submit: forbidden');
  log('bank_transaction_live_create: forbidden');
  log('bank_feed_connect: forbidden');
  log(`bank_feed_verdict: ${BANK_FEED_VERDICT}`);
  log(`payment_segregation_rule: ${PAYMENT_SEGREGATION_RULE}`);
}

function safeAccount(row) {
  if (!row || typeof row !== 'object') return null;
  return sanitizeBankReadback({
    name: row.name || null,
    account_name: row.account_name || null,
    account_type: row.account_type || null,
    root_type: row.root_type || null,
    is_group: row.is_group ?? null,
    parent_account: row.parent_account || null,
    company: row.company || null,
    disabled: row.disabled ?? null,
  });
}

function safeBankAccount(row) {
  if (!row || typeof row !== 'object') return null;
  return sanitizeBankReadback({
    name: row.name || null,
    account_name: row.account_name || null,
    account: row.account || null,
    bank: row.bank || null,
    account_type: row.account_type || null,
    is_company_account: row.is_company_account ?? null,
    disabled: row.disabled ?? null,
    iban: row.iban,
    bank_account_no: row.bank_account_no,
  });
}

function safeMode(row) {
  if (!row || typeof row !== 'object') return null;
  return sanitizeBankReadback({
    name: row.name || null,
    type: row.type || null,
    enabled: row.enabled ?? null,
  });
}

async function inspectDoctype(client, doctype, fields, extra = {}) {
  const listed = await client.list(doctype, {
    fields,
    limit: extra.limit || 50,
    filters: extra.filters,
  });
  return {
    doctype,
    http: listed.http,
    ok: listed.ok,
    error: listed.error,
    count: listed.ok ? listed.rows.length : null,
    rows: listed.ok ? listed.rows : [],
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const cfg = loadBankReconciliationReadinessConfig(ROOT);
  printHeader(dryRun);

  const mutation = assertReadOnlyPacketAction({});
  if (!mutation.allowed) {
    log(`FAIL read-only gate: ${mutation.forbidden.join(',')}`);
    process.exit(1);
  }

  const fixture = loadSyntheticStatementFixture(ROOT);
  const synthetic = proveSyntheticReconciliationIdempotency(fixture, cfg);
  log(`synthetic_recon_confirmed: ${synthetic.first.recon_confirmed ? 1 : 0}`);
  log(`synthetic_delta: ${synthetic.first.delta}`);
  log(`synthetic_idempotent: ${synthetic.idempotent ? 1 : 0}`);
  log(`synthetic_live_bank_transaction_created: ${synthetic.first.live_bank_transaction_created ? 1 : 0}`);

  const readiness = evaluateBankReconciliationReadiness(cfg);
  log(`mapped_verdict: ${readiness.verdict}`);
  log(`mapped_bank_feed_verdict: ${readiness.bank_feed_verdict}`);

  mkdirSync(ARTIFACT_DIR, { recursive: true });
  mkdirSync(CURRENT_MAIN_ARTIFACT_DIR, { recursive: true });

  if (dryRun) {
    const artifact = {
      issue: SOURCE_PACKET_ISSUE,
      current_main_issue: CURRENT_MAIN_ISSUE,
      current_main_sha: currentMainSha(cfg),
      dry_run: true,
      identity: null,
      synthetic: {
        recon_confirmed: synthetic.first.recon_confirmed,
        delta: synthetic.first.delta,
        idempotent: synthetic.idempotent,
        live_bank_transaction_created: false,
      },
      doctypes: {},
      verdict: CANONICAL_VERDICT,
      current_main_verdict: CURRENT_MAIN_VERDICT,
      bank_feed_verdict: BANK_FEED_VERDICT,
    };
    writeFileSync(
      path.join(ARTIFACT_DIR, 'probe-log.dry-run.json'),
      `${JSON.stringify(artifact, null, 2)}\n`
    );
    writeFileSync(
      path.join(CURRENT_MAIN_ARTIFACT_DIR, 'probe-log.dry-run.json'),
      `${JSON.stringify(artifact, null, 2)}\n`
    );
    log('dry_run_complete: 1');
    log('dry_run_does_not_overwrite_live_probe_log: 1');
    return;
  }

  let client;
  try {
    client = frappeClientFromEnv(process.env);
  } catch (err) {
    log(`FAIL client: ${redactText(err && err.message)}`);
    process.exit(1);
  }

  const who = await client.getLoggedUser();
  log(`auth_http: ${who.http}`);
  log(`authenticated_user: ${who.user || 'unknown'}`);
  if (!who.ok || who.user !== 'integrations@corpflowai.com') {
    log('FAIL identity mismatch or auth error');
    process.exit(1);
  }

  const companyList = await inspectDoctype(client, 'Company', [
    'name',
    'abbr',
    'default_currency',
    'country',
    'default_bank_account',
    'default_cash_account',
  ]);
  const companyRow = companyList.rows[0] || {};
  const companySafe = sanitizeBankReadback({
    name: companyRow.name || null,
    abbr: companyRow.abbr || null,
    default_currency: companyRow.default_currency || null,
    country: companyRow.country || null,
    default_cash_account: companyRow.default_cash_account || null,
    default_bank_account_present: Boolean(companyRow.default_bank_account),
    default_bank_account: companyRow.default_bank_account,
  });
  log(`company_http: ${companyList.http}`);
  log(`company_name: ${companySafe?.name || 'unread'}`);
  log(`company_default_currency: ${companySafe?.default_currency || 'unread'}`);
  log(`company_default_cash_account: ${companySafe?.default_cash_account || 'unset'}`);
  log(`company_default_bank_account_present: ${companySafe?.default_bank_account_present ? 1 : 0}`);

  const accountList = await inspectDoctype(
    client,
    'Account',
    ['name', 'account_name', 'account_type', 'root_type', 'is_group', 'parent_account', 'company', 'disabled'],
    { limit: 200 }
  );
  const bankCash = accountList.rows
    .map(safeAccount)
    .filter((row) => row && (row.account_type === 'Bank' || row.account_type === 'Cash'));
  log(`account_http: ${accountList.http}`);
  log(`account_count: ${accountList.count}`);
  log(`bank_or_cash_account_count: ${bankCash.length}`);
  for (const row of bankCash) {
    log(
      `bank_cash_account: name=${row.name} type=${row.account_type} is_group=${row.is_group} parent=${row.parent_account}`
    );
  }

  const bankMaster = await inspectDoctype(client, 'Bank', ['name']);
  log(`bank_master_http: ${bankMaster.http} count=${bankMaster.count} error=${bankMaster.error || 'none'}`);

  const bankAccount = await inspectDoctype(client, 'Bank Account', [
    'name',
    'account_name',
    'account',
    'bank',
    'account_type',
    'is_company_account',
    'disabled',
    'iban',
    'bank_account_no',
  ]);
  const bankAccountSafe = bankAccount.rows.map(safeBankAccount);
  log(
    `bank_account_http: ${bankAccount.http} count=${bankAccount.count} error=${bankAccount.error || 'none'}`
  );
  for (const row of bankAccountSafe) {
    log(
      `bank_account_row: name=${row.name} gl=${row.account || 'unset'} type=${row.account_type || 'unset'} company_account=${row.is_company_account} iban_present=${row.iban_present ? 1 : 0} account_no_present=${row.bank_account_no_present ? 1 : 0}`
    );
  }

  const mop = await inspectDoctype(client, 'Mode of Payment', ['name', 'type', 'enabled']);
  log(`mode_of_payment_http: ${mop.http} count=${mop.count} error=${mop.error || 'none'}`);
  for (const row of mop.rows.map(safeMode)) {
    log(`mode_of_payment: name=${row.name} type=${row.type}`);
  }

  const pe = await inspectDoctype(client, 'Payment Entry', ['name', 'docstatus', 'payment_type']);
  log(`payment_entry_http: ${pe.http} count=${pe.count} error=${pe.error || 'none'}`);

  const bt = await inspectDoctype(client, 'Bank Transaction', ['name', 'status', 'docstatus']);
  log(`bank_transaction_http: ${bt.http} count=${bt.count} error=${bt.error || 'none'}`);

  const extra = {};
  for (const doctype of [
    'Payment Request',
    'Payment Order',
    'Payment Term',
    'Payment Terms',
    'Payment Terms Template',
    'Journal Entry',
    'Bank Clearance',
    'Bank Guarantee',
    'Currency Exchange',
  ]) {
    extra[doctype] = await inspectDoctype(client, doctype, ['name']);
    log(
      `doctype ${doctype}: http=${extra[doctype].http} count=${extra[doctype].count} error=${extra[doctype].error || 'none'}`
    );
  }

  let versionsText = 'unread';
  try {
    const ping = await fetch(`${String(process.env.ERPNEXT_BASE_URL).replace(/\/+$/, '')}/api/method/frappe.utils.change_log.get_versions`, {
      headers: {
        Authorization: `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`,
        Accept: 'application/json',
      },
    });
    const body = await ping.json();
    const message = body && body.message ? body.message : {};
    const frappe = message.frappe && message.frappe.version ? message.frappe.version : 'unread';
    const erpnext = message.erpnext && message.erpnext.version ? message.erpnext.version : 'unread';
    versionsText = `frappe=${frappe}, erpnext=${erpnext}`;
  } catch {
    versionsText = 'unread';
  }
  log(`site_versions: ${versionsText}`);

  const artifact = {
    issue: SOURCE_PACKET_ISSUE,
    current_main_issue: CURRENT_MAIN_ISSUE,
    current_main_sha: currentMainSha(cfg),
    dry_run: false,
    identity: who.user,
    site_versions: versionsText,
    company: companySafe,
    bank_or_cash_accounts: bankCash,
    bank_master: { http: bankMaster.http, count: bankMaster.count, names: bankMaster.rows.map((r) => r.name) },
    bank_account: {
      http: bankAccount.http,
      count: bankAccount.count,
      rows: bankAccountSafe,
      error: bankAccount.error,
    },
    mode_of_payment: {
      http: mop.http,
      count: mop.count,
      rows: mop.rows.map(safeMode),
      error: mop.error,
    },
    payment_entry: { http: pe.http, count: pe.count, error: pe.error },
    bank_transaction: { http: bt.http, count: bt.count, error: bt.error },
    extra: Object.fromEntries(
      Object.entries(extra).map(([name, info]) => [
        name,
        { http: info.http, count: info.count, error: info.error },
      ])
    ),
    synthetic: {
      recon_confirmed: synthetic.first.recon_confirmed,
      delta: synthetic.first.delta,
      idempotent: synthetic.idempotent,
      live_bank_transaction_created: false,
      matches: synthetic.first.matches,
    },
    bank_feed_verdict: BANK_FEED_VERDICT,
    payment_segregation_rule: PAYMENT_SEGREGATION_RULE,
    verdict: CANONICAL_VERDICT,
    current_main_verdict: CURRENT_MAIN_VERDICT,
    forbidden_keys_in_artifact: payloadContainsForbiddenBankEvidence({
      company: companySafe,
      bank_or_cash_accounts: bankCash,
      bank_account: bankAccountSafe,
    }),
  };

  if (artifact.forbidden_keys_in_artifact.length) {
    log(`FAIL artifact contains forbidden bank keys: ${artifact.forbidden_keys_in_artifact.join(',')}`);
    process.exit(1);
  }

  writeFileSync(path.join(ARTIFACT_DIR, 'probe-log.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    path.join(CURRENT_MAIN_ARTIFACT_DIR, 'probe-log.json'),
    `${JSON.stringify(artifact, null, 2)}\n`
  );
  writeFileSync(
    path.join(ARTIFACT_DIR, 'README.md'),
    [
      '# #1139 bank / reconciliation readiness probe (reused by #1220)',
      '',
      `Identity: \`${who.user}\`. Host URL not recorded. No bank credentials, IBAN, SWIFT, or account numbers.`,
      `Synthetic recon: confirmed=${synthetic.first.recon_confirmed} delta=${synthetic.first.delta} idempotent=${synthetic.idempotent}.`,
      `Bank-feed verdict: ${BANK_FEED_VERDICT}.`,
      `Source verdict: ${CANONICAL_VERDICT}.`,
      `Current-main verdict: ${CURRENT_MAIN_VERDICT}.`,
      '',
    ].join('\n')
  );
  writeFileSync(
    path.join(CURRENT_MAIN_ARTIFACT_DIR, 'README.md'),
    [
      '# #1220 current-main bank / reconciliation GET-only probe',
      '',
      `Starts from current main \`${currentMainSha(cfg)}\`. Reuses #1139 evidence; GET-only re-probe after CURRENT-MAIN REPAIR. Stale PR #1221 is not revived.`,
      `Identity: \`${who.user}\`. Host URL not recorded. No bank credentials, IBAN, SWIFT, or account numbers.`,
      `Synthetic recon: confirmed=${synthetic.first.recon_confirmed} delta=${synthetic.first.delta} idempotent=${synthetic.idempotent}.`,
      `Bank-feed verdict: ${BANK_FEED_VERDICT}.`,
      `Final verdict: ${CURRENT_MAIN_VERDICT}.`,
      '',
    ].join('\n')
  );
  log(`artifact: artifacts/erpnext/bank-reconciliation-readiness-1220/probe-log.json`);
  log(`verdict: ${CANONICAL_VERDICT}`);
  log(`current_main_verdict: ${CURRENT_MAIN_VERDICT}`);
}

main().catch((err) => {
  log(`FAIL unexpected: ${redactText(err && err.message)}`);
  process.exit(1);
});
