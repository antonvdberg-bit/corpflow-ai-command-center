#!/usr/bin/env node
/**
 * READ-ONLY: dump the LuxeMaurice concierge leads to understand what's currently
 * inflating the operator desk "New: 14" count. Identify test / smoke / system
 * patterns vs real user-generated leads. No writes.
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_CONTACT_RE = /example\.invalid|example\.com|@test\.|noreply|donotreply|smoke|fixture|placeholder/i;
const TEST_NAME_RE = /\b(test|smoke|qa|fixture|automated|verify|sample|seed|demo|placeholder)\b/i;
const TEST_MESSAGE_RE = /\b(test|smoke|seed|fixture|automated|verify|sample|qa)\b/i;

function classifyHeuristic(lead) {
  const tags = [];
  const c = String(lead.contact || '').toLowerCase();
  const n = String(lead.name || '').toLowerCase();
  const m = String(lead.message || '').toLowerCase();
  const qj = lead.qualificationJson && typeof lead.qualificationJson === 'object' ? lead.qualificationJson : {};
  if (TEST_CONTACT_RE.test(c)) tags.push('test-contact');
  if (TEST_NAME_RE.test(n)) tags.push('test-name');
  if (TEST_MESSAGE_RE.test(m)) tags.push('test-message');
  if (qj.smoke === true || qj.test === true || qj.is_test === true || qj.synthetic === true) tags.push('qj-test-flag');
  if (qj.source && /(smoke|test|seed|automation|fixture|synthetic)/i.test(String(qj.source))) tags.push('qj-source-test');
  if (!c && !n) tags.push('no-identity');
  return tags;
}

async function main() {
  const leads = await prisma.lead.findMany({
    where: { tenantId: 'luxe-maurice' },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      contact: true,
      message: true,
      status: true,
      listing: true,
      intent: true,
      qualificationJson: true,
    },
  });
  console.log('total leads:', leads.length);
  const byStatus = {};
  for (const l of leads) byStatus[l.status || '(null)'] = (byStatus[l.status || '(null)'] || 0) + 1;
  console.log('by status:', JSON.stringify(byStatus));

  let realNew = 0;
  let testNew = 0;
  let realTotal = 0;
  let testTotal = 0;
  console.log('---');
  for (const l of leads) {
    const tags = classifyHeuristic(l);
    const isTest = tags.length > 0;
    const status = String(l.status || 'new').toLowerCase();
    if (isTest) testTotal += 1;
    else realTotal += 1;
    if (status === 'new') {
      if (isTest) testNew += 1;
      else realNew += 1;
    }
    console.log(
      l.id.slice(0, 12),
      l.status || '(null)',
      '| name=' + String(l.name || '').slice(0, 20),
      '| contact=' + String(l.contact || '').slice(0, 35),
      '| listing=' + String(l.listing || '').slice(0, 20),
      '| intent=' + String(l.intent || '').slice(0, 25),
      '| msg=' + String(l.message || '').replace(/\s+/g, ' ').slice(0, 40),
      '| tags=' + (tags.join(',') || '-'),
    );
  }
  console.log('---');
  console.log(`real total : ${realTotal}    test total : ${testTotal}`);
  console.log(`real new   : ${realNew}      test new   : ${testNew}`);
}

main()
  .catch((e) => {
    console.error(e?.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
