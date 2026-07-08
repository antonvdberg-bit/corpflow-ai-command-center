/**
 * LuxeMaurice AI — new product feedback delivery queue (operator control, config-backed).
 *
 * Active baseline: multi-channel private-access product at /client/luxe-maurice-ai.
 * NOT the old property-only Lux website stream. Historical #529 recovery items are
 * kept separately and must not drive the next delivery slice unless they directly
 * affect the new LuxeMaurice AI product.
 */

export const LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE = '/client/luxe-maurice-ai';

export const LUX_OWNER_FEEDBACK_ACTIVE_BASELINE_BANNER =
  'Active baseline: new multi-channel private-access LuxeMaurice AI product. Not the old property-only Lux site.';

export const LUX_OWNER_FEEDBACK_QUEUE_META = {
  pageTitle: 'LuxeMaurice AI — New Product Feedback Queue',
  activeProductSurface: LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE,
  historicalContextIssue: '#529',
  prSlice: '#580',
  lastUpdated: '2026-07-08',
  dataSource: 'anton_product_baseline_clarification_2026_07_08',
  operatorControlOnly: true,
  productScope: 'multi_channel_private_access',
  propertyOnlyScopeRejected: true,
};

/** Product categories for the new LuxeMaurice AI baseline. */
export const LUX_OWNER_FEEDBACK_PRODUCT_CATEGORIES = Object.freeze([
  { key: 'residences', label: 'Residences / property' },
  { key: 'yachts', label: 'Yachts' },
  { key: 'aviation', label: 'Aviation' },
  { key: 'island_experiences', label: 'Island experiences' },
  { key: 'private_advisory', label: 'Private advisory / concierge access' },
  { key: 'buyer_access_flow', label: 'Buyer private-access request flow' },
  { key: 'advisor_pipeline', label: 'Advisor / operator pipeline' },
  { key: 'website_readiness', label: 'Website readiness' },
  { key: 'mobile_readiness', label: 'Mobile readiness' },
  { key: 'multi_channel', label: 'Multi-channel / multi-directional product' },
]);

/** @typedef {'P0' | 'P1' | 'P2'} LuxOwnerFeedbackPriority */
/** @typedef {'queued' | 'in_progress' | 'blocked' | 'awaiting_client' | 'awaiting_anton' | 'responded'} LuxOwnerFeedbackStatus */

/**
 * @typedef {object} LuxOwnerFeedbackItem
 * @property {string} id
 * @property {string} category
 * @property {string} feedback
 * @property {LuxOwnerFeedbackPriority} priority
 * @property {LuxOwnerFeedbackStatus} status
 * @property {string} affectedSurface
 * @property {string} proposedResponse
 * @property {string} nextVisibleFix
 * @property {boolean} antonApprovalRequired
 * @property {string} [previewEvidenceLink]
 * @property {string} sourceRef
 */

