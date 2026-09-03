/**
 * CorpFlowAI public market experience — shared copy, nav, metadata, and helpers.
 * Docs: docs/revenue/CORPFLOWAI_PUBLIC_MARKET_ROUTE_REGISTER.md
 * Market gateway slice: GitHub #699
 */

import {
  RAPID_DELIVERY_OFFER_SLUGS,
  RAPID_DELIVERY_OFFERS,
  buildDiscoveryCallMailto,
} from './rapid-delivery-offers.js';
import { MARKET_SERVICE_PATHS } from './corpflow-market-service-paths.js';
import { MERCHANT_WEBSITE, CUSTOMER_SERVICE_EMAIL } from './merchant-identity.js';
import { ENQUIRY_RECOVERY_DIAGNOSIS_HREF, ENQUIRY_RECOVERY_PATH } from './enquiry-recovery-sprint.js';

export const CORPflow_PUBLIC_MAX_WIDTH = 1120;

/** Primary public navigation — prospect-facing CorpFlowAI routes only. */
export const CORPflow_PUBLIC_NAV = [
  { href: '#service-paths', label: 'How we help' },
  { href: ENQUIRY_RECOVERY_PATH, label: 'Enquiry Recovery' },
  { href: '/website-rescue', label: 'Website Rescue' },
  { href: '/about', label: 'About' },
  { href: '/process', label: 'Process' },
  { href: '/contact', label: 'Contact' },
];

/**
 * Gateway/footer product links for the two approved launch products.
 * Enquiry Recovery is the live commercial offer; Website Rescue remains the second named landing.
 */
export const CORPflow_PUBLIC_LAUNCH_PRODUCTS = [
  { href: ENQUIRY_RECOVERY_PATH, label: 'Enquiry Recovery' },
  { href: '/website-rescue', label: 'Website Rescue' },
];

export const CORPflow_HOMEPAGE_HERO = {
  eyebrow: 'CorpFlowAI · Mauritius · selected clients',
  headline: 'Some of your best enquiries probably did not say no. They just stopped being followed up.',
  subhead:
    'You already paid to generate the enquiry. We help selected owner-led Mauritius businesses identify and recover valuable enquiries that have gone quiet. Maximum three founding-client positions in this delivery cycle.',
  primaryCta: { label: 'Request a 15-minute diagnosis', href: ENQUIRY_RECOVERY_DIAGNOSIS_HREF },
  secondaryCta: { label: 'See if this is for you', href: '#service-paths' },
};

/** Delivery method for the market gateway (#699). */
export const CORPflow_DELIVERY_STEPS = [
  {
    step: '1',
    title: 'Understand',
    body: 'Clarify the business problem, channels, owners, and what “better” looks like in practical terms.',
  },
  {
    step: '2',
    title: 'Design',
    body: 'Shape a bounded workflow using existing processes and suitable free/open or already-approved tools where possible.',
  },
  {
    step: '3',
    title: 'Build',
    body: 'Implement the smallest useful path — intake, routing, follow-up, review — with human-operated controls.',
  },
  {
    step: '4',
    title: 'Verify',
    body: 'Test on controlled surfaces before anything client-facing goes live. Evidence before claims.',
  },
  {
    step: '5',
    title: 'Review',
    body: 'Walk through what was delivered, what changed for operators, and what still needs a decision.',
  },
  {
    step: '6',
    title: 'Improve',
    body: 'Tighten the workflow from real use — without forcing an unnecessary platform replacement.',
  },
];

/**
 * Factual, anonymised CorpFlowAI test-delivery evidence only.
 * Not public client endorsements. No fabricated metrics.
 */
