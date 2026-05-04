#!/usr/bin/env node
/**
 * Record LuxeMaurice Phase 1 approval + initiate Phase 2 (discovery) on the authoritative CMP ticket.
 * Writes `console_json.lux_programme` (operator-safe programme state) and appends description notes.
 *
 * Guard: ticket `tenant_id` must be `luxe-maurice` only.
 *
 * Usage:
 *   node scripts/lux-ticket-phase2-initiate.mjs --ticket=cmo8mjijk0000jl04l1jz0v6d [--listing-approach=staged_curated|real_idx_feed|hybrid] --execute
 *
 * If `--listing-approach` is omitted, reads `lux_phase2_listing_approach` from `console_json.client_decisions.items`
 * when present; otherwise defaults to `staged_curated`.
 *
 * Env: POSTGRES_URL
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LUX_TENANT_ID = 'luxe-maurice';
const DEFAULT_APPROACH = 'staged_curated';

function argValue(prefix) {
  const a = process.argv.find((s) => String(s).startsWith(prefix));
  if (!a) return '';
  const i = a.indexOf('=');
  if (i < 0) return '';
  return String(a.slice(i + 1)).trim();
}

const ticketId = argValue('--ticket') || '';
const execute = process.argv.includes('--execute');
const approachArg = (argValue('--listing-approach') || '').trim().toLowerCase();

const MARKER = '<!-- lux-phase2-initiated:2026-05-04 -->';

const ALLOW_APPROACH = new Set(['staged_curated', 'real_idx_feed', 'hybrid']);

function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function normalizeConsoleJson(v) {
  if (!v) return { messages: [], brief: {}, locale: 'en' };
  if (typeof v === 'string') {
    try {
      return normalizeConsoleJson(JSON.parse(v));
    } catch {
      return { messages: [], brief: {}, locale: 'en' };
    }
  }
  if (typeof v === 'object' && v !== null) {
    const messages = Array.isArray(v.messages) ? v.messages.slice(0, 200) : [];
    const brief = v.brief && typeof v.brief === 'object' ? v.brief : {};
    const locale = typeof v.locale === 'string' ? v.locale : 'en';
    return { ...v, messages, brief, locale };
  }
  return { messages: [], brief: {}, locale: 'en' };
}

function listingApproachFromClientDecisions(consoleJson) {
  const cd = consoleJson.client_decisions && typeof consoleJson.client_decisions === 'object' ? consoleJson.client_decisions : {};
  const items = Array.isArray(cd.items) ? cd.items : [];
  for (const it of items) {
    const o = asObj(it);
    if (o.key !== 'lux_phase2_listing_approach') continue;
    const ans = typeof o.answer === 'string' ? o.answer.trim().toLowerCase() : '';
    if (ALLOW_APPROACH.has(ans)) return ans;
  }
  return '';
}

if (!ticketId) {
  console.error(
    'Usage: node scripts/lux-ticket-phase2-initiate.mjs --ticket=cmo8mjijk0000jl04l1jz0v6d [--listing-approach=staged_curated|real_idx_feed|hybrid] --execute',
  );
  process.exit(1);
}

const pg = String(process.env.POSTGRES_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL is required.');
  process.exit(1);
}

const nowIso = new Date().toISOString();

const DESCRIPTION_BLOCK = [
  '',
  '---',
  '',
  MARKER,
  '',
  '## Client approval — Phase 1',
  '',
  '**Client approved Phase 1 direction.**',
  '',
  '## Programme phase status',
  '',
  '- **Phase 1:** complete / approved',
  '- **Phase 2:** active (discovery)',
  '',
  '**Note:** Phase 2 initiated — property discovery / IDX planning.',
  '',
].join('\n');

async function main() {
  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, tenantId: true, description: true, consoleJson: true, locale: true, brief: true },
  });
  if (!row) {
    console.error('Ticket not found:', ticketId);
    process.exit(1);
  }
  const tid = String(row.tenantId || '').trim();
  if (tid !== LUX_TENANT_ID) {
    console.error('Refusing: ticket tenant_id must be', LUX_TENANT_ID, 'got:', tid || '(empty)');
    process.exit(1);
  }

  const prevDesc = row.description != null ? String(row.description) : '';
  if (prevDesc.includes(MARKER)) {
    console.log('Already initiated (marker found). No console_json merge; description unchanged.');
    return;
  }

  const norm = normalizeConsoleJson(row.consoleJson);
  let listingApproach = approachArg;
  if (listingApproach && !ALLOW_APPROACH.has(listingApproach)) {
    console.error('Invalid --listing-approach. Use:', [...ALLOW_APPROACH].join(', '));
    process.exit(1);
  }
  if (!listingApproach) {
    listingApproach = listingApproachFromClientDecisions(norm) || DEFAULT_APPROACH;
  }

  const lux_programme = {
    version: 1,
    updated_at: nowIso,
    phase_1: {
      status: 'complete_approved',
      client_approval_recorded_at: nowIso,
      client_approval_note: 'Client approved Phase 1 direction.',
    },
    phase_2: {
      status: 'active_discovery',
      initiated_at: nowIso,
      note: 'Phase 2 initiated — property discovery / IDX planning.',
      first_slice: {
        listing_approach: listingApproach,
        property_discovery: [
          'Listing cards on https://lux.corpflowai.com',
          'Basic filtering or grouping (minimal); not full IDX in this slice',
        ],
        lead_flow: {
          path: 'Each property → enquiry CTA → /concierge',
          preserve_context: 'Property name / stable listing id in lead payload (minimal API extension when implemented)',
        },
        acceptance_criteria_ref: 'docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md',
      },
    },
    operator_next_action:
      'Define listing source (staged vs IDX vs hybrid) and implement first property discovery slice.',
  };

  const nextConsole = { ...norm, lux_programme };
  const nextDesc = prevDesc + DESCRIPTION_BLOCK;

  console.log('Resolved listing_approach:', listingApproach);
  console.log(JSON.stringify(lux_programme, null, 2));
  if (!execute) {
    console.log('\nDry-run. Pass --execute to write Postgres.');
    return;
  }

  await prisma.cmpTicket.update({
    where: { id: ticketId },
    data: {
      consoleJson: nextConsole,
      description: nextDesc,
      locale: typeof nextConsole.locale === 'string' ? nextConsole.locale : row.locale || 'en',
      brief:
        nextConsole.brief && typeof nextConsole.brief === 'object' && nextConsole.brief.summary != null
          ? String(nextConsole.brief.summary)
          : row.brief != null
            ? String(row.brief)
            : undefined,
    },
  });
  console.log('Updated ticket', ticketId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
