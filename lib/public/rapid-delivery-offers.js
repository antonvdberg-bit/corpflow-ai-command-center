/**
 * Rapid delivery offer definitions for public /offers/* pages.
 * Docs: docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md
 */

import {
  ENQUIRY_RECOVERY_DEPOSIT_LINE,
  ENQUIRY_RECOVERY_OFFER_NAME,
  ENQUIRY_RECOVERY_PREVIEW_LINE,
  ENQUIRY_RECOVERY_PRICE_MUR,
  ENQUIRY_RECOVERY_SCARCITY_LINE,
} from './enquiry-recovery-sprint.js';

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
 *   priceIsFixed?: boolean,
 *   primaryCtaLabel?: string,
 *   engagementFlow?: string,
 *   deliverySectionTitle?: string,
 *   foundingNote?: string,
 *   depositNote: string,
 *   clientProvides: string[],
 *   deliveryTimeline: string,
 *   proofLanguage: string,
 *   heroBase: string,
 *   heroObjectPosition?: string,
 *   metaDescription: string,
 *   pageLabel: string,
 *   demoPath?: string,
 *   beforeAfter?: { before: string[], after: string[] },
 * }} RapidDeliveryOffer
 */

/** @type {Record<RapidDeliveryOfferSlug, RapidDeliveryOffer>} */
export const RAPID_DELIVERY_OFFERS = {
  'ai-lead-rescue': {
    slug: 'ai-lead-rescue',
    path: '/offers/ai-lead-rescue',
    title: ENQUIRY_RECOVERY_OFFER_NAME,
    headline: 'Some of your best enquiries probably didn\'t say no. They just stopped being followed up.',
    subhead:
      'You already paid to generate the enquiry. CorpFlowAI helps selected Mauritius businesses identify and recover valuable enquiries that have gone quiet — without replacing the tools you already use.',
    outcome:
      'Follow-up becomes visible to the owner. Quiet enquiries are identified so revenue is less likely to leak between WhatsApp, phone, website, email, Facebook, and individual staff.',
    audience: [
      'Owner-led Mauritius service businesses, generally around 5–30 staff',
      'Professional / technical services, real estate and high-value property services, boutique hospitality and experience businesses with direct enquiries',
      'Businesses where one converted enquiry is materially valuable and follow-up is not always consistent',
    ],
    deliveredOutputs: [
      'A 15-minute commercial diagnosis of whether recovery is worth doing',
      'A written offer if the case qualifies',
      'Visible follow-up so valuable enquiries are less likely to be forgotten',
    ],
    startingPriceMur: ENQUIRY_RECOVERY_PRICE_MUR,
    priceIsFixed: true,
    primaryCtaLabel: 'Request a 15-minute Enquiry Recovery Diagnosis',
    foundingNote: ENQUIRY_RECOVERY_SCARCITY_LINE,
    engagementFlow:
      '15-minute diagnosis → written offer → MUR 51,000 (60%) deposit via manual bank transfer → access and assets → targeted first preview within 72 hours of those three being in place → approved preview → MUR 34,000 (40%) before production release.',
    deliverySectionTitle: 'First visible preview after deposit, access, and assets',
    depositNote: `${ENQUIRY_RECOVERY_DEPOSIT_LINE} Currency and payment instructions are confirmed on the invoice before you pay.`,
    clientProvides: [
      'How enquiries arrive today and who owns follow-up',
      'Required access and assets once the case qualifies',
      'Owner or commercial manager participation in diagnosis',
    ],
    deliveryTimeline: ENQUIRY_RECOVERY_PREVIEW_LINE,
    proofLanguage:
      'CorpFlowAI is Mauritius-based and works with selected owner-led businesses. We do not guarantee new revenue. We help identify quiet enquiries and make follow-up visible.',
    heroBase: '/assets/visuals/lead-rescue-spa-sunset-hero-v1',
    heroObjectPosition: 'center 40%',
    metaDescription:
      'Enquiry Recovery Sprint from CorpFlowAI — recover valuable quiet enquiries. MUR 85,000 fixed. Maximum three founding clients. Request a 15-minute Enquiry Recovery Diagnosis.',
    pageLabel: 'Enquiry recovery sprint',
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
    depositNote:
      '50% deposit in MUR via manual bank transfer (ERPNext invoice) before design/build; balance before production release. Currency and payment instructions are confirmed on the invoice before you pay.',
    clientProvides: [
      'Business name, offer summary, and target buyer in plain language',
      'Logo, brand colours, and any approved photography or proof points',
      'Named approver for preview feedback and production release',
    ],
    deliveryTimeline:
      'First visible preview within 24–72 hours after deposit clearance and asset receipt. Production release after written approval — typically within five business days.',
    proofLanguage:
      'CorpFlowAI delivers client-visible landing-page previews on managed surfaces before production release, without publishing private client names or private operator systems on this page.',
    heroBase: '/assets/visuals/lead-rescue-property-reception-hero-v1',
    heroObjectPosition: 'center 35%',
    metaDescription:
      'Premium Landing Page Rescue from CorpFlowAI — credible enquiry path delivered in 24–72 hours. From MUR 45,000.',
    pageLabel: 'Landing page rescue',
    demoPath: '/demo/website-rescue',
    beforeAfter: {
      before: [
        'Outdated or cluttered homepage that hides the offer',
        'No obvious next step on mobile',
        'Enquiry path missing, broken, or unclear',
      ],
      after: [
        'One landing with clear Hook / Proof / Depth',
        'Single primary buyer-action CTA',
        'Mobile-ready preview and a tested enquiry path before go-live',
      ],
    },
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
    depositNote:
      '50% deposit in MUR via manual bank transfer (ERPNext invoice) before recovery work; balance on sprint handover. Currency and payment instructions are confirmed on the invoice before you pay.',
    clientProvides: [
      'Recent examples of complaints or reviews (redact customer PII before sharing)',
      'Refund / complaint policy boundaries and who may approve exceptions',
      'Access to review platforms or forwarding path for new alerts',
    ],
    deliveryTimeline:
      'First visible recovery plan and draft templates within 24–72 hours after deposit clearance. Full sprint handover within five business days unless legal review extends scope.',
    proofLanguage:
      'CorpFlowAI delivers structured recovery templates and monitoring workflows for operator review, without publishing private dispute details on this page.',
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
