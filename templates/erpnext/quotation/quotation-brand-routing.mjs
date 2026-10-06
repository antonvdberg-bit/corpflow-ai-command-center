/**
 * Deterministic quotation identity routing.
 *
 * ERPNext remains the renderer and source of commercial truth. This helper
 * mirrors the Item Group roots used by the Jinja Print Formats so the
 * classification contract can be tested without a live ERPNext write.
 */

export const QUOTATION_BRAND_ROOTS = Object.freeze({
  corpflowai: 'CorpFlowAI Services',
  businessAdminDesk: 'Business Admin Desk Services',
});

function belongsToRoot(itemGroup, root) {
  if (typeof itemGroup !== 'string' || !itemGroup.trim()) return false;
  const normalized = itemGroup.trim();
  return normalized === root || normalized.startsWith(`${root} /`);
}

export function classifyQuotationBrand(itemGroups) {
  const groups = Array.isArray(itemGroups) ? itemGroups : [];
  const hasCorpFlowAI = groups.some((group) =>
    belongsToRoot(group, QUOTATION_BRAND_ROOTS.corpflowai),
  );
  const hasBusinessAdminDesk = groups.some((group) =>
    belongsToRoot(group, QUOTATION_BRAND_ROOTS.businessAdminDesk),
  );

  if (groups.length === 0 || (!hasCorpFlowAI && !hasBusinessAdminDesk)) {
    return 'unknown';
  }
  if (hasCorpFlowAI && hasBusinessAdminDesk) return 'mixed';
  return hasBusinessAdminDesk ? 'business_admin_desk' : 'corpflowai';
}

export function isClientReadyQuotationBrand(classification) {
  return classification === 'corpflowai' || classification === 'business_admin_desk';
}
