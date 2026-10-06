#!/usr/bin/env node
/**
 * Apply and verify the reusable CorpFlowAI Quotation Print Format for #1402.
 *
 * Allowed mutation: update the existing custom Print Format only.
 * Forbidden: quotation writes, submission, send/release, schema/data changes.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { frappeClientFromEnv } from '../../lib/erpnext/frappe-rest-client.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEMPLATE_PATH = path.join(ROOT, 'docs/erpnext/templates/corpflowai-professional-quotation.html');
const LOGO_PATH = path.join(ROOT, 'public/brand/corpflowai/corpflowai-mark.png');
const OUTPUT_DIR = path.join(ROOT, 'artifacts/erpnext/professional-quotation-1402');
const PRINT_FORMAT = 'CorpFlowAI Professional Quotation';
const ORIXHEALTH_QUOTATION = 'SAL-QTN-2026-00006';
const CUSTOMER_QUOTATION = 'SAL-QTN-2026-00005';

function presence(name) {
  return process.env[name] && String(process.env[name]).trim() ? 'present' : 'absent';
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function renderTemplate() {
  const template = readFileSync(TEMPLATE_PATH, 'utf8');
  const logo = readFileSync(LOGO_PATH).toString('base64');
  const html = template.replace(
    '__CORPFLOW_LOGO_DATA_URI__',
    `data:image/png;base64,${logo}`,
  );
  assertCondition(!html.includes('__CORPFLOW_LOGO_DATA_URI__'), 'LOGO_TOKEN_NOT_REPLACED');
  assertCondition(html.includes('CorpFlowAI'), 'BRAND_NAME_MISSING');
  assertCondition(html.includes('cfq-grand'), 'TOTAL_BLOCK_MISSING');
  return html;
}

function pdfSummary(bytes, outfile) {
  return {
    ok: bytes.length >= 5 && bytes.subarray(0, 5).toString('utf8') === '%PDF-',
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex').slice(0, 16),
    outfile: path.relative(ROOT, outfile),
  };
}

async function main() {
  console.log('ERPNext professional quotation apply / verification (#1402)');
  console.log('expected_identity: integrations@corpflowai.com');
  console.log(`ERPNEXT_BASE_URL: ${presence('ERPNEXT_BASE_URL')}`);
  console.log(`ERPNEXT_API_KEY: ${presence('ERPNEXT_API_KEY')}`);
  console.log(`ERPNEXT_API_SECRET: ${presence('ERPNEXT_API_SECRET')}`);
  console.log('mutation_scope: existing custom Print Format only');
  console.log('non_actions: no quotation write, submit, send, release, schema, or payment');

  const missing = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].filter(
    (name) => presence(name) !== 'present',
  );
  assertCondition(missing.length === 0, `MISSING_INJECTED_SECRETS: ${missing.join(',')}`);

  const client = frappeClientFromEnv();
  const identity = await client.getLoggedUser();
  assertCondition(identity.ok && identity.user === 'integrations@corpflowai.com', 'UNEXPECTED_ERPNext_IDENTITY');

  const [formatBefore, orixBefore, customerBefore] = await Promise.all([
    client.get('Print Format', PRINT_FORMAT),
    client.get('Quotation', ORIXHEALTH_QUOTATION),
    client.get('Quotation', CUSTOMER_QUOTATION),
  ]);
  assertCondition(formatBefore.ok, 'PRINT_FORMAT_NOT_FOUND');
  assertCondition(formatBefore.row.doc_type === 'Quotation', 'PRINT_FORMAT_WRONG_DOCTYPE');
  assertCondition(String(formatBefore.row.standard).toLowerCase() === 'no', 'PRINT_FORMAT_IS_STANDARD');
  assertCondition(orixBefore.ok && customerBefore.ok, 'QUOTATION_FIXTURES_NOT_FOUND');
  assertCondition(orixBefore.row.docstatus === 0, 'ORIXHEALTH_NOT_DRAFT_BEFORE_APPLY');
  assertCondition(orixBefore.row.currency === 'MUR', 'ORIXHEALTH_CURRENCY_CHANGED_BEFORE_APPLY');
  assertCondition(Number(orixBefore.row.grand_total) === 25000, 'ORIXHEALTH_TOTAL_CHANGED_BEFORE_APPLY');
  assertCondition(orixBefore.row.valid_till === '2026-10-19', 'ORIXHEALTH_VALIDITY_CHANGED_BEFORE_APPLY');
  assertCondition(customerBefore.row.docstatus === 0, 'CUSTOMER_QUOTATION_NOT_DRAFT_BEFORE_APPLY');

  const html = renderTemplate();
  const updated = await client.update('Print Format', PRINT_FORMAT, {
    html,
    print_format_type: 'Jinja',
    disabled: 0,
    standard: 'No',
  });
  assertCondition(updated.ok, `PRINT_FORMAT_UPDATE_FAILED_HTTP_${updated.http}`);

  const [formatAfter, orixAfter, customerAfter] = await Promise.all([
    client.get('Print Format', PRINT_FORMAT),
    client.get('Quotation', ORIXHEALTH_QUOTATION),
    client.get('Quotation', CUSTOMER_QUOTATION),
  ]);
  assertCondition(formatAfter.ok && formatAfter.row.html === html, 'PRINT_FORMAT_READBACK_MISMATCH');
  assertCondition(orixAfter.ok && customerAfter.ok, 'QUOTATION_READBACK_FAILED');
  assertCondition(orixAfter.row.docstatus === 0, 'ORIXHEALTH_NOT_DRAFT_AFTER_APPLY');
  assertCondition(orixAfter.row.currency === 'MUR', 'ORIXHEALTH_CURRENCY_CHANGED_AFTER_APPLY');
  assertCondition(Number(orixAfter.row.grand_total) === 25000, 'ORIXHEALTH_TOTAL_CHANGED_AFTER_APPLY');
  assertCondition(orixAfter.row.valid_till === '2026-10-19', 'ORIXHEALTH_VALIDITY_CHANGED_AFTER_APPLY');
  assertCondition(customerAfter.row.docstatus === 0, 'CUSTOMER_QUOTATION_NOT_DRAFT_AFTER_APPLY');

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const pdfs = {};
  for (const [key, name] of [
    ['orixhealth', ORIXHEALTH_QUOTATION],
    ['customer', CUSTOMER_QUOTATION],
  ]) {
    const printed = await client.downloadPdf('Quotation', name, PRINT_FORMAT);
    assertCondition(printed.ok && printed.isPdf, `${key.toUpperCase()}_PDF_FAILED_${printed.error || printed.http}`);
    const outfile = path.join(OUTPUT_DIR, `${key}-${name}.pdf`);
    writeFileSync(outfile, printed.bytes);
    pdfs[key] = { quotation: name, ...pdfSummary(printed.bytes, outfile) };
  }

  const evidence = {
    schema: 'corpflow.erpnext.professional_quotation_apply.v1',
    issue: 1402,
    generated_at_utc: new Date().toISOString(),
    identity: identity.user,
    secrets_printed: false,
    print_format: {
      name: PRINT_FORMAT,
      doc_type: formatAfter.row.doc_type,
      print_format_type: formatAfter.row.print_format_type,
      standard: formatAfter.row.standard,
      disabled: formatAfter.row.disabled,
      html_bytes: html.length,
      logo_source: 'public/brand/corpflowai/corpflowai-mark.png (embedded data URI)',
    },
    quotations: {
      orixhealth: {
        name: ORIXHEALTH_QUOTATION,
        quotation_to: orixAfter.row.quotation_to,
        customer_name: orixAfter.row.customer_name,
        docstatus: orixAfter.row.docstatus,
        currency: orixAfter.row.currency,
        grand_total: orixAfter.row.grand_total,
        valid_till: orixAfter.row.valid_till,
      },
      customer: {
        name: CUSTOMER_QUOTATION,
        quotation_to: customerAfter.row.quotation_to,
        customer_name: customerAfter.row.customer_name,
        docstatus: customerAfter.row.docstatus,
        currency: customerAfter.row.currency,
        grand_total: customerAfter.row.grand_total,
        valid_till: customerAfter.row.valid_till,
      },
    },
    pdfs,
    external_send_or_release: false,
    schema_or_accounting_mutation: false,
    verdict: 'ERPNext BRANDED QUOTATION READY FOR ANTON REVIEW',
  };
  writeFileSync(path.join(OUTPUT_DIR, 'apply-log.json'), `${JSON.stringify(evidence, null, 2)}\n`);

  console.log(`print_format: ${PRINT_FORMAT}`);
  console.log(`orixhealth_pdf: ${pdfs.orixhealth.outfile} (${pdfs.orixhealth.bytes} bytes)`);
  console.log(`customer_pdf: ${pdfs.customer.outfile} (${pdfs.customer.bytes} bytes)`);
  console.log(`orixhealth: Draft=${orixAfter.row.docstatus === 0} total=${orixAfter.row.grand_total} ${orixAfter.row.currency} valid_till=${orixAfter.row.valid_till}`);
  console.log('external_send_or_release: false');
  console.log('verdict: ERPNext BRANDED QUOTATION READY FOR ANTON REVIEW');
}

main().catch((error) => {
  console.error(`BLOCKED — ${error.message}`);
  process.exitCode = 1;
});
