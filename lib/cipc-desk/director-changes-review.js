/**
 * CIPC Desk — Director Changes specialist-review surface content (#980).
 *
 * Content basis: six-layer process pack
 * (docs/operations/CIPC_DESK_DIRECTOR_CHANGES_PROCESS_PACK_V1.md)
 * plus official CIPC director-amendment sources from #740.
 * Review-level wording only — corpflow_test. Not Sarah-approved.
 *
 * No fee tables. No timing/outcome guarantees. Death/removal stay exceptions.
 */

import {
  CIPCDESK_TENANT_ID,
  resolveCipcDeskTenantIdFromHost,
} from '../server/cipc-desk-runtime.js';

export const CIPC_DESK_DIRECTOR_CHANGES_REVIEW_VERSION =
  'cipc-desk-dc-review-v1-980-2026-08-18';

export const CIPC_DESK_DIRECTOR_CHANGES_FEEDBACK_SUBJECT = 'Director Changes review feedback';

/**
 * Structured review content for the standing CIPC test-site page.
 * @returns {Record<string, unknown>}
 */
export function buildCipcDeskDirectorChangesReviewContent() {
  return {
    content_version: CIPC_DESK_DIRECTOR_CHANGES_REVIEW_VERSION,
    source: {
      controlling_issue: '#980',
      process_pack: '#980',
      research_parent: '#740',
      coordination: '#640',
      pattern_baseline: '#750 / #758 / #761 / #763 / #791 / #792',
      environment: 'corpflow_test',
      evidence_date: '2026-08-18',
    },
    meta: {
      page_title: 'CIPC Desk · Director Changes review',
      description:
        'Internal corpflow_test Director Changes review surface. Unresolved specialist items are labelled. Not a public launch. Not affiliated with CIPC.',
      robots: 'noindex,nofollow',
    },
    banners: {
      environment:
        'Internal CorpFlowAI corpflow_test surface for specialist review. Not a public launch and not client_production.',
      independence:
        'CIPC Desk is an independent support service. It is not CIPC, is not endorsed by CIPC, and must never imply official affiliation.',
      no_guarantee:
        'Turnaround times, OTP completion, and filing outcomes are not guaranteed. Any estimate is subject to CIPC processing times, system availability, submission quality, additional-information requests, and manual review.',
      provisional:
        'This is a review-ready v1 draft for Sarah. Items tagged SARAH CONFIRM are unresolved and must not be treated as approved Desk policy or final public copy.',
    },
    explanation: {
      title: 'What a director change is',
      body:
        'A director change is a filing with CIPC that updates the company’s official director record. Typical updates are appointing a director, recording a resignation, or correcting a director’s particulars. CIPC now handles these electronically through the CoR39 director-amendments service. It is not an Annual Return, not a SARS filing, and not a Beneficial Ownership filing.',
      tag: 'OFFICIAL / plain-English paraphrase',
    },
    scenarios: {
      title: 'v1 scenarios',
      tag: 'Standard vs specialist — death/removal stay exceptions',
      intro:
        'Cover standard director-change scenarios only. Do not treat every status the electronic system offers as a Desk standard service.',
      items: [
        {
          name: 'Appointment',
          posture: 'Standard review path',
          note: 'OFFICIAL: filer and new director complete identification + SMS + email OTP. 2023/2024 CIPC PDFs say documents are optional on the electronic path.',
        },
        {
          name: 'Resignation',
          posture: 'Standard review path',
          note: 'OFFICIAL: resigning director must complete OTP. Unreachable directors cannot be forced through a standard filing.',
        },
        {
          name: 'Change to particulars / contact details',
          posture: 'Standard review path where the current electronic process supports it',
          note: 'OFFICIAL: documents optional on the 2023/2024 electronic path. Overseas South African addresses may still need a later CIPC enquiry (Notice 2 of 2024).',
        },
        {
          name: 'Retirement / term expiry',
          posture: 'SARAH CONFIRM — not assumed as standard',
          note: 'OFFICIAL: Term Expired follows the resignation process shape but documents are mandatory. Keep as specialist until Sarah confirms a safe standard route.',
        },
        {
          name: 'Death or removal',
          posture: 'Specialist-review / exception only',
          note: 'OFFICIAL: documents mandatory. Removal also has Companies Act notice / presentation / possible court steps. Do not file these as a normal resignation.',
        },
      ],
    },
    covers: {
      title: 'What this service covers',
      tag: 'PROVISIONAL v1 — standard scenarios only',
      items: [
        'Helping the client understand what CIPC’s electronic director-amendments process requires for a standard appointment, resignation, or particulars update.',
        'Collecting the facts and supporting items needed for a complete filing attempt.',
        'Checking instructing-party authority, the one-director minimum for a private company, and whether OTP / contact details look usable.',
        'Preparing and submitting a standard electronic CoR39 matter only after required information is complete (SARAH CONFIRM: whether a signed Desk engagement/mandate is a hard gate).',
        'Capturing proof (CoR39 / confirmation) and telling the client what was filed.',
        'Escalating to specialist review when the matter is outside a standard path.',
      ],
    },
    does_not_cover: {
      title: 'What the service does not automatically include',
      tag: 'Provisional v1 exclusions — do not guess',
      items: [
        'Death of a director, forced removal, court-ordered removal, or contested / disputed director changes.',
        'Term-expiry / retirement filings until Sarah confirms they are a safe standard route.',
        'Changing a customer-profile identification from passport to ID (CIPC back-office enquiry path).',
        'Repairing Home Affairs mismatches, overseas-address province workarounds, or CIPC system defects.',
        'Beneficial Ownership amendments, share transfers, MOI changes, or restorations discovered during intake.',
        'Guaranteeing that CIPC will accept a filing or that every director will complete OTP.',
        'Acting as CIPC or giving formal legal opinions.',
        'Any Desk service-fee or pricing figures until the commercial pricing model is approved.',
      ],
    },
    client_checklist: {
      title: 'Client information and document checklist',
      intro:
        'Guided intake from the process pack. Mark items N/A when they do not apply. Official electronic guides and the older email-lodgement page disagree on how mandatory some documents are — those rows stay labelled SARAH CONFIRM.',
      groups: [
        {
          name: 'Instructing party and authority',
          items: [
            'Instructing person full name, email, phone (always).',
            'Relationship to entity — director / shareholder / accountant / authorised agent (always).',
            'Signed Desk engagement / mandate — SARAH CONFIRM whether this is required before filing (Annual Returns v1 required it).',
            'CIPC customer-code path — SARAH CONFIRM default to the client’s own code vs authorised practitioner code.',
            'Company mandate / power of attorney if a third party files (OFFICIAL on the email-lodgement document list).',
            'Billing contact for CIPC filing-fee funding only — no Desk service-fee or pricing wording until the commercial pricing model is approved.',
          ],
        },
        {
          name: 'Company registration details',
          items: [
            'Enterprise / registration number (always).',
            'Registered name as on CIPC record.',
            'Entity type — SARAH CONFIRM whether v1 is private companies only or also close-corporation member changes / other entities.',
            'Standard vs customised MOI (custom MOI may change eligibility, term, and who may appoint).',
            'Current CIPC director list versus the client’s understanding (mismatch is not a silent patch).',
            'Confirmation the company will still have at least one director after a resignation (OFFICIAL private-company minimum).',
            'Current CIPC status — deregistration / restoration is a different service.',
          ],
        },
        {
          name: 'Director-change scenario',
          items: [
            'Scenario: appointment, resignation, particulars, term expiry, death, or removal.',
            'Effective date the company believes applies (CIPC processing remains separate).',
            'Whether the affected director agrees — disputed matters are specialist.',
            'Whether the MOI requires shareholder approval for appointment (OFFICIAL: board may appoint unless the MOI says otherwise).',
          ],
        },
        {
          name: 'Affected director details',
          items: [
            'Full names as on the identity document.',
            'South African ID or passport number. OFFICIAL email-path rule: passport is identity proof only for non-residents; South African residents use a green bar-coded / smart ID copy.',
            'ID issue date when appointing — OFFICIAL: use the calendar control; the date must match Home Affairs.',
            'Residential / postal address. Overseas South African addresses may need a later CIPC enquiry (Notice 2 of 2024).',
            'Email and cellphone for OTP. OFFICIAL: do not add a + on international numbers.',
            'Country of residence / nationality if not South African — foreigner-assurance path is SARAH CONFIRM (standard vs specialist).',
            'Whether the CIPC customer profile is still on a passport and must be changed to an ID (back-office ticket, not a CoR39 field).',
          ],
        },
        {
          name: 'Identity, consent, resolutions, and mandates',
          items: [
            'Certified identity copy of the applicant — OFFICIAL on the email path; SARAH CONFIRM on the electronic standard path.',
            'Certified ID copies of affected directors — same tagging.',
            'Resolution for the change — OFFICIAL email-path wording: majority of directors to sign.',
            'Notice and minutes if the decision was taken in a meeting — OFFICIAL email-path wording: all directors to sign the minutes.',
            'Signed letter of consent to accept appointment (OFFICIAL on the alternative-process page).',
            'Signed letter of resignation (OFFICIAL on the alternative-process page).',
            'Supporting documents are mandatory on the 2023/2024 electronic path for Remove, Deceased, and Term Expired.',
            'Certification recency — PROVISIONAL / SARAH CONFIRM. Do not invent a number in client copy.',
          ],
        },
        {
          name: 'OTP, contactability, and acknowledgements',
          items: [
            'Appointed or resigning director can receive SMS and email OTPs.',
            'Filer can complete the filer OTP.',
            'Client acknowledges no timing, OTP, or outcome guarantee.',
            'Client acknowledges a director change is not an Annual Return and not a Beneficial Ownership filing.',
            'Client acknowledges death/removal is not a standard resignation.',
          ],
        },
      ],
    },
    operator_notes: {
      title: 'Internal operator checklist (summary)',
      tag: 'Layer 3 · operators',
      items: [
        'Classify the scenario before touching CIPC. Death/removal/dispute never become a resignation.',
        'Validate the enterprise and capture the current CIPC director list in the matter record — not in Git, and no identity-document images in the repository.',
        'Stop if a private company would be left with zero directors.',
        'On the electronic path, wait for filer + affected-director OTPs before treating the matter as finalised.',
        'Use Notice 2 of 2024 troubleshooting (calendar ID issue date, no + on international numbers, overseas-address enquiry) instead of inventing workarounds.',
        'Keep Desk service-fee / pricing wording out until the commercial model is approved.',
      ],
    },
    status_flow: {
      title: 'Visible steps / status flow',
      intro: 'Minimum statuses for Director Changes matters (process pack Layer 5).',
      steps: [
        { key: 'received', label: 'Received', meaning: 'Instruction accepted; intake not yet complete.' },
        {
          key: 'information_incomplete',
          label: 'Information incomplete',
          meaning: 'Missing facts, contacts, authority, or scenario — plain-English missing-info list sent.',
        },
        {
          key: 'specialist_review',
          label: 'Specialist review',
          meaning: 'Death/removal, dispute, MOI/legal ambiguity, or a SARAH CONFIRM gate — Sarah decides.',
        },
        {
          key: 'ready_for_submission',
          label: 'Ready for submission',
          meaning: 'Standard path; operator checklist green; submit via CIPC when funding and authority are final.',
        },
        {
          key: 'awaiting_otp',
          label: 'Awaiting OTP',
          meaning: 'Electronic application waiting for filer and/or director SMS and email OTPs.',
        },
        {
          key: 'submitted_externally',
          label: 'Submitted externally',
          meaning: 'Finalised on CIPC systems; capture CoR39 / confirmation.',
        },
        {
          key: 'awaiting_cipc',
          label: 'Awaiting CIPC',
          meaning: 'Back-office, enquiry, or manual correction — no false urgency promises.',
        },
        {
          key: 'completed',
          label: 'Completed',
          meaning: 'Confirmation on the matter record and client informed.',
        },
        {
          key: 'further_action_required',
          label: 'Further action required',
          meaning: 'Rejection, OTP failure, record mismatch, or new discrepancy.',
        },
      ],
      notes: [
        'Do not mark completed on payment or first submit alone — need OTP finalisation / CoR39 confirmation where the electronic path requires it.',
        'Death/removal stays specialist review or further action required. Do not hide it inside a standard resignation.',
        'Do not mark ready for submission while a private company would be left with zero directors.',
      ],
    },
    exceptions: {
      title: 'Exceptions and escalation examples',
      intro: 'Matters here require specialist assessment before proceeding (process pack Layer 6).',
      items: [
        {
          name: 'Death of a director',
          action: 'Specialist review. Documents are mandatory on the official electronic path. Do not file as a resignation.',
        },
        {
          name: 'Removal / contested change',
          action:
            'Specialist review. CIPC material names shareholder, board (section 69), and court routes — do not collapse these into a routine resignation.',
        },
        {
          name: 'Term expiry / retirement',
          action: 'Specialist until Sarah confirms a standard route. Official electronic guide makes documents mandatory.',
        },
        {
          name: 'Sole director resigning with no replacement',
          action: 'Stop. A private company may not have less than one director (OFFICIAL).',
        },
        {
          name: 'Sole-director simultaneous resignation + appointment',
          action: 'Specialist check. Official citation: practice note 2 of 2021 — resolution co-signed by both directors.',
        },
        {
          name: 'Custom MOI / shareholder-approval clause',
          action: 'Specialist review. Appointment authority and eligibility may differ from a standard MOI.',
        },
        {
          name: 'Foreign director / foreigner assurance',
          action: 'SARAH CONFIRM. Default to specialist if unsure. Official automated-appointment guide integrates this path.',
        },
        {
          name: 'Director unreachable for OTP',
          action: 'Information incomplete or specialist. Do not invent a bypass.',
        },
        {
          name: 'Home Affairs / ID issue-date mismatch',
          action: 'Pause. Official appointment troubleshooting: calendar control; date must match Home Affairs.',
        },
        {
          name: 'Customer-profile passport → ID',
          action: 'Separate CIPC enquiry (Login Challenges). Not a CoR39 field.',
        },
        {
          name: 'Existing CIPC record does not match the client',
          action: 'Particulars-first or specialist. Do not force a new appointment over a stale record.',
        },
        {
          name: 'Suspected false or unverifiable information',
          action: 'Refuse filing; escalate to Sarah.',
        },
      ],
    },
    open_questions: {
      title: 'Unresolved items for Sarah (do not guess)',
      intro:
        'These ten questions stay open. The page is review-ready so Sarah can answer against a real standing test URL. Approved Annual Returns v1 decisions are not automatically copied here.',
      items: [
        'Entity scope: private companies only, or also close-corporation member changes and other entities?',
        'Document posture: collect the alternative-process supporting-document set for every standard filing, or follow the 2023/2024 electronic “optional for appointment/resignation/particulars” rule?',
        'Authority gate: require a signed Desk engagement/mandate before filing, as Annual Returns v1 does?',
        'Customer-code model: default to the client’s own CIPC customer code unless the client authorises a practitioner code?',
        'Retirement / term expiry: standard v1 route with mandatory documents, or specialist-only?',
        'Particulars-only updates: included in the standard Director Changes service, or a separate lighter path?',
        'Foreign directors / foreigner assurance: standard with extra intake, or always specialist?',
        'Sole-director simultaneous resignation + appointment: operator-handled with the official co-signature rule, or always specialist?',
        'Filing channel: electronic OTP path only for v1, or also the older tracking-number + email CoR39 path?',
        'Certified-copy recency: is there an approved recency rule, or do we only say current CIPC / certification practice applies without inventing a number?',
      ],
    },
    feedback_prompt: {
      title: 'Structured specialist feedback',
      intro:
        'Submit feedback through the existing CIPC Desk email-intake path. It stores a synthetic CMP ticket for tenant cipc-desk in the existing Postgres — no new schema, CRM, or email-send runtime. Use this to confirm or reject the open questions above.',
      fields: [
        { key: 'correctness', label: 'Correctness — what is accurate or inaccurate?' },
        { key: 'missing_documents', label: 'Missing document requirements' },
        { key: 'confusing_wording', label: 'Confusing wording' },
        { key: 'specialist_boundaries', label: 'Specialist-review boundaries' },
        { key: 'inclusions_exclusions', label: 'Service inclusions / exclusions' },
        { key: 'unsafe_to_publish', label: 'Anything unsafe to publish' },
        {
          key: 'readiness',
          label: 'Overall readiness',
          options: [
            { value: 'approve', label: 'Approve' },
            { value: 'approve_with_changes', label: 'Approve with changes' },
            { value: 'not_ready', label: 'Not ready' },
          ],
        },
        { key: 'other_notes', label: 'Other notes (optional)' },
      ],
    },
  };
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Build email_text for POST /api/cipc-desk/email-intake.
 * Must include "Director Changes review feedback" so service inference selects
 * the director-changes family.
 *
 * @param {{
 *   correctness?: string,
 *   missing_documents?: string,
 *   confusing_wording?: string,
 *   specialist_boundaries?: string,
 *   inclusions_exclusions?: string,
 *   unsafe_to_publish?: string,
 *   readiness?: string,
 *   other_notes?: string,
 *   reviewer_name?: string,
 * }} fields
 * @returns {{ ok: true, email_text: string } | { ok: false, error: string }}
 */
export function buildDirectorChangesReviewFeedbackEmail(fields = {}) {
  const readiness = str(fields.readiness);
  const allowed = new Set(['approve', 'approve_with_changes', 'not_ready']);
  if (!allowed.has(readiness)) {
    return { ok: false, error: 'readiness is required (approve | approve_with_changes | not_ready)' };
  }

  const sections = [
    ['Correctness', fields.correctness],
    ['Missing document requirements', fields.missing_documents],
    ['Confusing wording', fields.confusing_wording],
    ['Specialist-review boundaries', fields.specialist_boundaries],
    ['Service inclusions / exclusions', fields.inclusions_exclusions],
    ['Anything unsafe to publish', fields.unsafe_to_publish],
    ['Other notes', fields.other_notes],
  ];

  const hasDetail = sections.some(([, v]) => str(v));
  if (!hasDetail) {
    return { ok: false, error: 'At least one feedback comment field is required' };
  }

  const readinessLabel =
    readiness === 'approve'
      ? 'Approve'
      : readiness === 'approve_with_changes'
        ? 'Approve with changes'
        : 'Not ready';

  const lines = [
    CIPC_DESK_DIRECTOR_CHANGES_FEEDBACK_SUBJECT,
    '',
    'Synthetic / specialist review feedback for the CIPC Desk Director Changes corpflow_test surface (#980).',
    'No real client data. No identity documents. No CIPC submission requested.',
    '',
    `Reviewer: ${str(fields.reviewer_name) || 'Sarah (specialist review)'}`,
    `Overall readiness: ${readinessLabel} (${readiness})`,
    `Content version: ${CIPC_DESK_DIRECTOR_CHANGES_REVIEW_VERSION}`,
    '',
  ];

  for (const [label, value] of sections) {
    const text = str(value);
    if (!text) continue;
    lines.push(`${label}:`);
    lines.push(text);
    lines.push('');
  }

  lines.push('Service cue: director changes (for email-intake routing).');

  return { ok: true, email_text: lines.join('\n').trim() };
}

/**
 * Resolve whether the request host may render the Director Changes review page.
 * Fail closed unless tenant is cipc-desk (standing host, DB map, or verified preview).
 *
 * @param {{
 *   host?: string | null,
 *   tenantIdFromDb?: string | null,
 *   previewTenantId?: string | null,
 * }} args
 * @returns {{ allowed: boolean, tenantId: string, reason: string }}
 */
export function resolveCipcDeskDirectorChangesPageAccess(args = {}) {
  const fromStanding = resolveCipcDeskTenantIdFromHost(args.host);
  const fromDb = str(args.tenantIdFromDb);
  const fromPreview = str(args.previewTenantId);
  const tenantId = fromDb || fromStanding || fromPreview || '';

  if (!tenantId) {
    return { allowed: false, tenantId: '', reason: 'TENANT_UNRESOLVED' };
  }
  if (tenantId !== CIPCDESK_TENANT_ID) {
    return { allowed: false, tenantId, reason: 'TENANT_SCOPE_MISMATCH' };
  }
  return {
    allowed: true,
    tenantId,
    reason: fromDb ? 'db_host_map' : fromStanding ? 'standing_test_host' : 'preview_token',
  };
}