export const CORPflow_PROOF_ITEMS = [
  {
    title: 'Private client / concierge test surface',
    capability:
      'Tenant-scoped presentation, enquiry routing, and operator-controlled publishing for a luxury-access style experience — demonstrated on CorpFlowAI test hosts, not as a public client case study.',
    demonstratedBy: 'Internal / test tenant capability (Lux-class surface)',
    link: { href: ENQUIRY_RECOVERY_PATH, label: 'Related product path: Enquiry Recovery' },
  },
  {
    title: 'Operator desk for enquiry and status control',
    capability:
      'Qualified intake, status tracking, and operator review for lead and service workflows — including controlled desk surfaces used in CorpFlowAI test delivery (for example CIPC Desk-style operational UI patterns).',
    demonstratedBy: 'Internal / test tenant capability (CIPC Desk and operator desks)',
    link: { href: '/website-rescue', label: 'Related product path: Website Rescue' },
  },
  {
    title: 'Website Rescue before/after demonstration',
    capability:
      'A fictional before/after demo showing how a weak brochure page becomes a clearer enquiry path connected to follow-up — no private client data.',
    demonstratedBy: 'Public demo path on CorpFlowAI',
    link: { href: '/demo/website-rescue', label: 'Open Website Rescue demo' },
  },
];

/** @deprecated Prefer CORPflow_PROOF_ITEMS — retained for older imports/tests during transition. */
export const CORPflow_PROOF_EXAMPLE = {
  title: CORPflow_PROOF_ITEMS[0].title,
  problem:
    'Businesses need credible client or enquiry surfaces without exposing operator systems or private lead data on the public web.',
  delivered: CORPflow_PROOF_ITEMS[0].capability,
  approach:
    'Managed delivery on controlled test surfaces; public pages stay clear; operator workflows stay behind appropriate access.',
  publicLink: CORPflow_PROOF_ITEMS[0].link,
  namedPublication: 'Not a public client endorsement — internal/test delivery evidence only',
};

export const CORPflow_TRUST_POINTS = [
  {
    title: 'Controlled approvals',
    body: 'Production-facing changes move only after review. Operators keep an accountable path for what goes live.',
  },
  {
    title: 'Test before launch',
    body: 'Work is verified on controlled CorpFlowAI test surfaces before client-facing release where that path applies.',
  },
  {
    title: 'Data boundaries',
    body: 'Tenant and operator data stay scoped. Public marketing pages do not expose private lead or client records.',
  },
  {
    title: 'No unnecessary platform replacement',
    body: 'We improve the weak links in your current operating path. Full CRM or stack migrations are out of scope unless quoted separately.',
  },
];

export const CORPflow_BUYER_FIT = {
  label: 'Who this is for',
  title: 'Owner-led and management-led SMEs that need practical operating improvement',
  body:
    'If administration, customer communication, lead handling, approvals, documents or follow-ups are fragmented — and you want a managed improvement rather than a large software transformation — CorpFlowAI is built for that buyer.',
};

/** Re-export for homepage cards. */
export { MARKET_SERVICE_PATHS };

/** @returns {import('./rapid-delivery-offers.js').RapidDeliveryOffer[]} */
export function listPublicOffers() {
  return RAPID_DELIVERY_OFFER_SLUGS.map((slug) => RAPID_DELIVERY_OFFERS[slug]).filter(Boolean);
}

export function formatMur(amount) {
  return `MUR ${amount.toLocaleString('en-US')}`;
}

export function buildGeneralDiscoveryMailto() {
  const subject = encodeURIComponent('Qualified conversation — CorpFlowAI');
  const body = encodeURIComponent(
    `Hi CorpFlowAI team,\n\nI would like to request a qualified conversation.\n\nBusiness name:\nWhat I need help with (losing enquiries / website improvement / admin or workflow / AI receptionist / not sure):\nProblem or desired outcome:\nWebsite (if any):\nTiming:\nBest contact number / WhatsApp:\n\n`,
  );
  return `mailto:${CUSTOMER_SERVICE_EMAIL}?subject=${subject}&body=${body}`;
}

/**
 * @param {{ title: string, description: string, path?: string, ogImage?: string }} opts
 */
