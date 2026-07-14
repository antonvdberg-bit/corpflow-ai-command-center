import { MERCHANT_WEBSITE } from './merchant-identity.js';

export const INSIGHT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
};

const discoveryCta = {
  label: 'Book a discovery conversation',
  href: 'https://corpflowai.com/contact#discovery',
};

/**
 * Repository-managed editorial content. This deliberately has no database,
 * CMS, or remote content dependency so publication remains reviewable in Git.
 */
const INSIGHT_RECORDS = [
  {
    slug: 'why-small-businesses-lose-leads-after-enquiry-arrives',
    title: 'Why small businesses lose leads after the enquiry arrives',
    summary: 'The problem is often not demand. It is the hand-off between the enquiry, the owner, and the next follow-up.',
    publicationDate: '2026-07-14',
    category: 'Lead response',
    author: 'CorpFlowAI',
    hero: '/assets/visuals/corpflow-home-hero.jpg',
    status: INSIGHT_STATUS.PUBLISHED,
    seoTitle: 'Why small businesses lose leads after enquiries arrive',
    seoDescription: 'A practical look at where small-business enquiries disappear and how to make the next action visible.',
    relatedOffer: 'ai-lead-rescue',
    cta: discoveryCta,
    body: [
      { heading: 'The lead is not lost at the form', paragraphs: ['A customer may send a WhatsApp message, complete a form, reply to an email, or ask a question on social media. The business has demand, but the enquiry has no reliable owner, record, or next action.', 'When follow-up depends on memory, a personal inbox, or a busy owner noticing a notification, it becomes easy to delay. The customer sees silence; the business cannot see what still needs attention.'] },
      { heading: 'Visibility comes before automation', paragraphs: ['The first useful improvement is usually not a new CRM. It is a small, accountable path: capture the enquiry, alert the right person, log the next step, and make overdue follow-up visible.', 'That creates an operating habit a small team can actually maintain. Automation can support the hand-off, but it should not hide responsibility.'] },
      { heading: 'Start with one real channel', paragraphs: ['Choose the channel where enquiries most often disappear. Map what happens from the moment a customer writes to the moment a person follows up. A focused discovery conversation can confirm whether a Lead Rescue Sprint is the right next step.'] },
    ],
  },
  {
    slug: 'what-a-five-day-ai-lead-rescue-sprint-delivers',
    title: 'What a five-day AI Lead Rescue Sprint actually delivers',
    summary: 'A bounded sprint for making one lead-response path visible, accountable, and ready for daily use.',
    publicationDate: '2026-07-14',
    category: 'Delivery sprints',
    author: 'CorpFlowAI',
    hero: '/assets/visuals/lead-rescue-spa-sunset-hero-v1.jpg',
    status: INSIGHT_STATUS.PUBLISHED,
    seoTitle: 'What an AI Lead Rescue Sprint delivers in five days',
    seoDescription: 'What a focused CorpFlowAI Lead Rescue Sprint includes, what it excludes, and how delivery is governed.',
    relatedOffer: 'ai-lead-rescue',
    cta: discoveryCta,
    body: [
      { heading: 'One workflow, not a wholesale replacement', paragraphs: ['The sprint is designed around one agreed lead path. It can connect the selected source, alert the named owner or operator, and make follow-up visible in a practical daily view.', 'It is not a promise to replace every system, build a full CRM, or guarantee revenue. The aim is to make the first missed hand-off easier to see and act on.'] },
      { heading: 'What the team receives', paragraphs: ['Typical outputs include an agreed capture path, an immediate alert for the named person, a visible follow-up list, and a handover explaining how the team operates the workflow.', 'The exact scope is confirmed during discovery. Access, the chosen source, and a person accountable for follow-up are prerequisites for useful delivery.'] },
      { heading: 'How delivery stays controlled', paragraphs: ['CorpFlowAI works through preview, feedback, and approval before production release. This is deliberately slower than publishing an unreviewed change, but it protects the client-facing workflow and creates a clear record of what was accepted.'] },
    ],
  },
  {
    slug: 'website-redesign-needs-conversion-path',
    title: 'Why a website redesign is not enough without a conversion path',
    summary: 'A better-looking page does not solve the buyer’s next-step problem unless the offer and enquiry path are clear.',
    publicationDate: '2026-07-14',
    category: 'Web conversion',
    author: 'CorpFlowAI',
    hero: '/assets/visuals/lead-rescue-property-reception-hero-v1.jpg',
    status: INSIGHT_STATUS.PUBLISHED,
    seoTitle: 'Why a website redesign needs a conversion path',
    seoDescription: 'A practical guide to pairing a credible landing page with a clear enquiry and follow-up path.',
    relatedOffer: 'premium-landing-page-rescue',
    cta: discoveryCta,
    body: [
      { heading: 'Design can clarify, but it cannot decide for the buyer', paragraphs: ['A polished redesign may improve first impressions. It does not automatically tell a visitor what the offer is, who it is for, why it is credible, or what action to take next.', 'If the primary CTA is vague, the contact path is hard to find, or the enquiry disappears after submission, the site still leaves business work unresolved.'] },
      { heading: 'A conversion path has three parts', paragraphs: ['First, the page names a real buyer problem and the outcome. Second, it gives enough proof and implementation detail for a serious evaluator to continue. Third, it routes the visitor into a clear next step that the business can receive and own.', 'This is why CorpFlowAI treats landing-page work as a delivery surface, not just a visual exercise.'] },
      { heading: 'Keep the first decision simple', paragraphs: ['A buyer should be able to request discovery without first navigating payment routes, internal service jargon, or a long menu of options. Scope and commercial details can follow after interest and fit are clear.'] },
    ],
  },
  {
    slug: 'automate-one-workflow-without-replacing-every-system',
    title: 'How to automate one workflow without replacing every system',
    summary: 'Start with the smallest repeatable hand-off that causes real operational friction.',
    publicationDate: '2026-07-14',
    category: 'Operations',
    author: 'CorpFlowAI',
    hero: '/assets/visuals/corpflow-home-hero.jpg',
    status: INSIGHT_STATUS.PUBLISHED,
    seoTitle: 'How to automate one workflow without replacing every system',
    seoDescription: 'A practical, low-risk approach to improving one workflow before considering a broader systems change.',
    relatedOffer: 'ai-lead-rescue',
    cta: discoveryCta,
    body: [
      { heading: 'Do not begin with a platform decision', paragraphs: ['Teams often ask which system should replace everything. A more useful first question is: where does work currently stop moving?', 'A missed hand-off between an enquiry and a response is specific enough to observe, improve, and review. It does not require declaring every existing tool a failure.'] },
      { heading: 'Define the human owner', paragraphs: ['Automation should make the next action easier to see. It should not make responsibility ambiguous. Name who receives the alert, who follows up, what counts as complete, and how exceptions are handled.', 'That simple agreement is the operating design. The technical connection supports it; it does not replace it.'] },
      { heading: 'Use a preview before release', paragraphs: ['A controlled preview lets the team check the workflow with realistic examples before it affects customers. Once the owner confirms the path works, production validation can confirm the real surface behaves as expected.'] },
    ],
  },
  {
    slug: 'what-happens-after-corpflowai-discovery-request',
    title: 'What happens after a CorpFlowAI discovery request',
    summary: 'Discovery is a short fit and scope conversation, not an automatic commitment or payment request.',
    publicationDate: '2026-07-14',
    category: 'Getting started',
    author: 'CorpFlowAI',
    hero: '/assets/visuals/corpflow-home-hero.jpg',
    status: INSIGHT_STATUS.PUBLISHED,
    seoTitle: 'What happens after a CorpFlowAI discovery request',
    seoDescription: 'The practical path from a CorpFlowAI discovery request to an agreed, governed delivery sprint.',
    relatedOffer: 'ai-lead-rescue',
    cta: discoveryCta,
    body: [
      { heading: 'We confirm the problem and fit', paragraphs: ['The first conversation focuses on the work that is being lost, delayed, or made invisible. We discuss the channel, current hand-off, named owner, and the smallest useful outcome.', 'If the problem does not suit a bounded delivery sprint, it is better to say so than to force it into a generic automation project.'] },
      { heading: 'Scope comes before an invoice', paragraphs: ['Where there is a fit, CorpFlowAI sets out the proposed output, dependencies, timing, and commercial terms in writing. Third-party services and expanded scope are discussed separately rather than silently included.', 'No card or bank details are collected on the public discovery page.'] },
      { heading: 'Delivery is governed', paragraphs: ['Once scope and payment clearance are confirmed, work moves through preview, feedback, approval, and production validation. The client has a clear point to review before a customer-facing change is released.'] },
    ],
  },
  {
    slug: 'why-corpflowai-uses-preview-approval-production-validation',
    title: 'Why CorpFlowAI uses preview, approval and production validation',
    summary: 'Customer-facing changes need more than a local build or a screenshot to be considered ready.',
    publicationDate: '2026-07-14',
    category: 'Delivery governance',
    author: 'CorpFlowAI',
    hero: '/assets/visuals/corpflow-home-hero.jpg',
    status: INSIGHT_STATUS.PUBLISHED,
    seoTitle: 'Why CorpFlowAI uses preview, approval and production validation',
    seoDescription: 'Why preview, approval, and real production checks protect customer-facing CorpFlowAI delivery.',
    relatedOffer: 'premium-landing-page-rescue',
    cta: discoveryCta,
    body: [
      { heading: 'A preview is a safe place to decide', paragraphs: ['A preview lets the client inspect the intended change before it reaches the live site or workflow. It makes feedback concrete and reduces the chance that an assumption becomes a public problem.', 'Approval records the decision to proceed. It does not replace the final check.'] },
      { heading: 'Production is a different environment', paragraphs: ['A route can work locally and still fail because of deployment, hosting, environment, or edge-routing differences. That is why CorpFlowAI checks the real production URL and expected behaviour after release.', 'A healthy internal status endpoint is useful evidence, but it is not proof that the client-facing page works.'] },
      { heading: 'The result is accountable delivery', paragraphs: ['This sequence is intended to make releases calmer: review what is changing, approve it deliberately, deploy it, then verify the real surface. It is a practical control, not ceremony for its own sake.'] },
    ],
  },
  {
    slug: 'when-business-not-ready-for-automation',
    title: 'When a business is not ready for automation',
    summary: 'Automation is not the next step when the owner, rules, or current workflow are still undefined.',
    publicationDate: '2026-07-14',
    category: 'Operations',
    author: 'CorpFlowAI',
    hero: '/assets/visuals/corpflow-home-hero.jpg',
    status: INSIGHT_STATUS.PUBLISHED,
    seoTitle: 'When a business is not ready for automation',
    seoDescription: 'Signs that a business should clarify an operating workflow before trying to automate it.',
    relatedOffer: 'customer-reputation-recovery',
    cta: discoveryCta,
    body: [
      { heading: 'The workflow changes every time', paragraphs: ['If nobody can explain what should happen after an enquiry, complaint, or request arrives, automation will only formalise the confusion. Start by agreeing the minimum steps and exceptions.', 'A small manual checklist can be the right first deliverable when the process is still taking shape.'] },
      { heading: 'There is no accountable owner', paragraphs: ['An alert without a named recipient is just another notification. Before automating, identify who receives the work, who can make decisions, and when escalation is needed.', 'This protects both the customer experience and the internal team from a workflow that looks active but has no real owner.'] },
      { heading: 'The smallest next step may be a discovery conversation', paragraphs: ['Being not ready for automation is not a failure. It is useful clarity. CorpFlowAI can help assess whether a focused delivery sprint is appropriate or whether the business should first define its operating rules.'] },
    ],
  },
  {
    slug: 'what-payment-clearance-means-before-delivery-begins',
    title: 'What payment clearance means before delivery begins',
    summary: 'A proof-of-payment screenshot is not the same as a cleared, allocated, reconciled payment.',
    publicationDate: '2026-07-14',
    category: 'Commercial process',
    author: 'CorpFlowAI',
    hero: '/assets/visuals/corpflow-home-hero.jpg',
    status: INSIGHT_STATUS.PUBLISHED,
    seoTitle: 'What payment clearance means before CorpFlowAI delivery begins',
    seoDescription: 'Why CorpFlowAI starts delivery only after bank credit, payment allocation, and reconciliation are confirmed.',
    relatedOffer: 'ai-lead-rescue',
    cta: discoveryCta,
    body: [
      { heading: 'Clearance is a three-part control', paragraphs: ['Before delivery may start, CorpFlowAI requires all three conditions: BANK CREDIT + ALLOCATED PAYMENT ENTRY + RECONCILIATION. Bank credit confirms funds arrived; allocation connects them to the correct commercial record; reconciliation confirms the records agree.', 'This protects both sides from beginning work on a payment that is pending, misdirected, or not yet matched to the agreed scope.'] },
      { heading: 'A POP screenshot alone is insufficient', paragraphs: ['A proof-of-payment screenshot can be useful supporting information, but it is not clearance by itself. It does not prove that the funds have credited, that the right payment entry has been allocated, or that the payment has been reconciled.', 'The delivery clock starts after clearance and the agreed access or inputs are available.'] },
      { heading: 'Why the rule is explicit', paragraphs: ['The rule avoids uncertainty about when a sprint is authorised to begin. Once payment clearance and scope are confirmed, the team can move into the agreed preview and delivery process with a clear audit trail.'] },
    ],
  },
];

