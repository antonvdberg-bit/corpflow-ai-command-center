/**
 * Client-readable LuxeMaurice product direction confirmation content.
 * Sources: recovery audit v1, WBS, MVP scope reconciliation (hypothesis-tier for v1–v14).
 * Plain language for Jan — no internal governance jargon.
 */

export const LUX_PRODUCT_DIRECTION_PAGE_TITLE = 'Product direction confirmation';

export const LUX_PRODUCT_DIRECTION_INTRO =
  'Before we prioritise delivery, we need your confirmation on what LuxeMaurice should be as a whole product — not only what content we should publish next.';

export const LUX_PRODUCT_DIRECTION_EVIDENCE_NOTE =
  'We have reviewed your approved repositioning direction and programme summaries of the materials you supplied (including v1–v14). We have not yet completed a full line-by-line review of every Drive package. What follows is our working understanding — please correct anything we have misunderstood.';

export const LUX_FIRST_VISIBLE_RELEASE_TITLE = 'Proposed first visible proof — not your whole requirement';

export const LUX_FIRST_VISIBLE_RELEASE_BODY = [
  'Once priorities are aligned, one practical way to show progress quickly may be a single real private opportunity live end-to-end: brand surface → one opportunity → advisory enquiry → you can manage it in your editor.',
  'That is a delivery proposal for proof of progress — not a claim that images plus one listing are the full product you want. Your pillar choices below define the real scope.',
].join(' ');

/** @type {Array<{ value: string, label: string }>} */
export const LUX_PILLAR_CLIENT_CHOICES = [
  { value: '', label: 'Choose one…' },
  { value: 'first_release', label: 'First release' },
  { value: 'later', label: 'Later' },
  { value: 'not_needed', label: 'Not needed' },
  { value: 'needs_correction', label: 'Needs correction' },
];

/**
 * @typedef {{
 *   key: string,
 *   title: string,
 *   whatWeUnderstand: string,
 *   corpflowToday: string,
 *   gap: string,
 *   suggestedPriority: 'first_release' | 'later' | 'not_needed',
 *   suggestedPriorityLabel: string,
 * }} LuxProductDirectionPillar
 */

