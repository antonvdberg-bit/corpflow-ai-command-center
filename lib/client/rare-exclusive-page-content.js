/**
 * Rare & Exclusive Collection — editorial page copy (placeholder-ready).
 *
 * Used on lux.corpflowai.com content routes. Public brand only.
 * Technical tenant ids (`luxe-maurice`) stay out of prospect-facing text.
 *
 * Status: client-test editorial placeholders — principals may replace copy
 * without changing route structure. No revenue guarantees; no legal/tax advice.
 */

const BRAND = 'Rare & Exclusive Collection';
const STRAPLINE = 'Private Wealth & Lifestyle Platform for Mauritius';

const FORBIDDEN = [
  'corpflow',
  'tenant',
  'tenant_id',
  'idx',
  'mls',
  'saas',
  'realtor platform',
  'real estate platform',
  'property feed',
];

/**
 * @typedef {{ heading: string, body: string }} RareExclusiveSection
 * @typedef {{
 *   id: string,
 *   path: string,
 *   navLabel: string,
 *   eyebrow: string,
 *   title: string,
 *   lead: string,
 *   metaTitle: string,
 *   metaDescription: string,
 *   visual: 'photo' | 'advisory',
 *   sections: RareExclusiveSection[],
 *   ctaLabel: string,
 *   ctaHref: string,
 *   secondaryCtaLabel?: string,
 *   secondaryCtaHref?: string,
 * }} RareExclusivePageContent
 */

