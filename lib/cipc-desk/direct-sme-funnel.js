/**
 * CIPC Desk — direct-SME buyer funnel (#1152).
 *
 * Buyer-facing copy for company owners / directors. Specialist-review
 * pages (`/annual-returns`, `/director-changes`, `/beneficial-ownership`)
 * stay internal and are not the buyer landing.
 *
 * No fee table. No public-launch claim. No guaranteed CIPC outcome.
 */

import {
  CIPCDESK_TENANT_ID,
  resolveCipcDeskTenantIdFromHost,
} from '../server/cipc-desk-runtime.js';

export const CIPC_DESK_DIRECT_SME_FUNNEL_VERSION = 'cipc-desk-direct-sme-funnel-v1-1152';

export const CIPC_DESK_DIRECT_SME_ENQUIRY_SUBJECT = 'Direct SME company-secretarial enquiry';

export const CIPC_DESK_DIRECT_SME_PROOF_REFERENCE = 'CD-PROOF01';

export const CIPC_DESK_DIRECT_SME_SERVICE_OPTIONS = Object.freeze([
  { key: 'annual_returns', label: 'Annual returns' },
  { key: 'beneficial_ownership', label: 'Beneficial ownership' },
  { key: 'director_changes', label: 'Director changes' },
  { key: 'company_amendments', label: 'Company amendments' },
  { key: 'registered_address', label: 'Registered-address change' },
  { key: 'company_registration', label: 'Private-company registration' },
  { key: 'statutory_records', label: 'Statutory records / document retrieval' },
]);

export const CIPC_DESK_DIRECT_SME_RESPONSE_CHANNELS = Object.freeze([
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'either', label: 'Either email or phone' },
]);

/**
 * Synthetic fixture for local / acceptance proof only.
 * Must never contain real client data, identity numbers, or live recipient details.
 */
export const CIPC_DESK_DIRECT_SME_PROOF_FIXTURE = Object.freeze({
  company: 'Example Trading Pty Ltd',
  contact_name: 'Synthetic Buyer',
  email: 'sme-buyer@example.co.za',
  phone: '',
  need: 'Need help lodging this year’s annual return for a private company.',
  services: Object.freeze(['annual_returns']),
  preferred_channel: 'email',
});

/**
 * Structured commercial content for /company.
 * Buyer-visible strings must stay free of GitHub, issue numbers, review jargon,
 * corpflow_test language, and unapproved fees.
 *
 * @returns {Record<string, unknown>}
 */
