/**
 * Retrieval-first context builder for chat widget AI (knowledge atoms + schedule).
 */

import { getKnowledgeAtomsForTenant } from '../../tenant-knowledge/atoms.js';
import { getApprovedScheduleEntriesForTenant } from '../../tenant-schedule/entries.js';

/**
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * @param {import('@prisma/client').TenantKnowledgeAtom} atom
 * @param {string[]} qTokens
 * @returns {number}
 */
function scoreAtom(atom, qTokens) {
  const hay = [
    atom.title,
    atom.summary,
    atom.body,
    atom.category,
    ...(Array.isArray(atom.tagsJson) ? atom.tagsJson.map(String) : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  let score = 0;
  for (const t of qTokens) {
    if (hay.includes(t)) score += 1;
  }
  if (atom.category === 'service_times' && qTokens.some((t) => ['sunday', 'service', 'time', 'worship'].includes(t))) {
    score += 2;
  }
  if (atom.category === 'location' && qTokens.some((t) => ['where', 'address', 'location', 'find'].includes(t))) {
    score += 2;
  }
  if (atom.category === 'contact' && qTokens.some((t) => ['contact', 'email', 'phone', 'call'].includes(t))) {
    score += 2;
  }
  return score;
}

/**
 * @param {import('@prisma/client').TenantScheduleEntry} row
 * @param {string[]} qTokens
 * @returns {number}
 */
function scoreSchedule(row, qTokens) {
  const hay = [row.title, row.description, row.category, row.locationName, row.weeklyTime]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  let score = 0;
  for (const t of qTokens) {
    if (hay.includes(t)) score += 1;
  }
  if (qTokens.some((t) => ['sunday', 'service', 'schedule', 'time', 'when'].includes(t))) score += 2;
  return score;
}

/**
 * @typedef {object} RetrievalContext
 * @property {import('@prisma/client').TenantKnowledgeAtom[]} atoms
 * @property {import('@prisma/client').TenantScheduleEntry[]} schedules
 * @property {string[]} atomIds
 * @property {string[]} scheduleEntryIds
 * @property {string} contextText
 */

/**
 * Build approved, tenant-scoped retrieval context for AI answering.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {string} question
 * @param {{ now?: Date }} [options]
 * @returns {Promise<RetrievalContext>}
 */
export async function buildRetrievalContext(prisma, tenantId, question, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const qTokens = tokenize(question);

  const [allAtoms, allSchedules] = await Promise.all([
    getKnowledgeAtomsForTenant(prisma, tenantId, { purpose: 'ai', now }),
    getApprovedScheduleEntriesForTenant(prisma, tenantId, { purpose: 'chatbot', now }),
  ]);

  const atoms = [...allAtoms]
    .map((a) => ({ a, score: scoreAtom(a, qTokens) }))
    .sort((x, y) => y.score - x.score || x.a.title.localeCompare(y.a.title))
    .map((x) => x.a);

  const schedules = [...allSchedules]
    .map((s) => ({ s, score: scoreSchedule(s, qTokens) }))
    .sort((x, y) => y.score - x.score || x.s.title.localeCompare(y.s.title))
    .map((x) => x.s);

  const atomIds = atoms.map((a) => a.id);
  const scheduleEntryIds = schedules.map((s) => s.id);

  const lines = [];
  if (atoms.length) {
    lines.push('=== Approved knowledge atoms ===');
    for (const a of atoms) {
      lines.push(`[${a.category}] ${a.title}: ${a.summary || a.body}`);
    }
  }
  if (schedules.length) {
    lines.push('=== Approved schedule entries ===');
    for (const s of schedules) {
      const when =
        s.recurrence === 'weekly' && s.weeklyTime
          ? `weekly ${s.weeklyTime}${s.weeklyDayOfWeek != null ? ` (day ${s.weeklyDayOfWeek})` : ''}`
          : s.startsAt
            ? s.startsAt.toISOString().slice(0, 16)
            : s.recurrence;
      lines.push(`${s.title} — ${when}${s.locationName ? ` @ ${s.locationName}` : ''}`);
      if (s.description) lines.push(`  ${s.description}`);
    }
  }

  return {
    atoms,
    schedules,
    atomIds,
    scheduleEntryIds,
    contextText: lines.join('\n'),
  };
}

const MAX_PREVIEW_CHARS = 900;

/**
 * Format context for retrieval-preview mode (no LLM).
 *
 * @param {RetrievalContext} ctx
 * @returns {string}
 */
export function formatRetrievalPreviewAnswer(ctx) {
  if (!ctx.contextText.trim()) return '';
  return (
    'Here is what I can share from approved church records:\n\n' +
    ctx.contextText.slice(0, MAX_PREVIEW_CHARS) +
    '\n\nIf you need something more specific, please use **Contact the church** from the menu.'
  );
}
