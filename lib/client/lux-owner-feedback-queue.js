/**
 * LuxeMaurice owner feedback delivery queue — operator control surface (config-backed).
 *
 * Items are synthesized from documented programme sources (#529, WBS, recovery audit,
 * content sprint, phase-1 gate). This is NOT live client-submitted runtime feedback.
 * Update this module when new owner feedback is captured in repo docs or issue comments.
 */

import { LUX_RECOVERY_ROADMAP_TICKET_ID } from '../cmp/_lib/client-decisions-client.js';

export const LUX_OWNER_FEEDBACK_QUEUE_META = {
  programmeIssue: '#529',
  recoveryTicketId: LUX_RECOVERY_ROADMAP_TICKET_ID,
  masterProgrammeTicketId: 'cmo8mjijk0000jl04l1jz0v6d',
  lastUpdated: '2026-07-08',
  dataSource: 'repo_docs_and_issue_529',
  operatorControlOnly: true,
  exactOwnerQuotesFound: true,
};

/** @typedef {'P0' | 'P1' | 'P2'} LuxOwnerFeedbackPriority */
/** @typedef {'queued' | 'in_progress' | 'blocked' | 'awaiting_client' | 'awaiting_anton' | 'responded'} LuxOwnerFeedbackStatus */

/**
 * @typedef {object} LuxOwnerFeedbackItem
 * @property {string} id
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
    id: 'FB-001',
    feedback:
      'Delivery has been too slow; LuxeMaurice is commercially at risk and trust is eroding because CorpFlow has been reactive instead of structured.',
    priority: 'P0',
    status: 'in_progress',
    affectedSurface: 'Recovery programme · #529',
    proposedResponse:
      'Run recovery under #529 with WBS chunks, visible operator queue, and approval gates — not scattered chat fixes.',
    nextVisibleFix: 'This owner feedback delivery queue + linked recovery review surface.',
    antonApprovalRequired: false,
    previewEvidenceLink: '/change/lux-feedback',
    sourceRef: 'GitHub #529 issue body (2026-07-06)',
  },
  {
    id: 'FB-002',
    feedback:
      'Client has independently redesigned and generated a substantially different system (Drive packages v1–v14) using other AI assistance.',
    priority: 'P0',
    status: 'queued',
    affectedSurface: 'Product direction · MVP scope',
    proposedResponse:
      'CorpFlow live tenant is production authority; Drive packages are reference input only until audit + scope reconciliation (#536 / #537).',
    nextVisibleFix: 'Recovery review page scope lock + written dual-truth clarification for Jan.',
    antonApprovalRequired: true,
    previewEvidenceLink: '/client/recovery-roadmap',
    sourceRef: 'GitHub #529 · docs/LUX/LUXEMAURICE_RECOVERY_AUDIT_V1.md',
  },
  {
    id: 'FB-003',
    feedback:
      'No first real client-published private opportunity on production — platform is brand-ready but not yet commercially showable without apology.',
    priority: 'P0',
    status: 'awaiting_client',
    affectedSurface: 'lux.corpflowai.com/properties · /property/[slug]',
    proposedResponse:
      'Content Population Sprint C2: one real Postgres listing with governed gallery imagery and concierge link after Jan approval.',
    nextVisibleFix: 'Jan content inputs for C2 (copy, imagery, approval) per content sprint brief.',
    antonApprovalRequired: false,
    previewEvidenceLink: 'https://lux.corpflowai.com/properties',
    sourceRef: 'docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md · docs/LUX/LUX_DELIVERY_PROGRAMME.md',
  },
  {
    id: 'FB-004',
    feedback: 'Homepage lacks real property imagery (hero, lifestyle, arrival, owner experience) — placeholders block commercial use.',
    priority: 'P1',
    status: 'awaiting_client',
    affectedSurface: 'lux.corpflowai.com/',
    proposedResponse: 'C1 imagery package from Jan → operator governed publish gate on homepage slots.',
    nextVisibleFix: 'Hand off docs/runbooks/LUX_CONTENT_SPRINT_C1_C2_JAN_CONTENT_BRIEF.md inputs.',
    antonApprovalRequired: false,
    previewEvidenceLink: 'https://lux.corpflowai.com/',
    sourceRef: 'docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md (C1 Open)',
  },
  {
    id: 'FB-005',
    feedback:
      'Recovery direction and Release 1 scope need Jan confirmation before the next bounded build packet opens.',
    priority: 'P0',
    status: 'awaiting_client',
    affectedSurface: '/client/recovery-roadmap · ticket cmr7a244f0000l505x5vne2s0',
    proposedResponse:
      'Anton previews recovery review → mint private decision link → Jan confirms or requests corrections (no auto-send).',
    nextVisibleFix: 'Operator mints decision link from /change recovery strip after Anton preview sign-off.',
    antonApprovalRequired: true,
    previewEvidenceLink: '/client/recovery-roadmap',
    sourceRef: 'docs/LUX/LUXEMAURICE_RECOVERY_WBS_AND_MVP_PLAN.md Chunk 4 · #529 P0 comment',
  },
  {
    id: 'FB-006',
    feedback: '/change Proceed flow was broken (`denyTicketClosed is not defined`) — control plane unusable for approvals.',
    priority: 'P0',
    status: 'in_progress',
    affectedSurface: 'lux.corpflowai.com/change · ticket approval',
    proposedResponse: 'Fix #528 regression first; verify Proceed on preview before any client-visible recovery send.',
    nextVisibleFix: 'Confirm #528 fix on preview; record operator evidence on recovery ticket.',
    antonApprovalRequired: false,
    previewEvidenceLink: 'https://lux.corpflowai.com/change',
    sourceRef: 'GitHub #529 comment (2026-07-06) · issue #528',
  },
  {
    id: 'FB-007',
    feedback: 'Ticket email updates to Jan are not live-verified — sending before proof would damage credibility further.',
    priority: 'P1',
    status: 'blocked',
    affectedSurface: 'n8n lux_ticket_update · /change notify bar',
    proposedResponse: 'Verify n8n route end-to-end with operator test only; Jan test only after Chunk 7 green.',
    nextVisibleFix: 'Operator verifies lux_ticket_update branch before enabling Jan notifications.',
    antonApprovalRequired: true,
    sourceRef: 'docs/LUX/LUXEMAURICE_RECOVERY_WBS_AND_MVP_PLAN.md § blockers · #529',
  },
  {
    id: 'FB-008',
    feedback: 'Editor E2E (login → create/edit → publish → public render) has not been verified with Jan on production.',
    priority: 'P1',
    status: 'queued',
    affectedSurface: '/properties/admin · Content sprint C4',
    proposedResponse: 'Schedule C4 Jan validation session on production with operator co-pilot only if needed.',
    nextVisibleFix: 'C2 real listing published → open C4 validation checklist with Jan.',
    antonApprovalRequired: true,
    previewEvidenceLink: 'https://lux.corpflowai.com/properties/admin',
    sourceRef: 'docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md (C4) · recovery audit §4.3',
  },
  {
    id: 'FB-009',
    feedback:
      'Risk that Jan treats v14 enterprise package as deployable production product instead of CorpFlow tenant (dual-truth).',
    priority: 'P0',
    status: 'in_progress',
    affectedSurface: 'Client comms · MVP reconciliation',
    proposedResponse:
      'Written recovery note: CorpFlow `lux.corpflowai.com` is authoritative; v14 is reference spec until reconciled.',
    nextVisibleFix: 'Internal recovery comms draft (#538) — Anton approves before any send.',
    antonApprovalRequired: true,
    sourceRef: 'docs/LUX/LUXEMAURICE_RECOVERY_AUDIT_V1.md § dual-truth · WBS Chunk 4',
  },
  {
    id: 'FB-010',
    feedback: 'Phase 1 tone/positioning/concierge path needs explicit client direction approval before Phase 2 property discovery opens.',
    priority: 'P1',
    status: 'awaiting_client',
    affectedSurface: '/ · /concierge · Phase 1 review ticket',
    proposedResponse: 'Phase 1 client-decisions flow on master programme ticket — confirm before IDX/listings scope.',
    nextVisibleFix: 'Mint Phase 1 decision link from /change if not already answered.',
    antonApprovalRequired: true,
    previewEvidenceLink: 'https://lux.corpflowai.com/concierge',
    sourceRef: 'docs/LUX/PHASE1_PRODUCTION_VERIFICATION_AND_CLIENT_NOTE.md',
  },
];

/** @type {Array<{ hours: string, title: string, owner: string, outcome: string; antonGate: boolean }>} */
export const LUX_OWNER_FEEDBACK_NEXT_SLICE = [
  {
    hours: '0–2h',
    title: 'Operator reviews feedback queue + recovery ticket',
    owner: 'Anton / Cursor',
    outcome: 'Priorities confirmed; FB-001/FB-006 status updated on this page after verification.',
    antonGate: false,
  },
  {
    hours: '2–4h',
    title: 'Preview recovery review + mint decision link (if Proceed stable)',
    owner: 'Anton',
    outcome: 'Jan can open /client/recovery-roadmap via private link — no auto-send.',
    antonGate: true,
  },
  {
    hours: '4–6h',
    title: 'Request Jan C1/C2 content inputs (internal handoff only)',
    owner: 'Anton',
    outcome: 'Content sprint unblocked for first real listing slice — no production deploy without approval.',
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
