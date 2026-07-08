#!/usr/bin/env node
/**
 * LuxeMaurice AI sandbox — verify Supabase env + migration manifest (no secrets printed).
 *
 * Usage: node scripts/lux-ai-sandbox-verify.mjs
 * @see docs/runbooks/LUX_AI_SUPABASE_SANDBOX_DELIVERY.md
 */
import { buildLuxAiSandboxHealthReport } from '../lib/server/lux-ai-sandbox/health.js';

const report = await buildLuxAiSandboxHealthReport();
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