/** @type {LuxProductDirectionPillar[]} */
export const LUX_PRODUCT_DIRECTION_PILLARS = [
  {
    key: 'lux_pillar_public_acquisition',
    title: 'Public acquisition / brand surface',
    whatWeUnderstand:
      'An editorial Mauritius brand experience — Private, Curated, Considered — that attracts the right audience without IDX feeds or generic property portals.',
    corpflowToday:
      'Live brand-aligned homepage and public chrome on lux.corpflowai.com with your vision-led layout.',
    gap: 'Real homepage photography and final published brand content are not finished yet.',
    suggestedPriority: 'first_release',
    suggestedPriorityLabel: 'First release (if brand proof is a priority)',
  },
  {
    key: 'lux_pillar_private_opportunities',
    title: 'Private Opportunities',
    whatWeUnderstand:
      'A curated, invitation-only directory of private opportunities — manual-first, not an MLS or feed catalogue.',
    corpflowToday: 'Live /properties directory and memorandum pages backed by your publishing workflow.',
    gap: 'No first real client-published opportunity with governed media is live yet.',
    suggestedPriority: 'first_release',
    suggestedPriorityLabel: 'First release (as proof — if you agree)',
  },
  {
    key: 'lux_pillar_advisory_concierge',
    title: 'Advisory / concierge intake',
    whatWeUnderstand:
      'A discreet private advisory path so qualified visitors can request a consultation with your team.',
    corpflowToday: 'Live /concierge form that records enquiries for your team.',
    gap: 'Needs validation on a real enquiry through to your team.',
    suggestedPriority: 'first_release',
    suggestedPriorityLabel: 'First release (if aligned with acquisition)',
  },
  {
    key: 'lux_pillar_crm_leads',
    title: 'CRM / lead management',
    whatWeUnderstand:
      'Your team can see, qualify, and follow up on advisory enquiries — possibly broader CRM in later packages you supplied.',
    corpflowToday: 'Operator desk on your change environment with concierge leads and status updates.',
    gap: 'Not a full standalone CRM product; focused on Lux enquiries today.',
    suggestedPriority: 'later',
    suggestedPriorityLabel: 'Later (basic path may suffice for first proof)',
  },
  {
    key: 'lux_pillar_property_editor',
    title: 'Property editor / publishing workflow',
    whatWeUnderstand:
      'You and your team can create, edit, and publish opportunities yourselves with clear governance.',
    corpflowToday: 'Authenticated property editor at /properties/admin.',
    gap: 'End-to-end publish walk-through with you on production is not fully signed off.',
    suggestedPriority: 'first_release',
    suggestedPriorityLabel: 'First release (if self-service publishing matters)',
  },
  {
    key: 'lux_pillar_media_documents',
    title: 'Media and document workflow',
    whatWeUnderstand:
      'Images and documents are reviewed before anything goes public; nothing publishes without your approval.',
    corpflowToday: 'Governed upload, review, link, and publish workflow for media slots.',
    gap: 'Your approval rhythm and first real asset set still need to be exercised together.',
    suggestedPriority: 'first_release',
    suggestedPriorityLabel: 'First release (governance is core)',
  },
  {
    key: 'lux_pillar_owner_portal',
    title: 'Owner portal',
    whatWeUnderstand:
      'A future invitation-only owner experience (pillar 5 in your strategic vision) — separate from public marketing.',
    corpflowToday: 'Not built on the live platform yet.',
    gap: 'Full owner portal is a later phase in our reading of your materials.',
    suggestedPriority: 'later',
    suggestedPriorityLabel: 'Later',
  },
  {
    key: 'lux_pillar_dashboard_reporting',
    title: 'Dashboard / reporting',
    whatWeUnderstand:
      'Executive or internal reporting on pipeline, opportunities, and performance — referenced in enterprise summaries you supplied.',
    corpflowToday: 'No client-facing executive dashboard on Lux today.',
    gap: 'Reporting suite not implemented.',
    suggestedPriority: 'later',
    suggestedPriorityLabel: 'Later',
  },
  {
    key: 'lux_pillar_comms_automation',
    title: 'Communications automation',
    whatWeUnderstand:
      'Automated email, SMS, or messaging follow-ups for leads and clients — may appear in packages you generated separately.',
    corpflowToday: 'Some notification paths exist; broad automation is not active on Lux without separate approval.',
    gap: 'Not part of an agreed first product slice until you confirm.',
    suggestedPriority: 'later',
    suggestedPriorityLabel: 'Later / confirm need',
  },
  {
    key: 'lux_pillar_commercial_billing',
    title: 'Commercial / quotation / billing',
    whatWeUnderstand:
      'Formal quotes, invoicing, and commercial paperwork for ongoing work — referenced in handover materials.',
    corpflowToday: 'Commercial scope discussed separately; no issued quotation as part of platform delivery.',
    gap: 'Billing artefacts are operator-led, not self-serve on the site.',
    suggestedPriority: 'later',
    suggestedPriorityLabel: 'Later / separate conversation',
  },
  {
    key: 'lux_pillar_qa_handover',
    title: 'QA / handover / production readiness',
    whatWeUnderstand:
      'Acceptance tests, production-readiness checklists, and handover evidence — strong themes in v13/v14 summaries you supplied.',
    corpflowToday: 'Programme verification and smoke checks; not a full enterprise QA pack on the client surface.',
    gap: 'Full handover pack from Drive materials not yet mapped line-by-line to the live platform.',
    suggestedPriority: 'later',
    suggestedPriorityLabel: 'Later (after direction confirmed)',
  },
];

export const LUX_PRODUCT_DIRECTION_PILLAR_KEYS = LUX_PRODUCT_DIRECTION_PILLARS.map((p) => p.key);
