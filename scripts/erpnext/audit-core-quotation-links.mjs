#!/usr/bin/env node
/**
 * Read-only reconciliation of explicit Core quotation pointers and ERPNext
 * Quotation records. This module has no import-time network or database work.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { frappeClientFromEnv } from '../../lib/erpnext/frappe-rest-client.js';
import { isStableQuotationName } from '../../lib/erpnext/quotation-evidence.js';

export const LINK_CLASSIFICATIONS = Object.freeze([
  'VERIFIED_EXISTING_LINK',
  'DANGLING_REFERENCE',
  'CONFLICTING_REFERENCE',
  'ERP_RECORD_WITHOUT_CORE_LINK',
  'CORE_REFERENCE_WITHOUT_ERP_RECORD',
  'TEST_ONLY_REFERENCE',
  'AMBIGUOUS_MATCH',
  'ACCESS_BLOCKED',
  'PARTIAL_SCAN',
]);

const DEFAULT_LIMITS = Object.freeze({ corePageSize: 50, erpPageSize: 50, maxPages: 10 });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUTPUT = path.join(ROOT, 'artifacts', 'erpnext', 'core-quotation-link-audit', 'latest.json');

function text(value) {
  return value == null ? '' : String(value).trim();
}

function pointerFor(row) {
  const qualification = row?.qualification_json;
  if (!qualification || typeof qualification !== 'object') return null;
  const candidates = [
    qualification.erpnext,
    qualification.commercial_approval?.erpnext,
    qualification.commercial_approval,
  ];
  return candidates.find((candidate) => candidate && typeof candidate === 'object' && text(candidate.erpnext_quotation)) || null;
}

function leadIdFor(row, pointer = pointerFor(row)) {
  return text(row?.id || row?.lead_id || pointer?.lead_id);
}

function quotationFor(row) {
  return text(row?.name || row?.quotation || row?.erpnext_quotation);
}

function markerText(row) {
  return [row?.title, row?.customer_notes, row?.remarks, row?.notes, row?.name].map(text).join(' | ');
}

function markerLeadId(row) {
  const match = markerText(row).match(/(?:lead=|lead_id=)([A-Za-z0-9._-]+)/i);
  return match ? text(match[1]) : '';
}

function isSynthetic(row, pointer, coreRow) {
  const blob = `${markerText(row)} ${JSON.stringify(pointer || {})} ${JSON.stringify(coreRow || {})}`;
  return /synthetic|test-only|do not send|cf1018/i.test(blob);
}

function safeId(value) {
  const raw = text(value);
  return raw ? `${raw.slice(0, 4)}…${createHash('sha256').update(raw).digest('hex').slice(0, 8)}` : null;
}

function pointerTuple(coreRow, pointer) {
  return {
    core_id: leadIdFor(coreRow, pointer),
    erpnext_quotation: text(pointer?.erpnext_quotation),
    provenance: {
      schema: text(pointer?.schema),
      bridge: text(pointer?.bridge || pointer?.quotation_bridge),
      lead_id: text(pointer?.lead_id),
      source: text(pointer?.source),
    },
  };
}

async function readPages(reader, doctype, pageSize, maxPages) {
  const rows = [];
  let partial = false;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await reader(doctype, {
      limit: pageSize,
      limitStart: page * pageSize,
      fields: ['name', 'title', 'customer_notes', 'remarks', 'notes', 'party_name', 'opportunity', 'docstatus'],
    });
    if (!result || result.ok !== true) {
      return { rows, partial, error: text(result?.error) || `HTTP_${Number(result?.http) || 0}` };
    }
    const pageRows = Array.isArray(result.rows) ? result.rows : [];
    rows.push(...pageRows);
    if (result.hasMore === true || pageRows.length >= pageSize) {
      if (page === maxPages - 1) partial = true;
      continue;
    }
    return { rows, partial, error: null };
  }
  return { rows, partial: true, error: null };
}

/**
 * @param {{
 *   leadReader: Function,
 *   erpClient: { list: Function },
 *   limits?: Partial<typeof DEFAULT_LIMITS>,
 * }} options
 */