export function buildPublicPageMeta({ title, description, path = '', ogImage = '/assets/visuals/lead-rescue-spa-sunset-hero-v1.jpg' }) {
  const canonical = path ? `${MERCHANT_WEBSITE}${path}` : MERCHANT_WEBSITE;
  return {
    title: `${title} · CorpFlowAI`,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonical,
    ogImage: ogImage.startsWith('http') ? ogImage : `${MERCHANT_WEBSITE}${ogImage}`,
    twitterCard: 'summary_large_image',
  };
}

export function offerDiscoveryMailto(slug) {
  const offer = RAPID_DELIVERY_OFFERS[slug];
  return offer ? buildDiscoveryCallMailto(offer) : buildGeneralDiscoveryMailto();
}

/** FAQ blocks per offer slug — kept minimal and commercial. */
export const OFFER_FAQ_BY_SLUG = {
  'ai-lead-rescue': [
    { q: 'Is this a CRM replacement?', a: 'No. The sprint identifies quiet enquiries and makes follow-up visible. Full CRM migration is out of scope unless quoted separately.' },
    { q: 'Do you guarantee more revenue?', a: 'No. We help identify and recover valuable enquiries that have gone quiet. Results depend on your volume and response discipline.' },
    { q: 'When does the 72-hour preview clock start?', a: 'After cleared deposit, required access, and required assets or information — not as an unconditional 72-hour delivery guarantee.' },
    { q: 'How many founding clients are you taking?', a: 'A maximum of three during this delivery cycle. If we cannot identify a commercially meaningful recovery problem, we should not work together.' },
  ],
  'premium-landing-page-rescue': [
    { q: 'Is this a full website rebuild?', a: 'No. This is a bounded landing-page rescue with one primary conversion goal — not an open-ended redesign. Larger brochure or rebuild scopes are quoted after discovery.' },
    { q: 'I am not a designer — do I need a brief?', a: 'No. We present guided options and a recommended path, then convert your feedback into structured requirements. You do not write a specification from scratch.' },
    { q: 'Who approves production release?', a: 'You do, in writing, after preview feedback — or after the agreed reminder period in the quote.' },
    { q: 'Do you guarantee SEO rankings or more revenue?', a: 'No. We deliver a clearer, mobile-ready enquiry path. Rankings, traffic, and revenue still depend on your offer, market, and follow-up.' },
    { q: 'How many revision rounds are included?', a: 'Two structured preview rounds on the standard landing rescue. Extra rounds or extra pages are quoted in writing before additional work.' },
    { q: 'Are third-party tools included?', a: 'Core sprint delivery is quoted in MUR. Third-party fees or paid plugins are quoted separately where applicable.' },
    { q: 'Can you also fix lead follow-up after the form?', a: 'Yes as a separate Lead Rescue engagement — so website scope and follow-up accountability stay clear. Ask during discovery.' },
  ],
  'customer-reputation-recovery': [
    { q: 'Will you post public replies for us?', a: 'We deliver templates, escalation rules, and monitoring — your team sends approved responses unless a separate managed service is quoted.' },
    { q: 'Can you remove negative reviews?', a: 'No. We focus on structured recovery, response SLAs, and visibility — not review manipulation.' },
    { q: 'What if legal review is needed?', a: 'Scope may extend in writing if counsel must approve templates before use.' },
  ],
};

export const OFFER_NOT_INCLUDED_BY_SLUG = {
  'ai-lead-rescue': [
    'Full CRM migration or custom CRM build',
    'Paid advertising management',
    'Guaranteed revenue or lead-volume outcomes',
    'Unlimited channel connections beyond agreed sprint scope',
  ],
  'premium-landing-page-rescue': [
    'Full multi-page website redesign beyond the quoted page count',
    'Unlimited revision rounds beyond quoted preview cycle',
    'Copywriting for entire brand without client inputs',
    'SEO ranking, traffic, or revenue guarantees',
    'Payment checkout on the landing page',
    'Lead Rescue follow-up automation (quoted separately if needed)',
  ],
  'customer-reputation-recovery': [
    'Review removal or astroturfing',
    'Legal representation or dispute litigation',
    '24/7 managed social moderation without a separate maintenance quote',
    'Public posting without your approval workflow',
  ],
};
