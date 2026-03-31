import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const REPO_ROOT = path.resolve(process.cwd());

function readJsonSafe(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readJsonlSafe(p, limitLines = 50_000) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim() !== '').slice(-limitLines);
    const out = [];
    for (const line of lines) {
      try {
        out.push(JSON.parse(line));
      } catch {
        // skip bad line
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function backfillPersonas() {
  const tenantsRoot = path.join(REPO_ROOT, 'tenants');
  if (!fs.existsSync(tenantsRoot)) return { scanned: 0, upserted: 0 };
  const dirs = fs.readdirSync(tenantsRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
  let scanned = 0;
  let upserted = 0;
  for (const d of dirs) {
    const tenantId = d.name;
    const personaPath = path.join(tenantsRoot, tenantId, 'persona.json');
    if (!fs.existsSync(personaPath)) continue;
    scanned += 1;
    const persona = readJsonSafe(personaPath) || {};
    const bal = Number(persona?.token_credit_balance ?? 0);
    const tokenCreditBalanceUsd = Number.isFinite(bal) ? bal : 0;
    const autonomyLevel = persona?.autonomy_level != null ? Number(persona.autonomy_level) : null;
    const currentRank = persona?.current_rank != null ? String(persona.current_rank) : null;
    await prisma.tenantPersona.upsert({
      where: { tenantId },
      update: { tokenCreditBalanceUsd, autonomyLevel, currentRank, personaJson: persona },
      create: { tenantId, tokenCreditBalanceUsd, autonomyLevel, currentRank, personaJson: persona },
    });
    upserted += 1;
  }
  return { scanned, upserted };
}

async function backfillTokenDebits() {
  const p = path.join(REPO_ROOT, 'vanguard', 'audit-trail', 'token_debits.jsonl');
  const rows = readJsonlSafe(p, 200_000);
  let inserted = 0;
  for (const r of rows) {
    const occurredAt = r?.occurred_at ? new Date(String(r.occurred_at)) : new Date();
    const tenantId = String(r?.tenant_id || 'root');
    const debitUsd = Number(r?.debit_usd ?? 0);
    if (!Number.isFinite(debitUsd) || debitUsd <= 0) continue;
    const invoiceUsd = r?.invoice_usd != null ? Number(r.invoice_usd) : null;
    const prevBalanceUsd = r?.prev_balance_usd != null ? Number(r.prev_balance_usd) : null;
    const nextBalanceUsd = r?.next_balance_usd != null ? Number(r.next_balance_usd) : null;
    const context = r?.context && typeof r.context === 'object' ? r.context : {};
    try {
      await prisma.tokenDebit.create({
        data: { occurredAt, tenantId, debitUsd, invoiceUsd, prevBalanceUsd, nextBalanceUsd, context },
      });
      inserted += 1;
    } catch {
      // allow duplicates; this script is best-effort
    }
  }
  return { scanned: rows.length, inserted };
}

async function backfillTelemetry() {
  const p = path.join(REPO_ROOT, 'vanguard', 'audit-trail', 'telemetry-v1.jsonl');
  const rows = readJsonlSafe(p, 200_000);
  let inserted = 0;
  for (const r of rows) {
    const occurredAt = r?.occurred_at ? new Date(String(r.occurred_at)) : new Date();
    const tenantId = r?.tenant_id != null ? String(r.tenant_id) : null;
    const factoryId = r?.factory_id != null ? String(r.factory_id) : null;
    const eventType = String(r?.event_type || 'unknown');
    const cmpTicketId = r?.cmp?.ticket_id != null ? String(r.cmp.ticket_id) : null;
    const cmpAction = r?.cmp?.action != null ? String(r.cmp.action) : null;
    const payload = r?.payload && typeof r.payload === 'object' ? r.payload : {};
    try {
      await prisma.telemetryEvent.create({
        data: { occurredAt, tenantId, factoryId, eventType, cmpTicketId, cmpAction, payload },
      });
      inserted += 1;
    } catch {
      // allow duplicates; this script is best-effort
    }
  }
  return { scanned: rows.length, inserted };
}

async function backfillRecoveryVault() {
  const p = path.join(REPO_ROOT, 'recovery_vault.json');
  const rows = readJsonlSafe(p, 200_000);
  let inserted = 0;
  for (const r of rows) {
    const occurredAt = r?.timestamp ? new Date(String(r.timestamp)) : new Date();
    const payload = r && typeof r === 'object' ? r : {};
    const status = r?.status != null ? String(r.status) : 'PENDING_SYNC';
    try {
      await prisma.recoveryVaultEntry.create({
        data: { occurredAt, category: 'lead_sync', payload, status },
      });
      inserted += 1;
    } catch {
      // allow duplicates
    }
  }
  return { scanned: rows.length, inserted };
}

async function main() {
  const pg = (process.env.POSTGRES_URL || '').toString().trim();
  if (!pg) {
    console.error('Missing POSTGRES_URL. Aborting.');
    process.exit(2);
  }

  const out = {};
  out.personas = await backfillPersonas();
  out.token_debits = await backfillTokenDebits();
  out.telemetry = await backfillTelemetry();
  out.recovery_vault = await backfillRecoveryVault();

  console.log(JSON.stringify({ ok: true, ...out }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

