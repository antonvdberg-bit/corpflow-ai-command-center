/**
 * CIPC Desk — Beneficial Ownership specialist-review surface content (#981).
 *
 * Content basis: six-layer process pack
 * (docs/operations/CIPC_DESK_BENEFICIAL_OWNERSHIP_PROCESS_PACK_V1.md)
 * grounded in official CIPC BO sources from #740.
 * Review-level wording only — corpflow_test.
 *
 * No fee tables. No timing/outcome/determination guarantees.
 * Complex ownership remains specialist-review — not automated or guessed.
 */

import {
  CIPCDESK_TENANT_ID,
  resolveCipcDeskTenantIdFromHost,
} from '../server/cipc-desk-runtime.js';

export const CIPC_DESK_BENEFICIAL_OWNERSHIP_REVIEW_VERSION =
  'cipc-desk-bo-review-v1-981-2026-08-18';

export const CIPC_DESK_BENEFICIAL_OWNERSHIP_FEEDBACK_SUBJECT =
  'Beneficial Ownership review feedback';

/**
 * Structured review content for the standing CIPC test-site page.
 * @returns {Record<string, unknown>}
 */
export function buildCipcDeskBeneficialOwnershipReviewContent() {
  return {
    content_version: CIPC_DESK_BENEFICIAL_OWNERSHIP_REVIEW_VERSION,
    source: {
      controlling_issue: '#981',
      process_pack: '#981',
      research_parent: '#740',
      coordination: '#640',
      annual_returns_pattern: '#750 / #758 / #761 / #763 / #791 / #792',
      environment: 'corpflow_test',
    },
    meta: {
      page_title: 'CIPC Desk · Beneficial Ownership review',
      description:
        'Internal corpflow_test Beneficial Ownership review surface for Sarah. Not a public launch. Not affiliated with CIPC. Desk does not determine beneficial owners.',
      robots: 'noindex,nofollow',
    },
    banners: {
      environment:
        'Internal CorpFlowAI corpflow_test surface for specialist review. Not a public launch and not client_production.',
      independence:
        'CIPC Desk is an independent support service. It is not CIPC, is not endorsed by CIPC, and must never imply official affiliation.',
      no_guarantee:
        'Turnaround times, filing outcomes, and beneficial-owner determinations are not guaranteed. CIPC Desk does not decide who a beneficial owner is. Any estimate is subject to CIPC processing times, system availability, submission quality, reviewer requests, and manual review.',
      provisional:
        'Beneficial Ownership v1 is review-ready only. Official CIPC requirements are tagged separately from practical recommendations, provisional assumptions, and questions still needing Sarah confirmation. Do not treat this page as final public copy or a public launch.',
    },
    explanation: {
      title: 'What Beneficial Ownership filing is',
      body:
        'Beneficial Ownership filing tells CIPC which natural persons ultimately own or control the company, even if those people are not the names printed on every share certificate or register line. It is a transparency filing. It is not an Annual Return, not a SARS tax return, and not a CIPC Desk decision about who owns the company.',
      tag: 'OFFICIAL / plain-English paraphrase',
    },
    entity_scope: {
      title: 'v1 path vs specialist path',
      tag: 'PROVISIONAL pending Sarah confirmation',
      body:
        'v1 covers only the common / standard administration path: typically a private company or close corporation that is clearly non-affected, where every owner or controller is declared as a natural person and control is not disputed. Trusts, juristic-person owners, foreign ownership, layered or chain control, unclear control, affected companies and their subsidiaries, and other entity types escalate to specialist review. Co-operatives are excepted from the CIPC BO Register.',
    },
    routing: {
      title: 'Affected vs non-affected routing',
      tag: 'OFFICIAL CIPC definitions — do not guess',
      intro:
        'CIPC publishes separate step-by-step guides for affected companies and for non-affected companies with beneficial ownership. If any routing fact is unknown, stop and escalate.',
      items: [
        'Affected company (OFFICIAL): any regulated company including all public companies (including listed); state-owned companies; any private company regulated by the Takeover Regulations that transferred more than 10% of its securities because of an amalgamation or merger in the previous 24 months; and any subsidiary of an affected company.',
        'Non-affected company (OFFICIAL): any company that is not classified as an affected company.',
        'If the entity is clearly none of the affected classes, use the non-affected official guide family for the standard path.',
        'If any affected class applies, or the answer is unknown, this is not standard v1 automation — specialist review.',
      ],
    },
    covers: {
      title: 'What this service is intended to cover',
      tag: 'PRACTICAL / PROVISIONAL — Sarah still to confirm filing vs referral',
      items: [
        'Helping the client understand that CIPC requires current beneficial-ownership information for corporate entities other than co-operatives.',
        'Collecting the facts needed for a complete standard-path filing attempt when ownership/control is a common natural-person pattern and the affected/non-affected route is clear.',
        'Routing to the correct official guide family (affected vs non-affected) or escalating if classification is unclear.',
        'Checking whether a mandate and the securities register and/or beneficial interest register appear available before any filing attempt.',
        'Preparing a standard-path Beneficial Ownership declaration only when a signed engagement/mandate and required information are complete and no specialist trigger is present.',
        'Capturing proof of what was filed and telling the client what was submitted — if filing is in the approved package.',
        'Escalating immediately for trusts, juristic persons, foreign ownership, layered ownership, unclear control, or historical inconsistency.',
      ],
    },
    does_not_cover: {
      title: 'What the service does not include',
      tag: 'PRACTICAL / PROVISIONAL exclusions',
      items: [
        'Deciding or certifying who a beneficial owner is.',
        'Filing or “solving” complex ownership structures (trusts, juristic persons, layered chains, unclear control).',
        'Treating affected companies and their subsidiaries as the standard v1 path.',
        'Co-operatives (official exception from the BO Register).',
        'Performing Annual Return filing as part of this service — Annual Returns identifies BO gaps and refers or quotes them separately.',
        'Preparing FAS, AFS, or tax filings.',
        'Storing identity-document images in Git or inventing a new document vault.',
        'Guaranteeing that CIPC will accept, process, or complete any filing by a stated date.',
        'Acting as CIPC or giving formal legal opinions.',
        'Any Desk service-fee or pricing figures until the commercial pricing model is approved.',
      ],
    },
    client_checklist: {
      title: 'Client information and document checklist',
      intro:
        'Guided intake from the process pack. Mark items N/A when they do not apply. A completed checklist is not a beneficial-owner determination. Do not attach real identity documents to this review page.',
      groups: [
        {
          name: 'Instructing party and authority',
          items: [
            'Instructing person full name, email, phone (always).',
            'Relationship to entity — director / member / accountant / authorised agent (always).',
            'Signed engagement / mandate confirming authority to act — required before filing (PRACTICAL; exact template is a Sarah question).',
            'CIPC customer-code path — provisional default is the client’s own CIPC customer code unless the client authorises an authorised practitioner code (Sarah still to confirm for BO).',
            'Billing contact for CIPC filing-fee funding only — no Desk service-fee or pricing wording until the commercial pricing model is approved.',
          ],
        },
        {
          name: 'Company registration details',
          items: [
            'Enterprise / registration number and registered name as on the CIPC record.',
            'Entity type — provisional common path: private company ((Pty) Ltd) or close corporation. Other types → specialist / later-phase.',
            'Confirm the entity is not a co-operative (co-operatives are excepted from the BO Register — OFFICIAL).',
            'Incorporation / anniversary date if known (OFFICIAL 30-business-day anniversary package language — not a Desk promise).',
            'Filing occasion: new incorporation (10 business days), annual package, or amendment after a change (10 business days) — OFFICIAL windows, not Desk SLAs.',
            'Current CIPC status and any known BO or Annual Return non-compliance notice.',
          ],
        },
        {
          name: 'Affected vs non-affected routing facts',
          items: [
            'Is the entity a public company, including a listed public company?',
            'Is the entity a state-owned company?',
            'Is it a private company regulated by the Takeover Regulations that transferred more than 10% of its securities because of an amalgamation or merger in the previous 24 months?',
            'Is it a subsidiary of an affected company?',
            'If any answer is yes or unknown → specialist review. If all are clearly no → non-affected official guide family.',
          ],
        },
        {
          name: 'Ownership / control structure (escalation screen)',
          items: [
            'Any owner or controller a trust, or a person acting under a trust agreement? → escalate.',
            'Any owner or controller a juristic person (company, CC, other body)? → escalate.',
            'Layered or chain ownership / control beyond a simple natural-person picture? → escalate.',
            'Any foreign owner or controller? Foreigner Assurance (certified passport or foreign identity document) must already be understood — else escalate.',
            'Control unclear, disputed, nominee, deceased estate, or unexplained intermediary? → escalate.',
            'Only if every flag is clearly no: continue the standard natural-person path.',
          ],
        },
        {
          name: 'Beneficial owner information (standard natural-person path)',
          items: [
            'Full name of each declared natural-person beneficial owner — client-declared, not Desk-determined.',
            'Identity particulars the client can evidence (SA ID or foreign identity / passport reference). Do not upload identity-document images here.',
            'Contact details and mobile/email for OTP where CIPC requires them.',
            'Nature of ownership or control as the client understands it (securities, voting, appoint/remove directors, or other material influence). Capture the client’s description; do not re-characterise it.',
            'Date the position started or last changed, if known.',
            'Whether the latest BO declaration is already filed for the current year (Annual Return hard-stop from 1 July 2024 — OFFICIAL).',
          ],
        },
        {
          name: 'Mandate, registers, and supporting items',
          items: [
            'Mandate / authority document — follow current CIPC Mandate guidance; exact Desk template is a Sarah question.',
            'Securities register and/or beneficial interest register where the official anniversary package requires them.',
            'Foreigner Assurance already completed for each foreign person, or the matter is escalated.',
            'Historical or inconsistent prior BO filings / reviewer emails → specialist review.',
            'Client acknowledges Desk does not determine beneficial owners, outcomes are not guaranteed, and false or misleading BO information is an offence (OFFICIAL).',
          ],
        },
      ],
    },
    status_flow: {
      title: 'Visible steps / status flow',
      intro: 'Minimum statuses for Beneficial Ownership matters (process pack Layer 5).',
      steps: [
        { key: 'received', label: 'Received', meaning: 'Instruction accepted; intake not yet complete.' },
        {
          key: 'information_incomplete',
          label: 'Information incomplete',
          meaning: 'Missing facts, documents, authority, or routing answers — plain-English missing-info list sent.',
        },
        {
          key: 'specialist_review',
          label: 'Specialist review',
          meaning:
            'Trust, juristic person, foreign path, layered ownership, unclear control, affected-company route, or legal/registry ambiguity — Sarah (or designated specialist) decides. Do not file the standard path.',
        },
        {
          key: 'ready_for_submission',
          label: 'Ready for submission',
          meaning:
            'Signed engagement/mandate present; operator checklist green; no Layer 6 flag; submit via CIPC only if filing is in the approved package and CIPC fee funding and authority are final.',
        },
        {
          key: 'submitted_externally',
          label: 'Submitted externally',
          meaning: 'Lodged on CIPC systems; capture proof and watch for reviewer or resubmission notices.',
        },
        {
          key: 'awaiting_cipc',
          label: 'Awaiting CIPC',
          meaning: 'Dependent on CIPC processing, reviewer, or Foreigner Assurance — no false urgency promises.',
        },
        {
          key: 'completed',
          label: 'Completed',
          meaning: 'Filing confirmation on the matter record and client informed.',
        },
        {
          key: 'further_action_required',
          label: 'Further action required',
          meaning: 'CIPC query, rejection, Annual Return still hard-stopped, or new discrepancy.',
        },
      ],
      notes: [
        'Do not mark completed on payment alone — need filing confirmation and a client update.',
        'Do not mark ready for submission if any complexity flag is yes or unknown.',
        'Do not proceed to ready for submission without a signed engagement/mandate confirming authority to act.',
        'If Annual Return remains hard-stopped after a BO attempt, keep further action required — do not claim the Annual Return path is cleared.',
      ],
    },
    exceptions: {
      title: 'Exceptions and escalation examples',
      intro:
        'Matters here require specialist assessment before proceeding (process pack Layer 6 / #740). Do not automate or guess.',
      items: [
        {
          name: 'Co-operative presented as BO Register work',
          action: 'Stop. Co-operatives are excepted from the BO Register (OFFICIAL). Do not file on this path.',
        },
        {
          name: 'Affected company, subsidiary, or classification unknown',
          action: 'Specialist review. Use the official Affected Company guide family only under specialist direction — not standard v1.',
        },
        {
          name: 'Trust / person acting under a trust agreement',
          action: 'Specialist review. Official complex-structure guide exists; do not flatten the trust into a guessed natural person.',
        },
        {
          name: 'Juristic-person owner',
          action: 'Specialist review. Official complex-structure guide — not the standard natural-person path.',
        },
        {
          name: 'Layered / chain ownership or control',
          action:
            'Specialist review. CIPC Notice 61 of 2024 names a complex-structures function. Do not invent the natural person at the end of the chain.',
        },
        {
          name: 'Foreign owner / incomplete Foreigner Assurance',
          action:
            'Specialist review until Foreigner Assurance status is clear. OFFICIAL path uses a certified passport or foreign identity document. Do not store those images in Git.',
        },
        {
          name: 'Unclear, disputed, or unexplained control',
          action: 'Specialist review. Do not file. False or misleading BO information is an offence (OFFICIAL).',
        },
        {
          name: 'Historical or inconsistent registers / prior BO filings',
          action: 'Specialist review; gather CIPC screenshots or export notes. Do not store identity-document images in Git.',
        },
        {
          name: 'CIPC reviewer / resubmission / discarded draft',
          action: 'Log the notice; set further action required or specialist review. Do not promise clearance dates.',
        },
        {
          name: 'Entity in deregistration / final deregistered',
          action: 'Stop standard BO; escalate — may need a different CIPC process.',
        },
        {
          name: 'Suspected false or unverifiable information',
          action: 'Refuse filing; escalate to Sarah (false BO information is an offence — OFFICIAL).',
        },
        {
          name: 'Annual Return still hard-stopped after BO work',
          action: 'Further action required. Do not promise that the Annual Return can now be finalised.',
        },
      ],
    },
    official_windows: {
      title: 'Official CIPC timing language (not Desk promises)',
      items: [
        'Newly incorporated entities: file BO information within 10 business days of incorporation (OFFICIAL).',
        'Amendments: file an amended BO declaration within 10 business days of any change to BO information (OFFICIAL).',
        'Annual package: Annual Returns, Beneficial Ownership Declarations, and a securities register and/or beneficial interest register within 30 business days following the anniversary date of incorporation (OFFICIAL).',
        'From 1 July 2024, BO non-compliance hard-stops Annual Return finalisation for companies and close corporations (OFFICIAL).',
        'Never convert those windows into a CIPC Desk turnaround or outcome guarantee.',
      ],
    },
    open_questions: {
      title: 'Open questions for Sarah',
      intro:
        'These points are still SARAH CONFIRM. Please answer on this page using the feedback form. Do not treat the current wording as approved public copy.',
      items: [
        'v1 entity scope: confirm standard BO Desk service is private companies and close corporations only, with NPC / public / SOC / external as later-phase or specialist — matching Annual Returns v1.',
        'Filing vs referral: does standard BO v1 include Desk submitting the e-Services declaration, or only intake, completeness check, and client/practitioner submission?',
        'Customer-code model: same as Annual Returns (default client’s own code; authorised practitioner code only if the client authorises it)?',
        'Mandate template: which exact mandate / engagement document must be on file before a BO filing attempt?',
        'Identity-document handling: what does Desk collect versus what the client uploads directly to CIPC / Foreigner Assurance? Confirm Desk must never keep ID images in Git or a second vault.',
        'Affected-company work: are affected companies and subsidiaries always specialist, or is there a later-phase Desk path?',
        'Determination posture: confirm Desk never determines beneficial owners and only records client-declared facts plus specialist direction.',
        'New-incorporation 10-day filings: in or out of v1 standard service, versus annual / amendment filings only?',
        'Commercial pricing: keep all Desk service-fee wording out until the commercial model is approved?',
        'Annual Returns handoff: confirm the existing AR rule remains — AR identifies BO gaps; this pack is the separate quote / completion path.',
      ],
    },
    sarah_review: {
      title: 'How to review this page',
      standing_url: 'https://cipc.corpflowai.com/beneficial-ownership',
      alias_url: 'https://cipc-desk.corpflowai.com/beneficial-ownership',
      instructions: [
        'Open the standing test URL above after this change is published to the CorpFlowAI test spine. No GitHub or Vercel login is required.',
        'Read the explanation, routing, checklists, status flow, and escalation list.',
        'Submit structured feedback at the bottom of this page. It uses the existing CIPC Desk email-intake path and stores a synthetic ticket for tenant cipc-desk.',
        'Do not attach real client data or identity documents. No live email is sent.',
      ],
    },
    feedback_prompt: {
      title: 'Structured specialist feedback',
      intro:
        'Submit feedback through the existing CIPC Desk email-intake path. It stores a synthetic CMP ticket for tenant cipc-desk in the existing Postgres — no new schema, CRM, or email-send runtime.',
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
 * Must include "Beneficial Ownership review feedback" so service inference
 * selects beneficial-ownership-submissions.
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
export function buildBeneficialOwnershipReviewFeedbackEmail(fields = {}) {
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
    CIPC_DESK_BENEFICIAL_OWNERSHIP_FEEDBACK_SUBJECT,
    '',
    'Synthetic / specialist review feedback for the CIPC Desk Beneficial Ownership corpflow_test surface (#981).',
    'No real client data. No identity documents. No CIPC submission requested.',
    '',
    `Reviewer: ${str(fields.reviewer_name) || 'Sarah (specialist review)'}`,
    `Overall readiness: ${readinessLabel} (${readiness})`,
    `Content version: ${CIPC_DESK_BENEFICIAL_OWNERSHIP_REVIEW_VERSION}`,
    '',
  ];

  for (const [label, value] of sections) {
    const text = str(value);
    if (!text) continue;
    lines.push(`${label}:`);
    lines.push(text);
    lines.push('');
  }

  lines.push('Service cue: beneficial ownership (for email-intake routing).');

  return { ok: true, email_text: lines.join('\n').trim() };
}

/**
 * Resolve whether the request host may render the Beneficial Ownership review page.
 * Fail closed unless tenant is cipc-desk (standing host, DB map, or verified preview).
 *
 * @param {{
 *   host?: string | null,
 *   tenantIdFromDb?: string | null,
 *   previewTenantId?: string | null,
 * }} args
 * @returns {{ allowed: boolean, tenantId: string, reason: string }}
 */
export function resolveCipcDeskBeneficialOwnershipPageAccess(args = {}) {
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
