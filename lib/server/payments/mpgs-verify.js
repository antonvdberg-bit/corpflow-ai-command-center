/**
 * Server-side MPGS Retrieve Order verification — amount/currency match required.
 * Browser resultIndicator is never an input here.
 */

import { isMpgsOrderVerifiedPaid as isGatewayStatusPaid } from './mpgs-client.js';

/**
 * @param {string | number | null | undefined} amountDecimal e.g. "150.00"
 * @returns {number | null}
 */
export function amountDecimalToMinor(amountDecimal) {
  const n = Number(amountDecimal);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/**
 * @param {{ status?: string, amountDecimal?: string | number | null, currency?: string | null }} retrieved
 * @param {{ amountMinor: number, currency: string }} expected
 */
export function verifyMpgsRetrieveMatchesRecord(retrieved, expected) {
  if (!isGatewayStatusPaid(retrieved)) {
    return { verified: false, reason: 'gateway_status_not_paid' };
  }

  const retrievedMinor = amountDecimalToMinor(retrieved?.amountDecimal);
  if (retrievedMinor == null) {
    return { verified: false, reason: 'missing_gateway_amount' };
  }
  if (retrievedMinor !== expected.amountMinor) {
    return { verified: false, reason: 'amount_mismatch', expected_minor: expected.amountMinor, retrieved_minor: retrievedMinor };
  }

  const expectedCurrency = String(expected.currency || '').trim().toUpperCase();
  const retrievedCurrency = String(retrieved?.currency || '').trim().toUpperCase();
  if (!expectedCurrency || !retrievedCurrency || expectedCurrency !== retrievedCurrency) {
    return { verified: false, reason: 'currency_mismatch', expected_currency: expectedCurrency, retrieved_currency: retrievedCurrency };
  }

  return { verified: true };
}
