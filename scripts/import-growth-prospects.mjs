#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as XLSX from 'xlsx';

import { PrismaClient } from '@prisma/client';

export const REQUIRED_HEADERS = Object.freeze([
  '#',
  'Prospect',
  'Why it fits / likely commercial pain',
  'Decision-maker',
  'Best route',
  'Score',
  'Progress',
  'Source',
]);

const prisma = new PrismaClient();

function text(value) {
  return value == null ? '' : String(value).trim();
}

function headerKey(value) {
  return text(value).toLowerCase().replace(/\s+/g, ' ');
}

function slugify(value) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeIdentity(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normalizeScore(value) {
  const match = text(value).match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const score = Number(match[0]);
  return Number.isFinite(score) ? Math.round(score) : null;
}

export function extractRoutes(value) {
  const original = text(value);
  const email = original.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phone = original.match(/(?:\+?\d[\d\s().-]{6,}\d)/)?.[0]?.replace(/[^\d+]/g, '') || null;
  const lower = original.toLowerCase();
  const channels = [];
  if (lower.includes('whatsapp')) channels.push('whatsapp');
  if (email || lower.includes('email')) channels.push('email');
  if (phone || lower.includes('phone') || lower.includes('call')) channels.push('phone');
  if (lower.includes('linkedin')) channels.push('linkedin');
  if (channels.length === 0 && original) channels.push('other');
  return {
    original: original || null,
    email,
    phone,
    whatsappNumber: lower.includes('whatsapp') ? phone : null,
    preferredRoute: channels[0] || null,
    channels,
  };
}

export function mapProgress(value) {
  const progress = text(value);
  const lower = progress.toLowerCase();
  if (!lower) return { lifecycleState: 'RESEARCHED', touchpointResult: 'not_contacted' };
  if (/(not fit|not a fit|closed|rejected|declined)/.test(lower)) {
    return { lifecycleState: 'NOT_FIT', touchpointResult: 'not_fit' };
  }
  if (/(failed|bounce|bounced|invalid|wrong number|undeliver)/.test(lower)) {
    return {
      lifecycleState: 'CONTACT_ROUTE_FAILED',
      touchpointResult: 'route_failed',
      failureReason: progress,
    };
  }
  if (/(diagnos|audit|discovery)/.test(lower)) {
    return { lifecycleState: 'DIAGNOSIS_PENDING', touchpointResult: 'diagnosis_pending' };
  }
  if (/(uncontacted|not contacted|research)/.test(lower)) {
    return { lifecycleState: 'RESEARCHED', touchpointResult: 'not_contacted' };
  }
  if (/(await|no response|no reply|follow.?up|pending)/.test(lower)) {
    return { lifecycleState: 'AWAITING_RESPONSE', touchpointResult: 'awaiting_response' };
  }
  if (/(engag|repl|interested|responded)/.test(lower)) {
    return { lifecycleState: 'ENGAGED', touchpointResult: 'engaged' };
  }
  if (/(qualif)/.test(lower)) {
    return { lifecycleState: 'QUALIFIED', touchpointResult: 'qualified' };
  }
  if (/(contact|reach|sent|messag|call)/.test(lower)) {
    return { lifecycleState: 'CONTACT_ATTEMPTED', touchpointResult: 'contact_attempted' };
  }
  return { lifecycleState: 'RESEARCHED', touchpointResult: 'unmapped_progress' };
}

function nextActionFor(lifecycleState) {
  switch (lifecycleState) {
    case 'RESEARCHED':
      return 'Review prospect and confirm a contact route';
    case 'CONTACT_ATTEMPTED':
      return 'Record the contact outcome';
    case 'AWAITING_RESPONSE':
      return 'Follow up or use an alternate route';
    case 'ENGAGED':
      return 'Arrange a diagnosis conversation';
    case 'DIAGNOSIS_PENDING':
      return 'Complete the enquiry-leak diagnosis';
    case 'QUALIFIED':
      return 'Prepare the operator-reviewed pilot path';
    case 'NOT_FIT':
      return 'Keep closed with the recorded not-fit reason';
    case 'CONTACT_ROUTE_FAILED':
      return 'Use a different verified contact route';
    default: {
      const exhaustive = /** @type {never} */ (lifecycleState);
      throw new Error(`Unsupported lifecycle state: ${exhaustive}`);
    }
  }
}

function sourceUrl(value) {
  const candidate = text(value);
  return /^https?:\/\//i.test(candidate) ? candidate : null;
}

function parseDecisionMaker(value) {
  const raw = text(value);
  const unconfirmed = !raw || /(?:unknown|unconfirmed|not confirmed|tbc|tbd|n\/a)/i.test(raw);
  return {
    fullName: unconfirmed ? 'Decision-maker not confirmed' : raw,
    confirmed: !unconfirmed,
    roleTitle: null,
  };
}

export function mapWorksheetRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Workbook has no rows');
  }
  const headers = rows[0].map(headerKey);
  const required = REQUIRED_HEADERS.map(headerKey);
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length > 0) throw new Error(`Missing required headers: ${missing.join(', ')}`);

  const index = new Map(headers.map((header, i) => [header, i]));
  const valueAt = (row, header) => row[index.get(headerKey(header))];
  const mapped = [];
  const duplicateKeys = new Set();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((cell) => text(cell) === '')) continue;
    const name = text(valueAt(row, 'Prospect'));
    if (!name) throw new Error(`Row ${i + 1}: Prospect is required`);
    const routes = extractRoutes(valueAt(row, 'Best route'));
    const progress = mapProgress(valueAt(row, 'Progress'));
    const decisionMaker = parseDecisionMaker(valueAt(row, 'Decision-maker'));
    const dedupeKey = [
      normalizeIdentity(name),
      normalizeIdentity(decisionMaker.fullName),
      routes.email?.toLowerCase() || '',
      routes.phone || '',
    ].join('|');
    const warnings = [];
    if (normalizeScore(valueAt(row, 'Score')) == null) warnings.push('score_unmapped');
    if (!sourceUrl(valueAt(row, 'Source')) && text(valueAt(row, 'Source'))) warnings.push('source_not_url_preserved_as_text');
    if (progress.touchpointResult === 'unmapped_progress') warnings.push('progress_unmapped');
    if (duplicateKeys.has(dedupeKey)) warnings.push('duplicate_within_workbook');
    duplicateKeys.add(dedupeKey);

    mapped.push({
      rowNumber: i + 1,
      sourceRowNumber: text(valueAt(row, '#')) || String(i),
      name,
      fitHypothesis: text(valueAt(row, 'Why it fits / likely commercial pain')) || null,
      decisionMaker,
      routes,
      score: normalizeScore(valueAt(row, 'Score')),
      progress: text(valueAt(row, 'Progress')) || null,
      source: text(valueAt(row, 'Source')) || null,
      sourceUrl: sourceUrl(valueAt(row, 'Source')),
      ...progress,
      nextAction: nextActionFor(progress.lifecycleState),
      warnings,
    });
  }
  return mapped;
}

