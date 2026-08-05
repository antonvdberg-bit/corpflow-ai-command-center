/**
 * CIPC Desk — Annual Returns specialist-review content (issue #761).
 *
 * Source of truth: six-layer process pack from #750 / PR #758
 * (`docs/operations/CIPC_DESK_ANNUAL_RETURNS_PROCESS_PACK_V1.md`).
 *
 * This module is for the standing CIPC **test** surface only
 * (`https://cipc.corpflowai.com/annual-returns`). It does not authorise
 * public launch, CIPC filing, fees, or guaranteed outcomes.
 *
 * Tags mirror the process pack:
 * - OFFICIAL — from cited CIPC public material
 * - PRACTICAL — Sarah-confirmed operating posture (#740)
 * - PROVISIONAL — working assumption until Sarah confirms
 * - SARAH CONFIRM — open; do not hard-publish
 */

export const ANNUAL_RETURNS_REVIEW_META = Object.freeze({
  page_title: 'Annual Returns — CIPC Desk review',
  description:
    'Specialist review surface for the CIPC Desk Annual Returns process. Internal CorpFlowAI test environment — not a public launch.',
  brand: 'CIPC Desk',
  working_name_note:
    '“CIPC Desk” is an internal working name only — not the final public brand (PROVISIONAL / pending brand decision).',
  source_issue: '#750',
  implementation_issue: '#761',
  research_issue: '#740',
  environment_class: 'corpflow_test',
});

export const ANNUAL_RETURNS_DISCLAIMERS = Object.freeze({
  independence:
    'CIPC Desk is an independent support service. It is not CIPC, is not endorsed by CIPC, and must never imply official affiliation.',
  no_guarantee:
    'Turnaround times, approval dates, processing periods, and successful filing outcomes are not guaranteed. Any timing estimate is subject to CIPC processing times, system availability, submission quality, additional-information requests, and manual review.',
  not_tax:
    'An Annual Return is not a SARS tax return.',
  not_checklist:
    'The Annual Compliance Checklist is a related but separate annual obligation for certain company categories — it is not the same as the Annual Return itself (SARAH CONFIRM whether checklist support is in the paid AR package).',
  test_ribbon:
    'TEST ENVIRONMENT — CIPC Desk Annual Returns specialist review (not a public launch; not CIPC)',
});

/** Layer 1 — plain-English customer explanation (review level). */
export const ANNUAL_RETURNS_EXPLANATION = Object.freeze({
  title: 'What an Annual Return is',
  body:
    'An Annual Return is a yearly filing with CIPC that confirms your company or close corporation still exists on the register and updates key information CIPC uses to keep the public company record current.',
  tag: 'OFFICIAL / plain-English paraphrase',
  extras: [ANNUAL_RETURNS_DISCLAIMERS.not_tax],
});

export const ANNUAL_RETURNS_COVERS = Object.freeze({
  title: 'What this service covers',
  tag: 'PRACTICAL (service framing — pending public copy approval)',
  items: [
    'Helping the client understand what CIPC requires for the Annual Return cycle for their entity type.',
    'Collecting the facts and supporting items needed for a complete filing attempt.',
    'Checking whether Beneficial Ownership and AFS/FAS prerequisites appear complete before submission.',
    'Preparing and submitting the Annual Return through CIPC e-Services / the Annual Returns system when authority and information are complete.',
    'Capturing proof of filing (confirmation / certificate) and telling the client what was filed.',
    'Escalating to specialist review when the matter is outside a standard filing.',
  ],
});

export const ANNUAL_RETURNS_DOES_NOT_COVER = Object.freeze({
  title: 'What this service does not automatically include',
  tag: 'PROVISIONAL until Sarah confirms packaging',
  items: [
    'Preparing full Annual Financial Statements or performing an audit / independent review.',
    'Fixing historical registry errors, restorations, deregistrations, or MOI/share restructures.',
    'Guaranteeing that CIPC will accept, process, or complete any filing by a stated date.',
    'Acting as CIPC or giving formal legal opinions.',
  ],
});

