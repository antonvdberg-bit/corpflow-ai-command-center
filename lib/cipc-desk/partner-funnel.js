/**
 * CIPC Desk — conversion-focused commercial partner funnel (#986).
 *
 * Buyer-facing copy for accounting / advisory firms. Specialist-review
 * pages (`/annual-returns`, `/beneficial-ownership`) stay unchanged.
 *
 * No fee table. No public-launch claim. Experience-line exact wording is
 * flagged for confirmation before any public use.
 */

import {
  CIPCDESK_TENANT_ID,
  resolveCipcDeskTenantIdFromHost,
} from '../server/cipc-desk-runtime.js';

export const CIPC_DESK_PARTNER_FUNNEL_VERSION = 'cipc-desk-partner-funnel-v1-986';

export const CIPC_DESK_PARTNER_ENQUIRY_SUBJECT = 'Partner overflow / white-label enquiry';

export const CIPC_DESK_PARTNER_EXPERIENCE_LINE =
  'More than 15 years of company-secretarial and governance operations, including work inside a publicly listed South African company.';

export const CIPC_DESK_PARTNER_SERVICE_OPTIONS = Object.freeze([
  {
    key: 'cipc_administration',
    label: 'CIPC administration',
  },
  {
    key: 'statutory_records',
    label: 'Statutory records',
  },
  {
    key: 'beneficial_ownership',
    label: 'Beneficial ownership',
  },
  {
    key: 'director_shareholder_changes',
    label: 'Director / shareholder changes',
  },
  {
    key: 'resolutions_minutes',
    label: 'Resolutions and minutes',
  },
  {
    key: 'governance_calendars',
    label: 'Governance / compliance calendars',
  },
]);

export const CIPC_DESK_PARTNER_RESPONSE_CHANNELS = Object.freeze([
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'either', label: 'Either email or phone' },
]);

/**
 * Structured commercial content for /partners.
 * Buyer-visible strings must stay free of GitHub, issue numbers, review jargon,
 * and corpflow_test language.
 *
 * @returns {Record<string, unknown>}
 */
