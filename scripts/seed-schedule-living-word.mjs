#!/usr/bin/env node
/**
 * Living Word Mauritius — schedule-source v1 seed.
 *
 * Idempotent upsert of tenant_schedule_entries for living-word-mauritius.
 *
 * Approved posture (conservative):
 *   - ONE approved row: Sunday Service (weekly 09:30, Grand Baie) — mirrors
 *     public homepage facts already used on the CorpFlow sandbox.
 *   - All other rows seeded approved=false as structure fixtures.
 *
 * Usage:
 *   node scripts/seed-schedule-living-word.mjs
 *   node scripts/seed-schedule-living-word.mjs --dry-run
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const TENANT_ID = 'living-word-mauritius';
const REVIEWED_AT = new Date('2026-06-17T00:00:00.000Z');
const EXPIRES_AT = new Date('2027-06-17T23:59:59.999Z');

/** Stable ids for idempotent upsert */
const ROWS = [
  {
    id: 'lwm-schedule-v1-sunday-service',
    tenantId: TENANT_ID,
    category: 'service',
    title: 'Sunday Service',
    description:
      'Weekly in-person worship at Living Word Church, Grand Baie. Service time mirrors ' +
      'the public Living Word Mauritius homepage (Sundays, 9:30 am). For the latest ' +
      'schedule visit livingwordmauritius.com.',
    recurrence: 'weekly',
    weeklyDayOfWeek: 0,
    weeklyTime: '09:30',
    locationName: 'Living Word Church, Grand Baie',
    locationMapUrl: null,
    ageBand: 'all',
    visibility: 'public',
    approved: true,
    approvedBy: 'corpflow-seed-v1-public-homepage',
    approvedAt: REVIEWED_AT,
    source: 'church-input',
    lastReviewedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    chatbotAnswerEligible: true,
    notes: 'Approved v1 seed — mirrors public homepage Sunday 9:30 am In Person.',
  },
  {
    id: 'lwm-schedule-v1-special-event-placeholder',
    tenantId: TENANT_ID,
    category: 'event',
    title: 'Special event (placeholder fixture)',
    description:
      'Placeholder fixture only. Real special events are published on livingwordmauritius.com.',
    recurrence: 'once',
    startsAt: new Date('2099-01-01T00:00:00.000Z'),
    locationName: 'See Living Word Mauritius website',
    ageBand: 'all',
    visibility: 'unlisted',
    approved: false,
    source: 'placeholder',
    chatbotAnswerEligible: false,
    notes: 'sandbox fixture; not approved for display',
  },
  {
    id: 'lwm-schedule-v1-youth-placeholder',
    tenantId: TENANT_ID,
    category: 'youth',
    title: 'Youth programme (placeholder fixture)',
    description:
      'Placeholder fixture only. Youth programme details require pastor approval before display.',
    recurrence: 'weekly',
    weeklyDayOfWeek: 6,
    locationName: 'See Living Word Mauritius website',
    ageBand: 'youth',
    visibility: 'unlisted',
    approved: false,
    source: 'placeholder',
    chatbotAnswerEligible: false,
    notes: 'sandbox fixture; not approved for display',
  },
  {
    id: 'lwm-schedule-v1-wordgroup-placeholder',
    tenantId: TENANT_ID,
    category: 'wordgroup',
    title: 'WordGroup (placeholder fixture)',
    description:
      'Placeholder fixture only. WordGroup meeting details are not published on this sandbox.',
    recurrence: 'weekly',
    weeklyDayOfWeek: 3,
    locationName: 'See Living Word Mauritius website',
    ageBand: 'adults',
    visibility: 'unlisted',
    approved: false,
    source: 'placeholder',
    chatbotAnswerEligible: false,
    notes: 'sandbox fixture; not approved for display',
  },
  {
    id: 'lwm-schedule-v1-special-programme-placeholder',
    tenantId: TENANT_ID,
    category: 'special',
    title: 'Special programme (placeholder fixture)',
    description:
      'Placeholder fixture only. Real programmes are announced through church channels.',
    recurrence: 'once',
    startsAt: new Date('2099-06-01T00:00:00.000Z'),
    locationName: 'See Living Word Mauritius website',
    ageBand: 'all',
    visibility: 'unlisted',
    approved: false,
    source: 'placeholder',
    chatbotAnswerEligible: false,
    notes: 'sandbox fixture; not approved for display',
  },
];

async function main() {
  const summary = { ok: true, dry_run: dryRun, tenant_id: TENANT_ID, actions: [] };

  const tenant = await prisma.tenant.findUnique({
    where: { tenantId: TENANT_ID },
    select: { tenantId: true },
  });
  if (!tenant) {
    summary.ok = false;
    summary.error = `tenant ${TENANT_ID} not found`;
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  if (dryRun) {
    summary.actions = ROWS.map((row) => ({
      op: 'upsert',
      id: row.id,
      approved: row.approved,
      title: row.title,
    }));
    console.log(JSON.stringify(summary, null, 2));
    await prisma.$disconnect();
    return;
  }

  for (const row of ROWS) {
    const saved = await prisma.tenantScheduleEntry.upsert({
      where: { id: row.id },
      create: row,
      update: {
        category: row.category,
        title: row.title,
        description: row.description,
        startsAt: row.startsAt ?? null,
        endsAt: row.endsAt ?? null,
        recurrence: row.recurrence,
        weeklyDayOfWeek: row.weeklyDayOfWeek ?? null,
        weeklyTime: row.weeklyTime ?? null,
        locationName: row.locationName ?? null,
        locationMapUrl: row.locationMapUrl ?? null,
        ageBand: row.ageBand ?? null,
        visibility: row.visibility,
        approved: row.approved,
        approvedBy: row.approvedBy ?? null,
        approvedAt: row.approvedAt ?? null,
        source: row.source,
        lastReviewedAt: row.lastReviewedAt ?? null,
        expiresAt: row.expiresAt ?? null,
        chatbotAnswerEligible: row.chatbotAnswerEligible,
        notes: row.notes ?? null,
      },
      select: { id: true, title: true, approved: true, chatbotAnswerEligible: true },
    });
    summary.actions.push({ op: 'upsert', row: saved });
  }

  const approvedCount = await prisma.tenantScheduleEntry.count({
    where: { tenantId: TENANT_ID, approved: true },
  });
  summary.approved_count = approvedCount;
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