/** Layer 2 — client information / document checklist (review-level summary). */
export const ANNUAL_RETURNS_CHECKLIST = Object.freeze({
  title: 'Client information and document checklist',
  intro:
    'Typical inputs for intake. Not every item applies to every company type. Mark N/A when it does not apply.',
  groups: [
    {
      name: 'Instructing party and authority',
      items: [
        { text: 'Instructing person full name, email, phone', when: 'Always', tag: 'PRACTICAL' },
        { text: 'Relationship to entity (director / member / accountant / authorised agent)', when: 'Always', tag: 'PRACTICAL' },
        {
          text: 'Signed mandate / power of attorney / board or members’ resolution authorising filing',
          when: 'When CIPC Desk (or non-director filer) will lodge',
          tag: 'OFFICIAL materials; exact form SARAH CONFIRM',
        },
        {
          text: 'Confirmation Desk may use / access the relevant CIPC customer code',
          when: 'When filing electronically',
          tag: 'PRACTICAL / SARAH CONFIRM',
        },
      ],
    },
    {
      name: 'Company registration details',
      items: [
        { text: 'Enterprise / registration number', when: 'Always', tag: 'OFFICIAL' },
        { text: 'Registered name as on CIPC record', when: 'Always', tag: 'PRACTICAL' },
        { text: 'Entity type (Pty Ltd, Inc, Ltd, SOC, NPC, CC, external company, other)', when: 'Always', tag: 'PRACTICAL' },
        { text: 'Incorporation / registration anniversary date', when: 'Always if known', tag: 'OFFICIAL window language' },
        { text: 'Current CIPC status (in business, AR deregistration process, final deregistered, etc.)', when: 'Always', tag: 'PRACTICAL' },
      ],
    },
    {
      name: 'Financial-year and turnover',
      items: [
        { text: 'Financial year-end', when: 'Always', tag: 'PRACTICAL' },
        { text: 'Filing year(s) to be lodged (current and any arrears)', when: 'Always', tag: 'PRACTICAL' },
        { text: 'Annual turnover for each outstanding year', when: 'Always for fee calculation', tag: 'OFFICIAL' },
        {
          text: 'Whether entity is dormant / not trading',
          when: 'Conditional disclosure',
          tag: 'PRACTICAL — dormancy does not automatically remove AR duty (SARAH CONFIRM client wording)',
        },
      ],
    },
    {
      name: 'Beneficial Ownership and AFS/FAS dependencies',
      items: [
        { text: 'Has latest BO declaration been filed for the relevant year? (co-operatives excepted)', when: 'Companies, external companies, CCs', tag: 'OFFICIAL hard-stop' },
        { text: 'Securities register and/or beneficial interest register available when BO filing required', when: 'When BO filing required', tag: 'OFFICIAL' },
        { text: 'Does client / accountant say AFS (audit or independent review) is required this year?', when: 'Always ask', tag: 'OFFICIAL hard-stop requires AFS or FAS' },
        { text: 'If FAS: client ready to answer FAS prompts; if AFS: iXBRL package ready / accountant appointed', when: 'By route', tag: 'OFFICIAL guide path' },
      ],
    },
    {
      name: 'Acknowledgements before submission',
      items: [
        { text: 'Client acknowledges AR ≠ tax return and AR ≠ Compliance Checklist', when: 'Always', tag: 'PRACTICAL' },
        { text: 'Client acknowledges no timing/outcome guarantee', when: 'Always before submission', tag: 'Sarah-confirmed' },
      ],
    },
  ],
  missing_info_rule:
    'Missing-information rule (PRACTICAL): if enterprise number, registered name, entity type, filing year(s), turnover, agent mandate (when agent filing), BO status, or AFS/FAS route are unanswered, status stays “information incomplete” — do not mark ready for submission.',
});

