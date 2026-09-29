import { PrismaClient } from '@prisma/client';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';

const defaultPrisma = new PrismaClient();
const MAX_RECORDS = 120;
const CATEGORIES = new Set([
  'FACT', 'RESEARCH_FINDING', 'OBSERVATION', 'HYPOTHESIS', 'OPTION',
  'DECISION', 'UNKNOWN', 'COMMITMENT', 'PREFERENCE', 'CONCERN', 'OPPORTUNITY',
]);

function queryValue(query, key) {
  const value = query?.[key];
  return String(Array.isArray(value) ? value[0] || '' : value || '').trim();
}

function serializeRecord(record) {
  return {
    id: record.id,
    key: record.recordKey,
    category: record.category,
    title: record.title,
    body: record.body,
    tags: Array.isArray(record.tagsJson) ? record.tagsJson : [],
    confidence: record.confidence,
    verification: record.verification,
    state: record.state,
    ownerAuthority: record.ownerAuthority,
    updatedAt: record.updatedAt,
    sources: (record.sources || []).map(({ source, claim }) => ({
      id: source.id,
      type: source.sourceType,
      label: source.label,
      location: source.location,
      date: source.sourceDate,
      claim,
    })),
  };
}

export async function retrieveClientContext(prisma, contextKey, options = {}) {
  const space = await prisma.clientContextSpace.findUnique({
    where: { contextKey },
    include: {
      records: {
        where: {
          ...(options.state ? { state: options.state } : {}),
          ...(options.category ? { category: options.category } : {}),
          ...(options.topic
            ? { tagsJson: { array_contains: [options.topic] } }
            : {}),
          ...(options.search
            ? {
                OR: [
                  { title: { contains: options.search, mode: 'insensitive' } },
                  { body: { contains: options.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(MAX_RECORDS, Math.max(1, options.limit || MAX_RECORDS)),
        include: { sources: { include: { source: true } } },
      },
      sources: { orderBy: { createdAt: 'desc' }, take: 100 },
      relations: {
        include: {
          fromRecord: { select: { recordKey: true, title: true } },
          toRecord: { select: { recordKey: true, title: true } },
        },
        take: 200,
      },
    },
  });
  if (!space) return null;
  return {
    space: {
      key: space.contextKey,
      name: space.displayName,
      lifecycle: space.lifecycle,
      status: space.status,
      primaryGithubIssue: space.primaryGithubIssue,
    },
    records: space.records.map(serializeRecord),
    sourceCount: space.sources.length,
    relations: space.relations.map((relation) => ({
      type: relation.relationType,
      label: relation.label,
      from: relation.fromRecord,
      to: relation.toRecord,
    })),
  };
}

export function answerClientQuestion(packet, question) {
  const q = String(question || '').toLowerCase();
  const records = packet.records || [];
  const matches = records.filter((record) => {
    const haystack = `${record.title} ${record.body} ${(record.tags || []).join(' ')}`.toLowerCase();
    const words = q.split(/\W+/).filter((word) => word.length > 3);
    return words.some((word) => haystack.includes(word));
  });
  const selected = (matches.length ? matches : records.filter((r) => r.state === 'current')).slice(0, 8);
  return {
    answer: selected.length
      ? selected.map((record) => `${record.category}: ${record.title} — ${record.body}`).join('\n')
      : 'No grounded context records matched this question.',
    supportingRecords: selected.map((record) => ({
      key: record.key,
      title: record.title,
      sources: record.sources,
    })),
    grounded: true,
  };
}

export async function handleClientIntelligence(req, res, prisma = defaultPrisma) {
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ ok: false, error: 'factory_master_required' });
  }
  const contextKey = queryValue(req.query, 'context_key') || 'orixhealth';
  if (req.method === 'GET') {
    const packet = await retrieveClientContext(prisma, contextKey, {
      search: queryValue(req.query, 'search') || undefined,
      category: queryValue(req.query, 'category') || undefined,
      state: queryValue(req.query, 'state') || undefined,
      topic: queryValue(req.query, 'topic') || undefined,
    });
    if (!packet) return res.status(404).json({ ok: false, error: 'context_space_not_found' });
    return res.status(200).json({ ok: true, ...packet });
  }
  if (req.method === 'POST') {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const packet = await retrieveClientContext(prisma, contextKey, { limit: MAX_RECORDS });
    if (!packet) return res.status(404).json({ ok: false, error: 'context_space_not_found' });
    return res.status(200).json({ ok: true, ...answerClientQuestion(packet, body.question) });
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}

export { CATEGORIES };