export async function auditCoreQuotationLinks(options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const leadReader = options.leadReader;
  const erpClient = options.erpClient;
  if (typeof leadReader !== 'function' || !erpClient || typeof erpClient.list !== 'function') {
    return { ok: false, classifications: [{ classification: 'ACCESS_BLOCKED', reason: 'READ_SEAMS_REQUIRED' }] };
  }

  const core = await readPages(leadReader, 'Lead', limits.corePageSize, limits.maxPages);
  const erp = await readPages((doctype, query) => erpClient.list(doctype, query), 'Quotation', limits.erpPageSize, limits.maxPages);
  if (core.error || erp.error) {
    return {
      ok: false,
      classifications: [{
        classification: 'ACCESS_BLOCKED',
        reason: core.error ? 'CORE_READ_FAILED' : 'ERP_READ_FAILED',
        http: null,
      }],
      safe_counts: { core_rows: core.rows.length, erp_rows: erp.rows.length },
    };
  }

  const coreByQuotation = new Map();
  const rows = [];
  for (const coreRow of core.rows) {
    const pointer = pointerFor(coreRow);
    if (!pointer) continue;
    const quotation = text(pointer.erpnext_quotation);
    const tuple = pointerTuple(coreRow, pointer);
    if (!isStableQuotationName(quotation)) {
      rows.push({ classification: 'CORE_REFERENCE_WITHOUT_ERP_RECORD', tuple, reason: 'INVALID_OR_MISSING_POINTER' });
      continue;
    }
    if (!coreByQuotation.has(quotation)) coreByQuotation.set(quotation, []);
    coreByQuotation.get(quotation).push({ coreRow, pointer, tuple });
  }

  const seenQuotations = new Set();
  for (const erpRow of erp.rows) {
    const quotation = quotationFor(erpRow);
    if (!quotation) continue;
    seenQuotations.add(quotation);
    const linked = coreByQuotation.get(quotation) || [];
    const markerLead = markerLeadId(erpRow);
    if (isSynthetic(erpRow, linked[0]?.pointer, linked[0]?.coreRow)) {
      rows.push({ classification: 'TEST_ONLY_REFERENCE', quotation: safeId(quotation), marker_lead_id: safeId(markerLead) });
      continue;
    }
    if (linked.length > 1 || (markerLead && linked.some(({ pointer }) => text(pointer.lead_id) && text(pointer.lead_id) !== markerLead))) {
      rows.push({ classification: 'CONFLICTING_REFERENCE', quotation: safeId(quotation) });
      continue;
    }
    if (linked.length === 1) {
      rows.push({ classification: 'VERIFIED_EXISTING_LINK', tuple: linked[0].tuple });
    } else {
      rows.push({ classification: 'ERP_RECORD_WITHOUT_CORE_LINK', quotation: safeId(quotation), marker_lead_id: safeId(markerLead) });
    }
  }

  for (const [quotation, linked] of coreByQuotation) {
    if (!seenQuotations.has(quotation)) {
      for (const item of linked) rows.push({ classification: 'DANGLING_REFERENCE', tuple: item.tuple });
    }
  }

  if (core.partial || erp.partial) rows.push({ classification: 'PARTIAL_SCAN', reason: 'EXPLICIT_PAGE_LIMIT_EXHAUSTED' });
  const counts = Object.fromEntries(LINK_CLASSIFICATIONS.map((classification) => [
    classification,
    rows.filter((row) => row.classification === classification).length,
  ]));
  const blocked = counts.ACCESS_BLOCKED > 0;
  const partial = counts.PARTIAL_SCAN > 0;
  return {
    ok: !blocked && !partial,
    pass_requires: 'DURABLE_POINTER_READBACK_AND_AUTHENTICATED_ERP_GET_PDF',
    classifications: rows,
    counts,
    safe_counts: { core_rows: core.rows.length, erp_rows: erp.rows.length },
    limits,
    private_artifact: {
      proposed_link_tuples: rows.filter((row) => row.tuple).map((row) => row.tuple),
      compare_and_set_values: [],
      rollback: 'No mutation performed. A later separately approved backfill must compare current pointer values before writing and retain the prior values.',
    },
  };
}

export async function runAudit({ leadReader, erpClient, outputPath = DEFAULT_OUTPUT, limits } = {}) {
  const result = await auditCoreQuotationLinks({ leadReader, erpClient, limits });
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

async function main() {
  const missing = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].filter(
    (name) => !text(process.env[name]),
  );
  if (missing.length) {
    console.log(JSON.stringify({ ok: false, classification: 'ACCESS_BLOCKED', reason: 'MISSING_INJECTED_SECRET_NAMES', missing }, null, 2));
    process.exitCode = 1;
    return;
  }
  const client = frappeClientFromEnv(process.env);
  const result = await runAudit({
    erpClient: client,
    leadReader: async () => ({ ok: false, error: 'CORE_READ_ACCESS_NOT_AVAILABLE_TO_AUDIT_SCRIPT' }),
  });
  console.log(JSON.stringify({ ok: result.ok, counts: result.counts || {}, safe_counts: result.safe_counts || {} }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
