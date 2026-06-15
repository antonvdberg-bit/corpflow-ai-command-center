#!/usr/bin/env node
/**
 * Chat Widget v0 — seed Living Word Mauritius tenant config.
 *
 * Idempotent upsert of one row in `chat_widget_configs`:
 *   - tenant_id: 'living-word-mauritius'
 *   - enabled: false  (kill switch off until live verification flips it on)
 *   - flow_json: the v0 deterministic flow with the eight starter options
 *
 * Run AFTER `prisma migrate deploy` has applied the chat_widget_v0 migration.
 *
 * Wording on the flow nodes is PLACEHOLDER. The church owner must review and
 * confirm every line before this widget is embedded on livingwordmauritius.com.
 *
 * Usage:
 *   node scripts/seed-chat-widget-config-living-word.mjs            # apply
 *   node scripts/seed-chat-widget-config-living-word.mjs --dry-run  # preview only
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const TENANT_ID = 'living-word-mauritius';
const TENANT_NAME = 'Living Word Mauritius';

const ALLOWED_ORIGINS = [
  'https://livingwordmauritius.com',
  'https://www.livingwordmauritius.com',
  'https://network.livingwordmauritius.com',
  'https://living-word-mauritius.corpflowai.com',
];

const FLOW = {
  schema_version: 1,
  root: 'welcome',
  nodes: {
    welcome: {
      type: 'menu',
      prompt: 'Hi! Welcome to Living Word Mauritius. How can we help today?',
      options: [
        { label: 'Service times', next: 'service-times' },
        { label: 'Find us', next: 'location' },
        { label: 'Prayer request', next: 'prayer-disclaimer' },
        { label: 'Contact the church', next: 'contact-name' },
        { label: 'Volunteer / Serve', next: 'volunteer-name' },
        { label: 'WordGroups', next: 'wordgroups-info' },
        { label: 'Youth / Children', next: 'youth-name' },
        { label: 'Business Network', next: 'network-info' },
      ],
    },

    'service-times': {
      type: 'info',
      prompt:
        'TODO(owner): real service times. Placeholder: "Sunday services 09:00 and 11:00. Tuesday prayer 19:00. Please confirm with the church before you visit."',
      next: 'anything-else',
    },

    location: {
      type: 'info',
      prompt:
        'TODO(owner): real address. Placeholder: "We meet at <address> in <area>. Find us on Google Maps: <link>."',
      next: 'anything-else',
    },

    'prayer-disclaimer': {
      type: 'info',
      prompt:
        "Prayer requests are read by a small pastoral team. We are not a counselling or crisis service \u2014 if you or someone you know is in immediate danger, please call your local emergency services. Continue if you'd like to share a request.",
      options: [
        { label: 'Continue with prayer request', next: 'prayer-name' },
        { label: 'Back to the menu', next: 'welcome' },
      ],
    },
    'prayer-name': {
      type: 'collect_field',
      prompt: 'What is your name?',
      field: 'name',
      required: true,
      next: 'prayer-email',
    },
    'prayer-email': {
      type: 'collect_field',
      prompt: 'What is your email? (optional)',
      field: 'email',
      required: false,
      next: 'prayer-message',
    },
    'prayer-message': {
      type: 'collect_field',
      prompt: 'Please share your prayer request.',
      field: 'message',
      required: true,
      next: 'prayer-submit',
    },
    'prayer-submit': {
      type: 'submit',
      request_type: 'prayer',
      prompt:
        'Thank you. Your request has been received and will be read by our pastoral team. May God bless you.',
    },

    'contact-name': {
      type: 'collect_field',
      prompt: 'What is your name?',
      field: 'name',
      required: true,
      next: 'contact-email',
    },
    'contact-email': {
      type: 'collect_field',
      prompt: 'What is your email?',
      field: 'email',
      required: true,
      next: 'contact-message',
    },
    'contact-message': {
      type: 'collect_field',
      prompt: 'How can we help you?',
      field: 'message',
      required: true,
      next: 'contact-submit',
    },
    'contact-submit': {
      type: 'submit',
      request_type: 'contact',
      prompt: 'Thank you. Someone from the church will reach out within 2 working days.',
    },

    'volunteer-name': {
      type: 'collect_field',
      prompt: 'What is your name?',
      field: 'name',
      required: true,
      next: 'volunteer-email',
    },
    'volunteer-email': {
      type: 'collect_field',
      prompt: 'What is your email?',
      field: 'email',
      required: true,
      next: 'volunteer-area',
    },
    'volunteer-area': {
      type: 'collect_field',
      prompt:
        'Which area would you like to serve in? (e.g. welcoming, music, children, sound, hospitality)',
      field: 'message',
      required: true,
      next: 'volunteer-submit',
    },
    'volunteer-submit': {
      type: 'submit',
      request_type: 'volunteer',
      prompt:
        'Thank you for offering to serve. The volunteer coordinator will follow up by email.',
    },

    'wordgroups-info': {
      type: 'info',
      prompt:
        'TODO(owner): WordGroups description. Placeholder: "WordGroups are small mid-week groups across the island that meet to share life and study the Bible. We can match you to a group near you."',
      options: [
        { label: "I'd like to join a WordGroup", next: 'contact-name' },
        { label: 'Back to the menu', next: 'welcome' },
      ],
    },

    'youth-name': {
      type: 'collect_field',
      prompt: 'Parent or guardian name?',
      field: 'name',
      required: true,
      next: 'youth-email',
    },
    'youth-email': {
      type: 'collect_field',
      prompt: 'What is your email?',
      field: 'email',
      required: true,
      next: 'youth-band',
    },
    'youth-band': {
      type: 'menu',
      prompt: 'Which age range?',
      options: [
        { label: 'Children (under 12)', next: 'youth-message' },
        { label: 'Youth (13\u201318)', next: 'youth-message' },
        { label: 'Young adults (19\u201325)', next: 'youth-message' },
      ],
    },
    'youth-message': {
      type: 'collect_field',
      prompt: 'Anything else we should know?',
      field: 'message',
      required: false,
      next: 'youth-submit',
    },
    'youth-submit': {
      type: 'submit',
      request_type: 'youth',
      prompt: 'Thank you. The youth/children team will be in touch.',
    },

    'network-info': {
      type: 'info',
      prompt:
        'TODO(owner): Business Network description. Placeholder: "The Business Network connects Christian business owners and professionals across Mauritius for prayer, learning, and partnership."',
      options: [
        { label: "I'd like to join the Business Network", next: 'contact-name' },
        { label: 'Back to the menu', next: 'welcome' },
      ],
    },

    'anything-else': {
      type: 'menu',
      prompt: 'Anything else?',
      options: [
        { label: 'Yes, take me back to the menu', next: 'welcome' },
        { label: 'No, thanks', next: 'goodbye' },
      ],
    },
    goodbye: {
      type: 'info',
      prompt: 'Thanks for visiting. May God bless you today.',
    },
  },
};

async function main() {
  const summary = { ok: true, dry_run: dryRun, tenant_id: TENANT_ID, actions: [] };

  if (dryRun) {
    summary.actions.push({
      table: 'chat_widget_configs',
      op: 'upsert',
      tenant_id: TENANT_ID,
      enabled_will_be: false,
      flow_node_count: Object.keys(FLOW.nodes).length,
      allowed_origins_count: ALLOWED_ORIGINS.length,
      brand_name: TENANT_NAME,
    });
    console.log(JSON.stringify(summary, null, 2));
    await prisma.$disconnect();
    return;
  }

  // Verify tenant exists before seeding the chat widget config (defensive).
  const tenant = await prisma.tenant.findUnique({ where: { tenantId: TENANT_ID }, select: { tenantId: true } });
  if (!tenant) {
    summary.ok = false;
    summary.error = `tenant ${TENANT_ID} not found in tenants table; T1 onboarding must run first`;
    console.error(JSON.stringify(summary, null, 2));
    await prisma.$disconnect();
    process.exit(1);
  }

  const row = await prisma.chatWidgetConfig.upsert({
    where: { tenantId: TENANT_ID },
    create: {
      tenantId: TENANT_ID,
      enabled: false,
      brandName: TENANT_NAME,
      brandAccent: '#1E3A8A',
      brandLogoUrl: null,
      greeting: 'Hi! How can we help today?',
      flowJson: FLOW,
      flowVersion: 1,
      notifyVia: 'automation_event',
      notifyEmail: null,
      allowedOrigins: ALLOWED_ORIGINS,
      rateLimitPerWindow: 30,
      rateLimitWindowSeconds: 300,
      aiBudgetMonthlyUsd: 0,
      aiBudgetSpentUsd: 0,
      aiBudgetMonthYyyymm: null,
      messagesThisMonth: 0,
      messagesMonthYyyymm: null,
    },
    update: {
      brandName: TENANT_NAME,
      brandAccent: '#1E3A8A',
      flowJson: FLOW,
      flowVersion: 1,
      allowedOrigins: ALLOWED_ORIGINS,
      rateLimitPerWindow: 30,
      rateLimitWindowSeconds: 300,
    },
    select: {
      tenantId: true,
      enabled: true,
      brandName: true,
      brandAccent: true,
      flowVersion: true,
      rateLimitPerWindow: true,
      rateLimitWindowSeconds: true,
      updatedAt: true,
    },
  });

  summary.actions.push({ table: 'chat_widget_configs', op: 'upsert', row });
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