/** @type {LuxOwnerFeedbackItem[]} */
export const LUX_OWNER_FEEDBACK_ITEMS = [
  {
    id: 'NP-001',
    category: 'website_readiness',
    feedback: 'Website-ready presentation is required — the new LuxeMaurice AI product must be presentable on web before owner review.',
    priority: 'P0',
    status: 'in_progress',
    affectedSurface: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE} · landing + category surfaces`,
    proposedResponse:
      'Polish web presentation across home, properties, buyer, and CRM preview routes with Lux editorial chrome and credible seed content.',
    nextVisibleFix: 'Improve /client/luxe-maurice-ai landing hero, category cards, and navigation coherence on preview.',
    antonApprovalRequired: false,
    previewEvidenceLink: LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE,
    sourceRef: 'Anton product baseline clarification (2026-07-08)',
  },
  {
    id: 'NP-002',
    category: 'mobile_readiness',
    feedback: 'Mobile-ready presentation is required — owner review will happen on phone as well as desktop.',
    priority: 'P0',
    status: 'queued',
    affectedSurface: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE} · responsive layout`,
    proposedResponse: 'Verify and fix mobile typography, nav, cards, and buyer request flow at common breakpoints.',
    nextVisibleFix: 'Mobile pass on /client/luxe-maurice-ai and /client/luxe-maurice-ai/buyer — no horizontal scroll, readable CTAs.',
    antonApprovalRequired: false,
    previewEvidenceLink: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/buyer`,
    sourceRef: 'Anton product baseline clarification (2026-07-08)',
  },
  {
    id: 'NP-003',
    category: 'multi_channel',
    feedback:
      'Product must be multi-channel and multi-directional — residences, yachts, aviation, island experiences, and private advisory are all in scope.',
    priority: 'P0',
    status: 'in_progress',
    affectedSurface: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties · category taxonomy`,
    proposedResponse:
      'Keep access categories visible in catalogue, filters, and buyer intent — not a single-property microsite.',
    nextVisibleFix: 'Ensure all five access categories surface on /client/luxe-maurice-ai with equal visual weight.',
    antonApprovalRequired: false,
    previewEvidenceLink: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties`,
    sourceRef: 'Anton product baseline clarification (2026-07-08) · lib/client/luxe-maurice-ai-data.js',
  },
  {
    id: 'NP-004',
    category: 'multi_channel',
    feedback: 'Product must not be treated as property-only — old property-site framing is out of scope for active delivery.',
    priority: 'P0',
    status: 'in_progress',
    affectedSurface: 'Product scope · operator queue · delivery slices',
    proposedResponse:
      'All active queue items and next-slice work target LuxeMaurice AI multi-channel surfaces; legacy property-only items stay in historical section.',
    nextVisibleFix: 'This queue re-baseline — historical items separated; next slice improves /client/luxe-maurice-ai only.',
    antonApprovalRequired: false,
    previewEvidenceLink: '/change/lux-feedback',
    sourceRef: 'Anton product baseline clarification (2026-07-08)',
  },
  {
    id: 'NP-005',
    category: 'buyer_access_flow',
    feedback:
      'Feedback and delivery must apply to /client/luxe-maurice-ai as the active product surface — not lux.corpflowai.com/properties alone.',
    priority: 'P0',
    status: 'in_progress',
    affectedSurface: LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE,
    proposedResponse:
      'Use LuxeMaurice AI preview routes as the reviewable product; old tenant marketing/properties stream is historical context only.',
    nextVisibleFix: 'Link all preview evidence and next visible fixes to /client/luxe-maurice-ai paths.',
    antonApprovalRequired: false,
    previewEvidenceLink: LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE,
    sourceRef: 'Anton product baseline clarification (2026-07-08)',
  },
  {
    id: 'NP-006',
    category: 'residences',
    feedback: 'Residences remain one channel, not the whole product — showcase alongside yachts, aviation, and experiences.',
    priority: 'P1',
    status: 'queued',
    affectedSurface: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties`,
    proposedResponse: 'Residence cards use same editorial shell as non-residence categories; no IDX/feed framing.',
    nextVisibleFix: 'Review residence seed cards vs yacht/aviation/experience cards for parity on preview.',
    antonApprovalRequired: false,
    previewEvidenceLink: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties`,
    sourceRef: 'LuxeMaurice AI seed catalogue · lib/client/luxe-maurice-ai-data.js',
  },
  {
    id: 'NP-007',
    category: 'yachts',
    feedback: 'Yacht & marine access must read as a first-class channel, not an afterthought to residences.',
    priority: 'P1',
    status: 'queued',
    affectedSurface: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties · yacht_marine`,
    proposedResponse: 'Yacht opportunities visible in directory with category label, hero, and buyer intent path.',
    nextVisibleFix: 'Verify private-yacht-lagoon-charter and category filters on properties index.',
    antonApprovalRequired: false,
    previewEvidenceLink: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties/private-yacht-lagoon-charter`,
    sourceRef: 'LuxeMaurice AI seed catalogue',
  },
  {
    id: 'NP-008',
    category: 'aviation',
    feedback: 'Aviation / VIP arrival channel must be present for multi-directional private access positioning.',
    priority: 'P1',
    status: 'queued',
    affectedSurface: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties · aviation_vip`,
    proposedResponse: 'Aviation opportunity card + detail page with arrival-service copy and buyer CTA.',
    nextVisibleFix: 'Review vip-arrival-aviation-service detail page and category labelling.',
    antonApprovalRequired: false,
    previewEvidenceLink: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties/vip-arrival-aviation-service`,
    sourceRef: 'LuxeMaurice AI seed catalogue',
  },
  {
    id: 'NP-009',
    category: 'island_experiences',
    feedback: 'Island experiences must appear as curated access, not generic tourism listings.',
    priority: 'P1',
    status: 'queued',
    affectedSurface: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties · island_experience`,
    proposedResponse: 'Experience cards use collector / bespoke language consistent with Lux editorial positioning.',
    nextVisibleFix: 'Review bespoke-island-experience-collector page for owner-review readiness.',
    antonApprovalRequired: false,
    previewEvidenceLink: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/properties/bespoke-island-experience-collector`,
    sourceRef: 'LuxeMaurice AI seed catalogue',
  },
  {
    id: 'NP-010',
    category: 'private_advisory',
    feedback: 'Private advisory / concierge access path must connect buyer intent to operator-visible pipeline.',
    priority: 'P1',
    status: 'in_progress',
    affectedSurface: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/buyer · /crm`,
    proposedResponse: 'Buyer private-access request flow seeds CRM preview; advisor sees enquiry context in operator CRM slice.',
    nextVisibleFix: 'End-to-end preview: buyer form → enquiry record visible on /client/luxe-maurice-ai/crm.',
    antonApprovalRequired: false,
    previewEvidenceLink: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/crm`,
    sourceRef: 'LuxeMaurice AI buyer + CRM preview routes',
  },
  {
    id: 'NP-011',
    category: 'advisor_pipeline',
    feedback: 'Advisor / operator pipeline must show how private-access requests are triaged — not a black box.',
    priority: 'P1',
    status: 'queued',
    affectedSurface: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/crm · /change operator desk`,
    proposedResponse: 'CRM preview exposes stage, category, and next action for seed enquiries; /change links back to this queue.',
    nextVisibleFix: 'Operator can open CRM preview and this feedback queue from /change without switching product mental models.',
    antonApprovalRequired: false,
    previewEvidenceLink: `${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE}/crm`,
    sourceRef: 'LuxeMaurice AI CRM preview · operator control alignment',
  },
];

