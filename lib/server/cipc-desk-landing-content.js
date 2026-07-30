/**
 * Presentation copy for the CIPC Desk standing-tenant homepage.
 * UI / content only — no workflow, payment, or messaging behaviour.
 *
 * Conservative English wording for Serah review. No fees, deadlines,
 * statutory guarantees, or regulatory outcomes.
 */

export const CIPCDESK_LANDING_CONTACT_EMAIL = 'swart829@gmail.com';

/** Bump when standing-tenant website_draft presentation copy should refresh. */
export const CIPC_DESK_LANDING_CONTENT_VERSION = 'cipc-desk-landing-ui-v1';

export const CIPCDESK_LANDING_DISCLAIMER =
  'CIPC Desk is a professional administration desk, not an official CIPC website and not a substitute for legal advice. Catalogue items, documents, and next steps are provisional until the desk owner validates them for your matter. No processing times, approvals, or outcomes are promised on this page.';

export const CIPCDESK_LANDING_DEFAULTS = Object.freeze({
  pageTitle: 'CIPC Desk · Company administration support',
  metaDescription:
    'CIPC Desk — professional South African CIPC and company-secretarial administration support. Clear process, email-first contact. Internal CorpFlowAI test desk.',
  headline: 'Clear CIPC and company administration support',
  lead:
    'Professional help with company registrations, amendments, annual returns, records, and compliance-related administration — handled with a calm, dependable process.',
  ctaLabel: 'Email your CIPC matter',
  contactEmail: CIPCDESK_LANDING_CONTACT_EMAIL,
  servicesTitle: 'What we help with',
  servicesIntro:
    'A concise first catalogue for business owners and professional partners. Details below are provisional until the desk owner validates them.',
  services: Object.freeze([
    {
      name: 'Private company registration',
      detail: 'Structured intake for a new private company filing plan. Exact documents and steps are confirmed after review.',
    },
    {
      name: 'Director changes',
      detail: 'Appointments and resignations prepared from a clear matter summary and supporting information.',
    },
    {
      name: 'Registered address updates',
      detail: 'Administration support for registered-office changes with a checked information list.',
    },
    {
      name: 'Annual returns',
      detail: 'Guidance on what to prepare and submit for annual return administration — confirmed per matter.',
    },
    {
      name: 'Beneficial ownership submissions',
      detail: 'Support gathering and organising the information needed for beneficial ownership filings.',
    },
    {
      name: 'Company amendments & maintenance',
      detail: 'Ongoing company secretarial maintenance for amendments and routine CIPC administration.',
    },
    {
      name: 'Statutory records & document retrieval',
      detail: 'Help requesting, organising, and tracking company records and supporting documents.',
    },
    {
      name: 'Ongoing CIPC administration support',
      detail: 'A managed cadence for clients who want dependable follow-through on recurring administration.',
    },
  ]),
});

export const CIPCDESK_LANDING_HOW_IT_WORKS = Object.freeze([
  {
    title: 'Email your matter',
    body: 'Send a short summary of the company administration you need. Attach any identifiers or documents you already have.',
  },
  {
    title: 'Scope is confirmed',
    body: 'The desk reviews your request, confirms what is in scope, and lists the information still needed.',
  },
  {
    title: 'You receive a clear update',
    body: 'Progress updates are prepared from the working record. Nothing is treated as confirmed until the desk owner validates it.',
  },
]);

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/**
 * Merge seeded / persona website_draft fields with presentation defaults.
 * Prefer draft copy when present so operators can refine text without a redesign.
 *
 * @param {Record<string, unknown> | null | undefined} site
 */
export function resolveCipcDeskLandingContent(site) {
  const s = asObj(site);
  const meta = asObj(s.meta);
  const hero = asObj(s.hero);
  const sections = asObj(s.sections);
  const services = asObj(sections.services);
  const contact = asObj(sections.contact);
  const d = CIPCDESK_LANDING_DEFAULTS;

  const draftItems = Array.isArray(services.items) ? services.items : [];
  const normalisedServices = draftItems
    .map((item) => {
      const o = asObj(item);
      const name = safeStr(o.name);
      const detail = safeStr(o.detail);
      if (!name) return null;
      return { name, detail: detail || 'Provisional catalogue item pending desk-owner validation.' };
    })
    .filter(Boolean);

  const contactEmail = safeStr(contact.email) || d.contactEmail;
  const ctaHref =
    safeStr(hero.cta_href) ||
    `mailto:${contactEmail}?subject=${encodeURIComponent('CIPC Desk · enquiry')}`;

  return {
    pageTitle: safeStr(meta.page_title) || d.pageTitle,
    metaDescription: d.metaDescription,
    brandTitle: safeStr(hero.title) || 'CIPC Desk',
    headline: safeStr(hero.headline) || d.headline,
    lead: safeStr(hero.tagline) ? stripPreviewNoise(safeStr(hero.tagline)) : d.lead,
    ctaLabel: preferBuyerCta(safeStr(hero.cta_label)) || d.ctaLabel,
    ctaHref,
    contactEmail,
    servicesTitle: safeStr(services.title) || d.servicesTitle,
    servicesIntro: safeStr(services.intro) || d.servicesIntro,
    services: normalisedServices.length ? normalisedServices : [...d.services],
  };
}

/** Soften legacy seed wording that reads as preview ceremony. */
function stripPreviewNoise(text) {
  const cleaned = text
    .replace(/\bPrivate preview\b[:\s—-]*/gi, '')
    .replace(/\b\(preview\)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 40) return CIPCDESK_LANDING_DEFAULTS.lead;
  return cleaned;
}

function preferBuyerCta(label) {
  if (!label) return '';
  if (/choose payment|payment path/i.test(label)) return CIPCDESK_LANDING_DEFAULTS.ctaLabel;
  return label.replace(/\s*\(preview\)\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Website draft used when seeding / refreshing the standing CIPC Desk persona.
 * Presentation fields only — keeps email-first mailto CTA.
 */
export function buildCipcDeskWebsiteDraftForLanding() {
  const d = CIPCDESK_LANDING_DEFAULTS;
  return {
    content_version: CIPC_DESK_LANDING_CONTENT_VERSION,
    meta: {
      page_title: d.pageTitle,
      console_heading: 'CIPC Desk · Change Console',
      guide_title: 'CIPC Desk · How to request a service',
    },
    hero: {
      title: 'CIPC Desk',
      headline: d.headline,
      tagline: d.lead,
      cta_label: d.ctaLabel,
      cta_href: `mailto:${d.contactEmail}?subject=${encodeURIComponent('CIPC Desk · enquiry')}`,
    },
    sections: {
      about: {
        title: 'How it works',
        body:
          `${CIPCDESK_LANDING_DISCLAIMER}\n\n` +
          '1) Email your matter request.\n' +
          '2) The desk confirms scope and required information.\n' +
          '3) You receive a drafted status update after guided review.\n',
      },
      services: {
        title: d.servicesTitle,
        intro: d.servicesIntro,
        items: d.services.map((item) => ({ name: item.name, detail: item.detail })),
      },
      contact: {
        title: 'Contact',
        email: d.contactEmail,
        phone: null,
        website: null,
      },
    },
  };
}
