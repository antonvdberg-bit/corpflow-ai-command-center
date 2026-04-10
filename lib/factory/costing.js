/**
 * Token Reservoir Costing (pre-paid token float)
 *
 * **Wallet + billing flags** live in Postgres `tenant_personas` (indexed by `tenant_id`): one round-trip per
 * check. Optional env `CORPFLOW_BILLING_EXEMPT_TENANT_IDS` ORs with `billing_exempt` (break-glass).
 * File `tenants/<tenantId>/persona.json` is a legacy mirror / dev fallback only.
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { cfg } from '../server/runtime-config.js';
import { isBillingExemptEnvOverride } from '../server/billing-exempt.js';

// Vercel serverless functions run with `process.cwd()` at the repo root (`/var/task`).
// Avoid `import.meta.url` so this module can execute under CJS-wrapped runtimes.
const REPO_ROOT = path.resolve(process.cwd());

const PERSONA_PATH = (tenantId) => path.join(REPO_ROOT, 'tenants', tenantId, 'persona.json');
const TOKEN_DEBITS_LOG = path.join(REPO_ROOT, 'vanguard', 'audit-trail', 'token_debits.jsonl');

const prisma = new PrismaClient();

function hasPostgres() {
  const pg = (process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL || '').toString().trim();
  return Boolean(pg);
}

function readJsonFileSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function writeJsonFileSafe(filePath, payload) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function appendJsonlSafe(filePath, record) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf8');
  } catch (_) {
    // never block primary flow
  }
}

/**
 * One-time seed when creating `tenant_personas` (Try Me / onboarding credits).
 *
 * @param {string} tenantId
 * @param {number} fileBalance
 * @param {number} defaultBalance
 * @returns {number}
 */