/**
 * Historical / legacy Lux context — old property-only and #529 recovery stream.
 * Does not drive the next delivery slice unless it directly affects LuxeMaurice AI.
 * @type {LuxOwnerFeedbackItem[]}
 */
export const LUX_OWNER_FEEDBACK_HISTORICAL_ITEMS = [
  {
    id: 'LEG-001',
    category: 'multi_channel',
    feedback:
      'Delivery pace / trust erosion under old recovery programme (#529) — reactive fixes instead of structured delivery.',
    priority: 'P2',
    status: 'responded',
    affectedSurface: 'GitHub #529 · historical recovery programme',
    proposedResponse: 'Archived as historical context; active delivery now follows LuxeMaurice AI product baseline.',
    nextVisibleFix: 'No action unless Jan explicitly ties this to the new product review.',
    antonApprovalRequired: false,
    sourceRef: 'GitHub #529 (historical)',
  },
  {
    id: 'LEG-002',
    category: 'residences',
    feedback: 'No first real client-published listing on old lux.corpflowai.com/properties production stream.',
    priority: 'P2',
    status: 'responded',
    affectedSurface: 'lux.corpflowai.com/properties · Content sprint C2',
    proposedResponse: 'Old property-only site stream — historical. New product uses /client/luxe-maurice-ai seed catalogue.',
    nextVisibleFix: 'Only revisit if Jan wants production tenant listings mirrored into LuxeMaurice AI preview.',
    antonApprovalRequired: true,
    sourceRef: 'docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md (historical)',
  },
  {
    id: 'LEG-003',
    category: 'residences',
    feedback: 'Homepage imagery gap on old tenant marketing site (C1 content sprint).',
    priority: 'P2',
    status: 'responded',
    affectedSurface: 'lux.corpflowai.com/',
    proposedResponse: 'Historical property-site content sprint — not the active LuxeMaurice AI product baseline.',
    nextVisibleFix: 'None for new product unless imagery is reused for /client/luxe-maurice-ai hero.',
    antonApprovalRequired: false,
    sourceRef: 'docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md C1 (historical)',
  },
  {
    id: 'LEG-004',
    category: 'multi_channel',
    feedback: 'Recovery roadmap / Release 1 alignment on /client/recovery-roadmap (old recovery ticket stream).',
    priority: 'P2',
    status: 'responded',
    affectedSurface: '/client/recovery-roadmap · ticket cmr7a244f0000l505x5vne2s0',
    proposedResponse: 'Historical recovery alignment artefact — superseded by LuxeMaurice AI product feedback queue.',
    nextVisibleFix: 'No action unless Anton explicitly reconnects recovery ticket to new product scope.',
    antonApprovalRequired: true,
    sourceRef: 'docs/LUX/LUXEMAURICE_RECOVERY_WBS_AND_MVP_PLAN.md (historical)',
  },
  {
    id: 'LEG-005',
    category: 'advisor_pipeline',
    feedback: '/change Proceed regression (denyTicketClosed) blocked old recovery approvals.',
    priority: 'P2',
    status: 'in_progress',
    affectedSurface: 'lux.corpflowai.com/change',
    proposedResponse: 'Operator control plane fix still relevant for /change, but not the product scope driver.',
    nextVisibleFix: 'Verify #528 fix on preview if operator approvals are needed for new product work.',
    antonApprovalRequired: false,
    previewEvidenceLink: 'https://lux.corpflowai.com/change',
    sourceRef: 'GitHub #528 · #529 comment (historical recovery)',
  },
];

