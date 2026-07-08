/**
 * Rapid delivery offer definitions for public /offers/* pages.
 * Docs: docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md
 */

export const RAPID_DELIVERY_OFFER_SLUGS = [
  'ai-lead-rescue',
  'premium-landing-page-rescue',
  'customer-reputation-recovery',
];

/** @typedef {typeof RAPID_DELIVERY_OFFER_SLUGS[number]} RapidDeliveryOfferSlug */

/**
 * @typedef {{
 *   slug: RapidDeliveryOfferSlug,
 *   path: string,
 *   title: string,
 *   headline: string,
 *   subhead: string,
 *   outcome: string,
 *   audience: string[],
 *   deliveredOutputs: string[],
 *   startingPriceMur: number,
 *   depositNote: string,
 *   clientProvides: string[],
 *   deliveryTimeline: string,
 *   proofLanguage: string,
 *   heroBase: string,
 *   heroObjectPosition?: string,
 *   metaDescription: string,
 *   pageLabel: string,
 * }} RapidDeliveryOffer
 */

/** @type {Record<RapidDeliveryOfferSlug, RapidDeliveryOffer>} */
export const RAPID_DELIVERY_OFFERS = {
  'ai-lead-rescue': {
    slug: 'ai-lead-rescue',
    path: '/offers/ai-lead-rescue',
    title: 'AI Lead Rescue Sprint',
    headline: 'Stop losing enquiries because follow-up is slow, scattered, or invisible.',
    subhead:
      'CorpFlowAI connects your lead sources, alerts your team instantly, and gives you a visible daily follow-up path — without rebuilding your entire stack.',
    outcome:
      'Every new enquiry is captured, alerted, and tracked in one accountable workflow so revenue stops leaking between WhatsApp, email, forms, and social messages.',
    audience: [
      'Owner-operators and operations leads at small businesses (roughly 1–20 staff)',
      'Teams receiving enquiries through two or more channels (WhatsApp, website, email, Facebook, marketplaces)',
      'Businesses that feel the pain of missed or delayed replies — not teams shopping for a generic chatbot',
    ],
    deliveredOutputs: [
      'One lead source connected with instant owner/operator alerts',
      'Visible daily lead list and follow-up board your team can use immediately',
      'Documented handover with what was configured and how to operate it day to day',
    ],
    startingPriceMur: 35000,
    depositNote: '50% deposit required before work commences; balance on delivery acceptance.',
    clientProvides: [
      'Business name, primary contact, and how enquiries arrive today',
      'Access credentials or forwarding path for the agreed lead source',
      'A named person who receives alerts and owns follow-up',
    ],
    deliveryTimeline:
      'First visible working output within 24–72 hours after deposit clearance and access confirmation. Full sprint handover within five business days unless scope expands in writing.',
    proofLanguage:
      'Recent Mauritius operators received working alert paths and daily follow-up summaries within 48 hours of deposit clearance — without migrating CRMs or exposing private client details on this page.',
    heroBase: '/assets/visuals/lead-rescue-spa-sunset-hero-v1',
    heroObjectPosition: 'center 40%',
    metaDescription:
      'AI Lead Rescue Sprint from CorpFlowAI — stop losing enquiries across channels. Visible follow-up workflow delivered in 24–72 hours. From MUR 35,000.',
    pageLabel: 'Lead rescue sprint',
  },
  'premium-landing-page-rescue': {
    slug: 'premium-landing-page-rescue',
    path: '/offers/premium-landing-page-rescue',
    title: 'Premium Landing Page Rescue',
    headline: 'Turn a weak landing page into a credible enquiry path — fast.',
    subhead:
      'When your site looks outdated or hides the offer, buyers bounce before they ever reach you. We deliver a premium landing page with clear enquiry capture — not a months-long website project.',
    outcome:
      'A polished, mobile-ready landing page that states your offer clearly, builds trust in seconds, and routes buyer intent into a working enquiry path.',
    audience: [
      'Businesses whose current homepage or landing page under-represents the offer',
      'Operators losing leads because the site is slow, fragmented, or missing a clear next step',
      'Teams that need visible progress this week — not a open-ended redesign',
    ],
    deliveredOutputs: [
      'Premium landing page structure with Hook / Proof / Depth and a single primary CTA',
      'Mobile-ready layout on CorpFlowAI-managed delivery surfaces',
      'Enquiry capture wired to your agreed alert or intake path',
      'Preview link for feedback before production release',
    ],
    startingPriceMur: 45000,
    depositNote: '50% deposit required before design/build commences; balance before production release.',
    clientProvides: [
      'Business name, offer summary, and target buyer in plain language',
      'Logo, brand colours, and any approved photography or proof points',
      'Named approver for preview feedback and production release',
    ],
    deliveryTimeline:
      'First visible preview within 24–72 hours after deposit clearance and asset receipt. Production release after written approval — typically within five business days.',
    proofLanguage:
      'Recent rescue sprints shipped client-visible preview links within 72 hours of deposit clearance — buyers saw progress before final polish, without publishing private client names or private operator systems on this page.',
    heroBase: '/assets/visuals/lead-rescue-property-reception-hero-v1',
    heroObjectPosition: 'center 35%',
    metaDescription:
      'Premium Landing Page Rescue from CorpFlowAI — credible enquiry path delivered in 24–72 hours. From MUR 45,000.',
    pageLabel: 'Landing page rescue',
  },
  'customer-reputation-recovery': {
    slug: 'customer-reputation-recovery',
    path: '/offers/customer-reputation-recovery',
    title: 'Customer Recovery & Reputation Management Sprint',
    headline: 'Respond to complaints and review damage with a visible recovery plan — not panic posts.',
    subhead:
      'When unhappy customers and public reviews stack up, revenue erodes quietly. CorpFlowAI delivers structured recovery responses, escalation paths, and monitoring so your team regains control fast.',
    outcome:
      'A practical recovery operating plan: templated responses, owner escalation rules, review monitoring, and a visible backlog so complaints stop festering in DMs and comment threads.',
    audience: [
      'Businesses facing a spike in negative reviews, unanswered complaints, or refund disputes',
      'Operators where customer issues live across WhatsApp, email, Google reviews, and social DMs',
      'Teams that need accountable response SLAs — not generic “reputation software”',
    ],
    deliveredOutputs: [
      'Recovery response templates aligned to your tone and policy boundaries',
      'Escalation matrix: who responds, when to involve the owner, when to pause public replies',
      'Review and complaint monitoring setup with a visible weekly status summary',
      'Client-facing checklist for onboarding documents needed before ongoing maintenance',
    ],
    startingPriceMur: 45000,
    depositNote: '50% deposit required before recovery work commences; balance on sprint handover.',
    clientProvides: [
      'Recent examples of complaints or reviews (redact customer PII before sharing)',
      'Refund / complaint policy boundaries and who may approve exceptions',
      'Access to review platforms or forwarding path for new alerts',
    ],
    deliveryTimeline:
      'First visible recovery plan and draft templates within 24–72 hours after deposit clearance. Full sprint handover within five business days unless legal review extends scope.',
    proofLanguage:
      'Recent recovery sprints delivered owner-ready response templates and monitoring within 72 hours of deposit clearance — structured visible delivery without publishing private dispute details on this page.',
    heroBase: '/assets/visuals/lead-rescue-spa-sunset-hero-v1',
    heroObjectPosition: 'center 42%',
    metaDescription:
      'Customer Recovery & Reputation Management Sprint from CorpFlowAI — structured response plan in 24–72 hours. From MUR 45,000.',
    pageLabel: 'Reputation recovery sprint',
  },
};

/**
 * @param {string} slug
 * @returns {RapidDeliveryOffer | null}
 */
export function getRapidDeliveryOffer(slug) {
  if (!slug || typeof slug !== 'string') return null;
  return RAPID_DELIVERY_OFFERS[/** @type {RapidDeliveryOfferSlug} */ (slug)] || null;
}

/**
 * @param {RapidDeliveryOffer} offer
 * @returns {string}
 */
export function buildDiscoveryCallMailto(offer) {
  const subject = encodeURIComponent(`Discovery call request — ${offer.title}`);
  const body = encodeURIComponent(
    `Hi CorpFlowAI team,\n\nI would like to request a discovery call about: ${offer.title}\n\nBusiness name:\nHow enquiries / customers reach us today:\nBest contact number:\n\n`,
  );
  return `mailto:support@corpflowai.com?subject=${subject}&body=${body}`;
}