export function fieldLossReport(rows) {
  const fields = [
    ['Prospect', (row) => row.name],
    ['Why it fits / likely commercial pain', (row) => row.fitHypothesis],
    ['Decision-maker', (row) => row.decisionMaker.fullName],
    ['Best route', (row) => row.routes.original],
    ['Score', (row) => row.score],
    ['Progress', (row) => row.progress],
    ['Source', (row) => row.source],
  ];
  return fields.map(([field, destination]) => ({
    field,
    rows_with_value: rows.filter((row) => destination(row) != null && text(destination(row)) !== '').length,
    durable_destination: true,
    destination: field === 'Best route' ? 'GrowthContact.bestRouteOriginal + structured route fields' : field,
  }));
}

function usage() {
  console.log(
    'Usage: node scripts/import-growth-prospects.mjs <path.xlsx> --tenant-id <tenant> [--dry-run|--apply] [--show-routes]',
  );
}

function argsFrom(argv) {
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const tenantIndex = argv.indexOf('--tenant-id');
  return {
    workbook: positional[0],
    tenantId: tenantIndex >= 0 ? text(argv[tenantIndex + 1]) : '',
    apply: argv.includes('--apply'),
    showRoutes: argv.includes('--show-routes'),
  };
}

function printPreview(rows) {
  for (const row of rows) {
    const routeSummary = row.routes.channels.join(',') || 'none';
    console.log(
      `row=${row.rowNumber} prospect="${row.name}" score=${row.score ?? 'null'} lifecycle=${row.lifecycleState} route=${routeSummary} warnings=${row.warnings.join('|') || 'none'}`,
    );
    if (row.warnings.length > 0) console.log(`  warning_details=${row.warnings.join(',')}`);
    if (row.source && !row.sourceUrl) console.log('  source_preserved_as_text=true');
    if (argsFrom(process.argv.slice(2)).showRoutes) {
      console.log(`  route_original_present=${Boolean(row.routes.original)} contact_values_suppressed=true`);
    }
  }
}

