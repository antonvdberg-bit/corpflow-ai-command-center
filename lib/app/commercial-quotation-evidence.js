/**
 * Commercial Workspace → existing ERPNext Quotation drilldown (#1160).
 *
 * Resolves a Commercial row's already-recorded erpnext_quotation, then reads
 * bounded authoritative evidence via GET. Does not copy into Postgres.
 * Core / Operating Workspace only.
 */

import { loadCommercialDocumentsConfig } from '../erpnext/commercial-documents.js';
import {
  defaultPrintFormat,
  isStableQuotationName,
  projectBoundedQuotationEvidence,
  proofQuotationDocForName,
  readQuotationEvidence,
  readQuotationPdf,
  syntheticProofPdfBytes,
} from '../erpnext/quotation-evidence.js';
import { tryFrappeClientFromEnv } from '../erpnext/frappe-rest-client.js';
import {
  DATA_SOURCE_FIXTURE,
  projectCommercialRowsFromLeads,
} from './commercial-summary.js';
import { loadCommercialSummaryList } from './commercial-summary-list.js';
import {
  COMMERCIAL_QUOTATION_PDF_API_PATH,
  COMMERCIAL_SUMMARY_PATH,
  commercialQuotationPath,
} from './workspace-context.js';

export {
  COMMERCIAL_QUOTATION_API_PATH,
  COMMERCIAL_QUOTATION_PDF_API_PATH,
  COMMERCIAL_QUOTATION_PATH_PREFIX,
  commercialQuotationPath,
  isCommercialQuotationPath,
} from './workspace-context.js';

function asTrimmed(v) {
  return v == null ? '' : String(v).trim();
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string}
 */
export function quotationNameFromCommercialRow(row) {
  const record = row && typeof row === 'object' ? row : {};
  const erp = record.erpnext && typeof record.erpnext === 'object' ? record.erpnext : {};
  return asTrimmed(erp.quotation || record.erpnext_quotation);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} id
 */
function findCommercialRow(rows, id) {
  const wanted = asTrimmed(id);
  if (!wanted) return null;
  const list = Array.isArray(rows) ? rows : [];
  return (
    list.find((row) => asTrimmed(row?.id) === wanted || asTrimmed(row?.prospect_id) === wanted) || null
  );
}

function printFormatName() {
  return defaultPrintFormat();
}

/**
 * @param {{
 *   row: Record<string, unknown>,
 *   evidence: Record<string, unknown>,
 *   data_source: string,
 *   proof_mode?: boolean,
 *   print_available?: boolean,
 * }} args
 */
export function buildCommercialQuotationEvidencePayload(args) {
  const row = args.row && typeof args.row === 'object' ? args.row : {};
  const evidence = args.evidence && typeof args.evidence === 'object' ? args.evidence : {};
  const commercialId = asTrimmed(row.id || row.prospect_id);
  const quotation = asTrimmed(evidence.name);
  const proof = args.proof_mode === true;
  return {
    ok: true,
    workspace: 'operating',
    path: commercialQuotationPath(commercialId),
    view: 'commercial_quotation_evidence',
    canonical: true,
    data_source: args.data_source,
    proof_mode: proof,
    commercial: {
      id: commercialId || null,
      prospect_id: asTrimmed(row.prospect_id) || null,
      prospect_label: asTrimmed(row.prospect_label || row.client_label) || null,
      commercial_state: asTrimmed(row.commercial_state) || null,
      commercial_state_label: asTrimmed(row.commercial_state_label) || null,
      shared_detail_path: asTrimmed(row.shared_detail_path) || null,
      clients_path: asTrimmed(row.clients_path) || null,
      company_master_href: asTrimmed(row.company_master_href) || null,
    },
    quotation: evidence,
    print: {
      available: args.print_available !== false,
      format: asTrimmed(evidence.print_format) || printFormatName(),
      href: commercialId
        ? `${COMMERCIAL_QUOTATION_PDF_API_PATH}?env=core&id=${encodeURIComponent(commercialId)}${proof ? '&proof=1' : ''}`
        : null,
    },
    back: {
      commercial: proof ? `${COMMERCIAL_SUMMARY_PATH}?proof=1&filter=all` : COMMERCIAL_SUMMARY_PATH,
      prospect: asTrimmed(row.shared_detail_path)
        ? proof
          ? `${row.shared_detail_path}${String(row.shared_detail_path).includes('?') ? '&' : '?'}proof=1`
          : String(row.shared_detail_path)
        : null,
    },
    erpnext_mutated: false,
    copied_to_postgres: false,
    payment_processed: false,
    external_send: false,
    schema_changed: false,
    related_refs: {
      commercial: commercialId || null,
      prospect: asTrimmed(row.prospect_id) || null,
      quotation: quotation || null,
    },
  };
}

/**
 * @param {{
 *   id?: string,
 *   proofMode?: boolean,
 *   client?: { get: Function, downloadPdf?: Function, create?: Function, update?: Function } | null,
 *   prisma?: import('@prisma/client').PrismaClient,
 *   now?: Date,
 *   env?: NodeJS.ProcessEnv,
 * }} opts
 */
