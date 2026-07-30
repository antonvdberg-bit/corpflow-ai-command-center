/**
 * Pure CIPC Desk email interpretation + public base URL helpers (no Prisma).
 */

import { isCipcDeskStandingTestHost, normalizeHostname } from './cipc-desk-runtime.js';

/**
 * @param {string} emailText
 */
export function inferCipcDeskFromEmailText(emailText) {
  const raw = String(emailText || '');
  const lower = raw.toLowerCase();

  const isProfessionalPartner =
    /(accountant|tax practitioner|tax\s+practitioner|auditor|firm|professional\s+partner|company\s+secretary)/i.test(
      lower,
    );
  const clientRoute = isProfessionalPartner ? 'professional_partner' : 'direct_sme';

  /** @type {{ serviceSlug: string, serviceTitle: string, requestedChange: string } | null} */
  let service = null;

  const has = (re) => re.test(lower);

  if (
    has(/(director\s+appointment|appointment\s+of\s+director|appoint(ed)?\s+director)/i) ||
    has(/resign(ed|ation)?\s+director|resign(ed|ation)?\s+of\s+director/i)
  ) {
    service = {
      serviceSlug: 'director-appointments-resignations',
      serviceTitle: 'Director appointments & resignations (provisional)',
      requestedChange: 'Process director appointment/resignation matter (provisional)',
    };
  } else if (has(/beneficial\s+ownership|ubo\b|beneficial\s+owner/i)) {
    service = {
      serviceSlug: 'beneficial-ownership-submissions',
      serviceTitle: 'Beneficial ownership submissions (provisional)',
      requestedChange: 'Prepare beneficial ownership submission matter (provisional)',
    };
  } else if (has(/registered\s+address|change\s+of\s+address|address\s+change/i)) {
    service = {
      serviceSlug: 'registered-address-changes',
      serviceTitle: 'Registered-address changes (provisional)',
      requestedChange: 'Prepare registered-address change matter (provisional)',
    };
  } else if (has(/annual\s+returns?/i)) {
    service = {
      serviceSlug: 'annual-returns',
      serviceTitle: 'Annual returns (provisional)',
      requestedChange: 'Prepare annual returns matter (provisional)',
    };
  } else if (has(/amendment|alteration|maintenance|company\s+amend|maintenance\s+support/i)) {
    service = {
      serviceSlug: 'company-amendments-maintenance',
      serviceTitle: 'Company amendments & maintenance (provisional)',
      requestedChange: 'Prepare company amendments / maintenance matter (provisional)',
    };
  } else if (has(/statutory\s+records|document\s+retrieval|retrieve\s+records|records\s+retrieval/i)) {
    service = {
      serviceSlug: 'statutory-records-document-retrieval',
      serviceTitle: 'Statutory records & document retrieval (provisional)',
      requestedChange: 'Retrieve / prepare statutory records (provisional)',
    };
  } else if (has(/monthly|administration\s+support|cipc\s+administration\s+support/i)) {
    service = {
      serviceSlug: 'monthly-cipc-administration-support',
      serviceTitle: 'Monthly CIPC administration support (provisional)',
      requestedChange: 'Prepare monthly administration support plan (provisional)',
    };
  }

  if (!service) {
    service = {
      serviceSlug: 'private-company-registration',
      serviceTitle: 'Private-company registration (provisional)',
      requestedChange: 'Submit and confirm first-slice scope for private-company registration (provisional)',
    };
  }

  const checklistItems = [
    { key: 'scope_confirmed', label: 'Service scope confirmed by Serah (provisional)', status: 'pending' },
    { key: 'required_info_captured', label: 'Required matter info captured (provisional)', status: 'pending' },
    { key: 'documents_and_turnaround', label: 'Documents + turnaround drafted for validation', status: 'pending' },
    { key: 'client_reply_draft_ready', label: 'Client reply draft prepared for guided decisions', status: 'pending' },
  ];

  const clientReplyDraft =
    `Thanks — we received your email for ${service.serviceTitle}.\n\n` +
    `Next: Serah will validate the exact scope and confirm required information before any filing steps are treated as confirmed. ` +
    `To help us draft a safer first-slice plan, please ensure your email includes the company identifiers you already have (if any).`;

  const clientDecisionsItems = [
    {
      key: 'first_slice_outcome',
      status: 'answered',
      answer: `First slice outcome: ${service.serviceTitle}`,
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

  return {
    clientRoute,
    service,
    checklistItems,
    clientReplyDraft,
    clientDecisionsItems,
  };
}

/**
 * Prefer the standing CIPC Desk request host so magic links stay on cipc*.corpflowai.com
 * even when CORPFLOW_PUBLIC_BASE_URL points at apex.
 *
 * @param {import('http').IncomingMessage | { headers?: Record<string, unknown> }} req
 * @returns {string}
 */
export function resolveCipcDeskPublicBaseUrl(req) {
  try {
    const proto =
      String(req?.headers?.['x-forwarded-proto'] || 'https')
        .split(',')[0]
        .trim() || 'https';
    const host = normalizeHostname(req?.headers?.['x-forwarded-host'] || req?.headers?.host);
    if (host && isCipcDeskStandingTestHost(host)) {
      return `${proto}://${host}`;
    }
  } catch {
    /* ignore */
  }

  const explicit = String(process.env.CORPFLOW_PUBLIC_BASE_URL || '').trim();
  let base = explicit ? explicit.replace(/\/+$/, '') : '';
  if (!base) {
    try {
      const proto =
        String(req?.headers?.['x-forwarded-proto'] || 'https')
          .split(',')[0]
          .trim() || 'https';
      const host = normalizeHostname(req?.headers?.['x-forwarded-host'] || req?.headers?.host);
      if (host) base = `${proto}://${host}`;
    } catch {
      /* ignore */
    }
  }
  return base;
}