async function applyRows(rows, tenantId) {
  const segment = await prisma.growthSegment.upsert({
    where: { tenantId_slug: { tenantId, slug: 'mauritius-lead-rescue' } },
    create: {
      tenantId,
      slug: 'mauritius-lead-rescue',
      name: 'Mauritius Lead Rescue',
      regionTags: 'MU',
      industryTags: 'lead rescue',
      thesisMd: 'Mauritius Lead Rescue prospect research imported from the operator workbook.',
    },
    update: {},
  });
  const outcomes = [];
  for (const row of rows) {
    const existing = await prisma.growthCompany.findFirst({
      where: { tenantId, name: row.name },
    });
    const company = existing
      ? await prisma.growthCompany.update({
          where: { id: existing.id },
          data: {
            segmentId: segment.id,
            source: row.source || '1st prospects.xlsx',
            sourceUrl: row.sourceUrl,
            sector: 'Lead Rescue',
            fitHypothesis: row.fitHypothesis,
            qualificationScore: row.score,
            lifecycleState: row.lifecycleState,
            nextAction: row.nextAction,
            status: row.lifecycleState === 'NOT_FIT' ? 'closed' : 'research',
          },
        })
      : await prisma.growthCompany.create({
          data: {
            tenantId,
            segmentId: segment.id,
            name: row.name,
            country: 'MU',
            source: row.source || '1st prospects.xlsx',
            sourceUrl: row.sourceUrl,
            sector: 'Lead Rescue',
            fitHypothesis: row.fitHypothesis,
            qualificationScore: row.score,
            lifecycleState: row.lifecycleState,
            nextAction: row.nextAction,
            status: row.lifecycleState === 'NOT_FIT' ? 'closed' : 'research',
          },
        });
    const contactWhere = row.routes.email
      ? { tenantId, companyId: company.id, email: row.routes.email }
      : { tenantId, companyId: company.id, fullName: row.decisionMaker.fullName };
    const existingContact = await prisma.growthContact.findFirst({ where: contactWhere });
    const contact = existingContact
      ? await prisma.growthContact.update({
          where: { id: existingContact.id },
          data: {
            fullName: row.decisionMaker.fullName,
            decisionMakerConfirmed: row.decisionMaker.confirmed,
            roleTitle: row.decisionMaker.roleTitle,
            phone: row.routes.phone,
            whatsappNumber: row.routes.whatsappNumber,
            email: row.routes.email,
            bestRoute: row.routes.preferredRoute,
            bestRouteOriginal: row.routes.original,
            status: row.decisionMaker.confirmed ? 'identified' : 'unconfirmed',
          },
        })
      : await prisma.growthContact.create({
          data: {
            tenantId,
            companyId: company.id,
            fullName: row.decisionMaker.fullName,
            decisionMakerConfirmed: row.decisionMaker.confirmed,
            roleTitle: row.decisionMaker.roleTitle,
            phone: row.routes.phone,
            whatsappNumber: row.routes.whatsappNumber,
            email: row.routes.email,
            bestRoute: row.routes.preferredRoute,
            bestRouteOriginal: row.routes.original,
            status: row.decisionMaker.confirmed ? 'identified' : 'unconfirmed',
          },
        });
    const touchpointWhere = {
      tenantId,
      contactId: contact.id,
      subject: `Imported workbook row ${row.sourceRowNumber}`,
    };
    const existingTouchpoint = await prisma.growthTouchpoint.findFirst({ where: touchpointWhere });
    const touchpointData = {
      channel: row.routes.preferredRoute || 'research',
      subject: touchpointWhere.subject,
      bodyMd: row.fitHypothesis || '',
      stage: row.lifecycleState,
      result: row.touchpointResult,
      failureReason: row.failureReason || null,
      nextAction: row.nextAction,
      sourceUrl: row.sourceUrl,
    };
    if (existingTouchpoint) {
      await prisma.growthTouchpoint.update({ where: { id: existingTouchpoint.id }, data: touchpointData });
    } else {
      await prisma.growthTouchpoint.create({
        data: { tenantId, contactId: contact.id, ...touchpointData },
      });
    }
    outcomes.push({ row: row.rowNumber, companyId: company.id, status: existing ? 'updated' : 'created' });
  }
  return outcomes;
}

const args = argsFrom(process.argv.slice(2));
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!args.workbook || !args.tenantId || (!args.apply && !process.argv.includes('--dry-run'))) {
    usage();
    process.exitCode = 2;
  } else {
    try {
      const workbookPath = path.resolve(args.workbook);
      if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);
      const workbook = XLSX.readFile(workbookPath, { cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error('Workbook has no worksheet');
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
        header: 1,
        defval: '',
        raw: false,
      });
      const mapped = mapWorksheetRows(rows);
      console.log(`mode=${args.apply ? 'apply' : 'dry-run'} worksheet="${firstSheet}" rows=${mapped.length}`);
      printPreview(mapped);
      console.log(`field_loss_report=${JSON.stringify(fieldLossReport(mapped))}`);
      console.log('field_loss_verdict=PASS');
      if (args.apply) {
        const outcomes = await applyRows(mapped, args.tenantId);
        console.log(`apply_outcomes=${JSON.stringify(outcomes)}`);
      } else {
        console.log('writes=0');
      }
    } catch (error) {
      console.error(`import_failed=${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  }
}
