/**
 * CIPC Desk provisional service catalogue + route labels (fictional / corpflow_test).
 * Pure data — no DB, no secrets, no live messaging.
 *
 * All service wording is provisional until Serah Fourie validates.
 */

export const CIPCDESK_CONTACT_EMAIL = 'swart829@gmail.com';

export const CIPCDESK_CLIENT_ROUTES = Object.freeze({
  direct_sme: {
    id: 'direct_sme',
    label: 'Direct SME',
    short: 'For business owners',
    description:
      'Company owners and directors who need a specific CIPC administration matter handled remotely.',
  },
  professional_partner: {
    id: 'professional_partner',
    label: 'Professional partner',
    short: 'For accountants & practitioners',
    description:
      'Accountants, tax practitioners, and company-secretarial partners who need a reliable CIPC desk for client matters.',
  },
});

/** @typedef {{ slug: string, name: string, detail: string, mailtoSubject: string }} CipcDeskServiceItem */

/** @type {ReadonlyArray<CipcDeskServiceItem>} */
export const CIPCDESK_SERVICE_CATALOGUE = Object.freeze([
  {
    slug: 'private-company-registration',
    name: 'Private-company registration (provisional)',
    detail:
      'First-slice plan for a new private company. Exact documents, turnaround, and fees require Serah’s validation before work starts.',
    mailtoSubject: 'CIPC Desk · SME · Private-company registration',
  },
  {
    slug: 'director-appointments-resignations',
    name: 'Director appointments & resignations (provisional)',
    detail: 'Email the matter summary. Serah confirms the exact filings and required information.',
    mailtoSubject: 'CIPC Desk · Director appointment / resignation',
  },
  {
    slug: 'registered-address-changes',
    name: 'Registered-address changes (provisional)',
    detail: 'We draft next steps and required matter details, subject to Serah validation.',
    mailtoSubject: 'CIPC Desk · Registered-address change',
  },
  {
    slug: 'annual-returns',
    name: 'Annual returns (provisional)',
    detail: 'We confirm what to submit and timing. Provisional until Serah validates requirements.',
    mailtoSubject: 'CIPC Desk · Annual returns',
  },
  {
    slug: 'beneficial-ownership-submissions',
    name: 'Beneficial ownership submissions (provisional)',
    detail: 'We confirm scope and needed information after your email review.',
    mailtoSubject: 'CIPC Desk · Beneficial ownership',
  },
  {
    slug: 'company-amendments-maintenance',
    name: 'Company amendments & maintenance (provisional)',
    detail: 'Provisional catalogue item for the initial slice. Serah validates exact scope.',
    mailtoSubject: 'CIPC Desk · Company amendments',
  },
  {
    slug: 'statutory-records-document-retrieval',
    name: 'Statutory records & document retrieval (provisional)',
    detail: 'We confirm what you need and draft a request. Provisional until validated.',
    mailtoSubject: 'CIPC Desk · Statutory records / retrieval',
  },
  {
    slug: 'monthly-cipc-administration-support',
    name: 'Monthly CIPC administration support (provisional)',
    detail: 'Ongoing managed cadence for clients who want a standing desk. Provisional until Serah validates.',
    mailtoSubject: 'CIPC Desk · Monthly administration support',
  },
]);

export const CIPCDESK_LEGAL_DISCLAIMER =
  'CIPC Desk is a CorpFlowAI-hosted test operating desk for South African CIPC administration workflow. ' +
  'CorpFlowAI is not the Companies and Intellectual Property Commission (CIPC), not a law firm, and not an authorised representative of CIPC. ' +
  'Service descriptions, documents, turnaround, and pricing are provisional until validated by Serah Fourie. ' +
  'This surface uses fictional / test data only — do not submit real client or CIPC credentials here.';

/**
 * @param {string | null | undefined} slug
 * @returns {CipcDeskServiceItem | null}
 */
export function findCipcDeskServiceBySlug(slug) {
  const s = String(slug || '').trim();
  if (!s) return null;
  return CIPCDESK_SERVICE_CATALOGUE.find((it) => it.slug === s) || null;
}

/**
 * @param {'direct_sme' | 'professional_partner' | string} routeId
 * @param {string | null | undefined} serviceSlug
 * @returns {string}
 */
export function buildCipcDeskMailtoHref(routeId, serviceSlug) {
  const route =
    routeId === 'professional_partner'
      ? CIPCDESK_CLIENT_ROUTES.professional_partner
      : CIPCDESK_CLIENT_ROUTES.direct_sme;
  const service = findCipcDeskServiceBySlug(serviceSlug);
  const subject = service
    ? `${service.mailtoSubject} (${route.label})`
    : `CIPC Desk · ${route.label} enquiry`;
  const bodyLines = [
    `Route: ${route.label}`,
    service ? `Service: ${service.name}` : 'Service: (please state)',
    '',
    'Company / entity name (if any):',
    'Registration number (if any):',
    'What you need done:',
    'Any deadlines or constraints:',
    '',
    'Note: this is a test desk — use fictional identifiers only until Serah confirms the live path.',
  ];
  return `mailto:${CIPCDESK_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
}
