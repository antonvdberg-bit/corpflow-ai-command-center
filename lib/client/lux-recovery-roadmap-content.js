/**
 * Client-readable LuxeMaurice recovery review page content (runtime only).
 * Scoped to active recovery ticket cmr7a244f0000l505x5vne2s0 — alignment, not listing-platform delivery.
 */

export const LUX_RECOVERY_PAGE_TITLE = 'Recovery review';

export const LUX_RECOVERY_PAGE_SUBTITLE = 'Release 1 — recovery alignment for what happens next';

export const LUX_RECOVERY_SITUATION_PARAGRAPH =
  'This page aligns the LuxeMaurice recovery programme: what you can review now, what is waiting on you, and what stays outside the first MVP. It is a recovery alignment review — not a promise that CorpFlowAI is immediately delivering a full public listing platform.';

/** @type {Array<{ label: string, detail: string }>} */
export const LUX_RECOVERY_READY_NOW = [
  {
    label: 'Recovery review page',
    detail:
      'A private, client-safe roadmap page showing the agreed recovery direction, what is ready to review, what is waiting on you, and what remains outside the first MVP.',
  },
  {
    label: 'Operator preview access from /change',
    detail: 'Anton can open this recovery review from the active ticket and manage the review process from the operator control plane.',
  },
  {
    label: 'Manual / private decision-link model',
    detail:
      'You can read this page now. If Anton sends a private one-time link, you can confirm or request changes — nothing is emailed, texted, or messaged automatically.',
  },
];

export const LUX_RECOVERY_RELEASE1_TITLE = 'Release 1';

export const LUX_RECOVERY_RELEASE1_SUMMARY =
  'Seven recovery work packages for this ticket — how we align direction, lock scope, and open the next bounded build packet. This is recovery alignment, not an immediate full platform build.';

/** @type {Array<{ priority: number, name: string, whatYouSee: string, status: 'ready' | 'in_progress' | 'waiting_on_content' | 'waiting_on_confirmation' | 'waiting_on_approval' }>} */
export const LUX_RECOVERY_RELEASE1_PACKAGES = [
  {
    priority: 1,
    name: 'Recovery review page',
    whatYouSee:
      'A private, client-safe roadmap page that shows the agreed recovery direction, what is ready to review, what is waiting on Jan, and what remains outside the first MVP.',
    status: 'ready',
  },
  {
    priority: 2,
    name: 'Operator control in /change',
    whatYouSee:
      'Anton can open the recovery review from the active ticket and manage the review process from the CorpFlowAI operator control plane.',
    status: 'ready',
  },
  {
    priority: 3,
    name: 'Decision confirmation flow',
    whatYouSee:
      'Jan can review the roadmap now. If Anton sends a private decision link, Jan can confirm or request changes using the existing safe decision flow.',
    status: 'in_progress',
  },
  {
    priority: 4,
    name: 'Client content inputs',
    whatYouSee:
      'Jan still needs to provide or approve the content inputs needed for the next build slice, including imagery, copy direction, and any specific opportunity details she wants prioritised.',
    status: 'waiting_on_content',
  },
  {
    priority: 5,
    name: 'Scope lock for first MVP',
    whatYouSee:
      'The first MVP scope is being narrowed to the next reviewable delivery slice so old Drive rebuilds, broad dashboards, IDX, full automation, and multi-listing expansion do not contaminate the immediate build.',
    status: 'in_progress',
  },
  {
    priority: 6,
    name: 'Jan approval checkpoint',
    whatYouSee:
      'Release 1 only proceeds after Jan confirms the recovery direction and Anton reviews the confirmation. No production or client-send step happens automatically.',
    status: 'waiting_on_confirmation',
  },
  {
    priority: 7,
    name: 'Next build packet',
    whatYouSee:
      'After confirmation, CorpFlowAI opens the next bounded runtime build packet with clear owner, route, preview evidence, stale threshold, and approval gates.',
    status: 'waiting_on_approval',
  },
];