/** @type {Readonly<Record<string, RareExclusivePageContent>>} */
export const RARE_EXCLUSIVE_PAGE_CONTENT = Object.freeze({
  about: Object.freeze({
    id: 'about',
    path: '/about',
    navLabel: 'About',
    eyebrow: 'About',
    title: 'A private Mauritius platform — not a property website.',
    lead:
      `${BRAND} is built for discerning clients considering Mauritius as a residence, a lifestyle base, or a long-horizon private decision. Introductions are curated. Conversations begin by invitation.`,
    metaTitle: `About · ${BRAND}`,
    metaDescription:
      `About ${BRAND} — a private wealth and lifestyle platform for Mauritius. Invitation-only introductions, discretion, and calm advisory support.`,
    visual: 'advisory',
    sections: Object.freeze([
      Object.freeze({
        heading: 'Who we serve',
        body:
          'International families, private buyers, and principals who value discretion over display. Whether the next step is a completed residence, a development partnership, relocation planning, or ongoing ownership support — the tone remains private and considered.',
      }),
      Object.freeze({
        heading: 'How we work',
        body:
          'Opportunities are prepared for review before they appear. A single private advisor holds the thread from first note to next appointment. We do not run open listing feeds, public auctions of attention, or mass-market property portals.',
      }),
      Object.freeze({
        heading: 'What we are not',
        body:
          'We are not an open listing portal, not a volume brokerage site, and not a substitute for legal, tax, or immigration counsel. Contextual notes about Mauritius living are descriptive only; specialists are introduced where appropriate.',
      }),
      Object.freeze({
        heading: 'Editorial note',
        body:
          'Copy and imagery on this client-test environment may include placeholders pending principal approval. Availability, pricing, and terms are always confirmed privately — nothing here is an offer or solicitation.',
      }),
    ]),
    ctaLabel: 'Request a private consultation',
    ctaHref: '/concierge',
    secondaryCtaLabel: 'Explore private opportunities',
    secondaryCtaHref: '/properties',
  }),

  contact: Object.freeze({
    id: 'contact',
    path: '/contact',
    navLabel: 'Contact',
    eyebrow: 'Contact',
    title: 'Reach a private advisor — by appointment.',
    lead:
      'Share what you are seeking. Your note is read in confidence and answered within one business day. Suitable introductions continue by appointment — never as an open-market listing response.',
    metaTitle: `Contact · ${BRAND}`,
    metaDescription:
      `Contact ${BRAND} private advisory. Request a confidential consultation for residence, partnership, relocation, or ownership support in Mauritius.`,
    visual: 'advisory',
    sections: Object.freeze([
      Object.freeze({
        heading: 'Preferred path',
        body:
          'Use the private consultation form. It captures intent, preferred contact method, and any opportunity reference so a single advisor can prepare a discreet reply.',
      }),
      Object.freeze({
        heading: 'What to expect',
        body:
          'A calm acknowledgment after you submit. Then a considered response — typically within one business day — outlining whether an introduction or further conversation is appropriate.',
      }),
      Object.freeze({
        heading: 'Publishable channels',
        body:
          'A dedicated advisory email alias and telephone line can be confirmed privately once your enquiry is in review. Placeholder channels are intentionally omitted here so incomplete or incorrect public contact details are never published.',
      }),
      Object.freeze({
        heading: 'Discretion',
        body:
          'Enquiries are held in confidence. We do not share your details for marketing lists or third-party brokerage blasts.',
      }),
    ]),
    ctaLabel: 'Open private consultation form',
    ctaHref: '/concierge',
    secondaryCtaLabel: 'View properties',
    secondaryCtaHref: '/properties',
  }),

  lifestyle: Object.freeze({
    id: 'lifestyle',
    path: '/lifestyle',
    navLabel: 'Lifestyle',
    eyebrow: 'Lifestyle',
    title: 'Life on the island — framed for the long view.',
    lead:
      'Climate, privacy, schooling, sport, wellness, and family quality of life — presented as context for clients weighing Mauritius as a lasting base, not a weekend brochure.',
    metaTitle: `Lifestyle · ${BRAND}`,
    metaDescription:
      `Mauritius lifestyle context for ${BRAND} clients — climate, privacy, family life, and long-term living quality. Invitation-only advisory.`,
    visual: 'advisory',
    sections: Object.freeze([
      Object.freeze({
        heading: 'Climate & pace',
        body:
          'A subtropical rhythm with clear seasons for outdoor living, travel windows, and time on the water. Day-to-day life can stay quiet even when the island is well connected internationally.',
      }),
      Object.freeze({
        heading: 'Family & schooling',
        body:
          'International and private schooling options, healthcare access, and community life are part of the relocation conversation. We frame the questions; qualified specialists advise on formal requirements.',
      }),
      Object.freeze({
        heading: 'Privacy & security',
        body:
          'Many clients seek a residence that feels protected without feeling isolated — gated settings, thoughtful access, and households that run calmly when principals travel.',
      }),
      Object.freeze({
        heading: 'Sport, nature & ritual',
        body:
          'Golf, sailing, diving, hiking, and spa culture sit alongside everyday errands. The platform treats lifestyle as part of the ownership decision — not an afterthought gallery.',
      }),
      Object.freeze({
        heading: 'Placeholder status',
        body:
          'This lifestyle chapter is editorial scaffolding for the client-test site. Principals may replace paragraphs, add photography, and deepen regional notes without changing the route.',
      }),
    ]),
    ctaLabel: 'Discuss lifestyle priorities',
    ctaHref: '/concierge',
    secondaryCtaLabel: 'Destination Mauritius',
    secondaryCtaHref: '/destination-mauritius',
  }),

  destination: Object.freeze({
    id: 'destination',
    path: '/destination-mauritius',
    navLabel: 'Destination Mauritius',
    eyebrow: 'Destination Mauritius',
    title: 'Mauritius as a considered private destination.',
    lead: `${STRAPLINE}. Place, access, and long-horizon context — for clients who want more than a transaction.`,
    metaTitle: `Destination Mauritius · ${BRAND}`,
    metaDescription:
      `Destination Mauritius with ${BRAND} — regions, access, and private wealth lifestyle context. Descriptive only; not legal or tax advice.`,
    visual: 'photo',
    sections: Object.freeze([
      Object.freeze({
        heading: 'Why Mauritius',
        body:
          'An island that combines lifestyle appeal with practical connectivity, a stable operating environment for many international households, and a scale that still allows privacy.',
      }),
      Object.freeze({
        heading: 'Regions at a glance',
        body:
          'West and north coastal living, plateau communities, south and south-west nature corridors, and discreet inland settings each carry a different daily rhythm. Region notes on opportunities are orientation only — site visits and advisor briefings refine fit.',
      }),
      Object.freeze({
        heading: 'Access & movement',
        body:
          'International air links, marina culture, and road connections between key villages shape how a residence works as a base. We discuss travel patterns, guest flow, and household staffing as part of private review.',
      }),
      Object.freeze({
        heading: 'Important disclaimer',
        body:
          'General information about Mauritius — including any residency, tax, or citizenship topics mentioned in conversation — is contextual only and is not legal, tax, or immigration advice. Qualified specialists are introduced where appropriate.',
      }),
    ]),
    ctaLabel: 'Request a destination briefing',
    ctaHref: '/concierge',
    secondaryCtaLabel: 'Browse private opportunities',
    secondaryCtaHref: '/properties',
  }),

  services: Object.freeze({
    id: 'services',
    path: '/private-services',
    navLabel: 'Private Services',
    eyebrow: 'Private Services',
    title: 'Owner concierge and private advisory support.',
    lead:
      'From first introduction through ownership — one calm thread for design decisions, progress updates, household coordination, and trusted specialist introductions.',
    metaTitle: `Private Services · ${BRAND}`,
    metaDescription:
      `Private services from ${BRAND} — owner concierge, discretionary introductions, and Mauritius expertise for invited clients.`,
    visual: 'advisory',
    sections: Object.freeze([
      Object.freeze({
        heading: 'Private advisory',
        body:
          'A single advisor understands your intent — completed residence, partnership, relocation, investment diversification, or ongoing ownership — and prepares the next discreet step.',
      }),
      Object.freeze({
        heading: 'Owner concierge',
        body:
          'Post-decision support can include coordination with trusted local counterparts for household setup, maintenance rhythm, guest arrivals, and day-to-day calm when you are away.',
      }),
      Object.freeze({
        heading: 'Specialist introductions',
        body:
          'Legal, tax, banking, architecture, and interior specialists are introduced only when relevant — never as an unsolicited marketplace. You remain in control of who you meet.',
      }),
      Object.freeze({
        heading: 'Discretion by design',
        body:
          'Services are invitation-oriented. We do not publish a menu of packages or guaranteed outcomes. Scope is agreed in writing for each engagement.',
      }),
      Object.freeze({
        heading: 'Placeholder status',
        body:
          'Service descriptions here are placeholders for the client-test environment. Principals may refine naming, scope language, and proof points before wider client use.',
      }),
    ]),
    ctaLabel: 'Speak with private advisory',
    ctaHref: '/concierge',
    secondaryCtaLabel: 'About the collection',
    secondaryCtaHref: '/about',
  }),
});

export function getRareExclusivePageContent(id) {
  return RARE_EXCLUSIVE_PAGE_CONTENT[id] || null;
}

export function listRareExclusiveContentPaths() {
  return Object.values(RARE_EXCLUSIVE_PAGE_CONTENT).map((p) => p.path);
}

export function rareExclusivePageContentAuditGuard(extraStrings = []) {
  const pages = Object.values(RARE_EXCLUSIVE_PAGE_CONTENT);
  const blob = [
    ...pages.flatMap((p) => [
      p.title,
      p.lead,
      p.metaTitle,
      p.metaDescription,
      ...p.sections.map((s) => `${s.heading} ${s.body}`),
    ]),
    ...extraStrings,
  ]
    .join('\n')
    .toLowerCase();
  for (const w of FORBIDDEN) {
    if (blob.includes(w)) return { ok: false, term: w };
  }
  return { ok: true };
}
