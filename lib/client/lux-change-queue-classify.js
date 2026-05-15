import { LUX_PARENT_PROGRAMME_TICKET_ID } from '../cmp/_lib/lux-client-requests.js';
import { LUX_PHASE1_REVIEW_TICKET_ID } from '../cmp/_lib/client-decisions-client.js';

/**
 * @typedef {'programme' | 'active_client' | 'property_media' | 'crm_leads' | 'internal' | 'archived_smoke'} LuxQueueBucket
 */

/**
 * Title / id are effectively empty for operator UX (still kept in data).
 *
 * @param {{ ticket_id?: string, requested_change?: string }} row
 */
export function isLuxQueueRowEffectivelyBlank(row) {
  const raw = row?.requested_change != null ? String(row.requested_change) : '';
  const t = raw.replace(/\u2014/g, '-').trim();
  if (!t) return true;
  if (t === '—' || t === '-' || t === '–') return true;
  if (t.length <= 1) return true;
  return false;
}

/**
 * Heuristic: Phase 4 / QA / attachment smoke / automated review artifacts — collapsed bucket, not deleted.
 *
 * @param {string} hay lowercased id + title
 */
function matchesArchivedSmokeHaystack(hay) {
  if (
    /\bsmoke\b|\btest\b|qa\s*fixture|verification\s*artifact|phase\s*[0-9][a-z.]?\s*smoke|example\.invalid|\/smoke\//i.test(
      hay,
    )
  ) {
    return true;
  }
  if (/\bphase\s*4|p4[\s_-]*smoke|phase-?4c|4c\d?\s*smoke|slice\s*[a-z]\s*smoke/i.test(hay)) return true;
  if (/\battachment\s*(smoke|fixture|qa)|\bsmoke\b.*\battachment\b|\bqa\b.*\battachment\b/i.test(hay)) return true;
  if (/\bautomated\b.*\b(review|attachment)|\boperator\b.*\b(filter|review).*(\bsmoke\b|\bqa\b)/i.test(hay)) return true;
  if (/\btechnical\s*lead\b.*(\bsmoke\b|fixture|audit)|\btl\b.*\bsmoke\b/i.test(hay)) return true;
  if (/\blifecycle\b.*\b(qa|fixture|smoke)\b|\bqa\b.*\blifecycle\b/i.test(hay)) return true;
  if (/\bsmoke-test|smoke_test|_smoke\b|\bsmoke\b.*\b(ticket|run|suite)\b/i.test(hay)) return true;
  if (/\bpreview-only\b.*\bverification\b|\bverification\b.*\b(preview|fixture)\b/i.test(hay)) return true;
  return false;
}

/**
 * @param {{ ticket_id?: string, requested_change?: string }} row
 * @returns {{ bucket: LuxQueueBucket, badge: string }}
 */
export function classifyLuxChangeQueueTicket(row) {
  const id = String(row?.ticket_id || '').trim();
  const title = String(row?.requested_change || '').trim();
  const hay = `${id} ${title}`.toLowerCase();

  if (id === LUX_PARENT_PROGRAMME_TICKET_ID) {
    return { bucket: 'programme', badge: 'Programme' };
  }
  if (id === LUX_PHASE1_REVIEW_TICKET_ID) {
    return { bucket: 'programme', badge: 'Programme' };
  }

  if (matchesArchivedSmokeHaystack(hay)) {
    return { bucket: 'archived_smoke', badge: 'Smoke / archive' };
  }

  if (isLuxQueueRowEffectivelyBlank(row)) {
    return { bucket: 'internal', badge: 'Internal' };
  }

  if (/\bconcierge\b|\bcrm\b|\b(enquiry|inquiry)\b|\bleads?\b.*\b(workflow|intake|capture)|\bintake\b.*\b(lead|crm)/i.test(hay)) {
    return { bucket: 'crm_leads', badge: 'CRM / leads' };
  }

  if (
    /\bproperty\b|listing|lux.?postgres|\/properties|property.?editor|slug\s*lm-|lux.?listing|hero\s*slot|card\s*slot|\bgallery\b|attachments?\b|\/attachment|media\s*govern|\b(un)?publish\b|property-?media|listing\s*admin/i.test(
      hay,
    )
  ) {
    return { bucket: 'property_media', badge: 'Property & media' };
  }

  if (/\bclient\s*request\b|programme\s*decision|change\s*request|estimate|build\s*console/i.test(hay)) {
    return { bucket: 'active_client', badge: 'Active request' };
  }

  return { bucket: 'active_client', badge: 'Active request' };
}

/**
 * @typedef {{ ticket_id?: string, requested_change?: string }} LuxQueueRow
 */

/**
 * Preserve API order while splitting into operator workspace groups.
 *
 * @param {LuxQueueRow[]} tickets
 * @returns {{
 *   programme: LuxQueueRow[],
 *   activeClient: LuxQueueRow[],
 *   propertyMedia: LuxQueueRow[],
 *   crmLeads: LuxQueueRow[],
 *   internal: LuxQueueRow[],
 *   archivedSmoke: LuxQueueRow[],
 *   counts: Record<string, number>,
 * }}
 */
export function groupLuxOperatorQueueTickets(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  const programme = [];
  const activeClient = [];
  const propertyMedia = [];
  const crmLeads = [];
  const internal = [];
  const archivedSmoke = [];

  for (const t of list) {
    const { bucket } = classifyLuxChangeQueueTicket(t);
    switch (bucket) {
      case 'programme':
        programme.push(t);
        break;
      case 'archived_smoke':
        archivedSmoke.push(t);
        break;
      case 'internal':
        internal.push(t);
        break;
      case 'crm_leads':
        crmLeads.push(t);
        break;
      case 'property_media':
        propertyMedia.push(t);
        break;
      case 'active_client':
        activeClient.push(t);
        break;
      default:
        activeClient.push(t);
    }
  }

  const counts = {
    programme: programme.length,
    activeClient: activeClient.length,
    propertyMedia: propertyMedia.length,
    crmLeads: crmLeads.length,
    internal: internal.length,
    archivedSmoke: archivedSmoke.length,
    total: list.length,
  };

  return { programme, activeClient, propertyMedia, crmLeads, internal, archivedSmoke, counts };
}

/**
 * Legacy split: everything except archived smoke stays in primary (original relative order).
 *
 * @param {LuxQueueRow[]} tickets
 * @returns {{ primary: LuxQueueRow[], smoke: LuxQueueRow[] }}
 */
export function partitionLuxChangeQueueTickets(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  const primary = [];
  const smoke = [];
  for (const t of list) {
    if (classifyLuxChangeQueueTicket(t).bucket === 'archived_smoke') smoke.push(t);
    else primary.push(t);
  }
  return { primary, smoke };
}