export async function loadCommercialQuotationEvidence(opts = {}) {
  const id = asTrimmed(opts.id);
  if (!id) {
    return { ok: false, error: 'commercial_id_required', http_status: 400 };
  }
  const loaded = await loadCommercialSummaryList({
    proofMode: opts.proofMode === true,
    prisma: opts.prisma,
    now: opts.now,
  });
  if (!loaded.ok) {
    return {
      ok: false,
      error: loaded.error || 'repository_unavailable',
      http_status: 503,
      data_source: loaded.data_source,
    };
  }
  const rows = projectCommercialRowsFromLeads(loaded.leads, loaded.now);
  const row = findCommercialRow(rows, id);
  if (!row) {
    return { ok: false, error: 'commercial_row_not_found', http_status: 404, data_source: loaded.data_source };
  }
  const quotation = quotationNameFromCommercialRow(row);
  if (!quotation) {
    return {
      ok: false,
      error: 'quotation_reference_missing',
      http_status: 409,
      data_source: loaded.data_source,
      row,
      blocker: 'NOT READY — no stable ERPNext Quotation id on this Commercial row',
    };
  }
  if (!isStableQuotationName(quotation)) {
    return {
      ok: false,
      error: 'quotation_reference_invalid',
      http_status: 409,
      data_source: loaded.data_source,
      row,
      blocker: `NOT READY — recorded quotation reference is not a stable ERPNext Quotation id`,
    };
  }

  const printFormat = printFormatName();
  if (opts.proofMode === true) {
    const doc = proofQuotationDocForName(quotation);
    if (!doc) {
      return {
        ok: false,
        error: 'quotation_proof_fixture_missing',
        http_status: 409,
        data_source: loaded.data_source,
        row,
        quotation,
        blocker: `NOT READY — no current-safe proof readback for ${quotation}`,
      };
    }
    return {
      ok: true,
      data_source: loaded.data_source || DATA_SOURCE_FIXTURE,
      row,
      evidence: projectBoundedQuotationEvidence(doc, { source: 'proof_fixture', print_format: printFormat }),
      print_available: true,
    };
  }

  const client = opts.client !== undefined ? opts.client : tryFrappeClientFromEnv(opts.env || process.env);
  if (!client) {
    return {
      ok: false,
      error: 'erpnext_read_unavailable',
      http_status: 503,
      data_source: loaded.data_source,
      row,
      quotation,
      blocker: 'NOT READY — hosted ERPNext GET/read-only client is unavailable (no credentials added)',
    };
  }
  const read = await readQuotationEvidence({ client, name: quotation, printFormat });
  if (!read.ok || !read.evidence) {
    return {
      ok: false,
      error: read.error || 'quotation_not_found',
      http_status: read.http === 404 ? 404 : 502,
      data_source: loaded.data_source,
      row,
      quotation,
      blocker: `NOT READY — ERPNext GET failed for ${quotation}`,
    };
  }
  return {
    ok: true,
    data_source: loaded.data_source,
    row,
    evidence: read.evidence,
    print_available: typeof client.downloadPdf === 'function',
  };
}

/**
 * @param {{
 *   id?: string,
 *   proofMode?: boolean,
 *   client?: { get: Function, downloadPdf?: Function } | null,
 *   prisma?: import('@prisma/client').PrismaClient,
 *   now?: Date,
 *   env?: NodeJS.ProcessEnv,
 * }} opts
 */
export async function loadCommercialQuotationPdf(opts = {}) {
  const loaded = await loadCommercialQuotationEvidence(opts);
  if (!loaded.ok) return loaded;
  const quotation = asTrimmed(loaded.evidence?.name);
  const printFormat = asTrimmed(loaded.evidence?.print_format) || printFormatName();
  if (opts.proofMode === true) {
    const bytes = syntheticProofPdfBytes(quotation);
    return {
      ok: true,
      data_source: loaded.data_source,
      row: loaded.row,
      quotation,
      bytes,
      isPdf: bytes.subarray(0, 5).toString('utf8') === '%PDF-',
      print_format: printFormat,
      filename: `${quotation || 'quotation'}.pdf`,
    };
  }
  const client = opts.client !== undefined ? opts.client : tryFrappeClientFromEnv(opts.env || process.env);
  if (!client || typeof client.downloadPdf !== 'function') {
    return {
      ok: false,
      error: 'erpnext_print_unavailable',
      http_status: 503,
      data_source: loaded.data_source,
      row: loaded.row,
      quotation,
      blocker: 'NOT READY — hosted ERPNext print GET is unavailable (no credentials added)',
    };
  }
  const pdf = await readQuotationPdf({ client, name: quotation, printFormat });
  if (!pdf.ok) {
    return {
      ok: false,
      error: pdf.error || 'print_failed',
      http_status: pdf.http === 404 ? 404 : 502,
      data_source: loaded.data_source,
      row: loaded.row,
      quotation,
      blocker: `NOT READY — ERPNext print GET failed for ${quotation}`,
    };
  }
  return {
    ok: true,
    data_source: loaded.data_source,
    row: loaded.row,
    quotation,
    bytes: pdf.bytes,
    isPdf: true,
    print_format: printFormat,
    filename: `${quotation}.pdf`,
  };
}

export function commercialDocumentsPrintFormat() {
  return asTrimmed(loadCommercialDocumentsConfig().print?.quotation_format) || printFormatName();
}
