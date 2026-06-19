import test from 'node:test';
import assert from 'node:assert/strict';

import { LWM_TENANT_ID } from '../lib/server/tenant-knowledge/constants.js';
import {
  buildApprovedKnowledgeWhere,
  getKnowledgeAtomsForTenant,
  serializeKnowledgeAtomForProps,
} from '../lib/server/tenant-knowledge/atoms.js';

const NOW = new Date('2026-06-19T12:00:00.000Z');

function sampleAtom(overrides = {}) {
  return {
    id: 'atom_1',
    tenantId: LWM_TENANT_ID,
    atomKey: 'service_times.sunday',
    title: 'Sunday service',
    category: 'service_times',
    body: 'Sundays 9:30 am',
    summary: 'Sunday 9:30',
    sourceType: 'public_homepage',
    sourceLabel: 'test',
    sourceUrl: null,
    approved: true,
    approvedBy: 'test',
    approvedAt: NOW,
    lastReviewedAt: NOW,
    expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: [],
    metadataJson: {},
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function makeFakePrisma(rows) {
  const store = rows.map((r) => ({ ...r }));
  return {
    tenantKnowledgeAtom: {
      findMany: async ({ where, orderBy, take }) => {
        let out = store.filter((row) => row.tenantId === where.tenantId);
        if (where.approved === true) out = out.filter((r) => r.approved === true);
        if (where.category) out = out.filter((r) => r.category === where.category);
        if (where.chatbotAnswerEligible === true) {
          out = out.filter((r) => r.chatbotAnswerEligible === true);
        }
        if (where.aiAnswerEligible === true) {
          out = out.filter((r) => r.aiAnswerEligible === true);
        }
        if (where.visibility?.in) {
          out = out.filter((r) => where.visibility.in.includes(r.visibility));
        }
        if (where.OR) {
          out = out.filter((r) => {
            if (!r.expiresAt) return true;
            return new Date(r.expiresAt) > NOW;
          });
        }
        if (take) out = out.slice(0, take);
        return out;
      },
    },
  };
}

test('buildApprovedKnowledgeWhere requires tenant_id', () => {
  assert.throws(() => buildApprovedKnowledgeWhere(''), /tenant_id_required/);
});

test('buildApprovedKnowledgeWhere scopes tenant and approved', () => {
  const where = buildApprovedKnowledgeWhere(LWM_TENANT_ID, { now: NOW });
  assert.equal(where.tenantId, LWM_TENANT_ID);
  assert.equal(where.approved, true);
});

test('buildApprovedKnowledgeWhere adds chatbotAnswerEligible for chatbot purpose', () => {
  const chatbot = buildApprovedKnowledgeWhere(LWM_TENANT_ID, { purpose: 'chatbot', now: NOW });
  const ai = buildApprovedKnowledgeWhere(LWM_TENANT_ID, { purpose: 'ai', now: NOW });
  assert.equal(chatbot.chatbotAnswerEligible, true);
  assert.equal(ai.aiAnswerEligible, true);
});

test('approved-only retrieval excludes unapproved atoms', async () => {
  const prisma = makeFakePrisma([
    sampleAtom(),
    sampleAtom({ id: 'atom_2', atomKey: 'x.unapproved', approved: false }),
  ]);
  const rows = await getKnowledgeAtomsForTenant(prisma, LWM_TENANT_ID, {
    approvedOnly: true,
    now: NOW,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].approved, true);
});

test('expired atoms excluded from approved retrieval', async () => {
  const prisma = makeFakePrisma([
    sampleAtom(),
    sampleAtom({
      id: 'atom_expired',
      atomKey: 'general.expired',
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    }),
  ]);
  const rows = await getKnowledgeAtomsForTenant(prisma, LWM_TENANT_ID, { now: NOW });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'atom_1');
});

test('category filter works', async () => {
  const prisma = makeFakePrisma([
    sampleAtom(),
    sampleAtom({ id: 'atom_loc', atomKey: 'location.x', category: 'location' }),
  ]);
  const rows = await getKnowledgeAtomsForTenant(prisma, LWM_TENANT_ID, {
    category: 'location',
    now: NOW,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, 'location');
});

test('tenant isolation: where never omits tenantId', () => {
  const where = buildApprovedKnowledgeWhere('luxe-maurice', { now: NOW });
  assert.equal(where.tenantId, 'luxe-maurice');
});

test('chatbot purpose excludes non-chatbot-eligible atoms', async () => {
  const prisma = makeFakePrisma([
    sampleAtom(),
    sampleAtom({
      id: 'atom_nc',
      atomKey: 'contact.internal',
      chatbotAnswerEligible: false,
    }),
  ]);
  const rows = await getKnowledgeAtomsForTenant(prisma, LWM_TENANT_ID, {
    purpose: 'chatbot',
    now: NOW,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].chatbotAnswerEligible, true);
});

test('serializeKnowledgeAtomForProps includes eligibility flags', () => {
  const out = serializeKnowledgeAtomForProps(sampleAtom());
  assert.equal(out.tenantId, LWM_TENANT_ID);
  assert.equal(out.chatbotAnswerEligible, true);
  assert.equal(out.aiAnswerEligible, true);
});
