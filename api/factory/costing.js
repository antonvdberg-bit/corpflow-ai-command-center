/**
 * Token Reservoir Costing (pre-paid token float)
 *
 * This module debits a tenant's `token_credit_balance` (USD) stored at:
 *   tenants/<tenantId>/persona.json
 *
 * It is intentionally non-networked and best-effort; it never touches secrets.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const PERSONA_PATH = (tenantId) => path.join(REPO_ROOT, 'tenants', tenantId, 'persona.json');
const TOKEN_DEBITS_LOG = path.join(REPO_ROOT, 'vanguard', 'audit-trail', 'token_debits.jsonl');

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

export function getTokenCreditBalance({ tenantId }) {
  const persona = readJsonFileSafe(PERSONA_PATH(tenantId)) || {};
  const raw = persona?.token_credit_balance;
  const defaultBalance = Number(process.env.DEFAULT_TOKEN_CREDIT_BALANCE_USD ?? 0);
  const n = raw == null ? defaultBalance : Number(raw);
  return Number.isFinite(n) ? n : defaultBalance;
}

export function isTokenCreditDepleted({ tenantId }) {
  return getTokenCreditBalance({ tenantId }) <= 0;
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

