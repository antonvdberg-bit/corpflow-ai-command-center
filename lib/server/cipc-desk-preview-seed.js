import { PrismaClient } from '@prisma/client';

import { hashPinForStorage } from '../cmp/_lib/tenant-pin.js';

const CIPCDESK_TENANT_ID = 'cipc-desk';
const PREVIEW_ENV = 'preview';

/**
 * Marker used to confirm the ticket row belongs to this synthetic preview slice.
 * Stored in `cmp_tickets.console_json.client_view.cipc_desk.seed_marker`.
 */
const CIPC_DESK_SEED_MARKER = 'cipc-desk-preview-seed-v1';

const PIN_PLAINTEXT_FOR_PREVIEW = '123456';

function isPreviewEnv() {
  return String(process.env.VERCEL_ENV || '').trim().toLowerCase() === PREVIEW_ENV;
}

function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function normalizeSeedMarker(consoleJson) {
  try {
    const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
    const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
    const cipc = cv.cipc_desk && typeof cv.cipc_desk === 'object' ? cv.cipc_desk : {};
    return typeof cipc.seed_marker === 'string' ? cipc.seed_marker.trim() : '';
  } catch {
    return '';
  }
}

function buildCipcDeskWebsiteDraft() {
  const seedNote =
    'Private preview — fictional example only. All service requirements, documents, turnaround and pricing must be validated by Serah Fourie before any work starts.';

  return {
    meta: {
      page_title: 'CIPC Desk · Private Preview',
      console_heading: 'CIPC Desk · Change Console (preview)',
      guide_title: 'CIPC Desk · How to request a service slice',
    },
    hero: {
      title: 'CIPC Desk',
      headline: 'South African CIPC administration — handled remotely',
      tagline: seedNote,
      cta_label: 'Email your CIPC matter (preview)',
      // Email-first workflow: clients communicate by email; operators control `/change`.
      cta_href: `mailto:swart829@gmail.com?subject=${encodeURIComponent('CIPC Desk · SME enquiry (preview)')}`,
    },
    sections: {
      about: {
        title: 'What this preview is',
        body:
          `${seedNote}\n\n` +
          'How it works (preview):\n' +
          '1) You email a matter request.\n' +
          '2) Serah reviews and confirms the exact scope.\n' +
          '3) You receive a drafted status/update message after guided decisions.\n\n' +
          'This site is not a substitute for professional legal/company-secretarial advice.',
      },
      services: {
        title: 'Services (provisional catalogue)',
        intro: 'A concise first catalogue for the initial slice. Details below are provisional until Serah validates.',
        items: [
          { name: 'Private-company registration (provisional)', detail: 'Request the first-slice plan. Documents and steps require Serah’s professional validation.' },
          { name: 'Director appointments & resignations (provisional)', detail: 'Email your matter summary. Serah confirms the exact filings + required information.' },
          { name: 'Registered-address changes (provisional)', detail: 'We’ll draft next steps and required matter details, subject to Serah validation.' },
          { name: 'Annual returns (provisional)', detail: 'We’ll confirm what to submit and timing. Provisional until Serah validates requirements.' },
          { name: 'Beneficial ownership submissions (provisional)', detail: 'We’ll confirm scope and needed information after your email review.' },
          { name: 'Company amendments & maintenance (provisional)', detail: 'Provisional catalogue item for the initial slice. Serah validates exact scope.' },
          { name: 'Statutory records & document retrieval (provisional)', detail: 'We’ll confirm what you need and draft a request. Provisional until validated.' },
          { name: 'Monthly CIPC administration support (provisional)', detail: 'Ongoing support path for clients who want a managed cadence. Provisional until Serah validates.' },
        ],
      },
      contact: {
        title: 'Contact',
        email: 'swart829@gmail.com',
        phone: null,
        website: null,
      },
    },
  };
}

function buildInitialCipcDeskTicketConsoleJson() {
  // Seed decisions correspond to the existing generic first-slice decision surface.
  // They act as “guided checkpoints” for this preview’s first live slice.
  const clientDecisionsItems = [
    {
      key: 'first_slice_outcome',
      status: 'answered',
      answer: 'First slice outcome: private-company registration (provisional)',
    },
    {
      key: 'first_market_or_country',
      status: 'answered',
      answer: 'South Africa (CIPC)',
    },
    {
      key: 'listings_feed_or_idx_provider_status',
      status: 'waived',
      answer: 'Not applicable for CIPC Desk',
    },
    {
      key: 'human_handoff_owner_and_hours',
      status: 'pending',
      answer: '',
    },
  ];

  const checklistItems = [
    { key: 'scope_confirmed', label: 'Service scope confirmed by Serah (provisional)', status: 'pending' },
    { key: 'required_info_captured', label: 'Required matter info captured (provisional)', status: 'pending' },
    { key: 'documents_and_turnaround', label: 'Documents + turnaround drafted for validation', status: 'pending' },
    { key: 'client_reply_draft_ready', label: 'Client reply draft prepared for guided decisions', status: 'pending' },
  ];

  const clientReplyDraft =
    'Thank you for your email. We are preparing your first-slice plan, but we will only treat the next steps as confirmed after Serah validates the exact scope and supporting information. If you can share any identifiers you already have (e.g., company registration context) we can draft a safer plan and next steps for approval.';

  return {
    locale: 'en',
    seed_source: 'cipc-desk-preview-seed',
    brief: {
      summary: 'CIPC Desk · Private-company registration (preview request)',
      service: 'private-company-registration',
      requested_change: 'Submit and confirm first-slice scope for private-company registration (provisional)',
      acceptance_criteria: [
        'Operator can review scope and draft a validated next step',
        'Client can submit guided decisions via one-time link',
      ],
      missing_information: ['Confirm client matter scope and identifiers (provisional list)'],
    },
    messages: [],
    client_view: {
      cipc_desk: {
        seed_marker: CIPC_DESK_SEED_MARKER,
        checklist: { items: checklistItems },
        client_reply_draft: clientReplyDraft,
        onboarding: {
          owner_name: 'Serah Fourie',
          owner_email: 'swart829@gmail.com',
          client_classification: 'non-paying internal owner venture',
          communication_model: 'email-first (preview)',
          operator_gate: 'Anton van den Berg (approval gate for operational launch)',
          validation_focus:
            'Service accuracy, required information + exclusions, and whether the workflow reflects how Serah would perform the work.',
        },
      },
    },
    client_decisions: {
      // `sufficient_to_proceed` intentionally omitted so build-start is gated on client decisions UI.
      items: clientDecisionsItems,
    },
  };
}

