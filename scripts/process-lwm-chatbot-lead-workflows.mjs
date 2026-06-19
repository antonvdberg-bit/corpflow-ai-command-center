#!/usr/bin/env node
/**
 * Process Living Word chat_widget.lead.submitted events into workflow runs.
 *
 * Idempotent — safe to re-run. Processes known sandbox events plus any
 * unprocessed LWM chat_widget.lead.submitted rows.
 *
 * Usage:
 *   node scripts/process-lwm-chatbot-lead-workflows.mjs
 *   node scripts/process-lwm-chatbot-lead-workflows.mjs --dry-run
 *   node scripts/process-lwm-chatbot-lead-workflows.mjs --event-id=cmqk6lipx003sky04jld3w1em
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

import { CHAT_WIDGET_LEAD_SUBMITTED_EVENT, LWM_TENANT_ID } from '../lib/server/tenant-workflow/constants.js';
import { processAutomationEventForWorkflows } from '../lib/server/tenant-workflow/process-event.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const KNOWN_EVENT_IDS = [
  'cmqk6lipx003sky04jld3w1em',
  'cmqka5uao003ll204ozwkcmlg',
];

/**
 * @param {string} argPrefix
 * @returns {string | null}
 */
function readArg(argPrefix) {
  const hit = process.argv.find((a) => a.startsWith(`${argPrefix}=`));
  if (!hit) return null;
  return hit.slice(argPrefix.length + 1).trim() || null;
}

async function main() {
  const singleEventId = readArg('--event-id');

  /** @type {string[]} */
  let eventIds = [];

  if (singleEventId) {
    eventIds = [singleEventId];
  } else {
    const rows = await prisma.automationEvent.findMany({
      where: {
        tenantId: LWM_TENANT_ID,
        eventType: CHAT_WIDGET_LEAD_SUBMITTED_EVENT,
      },
      orderBy: { occurredAt: 'asc' },
      select: { id: true },
    });
    eventIds = rows.map((r) => r.id);
    for (const id of KNOWN_EVENT_IDS) {
      if (!eventIds.includes(id)) eventIds.push(id);
    }
  }

  console.log('[process-lwm-workflows] events to process:', eventIds.length);

  /** @type {Array<Record<string, unknown>>} */
  const results = [];

  for (const eventId of eventIds) {
    if (dryRun) {
      const exists = await prisma.automationEvent.findUnique({
        where: { id: eventId },
        select: { id: true, tenantId: true, eventType: true },
      });
      results.push({ eventId, dryRun: true, found: Boolean(exists) });
      continue;
    }

    const out = await processAutomationEventForWorkflows(prisma, eventId);
    results.push({ eventId, ...out });
    console.log('[process-lwm-workflows]', eventId, out);
  }

  if (!dryRun) {
    const runCount = await prisma.workflowRun.count({ where: { tenantId: LWM_TENANT_ID } });
    const stepCount = await prisma.workflowStep.count({ where: { tenantId: LWM_TENANT_ID } });
    const otherTenantRuns = await prisma.workflowRun.count({
      where: { NOT: { tenantId: LWM_TENANT_ID } },
    });
    console.log('[process-lwm-workflows] summary', {
      lwm_runs: runCount,
      lwm_steps: stepCount,
      non_lwm_runs: otherTenantRuns,
    });
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main()
  .catch((e) => {
    console.error('[process-lwm-workflows] failed', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
