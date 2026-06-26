#!/usr/bin/env node
/**
 * Codex -> Cursor outbox validator (L1 operator tool).
 *
 * Validates a Codex drop-zone batch packet against the Codex Integration
 * Contract v1 + the US Medspa "Audit Update Queue" schema, then moves the batch
 * to processed/ (valid) or rejected/ (invalid) and writes a report alongside it.
 *
 * This is a LOCAL, READ/MOVE-ONLY operator tool. It:
 *   - has ZERO third-party dependencies (Node built-ins only),
 *   - never sends email, never calls any network/external service,
 *   - never touches the production app, DB, POSTGRES_URL, env vars, or secrets,
 *   - never writes the Google Sheet (a human imports the validated CSV),
 *   - never mutates approval/send fields.
 *
 * Expected packet layout (under <root>/incoming/):
 *   batch-### / audit_update_queue.csv   (required)
 *   batch-### / manifest.json            (required)
 *   batch-### / source_rows.json         (optional; never imported to the Sheet)
 *
 * Usage:
 *   node scripts/codex-outbox-validate.mjs [--root <outbox-root>] [--batch <batch-id>] [--dry-run]
 *
 * Defaults: --root "C:\\CorpFlow\\codex-outbox\\medspa-audits"
 *           (override with CODEX_OUTBOX_ROOT or --root). With no --batch, every
 *           batch-* folder in incoming/ is processed.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Read a UTF-8 file and strip a leading byte-order mark if present. */
function readText(p) {
  return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
}

const ALLOWED_HEADERS = [
  'business_name', 'website_url', 'audit_status',
  'cta_clarity_score_1_5', 'booking_path_score_1_5', 'mobile_trust_speed_score_1_5',
  'service_clarity_score_1_5', 'lead_capture_score_1_5', 'lead_rescue_rating',
  'personalized_angle', 'draft_outreach_subject', 'draft_outreach_body',
  'last_reviewed_date', 'owner'
];

// Columns that must never appear in the queue (approval/send/identity/source).
const FORBIDDEN_HEADERS = [
  'anton_approval_status', 'approved_send_channel', 'date_added',
  'do_not_contact_reason', 'next_action_date',
  'city', 'state', 'category', 'contact_page_url', 'booking_url',
  'public_email_if_visible', 'phone_if_visible', 'source_url',
  'initial_fit_reason', 'suspected_lead_rescue_opportunity', 'notes'
];

const MATCH_KEYS = ['business_name', 'website_url'];
const SCORE_FIELDS = [
  'cta_clarity_score_1_5', 'booking_path_score_1_5', 'mobile_trust_speed_score_1_5',
  'service_clarity_score_1_5', 'lead_capture_score_1_5'
];
const ALLOWED_AUDIT_STATUS = ['Not started', 'Audited', 'Outreach drafted'];
const ALLOWED_LEAD_RESCUE = ['High', 'Medium', 'Low'];
const TEXT_FIELDS = ['personalized_angle', 'draft_outreach_subject', 'draft_outreach_body', 'owner'];
const MAX_TEXT_LEN = 2000;
const REQUIRED_MANIFEST_KEYS = [
  'artifact_name', 'intended_destination', 'owner', 'source_context',
  'status', 'allowed_use', 'prohibited_use', 'required_approval_gate', 'generated_at'
];

function parseArgs(argv) {
  const args = { root: process.env.CODEX_OUTBOX_ROOT || 'C:\\CorpFlow\\codex-outbox\\medspa-audits', batch: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i];
    else if (a === '--batch') args.batch = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

/** Minimal RFC-4180-ish CSV parser (handles quoted fields, commas, newlines). */
function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  // Drop trailing fully-empty rows.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function looksLikeFormula(value) {
  const v = String(value).trim();
  return v.length > 0 && (v[0] === '=' || v[0] === '+' || v[0] === '@');
}

function validateCsv(csvText, errors) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) { errors.push('CSV is empty.'); return; }
  const headers = rows[0].map((h) => h.trim());

  // Header allow-list (exact set; order not enforced).
  const forbiddenPresent = headers.filter((h) => FORBIDDEN_HEADERS.includes(h));
  if (forbiddenPresent.length) errors.push(`forbidden columns present: ${forbiddenPresent.join(', ')}`);
  const unknown = headers.filter((h) => !ALLOWED_HEADERS.includes(h));
  if (unknown.length) errors.push(`unknown columns present: ${unknown.join(', ')}`);
  for (const key of MATCH_KEYS) {
    if (!headers.includes(key)) errors.push(`missing required match key column: ${key}`);
  }

  const idx = {};
  headers.forEach((h, i) => { idx[h] = i; });
  const dataRows = rows.slice(1);
  if (dataRows.length === 0) errors.push('CSV has headers but no data rows.');

  dataRows.forEach((r, n) => {
    const lineNo = n + 2; // 1-based incl. header
    const get = (h) => (h in idx ? (r[idx[h]] ?? '').trim() : '');

    if (!get('business_name') || !get('website_url')) {
      errors.push(`row ${lineNo}: missing business_name or website_url`);
    }
    // Formula check across all present cells.
    headers.forEach((h) => { if (looksLikeFormula(get(h))) errors.push(`row ${lineNo}: cell "${h}" looks like a formula`); });

    SCORE_FIELDS.forEach((f) => {
      const v = get(f);
      if (v === '') return;
      const num = Number(v);
      if (!Number.isInteger(num) || num < 1 || num > 5) errors.push(`row ${lineNo}: ${f} must be an integer 1-5 (got "${v}")`);
    });

    const lr = get('lead_rescue_rating');
    if (lr && !ALLOWED_LEAD_RESCUE.includes(lr)) errors.push(`row ${lineNo}: lead_rescue_rating must be High/Medium/Low (got "${lr}")`);

    const st = get('audit_status');
    if (st && !ALLOWED_AUDIT_STATUS.includes(st)) errors.push(`row ${lineNo}: audit_status must be one of ${ALLOWED_AUDIT_STATUS.join(' / ')} (got "${st}")`);

    const d = get('last_reviewed_date');
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) errors.push(`row ${lineNo}: last_reviewed_date must be YYYY-MM-DD (got "${d}")`);

    TEXT_FIELDS.forEach((f) => {
      const v = get(f);
      if (v.length > MAX_TEXT_LEN) errors.push(`row ${lineNo}: ${f} exceeds ${MAX_TEXT_LEN} chars`);
    });
  });

  return { rowCount: dataRows.length, headerCount: headers.length };
}

