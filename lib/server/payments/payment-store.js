/**
 * Payment record + attempt persistence (PAY-SBM-4).
 */

import { randomBytes } from 'crypto';

import {
  maskCardLastFour,
  retrieveMpgsOrder,
  sanitizeMpgsResponseForLog,
} from './mpgs-client.js';
import { isMpgsMockMode } from './mpgs-config.js';
import { verifyMpgsRetrieveMatchesRecord } from './mpgs-verify.js';

export const PAYMENT_RECORD_STATUSES = Object.freeze({
  APPROVED: 'approved',
  LINK_ISSUED: 'link_issued',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

export const PAYMENT_ATTEMPT_STATUSES = Object.freeze({
  PENDING: 'pending',
  LINK_CREATED: 'link_created',
  REDIRECT_SEEN: 'redirect_seen',
  VERIFIED_PAID: 'verified_paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

export const FULFILMENT_STATUSES = Object.freeze({
  BLOCKED: 'blocked',
  READY: 'ready',
  STARTED: 'started',
  COMPLETE: 'complete',
});

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export function createPaymentStore(prisma) {
  return {
    async createRecord(input) {
      const recordReference = input.recordReference || generateRecordReference();
      return prisma.paymentRecord.create({
        data: {
          recordReference,
          source: input.source || 'manual',
          sourceId: input.sourceId || null,
          purchaserName: input.purchaserName,
          purchaserEmail: input.purchaserEmail,
          amountMinor: input.amountMinor,
          currency: input.currency,
          description: input.description || null,
          status: PAYMENT_RECORD_STATUSES.APPROVED,
          approvedBy: input.approvedBy || null,
          fulfilmentStatus: FULFILMENT_STATUSES.BLOCKED,
        },
      });
    },

    async getRecordById(id) {
      return prisma.paymentRecord.findUnique({ where: { id } });
    },

    async getRecordByReference(recordReference) {
      return prisma.paymentRecord.findUnique({ where: { recordReference } });
    },

    async createAttempt(paymentRecordId, input) {
      const attemptReference = input.attemptReference || generateAttemptReference();
      return prisma.paymentAttempt.create({
        data: {
          paymentRecordId,
          attemptReference,
          status: PAYMENT_ATTEMPT_STATUSES.PENDING,
          gatewayMode: input.gatewayMode || 'test',
          flowType: input.flowType || 'payment_link',
        },
      });
    },

    async attachLinkSession(attemptReference, session) {
      const attempt = await prisma.paymentAttempt.update({
        where: { attemptReference },
        data: {
          status: PAYMENT_ATTEMPT_STATUSES.LINK_CREATED,
          mpgsOrderId: session.orderId,
          mpgsSessionId: session.sessionId,
          successIndicator: session.successIndicator,
          paymentLinkUrl: session.paymentLinkUrl,
          metadataJson: session.raw || {},
        },
      });
      await prisma.paymentRecord.update({
        where: { id: attempt.paymentRecordId },
        data: { status: PAYMENT_RECORD_STATUSES.LINK_ISSUED },
      });
      return attempt;
    },

    async recordRedirectSeen(attemptReference, resultIndicator) {
      const existing = await prisma.paymentAttempt.findUnique({ where: { attemptReference } });
      if (!existing) return null;
      if (
        existing.status === PAYMENT_ATTEMPT_STATUSES.VERIFIED_PAID ||
        existing.status === PAYMENT_ATTEMPT_STATUSES.CANCELLED
      ) {
        return existing;
      }
      if (existing.status === PAYMENT_ATTEMPT_STATUSES.REDIRECT_SEEN && existing.redirectSeenAt) {
        return existing;
      }
      return prisma.paymentAttempt.update({
        where: { attemptReference },
        data: {
          status: PAYMENT_ATTEMPT_STATUSES.REDIRECT_SEEN,
          redirectSeenAt: new Date(),
          resultIndicatorSeen: resultIndicator ? String(resultIndicator) : null,
        },
      });
    },

    async recordCancel(attemptReference) {
      const existing = await prisma.paymentAttempt.findUnique({ where: { attemptReference } });
      if (!existing) return null;
      if (existing.status === PAYMENT_ATTEMPT_STATUSES.VERIFIED_PAID) {
        return existing;
      }
      if (existing.status === PAYMENT_ATTEMPT_STATUSES.CANCELLED) {
        return existing;
      }
      return prisma.paymentAttempt.update({
        where: { attemptReference },
        data: { status: PAYMENT_ATTEMPT_STATUSES.CANCELLED },
      });
    },

    async getAttemptByReference(attemptReference) {
      return prisma.paymentAttempt.findUnique({
        where: { attemptReference },
        include: { paymentRecord: true },
      });
    },

    async verifyAndMaybeMarkPaid(attemptReference) {
      const row = await prisma.paymentAttempt.findUnique({
        where: { attemptReference },
        include: { paymentRecord: true },
      });
      if (!row) {
        return { ok: false, error: 'attempt_not_found' };
      }
      if (row.status === PAYMENT_ATTEMPT_STATUSES.VERIFIED_PAID) {
        return { ok: true, alreadyPaid: true, attempt: row, record: row.paymentRecord };
      }

      const record = row.paymentRecord;
      const retrieved = await retrieveMpgsOrder(attemptReference);
      if (isMpgsMockMode()) {
        retrieved.amountDecimal = (record.amountMinor / 100).toFixed(2);
        retrieved.currency = record.currency;
      }

      const match = verifyMpgsRetrieveMatchesRecord(retrieved, {
        amountMinor: record.amountMinor,
        currency: record.currency,
      });

      if (!match.verified) {
        const updated = await prisma.paymentAttempt.update({
          where: { attemptReference },
          data: {
            gatewayStatus: retrieved.status || 'unknown',
            metadataJson: {
              ...(row.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {}),
              last_retrieve: sanitizeMpgsResponseForLog(retrieved.raw),
              verify_reason: match.reason,
            },
          },
        });
        return { ok: true, verified: false, attempt: updated, record, retrieved, verifyReason: match.reason };
      }

      const now = new Date();
      const updatedAttempt = await prisma.paymentAttempt.update({
        where: { attemptReference },
        data: {
          status: PAYMENT_ATTEMPT_STATUSES.VERIFIED_PAID,
          verifiedPaidAt: now,
          gatewayStatus: retrieved.status,
          authorizationCode: retrieved.authorizationCode,
          cardLastFour: maskCardLastFour(retrieved.cardLastFour),
          metadataJson: {
            ...(row.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {}),
            verified_retrieve: sanitizeMpgsResponseForLog(retrieved.raw),
          },
        },
      });

      const updatedRecord = await prisma.paymentRecord.update({
        where: { id: record.id },
        data: {
          status: PAYMENT_RECORD_STATUSES.PAID,
          paidAt: now,
          // Operator review only — do not auto-start fulfilment in PAY-SBM-4 v1.
          fulfilmentStatus: FULFILMENT_STATUSES.BLOCKED,
        },
      });

      return {
        ok: true,
        verified: true,
        attempt: updatedAttempt,
        record: updatedRecord,
        retrieved,
      };
    },
  };
}

export function generateRecordReference() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = randomBytes(3).toString('hex');
  return `PR-${ts}-${rand}`;
}

export function generateAttemptReference() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = randomBytes(4).toString('hex');
  return `CFLR-${ts}-${rand}`;
}

/**
 * Browser return — records redirect as informational, then Retrieve Order verifies.
 * resultIndicator never marks paid.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ attemptRef: string, resultIndicator?: string | null }} input
 */
export async function processMpgsBrowserReturn(prisma, input) {
  const attemptRef = String(input.attemptRef || '').trim();
  if (!attemptRef) return { ok: false, error: 'missing_attempt_ref' };

  const store = createPaymentStore(prisma);
  const existing = await store.getAttemptByReference(attemptRef);
  if (!existing) return { ok: false, error: 'attempt_not_found' };

  await store.recordRedirectSeen(attemptRef, input.resultIndicator || null);
  const verification = await store.verifyAndMaybeMarkPaid(attemptRef);

  return {
    ok: true,
    attemptReference: attemptRef,
    recordReference: existing.paymentRecord?.recordReference || null,
    redirectRecorded: true,
    verifiedPaid: Boolean(verification.verified),
    alreadyPaid: Boolean(verification.alreadyPaid),
    status: verification.attempt?.status || existing.status,
    recordStatus: verification.record?.status || existing.paymentRecord?.status || null,
    gatewayStatus: verification.retrieved?.status || verification.attempt?.gatewayStatus || null,
    verifyReason: verification.verifyReason || null,
    paidFromRedirectOnly: false,
    operatorReviewRequired: Boolean(verification.verified || verification.alreadyPaid),
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ attemptRef: string }} input
 */
export async function processMpgsBrowserCancel(prisma, input) {
  const attemptRef = String(input.attemptRef || '').trim();
  if (!attemptRef) return { ok: false, error: 'missing_attempt_ref' };

  const store = createPaymentStore(prisma);
  const existing = await store.getAttemptByReference(attemptRef);
  if (!existing) return { ok: false, error: 'attempt_not_found' };

  const updated = await store.recordCancel(attemptRef);
  return {
    ok: true,
    attemptReference: attemptRef,
    cancelled: updated?.status === PAYMENT_ATTEMPT_STATUSES.CANCELLED,
    status: updated?.status || existing.status,
    paidFromRedirectOnly: false,
  };
}
