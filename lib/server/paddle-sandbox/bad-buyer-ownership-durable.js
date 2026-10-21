/**
 * Durable BAD buyer ownership adapter for existing Core Postgres.
 *
 * Disabled unless CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE=1. This file does not
 * apply migrations. Missing tables fail closed and never create ownership
 * from webhook metadata.
 */

import { cfg } from '../runtime-config.js';
import {
  createBadBuyerOwnershipStore,
  createSerialLock,
  fail,
} from './bad-buyer-ownership.js';

export const BAD_BUYER_OWNERSHIP_FLAG = 'CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE';

function isUniqueConstraint(error) {
  return error?.code === 'P2002' || /unique constraint/i.test(String(error?.message || ''));
}

function uniqueCode(error) {
  const target = error?.meta?.target;
  const joined = Array.isArray(target) ? target.join(',') : String(target || error?.message || '');
  if (/checkout_intent/i.test(joined)) return 'CHECKOUT_INTENT_ALREADY_BOUND';
  if (/paddle_transaction/i.test(joined)) return 'PADDLE_TRANSACTION_ALREADY_BOUND';
  if (/order_confirmation/i.test(joined)) return 'CHECKOUT_INTENT_ALREADY_BOUND';
  if (/event_id/i.test(joined)) return 'WEBHOOK_EVENT_DEDUPED';
  return 'CHECKOUT_INTENT_ALREADY_BOUND';
}

function asDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function iso(value) {
  const parsed = asDate(value);
  return parsed ? parsed.toISOString() : null;
}

function eventTimeMs(value) {
  const parsed = asDate(value);
  return parsed ? parsed.getTime() : 0;
}

function rowToRecord(row) {
  if (!row) return null;
  const history = Array.isArray(row.reversalHistory) ? row.reversalHistory : [];
  const confirmationRef = row.confirmationRef || row.orderConfirmationRef;
  const issued = Boolean(row.issuedAt);
  const terminal = row.status === 'refunded' || row.status === 'revoked';
  return {
    id: row.id,
    checkout_intent_id: row.checkoutIntentId,
    owner: {
      auth_user_id: row.authUserId,
      tenant_id: row.tenantId,
      brand: row.brand,
    },
    order_confirmation_ref: row.orderConfirmationRef,
    paddle_transaction_id: row.paddleTransactionId || null,
    erpnext_order_ref: row.erpnextOrderRef || null,
    status: row.status,
    issued,
    issued_at: iso(row.issuedAt),
    refunded: terminal || Boolean(row.refundedAt),
    refunded_at: iso(row.refundedAt),
    revoked: row.status === 'revoked' || Boolean(row.revokedAt) || terminal,
    revoked_at: iso(row.revokedAt),
    fulfilment_entitled: Boolean(row.fulfilmentEntitled) && !terminal,
    last_event_time: eventTimeMs(row.lastEventAt),
    last_event_id: row.lastEventId || null,
    last_event_at: iso(row.lastEventAt),
    confirmation: confirmationRef ? { name: confirmationRef, confirmation_ref: confirmationRef } : null,
    confirmation_ref: confirmationRef || null,
    reversal_history: history.map((entry) => ({ ...entry })),
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
  };
}

function recordToData(record) {
  return {
    authUserId: record.owner.auth_user_id,
    tenantId: record.owner.tenant_id,
    brand: record.owner.brand,
    checkoutIntentId: record.checkout_intent_id,
    orderConfirmationRef: record.order_confirmation_ref,
    paddleTransactionId: record.paddle_transaction_id || null,
    erpnextOrderRef: record.erpnext_order_ref || null,
    status: record.status,
    issuedAt: asDate(record.issued_at),
    refundedAt: asDate(record.refunded_at),
    revokedAt: asDate(record.revoked_at),
    lastEventId: record.last_event_id || null,
    lastEventAt: record.last_event_time ? new Date(record.last_event_time) : asDate(record.last_event_at),
    confirmationRef: record.confirmation_ref || record.order_confirmation_ref,
    reversalHistory: record.reversal_history || [],
    fulfilmentEntitled: Boolean(record.fulfilment_entitled),
  };
}

