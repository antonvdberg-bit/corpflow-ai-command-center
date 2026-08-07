/**
 * CIPC Desk — Annual Returns specialist-review surface content (#761 / #791).
 *
 * Content basis: six-layer process pack from #750 / PR #758
 * (docs/operations/CIPC_DESK_ANNUAL_RETURNS_PROCESS_PACK_V1.md) plus Sarah
 * Fourie’s final 2026-08-07 Annual Returns v1 decisions (#791).
 * Review-level wording only — corpflow_test.
 *
 * No fee tables. No timing/outcome guarantees. No FAS preparation.
 * v1 entity scope: private companies and close corporations only.
 */

import {
  CIPCDESK_TENANT_ID,
  resolveCipcDeskTenantIdFromHost,
} from '../server/cipc-desk-runtime.js';

export const CIPC_DESK_ANNUAL_RETURNS_REVIEW_VERSION = 'cipc-desk-ar-review-v1.1-sarah-2026-08-07';

export const CIPC_DESK_ANNUAL_RETURNS_FEEDBACK_SUBJECT = 'Annual Returns review feedback';

/** Exact Sarah-approved dormant / non-trading client wording (#791). */
export const CIPC_DESK_ANNUAL_RETURNS_DORMANT_WORDING =
  'Even if your company is dormant or not trading, Annual Return filing and other statutory obligations may still apply.';

/**
 * Structured review content for the standing CIPC test-site page.
 * @returns {Record<string, unknown>}
 */