/** @type {Array<{ hours: string, title: string, owner: string, outcome: string; antonGate: boolean }>} */
export const LUX_OWNER_FEEDBACK_NEXT_SLICE = [
  {
    hours: '0–2h',
    title: 'Operator reviews new-product queue + opens LuxeMaurice AI preview',
    owner: 'Anton / Cursor',
    outcome: `Confirm P0 items on ${LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE} — website presentation baseline.`,
    antonGate: false,
  },
  {
    hours: '2–4h',
    title: 'Website + multi-channel category pass on preview',
    owner: 'Cursor',
    outcome:
      'Home, properties directory, and category detail pages on /client/luxe-maurice-ai present all channels — not property-only framing.',
    antonGate: false,
  },
  {
    hours: '4–6h',
    title: 'Mobile readiness + buyer private-access flow check',
    owner: 'Cursor',
    outcome: 'Buyer request flow and CRM preview readable on mobile; Anton previews before any client send.',
    antonGate: true,
  },
];

/** @param {LuxOwnerFeedbackStatus} status */
export function luxOwnerFeedbackStatusLabel(status) {
  const map = {
    queued: 'Queued',
    in_progress: 'In progress',
    blocked: 'Blocked',
    awaiting_client: 'Awaiting Jan',
    awaiting_anton: 'Awaiting Anton',
    responded: 'Responded',
  };
  return map[status] || status;
}

/** @param {LuxOwnerFeedbackPriority} priority */
export function luxOwnerFeedbackPriorityLabel(priority) {
  return priority;
}

/** @param {string} categoryKey */
export function luxOwnerFeedbackCategoryLabel(categoryKey) {
  const found = LUX_OWNER_FEEDBACK_PRODUCT_CATEGORIES.find((c) => c.key === categoryKey);
  return found ? found.label : categoryKey;
}

/**
 * @param {LuxOwnerFeedbackItem[]} [items]
 * @returns {Record<LuxOwnerFeedbackStatus, number>}
 */
export function countLuxOwnerFeedbackByStatus(items = LUX_OWNER_FEEDBACK_ITEMS) {
  /** @type {Record<LuxOwnerFeedbackStatus, number>} */
  const counts = {
    queued: 0,
    in_progress: 0,
    blocked: 0,
    awaiting_client: 0,
    awaiting_anton: 0,
    responded: 0,
  };
  for (const item of items) {
    if (counts[item.status] != null) counts[item.status] += 1;
  }
  return counts;
}

/**
 * @param {LuxOwnerFeedbackItem[]} [items]
 * @returns {number}
 */
export function countLuxOwnerFeedbackAwaitingAnton(items = LUX_OWNER_FEEDBACK_ITEMS) {
  return items.filter((item) => item.antonApprovalRequired && item.status !== 'responded').length;
}