export function isBadBuyerOwnershipDurableEnabled(env) {
  const source = env === undefined ? process.env : env;
  const raw = String(source?.[BAD_BUYER_OWNERSHIP_FLAG] || '').trim();
  if (raw) return raw === '1' || raw.toLowerCase() === 'true';
  if (env === undefined) {
    return String(cfg(BAD_BUYER_OWNERSHIP_FLAG, '') || '').trim() === '1';
  }
  return false;
}

export function createPrismaBadBuyerOwnershipBackend(prisma) {
  const serialise = createSerialLock();

  async function getByIntent(intentId) {
    const row = await prisma.badPurchaseOwnership.findUnique({
      where: { checkoutIntentId: intentId },
    });
    return rowToRecord(row);
  }

  return {
    kind: 'prisma',
    withLock(fn) {
      return serialise(fn);
    },
    getByIntent,
    async getByTransaction(transactionId) {
      if (!transactionId) return null;
      const row = await prisma.badPurchaseOwnership.findUnique({
        where: { paddleTransactionId: transactionId },
      });
      return rowToRecord(row);
    },
    async insert(record) {
      try {
        const row = await prisma.badPurchaseOwnership.create({
          data: recordToData(record),
        });
        return rowToRecord(row);
      } catch (error) {
        if (isUniqueConstraint(error)) throw fail(uniqueCode(error));
        throw error;
      }
    },
    async save(record) {
      const data = recordToData(record);
      if (record.id) {
        const row = await prisma.badPurchaseOwnership.update({
          where: { id: record.id },
          data,
        });
        return rowToRecord(row);
      }
      const row = await prisma.badPurchaseOwnership.update({
        where: { checkoutIntentId: record.checkout_intent_id },
        data,
      });
      return rowToRecord(row);
    },
    async getUnbound(transactionId) {
      const row = await prisma.badPurchaseUnboundReversal.findUnique({
        where: { paddleTransactionId: transactionId },
      });
      if (!row) return null;
      return {
        history: Array.isArray(row.reversalHistory) ? row.reversalHistory : [],
        last_event_time: eventTimeMs(row.lastEventAt),
        last_event_id: row.lastEventId || null,
        status: row.status,
      };
    },
    async saveUnbound(transactionId, current) {
      const data = {
        paddleTransactionId: transactionId,
        status: current.status || 'refunded',
        lastEventId: current.last_event_id || null,
        lastEventAt: current.last_event_time ? new Date(current.last_event_time) : null,
        reversalHistory: current.history || [],
      };
      await prisma.badPurchaseUnboundReversal.upsert({
        where: { paddleTransactionId: transactionId },
        create: data,
        update: {
          status: data.status,
          lastEventId: data.lastEventId,
          lastEventAt: data.lastEventAt,
          reversalHistory: data.reversalHistory,
        },
      });
      return current;
    },
    async hasEvent(eventId) {
      const row = await prisma.badPurchaseWebhookEvent.findUnique({
        where: { eventId },
        select: { eventId: true },
      });
      return Boolean(row);
    },
    async markEvent(eventId, status) {
      try {
        await prisma.badPurchaseWebhookEvent.create({
          data: {
            eventId,
            eventType: 'recorded',
            outcome: status || 'recorded',
          },
        });
      } catch (error) {
        if (!isUniqueConstraint(error)) throw error;
      }
    },
    async statusForTransaction(transactionId) {
      const owned = await prisma.badPurchaseOwnership.findUnique({
        where: { paddleTransactionId: transactionId },
        select: { status: true },
      });
      if (owned) return owned.status;
      const unbound = await prisma.badPurchaseUnboundReversal.findUnique({
        where: { paddleTransactionId: transactionId },
        select: { status: true, reversalHistory: true },
      });
      if (!unbound) return null;
      return unbound.status || 'refunded';
    },
  };
}

export function createPrismaBadBuyerOwnershipStore(prisma) {
  return createBadBuyerOwnershipStore(createPrismaBadBuyerOwnershipBackend(prisma));
}

export function resolveDurableBadBuyerOwnershipStore(prisma, env = process.env) {
  if (!isBadBuyerOwnershipDurableEnabled(env)) return null;
  if (!prisma?.badPurchaseOwnership) return null;
  return createPrismaBadBuyerOwnershipStore(prisma);
}
