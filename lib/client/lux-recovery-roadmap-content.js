/**
 * Client-readable LuxeMaurice recovery review content.
 * Sources: docs/LUX/LUXEMAURICE_MVP_SCOPE_RECONCILIATION_V1.md, recovery WBS (plain language for Jan).
 */

export const LUX_RECOVERY_PAGE_TITLE = 'Recovery review';

export const LUX_RECOVERY_PAGE_SUBTITLE = 'Release 1 plan and your first confirmation step';

export const LUX_RECOVERY_SITUATION_PARAGRAPH =
  'LuxeMaurice already has a live platform with the right look and structure — Private Opportunities, private advisory, and a publishing path for your team. What is not finished yet is your real content: homepage photography, one real private opportunity, and the end-to-end journey from a visitor viewing that opportunity to requesting a private consultation. This review focuses on that first complete commercial journey — not on rebuilding everything from the earlier Drive packages as a separate product.';

/** @type {Array<{ label: string, detail: string }>} */
export const LUX_RECOVERY_READY_NOW = [
  {
    label: 'Live brand surface',
    detail: 'Editorial homepage, Private Opportunities directory, opportunity detail pages, and private advisory intake on lux.corpflowai.com.',
  },
  {
    label: 'Publishing workflow',
    detail: 'Authenticated property editor and governed media review before anything goes public.',
  },
  {
    label: 'Operator control plane',
    detail: 'Your team can track recovery work, concierge enquiries, and publishing steps through the change environment.',
  },
  {
    label: 'Recovery programme tracked',
    detail: 'This recovery plan is the controlled path forward — one release at a time, with your sign-off between steps.',
  },
];

export const LUX_RECOVERY_RELEASE1_TITLE = 'Release 1 — First Real Opportunity';

export const LUX_RECOVERY_RELEASE1_SUMMARY =
  'Seven connected steps that prove one complete path: a visitor lands on LuxeMaurice, sees your brand and real imagery, opens one real private opportunity, reads the memorandum, requests a private consultation — and you can manage that opportunity behind the scenes.';

/** @type {Array<{ priority: number, name: string, whatYouSee: string, valueAfter: string, status: 'ready' | 'in_progress' | 'blocked' }>} */
export const LUX_RECOVERY_RELEASE1_PACKAGES = [
  {
    priority: 1,
    name: 'Clean public site',
    whatYouSee: 'No demo or placeholder listings presented as real; the directory shows only genuine content.',
    valueAfter: 'You are not embarrassed by demo listings on Google or the sitemap.',
    status: 'ready',
  },
  {
    priority: 2,
    name: 'Real homepage imagery',
    whatYouSee: 'Your Mauritius photography on the homepage — not empty or generic placeholders.',
    valueAfter: 'The site looks like LuxeMaurice, not a template.',
    status: 'blocked',
  },
  {
    priority: 3,
    name: 'Media and copy approval',
    whatYouSee: 'A clear rule: nothing goes live without your sign-off on images and text.',
    valueAfter: 'You trust that only approved material is public.',
    status: 'in_progress',
  },
  {
    priority: 4,
    name: 'One real private opportunity',
    whatYouSee: 'A single listing in Private Opportunities — your wording, your property.',
    valueAfter: 'You have a real memorandum to review before anything is published.',
    status: 'blocked',
  },
  {
    priority: 5,
    name: 'Opportunity detail page',
    whatYouSee: 'A full memorandum page for that listing — hero, gallery, and advisory link.',
    valueAfter: 'A prospect can browse one real opportunity on the live site once published.',
    status: 'blocked',
  },
  {
    priority: 6,
    name: 'Private advisory enquiry',
    whatYouSee: 'A visitor can request a consultation; the enquiry reaches your team.',
    valueAfter: 'A prospect can reach you through the advisory form.',
    status: 'in_progress',
  },
  {
    priority: 7,
    name: 'Your editor walk-through',
    whatYouSee: 'You log into the property editor, edit the opportunity, and confirm publish works.',
    valueAfter: 'You can update content without waiting on a developer.',
    status: 'blocked',
  },
];

