import { PrismaClient } from '@prisma/client';

import { verifyCronBearerAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';

const prisma = new PrismaClient();

function boolEnvTrue(v) {
  return String(v || '')
    .trim()
    .toLowerCase() === 'true';
}

function lowCostModeEnabled() {
  return boolEnvTrue(cfg('LOW_COST_MODE', '')) || boolEnvTrue(cfg('CORPFLOW_LOW_COST_MODE', ''));
}

function scheduleAutomationEnabled() {
  return boolEnvTrue(cfg('CMP_SCHEDULE_AUTOMATION_ENABLED', ''));
}

/**
 * Cron-auth endpoint to tell automation if CMP has active work.
 *
 * Route: GET /api/factory/cmp/active-work-signal
 * Auth: `Authorization: Bearer <CORPFLOW_CRON_SECRET>` (same as Vercel crons)
 */
export default async function factoryCmpActiveWorkSignalHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyCronBearerAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (lowCostModeEnabled()) {
    return res.status(200).json({ ok: true, active: false, reason: 'low_cost_mode' });
  }

  if (!scheduleAutomationEnabled()) {
    return res.status(200).json({ ok: true, active: false, reason: 'schedule_disabled' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '') || '').trim();
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  try {
    const approvedBuildCount = await prisma.cmpTicket.count({
      where: {
        status: 'Approved',
        stage: 'Build',
      },
    });

    return res.status(200).json({
      ok: true,
      active: approvedBuildCount > 0,
      reason: approvedBuildCount > 0 ? 'approved_build_pending' : 'idle',
      counts: { approved_build: approvedBuildCount },
    });
  } catch (e) {
    return res.status(500).json({
      error: 'FACTORY_CMP_ACTIVE_WORK_SIGNAL_FAILED',
      detail: String(e?.message || e).slice(0, 500),
    });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

