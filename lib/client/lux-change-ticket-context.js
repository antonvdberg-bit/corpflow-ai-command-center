import { classifyLuxChangeQueueTicket } from './lux-change-queue-classify.js';
import { isLuxContentSprintTicket } from './lux-content-sprint-guidance.js';

/**
 * @typedef {'build_recovery' | 'media_property' | 'concierge_crm' | 'generic'} LuxChangeTicketContext
 */

/**
 * @typedef {{
 *   context: LuxChangeTicketContext,
 *   label: string,
 *   buildControlFocus: boolean,
 *   mediaWorkspaceDefaultOpen: boolean,
 *   mediaLibraryDefaultOpen: boolean,
 *   crmLeadsDefaultOpen: boolean,
 *   attachmentsDefaultOpen: boolean,
 *   uploadPanelDefaultOpen: boolean,
 * }} LuxChangeTicketContextProfile
 */

const BUILD_RECOVERY_HAY = /\brecovery\b|\bre-?cover\b|\bmvp\b|\baudit\b|\bprogramme\b|\bchange\s*request\b|\bestimate\b|\bbuild\b|\bconsole\b|\bapproval\b|\bdelivery\b|\bhandover\b|\btechnical\s*lead\b/i;
const MEDIA_HAY = /\bproperty\b|listing|lux.?listing|hero\s*slot|card\s*slot|\bgallery\b|attachments?\b|media\s*govern|\b(un)?publish\b|property-?media|listing\s*admin|\/properties/i;
const CRM_HAY = /\bconcierge\b|\bcrm\b|\b(enquiry|inquiry)\b|\bleads?\b/i;

/**
 * Selected-ticket context for Lux `/change` panel defaults (client-only).
 *
 * @param {{
 *   ticket_id?: string,
 *   requested_change?: string,
 *   status?: string|null,
 *   stage?: string|null,
 *   workflow_state?: string|null,
 *   lux_sprint_meta?: { sprint_code?: string|null }|null,
 * }} row
 * @returns {LuxChangeTicketContextProfile}
 */
export function classifyLuxChangeTicketContext(row) {
  const sprintMeta = row?.lux_sprint_meta && typeof row.lux_sprint_meta === 'object' ? row.lux_sprint_meta : null;
  if (isLuxContentSprintTicket(sprintMeta)) {
    return profileFor('media_property', 'Property & media sprint');
  }

  const { bucket } = classifyLuxChangeQueueTicket(row);
  const hay = `${row?.ticket_id || ''} ${row?.requested_change || ''}`.toLowerCase();

  if (bucket === 'crm_leads' || CRM_HAY.test(hay)) {
    return profileFor('concierge_crm', 'Concierge / CRM');
  }

  if (bucket === 'property_media' || MEDIA_HAY.test(hay)) {
    return profileFor('media_property', 'Property & media');
  }

  if (
    bucket === 'programme' ||
    bucket === 'active_client' ||
    BUILD_RECOVERY_HAY.test(hay) ||
    isBuildWorkflowState(row?.workflow_state)
  ) {
    return profileFor('build_recovery', 'Build / recovery control');
  }

  return profileFor('generic', 'General ticket');
}

/**
 * @param {LuxChangeTicketContext} context
 * @param {string} label
 * @returns {LuxChangeTicketContextProfile}
 */
function profileFor(context, label) {
  switch (context) {
    case 'build_recovery':
      return {
        context,
        label,
        buildControlFocus: true,
        mediaWorkspaceDefaultOpen: false,
        mediaLibraryDefaultOpen: false,
        crmLeadsDefaultOpen: false,
        attachmentsDefaultOpen: false,
        uploadPanelDefaultOpen: false,
      };
    case 'media_property':
      return {
        context,
        label,
        buildControlFocus: false,
        mediaWorkspaceDefaultOpen: true,
        mediaLibraryDefaultOpen: true,
        crmLeadsDefaultOpen: false,
        attachmentsDefaultOpen: true,
        uploadPanelDefaultOpen: true,
      };
    case 'concierge_crm':
      return {
        context,
        label,
        buildControlFocus: false,
        mediaWorkspaceDefaultOpen: false,
        mediaLibraryDefaultOpen: false,
        crmLeadsDefaultOpen: true,
        attachmentsDefaultOpen: false,
        uploadPanelDefaultOpen: false,
      };
    default:
      return {
        context: 'generic',
        label,
        buildControlFocus: false,
        mediaWorkspaceDefaultOpen: false,
        mediaLibraryDefaultOpen: false,
        crmLeadsDefaultOpen: false,
        attachmentsDefaultOpen: false,
        uploadPanelDefaultOpen: false,
      };
  }
}

/**
 * @param {string|null|undefined} workflowState
 * @returns {boolean}
 */
function isBuildWorkflowState(workflowState) {
  const wf = String(workflowState || '').trim().toLowerCase();
  if (!wf) return false;
  return (
    wf === 'ready_for_estimate' ||
    wf === 'estimated' ||
    wf === 'approved_for_build' ||
    wf === 'building' ||
    wf === 'in_review' ||
    wf === 'preview_ready' ||
    wf === 'changes_requested' ||
    wf === 'client_approved' ||
    wf === 'awaiting_client_programme_decisions'
  );
}

/**
 * Merge hash-navigation override for media workspace deep links.
 *
 * @param {LuxChangeTicketContextProfile} profile
 * @param {{ mediaWorkspaceHashOpen?: boolean }} [opts]
 * @returns {LuxChangeTicketContextProfile}
 */
export function applyLuxChangeContextHashOverrides(profile, opts = {}) {
  if (!profile || opts.mediaWorkspaceHashOpen !== true) return profile;
  return {
    ...profile,
    mediaWorkspaceDefaultOpen: true,
    mediaLibraryDefaultOpen: true,
  };
}