export const INSIGHTS = INSIGHT_RECORDS.map((insight) => ({
  ...insight,
  canonicalUrl: `${MERCHANT_WEBSITE}/insights/${insight.slug}`,
  videoEmbed: null,
}));

export const VIDEO_LIBRARY = [
  {
    slug: 'how-corpflowai-delivery-sprints-work',
    title: 'How CorpFlowAI delivery sprints work',
    summary: 'A short introduction to discovery, scoped delivery, preview, approval, and production validation.',
    category: 'Getting started',
    poster: '/assets/visuals/corpflow-home-hero.jpg',
    youtubeUrl: '',
    status: 'coming_soon',
    relatedOffers: ['ai-lead-rescue', 'premium-landing-page-rescue', 'customer-reputation-recovery'],
  },
  {
    slug: 'making-lead-follow-up-visible',
    title: 'Making lead follow-up visible',
    summary: 'What a focused lead-response workflow is designed to make visible for a small business team.',
    category: 'Lead response',
    poster: '/assets/visuals/lead-rescue-spa-sunset-hero-v1.jpg',
    youtubeUrl: '',
    status: 'coming_soon',
    relatedOffers: ['ai-lead-rescue'],
  },
  {
    slug: 'from-preview-to-production-validation',
    title: 'From preview to production validation',
    summary: 'Why customer-facing delivery includes review and real URL verification after deployment.',
    category: 'Delivery governance',
    poster: '/assets/visuals/lead-rescue-property-reception-hero-v1.jpg',
    youtubeUrl: '',
    status: 'coming_soon',
    relatedOffers: ['premium-landing-page-rescue', 'customer-reputation-recovery'],
  },
];

export function getInsightBySlug(slug) {
  return INSIGHTS.find((insight) => insight.slug === slug) || null;
}

export function listPublishedInsights() {
  return INSIGHTS.filter((insight) => insight.status === INSIGHT_STATUS.PUBLISHED).sort(
    (a, b) => new Date(b.publicationDate) - new Date(a.publicationDate),
  );
}

export function listInsightsForStaticPaths() {
  return INSIGHTS.filter((insight) => insight.status === INSIGHT_STATUS.PUBLISHED);
}

export function getInsightCanonical(insight) {
  return `${MERCHANT_WEBSITE}/insights/${insight.slug}`;
}

export function getVideosForOffer(offerSlug) {
  return VIDEO_LIBRARY.filter((video) => video.relatedOffers.includes(offerSlug));
}
