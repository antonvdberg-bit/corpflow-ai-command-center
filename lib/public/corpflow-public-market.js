/**
 * CorpFlowAI public market experience — shared copy, nav, metadata, and helpers.
 * Docs: docs/revenue/CORPFLOWAI_PUBLIC_MARKET_ROUTE_REGISTER.md
 */

import {
  RAPID_DELIVERY_OFFER_SLUGS,
  RAPID_DELIVERY_OFFERS,
  buildDiscoveryCallMailto,
} from './rapid-delivery-offers.js';
import { MERCHANT_WEBSITE, CUSTOMER_SERVICE_EMAIL } from './merchant-identity.js';

export const CORPflow_PUBLIC_MAX_WIDTH = 1120;

/** Primary public navigation — prospect-facing CorpFlowAI routes only. */
export const CORPflow_PUBLIC_NAV = [
  { href: '/offers/ai-lead-rescue', label: 'Delivery sprints' },
  { href: '/insights', label: 'Insights' },
  { href: '/videos', label: 'Videos' },
  { href: '/about', label: 'About' },
  { href: '/process', label: 'Process' },
  { href: '/contact', label: 'Contact' },
];

export const CORPflow_HOMEPAGE_HERO = {
  eyebrow: 'Mauritius · bounded delivery sprints',
  headline: 'Recover missed revenue. Repair weak digital journeys. Launch working client experiences quickly.',
  subhead:
    'CorpFlowAI runs bounded delivery sprints for lead response, premium web conversion, and customer recovery — so prospects see working output within days, not months of promises.',
  primaryCta: { label: 'Book a discovery conversation', href: '/contact#discovery' },
  secondaryCta: { label: 'View delivery sprints', href: '#offers' },
};

export const CORPflow_DELIVERY_STEPS = [
  { step: '1', title: 'Discovery call', body: '15 minutes to confirm the problem, channels, and fit for one sprint offer.' },
  { step: '2', title: 'Written quote', body: 'Scope tied to your “success in 72 hours” language. Starting from MUR pricing; final scope after discovery.' },
  { step: '3', title: 'Deposit & verification', body: '50% deposit via manual bank transfer. Work starts after cleared funds are verified — not on screenshot alone.' },
  { step: '4', title: 'Visible delivery', body: 'First working preview or alert path within 24–72 hours after deposit clearance and access.' },
  { step: '5', title: 'Preview & release', body: 'Written preview feedback, then production release only after approval or agreed wait period.' },
];

export const CORPflow_PROOF_EXAMPLE = {
  title: 'Private luxury-access client experience',
  problem:
    'A Mauritius luxury-access brand needed a credible private client surface without exposing operator systems or lead data on the public web.',
  delivered:
    'A tenant-scoped preview experience with curated property presentation, concierge routing, and operator-controlled publishing — delivered as a bounded sprint, not a generic chatbot wrapper.',
  approach:
    'Hook / proof / depth on the public surface; operator workflows and delivery evidence kept behind tenant login and ERPNext records.',
  publicLink: { href: '/client/luxe-maurice-ai', label: 'View public client surface (demo scope)' },
  namedPublication: 'NEEDS_ANTON',
};

/** @returns {import('./rapid-delivery-offers.js').RapidDeliveryOffer[]} */
export function listPublicOffers() {
  return RAPID_DELIVERY_OFFER_SLUGS.map((slug) => RAPID_DELIVERY_OFFERS[slug]).filter(Boolean);
}

export function formatMur(amount) {
  return `MUR ${amount.toLocaleString('en-US')}`;
}

export function buildGeneralDiscoveryMailto() {
  const subject = encodeURIComponent('Discovery conversation — CorpFlowAI delivery sprint');
  const body = encodeURIComponent(
    `Hi CorpFlowAI team,\n\nI would like to book a discovery conversation.\n\nBusiness name:\nProblem to solve:\nHow customers reach us today:\nBest contact number:\n\n`,
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
    { q: 'Do you guarantee more revenue?', a: 'No. We help stop leakage from slow or invisible follow-up. Results depend on your volume and response discipline.' },
    { q: 'When does the 24–72 hour clock start?', a: 'After deposit is manually verified as cleared and we have the agreed access or forwarding path.' },
  ],
  'premium-landing-page-rescue': [
    { q: 'Is this a full website rebuild?', a: 'No. This is a bounded landing-page rescue with one primary conversion goal — not an open-ended redesign.' },
    { q: 'Who approves production release?', a: 'You do, in writing, after preview feedback — or after the agreed reminder period in the quote.' },
    { q: 'Are third-party tools included?', a: 'Core sprint delivery is quoted in MUR. Third-party fees or paid plugins are quoted separately where applicable.' },
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
    'Full multi-page website redesign',
    'Unlimited revision rounds beyond quoted preview cycle',
    'Copywriting for entire brand without client inputs',
    'Payment checkout on the landing page',
  ],
  'customer-reputation-recovery': [
    'Review removal or astroturfing',
    'Legal representation or dispute litigation',
    '24/7 managed social moderation without a separate maintenance quote',
    'Public posting without your approval workflow',
  ],
};