function buildInitialCipcDeskTicketRow() {
  const consoleJson = buildInitialCipcDeskTicketConsoleJson();
  const briefSummary =
    consoleJson?.brief && typeof consoleJson.brief === 'object' && typeof consoleJson.brief.summary === 'string'
      ? String(consoleJson.brief.summary)
      : 'CIPC Desk · preview request';

  return {
    description: 'CIPC Desk · email-first preview workflow (fictional data)',
    title: 'CIPC Desk · Private-company registration (preview)',
    status: 'Approved',
    stage: 'Build',
    locale: 'en',
    brief: briefSummary,
    consoleJson,
  };
}

/**
 * Ensure the CIPC Desk tenant + seed ticket exist on Vercel preview only.
 *
 * @param {{ tenantId?: string, prisma?: PrismaClient }} opts
 */
export async function ensureCipcDeskPreviewTenantSeeded(opts = {}) {
  const tenantId = String(opts.tenantId || CIPCDESK_TENANT_ID).trim();
  if (tenantId !== CIPCDESK_TENANT_ID) return { ok: false, skipped: true, reason: 'TENANT_ID_MISMATCH' };
  if (!isPreviewEnv()) return { ok: false, skipped: true, reason: 'NOT_PREVIEW_ENV' };

  const prisma = opts.prisma instanceof PrismaClient ? opts.prisma : new PrismaClient();
  const createdPrisma = !(opts.prisma instanceof PrismaClient);

  try {
    const pinHash = hashPinForStorage(PIN_PLAINTEXT_FOR_PREVIEW);

    const tenant = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { tenantId: true, slug: true, sovereignPinHash: true },
    });

    const persona = await prisma.tenantPersona.findUnique({
      where: { tenantId },
      select: { tenantId: true, billingExempt: true },
    });

    const existingTicket = await prisma.cmpTicket.findFirst({
      where: { tenantId, status: 'Approved', stage: 'Build' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, consoleJson: true },
    });

    const markerOk = existingTicket ? normalizeSeedMarker(existingTicket.consoleJson) === CIPC_DESK_SEED_MARKER : false;
    const tenantOk = Boolean(tenant?.tenantId);
    const personaOk = Boolean(persona?.tenantId) && persona.billingExempt === true;

    if (tenantOk && personaOk && markerOk) {
      return { ok: true, seeded: false, tenant_id: tenantId, ticket_id: existingTicket?.id || null };
    }

    // Seed tenant row (if missing) + persona + ticket.
    await prisma.$transaction(async (tx) => {
      if (!tenantOk) {
        await tx.tenant.create({
          data: {
            tenantId,
            slug: CIPCDESK_TENANT_ID,
            name: 'CIPC Desk',
            sovereignPinHash: pinHash,
          },
        });
      } else {
        await tx.tenant.update({
          where: { tenantId },
          data: {
            slug: CIPCDESK_TENANT_ID,
            name: 'CIPC Desk',
            sovereignPinHash: pinHash,
          },
        });
      }

      const websiteDraft = buildCipcDeskWebsiteDraft();
      const personaJson = {
        website_draft: websiteDraft,
      };

      if (!personaOk) {
        await tx.tenantPersona.upsert({
          where: { tenantId },
          create: {
            tenantId,
            billingExempt: true,
            tokenCreditBalanceUsd: 0,
            personaJson,
          },
          update: {
            billingExempt: true,
            personaJson,
            tokenCreditBalanceUsd: 0,
          },
        });
      }

      const seededTicket = buildInitialCipcDeskTicketRow();
      if (!markerOk) {
        if (existingTicket?.id) {
          await tx.cmpTicket.update({
            where: { id: existingTicket.id },
            data: {
              tenantId,
              status: seededTicket.status,
              stage: seededTicket.stage,
              title: seededTicket.title,
              description: seededTicket.description,
              locale: seededTicket.locale,
              brief: seededTicket.brief,
              consoleJson: seededTicket.consoleJson,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.cmpTicket.create({
            data: {
              tenantId,
              status: seededTicket.status,
              stage: seededTicket.stage,
              title: seededTicket.title,
              description: seededTicket.description,
              locale: seededTicket.locale,
              brief: seededTicket.brief,
              consoleJson: seededTicket.consoleJson,
            },
          });
        }
      }
    });

    const updatedTicket = await prisma.cmpTicket.findFirst({
      where: { tenantId, status: 'Approved', stage: 'Build' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, consoleJson: true },
    });

    return {
      ok: true,
      seeded: true,
      tenant_id: tenantId,
      ticket_id: updatedTicket?.id || null,
    };
  } finally {
    if (createdPrisma) {
      await prisma.$disconnect().catch(() => {});
    }
  }
}