export function buildCipcDeskAnnualReturnsReviewContent() {
  return {
    content_version: CIPC_DESK_ANNUAL_RETURNS_REVIEW_VERSION,
    source: {
      controlling_issue: '#791',
      prior_test_site: '#761 / PR #763',
      process_pack: '#750 / PR #758',
      research_parent: '#740',
      coordination: '#640',
      environment: 'corpflow_test',
      sarah_decisions_date: '2026-08-07',
    },
    meta: {
      page_title: 'CIPC Desk · Annual Returns review',
      description:
        'Internal corpflow_test Annual Returns review surface reflecting Sarah-approved v1 boundaries. Not a public launch. Not affiliated with CIPC.',
      robots: 'noindex,nofollow',
    },
    banners: {
      environment:
        'Internal CorpFlowAI corpflow_test surface for specialist review. Not a public launch and not client_production.',
      independence:
        'CIPC Desk is an independent support service. It is not CIPC, is not endorsed by CIPC, and must never imply official affiliation.',
      no_guarantee:
        'Turnaround times and filing outcomes are not guaranteed. Any estimate is subject to CIPC processing times, system availability, submission quality, additional-information requests, and manual review.',
      provisional:
        'Sarah-approved Annual Returns v1 boundaries (2026-08-07) are reflected below. Remaining later-phase or operational details are labelled. Do not treat this page as final public copy or a public launch.',
    },
    explanation: {
      title: 'What an Annual Return is',
      body:
        'An Annual Return is a yearly filing with CIPC that confirms your company or close corporation still exists on the register and updates key information CIPC uses to keep the public company record current. It is not a SARS tax return.',
      tag: 'OFFICIAL / plain-English paraphrase',
    },
    entity_scope: {
      title: 'v1 entity scope',
      tag: 'Sarah-approved 2026-08-07',
      body:
        'Standard Annual Returns v1 covers private companies ((Pty) Ltd) and close corporations only. NPCs and other entity types are later-phase and are not presented as v1 standard service.',
    },
    covers: {
      title: 'What this service covers',
      tag: 'Sarah-approved v1 — Annual Return filing only',
      items: [
        'Helping the client understand what CIPC requires for the Annual Return cycle for a private company or close corporation.',
        'Collecting the facts and supporting items needed for a complete Annual Return filing attempt.',
        'Identifying whether Beneficial Ownership and AFS/FAS prerequisites appear complete before submission, and referring incomplete prerequisites to the client for completion or quoting them separately.',
        'Preparing and submitting the Annual Return through CIPC e-Services / the Annual Returns system when a signed engagement/mandate and required information are complete.',
        'Capturing proof of filing (confirmation / certificate) and telling the client what was filed.',
        'Escalating to specialist review when the matter is outside a standard filing.',
      ],
    },
    does_not_cover: {
      title: 'What the service does not include',
      tag: 'Sarah-approved v1 exclusions',
      items: [
        'Beneficial Ownership filing as part of the standard Annual Returns service — BO gaps are identified and referred to the client for completion or quoted separately.',
        'Preparing FAS, preparing Annual Financial Statements, or performing an audit / independent review. Desk only checks whether FAS/AFS requirements appear met; accounting matters are referred to an accountant.',
        'Completing or owning the Annual Compliance Checklist — the client completes and takes ownership of Annual Compliance Checklists.',
        'NPC or other non-(Pty) Ltd / non-CC entities as v1 standard service (later-phase).',
        'Fixing historical registry errors, restorations, deregistrations, or MOI/share restructures.',
        'Guaranteeing that CIPC will accept, process, or complete any filing by a stated date.',
        'Acting as CIPC or giving formal legal opinions.',
        'Any Desk service-fee or pricing figures until the commercial pricing model is approved.',
      ],
    },
    client_checklist: {
      title: 'Client information and document checklist',
      intro:
        'Guided intake from the process pack (Sarah-approved v1). Mark items N/A when they do not apply. Standard v1 scope is private companies and close corporations only.',
      groups: [
        {
          name: 'Instructing party and authority',
          items: [
            'Instructing person full name, email, phone (always).',
            'Relationship to entity — director / member / accountant / authorised agent (always).',
            'Signed engagement / mandate confirming authority to act — required before filing (Sarah-approved).',
            'CIPC customer-code path: default to the client’s own CIPC customer code unless the client authorises an authorised practitioner code (Sarah-approved — both models supported).',
            'Billing contact for CIPC filing-fee funding only — no Desk service-fee or pricing wording until the commercial pricing model is approved.',
          ],
        },
        {
          name: 'Company registration details',
          items: [
            'Enterprise / registration number (always — validated in the Annual Returns system).',
            'Registered name as on CIPC record.',
            'Entity type — v1 standard service: private company ((Pty) Ltd) or close corporation only. NPC / other types → later-phase / specialist routing, not v1 standard.',
            'Incorporation / registration anniversary date if known.',
            'Current CIPC status (in business, AR deregistration process, final deregistered, etc.).',
            'Registered office / postal address if the client reports changes or mismatch (address change is a separate service).',
          ],
        },
        {
          name: 'Financial year and turnover',
          items: [
            'Financial year-end.',
            'Filing year(s) to be lodged (current and any arrears).',
            'Annual turnover for each outstanding year (used for CIPC fee calculation on CIPC systems — not a Desk service price).',
            CIPC_DESK_ANNUAL_RETURNS_DORMANT_WORDING,
            'Whether an AFS revenue figure was already filed (when AFS already submitted — turnover is validated against AFS revenue).',
          ],
        },
        {
          name: 'Beneficial Ownership dependencies',
          items: [
            'Is the entity a co-operative? (co-operatives are excepted from the BO Register — OFFICIAL).',
            'Has the latest BO declaration been filed for the relevant filing year? (hard-stop for companies and CCs from 1 July 2024 — OFFICIAL).',
            'If BO is incomplete: identify the gap and refer to the client for completion, or quote BO work separately — not included in standard Annual Returns service.',
            'Securities register and/or beneficial interest register when BO filing is required.',
            'Ownership structure summary when BO is not already complete (trusts / juristic / foreign → specialist review).',
          ],
        },
        {
          name: 'AFS / FAS dependencies (check only)',
          items: [
            'Check whether FAS or AFS requirements appear met for the filing year (OFFICIAL hard-stop requires AFS or FAS).',
            'Do not prepare FAS. Do not prepare AFS. Refer accounting matters to an accountant (Sarah-approved).',
            'If FAS/AFS is incomplete: refer to the client for completion or quote separately — not included in standard Annual Returns service.',
            'If AFS route: client/accountant supplies any iXBRL package — Desk does not invent financials.',
            'Public Interest Score / MOI audit clause uncertainty → specialist or accountant.',
          ],
        },
        {
          name: 'Compliance Checklist and acknowledgements',
          items: [
            'Annual Compliance Checklist: client completes and takes ownership (Sarah-approved). Not part of standard Annual Returns filing service.',
            'Signed engagement / mandate on file before filing.',
            'Client acknowledges Annual Return ≠ tax return and Annual Return ≠ Compliance Checklist.',
            'Client acknowledges no timing or outcome guarantee before submission.',
          ],
        },
      ],
    },
    status_flow: {
      title: 'Visible steps / status flow',
      intro: 'Minimum statuses for Annual Returns matters (process pack Layer 5).',
      steps: [
        { key: 'received', label: 'Received', meaning: 'Instruction accepted; intake not yet complete.' },
        {
          key: 'information_incomplete',
          label: 'Information incomplete',
          meaning: 'Missing facts, documents, or authority — plain-English missing-info list sent.',
        },
        {
          key: 'specialist_review',
          label: 'Specialist review',
          meaning: 'Outside standard path or legal / registry ambiguity — Sarah (or designated specialist) decides.',
        },
        {
          key: 'ready_for_submission',
          label: 'Ready for submission',
          meaning:
            'Signed engagement/mandate present; operator checklist green; BO and AFS/FAS prerequisites identified as met or separately handled; submit via CIPC when CIPC fee funding and authority are final.',
        },
        {
          key: 'submitted_externally',
          label: 'Submitted externally',
          meaning: 'Lodged / paid on CIPC systems; capture proof and monitor notices.',
        },
        {
          key: 'awaiting_cipc',
          label: 'Awaiting CIPC',
          meaning: 'Dependent on CIPC processing, review, or system — no false urgency promises.',
        },
        {
          key: 'completed',
          label: 'Completed',
          meaning: 'Filing confirmation / certificate on the matter record and client informed.',
        },
        {
          key: 'further_action_required',
          label: 'Further action required',
          meaning: 'CIPC query, rejection, dependency failure, or new discrepancy.',
        },
      ],
      notes: [
        'Do not mark completed on payment alone — need filing confirmation / certificate (OFFICIAL proof step).',
        'If reinstatement / deregistration is discovered, keep the matter as further action required or split a new matter.',
        'Do not proceed to ready for submission without a signed engagement/mandate confirming authority to act.',
      ],
    },
    exceptions: {
      title: 'Exceptions and escalation examples',
      intro: 'Matters here require specialist assessment before proceeding (process pack Layer 6 / #740).',
      items: [
        {
          name: 'Entity outside v1 scope (NPC / other)',
          action:
            'Not v1 standard Annual Returns service — later-phase / specialist routing; do not present as standard Pty Ltd / CC filing.',
        },
        {
          name: 'Unclear company type',
          action: 'Specialist review; pause submission — wrong BO / AFS / checklist route.',
        },
        {
          name: 'Historical filing discrepancies',
          action: 'Specialist review; gather CIPC screenshots / export notes.',
        },
        {
          name: 'Outstanding BO compliance',
          action:
            'Identify gap; refer to client for completion or quote separately; status not ready for standard AR submission while hard-stop blocks (OFFICIAL).',
        },
        {
          name: 'Unresolved AFS / FAS dependency',
          action:
            'Check-only posture: do not prepare FAS/AFS; refer accounting matters to an accountant; refer client for completion or quote separately.',
        },
        {
          name: 'Manual CIPC intervention required',
          action: 'Log enquiry path; awaiting CIPC / further action required.',
        },
        {
          name: 'Conflicting company records',
          action: 'Separate corrective service; do not force the Annual Return.',
        },
        {
          name: 'Statutory interpretation required',
          action: 'Specialist review — Sarah-confirmed mandatory class.',
        },
        {
          name: 'Entity in deregistration / final deregistered',
          action: 'Stop standard AR; escalate (may need reinstatement).',
        },
        {
          name: 'Trust / deceased estate / foreign complex ownership',
          action: 'Specialist review before BO / AR.',
        },
        {
          name: 'Suspected false or unverifiable information',
          action: 'Refuse filing; escalate to Sarah (false BO information is an offence — OFFICIAL).',
        },
      ],
    },
    approved_decisions: {
      title: 'Sarah-approved Annual Returns v1 decisions (2026-08-07)',
      intro:
        'These eight decisions replace the prior focused open questions for Annual Returns v1. No further Sarah clarification is required for these points unless implementation reveals a genuinely new ambiguity.',
      items: [
        'Customer code: support both models; default to the client’s own CIPC customer code unless the client authorises an authorised practitioner code.',
        'Standard Annual Returns service includes Annual Return filing only. BO and AFS/FAS prerequisites are identified and referred to the client for completion or quoted separately.',
        'Require a signed engagement/mandate confirming authority to act before filing.',
        'Check whether FAS/AFS requirements are met only. Do not prepare FAS. Refer accounting matters to an accountant.',
        'v1 entity scope: private companies and close corporations only. NPCs and other entities are later-phase.',
        `Approved dormant/non-trading wording: “${CIPC_DESK_ANNUAL_RETURNS_DORMANT_WORDING}”`,
        'Keep all service-fee/pricing wording out until the commercial pricing model is approved.',
        'Client completes and takes ownership of Annual Compliance Checklists.',
      ],
    },
    feedback_prompt: {
      title: 'Structured specialist feedback',
      intro:
        'Submit feedback through the existing CIPC Desk email-intake path. It stores a synthetic CMP ticket for tenant cipc-desk in the existing Postgres — no new schema, CRM, or email-send runtime. Use this if a genuinely new ambiguity appears after the 2026-08-07 decisions.',
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
 * Must include "Annual Returns review feedback" so service inference selects annual-returns.
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
export function buildAnnualReturnsReviewFeedbackEmail(fields = {}) {
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
    CIPC_DESK_ANNUAL_RETURNS_FEEDBACK_SUBJECT,
    '',
    'Synthetic / specialist review feedback for the CIPC Desk Annual Returns corpflow_test surface (#791).',
    'No real client data. No identity documents. No CIPC submission requested.',
    '',
    `Reviewer: ${str(fields.reviewer_name) || 'Sarah (specialist review)'}`,
    `Overall readiness: ${readinessLabel} (${readiness})`,
    `Content version: ${CIPC_DESK_ANNUAL_RETURNS_REVIEW_VERSION}`,
    '',
  ];

  for (const [label, value] of sections) {
    const text = str(value);
    if (!text) continue;
    lines.push(`${label}:`);
    lines.push(text);
    lines.push('');
  }

  lines.push('Service cue: annual returns (for email-intake routing).');

  return { ok: true, email_text: lines.join('\n').trim() };
}

/**
 * Resolve whether the request host may render the Annual Returns review page.
 * Fail closed unless tenant is cipc-desk (standing host, DB map, or verified preview).
 *
 * @param {{
 *   host?: string | null,
 *   tenantIdFromDb?: string | null,
 *   previewTenantId?: string | null,
 * }} args
 * @returns {{ allowed: boolean, tenantId: string, reason: string }}
 */
export function resolveCipcDeskAnnualReturnsPageAccess(args = {}) {
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
