/**
 * CorpFlowAI public market experience — shared copy, nav, metadata, and helpers.
 * Docs: docs/revenue/CORPFLOWAI_PUBLIC_MARKET_ROUTE_REGISTER.md
 * Market-ready slice: GitHub #699
 */

import {
  RAPID_DELIVERY_OFFER_SLUGS,
  RAPID_DELIVERY_OFFERS,
  buildDiscoveryCallMailto,
} from './rapid-delivery-offers.js';
import { MERCHANT_WEBSITE, CUSTOMER_SERVICE_EMAIL } from './merchant-identity.js';
import { CORPFLOW_SERVICE_PATHS } from './corpflow-service-paths.js';

export { CORPFLOW_SERVICE_PATHS } from './corpflow-service-paths.js';

export const CORPflow_PUBLIC_MAX_WIDTH = 1120;

/** Primary public navigation — prospect-facing CorpFlowAI routes only. */
export const CORPflow_PUBLIC_NAV = [
  { href: '/#service-paths', label: 'Service paths' },
  { href: '/offers/ai-lead-rescue', label: 'Delivery sprints' },
  { href: '/insights', label: 'Insights' },
  { href: '/about', label: 'About' },
  { href: '/process', label: 'Process' },
  { href: '/contact', label: 'Contact' },
];

export const CORPflow_HOMEPAGE_HERO = {
  eyebrow: 'CorpFlowAI · managed workflow delivery',
  headline: 'CorpFlowAI designs and operates practical AI-assisted business workflows.',
  subhead:
    'For owner-led and management-led businesses with fragmented administration, customer communication, lead handling, approvals or follow-ups. Managed delivery using your existing processes and appropriate free, open or already-approved tools — not generic AI advice and not a large software transformation.',
  primaryCta: { label: 'Start a qualified enquiry', href: '/contact#discovery' },
  secondaryCta: { label: 'See how we deliver', href: '#how-we-deliver' },
};

/** Delivery method for the market-ready homepage (#699). */
export const CORPflow_DELIVERY_STEPS = [
  {
    step: '1',
    title: 'Understand',
    body: 'We map the real work: where enquiries, approvals, documents and follow-ups currently get stuck.',
  },
  {
    step: '2',
    title: 'Design',
    body: 'We design a bounded operating path that fits your people, tools and constraints — before building broadly.',
  },
  {
    step: '3',
    title: 'Build',
    body: 'We implement the smallest useful system: capture, routing, visibility and handoffs that operators can run.',
  },
  {
    step: '4',
    title: 'Verify',
    body: 'We test on controlled surfaces first. Nothing goes live until the flow is checked against the agreed outcome.',
  },
  {
    step: '5',
    title: 'Review',
    body: 'You review working output with clear next steps. Approvals stay with your business before any production change.',
  },
  {
    step: '6',
    title: 'Improve',
    body: 'We tighten the operating loop from real use — without unnecessary platform replacement or open-ended rebuilds.',
  },
];

/** Factual, non-confidential CorpFlowAI test-delivery evidence (#699). */
export const CORPflow_PROOF_ITEMS = [
  {
    id: 'lux-test-surface',
    title: 'Private client experience (internal test tenant)',
    problem:
      'A luxury-access test tenant needed a credible private client surface without exposing operator systems or lead data on the public web.',
    delivered:
      'A tenant-scoped preview experience with curated presentation, concierge-style routing, and operator-controlled publishing — delivered as a managed workflow surface, not a generic chatbot wrapper.',
    approach:
      'Public marketing stays separate from operator workflows. Delivery evidence and publishing controls remain behind tenant login and internal records.',
    publicLink: { href: '/client/luxe-maurice-ai', label: 'View demo-scope client surface' },
    note: 'Internal / test delivery evidence. Not a named public client endorsement.',
  },
  {
    id: 'cipc-desk-test',
    title: 'Operator desk pattern (internal test tenant)',
    problem:
      'Fragmented service requests need a clear intake-to-status path that an operator can review without mixing tenants.',
    delivered:
      'A standing test-tenant desk pattern for structured requests, status visibility and controlled follow-up — used to prove tenant isolation and operator review before wider rollout.',
    approach:
      'Test-before-launch: capability is demonstrated on CorpFlowAI-hosted test surfaces, then adapted to a client context only after fit and approvals are clear.',
    publicLink: null,
    note: 'Internal / test capability demonstration. No confidential client data is shown publicly.',
  },
];

/** @deprecated Prefer CORPflow_PROOF_ITEMS — kept for older imports/tests during transition. */
export const CORPflow_PROOF_EXAMPLE = {
  title: CORPflow_PROOF_ITEMS[0].title,
  problem: CORPflow_PROOF_ITEMS[0].problem,
  delivered: CORPflow_PROOF_ITEMS[0].delivered,
  approach: CORPflow_PROOF_ITEMS[0].approach,
  publicLink: CORPflow_PROOF_ITEMS[0].publicLink,
  namedPublication: 'Internal test evidence only — not a public endorsement',
};

export const CORPflow_TRUST_POINTS = [
  {
    title: 'Controlled approvals',
    body: 'Production changes and client-facing releases wait on explicit review. Operators see status; buyers keep the decision.',
  },
  {
    title: 'Test before launch',
    body: 'We verify flows on controlled or test surfaces first. Live client impact is intentional, not accidental.',
  },
  {
    title: 'Data boundaries',
    body: 'Tenant and operator data stay separated. Public pages do not expose private leads, credentials or internal systems.',
  },
  {
    title: 'No unnecessary platform replacement',
    body: 'We prefer your existing processes and already-approved tools where they work. New platforms are introduced only when they clearly help.',
  },
];

/** @returns {import('./rapid-delivery-offers.js').RapidDeliveryOffer[]} */
export function listPublicOffers() {
  return RAPID_DELIVERY_OFFER_SLUGS.map((slug) => RAPID_DELIVERY_OFFERS[slug]).filter(Boolean);
}

/** @returns {typeof CORPFLOW_SERVICE_PATHS} */
export function listPublicServicePaths() {
  return CORPFLOW_SERVICE_PATHS;
}

export function formatMur(amount) {
  return `MUR ${amount.toLocaleString('en-US')}`;
}

export function buildGeneralDiscoveryMailto() {
  const subject = encodeURIComponent('Qualified enquiry — CorpFlowAI managed workflows');
  const body = encodeURIComponent(
    `Hi CorpFlowAI team,\n\nI would like to start a qualified enquiry.\n\nName:\nBusiness name:\nEmail:\nTelephone / WhatsApp:\nWebsite (if any):\nPreferred service path (workflow / client-lead systems / website upgrades):\nBusiness problem or desired outcome:\nTiming:\nConsent to be contacted: Yes\n\n`,
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
    { q: 'Is this a CRM replacement?', a: 'No. The sprint connects your lead sources and makes follow-up visible. Full CRM migration is out of scope unless quoted separately.' },
    { q: 'Do you guarantee more revenue?', a: 'No. We help stop leakage from slow or invisible follow-up. Results depend on your position and response discipline.' },
    { q: 'When does the 24–72 hour clock start?', a: 'After deposit is manually verified as cleared and we have the agreed access or forwarding path.' },
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
