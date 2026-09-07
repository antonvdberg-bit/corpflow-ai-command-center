export const QUOTATION_NAME = 'SAL-QTN-2026-00005';
export const TERMS_NAME = 'CF882 CorpFlowAI Commercial Terms';
export const PRINT_FORMAT = 'Quotation Standard';

export function assess1196Repair({ quotation, termsMaster }) {
  const blockers = [];
  if (!quotation || quotation.name !== QUOTATION_NAME) blockers.push('QUOTATION_NOT_FOUND');
  if (Number(quotation?.docstatus) !== 0) blockers.push('QUOTATION_NOT_DRAFT');
  if (String(quotation?.tc_name || '').trim() !== TERMS_NAME) blockers.push('TERMS_NAME_MISMATCH');
  if (!String(termsMaster?.terms || '').trim()) blockers.push('TERMS_MASTER_EMPTY');

  const quotationTerms = String(quotation?.terms || '').trim();
  const masterTerms = String(termsMaster?.terms || '').trim();
  return {
    ok: blockers.length === 0,
    blockers,
    already_repaired: Boolean(quotationTerms) && quotationTerms === masterTerms,
    quotation_terms_present: Boolean(quotationTerms),
    master_terms_present: Boolean(masterTerms),
    repair_payload: blockers.length ? null : { terms: masterTerms },
  };
}
