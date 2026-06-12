/**
 * LuxeMaurice Content Population Sprint — per-child guidance + checklist scaffolding.
 * Used by the `/change` operator desk (`pages/change.js`) to render the Add content
 * panel and the content checklist on sprint tickets C1–C4 instead of the generic
 * Intake / Clarify / Draft / Review / Build workflow buttons (which still exist,
 * but collapsed under "Advanced workflow state").
 *
 * Sprint linkage carried by every sprint child ticket:
 *   - `console_json.parent_sprint_ticket = cmqa2y2ga0000l704glnfro1f`
 *   - `console_json.parent_programme_ticket = cmo8mjijk0000jl04l1jz0v6d`
 *   - `console_json.lux_request_meta.sprint_code = 'C1'|'C2'|'C3'|'C4'`
 *
 * The `ticket-get` API surfaces these as `ticket.lux_sprint_meta` for non-admin
 * operators (no raw console_json exposure).
 *
 * Checklist persistence: this v1 ships as **derived operator guidance only**. Per
 * the user's instruction in PR #347 ("If checklist persistence is not already
 * available, implement first as derived/operator guidance and document
 * persistence as follow-up."), no DB schema change is made. Checked state lives
 * in component-local state for the session only. Persistence to
 * `console_json.lux_content_sprint_checklist[]` is documented as a follow-up in
 * `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` § 8b.
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 * }} LuxContentSprintChecklistItem
 */

/**
 * @typedef {{
 *   code: 'C1' | 'C2' | 'C3' | 'C4',
 *   panelTitle: string,
 *   shortLine: string,
 *   uploadSteps: string[],
 *   taskGuidance: string[],
 *   checklist: LuxContentSprintChecklistItem[],
 *   primaryCtaLabel: string,
 *   secondaryGuidance: string,
 * }} LuxContentSprintGuidance
 */

const PRIMARY_CTA_DEFAULT = 'Upload content';
const SECONDARY_GUIDANCE_DEFAULT =
  'Use this for homepage imagery, opportunity galleries, brochures, and owner-experience visuals.';

const COMMON_UPLOAD_STEPS = Object.freeze([
  'Upload images, videos, or documents',
  'Mark reviewed when approved',
  'Link images to a private opportunity or homepage placement',
  'Publish only approved public imagery',
  'Verify the live page',
]);

