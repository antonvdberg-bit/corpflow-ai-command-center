/**
 * Client-readable LuxeMaurice recovery review page content (runtime only).
 */

export const LUX_RECOVERY_PAGE_TITLE = 'Recovery review';

export const LUX_RECOVERY_PAGE_SUBTITLE = 'Release 1 — first client-reviewable recovery slice';

export const LUX_RECOVERY_SITUATION_PARAGRAPH =
  'LuxeMaurice already has a live platform with the right look and structure — Private Opportunities, private advisory, and a publishing path for your team. What is not finished yet is your real content: homepage photography, one real private opportunity, and the end-to-end journey from a visitor viewing that opportunity to requesting a private consultation. This review is Release 1 only — not a full platform rebuild.';

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
    detail: 'Your team can track recovery work, concierge enquiries, and publishing steps with operator support.',
  },
];

export const LUX_RECOVERY_RELEASE1_TITLE = 'Release 1';

export const LUX_RECOVERY_RELEASE1_SUMMARY =
  'Seven connected work packages — the first client-reviewable recovery slice. Together they prove one complete path: brand → one real opportunity → advisory enquiry → you can manage it behind the scenes. This is not the full LuxeMaurice platform.';

/** @type {Array<{ priority: number, name: string, whatYouSee: string, status: 'ready' | 'in_progress' | 'waiting_on_content' }>} */
export const LUX_RECOVERY_RELEASE1_PACKAGES = [
  {
    priority: 1,
    name: 'Clean public site',
    whatYouSee: 'No demo or placeholder listings presented as real; the directory shows only genuine content.',
    status: 'ready',
  },
  {
    priority: 2,
    name: 'Real homepage imagery',
    whatYouSee: 'Your Mauritius photography on the homepage — not empty or generic placeholders.',
    status: 'waiting_on_content',
  },
  {
    priority: 3,
    name: 'Media and copy approval',
    whatYouSee: 'A clear rule: nothing goes live without your sign-off on images and text.',
    status: 'in_progress',
  },
  {
    priority: 4,
    name: 'One real private opportunity',
    whatYouSee: 'A single listing in Private Opportunities — your wording, your property.',
    status: 'waiting_on_content',
  },
  {
    priority: 5,
    name: 'Opportunity detail page',
    whatYouSee: 'A full memorandum page for that listing — hero, gallery, and advisory link.',
    status: 'waiting_on_content',
  },
  {
    priority: 6,
    name: 'Private advisory enquiry',
    whatYouSee: 'A visitor can request a consultation; the enquiry reaches your team.',
    status: 'in_progress',
  },
  {
    priority: 7,
    name: 'Your editor walk-through',
    whatYouSee: 'You log into the property editor, edit the opportunity, and confirm publish works.',
    status: 'waiting_on_content',
  },
];

/** @type {Array<{ item: string, why: string }>} */
export const LUX_RECOVERY_JAN_MUST_PROVIDE = [
  { item: 'Homepage images', why: 'Approved photography so the homepage looks finished, not placeholder.' },
  { item: 'One opportunity', why: 'Title, region, description, highlights, and pricing language for your first listing.' },
  { item: 'Gallery', why: 'Images for that opportunity so the memorandum page looks credible.' },
  { item: 'Approvals', why: 'Written consent before any image or text goes live on lux.corpflowai.com.' },
  { item: 'Editor session', why: 'Log in, review, edit, and confirm publish — proves you can run the platform yourself.' },
];

/** @type {Array<{ label: string, meaning: string }>} */
export const LUX_RECOVERY_NOT_MVP = [
  { label: 'Drive rebuild', meaning: 'We do not merge or redeploy AI-generated Drive packages as the live product.' },
  { label: 'IDX', meaning: 'No automatic import from external listing feeds.' },
  { label: 'Multiple listings', meaning: 'Release 1 is one opportunity; a full catalogue comes later.' },
  { label: 'Dashboards', meaning: 'Executive or internal reporting suites — future phase.' },
  { label: 'Automation', meaning: 'No bulk campaigns, messaging automation, or unattended follow-ups in this release.' },
  {
    label: 'Broad advanced platform rebuild',
    meaning: 'No wholesale replacement of the live site with a separate v14-style platform.',
  },
];

/** @type {Array<{ step: string, outcome: string }>} */
export const LUX_RECOVERY_48H_PLAN = [
  { step: 'Share review', outcome: 'You read this recovery roadmap — what is ready, what we need, and what is deferred.' },
  {
    step: 'Capture confirmation',
    outcome: 'If Anton sends a private link, you confirm or request changes on product priorities.',
  },
  { step: 'Align scope', outcome: 'Your team reviews your answers and agrees the exact Release 1 slice.' },
  { step: 'Request content', outcome: 'Homepage images and one opportunity draft so Release 1 work can proceed.' },
];

export const LUX_RECOVERY_FIRST_DECISION_TITLE = 'First decision step';

export const LUX_RECOVERY_FIRST_DECISION_BODY = [
  'Review this recovery roadmap.',
  'If Anton sends a private link, confirm or request changes through that link — nothing is sent automatically from this page.',
  'Anton reviews your response before any production step or client-facing send.',
  'Release 1 build stays gated until your content is supplied and Anton has reviewed your confirmation.',
].join(' ');

export const LUX_RECOVERY_REVIEW_ONLY_NOTE = [
  'This page is review-only: the full recovery roadmap is readable here without a login or private link.',
  'To submit a confirmation or decision, Anton must send you a private one-time link — it is not emailed, texted, or messaged automatically.',
  'No email, WhatsApp, or SMS is sent from this page.',
].join(' ');

/** @param {'ready' | 'in_progress' | 'waiting_on_content'} status */
export function luxRecoveryPackageStatusLabel(status) {
  if (status === 'ready') return 'ready';
  if (status === 'in_progress') return 'in progress';
  return 'waiting on content';
}
