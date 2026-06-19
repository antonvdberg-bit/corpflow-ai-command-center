#!/usr/bin/env node
/**
 * Living Word Mauritius — knowledge atoms v1 seed.
 *
 * Idempotent upsert of tenant_knowledge_atoms for living-word-mauritius.
 * Facts mirror verified public/sandbox evidence only — no invented pastors/events.
 *
 * Usage:
 *   node scripts/seed-knowledge-living-word.mjs
 *   node scripts/seed-knowledge-living-word.mjs --dry-run
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const TENANT_ID = 'living-word-mauritius';
const REVIEWED_AT = new Date('2026-06-19T00:00:00.000Z');
const EXPIRES_AT = new Date('2027-06-19T23:59:59.999Z');
const APPROVED_BY = 'corpflow-seed-v1-public-sandbox';

/** @type {Array<Record<string, unknown>>} */
const ROWS = [
  {
    id: 'lwm-knowledge-v1-service-times-sunday',
    tenantId: TENANT_ID,
    atomKey: 'service_times.sunday_in_person',
    title: 'Sunday service time (in person)',
    category: 'service_times',
    summary: 'Sundays 9:30 am in-person worship at Grand Baie.',
    body:
      'Living Word Mauritius holds Sunday worship in person at 9:30 am (Sundays). ' +
      'Service times can change with the church calendar — for the latest schedule visit ' +
      'livingwordmauritius.com or approved schedule entries on the CorpFlow sandbox.',
    sourceType: 'public_homepage',
    sourceLabel: 'livingwordmauritius.com homepage + schedule-source v1 seed',
    sourceUrl: 'https://livingwordmauritius.com/',
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: ['sunday', 'service', 'in-person'],
    metadataJson: { packet: 'knowledge-atoms-v1', mirrors: 'SUNDAY_SERVICE' },
  },
  {
    id: 'lwm-knowledge-v1-location-grand-baie',
    tenantId: TENANT_ID,
    atomKey: 'location.grand_baie_church',
    title: 'Church location (Grand Baie)',
    category: 'location',
    summary: 'Living Word Church, Grand Baie — Richmond Hill Building, Super U Complex.',
    body:
      'Living Word Church meets at Richmond Hill Building, Super U Complex, La Salette Road, ' +
      'Grand Baie, Mauritius. For the latest directions visit livingwordmauritius.com.',
    sourceType: 'public_homepage',
    sourceLabel: 'livingwordmauritius.com contact/location (mirrored in sandbox)',
    sourceUrl: 'https://livingwordmauritius.com/',
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: ['location', 'grand-baie'],
    metadataJson: { packet: 'knowledge-atoms-v1', mirrors: 'LOCATION' },
  },
  {
    id: 'lwm-knowledge-v1-contact-public',
    tenantId: TENANT_ID,
    atomKey: 'contact.public_channels',
    title: 'Public contact details',
    category: 'contact',
    summary: 'info@livingwordmauritius.com · +230 5538 2181',
    body:
      'Public contact details published on livingwordmauritius.com: email info@livingwordmauritius.com ' +
      'and phone +230 5538 2181. The CorpFlow sandbox chatbot collects requests for church team follow-up ' +
      'and does not automatically send messages to these channels.',
    sourceType: 'public_homepage',
    sourceLabel: 'livingwordmauritius.com contact page (mirrored in sandbox)',
    sourceUrl: 'https://livingwordmauritius.com/',
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: ['contact', 'email', 'phone'],
    metadataJson: { packet: 'knowledge-atoms-v1', mirrors: 'CONTACT' },
  },
  {
    id: 'lwm-knowledge-v1-prayer-safeguarding',
    tenantId: TENANT_ID,
    atomKey: 'prayer_safeguarding.crisis_handoff',
    title: 'Prayer requests — safeguarding and crisis handoff',
    category: 'prayer_safeguarding',
    summary: 'Not a crisis service; emergency services for immediate danger.',
    body:
      'Prayer requests are read by a small pastoral team. Living Word is not a counselling or crisis ' +
      'service. If you or someone you know is in immediate danger, contact your local emergency services ' +
      'right away. The chatbot may collect a prayer request for pastoral follow-up but must not delay ' +
      'emergency help.',
    sourceType: 'chatbot_flow',
    sourceLabel: 'living-word-flow-v3 prayer-disclaimer + sandbox GET_INVOLVED prayer copy',
    sourceUrl: null,
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: null,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'safeguarding',
    tagsJson: ['prayer', 'safeguarding', 'crisis'],
    metadataJson: { verbatim_template: true, packet: 'knowledge-atoms-v1' },
  },
  {
    id: 'lwm-knowledge-v1-youth-no-child-pii',
    tenantId: TENANT_ID,
    atomKey: 'youth_children.no_child_sensitive_data',
    title: 'Youth / Children — no child sensitive data in chat',
    category: 'youth_children',
    summary: 'Collect parent/guardian contact only; never child names or sensitive child details.',
    body:
      'For youth and children enquiries, the chatbot collects only parent or guardian contact details ' +
      'and a fixed-choice age band. It must never collect a child\'s name, address, school, photos, or ' +
      'other sensitive child details in chat. Those can be shared safely once a church team member ' +
      'contacts the parent or guardian.',
    sourceType: 'chatbot_flow',
    sourceLabel: 'living-word-flow-v3 youth path + sandbox NEXT_GEN copy',
    sourceUrl: null,
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: null,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'safeguarding',
    tagsJson: ['youth', 'children', 'safeguarding'],
    metadataJson: { packet: 'knowledge-atoms-v1' },
  },
  {
    id: 'lwm-knowledge-v1-wordgroups-general',
    tenantId: TENANT_ID,
    atomKey: 'wordgroups.general_routing',
    title: 'WordGroups — general information and follow-up',
    category: 'wordgroups',
    summary: 'Small groups across Mauritius; specific group assignment via human follow-up.',
    body:
      'WordGroups are small-group meetings hosted across Mauritius. For up-to-date WordGroups ' +
      'information visit livingwordmauritius.com. Specific group times, locations, or assignments are ' +
      'not provided automatically — a church team member follows up when someone asks through the chatbot.',
    sourceType: 'chatbot_flow',
    sourceLabel: 'living-word-flow-v3 wordgroups-info',
    sourceUrl: 'https://livingwordmauritius.com/',
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: ['wordgroups'],
    metadataJson: { packet: 'knowledge-atoms-v1' },
  },
  {
    id: 'lwm-knowledge-v1-volunteer-followup',
    tenantId: TENANT_ID,
    atomKey: 'volunteer_serve.team_follow_up',
    title: 'Volunteer / Serve — team follow-up',
    category: 'volunteer_serve',
    summary: 'Volunteer interest is collected; coordinator follows up by email.',
    body:
      'Volunteer and serve opportunities are coordinated by the church team. The chatbot collects ' +
      'minimal adult contact details and area of interest. A volunteer coordinator follows up by email — ' +
      'background checks or role matching are handled offline, not in chat.',
    sourceType: 'chatbot_flow',
    sourceLabel: 'living-word-flow-v3 volunteer path + sandbox GET_INVOLVED',
    sourceUrl: null,
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: ['volunteer', 'serve'],
    metadataJson: { packet: 'knowledge-atoms-v1' },
  },
  {
    id: 'lwm-knowledge-v1-business-network-neutral',
    tenantId: TENANT_ID,
    atomKey: 'business_network.neutral_posture',
    title: 'Business Network — neutral information only',
    category: 'business_network',
    summary: 'No endorsement, verification, payment, or membership benefits implied.',
    body:
      'The Living Word Mauritius Business Network is a separate community resource. CorpFlow and the ' +
      'sandbox chatbot do not endorse, verify, approve, or guarantee any business, payment, or membership ' +
      'benefit. For up-to-date Business Network information check the church\'s Business Network site. ' +
      'Introductions or follow-up are handled by a church team member when requested — not automatically.',
    sourceType: 'chatbot_flow',
    sourceLabel: 'living-word-flow-v3 network-info neutrality posture',
    sourceUrl: 'https://network.livingwordmauritius.com/',
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: ['business-network', 'neutral'],
    metadataJson: { no_endorsement: true, packet: 'knowledge-atoms-v1' },
  },
  {
    id: 'lwm-knowledge-v1-schedule-policy',
    tenantId: TENANT_ID,
    atomKey: 'schedule_policy.approved_entries_only',
    title: 'Schedule policy — approved entries and human handoff',
    category: 'schedule_policy',
    summary: 'Answer events from approved schedule rows only; uncertain dates → human follow-up.',
    body:
      'Service times and events must be answered only from approved, non-expired tenant schedule entries ' +
      'or matching approved knowledge atoms. If a visitor asks about a specific event date, registration, ' +
      'or schedule detail that is not in the approved corpus, the chatbot must not invent an answer — ' +
      'route to livingwordmauritius.com and/or offer human follow-up through the contact path.',
    sourceType: 'design_doc',
    sourceLabel: 'ai-dynamic-scheduling-design.md + schedule-source v1',
    sourceUrl: null,
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: null,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: ['schedule', 'policy'],
    metadataJson: { packet: 'knowledge-atoms-v1' },
  },
  {
    id: 'lwm-knowledge-v1-general-welcome',
    tenantId: TENANT_ID,
    atomKey: 'general_church_info.welcome_summary',
    title: 'Welcome — who Living Word is',
    category: 'general_church_info',
    summary: 'Community of Christ followers in Grand Baie, Mauritius.',
    body:
      'Living Word Mauritius is a community of Christ followers who believe in the divinity, death, and ' +
      'resurrection of Jesus Christ and are commissioned to share the good news of His salvation. The ' +
      'church welcomes people across age, gender, race, geography, and socioeconomic lines. Wording ' +
      'mirrors the public welcome on livingwordmauritius.com.',
    sourceType: 'public_homepage',
    sourceLabel: 'livingwordmauritius.com welcome (mirrored in sandbox ABOUT)',
    sourceUrl: 'https://livingwordmauritius.com/',
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: ['welcome', 'about'],
    metadataJson: { packet: 'knowledge-atoms-v1', mirrors: 'ABOUT' },
  },
  // --- Unapproved / fixture rows ---
  {
    id: 'lwm-knowledge-v1-wordgroups-meetings-placeholder',
    tenantId: TENANT_ID,
    atomKey: 'wordgroups.meeting_times_placeholder',
    title: 'WordGroups meeting times (placeholder — not approved)',
    category: 'wordgroups',
    summary: 'Placeholder only — requires pastor/coordinator approval.',
    body:
      'Placeholder fixture. Specific WordGroup meeting days, venues, or leader names are not approved ' +
      'for chatbot or AI answers until verified by the church team.',
    sourceType: 'placeholder',
    sourceLabel: 'sandbox fixture',
    sourceUrl: null,
    approved: false,
    lastReviewedAt: REVIEWED_AT,
    visibility: 'unlisted',
    chatbotAnswerEligible: false,
    aiAnswerEligible: false,
    sensitivity: 'internal',
    tagsJson: ['placeholder'],
    metadataJson: { packet: 'knowledge-atoms-v1', fixture: true },
  },
  {
    id: 'lwm-knowledge-v1-expired-fixture',
    tenantId: TENANT_ID,
    atomKey: 'general_church_info.expired_fixture',
    title: 'Expired knowledge fixture (test only)',
    category: 'general_church_info',
    summary: 'Expired row for retrieval filter tests.',
    body: 'This atom is approved but expired — must never appear in approved-only retrieval.',
    sourceType: 'test_fixture',
    sourceLabel: 'knowledge-atoms-v1 seed',
    sourceUrl: null,
    approved: true,
    approvedBy: APPROVED_BY,
    approvedAt: REVIEWED_AT,
    lastReviewedAt: REVIEWED_AT,
    expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    visibility: 'unlisted',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'internal',
    tagsJson: ['test', 'expired'],
    metadataJson: { packet: 'knowledge-atoms-v1', fixture: true, expired: true },
  },
];

async function main() {
  console.log('[seed-knowledge-lwm] upserting', ROWS.length, 'atoms for', TENANT_ID);
  if (dryRun) {
    console.log('[seed-knowledge-lwm] dry-run — no DB write');
    return;
  }

  for (const row of ROWS) {
    const { id, tenantId, atomKey, ...rest } = row;
    await prisma.tenantKnowledgeAtom.upsert({
      where: {
        tenant_knowledge_atoms_tenant_atom_key: {
          tenantId: String(tenantId),
          atomKey: String(atomKey),
        },
      },
      create: { id: String(id), tenantId: String(tenantId), atomKey: String(atomKey), ...rest },
      update: { ...rest },
    });
  }

  const approved = await prisma.tenantKnowledgeAtom.count({
    where: { tenantId: TENANT_ID, approved: true },
  });
  const unapproved = await prisma.tenantKnowledgeAtom.count({
    where: { tenantId: TENANT_ID, approved: false },
  });
  console.log('[seed-knowledge-lwm] done', { approved, unapproved });
}

main()
  .catch((e) => {
    console.error('[seed-knowledge-lwm] failed', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
