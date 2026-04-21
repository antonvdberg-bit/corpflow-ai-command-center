/**
 * Applies visual delivery-integrity gate before exposing `client_site_preview_url`.
 */

import { evaluateVisualClientPreviewGate } from './delivery-integrity-visual.js';
import { buildTenantSiteJsonForTenantId } from './tenant-site-public.js';
import { withClientSitePreviewFields } from './tenant-preview-token.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   ticketRow: { id: string; tenantId?: string | null; description?: string | null; consoleJson?: unknown };
 *   automation: Record<string, unknown>;
 *   previewUrl: string | null | undefined;
 *   eventSource?: string;
 * }} opts
 * @returns {Promise<{ automation: Record<string, unknown>; gate: Record<string, unknown> }>}
 */
export async function applyVisualClientPreviewGate(prisma, opts) {
  const ticketRow = opts.ticketRow;
  const previewUrl = opts.previewUrl != null ? String(opts.previewUrl).trim() : '';
  const tenantId = ticketRow?.tenantId != null ? String(ticketRow.tenantId).trim() : '';

  const gate = await evaluateVisualClientPreviewGate({
    ticketId: ticketRow.id,
    tenantId,
    description: ticketRow.description,
    consoleJson: ticketRow.consoleJson,
    loadSite: () => buildTenantSiteJsonForTenantId(prisma, tenantId),
  });

  let automation = withClientSitePreviewFields(opts.automation, previewUrl || null, tenantId);

  if (gate.visual_gate_evaluated && !gate.allow) {
    delete automation.client_site_preview_url;
    delete automation.client_site_preview_updated_at;
    automation.client_site_preview_blocked_at = new Date().toISOString();
    automation.client_site_preview_block_code = gate.block_code || 'VISUAL_CHANGE_NOT_APPLIED';
    try {
      await recordTrustedAutomationEvent(prisma, {
        tenantId: tenantId || null,
        eventType: 'delivery_no_visible_change',
        payload: {
          ticket_id: ticketRow.id,
          expected_change_type: String(gate.change_type || 'visual'),
          detected_state: {
            block_code: gate.block_code || null,
            change_type: gate.change_type ?? null,
            hero_image_url: gate.hero_image_url ?? null,
            baseline_hero_image_url: gate.baseline_hero_image_url ?? null,
            hero_image_source: gate.hero_image_source ?? null,
          },
        },
        source: opts.eventSource || 'client_preview_gate',
      });
    } catch {
      /* best-effort */
    }
  } else {
    delete automation.client_site_preview_blocked_at;
    delete automation.client_site_preview_block_code;
  }

  return { automation, gate };
}

/**
 * Merge `delivery_integrity` snapshot from gate into `client_view` for Change Console.
 *
 * @param {Record<string, unknown>} clientView
 * @param {{ allow?: boolean; visual_gate_evaluated?: boolean; next_delivery_integrity?: Record<string, unknown> }} gate
 * @returns {Record<string, unknown>}
 */
export function mergeDeliveryIntegrityIntoClientView(clientView, gate) {
  const cv = clientView && typeof clientView === 'object' ? { ...clientView } : {};
  if (gate.next_delivery_integrity && typeof gate.next_delivery_integrity === 'object') {
    cv.delivery_integrity = { ...gate.next_delivery_integrity };
  }
  if (gate.visual_gate_evaluated && !gate.allow) {
    cv.client_preview_blocked_message =
      'Requested visual change not applied — preview blocked. Update the site draft hero image so it differs from the recorded baseline, then refresh promotion.';
  } else {
    delete cv.client_preview_blocked_message;
  }
  return cv;
}
