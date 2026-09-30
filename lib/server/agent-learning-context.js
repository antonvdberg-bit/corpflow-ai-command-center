import { PrismaClient } from '@prisma/client';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';

const defaultPrisma = new PrismaClient();
export const AGENT_LEARNING_CONTEXT_KEY = 'agent-learning:corpflow-ai-command-center';

const LEARNING_CATEGORIES = Object.freeze([
  'LEARNING',
  'GOLDEN_EXAMPLE',
  'FAILURE_MODE',
  'ROUTING_RULE',
]);

function text(value) {
  return value == null ? '' : String(value).trim();
}

function tags(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

export async function ensureAgentLearningSpace(prisma) {
  return prisma.clientContextSpace.upsert({
    where: { contextKey: AGENT_LEARNING_CONTEXT_KEY },
    update: {
      displayName: 'CorpFlowAI Agent Learning',
      lifecycle: 'internal',
      status: 'active',
      metadataJson: { kind: 'internal_agent_learning', issue: 1370 },
    },
    create: {
      contextKey: AGENT_LEARNING_CONTEXT_KEY,
      displayName: 'CorpFlowAI Agent Learning',
      lifecycle: 'internal',
      status: 'active',
      primaryGithubIssue: 1370,
      metadataJson: { kind: 'internal_agent_learning', issue: 1370 },
    },
  });
}

export function experienceRecordKey(input) {
  const id = text(input.experienceId);
  if (!id) throw new Error('experience_id_required');
  return `experience:${id}`;
}

export async function recordAgentExperience(prisma, input) {
  const space = await ensureAgentLearningSpace(prisma);
  const recordKey = experienceRecordKey(input);
  const taskContract = text(input.taskContract);
  const result = text(input.result);
  const agent = text(input.agent || 'Forge');
  if (!taskContract) throw new Error('task_contract_required');
  if (!result) throw new Error('result_required');

  const source = await prisma.clientContextSource.create({
    data: {
      spaceId: space.id,
      sourceType: 'agent_experience',
      label: `${agent} · ${taskContract} · ${result}`,
      location: text(input.workItem) || null,
      metadataJson: {
        agent,
        modelRuntime: text(input.modelRuntime) || null,
        taskContract,
        result,
        verifier: text(input.verifier) || null,
        verifierPassed: input.verifierPassed === true,
        elapsedMs: Number.isFinite(input.elapsedMs) ? input.elapsedMs : null,
        inputTokens: Number.isFinite(input.inputTokens) ? input.inputTokens : null,
        outputTokens: Number.isFinite(input.outputTokens) ? input.outputTokens : null,
        cpuMs: Number.isFinite(input.cpuMs) ? input.cpuMs : null,
        peakRamMb: Number.isFinite(input.peakRamMb) ? input.peakRamMb : null,
        escalatedToCursor: input.escalatedToCursor === true,
        artifactRef: text(input.artifactRef) || null,
      },
    },
  });

  const record = await prisma.clientContextRecord.upsert({
    where: { client_context_records_space_key: { spaceId: space.id, recordKey } },
    update: {
      title: `${taskContract} · ${result}`,
      body: text(input.summary) || `${agent} completed ${taskContract} with result ${result}.`,
      tagsJson: tags([taskContract, agent, result, ...(input.tags || [])]),
      confidence: 'high',
      verification: input.verifierPassed === true ? 'deterministic_pass' : 'unverified',
      state: 'current',
      sensitivity: 'internal',
      ownerAuthority: 'agent-experience',
    },
    create: {
      spaceId: space.id,
      recordKey,
      category: 'EXPERIENCE',
      title: `${taskContract} · ${result}`,
      body: text(input.summary) || `${agent} completed ${taskContract} with result ${result}.`,
      tagsJson: tags([taskContract, agent, result, ...(input.tags || [])]),
      confidence: 'high',
      verification: input.verifierPassed === true ? 'deterministic_pass' : 'unverified',
      state: 'current',
      sensitivity: 'internal',
      ownerAuthority: 'agent-experience',
    },
  });

  await prisma.clientContextRecordSource.upsert({
    where: { recordId_sourceId: { recordId: record.id, sourceId: source.id } },
    update: { claim: record.body },
    create: { recordId: record.id, sourceId: source.id, claim: record.body },
  });

  return { space, record, source };
}

export async function proposeAgentLearning(prisma, input) {
  const space = await ensureAgentLearningSpace(prisma);
  const learningId = text(input.learningId);
  const claim = text(input.claim);
  if (!learningId) throw new Error('learning_id_required');
  if (!claim) throw new Error('learning_claim_required');

  const confidence = Number(input.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('confidence_must_be_between_0_and_1');
  }

  const sourceExperienceKey = experienceRecordKey({ experienceId: input.sourceExperienceId });
  const sourceExperience = await prisma.clientContextRecord.findUnique({
    where: { client_context_records_space_key: { spaceId: space.id, recordKey: sourceExperienceKey } },
  });
  if (!sourceExperience) throw new Error('source_experience_not_found');

  const record = await prisma.clientContextRecord.upsert({
    where: {
      client_context_records_space_key: {
        spaceId: space.id,
        recordKey: `learning:${learningId}`,
      },
    },
    update: {
      title: text(input.title) || claim.slice(0, 120),
      body: claim,
      tagsJson: tags([text(input.taskType), ...(input.tags || [])]),
      confidence: String(confidence),
      verification: 'candidate',
      state: 'candidate',
      sensitivity: 'internal',
      ownerAuthority: text(input.createdBy || 'agent'),
    },
    create: {
      spaceId: space.id,
      recordKey: `learning:${learningId}`,
      category: text(input.category || 'LEARNING'),
      title: text(input.title) || claim.slice(0, 120),
      body: claim,
      tagsJson: tags([text(input.taskType), ...(input.tags || [])]),
      confidence: String(confidence),
      verification: 'candidate',
      state: 'candidate',
      sensitivity: 'internal',
      ownerAuthority: text(input.createdBy || 'agent'),
    },
  });

  await prisma.clientContextRelation.create({
    data: {
      spaceId: space.id,
      fromRecordId: record.id,
      toRecordId: sourceExperience.id,
      relationType: 'derived_from',
      label: 'Candidate learning derived from execution evidence.',
    },
  });

  return record;
}

export async function retrieveAgentLearning(prisma, options = {}) {
  const space = await prisma.clientContextSpace.findUnique({
    where: { contextKey: AGENT_LEARNING_CONTEXT_KEY },
  });
  if (!space) return { contextKey: AGENT_LEARNING_CONTEXT_KEY, records: [] };

  const requestedTags = tags([text(options.taskType), text(options.agent)]);

  const records = await prisma.clientContextRecord.findMany({
    where: {
      spaceId: space.id,
      category: { in: LEARNING_CATEGORIES },
      state: 'current',
      ...(requestedTags.length
        ? { AND: requestedTags.map((tag) => ({ tagsJson: { array_contains: [tag] } })) }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(50, Math.max(1, Number(options.limit) || 20)),
    include: {
      sources: { include: { source: true } },
      relationsFrom: {
        include: { toRecord: { select: { recordKey: true, title: true } } },
      },
    },
  });

  return {
    contextKey: space.contextKey,
    records: records.map((record) => ({
      key: record.recordKey,
      category: record.category,
      title: record.title,
      body: record.body,
      tags: Array.isArray(record.tagsJson) ? record.tagsJson : [],
      confidence: record.confidence,
      verification: record.verification,
      state: record.state,
      provenance: record.relationsFrom.map((relation) => relation.toRecord).filter(Boolean),
    })),
  };
}

export async function handleAgentLearning(req, res, prisma = defaultPrisma) {
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ ok: false, error: 'factory_master_required' });
  }

  if (req.method === 'GET') {
    const packet = await retrieveAgentLearning(prisma, {
      taskType: req.query?.task_type,
      agent: req.query?.agent,
      limit: req.query?.limit,
    });
    return res.status(200).json({ ok: true, ...packet });
  }

  if (req.method === 'POST') {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    try {
      if (body.action === 'record_experience') {
        const result = await recordAgentExperience(prisma, body);
        return res.status(201).json({ ok: true, recordKey: result.record.recordKey });
      }
      if (body.action === 'propose_learning') {
        const result = await proposeAgentLearning(prisma, body);
        return res.status(201).json({ ok: true, recordKey: result.recordKey, state: result.state });
      }
      return res.status(400).json({ ok: false, error: 'unsupported_action' });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}

export { LEARNING_CATEGORIES };