export function buildCipcDeskPartnerFunnelContent() {
  return {
    content_version: CIPC_DESK_PARTNER_FUNNEL_VERSION,
    meta: {
      page_title: 'Overflow and white-label company-secretarial support for accounting firms',
      description:
        'Fractional and white-label company-secretarial capacity for South African accounting, tax and advisory firms. Discuss overflow support without hiring permanent specialist headcount.',
      robots: 'noindex,nofollow',
    },
    nav: {
      brand: 'Company-secretarial operations',
      location: 'South Africa · remote delivery',
    },
    hero: {
      eyebrow: 'For accounting, tax and advisory firms',
      headline: 'Experienced company-secretarial capacity behind your accounting practice.',
      subhead:
        'White-label / fractional support for CIPC administration, statutory records, beneficial ownership, director/shareholder changes, resolutions and governance administration.',
      primary_cta: {
        label: 'Discuss overflow / white-label support',
        href: '#partner-enquiry',
      },
      secondary_cta: {
        label: 'See services we can handle',
        href: '#partner-services',
      },
    },
    audience: {
      title: 'Built for firms that already have the clients',
      body:
        'This page is for owners and partners of South African accounting, tax and advisory firms whose clients already need company-secretarial administration — and who do not want a permanent specialist on the payroll.',
      not_for:
        'If you need help with your own company’s filing, use the direct company-administration path instead of this partner path.',
      not_for_href: '/company',
      not_for_cta: 'Request company-secretarial help',
    },
    problem: {
      title: 'The work is already in your practice',
      body:
        'Clients still need statutory administration. Senior staff should not absorb it. Permanent headcount is slow and expensive. White-label capacity lets you keep the client relationship while the specialist work is handled behind your firm.',
    },
    offer: {
      title: 'What you get',
      body:
        'Experienced fractional company-secretarial operations sitting behind your practice — overflow when the workload spikes, or a quiet white-label extension of your service catalogue.',
    },
    proof: {
      title: 'Why firms use specialist capacity',
      experience_line: CIPC_DESK_PARTNER_EXPERIENCE_LINE,
      confirmation_status: 'pending_exact_public_wording',
      items: [
        {
          name: 'Listed-company operations experience',
          detail: CIPC_DESK_PARTNER_EXPERIENCE_LINE,
        },
        {
          name: 'Hands-on statutory administration',
          detail:
            'CIPC administration, registers, beneficial ownership, director and shareholder changes, resolutions, minutes, and compliance calendars.',
        },
        {
          name: 'White-label by default',
          detail:
            'Your clients stay your clients. Delivery can sit behind your firm’s name unless you ask for a named specialist introduction.',
        },
      ],
    },
    services: {
      title: 'Services we can handle',
      intro:
        'A concise matrix for partner overflow. Scope is confirmed before work starts. This is not a price list.',
      items: [
        {
          name: 'CIPC administration',
          detail: 'Routine company administration and filing support referred by your firm.',
        },
        {
          name: 'Statutory records',
          detail: 'Registers, record packs, and document retrieval once authority and identifiers are confirmed.',
        },
        {
          name: 'Beneficial ownership',
          detail: 'Common-path beneficial-ownership administration. Complex structures are scoped separately.',
        },
        {
          name: 'Director / shareholder changes',
          detail: 'Appointments, resignations, and related company-record updates.',
        },
        {
          name: 'Resolutions and minutes',
          detail: 'Governance administration for ordinary resolutions, minutes, and supporting packs.',
        },
        {
          name: 'Governance / compliance calendars',
          detail: 'Reminders and filing cadence so statutory dates do not sit only on a partner’s desk.',
        },
      ],
    },
    how_it_works: {
      title: 'How it works',
      steps: [
        {
          name: 'Refer the client or the work',
          detail: 'Send the matter, or introduce the client under your firm’s instruction.',
        },
        {
          name: 'Scoped intake',
          detail: 'We confirm what is in, what is out, and what information is still needed.',
        },
        {
          name: 'Execution',
          detail: 'Specialist administration proceeds only after scope is agreed.',
        },
        {
          name: 'Status and evidence',
          detail: 'You receive a clear status trail and supporting evidence for your file.',
        },
        {
          name: 'White-label or client handoff',
          detail: 'Return the completed work to your firm, or to the client in your chosen presentation.',
        },
      ],
    },
    trust: {
      title: 'Boundaries you can show a partner',
      items: [
        'Independent support — not CIPC, not a government channel, and not a law firm.',
        'No CIPC affiliation or endorsement is implied.',
        'Filing outcomes, turnaround, and CIPC processing times are not guaranteed.',
        'Remote delivery across South Africa. No requirement for the client to visit an office.',
        'Partner pricing is discussed after a short scoping conversation. No fee table is published here.',
      ],
    },
    faqs: {
      title: 'Questions firms usually ask first',
      items: [
        {
          q: 'Will our clients know you are involved?',
          a: 'Not by default. Delivery is white-label unless you ask for a named introduction.',
        },
        {
          q: 'Are you replacing our secretarial team?',
          a: 'No. This is overflow and fractional capacity behind your practice, not a bid to take the client relationship.',
        },
        {
          q: 'Is this a commodity CIPC filing shop?',
          a: 'No. The offer is experienced company-secretarial capacity. Filings are supporting proof of the work, not the headline.',
        },
        {
          q: 'What happens after we enquire?',
          a: 'We reply on your preferred channel, usually within one business day, to confirm fit and the next scoping step. An enquiry is not a filing instruction.',
        },
      ],
    },
    form: {
      title: 'Discuss overflow / white-label support',
      intro:
        'Tell us about the firm and the immediate need. We reply on your preferred channel, usually within one business day. This does not start filing work.',
      confirmation:
        'Thank you. We will reply using the contact details you provided, usually within one business day, on your preferred channel. This enquiry is not a filing instruction and does not start CIPC work until scope is agreed.',
      submit_label: 'Send partner enquiry',
      fields: {
        firm: 'Firm name',
        contact_name: 'Your name',
        email: 'Work email',
        phone: 'Phone (optional)',
        need: 'Approximate client portfolio or immediate need',
        services: 'Services of interest',
        preferred_channel: 'Preferred response channel',
      },
    },
    footer: {
      independence:
        'Independent company-secretarial support. Not CIPC, not a government channel, and not a law firm. Filing outcomes are not guaranteed.',
      sme_link_label: 'Looking for help with your own company?',
    },
  };
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isPlausiblePartnerEmail(email) {
  const v = str(email);
  if (v.length < 5 || v.length > 200) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Build email_text for existing POST /api/cipc-desk/email-intake.
 * First line must stay CIPC_DESK_PARTNER_ENQUIRY_SUBJECT so intake inference
 * classifies the ticket as partner overflow (not a direct SME filing).
 *
 * @param {{
 *   firm?: string,
 *   contact_name?: string,
 *   email?: string,
 *   phone?: string,
 *   need?: string,
 *   services?: string[] | string,
 *   preferred_channel?: string,
 * }} fields
 * @returns {{ ok: true, email_text: string } | { ok: false, error: string }}
 */
export function buildPartnerFunnelEnquiryEmail(fields = {}) {
  const firm = str(fields.firm);
  const contactName = str(fields.contact_name);
  const email = str(fields.email);
  const phone = str(fields.phone);
  const need = str(fields.need);
  const channel = str(fields.preferred_channel);
  const allowedChannels = new Set(CIPC_DESK_PARTNER_RESPONSE_CHANNELS.map((x) => x.value));
  const rawServices = Array.isArray(fields.services)
    ? fields.services
    : str(fields.services)
      ? [fields.services]
      : [];
  const allowedServiceKeys = new Set(CIPC_DESK_PARTNER_SERVICE_OPTIONS.map((x) => x.key));
  const services = rawServices.map((x) => str(x)).filter((x) => allowedServiceKeys.has(x));

  if (!firm) return { ok: false, error: 'Firm name is required' };
  if (!contactName) return { ok: false, error: 'Your name is required' };
  if (!isPlausiblePartnerEmail(email)) return { ok: false, error: 'A valid work email is required' };
  if (!need) return { ok: false, error: 'Tell us the approximate portfolio or immediate need' };
  if (!services.length) return { ok: false, error: 'Select at least one service of interest' };
  if (!allowedChannels.has(channel)) {
    return { ok: false, error: 'Choose a preferred response channel' };
  }

  const serviceLabels = services.map((key) => {
    const found = CIPC_DESK_PARTNER_SERVICE_OPTIONS.find((x) => x.key === key);
    return found ? found.label : key;
  });

  const channelLabel =
    CIPC_DESK_PARTNER_RESPONSE_CHANNELS.find((x) => x.value === channel)?.label || channel;

  const lines = [
    CIPC_DESK_PARTNER_ENQUIRY_SUBJECT,
    '',
    'Accounting / advisory firm partner enquiry for fractional / white-label overflow support.',
    'Professional partner path. Not a direct SME filing instruction. No personal identification files attached.',
    '',
    `Firm: ${firm}`,
    `Contact: ${contactName}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    `Preferred response channel: ${channelLabel} (${channel})`,
    `Services of interest: ${serviceLabels.join('; ')}`,
    '',
    'Approximate client portfolio or immediate need:',
    need,
  ];

  return { ok: true, email_text: lines.join('\n').trim() };
}

/**
 * Resolve whether the request host may render the partner funnel.
 * Fail closed unless tenant is cipc-desk (standing host, DB map, or verified preview).
 *
 * @param {{
 *   host?: string | null,
 *   tenantIdFromDb?: string | null,
 *   previewTenantId?: string | null,
 * }} args
 * @returns {{ allowed: boolean, tenantId: string, reason: string }}
 */
export function resolveCipcDeskPartnerFunnelPageAccess(args = {}) {
  const fromStanding = resolveCipcDeskTenantIdFromHost(args.host);
  const fromDb = str(args.tenantIdFromDb);
  const fromPreview = str(args.previewTenantId);
  const tenantId = fromDb || fromStanding || fromPreview || '';

  if (!tenantId) {
    return { allowed: false, tenantId: '', reason: 'TENANT_UNRESOLVED' };
  }
  if (tenantId !== CIPCDESK_TENANT_ID) {
    return { allowed: false, tenantId, reason: 'TENANT_SCOPE_MISMATCH' };
  }
  return {
    allowed: true,
    tenantId,
    reason: fromDb ? 'db_host_map' : fromStanding ? 'standing_test_host' : 'preview_token',
  };
}