/** @type {Record<'C1'|'C2'|'C3'|'C4', LuxContentSprintGuidance>} */
const GUIDANCE_BY_CODE = {
  C1: {
    code: 'C1',
    panelTitle: 'Add content — C1 Homepage Imagery',
    shortLine:
      'Replace placeholder graphics on the LuxeMaurice homepage with real, client-approved imagery.',
    uploadSteps: [...COMMON_UPLOAD_STEPS],
    taskGuidance: [
      'Upload hero image',
      'Upload strategic Mauritius images (coastline, marina, plateau, private aviation)',
      'Upload owner-experience imagery (architect, finish, interior review)',
      'Mark reviewed when each image is approved',
      'Ask operator to place approved images on the matching homepage section',
    ],
    checklist: [
      { id: 'c1-hero', label: 'Hero image supplied' },
      { id: 'c1-strategic', label: 'Strategic Mauritius images supplied' },
      { id: 'c1-owner', label: 'Owner Experience images supplied' },
      { id: 'c1-uploaded', label: 'Images uploaded' },
      { id: 'c1-reviewed', label: 'Images reviewed' },
      { id: 'c1-placed', label: 'Images placed on homepage' },
      { id: 'c1-verified', label: 'Homepage verified on lux.corpflowai.com/' },
    ],
    primaryCtaLabel: PRIMARY_CTA_DEFAULT,
    secondaryGuidance: SECONDARY_GUIDANCE_DEFAULT,
  },
  C2: {
    code: 'C2',
    panelTitle: 'Add content — C2 First Real Private Opportunity',
    shortLine:
      'Create and publish the first real opportunity in /properties/admin with minimum five approved images.',
    uploadSteps: [...COMMON_UPLOAD_STEPS],
    taskGuidance: [
      'Create or update the opportunity in /properties/admin (title, slug, region, type, status, teaser, advisory notes)',
      'Upload a minimum of five approved images',
      'Link uploaded media to the opportunity (hero / card / gallery roles)',
      'Publish only the approved images',
      'Verify the live opportunity page on lux.corpflowai.com/property/<slug>',
    ],
    checklist: [
      { id: 'c2-created', label: 'Real opportunity created' },
      { id: 'c2-copy', label: 'Opportunity copy added (teaser, advisory notes)' },
      { id: 'c2-images', label: 'Minimum 5 images uploaded' },
      { id: 'c2-reviewed', label: 'Images reviewed' },
      { id: 'c2-linked', label: 'Hero / card / gallery linked' },
      { id: 'c2-published', label: 'Opportunity published' },
      { id: 'c2-verified', label: 'Public page verified on lux.corpflowai.com' },
    ],
    primaryCtaLabel: PRIMARY_CTA_DEFAULT,
    secondaryGuidance: SECONDARY_GUIDANCE_DEFAULT,
  },
  C3: {
    code: 'C3',
    panelTitle: 'Add content — C3 Governed Public Gallery',
    shortLine:
      'Curate the approved public gallery for the first opportunity — captions, alt text, placement, demo media removed.',
    uploadSteps: [...COMMON_UPLOAD_STEPS],
    taskGuidance: [
      'Review uploaded media for the first opportunity',
      'Link each approved image to the matching property slug',
      'Set hero / card / gallery placement',
      'Add captions and alt text where required',
      'Publish approved images and confirm no demo / test media is visible',
    ],
    checklist: [
      { id: 'c3-selected', label: 'Gallery images selected' },
      { id: 'c3-captions', label: 'Captions / alt text added' },
      { id: 'c3-verified', label: 'Published imagery verified on live page' },
      { id: 'c3-no-demo', label: 'No demo / test media visible' },
    ],
    primaryCtaLabel: PRIMARY_CTA_DEFAULT,
    secondaryGuidance: SECONDARY_GUIDANCE_DEFAULT,
  },
  C4: {
    code: 'C4',
    panelTitle: 'Add content — C4 Commercial Validation',
    shortLine:
      'Walk Jan + Anton through every public surface and record the Reality Gate sign-off.',
    uploadSteps: [...COMMON_UPLOAD_STEPS],
    taskGuidance: [
      'Open lux.corpflowai.com/ and review the homepage',
      'Open lux.corpflowai.com/properties and confirm only real / empty-state content',
      'Open lux.corpflowai.com/property/<real-slug> and confirm gallery + copy',
      'Open lux.corpflowai.com/concierge?property=<real-slug> and confirm seeding',
      'Capture Jan + Anton sign-off and record the Reality Gate verdict',
    ],
    checklist: [
      { id: 'c4-home', label: 'Jan reviewed homepage' },
      { id: 'c4-property', label: 'Jan reviewed property page' },
      { id: 'c4-anton', label: 'Anton reviewed' },
      { id: 'c4-concierge', label: 'Concierge path tested' },
      { id: 'c4-gate', label: 'Reality Gate recorded' },
    ],
    primaryCtaLabel: PRIMARY_CTA_DEFAULT,
    secondaryGuidance: SECONDARY_GUIDANCE_DEFAULT,
  },
};

/**
 * @param {unknown} code
 * @returns {'C1' | 'C2' | 'C3' | 'C4' | null}
 */
export function normalizeLuxContentSprintCode(code) {
  if (code == null) return null;
  const s = String(code).trim().toUpperCase();
  if (s === 'C1' || s === 'C2' || s === 'C3' || s === 'C4') return s;
  return null;
}

/**
 * @param {unknown} code
 * @returns {LuxContentSprintGuidance | null}
 */
export function getLuxContentSprintGuidance(code) {
  const n = normalizeLuxContentSprintCode(code);
  if (!n) return null;
  return GUIDANCE_BY_CODE[n];
}

/**
 * @param {unknown} sprintMeta — typically `ticket.lux_sprint_meta` from `ticket-get`
 * @returns {boolean}
 */
export function isLuxContentSprintTicket(sprintMeta) {
  if (!sprintMeta || typeof sprintMeta !== 'object') return false;
  return normalizeLuxContentSprintCode(sprintMeta.sprint_code) != null;
}

/** Generic upload guidance for sprint tickets that lack a recognised C-code. */
export const LUX_CONTENT_SPRINT_GENERIC_GUIDANCE = Object.freeze({
  panelTitle: 'Add content',
  shortLine: 'Attach client-approved images, videos, or documents to this sprint task.',
  uploadSteps: [...COMMON_UPLOAD_STEPS],
  primaryCtaLabel: PRIMARY_CTA_DEFAULT,
  secondaryGuidance: SECONDARY_GUIDANCE_DEFAULT,
});
