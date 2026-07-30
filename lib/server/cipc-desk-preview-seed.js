import { PrismaClient } from '@prisma/client';

import { hashPinForStorage } from '../cmp/_lib/tenant-pin.js';
import { CIPCDESK_TENANT_ID, isCipcDeskWorkflowAllowed } from './cipc-desk-runtime.js';
import {
  CIPC_DESK_WEBSITE_DRAFT_VERSION,
  buildCipcDeskWebsiteDraft,
} from './cipc-desk-website-draft.js';

export { CIPC_DESK_WEBSITE_DRAFT_VERSION, buildCipcDeskWebsiteDraft };

/**
 * Marker used to confirm the ticket row belongs to this synthetic CIPC Desk slice.
 * Stored in `cmp_tickets.console_json.client_view.cipc_desk.seed_marker`.
 */
const CIPC_DESK_SEED_MARKER = 'cipc-desk-preview-seed-v1';

/** Fictional standing-test PIN (not a production credential). */
const PIN_PLAINTEXT_FOR_PREVIEW = '123456';

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

function readWebsiteDraftVersion(personaJson) {
  try {
    const pj = asObj(personaJson);
    const draft = asObj(pj.website_draft);
    return typeof draft.content_version === 'string' ? draft.content_version.trim() : '';
  } catch {
    return '';
  }
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
 * Ensure the CIPC Desk tenant + seed ticket exist for the standing test tenant
 * (Production spine hosts) or legacy Preview env.
 * Also refreshes website_draft when content_version is stale (no schema change).
 *
 * @param {{ tenantId?: string, host?: string | null, prisma?: PrismaClient }} opts
 */
export async function ensureCipcDeskPreviewTenantSeeded(opts = {}) {
  const tenantId = String(opts.tenantId || CIPCDESK_TENANT_ID).trim();
  if (tenantId !== CIPCDESK_TENANT_ID) return { ok: false, skipped: true, reason: 'TENANT_ID_MISMATCH' };
  if (
    !isCipcDeskWorkflowAllowed({
      tenantId,
      host: opts.host,
      vercelEnv: process.env.VERCEL_ENV,
    })
  ) {
    return { ok: false, skipped: true, reason: 'CIPC_DESK_STANDING_OR_PREVIEW_REQUIRED' };
  }

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
      select: { tenantId: true, billingExempt: true, personaJson: true },
    });

    const existingTicket = await prisma.cmpTicket.findFirst({
      where: { tenantId, status: 'Approved', stage: 'Build' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, consoleJson: true },
    });

    const markerOk = existingTicket ? normalizeSeedMarker(existingTicket.consoleJson) === CIPC_DESK_SEED_MARKER : false;
    const tenantOk = Boolean(tenant?.tenantId);
    const personaOk = Boolean(persona?.tenantId) && persona.billingExempt === true;
    const draftVersion = readWebsiteDraftVersion(persona?.personaJson);
    const draftOk = draftVersion === CIPC_DESK_WEBSITE_DRAFT_VERSION;

    if (tenantOk && personaOk && markerOk && draftOk) {
      return { ok: true, seeded: false, tenant_id: tenantId, ticket_id: existingTicket?.id || null };
    }

    const websiteDraft = buildCipcDeskWebsiteDraft();

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

      const prevPj = asObj(persona?.personaJson);
      const personaJson = {
        ...prevPj,
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
      } else if (!draftOk) {
        // Refresh visible presentation / catalogue without recreating the persona row.
        await tx.tenantPersona.update({
          where: { tenantId },
          data: { personaJson },
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
      website_draft_refreshed: !draftOk,
      tenant_id: tenantId,
      ticket_id: updatedTicket?.id || null,
    };
  } finally {
    if (createdPrisma) {
      await prisma.$disconnect().catch(() => {});
    }
  }
}