function initialWalletUsdForNewPersona(tenantId, fileBalance, defaultBalance) {
  const credit = Number(cfg('CORPFLOW_TRY_ME_CREDITS_USD', '0'));
  if (!Number.isFinite(credit) || credit <= 0) {
    return Math.max(fileBalance, defaultBalance);
  }
  const allNew = String(cfg('CORPFLOW_TRY_ME_ALL_NEW', '')).toLowerCase() === 'true';
  const rawIds = String(cfg('CORPFLOW_TRY_ME_TENANT_IDS', '')).trim();
  if (rawIds) {
    const set = new Set(rawIds.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
    if (!set.has(String(tenantId || '').trim().toLowerCase())) {
      return Math.max(fileBalance, defaultBalance);
    }
  } else if (!allNew) {
    return Math.max(fileBalance, defaultBalance);
  }
  return Math.max(fileBalance, defaultBalance, credit);
}

/**
 * Single DB read (plus lazy create) for balance + billing exemption. Use this on hot paths so each request
 * does **one** `findUnique` by `tenant_id`, not separate env + balance queries.
 *
 * @param {{ tenantId?: string | null }} input
 * @returns {Promise<{ tokenCreditBalanceUsd: number; billingExemptDb: boolean; billingExemptEffective: boolean }>}
 */
export async function getTenantWalletSnapshot({ tenantId }) {
  const tid = tenantId != null && String(tenantId).trim() !== '' ? String(tenantId).trim() : 'root';
  const envExempt = isBillingExemptEnvOverride(tid);
  const persona = readJsonFileSafe(PERSONA_PATH(tid)) || {};
  const raw = persona?.token_credit_balance;
  const defaultBalance = Number(cfg('DEFAULT_TOKEN_CREDIT_BALANCE_USD', '0'));
  const n = raw == null ? defaultBalance : Number(raw);
  const fileBalance = Number.isFinite(n) ? n : defaultBalance;

  if (!hasPostgres()) {
    return {
      tokenCreditBalanceUsd: fileBalance,
      billingExemptDb: false,
      billingExemptEffective: envExempt,
    };
  }

  try {
    let row = await prisma.tenantPersona.findUnique({
      where: { tenantId: tid },
      select: { tokenCreditBalanceUsd: true, billingExempt: true },
    });
    if (!row) {
      const seedUsd = initialWalletUsdForNewPersona(tid, fileBalance, defaultBalance);
      await prisma.tenantPersona
        .create({
          data: {
            tenantId: tid,
            tokenCreditBalanceUsd: seedUsd,
            billingExempt: false,
            personaJson: persona && typeof persona === 'object' ? persona : {},
          },
        })
        .catch(() => {});
      row = await prisma.tenantPersona.findUnique({
        where: { tenantId: tid },
        select: { tokenCreditBalanceUsd: true, billingExempt: true },
      });
    }
    if (!row) {
      return {
        tokenCreditBalanceUsd: fileBalance,
        billingExemptDb: false,
        billingExemptEffective: envExempt,
      };
    }
    const bal = Number(row.tokenCreditBalanceUsd);
    const dbExempt = row.billingExempt === true;
    return {
      tokenCreditBalanceUsd: Number.isFinite(bal) ? bal : fileBalance,
      billingExemptDb: dbExempt,
      billingExemptEffective: envExempt || dbExempt,
    };
  } catch (_) {
    return {
      tokenCreditBalanceUsd: fileBalance,
      billingExemptDb: false,
      billingExemptEffective: envExempt,
    };
  }
}

export async function getTokenCreditBalance({ tenantId }) {
  const s = await getTenantWalletSnapshot({ tenantId });
  return s.tokenCreditBalanceUsd;
}

export async function isTokenCreditDepleted({ tenantId }) {
  return (await getTokenCreditBalance({ tenantId })) <= 0;
}

/**
 * Debit a tenant's pre-paid token credit balance.
 *
 * @param {object} input
 * @param {string} input.tenantId
 * @param {number} input.debitUsd - USD amount to subtract
 * @param {number} [input.invoiceUsd] - for later cash-flow vs profit reporting
 * @param {object} [input.context] - arbitrary metadata (ticket_id, action, etc)
 */
export function debitTokenCreditBalance({
  tenantId,
  debitUsd,
  invoiceUsd,
  context,
}) {
  if (!tenantId) tenantId = 'root';

  const personaPath = PERSONA_PATH(tenantId);
  const persona = readJsonFileSafe(personaPath) || {};

  const defaultBalance = Number(process.env.DEFAULT_TOKEN_CREDIT_BALANCE_USD ?? 0);
  const prevBalance = persona?.token_credit_balance == null ? defaultBalance : Number(persona.token_credit_balance);

  const debit = Number(debitUsd ?? 0);
  if (!Number.isFinite(debit) || debit <= 0) {
    return { token_credit_balance: prevBalance };
  }

  if (!Number.isFinite(prevBalance) || prevBalance <= 0) {
    throw new Error(`Token credit depleted for tenant_id=${tenantId}.`);
  }

  if (debit > prevBalance) {
    throw new Error(
      `Insufficient token credit for tenant_id=${tenantId}. debitUsd=${debit} prevBalance=${prevBalance}.`
    );
  }

  const nextBalance = prevBalance - debit;
  const next = { ...persona, token_credit_balance: nextBalance };

  // If drained, force the hard lock fields for runtime enforcement.
  if (nextBalance <= 0) {
    next.autonomy_level = 1;
    next.current_rank = 'Intern';
  }

  // Persist updated balance.
  writeJsonFileSafe(personaPath, next);

  appendJsonlSafe(TOKEN_DEBITS_LOG, {
    occurred_at: new Date().toISOString(),
    tenant_id: tenantId,
    debit_usd: debit,
    invoice_usd: invoiceUsd == null ? debit : Number(invoiceUsd),
    prev_balance_usd: prevBalance,
    next_balance_usd: nextBalance,
    context: context || {},
  });

  return { token_credit_balance: nextBalance };
}

/**
 * Updates wallet in Postgres only (no token_debits row). Used when the ledger table is missing
 * on older databases so Approve build still completes after the credit pre-check.
 *
 * @param {object} input
 * @param {string} input.tenantId
 * @param {number} input.debitUsd
 * @param {number} [input.invoiceUsd]
 * @param {object} [input.context]
 * @returns {Promise<{ token_credit_balance: number }>}
 */
async function debitTokenCreditBalancePgWithoutLedgerRow({
  tenantId,
  debitUsd,
  invoiceUsd,
  context,
}) {
  const tid = tenantId ? String(tenantId) : 'root';
  const debit = Number(debitUsd ?? 0);
  if (!Number.isFinite(debit) || debit <= 0) {
    const bal = await getTokenCreditBalance({ tenantId: tid });
    return { token_credit_balance: bal };
  }
  const existing = await prisma.tenantPersona.findUnique({ where: { tenantId: tid } });
  const prev = existing ? Number(existing.tokenCreditBalanceUsd) : Number(await getTokenCreditBalance({ tenantId: tid }));
  if (!Number.isFinite(prev) || prev <= 0) {
    throw new Error(`Token credit depleted for tenant_id=${tid}.`);
  }
  if (debit > prev) {
    throw new Error(`Insufficient token credit for tenant_id=${tid}. debitUsd=${debit} prevBalance=${prev}.`);
  }
  const nextBal = prev - debit;
  const updated = existing
    ? await prisma.tenantPersona.update({
        where: { tenantId: tid },
        data: {
          tokenCreditBalanceUsd: nextBal,
          autonomyLevel: nextBal <= 0 ? 1 : undefined,
          currentRank: nextBal <= 0 ? 'Intern' : undefined,
        },
        select: { tokenCreditBalanceUsd: true },
      })
    : await prisma.tenantPersona.create({
        data: {
          tenantId: tid,
          tokenCreditBalanceUsd: nextBal,
          billingExempt: false,
          autonomyLevel: nextBal <= 0 ? 1 : null,
          currentRank: nextBal <= 0 ? 'Intern' : null,
        },
        select: { tokenCreditBalanceUsd: true },
      });
  try {
    appendJsonlSafe(TOKEN_DEBITS_LOG, {
      occurred_at: new Date().toISOString(),
      tenant_id: tid,
      debit_usd: debit,
      invoice_usd: invoiceUsd == null ? debit : Number(invoiceUsd),
      note: 'pg_wallet_debit_without_token_debits_table',
      context: context && typeof context === 'object' ? context : {},
    });
  } catch (_) {
    /* ignore */
  }
  return { token_credit_balance: Number(updated.tokenCreditBalanceUsd) };
}

/**
 * Postgres-first debit path. Keeps file debit as best-effort fallback for local dev.
 *
 * @param {object} input
 * @param {string} input.tenantId
 * @param {number} input.debitUsd
 * @param {number} [input.invoiceUsd]
 * @param {object} [input.context]
 * @returns {Promise<{ token_credit_balance: number }>}
 */
export async function debitTokenCreditBalancePg({
  tenantId,
  debitUsd,
  invoiceUsd,
  context,
}) {
  const tid = tenantId ? String(tenantId) : 'root';
  const debit = Number(debitUsd ?? 0);
  if (!Number.isFinite(debit) || debit <= 0) {
    const bal = await getTokenCreditBalance({ tenantId: tid });
    return { token_credit_balance: bal };
  }

  // DB-first (atomic-ish via transaction).
  if (hasPostgres()) {
    try {
      const out = await prisma.$transaction(async (tx) => {
        const existing = await tx.tenantPersona.findUnique({ where: { tenantId: tid } });
        const prev = existing ? Number(existing.tokenCreditBalanceUsd) : Number(await getTokenCreditBalance({ tenantId: tid }));
        if (!Number.isFinite(prev) || prev <= 0) throw new Error(`Token credit depleted for tenant_id=${tid}.`);
        if (debit > prev) throw new Error(`Insufficient token credit for tenant_id=${tid}. debitUsd=${debit} prevBalance=${prev}.`);
        const nextBal = prev - debit;
        const updated = existing
          ? await tx.tenantPersona.update({
              where: { tenantId: tid },
              data: {
                tokenCreditBalanceUsd: nextBal,
                autonomyLevel: nextBal <= 0 ? 1 : undefined,
                currentRank: nextBal <= 0 ? 'Intern' : undefined,
              },
              select: { tokenCreditBalanceUsd: true },
            })
          : await tx.tenantPersona.create({
              data: {
                tenantId: tid,
                tokenCreditBalanceUsd: nextBal,
                billingExempt: false,
                autonomyLevel: nextBal <= 0 ? 1 : null,
                currentRank: nextBal <= 0 ? 'Intern' : null,
              },
              select: { tokenCreditBalanceUsd: true },
            });
        await tx.tokenDebit.create({
          data: {
            tenantId: tid,
            debitUsd: debit,
            invoiceUsd: invoiceUsd == null ? debit : Number(invoiceUsd),
            prevBalanceUsd: prev,
            nextBalanceUsd: nextBal,
            context: context && typeof context === 'object' ? context : {},
          },
        });
        return { token_credit_balance: Number(updated.tokenCreditBalanceUsd) };
      });
      // Best-effort file mirror for local operators.
      try {
        const personaPath = PERSONA_PATH(tid);
        const persona = readJsonFileSafe(personaPath) || {};
        const mirror = { ...persona, token_credit_balance: out.token_credit_balance };
        if (out.token_credit_balance <= 0) {
          mirror.autonomy_level = 1;
          mirror.current_rank = 'Intern';
        }
        writeJsonFileSafe(personaPath, mirror);
      } catch (_) {}
      return out;
    } catch (e) {
      try {
        return await debitTokenCreditBalancePgWithoutLedgerRow({
          tenantId: tid,
          debitUsd: debit,
          invoiceUsd,
          context,
        });
      } catch {
        // If DB path fails, fall through to file behavior.
      }
    }
  }

  // File fallback (legacy).
  const r = debitTokenCreditBalance({ tenantId: tid, debitUsd: debit, invoiceUsd, context });
  return { token_credit_balance: Number(r.token_credit_balance ?? 0) };
}

