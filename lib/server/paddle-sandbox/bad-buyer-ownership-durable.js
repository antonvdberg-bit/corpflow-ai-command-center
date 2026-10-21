/**
 * Durable BAD buyer ownership adapter for existing Core Postgres.
 *
 * Disabled unless CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE=1. This file does not
 * apply migrations. Missing tables fail closed and never create ownership
 * from webhook metadata.
 *
 * Cross-instance safety does not use an in-process lock. Each store mutation
 * runs in one Postgres transaction. Before reading, that transaction takes
 * pg_advisory_xact_lock on the webhook event, checkout intent, and/or Paddle
 * transaction it is about to touch. Status writes use a compare-and-set that
 * refuses to leave refunded or revoked. An intent lock is never taken after a
 * transaction lock. Retries are bounded to three attempts.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import { cfg } from '../runtime-config.js';
import {
  createBadBuyerOwnershipStore,
  fail,
} from './bad-buyer-ownership.js';

export const BAD_BUYER_OWNERSHIP_FLAG = 'CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE';

const txContext = new AsyncLocalStorage();
const MAX_TRANSACTION_ATTEMPTS = 3;
const TERMINAL_STATUSES = ['refunded', 'revoked'];

function isUniqueConstraint(error) {
  return error?.code === 'P2002' || /unique constraint/i.test(String(error?.message || ''));
}

function isRetryableTransaction(error) {
  const code = String(error?.code || '');
  if (code === 'OWNERSHIP_WRITE_CONFLICT' || code === 'P2034') return true;
  if (isUniqueConstraint(error)) return true;
  const message = String(error?.message || '');
  return /deadlock detected|could not serialize|write conflict|40001|40P01/i.test(message);
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
  const terminal = record.status === 'refunded' || record.status === 'revoked';
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
    fulfilmentEntitled: terminal ? false : Boolean(record.fulfilment_entitled),
  };
}

function ownershipUpdateWhere(record) {
  const nextStatus = record.status;
  const or = [{ status: { notIn: TERMINAL_STATUSES } }];
  if (nextStatus === 'revoked') or.push({ status: 'refunded' }, { status: 'revoked' });
  else if (nextStatus === 'refunded') or.push({ status: 'refunded' });
  return {
    id: record.id,
    authUserId: record.owner.auth_user_id,
    tenantId: record.owner.tenant_id,
    brand: record.owner.brand,
    OR: or,
  };
}

function activeState() {
  const state = txContext.getStore();
  if (!state?.tx) throw fail('BAD_OWNERSHIP_TRANSACTION_REQUIRED');
  return state;
}

function db() {
  return activeState().tx;
}

function lockHeld(prefix) {
  for (const key of activeState().locks) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

async function lockResource(kind, id) {
  const tokenId = String(id || '').trim();
  if (!tokenId) return;
  const state = activeState();
  const token = `${kind}:${tokenId}`;
  if (state.locks.has(token)) return;
  if (kind === 'intent' && lockHeld('txn:')) throw fail('BAD_OWNERSHIP_LOCK_ORDER');
  await state.tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${token}, 0::bigint))`;
  state.locks.add(token);
}

async function lockPurchase(intentId, transactionId) {
  if (!lockHeld('txn:') && intentId) await lockResource('intent', intentId);
  if (transactionId) await lockResource('txn', transactionId);
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
  async function findOwnership(where) {
    return prismaFind(db().badPurchaseOwnership, where);
  }

  async function getByIntent(intentId) {
    await lockResource('intent', intentId);
    let row = await findOwnership({ checkoutIntentId: intentId });
    if (row?.paddleTransactionId) {
      await lockResource('txn', row.paddleTransactionId);
      row = await findOwnership({ checkoutIntentId: intentId });
    }
    return rowToRecord(row);
  }

  async function withLock(fn) {
    if (txContext.getStore()) return fn();
    if (typeof prisma?.$transaction !== 'function') throw fail('BAD_OWNERSHIP_TRANSACTION_REQUIRED');
    let lastError;
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => txContext.run({ tx, locks: new Set() }, fn), {
          maxWait: 4000,
          timeout: 8000,
        });
      } catch (error) {
        lastError = error;
        if (!isRetryableTransaction(error) || attempt === MAX_TRANSACTION_ATTEMPTS) {
          if (isUniqueConstraint(error)) throw fail(uniqueCode(error));
          throw error;
        }
      }
    }
    throw lastError;
  }

  return {
    kind: 'prisma',
    withLock,
    getByIntent,
    async getByTransaction(transactionId) {
      if (!transactionId) return null;
      await lockResource('txn', transactionId);
      const row = await findOwnership({ paddleTransactionId: transactionId });
      return rowToRecord(row);
    },
    async insert(record) {
      await lockPurchase(record.checkout_intent_id, record.paddle_transaction_id);
      try {
        const row = await db().badPurchaseOwnership.create({
          data: recordToData(record),
        });
        return rowToRecord(row);
      } catch (error) {
        if (isUniqueConstraint(error)) throw fail(uniqueCode(error));
        throw error;
      }
    },
    async save(record) {
      await lockPurchase(record.checkout_intent_id, record.paddle_transaction_id);
      const data = recordToData(record);
      if (!record.id) throw fail('OWNERSHIP_ID_REQUIRED');
      const updated = await db().badPurchaseOwnership.updateMany({
        where: ownershipUpdateWhere(record),
        data,
      });
      if (!updated?.count) throw fail('OWNERSHIP_WRITE_CONFLICT');
      const row = await findOwnership({ id: record.id });
      return rowToRecord(row);
    },
    async getUnbound(transactionId) {
      await lockResource('txn', transactionId);
      const row = await db().badPurchaseUnboundReversal.findUnique({
        where: { paddleTransactionId: transactionId },
      });
      if (!row) return null;
      return {
        history: Array.isArray(row.reversalHistory) ? row.reversalHistory.map((entry) => ({ ...entry })) : [],
        last_event_time: eventTimeMs(row.lastEventAt),
        last_event_id: row.lastEventId || null,
        status: row.status,
      };
    },
    async saveUnbound(transactionId, current) {
      await lockResource('txn', transactionId);
      const data = {
        paddleTransactionId: transactionId,
        status: current.status || 'refunded',
        lastEventId: current.last_event_id || null,
        lastEventAt: current.last_event_time ? new Date(current.last_event_time) : null,
        reversalHistory: current.history || [],
      };
      await db().badPurchaseUnboundReversal.upsert({
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
      await lockResource('event', eventId);
      const row = await db().badPurchaseWebhookEvent.findUnique({
        where: { eventId },
        select: { eventId: true },
      });
      return Boolean(row);
    },
    async markEvent(eventId, status) {
      await lockResource('event', eventId);
      await db().badPurchaseWebhookEvent.createMany({
        data: [{
          id: `bad_evt_${randomUUID()}`,
          eventId,
          eventType: 'recorded',
          outcome: status || 'recorded',
        }],
        skipDuplicates: true,
      });
    },
    async statusForTransaction(transactionId) {
      if (!transactionId) return null;
      await lockResource('txn', transactionId);
      const owned = await db().badPurchaseOwnership.findUnique({
        where: { paddleTransactionId: transactionId },
        select: { status: true },
      });
      if (owned) return owned.status;
      const unbound = await db().badPurchaseUnboundReversal.findUnique({
        where: { paddleTransactionId: transactionId },
        select: { status: true, reversalHistory: true },
      });
      if (!unbound) return null;
      return unbound.status || 'refunded';
    },
  };
}

async function prismaFind(model, where) {
  return model.findUnique({ where });
}

export function createPrismaBadBuyerOwnershipStore(prisma) {
  return createBadBuyerOwnershipStore(createPrismaBadBuyerOwnershipBackend(prisma));
}

export function resolveDurableBadBuyerOwnershipStore(prisma, env = process.env) {
  if (!isBadBuyerOwnershipDurableEnabled(env)) return null;
  if (!prisma?.badPurchaseOwnership) return null;
  return createPrismaBadBuyerOwnershipStore(prisma);
}
