/**
 * Payment order persistence (MPGS TEST spike).
 */

import { randomBytes } from 'crypto';

import {
  isMpgsOrderVerifiedPaid,
  maskCardLastFour,
  retrieveMpgsOrder,
  sanitizeMpgsResponseForLog,
} from './mpgs-client.js';

export const PAYMENT_ORDER_STATUSES = Object.freeze({
  PENDING: 'pending',
  LINK_CREATED: 'link_created',
  REDIRECT_SEEN: 'redirect_seen',
  VERIFIED_PAID: 'verified_paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export function createPaymentOrderStore(prisma) {
  return {
    async createOrder(input) {
      const orderReference = input.orderReference || generateOrderReference();
      const row = await prisma.paymentOrder.create({
        data: {
          orderReference,
          leadId: input.leadId || null,
          purchaserName: input.purchaserName,
          purchaserEmail: input.purchaserEmail,
          amountMinor: input.amountMinor,
          currency: input.currency,
          status: PAYMENT_ORDER_STATUSES.PENDING,
          gatewayMode: input.gatewayMode || 'test',
          flowType: input.flowType || 'payment_link',
          description: input.description || null,
        },
      });
      return row;
    },

    async attachLinkSession(orderReference, session) {
      return prisma.paymentOrder.update({
        where: { orderReference },
        data: {
          status: PAYMENT_ORDER_STATUSES.LINK_CREATED,
          mpgsOrderId: session.orderId,
          mpgsSessionId: session.sessionId,
          successIndicator: session.successIndicator,
          paymentLinkUrl: session.paymentLinkUrl,
          metadataJson: session.raw || {},
        },
      });
    },

    async recordRedirectSeen(orderReference, resultIndicator) {
      return prisma.paymentOrder.update({
        where: { orderReference },
        data: {
          status: PAYMENT_ORDER_STATUSES.REDIRECT_SEEN,
          redirectSeenAt: new Date(),
          resultIndicatorSeen: resultIndicator ? String(resultIndicator) : null,
        },
      });
    },

    async verifyAndMaybeMarkPaid(orderReference) {
      const row = await prisma.paymentOrder.findUnique({ where: { orderReference } });
      if (!row) {
        return { ok: false, error: 'order_not_found' };
      }
      if (row.status === PAYMENT_ORDER_STATUSES.VERIFIED_PAID) {
        return { ok: true, alreadyPaid: true, order: row };
      }

      const retrieved = await retrieveMpgsOrder(orderReference);
      const verified = isMpgsOrderVerifiedPaid(retrieved);

      if (!verified) {
        const updated = await prisma.paymentOrder.update({
          where: { orderReference },
          data: {
            gatewayStatus: retrieved.status || 'unknown',
            metadataJson: {
              ...(row.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {}),
              last_retrieve: sanitizeMpgsResponseForLog(retrieved.raw),
            },
          },
        });
        return { ok: true, verified: false, order: updated, retrieved };
      }

      const updated = await prisma.paymentOrder.update({
        where: { orderReference },
        data: {
          status: PAYMENT_ORDER_STATUSES.VERIFIED_PAID,
          verifiedPaidAt: new Date(),
          gatewayStatus: retrieved.status,
          authorizationCode: retrieved.authorizationCode,
          cardLastFour: maskCardLastFour(retrieved.cardLastFour),
          metadataJson: {
            ...(row.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {}),
            verified_retrieve: sanitizeMpgsResponseForLog(retrieved.raw),
          },
        },
      });

      return { ok: true, verified: true, order: updated, retrieved };
    },

    async getByReference(orderReference) {
      return prisma.paymentOrder.findUnique({ where: { orderReference } });
    },
  };
}

export function generateOrderReference() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = randomBytes(4).toString('hex');
  return `CFLR-${ts}-${rand}`;
}

/**
 * Browser return handler — records redirect signal only, then verifies server-side.
 * resultIndicator is never used to mark paid.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ orderRef: string, resultIndicator?: string | null }} input
 */
export async function processMpgsBrowserReturn(prisma, input) {
  const orderRef = String(input.orderRef || '').trim();
  if (!orderRef) return { ok: false, error: 'missing_order_ref' };

  const store = createPaymentOrderStore(prisma);
  const existing = await store.getByReference(orderRef);
  if (!existing) return { ok: false, error: 'order_not_found' };

  await store.recordRedirectSeen(orderRef, input.resultIndicator || null);
  const verification = await store.verifyAndMaybeMarkPaid(orderRef);

  return {
    ok: true,
    orderReference: orderRef,
    redirectRecorded: true,
    verifiedPaid: Boolean(verification.verified),
    alreadyPaid: Boolean(verification.alreadyPaid),
    status: verification.order?.status || existing.status,
    gatewayStatus: verification.retrieved?.status || verification.order?.gatewayStatus || null,
    // Explicit contract for callers: browser redirect alone never marks paid.
    paidFromRedirectOnly: false,
  };
}