/** Layer 5 — visible steps / status flow. */
export const ANNUAL_RETURNS_STATUS_FLOW = Object.freeze({
  title: 'Steps and status flow',
  intro: 'Minimum statuses for Annual Returns matters. Email-first client updates.',
  steps: [
    { id: 'received', label: 'Received', meaning: 'Instruction accepted; intake not yet complete' },
    { id: 'information_incomplete', label: 'Information incomplete', meaning: 'Missing facts, documents, or authority' },
    { id: 'specialist_review', label: 'Specialist review', meaning: 'Outside standard path or legal/registry ambiguity' },
    { id: 'ready_for_submission', label: 'Ready for submission', meaning: 'Operator checklist green' },
    { id: 'submitted_externally', label: 'Submitted externally', meaning: 'Lodged/paid on CIPC systems' },
    { id: 'awaiting_cipc', label: 'Awaiting CIPC', meaning: 'Dependent on CIPC processing, review, or system' },
    { id: 'completed', label: 'Completed', meaning: 'Filing confirmation/certificate on record and client informed' },
    { id: 'further_action_required', label: 'Further action required', meaning: 'CIPC query, rejection, dependency failure, or new discrepancy' },
  ],
  rules: [
    'Do not jump to completed on payment alone — need filing confirmation/certificate (OFFICIAL proof step).',
    '“Awaiting CIPC” is honest when BO/AFS units or back-office must act; still not a timing promise.',
    'If reinstatement/deregistration is discovered, keep the AR matter as further action required or split a new matter — do not hide the dependency.',
  ],
  official_backbone: [
    'Customer login / registration (valid CIPC customer code)',
    'Enter enterprise number; validate entity; enter turnover; calculate outstanding Annual Return fee',
    'Beneficial Ownership (BO) filing — system will not allow continuation if BO is not up to date for the filing year',
    'Upload AFS via iXBRL or submit FAS, as applicable',
    'File and pay the Annual Return',
    'Print/save the Annual Return filing confirmation and certificate as proof of filing',
  ],
});

/** Layer 6 — exceptions and escalations. */
export const ANNUAL_RETURNS_EXCEPTIONS = Object.freeze({
  title: 'Exceptions and escalation examples',
  intro: 'Matters here require specialist assessment before proceeding (Sarah / #740).',
  items: [
    { exception: 'Unclear company type', action: 'Specialist review; pause submission' },
    { exception: 'Historical filing discrepancies', action: 'Specialist review; gather CIPC screenshots/export notes' },
    { exception: 'Outstanding BO compliance', action: 'BO path or specialist; status not ready for submission' },
    { exception: 'Unresolved AFS/FAS/XBRL dependency', action: 'Accountant/specialist; do not invent figures' },
    { exception: 'Manual CIPC intervention required', action: 'Log enquiry path; awaiting CIPC / further action required' },
    { exception: 'Conflicting company records', action: 'Separate corrective service; do not “force” AR' },
    { exception: 'Statutory interpretation required', action: 'Specialist review — Sarah-confirmed mandatory class' },
    { exception: 'Entity in deregistration / final deregistered', action: 'Stop standard AR; escalate (may need reinstatement)' },
    { exception: 'Trust / deceased estate / foreign complex ownership', action: 'Specialist review before BO/AR' },
    { exception: 'Suspected false or unverifiable information', action: 'Refuse filing; escalate to Sarah' },
  ],
  tone:
    'Escalation tone to clients (PRACTICAL): explain that a specialist must review before any filing attempt; list what is blocked; restate that CIPC Desk cannot guarantee CIPC outcomes.',
});

