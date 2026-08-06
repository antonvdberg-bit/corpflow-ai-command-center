/**
 * CIPC Desk — Annual Returns specialist-review surface content (#761).
 *
 * Content basis: six-layer process pack from #750 / PR #758
 * (docs/operations/CIPC_DESK_ANNUAL_RETURNS_PROCESS_PACK_V1.md) plus Sarah
 * guidance recorded in #740. Review-level wording only — corpflow_test.
 *
 * No fee tables. No timing/outcome guarantees. Provisional items labelled.
 */

import {
  CIPCDESK_TENANT_ID,
  resolveCipcDeskTenantIdFromHost,
} from '../server/cipc-desk-runtime.js';

export const CIPC_DESK_ANNUAL_RETURNS_REVIEW_VERSION = 'cipc-desk-ar-review-v1';

export const CIPC_DESK_ANNUAL_RETURNS_FEEDBACK_SUBJECT = 'Annual Returns review feedback';

/**
 * Structured review content for the standing CIPC test-site page.
 * @returns {Record<string, unknown>}
 */
export function buildCipcDeskAnnualReturnsReviewContent() {
  return {
    content_version: CIPC_DESK_ANNUAL_RETURNS_REVIEW_VERSION,
    source: {
      controlling_issue: '#761',
      process_pack: '#750 / PR #758',
      research_parent: '#740',
      coordination: '#640',
      environment: 'corpflow_test',
    },
    meta: {
      page_title: 'CIPC Desk · Annual Returns review',
      description:
        'Internal corpflow_test Annual Returns review surface for specialist feedback. Not a public launch. Not affiliated with CIPC.',
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
        'Items marked PROVISIONAL or SARAH CONFIRM are open for specialist correction. Do not treat this page as final public copy.',
    },
    explanation: {
      title: 'What an Annual Return is',
      body:
        'An Annual Return is a yearly filing with CIPC that confirms your company or close corporation still exists on the register and updates key information CIPC uses to keep the public company record current. It is not a SARS tax return.',
      tag: 'OFFICIAL / plain-English paraphrase',
    },
    covers: {
      title: 'What this service covers',
      tag: 'PRACTICAL — pending public copy approval',
      items: [
        'Helping the client understand what CIPC requires for the Annual Return cycle for their entity type.',
        'Collecting the facts and supporting items needed for a complete filing attempt.',
        'Checking whether Beneficial Ownership and AFS/FAS prerequisites appear complete before submission.',
        'Preparing and submitting the Annual Return through CIPC e-Services / the Annual Returns system when authority and information are complete.',
        'Capturing proof of filing (confirmation / certificate) and telling the client what was filed.',
        'Escalating to specialist review when the matter is outside a standard filing.',
      ],
    },
    does_not_cover: {
      title: 'What the service does not automatically include',
      tag: 'PROVISIONAL until Sarah confirms packaging',
      items: [
        'Preparing full Annual Financial Statements or performing an audit / independent review.',
        'Fixing historical registry errors, restorations, deregistrations, or MOI/share restructures.',
        'Guaranteeing that CIPC will accept, process, or complete any filing by a stated date.',
        'Acting as CIPC or giving formal legal opinions.',
        'Annual Compliance Checklist support as an automatic part of a standard Annual Returns fee (related but separate obligation — SARAH CONFIRM).',
      ],
    },
    client_checklist: {
      title: 'Client information and document checklist',
      intro:
        'Guided intake from the process pack. Mark items N/A when they do not apply. Not every item applies to every company type.',
      groups: [
        {
          name: 'Instructing party and authority',
          items: [
            'Instructing person full name, email, phone (always).',
            'Relationship to entity — director / member / accountant / authorised agent (always).',
            'Signed mandate / power of attorney / board or members’ resolution when CIPC Desk (or a non-director filer) will lodge (SARAH CONFIRM exact form).',
            'Confirmation Desk may use / access the relevant CIPC customer code when filing electronically (SARAH CONFIRM client vs Desk code).',
            'Billing contact and fee acceptance before paid work.',
          ],
        },
        {
          name: 'Company registration details',
          items: [
            'Enterprise / registration number (always — validated in the Annual Returns system).',
            'Registered name as on CIPC record.',
            'Entity type (Pty Ltd, Inc, Ltd, SOC, NPC, CC, external company, other) — conditional routing for BO / AFS / checklist.',
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
            'Annual turnover for each outstanding year (used for fee calculation on CIPC systems).',
            'Whether the entity is dormant / not trading (disclosure only — dormancy does not automatically remove AR duty; SARAH CONFIRM client wording).',
            'Whether an AFS revenue figure was already filed (when AFS already submitted — turnover is validated against AFS revenue).',
          ],
        },
        {
          name: 'Beneficial Ownership dependencies',
          items: [
            'Is the entity a co-operative? (co-operatives are excepted from the BO Register — OFFICIAL).',
            'Has the latest BO declaration been filed for the relevant filing year? (hard-stop for companies, external companies, and CCs from 1 July 2024 — OFFICIAL).',
            'Securities register and/or beneficial interest register when BO filing is required.',
            'Ownership structure summary when BO is not already complete (trusts / juristic / foreign → specialist review).',
          ],
        },
        {
          name: 'AFS / FAS / XBRL dependencies',
          items: [
            'Does the client / accountant say AFS (audit or independent review) is required this year? (hard-stop requires AFS or FAS — OFFICIAL).',
            'If FAS route: readiness to answer FAS prompts with client-confirmed answers.',
            'If AFS route: iXBRL package ready / accountant appointed — do not invent financials.',
            'Public Interest Score / MOI audit clause when AFS vs FAS is uncertain → specialist or accountant.',
          ],
        },
        {
          name: 'Proof and acknowledgements',
          items: [
            'Mandate / resolution on file when an agent files.',
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
          meaning: 'Operator checklist green; submit via CIPC when payment and authority are final.',
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
      ],
    },
    exceptions: {
      title: 'Exceptions and escalation examples',
      intro: 'Matters here require specialist assessment before proceeding (process pack Layer 6 / #740).',
      items: [
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
          action: 'BO path or specialist; status not ready for submission (OFFICIAL hard-stop).',
        },
        {
          name: 'Unresolved AFS / FAS / XBRL dependency',
          action: 'Accountant / specialist; do not invent figures (OFFICIAL financials hard-stop).',
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
    open_questions: {
      title: 'Focused questions still open for Sarah',
      intro: 'Copied from the process pack — answer only these for this review slice.',
      items: [
        'Customer code: client code, Desk code, or case-by-case?',
        'Standard AR package: what is included vs excluded (BO filing, FAS capture, AFS upload only, Compliance Checklist, arrears years)?',
        'Mandate form: which template must clients sign before Desk lodges?',
        'FAS content approval: operator-from-client answers OK, or specialist / accountant approval every time?',
        'Entity types in v1: confirm Pty Ltd + CC as standard; NPC / external / public as specialist-only?',
        'Dormant-company client wording: approve a single plain-English sentence?',
        'Any published fee or turnaround numbers: confirm none in customer materials for now?',
        'Compliance Checklist: in AR pack, separate pack, or later?',
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
    'Synthetic / specialist review feedback for the CIPC Desk Annual Returns corpflow_test surface (#761).',
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
