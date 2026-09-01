#!/usr/bin/env node
/**
 * #1196 bounded repair for the existing synthetic MUR quotation.
 * Canonical context: corpflow_test, source #1196, operating model 2026-08-13-v1.
 *
 * Default mode is read-only verification. --apply performs exactly one ERPNext
 * Quotation update: copy the existing approved Terms and Conditions master body
 * onto SAL-QTN-2026-00005. No submit, send, invoice, payment, tax, schema or
 * Postgres action is performed.
 *
 * IMPORTANT: --apply is a protected ERPNext write and requires explicit Anton
 * approval before execution.
 */
import { createHash } from 'node:crypto';

import { frappeClientFromEnv } from '../../lib/erpnext/frappe-rest-client.js';
import {
  PRINT_FORMAT,
  QUOTATION_NAME,
  TERMS_NAME,
  assess1196Repair,
} from '../../lib/erpnext/mur-quotation-terms-repair-1196.js';

function requiredEnvPresent(env = process.env) {
  return ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].every(
    (name) => env[name] && String(env[name]).trim(),
  );
}

const apply = process.argv.includes('--apply');
if (!requiredEnvPresent()) {
  console.error('BLOCKED — ERPNext credentials are not available in this runtime.');
  process.exit(1);
}

const client = frappeClientFromEnv(process.env);
const auth = await client.getLoggedUser();
if (!auth.ok || auth.user !== 'integrations@corpflowai.com') {
  console.error('BLOCKED — ERPNext integration identity verification failed.');
  process.exit(1);
}

const [quotationGet, termsGet] = await Promise.all([
  client.get('Quotation', QUOTATION_NAME),
  client.get('Terms and Conditions', TERMS_NAME),
]);
if (!quotationGet.ok || !termsGet.ok) {
  console.error('BLOCKED — required ERPNext quotation or terms master could not be read.');
  process.exit(1);
}

let assessment = assess1196Repair({ quotation: quotationGet.row, termsMaster: termsGet.row });
if (!assessment.ok) {
  console.error(`BLOCKED — ${assessment.blockers.join(',')}`);
  process.exit(1);
}

if (!apply) {
  console.log(JSON.stringify({
    issue: 1196,
    mode: 'read_only',
    identity: auth.user,
    quotation: QUOTATION_NAME,
    terms_name: TERMS_NAME,
    ...assessment,
    next_action: assessment.already_repaired
      ? 'verify_pdf'
      : 'explicit Anton approval required before --apply',
  }, null, 2));
  process.exit(0);
}

if (assessment.already_repaired) {
  console.log('NOOP — quotation already contains the approved terms body.');
} else {
  const updated = await client.update('Quotation', QUOTATION_NAME, assessment.repair_payload);
  if (!updated.ok) {
    console.error(`BLOCKED — ERPNext terms update failed (HTTP ${updated.http}).`);
    process.exit(1);
  }
}

const readback = await client.get('Quotation', QUOTATION_NAME);
if (!readback.ok) {
  console.error('BLOCKED — quotation read-back failed after repair.');
  process.exit(1);
}
assessment = assess1196Repair({ quotation: readback.row, termsMaster: termsGet.row });
if (!assessment.ok || !assessment.already_repaired) {
  console.error('BLOCKED — terms body did not persist exactly after update.');
  process.exit(1);
}

const pdf = await client.downloadPdf('Quotation', QUOTATION_NAME, PRINT_FORMAT);
if (!pdf.ok || !pdf.isPdf) {
  console.error('BLOCKED — repaired quotation PDF could not be rendered.');
  process.exit(1);
}

console.log(JSON.stringify({
  issue: 1196,
  mode: 'applied_and_verified',
  identity: auth.user,
  quotation: QUOTATION_NAME,
  terms_name: TERMS_NAME,
  terms_body_matches_master: true,
  pdf_bytes: pdf.bytes.length,
  pdf_sha256_16: createHash('sha256').update(pdf.bytes).digest('hex').slice(0, 16),
  erpnext_mutations: ['Quotation.terms'],
  non_actions: [
    'quotation_submit',
    'quotation_send',
    'sales_invoice_create_or_submit',
    'payment_entry',
    'tax_or_accounting_mutation',
    'postgres_write',
    'schema_change',
  ],
  verdict: 'QUOTATION TERMS REPAIR APPLIED — PDF RENDERED FOR FINAL CONTENT CHECK',
}, null, 2));