/** @type {Array<{ item: string, why: string }>} */
export const LUX_RECOVERY_JAN_MUST_PROVIDE = [
  {
    item: 'Homepage image package',
    why: 'Minimum four approved images (hero, lifestyle, arrival, owner experience) so the homepage looks finished.',
  },
  {
    item: 'One opportunity',
    why: 'Title, region, description, highlights, and pricing language (on application).',
  },
  {
    item: 'Gallery images for that opportunity',
    why: 'Minimum five images so the memorandum page looks credible.',
  },
  {
    item: 'Alt text and rights for each image',
    why: 'Accessibility and governance.',
  },
  {
    item: 'Written approval to publish',
    why: 'Each image and text on lux.corpflowai.com — nothing goes live without your consent.',
  },
  {
    item: 'One editor session',
    why: 'Log in, review, edit, and confirm publish — proves you can run the platform yourself.',
  },
];

/** @type {string[]} */
export const LUX_RECOVERY_LATER_ITEMS = [
  'Additional opportunities beyond the first listing',
  'Owner portal and executive dashboards',
  'WhatsApp, SMS, and automated email messaging',
  'Formal quotation and invoicing (ERPNext)',
];

/** @type {Array<{ label: string, meaning: string }>} */
export const LUX_RECOVERY_NOT_MVP = [
  {
    label: 'Full v14 / Drive rebuild',
    meaning: 'We do not merge or redeploy the fourteen AI-generated packages as the live product.',
  },
  {
    label: 'IDX / property feed',
    meaning: 'No automatic import from external listing feeds.',
  },
  {
    label: 'Multiple live listings',
    meaning: 'Release 1 is one opportunity; a full catalogue comes later.',
  },
  {
    label: 'Broad marketing automation',
    meaning: 'No bulk campaigns or funnel automation on Lux in this release.',
  },
  {
    label: 'Executive dashboard',
    meaning: 'Internal reporting suite — future phase.',
  },
  {
    label: 'Owner experience portal',
    meaning: 'Invitation-only owner tools — future phase.',
  },
];

/** @type {Array<{ step: string, outcome: string }>} */
export const LUX_RECOVERY_48H_PLAN = [
  {
    step: 'Share this review with you',
    outcome: 'You see what is ready, what we need from you, and what is not in Release 1 — before any new build work.',
  },
  {
    step: 'Capture your product direction confirmation',
    outcome: 'You confirm or correct our understanding of each pillar and set priorities (via the private link your team sends).',
  },
  {
    step: 'Align Release 1 scope with your answers',
    outcome: 'Your team reviews your confirmation and agrees the exact first slice — no random feature fixes.',
  },
  {
    step: 'Request your content package',
    outcome: 'Homepage images + one opportunity draft so Release 1 work can start as soon as you are ready.',
  },
];

export const LUX_RECOVERY_FIRST_DECISION_TITLE = 'First review / approval step';

export const LUX_RECOVERY_FIRST_DECISION_BODY =
  'Please review Release 1 above, then confirm or correct our product direction using the form at the bottom of this page. Your team sends a private one-time link when you are ready to submit — nothing is sent automatically from this page. If you prefer to discuss first, reply to Anton directly; he will mark the review manually.';

export const LUX_RECOVERY_REVIEW_ONLY_NOTE =
  'You can read this recovery plan now. To submit your product direction confirmation, use the private link Anton sends — it includes a secure token and does not require login.';

export const LUX_RECOVERY_EFFORT_NOTE =
  'Timing depends on how quickly approved content arrives. Release 1 is several focused weeks once your image and opportunity package is supplied — not a fixed calendar date.';

/** @param {'ready' | 'in_progress' | 'blocked'} status */
export function luxRecoveryPackageStatusLabel(status) {
  if (status === 'ready') return 'Ready now';
  if (status === 'in_progress') return 'In progress';
  return 'Waiting on content or sign-off';
}
