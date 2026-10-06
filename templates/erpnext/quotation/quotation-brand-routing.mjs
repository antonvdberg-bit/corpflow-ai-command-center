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

export const MAX_ITEM_GROUP_ANCESTRY_DEPTH = 8;

function normalizeGroup(itemGroup) {
  return typeof itemGroup === 'string' ? itemGroup.trim() : '';
}

function brandForGroup(group) {
  if (group === QUOTATION_BRAND_ROOTS.corpflowai) return 'corpflowai';
  if (group === QUOTATION_BRAND_ROOTS.businessAdminDesk) return 'business_admin_desk';
  return null;
}

export function resolveQuotationGroupBrand(
  itemGroup,
  parentResolver = () => null,
  maxDepth = MAX_ITEM_GROUP_ANCESTRY_DEPTH,
) {
  let currentGroup = normalizeGroup(itemGroup);
  const depthLimit = Number.isInteger(maxDepth) && maxDepth > 0
    ? maxDepth
    : MAX_ITEM_GROUP_ANCESTRY_DEPTH;

  for (let depth = 0; currentGroup && depth < depthLimit; depth += 1) {
    const brand = brandForGroup(currentGroup);
    if (brand) return brand;
    currentGroup = normalizeGroup(parentResolver(currentGroup));
  }

  return null;
}

export function classifyQuotationBrand(itemGroups, parentResolver = () => null) {
  const groups = Array.isArray(itemGroups) ? itemGroups : [];
  const hasCorpFlowAI = groups.some((group) =>
    resolveQuotationGroupBrand(group, parentResolver) === 'corpflowai',
  );
  const hasBusinessAdminDesk = groups.some((group) =>
    resolveQuotationGroupBrand(group, parentResolver) === 'business_admin_desk',
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