export function buildCipcDeskDirectSmeFunnelContent() {
  return {
    content_version: CIPC_DESK_DIRECT_SME_FUNNEL_VERSION,
    meta: {
      page_title: 'Company-secretarial help for your CIPC filings',
      description:
        'Independent company-secretarial support for South African business owners. Choose a standard CIPC request and send a short enquiry. Scope is confirmed before any filing is prepared.',
      robots: 'noindex,nofollow',
    },
    nav: {
      brand: 'Company-secretarial help',
      location: 'South Africa · for your company',
    },
    hero: {
      eyebrow: 'For South African business owners and directors',
      headline: 'Company-secretarial help for your CIPC filings.',
      subhead:
        'Choose the standard request you need. We confirm scope before any filing is prepared. Independent support — not CIPC, and not a guaranteed outcome.',
      primary_cta: {
        label: 'Request company-secretarial help',
        href: '#sme-enquiry',
      },
      secondary_cta: {
        label: 'See standard services',
        href: '#sme-services',
      },
    },
    audience: {
      title: 'Built for the company that needs the filing done',
      body:
        'This page is for owners and directors who need company-secretarial help for their own South African company — annual returns, beneficial ownership, director or company amendments, and similar standard CIPC administration.',
      not_for:
        'If you are an accounting, tax or advisory firm looking for overflow or white-label capacity behind your practice, use the partner path instead.',
      not_for_href: '/partners',
      not_for_cta: 'Discuss overflow / white-label support',
    },
    problem: {
      title: 'CIPC administration is easy to postpone and hard to unpick later',
      body:
        'Annual returns, beneficial-ownership updates, and director changes still have to be done. Most owners do not want a specialist workspace, a price list, or a government-looking portal. They want a clear request and a human next step.',
    },
    offer: {
      title: 'What you get',
      body:
        'A standard-request path: choose the help you need, send the facts you already have, and wait for an operator to confirm scope. Filing work does not start from this form.',
    },
    proof: {
      title: 'How the path stays safe',
      items: [
        {
          name: 'One request, one next step',
          detail:
            'You pick a standard service and send a short enquiry. An operator reviews it before anything is prepared for CIPC.',
        },
        {
          name: 'Scope before filing',
          detail:
            'Required identifiers and documents are confirmed after the enquiry. This page does not lodge a filing.',
        },
        {
          name: 'Human-approved replies',
          detail:
            'Any email, WhatsApp or SMS reply stays behind operator approval. An enquiry is not a send and not a CIPC outcome.',
        },
      ],
    },
    services: {
      title: 'Standard services we can help administer',
      intro:
        'A concise catalogue for direct company requests. Exact documents, exclusions, and fees are confirmed after review. This is not a price list.',
      items: [
        {
          key: 'annual_returns',
          name: 'Annual returns',
          detail:
            'Help preparing the annual-return request for a private company or close corporation. Official CIPC fees stay separate. Turnover-band judgement is confirmed after review.',
        },
        {
          key: 'beneficial_ownership',
          name: 'Beneficial ownership',
          detail:
            'Common-path beneficial-ownership administration for natural-person owners and controllers. Trusts, juristic owners, foreign ownership, and layered control are scoped separately.',
        },
        {
          key: 'director_changes',
          name: 'Director changes',
          detail:
            'Appointment, resignation, and director particulars. Death, removal, or a change that would leave zero directors is a specialist exception.',
        },
        {
          key: 'company_amendments',
          name: 'Company amendments',
          detail:
            'Name, registered details, and other ordinary company-record amendments once identifiers and authority are confirmed.',
        },
        {
          key: 'registered_address',
          name: 'Registered-address change',
          detail: 'Draft the change and the proofs of address still needed, subject to review.',
        },
        {
          key: 'company_registration',
          name: 'Private-company registration',
          detail:
            'First-slice help for a new private company. Name reservation and supporting packs are confirmed after the enquiry.',
        },
        {
          key: 'statutory_records',
          name: 'Statutory records / document retrieval',
          detail: 'Retrieve or prepare company documents once identifiers and authority are confirmed.',
        },
      ],
    },
    limitations: {
      title: 'What this standard path does not do',
      intro: 'These stay out of the self-serve request. An operator will say so rather than guess.',
      items: [
        'Legal opinions, MOI interpretation, court orders, or contested disputes.',
        'Restorations, deregistrations, liquidations, or share restructures.',
        'Complex beneficial ownership (trusts, juristic persons, foreign or layered control).',
        'Director death or removal, or any change that would leave the company with zero directors.',
        'Publishing a fee, promising a CIPC turnaround, or guaranteeing a filing outcome.',
      ],
    },
    how_it_works: {
      title: 'How it works',
      steps: [
        {
          name: 'Choose the standard request',
          detail: 'Pick the service that matches the change you need for your company.',
        },
        {
          name: 'Send the facts you already have',
          detail: 'Company name, a reachable email, and a short description of the outcome you want.',
        },
        {
          name: 'Operator confirms scope',
          detail: 'We reply to confirm what is in, what is out, and what is still needed. Nothing is filed from the form.',
        },
        {
          name: 'Work starts only after that confirmation',
          detail: 'Filing preparation, payment, and any CIPC submission stay later, gated steps.',
        },
      ],
    },
    trust: {
      title: 'Boundaries you can rely on',
      items: [
        'Independent support — not CIPC, not a government channel, and not a law firm.',
        'No CIPC affiliation or endorsement is implied.',
        'Filing outcomes, turnaround, and CIPC processing times are not guaranteed.',
        'No public price list. Fees, if any, are discussed after scope is confirmed.',
        'This is not the internal specialist-review workspace. Complex matters are referred, not self-served here.',
      ],
    },
    faqs: {
      title: 'Questions owners usually ask first',
      items: [
        {
          q: 'Will this file anything with CIPC?',
          a: 'No. The form is an enquiry. Filing is prepared only after scope is confirmed, and submission stays a later approved step.',
        },
        {
          q: 'Do you publish prices here?',
          a: 'No. This page does not list fees. Official CIPC charges are separate from any service fee and are confirmed after review.',
        },
        {
          q: 'What if my matter is unusual?',
          a: 'Say so in the enquiry. Unusual ownership, legal questions, restorations, and director-removal cases are held for specialist review instead of a standard path.',
        },
        {
          q: 'I am an accountant referring client work. Is this the right page?',
          a: 'No. Use the partner overflow / white-label page so the request is treated as work behind your practice, not as a direct company filing.',
        },
        {
          q: 'What happens after I enquire?',
          a: 'An operator reviews the request and replies on your preferred channel. Nothing is sent, filed, or charged until that human review. An enquiry is not a filing instruction.',
        },
      ],
    },
    form: {
      title: 'Request company-secretarial help',
      intro:
        'Tell us the company and the standard request. An operator reviews the enquiry before any filing is prepared. This does not start CIPC work.',
      confirmation:
        'Thank you. An operator will review this enquiry and reply using the contact details you provided. This is not a CIPC filing, not a payment, and not a guaranteed outcome. No email, WhatsApp, or SMS has been sent until an operator approves the next reply.',
      proof_confirmation:
        'Proof confirmation only. This enquiry was not recorded and no email, WhatsApp, SMS, payment, or CIPC filing occurred.',
      submit_label: 'Send company enquiry',
      proof_submit_label: 'Confirm proof enquiry',
      load_fixture_label: 'Use proof fixture',
      fields: {
        company: 'Company name',
        contact_name: 'Your name',
        email: 'Email',
        phone: 'Phone (optional)',
        need: 'What you need help with',
        services: 'Standard service',
        preferred_channel: 'Preferred response channel',
      },
    },
    footer: {
      independence:
        'Independent company-secretarial support. Not CIPC, not a government channel, and not a law firm. Filing outcomes are not guaranteed.',
      partner_link_label: 'Accounting firm looking for overflow capacity?',
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
 * @param {unknown} query
 * @returns {boolean}
 */
export function isCipcDeskDirectSmeProofQuery(query) {
  if (query === true || query === 1) return true;
  const raw = str(query).toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'proof';
}

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isPlausibleDirectSmeEmail(email) {
  const v = str(email);
  if (v.length < 5 || v.length > 200) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Build email_text for existing POST /api/cipc-desk/email-intake.
 * First line must stay CIPC_DESK_DIRECT_SME_ENQUIRY_SUBJECT so intake
 * classifies the ticket as a direct SME request (not partner overflow).
 *
 * @param {{
 *   company?: string,
 *   contact_name?: string,
 *   email?: string,
 *   phone?: string,
 *   need?: string,
 *   services?: string[] | string,
 *   preferred_channel?: string,
 * }} fields
 * @returns {{ ok: true, email_text: string } | { ok: false, error: string }}
 */
export function buildDirectSmeEnquiryEmail(fields = {}) {
  const company = str(fields.company);
  const contactName = str(fields.contact_name);
  const email = str(fields.email);
  const phone = str(fields.phone);
  const need = str(fields.need);
  const channel = str(fields.preferred_channel);
  const allowedChannels = new Set(CIPC_DESK_DIRECT_SME_RESPONSE_CHANNELS.map((x) => x.value));
  const rawServices = Array.isArray(fields.services)
    ? fields.services
    : str(fields.services)
      ? [fields.services]
      : [];
  const allowedServiceKeys = new Set(CIPC_DESK_DIRECT_SME_SERVICE_OPTIONS.map((x) => x.key));
  const services = rawServices.map((x) => str(x)).filter((x) => allowedServiceKeys.has(x));

  if (!company) return { ok: false, error: 'Company name is required' };
  if (!contactName) return { ok: false, error: 'Your name is required' };
  if (!isPlausibleDirectSmeEmail(email)) return { ok: false, error: 'A valid email is required' };
  if (!need) return { ok: false, error: 'Tell us what you need help with' };
  if (!services.length) return { ok: false, error: 'Select at least one standard service' };
  if (!allowedChannels.has(channel)) {
    return { ok: false, error: 'Choose a preferred response channel' };
  }

  const serviceLabels = services.map((key) => {
    const found = CIPC_DESK_DIRECT_SME_SERVICE_OPTIONS.find((x) => x.key === key);
    return found ? found.label : key;
  });

  const channelLabel =
    CIPC_DESK_DIRECT_SME_RESPONSE_CHANNELS.find((x) => x.value === channel)?.label || channel;

  const lines = [
    CIPC_DESK_DIRECT_SME_ENQUIRY_SUBJECT,
    '',
    'Direct SME company-secretarial enquiry for the company named below.',
    'Direct company path. Not an accounting-practice partner request.',
    '',
    `Company: ${company}`,
    `Contact: ${contactName}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    `Preferred response channel: ${channelLabel} (${channel})`,
    `Services of interest: ${serviceLabels.join('; ')}`,
    '',
    'What you need:',
    need,
  ];

  return { ok: true, email_text: lines.join('\n').trim() };
}

/**
 * Local confirmation for acceptance / proof mode. Never records, sends, or files.
 *
 * @param {{ ok?: boolean, email_text?: string } | Record<string, unknown>} built
 * @returns {{
 *   ok: true,
 *   recorded: false,
 *   sent: false,
 *   filed: false,
 *   payment: false,
 *   reference: string,
 *   source: 'direct_sme_web',
 *   client_path: '/company',
 * }}
 */
export function buildDirectSmeProofConfirmation(built = {}) {
  const row = built && typeof built === 'object' ? built : {};
  if (row.ok === false) {
    return {
      ok: false,
      recorded: false,
      sent: false,
      filed: false,
      payment: false,
      reference: '',
      source: 'direct_sme_web',
      client_path: '/company',
      error: str(row.error) || 'Proof enquiry is not valid',
    };
  }
  return {
    ok: true,
    recorded: false,
    sent: false,
    filed: false,
    payment: false,
    reference: CIPC_DESK_DIRECT_SME_PROOF_REFERENCE,
    source: 'direct_sme_web',
    client_path: '/company',
  };
}

/**
 * Resolve whether the request host may render the direct-SME funnel.
 * Fail closed unless tenant is cipc-desk (standing host, DB map, or verified preview).
 *
 * @param {{
 *   host?: string | null,
 *   tenantIdFromDb?: string | null,
 *   previewTenantId?: string | null,
 * }} args
 * @returns {{ allowed: boolean, tenantId: string, reason: string }}
 */
export function resolveCipcDeskDirectSmePageAccess(args = {}) {
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
