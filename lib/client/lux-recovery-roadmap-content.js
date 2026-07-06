/**
 * Client-readable LuxeMaurice recovery MVP roadmap content.
 * Source: docs/LUX/LUXEMAURICE_MVP_SCOPE_RECONCILIATION_V1.md (PR #542).
 * Plain language for Jan — no internal governance jargon.
 */

export const LUX_RECOVERY_RELEASE1_TITLE = 'Release 1 — First Real Opportunity';

export const LUX_RECOVERY_RELEASE1_SUMMARY =
  'Seven connected steps that prove one complete path: a visitor lands on LuxeMaurice, sees your brand and real imagery, opens one real private opportunity, reads the memorandum, requests a private consultation — and you can manage that opportunity behind the scenes.';

export const LUX_RECOVERY_SITUATION_PARAGRAPH =
  'LuxeMaurice already has a live platform with the right look and structure — Private Opportunities, private advisory, and a publishing path for your team. What is not finished yet is your real content: homepage photography, one real private opportunity, and the end-to-end journey from a visitor viewing that opportunity to requesting a private consultation. This plan focuses on that first complete commercial journey — not on rebuilding everything from the earlier Drive packages as a separate product.';

/** @type {Array<{ priority: number, name: string, whatYouSee: string, valueAfter: string }>} */
export const LUX_RECOVERY_RELEASE1_PACKAGES = [
  {
    priority: 1,
    name: 'Clean public site',
    whatYouSee: 'No demo or placeholder listings presented as real; the directory shows only genuine content.',
    valueAfter: 'You are not embarrassed by demo listings on Google or the sitemap.',
  },
  {
    priority: 2,
    name: 'Real homepage imagery',
    whatYouSee: 'Your Mauritius photography on the homepage — not empty or generic placeholders.',
    valueAfter: 'The site looks like LuxeMaurice, not a template.',
  },
  {
    priority: 3,
    name: 'Media and copy approval',
    whatYouSee: 'A clear rule: nothing goes live without your sign-off on images and text.',
    valueAfter: 'You trust that only approved material is public.',
  },
  {
    priority: 4,
    name: 'One real private opportunity',
    whatYouSee: 'A single listing in Private Opportunities — your wording, your property.',
    valueAfter: 'You have a real memorandum to review before anything is published.',
  },
  {
    priority: 5,
    name: 'Opportunity detail page',
    whatYouSee: 'A full memorandum page for that listing — hero, gallery, and advisory link.',
    valueAfter: 'A prospect can browse one real opportunity on the live site once published.',
  },
  {
    priority: 6,
    name: 'Private advisory enquiry',
    whatYouSee: 'A visitor can request a consultation; the enquiry reaches your team.',
    valueAfter: 'A prospect can reach you through the advisory form.',
  },
  {
    priority: 7,
    name: 'Your editor walk-through',
    whatYouSee: 'You log into the property editor, edit the opportunity, and confirm publish works.',
    valueAfter: 'You can update content without waiting on a developer.',
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
  { label: 'Full v14 / Drive rebuild', meaning: 'We do not merge or redeploy the fourteen AI-generated packages as the live product.' },
  { label: 'IDX / property feed', meaning: 'No automatic import from external listing feeds.' },
  { label: 'Multiple live listings', meaning: 'Release 1 is one opportunity; a full catalogue comes later.' },
  { label: 'Broad marketing automation', meaning: 'No bulk campaigns or funnel automation on Lux in this release.' },
];

export const LUX_RECOVERY_EFFORT_NOTE =
  'Timing depends on how quickly approved content arrives. Release 1 is several focused weeks once your image and opportunity package is supplied — not a fixed calendar date.';