/** @type {Array<{ item: string, why: string }>} */
export const LUX_RECOVERY_JAN_MUST_PROVIDE = [
  {
    item: 'Confirm recovery direction',
    why: 'Tell us whether this recovery alignment matches what you want CorpFlowAI to do next.',
  },
  {
    item: 'Confirm content inputs for the next slice',
    why:
      'Say which images, copy direction, and opportunity details (if any) should be used in the next build — these are future inputs, not what this page delivers today.',
  },
  {
    item: 'Confirm what must stay out of MVP',
    why: 'Flag anything you agree should remain deferred (Drive rebuild, IDX, dashboards, automation, multi-listing expansion).',
  },
  {
    item: 'Confirm review and sign-off',
    why: 'Name who reviews confirmations and signs off before the next build packet opens.',
  },
];

/** @type {Array<{ label: string, meaning: string }>} */
export const LUX_RECOVERY_NOT_MVP = [
  { label: 'Drive rebuild', meaning: 'We do not merge or redeploy AI-generated Drive packages as the live product.' },
  { label: 'IDX', meaning: 'No automatic import from external listing feeds.' },
  { label: 'Multiple listings', meaning: 'Multi-listing catalogue expansion stays outside this recovery alignment.' },
  { label: 'Dashboards', meaning: 'Executive or internal reporting suites — future phase.' },
  { label: 'Automation', meaning: 'No bulk campaigns, messaging automation, or unattended follow-ups in this release.' },
  {
    label: 'Broad advanced platform rebuild',
    meaning: 'No wholesale replacement of the live site with a separate v14-style platform.',
  },
];

/** @type {Array<{ step: string, outcome: string }>} */
export const LUX_RECOVERY_48H_PLAN = [
  { step: 'Anton reviews this preview', outcome: 'Operator checks the recovery review page and /change controls before sharing with you.' },
  { step: 'Jan reviews the roadmap', outcome: 'You read Release 1, what is ready, what is waiting, and what is excluded from MVP.' },
  {
    step: 'Jan confirms or requests changes',
    outcome: 'If Anton sends a private link, you submit confirmation or corrections through that link only.',
  },
  {
    step: 'Next bounded build packet',
    outcome: 'CorpFlowAI turns the confirmed direction into the next bounded runtime build packet with clear gates.',
  },
];

export const LUX_RECOVERY_FIRST_DECISION_TITLE = 'First decision step';

export const LUX_RECOVERY_FIRST_DECISION_BODY = [
  'This page is for recovery alignment — agreeing what CorpFlowAI does next on this ticket.',
  'No production deploy or external send happens automatically from this page.',
  'Release 1 build remains gated until Jan confirms the recovery direction and Anton reviews that confirmation.',
].join(' ');

export const LUX_RECOVERY_REVIEW_ONLY_NOTE = [
  'This page is review-only: the full recovery roadmap is readable here without a login or private link.',
  'To submit a confirmation or decision, Anton must send you a private one-time link — it is not emailed, texted, or messaged automatically.',
  'No email, WhatsApp, or SMS is sent from this page.',
].join(' ');

/** Forbidden legacy listing-platform package titles (must not reappear). */
export const LUX_RECOVERY_FORBIDDEN_PACKAGE_TITLES = [
  'Clean public site',
  'Real homepage imagery',
  'One real private opportunity',
  'Opportunity detail page',
  'Your editor walk-through',
];

/**
 * @param {'ready' | 'in_progress' | 'waiting_on_content' | 'waiting_on_confirmation' | 'waiting_on_approval'} status
 */
export function luxRecoveryPackageStatusLabel(status) {
  if (status === 'ready') return 'ready';
  if (status === 'in_progress') return 'in progress';
  if (status === 'waiting_on_confirmation') return 'waiting on confirmation';
  if (status === 'waiting_on_approval') return 'waiting on approval';
  return 'waiting on content';
}