function validateManifest(manifestText, errors) {
  let obj;
  try { obj = JSON.parse(manifestText); }
  catch (e) { errors.push(`manifest.json is not valid JSON: ${e.message}`); return; }
  for (const k of REQUIRED_MANIFEST_KEYS) {
    if (!(k in obj) || obj[k] === '' || obj[k] === null) errors.push(`manifest.json missing required key: ${k}`);
  }
  // Defensive: manifest must not assert a send/approval action.
  const banned = ['anton_approval_status', 'approved_send_channel'];
  banned.forEach((b) => { if (JSON.stringify(obj).includes(b)) errors.push(`manifest.json references forbidden field: ${b}`); });
  return obj;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function validateBatch(root, batchId, dryRun) {
  const incoming = path.join(root, 'incoming', batchId);
  const errors = [];
  const notes = [];

  const csvPath = path.join(incoming, 'audit_update_queue.csv');
  const manifestPath = path.join(incoming, 'manifest.json');
  const sourceRowsPath = path.join(incoming, 'source_rows.json');

  if (!fs.existsSync(csvPath)) errors.push('missing required file: audit_update_queue.csv');
  if (!fs.existsSync(manifestPath)) errors.push('missing required file: manifest.json');

  let csvStats = null;
  if (fs.existsSync(csvPath)) csvStats = validateCsv(readText(csvPath), errors);
  if (fs.existsSync(manifestPath)) validateManifest(readText(manifestPath), errors);
  if (fs.existsSync(sourceRowsPath)) {
    notes.push('source_rows.json present (audit trail only; never imported to the Sheet)');
    try { JSON.parse(readText(sourceRowsPath)); }
    catch (e) { errors.push(`source_rows.json is not valid JSON: ${e.message}`); }
  }

  const verdict = errors.length === 0 ? 'VALID' : 'INVALID';
  const report = [
    `Codex outbox validation report`,
    `batch: ${batchId}`,
    `validated_at: ${new Date().toISOString()}`,
    `verdict: ${verdict}`,
    csvStats ? `csv_rows: ${csvStats.rowCount}` : `csv_rows: n/a`,
    csvStats ? `csv_columns: ${csvStats.headerCount}` : `csv_columns: n/a`,
    ``,
    errors.length ? `errors:\n  - ${errors.join('\n  - ')}` : `errors: none`,
    notes.length ? `notes:\n  - ${notes.join('\n  - ')}` : `notes: none`,
    ``
  ].join('\n');

  console.log(`\n[${verdict}] ${batchId}`);
  console.log(report);

  if (dryRun) { console.log('(dry-run: not moving the batch)'); return verdict; }

  const destParent = path.join(root, verdict === 'VALID' ? 'processed' : 'rejected');
  const dest = path.join(destParent, batchId);
  fs.mkdirSync(destParent, { recursive: true });
  const finalDest = fs.existsSync(dest) ? `${dest}__${timestamp()}` : dest;
  fs.renameSync(incoming, finalDest);
  fs.writeFileSync(path.join(finalDest, 'validation_report.txt'), report, 'utf8');
  console.log(`moved -> ${finalDest}`);
  return verdict;
}

function main() {
  const args = parseArgs(process.argv);
  const incomingDir = path.join(args.root, 'incoming');
  if (!fs.existsSync(incomingDir)) {
    console.error(`incoming dir not found: ${incomingDir}`);
    process.exit(2);
  }
  let batches;
  if (args.batch) {
    batches = [args.batch];
  } else {
    batches = fs.readdirSync(incomingDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^batch-/.test(d.name))
      .map((d) => d.name)
      .sort();
  }
  if (batches.length === 0) { console.log('No batch-* folders in incoming/. Nothing to do.'); return; }

  const results = batches.map((b) => ({ batch: b, verdict: validateBatch(args.root, b, args.dryRun) }));
  const valid = results.filter((r) => r.verdict === 'VALID').length;
  const invalid = results.length - valid;
  console.log(`\nSummary: ${results.length} batch(es) — ${valid} VALID, ${invalid} INVALID.`);
  if (invalid > 0) process.exitCode = 1;
}

main();