export const ANNUAL_RETURNS_CANNOT_GUARANTEE = Object.freeze({
  title: 'What CIPC Desk cannot guarantee',
  tag: 'PRACTICAL / Sarah-confirmed wording posture',
  items: [
    'CIPC processing time or “Immediate” completion for the client’s matter.',
    'Approval dates, acceptance dates, or registry status change dates.',
    'That a filing will succeed on first attempt.',
    'That penalties, deregistration risk, or enforcement will not arise from past non-compliance.',
    'That BO, AFS/FAS, or Compliance Checklist issues outside the Annual Return itself will be resolved as part of a standard AR fee.',
  ],
});

/** Structured feedback prompts for Sarah (issue #761). */
export const ANNUAL_RETURNS_FEEDBACK_PROMPTS = Object.freeze({
  title: 'Structured feedback for Sarah',
  intro:
    'Please review this test-site experience and submit structured feedback. Use synthetic or your own reviewer details only — no real client identity documents.',
  topics: [
    { id: 'correctness', label: 'Correctness', hint: 'What is accurate or inaccurate vs official CIPC / your practice?' },
    { id: 'missing_documents', label: 'Missing document requirements', hint: 'What intake items are missing or unnecessary?' },
    { id: 'confusing_wording', label: 'Confusing wording', hint: 'Which phrases should change?' },
    { id: 'specialist_boundaries', label: 'Specialist-review boundaries', hint: 'Where should standard vs specialist lines move?' },
    { id: 'inclusions_exclusions', label: 'Service inclusions / exclusions', hint: 'What should be in or out of the standard AR package?' },
    { id: 'unsafe_to_publish', label: 'Anything unsafe to publish', hint: 'What must not appear on a future public page?' },
  ],
  readiness_options: [
    { id: 'approve', label: 'Approve' },
    { id: 'approve_with_changes', label: 'Approve with changes' },
    { id: 'not_ready', label: 'Not ready' },
  ],
  intent_prefix: 'Annual Returns review feedback',
  meta_product: 'cipc-desk',
  meta_service: 'annual-returns',
  meta_page: '/annual-returns',
  meta_feedback_type: 'annual-returns-review',
});

/**
 * Build a single message body for POST /api/tenant/intake from structured fields.
 * @param {{
 *   readiness?: string,
 *   topicNotes?: Record<string, string>,
 *   overallNotes?: string,
 * }} args
 * @returns {string}
 */
export function buildAnnualReturnsFeedbackMessage({ readiness, topicNotes, overallNotes } = {}) {
  const lines = [`${ANNUAL_RETURNS_FEEDBACK_PROMPTS.intent_prefix}`];
  lines.push(`Overall readiness: ${readiness || '(not selected)'}`);
  for (const topic of ANNUAL_RETURNS_FEEDBACK_PROMPTS.topics) {
    const note = String(topicNotes?.[topic.id] || '').trim();
    lines.push('');
    lines.push(`[${topic.label}]`);
    lines.push(note || '(no comment)');
  }
  const overall = String(overallNotes || '').trim();
  if (overall) {
    lines.push('');
    lines.push('[Overall notes]');
    lines.push(overall);
  }
  return lines.join('\n');
}

/**
 * Flatten review content for static tests / smoke assertions.
 * @returns {string}
 */
export function annualReturnsReviewContentBlob() {
  return JSON.stringify({
    meta: ANNUAL_RETURNS_REVIEW_META,
    disclaimers: ANNUAL_RETURNS_DISCLAIMERS,
    explanation: ANNUAL_RETURNS_EXPLANATION,
    covers: ANNUAL_RETURNS_COVERS,
    does_not_cover: ANNUAL_RETURNS_DOES_NOT_COVER,
    checklist: ANNUAL_RETURNS_CHECKLIST,
    status_flow: ANNUAL_RETURNS_STATUS_FLOW,
    exceptions: ANNUAL_RETURNS_EXCEPTIONS,
    cannot_guarantee: ANNUAL_RETURNS_CANNOT_GUARANTEE,
    feedback: ANNUAL_RETURNS_FEEDBACK_PROMPTS,
  });
}
